import { getCloudinaryUrl } from '../config/cloudinary';
import { supabase } from './supabase';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const COMPETITIONS_SELECT = `
  id,
  slug,
  name,
  description,
  starts_on,
  ends_on,
  recognition_status,
  status,
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
  )
`;

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
  const startsOn = new Date(`${competition.starts_on}T00:00:00`);
  const venueParts = competition.venue
    ? [competition.venue.name, competition.venue.city, competition.venue.region].filter(Boolean).join(', ')
    : null;

  return {
    id: competition.id,
    slug: competition.slug,
    nombre: competition.name,
    descripcion: competition.description,
    fechaInicio: getDayOfMonth(competition.starts_on),
    fechaFin: competition.ends_on ? getDayOfMonth(competition.ends_on) : getDayOfMonth(competition.starts_on),
    mes: MONTHS[startsOn.getMonth()],
    año: startsOn.getFullYear(),
    organizador: competition.organizer?.short_name || competition.organizer?.name || 'Organización por confirmar',
    organizadorSlug: competition.organizer?.slug || null,
    ubicacion: venueParts || 'Sede por confirmar',
    logoUrl: getLogoUrl(competition.logo),
    logoAlt: competition.logo?.alt_text || null,
    reconocido: competition.recognition_status === 'recognized',
  };
};

const buildCompetitionQuery = () => supabase
  .from('competitions')
  .select(COMPETITIONS_SELECT)
  .not('published_at', 'is', null)
  .neq('status', 'draft');

export const getPublishedCompetitions = async (signal) => {
  let query = buildCompetitionQuery().order('starts_on');

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;

  return data.map(normalizeCompetition);
};

export const getCompetenciaBySlugRemote = async (slug, signal) => {
  let query = buildCompetitionQuery().eq('slug', slug).maybeSingle();

  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;

  return data ? normalizeCompetition(data) : null;
};

export const getCompetenciaBySlug = (competencias, slug) => competencias.find((competencia) => competencia.slug === slug);