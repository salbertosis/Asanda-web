import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const adminSource = readFileSync(new URL('../src/services/admin/videos.js', import.meta.url), 'utf8');
const adminExecutable = adminSource.replace("import { supabase } from '../supabase';", 'const supabase = globalThis.__videoAdminSupabase;');
const publicSource = readFileSync(new URL('../src/services/videos.js', import.meta.url), 'utf8');
const supabaseConfig = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
const publicExecutable = publicSource.replace("import { supabase } from './supabase.js';", 'const supabase = globalThis.__publicVideoSupabase;');

const calls = [];
const resultQuery = (result) => {
  const query = {
    select(value) { calls.push(['select', value]); return query; }, eq(key, value) { calls.push(['eq', key, value]); return query; },
    lte(key, value) { calls.push(['lte', key, value]); return query; }, order(key, options) { calls.push(['order', key, options]); return query; },
    maybeSingle() { calls.push(['maybeSingle']); return Promise.resolve(result); }, single() { calls.push(['single']); return Promise.resolve(result); },
    abortSignal(signal) { calls.push(['abortSignal', signal]); return query; }, then(resolve, reject) { return Promise.resolve(result).then(resolve, reject); },
  };
  return query;
};
const row = (overrides = {}) => ({ id: 'video-1', slug: 'video-prueba', title: 'Video prueba', description: null, provider: 'cloudinary', provider_video_id: 'asanda/videos/owned-one', duration_seconds: 13, thumbnail_asset_id: null, publication_status: 'draft', published_at: null, created_at: '2026-09-01T00:00:00Z', updated_at: '2026-09-01T00:00:00Z', ...overrides });
let nextResult = { data: row(), error: null };
globalThis.__videoAdminSupabase = {
  functions: { invoke(name, options) { calls.push(['invoke', name, options]); return Promise.resolve(nextResult); } },
  from(table) { calls.push(['from', table]); return {
    select(columns) { calls.push(['table-select', columns]); return resultQuery(nextResult); },
    update(payload) { calls.push(['update', payload]); return resultQuery(nextResult); },
  }; },
};
globalThis.__publicVideoSupabase = globalThis.__videoAdminSupabase;
const admin = await import(`data:text/javascript;base64,${Buffer.from(adminExecutable).toString('base64')}`);
const publicVideos = await import(`data:text/javascript;base64,${Buffer.from(publicExecutable).toString('base64')}`);

let passed = 0;
const check = async (name, fn) => { calls.length = 0; await fn(); passed += 1; console.log(`  ok - ${name}`); };
console.log('video service deterministic regression');

