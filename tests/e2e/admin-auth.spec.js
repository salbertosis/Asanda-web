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

const routeAdminAuth = async (page, profile) => {
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
    body: JSON.stringify(profile),
  }));
};

test('redirects an anonymous admin deep link without exposing protected content', async ({ page }) => {
  await page.goto('/admin');

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible();
  await expect(page.getByText('Panel de administración')).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
});

test('rejects an authenticated user whose staff profile is inactive', async ({ page }) => {
  await routeAdminAuth(page, {
    id: userId,
    display_name: 'Editor inactivo',
    role: 'editor',
    is_active: false,
  });
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('alert')).toContainText('No fue posible iniciar sesión');
  await expect(page.getByText('Panel de administración')).toHaveCount(0);
});

test('restores an active editor session and signs out safely', async ({ page }) => {
  await routeAdminAuth(page, {
    id: userId,
    display_name: 'Editor ASANDA',
    role: 'editor',
    is_active: true,
  });
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/admin\/noticias$/);
  await expect(page.getByRole('heading', { name: 'Noticias' })).toBeVisible();
  await expect(page.getByText('Editor ASANDA')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Noticias' })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible();
});

test('completes password recovery and clears the temporary session', async ({ page }) => {
  let updatedPassword = null;
  let logoutRequests = 0;

  await page.route('**/auth/v1/user', async (route) => {
    if (route.request().method() === 'PUT') {
      updatedPassword = route.request().postDataJSON().password;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authUser),
    });
  });
  await page.route('**/auth/v1/logout**', (route) => {
    logoutRequests += 1;
    return route.fulfill({ status: 204, body: '' });
  });

  await page.goto(`/admin/login#access_token=${accessToken}&refresh_token=recovery-refresh-token&expires_in=3600&token_type=bearer&type=recovery`);

  await expect(page.getByRole('heading', { name: 'Crear nueva contraseña' })).toBeVisible();
  const newPasswordInput = page.getByLabel('Nueva contraseña', { exact: true });
  await newPasswordInput.fill('corta');
  await page.getByLabel('Confirmar nueva contraseña').fill('corta');
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();
  expect(await newPasswordInput.evaluate((input) => input.validity.tooShort)).toBe(true);
  expect(updatedPassword).toBeNull();

  await page.getByLabel('Nueva contraseña', { exact: true }).fill('clave-corta');
  await page.getByLabel('Confirmar nueva contraseña').fill('clave-distinta');
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();
  await expect(page.getByRole('alert')).toContainText('Las contraseñas no coinciden');
  expect(updatedPassword).toBeNull();

  await page.getByLabel('Confirmar nueva contraseña').fill('clave-corta');
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();

  await expect(page.getByRole('heading', { name: 'Acceso administrativo' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Contraseña actualizada');
  expect(updatedPassword).toBe('clave-corta');
  expect(logoutRequests).toBe(1);
  await expect(page.getByLabel('Nueva contraseña', { exact: true })).toHaveCount(0);
});
