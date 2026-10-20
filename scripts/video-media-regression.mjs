import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  VIDEO_FOLDER, VIDEO_MAX_BYTES, buildAuthenticatedVideoUrl, createDeliverySignature,
  createUploadSignature, validateProviderAsset, validateUploadPreset,
} from '../supabase/functions/video-media/signature.js';
import { createVideoMediaHandler } from '../supabase/functions/video-media/handler.js';

const sha1Hex = (value) => createHash('sha1').update(value).digest('hex');
const sha1Base64Url = (value) => createHash('sha1').update(value).digest('base64url');
const jsonRequest = (body, token = null, method = 'POST') => new Request('https://functions.test/video-media', {
  method,
  headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  body: method === 'POST' ? JSON.stringify(body) : undefined,
});
const readResponse = async (response) => ({ status: response.status, headers: response.headers, body: await response.json() });
const actor = { id: 'editor-1', role: 'editor', isActive: true };
const asset = (overrides = {}) => ({
  public_id: 'asanda/videos/owned-one', resource_type: 'video', type: 'authenticated', format: 'mp4',
  bytes: 1000, duration: 12.4, width: 1280, height: 720, ...overrides,
});
const video = (overrides = {}) => ({
  id: 'video-1', title: 'Prueba sintética', slug: 'prueba-sintetica', description: null,
  provider: 'cloudinary', provider_video_id: 'asanda/videos/owned-one', duration_seconds: 13,
  thumbnail_asset_id: null, publication_status: 'draft', published_at: null, ...overrides,
});
const preset = (overrides = {}) => ({ name: 'asanda_video_authenticated', unsigned: false, settings: {
  type: 'authenticated', folder: VIDEO_FOLDER, allowed_formats: 'mp4', ...overrides,
} });
const dynamicPreset = (overrides = {}) => ({ name: 'asanda_video_authenticated', unsigned: false, settings: {
  type: 'authenticated', asset_folder: VIDEO_FOLDER, use_asset_folder_as_public_id_prefix: true, allowed_formats: 'mp4', ...overrides,
} });

let passed = 0;
const check = async (name, fn) => { await fn(); passed += 1; console.log(`  ok - ${name}`); };
console.log('video-media request-handler deterministic regression');

await check('upload signatures use fixed authenticated video parameters and canonical SHA-1', () => {
  const params = { folder: VIDEO_FOLDER, timestamp: 1700000000, type: 'authenticated', upload_preset: 'asanda_video_authenticated' };
  assert.equal(createUploadSignature(params, 'secret', sha1Hex), sha1Hex('folder=asanda/videos&timestamp=1700000000&type=authenticated&upload_preset=asanda_video_authenticatedsecret'));
});
await check('authenticated original URL uses primary-documented SHA-1 binary base64url signatures', async () => {
  assert.equal(sha1Base64Url('c_fill,w_300,h_250/e_grayscale/sample-authenticated.pngabcd').slice(0, 8), 'iDy_JeBq');
  assert.equal(await createDeliverySignature('asanda/videos/owned-one', 'mp4', 'secret', sha1Base64Url), 'cfavqf7H');
  assert.equal(await buildAuthenticatedVideoUrl('demo-cloud', 'asanda/videos/owned-one', 'secret', sha1Base64Url), 'https://res.cloudinary.com/demo-cloud/video/authenticated/s--cfavqf7H--/asanda/videos/owned-one.mp4');
});
await check('upload preset returns exact legacy or dynamic signed parameters', () => {
  assert.deepEqual(validateUploadPreset(preset()), { ok: true, folderMode: 'legacy', uploadParameters: { folder: VIDEO_FOLDER } });
  assert.deepEqual(validateUploadPreset(preset({ allowed_formats: ['mp4'] })), { ok: true, folderMode: 'legacy', uploadParameters: { folder: VIDEO_FOLDER } });
  assert.deepEqual(validateUploadPreset(dynamicPreset()), { ok: true, folderMode: 'dynamic', uploadParameters: { asset_folder: VIDEO_FOLDER, use_asset_folder_as_public_id_prefix: true } });
});
await check('upload preset rejects unsafe folder, prefix, type and format conflicts', () => {
  for (const candidate of [
    preset({ folder: 'asanda/other' }), preset({ type: 'upload' }), preset({ allowed_formats: 'mp4,mov' }),
    preset({ allowed_formats: ['mp4', 'mov'] }), preset({ allowed_formats: ' mp4 ' }), preset({ allowed_formats: '' }), preset({ allowed_formats: 42 }),
    dynamicPreset({ asset_folder: 'asanda/other' }), dynamicPreset({ use_asset_folder_as_public_id_prefix: false }),
    dynamicPreset({ folder: VIDEO_FOLDER }), dynamicPreset({ public_id_prefix: VIDEO_FOLDER }), dynamicPreset({ allowed_formats: 'mov' }),
    { ...preset(), unsigned: true }, { ...dynamicPreset(), unsigned: true },
  ]) assert.equal(validateUploadPreset(candidate).ok, false);
});
await check('provider metadata validates exact private MP4 identity, size and dimensions', () => {
  assert.equal(validateProviderAsset(asset()).ok, true);
  for (const candidate of [asset({ public_id: 'other/video' }), asset({ public_id: 'asanda/videos/nested/video' }), asset({ resource_type: 'image' }), asset({ type: 'upload' }), asset({ format: 'mov' }), asset({ bytes: 0 }), asset({ bytes: VIDEO_MAX_BYTES + 1 }), asset({ duration: 0 }), asset({ width: 0 }), asset({ height: null })]) {
    assert.equal(validateProviderAsset(candidate).ok, false);
  }
});

