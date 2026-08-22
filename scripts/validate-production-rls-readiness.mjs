import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const runbookPath = resolve(root, 'openspec/changes/panel-administracion/production-rls-validation-runbook.md')
const tasksPath = resolve(root, 'openspec/changes/panel-administracion/tasks.md')
const auditMigrationPath = resolve(root, 'supabase/migrations/20260817175000_add_admin_audit_log.sql')
const candidatePath = resolve(root, 'supabase/tests/production-rls-validation-candidate.sql')
const residuePath = resolve(root, 'supabase/tests/production-rls-validation-residue.sql')

const runbook = readFileSync(runbookPath, 'utf8')
const tasks = readFileSync(tasksPath, 'utf8')
const auditMigration = readFileSync(auditMigrationPath, 'utf8')
const candidate = readFileSync(candidatePath, 'utf8')
const residue = readFileSync(residuePath, 'utf8')
const runbookLines = runbook.split(/\r?\n/)
const athleteClubCoveragePresent = candidate.includes('actual_rows = 24')
  && candidate.includes('administrator_inserts = 12')
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
const calendarCoveragePresent = calendarMarkers.every((marker) => candidate.includes(marker))
  && ['venue_id', 'competition_id', 'competition_event_id', 'event_definition_id'].every((marker) => candidate.includes(marker))
  && residue.includes('competition_event_id')
  && runbook.includes('published venues/competitions/event programs')
const sequenceClaimLines = runbookLines.filter((line) =>
  /(sequence|allocation)/i.test(line) && /(pass|stopped|stop|bound)/i.test(line),
)
const passAllocationClaims = sequenceClaimLines.filter((line) => /pass/i.test(line) && /allocation/i.test(line))
const stoppedAllocationClaims = sequenceClaimLines.filter((line) => /stopped|stop/i.test(line) && /allocation/i.test(line))
const staleSequenceClaimLines = sequenceClaimLines.filter((line) =>
  /\b0\s*\.\.\s*4\b/.test(line) || (/\b3\b/.test(line) && /(pass|allocation|sequence)/i.test(line)),
)
const passAllocationBoundsAligned = passAllocationClaims.length > 0
  && passAllocationClaims.every((line) => /\b24\b/.test(line))
const stoppedAllocationBoundsAligned = stoppedAllocationClaims.length > 0
  && stoppedAllocationClaims.every((line) => /0\s*\.\.\s*25/.test(line) || /stopped_sequence_allocations_(min|max):/.test(line))

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
  ['all four roles are covered', ['anon', 'inactive', 'editor', 'administrator'].every((role) => candidate.includes(role))],
  ['athlete and club role controls are present', ['anonymous_athlete_visible', 'anonymous_private_contact_hidden', 'inactive_athlete_write_denied', 'inactive_club_write_denied', 'editor_athlete_updated', 'editor_club_visible', 'administrator_club_updated'].every((marker) => candidate.includes(marker))],
  ['private athlete fixture is synthetic and derived', candidate.includes('private.athlete_details') && candidate.includes('extensions.digest') && candidate.includes("':private-details'" )],
  ['athlete and club audit entities are bounded', ["':public-contact'", "':private-contact'", "':membership'", "':category'", 'administrator_inserts = 12'].every((marker) => candidate.includes(marker))],
  ['calendar role and lifecycle markers are complete', calendarCoveragePresent],
  ['calendar fixture graph is bounded', ["':venue'", "':competition'", "':competition-event'", 'current_setting(\'rlsv.event_definition_id\')'].every((marker) => candidate.includes(marker))],
  ['calendar residue proof is aggregate and aligned', ['public.venues venue', 'public.competitions competition', 'public.competition_events event_row', '24::integer as accepted_pass_sequence_allocations', '25::integer as stopped_sequence_allocations_max'].every((marker) => residue.includes(marker))],
  ['claim changes do not emit UUID values', !/^select\s+set_config/im.test(candidate) && candidate.includes("perform set_config('request.jwt.claim.sub'")],
  ['ledger binds actors actions and fixture entity', candidate.includes('actor_id =') && candidate.includes('entity_id = any(array') && candidate.includes('administrator_updates = 4')],
  ['pass requires exact calendar ledger', candidate.includes('actual_rows = 24') && candidate.includes('exact_sequence_allocations_on_pass') && candidate.includes('then 24 else null')],
  ['stopped allocation bound is zero through twenty-five', candidate.includes('0::integer as stopped_sequence_allocations_min') && candidate.includes('25::integer as stopped_sequence_allocations_max')],
  ['runbook pass allocation bounds match calendar coverage', !athleteClubCoveragePresent || passAllocationBoundsAligned],
  ['runbook stopped allocation bounds match calendar coverage', !athleteClubCoveragePresent || stoppedAllocationBoundsAligned],
  ['runbook has no stale sequence claims', !athleteClubCoveragePresent || staleSequenceClaimLines.length === 0],
  ['runbook/candidate/residue calendar slice cannot drift', calendarCoveragePresent && runbook.includes('Result/import surfaces remain for a later slice.') && residue.includes('false as profile_auth_migration_proof_in_slice')],
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
