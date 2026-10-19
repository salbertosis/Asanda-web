import assert from 'node:assert/strict';
import { loadFixture } from '../tests/fixtures/hy3/harness.mjs';
import { parseHy3 } from '../src/services/admin/hy3Parser.js';
import { buildHy3SnapshotDto } from '../src/services/admin/hy3Snapshot.js';

let passed = 0;
const check = async (name, callback) => {
  try {
    await callback();
    passed += 1;
    console.log(`  ok - ${name}`);
  } catch (error) {
    console.error(`  FAIL - ${name}: ${error.message}`);
    process.exitCode = 1;
  }
};
const fixture = await loadFixture('synthetic-snapshot-mm5.hy3');
const parsed = await parseHy3(fixture.bytes);

await check('legacy metadata and every final individual and relay produce the exact SQL DTO', () => {
  assert.equal(parsed.ok, true);
  assert.equal(parsed.preview.competitionStartsOn, '2096-02-28');
  assert.equal(parsed.preview.competitionEndsOn, '2096-02-29');
  assert.equal(parsed.preview.athletes[0].teamAlias, 'MM5-TEAM-TST02');
  assert.equal(parsed.preview.results[0].lane, 4);
  assert.match(parsed.preview.events[0].displayName, /50.*freestyle.*female.*final/i);
  assert.match(parsed.preview.events[1].displayName, /4\s*x\s*50.*medley.*female.*final/i);

  const built = buildHy3SnapshotDto(parsed.preview);
  assert.equal(built.ok, true);
  assert.deepEqual(Object.keys(built), ['ok', 'payload']);
  assert.deepEqual(Object.keys(built.payload), ['competition', 'events', 'results']);
  assert.deepEqual(built.payload.competition, {
    name: 'SYNTHETIC CHAMPIONSHIP', startsOn: '2096-02-28', endsOn: '2096-02-29',
    poolLengthMetres: 50, venue: 'SYNTHETIC AQUATIC CENTRE',
  });
  assert.equal(built.payload.events.length, 2);
  for (const event of built.payload.events) {
    assert.deepEqual(Object.keys(event), ['alias', 'label', 'distanceMetres', 'stroke', 'sex', 'round', 'category']);
    assert.equal(event.category, '15-16');
  }
  assert.equal(built.payload.results.length, 2);
  assert.deepEqual(Object.keys(built.payload.results[0]), ['alias', 'eventAlias', 'resultType', 'participantName', 'clubName', 'place', 'timeMs', 'lane', 'status']);
  assert.deepEqual(Object.keys(built.payload.results[1]), ['alias', 'eventAlias', 'resultType', 'teamName', 'clubName', 'relayMembers', 'place', 'timeMs', 'lane', 'status']);
  assert.deepEqual(built.payload.results[0], {
    alias: 'HY3-RESULT-1', eventAlias: parsed.preview.results[0].eventAlias,
    resultType: 'individual', participantName: 'ALPHA SWIMMER', clubName: 'SYNTHETIC SNAPSHOT CLUB',
    place: 1, timeMs: 29450, lane: 4, status: 'official',
  });
  assert.deepEqual(built.payload.results[1], {
    alias: 'HY3-RESULT-2', eventAlias: parsed.preview.relays[0].eventAlias,
    resultType: 'relay', teamName: 'SYNTHETIC SNAPSHOT CLUB', clubName: 'SYNTHETIC SNAPSHOT CLUB',
    relayMembers: [], place: null, timeMs: 125670, lane: null, status: 'official',
  });
  assert.doesNotMatch(JSON.stringify(built), /PRIVATE_|birth|identity|address|phone|email|diagnostics|note|checksum/i);
});

await check('modern single-date metadata maps to same-day competition and team fallback', async () => {
  const modern = await parseHy3((await loadFixture('synthetic-supported.hy3')).bytes);
  const built = buildHy3SnapshotDto(modern.preview);
  assert.equal(built.ok, true);
  assert.equal(built.payload.competition.startsOn, '2099-07-15');
  assert.equal(built.payload.competition.endsOn, '2099-07-15');
  assert.equal(built.payload.competition.poolLengthMetres, 25);
  assert.equal(built.payload.results[0].clubName, 'SYNTHETIC CLUB NORTH');
  assert.equal(built.payload.results[1].status, 'disqualified');
  assert.equal(built.payload.results[2].resultType, 'relay');
});

await check('invalid calendar dates fail closed in both modern and legacy metadata', async () => {
  const modern = Buffer.from((await loadFixture('synthetic-supported.hy3')).bytes);
  modern.write('2099-02-30', 49, 10, 'ascii');
  assert.equal((await parseHy3(modern)).code, 'invalid-value');
  const legacy = Buffer.from(fixture.bytes);
  legacy.write('02302096', 132 + 92, 8, 'ascii');
  assert.equal((await parseHy3(legacy)).code, 'invalid-value');
});

await check('incomplete metadata, yards, provisional rows, and malformed references are blocking', async () => {
  const incomplete = structuredClone(parsed.preview);
  delete incomplete.competitionStartsOn;
  assert.equal(buildHy3SnapshotDto(incomplete).code, 'snapshot-metadata-incomplete');
  const yards = structuredClone(parsed.preview);
  yards.pool = 'SCY';
  assert.equal(buildHy3SnapshotDto(yards).code, 'unsupported-course');
  const provisional = await parseHy3((await loadFixture('synthetic-supported.hy3')).bytes);
  provisional.preview.results[0].status = 'provisional';
  assert.equal(buildHy3SnapshotDto(provisional.preview).code, 'provisional-result');
  const missingEntry = structuredClone(parsed.preview);
  missingEntry.results[0].entryAlias = 'MISSING';
  assert.equal(buildHy3SnapshotDto(missingEntry).code, 'snapshot-missing-reference');
  assert.equal(parsed.preview.results.length + parsed.preview.relays.length, 2);
});

console.log(`\nHY3 snapshot checks: ${passed}/4 passed`);
if (passed !== 4) process.exitCode = 1;
