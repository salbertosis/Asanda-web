import { expect, test } from '@playwright/test';

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const row = (overrides = {}) => ({ record_id: 'record-female', athlete_id: null, athlete_name: 'Lucía Pérez', athlete_photo_public_id: 'asanda/records/lucia', athlete_photo_alt: 'Lucía Pérez antes de competir', club_name: 'Club Delfines', event_name: '50 m libre', category_name: 'Absoluto', competitive_sex: 'female', time_ms: 58429, achieved_year: 2024, competition_name: 'Copa Anzoátegui', course: 'long_course', ...overrides });
const records = [
  row(),
  row({ record_id: 'record-male', athlete_name: 'Mateo Silva', athlete_photo_public_id: null, athlete_photo_alt: null, club_name: 'Club Náutico', event_name: '100 m libre', competitive_sex: 'male', time_ms: 62359, achieved_year: 2023, competition_name: 'Estadal 2023' }),
  row({ record_id: 'record-juvenil', athlete_name: 'Sara Díaz', category_name: ' Juvenil ', event_name: '200 m libre', athlete_photo_public_id: null, athlete_photo_alt: null }),
  row({ record_id: 'record-open', athlete_name: 'Dato Open Privado', competitive_sex: 'open' }),
  row({ record_id: 'record-mixed', athlete_name: 'Dato Mixed Privado', competitive_sex: 'mixed' }),
  row({ record_id: null, athlete_name: 'Fila Malformada' }),
];
const routeRecords = (page, body = records, status = 200, inspect) => page.route('**/rest/v1/rpc/get_published_state_records', (route) => { inspect?.(route.request()); return route.fulfill(json(body, status)); });

test('renders the professional desktop record tables from normalized RPC records', async ({ page }) => {
  let request;
  await page.setViewportSize({ width: 1280, height: 900 });
  await routeRecords(page, records, 200, (value) => { request = value; });
  await page.goto('/record-estadal');
  await expect(page.getByRole('tab', { name: 'Absoluto' })).toBeVisible();
  expect(request.method()).toBe('POST');
  expect(new URL(request.url()).pathname).toBe('/rest/v1/rpc/get_published_state_records');
  expect(request.postDataJSON()).toEqual({});
  await expect(page.getByRole('heading', { level: 1, name: 'Récord Estadal' })).toHaveCount(1);
  await expect(page.getByText('Carlos Mendoza')).toHaveCount(0);
  await expect(page.getByText('Dato Open Privado')).toHaveCount(0);
  await expect(page.getByText('Dato Mixed Privado')).toHaveCount(0);
  await expect(page.getByText('Fila Malformada')).toHaveCount(0);
  const panel = page.getByRole('tabpanel', { name: 'Absoluto' });
  await expect(panel.getByRole('heading').nth(0)).toHaveText('Femenino');
  await expect(panel.getByRole('heading').nth(1)).toHaveText('Masculino');
  const femaleTable = panel.getByRole('table', { name: 'Femenino' });
  await expect(femaleTable).toBeVisible();
  await expect(femaleTable.getByRole('columnheader')).toHaveText(['Prueba', 'Récord', 'Atleta / Club', 'Año', 'Competencia']);
  await expect(femaleTable.getByAltText('Lucía Pérez antes de competir')).toBeVisible();
  await expect(panel.getByRole('list', { name: 'Femenino' })).toBeHidden();
  await expect(panel).toContainText('Lucía Pérez'); await expect(panel).toContainText('Club Delfines'); await expect(panel).toContainText('Copa Anzoátegui'); await expect(panel).toContainText('2024'); await expect(panel).toContainText('50 m libre'); await expect(panel).toContainText('58.42');
  await expect(panel).toContainText('Mateo Silva'); await expect(panel).toContainText('1:02.35');
  await expect(femaleTable.getByAltText('Lucía Pérez antes de competir')).toHaveAttribute('src', /w_160,h_160,c_fill,g_face,q_auto,f_auto\/asanda\/records\/lucia/);
  await expect(panel.getByRole('table', { name: 'Masculino' }).getByRole('img', { name: 'Sin foto de Mateo Silva' })).toBeVisible();
  await expect(panel.getByRole('columnheader', { name: /Posición|Categoría|Género/i })).toHaveCount(0);
  await expect(page.getByText(/long_course/i)).toHaveCount(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('[id]')].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index))).toEqual([]);
});

