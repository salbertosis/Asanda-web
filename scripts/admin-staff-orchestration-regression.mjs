import assert from 'node:assert/strict';
import { inviteStaff, setStaffAccess } from '../supabase/functions/manage-staff/orchestration.js';

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

const ABSENT = { present: false, banned: false };
const PRESENT = { present: true, banned: false };
const BANNED = { present: true, banned: true };
const staff = (overrides = {}) => ({ id: 't-1', displayName: 'Ana', role: 'editor', isActive: true, ...overrides });
const thrower = () => {
  throw new Error('injected failure');
};
const PRIVATE = /email|token|password|secret|metadata|@/i;

function scenario(scripts) {
  const trace = [];
  const makeOp = (name) => {
    const queue = [...scripts[name]];
    return async (...args) => {
      trace.push(name);
      const handler = queue.shift();
      assert.ok(handler !== undefined, `unexpected call: ${name}`);
      return typeof handler === 'function' ? handler(...args) : handler;
    };
  };
  return {
    trace,
    operations: {
      inviteAuth: makeOp('inviteAuth'),
      readStaff: makeOp('readStaff'),
      readAuth: makeOp('readAuth'),
      createInactiveProfile: makeOp('createInactiveProfile'),
      transitionProfile: makeOp('transitionProfile'),
      setAuthBanned: makeOp('setAuthBanned'),
      deleteAuthUser: makeOp('deleteAuthUser'),
    },
  };
}

async function expect(entry, command, scripts, expectedTrace) {
  const { operations, trace } = scenario(scripts);
  const result = await entry(command, operations);
  assert.deepEqual(trace, expectedTrace);
  assert.doesNotMatch(JSON.stringify(result), PRIVATE);
  return result;
}

const NONE = { inviteAuth: [], readStaff: [], readAuth: [], createInactiveProfile: [], transitionProfile: [], setAuthBanned: [], deleteAuthUser: [] };
const script = (overrides = {}) => ({
  inviteAuth: [{ ok: true, value: 'u-1' }],
  createInactiveProfile: [{ ok: true }],
  transitionProfile: [],
  deleteAuthUser: [{ ok: true }],
  readStaff: [{ ok: true, value: null }],
  readAuth: [{ ok: true, value: ABSENT }],
  setAuthBanned: [],
  ...overrides,
});
const staffScript = (overrides = {}) => ({
  readStaff: [{ ok: true, value: staff() }],
  readAuth: [{ ok: true, value: PRESENT }],
  transitionProfile: [],
  setAuthBanned: [],
  inviteAuth: [], createInactiveProfile: [], deleteAuthUser: [],
  ...overrides,
});
const INVITE = { actorId: 'a', email: 'x@example.test', displayName: 'Ana', role: 'editor' };
const INVITE_FAIL_TRACE = ['inviteAuth', 'createInactiveProfile', 'transitionProfile', 'deleteAuthUser', 'readStaff', 'readAuth'];
const CLEANUP_TRACE = ['inviteAuth', 'createInactiveProfile', 'deleteAuthUser', 'readStaff', 'readAuth'];
const DEACTIVATE = { actorId: 'a', userId: 't-1', isActive: false };
const REACTIVATE = { actorId: 'a', userId: 't-1', isActive: true };
const STAFF_READ = ['readStaff', 'readAuth'];

test('invite rejects null, array, malformed, and disallowed-role commands with zero effects', async () => {
  for (const command of [null, [], {}, { actorId: '' }, { actorId: 'a', email: 5 }, { actorId: 'a', email: 'e', displayName: 'x', role: 'viewer' }]) {
    const result = await expect(inviteStaff, command, NONE, []);
    assert.equal(result.kind, 'rejected');
    assert.equal(result.code, 'invalid-command');
  }
});

test('setStaffAccess rejects null, array, and malformed commands with zero effects', async () => {
  for (const command of [null, [], {}, { actorId: 'a' }, { actorId: 'a', userId: 'u' }]) {
    const result = await expect(setStaffAccess, command, NONE, []);
    assert.equal(result.kind, 'rejected');
  }
});

