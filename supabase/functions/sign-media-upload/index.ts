import { createClient } from 'npm:@supabase/supabase-js@2.112.3';
import { createSignature, validateFolder } from './signature.js';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const ALLOWED_ROLES = new Set(['administrator', 'editor']);

function reply(status, body) { return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function requiredSecret(name) { const value = Deno.env.get(name); if (!value) throw new Error('Missing server configuration.'); return value; }
async function sha1Hex(input) {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply(405, { error: 'Método no permitido.' });
  const authorization = request.headers.get('Authorization');
  if (!authorization?.match(/^Bearer\s+\S+$/)) return reply(401, { error: 'No autorizado.' });
  try {
    const url = requiredSecret('SUPABASE_URL');
    const anonKey = requiredSecret('SUPABASE_ANON_KEY');
    const cloudName = requiredSecret('CLOUDINARY_CLOUD_NAME');
    const apiKey = requiredSecret('CLOUDINARY_API_KEY');
    const apiSecret = requiredSecret('CLOUDINARY_API_SECRET');
    const actorClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authorization } } });
    const { data: authData, error: authError } = await actorClient.auth.getUser();
    if (authError || !authData?.user) return reply(401, { error: 'No autorizado.' });
    const { data: actor, error: actorError } = await actorClient.from('profiles').select('role, is_active').eq('id', authData.user.id).maybeSingle();
    if (actorError || !actor?.is_active || !ALLOWED_ROLES.has(actor.role)) return reply(403, { error: 'No tenés permiso para subir imágenes.' });
    let parsed;
    try { parsed = await request.json(); } catch { return reply(422, { error: 'La solicitud no contiene JSON válido.' }); }
    if (!isObject(parsed) || typeof parsed.folder !== 'string' || !validateFolder(parsed.folder)) return reply(422, { error: 'Carpeta de subida inválida.' });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await createSignature({ folder: parsed.folder, timestamp }, apiSecret, sha1Hex);
    return reply(200, { cloudName, apiKey, timestamp, folder: parsed.folder, signature, uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload` });
  } catch { return reply(500, { error: 'Error interno al firmar la subida.' }); }
});