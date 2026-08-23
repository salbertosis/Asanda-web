import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const runbookPath = resolve(root, 'openspec/changes/panel-administracion/production-rls-validation-runbook.md')
const tasksPath = resolve(root, 'openspec/changes/panel-administracion/tasks.md')
const auditMigrationPath = resolve(root, 'supabase/migrations/20260817175000_add_admin_audit_log.sql')
const resultMigrationPaths = [
  '20260820150000_add_result_import_transaction.sql',
  '20260820151000_add_public_result_query.sql',
  '20260820152000_fix_result_import_entry_conflict.sql',
].map((name) => resolve(root, 'supabase/migrations', name))
const candidatePath = resolve(root, 'supabase/tests/production-rls-validation-candidate.sql')
const residuePath = resolve(root, 'supabase/tests/production-rls-validation-residue.sql')

const runbook = readFileSync(runbookPath, 'utf8')
const tasks = readFileSync(tasksPath, 'utf8')
const auditMigration = readFileSync(auditMigrationPath, 'utf8')
const resultMigrations = resultMigrationPaths.map((path) => readFileSync(path, 'utf8'))
const candidate = readFileSync(candidatePath, 'utf8')
const residue = readFileSync(residuePath, 'utf8')
const runbookLines = runbook.split(/\r?\n/)
const athleteClubCoveragePresent = candidate.includes('administrator_setup_attributed = 14')
  && runbook.includes('athlete/club')
const calendarMarkers = [
  'anonymous_venue_visible',
  'anonymous_competition_visible',
  'anonymous_event_visible',
  'anonymous_event_definition_visible',
  'anonymous_event_category_visible',
  'anonymous_calendar_write_denied',
  'anonymous_reorder_denied',
  'inactive_calendar_write_denied',
  'inactive_reorder_denied',
  'editor_competition_updated',
  'editor_venue_updated',
  'editor_event_updated',
  'editor_event_reordered',
  'administrator_competition_updated',
  'administrator_calendar_visible',
]
const inactiveCalendarMarkers = [
  'inactive_venue_visible',
  'inactive_competition_visible',
  'inactive_event_visible',
  'inactive_event_definition_visible',
  'inactive_event_category_visible',
  'inactive_calendar_write_denied',
  'inactive_reorder_denied',
]
const editorCalendarMarkers = [
  'editor_competition_updated',
  'editor_venue_updated',
  'editor_event_updated',
  'editor_event_reordered',
  'editor_event_definition_visible',
  'editor_event_category_visible',
]
const administratorCalendarMarkers = [
  'administrator_competition_updated',
  'administrator_competition_delete_denied',
  'administrator_event_definition_visible',
  'administrator_event_category_visible',
  'administrator_calendar_visible',
]
const calendarCoveragePresent = calendarMarkers.every((marker) => candidate.includes(marker))
  && ['venue_id', 'competition_id', 'competition_event_id', 'event_definition_id'].every((marker) => candidate.includes(marker))
  && residue.includes('competition_event_id')
  && runbook.includes('published venues/competitions/event programs')
const inactiveCalendarCoveragePresent = inactiveCalendarMarkers.every((marker) => candidate.includes(marker))
const editorCalendarCoveragePresent = editorCalendarMarkers.every((marker) => candidate.includes(marker))
const administratorCalendarCoveragePresent = administratorCalendarMarkers.every((marker) => candidate.includes(marker))
const calendarAuditAttributionPresent = [
  'administrator_setup_attributed = 14',
  'editor_news_insert_attributed = 1',
  'editor_updates_attributed = 6',
  'administrator_updates_attributed = 4',
].every((marker) => candidate.includes(marker))
const calendarAuditResiduePresent = [
  'calendar_fixture_rows',
  'calendar_audit_rows',
  "entity_table in ('venues', 'competitions', 'competition_events')",
].every((marker) => residue.includes(marker))
const runbookPassSequenceClaims = [...runbook.matchAll(/exactly \*\*(\d+)\*\* allocations on pass/g)].map((match) => Number(match[1]))
const runbookStoppedSequenceClaims = [...runbook.matchAll(/\*\*0\.\.(\d+)\*\*/g)].map((match) => Number(match[1]))
const candidatePassSequenceClaim = Number(candidate.match(/then (\d+) else null/)?.[1])
const candidateStoppedSequenceClaim = Number(candidate.match(/(\d+)::integer as stopped_sequence_allocations_max/)?.[1])
const residuePassSequenceClaim = Number(residue.match(/(\d+)::integer as accepted_pass_sequence_allocations/)?.[1])
const calendarSequenceBoundsAligned = runbookPassSequenceClaims.length > 0
  && runbookPassSequenceClaims.every((value) => value === 36)
  && runbookStoppedSequenceClaims.length > 0
  && runbookStoppedSequenceClaims.every((value) => value === 37)
  && candidatePassSequenceClaim === 36
  && candidateStoppedSequenceClaim === 37
  && residuePassSequenceClaim === 36
