const ALLOWED_ROLES = new Set(['administrator', 'editor']);

function outcome(kind, code, extra = {}) {
  return {
    kind,
    code,
    recoveryRequired:
      kind === 'failed' && extra.recovery !== 'restored' && extra.recovery !== 'desired-safe',
    ...extra,
  };
}

function validCommand(command) {
  return (
    command &&
    typeof command === 'object' &&
    !Array.isArray(command) &&
    typeof command.actorId === 'string' &&
    command.actorId.length > 0
  );
}

async function invoke(operation, ...args) {
  try {
    const result = await operation(...args);
    return result && result.ok === true ? { ok: true, value: result.value } : { ok: false };
  } catch {
    return { ok: false };
  }
}

async function readState(operations, userId) {
  const staff = await invoke(operations.readStaff, userId);
  const auth = await invoke(operations.readAuth, userId);
  if (!staff.ok || !auth.ok) return { ok: false };
  const profile = staff.value;
  const authState = auth.value;
  return {
    ok: true,
    value: {
      present: Boolean(profile) || Boolean(authState && authState.present),
      authPresent: Boolean(authState && authState.present),
      id: profile ? profile.id : userId,
      displayName: profile ? profile.displayName : null,
      role: profile ? profile.role : null,
      isActive: profile ? profile.isActive : false,
      authBanned: Boolean(authState && authState.banned),
    },
  };
}

const safeStaff = (state) => ({ id: state.id, displayName: state.displayName, role: state.role, isActive: state.isActive, authBanned: state.authBanned });

async function cleanupInvitation(operations, userId) {
  await invoke(operations.deleteAuthUser, userId);
  const state = await readState(operations, userId);
  if (!state.ok) return { recovery: 'unknown', compensation: 'failed' };
  return state.value.present
    ? { recovery: 'unknown', compensation: 'failed' }
    : { recovery: 'restored', compensation: 'verified' };
}

async function restoreState(previous, operations, command, code, reban) {
  await invoke(operations.transitionProfile, command.actorId, command.userId, previous.role, previous.isActive);
  if (reban) await invoke(operations.setAuthBanned, command.userId, previous.authBanned);
  const state = await readState(operations, command.userId);
  const restored = state.ok && state.value.authPresent && state.value.role === previous.role && state.value.isActive === previous.isActive && state.value.authBanned === previous.authBanned;
  return outcome('failed', code, restored ? { recovery: 'restored', compensation: 'verified' } : { recovery: 'unknown', compensation: 'failed' });
}

export async function inviteStaff(command, operations) {
  if (!validCommand(command) || typeof command.email !== 'string' || typeof command.displayName !== 'string' || !ALLOWED_ROLES.has(command.role)) {
    return outcome('rejected', 'invalid-command');
  }
  const invited = await invoke(operations.inviteAuth, command.email, command.metadata);
  if (!invited.ok || typeof invited.value !== 'string' || invited.value.length === 0) {
    return outcome('failed', 'invite-auth-failed');
  }
  const userId = invited.value;
  const profile = await invoke(operations.createInactiveProfile, command.actorId, userId, command.displayName);
  if (!profile.ok) {
    return outcome('failed', 'invite-profile-failed', await cleanupInvitation(operations, userId));
  }
  const transition = await invoke(operations.transitionProfile, command.actorId, userId, command.role, true);
  if (!transition.ok) {
    return outcome('failed', 'invite-transition-failed', await cleanupInvitation(operations, userId));
  }
  const state = await readState(operations, userId);
  if (!state.ok) {
    return outcome('failed', 'invite-state-unknown', await cleanupInvitation(operations, userId));
  }
  if (!state.value.authPresent || state.value.role !== command.role || !state.value.isActive || state.value.authBanned) {
    return outcome('failed', 'invite-state-mismatch', await cleanupInvitation(operations, userId));
  }
  return outcome('success', 'invited', { staff: safeStaff(state.value) });
}

export async function setStaffAccess(command, operations) {
  if (!validCommand(command) || typeof command.userId !== 'string' || command.userId.length === 0) {
    return outcome('rejected', 'invalid-command');
  }
  if (command.isActive === true) return reactivate(command, operations);
  if (command.isActive === false) return deactivate(command, operations);
  if (typeof command.role === 'string' && ALLOWED_ROLES.has(command.role)) {
    return changeRole(command, operations);
  }
  return outcome('rejected', 'invalid-command');
}

