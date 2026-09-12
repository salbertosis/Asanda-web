import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';
export const FIXTURE_DIR = dirname(fileURLToPath(import.meta.url));
export const FIXTURE_NAMES = Object.freeze([
  'synthetic-supported.hy3',
  'synthetic-windows-1252.hy3',
  'synthetic-unsupported-version.hy3',
  'synthetic-malformed-record.hy3',
  'synthetic-legacy-mm5.hy3',
]);
export const RECORD_WIDTH = 192;
export const LEGACY_RECORD_WIDTH = 130;
export const SUPPORTED_RECORD_TYPES = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'H']);
export const FIELD_LAYOUTS = Object.freeze({
  A: [['version', 1, 8], ['meet', 9, 40], ['date', 49, 10], ['venue', 59, 32], ['pool', 91, 8]],
  B: [['alias', 1, 16], ['name', 17, 40], ['country', 57, 2]],
  C: [['alias', 1, 16], ['display', 17, 40], ['private', 57, 130]],
  D: [['alias', 1, 16], ['label', 17, 40], ['distance', 57, 4], ['stroke', 61, 16], ['sex', 77, 5], ['round', 82, 8]],
  E: [['alias', 1, 16], ['athlete', 17, 16], ['event', 33, 16], ['seed', 49, 8]],
  F: [['alias', 1, 16], ['entry', 17, 16], ['time', 33, 8], ['status', 41, 16], ['place', 57, 4], ['note', 61, 100]],
  H: [['alias', 1, 16], ['team', 17, 16], ['event', 33, 16], ['legs', 49, 2], ['time', 51, 8], ['status', 59, 16], ['note', 75, 100]],
});
const LEGACY_FIELD_LAYOUTS = Object.freeze({
  A1: [['description', 4, 25], ['software', 29, 15], ['version', 44, 10], ['created', 58, 17], ['private', 75, 53]],
  B1: [['meet', 2, 45], ['venue', 47, 45], ['startDate', 92, 8], ['endDate', 100, 8]],
  B2: [['note', 2, 45], ['meetType', 96, 2], ['course', 98, 1]],
  C1: [['teamCode', 2, 5], ['name', 7, 30], ['shortName', 37, 16], ['region', 53, 2], ['private', 55, 60]],
  D1: [['sex', 2, 1], ['meetId', 3, 5], ['lastName', 8, 20], ['firstName', 28, 20], ['identity', 69, 14], ['birthDate', 88, 8], ['age', 96, 3]],
  E1: [['athlete', 3, 5], ['gender', 13, 1], ['genderAge', 14, 1], ['distance', 15, 6], ['stroke', 21, 1], ['ageMin', 22, 3], ['ageMax', 25, 3], ['eventNumber', 38, 4], ['convertedSeed', 42, 8], ['course', 50, 1], ['seed', 51, 8], ['seedCourse', 59, 1]],
  E2: [['round', 2, 1], ['time', 3, 8], ['course', 11, 1], ['status', 12, 1], ['heat', 20, 3], ['lane', 23, 3], ['heatPlace', 26, 3], ['place', 29, 4]],
});
const CP1252_SPECIALS = new Map([
  ['€', 0x80], ['‚', 0x82], ['ƒ', 0x83], ['„', 0x84], ['…', 0x85], ['†', 0x86], ['‡', 0x87],
  ['ˆ', 0x88], ['‰', 0x89], ['Š', 0x8a], ['‹', 0x8b], ['Œ', 0x8c], ['Ž', 0x8e], ['‘', 0x91],
  ['’', 0x92], ['“', 0x93], ['”', 0x94], ['•', 0x95], ['–', 0x96], ['—', 0x97], ['˜', 0x98],
  ['™', 0x99], ['š', 0x9a], ['›', 0x9b], ['œ', 0x9c], ['ž', 0x9e], ['Ÿ', 0x9f],
]);
export function expandByteEscapes(value) {
  return value.replace(/\\x([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
}

export function encodeWindows1252(value) {
  const bytes = [];
  for (const character of expandByteEscapes(value)) {
    const code = character.codePointAt(0);
    if (code <= 0xff) {
      bytes.push(code);
      continue;
    }
    const mapped = CP1252_SPECIALS.get(character);
    if (mapped === undefined) throw new Error(`Unsupported Windows-1252 fixture character: ${character}`);
    bytes.push(mapped);
  }
  return Buffer.from(bytes);
}

export function decodeWindows1252(bytes) {
  return new TextDecoder('windows-1252', { fatal: true }).decode(bytes);
}
function parseFields(parts) {
  return Object.fromEntries(parts.map((part) => {
    const separator = part.indexOf('=');
    if (separator < 1) throw new Error(`Malformed synthetic field: ${part}`);
    return [part.slice(0, separator), part.slice(separator + 1)];
  }));
}
export function parseManifest(text, filename = 'inline.hy3') {
  const records = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim() || line.startsWith('#')) continue;
    const parts = line.split('|');
    const type = parts.shift();
    if (type === 'RAW') {
      const fields = parseFields(parts);
      if (!/^[0-9a-f]+$/i.test(fields.hex || '') || (fields.hex.length % 2) !== 0) {
        throw new Error(`${filename}:${index + 1}: malformed RAW hex`);
      }
      records.push({ type: 'RAW', raw: Buffer.from(fields.hex, 'hex'), fields, line });
      continue;
    }
    if (!/^[A-Z](?:\d)?$/.test(type)) throw new Error(`${filename}:${index + 1}: invalid record type`);
    records.push({ type, fields: parseFields(parts), line });
  }
  return records;
}
function writeField(bytes, offset, width, value = '') {
  const encoded = encodeWindows1252(value);
  if (encoded.length > width) throw new Error(`Fixture field exceeds ${width} bytes at offset ${offset}`);
  encoded.copy(bytes, offset);
}
export function encodeRecord(record) {
  if (record.raw) return Buffer.from(record.raw);
  const legacy = record.type.length === 2;
  const bytes = Buffer.alloc(legacy ? LEGACY_RECORD_WIDTH : RECORD_WIDTH, 0x20);
  bytes.write(record.type, 0, 'ascii');
  for (const [name, offset, width] of (legacy ? LEGACY_FIELD_LAYOUTS : FIELD_LAYOUTS)[record.type] || []) {
    writeField(bytes, offset, width, record.fields[name]);
  }
  return bytes;
}
export async function loadFixture(filename) {
  const path = `${FIXTURE_DIR}/${filename}`;
  const manifest = await readFile(path, 'utf8');
  const records = parseManifest(manifest, filename);
  const legacy = records.some(({ type }) => type.length === 2);
  const bytes = Buffer.concat(records.flatMap((record) => [encodeRecord(record), Buffer.from(legacy ? '\r\n' : '\n')]));
  return { filename, manifest, records, bytes };
}
export function recordCounts(records) {
  return records.reduce((counts, record) => {
    if (record.type !== 'RAW') counts[record.type] = (counts[record.type] || 0) + 1;
    return counts;
  }, {});
}
