import assert from 'node:assert/strict';
import { createCloudinaryProviderReader } from '../supabase/functions/video-media/provider.js';
import { createVideoMediaHandler } from '../supabase/functions/video-media/handler.js';

let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`  ok - ${name}`); };
console.log('video provider read-only request regression');
await check('registration reads metadata by default while explicit comparison and preset queries stay bounded', async () => {
  const calls = [];
  const reader = createCloudinaryProviderReader({ cloudName: 'demo', apiKey: 'key', apiSecret: 'secret', fetchImpl: async (url, options) => {
    calls.push({ url, options });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  } });
  await reader.readProviderAsset('asanda/videos/owned-one');
  await reader.readProviderAsset('asanda/videos/owned-one', { mediaMetadata: false });
  await reader.readProviderAsset('asanda/videos/owned-one', { mediaMetadata: true });
  await reader.readUploadPreset('private-preset');
  assert.deepEqual(calls.map(({ url }) => url), [
    'https://api.cloudinary.com/v1_1/demo/resources/video/authenticated/asanda%2Fvideos%2Fowned-one?media_metadata=true',
    'https://api.cloudinary.com/v1_1/demo/resources/video/authenticated/asanda%2Fvideos%2Fowned-one',
    'https://api.cloudinary.com/v1_1/demo/resources/video/authenticated/asanda%2Fvideos%2Fowned-one?media_metadata=true',
    'https://api.cloudinary.com/v1_1/demo/upload_presets/private-preset',
  ]);
  for (const { options } of calls) {
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    assert.deepEqual(options.headers, { Authorization: `Basic ${btoa('key:secret')}`, Accept: 'application/json' });
  }
});
await check('register and publish consume trusted metadata duration without relaxing validation', async () => {
  const publicId = 'asanda/videos/owned-one';
  const good = { public_id: publicId, resource_type: 'video', type: 'authenticated', format: 'mp4', bytes: 1000, width: 1280, height: 720 };
  for (const overrides of [{}, { duration: undefined }, { duration: 0 }, { duration: '76.5' }, { bytes: 100000001 }, { type: 'upload' }]) {
    const requests = []; const writes = [];
    const reader = createCloudinaryProviderReader({ cloudName: 'demo', apiKey: 'key', apiSecret: 'secret', fetchImpl: async (url, options) => {
      requests.push({ url, options });
      const duration = new URL(url).searchParams.get('media_metadata') === 'true' ? 76.5 : undefined;
      return new Response(JSON.stringify({ ...good, duration, metadata: { private_value: 'not-for-client' }, ...overrides }), { status: 200 });
    } });
    const base = { id: 'video-1', title: 'Video prueba', slug: 'video-prueba', provider: 'cloudinary', provider_video_id: publicId, publication_status: 'draft' };
    const handler = createVideoMediaHandler({ ...reader, now: () => new Date('2026-09-01T00:00:00Z'), authenticate: async () => ({ id: 'editor-1', role: 'editor', isActive: true }),
      readVideo: async () => base,
      insertDraft: async payload => { writes.push(['insert', payload]); return { ...base, ...payload }; },
      publishVideo: async (id, publishedAt, expectedId) => { writes.push(['publish', id, publishedAt, expectedId]); return { ...base, publication_status: 'published', published_at: publishedAt }; },
    });
    for (const body of [{ action: 'register', publicId, title: base.title, slug: base.slug }, { action: 'publish', videoId: base.id, publishedAt: '2026-09-01T00:00:00Z' }]) {
      const response = await handler(new Request('https://functions.test/video-media', { method: 'POST', headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }));
      const result = await response.json();
      const valid = Object.keys(overrides).length === 0;
      assert.equal(response.status, valid ? (body.action === 'register' ? 201 : 200) : 422);
      assert.doesNotMatch(JSON.stringify(result), /private_value|not-for-client|secret/);
    }
    assert.equal(requests.length, 2);
    for (const { url, options } of requests) { assert.equal(new URL(url).search, '?media_metadata=true'); assert.equal(options.method, 'GET'); }
    if (Object.keys(overrides).length === 0) {
      assert.equal(writes[0][1].duration_seconds, 77); assert.equal(writes[0][1].publication_status, 'draft'); assert.equal(writes[0][1].published_at, null);
      assert.deepEqual(writes[1], ['publish', base.id, '2026-09-01T00:00:00.000Z', publicId]);
    } else assert.deepEqual(writes, []);
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
