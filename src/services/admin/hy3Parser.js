const RECORD_WIDTH = 192;
const LINE_WIDTH = RECORD_WIDTH + 1;
const SUPPORTED_VERSIONS = new Set(['HY3-8.0']);
const LEGACY_WIDTH = 130;
const LEGACY_LINE_WIDTH = 132;
const LEGACY_VERSIONS = new Set(['MM5 6.0Ea']);
const LEGACY_TYPES = new Set(['A1', 'B1', 'B2', 'C1', 'C2', 'C3', 'D1', 'E1', 'E2', 'F1', 'F2', 'F3', 'H1']);
const LEGACY_STROKES = Object.freeze({ A: 'freestyle', B: 'backstroke', C: 'breaststroke', D: 'butterfly', E: 'medley' });
const LEGACY_SEX = Object.freeze({ M: 'male', F: 'female' });
const LEGACY_EVENT_SEX = Object.freeze({ ...LEGACY_SEX, X: 'mixed' });
const LEGACY_ROUNDS = Object.freeze({ P: 'prelim', F: 'final', S: 'swimoff' });
const RECORD_TYPES = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'H']);
const FIELDS = Object.freeze({
  A: [['version', 1, 8], ['meet', 9, 40], ['date', 49, 10], ['venue', 59, 32], ['pool', 91, 8]],
  B: [['alias', 1, 16], ['name', 17, 40], ['country', 57, 2]],
  C: [['alias', 1, 16], ['display', 17, 40]],
  D: [['alias', 1, 16], ['label', 17, 40], ['distance', 57, 4], ['stroke', 61, 16], ['sex', 77, 5], ['round', 82, 8]],
  E: [['alias', 1, 16], ['athlete', 17, 16], ['event', 33, 16], ['seed', 49, 8]],
  F: [['alias', 1, 16], ['entry', 17, 16], ['time', 33, 8], ['status', 41, 16], ['place', 57, 4], ['note', 61, 100]],
  H: [['alias', 1, 16], ['team', 17, 16], ['event', 33, 16], ['legs', 49, 2], ['time', 51, 8], ['status', 59, 16], ['note', 75, 100]],
});

const STATUS = Object.freeze({
  official: 'official', provisional: 'provisional', disqualified: 'disqualified', dq: 'disqualified',
  dns: 'did_not_start', did_not_start: 'did_not_start', dnf: 'did_not_finish',
  did_not_finish: 'did_not_finish', no_time: 'no_time', notime: 'no_time',
});
const ERROR_MESSAGES = Object.freeze({
  'invalid-input': 'HY3 input is not a byte sequence.',
  'malformed-record': 'HY3 records do not match the supported fixed-width geometry.',
  'unsupported-record': 'HY3 contains an unsupported record type.',
  'unsupported-version': 'HY3 version is not supported.',
  'duplicate-record': 'HY3 contains a duplicate source record.',
  'missing-field': 'HY3 contains a required field without a value.',
  'missing-reference': 'HY3 contains a reference to an unknown source record.',
  'invalid-value': 'HY3 contains a value outside the supported contract.',
  'invalid-time': 'HY3 contains an invalid result time.',
  'invalid-csv': 'CSV fallback does not match the supported result columns.',
});

const failure = (code) => ({ ok: false, code, diagnostics: [{ code, message: ERROR_MESSAGES[code] || 'HY3 input was rejected.' }] });
const text = (value) => String(value ?? '').replace(/[\u0000\r\n]/g, '').trim().replace(/\s+/g, ' ');
const required = (value) => { const result = text(value); if (!result) throw new Error('missing-field'); return result; };
const safeDisplay = (value) => text(value).slice(0, 120);
const safeNote = (value) => {
  const note = text(value).slice(0, 200);
  if (!note) return '';
  return note
    .replace(/\b(?:identity|national[_ ]?id|birth(?:date|_date)?|address|phone|email|guardian)\s*[:=][^;|]+/gi, '')
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '')
    .replace(/\+?\d[\d ()-]{6,}\d/g, '')
    .trim();
};

function bytesOf(value) {
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  throw new Error('invalid-input');
}

function decoder() {
  if (typeof TextDecoder !== 'function') throw new Error('invalid-input');
  return new TextDecoder('windows-1252', { fatal: true });
}

