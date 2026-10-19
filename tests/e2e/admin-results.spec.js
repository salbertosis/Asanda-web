import { expect, test } from '@playwright/test';
import { loadFixture, RECORD_WIDTH } from '../fixtures/hy3/harness.mjs';

const userId = '10000000-0000-4000-8000-000000000001';
const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.x`;
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z' };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

const routeAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(user)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{ id: userId, display_name: 'Editor HY3', role: 'editor', is_active: true }])));
};
const loginResults = async (page) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Resultados' }).click();
};
const chooseFixture = async (page, fixture) => page.getByLabel('Archivo HY3', { exact: true }).setInputFiles({ name: fixture.filename, mimeType: 'application/octet-stream', buffer: fixture.bytes });

const snapshotDirectoryRow = (summary) => ({
  import_id: summary.import_id, competition_name: summary.competition_name, starts_on: '2096-02-28', ends_on: '2096-02-29',
  pool_length_metres: 50, venue: 'SYNTHETIC AQUATIC CENTRE', event_count: summary.event_count, result_count: summary.result_count,
});
const snapshotResultRows = (payload, importId) => payload.results.map((result) => {
  const event = payload.events.find(({ alias }) => alias === result.eventAlias);
  return {
    import_id: importId, competition_name: payload.competition.name, starts_on: payload.competition.startsOn, ends_on: payload.competition.endsOn,
    pool_length_metres: payload.competition.poolLengthMetres, venue: payload.competition.venue,
    event_alias: event.alias, event_label: event.label, distance_metres: event.distanceMetres, stroke: event.stroke,
    competitive_sex: event.sex, round: event.round, category: event.category,
    result_alias: result.alias, result_type: result.resultType, participant_name: result.participantName ?? null,
    team_name: result.teamName ?? null, club_name: result.clubName ?? null, relay_members: result.relayMembers ?? [],
    place: result.place, time_ms: result.timeMs, lane: result.lane, status: result.status,
  };
});

test('imports and publishes a complete HY3 snapshot without profile-centric queries or raw fields', async ({ page }) => {
  const fixture = await loadFixture('synthetic-snapshot-mm5.hy3');
  let imported = null; let importPayload = null; const forbidden = [];
  await routeAuth(page);
  for (const endpoint of ['competitions', 'competition_events', 'athletes', 'organizations', 'source_mappings']) {
    await page.route(`**/rest/v1/${endpoint}**`, (route) => { forbidden.push(route.request().url()); return route.fulfill(json({ message: 'unexpected query' }, 500)); });
  }
  await page.route('**/rest/v1/rpc/import_competition_result_snapshot', (route) => {
    importPayload = route.request().postDataJSON();
    imported = { import_id: '90000000-0000-4000-8000-000000000001', competition_name: importPayload.requested_payload.competition.name, event_count: importPayload.requested_payload.events.length, result_count: importPayload.requested_payload.results.length };
    return route.fulfill(json([imported]));
  });
  await page.route('**/rest/v1/rpc/get_public_competition_result_rows', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/rpc/get_public_imported_competitions', (route) => route.fulfill(json(imported ? [snapshotDirectoryRow(imported)] : [])));
  await page.route('**/rest/v1/rpc/get_public_imported_competition_results', (route) => route.fulfill(json(imported ? snapshotResultRows(importPayload.requested_payload, imported.import_id) : [])));

  await loginResults(page);
  await chooseFixture(page, fixture);
  const publish = page.getByRole('button', { name: 'Importar y publicar' });
  await expect(publish).toBeVisible();
  await expect(page.getByRole('heading', { name: 'SYNTHETIC CHAMPIONSHIP' })).toBeVisible();
  await expect(page.getByText('SYNTHETIC AQUATIC CENTRE')).toBeVisible();
  await expect(page.getByText('2 resultados (1 individual y 1 relevo)')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Resultados deportivos detectados' })).toContainText('ALPHA SWIMMER');
  await expect(page.getByRole('table', { name: 'Resultados deportivos detectados' })).toContainText('SYNTHETIC SNAPSHOT CLUB');
  await expect(page.getByText(/PRIVATE_TEST|identity|birth|phone|email/i)).toHaveCount(0);
  expect(imported).toBeNull();

  await publish.click();
  await expect(page.getByRole('status')).toContainText('SYNTHETIC CHAMPIONSHIP');
  await expect(page.getByRole('status')).toContainText('2 resultados');
  expect(forbidden).toEqual([]);
  expect(Object.keys(importPayload)).toEqual(['requested_payload', 'requested_source_checksum']);
  expect(Object.keys(importPayload.requested_payload)).toEqual(['competition', 'events', 'results']);
  expect(importPayload.requested_source_checksum).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(importPayload)).not.toMatch(/raw|bytes|national|birth|contact|note|PRIVATE_TEST/i);

  await page.getByRole('link', { name: 'Ver resultados públicos' }).click();
  const competition = page.getByRole('button', { name: /SYNTHETIC CHAMPIONSHIP/ });
  await competition.click();
  const individualEvent = page.getByRole('button', { name: /^50.*freestyle.*15-16.*Femenino/i });
  await individualEvent.click();
  const individualPanel = individualEvent.locator('..');
  await individualPanel.getByRole('button', { name: 'Final', exact: true }).click();
  await expect(individualPanel.getByRole('table')).toContainText('ALPHA SWIMMER');
  await expect(individualPanel.getByRole('table')).toContainText('SYNTHETIC SNAPSHOT CLUB');
  const relayEvent = page.getByRole('button', { name: /^4 x 50.*medley.*15-16.*Femenino/i });
  await relayEvent.click();
  const relayPanel = relayEvent.locator('..');
  await relayPanel.getByRole('button', { name: 'Final', exact: true }).click();
  await expect(relayPanel.getByRole('table')).toContainText('SYNTHETIC SNAPSHOT CLUB');
  await expect(relayPanel.getByRole('table')).toContainText('2:05.67');
});

test('rebuilds validation from explicit basic metadata edits and supports the modern fixture', async ({ page }) => {
  const fixture = await loadFixture('synthetic-supported.hy3'); let payload;
  await routeAuth(page);
  await page.route('**/rest/v1/rpc/import_competition_result_snapshot', (route) => { payload = route.request().postDataJSON(); return route.fulfill(json([{ import_id: 'import-modern', competition_name: payload.requested_payload.competition.name, event_count: 2, result_count: 3 }])); });
  await loginResults(page); await chooseFixture(page, fixture);
  await expect(page.getByRole('button', { name: 'Importar y publicar' })).toBeEnabled();
  await page.getByLabel('Nombre de la competencia').fill('Copa moderna corregida');
  await page.getByLabel('Fecha de inicio').fill('2099-07-16');
  await expect(page.getByRole('button', { name: 'Importar y publicar' })).toBeDisabled();
  await expect(page.getByText(/fecha final.*anterior/i)).toBeVisible();
  await page.getByLabel('Fecha de finalización').fill('2099-07-17');
  await page.getByLabel('Sede').fill('Piscina corregida');
  await page.getByLabel('Longitud de piscina').selectOption('LCM');
  await page.getByRole('button', { name: 'Importar y publicar' }).click();
  expect(payload.requested_payload.competition).toEqual({ name: 'Copa moderna corregida', startsOn: '2099-07-16', endsOn: '2099-07-17', poolLengthMetres: 50, venue: 'Piscina corregida' });
  expect(payload.requested_payload.results).toHaveLength(3);
});

test('keeps confirmation visible but disabled for pending, malformed, provisional and yard inputs', async ({ page }) => {
  const malformed = await loadFixture('synthetic-malformed-record.hy3');
  const supported = await loadFixture('synthetic-supported.hy3');
  const provisional = Buffer.from(supported.bytes); const resultOffset = [...Array(provisional.length / (RECORD_WIDTH + 1)).keys()].map((index) => index * (RECORD_WIDTH + 1)).find((offset) => provisional[offset] === 0x46); provisional.write('provisional     ', resultOffset + 41, 16, 'ascii');
  const yards = Buffer.from(supported.bytes); yards.write('SCY     ', 91, 8, 'ascii');
  await routeAuth(page); await loginResults(page);

  const assertBlocked = async (name, bytes, message) => {
    await chooseFixture(page, { filename: name, bytes });
    const publish = page.getByRole('button', { name: 'Importar y publicar' });
    await expect(publish).toBeVisible(); await expect(publish).toBeDisabled();
    await expect(page.getByRole('region', { name: 'Importá y publicá' }).getByText(message, { exact: false })).toBeVisible();
  };
  await assertBlocked(malformed.filename, malformed.bytes, 'formato HY3');
  await assertBlocked('provisional.hy3', provisional, 'provisionales');
  await assertBlocked('yards.hy3', yards, 'yardas');
});

test('shows duplicate rejection without fake success or changing public counters', async ({ page }) => {
  const fixture = await loadFixture('synthetic-snapshot-mm5.hy3'); let calls = 0;
  await routeAuth(page);
  await page.route('**/rest/v1/rpc/import_competition_result_snapshot', (route) => { calls += 1; return route.fulfill(json({ code: '23505', message: 'duplicate key value violates unique constraint' }, 409)); });
  await loginResults(page); await chooseFixture(page, fixture); await page.getByRole('button', { name: 'Importar y publicar' }).click();
  await expect(page.getByRole('alert')).toContainText('ya fue importada');
  await expect(page.getByText(/publicada correctamente/i)).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ver resultados públicos' })).toHaveCount(0);
  expect(calls).toBe(1);
});
