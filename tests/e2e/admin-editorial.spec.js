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
    id: '40000000-0000-4000-8000-000000000002', provider: 'cloudinary', public_id: 'asanda/media/noticia-e2e',
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

test('manages featured windows through add, edit, and remove', async ({ page }) => {
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
    if (method === 'POST') {
      const athlete = athletes.find((item) => item.id === payload.athlete_id);
      const row = { id: '30000000-0000-4000-8000-000000000003', ...payload, athletes: { display_name: athlete?.display_name ?? '' } };
      rows.push(row);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
    }
    const row = rows.find((item) => item.id === id);
    Object.assign(row, payload);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wantsObject ? row : [row]) });
  });
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(athletes),
  }));
  await signInEditor(page);

  await page.getByRole('link', { name: 'Destacados' }).click();
  await expect(page.getByText('Atleta Activo')).toBeVisible();
  await expect(page.getByText('Activa', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Atleta publicado')).toContainText('Atleta Candidato');

  await page.getByLabel('Atleta publicado').selectOption({ label: 'Atleta Candidato' });
  await page.getByLabel('Orden (1-6)').fill('2');
  await page.getByRole('button', { name: 'Agregar destacado' }).click();
  await expect(page.getByRole('status')).toContainText('Destacado guardado.');
  await expect(page.locator('ul').getByText('Atleta Candidato')).toBeVisible();

  await page.getByRole('button', { name: 'Editar Atleta Candidato' }).click();
  await page.getByLabel('Orden (1-6)').fill('3');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('status')).toContainText('Destacado guardado.');
  await expect(page.getByText('3')).toBeVisible();

  await page.getByRole('button', { name: 'Quitar Atleta Candidato' }).click();
  await expect(page.getByRole('status')).toContainText('Destacado eliminado.');
  await expect(page.locator('ul').getByText('Atleta Candidato')).toHaveCount(0);
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
      folder: 'asanda/media', signature: 'test-signature',
      uploadUrl: 'https://api.cloudinary.com/v1_1/xkggetol/image/upload',
    }),
  }));
  await page.route('**/api.cloudinary.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ public_id: 'asanda/media/e2e-upload', format: 'png', width: 1, height: 1, bytes: 67 }),
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
  await expect(page.getByText('asanda/media/e2e-upload')).toBeVisible();
});
