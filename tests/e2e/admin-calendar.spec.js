import { expect, test } from '@playwright/test';

const userId = '10000000-0000-4000-8000-000000000001';
const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.x`;
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z' };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const venue = { id: 'venue-1', name: 'Complejo Acuático E2E', address: 'Avenida pública 1', city: 'Barcelona', region: 'Anzoátegui', country_code: 'VE' };
const competitionRow = (overrides = {}) => ({ id: 'competition-1', name: 'Copa E2E', slug: 'copa-e2e', sport_id: 'sport-1', organizer_id: 'org-1', venue_id: venue.id, starts_on: '2026-09-10', ends_on: '2026-09-12', recognition_status: 'recognized', status: 'draft', description: 'Competencia sintética.', logo_asset_id: null, published_at: null, revision: 1, organizer: { id: 'org-1', name: 'ASANDA E2E', short_name: 'ASANDA' }, venue, sport: { id: 'sport-1', code: 'aquatics', name: 'Deportes acuáticos' }, ...overrides });
const definitions = [{ id: 'definition-1', code: '50-free', name: '50 metros libre', discipline_id: 'discipline-1', is_active: true, discipline: { id: 'discipline-1', sport_id: 'sport-1' } }, { id: 'definition-2', code: '100-free', name: '100 metros libre', discipline_id: 'discipline-1', is_active: true, discipline: { id: 'discipline-1', sport_id: 'sport-1' } }];
const eventRow = (id, sequence, definitionId) => ({ id, competition_id: 'competition-1', event_definition_id: definitionId, category_id: 'category-1', competitive_sex: 'open', round: 'timed_final', sequence_number: sequence, scheduled_at: `2026-09-${10 + sequence}T13:00:00.000Z`, status: 'scheduled' });

const routeAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(user)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{ id: userId, display_name: 'Editor E2E', role: 'editor', is_active: true }])));
};

test('administra sedes, fechas, estados y programa ordenado sin aceptar datos inválidos', async ({ page }) => {
  await routeAuth(page);
  let venues = [];
  let competitions = [];
  let events = [];
  await page.route('**/rest/v1/venues**', async (route) => {
    const request = route.request(); const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
    if (request.method() === 'GET') return route.fulfill(json(id ? venues.filter((item) => item.id === id) : venues));
    if (request.method() === 'POST') { const payload = request.postDataJSON(); venues = [{ ...payload, id: 'venue-1' }]; return route.fulfill(json(venues[0])); }
    const payload = request.postDataJSON(); venues = venues.map((item) => item.id === id ? { ...item, ...payload } : item); return route.fulfill(json(venues.find((item) => item.id === id)));
  });
  await page.route('**/rest/v1/sports**', (route) => route.fulfill(json([{ id: 'sport-1', code: 'aquatics', name: 'Deportes acuáticos', is_active: true }])));
  await page.route('**/rest/v1/event_definitions**', (route) => route.fulfill(json(definitions)));
  await page.route('**/rest/v1/age_categories**', (route) => route.fulfill(json([{ id: 'category-1', code: 'open', name: 'Abierta', is_active: true }])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([{ id: 'org-1', name: 'Asociación E2E', short_name: 'ASANDA', organization_type: 'association', publication_status: 'published' }])));
  await page.route('**/rest/v1/competitions**', async (route) => {
    const request = route.request(); const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', ''); const object = request.headers().accept?.includes('application/vnd.pgrst.object+json');
    if (request.method() === 'GET') { const rows = id ? competitions.filter((item) => item.id === id) : competitions; return route.fulfill(json(object ? (rows[0] || {}) : rows)); }
    const payload = request.postDataJSON();
    if (request.method() === 'POST') { const row = competitionRow({ ...payload, id: 'competition-1', venue: venues[0], organizer: { id: 'org-1', name: 'Asociación E2E', short_name: 'ASANDA' } }); competitions = [row]; return route.fulfill(json(object ? row : [row])); }
    const row = competitionRow({ ...competitions[0], ...payload }); competitions = [row]; return route.fulfill(json(object ? row : [row]));
  });
  await page.route('**/rest/v1/competition_events**', async (route) => {
    const request = route.request(); const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', ''); const object = request.headers().accept?.includes('application/vnd.pgrst.object+json');
    if (request.method() === 'GET') return route.fulfill(json(events));
    if (request.method() === 'DELETE') { events = events.filter((item) => item.id !== id); return route.fulfill({ status: 204, body: '' }); }
    const payload = request.postDataJSON();
    if (request.method() === 'POST') { const row = { ...payload, id: `event-${events.length + 1}` }; events.push(row); return route.fulfill(json(object ? row : [row])); }
    events = events.map((item) => item.id === id ? { ...item, ...payload } : item); return route.fulfill(json(object ? events.find((item) => item.id === id) : events));
  });
  await page.route('**/rest/v1/rpc/reorder_competition_events', async (route) => { const ids = route.request().postDataJSON().ordered_event_ids; events = ids.map((id, index) => ({ ...events.find((item) => item.id === id), sequence_number: index + 1 })); await route.fulfill(json(null)); });

  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Calendario' }).click();
  await page.getByRole('link', { name: 'Sedes' }).click();
  await page.getByRole('link', { name: 'Nueva sede' }).click();
  await page.getByLabel('Nombre de la sede').fill(venue.name);
  await page.getByLabel('Ciudad').fill(venue.city);
  await page.getByLabel('Estado / región').fill(venue.region);
  await page.getByRole('button', { name: 'Guardar sede' }).click();
  await expect(page.getByRole('status')).toContainText('Sede guardada');
  await page.getByRole('link', { name: 'Volver a sedes' }).click();
  await page.getByRole('link', { name: 'Volver al calendario' }).click();
  await page.getByRole('link', { name: 'Nueva competencia' }).click();
  await page.getByLabel('Nombre de la competencia').fill('Copa E2E');
  await page.getByLabel('Slug público').fill('copa-e2e');
  await page.getByLabel('Deporte').selectOption('sport-1');
  await page.getByLabel('Organización responsable').selectOption('org-1');
  await page.getByLabel('Sede').selectOption('venue-1');
  await page.getByLabel('Fecha de inicio').fill('2026-09-10');
  await page.getByLabel('Fecha de finalización').fill('2026-09-09');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('alert')).toContainText('final no puede ser anterior');
  expect(competitions).toHaveLength(0);
  await page.getByLabel('Fecha de finalización').fill('2026-09-12');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page).toHaveURL(/\/admin\/calendario\/competition-1$/);
  await expect(page.getByLabel('Fecha de inicio')).toHaveValue('2026-09-10');
  await page.getByLabel('Evento activo').selectOption('definition-1');
  await page.getByLabel('Secuencia').fill('1');
  await page.getByRole('button', { name: 'Agregar evento' }).click();
  await expect(page.getByLabel('Eventos ordenados de la competencia').getByText('50 metros libre')).toBeVisible();
  await page.getByLabel('Evento activo').selectOption('definition-2');
  await page.getByLabel('Secuencia').fill('2');
  await page.getByRole('button', { name: 'Agregar evento' }).click();
  await page.getByRole('button', { name: 'Subir evento 2' }).click();
  await expect(page.locator('ol[aria-label="Eventos ordenados de la competencia"] li').first()).toContainText('100 metros libre');
  await page.getByRole('button', { name: 'Publicar competencia' }).click();
  await expect(page.getByText('Estado: Programada')).toBeVisible();
  await page.getByRole('button', { name: 'Posponer competencia' }).click();
  await expect(page.getByText('Estado: Pospuesta')).toBeVisible();
  await page.getByRole('button', { name: 'Marcar como completada' }).click();
  await expect(page.getByText('Estado: Completada')).toBeVisible();
  await page.getByRole('button', { name: 'Archivar competencia' }).click();
  await expect(page.getByText('Estado: Archivada')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancelar competencia' })).toHaveCount(0);
});