const makeHarness = (overrides = {}) => {
  const state = { authCalls: 0, metadataReads: 0, videoReads: 0, writes: 0 };
  const deps = {
    cloudName: 'demo-cloud', apiKey: 'public-key', apiSecret: 'server-secret', uploadPreset: 'asanda_video_authenticated',
    now: () => new Date('2026-09-01T12:00:00Z'), sha1Hex, sha1Base64Url,
    authenticate: async (authorization) => { state.authCalls += 1; return authorization === 'Bearer good' ? actor : null; },
    readUploadPreset: async () => preset(),
    readProviderAsset: async (publicId) => { state.metadataReads += 1; return asset({ public_id: publicId }); },
    readVideo: async (id, options) => { state.videoReads += 1; return id === 'video-1' ? video(options.public ? { publication_status: 'published', published_at: '2026-08-01T00:00:00Z' } : {}) : null; },
    insertDraft: async (payload) => { state.writes += 1; return video({ ...payload, id: 'created-1' }); },
    publishVideo: async (id, publishedAt) => { state.writes += 1; return video({ id, publication_status: 'published', published_at: publishedAt }); },
    ...overrides,
  };
  return { state, handler: createVideoMediaHandler(deps) };
};

await check('MP4 name, MIME, positive decimal-size boundaries and malformed JSON are enforced without writes', async () => {
  const { handler, state } = makeHarness();
  for (const file of [
    { fileName: 'clip.mov', mimeType: 'video/mp4', size: 1 }, { fileName: 'clip.mp4', mimeType: 'video/quicktime', size: 1 },
    { fileName: '../clip.mp4', mimeType: 'video/mp4', size: 1 }, { fileName: 'clip.mp4', mimeType: 'video/mp4', size: 0 },
    { fileName: 'clip.mp4', mimeType: 'video/mp4', size: VIDEO_MAX_BYTES + 1 }, { fileName: 'clip.mp4', mimeType: 'video/mp4', size: NaN },
  ]) {
    const result = await readResponse(await handler(jsonRequest({ action: 'sign-upload', ...file }, 'good')));
    assert.equal(result.status, 422, JSON.stringify(file));
  }
  const boundary = await readResponse(await handler(jsonRequest({ action: 'sign-upload', fileName: 'clip.MP4', mimeType: 'video/mp4', size: VIDEO_MAX_BYTES }, 'good')));
  assert.equal(boundary.status, 200);
  const malformed = await handler(new Request('https://functions.test/video-media', { method: 'POST', headers: { Authorization: 'Bearer good', 'Content-Type': 'application/json' }, body: '{' }));
  assert.equal(malformed.status, 422);
  assert.equal(state.writes, 0);
});
await check('anonymous, invalid and inactive editors cannot use protected video actions', async () => {
  for (const action of [
    { action: 'sign-upload', fileName: 'clip.mp4', mimeType: 'video/mp4', size: 1 },
    { action: 'register', publicId: 'asanda/videos/owned-one', title: 'Video válido', slug: 'video-valido', description: '' },
    { action: 'preview', videoId: 'video-1' },
    { action: 'publish', videoId: 'video-1', publishedAt: '2026-09-01T12:00:00Z' },
  ]) {
    const anonymous = makeHarness();
    assert.equal((await anonymous.handler(jsonRequest(action))).status, 401);
    assert.equal(anonymous.state.writes, 0);
    const inactive = makeHarness({ authenticate: async () => ({ ...actor, isActive: false }) });
    assert.equal((await inactive.handler(jsonRequest(action, 'good'))).status, 403);
    assert.equal(inactive.state.writes, 0);
  }
});
await check('sign-upload preserves the fixed legacy folder response and omits secrets', async () => {
  const { handler } = makeHarness();
  const response = await readResponse(await handler(jsonRequest({ action: 'sign-upload', fileName: 'clip.mp4', mimeType: 'video/mp4', size: 42 }, 'good')));
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.upload, {
    uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/video/upload', cloudName: 'demo-cloud', apiKey: 'public-key',
    folder: VIDEO_FOLDER, type: 'authenticated', uploadPreset: 'asanda_video_authenticated', timestamp: 1788264000,
    signature: sha1Hex('folder=asanda/videos&timestamp=1788264000&type=authenticated&upload_preset=asanda_video_authenticatedserver-secret'),
  });
  assert.ok(!JSON.stringify(response.body).includes('server-secret'));
});
await check('sign-upload emits only matching dynamic-folder fields and signs them exactly', async () => {
  const { handler } = makeHarness({ readUploadPreset: async () => dynamicPreset() });
  const response = await readResponse(await handler(jsonRequest({ action: 'sign-upload', fileName: 'clip.mp4', mimeType: 'video/mp4', size: 42 }, 'good')));
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.upload, {
    uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/video/upload', cloudName: 'demo-cloud', apiKey: 'public-key',
    folderMode: 'dynamic', assetFolder: VIDEO_FOLDER, useAssetFolderAsPublicIdPrefix: true,
    type: 'authenticated', uploadPreset: 'asanda_video_authenticated', timestamp: 1788264000,
    signature: sha1Hex('asset_folder=asanda/videos&timestamp=1788264000&type=authenticated&upload_preset=asanda_video_authenticated&use_asset_folder_as_public_id_prefix=trueserver-secret'),
  });
  assert.equal(Object.hasOwn(response.body.upload, 'folder'), false);
});
await check('misconfigured or missing provider preset fails closed', async () => {
  for (const override of [
    { readUploadPreset: async () => preset({ folder: 'asanda/other' }) },
    { readUploadPreset: async () => preset({ type: 'upload' }) },
    { readUploadPreset: async () => preset({ allowed_formats: 'mp4,mov' }) },
    { readUploadPreset: async () => dynamicPreset({ use_asset_folder_as_public_id_prefix: false }) },
    { readUploadPreset: async () => dynamicPreset({ folder: VIDEO_FOLDER }) },
    { readUploadPreset: async () => null },
  ]) {
    const { handler } = makeHarness(override);
    assert.equal((await handler(jsonRequest({ action: 'sign-upload', fileName: 'clip.mp4', mimeType: 'video/mp4', size: 1 }, 'good'))).status, 503);
  }
});
await check('register re-reads provider metadata and rejects mismatch, oversized, path and body overrides without DB writes', async () => {
  const badAssets = [asset({ type: 'upload' }), asset({ bytes: VIDEO_MAX_BYTES + 1 }), asset({ public_id: 'asanda/foreign' }), asset({ format: 'mov' })];
  for (const bad of badAssets) {
    const harness = makeHarness({ readProviderAsset: async () => { harness.state.metadataReads += 1; return bad; } });
    const response = await harness.handler(jsonRequest({ action: 'register', publicId: bad.public_id, title: 'Video válido', slug: 'video-valido', description: '' }, 'good'));
    assert.equal(response.status, 422);
    assert.equal(harness.state.writes, 0);
  }
  for (const injected of [{ provider: 'youtube' }, { bytes: 1 }, { secureUrl: 'https://evil.test/x' }, { folder: 'other' }, { publicationStatus: 'published' }]) {
    const harness = makeHarness();
    const response = await harness.handler(jsonRequest({ action: 'register', publicId: 'asanda/videos/owned-one', title: 'Video válido', slug: 'video-valido', description: '', ...injected }, 'good'));
    assert.equal(response.status, 422);
    assert.equal(harness.state.metadataReads, 0);
    assert.equal(harness.state.writes, 0);
  }
});
await check('register reports only safe provider-read or metadata reason codes without writes', async () => {
  const input = { action: 'register', publicId: 'asanda/videos/owned-one', title: 'Video válido', slug: 'video-valido', description: '' };
  const cases = [
    [asset({ public_id: 'asanda/videos/other' }), 'id-invalid'],
    [asset({ resource_type: 'image' }), 'resource-type-invalid'],
    [asset({ type: 'upload' }), 'delivery-type-invalid'],
    [asset({ format: 'mov' }), 'format-invalid'],
    [asset({ bytes: VIDEO_MAX_BYTES + 1 }), 'bytes-invalid'],
    [asset({ duration: undefined }), 'duration-invalid'],
    [asset({ width: 0 }), 'dimensions-invalid'],
    [null, 'provider-unavailable'],
  ];
  for (const [value, reason] of cases) {
    const harness = makeHarness({ readProviderAsset: async () => { harness.state.metadataReads += 1; return value; } });
    const response = await readResponse(await harness.handler(jsonRequest(input, 'good')));
    assert.equal(response.status, 422);
    assert.deepEqual(response.body, { error: 'El archivo privado no cumple el contrato MP4 de ASANDA.', reason });
    assert.equal(harness.state.metadataReads, 1); assert.equal(harness.state.writes, 0); assert.equal(harness.state.videoReads, 0);
  }
  for (const [providerStatus, reason] of [[401, 'provider-access-denied'], [403, 'provider-access-denied'], [404, 'provider-not-found'], [429, 'provider-rate-limited'], [500, 'provider-unavailable'], [undefined, 'provider-unavailable']]) {
    const harness = makeHarness({ readProviderAsset: async () => { harness.state.metadataReads += 1; throw Object.assign(new Error('private-token-and-provider-body'), { providerStatus }); } });
    const response = await readResponse(await harness.handler(jsonRequest(input, 'good')));
    assert.equal(response.status, 422);
    assert.deepEqual(response.body, { error: 'El archivo privado no cumple el contrato MP4 de ASANDA.', reason });
    assert.doesNotMatch(JSON.stringify(response.body), /private-token|providerStatus|server-secret/);
    assert.equal(harness.state.writes, 0); assert.equal(harness.state.metadataReads, 1);
  }
  const anonymous = makeHarness();
  const denied = await readResponse(await anonymous.handler(jsonRequest(input)));
  assert.equal(denied.status, 401); assert.deepEqual(denied.body, { error: 'No autorizado.' });
  assert.equal(anonymous.state.metadataReads, 0); assert.equal(anonymous.state.writes, 0);
});
await check('register inserts only a Cloudinary draft from verified metadata', async () => {
  let inserted;
  const { handler } = makeHarness({ insertDraft: async (payload) => { inserted = payload; return video({ ...payload, id: 'created-1' }); } });
  const response = await readResponse(await handler(jsonRequest({ action: 'register', publicId: 'asanda/videos/owned-one', title: ' Video válido ', slug: 'video-valido', description: ' Descripción ' }, 'good')));
  assert.equal(response.status, 201);
  assert.deepEqual(inserted, { title: 'Video válido', slug: 'video-valido', description: 'Descripción', provider: 'cloudinary', provider_video_id: 'asanda/videos/owned-one', duration_seconds: 13, thumbnail_asset_id: null, publication_status: 'draft', published_at: null });
  assert.equal(response.body.video.publicationStatus, 'draft');
});
await check('duplicate draft failure reports conflict and never reports success', async () => {
  const harness = makeHarness({ insertDraft: async () => { harness.state.writes += 1; const error = new Error('duplicate key'); error.code = '23505'; throw error; } });
  const response = await readResponse(await harness.handler(jsonRequest({ action: 'register', publicId: 'asanda/videos/owned-one', title: 'Video válido', slug: 'video-valido', description: '' }, 'good')));
  assert.equal(response.status, 409);
  assert.equal(response.body.registered, undefined);
  assert.match(response.body.error, /registrado|slug/i);
});
await check('publish re-verifies provider bytes and changes no row for oversized assets', async () => {
  const harness = makeHarness({ readProviderAsset: async () => asset({ bytes: VIDEO_MAX_BYTES + 1 }) });
  const rejected = await readResponse(await harness.handler(jsonRequest({ action: 'publish', videoId: 'video-1', publishedAt: '2026-09-01T12:00:00Z' }, 'good')));
  assert.equal(rejected.status, 422);
  assert.equal(harness.state.writes, 0);

  const accepted = makeHarness();
  const response = await readResponse(await accepted.handler(jsonRequest({ action: 'publish', videoId: 'video-1', publishedAt: '2026-09-01T12:00:00Z' }, 'good')));
  assert.equal(response.status, 200);
  assert.equal(response.body.video.publicationStatus, 'published');
  assert.equal(accepted.state.writes, 1);
});
await check('anonymous playback denies draft, scheduled, noncloudinary and missing rows without a URL', async () => {
  const rows = [
    video(), video({ publication_status: 'published', published_at: '2030-01-01T00:00:00Z' }),
    video({ publication_status: 'published', published_at: '2026-08-01T00:00:00Z', provider: 'youtube' }), null,
  ];
  for (const row of rows) {
    const harness = makeHarness({ readVideo: async () => row });
    const result = await readResponse(await harness.handler(jsonRequest({ action: 'playback', videoId: 'video-1' })));
    assert.equal(result.status, 404);
    assert.equal(result.body.url, undefined);
  }
});
await check('published playback and editor preview return only signed fixed-origin MP4 metadata', async () => {
  const published = video({ publication_status: 'published', published_at: '2026-08-01T00:00:00Z' });
  const publicHarness = makeHarness({ readVideo: async () => published });
  const playback = await readResponse(await publicHarness.handler(jsonRequest({ action: 'playback', videoId: 'video-1' })));
  assert.equal(playback.status, 200);
  assert.match(playback.body.url, /^https:\/\/res\.cloudinary\.com\/demo-cloud\/video\/authenticated\/s--[A-Za-z0-9_-]{8}--\/asanda\/videos\/owned-one\.mp4$/);
  assert.deepEqual(Object.keys(playback.body).sort(), ['title', 'url', 'videoId']);
  const previewHarness = makeHarness();
  const preview = await readResponse(await previewHarness.handler(jsonRequest({ action: 'preview', videoId: 'video-1' }, 'good')));
  assert.equal(preview.status, 200);
  assert.match(preview.body.url, /^https:\/\/res\.cloudinary\.com\//);
  for (const serialized of [JSON.stringify(playback.body), JSON.stringify(preview.body)]) assert.ok(!serialized.includes('server-secret') && !serialized.includes('public-key'));
});
await check('private responses disable storage and all actions reject unknown keys', async () => {
  const { handler } = makeHarness();
  for (const [body, token] of [[{ action: 'preview', videoId: 'video-1' }, 'good'], [{ action: 'sign-upload', fileName: 'x.mp4', mimeType: 'video/mp4', size: 1 }, 'good'], [{ action: 'playback', videoId: 'video-1' }, null]]) {
    const response = await handler(jsonRequest(body, token));
    assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
    assert.equal(response.headers.get('Vary'), 'Authorization');
  }
  const rejected = await handler(jsonRequest({ action: 'preview', videoId: 'video-1', url: 'https://evil.test' }, 'good'));
  assert.equal(rejected.status, 422);
});
await check('non-POST and unknown actions are bounded', async () => {
  const { handler } = makeHarness();
  assert.equal((await handler(jsonRequest(null, null, 'GET'))).status, 405);
  assert.equal((await handler(jsonRequest({ action: 'destroy' }))).status, 422);
});

console.log(`\n${passed} passed`);
