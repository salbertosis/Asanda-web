import { expect, test } from '@playwright/test';

const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const row = (overrides = {}) => ({
  result_id: '10000000-0000-4000-8000-000000000001', competition_id: '20000000-0000-4000-8000-000000000001', competition_name: 'Estadal ASANDA',
  competition_starts_on: '2026-08-14', competition_ends_on: '2026-08-16', competition_event_id: '30000000-0000-4000-8000-000000000001',
  event_definition_id: '40000000-0000-4000-8000-000000000001', event_definition_code: '50_free', event_name: '50 m libre',
  event_category_id: '50000000-0000-4000-8000-000000000001', event_category_name: 'Juvenil', competitive_sex: 'female', round: 'final',
  sequence_number: 2, scheduled_at: '2026-08-16T14:00:00Z', athlete_id: '60000000-0000-4000-8000-000000000001', athlete_name: 'Ana Prueba',
  club_id: '70000000-0000-4000-8000-000000000001', club_name: 'Club Uno', lane: 4, time_ms: 30125, place: 1, status: 'official',
  ...overrides,
});
const rows = [
  row(),
  row({ result_id: '10000000-0000-4000-8000-000000000002', athlete_id: '60000000-0000-4000-8000-000000000002', athlete_name: 'Bea DQ', status: 'disqualified', time_ms: null, place: null, lane: null }),
  row({ result_id: '10000000-0000-4000-8000-000000000003', athlete_id: '60000000-0000-4000-8000-000000000003', athlete_name: 'Carla DNS', status: 'did_not_start', time_ms: null, place: null }),
  row({ result_id: '10000000-0000-4000-8000-000000000004', athlete_id: '60000000-0000-4000-8000-000000000004', athlete_name: 'Diana DNF', status: 'did_not_finish', time_ms: null, place: null }),
  row({ result_id: '10000000-0000-4000-8000-000000000005', athlete_id: '60000000-0000-4000-8000-000000000005', athlete_name: 'Oculta provisional', status: 'provisional' }),
  row({ result_id: '10000000-0000-4000-8000-000000000006', athlete_id: '60000000-0000-4000-8000-000000000006', athlete_name: 'Oculta desconocida', status: 'unknown' }),
  row({
    result_id: '10000000-0000-4000-8000-000000000007', competition_id: '20000000-0000-4000-8000-000000000002', competition_name: 'Copa ASANDA Enero',
    competition_starts_on: '2025-01-10', competition_ends_on: null, competition_event_id: '30000000-0000-4000-8000-000000000002',
    event_category_id: '50000000-0000-4000-8000-000000000002', event_category_name: 'Infantil', competitive_sex: 'male', round: 'heats',
    athlete_id: '60000000-0000-4000-8000-000000000007', athlete_name: 'Ernesto Prueba', lane: null, time_ms: 32000, place: 2,
  }),
];

const routeResults = (page, handler) => page.route('**/rest/v1/rpc/get_public_competition_result_rows', handler);

test('loads stored results and navigates competition, event and phase without exposing rejected rows', async ({ page }) => {
  let request;
  await routeResults(page, (route) => { request = route.request(); return route.fulfill(json(rows)); });
  await page.goto('/resultados');
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados ASANDA' })).toBeVisible();
  expect(request.method()).toBe('POST');
  expect(request.postDataJSON()).toEqual({ requested_competition_id: null });
  const competition = page.getByRole('button', { name: /Estadal ASANDA/ });
  await competition.click();
  const event = page.getByRole('button', { name: /50 m libre.*Juvenil.*Femenino/ });
  await event.click();
  const phase = page.getByRole('button', { name: /Final/ });
  await phase.click();
  const table = page.getByRole('table', { name: /50 m libre.*Final/ });
  await expect(table.getByRole('columnheader')).toHaveText(['Posición', 'Carril', 'Nombre', 'Club', 'Marca / estado']);
  await expect(table).toContainText('Ana Prueba'); await expect(table).toContainText('30.12');
  await expect(table).toContainText('Bea DQ'); await expect(table).toContainText('DQ');
  await expect(table).toContainText('Carla DNS'); await expect(table).toContainText('DNS');
  await expect(table).toContainText('Diana DNF'); await expect(table).toContainText('DNF');
  await expect(page.getByText(/Oculta provisional|Oculta desconocida/)).toHaveCount(0);
  await expect(page.getByText(/WORLD AQUATICS/i)).toHaveCount(0);
  await expect(page.getByRole('complementary', { name: /Publicidad|Espacio publicitario/i }).first()).toBeVisible();
});

test('derives year and month filters from stored dates and reports a filtered empty state', async ({ page }) => {
  await routeResults(page, (route) => route.fulfill(json(rows))); await page.goto('/resultados');
  await expect(page.getByLabel('Año').getByRole('option')).toHaveText(['Todos', '2026', '2025']);
  await page.getByLabel('Año').selectOption('2025');
  await expect(page.getByRole('button', { name: /Copa ASANDA Enero/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Estadal ASANDA/ })).toHaveCount(0);
  await page.getByLabel('Mes').selectOption('8');
  await expect(page.getByRole('status')).toContainText('No hay resultados para los filtros seleccionados.');
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  await expect(page.getByRole('button', { name: /Estadal ASANDA/ })).toBeVisible();
});

test('shows loading, safe RPC error and retry instead of demo data', async ({ page }) => {
  let calls = 0; let failing = true; let release; const gate = new Promise((resolve) => { release = resolve; });
  await routeResults(page, async (route) => {
    calls += 1;
    if (failing) { await gate; return route.fulfill(json({ message: 'function missing private detail' }, 404)); }
    return route.fulfill(json(rows));
  });
  const requestStarted = page.waitForRequest('**/rest/v1/rpc/get_public_competition_result_rows');
  await page.goto('/resultados'); await requestStarted; await expect(page.getByRole('status')).toContainText('Cargando resultados públicos');
  failing = false; release();
  const alert = page.getByRole('alert'); await expect(alert).toContainText('No pudimos cargar los resultados públicos.'); await expect(alert).not.toContainText('private detail');
  await alert.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByRole('button', { name: /Estadal ASANDA/ })).toBeVisible(); expect(calls).toBeGreaterThanOrEqual(2);
});

test('keeps keyboard disclosure semantics, dark mode and mobile table containment', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: 'reduce' });
  await routeResults(page, (route) => route.fulfill(json(rows))); await page.goto('/resultados'); await page.locator('html').evaluate((html) => html.classList.add('dark'));
  const competition = page.getByRole('button', { name: /Estadal ASANDA/ }); await competition.focus(); await expect(competition).toBeFocused(); await competition.press('Enter');
  const event = page.getByRole('button', { name: /50 m libre.*Juvenil.*Femenino/ }); await event.press('Enter');
  const phase = page.getByRole('button', { name: /Final/ }); await phase.press('Enter');
  await expect(competition).toHaveAttribute('aria-expanded', 'true'); await expect(event).toHaveAttribute('aria-expanded', 'true'); await expect(phase).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('table', { name: /50 m libre.*Final/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('#resultados-page')).toHaveCSS('background-color', 'rgb(2, 6, 23)');
});
