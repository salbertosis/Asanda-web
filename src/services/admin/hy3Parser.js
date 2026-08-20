const RECORD_WIDTH = 192;
const LINE_WIDTH = RECORD_WIDTH + 1;
const SUPPORTED_VERSIONS = new Set(['HY3-8.0']);
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
