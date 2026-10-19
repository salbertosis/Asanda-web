const ALIAS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const FINAL_STATUSES = new Set(['official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time']);
const ROUND_MAP = Object.freeze({ prelim: 'heat', swimoff: 'swim_off', swim_off: 'swim_off', heat: 'heat', semifinal: 'semifinal', final: 'final', timed_final: 'timed_final' });
const POOL_LENGTHS = Object.freeze({ '25M': 25, SCM: 25, S: 25, '50M': 50, LCM: 50, L: 50 });
const YARD_COURSES = new Set(['SCY', 'Y', '25Y', 'YARDS']);
const STROKES = new Set(['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley', 'open_water', 'other']);
const SEXES = new Set(['female', 'male', 'mixed', 'open']);
const FAILURE_MESSAGES = Object.freeze({
  'snapshot-metadata-incomplete': 'HY3 competition metadata is incomplete; provide explicit metadata before import.',
  'unsupported-course': 'Yard or unknown pool courses cannot be imported as metre competitions.',
  'provisional-result': 'Provisional HY3 results must be finalized before import.',
  'snapshot-missing-reference': 'HY3 snapshot records contain an unresolved reference.',
  'snapshot-duplicate-alias': 'HY3 snapshot aliases must be unique.',
  'snapshot-invalid-event': 'HY3 snapshot event metadata is invalid.',
  'snapshot-invalid-result': 'HY3 snapshot result data is invalid.',
});

const failure = (code) => ({ ok: false, code, diagnostics: [{ code, message: FAILURE_MESSAGES[code] }] });
const clean = (value) => String(value ?? '').replace(/[\u0000\r\n]/g, '').trim().replace(/\s+/g, ' ');
const isDate = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() + 1 === Number(match[2]) && date.getUTCDate() === Number(match[3]);
};
const optionalText = (value) => clean(value) || null;
const timeMs = (seconds) => seconds == null ? null : Math.round(Number(seconds) * 1000);
const validOptionalInteger = (value, maximum) => value === null || (Number.isInteger(value) && value >= 1 && value <= maximum);

function poolLength(pool) {
  const normalized = clean(pool).toUpperCase();
  if (!normalized) throw new Error('snapshot-metadata-incomplete');
  if (YARD_COURSES.has(normalized) || POOL_LENGTHS[normalized] === undefined) throw new Error('unsupported-course');
  return POOL_LENGTHS[normalized];
}

function dtoAliases(items, prefix) {
  const sourceAliases = new Set();
  const aliases = new Map();
  const reserved = new Set(items.map(({ sourceAlias }) => clean(sourceAlias)).filter((alias) => ALIAS_PATTERN.test(alias)));
  items.forEach((item, index) => {
    const sourceAlias = clean(item?.sourceAlias);
    if (!sourceAlias) throw new Error('snapshot-invalid-event');
    if (sourceAliases.has(sourceAlias)) throw new Error('snapshot-duplicate-alias');
    sourceAliases.add(sourceAlias);
    let alias = sourceAlias;
    if (!ALIAS_PATTERN.test(alias)) {
      let suffix = index + 1;
      do alias = `${prefix}-${suffix++}`; while (reserved.has(alias));
    }
    reserved.add(alias);
    aliases.set(sourceAlias, alias);
  });
  return aliases;
}

function normalizedRound(value) {
  return ROUND_MAP[clean(value).toLowerCase()] || null;
}

