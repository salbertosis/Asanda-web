import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const c = {
  url: process.env.ASANDA_STAGING_URL,
  key: process.env.ASANDA_STAGING_PUBLISHABLE_KEY,
  adminEmail: process.env.ASANDA_STAGING_ADMIN_PASSWORD_EMAIL,
  adminPassword: process.env.ASANDA_STAGING_ADMIN_PASSWORD,
  editorEmail: process.env.ASANDA_STAGING_EDITOR_PASSWORD_EMAIL,
  editorPassword: process.env.ASANDA_STAGING_EDITOR_PASSWORD,
  cloudinarySecret: process.env.ASANDA_STAGING_CLOUDINARY_API_SECRET,
};
for (const [name, value] of Object.entries(c)) {
  if (!value) throw new Error(`Missing required staging environment variable: ${name}.`);
}
const sha1Hex = (input) => createHash('sha1').update(input).digest('hex');

async function json(response) { try { return await response.json(); } catch { return null; } }
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
async function invokeSign(token, payload, method = 'POST') {
  const response = await fetch(`${c.url}/functions/v1/sign-media-upload`, {
    method, headers: {
      apikey: c.key, Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json',
    }, body: method === 'POST' ? JSON.stringify(payload) : undefined,
  });
  return { status: response.status, body: await json(response) };
}
async function setStaffActive(adminToken, userId, isActive) {
  const response = await fetch(`${c.url}/functions/v1/manage-staff`, {
    method: 'POST', headers: {
      apikey: c.key, Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json',
    }, body: JSON.stringify({ action: 'set-access', userId, isActive }),
  });
  const value = await json(response);
  assert.equal(response.status, 200, 'manage-staff set-access must succeed.');
  assert.equal(value?.staff?.isActive, isActive, 'manage-staff must confirm the active flag.');
}

let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`  ok - ${name}`); };

console.log('admin sign-media-upload hosted staging regression');
const anon = await invokeSign(null, { folder: 'asanda/prueba' });
await check('anonymous request is denied', () => assert.equal(anon.status, 401));
const bogus = await invokeSign('bogus-token', { folder: 'asanda/prueba' });
await check('invalid bearer is denied', () => assert.equal(bogus.status, 401));
const method = await invokeSign(null, null, 'GET');
await check('non-POST method is denied', () => assert.equal(method.status, 405));
const invalidFolder = await invokeSign('x', { folder: 'other/prueba' });
await check('foreign folder is rejected before authorization', () => assert.equal(invalidFolder.status, 401));

const editor = await signIn(c.editorEmail, c.editorPassword);
const empty = await invokeSign(editor.token, {});
await check('missing folder is rejected', () => assert.equal(empty.status, 422));
const malformed = await invokeSign(editor.token, null);
await check('malformed body is rejected', () => assert.equal(malformed.status, 422));
const badFolder = await invokeSign(editor.token, { folder: 'other/x' });
await check('invalid folder is rejected', () => assert.equal(badFolder.status, 422));

const signed = await invokeSign(editor.token, { folder: 'asanda/prueba' });
await check('editor receives a bounded signature payload', () => {
  assert.equal(signed.status, 200);
  assert.equal(signed.body.folder, 'asanda/prueba');
  assert.ok(signed.body.cloudName && signed.body.apiKey && typeof signed.body.timestamp === 'number');
  assert.match(signed.body.signature, /^[0-9a-f]{40}$/);
  assert.ok(signed.body.uploadUrl.includes(signed.body.cloudName));
  assert.ok(!JSON.stringify(signed.body).includes(c.cloudinarySecret));
});
await check('signature verifies against the staging secret', () => {
  const expected = sha1Hex(`folder=${signed.body.folder}&timestamp=${signed.body.timestamp}${c.cloudinarySecret}`);
  assert.equal(signed.body.signature, expected);
});

const admin = await signIn(c.adminEmail, c.adminPassword);
await setStaffActive(admin.token, editor.userId, false);
const deactivated = await invokeSign(editor.token, { folder: 'asanda/prueba' });
await check('deactivated actor is denied with the same session (Auth ban or fresh role check)', () => {
  assert.ok([401, 403].includes(deactivated.status), `expected immediate denial, got ${deactivated.status}`);
});
await setStaffActive(admin.token, editor.userId, true);
const restored = await invokeSign(editor.token, { folder: 'asanda/prueba' });
await check('restored actor signs again without re-login', () => assert.equal(restored.status, 200));

console.log(`\n${passed} passed`);