test('invite: failed or malformed auth invite is reported without further effects', async () => {
  for (const inviteAuth of [{ ok: false }, () => { throw new Error('transport'); }, { ok: true, value: 42 }]) {
    const result = await expect(inviteStaff, INVITE, { ...NONE, inviteAuth: [inviteAuth] }, ['inviteAuth']);
    assert.equal(result.code, 'invite-auth-failed');
    assert.equal(result.recoveryRequired, true);
  }
});

test('invite: bootstrap throw after auth creation routes through verified cleanup', async () => {
  const result = await expect(inviteStaff, INVITE, script({ createInactiveProfile: [thrower] }), CLEANUP_TRACE);
  assert.equal(result.code, 'invite-profile-failed');
  assert.equal(result.recovery, 'restored');
  assert.equal(result.compensation, 'verified');
  assert.equal(result.recoveryRequired, false);
});

test('invite: RPC denial, malformed, and ambiguous outcomes each route through verified cleanup', async () => {
  for (const transitionProfile of [{ ok: false }, { nope: true }, thrower]) {
    const result = await expect(inviteStaff, INVITE, script({ transitionProfile: [transitionProfile] }), INVITE_FAIL_TRACE);
    assert.equal(result.code, 'invite-transition-failed');
    assert.equal(result.recovery, 'restored');
    assert.equal(result.compensation, 'verified');
  }
});

test('invite: cleanup deletion failure with residue reports unknown recovery', async () => {
  const result = await expect(inviteStaff, INVITE, script({
    createInactiveProfile: [{ ok: false }],
    deleteAuthUser: [{ ok: false }],
    readStaff: [{ ok: true, value: staff() }],
    readAuth: [{ ok: true, value: PRESENT }],
  }), CLEANUP_TRACE);
  assert.equal(result.code, 'invite-profile-failed');
  assert.equal(result.recovery, 'unknown');
  assert.equal(result.compensation, 'failed');
  assert.equal(result.recoveryRequired, true);
});

test('invite: deletion throw but exact absence counts as recovered', async () => {
  const result = await expect(inviteStaff, INVITE, script({
    createInactiveProfile: [thrower],
    deleteAuthUser: [thrower],
  }), CLEANUP_TRACE);
  assert.equal(result.recovery, 'restored');
  assert.equal(result.compensation, 'verified');
});

test('invite: success issues each effect exactly once and returns bounded staff', async () => {
  const result = await expect(inviteStaff, INVITE, script({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff({ id: 'u-1' }) }],
    readAuth: [{ ok: true, value: PRESENT }],
  }), ['inviteAuth', 'createInactiveProfile', 'transitionProfile', 'readStaff', 'readAuth']);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'invited');
  assert.deepEqual(result.staff, { id: 'u-1', displayName: 'Ana', role: 'editor', isActive: true, authBanned: false });
  assert.equal(result.recoveryRequired, false);
});

test('invite: final state mismatch routes through verified cleanup', async () => {
  const result = await expect(inviteStaff, INVITE, script({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff({ id: 'u-1', role: 'viewer' }) }, { ok: true, value: null }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: ABSENT }],
  }), ['inviteAuth', 'createInactiveProfile', 'transitionProfile', 'readStaff', 'readAuth', 'deleteAuthUser', 'readStaff', 'readAuth']);
  assert.equal(result.code, 'invite-state-mismatch');
  assert.equal(result.recovery, 'restored');
});

test('deactivate: RPC denial causes no Auth mutation and reports desired-safe state', async () => {
  const result = await expect(setStaffAccess, DEACTIVATE, staffScript({
    transitionProfile: [{ ok: false }],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: PRESENT }],
  }), [...STAFF_READ, 'transitionProfile', ...STAFF_READ]);
  assert.equal(result.code, 'deactivate-profile-failed');
  assert.equal(result.recovery, 'desired-safe');
  assert.equal(result.compensation, 'not-needed');
  assert.equal(result.recoveryRequired, false);
});

test('deactivate: ambiguous transition proven inactive continues to ban and succeeds', async () => {
  const result = await expect(setStaffAccess, DEACTIVATE, staffScript({
    transitionProfile: [thrower],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff({ isActive: false }) }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: PRESENT }, { ok: true, value: BANNED }],
    setAuthBanned: [{ ok: true }],
  }), [...STAFF_READ, 'transitionProfile', ...STAFF_READ, 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'deactivated');
});

