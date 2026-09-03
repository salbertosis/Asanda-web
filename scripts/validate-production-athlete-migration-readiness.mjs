import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const migrationDirectory = resolve(root, 'supabase/migrations')
const runbookPath = resolve(root, 'docs/production-athlete-migrations-rollout.md')
const adminAchievementServicePath = resolve(root, 'src/services/admin/athleteAchievements.js')
const publicAthleteServicePath = resolve(root, 'src/services/athletes.js')

const migrationNames = ['20260830120000_expand_featured_athlete_ordering.sql', '20260830122000_paginate_featured_athlete_profiles.sql', '20260830130000_robust_athlete_achievement_groups.sql', '20260830131000_robust_athlete_achievement_guards.sql']
const retiredEvidenceMigrationName = '20260830121000_add_athlete_evidence_sources.sql'

const contractPaths = ['supabase/tests/featured-athlete-ordering-contract.sql', 'supabase/tests/featured-athlete-source-approval.sql', 'supabase/tests/featured-athlete-profiles-rpc.sql', 'supabase/tests/athlete-achievements-contract.sql', 'scripts/athlete-achievements-concurrency-harness.mjs', 'scripts/athlete-achievements-regression.mjs']

const read = (path) => readFileSync(path, 'utf8')
const hasAll = (text, markers) => markers.every((marker) => text.includes(marker))
const migrationPaths = migrationNames.map((name) => resolve(migrationDirectory, name))
const migrations = migrationPaths.map(read)
const [ordering, pagination, grouped, guards] = migrations
const runbook = read(runbookPath)
const adminAchievementService = read(adminAchievementServicePath)
const publicAthleteService = read(publicAthleteServicePath)
const contractFilesExist = contractPaths.every((path) => existsSync(resolve(root, path)))
const featuredProfileContract = contractFilesExist
  ? read(resolve(root, 'supabase/tests/featured-athlete-profiles-rpc.sql'))
  : ''
const allMigrationNames = readdirSync(migrationDirectory)
  .filter((name) => /^\d{14}_.+\.sql$/.test(name))
  .sort()
const pendingSlice = allMigrationNames
  .filter((name) => name >= migrationNames[0] && name <= migrationNames.at(-1))
  .filter((name) => name !== retiredEvidenceMigrationName)
const runbookPositions = migrationNames.map((name) => runbook.indexOf(name))

