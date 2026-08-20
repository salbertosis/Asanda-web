import { expect, test } from '@playwright/test';
import { loadFixture } from '../fixtures/hy3/harness.mjs';

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
});
