import { expect, test } from '@playwright/test';

const disciplines = [{ id: 'd1', code: 'swimming', name: 'Natación', sort_order: 10 }, { id: 'd2', code: 'open-water', name: 'Aguas Abiertas', sort_order: 20 }, { id: 'd3', code: 'water-polo', name: 'Water Polo', sort_order: 30 }, { id: 'd4', code: 'artistic-swimming', name: 'Nado Sincronizado', sort_order: 40 }, { id: 'd5', code: 'diving', name: 'Saltos Ornamentales', sort_order: 50 }];
const calendar = (code = 'swimming', year = 2026) => ({ season_year: year, discipline: disciplines.find((item) => item.code === code) });

const competitionResponse = [
  {
    id: '3d1c7f2a-9b40-4c6e-8f11-000000000001',
    name: 'Torneo de Aguas Abiertas 2025',
    slug: 'torneo-aguas-abiertas-2025',
    starts_on: '2025-06-14',
    ends_on: null,
    recognition_status: 'recognized',
    status: 'scheduled',
    description: null,
    logo: null,
    organizer: {
      name: 'Asociación de Deportes Acuáticos de Anzoátegui',
      short_name: 'ASANDA',
      slug: 'asanda',
    },
    venue: null,
  },
  {
    id: '3d1c7f2a-9b40-4c6e-8f11-000000000002',
    name: 'I Campeonato Municipal de Fondo',
    slug: 'i-campeonato-municipal-fondo-2026',
    starts_on: '2026-02-09',
    ends_on: '2026-02-15',
    recognition_status: 'recognized',
    status: 'scheduled',
    description: 'Recorrido de fondo en aguas abiertas del municipio.',
    logo: null,
    organizer: {
      name: 'Liga de Deportes Acuáticos Municipal',
      short_name: 'Liga',
      slug: 'liga-deportes-acuaticos-municipal',
    },
    venue: null,
  },
  {
    id: '3d1c7f2a-9b40-4c6e-8f11-000000000003',
    name: 'Campeonato Regional de Aguas Abiertas',
    slug: 'campeonato-regional-2026',
    starts_on: '2026-04-10',
    ends_on: '2026-04-12',
    recognition_status: 'recognized',
    status: 'scheduled',
    description: 'Competencia regional de aguas abiertas.',
    logo: {
      provider: 'cloudinary',
      public_id: 'asanda',
      external_url: null,
      alt_text: 'Logo de ASANDA',
    },
    organizer: {
      name: 'Asociación de Deportes Acuáticos de Anzoátegui',
      short_name: 'ASANDA',
      slug: 'asanda',
    },
    venue: {
      name: 'Playa El Fuerte',
      city: null,
      region: 'Bolívar',
      country_code: 'VE',
    },
  },
  {
    id: '3d1c7f2a-9b40-4c6e-8f11-000000000004',
    name: 'Campeonato Nacional de Categorías',
    slug: 'campeonato-nacional-categorias-mayo-2026',
    starts_on: '2026-05-26',
    ends_on: '2026-05-30',
    recognition_status: 'recognized',
    status: 'scheduled',
    description: 'Campeonato nacional por categorías de natación.',
    logo: {
      provider: 'cloudinary',
      public_id: 'feveda_logo',
      external_url: null,
      alt_text: 'Logo de FEVEDA',
    },
    organizer: {
      name: 'Federación Venezolana de Deportes Acuáticos',
      short_name: 'FEVEDA',
      slug: 'feveda',
    },
    venue: {
      name: 'Complejo Acuático Nacional',
      city: 'Caracas',
      region: 'Distrito Capital',
      country_code: 'VE',
    },
  },
  {
    id: '3d1c7f2a-9b40-4c6e-8f11-000000000005',
    name: 'Copa Pasión Acuática',
    slug: 'copa-pasion-acuatica-2026',
    starts_on: '2026-12-07',
    ends_on: '2026-12-13',
    recognition_status: 'recognized',
    status: 'scheduled',
    description: null,
    logo: {
      provider: 'cloudinary',
      public_id: 'feveda_logo',
      external_url: null,
      alt_text: 'Logo de FEVEDA',
    },
    organizer: {
      name: 'Federación Venezolana de Deportes Acuáticos',
      short_name: 'FEVEDA',
      slug: 'feveda',
    },
    venue: null,
  },
];

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const routeCatalog = async (page) => {
  await page.route('**/rest/v1/disciplines*', (route) => { const url = new URL(route.request().url()); expect(url.searchParams.get('select')).toBe('id,code,name,sort_order'); expect(url.searchParams.get('is_active')).toBe('eq.true'); route.fulfill(json(disciplines)); });
  await page.route('**/rest/v1/competition_calendars*', (route) => route.fulfill(json([{ season_year: 2026 }, { season_year: 2025 }])));
};
const routeCompetitions = async (page, competitions, status = 200) => {
  await routeCatalog(page);
  await page.route('**/rest/v1/competitions*', (route) => {
    const url = new URL(route.request().url()); const slug = url.searchParams.get('slug')?.replace(/^eq\./, ''); const code = url.searchParams.get('calendar.discipline.code')?.replace(/^eq\./, ''); const from = url.searchParams.get('starts_on')?.replace(/^gte\./, ''); const until = url.searchParams.getAll('starts_on').find((value) => value.startsWith('lt.'))?.slice(3);
    expect(url.searchParams.get('select')).toContain('calendar:competition_calendars!inner');
    expect(url.searchParams.get('status')).toBe('in.(scheduled,in_progress,completed,postponed,cancelled)');
    const payload = competitions.map((item) => ({ ...item, calendar: calendar(item.id.endsWith('1') || item.id.endsWith('2') || item.id.endsWith('3') ? 'open-water' : 'swimming', Number(item.starts_on.slice(0, 4))) })).filter((item) => (!slug || item.slug === slug) && (!code || item.calendar.discipline.code === code) && (!from || item.starts_on >= from) && (!until || item.starts_on < until));
    route.fulfill(json(payload, status));
  });
};

