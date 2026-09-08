import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let temporaryDirectory;
export const assertRestoreTest = (projectRef) => {
  assert.equal(projectRef.trim(), 'dsttiqzjrrbcjtwgxqju', 'Concurrency harness requires Restore Test.');
};
const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const adminId = randomUUID();
const athleteId = randomUUID();
const eventId = randomUUID();
const marker = `concurrency-proof-${randomUUID()}`;

const runSql = (name, sql) => new Promise((resolveRun) => {
  assertRestoreTest(readFileSync(join(root, 'supabase/.temp/project-ref'), 'utf8'));
  const file = join(temporaryDirectory, `${name}.sql`);
  writeFileSync(file, sql);
  const child = spawn(cli, ['--yes', 'supabase@2.115.0', 'db', 'query', '--linked', '--file', file, '--agent', 'no', '--output', 'table'], { cwd: root, windowsHide: true, shell: process.platform === 'win32' });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('error', () => resolveRun({ code: 1, output: 'CLI_START_FAILED' }));
  child.on('close', (code) => resolveRun({ code, output }));
});

export const cleanup = `
begin;
select pg_advisory_xact_lock(hashtextextended('asanda:athlete-achievement-groups:${athleteId}', 0));
do $$ begin
  if exists (select 1 from public.athletes where id = '${athleteId}' and display_name is distinct from '${marker}')
    or exists (select 1 from public.profiles where id = '${adminId}' and display_name is distinct from '${marker}')
    or exists (select 1 from public.event_definitions where id = '${eventId}' and code is distinct from '${marker}')
    or (exists (select 1 from auth.users where id = '${adminId}')
      and not exists (select 1 from public.profiles where id = '${adminId}' and display_name = '${marker}'))
  then raise exception 'Fixture ownership could not be verified.'; end if;
end $$;
create temporary table fixture_entities (entity_table text, id text, primary key (entity_table, id)) on commit drop;
insert into fixture_entities select fixture.* from (values ('users', '${adminId}'), ('profiles', '${adminId}'), ('athletes', '${athleteId}'), ('event_definitions', '${eventId}')) fixture(entity_table, id)
  where exists (select 1 from public.profiles where id = '${adminId}' and display_name = '${marker}');
insert into fixture_entities select 'athlete_achievement_groups', id::text from public.athlete_achievement_groups where athlete_id = '${athleteId}';
insert into fixture_entities select 'athlete_achievement_results', r.id::text from public.athlete_achievement_results r
  join public.athlete_achievement_groups g on g.id = r.group_id where g.athlete_id = '${athleteId}';
select set_config('request.jwt.claim.sub', '${adminId}', true);
delete from public.athlete_achievement_groups where athlete_id = '${athleteId}';
delete from public.athletes where id = '${athleteId}';
delete from public.event_definitions where id = '${eventId}';
delete from public.profiles where id = '${adminId}';
delete from auth.users where id = '${adminId}';
delete from private.admin_audit_log where (actor_id = '${adminId}' and exists (select 1 from fixture_entities))
  or (entity_schema in ('public', 'auth') and (entity_table, entity_id) in (select entity_table, id from fixture_entities));
do $$ begin if exists (select 1 from private.admin_audit_log where (actor_id = '${adminId}' and exists (select 1 from fixture_entities)) or (entity_schema in ('public', 'auth') and (entity_table, entity_id) in (select entity_table, id from fixture_entities)))
  or exists (select 1 from public.profiles where id = '${adminId}')
  or exists (select 1 from public.athlete_achievement_results where id::text in (select id from fixture_entities))
  or exists (select 1 from public.athlete_achievement_groups where athlete_id = '${athleteId}') or exists (select 1 from public.athletes where id = '${athleteId}') or exists (select 1 from public.event_definitions where id = '${eventId}') or exists (select 1 from auth.users where id = '${adminId}') then raise exception 'Concurrency proof cleanup left fixture residue.'; end if; end $$;
commit;
`;

