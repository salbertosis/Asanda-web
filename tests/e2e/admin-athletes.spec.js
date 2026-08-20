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

const athlete = {
  id: 'athlete-relations',
  display_name: 'Atleta de relaciones',
  preferred_name: null,
  competitive_sex: 'female',
  birth_year_public: 2012,
  photo_asset_id: null,
  publication_status: 'draft',
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

const routeAthleteEditor = async (page, handlers = {}) => {
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json(athlete)));
  await page.route('**/rest/v1/athlete_consents**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/age_categories**', (route) => route.fulfill(json([
    { id: 'category-youth', code: 'youth', name: 'Juvenil', federation_eligible: true, is_active: true, sort_order: 1 },
    { id: 'category-pre-infant', code: 'pre-infant', name: 'Pre Infantil', federation_eligible: false, is_active: true, sort_order: 2 },
  ])));
  await page.route('**/rest/v1/disciplines**', (route) => route.fulfill(json([
    { id: 'discipline-swimming', code: 'swimming', name: 'Natación', is_active: true },
  ])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([
    { id: 'club-asanda', name: 'Club ASANDA', short_name: 'ASD', organization_type: 'club' },
  ])));
  await page.route('**/rest/v1/athlete_category_assignments**', handlers.category || ((route) => route.fulfill(json([]))));
  await page.route('**/rest/v1/athlete_disciplines**', handlers.discipline || ((route) => route.fulfill(json([]))));
  await page.route('**/rest/v1/athlete_memberships**', handlers.membership || ((route) => route.fulfill(json([]))));
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

test('preserves category values when overlapping periods are rejected', async ({ page }) => {
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    category: async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill(json([{
          id: 'existing-category',
          category_id: 'category-youth',
          valid_from: '2026-01-01',
          valid_to: '2026-12-31',
        }]));
      }
      return route.fulfill({
        ...json({ code: '23P01', message: 'An athlete cannot have overlapping category periods.' }),
        status: 409,
      });
    },
  });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  await expect(page.getByRole('heading', { name: 'Atleta de relaciones' })).toBeVisible();
  await page.getByRole('button', { name: 'Agregar categoría' }).click();
  await page.getByLabel('Categoría').selectOption('category-youth');
  await page.getByLabel('Desde').fill('2026-06-01');
  await page.getByLabel('Hasta').fill('2026-12-31');
  await page.getByRole('button', { name: 'Guardar categoría' }).click();

  await expect(page.getByRole('alert')).toContainText('se superpone');
  await expect(page.getByLabel('Categoría')).toHaveValue('category-youth');
  await expect(page.getByLabel('Desde')).toHaveValue('2026-06-01');
  await expect(page.getByLabel('Hasta')).toHaveValue('2026-12-31');
});

test('persists discipline and associated membership through their service operations', async ({ page }) => {
  const disciplineWrites = [];
  const membershipWrites = [];
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    discipline: async (route) => {
      if (route.request().method() === 'GET') return route.fulfill(json([]));
      const payload = route.request().postDataJSON();
      disciplineWrites.push(payload);
      return route.fulfill(json({ ...payload, discipline: { id: 'discipline-swimming', code: 'swimming', name: 'Natación' } }));
    },
    membership: async (route) => {
      if (route.request().method() === 'GET') return route.fulfill(json([]));
      const payload = route.request().postDataJSON();
      membershipWrites.push(payload);
      return route.fulfill(json({ ...payload, id: 'membership-associated', organization: { id: 'club-asanda', name: 'Club ASANDA', short_name: 'ASD' } }));
    },
  });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  const disciplines = page.getByRole('group', { name: 'Disciplinas' });
  await disciplines.getByRole('button', { name: 'Agregar disciplina' }).click();
  await disciplines.getByRole('combobox').selectOption('discipline-swimming');
  await disciplines.getByLabel('Disciplina principal').check();
  await disciplines.getByLabel('Desde').fill('2026-01-01');
  await disciplines.getByLabel('Hasta').fill('2026-12-31');
  await disciplines.getByRole('button', { name: 'Guardar disciplina' }).click();
  await expect(page.getByText('Natación · Principal')).toBeVisible();

  const memberships = page.getByRole('group', { name: 'Membresías' });
  await memberships.getByRole('button', { name: 'Agregar membresía' }).click();
  await memberships.getByLabel('Club').selectOption('club-asanda');
  await memberships.getByLabel('Tipo de membresía').selectOption('associated');
  await memberships.getByLabel('Desde').fill('2026-01-01');
  await memberships.getByLabel('Hasta').fill('2026-12-31');
  await memberships.getByRole('button', { name: 'Guardar membresía' }).click();
  await expect(page.getByText(/Club ASANDA · Asociada/)).toBeVisible();

  expect(disciplineWrites).toEqual([{
    athlete_id: 'athlete-relations',
    discipline_id: 'discipline-swimming',
    is_primary: true,
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
  }]);
  expect(membershipWrites).toEqual([{
    athlete_id: 'athlete-relations',
    organization_id: 'club-asanda',
    membership_type: 'associated',
    status: 'active',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
  }]);
});

test('preserves federated membership values when coverage and pre-infant rules reject them', async ({ page }) => {
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    category: (route) => route.fulfill(json([{
      id: 'pre-infant-category',
      category_id: 'category-pre-infant',
      valid_from: '2026-01-01',
      valid_to: null,
    }])),
    membership: async (route) => {
      if (route.request().method() === 'GET') return route.fulfill(json([]));
      return route.fulfill({
        ...json({ code: '23514', message: 'Federated membership requires an active association covering the same period; pre-infant athletes cannot be federated.' }),
        status: 400,
      });
    },
  });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  await page.getByRole('button', { name: 'Agregar membresía' }).click();
  await page.getByLabel('Club').selectOption('club-asanda');
  await page.getByLabel('Tipo de membresía').selectOption('federated');
  await page.getByLabel('Desde').fill('2026-06-01');
  await page.getByLabel('Hasta').fill('2026-12-31');
  await page.getByRole('button', { name: 'Guardar membresía' }).click();

  await expect(page.getByRole('alert')).toContainText('asociación vigente');
  await expect(page.getByRole('alert')).toContainText('Pre Infantil');
  await expect(page.getByLabel('Club')).toHaveValue('club-asanda');
  await expect(page.getByLabel('Tipo de membresía')).toHaveValue('federated');
  await expect(page.getByLabel('Desde')).toHaveValue('2026-06-01');
  await expect(page.getByLabel('Hasta')).toHaveValue('2026-12-31');
});
