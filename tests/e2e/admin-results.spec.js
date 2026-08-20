import { expect, test } from '@playwright/test';
import { loadFixture, RECORD_WIDTH } from '../fixtures/hy3/harness.mjs';

const userId = '10000000-0000-4000-8000-000000000001';
const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.x`;
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z' };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const competition = { id: 'competition-1', name: 'Copa HY3 sintética', revision: 4, status: 'scheduled', starts_on: '2026-09-10', ends_on: '2026-09-12' };
const events = [
  { id: 'event-50', competition_id: competition.id, event_definition_id: 'definition-50', category_id: null, competitive_sex: 'mixed', round: 'final', sequence_number: 1, status: 'scheduled', event_definition: { id: 'definition-50', code: '50-free', name: 'SYNTHETIC 50 FREE', distance_metres: 50, stroke: 'freestyle' } },
  { id: 'event-200', competition_id: competition.id, event_definition_id: 'definition-200', category_id: null, competitive_sex: 'mixed', round: 'final', sequence_number: 2, status: 'scheduled', event_definition: { id: 'definition-200', code: '4x50-free', name: 'SYNTHETIC 4X50 FREE', distance_metres: 200, stroke: 'freestyle' } },
];

const routeAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(user)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{ id: userId, display_name: 'Editor HY3', role: 'editor', is_active: true }])));
};

const resolvedMappings = [
  { id: 'mapping-team', provider: 'hy-tek', source_organization: 'SYNTHETIC MEET ALPHA', external_code: 'TEAM-TST-01', mapping_kind: 'organization', organization_id: 'org-1', athlete_id: null, resolution_status: 'resolved' },
  { id: 'mapping-one', provider: 'hy-tek', source_organization: 'SYNTHETIC MEET ALPHA', external_code: 'ATH-TST-001', mapping_kind: 'athlete', organization_id: null, athlete_id: 'athlete-1', resolution_status: 'resolved' },
  { id: 'mapping-two', provider: 'hy-tek', source_organization: 'SYNTHETIC MEET ALPHA', external_code: 'ATH-TST-002', mapping_kind: 'athlete', organization_id: null, athlete_id: 'athlete-2', resolution_status: 'resolved' },
];

const routeResolvedImportReferences = async (page) => {
  await page.route('**/rest/v1/competitions**', (route) => route.fulfill(json([competition])));
  await page.route('**/rest/v1/competition_events**', (route) => route.fulfill(json(events)));
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json([{ id: 'athlete-1', display_name: 'Atleta E2E uno', publication_status: 'published' }, { id: 'athlete-2', display_name: 'Atleta E2E dos', publication_status: 'published' }])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([{ id: 'org-1', name: 'Club E2E', short_name: 'E2E', organization_type: 'club', publication_status: 'published' }])));
  await page.route('**/rest/v1/source_mappings**', (route) => route.fulfill(json(resolvedMappings)));
};

const loadIndividualFixture = async () => { const fixture = await loadFixture('synthetic-supported.hy3'); return { ...fixture, bytes: fixture.bytes.subarray(0, -(RECORD_WIDTH + 1)) }; };

const openResolvedPreview = async (page, fixture) => {
  await page.goto('/admin/login'); await page.getByLabel('Correo electrónico').fill(user.email); await page.getByLabel('Contraseña').fill('not-a-real-password'); await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Resultados' }).click(); await page.getByLabel('Competencia').selectOption(competition.id); await page.getByLabel('Archivo HY3 o CSV (fallback)').setInputFiles({ name: fixture.filename, mimeType: 'application/octet-stream', buffer: fixture.bytes }); await page.getByRole('button', { name: 'Generar vista previa saneada' }).click();
  await expect(page.getByText('Todas las referencias y resultados están listos para revisión transaccional.')).toBeVisible();
};

test('procesa HY3 local, muestra vista saneada y bloquea identidades sin reconciliar', async ({ page }) => {
  const fixture = await loadFixture('synthetic-supported.hy3'); await routeAuth(page);
  await page.route('**/rest/v1/competitions**', (route) => route.fulfill(json([competition])));
  await page.route('**/rest/v1/competition_events**', (route) => route.fulfill(json(events)));
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json([{ id: 'athlete-1', display_name: 'Atleta E2E uno', publication_status: 'published' }, { id: 'athlete-2', display_name: 'Atleta E2E dos', publication_status: 'published' }])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([{ id: 'org-1', name: 'Club E2E', short_name: 'E2E', organization_type: 'club', publication_status: 'published' }])));
  await page.route('**/rest/v1/source_mappings**', (route) => route.fulfill(json([])));
  await page.goto('/admin/login'); await page.getByLabel('Correo electrónico').fill(user.email); await page.getByLabel('Contraseña').fill('not-a-real-password'); await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Resultados' }).click(); await expect(page.getByRole('heading', { name: 'Importar resultados' })).toBeVisible();
  await page.getByLabel('Competencia').selectOption(competition.id); await page.getByLabel('Archivo HY3 o CSV (fallback)').setInputFiles({ name: 'synthetic-supported.hy3', mimeType: 'application/octet-stream', buffer: fixture.bytes }); await page.getByRole('button', { name: 'Generar vista previa saneada' }).click();
  await expect(page.getByRole('heading', { name: 'Vista previa saneada' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Reconciliación de identidades' })).toBeVisible(); await expect(page.getByRole('alert')).toContainText('bloqueada'); await expect(page.getByText('PRIVATE_TEST_ID_001')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /importar/i })).toHaveCount(0);
});

test('rechaza variantes HY3 incompatibles y mantiene cerrada la importación', async ({ page }) => {
  const unsupported = await loadFixture('synthetic-unsupported-version.hy3');
  const malformed = await loadFixture('synthetic-malformed-record.hy3');
  await routeAuth(page);
  await page.route('**/rest/v1/competitions**', (route) => route.fulfill(json([competition])));
  await page.route('**/rest/v1/competition_events**', (route) => route.fulfill(json(events)));
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/source_mappings**', (route) => route.fulfill(json([])));
  await page.goto('/admin/login'); await page.getByLabel('Correo electrónico').fill(user.email); await page.getByLabel('Contraseña').fill('not-a-real-password'); await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Resultados' }).click(); await page.getByLabel('Competencia').selectOption(competition.id);

  const rejectFile = async (fixture, expectedMessage) => {
    await page.getByLabel('Archivo HY3 o CSV (fallback)').setInputFiles({ name: fixture.filename, mimeType: 'application/octet-stream', buffer: fixture.bytes });
    await page.getByRole('button', { name: 'Generar vista previa saneada' }).click();
    await expect(page.getByRole('alert')).toContainText(expectedMessage);
    await expect(page.getByRole('heading', { name: 'Vista previa saneada' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /importar/i })).toHaveCount(0);
  };

  await rejectFile(unsupported, 'El archivo HY3 usa una versión no compatible');
  await rejectFile(malformed, 'El archivo no respeta el formato HY3 fijo');
});

test('permite corregir manualmente mapeos y conserva resultados sin tiempo ni media', async ({ page }) => {
  const fixture = await loadFixture('synthetic-supported.hy3');
  let mappings = [];
  await routeAuth(page);
  await page.route('**/rest/v1/competitions**', (route) => route.fulfill(json([competition])));
  await page.route('**/rest/v1/competition_events**', (route) => route.fulfill(json(events)));
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json([{ id: 'athlete-1', display_name: 'Atleta E2E uno', publication_status: 'published' }, { id: 'athlete-2', display_name: 'Atleta E2E dos', publication_status: 'published' }])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([{ id: 'org-1', name: 'Club E2E', short_name: 'E2E', organization_type: 'club', publication_status: 'published' }])));
  await page.route('**/rest/v1/source_mappings**', async (route) => {
    const request = route.request();
    if (request.method() === 'GET') return route.fulfill(json(mappings));
    const payload = request.postDataJSON();
    const saved = { ...payload, id: `mapping-${mappings.length + 1}`, resolution_status: 'resolved' };
    mappings = [...mappings.filter((item) => !(item.provider === saved.provider && item.source_organization === saved.source_organization && item.external_code === saved.external_code)), saved];
    return route.fulfill(json(saved));
  });
  await page.goto('/admin/login'); await page.getByLabel('Correo electrónico').fill(user.email); await page.getByLabel('Contraseña').fill('not-a-real-password'); await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Resultados' }).click(); await page.getByLabel('Competencia').selectOption(competition.id); await page.getByLabel('Archivo HY3 o CSV (fallback)').setInputFiles({ name: fixture.filename, mimeType: 'application/octet-stream', buffer: fixture.bytes }); await page.getByRole('button', { name: 'Generar vista previa saneada' }).click();
  await expect(page.getByRole('heading', { name: 'Vista previa saneada' })).toBeVisible(); await expect(page.getByRole('alert')).toContainText('bloqueada');

  for (const [alias, targetId] of [['TEAM-TST-01', 'org-1'], ['ATH-TST-001', 'athlete-1'], ['ATH-TST-002', 'athlete-2']]) {
    await page.getByLabel(`Resolver ${alias}`).selectOption(targetId);
    await expect(page.getByText('Identidad guardada. La vista previa fue recalculada.')).toBeVisible();
  }

  await expect(page.getByRole('alert')).toContainText('La persistencia de relevos aún no está disponible');
  await expect(page.getByText('Relevos', { exact: true }).locator('..')).toContainText('1');
  await expect(page.getByRole('button', { name: /importar/i })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: 'disqualified' })).toContainText('—');
  await expect(page.getByText('PRIVATE_TEST_ID_001')).toHaveCount(0);
  await expect(page.locator('section[aria-labelledby="preview-title"] img')).toHaveCount(0);
});

test('confirma una importación transaccional y muestra su resumen', async ({ page }) => {
  const fixture = await loadIndividualFixture(); let payload;
  await routeAuth(page); await routeResolvedImportReferences(page);
  await page.route('**/rest/v1/rpc/commit_result_import', async (route) => { payload = route.request().postDataJSON(); return route.fulfill(json('batch-success')); });
  await openResolvedPreview(page, fixture); await page.getByRole('button', { name: 'Importar resultados' }).click();
  await expect(page.getByText('Importación transaccional completada', { exact: false })).toBeVisible();
  expect(payload.requested_sanitized_rows).toHaveLength(2); expect(payload.requested_mappings).toHaveLength(3); expect(payload.requested_correction_reason).toBeNull(); expect(payload.requested_source_type).toBe('hy3');
  await expect(page.getByText('Lote batch-success')).toBeVisible();
});

test('mantiene el estado sin cambios cuando el RPC rechaza toda la importación', async ({ page }) => {
  const fixture = await loadIndividualFixture(); let calls = 0;
  await routeAuth(page); await routeResolvedImportReferences(page);
  await page.route('**/rest/v1/rpc/commit_result_import', async (route) => { calls += 1; return route.fulfill(json({ code: '40001', message: 'Result import failed atomically: one row is invalid.' }, 409)); });
  await openResolvedPreview(page, fixture); await page.getByRole('button', { name: 'Importar resultados' }).click();
  await expect(page.getByRole('alert')).toContainText('No se importó ningún resultado'); expect(calls).toBe(1); await expect(page.getByText('Lote')).toHaveCount(0);
});

test('envía correcciones manuales con motivo y evidencia de auditoría', async ({ page }) => {
  const fixture = await loadIndividualFixture(); let payload;
  await routeAuth(page); await routeResolvedImportReferences(page);
  await page.route('**/rest/v1/rpc/commit_result_import', async (route) => { payload = route.request().postDataJSON(); return route.fulfill(json('batch-correction')); });
  await openResolvedPreview(page, fixture); await page.getByLabel('Tiempo en segundos RES-TST-001').fill('62.4'); await page.getByLabel('Motivo de la corrección').fill('Acta corregida por mesa técnica'); await page.getByLabel('Evidencia de la corrección').fill('Acta pública sintética 2026-01'); await page.getByRole('button', { name: 'Importar resultados' }).click();
  await expect(page.getByText('Importación transaccional completada', { exact: false })).toBeVisible(); expect(payload.requested_source_type).toBe('manual'); expect(payload.requested_correction_reason).toBe('Acta corregida por mesa técnica'); expect(payload.requested_correction_evidence).toBe('Acta pública sintética 2026-01'); expect(payload.requested_sanitized_rows.find((row) => row.sourceAlias === 'RES-TST-001').time_ms).toBe(62400);
});
