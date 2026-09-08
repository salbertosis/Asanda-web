import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertRestoreTest, cleanup, setup, runHarness } from './athlete-achievements-concurrency-harness.mjs';

assert.doesNotThrow(() => assertRestoreTest('dsttiqzjrrbcjtwgxqju\n'));
for (const target of ['', 'fuxlohqricsfsxkjztne', 'unknown']) {
  assert.throws(() => assertRestoreTest(target));
}
const source = readFileSync(new URL('./athlete-achievements-concurrency-harness.mjs', import.meta.url), 'utf8');
assert.ok(source.indexOf("assertRestoreTest(readFileSync", source.indexOf('const runSql')) < source.indexOf('const child = spawn'));
assert.ok(!source.includes('cleanup-before'));
assert.match(source, /randomUUID\(\)/);
assert.ok(setup.indexOf('Fixture collision') < setup.indexOf('insert into auth.users'));
assert.ok(cleanup.indexOf('Fixture ownership') < cleanup.indexOf('delete from'));
assert.ok(cleanup.indexOf("select 'athlete_achievement_results', r.id::text") < cleanup.indexOf('delete from public.athlete_achievement_groups'));
assert.ok(cleanup.indexOf('delete from private.admin_audit_log') > cleanup.indexOf('delete from auth.users'));
assert.match(cleanup, /actor_id = '[^']+' and exists \(select 1 from fixture_entities\)/);
assert.match(cleanup, /Concurrency proof cleanup left fixture residue/);
console.log('  ok - target guard, collision checks and ownership-scoped cleanup SQL');

const privateOutput = 'PRIVATE_FIXTURE_SQL_AND_IDENTIFIERS';
const originalLog = console.log;
const logs = [];
console.log = (...args) => logs.push(args.join(' '));
try {
  for (const failure of [null, 'setup', 'race-a', 'verify', 'cleanup-after']) {
    const calls = [];
    const execute = async (name, sql) => {
      calls.push(name);
      if (name === 'race-a') assert.match(sql, /pg_sleep\(20\)/);
      if (name === 'race-b') assert.match(sql, /pg_try_advisory_xact_lock/);
      if (name === failure) return { code: 1, output: privateOutput };
      if (name === 'race-b') return { code: 1, output: 'seis o más competencias' };
      return { code: 0, output: privateOutput };
    };
    if (failure) {
      await assert.rejects(runHarness(execute, async () => {}), (error) => !error.message.includes(privateOutput));
    } else {
      await runHarness(execute, async () => {});
    }
    assert.equal(calls[0], 'setup');
    assert.equal(calls.at(-1), 'cleanup-after');
    if (failure === 'setup') assert.deepEqual(calls, ['setup', 'cleanup-after']);
  }
} finally {
  console.log = originalLog;
}
assert.ok(logs.every((line) => !line.includes(privateOutput)));
console.log('  ok - success and four failure paths clean up without output disclosure');
console.log('concurrency harness local regression: 6/6 scenarios passed; no remote calls');
