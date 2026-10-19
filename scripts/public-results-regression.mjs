import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/services/results.js', import.meta.url), 'utf8');
const executable = source
  .replace("import { getCloudinaryUrl } from '../config/cloudinary.js';", "const getCloudinaryUrl = (id) => `cloud://${id}`;")
  .replace("import { supabase } from './supabase.js';", `const supabase = globalThis.__resultsSupabase;`);

let rpcCall;
globalThis.__resultsSupabase = {
  rpc(name, params) {
    rpcCall = { name, params, signal: null };
    return {
      abortSignal(signal) { rpcCall.signal = signal; return this; },
      then(resolve) { return Promise.resolve(resolve({ data: [], error: null })); },
    };
  },
};
const service = await import(`data:text/javascript;base64,${Buffer.from(executable).toString('base64')}`);

const row = (overrides = {}) => ({
  result_id: 'result-1', competition_id: 'competition-1', competition_name: 'Estadal ASANDA',
  competition_starts_on: '2026-08-14', competition_ends_on: '2026-08-16',
  competition_event_id: 'phase-final', event_definition_id: 'event-50-free',
  event_definition_code: '50_free', event_name: '50 m libre', event_category_id: 'category-youth',
  event_category_name: 'Juvenil', competitive_sex: 'female', round: 'final', sequence_number: 2,
  scheduled_at: '2026-08-16T14:00:00Z', athlete_id: 'athlete-1', athlete_name: 'Ana Prueba',
  club_id: 'club-1', club_name: 'Club Uno', lane: 4, time_ms: 30125, place: 1, status: 'official',
  ...overrides,
});

const normalized = [
  row(),
  row({ result_id: 'result-dq', athlete_id: 'athlete-2', athlete_name: 'Bea Prueba', status: 'disqualified', time_ms: null, place: null, lane: null }),
  row({ result_id: 'result-dns', competition_event_id: 'phase-heat', round: 'heats', athlete_id: 'athlete-3', athlete_name: 'Carla Prueba', status: 'did_not_start', time_ms: null, place: null }),
  row({ result_id: 'result-dnf', competition_event_id: 'phase-heat', round: 'heats', athlete_id: 'athlete-4', athlete_name: 'Diana Prueba', status: 'did_not_finish', time_ms: null, place: null }),
  row({ result_id: 'result-nt', athlete_id: 'athlete-5', athlete_name: 'Eva Prueba', status: 'no_time', time_ms: null, place: null }),
  row({ result_id: 'result-provisional', status: 'provisional' }),
  row({ result_id: 'result-unknown', status: 'mystery' }),
  row({ result_id: null }),
].map(service.normalizePublicCompetitionResult).filter(Boolean);

assert.equal(normalized.length, 5, 'only usable final public rows survive normalization');
assert.deepEqual(normalized.map(({ status }) => status), ['official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time']);
assert.equal(normalized[0].competition.startsOn, '2026-08-14');
assert.equal(normalized[1].lane, null);
assert.equal(normalized[0].athlete.photoUrl, null);

const grouped = service.groupPublicCompetitionResults(normalized);
assert.equal(grouped.length, 1);
assert.equal(grouped[0].events.length, 1);
assert.equal(grouped[0].events[0].phases.length, 2, 'actual competition event ids keep heats and finals separate');
assert.deepEqual(grouped[0].events[0].phases.map(({ id }) => id), ['phase-final', 'phase-heat']);
assert.deepEqual(grouped[0].events[0].phases[0].results.map(({ status }) => status), ['official', 'disqualified', 'no_time']);

const legacy = service.normalizePublishedResult({ result_id: 'legacy', athlete_name: null, club_name: null, event_name: null });
assert.equal(legacy.athlete.name, 'Atleta ASANDA');
assert.equal(legacy.club.name, 'Club por confirmar');
assert.equal(legacy.eventName, 'Evento por confirmar');

const controller = new AbortController();
await service.getPublicCompetitionResults(null, controller.signal);
assert.deepEqual(rpcCall.params, { requested_competition_id: null });
assert.equal(rpcCall.name, 'get_public_competition_result_rows');
assert.equal(rpcCall.signal, controller.signal);
await service.getPublishedResults('competition-legacy');
assert.equal(rpcCall.name, 'get_published_result_rows');
assert.deepEqual(rpcCall.params, { requested_competition_id: 'competition-legacy' });

const importedCompetition = service.normalizeImportedCompetition({
  import_id: 'import-1', competition_name: 'Copa HY3', starts_on: '2099-02-01', ends_on: '2099-02-02',
  pool_length_metres: 50, venue: 'Piscina central', event_count: 2, result_count: 3,
});
assert.deepEqual(importedCompetition, {
  id: 'snapshot:import-1', importId: 'import-1', name: 'Copa HY3', startsOn: '2099-02-01', endsOn: '2099-02-02',
  poolLengthMetres: 50, venue: 'Piscina central', eventCount: 2, resultCount: 3, source: 'snapshot', events: [],
});
const importedRows = [
  {
    import_id: 'import-1', competition_name: 'Copa HY3', starts_on: '2099-02-01', ends_on: '2099-02-02',
    event_alias: '50-free-final', event_label: '50 m libre', distance_metres: 50, stroke: 'freestyle', competitive_sex: 'female', round: 'final', category: 'Juvenil',
    result_alias: 'one', result_type: 'individual', participant_name: 'Nadadora sin perfil', team_name: null, club_name: 'Club Uno', relay_members: [], place: 1, time_ms: 30120, lane: 4, status: 'official',
  },
  {
    import_id: 'import-1', competition_name: 'Copa HY3', starts_on: '2099-02-01', ends_on: '2099-02-02',
    event_alias: 'relay-final', event_label: '4 x 50 m libre', distance_metres: 200, stroke: 'freestyle', competitive_sex: 'female', round: 'final', category: 'Juvenil',
    result_alias: 'relay', result_type: 'relay', participant_name: null, team_name: 'Relevo Club Uno', club_name: 'Club Uno', relay_members: [], place: null, time_ms: 125670, lane: null, status: 'official',
  },
].map(service.normalizeImportedCompetitionResult).filter(Boolean);
assert.equal(importedRows.length, 2);
assert.equal(importedRows[0].athlete.id, null, 'snapshot rows never fabricate profile ids');
assert.equal(importedRows[1].athlete.name, 'Relevo Club Uno');
assert.equal(importedRows[1].resultType, 'relay');
const importedGrouped = service.groupPublicCompetitionResults(importedRows);
assert.equal(importedGrouped[0].events.length, 2, 'individual and relay metadata stay in separate safe groups');
assert.match(importedGrouped[0].id, /^snapshot:/);

await service.getPublicImportedCompetitions(controller.signal);
assert.equal(rpcCall.name, 'get_public_imported_competitions');
assert.deepEqual(rpcCall.params, {});
assert.equal(rpcCall.signal, controller.signal);
await service.getPublicImportedCompetitionResults('import-1', controller.signal);
assert.equal(rpcCall.name, 'get_public_imported_competition_results');
assert.deepEqual(rpcCall.params, { requested_import_id: 'import-1' });
assert.equal(rpcCall.signal, controller.signal);

console.log('public results regression passed');
