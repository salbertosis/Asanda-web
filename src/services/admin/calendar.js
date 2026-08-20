import { supabase } from '../supabase';

export const COMPETITION_STATUSES = ['draft', 'scheduled', 'in_progress', 'completed', 'postponed', 'cancelled', 'archived'];
export const EVENT_ROUNDS = ['heat', 'semifinal', 'final', 'timed_final'];
export const EVENT_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled'];
export const SEX_CLASSES = ['female', 'male', 'mixed', 'open'];

const VENUE_COLUMNS = 'id,name,address,city,region,country_code,created_at,updated_at';
const COMPETITION_COLUMNS = 'id,name,slug,sport_id,organizer_id,venue_id,starts_on,ends_on,recognition_status,status,description,logo_asset_id,published_at,revision,created_at,updated_at';
const COMPETITION_SELECT = `${COMPETITION_COLUMNS},organizer:organizations!competitions_organizer_id_fkey(id,name,short_name),venue:venues!competitions_venue_id_fkey(id,name,city,region,country_code),sport:sports(id,code,name)`;
const EVENT_COLUMNS = 'id,competition_id,event_definition_id,category_id,competitive_sex,round,sequence_number,scheduled_at,status';
const ID = (value, code = 'ID_REQUIRED') => {
  if (typeof value !== 'string' || !value.trim() || !/^[A-Za-z0-9_-]{1,128}$/.test(value.trim())) throw new Error(code);
  return value.trim();
};
const text = (value) => String(value ?? '').trim();
const date = (value, required = false) => {
  if (!value && !required) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('INVALID_DATE');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error('INVALID_DATE');
  return value;
};
const dateTime = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('INVALID_SCHEDULE');
  return parsed.toISOString();
};
const asRows = (value, code = 'INVALID_RESPONSE') => {
  if (!Array.isArray(value)) throw new Error(code);
  return value;
};
const read = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

const normalizeVenue = (row) => {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !text(row.name)) throw new Error('INVALID_VENUE_DATA');
  return { ...row, id: row.id, name: text(row.name), address: text(row.address), city: text(row.city), region: text(row.region), country_code: text(row.country_code).toUpperCase() };
};
const normalizeCompetition = (row) => {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || !text(row.name) || !COMPETITION_STATUSES.includes(row.status)) throw new Error('INVALID_COMPETITION_DATA');
  const starts = date(row.starts_on, true);
  const ends = date(row.ends_on);
  if (ends && ends < starts) throw new Error('INVALID_DATE_RANGE');
  return { ...row, name: text(row.name), slug: text(row.slug), starts_on: starts, ends_on: ends, description: text(row.description), published_at: row.published_at || null };
};
const normalizeEvent = (row) => {
  if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.competition_id !== 'string' || typeof row.event_definition_id !== 'string' || !Number.isInteger(row.sequence_number) || row.sequence_number < 1 || !EVENT_ROUNDS.includes(row.round) || !EVENT_STATUSES.includes(row.status)) throw new Error('INVALID_EVENT_DATA');
  return { ...row, category_id: row.category_id || '', competitive_sex: row.competitive_sex || '', scheduled_at: row.scheduled_at || null };
};
const normalizeProgram = (rows) => {
  const events = asRows(rows, 'INVALID_EVENT_PROGRAM').map(normalizeEvent);
  const sequences = new Set();
  const ids = new Set();
  events.forEach((event) => {
    if (sequences.has(event.sequence_number)) throw new Error('DUPLICATE_EVENT_SEQUENCE');
    if (ids.has(event.id)) throw new Error('DUPLICATE_EVENT_ID');
    sequences.add(event.sequence_number); ids.add(event.id);
  });
  return events.sort((a, b) => a.sequence_number - b.sequence_number || a.id.localeCompare(b.id));
};