function readFields(bytes, type) {
  const decode = decoder();
  return Object.fromEntries(FIELDS[type].map(([name, offset, width]) => [name, text(decode.decode(bytes.subarray(offset, offset + width)))]));
}

function parseTime(value) {
  const input = text(value);
  if (!input) return null;
  if (!/^(?:\d+(?:\.\d{1,3})?|\d{1,3}:\d{2}(?:\.\d{1,3})?|\d{1,2}:\d{2}:\d{2}(?:\.\d{1,3})?)$/.test(input)) throw new Error('invalid-time');
  const parts = input.split(':').map(Number);
  const seconds = parts.length === 1 ? parts[0] : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('invalid-time');
  return { timeText: input, timeSeconds: Number(seconds.toFixed(3)) };
}

function parseStatus(value) {
  const status = STATUS[text(value).toLowerCase()];
  if (!status) throw new Error('invalid-value');
  return status;
}

function parsePlace(value) {
  const place = text(value);
  if (!place) return null;
  if (!/^\d+$/.test(place) || Number(place) < 1) throw new Error('invalid-value');
  return Number(place);
}

function parseRecord(bytes) {
  const type = String.fromCharCode(bytes[0]);
  if (!RECORD_TYPES.has(type)) throw new Error('unsupported-record');
  return { type, fields: readFields(bytes, type) };
}

function unique(records, type, key = 'alias') {
  const seen = new Set();
  for (const record of records.filter((item) => item.type === type)) {
    const value = required(record.fields[key]);
    if (seen.has(value)) throw new Error('duplicate-record');
    seen.add(value);
  }
}

