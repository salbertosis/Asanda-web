import { expect, test } from '@playwright/test';

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const categories = [
  { code: 'infant-a', name: 'Infantil A', sort_order: 10 },
  { code: 'infant-b', name: 'Infantil B', sort_order: 20 },
  { code: 'youth-a', name: 'Juvenil A', sort_order: 30 },
  { code: 'youth-b', name: 'Juvenil B', sort_order: 40 },
  { code: 'maximum', name: 'Máxima / Abierta (Open)', sort_order: 50 },
];
const tabLabels = ['Infantil A', 'Infantil B', 'Juvenil A', 'Juvenil B', 'Máxima'];
const row = (overrides = {}) => ({ record_id: 'record-female', athlete_id: null, athlete_name: 'Lucía Pérez', athlete_photo_public_id: 'asanda/records/lucia', athlete_photo_alt: 'Lucía Pérez antes de competir', club_name: 'Club Delfines', event_name: '50 m libre', category_name: 'Infantil A', competitive_sex: 'female', time_ms: 58429, achieved_year: 2024, competition_name: 'Copa Anzoátegui', course: 'long_course', ...overrides });
const records = [
  row(),
  row({ record_id: 'record-male', athlete_name: 'Mateo Silva', athlete_photo_public_id: null, athlete_photo_alt: null, club_name: 'Club Náutico', event_name: '100 m libre', competitive_sex: 'male', time_ms: 62359, achieved_year: 2023, competition_name: 'Estadal 2023' }),
  row({ record_id: 'record-open', athlete_name: 'Dato Open Privado', competitive_sex: 'open' }),
  row({ record_id: null, athlete_name: 'Fila Malformada' }),
];
const routeRecords = (page, body = records, status = 200, inspect) => page.route('**/rest/v1/rpc/get_published_state_records', (route) => { inspect?.(route.request()); return route.fulfill(json(body, status)); });
const routeCategories = (page, body = categories, status = 200, inspect) => page.route('**/rest/v1/age_categories*', (route) => { inspect?.(route.request()); return route.fulfill(json(body, status)); });
const routePageData = async (page, recordRows = records, categoryRows = categories) => { await routeRecords(page, recordRows); await routeCategories(page, categoryRows); };

