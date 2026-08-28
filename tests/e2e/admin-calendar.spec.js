import { expect, test } from '@playwright/test';

test.describe.configure({ timeout: 60_000 });

const userId = '10000000-0000-4000-8000-000000000001';
const token = `x.${Buffer.from(JSON.stringify({ exp: 4102444800, sub: userId, role: 'authenticated' })).toString('base64url')}.x`;
const user = { id: userId, aud: 'authenticated', role: 'authenticated', email: 'editor@asanda.test', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-08-17T00:00:00Z', updated_at: '2026-08-17T00:00:00Z' };
const json = (body, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });
const sport = { id: 'sport-1', code: 'aquatics', name: 'Deportes acuáticos' };
const discipline = { id: 'discipline-1', code: 'swimming', name: 'Natación', sport_id: sport.id, sport };
const calendar = { id: 'calendar-1', discipline_id: discipline.id, season_year: 2026, discipline, competitions: [{ count: 2 }] };
const venue = { id: 'venue-1', name: 'Complejo E2E', address: '', city: 'Barcelona', region: 'Anzoátegui', country_code: 'VE' };
const competition = { id: 'competition-1', name: 'Copa E2E', slug: 'copa-e2e', calendar_id: calendar.id, sport_id: sport.id, organizer_id: 'org-1', venue_id: venue.id, starts_on: '2026-09-10', ends_on: null, recognition_status: 'recognized', status: 'draft', description: '', logo_asset_id: null, published_at: null, revision: 1, organizer: { id: 'org-1', name: 'ASANDA', short_name: 'ASANDA' }, venue, sport };

const routeAuth = async (page) => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({ access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'refresh', user })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(user)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{ id: userId, display_name: 'Editor E2E', role: 'editor', is_active: true }])));
};

const signIn = async (page) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
};

const routeReferences = async (page) => {
  await page.route('**/rest/v1/venues**', (route) => route.fulfill(json([venue])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([{ id: 'org-1', name: 'ASANDA', short_name: 'ASANDA', organization_type: 'association', publication_status: 'published' }])));
  await page.route('**/rest/v1/age_categories**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/event_definitions**', (route) => { const url = new URL(route.request().url()); expect(url.searchParams.get('discipline_id')).toBe(`eq.${discipline.id}`); expect(url.searchParams.get('is_active')).toBe('eq.true'); return route.fulfill(json([{ id: 'definition-1', code: '50-free', name: '50 metros libre', discipline_id: discipline.id, is_active: true }, { id: 'definition-2', code: '100-free', name: '100 metros libre', discipline_id: discipline.id, is_active: true }, { id: 'definition-other', code: 'diving', name: 'Saltos', discipline_id: 'discipline-2', is_active: true }, { id: 'definition-inactive', code: 'old', name: 'Prueba inactiva', discipline_id: discipline.id, is_active: false }])); });
};

test('lists calendars and exposes loading, error, retry, empty, and CTA states', async ({ page }) => {
  await routeAuth(page);
  let mode = 'loading'; let release;
  const pending = new Promise((resolve) => { release = resolve; });
  await page.route('**/rest/v1/competition_calendars**', async (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('select')).toBe('id,discipline_id,season_year,discipline:disciplines!competition_calendars_discipline_id_fkey(id,code,name),competitions(count)');
    if (mode === 'loading') { await pending; return route.fulfill(json([calendar])); }
    if (mode === 'error') { mode = 'empty'; return route.fulfill(json({ message: 'private database detail' }, 500)); }
    return route.fulfill(json([]));
  });
  await signIn(page);
  await page.getByRole('link', { name: 'Calendario' }).click();
  await expect(page.getByRole('status')).toHaveText('Cargando calendarios…');
  release();
  await expect(page.getByRole('heading', { name: 'Natación' })).toBeVisible();
  await expect(page.getByText('2 competencias')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nuevo calendario' })).toHaveAttribute('href', '/admin/calendario/nuevo');
  await expect(page.getByRole('link', { name: 'Administrar competencias' })).toHaveAttribute('href', '/admin/calendario/calendar-1/competencias');
  mode = 'error';
  await page.getByRole('link', { name: 'Noticias' }).click();
  await page.getByRole('link', { name: 'Calendario' }).click();
  await expect(page.getByRole('alert')).not.toContainText('private database detail');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Todavía no hay calendarios.')).toBeVisible();
});

