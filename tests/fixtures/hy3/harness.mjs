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
]);
export const RECORD_WIDTH = 192;
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
    if (!/^[A-Z]$/.test(type)) throw new Error(`${filename}:${index + 1}: invalid record type`);
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
  const bytes = Buffer.alloc(RECORD_WIDTH, 0x20);
  bytes[0] = record.type.charCodeAt(0);
  for (const [name, offset, width] of FIELD_LAYOUTS[record.type] || []) {
    writeField(bytes, offset, width, record.fields[name]);
  }
  return bytes;
}
export async function loadFixture(filename) {
  const path = `${FIXTURE_DIR}/${filename}`;
  const manifest = await readFile(path, 'utf8');
  const records = parseManifest(manifest, filename);
  const bytes = Buffer.concat(records.flatMap((record) => [encodeRecord(record), Buffer.from('\n')]));
  return { filename, manifest, records, bytes };
}
export function recordCounts(records) {
  return records.reduce((counts, record) => {
    if (record.type !== 'RAW') counts[record.type] = (counts[record.type] || 0) + 1;
    return counts;
  }, {});
}
