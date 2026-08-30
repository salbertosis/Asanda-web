import { expect, test } from '@playwright/test';

const featuredRows = [
  {
    profile_key: `v1_${'a'.repeat(64)}`,
    display_order: 1,
    display_name: 'Lucía Torres',
    preferred_name: 'Lucía',
    photo_provider: 'cloudinary',
    photo_public_id: 'athletes/lucia',
    photo_external_url: null,
    photo_alt_text: 'Lucía en la piscina',
    club_name: 'Acuático Oriente',
    club_short_name: null,
    category_name: 'Infantil B',
    events: ['100 m libre', '50 m mariposa'],
    results: [
      { event_name: '100 m libre', time_ms: 62340, place: 2, competition_name: 'Estadal 2026', competition_date: '2026-08-10' },
      { event_name: '50 m mariposa', time_ms: 30120, place: 1, competition_name: 'Copa ASANDA', competition_date: '2026-07-15' },
    ],
    achievements: [
      { achievement_type: 'national_podium', title: 'Final nacional juvenil', competition_name: 'Nacional Juvenil 2026', place: 2, achieved_on: '2026-06-21', medal: null, valid_from: null, valid_to: null },
      { achievement_type: 'international_medal', title: 'Relevo 4 × 100 m libre', competition_name: 'Copa Internacional', medal: 'bronze', place: null, achieved_on: '2026-05-18', valid_from: null, valid_to: null },
      { achievement_type: 'national_team', title: 'Selección Nacional Juvenil', competition_name: null, medal: null, place: null, achieved_on: null, valid_from: '2026-01-01', valid_to: '2026-12-31' },
    ],
  },
  {
    profile_key: `v1_${'b'.repeat(64)}`,
    display_order: 2,
    display_name: `Ana Pérez ${'NombreCompetitivoExtremadamenteLargo'.repeat(3)}`,
    preferred_name: 'Ana Pérez',
    photo_provider: null,
    photo_public_id: null,
    photo_external_url: null,
    photo_alt_text: null,
    club_name: `OrganizaciónAcuáticaConNombreInstitucionalExtremadamenteLargo${'SinSeparadores'.repeat(4)}`,
    club_short_name: 'ZA',
    category_name: `CategoríaCompetitiva${'ExtremadamenteLarga'.repeat(4)}`,
    events: [`PruebaOficial${'ConNombreExtremadamenteLargo'.repeat(5)}`],
    results: [{ event_name: `PruebaOficial${'ConNombreExtremadamenteLargo'.repeat(5)}`, time_ms: 71000, place: 4, competition_name: `Competencia${'ConNombreExtremadamenteLargo'.repeat(5)}`, competition_date: '2026-06-01' }],
    achievements: [],
  },
];

// This fixture models the RPC allowlist; SQL tests own evidence, consent, and RLS enforcement.
const PROFILE_KEYS = ['achievements', 'category_name', 'club_name', 'club_short_name', 'display_name', 'display_order', 'events', 'photo_alt_text', 'photo_external_url', 'photo_provider', 'photo_public_id', 'preferred_name', 'profile_key', 'results'];

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

const routeFeatured = async (page, body = featuredRows, status = 200, onRequest) => {
  await page.route('**/rest/v1/featured_athletes*', (route) => route.fulfill(json({ message: 'Unexpected second featured query' }, 500)));
  await page.route('**/rest/v1/rpc/get_featured_athlete_profiles', (route) => {
    onRequest?.(route.request());
    expect(route.request().method()).toBe('POST');
    if (status === 200) body.forEach((row) => expect(Object.keys(row).sort()).toEqual(PROFILE_KEYS));
    return route.fulfill(json(body, status));
  });
};