const resultMarkers = [
  'anonymous_result_import_denied', 'inactive_result_import_denied',
  'editor_result_imported', 'administrator_result_imported',
  'result_unresolved_denied', 'result_duplicate_denied',
  'result_stale_revision_denied', 'result_atomic_failure',
  'anonymous_result_visible', 'anonymous_result_private_hidden',
  'editor_result_attributed = 5', 'administrator_result_attributed = 5',
]
const resultCoveragePresent = resultMarkers.every((marker) => candidate.includes(marker))
  && ['anonymous', 'inactive'].every((role) => (candidate.match(new RegExp(`${role}_result_import_evidence_denied`, 'g')) ?? []).length === 3)
const resultResiduePresent = ['result_fixture_rows', 'result_audit_rows',
  "'source_documents', 'import_batches', 'entries', 'performances', 'competitions'",
].every((marker) => residue.includes(marker))
const sequenceClaimLines = runbookLines.filter((line) =>
  /(sequence|allocation)/i.test(line) && /(pass|stopped|stop|bound)/i.test(line),
)
const passAllocationClaims = sequenceClaimLines.filter((line) => /pass/i.test(line) && /allocation/i.test(line))
const stoppedAllocationClaims = sequenceClaimLines.filter((line) => /stopped|stop/i.test(line) && /allocation/i.test(line))
const staleSequenceClaimLines = sequenceClaimLines.filter((line) =>
  /\b0\s*\.\.\s*(4|16|25)\b/.test(line) || (/\b(3|15|24)\b/.test(line) && /(pass|allocation|sequence)/i.test(line)),
)
const passAllocationBoundsAligned = passAllocationClaims.length > 0
  && passAllocationClaims.every((line) => /\b36\b/.test(line))
const stoppedAllocationBoundsAligned = stoppedAllocationClaims.length > 0
  && stoppedAllocationClaims.every((line) => /0\s*\.\.\s*37/.test(line) || /stopped_sequence_allocations_(min|max):/.test(line))

