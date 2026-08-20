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

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

const routeAdminAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4102444800,
    refresh_token: 'refresh-token',
    user: authUser,
  })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(authUser)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{
    id: userId,
    display_name: 'Editor E2E',
    role: 'editor',
    is_active: true,
  }])));
};

const signInEditor = async (page) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin\/noticias$/);
};

test('preserves public profile and media values when consent gates reject publication', async ({ page }) => {
  await routeAdminAuth(page);
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([
    { id: 'athlete-photo', alt_text: 'Foto sintética aprobada', is_public: true },
  ])));
  await page.route(/\/rest\/v1\/(age_categories|disciplines|organizations).*/, (route) => route.fulfill(json([])));
  await signInEditor(page);
  await page.getByRole('link', { name: 'Atletas' }).click();

  await expect(page).toHaveURL(/\/admin\/atletas\/nuevo$/);
  await expect(page.getByRole('heading', { name: 'Nuevo atleta' })).toBeVisible();
  await page.getByLabel('Nombre público').fill('Atleta con consentimiento pendiente');
  await page.getByRole('button', { name: 'Publicar atleta' }).click();
  await expect(page.getByRole('alert')).toContainText('consentimiento de perfil');
  await expect(page.getByLabel('Nombre público')).toHaveValue('Atleta con consentimiento pendiente');

  await page.getByLabel('Consentimiento de perfil público').check();
  await page.getByLabel('Imagen vinculada').selectOption('athlete-photo');
  await page.getByRole('button', { name: 'Publicar atleta' }).click();
  await expect(page.getByRole('alert')).toContainText('consentimiento de foto');
  await expect(page.getByLabel('Nombre público')).toHaveValue('Atleta con consentimiento pendiente');
  await expect(page.getByLabel('Imagen vinculada')).toHaveValue('athlete-photo');
});
