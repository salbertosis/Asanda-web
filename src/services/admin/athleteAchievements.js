export const ACHIEVEMENT_TYPES = Object.freeze(['national_podium', 'international_podium', 'international_participation', 'state_record']);
export const PARTICIPATION_OUTCOMES = Object.freeze(['top_8', 'outstanding_participation']);
const types = new Set(ACHIEVEMENT_TYPES);
const outcomes = new Set(PARTICIPATION_OUTCOMES);
const text = (value) => String(value ?? '').trim();
const object = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : null;
const required = (value, code, max) => { if (typeof value !== 'string' || !value.trim() || (max && value.trim().length > max)) throw new Error(code); return value.trim(); };
const date = (value, code) => { const valueText = required(value, code); const parsed = new Date(`${valueText}T00:00:00Z`); if (!/^\d{4}-\d{2}-\d{2}$/.test(valueText) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== valueText) throw new Error(code); return valueText; };
const number = (value) => value === '' || value == null ? null : Number(value);

export const normalizeAchievementResult = (row = {}) => ({ id: row.id || '', eventDefinitionId: row.event_definition_id || '', eventName: text(row.event_name) || text(row.legacy_event_label), eventActive: row.event_active === true, podiumPlace: row.podium_place == null ? '' : String(row.podium_place), participationOutcome: row.participation_outcome || '', recordId: row.record_id || '', recordStatus: row.record_status || null, legacyEventLabel: row.legacy_event_label || '', legacyPayload: object(row.legacy_payload), legacySourceIdentifier: row.legacy_source_identifier || '' });
export const normalizeAchievementGroup = (row) => {
  if (!row?.group_id || !row.athlete_id || !types.has(row.achievement_type) || !['draft', 'published'].includes(row.publication_status)) throw new Error('INVALID_ACHIEVEMENT_DATA');
  return { id: row.group_id, athleteId: row.athlete_id, type: row.achievement_type, title: row.title, competitionName: row.competition_name, location: row.location, achievedOn: row.achieved_on, publicationStatus: row.publication_status, publishedAt: row.published_at, children: Array.isArray(row.children) ? row.children.map(normalizeAchievementResult) : [] };
};
export const orderAchievementGroups = (items) => [...items].sort((a, b) => a.achievedOn === b.achievedOn ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.achievedOn < b.achievedOn ? 1 : -1);

const childPayload = (child, type, seen) => {
  const eventDefinitionId = text(child?.eventDefinitionId), recordId = text(child?.recordId), outcome = text(child?.participationOutcome), podiumPlace = number(child?.podiumPlace);
  if (!eventDefinitionId) {
    if (!text(child?.legacyEventLabel) || !object(child?.legacyPayload) || !text(child?.legacySourceIdentifier) || recordId) throw new Error('INVALID_LEGACY_RESULT');
    return { event_definition_id: null, podium_place: podiumPlace, participation_outcome: outcome || null, record_id: null, legacy_event_label: text(child.legacyEventLabel), legacy_payload: child.legacyPayload, legacy_source_identifier: text(child.legacySourceIdentifier) };
  }
  if (seen.has(eventDefinitionId)) throw new Error('DUPLICATE_ACHIEVEMENT_EVENT');
  seen.add(eventDefinitionId);
  if (['national_podium', 'international_podium'].includes(type) && (!Number.isInteger(podiumPlace) || ![1, 2, 3].includes(podiumPlace) || outcome || recordId)) throw new Error('INVALID_PODIUM_PLACE');
  if (type === 'international_participation' && (!outcomes.has(outcome) || podiumPlace !== null || recordId)) throw new Error('INVALID_PARTICIPATION_OUTCOME');
  if (type === 'state_record' && (!recordId || podiumPlace !== null || outcome)) throw new Error('INVALID_STATE_RECORD');
  return { event_definition_id: eventDefinitionId, podium_place: podiumPlace, participation_outcome: outcome || null, record_id: recordId || null };
};
export const normalizeAchievementPayload = (athleteId, values = {}) => {
  if (!types.has(values.type)) throw new Error('INVALID_ACHIEVEMENT_TYPE');
  const children = Array.isArray(values.children) ? values.children : [];
  if (!children.length) throw new Error('ACHIEVEMENT_RESULT_REQUIRED');
  const seen = new Set();
  return { requested_group_id: text(values.id) || null, requested_athlete_id: required(athleteId, 'ATHLETE_ID_REQUIRED'), requested_achievement_type: values.type, requested_title: required(values.title, 'ACHIEVEMENT_TITLE_REQUIRED', 180), requested_competition_name: required(values.competitionName, 'COMPETITION_NAME_REQUIRED', 180), requested_location: required(values.location, 'LOCATION_REQUIRED', 180), requested_achieved_on: date(values.achievedOn, 'ACHIEVED_ON_REQUIRED'), requested_children: children.map((child) => childPayload(child, values.type, seen)) };
};

