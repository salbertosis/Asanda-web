import { expect, test } from '@playwright/test';

const statsResponse = {
  clubs: 7,
  associatedAthletes: 42,
  federatedAthletes: 18,
  preinfantAthletes: 9,
  asOf: '2026-08-12',
};

const routeStats = (page, response = statsResponse, status = 200) => page.route('**/rest/v1/rpc/get_homepage_stats', (route) => (
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(response) })
));

test('renders live homepage statistics from the aggregate endpoint', async ({ page }) => {
  await routeStats(page);
  await page.goto('/');

  const stats = page.getByLabel('Estadísticas principales');
  await expect(stats).toContainText('9');
  await expect(stats).toContainText('42');
  await expect(stats).toContainText('18');
  await expect(stats).toContainText('7');
  await expect(stats).toContainText('Fuente: registro ASANDA');
  await expect(stats).not.toContainText('32.625.806');
  await expect(stats).not.toContainText('Gustavo Idrogo');
});

test('keeps four reserved cards while homepage statistics load', async ({ page }) => {
  let releaseResponse;
  const responseGate = new Promise((resolve) => { releaseResponse = resolve; });
  await page.route('**/rest/v1/rpc/get_homepage_stats', async (route) => {
    await responseGate;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsResponse) });
  });

  await page.goto('/');
  const stats = page.getByLabel('Estadísticas principales');
  await expect(stats.getByRole('link')).toHaveCount(4);
  await expect(stats).toHaveAttribute('aria-busy', 'true');
  await expect(stats.getByRole('status')).toContainText('Cargando estadísticas');
  releaseResponse();
  await expect(stats).toHaveAttribute('aria-busy', 'false');
});

test('shows unavailable placeholders instead of false zeroes on stats failure', async ({ page }) => {
  await routeStats(page, { message: 'Unavailable' }, 500);
  await page.goto('/');

  const stats = page.getByLabel('Estadísticas principales');
  await expect(stats.getByRole('status')).toContainText('Estadísticas no disponibles');
  await expect(stats.getByText('—')).toHaveCount(4);
});

test('keeps the redesigned homepage within a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await routeStats(page);
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByLabel('Estadísticas principales')).toBeVisible();
  const layout = await page.evaluate(() => {
    const title = document.querySelector('#home-title').getBoundingClientRect();
    return {
      pageWidth: document.documentElement.scrollWidth,
      titleLeft: title.left,
      titleRight: title.right,
    };
  });
  expect(layout.pageWidth).toBeLessThanOrEqual(320);
  expect(layout.titleLeft).toBeGreaterThanOrEqual(0);
  expect(layout.titleRight).toBeLessThanOrEqual(320);
});

test('keeps the desktop title clear of the sponsor slot', async ({ page }) => {
  await page.setViewportSize({ width: 1800, height: 900 });
  await routeStats(page);
  await page.goto('/');

  const title = page.getByRole('heading', { level: 1 });
  const sponsor = page.locator('section[aria-labelledby="home-title"]').getByRole('complementary');
  await expect(title).toBeVisible();
  await expect(sponsor).toBeVisible();

  const titleBox = await title.boundingBox();
  const sponsorBox = await sponsor.boundingBox();
  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(sponsorBox.x);
});

test('does not request homepage stats in isolated advertising preview', async ({ page }) => {
  let calls = 0;
  await page.route('**/rest/v1/rpc/get_homepage_stats', (route) => {
    calls += 1;
    return route.abort();
  });
  await page.goto('/?ads=demo');
  await expect(page.getByRole('heading', { name: 'Vista previa de publicidad demo' })).toBeVisible();
  expect(calls).toBe(0);
});
