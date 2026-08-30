import { supabase } from '../supabase';

const columns = 'id,athlete_id,source_document_id,achievement_type,title,competition_name,place,medal,achieved_on,valid_from,valid_to,publication_status,published_at,created_at,updated_at';
const types = new Set(['national_podium', 'international_medal', 'national_team']);
const medals = new Set(['gold', 'silver', 'bronze']);

const required = (value, code, max) => {
  if (typeof value !== 'string' || !value.trim() || (max && value.trim().length > max)) throw new Error(code);
  return value.trim();
};
const date = (value, code) => {
  const text = required(value, code);
  const parsed = new Date(`${text}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) throw new Error(code);
  return text;
};
const normalize = (row) => {
  if (!row?.id || !row.athlete_id || !types.has(row.achievement_type) || !['draft', 'published'].includes(row.publication_status)) throw new Error('INVALID_ACHIEVEMENT_DATA');
  return ({
  id: row.id, athleteId: row.athlete_id, sourceDocumentId: row.source_document_id,
  type: row.achievement_type, title: row.title, competitionName: row.competition_name,
  place: row.place, medal: row.medal, achievedOn: row.achieved_on,
  validFrom: row.valid_from, validTo: row.valid_to, publicationStatus: row.publication_status,
  publishedAt: row.published_at, createdAt: row.created_at, updatedAt: row.updated_at,
  });
};
const payload = (values) => {
  if (!types.has(values.type)) throw new Error('INVALID_ACHIEVEMENT_TYPE');
  const common = {
    source_document_id: required(values.sourceDocumentId, 'SOURCE_DOCUMENT_REQUIRED'),
    achievement_type: values.type, title: required(values.title, 'ACHIEVEMENT_TITLE_REQUIRED', 180),
    competition_name: null, place: null, medal: null, achieved_on: null, valid_from: null, valid_to: null,
  };
  if (values.type === 'national_team') {
    common.valid_from = date(values.validFrom, 'VALID_FROM_REQUIRED');
    common.valid_to = values.validTo ? date(values.validTo, 'INVALID_DATE') : null;
    if (common.valid_to && common.valid_to < common.valid_from) throw new Error('INVALID_PERIOD');
  } else {
    common.competition_name = required(values.competitionName, 'COMPETITION_NAME_REQUIRED', 180);
    common.achieved_on = date(values.achievedOn, 'ACHIEVED_ON_REQUIRED');
    if (values.type === 'national_podium') {
      common.place = Number(values.place);
      if (![1, 2, 3].includes(common.place)) throw new Error('INVALID_PODIUM_PLACE');
    } else {
      if (!medals.has(values.medal)) throw new Error('INVALID_MEDAL');
      common.medal = values.medal;
    }
  }
  return common;
};
const read = async (query) => { const { data, error } = await query; if (error) throw error; return data; };

export const listAthleteAchievements = async (athleteId) => {
  const data = await read(supabase.from('athlete_achievements').select(columns)
    .eq('athlete_id', required(athleteId, 'ATHLETE_ID_REQUIRED'))
    .order('published_at', { ascending: false, nullsFirst: false }).order('achieved_on', { ascending: false, nullsFirst: false })
    .order('valid_from', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }));
  return Array.isArray(data) ? data.map(normalize) : [];
};
export const createAthleteAchievement = async (athleteId, values) => normalize(await read(
  supabase.from('athlete_achievements').insert({ athlete_id: required(athleteId, 'ATHLETE_ID_REQUIRED'), ...payload(values), publication_status: 'draft', published_at: null }).select(columns).single(),
));
export const updateAthleteAchievement = async (id, values) => {
  const row = await read(supabase.from('athlete_achievements').update(payload(values)).eq('id', required(id, 'ACHIEVEMENT_ID_REQUIRED')).eq('publication_status', 'draft').select(columns).maybeSingle());
  if (!row) throw new Error('ACHIEVEMENT_DRAFT_REQUIRED');
  return normalize(row);
};
const setStatus = async (id, publicationStatus) => normalize(await read(supabase.from('athlete_achievements')
  .update({ publication_status: publicationStatus, published_at: publicationStatus === 'published' ? new Date().toISOString() : null })
  .eq('id', required(id, 'ACHIEVEMENT_ID_REQUIRED')).select(columns).single()));
export const publishAthleteAchievement = (id) => setStatus(id, 'published');
export const unpublishAthleteAchievement = (id) => setStatus(id, 'draft');
export const deleteAthleteAchievement = async (id, currentStatus) => {
  if (currentStatus !== 'draft') throw new Error('ACHIEVEMENT_DRAFT_REQUIRED');
  const { data, error } = await supabase.from('athlete_achievements').delete().eq('id', required(id, 'ACHIEVEMENT_ID_REQUIRED')).eq('publication_status', 'draft').select('id').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('ACHIEVEMENT_DRAFT_REQUIRED');
};
export const formatAchievementError = (error) => {
  const message = `${error?.code || ''} ${error?.message || error || ''}`.toLowerCase();
  if (message.includes('title_required') || message.includes('title')) return 'Ingresá un título de hasta 180 caracteres.';
  if (message.includes('source_document') || message.includes('approved source')) return 'Seleccioná una prueba aprobada del atleta.';
  if (message.includes('competition_name')) return 'Ingresá el nombre de la competencia.';
  if (message.includes('podium_place')) return 'Elegí una posición entre 1 y 3.';
  if (message.includes('invalid_medal')) return 'Elegí una medalla válida.';
  if (message.includes('date') || message.includes('valid_from') || message.includes('achieved_on') || message.includes('period')) return 'Revisá las fechas ingresadas y su orden.';
  if (message.includes('published athlete') || message.includes('consent')) return 'Para publicar, el atleta debe estar publicado y tener consentimientos vigentes.';
  if (message.includes('42501') || message.includes('permission')) return 'No tenés autorización para gestionar logros.';
  return 'No fue posible completar la operación de logros. Intentá nuevamente.';
};
