import { expect, test } from '@playwright/test';

// Cobertura RED de PR2b (tareas 2.3–2.5): un único main/H1 por vista, enlace
// de salto operable por teclado, objetivos de footer de 44px, integridad de
// enlaces legales y disclosure/noindex accesible del shell demo.
const shellRoutes = ['/', '/noticias', '/videos', '/fotos', '/fotos/album/1', '/calendario', '/resultados', '/atletas', '/atletas-asociados', '/atletas-federados', '/clubes', '/record-estadal', '/legal', '/privacidad', '/publicidad/demo/aquaflow-demo', '/?ads=demo'];

const approvedFixture = {
  canonicalOrigin: 'https://asanda.org.ve', canonicalOriginApproved: true,
  identity: { value: 'ASANDA', approved: true }, copyright: { notice: 'ASANDA 2026', approved: true },
  social: [{ label: 'Instagram', href: 'https://instagram.com/asanda', approved: true }],
  legal: { legalApproved: true, privacyApproved: true }, criticalAssets: ['/asanda.png', '/favicon.svg'],
};

const injectApprovedPublicSite = (page) => page.route('**/src/config/publicSite.js', async (route) => {
  const response = await route.fetch();
  const source = await response.text();
  const injected = source.replace(/const publicSite = \{[\s\S]*?\n\};/, `const publicSite = ${JSON.stringify(approvedFixture)};`);
  expect(injected).not.toBe(source);
  await route.fulfill({ response, body: injected });
});

test('renders exactly one main landmark and one level-one heading per view', async ({ page }) => {
  for (const path of shellRoutes) {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('main'), path).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
  }
});

test('skip link is the first tab stop and moves keyboard focus to main content', async ({ page }) => {
  for (const path of ['/', '/resultados', '/legal']) {
    await page.goto(path);
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' });
    await expect(skipLink, path).toBeFocused();
    await expect(skipLink, path).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content'), path).toBeFocused();
  }
});

test('exposes footer link targets of at least 44 by 44 pixels', async ({ page }) => {
  await page.goto('/');
  for (const link of await page.getByRole('contentinfo').getByRole('link').all()) {
    const box = await link.boundingBox();
    const label = (await link.textContent())?.trim() || 'footer link';
    expect(box?.height ?? 0, label).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0, label).toBeGreaterThanOrEqual(44);
  }
});

test('keeps approved legal links navigating to coherent legal routes', async ({ page }) => {
  await injectApprovedPublicSite(page);
  await page.goto('/');
  for (const [name, path] of [['Legal', '/legal'], ['Privacidad', '/privacidad']]) {
    await page.getByRole('contentinfo').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole('main'), path).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 }), path).toHaveCount(1);
    await page.goto('/');
  }
});

test('discloses demo status accessibly and scopes noindex to the demo route', async ({ page }) => {
  await page.goto('/publicidad/demo/aquaflow-demo');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  const main = page.getByRole('main');
  await expect(main.getByText('Demo', { exact: true })).toBeVisible();
  await expect(main.getByText(/es una marca ficticia/)).toBeVisible();
  await main.getByRole('link', { name: 'Volver al inicio' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('preserves the mobile menu after the shell migration', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Abrir menú principal' }).click();
  await page.getByRole('navigation', { name: 'Navegación móvil' }).getByRole('link', { name: 'Resultados' }).click();
  await expect(page).toHaveURL(/\/resultados$/);
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
});
