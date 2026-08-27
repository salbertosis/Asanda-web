import { expect, test } from '@playwright/test';

const featuredRows = [
  {
    display_order: 2,
    athlete: {
      id: 'ana', display_name: 'Ana Pérez', preferred_name: null, photo: null,
      memberships: [
        { organization: { id: 'zeta', name: 'Zeta Acuática', short_name: 'ZA' } },
        { organization: { id: 'club-nautico', name: 'Club Náutico', short_name: 'CN' } },
      ],
      categories: [{ category: { name: 'Juvenil A' } }],
    },
  },
  {
    display_order: 1,
    athlete: {
      id: 'lucia', display_name: 'Lucía Torres', preferred_name: 'Lucía',
      photo: { provider: 'cloudinary', public_id: 'athletes/lucia', external_url: null, alt_text: 'Lucía en la piscina' },
      memberships: [{ organization: { id: 'acuatico-oriente', name: 'Acuático Oriente', short_name: null } }],
      categories: [{ category: { name: 'Infantil B' } }],
    },
  },
];

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

const routeFeatured = (page, body = featuredRows, status = 200) => page.route('**/rest/v1/featured_athletes*', (route) => {
  if (status !== 200) return route.fulfill(json(body, status));
  const url = new URL(route.request().url());
  expect(url.searchParams.get('select')).not.toContain('is_primary');
  expect(url.searchParams.get('order')).toBe('display_order.asc');
  const orderedBody = url.searchParams.get('order') === 'display_order.asc'
    ? [...body].sort((a, b) => a.display_order - b.display_order)
    : body;
  return route.fulfill(json(orderedBody, status));
});

test('renders database-ordered featured athletes without fictional results', async ({ page }) => {
  await routeFeatured(page);
  await page.goto('/');

  const section = page.locator('#atletas');
  await expect(section.locator('article')).toHaveCount(2);
  await expect(section.locator('h3')).toHaveText(['Lucía', 'Ana Pérez']);
  await expect(section).toContainText('Acuático Oriente');
  await expect(section).toContainText('CN');
  await expect(section).toContainText('Juvenil A');
  await expect(section).not.toContainText('Carlos Mendoza');
  await expect(section).not.toContainText('Oro');
  await expect(section.getByRole('link', { name: 'Ver todos' })).toHaveAttribute('href', '/atletas');
  await expect(section.locator('article a')).toHaveCount(0);
  await expect(section.getByAltText('Lucía en la piscina')).toHaveAttribute('src', /c_fill,g_face.*\/athletes\/lucia$/);
  await expect(section.getByAltText('Retrato de Ana Pérez')).toHaveAttribute('src', '/asanda.png');
});

test('announces loading and empty featured states', async ({ page }) => {
  let releaseResponse;
  const gate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/featured_athletes*', async (route) => {
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
