import { expect, test } from '@playwright/test';

const published = {
  id: '50000000-0000-4000-8000-000000000001', slug: 'final-estadal', title: 'Final estadal 200 metros',
  description: 'Registro oficial de la jornada.', duration_seconds: 95, thumbnail_asset_id: '40000000-0000-4000-8000-000000000001',
  published_at: '2026-08-20T10:00:00Z',
  thumbnail: { provider: 'cloudinary', public_id: 'asanda/noticias/final-estadal', external_url: null, resource_type: 'image', alt_text: 'Salida de la final', is_public: true },
};
const draft = { ...published, id: '50000000-0000-4000-8000-000000000002', title: 'Borrador secreto', publication_status: 'draft', published_at: null };

const routeVideos = async (page, { rows = [published], status = 200 } = {}) => {
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({ status: 200, contentType: 'video/mp4', body: 'synthetic-media' }));
  await page.route('**/rest/v1/videos*', (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('publication_status')).toBe('eq.published');
    expect(url.searchParams.get('provider')).toBe('eq.cloudinary');
    route.fulfill({ status, contentType: 'application/json', body: status === 200 ? JSON.stringify(rows.filter((row) => row !== draft)) : JSON.stringify({ message: 'failed' }) });
  });
};

test('shows published real rows, searches them, and keeps draft rows out', async ({ page }) => {
  await routeVideos(page, { rows: [published, draft] });
  await page.goto('/videos');
  await expect(page.getByRole('heading', { level: 1, name: 'Videos' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Reproducir Final estadal/ })).toBeVisible();
  await expect(page.getByText('Borrador secreto')).toHaveCount(0);
  await expect(page.getByText('1:35')).toBeVisible();
  await expect(page.getByText('20 de agosto de 2026')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Buscar videos' }).fill('inexistente');
  await expect(page.getByText('No hay videos que coincidan con la búsqueda.')).toBeVisible();
});

test('requests signed playback only on activation and closes a safe native player', async ({ page }) => {
  await routeVideos(page);
  let playbackRequests = 0;
  await page.route('**/functions/v1/video-media', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toEqual({ action: 'playback', videoId: published.id });
    playbackRequests += 1;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ videoId: published.id, title: published.title, url: 'https://res.cloudinary.com/demo/video/authenticated/s--signed123--/asanda/videos/final.mp4' }) });
  });
  await page.goto('/videos');
  await expect(page.getByRole('button', { name: /Reproducir Final estadal/ })).toBeVisible();
  expect(playbackRequests).toBe(0);
  await page.getByRole('button', { name: /Reproducir Final estadal/ }).click();
  await expect(page.getByRole('dialog', { name: published.title })).toBeVisible();
  await expect(page.locator('video')).toHaveAttribute('controls', '');
  await expect(page.locator('video')).not.toHaveAttribute('autoplay');
  await expect(page.locator('video')).toHaveAttribute('playsinline', '');
  await expect(page.locator('video')).toHaveAttribute('src', /res\.cloudinary\.com/);
  expect(playbackRequests).toBe(1);
  await page.getByRole('button', { name: 'Cerrar reproductor' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('traps focus, restores the launch control, and announces native media errors', async ({ page }) => {
  await routeVideos(page);
  await page.route('**/functions/v1/video-media', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ videoId: published.id, title: published.title, url: 'https://res.cloudinary.com/demo/video/authenticated/s--signed123--/asanda/videos/final.mp4' }) }));
  await page.goto('/videos');
  const launch = page.getByRole('button', { name: /Reproducir Final estadal/ });
  await launch.focus();
  await launch.click();
  const dialog = page.getByRole('dialog', { name: published.title });
  const close = page.getByRole('button', { name: 'Cerrar reproductor' });
  await expect(close).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  await page.locator('video').dispatchEvent('error');
  await expect(dialog.getByRole('alert')).toContainText('No pudimos reproducir este video');
  await close.click();
  await expect(launch).toBeFocused();
});

test('reports empty and retryable error states without synthetic videos', async ({ page }) => {
  await routeVideos(page, { rows: [] });
  await page.goto('/videos');
  await expect(page.getByText('Todavía no hay videos publicados.')).toBeVisible();
  await page.unroute('**/rest/v1/videos*');
  let failing = true;
  await page.route('**/rest/v1/videos*', (route) => {
    route.fulfill({ status: failing ? 500 : 200, contentType: 'application/json', body: failing ? '{}' : '[]' });
  });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los videos');
  failing = false;
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Todavía no hay videos publicados.')).toBeVisible();
});

test('home uses the same recent published library and mobile dark reduced-motion layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
  await routeVideos(page);
  await page.goto('/');
  const section = page.locator('#videos');
  await expect(section.getByRole('heading', { name: 'Videos recientes' })).toBeVisible();
  await expect(section.getByRole('button', { name: /Reproducir Final estadal/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const transitionProperty = await section.getByRole('button', { name: /Reproducir Final estadal/ }).evaluate((element) => getComputedStyle(element).transitionProperty);
  expect(transitionProperty).toBe('none');
});
