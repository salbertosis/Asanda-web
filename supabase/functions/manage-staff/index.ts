import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { inviteStaff, setStaffAccess } from './orchestration.js';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const ALLOWED_ROLES = new Set(['administrator', 'editor']);
const BAN_DURATION = '876000h';

function reply(status, body) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function isUuid(value) { return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
function isNotFound(error) { return error?.status === 404 || ['not_found', 'user_not_found'].includes(error?.code); }
function isBanned(user) { if (!user?.banned_until) return false; const until = Date.parse(user.banned_until); return Number.isNaN(until) || until > Date.now(); }
function requiredSecret(name) { const value = Deno.env.get(name); if (!value) throw new Error('Missing server configuration.'); return value; }
function rpcStatus(error) { if (error?.code === '23514') return 409; if (error?.code === '42501') return String(error?.message ?? '').includes('Administrators cannot remove') ? 409 : 403; if (error?.code === '22023') return 422; return 502; }

function adapters(actorClient, adminClient) {
  const side = { lastRpcStatus: 0, lastInviteCode: null };
  return {
    side,
    async inviteAuth(email, metadata) {
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, { data: metadata });
      side.lastInviteCode = error?.code ?? null;
      return error || !data?.user?.id ? { ok: false } : { ok: true, value: data.user.id };
    },
    async readStaff(id) {
      const { data, error } = await adminClient.from('profiles').select('id, display_name, role, is_active').eq('id', id).maybeSingle();
      if (error) return { ok: false };
      return { ok: true, value: data ? { id: data.id, displayName: data.display_name, role: data.role, isActive: data.is_active } : null };
    },
    async readAuth(id) {
      try {
        const { data, error } = await adminClient.auth.admin.getUserById(id);
        if (isNotFound(error)) return { ok: true, value: { present: false, banned: false } };
        if (error || !data?.user) return { ok: false };
        return { ok: true, value: { present: true, banned: isBanned(data.user) } };
      } catch { return { ok: false }; }
    },
    async createInactiveProfile(actorId, id, displayName) {
      const { error } = await actorClient.from('profiles').insert({ id, display_name: displayName, is_active: false });
      return error ? { ok: false } : { ok: true };
    },
    async transitionProfile(actorId, id, role, isActive) {
      try {
        const { data, error } = await adminClient.rpc('transition_staff_profile', { requested_actor_id: actorId, requested_target_id: id, requested_role: role, requested_is_active: isActive });
        side.lastRpcStatus = error ? rpcStatus(error) : side.lastRpcStatus;
        if (error) return { ok: false };
        const row = Array.isArray(data) && data.length === 1 ? data[0] : null;
        return row?.target_id === id && row?.next_role === role && row?.next_is_active === isActive ? { ok: true } : { ok: false };
      } catch { return { ok: false }; }
    },
    async setAuthBanned(id, banned) {
      try {
        const { data, error } = await adminClient.auth.admin.updateUserById(id, { ban_duration: banned ? BAN_DURATION : 'none' });
        return !error && Boolean(data?.user) ? { ok: true } : { ok: false };
      } catch { return { ok: false }; }
    },
    async deleteAuthUser(id) {
      try {
        const { error } = await adminClient.auth.admin.deleteUser(id);
        return !error || isNotFound(error) ? { ok: true } : { ok: false };
      } catch { return { ok: false }; }
    },
  };
}

function inviteStatus(outcome, side) {
  if (outcome.kind === 'success') return reply(201, { staff: outcome.staff });
  if (outcome.kind === 'rejected') return reply(422, { error: 'Correo, nombre o rol inválido.' });
  if (side.lastInviteCode === 'email_address_invalid') return reply(422, { error: 'El correo no puede recibir invitaciones.' });
  if (side.lastInviteCode === 'email_exists' || side.lastInviteCode === 'user_already_exists') return reply(409, { error: 'Ya existe una cuenta para ese correo.' });
  if (side.lastInviteCode === 'over_email_send_rate_limit') return reply(429, { error: 'El servicio de invitaciones alcanzó su límite temporal.' });
  return reply(502, { error: 'No se pudo emitir la invitación.', recoveryRequired: outcome.recoveryRequired, recovery: outcome.recovery, compensation: outcome.compensation });
}

