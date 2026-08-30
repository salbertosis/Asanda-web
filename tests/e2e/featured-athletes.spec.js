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

const routeHomepageFeatured = async (page, body = featuredRows, status = 200, onRequest) => {
  await page.route('**/rest/v1/featured_athletes*', (route) => route.fulfill(json({ message: 'Unexpected second featured query' }, 500)));
  await page.route('**/rest/v1/rpc/get_featured_athlete_profiles', (route) => route.fulfill(json({ message: 'Homepage requested the full directory' }, 500)));
  await page.route('**/rest/v1/rpc/get_homepage_featured_athlete_profiles', (route) => {
    onRequest?.(route.request());
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({});
    if (status === 200) body.forEach((row) => expect(Object.keys(row).sort()).toEqual(PROFILE_KEYS));
    return route.fulfill(json(body, status));
  });
};

const routeFeaturedDirectory = async (page, pages = [featuredRows], status = 200, onRequest) => {
  await page.route('**/rest/v1/rpc/get_homepage_featured_athlete_profiles', (route) => route.fulfill(json({ message: 'Directory requested the homepage preview' }, 500)));
  await page.route('**/rest/v1/rpc/get_featured_athlete_profiles', (route) => {
    const request = route.request();
    const parameters = request.postDataJSON();
    onRequest?.(parameters);
    expect(request.method()).toBe('POST');
    expect(parameters.requested_limit).toBe(100);
    const body = pages[parameters.requested_offset / 100] ?? [];
    const responseStatus = typeof status === 'function' ? status(parameters) : status;
    if (responseStatus === 200) body.forEach((row) => expect(Object.keys(row).sort()).toEqual(PROFILE_KEYS));
    return route.fulfill(json(responseStatus === 200 ? body : { message: 'Unavailable' }, responseStatus));
  });
};

test('renders database-ordered featured athletes without fictional results', async ({ page }) => {
  let rpcRequests = 0;
  const previewRows = [...featuredRows, ...Array.from({ length: 5 }, (_, index) => ({
    ...featuredRows[1],
    profile_key: `v1_${String(index + 3).padStart(64, '0')}`,
    display_order: index + 3,
    display_name: `Atleta ${index + 3}`,
    preferred_name: `Atleta ${index + 3}`,
  }))];
  await routeHomepageFeatured(page, previewRows, 200, () => { rpcRequests += 1; });
  await page.goto('/');

  const section = page.locator('#atletas');
  await expect(section.locator('article')).toHaveCount(6);
  await expect(section.locator('h3').first()).toHaveText('Lucía');
  await expect(section.locator('h3').nth(1)).toHaveText('Ana Pérez');
  await expect(section).not.toContainText('Atleta 7');
  await expect(section).toContainText('Acuático Oriente');
  await expect(section).toContainText('ZA');
  await expect(section).not.toContainText('Club Náutico');
  await expect(section).toContainText('CategoríaCompetitiva');
  await expect(section).not.toContainText('Carlos Mendoza');
  await expect(section).not.toContainText('Oro');
  await expect(section.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/atletas-destacados');
  await expect(section.locator('article a')).toHaveCount(0);
  await expect(section.getByAltText('Lucía en la piscina')).toHaveAttribute('src', /c_fill,g_face.*\/athletes\/lucia$/);
  const fallbackImages = section.getByAltText('Logotipo de ASANDA');
  await expect(fallbackImages).toHaveCount(5);
  await expect(fallbackImages.first()).toHaveAttribute('src', '/asanda.png');
  expect(rpcRequests).toBe(1);
});

test('announces loading and empty featured states', async ({ page }) => {
  let releaseResponse;
  const gate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/rpc/get_homepage_featured_athlete_profiles', async (route) => {
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
  await routeHomepageFeatured(page, { message: 'Unavailable' }, 500);
  await page.goto('/');
  await expect(page.locator('#atletas').getByRole('alert')).toContainText('No pudimos cargar los atletas destacados');
});

test('keeps featured athlete cards inside a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await routeHomepageFeatured(page);
  await page.goto('/');

  await expect(page.locator('#atletas').getByRole('heading', { name: 'Lucía' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('renders enterprise cards without a club filter and preserves other directory filters', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await routeFeaturedDirectory(page);
  await page.goto('/atletas-destacados');

  await expect(page.getByRole('heading', { level: 1, name: 'Atletas destacados', exact: true })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 2, name: 'Selección publicada', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Lucía', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Ana Pérez' })).toBeVisible();
  await expect(page.getByText('Acuático Oriente').first()).toBeVisible();
  await expect(page.getByText('Lucía Torres').first()).toBeVisible();
  await expect(page.getByAltText('Lucía en la piscina').first()).toHaveAttribute('src', /c_fill,g_face.*\/athletes\/lucia$/);
  await expect(page.getByTestId('featured-result-context')).toContainText('2 atletas destacados');
  await expect(page.getByText('Filtrar por club')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'ZA', exact: true })).toHaveCount(0);
  const luciaCard = page.getByRole('button', { name: 'Ver perfil público de Lucía' });
  const luciaArticle = luciaCard.locator('xpath=ancestor::article');
  await expect(luciaCard).toHaveAttribute('aria-haspopup', 'dialog');
  await expect(luciaCard).toHaveAttribute('aria-controls', 'featured-athlete-profile-dialog');
  await expect(luciaArticle).toContainText('100 m libre');
  await expect(luciaArticle).toContainText('1:02.34');
  await expect(luciaArticle).toContainText('Ver perfil público');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

  await page.route('**/rest/v1/athletes*', (route) => route.fulfill(json([{ id: 'associated', display_name: 'Atleta Asociado', preferred_name: null, competitive_sex: 'female', photo: null, memberships: [{ membership_type: 'associated', organization: { id: 'club', name: 'Club Visible', short_name: 'CV' } }], disciplines: [], categories: [] }])));
  await page.goto('/atletas-asociados');
  await expect(page.getByText('Filtrar por club')).toBeVisible();
  await expect(page.getByRole('button', { name: 'CV', exact: true })).toBeVisible();
});

