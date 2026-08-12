import { expect, test } from '@playwright/test';

const clubResponse = [{
  id: 'club-cce',
  name: 'Centro Cultural Español',
  short_name: 'CCE',
  description: 'Escuela enfocada en la formación y desarrollo competitivo de atletas.',
  founded_year: 1985,
  logo: {
    provider: 'cloudinary',
    public_id: 'cce',
    external_url: null,
    alt_text: 'Emblema de CCE',
  },
  contacts: [{
    contact_type: 'social',
    label: 'Instagram',
    value: '@edacce_oficial',
    url: 'https://www.instagram.com/edacce_oficial/',
    sort_order: 1,
  }],
  memberships: [
    { athlete_id: 'athlete-1', membership_type: 'associated' },
    { athlete_id: 'athlete-2', membership_type: 'associated' },
    { athlete_id: 'athlete-2', membership_type: 'federated' },
  ],
}];

const routeClubs = (page, response, status = 200) => page.route('**/rest/v1/organizations*', (route) => (
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(response),
  })
));

test('renders published clubs from Supabase with distinct athlete totals', async ({ page }) => {
  await routeClubs(page, clubResponse);
  await page.goto('/clubes');

  await expect(page.getByRole('heading', { name: 'Centro Cultural Español' })).toBeVisible();
  await expect(page.getByText('CCE', { exact: true })).toBeVisible();
  await expect(page.getByText('Fundado en 1985')).toBeVisible();
  await expect(page.getByRole('link', { name: '@edacce_oficial' })).toHaveAttribute(
    'href',
    'https://www.instagram.com/edacce_oficial/'
  );
  await expect(page.getByText('Av. Peñalver')).toHaveCount(0);
  await expect(page.getByText('0283-2410404')).toHaveCount(0);
  await expect(page.getByLabel('Resumen del directorio')).toContainText('1 club');
  await expect(page.getByLabel('Resumen del directorio')).toContainText('2 atletas');
  const clubCard = page.getByRole('article').filter({ hasText: 'Centro Cultural Español' });
  await expect(clubCard.getByText('Plantel registrado')).toBeVisible();
  await expect(clubCard.getByText('2 asociados')).toBeVisible();
  await expect(clubCard.getByText('1 federados')).toBeVisible();
  await expect(page.getByAltText('Emblema de CCE')).toHaveAttribute('src', /c_fit.*\/cce$/);
});

test('exposes a loading status and then an empty state', async ({ page }) => {
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/organizations*', async (route) => {
    await responseGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.goto('/clubes');
  await expect(page.getByText('Cargando clubes…', { exact: true })).toBeVisible();
  releaseResponse();
  await expect(page.getByText('No hay clubes publicados en este momento.')).toBeVisible();
});

test('renders an accessible error without misleading totals', async ({ page }) => {
  await routeClubs(page, { message: 'Database unavailable' }, 500);
  await page.goto('/clubes');

  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los clubes');
  await expect(page.getByLabel('Resumen del directorio')).toHaveCount(0);
});

test('keeps the club profile readable on mobile and in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await routeClubs(page, clubResponse);
  await page.goto('/clubes');

  const clubCard = page.getByRole('article').filter({ hasText: 'Centro Cultural Español' });
  await expect(clubCard).toBeVisible();
  await expect(clubCard.getByText('Plantel registrado')).toBeVisible();
  await expect(page.getByLabel('Resumen del directorio')).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});