async function checksum(bytes) {
  if (!globalThis.crypto?.subtle) return null;
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const legacyField = (line, start, width) =>
  text(line.slice(start - 1, start - 1 + width));
const legacyAlias = (kind, value) => `MM5-${kind}-${required(value)}`;
function legacyTime(value, requiredTime = false) {
  const normalized = text(value).replace(",", ".");
  if (!normalized || normalized === "0.00") {
    if (requiredTime) throw new Error("invalid-time");
    return null;
  }
  if (!/^\d+(?:\.\d{1,2})$/.test(normalized)) throw new Error("invalid-time");
  const seconds = Number(normalized);
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error("invalid-time");
  return { timeText: normalized, timeSeconds: Number(seconds.toFixed(2)) };
}
function legacyStatus(code) {
  const status = { '': 'official', Q: 'disqualified', F: 'disqualified', D: 'did_not_finish', R: 'did_not_start', S: 'did_not_start' }[text(code)];
  if (!status) throw new Error("invalid-value");
  return status;
}
function legacyPlace(value) {
  const place = required(value);
  if (!/^\d{1,4}$/.test(place)) throw new Error("invalid-value");
  return Number(place) || null;
}
function legacyResultFields(line) {
  const round = LEGACY_ROUNDS[required(legacyField(line, 3, 1))];
  if (!round) throw new Error("invalid-value");
  const status = legacyStatus(legacyField(line, 13, 1));
  const time = legacyTime(legacyField(line, 4, 8), status === "official");
  if (status !== "official" && time) throw new Error("invalid-time");
  return { round, status, time, place: legacyPlace(legacyField(line, 30, 4)) };
}
function addLegacyEvent(events, eventIndex, fields, round, relay) {
  const distance = required(fields.distance);
  const stroke = LEGACY_STROKES[required(fields.stroke)];
  const sex = LEGACY_EVENT_SEX[required(fields.gender)];
  if (!/^\d{1,6}$/.test(distance) || Number(distance) < 1 || !stroke || !sex || !round) throw new Error('invalid-value');
  const number = required(fields.eventNumber);
  if (!/^[A-Z0-9]{1,4}$/i.test(number)) throw new Error('invalid-value');
  const sourceAlias = legacyAlias(relay ? 'RELAY-EVENT' : 'EVENT', `${number}-${sex}-${distance}-${stroke}-${round}`);
  if (!eventIndex.has(sourceAlias)) {
    const event = { sourceAlias, displayName: `Evento ${number}`, distanceMetres: Number(distance), stroke, sex, round };
    eventIndex.set(sourceAlias, event);
    events.push(event);
  }
  return sourceAlias;
}
async function parseLegacyHy3(bytes) {
  if (!bytes.byteLength || bytes.byteLength % LEGACY_LINE_WIDTH !== 0)
    throw new Error("malformed-record");
  const decode = decoder();
  const records = [];
  for (let offset = 0; offset < bytes.byteLength; offset += LEGACY_LINE_WIDTH) {
    const payload = bytes.subarray(offset, offset + LEGACY_WIDTH);
    if (bytes[offset + LEGACY_WIDTH] !== 0x0d || bytes[offset + LEGACY_WIDTH + 1] !== 0x0a || payload.some((byte) => byte < 0x20)) throw new Error('malformed-record');
    const line = decode.decode(payload);
    const type = line.slice(0, 2);
    if (!LEGACY_TYPES.has(type)) throw new Error("unsupported-record");
    records.push({ type, line });
  }
  if (records[0]?.type !== 'A1' || records[1]?.type !== 'B1' || records[2]?.type !== 'B2' || records.filter(({ type }) => ['A1', 'B1', 'B2'].includes(type)).length !== 3) throw new Error('malformed-record');
  const version = required(legacyField(records[0].line, 45, 10));
  if (
    legacyField(records[0].line, 30, 15) !== "Hy-Tek, Ltd" ||
    !LEGACY_VERSIONS.has(version)
  )
    throw new Error("unsupported-version");
  const meetName = required(legacyField(records[1].line, 3, 45));
  const venueName = required(legacyField(records[1].line, 48, 45));
  for (const start of [93, 101])
    if (!/^\d{8}$/.test(legacyField(records[1].line, start, 8)))
      throw new Error("invalid-value");
  const poolCode = required(legacyField(records[2].line, 99, 1));
  if (!["L", "S", "Y"].includes(poolCode)) throw new Error("invalid-value");
  const teams = []; const athletes = []; const events = []; const entries = []; const results = []; const relays = [];
  const teamIndex = new Set(); const athleteIndex = new Set(); const eventIndex = new Map(); const entryIndex = new Set(); const relayIndex = new Set();
  let currentTeam = null; let pendingEntry = null; let pendingRelay = null; let previous = 'B2'; let lastStatus = null;
  for (const { type, line } of records.slice(3)) {
    if (type === "C1") {
      const code = required(legacyField(line, 3, 5));
      if (!/^[A-Z0-9-]{1,5}$/i.test(code)) throw new Error("invalid-value");
      currentTeam = legacyAlias("TEAM", code);
      if (teamIndex.has(currentTeam)) throw new Error("duplicate-record");
      teamIndex.add(currentTeam);
      teams.push({
        sourceAlias: currentTeam,
        displayName: safeDisplay(required(legacyField(line, 8, 30))),
        countryCode: "",
      });
    } else if (type === "C2") {
      if (previous !== "C1") throw new Error("malformed-record");
    } else if (type === "C3") {
      if (previous !== "C2") throw new Error("malformed-record");
    } else if (type === "D1") {
      if (!currentTeam) throw new Error("missing-reference");
      const meetId = required(legacyField(line, 4, 5));
      if (
        !/^\d{1,5}$/.test(meetId) ||
        !LEGACY_SEX[required(legacyField(line, 3, 1))]
      )
        throw new Error("invalid-value");
      const sourceAlias = legacyAlias("ATHLETE", meetId);
      if (athleteIndex.has(sourceAlias)) throw new Error("duplicate-record");
      athleteIndex.add(sourceAlias);
      athletes.push({
        sourceAlias,
        displayName: safeDisplay(
          `${required(legacyField(line, 29, 20))} ${required(legacyField(line, 9, 20))}`,
        ),
      });
    } else if (type === "E1") {
      if (pendingEntry || pendingRelay) throw new Error("malformed-record");
      const athleteAlias = legacyAlias("ATHLETE", legacyField(line, 4, 5));
      if (!athleteIndex.has(athleteAlias)) throw new Error("missing-reference");
      pendingEntry = {
        athleteAlias,
        gender: legacyField(line, 14, 1),
        distance: legacyField(line, 16, 6),
        stroke: legacyField(line, 22, 1),
        eventNumber: legacyField(line, 39, 4),
        seed: legacyTime(legacyField(line, 52, 8)),
      };
    } else if (type === "E2") {
      if (previous !== "E1" || !pendingEntry)
        throw new Error("malformed-record");
      const resultFields = legacyResultFields(line);
      const eventAlias = addLegacyEvent(
        events,
        eventIndex,
        pendingEntry,
        resultFields.round,
        false,
      );
      const sourceAlias = legacyAlias(
        "ENTRY",
        `${pendingEntry.athleteAlias.slice(4)}-${eventAlias.slice(4)}`,
      );
      if (entryIndex.has(sourceAlias)) throw new Error("duplicate-record");
      entryIndex.add(sourceAlias);
      entries.push({
        sourceAlias,
        athleteAlias: pendingEntry.athleteAlias,
        eventAlias,
        seedTimeText: pendingEntry.seed?.timeText || null,
        seedTimeSeconds: pendingEntry.seed?.timeSeconds ?? null,
      });
      results.push({
        sourceAlias: legacyAlias(
          "RESULT",
          `${sourceAlias.slice(4)}-${resultFields.round}`,
        ),
        entryAlias: sourceAlias,
        athleteAlias: pendingEntry.athleteAlias,
        eventAlias,
        timeText: resultFields.time?.timeText || null,
        timeSeconds: resultFields.time?.timeSeconds ?? null,
        status: resultFields.status,
        place: resultFields.place,
        note: "",
      });
      pendingEntry = null;
      lastStatus = resultFields.status;
    } else if (type === "F1") {
      if (pendingEntry || pendingRelay) throw new Error("malformed-record");
      const teamAlias = legacyAlias("TEAM", legacyField(line, 3, 5));
      if (!teamIndex.has(teamAlias)) throw new Error("missing-reference");
      pendingRelay = {
        teamAlias,
        relayTeam: required(legacyField(line, 8, 1)),
        gender: legacyField(line, 14, 1),
        distance: legacyField(line, 16, 6),
        stroke: legacyField(line, 22, 1),
        eventNumber: legacyField(line, 39, 4),
      };
    } else if (type === "F2") {
      if (previous !== "F1" || !pendingRelay)
        throw new Error("malformed-record");
      const resultFields = legacyResultFields(line);
      pendingRelay.eventAlias = addLegacyEvent(
        events,
        eventIndex,
        pendingRelay,
        resultFields.round,
        true,
      );
      Object.assign(pendingRelay, resultFields);
      lastStatus = pendingRelay.status;
    } else if (type === "F3") {
      if (!["F2", "H1"].includes(previous) || !pendingRelay?.eventAlias)
        throw new Error("malformed-record");
      let legs = 0;
      for (let index = 0; index < 8; index += 1) {
        const id = legacyField(line, 4 + index * 13, 5);
        if (!id) break;
        if (!athleteIndex.has(legacyAlias("ATHLETE", id)))
          throw new Error("missing-reference");
        legs += 1;
      }
      if (legs < 2) throw new Error("invalid-value");
      const sourceAlias = legacyAlias(
        "RELAY",
        `${pendingRelay.teamAlias.slice(4)}-${pendingRelay.eventAlias.slice(4)}-${pendingRelay.relayTeam}`,
      );
      if (relayIndex.has(sourceAlias)) throw new Error("duplicate-record");
      relayIndex.add(sourceAlias);
      relays.push({
        sourceAlias,
        teamAlias: pendingRelay.teamAlias,
        eventAlias: pendingRelay.eventAlias,
        legs,
        timeText: pendingRelay.time?.timeText || null,
        timeSeconds: pendingRelay.time?.timeSeconds ?? null,
        status: pendingRelay.status,
        note: "",
      });
      pendingRelay = null;
    } else if (type === "H1") {
      if (!["E2", "F2"].includes(previous) || lastStatus !== "disqualified")
        throw new Error("malformed-record");
    }
    previous = type;
  }
  if (pendingEntry || pendingRelay) throw new Error("malformed-record");
  const recordCounts = records.reduce(
    (counts, { type }) => ({ ...counts, [type]: (counts[type] || 0) + 1 }),
    {},
  );
  return {
    ok: true,
    checksum: await checksum(bytes),
    preview: {
      version,
      recordCounts,
      meetName: safeDisplay(meetName),
      venueName: safeDisplay(venueName),
      pool: { L: "LCM", S: "SCM", Y: "SCY" }[poolCode],
      teams,
      athletes,
      events,
      entries,
      results,
      relays,
      diagnostics: [],
    },
  };
}

function csvLine(line) {
  const cells = []; let cell = ''; let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) { cell += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === ',' && !quoted) { cells.push(text(cell)); cell = ''; }
    else cell += character;
  }
  if (quoted) throw new Error('invalid-csv');
  cells.push(text(cell));
  return cells;
}

