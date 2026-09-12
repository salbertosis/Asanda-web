import assert from 'node:assert/strict';
import { FIXTURE_NAMES, RECORD_WIDTH, SUPPORTED_RECORD_TYPES, decodeWindows1252, encodeRecord, loadFixture, recordCounts } from '../tests/fixtures/hy3/harness.mjs';
let fixtures;
try {
  fixtures = Object.fromEntries(await Promise.all(FIXTURE_NAMES.map(async (name) => [name, await loadFixture(name)])));
} catch (error) {
  console.error(`FIXTURE INFRASTRUCTURE FAILURE: ${error.message}`);
  process.exit(1);
}
const supported = fixtures['synthetic-supported.hy3'];
const cp1252 = fixtures['synthetic-windows-1252.hy3'];
const unsupported = fixtures['synthetic-unsupported-version.hy3'];
const malformed = fixtures['synthetic-malformed-record.hy3'];
const legacy = fixtures['synthetic-legacy-mm5.hy3'];
let fixturePassed = 0;
const fixtureFailures = [];
function fixtureCheck(name, fn) {
  try {
    fn();
    fixturePassed += 1;
    console.log(`  ok - ${name}`);
  } catch (error) {
    fixtureFailures.push([name, error]);
    console.error(`  FAIL - ${name}: ${error.message}`);
  }
}
console.log('synthetic HY3 fixture contract');
fixtureCheck('all declared fixture files load without raw-export dependencies', () => {
  assert.deepEqual(Object.keys(fixtures).sort(), [...FIXTURE_NAMES].sort());
  for (const fixture of Object.values(fixtures)) assert.ok(fixture.manifest.includes('ASANDA SYNTHETIC HY3 MANIFEST'));
});
fixtureCheck('supported fixture covers A/B/C/D/E/F/H record geometry', () => {
  assert.deepEqual(recordCounts(supported.records), { A: 1, B: 1, C: 2, D: 2, E: 2, F: 2, H: 1 });
  assert.deepEqual([...new Set(supported.records.map((record) => record.type))].sort(), [...SUPPORTED_RECORD_TYPES].sort());
  for (const record of supported.records) assert.equal(record.raw, undefined);
});
fixtureCheck('valid fixture records are fixed-width and LF terminated', () => {
  for (const fixture of [supported, cp1252, unsupported]) {
    let offset = 0;
    for (const record of fixture.records) {
      assert.equal(record.raw, undefined);
      const encoded = encodeRecord(record);
      assert.equal(encoded.length, RECORD_WIDTH);
      assert.deepEqual(fixture.bytes.subarray(offset, offset + RECORD_WIDTH), encoded);
      assert.equal(fixture.bytes[offset + RECORD_WIDTH], 0x0a);
      offset += RECORD_WIDTH + 1;
    }
    assert.equal(offset, fixture.bytes.length);
  }
});
fixtureCheck('legacy fixture uses exact 130-byte payloads and CRLF', () => {
  assert.deepEqual(recordCounts(legacy.records), { A1: 1, B1: 1, B2: 1, C1: 1, D1: 1, E1: 1, E2: 1 });
  for (let offset = 0; offset < legacy.bytes.length; offset += 132) {
    assert.equal(legacy.bytes[offset + 130], 0x0d);
    assert.equal(legacy.bytes[offset + 131], 0x0a);
  }
});
fixtureCheck('Windows-1252 edge bytes survive fixture encoding', () => {
  for (const byte of [0xc9, 0x80, 0x96, 0x94, 0xd1, 0xda, 0xdc, 0xfc, 0x91, 0x92]) assert.ok(cp1252.bytes.includes(byte), `missing byte 0x${byte.toString(16)}`);
  assert.match(decodeWindows1252(cp1252.bytes), /SYNTHETIC CAFÉ € –EDGE”/);
  assert.match(decodeWindows1252(cp1252.bytes), /SYNTHETIC NÚÑEZ Ü/);
});
fixtureCheck('decimal, relay, and disqualification canaries are present', () => {
  assert.ok(supported.records.some(({ type, fields }) => type === 'F' && fields.time === '62.34'));
  assert.ok(supported.records.some(({ type, fields }) => type === 'H' && fields.legs === '4' && fields.time === '4:12.34'));
  assert.ok(supported.records.some(({ type, fields }) => type === 'F' && fields.status === 'disqualified' && fields.note.includes('DQ:EARLY_START')));
});
fixtureCheck('unsupported and malformed variants are intentionally distinct', () => {
  assert.equal(unsupported.records[0].fields.version, 'HY3-99.0');
  assert.equal(malformed.records.at(-1).raw.length, 9);
  assert.equal(malformed.records.at(-1).raw[0], 0x41);
});
fixtureCheck('fixture privacy boundary contains only synthetic canaries', () => {
  const source = Object.values(fixtures).map(({ manifest }) => manifest).join('\n');
  assert.match(source, /PRIVATE_TEST_ID_001/);
  assert.match(source, /example\.invalid/);
  assert.match(source, /\+00-000-0000/);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /(?:password|api[_-]?key|secret|bearer|credential)/i);
  assert.doesNotMatch(source, /\b(?:Venezuela|Barcelona|Caracas|FEVEDA)\b/i);
  for (const fixture of Object.values(fixtures)) {
    for (const record of fixture.records.filter(({ fields }) => fields)) {
      for (const value of Object.values(record.fields)) {
        if (value.includes('@')) assert.match(value, /@example\.invalid$/);
        if (value.includes('date') || /^20\d\d-/.test(value)) assert.match(value, /^20(?:88|99)-/);
      }
    }
  }
});
console.log(`\nFixture checks: ${fixturePassed}/${fixturePassed + fixtureFailures.length} passed`);
if (fixtureFailures.length > 0 || process.argv.includes('--fixtures-only')) {
  if (fixtureFailures.length > 0) process.exitCode = 1;
  if (fixtureFailures.length > 0) process.exit(1);
  if (process.argv.includes('--fixtures-only')) process.exit(process.exitCode || 0);
}
const parserUrl = new URL('../src/services/admin/hy3Parser.js', import.meta.url);
let parserModule;
let parserBoundaryError;
try {
  parserModule = await import(parserUrl);
} catch (error) {
  const isExpectedMissingParser = error?.code === 'ERR_MODULE_NOT_FOUND' && /hy3Parser\.js/i.test(error.message || '');
  if (!isExpectedMissingParser) {
    console.error(`UNEXPECTED PARSER INFRASTRUCTURE FAILURE: ${error.message}`);
    process.exitCode = 1;
    process.exit(1);
  }
  parserBoundaryError = error;
}
const parseHy3 = parserModule?.parseHy3;
const legacyRecord = (type) => {
  const record = Buffer.concat([Buffer.alloc(130, 0x20), Buffer.from('\r\n')]);
  record.write(type, 0, 2, 'ascii');
  return record;
};
const legacyRelayRecords = (dq = false) => {
  const f1 = Buffer.from(legacy.bytes.subarray(5 * 132, 6 * 132));
  f1.write('F1TST01A', 0, 8, 'ascii');
  const f2 = Buffer.from(legacy.bytes.subarray(6 * 132));
  f2.write('F2', 0, 2, 'ascii');
  if (dq) { f2.fill(0x20, 3, 11); f2.write('Q', 12, 1, 'ascii'); }
  const f3 = legacyRecord('F3');
  f3.write(' 00001        00001', 2, 19, 'ascii');
  return { f1, f2, f3 };
};
const parserCases = [
  ['accepts strict legacy MM5 data as a sanitized linked preview', async () => {
    const result = await parseHy3(legacy.bytes); const serialized = JSON.stringify(result);
    assert.equal(result.ok, true); assert.equal(result.preview.version, 'MM5 6.0Ea');
    assert.deepEqual(result.preview.recordCounts, { A1: 1, B1: 1, B2: 1, C1: 1, D1: 1, E1: 1, E2: 1 });
    assert.equal(result.preview.entries.length, 1); assert.equal(result.preview.results[0].timeSeconds, 61.23); assert.equal(result.preview.results[0].place, 1);
    assert.equal(result.preview.entries[0].athleteAlias, result.preview.results[0].athleteAlias);
    assert.equal(result.preview.entries[0].eventAlias, result.preview.results[0].eventAlias);
    assert.doesNotMatch(serialized, /PRIVATE_|birthDate|address|phone|email|identity|raw/i);
  }],
  ['preserves legacy comma-decimal, zero-time, H1, and relay linkage semantics', async () => {
    const zeroSeed = Buffer.from(legacy.bytes); zeroSeed.write('0,00    ', 5 * 132 + 51, 8, 'ascii');
    assert.equal((await parseHy3(zeroSeed)).preview.entries[0].seedTimeSeconds, null);
    const h1 = Buffer.from(legacy.bytes); h1.fill(0x20, 6 * 132 + 3, 6 * 132 + 11); h1.write('Q', 6 * 132 + 12, 1, 'ascii');
    assert.equal((await parseHy3(Buffer.concat([h1, legacyRecord('H1')]))).ok, true);
    const { f1, f2, f3 } = legacyRelayRecords();
    const relay = await parseHy3(Buffer.concat([legacy.bytes.subarray(0, 5 * 132), f1, f2, f3]));
    assert.equal(relay.ok, true); assert.equal(relay.preview.relays[0].legs, 2);
  }],
  ['accepts F2→H1→F3 only for the immediately associated disqualified relay', async () => {
    const { f1, f2, f3 } = legacyRelayRecords(true); const prefix = legacy.bytes.subarray(0, 5 * 132); const h1 = legacyRecord('H1');
    const accepted = await parseHy3(Buffer.concat([prefix, f1, f2, h1, f3]));
    assert.equal(accepted.ok, true); assert.equal(accepted.preview.relays[0].status, 'disqualified');
    for (const records of [[prefix, h1], [prefix, f1, f2, h1, h1, f3], [prefix, f1, f2, f3, h1]]) {
      const rejected = await parseHy3(Buffer.concat(records)); assert.equal(rejected.ok, false); assert.equal(rejected.code, 'malformed-record');
    }
  }],
  ['rejects a second E1 while the first entry awaits E2', async () => {
    const offset = 5 * 132; const result = await parseHy3(Buffer.concat([legacy.bytes.subarray(0, offset + 132), legacy.bytes.subarray(offset)]));
    assert.equal(result.ok, false); assert.equal(result.code, 'malformed-record');
  }],
  ['rejects a second F1 while the first relay group is incomplete', async () => {
    const { f1, f2 } = legacyRelayRecords(); const result = await parseHy3(Buffer.concat([legacy.bytes.subarray(0, 5 * 132), f1, f1, f2]));
    assert.equal(result.ok, false); assert.equal(result.code, 'malformed-record');
  }],
  ['distinguishes unsupported legacy versions and malformed geometry', async () => {
    const version = Buffer.from(legacy.bytes); version.write('MM5 9.9Z  ', 44, 10, 'ascii');
    assert.equal((await parseHy3(version)).code, 'unsupported-version');
    const geometry = Buffer.from(legacy.bytes); geometry[130] = 0x0a;
    assert.equal((await parseHy3(geometry)).code, 'malformed-record');
  }],
  ['accepts A/B/C/D/E/F/H and reports record counts', async () => {
    const result = await parseHy3(supported.bytes);
    assert.equal(result.ok, true);
    assert.equal(result.preview.version, 'HY3-8.0');
    assert.deepEqual(result.preview.recordCounts, { A: 1, B: 1, C: 2, D: 2, E: 2, F: 2, H: 1 });
  }],
  ['decodes Windows-1252 display text', async () => {
    const result = await parseHy3(cp1252.bytes);
    assert.equal(result.ok, true);
    assert.equal(result.preview.meetName, 'SYNTHETIC CAFÉ € –EDGE”');
    assert.ok(result.preview.teams.some(({ displayName }) => displayName === 'SYNTHETIC CLUB ÑANDÚ'));
    assert.ok(result.preview.athletes.some(({ displayName }) => displayName === 'SYNTHETIC NÚÑEZ Ü'));
  }],
  ['normalizes decimal result time', async () => {
    const result = await parseHy3(supported.bytes);
    const official = result.preview.results.find(({ sourceAlias }) => sourceAlias === 'RES-TST-001');
    assert.equal(official.timeSeconds, 62.34);
    assert.equal(official.timeText, '62.34');
  }],
  ['preserves relay semantics and normalized time', async () => {
    const result = await parseHy3(supported.bytes);
    assert.deepEqual(result.preview.relays, [{ sourceAlias: 'REL-TST-001', teamAlias: 'TEAM-TST-01', eventAlias: 'EVT-TST-200', legs: 4, timeText: '4:12.34', timeSeconds: 252.34, status: 'official', note: 'RELAY_SYNTHETIC' }]);
  }],
  ['preserves disqualification status and note without inventing time', async () => {
    const result = await parseHy3(supported.bytes);
    const disqualified = result.preview.results.find(({ status }) => status === 'disqualified');
    assert.equal(disqualified.timeSeconds, null);
    assert.match(disqualified.note, /DQ:EARLY_START/);
  }],
  ['rejects unsupported versions fail closed', async () => {
    const result = await parseHy3(unsupported.bytes);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'unsupported-version');
    assert.equal(result.preview, undefined);
  }],
  ['rejects malformed fixed-width records fail closed', async () => {
    const result = await parseHy3(malformed.bytes);
    assert.equal(result.ok, false);
    assert.equal(result.code, 'malformed-record');
    assert.equal(result.preview, undefined);
  }],
  ['never leaks raw or private HY3 fields', async () => {
    const result = await parseHy3(supported.bytes);
    assert.equal(result.ok, true);
    const serialized = JSON.stringify(result);
    for (const sentinel of ['PRIVATE_TEST_ID_001', '2088-11-23', 'SYNTHETIC_ADDRESS_001', '+00-000-0000', 'private-athlete-001@example.invalid', '2099-07-15']) assert.doesNotMatch(serialized, new RegExp(sentinel.replace(/[.+?^${}()|[\]\\]/g, '\\$&')));
    assert.doesNotMatch(serialized, /(?:identity|nationalId|birthDate|address|phone|email|guardian|raw|sourceBytes|private)/i);
  }],
];
let parserPassed = 0;
let parserFailed = 0;
console.log('\nHY3 parser regression (RED contract; parser belongs to task 4.3)');
for (const [name, fn] of parserCases) {
  if (!parseHy3 || parserBoundaryError) {
    parserFailed += 1;
    console.log(`  EXPECTED RED - ${name}: ${parserBoundaryError ? 'src/services/admin/hy3Parser.js is not implemented' : 'parseHy3 export is not implemented'}`);
    continue;
  }
  try {
    await fn();
    parserPassed += 1;
    console.log(`  ok - ${name}`);
  } catch (error) {
    parserFailed += 1;
    console.log(`  EXPECTED RED - ${name}: ${error.message}`);
  }
}
console.log(`\nParser contract: ${parserPassed}/${parserCases.length} passed; ${parserFailed} RED`);
if (parserFailed > 0) process.exitCode = 1;
