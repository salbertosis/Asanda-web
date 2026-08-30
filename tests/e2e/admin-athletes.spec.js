import { expect, test } from '@playwright/test';

const userId = '10000000-0000-4000-8000-000000000001';
const accessToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${Buffer.from(JSON.stringify({
  exp: 4102444800,
  sub: userId,
  role: 'authenticated',
})).toString('base64url')}.signature`;

const authUser = {
  id: userId,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'editor@asanda.test',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-08-17T00:00:00.000Z',
  updated_at: '2026-08-17T00:00:00.000Z',
  is_anonymous: false,
};

const athlete = {
  id: 'athlete-relations',
  display_name: 'Atleta de relaciones',
  preferred_name: null,
  competitive_sex: 'female',
  birth_year_public: 2012,
  photo_asset_id: null,
  publication_status: 'draft',
};

const publishedAthlete = {
  ...athlete,
  id: 'athlete-published',
  display_name: 'Atleta publicado',
  preferred_name: 'Preferido',
  publication_status: 'published',
};

const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
const isAthleteListRequest = (request) => {
  const query = new URL(request.url()).searchParams;
  return query.get('select') === 'id,display_name,preferred_name,competitive_sex,publication_status'
    && query.get('order') === 'display_name.asc';
};

const routeAdminAuth = async (page, role = 'editor') => {
  await page.route('**/auth/v1/token**', (route) => route.fulfill(json({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 4102444800,
    refresh_token: 'refresh-token',
    user: authUser,
  })));
  await page.route('**/auth/v1/user', (route) => route.fulfill(json(authUser)));
  await page.route('**/rest/v1/profiles**', (route) => route.fulfill(json([{
    id: userId,
    display_name: 'Editor E2E',
    role,
    is_active: true,
  }])));
};

const signInEditor = async (page) => {
  await page.goto('/admin/login');
  await page.getByLabel('Correo electrónico').fill('editor@asanda.test');
  await page.getByLabel('Contraseña').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page).toHaveURL(/\/admin\/noticias$/);
};

const routeAthleteEditor = async (page, handlers = {}) => {
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json(athlete)));
  await page.route('**/rest/v1/athlete_consents**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([])));
  await page.route('**/rest/v1/age_categories**', (route) => route.fulfill(json([
    { id: 'category-youth', code: 'youth', name: 'Juvenil', federation_eligible: true, is_active: true, sort_order: 1 },
    { id: 'category-pre-infant', code: 'pre-infant', name: 'Pre Infantil', federation_eligible: false, is_active: true, sort_order: 2 },
  ])));
  await page.route('**/rest/v1/disciplines**', (route) => route.fulfill(json([
    { id: 'discipline-swimming', code: 'swimming', name: 'Natación', is_active: true },
  ])));
  await page.route('**/rest/v1/organizations**', (route) => route.fulfill(json([
    { id: 'club-asanda', name: 'Club ASANDA', short_name: 'ASD', organization_type: 'club' },
  ])));
  await page.route('**/rest/v1/athlete_category_assignments**', handlers.category || ((route) => route.fulfill(json([]))));
  await page.route('**/rest/v1/athlete_disciplines**', handlers.discipline || ((route) => route.fulfill(json([]))));
  await page.route('**/rest/v1/athlete_memberships**', handlers.membership || ((route) => route.fulfill(json([]))));
  await page.route('**/rest/v1/source_documents**', handlers.evidence || ((route) => route.fulfill(json([]))));
  await page.route('**/rest/v1/athlete_achievements**', handlers.achievements || ((route) => route.fulfill(json([]))));
};

test('keeps evidence unavailable until the athlete is saved', async ({ page }) => {
  let evidenceRequests = 0;
  await routeAdminAuth(page);
  await page.route('**/rest/v1/source_documents**', (route) => { evidenceRequests += 1; return route.fulfill(json([])); });
  await page.route('**/rest/v1/athletes**', (route) => route.fulfill(json(isAthleteListRequest(route.request()) ? [] : athlete)));
  await page.route(/\/rest\/v1\/(media_assets|age_categories|disciplines|organizations).*/, (route) => route.fulfill(json([])));
  await signInEditor(page);
  await page.goto('/admin/atletas/nuevo');
  await expect(page.getByText('Guardá primero la ficha para cargar pruebas y logros.')).toBeVisible();
  expect(evidenceRequests).toBe(0);
});

test('uploads editor evidence with an opaque private path without saving or review controls', async ({ page }) => {
  const storagePaths = [];
  const evidenceWrites = [];
  let saveCalls = 0;
  let evidenceRows = [];
  await routeAdminAuth(page);
  await routeAthleteEditor(page, { evidence: (route) => route.fulfill(json(evidenceRows)) });
  await page.route('**/storage/v1/object/athlete-evidence/**', (route) => {
    storagePaths.push(decodeURIComponent(new URL(route.request().url()).pathname));
    return route.fulfill(json({ Key: 'private-object' }));
  });
  await page.route('**/rest/v1/rpc/create_athlete_evidence_source', (route) => {
    const payload = route.request().postDataJSON();
    evidenceWrites.push(payload);
    evidenceRows = [{ id: 'evidence-1', athlete_id: athlete.id, evidence_kind: 'private_object', evidence_label: payload.requested_evidence_label, storage_bucket_id: 'athlete-evidence', storage_object_path: payload.requested_storage_object_path, official_url: null, approval_status: 'pending', created_at: '2026-08-30T12:00:00Z' }];
    return route.fulfill(json(evidenceRows[0]));
  });
  await page.route('**/rest/v1/rpc/save_admin_athlete', (route) => { saveCalls += 1; return route.fulfill(json([athlete])); });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');
  await page.getByLabel('Etiqueta').fill('Acta regional');
  await page.getByLabel('Archivo de evidencia', { exact: true }).setInputFiles({ name: 'nombre-privado.pdf', mimeType: 'application/pdf', buffer: Buffer.from('private evidence') });
  await page.getByRole('button', { name: 'Agregar prueba' }).click();
  await expect(page.getByText('Acta regional', { exact: true })).toBeVisible();
  expect(evidenceWrites).toHaveLength(1);
  expect(evidenceWrites[0].requested_checksum).toMatch(/^[0-9a-f]{64}$/);
  expect(evidenceWrites[0].requested_storage_object_path).toMatch(new RegExp(`^${userId}/[0-9a-f-]+\\.pdf$`));
  expect(storagePaths.join(' ')).not.toContain('nombre-privado.pdf');
  expect(saveCalls).toBe(0);
  await expect(page.getByRole('button', { name: 'Aprobar' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rechazar' })).toHaveCount(0);
});

test('reports cleanup failure while preserving evidence registration failure', async ({ page }) => {
  const storageMethods = [];
  await routeAdminAuth(page);
  await routeAthleteEditor(page);
  await page.route('**/storage/v1/object/athlete-evidence**', (route) => {
    const method = route.request().method(); storageMethods.push(method);
    return route.fulfill(method === 'DELETE' ? { ...json({ message: 'cleanup failed' }), status: 500 } : json({ Key: 'private-object' }));
  });
  await page.route('**/rest/v1/rpc/create_athlete_evidence_source', (route) => route.fulfill({ ...json({ code: 'P0002', message: 'private details' }), status: 400 }));
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');
  await page.getByLabel('Etiqueta').fill('Acta fallida');
  await page.getByLabel('Archivo de evidencia', { exact: true }).setInputFiles({ name: 'acta.pdf', mimeType: 'application/pdf', buffer: Buffer.from('private evidence') });
  await page.getByRole('button', { name: 'Agregar prueba' }).click();
  await expect(page.getByRole('alert')).toContainText('No fue posible registrar la prueba privada ni retirar el archivo cargado');
  expect(storageMethods).toEqual(['POST', 'DELETE']);
});

test('lets administrators create HTTPS evidence, review it, and request private signed URLs', async ({ page }) => {
  const rpcCalls = [];
  let signedRequests = 0;
  let rows = [{ id: 'private-evidence', athlete_id: athlete.id, evidence_kind: 'private_object', evidence_label: 'Acta privada', storage_bucket_id: 'athlete-evidence', storage_object_path: `${userId}/opaque.pdf`, official_url: null, approval_status: 'pending', created_at: '2026-08-30T11:00:00Z' }];
  await routeAdminAuth(page, 'administrator');
  await routeAthleteEditor(page, { evidence: (route) => route.fulfill(json(rows)) });
  await page.route('**/rest/v1/rpc/create_athlete_evidence_source', (route) => {
    const payload = route.request().postDataJSON(); rpcCalls.push({ name: 'create', payload });
    rows = [...rows, { id: 'official-evidence', athlete_id: athlete.id, evidence_kind: 'official_url', evidence_label: payload.requested_evidence_label, storage_bucket_id: null, storage_object_path: null, official_url: payload.requested_official_url, approval_status: 'pending', created_at: '2026-08-30T12:00:00Z' }];
    return route.fulfill(json(rows[1]));
  });
  await page.route('**/rest/v1/rpc/review_athlete_evidence', (route) => { rpcCalls.push({ name: 'review', payload: route.request().postDataJSON() }); return route.fulfill(json({ ...rows[0], approval_status: 'approved' })); });
  await page.route('**/storage/v1/object/sign/athlete-evidence/**', (route) => { signedRequests += 1; return route.fulfill(json({ signedURL: '/signed-private-evidence' })); });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');
  await page.getByLabel('Origen de la prueba').selectOption('official_url');
  await page.getByLabel('Etiqueta').fill('Resultado federativo');
  await page.getByLabel('Enlace oficial HTTPS', { exact: true }).fill('https://federacion.example/resultados');
  await page.getByRole('button', { name: 'Agregar prueba' }).click();
  await expect(page.getByText('Resultado federativo', { exact: true })).toBeVisible();
  expect(rpcCalls[0].payload.requested_official_url).toBe('https://federacion.example/resultados');
  const privateItem = page.getByRole('listitem').filter({ hasText: 'Acta privada' });
  await privateItem.getByRole('button', { name: 'Aprobar' }).click();
  expect(rpcCalls[1]).toEqual({ name: 'review', payload: { requested_source_document_id: 'private-evidence', requested_decision: 'approved' } });
  const popupPromise = page.waitForEvent('popup');
  await privateItem.getByRole('button', { name: 'Abrir prueba' }).click();
  const popup = await popupPromise; await popup.close();
  expect(signedRequests).toBe(1);
});

test('manages evidence-backed achievement drafts without saving the athlete profile', async ({ page }) => {
  const approved = { id: 'evidence-approved', athlete_id: athlete.id, evidence_kind: 'official_url', evidence_label: 'Acta aprobada', official_url: 'https://federacion.example/acta', approval_status: 'approved', created_at: '2026-08-30T10:00:00Z' };
  const pending = { ...approved, id: 'evidence-pending', evidence_label: 'Acta pendiente', approval_status: 'pending' };
  const writes = [];
  let rows = [];
  let rejectedTeam = false;
  let failReload = false;
  let saveCalls = 0;
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    evidence: (route) => route.fulfill(json([approved, pending])),
    achievements: (route) => {
      const request = route.request();
      const payload = request.method() === 'GET' ? {} : request.postDataJSON() || {};
      if (request.method() === 'GET') {
        if (failReload) { failReload = false; return route.fulfill({ ...json({ message: 'reload failed' }), status: 500 }); }
        return route.fulfill(json(rows));
      }
      writes.push({ method: request.method(), payload });
      if (request.method() === 'POST' && payload.title === 'Selección Venezuela' && !rejectedTeam) {
        rejectedTeam = true;
        return route.fulfill({ ...json({ code: '23514', message: 'private database detail' }), status: 400 });
      }
      if (request.method() === 'DELETE') {
        const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
        rows = rows.filter((item) => item.id !== id);
        return route.fulfill(json({ id }));
      }
      if (request.method() === 'PATCH') {
        const id = new URL(request.url()).searchParams.get('id')?.replace('eq.', '');
        rows = rows.map((item) => item.id === id ? { ...item, ...payload, updated_at: '2026-08-30T13:00:00Z' } : item);
        return route.fulfill(json(rows.find((item) => item.id === id)));
      }
      const row = { id: `achievement-${rows.length + 1}`, athlete_id: athlete.id, ...payload, created_at: '2026-08-30T12:00:00Z', updated_at: '2026-08-30T12:00:00Z' };
      rows = [...rows, row];
      if (payload.title === 'Campeón nacional juvenil') failReload = true;
      return route.fulfill(json(row));
    },
  });
  await page.route('**/rest/v1/rpc/save_admin_athlete', (route) => { saveCalls += 1; return route.fulfill(json([athlete])); });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  const createForm = page.getByRole('form', { name: 'Agregar logro del atleta' });
  await expect(createForm.getByRole('option', { name: 'Acta aprobada' })).toHaveCount(1);
  await expect(createForm.getByRole('option', { name: 'Acta pendiente' })).toHaveCount(0);
  await createForm.getByLabel('Prueba aprobada').selectOption(approved.id);
  await createForm.getByLabel('Título').fill('Campeón nacional juvenil');
  await createForm.getByLabel('Competencia').fill('Nacional juvenil');
  await createForm.getByLabel('Fecha del logro').fill('2026-08-20');
  await createForm.getByRole('button', { name: 'Agregar logro' }).click();
  await expect(page.getByRole('alert')).toContainText('Logro agregado como borrador. No fue posible actualizar la lista de logros.');
  await expect(createForm.getByLabel('Título')).toHaveValue('');
  expect(writes).toHaveLength(1);
  expect(writes[0].payload).toMatchObject({ athlete_id: athlete.id, source_document_id: approved.id, achievement_type: 'national_podium', place: 1, medal: null, valid_from: null, publication_status: 'draft' });

  await createForm.getByLabel('Tipo de logro').selectOption('national_team');
  await createForm.getByLabel('Prueba aprobada').selectOption(approved.id);
  await createForm.getByLabel('Título').fill('Selección Venezuela');
  await createForm.getByLabel('Vigente desde').fill('2026-01-01');
  await createForm.getByLabel('Vigente hasta').fill('2026-12-31');
  await createForm.getByRole('button', { name: 'Agregar logro' }).click();
  await expect(page.getByRole('alert')).toContainText('No fue posible completar la operación');
  await expect(page.getByRole('alert')).not.toContainText('private database detail');
  await expect(createForm.getByLabel('Título')).toHaveValue('Selección Venezuela');
  await createForm.getByRole('button', { name: 'Agregar logro' }).click();
  await expect(page.getByRole('heading', { name: 'Selección Venezuela' })).toBeVisible();

  let podium = page.getByRole('listitem').filter({ hasText: 'Campeón nacional juvenil' });
  await podium.getByRole('button', { name: 'Publicar Campeón nacional juvenil' }).click();
  const publishPayload = writes.find((write) => write.method === 'PATCH' && write.payload.publication_status === 'published').payload;
  expect(publishPayload.published_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  podium = page.getByRole('listitem').filter({ hasText: 'Campeón nacional juvenil' });
  await expect(podium.getByText('Publicado', { exact: true })).toBeVisible();
  await podium.getByRole('button', { name: 'Despublicar Campeón nacional juvenil' }).click();
  podium = page.getByRole('listitem').filter({ hasText: 'Campeón nacional juvenil' });
  await podium.getByRole('button', { name: 'Editar Campeón nacional juvenil' }).click();
  const editForm = page.getByRole('form', { name: 'Editar logro Campeón nacional juvenil' });
  await editForm.getByLabel('Título').fill('Campeón nacional 2026');
  await editForm.getByRole('button', { name: 'Guardar cambios' }).click();
  await page.getByRole('button', { name: 'Eliminar Campeón nacional 2026' }).click();
  await expect(page.getByRole('heading', { name: 'Campeón nacional 2026' })).toHaveCount(0);
  expect(writes.find((write) => write.method === 'PATCH' && write.payload.publication_status === 'draft').payload.published_at).toBeNull();
  expect(saveCalls).toBe(0);
});

test('creates a draft through one atomic athlete RPC', async ({ page }) => {
  const writes = [];
  let legacyWrites = 0;
  await routeAdminAuth(page);
  await page.route('**/rest/v1/rpc/save_admin_athlete', async (route) => {
    writes.push(route.request().postDataJSON());
    return route.fulfill(json([{ ...athlete, id: 'created-athlete', display_name: 'Atleta nuevo' }]));
  });
  await page.route('**/rest/v1/athletes**', (route) => {
    if (route.request().method() !== 'GET') legacyWrites += 1;
    return route.fulfill(json(isAthleteListRequest(route.request()) ? [] : athlete));
  });
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([])));
  await page.route(/\/rest\/v1\/(age_categories|disciplines|organizations).*/, (route) => route.fulfill(json([])));
  await signInEditor(page);
  await page.getByRole('link', { name: 'Atletas' }).click();
  await page.getByRole('link', { name: 'Nuevo atleta' }).click();
  await page.getByLabel('Nombre público').fill('Atleta nuevo');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page).toHaveURL(/\/admin\/atletas\/created-athlete$/);
  expect(writes).toEqual([{
    requested_athlete_id: null, requested_display_name: 'Atleta nuevo', requested_preferred_name: null,
    requested_competitive_sex: null, requested_birth_year_public: null, requested_photo_asset_id: null,
    requested_publication_status: 'draft', requested_profile_consent: false,
    requested_photo_consent: false, requested_results_consent: false,
  }]);
  expect(legacyWrites).toBe(0);
});

test('publishes through one atomic athlete RPC and keeps errors safe', async ({ page }) => {
  let calls = 0;
  let legacyWrites = 0;
  let publishedPayload;
  await routeAdminAuth(page);
  await page.route('**/rest/v1/rpc/save_admin_athlete', (route) => {
    calls += 1;
    if (calls === 1) {
      publishedPayload = route.request().postDataJSON();
      return route.fulfill(json([{ ...athlete, id: 'published-athlete', display_name: 'Atleta publicado', publication_status: 'published' }]));
    }
    return route.fulfill({ ...json({ code: 'PGRST202', message: 'schema cache leaked-private-id-123' }), status: 404 });
  });
  await page.route('**/rest/v1/athletes**', (route) => {
    if (route.request().method() !== 'GET') legacyWrites += 1;
    return route.fulfill(json(isAthleteListRequest(route.request()) ? [] : athlete));
  });
  await page.route('**/rest/v1/media_assets**', (route) => route.fulfill(json([])));
  await page.route(/\/rest\/v1\/(age_categories|disciplines|organizations).*/, (route) => route.fulfill(json([])));
  await signInEditor(page);
  await page.getByRole('link', { name: 'Atletas' }).click();
  await page.getByRole('link', { name: 'Nuevo atleta' }).click();
  await page.getByLabel('Nombre público').fill('Atleta publicado');
  await page.getByLabel('Consentimiento de perfil público').check();
  await page.getByRole('button', { name: 'Publicar atleta' }).click();
  await expect(page).toHaveURL(/\/admin\/atletas\/published-athlete$/);
  expect(calls).toBe(1);
  expect(publishedPayload.requested_publication_status).toBe('published');
  expect(publishedPayload.requested_profile_consent).toBe(true);
  expect(legacyWrites).toBe(0);

  await page.goto('/admin/atletas/nuevo');
  await page.getByLabel('Nombre público').fill('Otro atleta');
  await page.getByRole('button', { name: 'Guardar borrador' }).click();
  await expect(page.getByRole('alert')).toContainText('actualización necesaria');
  await expect(page.getByRole('alert')).not.toContainText('leaked-private-id-123');
  expect(calls).toBe(2);
});

test('lists athletes and exposes loading, error, retry, empty, create, and edit states', async ({ page }) => {
  let mode = 'list';
  let releaseList;
  const pendingList = new Promise((resolve) => { releaseList = resolve; });
  await routeAdminAuth(page);
  await page.route('**/rest/v1/athletes**', async (route) => {
    expect(isAthleteListRequest(route.request())).toBe(true);
    if (mode === 'list') {
      await pendingList;
      return route.fulfill(json([athlete, publishedAthlete]));
    }
    if (mode === 'error') {
      mode = 'empty';
      return route.fulfill({ ...json({ message: 'private details' }), status: 500 });
    }
    return route.fulfill(json([]));
  });

  await signInEditor(page);
  await page.getByRole('link', { name: 'Atletas' }).click();
  await expect(page).toHaveURL(/\/admin\/atletas$/);
  await expect(page.getByRole('status')).toHaveText('Cargando atletas…');
  releaseList();

  await expect(page.getByRole('heading', { name: athlete.display_name })).toBeVisible();
  await expect(page.getByText('Borrador', { exact: true })).toBeVisible();
  await expect(page.getByText('Nombre preferido: Preferido')).toBeVisible();
  await expect(page.getByText('Publicado', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nuevo atleta' })).toHaveAttribute('href', '/admin/atletas/nuevo');
  await expect(page.getByRole('link', { name: `Editar ${publishedAthlete.display_name}` })).toHaveAttribute('href', `/admin/atletas/${publishedAthlete.id}`);
  await expect(page.getByText('athlete-published')).toHaveCount(0);

  mode = 'error';
  await page.goto('/admin/noticias');
  await page.getByRole('link', { name: 'Atletas' }).click();
  await expect(page.getByRole('alert')).toContainText('No fue posible cargar los atletas');
  await expect(page.getByRole('alert')).not.toContainText('private details');
  await page.getByRole('button', { name: 'Reintentar' }).click();
  await expect(page.getByText('Todavía no hay atletas.')).toBeVisible();
});

test('preserves category values when overlapping periods are rejected', async ({ page }) => {
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    category: async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill(json([{
          id: 'existing-category',
          category_id: 'category-youth',
          valid_from: '2026-01-01',
          valid_to: '2026-12-31',
        }]));
      }
      return route.fulfill({
        ...json({ code: '23P01', message: 'An athlete cannot have overlapping category periods.' }),
        status: 409,
      });
    },
  });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  await expect(page.getByRole('heading', { name: 'Atleta de relaciones' })).toBeVisible();
  await page.getByRole('button', { name: 'Agregar categoría' }).click();
  await page.getByLabel('Categoría').selectOption('category-youth');
  await page.getByLabel('Desde').fill('2026-06-01');
  await page.getByLabel('Hasta').fill('2026-12-31');
  await page.getByRole('button', { name: 'Guardar categoría' }).click();

  await expect(page.getByRole('alert')).toContainText('se superpone');
  await expect(page.getByLabel('Categoría')).toHaveValue('category-youth');
  await expect(page.getByLabel('Desde')).toHaveValue('2026-06-01');
  await expect(page.getByLabel('Hasta')).toHaveValue('2026-12-31');
});

test('persists discipline and associated membership through their service operations', async ({ page }) => {
  const disciplineWrites = [];
  const membershipWrites = [];
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    discipline: async (route) => {
      if (route.request().method() === 'GET') return route.fulfill(json([]));
      const payload = route.request().postDataJSON();
      disciplineWrites.push(payload);
      return route.fulfill(json({ ...payload, discipline: { id: 'discipline-swimming', code: 'swimming', name: 'Natación' } }));
    },
    membership: async (route) => {
      if (route.request().method() === 'GET') return route.fulfill(json([]));
      const payload = route.request().postDataJSON();
      membershipWrites.push(payload);
      return route.fulfill(json({ ...payload, id: 'membership-associated', organization: { id: 'club-asanda', name: 'Club ASANDA', short_name: 'ASD' } }));
    },
  });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  const disciplines = page.getByRole('group', { name: 'Disciplinas' });
  await disciplines.getByRole('button', { name: 'Agregar disciplina' }).click();
  await disciplines.getByRole('combobox').selectOption('discipline-swimming');
  await disciplines.getByLabel('Disciplina principal').check();
  await disciplines.getByLabel('Desde').fill('2026-01-01');
  await disciplines.getByLabel('Hasta').fill('2026-12-31');
  await disciplines.getByRole('button', { name: 'Guardar disciplina' }).click();
  await expect(page.getByText('Natación · Principal')).toBeVisible();

  const memberships = page.getByRole('group', { name: 'Membresías' });
  await memberships.getByRole('button', { name: 'Agregar membresía' }).click();
  await memberships.getByLabel('Club').selectOption('club-asanda');
  await memberships.getByLabel('Tipo de membresía').selectOption('associated');
  await memberships.getByLabel('Desde').fill('2026-01-01');
  await memberships.getByLabel('Hasta').fill('2026-12-31');
  await memberships.getByRole('button', { name: 'Guardar membresía' }).click();
  await expect(page.getByText(/Club ASANDA · Asociada/)).toBeVisible();

  expect(disciplineWrites).toEqual([{
    athlete_id: 'athlete-relations',
    discipline_id: 'discipline-swimming',
    is_primary: true,
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
  }]);
  expect(membershipWrites).toEqual([{
    athlete_id: 'athlete-relations',
    organization_id: 'club-asanda',
    membership_type: 'associated',
    status: 'active',
    valid_from: '2026-01-01',
    valid_to: '2026-12-31',
  }]);
});

test('preserves federated membership values when coverage and pre-infant rules reject them', async ({ page }) => {
  await routeAdminAuth(page);
  await routeAthleteEditor(page, {
    category: (route) => route.fulfill(json([{
      id: 'pre-infant-category',
      category_id: 'category-pre-infant',
      valid_from: '2026-01-01',
      valid_to: null,
    }])),
    membership: async (route) => {
      if (route.request().method() === 'GET') return route.fulfill(json([]));
      return route.fulfill({
        ...json({ code: '23514', message: 'Federated membership requires an active association covering the same period; pre-infant athletes cannot be federated.' }),
        status: 400,
      });
    },
  });
  await signInEditor(page);
  await page.goto('/admin/atletas/athlete-relations');

  await page.getByRole('button', { name: 'Agregar membresía' }).click();
  await page.getByLabel('Club').selectOption('club-asanda');
  await page.getByLabel('Tipo de membresía').selectOption('federated');
  await page.getByLabel('Desde').fill('2026-06-01');
  await page.getByLabel('Hasta').fill('2026-12-31');
  await page.getByRole('button', { name: 'Guardar membresía' }).click();

  await expect(page.getByRole('alert')).toContainText('asociación vigente');
  await expect(page.getByRole('alert')).toContainText('Pre Infantil');
  await expect(page.getByLabel('Club')).toHaveValue('club-asanda');
  await expect(page.getByLabel('Tipo de membresía')).toHaveValue('federated');
  await expect(page.getByLabel('Desde')).toHaveValue('2026-06-01');
  await expect(page.getByLabel('Hasta')).toHaveValue('2026-12-31');
});
