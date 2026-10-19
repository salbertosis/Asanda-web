import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/admin/results.js', import.meta.url), 'utf8');
const executable = source
  .replace("import { supabase } from '../supabase.js';", 'const supabase = globalThis.__hy3SnapshotSupabase;')
  .replace("import { parseCsvFallback, parseHy3 } from './hy3Parser.js';", 'const parseCsvFallback = () => {}; const parseHy3 = () => {};')
  .replace("import { mappingPayload, reconcileHy3Preview } from './hy3Reconciliation.js';", 'const mappingPayload = () => {}; const reconcileHy3Preview = () => {};')
  .replace("import { buildHy3SnapshotDto } from './hy3Snapshot.js';", 'const buildHy3SnapshotDto = globalThis.__buildHy3SnapshotDto;');

let rpcCall;
globalThis.__buildHy3SnapshotDto = (preview) => preview.built;
globalThis.__hy3SnapshotSupabase = {
  rpc(name, params) {
    rpcCall = { name, params };
    return Promise.resolve({ data: [{ import_id: 'import-1', competition_name: 'Copa sintética', event_count: 2, result_count: 3 }], error: null });
  },
  from() { throw new Error('snapshot import must not query profile-centric tables'); },
};
const service = await import(`data:text/javascript;base64,${Buffer.from(executable).toString('base64')}`);
const payload = {
  competition: { name: 'Copa sintética', startsOn: '2099-01-01', endsOn: '2099-01-02', poolLengthMetres: 25, venue: 'Piscina sintética' },
  events: [{ alias: 'event-1', label: '50 m libre', distanceMetres: 50, stroke: 'freestyle', sex: 'female', round: 'final', category: 'Juvenil' }],
  results: [{ alias: 'result-1', eventAlias: 'event-1', resultType: 'individual', participantName: 'Atleta sintética', clubName: 'Club sintético', place: 1, timeMs: 30000, lane: 4, status: 'official' }],
};
const checksum = 'a'.repeat(64);
const parsed = { ok: true, checksum, preview: { built: { ok: true, payload } } };
const imported = await service.importHy3CompetitionSnapshot(parsed, parsed.preview);
assert.deepEqual(rpcCall, {
  name: 'import_competition_result_snapshot',
  params: { requested_payload: payload, requested_source_checksum: checksum },
});
assert.deepEqual(imported, { importId: 'import-1', competitionName: 'Copa sintética', eventCount: 2, resultCount: 3 });
assert.doesNotMatch(JSON.stringify(rpcCall), /raw|bytes|national|birth|contact|note/i);

for (const [value, code] of [
  [{ ok: false, code: 'malformed-record' }, 'malformed-record'],
  [{ ok: true, checksum: null, preview: parsed.preview }, 'CHECKSUM_UNAVAILABLE'],
  [{ ok: true, checksum, preview: { built: { ok: false, code: 'provisional-result' } } }, 'provisional-result'],
]) {
  await assert.rejects(() => service.importHy3CompetitionSnapshot(value, value.preview), (error) => error.message === code);
}

assert.match(service.formatResultImportError(new Error('provisional-result')), /provisionales/i);
assert.match(service.formatResultImportError(new Error('unsupported-course')), /yardas/i);
assert.match(service.formatResultImportError(new Error('23505 duplicate')), /ya fue importad/i);
assert.match(service.formatResultImportError(new Error('42501')), /autorización/i);
assert.match(service.formatResultImportError(new Error('PGRST202 function missing')), /no está disponible/i);
assert.match(service.formatResultImportError(new Error('snapshot-metadata-incomplete')), /datos básicos/i);

console.log('HY3 snapshot service regression passed');
