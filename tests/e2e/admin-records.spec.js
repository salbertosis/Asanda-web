import { expect, test } from '@playwright/test';

const userId = '10000000-0000-4000-8000-000000000001';
const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.x`;
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z' };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const athlete = { id: 'athlete-1', display_name: 'Atleta Vinculada', preferred_name: '', competitive_sex: 'female', photo_asset_id: 'photo-1', publication_status: 'published' };
const photo = { id: 'photo-1', provider: 'cloudinary', public_id: 'asanda/athlete', external_url: null, resource_type: 'image', format: 'jpg', width: 400, height: 400, bytes: 1000, alt_text: 'Retrato aprobado', is_public: true, created_at: '2026-08-28T10:00:00Z' };

const routeAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(user)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{ id: userId, display_name: 'Editor E2E', role: 'editor', is_active: true }])));
};

const signIn = async (page) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
};

test('protects the records route', async ({ page }) => {
  await page.route('**/auth/v1/user', (route) => route.fulfill(json({ message: 'not authenticated' }, 401)));
  await page.goto('/admin/records');
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('creates, links, publishes, and safely reports record conflicts', async ({ page }) => {
  await routeAuth(page);
  let rows = []; let draftPayload; let publicationPayload; let conflict = false;
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json([athlete])));
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([photo])));
  await page.route('**/rest/v1/event_definitions**', (route) => { const url = new URL(route.request().url()); expect(url.searchParams.get('course')).toBe('eq.long_course'); return route.fulfill(json([{ id: 'event-1', name: '100 metros libre' }])); });
  await page.route('**/rest/v1/age_categories**', (route) => route.fulfill(json([{ id: 'category-1', name: 'Juvenil' }])));
  await page.route('**/rest/v1/records**', (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('scope_type')).toBe('eq.state');
    expect(url.searchParams.get('select')).not.toContain('notes');
    return route.fulfill(json(rows));
  });
  await page.route('**/rest/v1/rpc/save_state_record_draft', (route) => {
    draftPayload = route.request().postDataJSON();
    if (conflict) return route.fulfill(json({ code: '40001', message: 'private State record revision conflict detail' }, 409));
    const revision = rows[0]?.revision + 1 || 1;
    rows = [{ id: 'record-1', athlete_id: draftPayload.requested_athlete_id, athlete_name_snapshot: draftPayload.requested_athlete_name, athlete_photo_asset_id: draftPayload.requested_photo_asset_id, club_name_snapshot: draftPayload.requested_club_name, event_definition_id: 'event-1', event_name_snapshot: '100 metros libre', age_category_id: 'category-1', age_category_name_snapshot: 'Juvenil', competitive_sex: draftPayload.requested_competitive_sex, time_ms: draftPayload.requested_time_ms, achieved_year: draftPayload.requested_achieved_year, competition_name_snapshot: draftPayload.requested_competition_name, publication_status: 'draft', revision }];
    return route.fulfill(json([{ record_id: 'record-1', revision }]));
  });
  await page.route('**/rest/v1/rpc/set_state_record_published', (route) => {
    publicationPayload = route.request().postDataJSON();
    rows[0] = { ...rows[0], publication_status: publicationPayload.requested_published ? 'published' : 'draft', revision: rows[0].revision + 1 };
    return route.fulfill(json(rows[0].revision));
  });

  await signIn(page);
  await page.getByRole('link', { name: 'Récords' }).click();
  await expect(page.getByText('Todavía no hay récords estadales.')).toBeVisible();
  await expect(page.getByLabel(/Position/i)).toHaveCount(0);
  await expect(page.getByLabel(/course/i)).toHaveCount(0);
  await page.getByLabel('Nombre histórico').fill('Atleta Histórica');
  await page.getByLabel('Club histórico').fill('Club de 1998');
  await page.getByLabel('Foto pública opcional').selectOption(photo.id);
  await expect(page.getByAltText(photo.alt_text)).toBeVisible();
  await page.getByLabel('Prueba (piscina larga)').selectOption('event-1');
  await page.getByLabel('Categoría histórica').selectOption('category-1');
  await page.getByLabel('Género').selectOption('female');
  await expect(page.getByLabel('Género').locator('option')).toHaveCount(2);
  await page.getByLabel('Tiempo').fill('-1.00');
  await page.getByLabel('Año').fill('1998');
  await page.getByLabel('Competencia').fill('Copa histórica');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('alert')).toContainText('tiempo válido');
  expect(draftPayload).toBeUndefined();
  await page.getByLabel('Tiempo').fill('1:02.35');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('status')).toContainText('Borrador guardado');
  expect(draftPayload).toMatchObject({ requested_athlete_id: null, requested_photo_asset_id: photo.id, requested_time_ms: 62350, requested_expected_revision: null });

  await page.getByRole('button', { name: 'Publicar' }).click();
  expect(publicationPayload).toMatchObject({ requested_record_id: 'record-1', requested_expected_revision: 1, requested_published: true });
  await expect(page.getByText('Publicado', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver registro' }).click();
  await expect(page.getByText('Despublicá este récord antes de editarlo.')).toBeVisible();
  await expect(page.getByLabel('Nombre histórico')).toBeDisabled();
  await page.getByRole('button', { name: 'Despublicar' }).click();
  await expect(page.getByRole('status')).toContainText('Récord despublicado');

  await page.getByLabel('Atleta existente').check();
  await expect(page.getByLabel('Nombre histórico')).toHaveValue(athlete.display_name);
  await expect(page.getByLabel('Foto pública opcional')).toHaveValue(photo.id);
  await expect(page.getByLabel('Categoría histórica')).toHaveValue('category-1');
  conflict = true;
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('alert')).toContainText('cambió en otra sesión');
  await expect(page.getByRole('alert')).not.toContainText('private');
});
