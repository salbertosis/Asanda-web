import { getCloudinaryUrl } from '../config/cloudinary.js';
import { supabase } from './supabase.js';

const initials = (value, fallback = 'ASANDA') => {
  const letters = String(value || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return letters || fallback;
};

const mediaUrl = (publicId, externalUrl, options) => {
  if (publicId) return getCloudinaryUrl(publicId, options);
  return externalUrl || null;
};

export const normalizePublishedResult = (row = {}) => {
  const athleteName = row.athlete_name || 'Atleta ASANDA';
  const clubName = row.club_name || 'Club por confirmar';
  return {
    id: row.result_id,
    competitionId: row.competition_id,
    competitionName: row.competition_name,
    eventId: row.competition_event_id,
    eventName: row.event_name || 'Evento por confirmar',
    timeMs: row.time_ms,
    place: row.place,
    status: row.status,
    athlete: {
      id: row.athlete_id,
      name: athleteName,
      photoUrl: mediaUrl(row.athlete_photo_public_id, row.athlete_photo_external_url, { width: 160, height: 160, crop: 'fill', gravity: 'face' }),
      photoAlt: row.athlete_photo_alt || `Foto de ${athleteName}`,
      fallback: initials(athleteName),
    },
    club: {
      id: row.club_id,
      name: clubName,
      logoUrl: mediaUrl(row.club_logo_public_id, row.club_logo_external_url, { width: 96, height: 96, crop: 'pad', background: 'transparent' }),
      logoAlt: row.club_logo_alt || `Logo de ${clubName}`,
      fallback: initials(clubName, 'ASANDA'),
    },
  };
};

export const getPublishedResults = async (competitionId, signal) => {
  if (competitionId != null && (typeof competitionId !== 'string' || !competitionId.trim())) throw new Error('COMPETITION_REQUIRED');
  let query = supabase.rpc('get_published_result_rows', { requested_competition_id: competitionId || null });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizePublishedResult);
};