await check('client file validation accepts MP4 through decimal 100 MB and rejects every named boundary', () => {
  assert.equal(admin.validateVideoFile({ name: 'race.MP4', type: 'video/mp4', size: 100000000 }).ok, true);
  for (const file of [null, { name: '../race.mp4', type: 'video/mp4', size: 1 }, { name: 'race.mov', type: 'video/mp4', size: 1 }, { name: 'race.mp4', type: 'video/quicktime', size: 1 }, { name: 'race.mp4', type: 'video/mp4', size: 0 }, { name: 'race.mp4', type: 'video/mp4', size: 100000001 }, { name: 'race.mp4', type: 'video/mp4', size: 1.5 }]) {
    assert.equal(admin.validateVideoFile(file).ok, false, JSON.stringify(file));
  }
});
await check('signature service sends only descriptor metadata to separate endpoint', async () => {
  nextResult = { data: { upload: { signature: 'signed' } }, error: null };
  const value = await admin.requestVideoUploadSignature({ name: 'race.mp4', type: 'video/mp4', size: 42 });
  assert.deepEqual(value, { signature: 'signed' });
  assert.deepEqual(calls[0], ['invoke', 'video-media', { body: { action: 'sign-upload', fileName: 'race.mp4', mimeType: 'video/mp4', size: 42 } }]);
});
await check('direct upload uses fixed signed fields, supports cancellation and returns minimal response', async () => {
  const controller = new AbortController();
  let request;
  const fetchImpl = async (url, options) => { request = { url, options }; return new Response(JSON.stringify({ public_id: 'asanda/videos/owned-one', format: 'mp4', bytes: 42, duration: 2, width: 640, height: 360 }), { status: 200, headers: { 'Content-Type': 'application/json' } }); };
  const upload = { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload', apiKey: 'key', timestamp: 1, folder: 'asanda/videos', type: 'authenticated', uploadPreset: 'preset', signature: 'signature' };
  const result = await admin.uploadVideoToCloudinary({ name: 'race.mp4', type: 'video/mp4', size: 42 }, upload, { signal: controller.signal, fetchImpl });
  assert.equal(request.url, upload.uploadUrl);
  assert.equal(request.options.signal, controller.signal);
  assert.equal(request.options.method, 'POST');
  assert.deepEqual([...request.options.body.keys()].sort(), ['api_key', 'file', 'folder', 'signature', 'timestamp', 'type', 'upload_preset']);
  assert.deepEqual(result, { publicId: 'asanda/videos/owned-one' });
});
await check('failed provider upload and cancellation map to stable Spanish feedback', async () => {
  const upload = { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload', apiKey: 'key', timestamp: 1, folder: 'asanda/videos', type: 'authenticated', uploadPreset: 'preset', signature: 'signature' };
  await assert.rejects(() => admin.uploadVideoToCloudinary({ name: 'race.mp4', type: 'video/mp4', size: 42 }, upload, { fetchImpl: async () => new Response('{}', { status: 400 }) }), (error) => error.code === 'provider-upload-failed');
  assert.match(admin.formatVideoError({ name: 'AbortError' }), /cancelada/i);
  assert.match(admin.formatVideoError({ code: 'provider-upload-failed' }), /subir/i);
});
await check('draft registration invokes server and reports a private orphan when DB registration fails', async () => {
  nextResult = { data: null, error: { message: 'duplicate', code: 'FunctionsHttpError' } };
  await assert.rejects(() => admin.registerVideoDraft({ publicId: 'asanda/videos/owned-one', title: 'Video prueba', slug: 'video-prueba', description: '' }), (error) => {
    assert.equal(error.code, 'video-registration-failed');
    assert.equal(error.privateAssetMayRemain, true);
    assert.match(admin.formatVideoError(error), /privado en Cloudinary/i);
    return true;
  });
  assert.deepEqual(calls[0], ['invoke', 'video-media', { body: { action: 'register', publicId: 'asanda/videos/owned-one', title: 'Video prueba', slug: 'video-prueba', description: '' } }]);
});
await check('admin updates whitelist editable metadata and publication lifecycle keys', async () => {
  nextResult = { data: row(), error: null };
  await assert.rejects(() => admin.updateAdminVideo('video-1', { title: 'Título válido', slug: 'titulo-valido', provider: 'youtube' }), /VIDEO_INPUT_INVALID/);
  assert.equal(calls.some((call) => call[0] === 'update'), false);
  await admin.updateAdminVideo('video-1', { title: ' Título válido ', slug: 'titulo-valido', description: ' Texto ', thumbnailAssetId: null });
  const update = calls.find((call) => call[0] === 'update');
  assert.deepEqual(update[1], { title: 'Título válido', slug: 'titulo-valido', description: 'Texto', thumbnail_asset_id: null });
  calls.length = 0;
  nextResult = { data: { video: { id: 'video-1', publicationStatus: 'published' } }, error: null };
  await admin.publishAdminVideo('video-1', '2026-09-01T12:00:00Z');
  assert.deepEqual(calls[0], ['invoke', 'video-media', { body: { action: 'publish', videoId: 'video-1', publishedAt: '2026-09-01T12:00:00.000Z' } }]);
  calls.length = 0;
  nextResult = { data: row(), error: null };
  await admin.archiveAdminVideo('video-1');
  assert.deepEqual(calls.find((call) => call[0] === 'update')[1], { publication_status: 'archived', published_at: null });
  calls.length = 0;
  nextResult = { data: row({ provider: 'youtube', provider_video_id: 'public-id' }), error: null };
  await assert.rejects(() => admin.archiveAdminVideo('video-1'), /VIDEO_NOT_MANAGED/);
  assert.equal(calls.some((call) => call[0] === 'update'), false);
});
await check('invalid titles/slugs and duplicate errors fail clearly', async () => {
  await assert.rejects(() => admin.updateAdminVideo('video-1', { title: 'x', slug: 'Bad Slug' }), /VIDEO_INPUT_INVALID/);
  assert.match(admin.formatVideoError({ code: '23505', message: 'duplicate key' }), /slug|registrado/i);
});
await check('preview request returns only server response values', async () => {
  nextResult = { data: { videoId: 'video-1', title: 'Video prueba', url: 'https://res.cloudinary.com/demo/video/authenticated/s--12345678--/asanda/videos/owned-one.mp4' }, error: null };
  const value = await admin.requestVideoPreview('video-1');
  assert.deepEqual(value, nextResult.data);
  assert.deepEqual(calls[0], ['invoke', 'video-media', { body: { action: 'preview', videoId: 'video-1' } }]);
});
await check('public list explicitly asks only for published Cloudinary rows due now and supports cancellation', async () => {
  nextResult = { data: [row({ publication_status: 'published', published_at: '2026-08-01T00:00:00Z' })], error: null };
  const controller = new AbortController();
  const values = await publicVideos.listPublishedVideos({ now: new Date('2026-09-01T12:00:00Z'), signal: controller.signal });
  assert.equal(values.length, 1);
  assert.equal(values[0].providerVideoId, undefined);
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'provider' && call[2] === 'cloudinary'));
  assert.ok(calls.some((call) => call[0] === 'eq' && call[1] === 'publication_status' && call[2] === 'published'));
  assert.ok(calls.some((call) => call[0] === 'lte' && call[1] === 'published_at'));
  assert.ok(calls.some((call) => call[0] === 'abortSignal' && call[1] === controller.signal));
});
await check('public playback delegates row authority and signing to video-media', async () => {
  nextResult = { data: { videoId: 'video-1', title: 'Video prueba', url: 'https://res.cloudinary.com/demo/video/authenticated/s--12345678--/asanda/videos/owned-one.mp4' }, error: null };
  assert.deepEqual(await publicVideos.requestVideoPlayback('video-1'), nextResult.data);
  assert.deepEqual(calls[0], ['invoke', 'video-media', { body: { action: 'playback', videoId: 'video-1' } }]);
});
await check('services never construct delivery URLs or expose provider IDs publicly', () => {
  assert.doesNotMatch(adminSource, /CLOUDINARY_API_SECRET|res\.cloudinary\.com/);
  assert.doesNotMatch(publicSource, /provider_video_id|res\.cloudinary\.com/);
});
await check('only the video-media function block disables gateway JWT verification', () => {
  const sections = new Map();
  let section = '';
  for (const rawLine of supabaseConfig.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+#.*$/, '').trim();
    const header = line.match(/^\[([^\]]+)\]$/);
    if (header) { section = header[1]; if (!sections.has(section)) sections.set(section, new Map()); continue; }
    const setting = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (setting && section) sections.get(section).set(setting[1], setting[2]);
  }
  assert.equal(sections.get('functions.video-media')?.get('verify_jwt'), 'false');
  for (const [name, settings] of sections) {
    if (name.startsWith('functions.') && name !== 'functions.video-media') assert.notEqual(settings.get('verify_jwt'), 'false');
  }
});

console.log(`\n${passed} passed`);
