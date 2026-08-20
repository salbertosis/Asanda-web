import { expect, test } from '@playwright/test';

const userId = '10000000-0000-4000-8000-000000000001';
const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.x`;
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z' };
const publicContact = { id: 'public-contact', contact_type: 'email', label: 'Correo público', value: 'club-public@example.test', url: null, is_public: true, sort_order: 0 };
const privateContact = { id: 'private-contact', contact_type: 'phone', label: 'Teléfono privado', value: '000-000-0000', url: null, is_public: false, sort_order: 1 };
const club = { id: 'referenced-club', organization_type: 'club', name: 'Club Referenciado', short_name: 'CR', slug: 'club-referenciado', description: 'Club sintético.', founded_year: 1990, logo_asset_id: null, logo: null, publication_status: 'published', contacts: [publicContact, privateContact], memberships: [{ athlete_id: 'athlete-1', membership_type: 'associated' }] };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

test('keeps typed private contacts out of public reads and archives without deletion', async ({ page }) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(user)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{ id: userId, display_name: 'Editor E2E', role: 'editor', is_active: true }])));
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([])));
  let archivedPayload;
  let deleteRequests = 0;
  await page.route('**/rest/v1/organizations**', (route) => {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    if (request.method() === 'DELETE') { deleteRequests += 1; return route.fulfill(json({ message: 'unsafe' }, 409)); }
    if (request.method() === 'PATCH') {
      archivedPayload = request.postDataJSON();
      return route.fulfill(json({ ...club, ...archivedPayload }));
    }
    if (params.has('publication_status')) return route.fulfill(json([{ ...club, contacts: [publicContact] }]));
    return route.fulfill(json(params.has('id') ? club : [club]));
  });

  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Clubes' }).click();
  await expect(page).toHaveURL(/\/admin\/clubes$/);
  await expect(page.getByRole('heading', { name: 'Administración de clubes' })).toBeVisible();
  await page.getByRole('link', { name: 'Editar club' }).click();
  await expect(page.getByRole('heading', { name: 'Club Referenciado' })).toBeVisible();
  await expect(page.getByLabel('Etiqueta').nth(0)).toHaveValue('Correo público');
  await expect(page.getByLabel('Etiqueta').nth(1)).toHaveValue('Teléfono privado');
  await expect(page.getByLabel('Visibilidad pública').nth(0)).toBeChecked();
  await expect(page.getByLabel('Visibilidad pública').nth(1)).not.toBeChecked();

  await page.goto('/clubes');
  await expect(page.getByRole('link', { name: 'club-public@example.test' })).toBeVisible();
  await expect(page.getByText('000-000-0000')).toHaveCount(0);
  await page.goto('/admin/clubes/referenced-club');
  await page.getByRole('button', { name: 'Archivar club' }).click();
  await expect(page.getByRole('status')).toContainText('archivado');
  expect(archivedPayload).toEqual({ publication_status: 'archived' });
  expect(deleteRequests).toBe(0);
});
