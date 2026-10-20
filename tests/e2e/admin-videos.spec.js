import { expect, test } from '@playwright/test';

const userId = '10000000-0000-4000-8000-000000000001';
const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.signature`;
const authUser = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z', is_anonymous: false };
const profile = { id: userId, display_name: 'Editor E2E', role: 'editor', is_active: true };
const videoId = '50000000-0000-4000-8000-000000000001';

async function routeAuth(page) {
  await page.route('**/auth/v1/token**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: accessToken, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user: authUser }) }));
  await page.route('**/auth/v1/user', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(authUser) }));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([profile]) }));
}
async function signIn(page) {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(authUser.email);
  await page.getByLabel('Contraseña').fill('not-real');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Videos' }).click();
}
const dbRow = (overrides = {}) => ({ id: videoId, slug: 'final-estadal', title: 'Final estadal', description: 'Jornada oficial', provider: 'cloudinary', provider_video_id: 'asanda/videos/final-estadal', duration_seconds: 22, thumbnail_asset_id: null, publication_status: 'draft', published_at: null, created_at: '2026-08-20T10:00:00Z', updated_at: '2026-08-20T10:00:00Z', ...overrides });

async function routeBase(page, state) {
  await routeAuth(page);
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: 'synthetic-media' }));
  await page.route('**/rest/v1/media_assets*', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: '40000000-0000-4000-8000-000000000001', provider: 'cloudinary', public_id: 'asanda/noticias/poster', external_url: null, resource_type: 'image', format: 'jpg', width: 800, height: 450, bytes: 100, alt_text: 'Poster público', is_public: true, created_at: '2026-08-20T09:00:00Z' }]) }));
  await page.route('**/rest/v1/videos*', async (route) => {
    const request = route.request();
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json');
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(state.rows) });
    const payload = request.postDataJSON();
    Object.assign(state.rows[0], payload);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wantsObject ? state.rows[0] : [state.rows[0]]) });
  });
}

test('validates MP4 selection and requires rights before any signing or upload', async ({ page }) => {
  const state = { rows: [] };
  await routeBase(page, state);
  let functionCalls = 0; let uploads = 0;
  await page.route('**/functions/v1/video-media', (route) => { functionCalls += 1; route.abort(); });
  await page.route('**/api.cloudinary.com/**', (route) => { uploads += 1; route.abort(); });
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Videos' })).toBeVisible();
  await page.setInputFiles('input[type=file]', { name: 'video.mov', mimeType: 'video/quicktime', buffer: Buffer.from('x') });
  await expect(page.getByRole('alert')).toContainText('MP4 válido de hasta 100000000 bytes (100 MB)');
  await page.setInputFiles('input[type=file]', { name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(0) });
  await expect(page.getByRole('alert')).toContainText('MP4 válido de hasta 100000000 bytes (100 MB)');
  await page.setInputFiles('input[type=file]', { name: 'video.mp4', mimeType: 'video/mp4', buffer: Buffer.from('mp4') });
  await page.getByLabel('Título').fill('Final estadal');
  await page.getByLabel('Slug').fill('final-estadal');
  await page.getByRole('button', { name: 'Subir como borrador privado' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirmá que los derechos y la difusión fueron aprobados');
  expect(functionCalls).toBe(0); expect(uploads).toBe(0);
});

test('uploads, registers a draft, previews, publishes explicitly, and archives with truthful warning', async ({ page }) => {
  const state = { rows: [] }; await routeBase(page, state);
  const actions = []; let uploadFields = [];
  await page.route('**/functions/v1/video-media', async (route) => {
    const body = route.request().postDataJSON(); actions.push(body.action);
    const responses = {
      'sign-upload': { upload: { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload', apiKey: 'public-key', timestamp: 1, folder: 'asanda/videos', type: 'authenticated', uploadPreset: 'asanda_video', signature: 'signed' } },
      register: { video: { id: videoId, publicationStatus: 'draft' } },
      preview: { videoId, title: 'Final estadal', url: 'https://res.cloudinary.com/demo/video/authenticated/s--preview1--/asanda/videos/final.mp4' },
      publish: { video: { id: videoId, publicationStatus: 'published', publishedAt: '2026-08-20T12:00:00Z' } },
    };
    if (body.action === 'register') state.rows = [dbRow()];
    if (body.action === 'publish') Object.assign(state.rows[0], { publication_status: 'published', published_at: '2026-08-20T12:00:00Z' });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(responses[body.action]) });
  });
  await page.route('**/api.cloudinary.com/**', async (route) => {
    const multipart = await route.request().postDataBuffer(); const text = multipart.toString();
    uploadFields = ['api_key', 'folder', 'timestamp', 'type', 'upload_preset', 'signature'].filter((field) => text.includes(`name="${field}"`));
    expect(text).not.toContain('api_secret');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ public_id: 'asanda/videos/final-estadal' }) });
  });
  await signIn(page);
  await page.setInputFiles('input[type=file]', { name: 'final.mp4', mimeType: 'video/mp4', buffer: Buffer.from('synthetic-mp4') });
  await page.getByLabel('Título').fill('Final estadal'); await page.getByLabel('Slug').fill('final-estadal');
  await page.getByLabel(/derechos y la difusión/).check();
  await page.getByRole('button', { name: 'Subir como borrador privado' }).click();
  await expect(page.getByRole('status')).toContainText('Borrador privado guardado');
  expect(uploadFields).toHaveLength(6); expect(actions.slice(0, 2)).toEqual(['sign-upload', 'register']);
  await page.getByRole('button', { name: 'Previsualizar Final estadal' }).click();
  await expect(page.locator('video')).toHaveAttribute('src', /res\.cloudinary\.com/);
  await page.getByRole('button', { name: 'Cerrar reproductor' }).click();
  await page.getByLabel('Poster público').selectOption('40000000-0000-4000-8000-000000000001');
  await page.getByRole('button', { name: 'Guardar metadatos' }).click();
  await expect(page.getByRole('status')).toContainText('Metadatos del video guardados.');
  expect(state.rows[0].thumbnail_asset_id).toBe('40000000-0000-4000-8000-000000000001');
  await page.getByRole('button', { name: 'Publicar video' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirmá los derechos');
  await page.getByLabel(/Confirmo nuevamente/).check();
  await page.getByRole('button', { name: 'Publicar video' }).click();
  await expect(page.getByRole('status')).toContainText('Video publicado');
  expect(actions).toContain('publish');
  await expect(page.getByText(/no revoca enlaces firmados/)).toBeVisible();
  await page.getByRole('button', { name: 'Archivar video' }).click();
  await expect(page.getByRole('status')).toContainText('retirado del catálogo');
  expect(state.rows[0].publication_status).toBe('archived');
});

test('reports cancellation and a private orphan when registration fails', async ({ page }) => {
  const state = { rows: [] }; await routeBase(page, state);
  let registerFails = true;
  await page.route('**/functions/v1/video-media', async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === 'sign-upload') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ upload: { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload', apiKey: 'key', timestamp: 1, folder: 'asanda/videos', type: 'authenticated', uploadPreset: 'preset', signature: 'signature' } }) });
    if (registerFails) return route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
  });
  let releaseUpload; let uploadAttempts = 0;
  await page.route('**/api.cloudinary.com/**', async (route) => {
    uploadAttempts += 1;
    if (uploadAttempts === 1) await new Promise((resolve) => { releaseUpload = resolve; });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ public_id: 'asanda/videos/orphan' }) });
  });
  await signIn(page);
  const fill = async () => { await page.setInputFiles('input[type=file]', { name: 'final.mp4', mimeType: 'video/mp4', buffer: Buffer.from('mp4') }); await page.getByLabel('Título').fill('Final estadal'); await page.getByLabel('Slug').fill('final-estadal'); await page.getByLabel(/derechos y la difusión/).check(); };
  await fill(); await page.getByRole('button', { name: 'Subir como borrador privado' }).click();
  await page.getByRole('button', { name: 'Cancelar carga' }).click(); releaseUpload();
  await expect(page.getByRole('alert')).toContainText('cancelada');
  await fill(); await page.getByRole('button', { name: 'Subir como borrador privado' }).click();
  await expect(page.getByRole('alert')).toContainText('puede permanecer privado en Cloudinary');
});

test('recovers registration of an existing private asset without uploading or publishing', async ({ page }) => {
  const state = { rows: [] }; await routeBase(page, state);
  const actions = []; let uploads = 0;
  await page.route('**/api.cloudinary.com/**', (route) => { uploads += 1; return route.abort(); });
  await page.route('**/functions/v1/video-media', (route) => {
    const body = route.request().postDataJSON(); actions.push(body);
    expect(body.action).toBe('register');
    state.rows = [dbRow()];
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ video: { id: videoId, publicationStatus: 'draft' } }) });
  });
  await signIn(page);
  await expect(page.getByLabel('Public ID del video ya subido')).toBeVisible();
  await page.getByLabel('Título').fill('Final estadal'); await page.getByLabel('Slug').fill('final-estadal');
  await page.getByLabel('Public ID del video ya subido').fill('asanda/videos/final-estadal');
  await page.getByRole('button', { name: 'Registrar archivo existente' }).click();
  await expect(page.getByRole('alert')).toContainText('Confirmá que los derechos');
  expect(actions).toEqual([]); expect(uploads).toBe(0); expect(state.rows).toEqual([]);
  await page.getByLabel(/derechos y la difusión/).check();
  await page.getByRole('button', { name: 'Registrar archivo existente' }).click();
  await expect(page.getByRole('status')).toContainText('Borrador privado guardado');
  expect(actions).toEqual([{ action: 'register', publicId: 'asanda/videos/final-estadal', title: 'Final estadal', slug: 'final-estadal', description: '' }]);
  expect(uploads).toBe(0); expect(state.rows[0].publication_status).toBe('draft');
  expect(state.rows[0].published_at).toBeNull();
});

test('retains the uploaded public ID and retries only registration after an exact server error', async ({ page }) => {
  const state = { rows: [] }; await routeBase(page, state);
  const actions = []; let uploads = 0; let registrations = 0;
  await page.route('**/api.cloudinary.com/**', (route) => {
    uploads += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ public_id: 'asanda/videos/final-estadal' }) });
  });
  await page.route('**/functions/v1/video-media', (route) => {
    const body = route.request().postDataJSON(); actions.push(body.action);
    if (body.action === 'sign-upload') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ upload: { uploadUrl: 'https://api.cloudinary.com/v1_1/demo/video/upload', apiKey: 'key', timestamp: 1, folder: 'asanda/videos', type: 'authenticated', uploadPreset: 'preset', signature: 'signature' } }) });
    expect(body.action).toBe('register'); registrations += 1;
    if (registrations === 1) return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ error: 'El archivo privado no cumple el contrato MP4 de ASANDA.', reason: 'duration-invalid' }) });
    state.rows = [dbRow()];
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ video: { id: videoId, publicationStatus: 'draft' } }) });
  });
  await signIn(page);
  await page.setInputFiles('input[type=file]', { name: 'final.mp4', mimeType: 'video/mp4', buffer: Buffer.from('synthetic-mp4') });
  await page.getByLabel('Título').fill('Final estadal'); await page.getByLabel('Slug').fill('final-estadal');
  await page.getByLabel(/derechos y la difusión/).check();
  await page.getByRole('button', { name: 'Subir como borrador privado' }).click();
  await expect(page.getByRole('alert')).toContainText('422: El archivo privado no cumple el contrato MP4 de ASANDA.');
  await expect(page.getByRole('alert')).toContainText('Cloudinary no devolvió una duración válida y positiva.');
  await expect(page.getByLabel('Public ID del video ya subido')).toHaveValue('asanda/videos/final-estadal');
  await expect(page.getByRole('button', { name: 'Subir como borrador privado' })).toBeDisabled();
  expect(state.rows).toEqual([]); expect(uploads).toBe(1); expect(registrations).toBe(1);
  await page.getByRole('button', { name: 'Registrar archivo existente' }).click();
  await expect(page.getByRole('status')).toContainText('Borrador privado guardado');
  expect(actions).toEqual(['sign-upload', 'register', 'register']);
  expect(uploads).toBe(1); expect(state.rows[0].publication_status).toBe('draft');
  expect(state.rows[0].published_at).toBeNull();
});

test('compares duration explicitly without a file, rights confirmation or record mutation', async ({ page }) => {
  const state = { rows: [] }; await routeBase(page, state);
  const actions = []; let uploads = 0;
  await page.route('**/api.cloudinary.com/**', (route) => { uploads += 1; return route.abort(); });
  await page.route('**/functions/v1/video-media', (route) => {
    const body = route.request().postDataJSON(); actions.push(body);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ comparison: { baseline: { duration: 'missing', validAsset: false }, withMetadata: { duration: 'valid', validAsset: true }, sameResource: true } }) });
  });
  await signIn(page);
  await expect(page.getByRole('button', { name: 'Comparar duración (solo lectura)', exact: true })).toBeVisible();
  expect(actions).toEqual([]);
  await page.getByLabel('Public ID del video ya subido').fill('asanda/videos/owned-one');
  await page.getByRole('button', { name: 'Comparar duración (solo lectura)', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Sin metadatos: duración ausente');
  await expect(page.getByRole('status')).toContainText('Con metadatos: duración válida');
  await expect(page.getByRole('status')).toContainText('Mismo recurso y versión: sí');
  await expect(page.getByRole('status')).toContainText('No se modificó ni registró el archivo');
  expect(actions).toEqual([{ action: 'compare-duration', publicId: 'asanda/videos/owned-one' }]);
  expect(uploads).toBe(0); expect(state.rows).toEqual([]);
  await expect(page.getByLabel(/derechos y la difusión/)).not.toBeChecked();
});
