import { expect, test } from '@playwright/test';

const emptyCampaignModule = 'export const campaigns = [];';

const contrastRatio = (first, second) => {
  const luminance = ([red, green, blue]) => {
    const channels = [red, green, blue].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  };
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const parseColor = (color) => color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);

test('renders the reserved empty-inventory fallback without creative affordances', async ({ page }) => {
  await page.route(/\/src\/data\/campaigns\.js(?:\?.*)?$/, (route) =>
    route.fulfill({ contentType: 'application/javascript', body: emptyCampaignModule })
  );
  await page.goto('/?ads=demo');

  // 7 slots de la vista previa + 4 celdas del partner grid del Footer (AppShell, PR2b).
  const slots = page.getByRole('complementary', { name: 'Espacio publicitario disponible' });
  await expect(slots).toHaveCount(11);
  for (const slot of await slots.all()) {
    await expect(slot.getByText('Espacio disponible', { exact: true })).toBeVisible();
    await expect(slot.locator('a')).toHaveCount(0);
    await expect(slot.getByText(/Demo|Ejemplo|Publicidad|Contenido patrocinado|Presentado por/)).toHaveCount(0);
    const box = await slot.boundingBox();
    expect(box?.width).toBeGreaterThan(0);
    expect(box?.height).toBeGreaterThanOrEqual(64);
  }
});

test('honors reduced motion at runtime', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?ads=demo');
  // 7 slots de la vista previa + 4 celdas del partner grid del Footer (AppShell, PR2b).
  await expect(page.locator('[role="complementary"]')).toHaveCount(11);
  await expect
    .poll(() => page.locator('[role="complementary"]').evaluateAll((slots) =>
      slots.every((slot) => getComputedStyle(slot).animationName === 'none')
    ))
    .toBe(true);
});

test('activates an ad link with Enter and stays on the internal demo route', async ({ page }) => {
  await page.goto('/?ads=demo');
  const creative = page.locator('[role="complementary"] a').first();
  await creative.focus();
  await expect(creative).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/publicidad\/demo\/[a-z0-9-]+$/);
});

test('uses the real dark-mode control and keeps disclosure text at WCAG AA contrast', async ({ page }) => {
  await page.goto('/?ads=demo');
  await page.getByRole('button', { name: 'Activar modo oscuro' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);

  const colors = await page.locator('[role="complementary"]').first().locator('span').evaluateAll((spans) =>
    spans.filter((span) => span.className.includes('text-[10px]')).map((span) => {
      let background = span;
      while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') background = background.parentElement;
      return { foreground: getComputedStyle(span).color, background: getComputedStyle(background).backgroundColor };
    })
  );
  expect(colors).toHaveLength(2);
  for (const color of colors) expect(contrastRatio(parseColor(color.foreground), parseColor(color.background))).toBeGreaterThanOrEqual(4.5);
});

test('presents footer sponsors as a contained horizontal strip on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('heading', { name: 'Patrocinadores globales' })).toBeVisible();
  const sponsors = footer.getByLabel('Patrocinadores demo');
  await expect(sponsors.getByRole('complementary')).toHaveCount(4);
  await expect(sponsors.getByText(/Publicidad|Presentado por|Contenido patrocinado|Demo/)).toHaveCount(0);
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});
