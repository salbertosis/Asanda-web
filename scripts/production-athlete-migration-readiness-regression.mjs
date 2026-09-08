import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const root = resolve(import.meta.dirname, '..')
const fixture = mkdtempSync(resolve(tmpdir(), 'asanda-migration-readiness-'))
const validator = 'scripts/validate-production-athlete-migration-readiness.mjs'
const runbookPath = 'docs/production-athlete-migrations-rollout.md'
const files = [
  validator, runbookPath, 'src/services/admin/athleteAchievements.js', 'src/services/athletes.js',
  'supabase/migrations', 'supabase/tests/featured-athlete-ordering-contract.sql',
  'supabase/tests/featured-athlete-source-approval.sql', 'supabase/tests/featured-athlete-profiles-rpc.sql',
  'supabase/tests/athlete-achievements-contract.sql', 'scripts/athlete-achievements-concurrency-harness.mjs',
  'scripts/athlete-achievements-concurrency-regression.mjs', 'scripts/athlete-achievements-regression.mjs',
]
const run = () => {
  const result = spawnSync(process.execPath, [resolve(fixture, validator)], { encoding: 'utf8' })
  if (result.error) throw result.error
  return { status: result.status, output: result.stdout + result.stderr }
}

try {
  for (const file of files) {
    mkdirSync(dirname(resolve(fixture, file)), { recursive: true })
    cpSync(resolve(root, file), resolve(fixture, file), { recursive: true })
  }
  assert.equal(run().status, 0)
  console.log('PASS: canonical candidate passes')

  for (const name of ['20260830121000_add_athlete_evidence_sources.sql', '20260830121000_unexpected_migration.sql', '20260830120000_a_unexpected_migration.sql', '20260830131000_z_unexpected_migration.sql']) {
    const path = resolve(fixture, 'supabase/migrations', name)
    writeFileSync(path, '-- Regression fixture only; never execute.\n')
    const rejected = run()
    assert.equal(rejected.status, 1, `Unexpected migration accepted: ${name}\n${rejected.output}`)
    assert.match(rejected.output, /FAIL: canonical pending slice has exact chronological order/)
    if (name.includes('evidence_sources')) assert.match(rejected.output, /FAIL: retired evidence migration is absent/)
    rmSync(path)
    console.log(`PASS: rejects ${name}`)
  }

  const path = resolve(fixture, runbookPath)
  const canonical = readFileSync(path, 'utf8')
  const mutations = [
    ['| Production ledger head | Exactly `20260830131000` |', '| Production ledger head | Exactly `20260830130000` |'],
    ['| Applied manifest | Exactly `20260830120000`, `20260830122000`, `20260830130000`, and `20260830131000`, in that order |', '| Applied manifest | Exactly `20260830120000`, `20260830122000`, and `20260830131000`, in that order |'],
    ['| Retired evidence migration | `20260830121000` absent locally and absent from the production ledger |', '| Retired evidence migration | `20260830121000` absent locally but present in the production ledger |'],
    ['| Frontend state | Compatible frontend deployment and smoke test remain pending |', '| Frontend state | Compatible frontend deployment and smoke test are complete |'],
    ['| Administration | Closed until the compatible frontend commit is deployed and smoke-tested |', '| Administration | Open before the compatible frontend is smoke-tested |'],
  ]
  for (const [recorded, stale] of mutations) {
    assert.ok(canonical.includes(recorded))
    writeFileSync(path, canonical.replace(recorded, `${recorded}\n${stale}`))
    const rejected = run()
    assert.equal(rejected.status, 1, rejected.output)
    assert.match(rejected.output, /FAIL: bounded current production state records the exact closed deployment state/)
    console.log(`PASS: rejects added current-state contradiction: ${stale}`)
  }
  writeFileSync(path, canonical.replace('node scripts/athlete-achievements-concurrency-regression.mjs', 'node scripts/athlete-achievements-concurrency-regression.mjs --altered'))
  const rejected = run()
  assert.equal(rejected.status, 1, rejected.output)
  assert.match(rejected.output, /FAIL: runbook names every contract and concurrency command target/)
  console.log('PASS: rejects altered concurrency regression command')
  console.log('production athlete migration readiness regression: 11/11 passed')
} finally {
  const withinTemp = relative(resolve(tmpdir()), fixture)
  assert.ok(withinTemp.startsWith('asanda-migration-readiness-') && !withinTemp.includes('..'))
  rmSync(fixture, { recursive: true, force: true })
}
