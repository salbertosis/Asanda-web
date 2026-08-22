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
  ['claim changes do not emit UUID values', !/^select\s+set_config/im.test(candidate) && candidate.includes("perform set_config('request.jwt.claim.sub'")],
  ['ledger binds actors actions and fixture entity', candidate.includes('actor_id =') && candidate.includes("entity_id = current_setting('rlsv.fixture_id')") && candidate.includes('administrator_updates = 1')],
  ['pass requires exact three-row ledger', candidate.includes('actual_rows = 3') && candidate.includes('exact_sequence_allocations_on_pass')],
  ['stopped allocation bound is zero through four', candidate.includes('0::integer as stopped_sequence_allocations_min') && candidate.includes('4::integer as stopped_sequence_allocations_max')],
  ['candidate emits aggregate-only evidence', candidate.includes('failed_checks') && candidate.includes('candidate_outcome')],
  ['candidate creates no temporary DDL or grants', !/\b(create\s+temporary|grant\s+)/i.test(candidate)],
  ['candidate ends in rollback and has no commit', /rollback;\s*$/.test(candidate) && !/\bcommit\s*;/i.test(candidate)],
  ['residue proof is read only and scoped', residue.includes('set local transaction_read_only = on;') && residue.includes('residue_zero') && residue.includes('profile_auth_migration_proof_in_slice')],
]

const failures = checks.filter(([, passed]) => !passed)
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`)

if (failures.length > 0) {
  console.error(`Production RLS readiness validation failed: ${failures.length}/${checks.length} checks.`)
  process.exit(1)
}

console.log(`Production RLS readiness validation passed: ${checks.length}/${checks.length} checks.`)