test('paginates the featured directory and preserves unique database order', async ({ page }) => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    ...featuredRows[1],
    profile_key: `v1_${String(index + 1).padStart(64, '0')}`,
    display_order: index + 1,
    display_name: `Atleta paginado ${index + 1}`,
    preferred_name: `Atleta paginado ${index + 1}`,
  }));
  const finalRow = {
    ...featuredRows[1],
    profile_key: `v1_${'f'.repeat(64)}`,
    display_order: 101,
    display_name: 'Atleta paginado 101',
    preferred_name: 'Atleta paginado 101',
  };
  const offsets = [];
  await routeFeaturedDirectory(page, [firstPage, [firstPage[0], finalRow]], 200, ({ requested_offset: offset }) => offsets.push(offset));
  await page.goto('/atletas-destacados');

  const cards = page.locator('main article');
  await expect(cards).toHaveCount(101);
  await expect(cards.first().getByRole('heading')).toHaveText('Atleta paginado 1');
  await expect(cards.nth(99).getByRole('heading')).toHaveText('Atleta paginado 100');
  await expect(cards.last().getByRole('heading')).toHaveText('Atleta paginado 101');
  await expect(page.getByRole('heading', { name: 'Atleta paginado 1', exact: true })).toHaveCount(1);
  expect(offsets).toEqual([0, 100]);
});

test('opens the allowlisted public profile and restores focus and scroll for every close path', async ({ page }) => {
  await routeFeaturedDirectory(page);
  await page.goto('/atletas-destacados');
  const card = page.getByRole('button', { name: 'Ver perfil público de Lucía' });
  const dialog = page.getByRole('dialog', { name: 'Perfil público de Lucía' });

  await card.focus();
  await card.press('Enter');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: 'Cerrar perfil público' })).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  await expect(dialog).toContainText('Pruebas con resultados oficiales publicados');
  await expect(dialog).toContainText('Estadal 2026');
  await expect(dialog).toContainText('Puesto 2');
  await expect(dialog).toContainText('Final nacional juvenil');
  await expect(dialog).toContainText('Subcampeón nacional');
  await expect(dialog).toContainText('Medalla de Bronce');
  await expect(dialog).toContainText('Selección Nacional Juvenil');
  const serialized = await dialog.textContent();
  expect(serialized).not.toMatch(/athlete_id|source_document|approved_by|consent|notes/i);

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');

  await card.press('Space');
  await page.getByRole('button', { name: 'Cerrar perfil público' }).click();
  await expect(card).toBeFocused();

  await card.click();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox.x).toBeGreaterThan(0);
  await page.mouse.click(dialogBox.x / 2, dialogBox.y + dialogBox.height / 2);
  await expect(dialog).not.toBeVisible();
  await expect(card).toBeFocused();
});

test('keeps the modal usable at 320 and 390 pixels in dark reduced-motion mode', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('darkMode', 'true'));
  await routeFeaturedDirectory(page);

  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 760 });
    await page.goto('/atletas-destacados');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    const athleteName = width === 320 ? 'Ana Pérez' : 'Lucía';
    await page.getByRole('button', { name: `Ver perfil público de ${athleteName}` }).click();
    const dialog = page.getByRole('dialog', { name: `Perfil público de ${athleteName}` });
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    expect(await dialog.evaluate((element) => getComputedStyle(element.firstElementChild).backgroundColor)).toBe('rgb(2, 6, 23)');
    expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
    if (width === 320) await expect(dialog).toContainText('NombreCompetitivoExtremadamenteLargo');
    await page.getByRole('button', { name: 'Cerrar perfil público' }).click();
  }
});

test('announces loading and empty featured directory states', async ({ page }) => {
  let releaseResponse;
  await page.route('**/rest/v1/rpc/get_featured_athlete_profiles', async (route) => {
    expect(route.request().postDataJSON()).toEqual({ requested_limit: 100, requested_offset: 0 });
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
  const offsets = [];
  await routeFeaturedDirectory(page, [Array.from({ length: 100 }, () => featuredRows[0])], ({ requested_offset: offset }) => offset === 0 ? 200 : 500, ({ requested_offset: offset }) => offsets.push(offset));
  await page.goto('/atletas-destacados');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('No pudimos cargar los atletas destacados. Intente nuevamente más tarde.');
  await expect(alert).toHaveClass(/dark:bg-red-950/);
  await expect(page.locator('main article')).toHaveCount(0);
  expect(offsets).toEqual([0, 100]);
});