test('deactivate: ambiguous transition with still-active read never bans', async () => {
  const result = await expect(setStaffAccess, DEACTIVATE, staffScript({
    transitionProfile: [thrower],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: PRESENT }],
  }), [...STAFF_READ, 'transitionProfile', ...STAFF_READ]);
  assert.equal(result.code, 'deactivate-profile-failed');
  assert.equal(result.recovery, 'desired-safe');
});

test('deactivate: ambiguous transition with unknown read never bans', async () => {
  const result = await expect(setStaffAccess, DEACTIVATE, staffScript({
    transitionProfile: [thrower],
    readStaff: [{ ok: true, value: staff() }, { ok: false }],
    readAuth: [{ ok: true, value: PRESENT }],
  }), [...STAFF_READ, 'transitionProfile', ...STAFF_READ]);
  assert.equal(result.code, 'deactivate-profile-failed');
  assert.equal(result.recovery, 'unknown');
  assert.equal(result.recoveryRequired, true);
});

test('deactivate: ban failure compensates to the exact prior active state', async () => {
  const result = await expect(setStaffAccess, DEACTIVATE, staffScript({
    transitionProfile: [{ ok: true }, { ok: true }],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: PRESENT }],
    setAuthBanned: [{ ok: false }, { ok: true }],
  }), [...STAFF_READ, 'transitionProfile', 'setAuthBanned', 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.code, 'deactivate-ban-failed');
  assert.equal(result.recovery, 'restored');
  assert.equal(result.compensation, 'verified');
  assert.equal(result.recoveryRequired, false);
});

test('deactivate: success verifies exact inactive and banned state', async () => {
  const result = await expect(setStaffAccess, DEACTIVATE, staffScript({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff({ isActive: false }) }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: BANNED }],
    setAuthBanned: [{ ok: true }],
  }), [...STAFF_READ, 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'deactivated');
  assert.equal(result.staff.role, 'editor');
});

test('deactivate with role change verifies both role and inactive state', async () => {
  const result = await expect(setStaffAccess, { ...DEACTIVATE, role: 'administrator' }, staffScript({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff({ role: 'administrator', isActive: false }) }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: BANNED }],
    setAuthBanned: [{ ok: true }],
  }), [...STAFF_READ, 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'deactivated');
  assert.equal(result.staff.role, 'administrator');
});

test('reactivate: success verifies exact active and unbanned state', async () => {
  const result = await expect(setStaffAccess, REACTIVATE, staffScript({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: BANNED }, { ok: true, value: PRESENT }],
    setAuthBanned: [{ ok: true }],
  }), [...STAFF_READ, 'setAuthBanned', 'transitionProfile', ...STAFF_READ]);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'reactivated');
});