export const setup = `
begin;
do $$ begin
  if exists (select 1 from auth.users where id = '${adminId}')
    or exists (select 1 from public.profiles where id = '${adminId}')
    or exists (select 1 from public.athletes where id = '${athleteId}')
    or exists (select 1 from public.event_definitions where id = '${eventId}' or code = '${marker}')
    or exists (select 1 from private.admin_audit_log where actor_id = '${adminId}' or entity_id in ('${adminId}', '${athleteId}', '${eventId}'))
  then raise exception 'Fixture collision; no changes allowed.'; end if;
end $$;
select set_config('request.jwt.claim.sub', '${adminId}', true);
insert into auth.users (id) values ('${adminId}');
insert into public.profiles (id, display_name, role, is_active) values ('${adminId}', '${marker}', 'administrator', true);
insert into public.athletes (id, display_name) values ('${athleteId}', '${marker}');
insert into public.event_definitions (id, discipline_id, code, name, course, is_active)
select '${eventId}', id, '${marker}', 'Concurrency proof event', 'long_course', true from public.disciplines where code = 'swimming';
select set_config('request.jwt.claim.sub', '${adminId}', true);
set local role authenticated;
do $$ begin
  for i in 1..5 loop
    perform public.save_athlete_achievement_group_draft(null, '${athleteId}', 'national_podium', 'Base group ' || i, 'Test meet', 'Test pool', current_date, jsonb_build_array(jsonb_build_object('event_definition_id', '${eventId}', 'podium_place', 1)));
  end loop;
end $$;
commit;
`;

const race = (title, holdSeconds = 0, requireContention = false) => `
begin;
${requireContention ? `do $$ begin
  if pg_try_advisory_xact_lock(hashtextextended('asanda:athlete-achievement-groups:${athleteId}', 0))
  then raise exception 'Concurrency overlap was not demonstrated.'; end if;
end $$;` : ''}
select pg_advisory_xact_lock(hashtextextended('asanda:athlete-achievement-groups:${athleteId}', 0));
select pg_sleep(${holdSeconds});
select set_config('request.jwt.claim.sub', '${adminId}', true);
set local role authenticated;
select * from public.save_athlete_achievement_group_draft(null, '${athleteId}', 'national_podium', '${title}', 'Race meet', 'Race pool', current_date, jsonb_build_array(jsonb_build_object('event_definition_id', '${eventId}', 'podium_place', 1)));
commit;
`;

const verify = `
do $$ begin
  if (select count(*) from public.athlete_achievement_groups where athlete_id = '${athleteId}') <> 6 then raise exception 'The concurrent cap did not finish at six groups.'; end if;
  if (select count(*) from public.athlete_achievement_groups where athlete_id = '${athleteId}' and title in ('Race A', 'Race B')) <> 1 then raise exception 'Exactly one concurrent create did not persist.'; end if;
end $$;
`;

export async function runHarness(execute = runSql, delay = (ms) => new Promise((done) => setTimeout(done, ms))) {
  let cleanupResult;
  try {
    const setupResult = await execute('setup', setup);
    assert.equal(setupResult.code, 0, 'Fixture setup failed; stop and inspect recovery privately.');
    const firstAttempt = execute('race-a', race('Race A', 20));
    await delay(2_000);
    const attempts = await Promise.all([firstAttempt, execute('race-b', race('Race B', 0, true))]);
    const rejection = attempts.find(({ output }) => /seis o más competencias/i.test(output));
    assert.ok(rejection, 'Expected concurrency rejection was not confirmed.');
    const successfulCandidate = attempts.find((attempt) => attempt !== rejection);
    assert.ok(successfulCandidate.code === 0 && !/Transport error/i.test(successfulCandidate.output), 'Concurrent create did not complete unambiguously.');
    const verification = await execute('verify', verify);
    assert.equal(verification.code, 0, 'Concurrency verification failed.');
    console.log('  ok - two concurrent database sessions started from five groups');
    console.log('  ok - exactly one seventh-group create succeeded and one received the Spanish cap rejection');
  } finally {
    cleanupResult = await execute('cleanup-after', cleanup);
    assert.equal(cleanupResult.code, 0, 'Fixture cleanup failed; stop and recover Restore Test privately.');
  }
  console.log('athlete achievement concurrency harness: 2/2 passed; fixtures removed');

}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assertRestoreTest(readFileSync(join(root, 'supabase/.temp/project-ref'), 'utf8'));
    temporaryDirectory = mkdtempSync(join(tmpdir(), 'asanda-achievement-race-'));
    await runHarness();
  } catch {
    console.error('Concurrency rehearsal failed. Stop; verify target, cleanup and recovery privately.');
    process.exitCode = 1;
  } finally {
    if (temporaryDirectory) rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}
