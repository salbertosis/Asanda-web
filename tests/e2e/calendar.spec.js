import { expect, test } from '@playwright/test';

test('renders the official competition agenda with organizer identities', async ({ page }) => {
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
  await expect(page.getByLabel('Resumen del calendario')).toContainText('5');
  await expect(page.getByRole('heading', { name: 'Campeonato Estadal de Natación' })).toBeVisible();
  await expect(page.getByAltText('Logo de ASANDA').first()).toHaveAttribute('src', '/asanda.png');
  await expect(page.getByAltText('Logo de FEVEDA')).toHaveAttribute('src', /c_pad,b_transparent.*\/feveda_logo$/);
  await expect(page.getByText('Organización por confirmar', { exact: true }).first()).toBeVisible();
  await expect(page.locator('img[src*="unsplash.com"]')).toHaveCount(0);
});

test('filters competitions by explicit month and discipline', async ({ page }) => {
  await page.goto('/calendario');

  await page.getByLabel('Mes').selectOption('Enero');
  await page.getByRole('button', { name: 'Water Polo', exact: true }).click();

  await expect(page.getByRole('heading', { name: 'Torneo Regional de Water Polo' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Campeonato Estadal de Natación' })).toHaveCount(0);
  await expect(page.getByLabel('Resumen del calendario')).toContainText('1');
});

test('changes year and resets all calendar filters', async ({ page }) => {
  await page.goto('/calendario');

  await page.getByRole('button', { name: 'Ver calendario 2025' }).click();
  await expect(page.getByRole('heading', { name: 'Competiciones 2025' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Torneo de Water Polo Juvenil' })).toBeVisible();

  await page.getByLabel('Mes').selectOption('Abril');
  await page.getByRole('button', { name: 'Reiniciar' }).click();
  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
  await expect(page.getByLabel('Mes')).toHaveValue('Todos');
});

test('keeps the enterprise calendar within a mobile viewport in dark mode', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/calendario');

  await expect(page.getByRole('heading', { name: 'Competiciones 2026' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Campeonato Estadal de Natación' })).toBeVisible();
  const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(pageWidth).toBeLessThanOrEqual(390);
});

test('opens a competition detail from the calendar', async ({ page }) => {
  await page.goto('/calendario');

  const competition = page.getByRole('article').filter({ hasText: 'Campeonato Estadal de Natación' });
  await competition.getByRole('link', { name: 'Ver competencia' }).click();

  await expect(page).toHaveURL(/\/calendario\/campeonato-estadal-natacion-2026$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Campeonato Estadal de Natación' })).toBeVisible();
  await expect(page.getByText('15 al 17 de Enero de 2026')).toBeVisible();
  await expect(page.getByText('Barcelona, Anzoátegui')).toBeVisible();
  await expect(page.getByLabel('Organización responsable')).toContainText('ASANDA');
});

test('provides a stable fallback for an unknown competition', async ({ page }) => {
  await page.goto('/calendario/competencia-inexistente');

  await expect(page.getByRole('heading', { level: 1, name: 'Competencia no encontrada' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Volver al calendario' })).toHaveAttribute('href', '/calendario');
});