const database = async () => (await import('../supabase')).supabase;
const read = async (query) => { const { data, error } = await query; if (error) throw error; return data; };
const rpcRow = (data) => Array.isArray(data) ? data[0] : data;
const id = (value, code) => required(value, code);
export const listAthleteAchievements = async (athleteId) => { const db = await database(); const data = await read(db.rpc('list_athlete_achievement_groups', { requested_athlete_id: id(athleteId, 'ATHLETE_ID_REQUIRED') })); return orderAchievementGroups(Array.isArray(data) ? data.map(normalizeAchievementGroup) : []); };
export const getAthleteAchievementReferences = async (athleteId) => {
  const db = await database(), requestedAthleteId = id(athleteId, 'ATHLETE_ID_REQUIRED');
  const [events, records] = await Promise.all([
    read(db.from('event_definitions').select('id,code,name,course,relay_size,is_active,disciplines!inner(code,is_active)').eq('disciplines.code', 'swimming').eq('disciplines.is_active', true).eq('is_active', true).is('relay_size', null).order('code')),
    read(db.from('records').select('id,event_definition_id,event_name_snapshot,publication_status,published_at,time_ms,achieved_year,competition_name_snapshot,age_category_name_snapshot,competitive_sex,course').eq('athlete_id', requestedAthleteId).eq('scope_type', 'state').order('event_name_snapshot').order('id')),
  ]);
  return { events: (events || []).map((row) => ({ id: row.id, code: row.code, name: row.name, course: row.course, isActive: row.is_active !== false })), records: (records || []).map((row) => ({ id: row.id, eventDefinitionId: row.event_definition_id, eventName: row.event_name_snapshot, publicationStatus: row.publication_status, publishedAt: row.published_at, timeMs: row.time_ms, achievedYear: row.achieved_year, competitionName: row.competition_name_snapshot, categoryName: row.age_category_name_snapshot, competitiveSex: row.competitive_sex, course: row.course })) };
};
export const saveAthleteAchievementGroup = async (athleteId, values) => { const db = await database(); return rpcRow(await read(db.rpc('save_athlete_achievement_group_draft', normalizeAchievementPayload(athleteId, values)))); };
export const publishAthleteAchievementGroup = async (groupId) => { const db = await database(); return rpcRow(await read(db.rpc('publish_athlete_achievement_group', { requested_group_id: id(groupId, 'ACHIEVEMENT_ID_REQUIRED') }))); };
export const deleteAthleteAchievementGroup = async (groupId) => { const db = await database(); return read(db.rpc('delete_athlete_achievement_group', { requested_group_id: id(groupId, 'ACHIEVEMENT_ID_REQUIRED') })); };
export const formatAchievementError = (error) => {
  const message = `${error?.code || ''} ${error?.message || error || ''}`.toLowerCase();
  if (message.includes('42501') || message.includes('unauthorized') || message.includes('permission') || message.includes('administrator')) return 'No tenés autorización para gestionar logros deportivos.';
  if (message.includes('six') || message.includes('seis') || message.includes('limit') || message.includes('límite')) return 'El atleta ya tiene seis o más competencias. Remediá los datos existentes antes de crear otra.';
  if (message.includes('duplicate') || message.includes('una vez') || message.includes('unique')) return 'Cada prueba puede aparecer una sola vez en la competencia.';
  if (message.includes('podium') || message.includes('podio') || message.includes('primer') || message.includes('segundo') || message.includes('tercer') || message.includes('position')) return 'Elegí primer, segundo o tercer lugar para cada resultado de podio.';
  if (message.includes('participation') || message.includes('participación') || message.includes('top 8') || message.includes('destacada')) return 'Elegí Top 8 o participación destacada para cada resultado.';
  if (message.includes('record') || message.includes('récord')) return 'Seleccioná un récord estatal oficial publicado del mismo evento.';
  if (message.includes('inactive') || message.includes('activo') || message.includes('relay') || message.includes('individual') || message.includes('evento')) return 'Seleccioná una prueba individual activa del catálogo de natación.';
  if (message.includes('title_required') || message.includes('título') || message.includes('title')) return 'Ingresá un título de hasta 180 caracteres.';
  if (message.includes('competition_name') || message.includes('competencia')) return 'Ingresá el nombre de la competencia.';
  if (message.includes('location') || message.includes('ubicación')) return 'Ingresá la ubicación de la competencia.';
  if (message.includes('achieved_on') || message.includes('fecha') || message.includes('date')) return 'Ingresá una fecha válida para la competencia.';
  if (message.includes('result') || message.includes('resultado') || message.includes('children')) return 'Agregá al menos un resultado y completá sus datos.';
  if (message.includes('consent') || message.includes('published athlete')) return 'Para publicar, el atleta debe estar publicado y tener consentimientos vigentes.';
  return 'No fue posible completar la operación de logros. Intentá nuevamente.';
};