test('renders the official agenda with organizer identities', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { level: 1, name: 'Calendario de competiciones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(4);
  await expect(page.getByLabel('Resumen del calendario')).toHaveCount(0);
  await expect(page.getByAltText('Logo de FEVEDA').first()).toHaveAttribute('src', /c_pad,b_transparent.*\/feveda_logo$/);
  await expect(page.getByAltText('Logo de ASANDA')).toHaveAttribute('src', /c_pad,b_transparent.*\/asanda$/);
  await expect(page).toHaveURL('/calendario');
  await expect(page.getByRole('navigation', { name: 'Filtrar calendario por deporte' }).getByRole('link')).toHaveCount(6);
  await page.getByLabel('Año').selectOption('2025');
  const fallbackRow = page.getByRole('article').filter({ hasText: 'Torneo de Aguas Abiertas 2025' });
  await expect(fallbackRow.locator('img')).toHaveCount(0);
  await expect(fallbackRow).not.toContainText('Organiza:');
  await expect(fallbackRow.getByRole('img', { name: 'Identidad de ASANDA' })).toBeVisible();
  await expect(page.locator('img[src*="unsplash.com"]')).toHaveCount(0);
});

test('filters competitions by explicit month', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await page.getByLabel('Mes').selectOption('02');

  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Campeonato Nacional de Categorías' })).toHaveCount(0);
  await expect(page.getByRole('article')).toHaveCount(1);
});

test('changes year and resets all calendar filters', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await page.getByLabel('Año').selectOption('2025');
  await expect(page.getByText('Temporada 2025')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Torneo de Aguas Abiertas 2025' })).toBeVisible();

  await page.getByLabel('Mes').selectOption('04');
  await expect(page.getByText('Sin competencias para estos filtros')).toBeVisible();

  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Calendario de competiciones' })).toBeVisible();
  await expect(page.getByLabel('Mes')).toHaveValue('all');
  await expect(page).toHaveURL('/calendario');
});

