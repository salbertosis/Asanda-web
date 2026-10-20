import assert from 'node:assert/strict';
import { createCloudinaryProviderReader } from '../supabase/functions/video-media/provider.js';

let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`  ok - ${name}`); };
console.log('video provider read-only request regression');
await check('baseline, metadata comparison and presets use only fixed authenticated GET endpoints', async () => {
  const calls = [];
  const reader = createCloudinaryProviderReader({ cloudName: 'demo', apiKey: 'key', apiSecret: 'secret', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  await reader.readProviderAsset('asanda/videos/owned-one');
  await reader.readProviderAsset('asanda/videos/owned-one', { mediaMetadata: true });
  await reader.readUploadPreset('private-preset');
  assert.deepEqual(calls.map(({ url }) => url), [
    'https://api.cloudinary.com/v1_1/demo/resources/video/authenticated/asanda%2Fvideos%2Fowned-one',
    'https://api.cloudinary.com/v1_1/demo/resources/video/authenticated/asanda%2Fvideos%2Fowned-one?media_metadata=true',
    'https://api.cloudinary.com/v1_1/demo/upload_presets/private-preset',
  ]);
  for (const { options } of calls) {
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    assert.deepEqual(options.headers, { Authorization: `Basic ${btoa('key:secret')}`, Accept: 'application/json' });
  }
});
await check('provider failures retain only status and never read or echo provider error bodies', async () => {
  let bodyReads = 0;
  const reader = createCloudinaryProviderReader({ cloudName: 'demo', apiKey: 'key', apiSecret: 'secret', fetchImpl: async () => ({ ok: false, status: 403, json: async () => { bodyReads += 1; return { error: 'private-token-value' }; } }) });
  await assert.rejects(() => reader.readProviderAsset('asanda/videos/owned-one'), error => {
    assert.equal(error.message, 'Provider read failed.'); assert.equal(error.providerStatus, 403);
    assert.doesNotMatch(error.message, /private-token-value|secret/); return true;
  });
  assert.equal(bodyReads, 0);
});
await check('invalid or foreign public IDs never cause a provider request', async () => {
  let calls = 0;
  const reader = createCloudinaryProviderReader({ cloudName: 'demo', apiKey: 'key', apiSecret: 'secret', fetchImpl: async () => { calls += 1; throw new Error('unexpected'); } });
  for (const id of ['WhatsApp_Video', 'asanda/videos/../other', 'https://evil.test/video']) await assert.rejects(() => reader.readProviderAsset(id), /INVALID_VIDEO_ID/);
  assert.equal(calls, 0);
});
console.log(`\n${passed} passed`);