function setAccessStatus(outcome, side) {
  if (outcome.kind === 'success') return reply(200, { staff: outcome.staff });
  if (outcome.kind === 'rejected') {
    if (outcome.code === 'staff-not-found') return reply(404, { error: 'Personal no encontrado.' });
    if (outcome.code === 'staff-not-managed') return reply(422, { error: 'El perfil solicitado no tiene un rol gestionable.' });
    return reply(422, { error: 'Cambio de acceso inválido.' });
  }
  if (side.lastRpcStatus === 409) return reply(409, { error: 'El último administrador activo no puede perder acceso.' });
  if (side.lastRpcStatus === 403) return reply(403, { error: 'No tenés permiso para modificar este acceso.' });
  return reply(502, { error: outcome.recoveryRequired ? 'Se requiere recuperación para completar el cambio de acceso.' : 'No se pudo completar el cambio de acceso.', recoveryRequired: outcome.recoveryRequired, recovery: outcome.recovery, compensation: outcome.compensation });
}

function buildCommand(body, actorId) {
  if (body.action === 'invite') {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const role = typeof body.role === 'string' ? body.role : '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || displayName.length < 2 || displayName.length > 100 || !ALLOWED_ROLES.has(role)) return null;
    return { actorId, email, displayName, role, metadata: { display_name: displayName } };
  }
  if (body.action === 'set-access') {
    if (!isUuid(body.userId) || (body.role !== undefined && (typeof body.role !== 'string' || !ALLOWED_ROLES.has(body.role))) || (body.isActive !== undefined && typeof body.isActive !== 'boolean')) return null;
    const command = { actorId, userId: body.userId, ...(typeof body.role === 'string' ? { role: body.role } : {}), ...(typeof body.isActive === 'boolean' ? { isActive: body.isActive } : {}) };
    return command.role === undefined && command.isActive === undefined ? null : command;
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.match(/^Bearer\s+\S+$/)) return reply(401, { error: 'No autorizado.' });
  try {
    const url = requiredSecret('SUPABASE_URL');
    const anonKey = requiredSecret('SUPABASE_ANON_KEY');
    const serviceKey = requiredSecret('SUPABASE_SERVICE_ROLE_KEY');
    const options = { auth: { persistSession: false, autoRefreshToken: false } };
    const actorClient = createClient(url, anonKey, { ...options, global: { headers: { Authorization: authorization } } });
    const adminClient = createClient(url, serviceKey, options);
    const { data: authData, error: authError } = await actorClient.auth.getUser();
    if (authError || !authData?.user) return reply(401, { error: 'No autorizado.' });
    const actorId = authData.user.id;
    const { data: actor, error: actorError } = await actorClient.from('profiles').select('role, is_active').eq('id', actorId).maybeSingle();
    if (actorError || !actor?.is_active || actor.role !== 'administrator') return reply(403, { error: 'No tenés permiso para gestionar accesos.' });
    let parsed;
    try { parsed = await request.json(); } catch { return reply(422, { error: 'La solicitud no contiene JSON válido.' }); }
    if (!isObject(parsed)) return reply(422, { error: 'El cuerpo de la solicitud es inválido.' });
    const command = buildCommand(parsed, actorId);
    if (!command) return reply(422, { error: 'Solicitud de gestión de acceso inválida.' });
    const ops = adapters(actorClient, adminClient);
    const outcome = parsed.action === 'invite' ? await inviteStaff(command, ops) : await setStaffAccess(command, ops);
    return parsed.action === 'invite' ? inviteStatus(outcome, ops.side) : setAccessStatus(outcome, ops.side);
  } catch { return reply(500, { error: 'Error interno al gestionar accesos.' }); }
});
