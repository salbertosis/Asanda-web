import { supabase } from '../supabase';
import { listPublicImageMedia } from './media';

const COLUMNS = 'id,athlete_id,athlete_name_snapshot,athlete_photo_asset_id,club_name_snapshot,event_definition_id,event_name_snapshot,age_category_id,age_category_name_snapshot,competitive_sex,time_ms,achieved_year,competition_name_snapshot,publication_status,revision';
const text = (value) => String(value ?? '').trim();
const id = (value, code) => { const result = text(value); if (!result) throw new Error(code); return result; };

export const parseRecordTime = (value) => {
  const match = /^(?:(\d+):([0-5]\d)|([0-5]?\d))\.(\d{2})$/.exec(text(value));
  if (!match) throw new Error('INVALID_TIME');
  const milliseconds = ((Number(match[1] || 0) * 60) + Number(match[2] ?? match[3])) * 1000 + Number(match[4]) * 10;
  if (milliseconds <= 0 || !Number.isSafeInteger(milliseconds)) throw new Error('INVALID_TIME');
  return milliseconds;
};

export const formatRecordTime = (milliseconds) => {
  const hundredths = Math.floor(Number(milliseconds) / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  return `${minutes ? `${minutes}:${String(seconds).padStart(2, '0')}` : seconds}.${String(hundredths % 100).padStart(2, '0')}`;
};

export const listStateRecords = async () => {
  const { data, error } = await supabase.from('records').select(COLUMNS).eq('scope_type', 'state').order('event_name_snapshot');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
};

export const getRecordReferences = async () => {
  const [athletesResult, media, definitionsResult, categoriesResult] = await Promise.all([
    supabase.from('athletes').select('id,display_name,photo_asset_id').order('display_name'), listPublicImageMedia(),
    supabase.from('event_definitions').select('id,name').eq('course', 'long_course').eq('is_active', true).order('name'),
    supabase.from('age_categories').select('id,name').eq('is_active', true).order('sort_order'),
  ]);
  if (athletesResult.error) throw athletesResult.error;
  if (definitionsResult.error) throw definitionsResult.error;
  if (categoriesResult.error) throw categoriesResult.error;
  return { athletes: athletesResult.data ?? [], media: media.filter((asset) => asset.provider === 'cloudinary' && asset.publicId), definitions: definitionsResult.data ?? [], categories: categoriesResult.data ?? [] };
};

export const saveStateRecordDraft = async (values) => {
  const year = Number(values.achievedYear);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) throw new Error('INVALID_YEAR');
  if (!['female', 'male'].includes(values.competitiveSex)) throw new Error('INVALID_SEX');
  const { data, error } = await supabase.rpc('save_state_record_draft', {
    requested_record_id: values.id || null, requested_expected_revision: values.id ? Number(values.revision) : null,
    requested_athlete_id: values.athleteId || null, requested_athlete_name: id(values.athleteName, 'ATHLETE_NAME_REQUIRED'),
    requested_photo_asset_id: values.photoAssetId || null, requested_club_name: id(values.clubName, 'CLUB_NAME_REQUIRED'),
    requested_event_definition_id: id(values.eventDefinitionId, 'EVENT_REQUIRED'), requested_age_category_id: id(values.ageCategoryId, 'CATEGORY_REQUIRED'),
    requested_competitive_sex: values.competitiveSex, requested_time_ms: parseRecordTime(values.time), requested_achieved_year: year,
    requested_competition_name: id(values.competitionName, 'COMPETITION_REQUIRED'),
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
};

export const setStateRecordPublished = async (record, published) => {
  const { data, error } = await supabase.rpc('set_state_record_published', { requested_record_id: record.id, requested_expected_revision: record.revision, requested_published: published });
  if (error) throw error;
  return Number(data);
};

export const formatRecordError = (error) => {
  const message = `${error?.code || ''} ${error?.message || error || ''}`.toLowerCase();
  if (message.includes('40001') || message.includes('revision conflict')) return 'El registro cambió en otra sesión. Recargá antes de continuar.';
  if (message.includes('23505') || message.includes('unique')) return 'Ya hay un récord publicado para esa prueba, categoría y género.';
  if (message.includes('invalid_time')) return 'Ingresá un tiempo válido como 58.42 o 1:02.35.';
  if (message.includes('required') || message.includes('invalid_')) return 'Completá todos los datos del récord con valores válidos.';
  return 'No se pudo guardar el récord. Revisá los datos e intentá nuevamente.';
};
