import { getCloudinaryUrl } from '../config/cloudinary.js';
import { supabase } from './supabase.js';

const clean = (value) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
const initials = (name) => clean(name).split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'AS';
const officialEvents = [
  '50 metros libre', '100 metros libre', '200 metros libre', '400 metros libre', '800 metros libre', '1500 metros libre',
  '50 metros espalda', '100 metros espalda', '200 metros espalda',
  '50 metros pecho', '100 metros pecho', '200 metros pecho',
  '50 metros mariposa', '100 metros mariposa', '200 metros mariposa',
  '200 metros combinado individual', '400 metros combinado individual',
];
const officialEventRank = new Map(officialEvents.map((name, index) => [name, index]));
const eventKey = (name) => clean(name).normalize('NFKC').toLocaleLowerCase('es');

const compareEvents = (a, b) => {
  const aRank = officialEventRank.get(eventKey(a.eventName)); const bRank = officialEventRank.get(eventKey(b.eventName));
  const rankDifference = (aRank ?? officialEvents.length) - (bRank ?? officialEvents.length);
  if (rankDifference) return rankDifference;
  if (aRank === undefined && bRank === undefined) { const nameDifference = a.eventName.localeCompare(b.eventName, 'es', { sensitivity: 'base' }); if (nameDifference) return nameDifference; }
  return a.timeMs - b.timeMs || a.id.localeCompare(b.id);
};

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
  return (Array.isArray(data) ? data : []).map(normalizeStateRecord).filter(Boolean).sort(compareEvents);
};
