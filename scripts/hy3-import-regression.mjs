import assert from 'node:assert/strict';
import { loadFixture } from '../tests/fixtures/hy3/harness.mjs';
import { parseCsvFallback, parseHy3 } from '../src/services/admin/hy3Parser.js';
import { reconcileHy3Preview } from '../src/services/admin/hy3Reconciliation.js';
import { processHy3Import } from '../src/workers/hy3Import.worker.js';

const fixture = await loadFixture('synthetic-supported.hy3');
const references = {
  events: [
    { id: 'event-50', competitive_sex: 'mixed', round: 'final', event_definition: { name: 'SYNTHETIC 50 FREE', distance_metres: 50, stroke: 'freestyle' } },
    { id: 'event-200', competitive_sex: 'mixed', round: 'final', event_definition: { name: 'SYNTHETIC 4X50 FREE', distance_metres: 200, stroke: 'freestyle' } },
  ],
  mappings: [
    { id: 'mapping-team', provider: 'hy-tek', source_organization: 'SYNTHETIC MEET ALPHA', external_code: 'TEAM-TST-01', mapping_kind: 'organization', organization_id: 'org-1', resolution_status: 'resolved' },
    { id: 'mapping-one', provider: 'hy-tek', source_organization: 'SYNTHETIC MEET ALPHA', external_code: 'ATH-TST-001', mapping_kind: 'athlete', athlete_id: 'athlete-1', resolution_status: 'resolved' },
    { id: 'mapping-two', provider: 'hy-tek', source_organization: 'SYNTHETIC MEET ALPHA', external_code: 'ATH-TST-002', mapping_kind: 'athlete', athlete_id: 'athlete-2', resolution_status: 'resolved' },
  ],
};
let passed = 0;
const check = (name, callback) => { try { callback(); passed += 1; console.log(`  ok - ${name}`); } catch (error) { console.error(`  FAIL - ${name}: ${error.message}`); process.exitCode = 1; } };

const parsed = await parseHy3(fixture.bytes);
const repeat = await parseHy3(fixture.bytes);
check('checksum is deterministic and private fields stay local', () => { assert.equal(parsed.checksum, repeat.checksum); assert.doesNotMatch(JSON.stringify(parsed), /PRIVATE_TEST|birth|address|phone|email|raw/i); });
const workerResult = await processHy3Import({ type: 'parse', bytes: fixture.bytes });
check('worker returns the same sanitized parser boundary', () => { assert.equal(workerResult.ok, true); assert.deepEqual(workerResult.preview.recordCounts, parsed.preview.recordCounts); });
const reconciled = reconcileHy3Preview(parsed.preview, references);
check('resolved team, athlete, event, and relay references produce rows', () => { assert.equal(reconciled.ok, true); assert.equal(reconciled.sanitizedRows.length, 2); assert.equal(reconciled.relays.length, 1); assert.equal(reconciled.sanitizedRows[0].time_ms, 62340); });
check('unresolved mappings fail closed before review', () => { const blocked = reconcileHy3Preview(parsed.preview, { ...references, mappings: [] }); assert.equal(blocked.ok, false); assert.ok(blocked.errors.some(({ code }) => code === 'mapping-unresolved')); });
check('CSV fallback accepts only public result columns', () => { const csv = parseCsvFallback('athlete_alias,event_alias,time,status,place,note\nATH-TST-001,EVT-TST-050,62.34,official,1,CSV_SYNTHETIC'); assert.equal(csv.ok, true); assert.equal(csv.preview.results[0].timeSeconds, 62.34); assert.equal(parseCsvFallback('athlete_alias,email,event_alias,time,status').ok, false); });
console.log(`\nHY3 import flow checks: ${passed}/5 passed`);