export function buildHy3SnapshotDto(preview) {
  try {
    if (!preview || typeof preview !== 'object') throw new Error('snapshot-metadata-incomplete');
    const name = clean(preview.meetName); const venue = clean(preview.venueName);
    const startsOn = clean(preview.competitionStartsOn); const endsOn = clean(preview.competitionEndsOn);
    if (!name || name.length > 200 || !venue || venue.length > 200 || !isDate(startsOn) || !isDate(endsOn) || endsOn < startsOn) throw new Error('snapshot-metadata-incomplete');
    if (![preview.events, preview.entries, preview.results, preview.relays, preview.athletes, preview.teams].every(Array.isArray)) throw new Error('snapshot-metadata-incomplete');
    if (preview.results.some(({ status }) => status === 'provisional') || preview.relays.some(({ status }) => status === 'provisional')) throw new Error('provisional-result');

    const eventAliases = dtoAliases(preview.events, 'HY3-EVENT');
    const resultAliases = dtoAliases([...preview.results, ...preview.relays], 'HY3-RESULT');
    const teams = new Map(preview.teams.map((team) => [clean(team.sourceAlias), clean(team.displayName)]));
    const athletes = new Map(preview.athletes.map((athlete) => [clean(athlete.sourceAlias), athlete]));
    const entries = new Map(preview.entries.map((entry) => [clean(entry.sourceAlias), entry]));
    if (teams.size !== preview.teams.length || athletes.size !== preview.athletes.length || entries.size !== preview.entries.length) throw new Error('snapshot-duplicate-alias');

    const events = preview.events.map((event) => {
      const alias = eventAliases.get(clean(event.sourceAlias)); const label = clean(event.displayName);
      const distanceMetres = Number(event.distanceMetres); const stroke = clean(event.stroke).toLowerCase();
      const sex = clean(event.sex).toLowerCase(); const round = normalizedRound(event.round);
      const category = optionalText(event.category);
      if (!label || label.length > 200 || !Number.isInteger(distanceMetres) || distanceMetres < 1 || distanceMetres > 100000 || !STROKES.has(stroke) || !SEXES.has(sex) || !round || (category && category.length > 120)) throw new Error('snapshot-invalid-event');
      return { alias, label, distanceMetres, stroke, sex, round, category };
    });

    const fallbackClubName = teams.size === 1 ? [...teams.values()][0] : null;
    const individualResults = preview.results.map((result) => {
      const entry = entries.get(clean(result.entryAlias));
      if (!entry || clean(entry.eventAlias) !== clean(result.eventAlias) || !eventAliases.has(clean(entry.eventAlias))) throw new Error('snapshot-missing-reference');
      const athlete = athletes.get(clean(entry.athleteAlias));
      if (!athlete) throw new Error('snapshot-missing-reference');
      const participantName = clean(athlete.displayName);
      const clubName = teams.get(clean(athlete.teamAlias)) || fallbackClubName;
      const status = clean(result.status); const place = status === 'official' ? result.place ?? null : null; const lane = result.lane ?? null;
      const normalizedTime = timeMs(result.timeSeconds);
      if (!participantName || participantName.length > 200 || !FINAL_STATUSES.has(status) || (status === 'official') !== (normalizedTime !== null) || !validOptionalInteger(normalizedTime, 864000000) || !validOptionalInteger(place, 100000) || !validOptionalInteger(lane, 1000)) throw new Error('snapshot-invalid-result');
      if (!clubName && teams.size > 1) throw new Error('snapshot-missing-reference');
      return {
        alias: resultAliases.get(clean(result.sourceAlias)), eventAlias: eventAliases.get(clean(result.eventAlias)), resultType: 'individual',
        participantName, clubName: clubName || null, place, timeMs: normalizedTime, lane, status,
      };
    });

    const relayResults = preview.relays.map((relay) => {
      const eventAlias = clean(relay.eventAlias); const teamName = teams.get(clean(relay.teamAlias));
      const status = clean(relay.status); const place = status === 'official' ? relay.place ?? null : null; const lane = relay.lane ?? null;
      const normalizedTime = timeMs(relay.timeSeconds);
      if (!eventAliases.has(eventAlias) || !teamName) throw new Error('snapshot-missing-reference');
      if (!FINAL_STATUSES.has(status) || (status === 'official') !== (normalizedTime !== null) || !validOptionalInteger(normalizedTime, 864000000) || !validOptionalInteger(place, 100000) || !validOptionalInteger(lane, 1000)) throw new Error('snapshot-invalid-result');
      return {
        alias: resultAliases.get(clean(relay.sourceAlias)), eventAlias: eventAliases.get(eventAlias), resultType: 'relay', teamName, clubName: teamName,
        relayMembers: [], place, timeMs: normalizedTime, lane, status,
      };
    });

    if (events.length === 0 || individualResults.length + relayResults.length === 0) throw new Error('snapshot-metadata-incomplete');
    return {
      ok: true,
      payload: {
        competition: { name, startsOn, endsOn, poolLengthMetres: poolLength(preview.pool), venue },
        events,
        results: [...individualResults, ...relayResults],
      },
    };
  } catch (error) {
    return failure(FAILURE_MESSAGES[error.message] ? error.message : 'snapshot-invalid-result');
  }
}