export const validateCompetitionInput = (values, status = 'draft') => {
  const name = text(values.name);
  const slug = text(values.slug).toLowerCase();
  const startsOn = date(values.startsOn, true);
  const endsOn = date(values.endsOn);
  if (!name) throw new Error('COMPETITION_NAME_REQUIRED');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('INVALID_SLUG');
  if (endsOn && endsOn < startsOn) throw new Error('INVALID_DATE_RANGE');
  if (!COMPETITION_STATUSES.includes(status)) throw new Error('INVALID_COMPETITION_STATUS');
  return { name, slug, sport_id: ID(values.sportId, 'SPORT_REQUIRED'), organizer_id: ID(values.organizerId, 'ORGANIZER_REQUIRED'), venue_id: ID(values.venueId, 'VENUE_REQUIRED'), starts_on: startsOn, ends_on: endsOn, description: text(values.description) || null };
};

export const listAdminVenues = async () => asRows(await read(supabase.from('venues').select(VENUE_COLUMNS).order('name'))).map(normalizeVenue);
export const getAdminVenue = async (id) => {
  const row = await read(supabase.from('venues').select(VENUE_COLUMNS).eq('id', ID(id, 'VENUE_REQUIRED')).maybeSingle());
  return row ? normalizeVenue(row) : null;
};
export const saveAdminVenue = async (values) => {
  const id = values.id ? ID(values.id, 'VENUE_REQUIRED') : null;
  const name = text(values.name);
  const countryCode = text(values.countryCode || values.country_code).toUpperCase();
  if (!name) throw new Error('VENUE_NAME_REQUIRED');
  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) throw new Error('INVALID_COUNTRY_CODE');
  const payload = { name, address: text(values.address) || null, city: text(values.city) || null, region: text(values.region) || null, country_code: countryCode || null };
  const query = id ? supabase.from('venues').update(payload).eq('id', id) : supabase.from('venues').insert(payload);
  return normalizeVenue(await read(query.select(VENUE_COLUMNS).single()));
};

export const listAdminCompetitions = async () => asRows(await read(supabase.from('competitions').select(COMPETITION_SELECT).order('starts_on').order('name'))).map(normalizeCompetition);
export const getAdminCompetition = async (id) => {
  const row = await read(supabase.from('competitions').select(COMPETITION_SELECT).eq('id', ID(id, 'COMPETITION_REQUIRED')).maybeSingle());
  return row ? normalizeCompetition(row) : null;
};
export const getCalendarReferences = async () => {
  const [venues, sports, definitions, categories, organizations] = await Promise.all([
    listAdminVenues(),
    read(supabase.from('sports').select('id,code,name,is_active').eq('is_active', true).order('name')),
    read(supabase.from('event_definitions').select('id,code,name,discipline_id,is_active,discipline:disciplines(id,code,name,sport_id)').eq('is_active', true).order('name')),
    read(supabase.from('age_categories').select('id,code,name,is_active').eq('is_active', true).order('name')),
    read(supabase.from('organizations').select('id,name,short_name,organization_type,publication_status').order('name')),
  ]);
  return { venues, sports: asRows(sports), definitions: asRows(definitions), categories: asRows(categories), organizations: asRows(organizations) };
};

export const saveAdminCompetition = async (values, status = 'draft') => {
  const id = values.id ? ID(values.id, 'COMPETITION_REQUIRED') : null;
  const payload = validateCompetitionInput(values, status);
  payload.status = status;
  payload.published_at = status === 'draft' || status === 'archived' ? null : (values.publishedAt || new Date().toISOString());
  const query = id ? supabase.from('competitions').update(payload).eq('id', id) : supabase.from('competitions').insert(payload);
  return normalizeCompetition(await read(query.select(COMPETITION_COLUMNS).single()));
};
export const setAdminCompetitionStatus = async (id, status, publishedAt) => {
  if (!COMPETITION_STATUSES.includes(status)) throw new Error('INVALID_COMPETITION_STATUS');
  const payload = { status, published_at: status === 'draft' || status === 'archived' ? null : (publishedAt || new Date().toISOString()) };
  return normalizeCompetition(await read(supabase.from('competitions').update(payload).eq('id', ID(id, 'COMPETITION_REQUIRED')).select(COMPETITION_COLUMNS).single()));
};