async function managedStaff(operations, userId) {
  const state = await readState(operations, userId);
  if (!state.ok) return { failed: outcome('failed', 'access-read-unknown') };
  if (!state.value.present) return { rejected: outcome('rejected', 'staff-not-found') };
  if (!ALLOWED_ROLES.has(state.value.role)) return { rejected: outcome('rejected', 'staff-not-managed') };
  return { state: state.value };
}

async function deactivate(command, operations) {
  const current = await managedStaff(operations, command.userId);
  if (current.failed || current.rejected) return current.failed || current.rejected;
  const state = current.state;
  const role = typeof command.role === 'string' ? command.role : state.role;
  if (!ALLOWED_ROLES.has(role)) return outcome('rejected', 'invalid-command');
  const transition = await invoke(operations.transitionProfile, command.actorId, command.userId, role, false);
  if (!transition.ok) {
    const after = await readState(operations, command.userId);
    if (!after.ok) return outcome('failed', 'deactivate-profile-failed', { recovery: 'unknown', compensation: 'failed' });
    if (!after.value.present || after.value.isActive) {
      const unchanged = after.value.role === state.role && after.value.isActive === state.isActive && after.value.authBanned === state.authBanned;
      return outcome('failed', 'deactivate-profile-failed', unchanged ? { recovery: 'desired-safe', compensation: 'not-needed' } : { recovery: 'unknown', compensation: 'failed' });
    }
  }
  const ban = await invoke(operations.setAuthBanned, command.userId, true);
  if (!ban.ok) return restoreState(state, operations, command, 'deactivate-ban-failed', true);
  const final = await readState(operations, command.userId);
  if (!final.ok) return outcome('failed', 'deactivate-final-unknown', { recovery: 'unknown', compensation: 'failed' });
  if (final.value.authPresent && !final.value.isActive && final.value.authBanned) {
    return outcome('success', 'deactivated', { staff: safeStaff(final.value) });
  }
  return outcome('failed', 'deactivate-final-mismatch', { recovery: 'unknown', compensation: 'failed' });
}

async function reactivate(command, operations) {
  const current = await managedStaff(operations, command.userId);
  if (current.failed || current.rejected) return current.failed || current.rejected;
  const state = current.state;
  const role = typeof command.role === 'string' ? command.role : state.role;
  if (!ALLOWED_ROLES.has(role)) return outcome('rejected', 'invalid-command');
  const unban = await invoke(operations.setAuthBanned, command.userId, false);
  if (!unban.ok) {
    const after = await readState(operations, command.userId);
    if (!after.ok) return outcome('failed', 'reactivate-unban-unknown', { recovery: 'unknown', compensation: 'failed' });
    if (after.value.authBanned) {
      return outcome('failed', 'reactivate-unban-failed', { recovery: 'desired-safe', compensation: 'not-needed' });
    }
    return restoreState(state, operations, command, 'reactivate-unban-ambiguous', true);
  }
  const transition = await invoke(operations.transitionProfile, command.actorId, command.userId, role, true);
  if (!transition.ok) return restoreState(state, operations, command, 'reactivate-transition-failed', true);
  const final = await readState(operations, command.userId);
  if (!final.ok) return restoreState(state, operations, command, 'reactivate-final-unknown', true);
  if (!final.value.authPresent || final.value.role !== role || !final.value.isActive || final.value.authBanned) {
    return restoreState(state, operations, command, 'reactivate-final-mismatch', true);
  }
  return outcome('success', 'reactivated', { staff: safeStaff(final.value) });
}

async function changeRole(command, operations) {
  const current = await managedStaff(operations, command.userId);
  if (current.failed || current.rejected) return current.failed || current.rejected;
  const state = current.state;
  if (state.role === command.role) return outcome('success', 'role-unchanged', { staff: safeStaff(state) });
  const transition = await invoke(operations.transitionProfile, command.actorId, command.userId, command.role, state.isActive);
  if (!transition.ok) return restoreState(state, operations, command, 'role-change-failed', false);
  const final = await readState(operations, command.userId);
  if (!final.ok) return restoreState(state, operations, command, 'role-change-unknown', false);
  if (!final.value.authPresent || final.value.role !== command.role || final.value.isActive !== state.isActive) {
    return restoreState(state, operations, command, 'role-change-mismatch', false);
  }
  return outcome('success', 'role-changed', { staff: safeStaff(final.value) });
}