const checks = [
  ['audit identity is non-transactional input', /id bigint generated always as identity/.test(auditMigration)],
  ['production execution remains unauthorized', runbook.includes('Production execution authorization:** `NOT GRANTED BY THIS DOCUMENT`')],
  ['bounded advancement policy is accepted', runbook.includes('accepted-bounded-non-semantic-advancement')],
  ['candidate and residue paths are documented', runbook.includes('`supabase/tests/production-rls-validation-candidate.sql`') && runbook.includes('`supabase/tests/production-rls-validation-residue.sql`')],
  ['sequence reset workaround is prohibited', runbook.includes('Resetting the sequence is not an acceptable workaround')],
  ['trigger disabling workaround is prohibited', runbook.includes('Disabling audit triggers is also prohibited')],
  ['task 5.2 remains pending', /^- \[ \] 5\.2 /m.test(tasks)],
  ['candidate is admitted', existsSync(candidatePath)],
  ['independent residue proof is admitted', existsSync(residuePath)],
  ['result migrations 150000/151000/152000 are present', resultMigrationPaths.every((path) => existsSync(path))],
  ['result migrations expose RPC, projection, and forward fix', resultMigrations[0].includes('commit_result_import') && resultMigrations[1].includes('get_published_result_rows') && /on conflict on constraint performances_entry_id_key/i.test(resultMigrations[2])],
  ['all four roles are covered', ['anon', 'inactive', 'editor', 'administrator'].every((role) => candidate.includes(role))],
  ['athlete and club role controls are present', ['anonymous_athlete_visible', 'anonymous_private_contact_hidden', 'inactive_athlete_write_denied', 'inactive_club_write_denied', 'editor_athlete_updated', 'editor_club_visible', 'administrator_club_updated'].every((marker) => candidate.includes(marker))],
  ['private athlete fixture is synthetic and derived', candidate.includes('private.athlete_details') && candidate.includes('extensions.digest') && candidate.includes("':private-details'" )],
  ['athlete and club audit entities are bounded', ["':public-contact'", "':private-contact'", "':membership'", "':category'", 'administrator_inserts = 16'].every((marker) => candidate.includes(marker))],
  ['calendar role and lifecycle markers are complete', calendarCoveragePresent],
  ['inactive calendar public reads and denials are complete', inactiveCalendarCoveragePresent],
  ['editor calendar mutations and references are complete', editorCalendarCoveragePresent],
  ['administrator calendar lifecycle and deletion guard are complete', administratorCalendarCoveragePresent],
  ['calendar fixture graph is bounded', ["':venue'", "':competition'", "':competition-event'", 'current_setting(\'rlsv.event_definition_id\')'].every((marker) => candidate.includes(marker))],
  ['calendar residue proof is aggregate and aligned', ['public.venues venue', 'public.competitions competition', 'public.competition_events event_row', '36::integer as accepted_pass_sequence_allocations', '37::integer as stopped_sequence_allocations_max'].every((marker) => residue.includes(marker))],
  ['calendar residue has independent aggregate counters', calendarAuditResiduePresent],
  ['claim changes do not emit UUID values', !/^select\s+set_config/im.test(candidate) && candidate.includes("perform set_config('request.jwt.claim.sub'")],
  ['ledger binds actors actions and fixture entity', candidate.includes('actor_id =') && candidate.includes('entity_id = any(array') && candidate.includes('administrator_updates_attributed = 4')],
  ['ledger attribution binds exact calendar entities', calendarAuditAttributionPresent],
  ['pass requires exact MVP ledger', candidate.includes('actual_rows = 36') && candidate.includes('exact_sequence_allocations_on_pass') && candidate.includes('then 36 else null')],
  ['stopped allocation bound is zero through thirty-seven', candidate.includes('0::integer as stopped_sequence_allocations_min') && candidate.includes('37::integer as stopped_sequence_allocations_max')],
  ['runbook pass allocation bounds match calendar coverage', !athleteClubCoveragePresent || passAllocationBoundsAligned],
  ['runbook stopped allocation bounds match calendar coverage', !athleteClubCoveragePresent || stoppedAllocationBoundsAligned],
  ['runbook/candidate/residue sequence bounds are identical', !athleteClubCoveragePresent || calendarSequenceBoundsAligned],
  ['runbook has no stale sequence claims', !athleteClubCoveragePresent || staleSequenceClaimLines.length === 0],
  ['result/import role, denial, atomicity, and privacy markers are complete', resultCoveragePresent],
  ['result/import residue is aggregate and aligned', resultResiduePresent],
  ['successful imports clear transaction-local audit attribution', (candidate.match(/set_config\('request\.admin_audit_reason', '', true\)/g) ?? []).length === 2 && (candidate.match(/set_config\('request\.admin_audit_evidence', '', true\)/g) ?? []).length === 2],
  ['runbook/candidate/residue MVP scope cannot drift', calendarCoveragePresent && runbook.includes('current candidate covers access/editorial, athlete/club, calendar, and result/import') && residue.includes('false as profile_auth_migration_proof_in_slice')],
  ['candidate emits aggregate-only evidence', candidate.includes('failed_checks') && candidate.includes('candidate_outcome')],
  ['candidate creates no temporary DDL or grants', !/\b(create\s+temporary|grant\s+)/i.test(candidate)],
  ['candidate ends in rollback and has no commit', /rollback;\s*$/.test(candidate) && !/\bcommit\s*;/i.test(candidate)],
  ['residue proof covers athlete-club aggregates', ['private.athlete_details', 'public.athlete_consents', 'public.athlete_category_assignments', 'public.athlete_disciplines', 'public.athlete_memberships'].every((marker) => residue.includes(marker))],
  ['residue proof is read only and scoped', residue.includes('set local transaction_read_only = on;') && residue.includes('residue_zero') && residue.includes('profile_auth_migration_proof_in_slice')],
]

const failures = checks.filter(([, passed]) => !passed)
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`)

if (failures.length > 0) {
  console.error(`Production RLS readiness validation failed: ${failures.length}/${checks.length} checks.`)
  process.exit(1)
}

console.log(`Production RLS readiness validation passed: ${checks.length}/${checks.length} checks.`)