export const validateEventInput = (values, existing = []) => {
  const sequence = Number(values.sequenceNumber);
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error('INVALID_EVENT_SEQUENCE');
  if (!EVENT_ROUNDS.includes(values.round)) throw new Error('INVALID_EVENT_ROUND');
  if (!EVENT_STATUSES.includes(values.status)) throw new Error('INVALID_EVENT_STATUS');
  if (values.competitiveSex && !SEX_CLASSES.includes(values.competitiveSex)) throw new Error('INVALID_EVENT_SEX');
  if (existing.some((event) => event.id !== values.id && event.sequence_number === sequence)) throw new Error('DUPLICATE_EVENT_SEQUENCE');
  return { event_definition_id: ID(values.eventDefinitionId, 'EVENT_DEFINITION_REQUIRED'), category_id: values.categoryId ? ID(values.categoryId, 'CATEGORY_INVALID') : null, competitive_sex: values.competitiveSex || null, round: values.round, sequence_number: sequence, scheduled_at: dateTime(values.scheduledAt), status: values.status };
};
export const listAdminEvents = async (competitionId) => normalizeProgram(await read(supabase.from('competition_events').select(EVENT_COLUMNS).eq('competition_id', ID(competitionId, 'COMPETITION_REQUIRED')).order('sequence_number')));
export const saveAdminEvent = async (competitionId, values, existing = []) => {
  const id = values.id ? ID(values.id, 'EVENT_REQUIRED') : null;
  const payload = { competition_id: ID(competitionId, 'COMPETITION_REQUIRED'), ...validateEventInput(values, existing) };
  const query = id ? supabase.from('competition_events').update(payload).eq('id', id) : supabase.from('competition_events').insert(payload);
  return normalizeEvent(await read(query.select(EVENT_COLUMNS).single()));
};
export const reorderAdminEvents = async (competitionId, events) => {
  const orderedEventIds = normalizeProgram(events).map((event) => event.id);
  const { error } = await supabase.rpc('reorder_competition_events', { requested_competition_id: ID(competitionId, 'COMPETITION_REQUIRED'), ordered_event_ids: orderedEventIds });
  if (error) throw error;
};
export const deleteAdminEvent = async (id) => {
  const { error } = await supabase.from('competition_events').delete().eq('id', ID(id, 'EVENT_REQUIRED'));
  if (error) throw error;
};

export const formatCalendarError = (error) => {
  const message = String(error?.message || error || '').toLowerCase();
  if (message.includes('date_range') || message.includes('date range') || message.includes('invalid_date')) return 'Revisá las fechas: el final no puede ser anterior al inicio.';
  if (message.includes('event_sequence') || message.includes('sequence')) return 'Cada evento debe tener una secuencia positiva y única.';
  if (message.includes('venue_name')) return 'Ingresá el nombre de la sede.';
  if (message.includes('country_code')) return 'El país debe usar un código ISO de dos letras.';
  if (message.includes('duplicate') || message.includes('unique') || message.includes('23505')) return 'Ya existe una sede, competencia o secuencia con esos datos.';
  if (message.includes('event definition') || message.includes('category') || message.includes('23514')) return 'La definición, categoría o fecha del evento no es válida para esta competencia.';
  if (message.includes('entries') || message.includes('historical') || message.includes('23503')) return 'No se puede eliminar: el historial debe conservarse. Corregí el estado en lugar de borrar.';
  if (message.includes('not found')) return 'No encontramos el registro solicitado.';
  return 'No se pudo guardar el calendario. Revisá los datos e intentá nuevamente.';
};