test('queries the approved catalog and renders exactly five desktop record tabs', async ({ page }) => {
  let categoryRequest;
  await page.setViewportSize({ width: 1280, height: 900 });
  await routeRecords(page); await routeCategories(page, categories, 200, (request) => { categoryRequest = request; });
  await page.goto('/record-estadal');
  await expect(page.getByRole('tab')).toHaveText(tabLabels);
  await expect(page.getByRole('tab', { name: 'Infantil A' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tab', { name: /Pre Infantil/ })).toHaveCount(0);
  const url = new URL(categoryRequest.url());
  expect(categoryRequest.method()).toBe('GET');
  expect(url.pathname).toBe('/rest/v1/age_categories');
  expect(url.searchParams.get('select')).toBe('code,name,sort_order');
  expect(url.searchParams.get('is_active')).toBe('eq.true');
  expect(url.searchParams.get('code')).toBe('in.(infant-a,infant-b,youth-a,youth-b,maximum)');
  expect(url.searchParams.get('order')).toBe('sort_order.asc');
  const panel = page.getByRole('tabpanel', { name: 'Infantil A' });
  await expect(panel.getByRole('table', { name: 'Femenino' })).toBeVisible();
  await expect(panel.getByRole('table', { name: 'Masculino' })).toBeVisible();
  await expect(panel.getByRole('table', { name: 'Femenino' }).getByRole('columnheader')).toHaveText(['Prueba', 'Récord', 'Atleta / Club', 'Año', 'Competencia']);
  await expect(panel.getByRole('table', { name: 'Femenino' }).getByAltText('Lucía Pérez antes de competir')).toHaveAttribute('src', /w_160,h_160,c_fill,g_face,q_auto,f_auto\/asanda\/records\/lucia/);
  await expect(panel).toContainText('Lucía Pérez'); await expect(panel).toContainText('Mateo Silva'); await expect(panel).toContainText('58.42'); await expect(panel).toContainText('1:02.35');
  await expect(page.getByText('Dato Open Privado')).toHaveCount(0); await expect(page.getByText('Fila Malformada')).toHaveCount(0); await expect(page.getByText(/long_course/i)).toHaveCount(0);
  expect(await page.evaluate(() => [...document.querySelectorAll('[id]')].map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index))).toEqual([]);
});

for (const [description, recordRows] of [['one record', [row()]], ['zero records', []]]) {
  test(`keeps all catalog tabs visible with ${description}`, async ({ page }) => {
    await routePageData(page, recordRows); await page.goto('/record-estadal');
    await expect(page.getByRole('tab')).toHaveText(tabLabels);
    await page.getByRole('tab', { name: 'Juvenil B' }).click();
    const panel = page.getByRole('tabpanel', { name: 'Juvenil B' });
    await expect(panel).toContainText('No hay récords publicados en femenino para esta categoría.');
    await expect(panel).toContainText('No hay récords publicados en masculino para esta categoría.');
    if (!recordRows.length) await expect(page.getByRole('status')).toContainText('Todavía no hay récords estadales publicados.');
  });
}

test('matches maximum by its stored name while showing the concise label', async ({ page }) => {
  await routePageData(page, [row({ record_id: 'record-maximum', athlete_name: 'Andrea Máxima', category_name: '  Máxima / Abierta (Open)  ' })]);
  await page.goto('/record-estadal'); await page.getByRole('tab', { name: 'Máxima', exact: true }).click();
  await expect(page.getByRole('tabpanel', { name: 'Máxima', exact: true })).toContainText('Andrea Máxima');
  await expect(page.getByRole('tab', { name: 'Máxima / Abierta (Open)' })).toHaveCount(0);
});

test('uses official event order even when records are unordered', async ({ page }) => {
  await routePageData(page, [
    row({ record_id: 'unknown-z', event_name: 'Z relevo' }), row({ record_id: 'butterfly', event_name: '50 metros mariposa' }),
    row({ record_id: 'unknown-a', event_name: 'A relevo' }), row({ record_id: 'freestyle-1500', event_name: '1500 metros libre' }),
    row({ record_id: 'freestyle-50', event_name: '50 metros libre' }), row({ record_id: 'backstroke', event_name: '50 metros espalda' }),
  ]);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto('/record-estadal');
  const rows = page.getByRole('table', { name: 'Femenino' }).getByRole('row').filter({ has: page.getByRole('rowheader') });
  await expect(rows.getByRole('rowheader')).toHaveText(['50 metros libre', '1500 metros libre', '50 metros espalda', '50 metros mariposa', 'A relevo', 'Z relevo']);
});

test('shows a safe catalog error and retries both requests', async ({ page }) => {
  let catalogCalls = 0; let recordCalls = 0;
  await routeRecords(page, records, 200, () => { recordCalls += 1; });
  await page.route('**/rest/v1/age_categories*', (route) => { catalogCalls += 1; return route.fulfill(json(catalogCalls === 1 ? { message: 'private catalog detail' } : categories, catalogCalls === 1 ? 500 : 200)); });
  await page.goto('/record-estadal');
  const alert = page.getByRole('alert'); await expect(alert).toContainText('No pudimos cargar los récords estadales.'); await expect(alert).not.toContainText('private catalog detail');
  await alert.getByRole('button', { name: 'Reintentar' }).click(); await expect(page.getByRole('tab')).toHaveText(tabLabels);
  expect(catalogCalls).toBe(2); expect(recordCalls).toBe(2);
});

test('fails closed when the catalog is incomplete', async ({ page }) => {
  await routePageData(page, records, categories.slice(0, 4)); await page.goto('/record-estadal');
  await expect(page.getByRole('alert')).toContainText('No pudimos cargar los récords estadales.');
  await expect(page.getByRole('tab')).toHaveCount(0);
});

test('keeps loading visible until both public requests finish', async ({ page }) => {
  let release; const gate = new Promise((resolve) => { release = resolve; });
  await routeRecords(page); await page.route('**/rest/v1/age_categories*', async (route) => { await gate; await route.fulfill(json(categories)); });
  await page.goto('/record-estadal'); await expect(page.getByRole('status')).toContainText('Cargando récords estadales');
  release(); await expect(page.getByRole('tab')).toHaveText(tabLabels);
});

test('preserves keyboard tabs, dark mode and mobile record cards', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' }); await routePageData(page); await page.goto('/record-estadal'); await page.evaluate(() => document.documentElement.classList.add('dark'));
  const first = page.getByRole('tab', { name: 'Infantil A' }); const last = page.getByRole('tab', { name: 'Máxima' });
  await first.focus(); await first.press('End'); await expect(last).toBeFocused(); await last.press('Home'); await expect(first).toBeFocused();
  await first.press('ArrowRight'); await expect(page.getByRole('tab', { name: 'Infantil B' })).toBeFocused(); await page.getByRole('tab', { name: 'Infantil B' }).press('ArrowLeft'); await expect(first).toBeFocused();
  const panel = page.getByRole('tabpanel', { name: 'Infantil A' }); const card = panel.getByRole('list', { name: 'Femenino' }).getByRole('listitem');
  await expect(card).toBeVisible(); await expect(panel.getByRole('table', { name: 'Femenino' })).toBeHidden(); await expect(card).toContainText('Lucía Pérez'); await expect(card.getByAltText('Lucía Pérez antes de competir')).toBeVisible();
  await expect(panel.getByRole('list', { name: 'Masculino' }).getByRole('img', { name: 'Sin foto de Mateo Silva' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390); await expect(page.locator('#record-estadal')).toHaveCSS('background-color', 'rgb(2, 6, 23)'); await expect(card).toHaveCSS('background-color', 'rgb(15, 23, 42)');
});
