import { expect, test } from '@playwright/test';

const athletesResponse = [
  {
    id: 'gustavo',
    display_name: 'Gustavo Idrogo',
    preferred_name: null,
    competitive_sex: 'male',
    photo: {
      provider: 'cloudinary',
      public_id: 'athlete-gustavo',
      external_url: null,
      alt_text: 'Retrato de Gustavo Idrogo',
    },
    memberships: [
      { membership_type: 'associated', organization: { id: 'a-zeta', name: 'Zeta Acuática', short_name: 'ZA' } },
      { membership_type: 'associated', organization: { id: 'z-cce', name: 'Centro Cultural Español', short_name: 'CCE' } },
      { membership_type: 'federated', organization: { id: 'z-cce', name: 'Centro Cultural Español', short_name: 'CCE' } },
    ],
    disciplines: [],
    categories: [{ category: { code: 'youth-b', name: 'Juvenil B', sort_order: 70 } }],
  },
  {
    id: 'associated-only',
    display_name: 'Atleta Solo Asociado',
    preferred_name: null,
    competitive_sex: 'female',
    photo: null,
    memberships: [
      { membership_type: 'associated', organization: { id: 'other', name: 'Club de Prueba', short_name: 'CDP' } },
    ],
    disciplines: [{ discipline: { code: 'swimming', name: 'Natación' } }],
    categories: [{ category: { code: 'infant-a', name: 'Infantil A', sort_order: 40 } }],
  },
  {
    id: 'without-membership',
    display_name: 'Atleta Sin Membresía',
    preferred_name: null,
    competitive_sex: 'open',
    photo: null,
    memberships: [],
    disciplines: [],
    categories: [],
  },
];

const routeAthletes = (page, response = athletesResponse, status = 200, onRequest) => page.route('**/rest/v1/athletes*', (route) => {
  onRequest?.(route.request());
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) });
});

test('shows every published athlete once on the public directory without legacy or private data', async ({ page }) => {
  let requestUrl;
  await routeAthletes(page, athletesResponse, 200, (request) => { requestUrl = new URL(request.url()); });

  await page.goto('/atletas');

  await expect(page.getByRole('heading', { level: 1, name: 'Atletas', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: 'Atletas publicados', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 3, name: 'Gustavo Idrogo', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atleta Sin Membresía' })).toBeVisible();
  await expect(page.getByText('Sin club publicado').first()).toBeVisible();
  await expect(page.getByText('Zeta Acuática').first()).toBeVisible();
  await expect(page.getByText('Centro Cultural Español')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Carlos Mendoza' })).toHaveCount(0);
  await expect(page.getByText('24/09/2008')).toHaveCount(0);
  await expect(page.getByText('32.625.806')).toHaveCount(0);
  await expect(page.getByText('52.34', { exact: true })).toHaveCount(0);
  expect(requestUrl.searchParams.get('publication_status')).toBe('eq.published');
  expect(requestUrl.searchParams.get('select')).not.toContain('is_primary');
});

test('shows Gustavo on associated and federated directories without private identity data', async ({ page }) => {
  await routeAthletes(page);

  await page.goto('/atletas-asociados');
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Atleta Solo Asociado' })).toBeVisible();
  await expect(page.getByText('Juvenil B')).toBeVisible();
  await expect(page.getByText('Zeta Acuática')).toBeVisible();

  await page.goto('/atletas-federados');
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Atleta Solo Asociado' })).toHaveCount(0);
  await expect(page.getByText('Centro Cultural Español')).toBeVisible();
  await expect(page.getByText('Zeta Acuática')).toHaveCount(0);
  await expect(page.getByText('Federado', { exact: true })).toBeVisible();
  await expect(page.getByText('24/09/2008')).toHaveCount(0);
  await expect(page.getByText('32.625.806')).toHaveCount(0);
  await expect(page.getByAltText('Retrato de Gustavo Idrogo')).toHaveAttribute('src', /c_fill,g_face.*\/athlete-gustavo$/);
});

test('filters associated athletes by club with an accessible pressed state', async ({ page }) => {
  await routeAthletes(page);
  await page.goto('/atletas-asociados');

  const resultContext = page.getByTestId('athlete-result-context');
  await expect(resultContext).toHaveText('2 atletas publicados');
  const zetaFilter = page.getByRole('button', { name: 'ZA' });
  await zetaFilter.click();
  await expect(zetaFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(resultContext).toHaveText('1 de 2 atletas · ZA');
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atleta Solo Asociado' })).toHaveCount(0);
});

test('renders an accessible athlete error state', async ({ page }) => {
  await routeAthletes(page, { message: 'Unavailable' }, 500);
  await page.goto('/atletas');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los atletas');
});

test('renders public athlete loading and empty states', async ({ page }) => {
  let releaseResponse;
  await page.route('**/rest/v1/athletes*', async (route) => {
    await new Promise((resolve) => { releaseResponse = resolve; });
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/atletas');
  const loadingStatus = page.getByRole('status');
  await expect(loadingStatus).toHaveText('Cargando atletas…');
  await expect(loadingStatus.locator('..')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => typeof releaseResponse).toBe('function');
  releaseResponse();
  await expect(page.getByRole('status')).toHaveText('No hay atletas publicados disponibles.');
});

test('keeps the public athlete hero and directory within the initial mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  const unsplashRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('images.unsplash.com')) unsplashRequests.push(request.url());
  });
  await routeAthletes(page);
  await page.goto('/atletas');

  const hero = page.getByTestId('athlete-directory-hero');
  const firstArticle = page.locator('article').first();
  await expect(hero).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Atletas', exact: true })).toHaveCount(1);
  await expect(page.getByText('Directorio institucional', { exact: true })).toBeVisible();
  await expect(page.getByText('Perfiles públicos de atletas registrados por ASANDA.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Atletas publicados', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Gustavo Idrogo', exact: true })).toBeVisible();
  expect(await hero.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThanOrEqual(240);
  expect(await firstArticle.evaluate((element) => element.getBoundingClientRect().top)).toBeLessThanOrEqual(844);
  expect(unsplashRequests).toHaveLength(0);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});
