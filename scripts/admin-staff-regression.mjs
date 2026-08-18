import assert from 'node:assert/strict';

const c = {
  url: process.env.ASANDA_STAGING_URL,
  key: process.env.ASANDA_STAGING_PUBLISHABLE_KEY,
  serviceKey: process.env.ASANDA_STAGING_SERVICE_ROLE_KEY,
  adminEmail: process.env.ASANDA_STAGING_ADMIN_PASSWORD_EMAIL,
  adminPassword: process.env.ASANDA_STAGING_ADMIN_PASSWORD,
  editorEmail: process.env.ASANDA_STAGING_EDITOR_PASSWORD_EMAIL,
  editorPassword: process.env.ASANDA_STAGING_EDITOR_PASSWORD,
  inviteEmail: process.env.ASANDA_STAGING_INVITE_EMAIL,
};
for (const [name, value] of Object.entries(c)) {
  if (!value) throw new Error(`Missing required staging environment variable: ${name}.`);
}
async function json(response) { try { return await response.json(); } catch { return null; } }
function staff(value) {
  const item = value?.staff;
  return item && typeof item === 'object' ? { id: item.id, role: item.role, isActive: item.isActive, authBanned: item.authBanned } : null;
}
async function signIn(email, password) {
  const response = await fetch(`${c.url}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const value = await json(response);
  assert.equal(response.status, 200, 'Staging sign-in must succeed.');
  assert.ok(value?.access_token && value.user?.id, 'Sign-in must return a session identity.');
  return { token: value.access_token, userId: value.user.id };
}
async function invoke(token, payload, options = {}) {
  const response = await fetch(`${c.url}/functions/v1/manage-staff`, {
    method: 'POST', headers: {
      apikey: c.key, Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json',
    }, body: options.raw ? payload : JSON.stringify(payload),
  });
  const body = await json(response);
  return { status: response.status, body, staff: staff(body) };
}
function assertDenied(result, label) {
  assert.ok([401, 403].includes(result.status), `${label} must be denied.`);
  assert.equal(typeof result.body?.error, 'string', `${label} must return bounded JSON.`);
}
function assert422(result, label) {
  assert.equal(result.status, 422, `${label} must return 422.`);
  assert.equal(typeof result.body?.error, 'string', `${label} must return bounded JSON.`);
}
async function admin(path, options = {}) {
  return fetch(`${c.url}${path}`, { ...options, headers: { apikey: c.serviceKey, Authorization: `Bearer ${c.serviceKey}`, ...(options.headers ?? {}) } });
}
function banned(user) {
  if (!user?.banned_until) return false;
  const until = Date.parse(user.banned_until);
  return Number.isNaN(until) || until > Date.now();
}
async function inspect(id) {
  const [profileResponse, authResponse] = await Promise.all([
    admin(`/rest/v1/profiles?id=eq.${id}&select=role,is_active`),
    admin(`/auth/v1/admin/users/${id}`),
  ]);
  const profiles = await json(profileResponse);
  const auth = await json(authResponse);
  assert.equal(profileResponse.status, 200, 'Service-role profile inspection must succeed.');
  assert.ok([200, 404].includes(authResponse.status), 'Auth inspection must be observable.');
  return {
    profile: Array.isArray(profiles) && profiles[0] ? { role: profiles[0].role, isActive: profiles[0].is_active } : null,
    auth: authResponse.status === 200 && auth?.id ? { banned: banned(auth) } : null,
  };
}
async function freshProfile(token, id) {
  const response = await fetch(`${c.url}/rest/v1/profiles?id=eq.${id}&select=role,is_active`, {
    headers: { apikey: c.key, Authorization: `Bearer ${token}` },
  });
  const profiles = await json(response);
  assert.equal(response.status, 200, 'Fresh session profile read must succeed.');
  assert.ok(Array.isArray(profiles) && profiles[0], 'Fresh session must read its profile.');
  return { role: profiles[0].role, isActive: profiles[0].is_active };
}
async function restore(adminSession, editorSession) {
  const before = await inspect(editorSession.userId);
  assert.ok(before.profile && before.auth, 'Editor state must remain inspectable for restoration.');
  if (before.profile.role !== 'editor' || !before.profile.isActive || before.auth.banned) {
    const result = await invoke(adminSession.token, { action: 'set-access', userId: editorSession.userId, role: 'editor', isActive: true });
    assert.equal(result.status, 200, 'Editor restoration must succeed.');
  }
  assert.deepEqual(await inspect(editorSession.userId), { profile: { role: 'editor', isActive: true }, auth: { banned: false } });
  const fresh = await signIn(c.editorEmail, c.editorPassword);
  assert.deepEqual(await freshProfile(fresh.token, editorSession.userId), { role: 'editor', isActive: true });
}
async function emergencyRestore(id, desired) {
  const unban = await admin(`/auth/v1/admin/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ban_duration: 'none' }) });
  const patch = await admin(`/rest/v1/profiles?id=eq.${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: desired.role, is_active: desired.isActive }) });
  if (![200, 204].includes(unban.status) || ![200, 204].includes(patch.status)) return { ok: false };
  const state = await inspect(id);
  return state.profile?.role === desired.role && state.profile?.isActive === desired.isActive && state.auth?.banned === false ? { ok: true } : { ok: false };
}
async function raceContention(adminSession, editorSession) {
  const promote = await invoke(adminSession.token, { action: 'set-access', userId: editorSession.userId, role: 'administrator' });
  assert.equal(promote.status, 200, 'Promotion to administrator must succeed.');
  const results = await Promise.all([
    invoke(adminSession.token, { action: 'set-access', userId: editorSession.userId, isActive: false }),
    invoke(editorSession.token, { action: 'set-access', userId: adminSession.userId, isActive: false }),
  ]);
  const winners = results.filter((result) => result.status === 200);
  const denied = results.filter((result) => result.status !== 200);
  assert.equal(winners.length, 1, 'Exactly one administrator must win the removal race.');
  assert.equal(denied.length, 1, 'Exactly one removal must be denied.');
  assert.ok([403, 409, 502].includes(denied[0].status) && denied[0].body?.recoveryRequired !== true, 'The losing removal must fail safely.');
  const states = await Promise.all([inspect(adminSession.userId), inspect(editorSession.userId)]);
  assert.equal(states.filter((state) => state.profile?.isActive).length, 1, 'Exactly one active administrator must remain after the race.');
  const survivor = states[0].profile?.isActive ? adminSession : editorSession;
  const loser = survivor === adminSession ? editorSession : adminSession;
  const restored = await invoke(survivor.token, { action: 'set-access', userId: loser.userId, isActive: true });
  assert.equal(restored.status, 200, 'The surviving administrator must restore the removed one.');
  assert.deepEqual(await inspect(loser.userId), { profile: { role: 'administrator', isActive: true }, auth: { banned: false } });
  const demote = await invoke(adminSession.token, { action: 'set-access', userId: editorSession.userId, role: 'editor' });
  assert.equal(demote.status, 200, 'The editor identity must return to the editor role.');
  assert.deepEqual(await inspect(editorSession.userId), { profile: { role: 'editor', isActive: true }, auth: { banned: false } });
  const freshAdmin = await signIn(c.adminEmail, c.adminPassword);
  const freshEditor = await signIn(c.editorEmail, c.editorPassword);
  assert.deepEqual(await freshProfile(freshAdmin.token, adminSession.userId), { role: 'administrator', isActive: true });
  assert.deepEqual(await freshProfile(freshEditor.token, editorSession.userId), { role: 'editor', isActive: true });
}
async function cleanup(id) {
  const deleted = await admin(`/auth/v1/admin/users/${id}`, { method: 'DELETE' });
  assert.ok([200, 204].includes(deleted.status), 'Invited Auth user deletion must succeed.');
  const state = await inspect(id);
  assert.equal(state.profile, null, 'Invited profile must be removed by Auth cascade.');
  assert.equal(state.auth, null, 'Invited Auth user must be absent after cleanup.');
}

const adminSession = await signIn(c.adminEmail, c.adminPassword);
const editorSession = await signIn(c.editorEmail, c.editorPassword);
assert.deepEqual(await inspect(editorSession.userId), {
  profile: { role: 'editor', isActive: true }, auth: { banned: false },
});
assert.deepEqual(await inspect(adminSession.userId), {
  profile: { role: 'administrator', isActive: true }, auth: { banned: false },
});
let invitationAttempted = false;
let invitedUserId = null;
try {
  assertDenied(await invoke(null, { action: 'set-access', userId: editorSession.userId, isActive: false }), 'Missing bearer');
  assertDenied(await invoke(editorSession.token, {
    action: 'set-access', userId: editorSession.userId, role: 'editor',
  }), 'Non-administrator actor');
  assert422(await invoke(adminSession.token, { action: 'unknown' }), 'Unknown action');
  assert422(await invoke(adminSession.token, { action: 'set-access' }), 'Missing set-access fields');
  assert422(await invoke(adminSession.token, { action: 'set-access', userId: 'not-a-uuid', role: 'editor' }), 'Invalid target identity');
  assert422(await invoke(adminSession.token, { action: 'set-access', userId: editorSession.userId, role: 'viewer' }), 'Disallowed role');
  assert422(await invoke(adminSession.token, { action: 'set-access', userId: editorSession.userId, role: 'editor', isActive: 'yes' }), 'Non-boolean active flag');
  assert422(await invoke(adminSession.token, null), 'JSON null');
  assert422(await invoke(adminSession.token, []), 'JSON arrays');
  assert422(await invoke(adminSession.token, 'not-an-object'), 'JSON primitives');
  assert422(await invoke(adminSession.token, '{"action":', { raw: true }), 'Malformed JSON');
  assert.equal((await invoke(adminSession.token, {
    action: 'set-access', userId: adminSession.userId, role: 'editor',
  })).status, 409, 'Administrator self-demotion must be denied.');
  assert.equal((await invoke(adminSession.token, {
    action: 'set-access', userId: adminSession.userId, isActive: false,
  })).status, 409, 'Last active administrator removal must be denied.');

  const roleChanged = await invoke(adminSession.token, {
    action: 'set-access', userId: editorSession.userId, role: 'administrator',
  });
  assert.equal(roleChanged.status, 200, 'Role transition must succeed.');
  assert.deepEqual(roleChanged.staff, {
    id: editorSession.userId, role: 'administrator', isActive: true, authBanned: false,
  });
  assert.deepEqual(await inspect(editorSession.userId), {
    profile: { role: 'administrator', isActive: true }, auth: { banned: false },
  });
  const roleRestored = await invoke(adminSession.token, {
    action: 'set-access', userId: editorSession.userId, role: 'editor',
  });
  assert.equal(roleRestored.status, 200, 'Role restoration must succeed.');

  const deactivated = await invoke(adminSession.token, {
    action: 'set-access', userId: editorSession.userId, isActive: false,
  });
  assert.equal(deactivated.status, 200, 'Deactivation must succeed.');
  assert.deepEqual(deactivated.staff, {
    id: editorSession.userId, role: 'editor', isActive: false, authBanned: true,
  });
  assert.deepEqual(await inspect(editorSession.userId), {
    profile: { role: 'editor', isActive: false }, auth: { banned: true },
  });
  assert.ok([401, 403].includes((await invoke(editorSession.token, {
    action: 'set-access', userId: editorSession.userId, role: 'editor',
  })).status), 'Inactive editor sessions must be denied.');

  const reactivated = await invoke(adminSession.token, {
    action: 'set-access', userId: editorSession.userId, isActive: true,
  });
  assert.equal(reactivated.status, 200, 'Reactivation must succeed.');
  assert.deepEqual(reactivated.staff, {
    id: editorSession.userId, role: 'editor', isActive: true, authBanned: false,
  });
  assert.deepEqual(await inspect(editorSession.userId), {
    profile: { role: 'editor', isActive: true }, auth: { banned: false },
  });
  const freshEditor = await signIn(c.editorEmail, c.editorPassword);
  assert.deepEqual(await freshProfile(freshEditor.token, editorSession.userId), { role: 'editor', isActive: true });

  await raceContention(adminSession, editorSession);

  invitationAttempted = true;
  const invitation = await invoke(adminSession.token, {
    action: 'invite', email: c.inviteEmail, displayName: 'Staging Staff', role: 'editor',
  });
  invitedUserId = invitation.staff?.id ?? null;
  assert.equal(invitation.status, 201, 'Invitation must establish an authorized profile.');
  assert.ok(invitedUserId, 'Successful invitation must expose a bounded staff identity.');
  assert.deepEqual(invitation.staff, {
    id: invitedUserId, role: 'editor', isActive: true, authBanned: false,
  });
  assert.deepEqual(await inspect(invitedUserId), {
    profile: { role: 'editor', isActive: true }, auth: { banned: false },
  });

  assert.deepEqual(await emergencyRestore(adminSession.userId, { role: 'administrator', isActive: true }), { ok: true }, 'Emergency service-role restoration must verify exact state.');
  assert.deepEqual(await emergencyRestore(editorSession.userId, { role: 'editor', isActive: true }), { ok: true }, 'Emergency service-role restoration must verify exact state.');
} finally {
  const failures = [];
  try { await restore(adminSession, editorSession); } catch {
    try {
      const state = await emergencyRestore(editorSession.userId, { role: 'editor', isActive: true });
      if (!state.ok) failures.push('editor restoration failed');
    } catch { failures.push('editor emergency restoration failed'); }
  }
  if (invitationAttempted && invitedUserId) {
    try { await cleanup(invitedUserId); } catch { failures.push('invitation cleanup failed'); }
  } else if (invitationAttempted) {
    failures.push('invitation cleanup boundary was not observable');
  }
  if (failures.length) throw new Error(failures.join('; '));
}

console.log('Admin staff regression passed: authorization, validation, transitions, deactivation/reactivation, contention, restoration, invitation cleanup, and emergency path.');