test('renders database-ordered featured athletes without fictional results', async ({ page }) => {
  let rpcRequests = 0;
  await routeFeatured(page, featuredRows, 200, () => { rpcRequests += 1; });
  await page.goto('/');

  const section = page.locator('#atletas');
  await expect(section.locator('article')).toHaveCount(2);
  await expect(section.locator('h3')).toHaveText(['Lucía', 'Ana Pérez']);
  await expect(section).toContainText('Acuático Oriente');
  await expect(section).toContainText('ZA');
  await expect(section).not.toContainText('Club Náutico');
  await expect(section).toContainText('CategoríaCompetitiva');
  await expect(section).not.toContainText('Carlos Mendoza');
  await expect(section).not.toContainText('Oro');
  await expect(section.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/atletas-destacados');
  await expect(section.locator('article a')).toHaveCount(0);
  await expect(section.getByAltText('Lucía en la piscina')).toHaveAttribute('src', /c_fill,g_face.*\/athletes\/lucia$/);
  await expect(section.getByAltText('Logotipo de ASANDA')).toHaveAttribute('src', '/asanda.png');
  expect(rpcRequests).toBe(1);
});

test('announces loading and empty featured states', async ({ page }) => {
  let releaseResponse;
  const gate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/rpc/get_featured_athlete_profiles', async (route) => {
    await gate;
    await route.fulfill(json([]));
  });
  await page.goto('/');

  const section = page.locator('#atletas');
  await expect(section).toHaveAttribute('aria-busy', 'true');
  await expect(section.getByRole('status')).toContainText('Cargando atletas destacados');
  releaseResponse();
  await expect(section.getByRole('status')).toContainText('Todavía no hay atletas destacados publicados');
  await expect(section).toHaveAttribute('aria-busy', 'false');
});

test('announces a featured athlete request error', async ({ page }) => {
  await routeFeatured(page, { message: 'Unavailable' }, 500);
  await page.goto('/');
  await expect(page.locator('#atletas').getByRole('alert')).toContainText('No pudimos cargar los atletas destacados');
});

test('keeps featured athlete cards inside a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await routeFeatured(page);
  await page.goto('/');

  await expect(page.locator('#atletas').getByRole('heading', { name: 'Lucía' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('renders featured athletes on their public directory page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await routeFeatured(page);
  await page.goto('/atletas-destacados');

  await expect(page.getByRole('heading', { level: 1, name: 'Atletas destacados', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: 'Selección publicada', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Lucía', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Ana Pérez' })).toBeVisible();
  await expect(page.getByText('Acuático Oriente').first()).toBeVisible();
  await expect(page.getByText('Lucía Torres').first()).toBeVisible();
  await expect(page.getByAltText('Lucía en la piscina').first()).toHaveAttribute('src', /c_fill,g_face.*\/athletes\/lucia$/);
  await expect(page.getByTestId('featured-result-context')).toHaveText('2 atletas destacados');
  const zetaFilter = page.getByRole('button', { name: 'ZA', exact: true });
  await zetaFilter.click();
  await expect(zetaFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('featured-result-context')).toHaveText('1 de 2 atletas · ZA');
  await expect(page.getByRole('heading', { level: 3, name: 'Ana Pérez' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3, name: 'Lucía', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('announces loading and empty featured directory states', async ({ page }) => {
  let releaseResponse;
  await page.route('**/rest/v1/rpc/get_featured_athlete_profiles', async (route) => {
    await new Promise((resolve) => { releaseResponse = resolve; });
    await route.fulfill(json([]));
  });
  await page.goto('/atletas-destacados');
  const loadingStatus = page.getByRole('status');
  await expect(loadingStatus).toHaveText('Cargando atletas destacados…');
  await expect(loadingStatus.locator('..')).toHaveAttribute('aria-busy', 'true');
  await expect.poll(() => typeof releaseResponse).toBe('function');
  releaseResponse();
  await expect(page.getByRole('status')).toContainText('Todavía no hay atletas destacados publicados');
  await expect(page.getByRole('status').locator('xpath=ancestor::*[@aria-busy][1]')).toHaveAttribute('aria-busy', 'false');
});

test('renders a stable featured directory error in dark mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await routeFeatured(page, { message: 'Unavailable' }, 500);
  await page.goto('/atletas-destacados');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('No pudimos cargar los atletas destacados. Intente nuevamente más tarde.');
  await expect(alert).toHaveClass(/dark:bg-red-950/);
});