const retiredEvidenceMigrationExcluded = !migrationNames.includes(retiredEvidenceMigrationName)
const unsafeShortcutsProhibited = [
  /do not deploy migration sql through .*db query/i,
  /do not use `?supabase migration repair`?/i,
  /do not relink .* production/i,
  /do not run a blind `supabase db push`/i,
].every((pattern) => pattern.test(runbook))
const checks = [
  ['four canonical migration files exist', migrationPaths.every(existsSync)],
  ['retired evidence migration is absent from the current release chain', retiredEvidenceMigrationExcluded],
  ['canonical pending slice has exact chronological order', JSON.stringify(pendingSlice) === JSON.stringify(migrationNames)],
  ['runbook lists all four migrations in chronological order', runbookPositions.every((position) => position >= 0) && runbookPositions.every((position, index) => index === 0 || position > runbookPositions[index - 1])],
  ['ordering migration defines eligibility and ordered admin RPCs', hasAll(ordering, [
    'private.is_featured_eligible_athlete',
    'public.append_featured_athlete',
    'public.move_featured_athlete',
    'public.list_featured_athlete_candidates',
    'deferrable initially deferred',
  ])],
  ['pagination migration defines bounded public wrappers', hasAll(pagination, [
    'private.get_featured_athlete_profiles',
    'public.get_featured_athlete_profiles',
    'public.get_homepage_featured_athlete_profiles',
    'private.is_featured_eligible_athlete',
    'requested_limit integer default 100',
  ])],
  ['grouped migration defines schema RPCs and private pagination replacement', hasAll(grouped, [
    'alter table public.athlete_achievements rename to athlete_achievements_legacy',
    'create table public.athlete_achievement_groups',
    'create table public.athlete_achievement_results',
    'public.save_athlete_achievement_group_draft',
    'public.publish_athlete_achievement_group',
    'public.list_athlete_achievement_groups',
    'create or replace function private.get_featured_athlete_profiles(requested_limit integer, requested_offset integer)',
  ])],
  ['guard migration completes child record and publication invariants', hasAll(guards, [
    'private.enforce_athlete_achievement_group_children',
    'private.enforce_athlete_achievement_record_owner',
    'athlete_achievement_groups_require_child',
    'athlete_achievement_results_require_child',
    'athlete_achievement_result_owner',
    'create or replace function public.publish_athlete_achievement_group',
    'create or replace function private.get_public_athlete_achievement_groups',
  ])],
  ['all required contract and harness files target the grouped schema', contractFilesExist
    && hasAll(featuredProfileContract, [
      'public.save_athlete_achievement_group_draft',
      'public.publish_athlete_achievement_group',
    ])
    && !/public\.athlete_achievements\b/.test(featuredProfileContract)],
  ['admin frontend consumes grouped achievement RPCs', hasAll(adminAchievementService, [
    'normalizeAchievementGroup',
    'requested_children',
    "rpc('list_athlete_achievement_groups'",
    "rpc('save_athlete_achievement_group_draft'",
    "rpc('publish_athlete_achievement_group'",
    "rpc('delete_athlete_achievement_group'",
  ])],
  ['admin frontend rejects direct legacy achievement CRUD', !/\.from\(\s*['"]athlete_achievements['"]\s*\)/.test(adminAchievementService) && !adminAchievementService.includes('source_document_id')],
  ['public frontend normalizes grouped achievement cards', hasAll(publicAthleteService, [
    'normalizeAchievementGroups',
    "'international_podium'",
    "'international_participation'",
    "'state_record'",
    'group?.type',
    'group?.competitionName',
    'group?.achievedOn',
    'group.children',
    'normalizeAchievementGroups(profile?.achievements)',
  ])],
  ['public frontend rejects legacy flat achievement normalization', !hasAll(publicAthleteService, [
    'achievement.achievement_type',
    'achievement.competition_name',
    'achievement.achieved_on',
  ])],
  ['runbook identifies production target without granting authorization', hasAll(runbook, [
    'fuxlohqricsfsxkjztne',
    'NOT GRANTED BY THIS DOCUMENT',
    'operator',
    'reviewer',
    'maintenance window',
    'backup',
    'PITR',
  ])],
  ['runbook requires exact remote migration end and old-schema fingerprint', hasAll(runbook, [
    '20260829152000',
    'featured_athletes_display_order_check',
    'public.get_featured_athlete_profiles()',
    'public.athlete_achievements',
    'athlete_achievements_public_idx',
    'athlete_achievements_source_idx',
  ])],
  ['runbook requires Restore Test and fresh production-clone rehearsals', /Restore Test/i.test(runbook) && /fresh production clone/i.test(runbook)],
  ['runbook names every contract and concurrency command target', contractPaths.every((path) => runbook.includes(path))],
  ['runbook defines the exact four-migration scope', /(?:four|4)\s+(?:canonical\s+)?migrations/i.test(runbook)],
  ['runbook documents that origin/main excludes the retired evidence migration', runbook.includes('origin/main') && runbook.includes('20260830121000') && /(?:retired|removed|excluded|no longer)/i.test(runbook)],
  ['runbook preserves fail-closed rollout semantics', /fail-closed/i.test(runbook) && /stop (?:the )?(?:entire )?rollout/i.test(runbook)],
  ['runbook prohibits unsafe migration shortcuts', unsafeShortcutsProhibited],
  ['runbook defines coordinated frontend and database rollout', /frontend/i.test(runbook) && /database/i.test(runbook) && /coordinated/i.test(runbook)],
  ['runbook defines stop evidence and post-deploy checks', hasAll(runbook, [
    'Stop Conditions',
    'Evidence Record',
    'Post-Deploy Verification',
    'Migration Metadata',
    'Schema and Privilege Checks',
    'Data and RPC Checks',
  ]) && /(?:do not run fixture-heavy|(?:no|zero) durable fixtures)/i.test(runbook)],
  ['runbook defines PITR and forward-fix rollback boundaries', /PITR/i.test(runbook) && /forward fix/i.test(runbook) && /rollback/i.test(runbook)],
  ['validator itself targets only repository files', basename(runbookPath) === 'production-athlete-migrations-rollout.md' && [...migrationPaths, adminAchievementServicePath, publicAthleteServicePath].every((path) => path.startsWith(root))],
]

const failures = checks.filter(([, passed]) => !passed)
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}`)

if (failures.length > 0) {
  console.error(`Production athlete migration readiness validation failed: ${failures.length}/${checks.length} checks.`)
  process.exit(1)
}

console.log(`Production athlete migration readiness validation passed: ${checks.length}/${checks.length} checks.`)
