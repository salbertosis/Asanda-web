import { getCloudinaryUrl } from '../config/cloudinary.js';
import { supabase } from './supabase.js';

const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const initials = (name) => clean(name).split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AS';

export const formatStateRecordTime = (milliseconds) => {
  const hundredths = Math.floor(Number(milliseconds) / 10);
  const minutes = Math.floor(hundredths / 6000);
  const seconds = Math.floor(hundredths / 100) % 60;
  return `${minutes ? `${minutes}:${String(seconds).padStart(2, '0')}` : seconds}.${String(hundredths % 100).padStart(2, '0')}`;
};

export const normalizeStateRecord = (row = {}) => {
  const id = clean(row.record_id); const athleteName = clean(row.athlete_name); const clubName = clean(row.club_name);
  const eventName = clean(row.event_name); const categoryName = clean(row.category_name); const competitionName = clean(row.competition_name);
  const timeMs = Number(row.time_ms); const achievedYear = Number(row.achieved_year); const sex = row.competitive_sex;
  if (!id || !athleteName || !clubName || !eventName || !categoryName || !competitionName || !['female', 'male'].includes(sex) || !Number.isSafeInteger(timeMs) || timeMs <= 0 || !Number.isInteger(achievedYear) || achievedYear <= 0) return null;
  const photoId = clean(row.athlete_photo_public_id); const photoAlt = clean(row.athlete_photo_alt);
  return { id, athleteId: clean(row.athlete_id) || null, athleteName, clubName, eventName, categoryName, sex, timeMs, achievedYear, competitionName, photoUrl: photoId && photoAlt ? getCloudinaryUrl(photoId, { width: 160, height: 160, crop: 'fill', gravity: 'face' }) : null, photoAlt: photoId && photoAlt ? photoAlt : '', fallback: initials(athleteName) };
};

export const getPublishedStateRecords = async (signal) => {
  let query = supabase.rpc('get_published_state_records');
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizeStateRecord).filter(Boolean).sort((a, b) => a.eventName.localeCompare(b.eventName, 'es', { sensitivity: 'base' }) || a.timeMs - b.timeMs || a.id.localeCompare(b.id));
};