test('keeps URL filters canonical and follows browser history', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario?sport=wrong&year=1900&month=99');
  await expect(page).toHaveURL('/calendario?sport=all&year=2026&month=all');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://asanda-web.vercel.app/calendario');
  const swimming = page.getByRole('link', { name: 'Natación', exact: true });
  await swimming.focus(); await expect(swimming).toBeFocused(); await swimming.press('Enter');
  await expect(page).toHaveURL(/sport=swimming/); await expect(swimming).toHaveAttribute('aria-current', 'page');
  await expect(page.getByText('Campeonato Nacional de Categorías')).toBeVisible();
  await page.getByRole('link', { name: 'Saltos Ornamentales' }).click();
  await expect(page.getByText('Sin competencias para estos filtros')).toBeVisible();
  await page.goBack(); await expect(page).toHaveURL(/sport=swimming/); await page.goForward(); await expect(page).toHaveURL(/sport=diving/);
});

test('exposes a loading status while fetching the calendar', async ({ page }) => {
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await routeCatalog(page);
  await page.route('**/rest/v1/competitions*', async (route) => {
    await responseGate;
    await route.fulfill(json(competitionResponse.map((item) => ({ ...item, calendar: calendar('swimming', Number(item.starts_on.slice(0, 4))) }))));
  });

  await page.goto('/calendario');
  await expect(page.getByText('Cargando calendario…', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Calendario de competiciones' })).toBeVisible();
  releaseResponse();
  await expect(page.getByRole('heading', { level: 1, name: 'Calendario de competiciones' })).toBeVisible();
});

test('shows a safe error and retries the failed request', async ({ page }) => {
  await routeCatalog(page); let requests = 0; let metadataRequests = 0;
  let releaseRetry; const retryGate = new Promise((resolve) => { releaseRetry = resolve; });
  page.on('request', (request) => { if (/\/rest\/v1\/(disciplines|competition_calendars)\?/.test(request.url())) metadataRequests += 1; });
  await page.route('**/rest/v1/competitions*', async (route) => { const url = new URL(route.request().url()); requests += 1; expect(url.searchParams.getAll('starts_on')).toEqual(['gte.2026-01-01', 'lt.2027-01-01']); if (requests === 1) return route.fulfill(json({ message: 'private detail' }, 500)); await retryGate; return route.fulfill(json([])); });
  await page.goto('/calendario');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar'); await expect(page.getByRole('alert')).not.toContainText('private detail');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'No pudimos cargar el calendario.', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Reintentar' }).click(); await expect(page.getByText('Cargando calendario…', { exact: true })).toBeVisible(); releaseRetry(); await expect(page.getByText('Sin competencias para estos filtros')).toBeVisible();
  expect(requests).toBe(2);
  expect(metadataRequests).toBe(2);
});

test('keeps the enterprise calendar within a mobile viewport in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { level: 1, name: 'Calendario de competiciones' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});

test('keeps the calendar sponsor bounded as the viewport grows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  const sponsor = page.locator('#calendario').getByRole('complementary', { name: /^Publicidad:/ });
  await expect(sponsor.getByText(/Publicidad|Contenido patrocinado|Presentado por/, { exact: true })).toBeVisible();
  await expect(sponsor.getByText('Demo', { exact: true })).toBeVisible();
  await expect(sponsor.getByRole('link')).toHaveAttribute('rel', 'sponsored noopener');
  const mobileBox = await sponsor.boundingBox();

  await page.setViewportSize({ width: 1280, height: 900 });
  const desktopBox = await sponsor.boundingBox();
  expect(desktopBox.width).toBeGreaterThan(mobileBox.width * 2);
  expect(desktopBox.height).toBeLessThan(mobileBox.height * 1.5);
  expect(mobileBox.height).toBeLessThan(mobileBox.width / 3);
  expect(desktopBox.height).toBeLessThan(desktopBox.width / 5);
});

test('uses one calendar heading and one descriptive copy', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByText('Consultá fechas, sedes, disciplinas e identidad organizadora de cada encuentro acuático.', { exact: true })).toHaveCount(1);
  await expect(page.getByTestId('page-hero-overlay')).toHaveCount(0);
});

test('collapses secondary filters on mobile and exposes them from one control', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  const toggle = page.getByRole('button', { name: 'Filtros' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByLabel('Mes')).toBeHidden();
  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByLabel('Mes')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Filtrar calendario por deporte' })).toBeVisible();
});