test('requires sport and year, creates a calendar, and keeps a stable competition route', async ({ page }) => {
  await routeAuth(page); await routeReferences(page);
  let payload;
  await page.route('**/rest/v1/disciplines**', (route) => {
    const url = new URL(route.request().url());
    expect(url.searchParams.get('is_active')).toBe('eq.true');
    expect(url.searchParams.get('order')).toBe('sort_order.asc,name.asc');
    return route.fulfill(json([discipline]));
  });
  await page.route('**/rest/v1/competition_calendars**', (route) => {
    if (route.request().method() === 'POST') payload = route.request().postDataJSON();
    return route.fulfill(json(calendar));
  });
  await page.route('**/rest/v1/competitions**', (route) => route.fulfill(json([])));
  await signIn(page);
  await page.goto('/admin/calendario/nuevo');
  await page.getByLabel('Año').fill('');
  await page.getByRole('button', { name: 'Guardar calendario' }).click();
  expect(payload).toBeUndefined();
  await page.getByLabel('Deporte').selectOption(discipline.id);
  await page.getByLabel('Año').fill('2026');
  await page.getByRole('button', { name: 'Guardar calendario' }).click();
  expect(payload).toEqual({ discipline_id: discipline.id, season_year: 2026 });
  await expect(page).toHaveURL(/\/admin\/calendario\/calendar-1\/competencias$/);
  await expect(page.getByRole('status', { name: 'Resultado de la operación' })).toContainText('Calendario creado correctamente');
  await expect(page.getByText('Natación · 2026')).toBeVisible();
  await page.getByRole('link', { name: 'Añadir competencia' }).click();
  await expect(page.getByText('Natación · 2026')).toBeVisible();
  await expect(page.getByText(`Deporte: ${sport.name}`)).toBeVisible();
});

test('opens the existing calendar safely after a duplicate', async ({ page }) => {
  await routeAuth(page);
  await page.route('**/rest/v1/disciplines**', (route) => route.fulfill(json([discipline])));
  await page.route('**/rest/v1/competitions**', (route) => route.fulfill(json([])));
  const requests = { insert: 0, recovery: 0, context: 0 };
  await page.route('**/rest/v1/competition_calendars**', (route) => {
    if (route.request().method() === 'POST') { requests.insert += 1; return route.fulfill(json({ code: '23505', message: 'sensitive unique constraint detail' }, 409)); }
    const url = new URL(route.request().url());
    if (url.searchParams.has('discipline_id')) { requests.recovery += 1; expect(url.searchParams.get('discipline_id')).toBe(`eq.${discipline.id}`); expect(url.searchParams.get('season_year')).toBe('eq.2026'); }
    else { requests.context += 1; expect(url.searchParams.get('id')).toBe(`eq.${calendar.id}`); }
    return route.fulfill(json(calendar));
  });
  await signIn(page);
  await page.goto('/admin/calendario/nuevo');
  await page.getByLabel('Deporte').selectOption(discipline.id);
  await page.getByLabel('Año').fill('2026');
  await page.getByRole('button', { name: 'Guardar calendario' }).click();
  await expect(page).toHaveURL(/\/admin\/calendario\/calendar-1\/competencias$/);
  expect(requests).toEqual({ insert: 1, recovery: 1, context: 0 });
  await expect(page.getByRole('status', { name: 'Resultado de la operación' })).toContainText('ya existía');
  await expect(page.getByRole('status', { name: 'Resultado de la operación' })).not.toContainText('sensitive');
});

