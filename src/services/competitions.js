import { getCloudinaryUrl } from '../config/cloudinary';
import { supabase } from './supabase';
import { getLocalIsoDay, selectUpcomingCompetitions } from './competitionSelection';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const PUBLIC_CALENDAR_EXCLUDED_DISCIPLINES = new Set(['artistic-swimming', 'diving']);

const COMPETITIONS_SELECT = `
  id,
  slug,
  name,
  description,
  starts_on,
  ends_on,
  recognition_status,
  status,
  published_at,
  logo:media_assets!competitions_logo_asset_id_fkey(
    provider,
    public_id,
    external_url,
    alt_text
  ),
  organizer:organizations!competitions_organizer_id_fkey(
    name,
    short_name,
    slug
  ),
  venue:venues!competitions_venue_id_fkey(
    name,
    city,
    region,
    country_code
  ),
  calendar:competition_calendars!inner(
    season_year,
    discipline:disciplines!inner(id,code,name,sort_order)
  )
`;

const asObject = (value) => Array.isArray(value) ? value[0] : value;

const getLogoUrl = (logo) => {
  if (!logo) return null;
  if (logo.provider === 'cloudinary' && logo.public_id) {
    return getCloudinaryUrl(logo.public_id, {
      width: 640,
      height: 384,
      crop: 'pad',
      background: 'transparent',
    });
  }
  return logo.external_url || null;
};

const getDayOfMonth = (dateString) => String(new Date(`${dateString}T00:00:00`).getDate());

const normalizeCompetition = (competition) => {
  const calendar = asObject(competition?.calendar);
  const sport = asObject(calendar?.discipline);
  if (!competition || typeof competition.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(competition.starts_on || '') || !Number.isInteger(calendar?.season_year) || !sport?.code || !sport?.name) return null;
  const startsOn = new Date(`${competition.starts_on}T00:00:00`);
  const venueParts = competition.venue
    ? [competition.venue.name, competition.venue.city, competition.venue.region].filter(Boolean).join(', ')
    : null;

  return {
    id: competition.id,
    slug: competition.slug,
    nombre: competition.name,
    descripcion: competition.description,
    startsOn: competition.starts_on,
    endsOn: competition.ends_on,
    fechaInicio: getDayOfMonth(competition.starts_on),
    fechaFin: competition.ends_on ? getDayOfMonth(competition.ends_on) : getDayOfMonth(competition.starts_on),
    mes: MONTHS[startsOn.getMonth()],
    año: startsOn.getFullYear(),
    organizador: competition.organizer?.short_name || competition.organizer?.name || 'Organización por confirmar',
    organizadorSlug: competition.organizer?.slug || null,
    ubicacion: venueParts || 'Sede por confirmar',
    sede: venueParts,
    logoUrl: getLogoUrl(competition.logo),
    logoAlt: competition.logo?.alt_text || null,
    reconocido: competition.recognition_status === 'recognized',
    sport: { id: sport.id, code: sport.code, name: sport.name, sortOrder: sport.sort_order },
    calendarYear: Number(calendar.season_year),
    deporte: sport.code,
  };
};

const buildCompetitionQuery = () => supabase
  .from('competitions')
  .select(COMPETITIONS_SELECT)
  .not('published_at', 'is', null)
  .in('status', ['scheduled', 'in_progress', 'completed', 'postponed', 'cancelled']);

export const getPublishedCompetitions = async ({ sportCode = 'all', year, month = 'all', signal } = {}) => {
  let query = buildCompetitionQuery().order('starts_on');
  if (sportCode !== 'all') query = query.eq('calendar.discipline.code', sportCode);
  if (year) {
    const from = `${year}-${month === 'all' ? '01' : month}-01`;
    const until = month === 'all' ? `${year + 1}-01-01` : new Date(Date.UTC(year, Number(month), 1)).toISOString().slice(0, 10);
    query = query.gte('starts_on', from).lt('starts_on', until);
  }
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeCompetition).filter((item) => {
    if (item) return true;
    console.warn('Ignoring malformed published competition');
    return false;
  });
};

export const getPublicCalendarFilters = async (signal) => {
  let disciplinesQuery = supabase.from('disciplines').select('id,code,name,sort_order').eq('is_active', true).order('sort_order').order('name');
  let yearsQuery = supabase.from('competition_calendars').select('season_year').order('season_year', { ascending: false });
  if (signal) { disciplinesQuery = disciplinesQuery.abortSignal(signal); yearsQuery = yearsQuery.abortSignal(signal); }
  const [disciplinesResult, yearsResult] = await Promise.all([disciplinesQuery, yearsQuery]);
  if (disciplinesResult.error) throw disciplinesResult.error;
  if (yearsResult.error) throw yearsResult.error;
  const disciplines = (disciplinesResult.data || [])
    .filter((item) => item?.id && item?.code && item?.name)
    .filter((item) => !PUBLIC_CALENDAR_EXCLUDED_DISCIPLINES.has(item.code))
    .map((item) => ({ id: item.id, code: item.code, name: item.name, sortOrder: item.sort_order }));
  const years = [...new Set((yearsResult.data || []).map((item) => Number(item?.season_year)).filter(Number.isInteger))].sort((a, b) => b - a);
  return { disciplines, years };
};

export const getUpcomingCompetitions = async ({ today = getLocalIsoDay(), limit = 3, signal } = {}) => {
  let query = buildCompetitionQuery()
    .in('status', ['scheduled', 'in_progress', 'postponed'])
    .order('starts_on');

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;

  return selectUpcomingCompetitions(data, today, limit).map(normalizeCompetition).filter(Boolean);
};

export const getCompetenciaBySlugRemote = async (slug, signal) => {
  let query = buildCompetitionQuery().eq('slug', slug).maybeSingle();

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;

  return data ? normalizeCompetition(data) : null;
};

export const getCompetenciaBySlug = (competencias, slug) => competencias.find((competencia) => competencia.slug === slug);
