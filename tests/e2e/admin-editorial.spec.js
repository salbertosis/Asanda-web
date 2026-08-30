import { expect, test } from '@playwright/test';

const userId = '10000000-0000-4000-8000-000000000001';
const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({
  exp: 4102444800,
  sub: userId,
  role: 'authenticated',
})).toString('base64url')}.signature`;

const authUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'editor@asanda.test',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
  is_anonymous: false,
};

const editorProfile = {
  id: userId,
  display_name: 'Editor E2E',
  role: 'editor',
  is_active: true,
};

const routeAdminAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: 4102444800,
      refresh_token: 'refresh-token',
      user: authUser,
    }),
  }));
  await page.route('**/auth/v1/user', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(authUser),
  }));
  await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([editorProfile]),
  }));
};

const signInEditor = async (page) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin\/noticias$/);
};

const newsColumns = 'id,slug,title,summary,body,category,hero_asset_id,publication_status,published_at,author_id,created_at,updated_at';
const newsRow = (id, overrides = {}) => ({
  id, slug: 'noticia-e2e', title: 'Noticia E2E', summary: 'Resumen de prueba', body: '**Cuerpo** con *formato*.',
  category: 'Competencias', hero_asset_id: null, publication_status: 'draft', published_at: null,
  author_id: userId, created_at: '2026-08-18T10:00:00Z', updated_at: '2026-08-18T10:00:00Z', ...overrides,
});

test('manages a news article through create, publish, and archive', async ({ page }) => {
  await routeAdminAuth(page);
  let rows = [];
  let nextId = 2;
  const heroAsset = {
    id: '40000000-0000-4000-8000-000000000002', provider: 'cloudinary', public_id: 'asanda/noticias/noticia-e2e',
    external_url: null, resource_type: 'image', format: 'jpg', width: 1200, height: 675, bytes: 2048,
    alt_text: 'Piscina durante una competencia', is_public: true, created_at: '2026-08-18T09:00:00Z',
  };
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([heroAsset]),
  }));
  await page.route('**/rest/v1/news_articles**', async (route) => {
    const request = route.request();
    const method = request.method();
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json') ?? false;
    const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
    if (method === 'GET') {
      const list = id ? rows.filter((row) => row.id === id) : rows;
      if (wantsObject) {
        return route.fulfill({ status: list.length ? 200 : 406, contentType: 'application/json', body: JSON.stringify(list[0] ?? {}) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(list) });
    }
if (method === 'POST') {
      const payload = JSON.parse(request.postData());
      const row = newsRow(String(nextId++), { ...payload, published_at: null, updated_at: '2026-08-18T10:05:00Z' });
      rows.push(row);
      return route.fulfill({ status: wantsObject ? 200 : 201, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
    }
    const payload = JSON.parse(request.postData());
    const row = rows.find((item) => item.id === id);
    Object.assign(row, payload, { updated_at: '2026-08-18T10:10:00Z' });
    return route.fulfill({ status: wantsObject ? 200 : 201, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
  });
  await signInEditor(page);

  await expect(page.getByText('Todavía no hay noticias.')).toBeVisible();
  await page.getByRole('link', { name: 'Nueva noticia' }).click();
  await page.getByLabel('Título').fill('Noticia E2E');
  await page.getByRole('button', { name: 'Generar slug desde el título' }).click();
  await expect(page.getByLabel('Slug')).toHaveValue('noticia-e2e');
  await page.getByLabel('Categoría').fill('Competencias');
  await page.getByLabel('Resumen').fill('Resumen de prueba');
  await page.getByLabel('Imagen principal').selectOption(heroAsset.id);
  await expect(page.getByAltText(heroAsset.alt_text)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Subir una imagen a la biblioteca' })).toHaveAttribute('href', '/admin/media');
  await page.getByLabel('Cuerpo (markdown seguro)').fill('**Cuerpo** con *formato*.');
  await expect(page.getByRole('heading', { name: 'Vista previa' }).locator('..').getByText('Cuerpo')).toBeVisible();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('status')).toContainText('Cambios guardados.');
  await expect(page).toHaveURL(/\/admin\/noticias\/2$/);
  expect(rows[0].hero_asset_id).toBe(heroAsset.id);

  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByRole('status')).toContainText('Noticia publicada.');
  await page.getByRole('link', { name: 'Volver a noticias' }).click();
  await expect(page.getByText('Publicada')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar Noticia E2E' })).toBeVisible();

  await page.getByRole('button', { name: 'Archivar Noticia E2E' }).click();
  await expect(page.getByText('Archivada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publicar Noticia E2E' })).toBeVisible();
});

test('keeps the current news image when the media library is unavailable', async ({ page }) => {
  await routeAdminAuth(page);
  const heroAssetId = '40000000-0000-4000-8000-000000000003';
  const row = newsRow('existing-news', { hero_asset_id: heroAssetId });
  let savedPayload = null;

  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill({
    status: 500,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Biblioteca temporalmente no disponible' }),
  }));
  await page.route('**/rest/v1/news_articles**', async (route) => {
    const request = route.request();
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json') ?? false;
    if (request.method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(wantsObject ? row : [row]),
      });
    }
    savedPayload = JSON.parse(request.postData());
    Object.assign(row, savedPayload);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) });
  });

  await signInEditor(page);
  await page.goto('/admin/noticias/existing-news');
  await expect(page.getByRole('status')).toContainText('Podés guardar los demás cambios sin modificar la imagen actual.');
  await expect(page.getByLabel('Imagen principal')).toHaveValue(heroAssetId);
  await page.getByLabel('Título').fill('Noticia E2E actualizada');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Cambios guardados.', { exact: true })).toBeVisible();
  expect(savedPayload.hero_asset_id).toBe(heroAssetId);
});

test('manages featured windows through append, move, edit, and remove', async ({ page }) => {
  await routeAdminAuth(page);
  const athletes = [
    { id: '20000000-0000-4000-8000-000000000001', display_name: 'Atleta Activo' },
    { id: '20000000-0000-4000-8000-000000000002', display_name: 'Atleta Candidato' },
  ];
  let rows = [
    {
      id: '30000000-0000-4000-8000-000000000001', athlete_id: athletes[0].id, display_order: 1,
      starts_at: null, ends_at: null, athletes: { display_name: athletes[0].display_name },
    },
  ];
  let appendPayload = null;
  let editPayload = null;
  const moveDirections = [];
  await page.route('**/rest/v1/featured_athletes**', async (route) => {
    const request = route.request();
    const method = request.method();
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json') ?? false;
    const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
    if (method === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
    if (method === 'DELETE') {
      rows = rows.filter((row) => row.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }
    const payload = JSON.parse(request.postData());
    editPayload = payload;
    const row = rows.find((item) => item.id === id);
    Object.assign(row, payload);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
  });
  await page.route('**/rest/v1/rpc/list_featured_athlete_candidates', (route) => {
    const featuredIds = new Set(rows.map((row) => row.athlete_id));
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(athletes.filter((athlete) => !featuredIds.has(athlete.id))),
    });
  });
  await page.route('**/rest/v1/rpc/append_featured_athlete', async (route) => {
    appendPayload = JSON.parse(route.request().postData());
    const athlete = athletes.find((item) => item.id === appendPayload.requested_athlete_id);
    const row = {
      id: '30000000-0000-4000-8000-000000000003',
      athlete_id: athlete.id,
      display_order: Math.max(...rows.map((item) => item.display_order), 0) + 1,
      starts_at: appendPayload.requested_starts_at,
      ends_at: appendPayload.requested_ends_at,
      athletes: { display_name: athlete.display_name },
    };
    rows.push(row);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(row) });
  });
  await page.route('**/rest/v1/rpc/move_featured_athlete', async (route) => {
    const payload = JSON.parse(route.request().postData());
    moveDirections.push(payload.requested_direction);
    const index = rows.findIndex((row) => row.id === payload.requested_featured_id);
    const neighborIndex = payload.requested_direction === 'up' ? index - 1 : index + 1;
    [rows[index].display_order, rows[neighborIndex].display_order] = [rows[neighborIndex].display_order, rows[index].display_order];
    rows.sort((left, right) => left.display_order - right.display_order);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows.find((row) => row.id === payload.requested_featured_id)) });
  });
  await signInEditor(page);

  await page.getByRole('link', { name: 'Destacados' }).click();
  await expect(page.getByText('Atleta Activo')).toBeVisible();
  await expect(page.getByText('Ventana activa', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear atleta' })).toHaveAttribute('href', '/admin/atletas/nuevo');
  await expect(page.getByRole('link', { name: 'Editar ficha de Atleta Activo' })).toHaveAttribute('href', `/admin/atletas/${athletes[0].id}`);
  await expect(page.getByLabel('Atleta elegible')).toContainText('Atleta Candidato');
  await expect(page.getByLabel(/Orden/)).toHaveCount(0);

  await page.getByLabel('Atleta elegible').selectOption({ label: 'Atleta Candidato' });
  await page.getByRole('button', { name: 'Agregar destacado' }).click();
  await expect(page.getByRole('status')).toContainText('Destacado guardado.');
  expect(appendPayload).toEqual({
    requested_athlete_id: athletes[1].id,
    requested_starts_at: null,
    requested_ends_at: null,
  });
  expect(appendPayload).not.toHaveProperty('display_order');
  await expect(page.getByText('Sólo aparecen atletas publicados con los consentimientos requeridos completos.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Revisar atletas' })).toHaveAttribute('href', '/admin/atletas');
  const featuredRows = page.locator('section[aria-labelledby="admin-featured-title"] > ul > li');
  await expect(featuredRows).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Subir Atleta Activo' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Bajar Atleta Activo' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Subir Atleta Candidato' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Bajar Atleta Candidato' })).toBeDisabled();

  await page.getByRole('button', { name: 'Subir Atleta Candidato' }).click();
  await expect(page.getByRole('status')).toContainText('Orden de destacados actualizado.');
  await expect(featuredRows.first()).toContainText('Atleta Candidato');
  await page.getByRole('button', { name: 'Bajar Atleta Candidato' }).click();
  await expect(featuredRows.last()).toContainText('Atleta Candidato');
  expect(moveDirections).toEqual(['up', 'down']);

  await page.getByRole('button', { name: 'Editar Atleta Candidato' }).click();
  await expect(page.getByLabel('Atleta elegible')).toHaveCount(0);
  await page.getByLabel('Inicio de ventana').fill('2030-09-01T09:00');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toContainText('Destacado guardado.');
  expect(editPayload).toEqual({ starts_at: '2030-09-01T09:00', ends_at: null });
  await expect(page.getByText('Programada', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Quitar Atleta Candidato' }).click();
  await expect(page.getByRole('status')).toContainText('Destacado eliminado.');
  await expect(featuredRows.getByText('Atleta Candidato')).toHaveCount(0);
});

test('uploads a media asset through the signed flow', async ({ page }) => {
  await routeAdminAuth(page);
  let rows = [];
  await page.route('**/rest/v1/media_assets**', async (route) => {
    const request = route.request();
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json') ?? false;
    if (request.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
    const payload = JSON.parse(request.postData());
    const row = { id: '40000000-0000-4000-8000-000000000001', created_at: '2026-08-18T11:00:00Z', ...payload };
    rows.push(row);
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
  });
  await page.route('**/functions/v1/sign-media-upload**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      cloudName: 'xkggetol', apiKey: 'test-key', timestamp: 1787050800,
      folder: 'asanda/noticias', signature: 'test-signature',
      uploadUrl: 'https://api.cloudinary.com/v1_1/xkggetol/image/upload',
    }),
  }));
  await page.route('**/api.cloudinary.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ public_id: 'asanda/noticias/e2e-upload', format: 'png', width: 1, height: 1, bytes: 67 }),
  }));
  await signInEditor(page);

  await page.getByRole('link', { name: 'Imágenes' }).click();
  await expect(page.getByText('La biblioteca de imágenes está vacía.')).toBeVisible();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await page.setInputFiles('input[type=file]', { name: 'e2e-upload.png', mimeType: 'image/png', buffer: png });
  await page.getByLabel('Texto alternativo (accesibilidad)').fill('Imagen E2E');
  await page.getByRole('button', { name: 'Subir imagen' }).click();
  await expect(page.getByRole('status')).toContainText('Imagen publicada en la biblioteca.');
  await expect(page.getByAltText('Imagen E2E')).toBeVisible();
  await expect(page.getByText('asanda/noticias/e2e-upload')).toBeVisible();
});

test('registers an existing Cloudinary image without uploading bytes', async ({ page }) => {
  await routeAdminAuth(page);
  let rows = [];
  let insertCount = 0;
  let uploadCount = 0;
  await page.route('**/api.cloudinary.com/**', (route) => {
    uploadCount += 1;
    return route.abort();
  });
  await page.route('**/rest/v1/media_assets**', async (route) => {
    const request = route.request();
    const wantsObject = request.headers().accept?.includes('application/vnd.pgrst.object+json') ?? false;
    if (request.method() === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(rows) });
    }
    insertCount += 1;
    const payload = JSON.parse(request.postData());
    const row = {
      id: '40000000-0000-4000-8000-000000000004',
      created_at: '2026-08-24T10:00:00Z',
      external_url: null,
      ...payload,
    };
    rows = [row];
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
  });
  await signInEditor(page);

  await page.getByRole('link', { name: 'Imágenes' }).click();
  const existingForm = page.getByRole('heading', { name: 'Usar una imagen existente de Cloudinary' }).locator('..');
  await existingForm.getByLabel('Public ID de Cloudinary').fill('https://res.cloudinary.com/foto_cantaura_noti.jpg');
  await existingForm.getByLabel('Texto alternativo (obligatorio)').fill('Competencia de natación en Cantaura');
  await existingForm.getByRole('button', { name: 'Registrar imagen' }).click();
  await expect(page.getByRole('alert')).toContainText('Ingresá un Public ID válido');
  expect(insertCount).toBe(0);

  await existingForm.getByLabel('Public ID de Cloudinary').fill('  foto_cantaura_noti  ');
  await existingForm.getByRole('button', { name: 'Registrar imagen' }).click();
  await expect(page.getByRole('status')).toContainText('Imagen de Cloudinary registrada en la biblioteca.');
  expect(insertCount).toBe(1);
  expect(uploadCount).toBe(0);
  expect(rows[0]).toMatchObject({
    provider: 'cloudinary',
    public_id: 'foto_cantaura_noti',
    resource_type: 'image',
    alt_text: 'Competencia de natación en Cantaura',
    is_public: true,
  });
  await expect(page.getByAltText('Competencia de natación en Cantaura')).toBeVisible();
  await expect(page.getByText('foto_cantaura_noti')).toBeVisible();
});