test('uses official event order even when the RPC response is unordered', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await routeRecords(page, [
    row({ record_id: 'unknown-z', event_name: 'Z relevo' }),
    row({ record_id: 'butterfly', event_name: '50 metros mariposa' }),
    row({ record_id: 'unknown-a', event_name: 'A relevo' }),
    row({ record_id: 'freestyle-1500', event_name: '1500 metros libre' }),
    row({ record_id: 'freestyle-50', event_name: '50 metros libre' }),
    row({ record_id: 'backstroke', event_name: '50 metros espalda' }),
  ]);
  await page.goto('/record-estadal');
  const eventRows = page.getByRole('table', { name: 'Femenino' }).getByRole('row').filter({ has: page.getByRole('rowheader') });
  await expect(eventRows.getByRole('rowheader')).toHaveText(['50 metros libre', '1500 metros libre', '50 metros espalda', '50 metros mariposa', 'A relevo', 'Z relevo']);
});

test('keeps a status visible while the RPC is pending', async ({ page }) => {
  let release; const gate = new Promise((resolve) => { release = resolve; });
  await page.route('**/rest/v1/rpc/get_published_state_records', async (route) => { await gate; await route.fulfill(json(records)); });
  await page.goto('/record-estadal');
  await expect(page.getByRole('status')).toContainText('Cargando récords estadales');
  release();
  await expect(page.getByRole('tab', { name: 'Absoluto' })).toBeVisible();
});

test('shows a safe error and retries the RPC', async ({ page }) => {
  let calls = 0;
  await page.route('**/rest/v1/rpc/get_published_state_records', (route) => { calls += 1; return route.fulfill(json(calls === 1 ? { message: 'private backend detail' } : records, calls === 1 ? 500 : 200)); });
  await page.goto('/record-estadal');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('No pudimos cargar los récords estadales.'); await expect(alert).not.toContainText('private backend detail');
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('tab', { name: 'Absoluto' })).toBeVisible(); expect(calls).toBe(2);
});

test('shows a clear global empty state', async ({ page }) => {
  await routeRecords(page, []); await page.goto('/record-estadal');
  await expect(page.getByRole('status')).toContainText('Todavía no hay récords estadales publicados.');
});

test('supports tab keys, partial empties, dark mode and mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await routeRecords(page); await page.goto('/record-estadal'); await page.evaluate(() => document.documentElement.classList.add('dark'));
  const absoluto = page.getByRole('tab', { name: 'Absoluto' }); const juvenil = page.getByRole('tab', { name: 'Juvenil' });
  await expect(absoluto).toHaveAttribute('aria-selected', 'true'); await absoluto.focus(); await absoluto.press('End'); await expect(juvenil).toBeFocused(); await expect(juvenil).toHaveAttribute('aria-selected', 'true');
  const panel = page.getByRole('tabpanel', { name: 'Juvenil' }); await expect(panel).toContainText('Sara Díaz'); await expect(panel).toContainText('No hay récords publicados en masculino para esta categoría.');
  await juvenil.press('Home'); await expect(absoluto).toBeFocused(); await absoluto.press('ArrowRight'); await expect(juvenil).toBeFocused(); await juvenil.press('ArrowLeft'); await expect(absoluto).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('#record-estadal')).toHaveCSS('background-color', 'rgb(2, 6, 23)');
  await expect(page.getByRole('tabpanel', { name: 'Absoluto' }).getByRole('list', { name: 'Femenino' }).getByRole('listitem')).toHaveCSS('background-color', 'rgb(15, 23, 42)');
});

test('renders purpose-built record cards without mobile overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await routeRecords(page); await page.goto('/record-estadal');
  const panel = page.getByRole('tabpanel', { name: 'Absoluto' }); const femaleCards = panel.getByRole('list', { name: 'Femenino' }); const femaleCard = femaleCards.getByRole('listitem');
  await expect(femaleCards).toBeVisible(); await expect(panel.getByRole('table', { name: 'Femenino' })).toBeHidden();
  await expect(femaleCard).toContainText('50 m libre'); await expect(femaleCard).toContainText('58.42'); await expect(femaleCard).toContainText('Lucía Pérez'); await expect(femaleCard).toContainText('Club Delfines'); await expect(femaleCard).toContainText('2024'); await expect(femaleCard).toContainText('Copa Anzoátegui');
  const photo = femaleCard.getByAltText('Lucía Pérez antes de competir'); await expect(photo).toBeVisible(); expect(await photo.evaluate((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))).toEqual({ width: 80, height: 80 });
  const fallback = panel.getByRole('list', { name: 'Masculino' }).getByRole('img', { name: 'Sin foto de Mateo Silva' }); await expect(fallback).toBeVisible(); expect(await fallback.evaluate((node) => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height }))).toEqual({ width: 80, height: 80 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
