import { expect, test } from '@playwright/test';

const publicRoutes = ['/', '/noticias', '/resultados', '/atletas', '/clubes'];
const crawlResources = ['/robots.txt', '/sitemap.xml', '/manifest.webmanifest', '/favicon.svg'];

const expectIndependentResource = async (request, path) => {
  const response = await request.get(path);
  expect(response.status(), path).toBe(200);
  expect(response.headers()['content-type'], path).not.toContain('text/html');
};

test('loads and reloads public routes directly', async ({ page }) => {
  for (const path of publicRoutes) {
    const directResponse = await page.goto(path);
    expect(directResponse?.status(), path).toBe(200);
    expect(directResponse?.headers()['content-type'], path).toContain('text/html');
    await expect(page.locator('#root')).not.toBeEmpty();

    const reloadResponse = await page.reload();
    expect(reloadResponse?.status(), `${path} reload`).toBe(200);
    expect(reloadResponse?.headers()['content-type'], `${path} reload`).toContain('text/html');
    await expect(page.locator('#root')).not.toBeEmpty();
  }
});

test('keeps crawl resources and missing dotted assets outside the SPA document', async ({ request }) => {
  for (const path of crawlResources) await expectIndependentResource(request, path);

  const missingAsset = await request.get('/assets/missing-route-proof.12345678.js');
  expect(missingAsset.status()).toBe(404);
  expect(missingAsset.headers()['content-type'] || '').not.toContain('text/html');
});