test('manages competitions only inside their fixed calendar context', async ({ page }) => {
  await routeAuth(page); await routeReferences(page);
  let savedPayload; let stored = null; let events = []; let eventPatchScope; let statusPatchScope; let reorderPayload; let deletedEventId;
  await page.route('**/rest/v1/competition_calendars**', (route) => { const requestedId = new URL(route.request().url()).searchParams.get('id'); return route.fulfill(json(requestedId === 'eq.other-calendar' ? { ...calendar, id: 'other-calendar' } : calendar)); });
  await page.route('**/rest/v1/competitions**', (route) => {
    const request = route.request(); const url = new URL(request.url()); const requestedId = url.searchParams.get('id');
    if (request.method() === 'POST') { savedPayload = request.postDataJSON(); stored = { ...competition, ...savedPayload }; return route.fulfill(json(stored)); }
    if (request.method() === 'PATCH') { statusPatchScope = requestedId; stored = { ...(stored || competition), ...request.postDataJSON() }; return route.fulfill(json(stored)); }
    if (requestedId) return route.fulfill(json(stored || competition));
    expect(url.searchParams.get('calendar_id')).toBe(`eq.${calendar.id}`);
    return route.fulfill(json(stored ? [stored] : []));
  });
  await page.route('**/rest/v1/competition_events**', (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === 'POST') { const payload = request.postDataJSON(); const saved = { ...payload, id: `event-${events.length + 1}` }; events.push(saved); return route.fulfill(json(saved)); }
    if (request.method() === 'PATCH') { eventPatchScope = { id: url.searchParams.get('id'), competitionId: url.searchParams.get('competition_id') }; const id = url.searchParams.get('id').replace('eq.', ''); events = events.map((item) => item.id === id ? { ...item, ...request.postDataJSON() } : item); return route.fulfill(json(events.find((item) => item.id === id))); }
    if (request.method() === 'DELETE') { deletedEventId = url.searchParams.get('id'); events = events.filter((item) => item.id !== deletedEventId.replace('eq.', '')); return route.fulfill({ status: 204, body: '' }); }
    return route.fulfill(json(events));
  });
  await page.route('**/rest/v1/rpc/reorder_competition_events', (route) => {
    reorderPayload = route.request().postDataJSON();
    events = reorderPayload.ordered_event_ids.map((id, index) => ({ ...events.find((item) => item.id === id), sequence_number: index + 1 }));
    return route.fulfill(json(null));
  });
  await signIn(page);
  await page.goto(`/admin/calendario/${calendar.id}/competencias`);
  await expect(page.getByText('Natación · 2026')).toBeVisible();
  await expect(page.getByText('Todavía no hay competencias en este calendario.')).toBeVisible();
  await page.getByRole('link', { name: 'Añadir competencia' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/calendario/${calendar.id}/competencias/nueva$`));
  await expect(page.getByText('Natación · 2026')).toBeVisible();
  await expect(page.getByLabel('Deporte')).toHaveCount(0);
  await expect(page.getByRole('option', { name: '50 metros libre' })).toHaveCount(0);
  await page.getByLabel('Nombre de la competencia').fill(competition.name);
  await page.getByLabel('Slug público').fill(competition.slug);
  await page.getByLabel('Organización responsable').selectOption('org-1');
  await expect(page.getByLabel('Sede')).toHaveValue('');
  await expect(page.getByRole('option', { name: 'Sede por confirmar' })).toHaveValue('');
  await page.getByLabel('Fecha de inicio').fill('2027-01-10');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('alert')).toContainText('debe pertenecer al año');
  expect(savedPayload).toBeUndefined();
  await page.getByLabel('Fecha de inicio').fill(competition.starts_on);
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/calendario/${calendar.id}/competencias/${competition.id}$`));
  expect(savedPayload.calendar_id).toBe(calendar.id);
  expect(savedPayload.sport_id).toBe(sport.id);
  expect(savedPayload.venue_id).toBeNull();
  expect(savedPayload.starts_on).toBe(competition.starts_on);
  await page.getByRole('button', { name: 'Posponer competencia' }).click();
  expect(statusPatchScope).toBe(`eq.${competition.id}`);
  expect(stored.status).toBe('postponed');
  await expect(page.getByRole('status', { name: 'Resultado de la operación' })).toContainText('Estado actualizado: Pospuesta');
  await expect(page.getByText('Estado: Pospuesta')).toBeVisible();
  const eventDefinition = page.getByLabel('Evento activo');
  await expect(eventDefinition).toBeVisible();
  await expect(eventDefinition).toContainText('50 metros libre');
  await expect(eventDefinition).not.toContainText('Saltos');
  await expect(eventDefinition).not.toContainText('Prueba inactiva');
  await eventDefinition.selectOption('definition-1');
  await expect(eventDefinition).toHaveValue('definition-1');
  await page.getByLabel('Horario').fill('2026-09-10T09:30');
  await page.getByRole('button', { name: 'Agregar evento' }).click();
  expect(events[0].scheduled_at).toBe('2026-09-10T13:30:00.000Z');
  await page.getByRole('button', { name: 'Editar evento' }).click();
  await expect(page.getByLabel('Horario')).toHaveValue('2026-09-10T09:30');
  await page.getByLabel('Horario').fill('2026-09-10T10:00');
  await page.getByRole('button', { name: 'Guardar evento' }).click();
  expect(eventPatchScope).toEqual({ id: 'eq.event-1', competitionId: `eq.${competition.id}` });
  expect(events[0].scheduled_at).toBe('2026-09-10T14:00:00.000Z');
  await eventDefinition.selectOption('definition-2');
  await page.getByRole('button', { name: 'Agregar evento' }).click();
  await page.getByRole('button', { name: 'Subir evento 2' }).click();
  expect(reorderPayload).toEqual({ requested_competition_id: competition.id, ordered_event_ids: ['event-2', 'event-1'] });
  await expect(page.getByLabel('Eventos ordenados de la competencia').locator('li').first()).toContainText('100 metros libre');
  await page.getByRole('button', { name: 'Eliminar evento 2' }).click();
  expect(deletedEventId).toBe('eq.event-1');
  await expect(page.getByLabel('Eventos ordenados de la competencia').getByText('50 metros libre')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Editar evento' })).toBeVisible();
  await page.goto(`/admin/calendario/${calendar.id}/competencias`);
  await expect(page.getByRole('heading', { name: competition.name })).toBeVisible();
  await page.getByRole('link', { name: 'Editar competencia' }).click();
  await expect(page.getByLabel('Nombre de la competencia')).toHaveValue(competition.name);
  await page.goto('/admin/calendario/other-calendar/competencias/competition-1');
  await expect(page.getByRole('alert')).toContainText('no pertenece a este calendario');
  await expect(page.getByLabel('Nombre de la competencia')).toHaveCount(0);
  await page.goto('/admin/calendario/competition-1');
  await expect(page).toHaveURL(new RegExp(`/admin/calendario/${calendar.id}/competencias/${competition.id}$`));
  savedPayload = undefined;
  await page.goto('/admin/calendario/nueva');
  await expect(page).toHaveURL(/\/admin\/calendario$/);
  expect(savedPayload).toBeUndefined();
});