test('keeps desktop controls visible and bounds the active underline to its label', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await expect(page.getByRole('button', { name: 'Filtros' })).toBeHidden();
  await expect(page.getByLabel('Mes')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reiniciar' })).toBeVisible();
  const activeTab = page.getByRole('link', { name: 'Todos', exact: true });
  const indicator = activeTab.getByTestId('active-tab-indicator');
  const [tabBox, indicatorBox, navBox] = await Promise.all([
    activeTab.boundingBox(),
    indicator.boundingBox(),
    page.getByRole('navigation', { name: 'Filtrar calendario por deporte' }).boundingBox(),
  ]);
  expect(indicatorBox.width).toBeLessThanOrEqual(tabBox.width);
  expect(indicatorBox.width).toBeLessThan(navBox.width / 3);
});

test('lays out events from the same month in two desktop columns', async ({ page }) => {
  const secondFebruaryCompetition = {
    ...competitionResponse[1],
    id: '3d1c7f2a-9b40-4c6e-8f11-000000000006',
    name: 'Copa Regional de Fondo',
    slug: 'copa-regional-fondo-2026',
    starts_on: '2026-02-20',
    ends_on: null,
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  await routeCompetitions(page, [...competitionResponse, secondFebruaryCompetition]);
  await page.goto('/calendario');

  const februaryGrid = page.getByTestId('month-events-grid').first();
  const cards = februaryGrid.getByRole('article');
  await expect(cards).toHaveCount(2);
  const [firstBox, secondBox, gridBox] = await Promise.all([
    cards.nth(0).boundingBox(),
    cards.nth(1).boundingBox(),
    februaryGrid.boundingBox(),
  ]);
  const gridMidpoint = gridBox.x + gridBox.width / 2;
  expect(firstBox.x + firstBox.width / 2).toBeLessThan(gridMidpoint);
  expect(secondBox.x + secondBox.width / 2).toBeGreaterThan(gridMidpoint);
  expect(firstBox.y).toBeLessThan(secondBox.y + secondBox.height);
  expect(secondBox.y).toBeLessThan(firstBox.y + firstBox.height);
  expect(firstBox.width).toBeGreaterThan(gridBox.width * 0.4);
  expect(firstBox.width).toBeLessThan(gridBox.width * 0.6);
});

test('opens a competition detail from the calendar', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  const competition = page.getByRole('article').filter({ hasText: 'Campeonato Nacional de Categorías' });
  const venue = competition.getByText('Complejo Acuático Nacional, Caracas, Distrito Capital', { exact: true });
  const detailLink = competition.getByRole('link', { name: 'Ver detalle' });
  const [venueBox, detailBox] = await Promise.all([venue.boundingBox(), detailLink.boundingBox()]);
  expect(venueBox.y).toBeLessThan(detailBox.y + detailBox.height);
  expect(detailBox.y).toBeLessThan(venueBox.y + venueBox.height);
  await detailLink.click();

  await expect(page).toHaveURL(/\/calendario\/campeonato-nacional-categorias-mayo-2026$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Campeonato Nacional de Categorías' })).toBeVisible();
  await expect(page.getByText('Natación', { exact: true })).toBeVisible();
  await expect(page.getByText('26 al 30 de Mayo de 2026')).toBeVisible();
  await expect(page.getByText('Complejo Acuático Nacional, Caracas, Distrito Capital')).toBeVisible();
  await expect(page.getByLabel('Organización responsable')).toContainText('FEVEDA');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://asanda-web.vercel.app/calendario/campeonato-nacional-categorias-mayo-2026');
  await expect(page.getByRole('link', { name: 'Volver al calendario' })).toHaveAttribute('href', '/calendario?sport=all&year=2026&month=all');
  await page.getByRole('link', { name: 'Volver al calendario' }).click();
  await expect(page).toHaveURL('/calendario?sport=all&year=2026&month=all');
});

test('uses a safe calendar return for direct detail access', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario/campeonato-nacional-categorias-mayo-2026');

  await expect(page.getByRole('heading', { level: 1, name: 'Campeonato Nacional de Categorías' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al calendario' })).toHaveAttribute('href', '/calendario');
});

test('provides a stable fallback for an unknown competition', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario/competencia-inexistente');

  await expect(page.getByRole('heading', { level: 1, name: 'Competencia no encontrada' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al calendario' })).toHaveAttribute('href', '/calendario');
});