test('reactivate: ambiguous transition never takes early success and compensates', async () => {
  const result = await expect(setStaffAccess, REACTIVATE, staffScript({
    transitionProfile: [thrower, { ok: true }],
    readStaff: [{ ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff({ isActive: false }) }],
    readAuth: [{ ok: true, value: BANNED }, { ok: true, value: BANNED }],
    setAuthBanned: [{ ok: true }, { ok: true }],
  }), [...STAFF_READ, 'setAuthBanned', 'transitionProfile', 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.kind, 'failed');
  assert.equal(result.code, 'reactivate-transition-failed');
  assert.equal(result.recovery, 'restored');
  assert.equal(result.compensation, 'verified');
  assert.equal(result.recoveryRequired, false);
});

test('reactivate: compensation failure reports unknown recovery', async () => {
  const result = await expect(setStaffAccess, REACTIVATE, staffScript({
    transitionProfile: [thrower, { ok: false }],
    readStaff: [{ ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: BANNED }, { ok: true, value: PRESENT }],
    setAuthBanned: [{ ok: true }, { ok: true }],
  }), [...STAFF_READ, 'setAuthBanned', 'transitionProfile', 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.code, 'reactivate-transition-failed');
  assert.equal(result.recovery, 'unknown');
  assert.equal(result.compensation, 'failed');
  assert.equal(result.recoveryRequired, true);
});

test('reactivate: Auth re-ban failure during compensation reports unknown recovery', async () => {
  const result = await expect(setStaffAccess, REACTIVATE, staffScript({
    transitionProfile: [thrower, { ok: true }],
    readStaff: [{ ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: BANNED }, { ok: true, value: PRESENT }],
    setAuthBanned: [{ ok: true }, { ok: false }],
  }), [...STAFF_READ, 'setAuthBanned', 'transitionProfile', 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.recovery, 'unknown');
  assert.equal(result.compensation, 'failed');
  assert.equal(result.recoveryRequired, true);
});

test('reactivate: unban failure with auth still banned is desired-safe without compensation', async () => {
  const result = await expect(setStaffAccess, REACTIVATE, staffScript({
    readStaff: [{ ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff({ isActive: false }) }],
    readAuth: [{ ok: true, value: BANNED }, { ok: true, value: BANNED }],
    setAuthBanned: [{ ok: false }],
  }), [...STAFF_READ, 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.code, 'reactivate-unban-failed');
  assert.equal(result.recovery, 'desired-safe');
  assert.equal(result.compensation, 'not-needed');
  assert.equal(result.recoveryRequired, false);
});

test('reactivate: ambiguous unban that actually unbanned compensates back', async () => {
  const result = await expect(setStaffAccess, REACTIVATE, staffScript({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff({ isActive: false }) }, { ok: true, value: staff({ isActive: false }) }],
    readAuth: [{ ok: true, value: BANNED }, { ok: true, value: PRESENT }, { ok: true, value: BANNED }],
    setAuthBanned: [{ ok: false }, { ok: true }],
  }), [...STAFF_READ, 'setAuthBanned', ...STAFF_READ, 'transitionProfile', 'setAuthBanned', ...STAFF_READ]);
  assert.equal(result.code, 'reactivate-unban-ambiguous');
  assert.equal(result.recovery, 'restored');
  assert.equal(result.compensation, 'verified');
});

test('role change: success verifies the new role', async () => {
  const result = await expect(setStaffAccess, { actorId: 'a', userId: 't-1', role: 'administrator' }, staffScript({
    transitionProfile: [{ ok: true }],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff({ role: 'administrator' }) }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: PRESENT }],
  }), [...STAFF_READ, 'transitionProfile', ...STAFF_READ]);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'role-changed');
  assert.equal(result.staff.role, 'administrator');
});

test('role change: ambiguous transition restores the previous role', async () => {
  const result = await expect(setStaffAccess, { actorId: 'a', userId: 't-1', role: 'administrator' }, staffScript({
    transitionProfile: [thrower, { ok: true }],
    readStaff: [{ ok: true, value: staff() }, { ok: true, value: staff() }],
    readAuth: [{ ok: true, value: PRESENT }, { ok: true, value: PRESENT }],
  }), [...STAFF_READ, 'transitionProfile', 'transitionProfile', ...STAFF_READ]);
  assert.equal(result.code, 'role-change-failed');
  assert.equal(result.recovery, 'restored');
  assert.equal(result.compensation, 'verified');
});

test('role change: same role is reported without external effects', async () => {
  const result = await expect(setStaffAccess, { actorId: 'a', userId: 't-1', role: 'editor' }, staffScript(), STAFF_READ);
  assert.equal(result.kind, 'success');
  assert.equal(result.code, 'role-unchanged');
});

test('non-managed and missing staff are rejected before any mutation', async () => {
  const viewer = await expect(setStaffAccess, DEACTIVATE, staffScript({
    readStaff: [{ ok: true, value: staff({ role: 'viewer' }) }],
  }), STAFF_READ);
  assert.equal(viewer.code, 'staff-not-managed');
  const missing = await expect(setStaffAccess, DEACTIVATE, staffScript({
    readStaff: [{ ok: true, value: null }],
    readAuth: [{ ok: true, value: ABSENT }],
  }), STAFF_READ);
  assert.equal(missing.code, 'staff-not-found');
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}`);
    console.error(error && error.message ? error.message : error);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exitCode = failed === 0 ? 0 : 1;