export function parseCsvFallback(value) {
  try {
    if (typeof value !== 'string') throw new Error('invalid-csv');
    const lines = value.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) throw new Error('invalid-csv');
    const headers = csvLine(lines[0]).map((header) => header.toLowerCase());
    const requiredHeaders = ['athlete_alias', 'event_alias', 'time', 'status'];
    if (headers.some((header) => /email|phone|address|birth|identity|national|guardian|password|secret/i.test(header)) || requiredHeaders.some((header) => !headers.includes(header))) throw new Error('invalid-csv');
    const rows = lines.slice(1).map((line) => { const cells = csvLine(line); if (cells.length !== headers.length) throw new Error('invalid-csv'); return Object.fromEntries(cells.map((cell, index) => [headers[index], cell])); });
    if (rows.some((row) => Object.values(row).some((cell) => /(?:email|phone|address|birth|identity|national|guardian|password|secret)|https?:\/\//i.test(cell)))) throw new Error('invalid-csv');
    const results = rows.map((row, index) => ({ sourceAlias: `CSV-RESULT-${index + 1}`, entryAlias: `CSV-ENTRY-${index + 1}`, athleteAlias: safeDisplay(row.athlete_alias), eventAlias: safeDisplay(row.event_alias), ...(parseTime(row.time) || { timeText: null, timeSeconds: null }), status: parseStatus(row.status), place: parsePlace(row.place), note: safeNote(row.note) }));
    const athletes = [...new Set(results.map(({ athleteAlias }) => athleteAlias))].map((sourceAlias) => ({ sourceAlias, displayName: sourceAlias }));
    const events = [...new Set(results.map(({ eventAlias }) => eventAlias))].map((sourceAlias) => ({ sourceAlias, displayName: sourceAlias, distanceMetres: 0, stroke: '', sex: '', round: '' }));
    const entries = results.map(({ entryAlias, athleteAlias, eventAlias }) => ({ sourceAlias: entryAlias, athleteAlias, eventAlias, seedTimeText: null, seedTimeSeconds: null }));
    const teams = [...new Set(rows.map((row) => safeDisplay(row.team_alias)).filter(Boolean))].map((sourceAlias) => ({ sourceAlias, displayName: sourceAlias, countryCode: '' }));
    return { ok: true, preview: { version: 'CSV-1', meetName: 'CSV fallback', teams, athletes, events, entries, results, relays: [], diagnostics: [] }, checksum: null };
  } catch (error) { return failure(error.message === 'invalid-csv' ? 'invalid-csv' : error.message); }
}

export async function parseHy3(value) {
  try {
    const bytes = bytesOf(value);
    if (bytes[0] === 0x41 && bytes[1] === 0x31) return await parseLegacyHy3(bytes);
    if (bytes.byteLength === 0 || bytes.byteLength % LINE_WIDTH !== 0) throw new Error('malformed-record');
    const records = [];
    for (let offset = 0; offset < bytes.byteLength; offset += LINE_WIDTH) {
      if (bytes[offset + RECORD_WIDTH] !== 0x0a) throw new Error('malformed-record');
      records.push(parseRecord(bytes.subarray(offset, offset + RECORD_WIDTH)));
    }
    if (records[0]?.type !== 'A' || records.filter((record) => record.type === 'A').length !== 1) throw new Error('malformed-record');
    const header = records[0].fields;
    if (!SUPPORTED_VERSIONS.has(required(header.version))) throw new Error('unsupported-version');
    required(header.meet); required(header.venue); required(header.pool);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(header.date)) throw new Error('invalid-value');
    for (const type of ['B', 'C', 'D', 'E', 'F', 'H']) unique(records, type);
    const teams = records.filter(({ type }) => type === 'B').map(({ fields }) => ({ sourceAlias: required(fields.alias), displayName: safeDisplay(fields.name), countryCode: required(fields.country).toUpperCase() }));
    const athletes = records.filter(({ type }) => type === 'C').map(({ fields }) => ({ sourceAlias: required(fields.alias), displayName: safeDisplay(fields.display) }));
    const events = records.filter(({ type }) => type === 'D').map(({ fields }) => {
      const distance = required(fields.distance); if (!/^\d+$/.test(distance) || Number(distance) < 1) throw new Error('invalid-value');
      return { sourceAlias: required(fields.alias), displayName: safeDisplay(fields.label), distanceMetres: Number(distance), stroke: required(fields.stroke).toLowerCase(), sex: required(fields.sex).toLowerCase(), round: required(fields.round).toLowerCase() };
    });
    const entryRecords = records.filter(({ type }) => type === 'E');
    const athleteAliases = new Set(athletes.map(({ sourceAlias }) => sourceAlias));
    const eventAliases = new Set(events.map(({ sourceAlias }) => sourceAlias));
    const entryAliases = new Set();
    const entries = entryRecords.map(({ fields }) => {
      const sourceAlias = required(fields.alias); if (entryAliases.has(sourceAlias)) throw new Error('duplicate-record'); entryAliases.add(sourceAlias);
      if (!athleteAliases.has(required(fields.athlete)) || !eventAliases.has(required(fields.event))) throw new Error('missing-reference');
      const seed = parseTime(fields.seed);
      return { sourceAlias, athleteAlias: fields.athlete, eventAlias: fields.event, seedTimeText: seed?.timeText || null, seedTimeSeconds: seed?.timeSeconds ?? null };
    });
    const entryByAlias = new Map(entries.map((entry) => [entry.sourceAlias, entry]));
    const resultAliases = new Set();
    const results = records.filter(({ type }) => type === 'F').map(({ fields }) => {
      const sourceAlias = required(fields.alias); if (resultAliases.has(sourceAlias)) throw new Error('duplicate-record'); resultAliases.add(sourceAlias);
      const entry = entryByAlias.get(required(fields.entry)); if (!entry) throw new Error('missing-reference');
      const status = parseStatus(fields.status); const parsedTime = parseTime(fields.time);
      if ((status === 'official' || status === 'provisional') && !parsedTime) throw new Error('invalid-time');
      if (status !== 'official' && status !== 'provisional' && parsedTime) throw new Error('invalid-time');
      return { sourceAlias, entryAlias: entry.sourceAlias, athleteAlias: entry.athleteAlias, eventAlias: entry.eventAlias, timeText: parsedTime?.timeText || null, timeSeconds: parsedTime?.timeSeconds ?? null, status, place: parsePlace(fields.place), note: safeNote(fields.note) };
    });
    const relays = records.filter(({ type }) => type === 'H').map(({ fields }) => {
      const teamAlias = required(fields.team); const eventAlias = required(fields.event); if (!teams.some(({ sourceAlias }) => sourceAlias === teamAlias) || !eventAliases.has(eventAlias)) throw new Error('missing-reference');
      const legs = required(fields.legs); if (!/^\d+$/.test(legs) || Number(legs) < 2) throw new Error('invalid-value');
      const status = parseStatus(fields.status); const parsedTime = parseTime(fields.time); if ((status === 'official' || status === 'provisional') !== Boolean(parsedTime)) throw new Error('invalid-time');
      return { sourceAlias: required(fields.alias), teamAlias, eventAlias, legs: Number(legs), timeText: parsedTime?.timeText || null, timeSeconds: parsedTime?.timeSeconds ?? null, status, note: safeNote(fields.note) };
    });
    const recordCounts = records.reduce((counts, record) => ({ ...counts, [record.type]: (counts[record.type] || 0) + 1 }), {});
    return { ok: true, checksum: await checksum(bytes), preview: { version: header.version, recordCounts, meetName: safeDisplay(header.meet), venueName: safeDisplay(header.venue), pool: safeDisplay(header.pool), teams, athletes, events, entries, results, relays, diagnostics: [] } };
  } catch (error) { return failure(ERROR_MESSAGES[error.message] ? error.message : 'malformed-record'); }
}

export { RECORD_WIDTH, SUPPORTED_VERSIONS };
