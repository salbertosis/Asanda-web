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

const PUBLIC_RESULT_STATUSES = new Set(['official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time']);
const isoDay = /^\d{4}-\d{2}-\d{2}$/;
const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;
const integer = (value, minimum = 0) => Number.isInteger(value) && value >= minimum ? value : null;
const validDay = (value) => {
  if (!isoDay.test(value || '')) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
};

export const normalizePublicCompetitionResult = (row = {}) => {
  const status = text(row.status);
  const required = {
    resultId: text(row.result_id),
    competitionId: text(row.competition_id),
    competitionName: text(row.competition_name),
    startsOn: validDay(row.competition_starts_on),
    competitionEventId: text(row.competition_event_id),
    eventDefinitionId: text(row.event_definition_id),
    eventName: text(row.event_name),
    athleteId: text(row.athlete_id),
    athleteName: text(row.athlete_name),
  };
  if (!PUBLIC_RESULT_STATUSES.has(status) || Object.values(required).some((value) => !value)) return null;

  const timeMs = integer(row.time_ms);
  if (status === 'official' && timeMs == null) return null;
  const athleteName = required.athleteName;
  const clubName = text(row.club_name);
  return {
    id: required.resultId,
    status,
    timeMs,
    place: integer(row.place, 1),
    lane: integer(row.lane, 1),
    competition: {
      id: required.competitionId,
      name: required.competitionName,
      startsOn: required.startsOn,
      endsOn: validDay(row.competition_ends_on),
    },
    event: {
      id: required.competitionEventId,
      definitionId: required.eventDefinitionId,
      code: text(row.event_definition_code),
      name: required.eventName,
      categoryId: text(row.event_category_id),
      categoryName: text(row.event_category_name),
      competitiveSex: text(row.competitive_sex),
      round: text(row.round),
      sequenceNumber: integer(row.sequence_number),
      scheduledAt: text(row.scheduled_at),
    },
    athlete: {
      id: required.athleteId,
      name: athleteName,
      photoUrl: mediaUrl(row.athlete_photo_public_id, row.athlete_photo_external_url, { width: 160, height: 160, crop: 'fill', gravity: 'face' }),
      photoAlt: text(row.athlete_photo_alt),
      fallback: initials(athleteName),
    },
    club: {
      id: text(row.club_id),
      name: clubName,
      logoUrl: mediaUrl(row.club_logo_public_id, row.club_logo_external_url, { width: 96, height: 96, crop: 'pad', background: 'transparent' }),
      logoAlt: text(row.club_logo_alt),
      fallback: clubName ? initials(clubName, 'ASANDA') : null,
    },
  };
};

const compareNullableNumbers = (left, right) => (left ?? Number.MAX_SAFE_INTEGER) - (right ?? Number.MAX_SAFE_INTEGER);
const eventGroupKey = (result) => JSON.stringify([
  result.event.definitionId,
  result.event.categoryId,
  result.event.categoryName,
  result.event.competitiveSex,
]);

export const groupPublicCompetitionResults = (results = []) => {
  const competitions = new Map();
  for (const result of results) {
    if (!result?.competition?.id || !result?.event?.id || !result?.id) continue;
    let competition = competitions.get(result.competition.id);
    if (!competition) {
      competition = { ...result.competition, events: [], eventMap: new Map() };
      competitions.set(result.competition.id, competition);
    }
    const groupKey = eventGroupKey(result);
    let event = competition.eventMap.get(groupKey);
    if (!event) {
      event = {
        id: groupKey,
        definitionId: result.event.definitionId,
        name: result.event.name,
        categoryId: result.event.categoryId,
        categoryName: result.event.categoryName,
        competitiveSex: result.event.competitiveSex,
        sequenceNumber: result.event.sequenceNumber,
        phases: [],
        phaseMap: new Map(),
      };
      competition.eventMap.set(groupKey, event);
      competition.events.push(event);
    }
    let phase = event.phaseMap.get(result.event.id);
    if (!phase) {
      phase = {
        id: result.event.id,
        round: result.event.round,
        sequenceNumber: result.event.sequenceNumber,
        scheduledAt: result.event.scheduledAt,
        results: [],
      };
      event.phaseMap.set(result.event.id, phase);
      event.phases.push(phase);
    }
    phase.results.push(result);
  }

  return [...competitions.values()]
    .sort((left, right) => right.startsOn.localeCompare(left.startsOn) || left.name.localeCompare(right.name, 'es'))
    .map(({ eventMap, ...competition }) => ({
      ...competition,
      events: competition.events
        .sort((left, right) => compareNullableNumbers(left.sequenceNumber, right.sequenceNumber) || left.name.localeCompare(right.name, 'es'))
        .map(({ phaseMap, ...event }) => ({
          ...event,
          phases: event.phases
            .sort((left, right) => compareNullableNumbers(left.sequenceNumber, right.sequenceNumber) || (left.scheduledAt || '').localeCompare(right.scheduledAt || '') || left.id.localeCompare(right.id))
            .map((phase) => ({
              ...phase,
              results: phase.results.sort((left, right) => compareNullableNumbers(left.place, right.place) || left.athlete.name.localeCompare(right.athlete.name, 'es')),
            })),
        })),
    }));
};

export const getPublicCompetitionResults = async (competitionId = null, signal) => {
  if (competitionId != null && (typeof competitionId !== 'string' || !competitionId.trim())) throw new Error('COMPETITION_REQUIRED');
  let query = supabase.rpc('get_public_competition_result_rows', { requested_competition_id: competitionId || null });
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw error;
  return (Array.isArray(data) ? data : []).map(normalizePublicCompetitionResult).filter(Boolean);
};
