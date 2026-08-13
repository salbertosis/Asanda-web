import { expect, test } from '@playwright/test';

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

const routeCompetitions = (page, competitions, status = 200) => page.route('**/rest/v1/competitions*', (route) => {
  const url = new URL(route.request().url());
  const slugFilter = url.searchParams.get('slug');
  const payload = slugFilter
    ? competitions.filter((competition) => competition.slug === slugFilter.replace(/^eq\./, ''))
    : competitions;
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  });
});

test('renders the official agenda with organizer identities', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();
  await expect(page.getByLabel('Resumen del calendario')).toContainText('4');
  await expect(page.getByAltText('Logo de FEVEDA').first()).toHaveAttribute('src', /c_pad,b_transparent.*\/feveda_logo$/);
  await expect(page.getByAltText('Logo de ASANDA')).toHaveAttribute('src', /c_pad,b_transparent.*\/asanda$/);

  await page.getByRole('button', { name: 'Ver calendario 2025' }).click();
  const fallbackRow = page.getByRole('article').filter({ hasText: 'Torneo de Aguas Abiertas 2025' });
  await expect(fallbackRow.locator('img')).toHaveCount(0);
  await expect(fallbackRow).toContainText('ASANDA');
  await expect(page.locator('img[src*="unsplash.com"]')).toHaveCount(0);
});

test('filters competitions by explicit month', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await page.getByLabel('Mes').selectOption('Febrero');

  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Campeonato Nacional de Categorías' })).toHaveCount(0);
  await expect(page.getByLabel('Resumen del calendario')).toContainText('1');
});

test('changes year and resets all calendar filters', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await page.getByRole('button', { name: 'Ver calendario 2025' }).click();
  await expect(page.getByRole('heading', { name: 'Competiciones 2025' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Torneo de Aguas Abiertas 2025' })).toBeVisible();

  await page.getByLabel('Mes').selectOption('Abril');
  await expect(page.getByText('Sin competencias para estos filtros')).toBeVisible();

  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
  await expect(page.getByLabel('Mes')).toHaveValue('Todos');
});

test('exposes a loading status while fetching the calendar', async ({ page }) => {
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/competitions*', async (route) => {
    await responseGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(competitionResponse) });
  });

  await page.goto('/calendario');
  await expect(page.getByText('Cargando calendario…', { exact: true })).toBeVisible();
  releaseResponse();
  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
});

test('keeps the enterprise calendar within a mobile viewport in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'I Campeonato Municipal de Fondo' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});

test('opens a competition detail from the calendar', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario');

  const competition = page.getByRole('article').filter({ hasText: 'Campeonato Nacional de Categorías' });
  await competition.getByRole('link', { name: 'Ver competencia' }).click();

  await expect(page).toHaveURL(/\/calendario\/campeonato-nacional-categorias-mayo-2026$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Campeonato Nacional de Categorías' })).toBeVisible();
  await expect(page.getByText('26 al 30 de Mayo de 2026')).toBeVisible();
  await expect(page.getByText('Complejo Acuático Nacional, Caracas, Distrito Capital')).toBeVisible();
  await expect(page.getByLabel('Organización responsable')).toContainText('FEVEDA');
});

test('provides a stable fallback for an unknown competition', async ({ page }) => {
  await routeCompetitions(page, competitionResponse);
  await page.goto('/calendario/competencia-inexistente');

  await expect(page.getByRole('heading', { level: 1, name: 'Competencia no encontrada' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al calendario' })).toHaveAttribute('href', '/calendario');
});