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
      { membership_type: 'associated', organization: { id: 'cce', name: 'Centro Cultural Español', short_name: 'CCE' } },
      { membership_type: 'federated', organization: { id: 'cce', name: 'Centro Cultural Español', short_name: 'CCE' } },
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
];

const routeAthletes = (page, response = athletesResponse, status = 200) => page.route('**/rest/v1/athletes*', (route) => (
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) })
));

test('shows Gustavo on associated and federated directories without private identity data', async ({ page }) => {
  await routeAthletes(page);

  await page.goto('/atletas-asociados');
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Atleta Solo Asociado' })).toBeVisible();
  await expect(page.getByText('Juvenil B')).toBeVisible();
  await expect(page.getByText('Federado', { exact: true })).toBeVisible();

  await page.goto('/atletas-federados');
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Atleta Solo Asociado' })).toHaveCount(0);
  await expect(page.getByText('24/09/2008')).toHaveCount(0);
  await expect(page.getByText('32.625.806')).toHaveCount(0);
  await expect(page.getByAltText('Retrato de Gustavo Idrogo')).toHaveAttribute('src', /c_fill,g_face.*\/athlete-gustavo$/);
});

test('filters associated athletes by club with an accessible pressed state', async ({ page }) => {
  await routeAthletes(page);
  await page.goto('/atletas-asociados');

  const cceFilter = page.getByRole('button', { name: 'CCE' });
  await cceFilter.click();
  await expect(cceFilter).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Atleta Solo Asociado' })).toHaveCount(0);
});

test('renders an accessible athlete error state', async ({ page }) => {
  await routeAthletes(page, { message: 'Unavailable' }, 500);
  await page.goto('/atletas-federados');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los atletas');
});

test('keeps athlete cards within a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await routeAthletes(page);
  await page.goto('/atletas-asociados');

  await expect(page.getByRole('heading', { name: 'Gustavo Idrogo' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});
