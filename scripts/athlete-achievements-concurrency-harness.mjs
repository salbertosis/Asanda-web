import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const temporaryDirectory = mkdtempSync(join(tmpdir(), 'asanda-achievement-race-'));
const cli = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const adminId = '00000000-0000-4000-8000-00000000aa01';
const athleteId = '00000000-0000-4000-8000-00000000aa02';
const eventId = '00000000-0000-4000-8000-00000000aa03';

const runSql = (name, sql) => new Promise((resolveRun) => {
  const file = join(temporaryDirectory, `${name}.sql`);
  writeFileSync(file, sql);
  const child = spawn(cli, ['--yes', 'supabase@2.115.0', 'db', 'query', '--linked', '--file', file, '--agent', 'no', '--output', 'table'], { cwd: root, windowsHide: true, shell: process.platform === 'win32' });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk; });
  child.stderr.on('data', (chunk) => { output += chunk; });
  child.on('close', (code) => resolveRun({ code, output }));
});

const cleanup = `
begin;
delete from public.athlete_achievement_groups where athlete_id = '${athleteId}';
delete from public.athletes where id = '${athleteId}';
delete from public.event_definitions where id = '${eventId}';
delete from public.profiles where id = '${adminId}';
delete from auth.users where id = '${adminId}';
do $$ begin if exists (select 1 from public.athlete_achievement_groups where athlete_id = '${athleteId}') or exists (select 1 from public.athletes where id = '${athleteId}') or exists (select 1 from public.event_definitions where id = '${eventId}') or exists (select 1 from auth.users where id = '${adminId}') then raise exception 'Concurrency proof cleanup left fixture residue.'; end if; end $$;
commit;
`;

const setup = `
begin;
insert into auth.users (id) values ('${adminId}');
insert into public.profiles (id, display_name, role, is_active) values ('${adminId}', 'Concurrency proof administrator', 'administrator', true);
insert into public.athletes (id, display_name) values ('${athleteId}', 'Concurrency proof athlete');
insert into public.event_definitions (id, discipline_id, code, name, course, is_active)
select '${eventId}', id, 'achievement-concurrency-proof', 'Concurrency proof event', 'long_course', true from public.disciplines where code = 'swimming';
select set_config('request.jwt.claim.sub', '${adminId}', true);
set local role authenticated;
do $$ begin
  for i in 1..5 loop
    perform public.save_athlete_achievement_group_draft(null, '${athleteId}', 'national_podium', 'Base group ' || i, 'Test meet', 'Test pool', current_date, jsonb_build_array(jsonb_build_object('event_definition_id', '${eventId}', 'podium_place', 1)));
  end loop;
end $$;
commit;
`;

const race = (title, holdSeconds = 0) => `
begin;
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

let cleanupResult;
try {
  cleanupResult = await runSql('cleanup-before', cleanup);
  assert.equal(cleanupResult.code, 0, cleanupResult.output);
  const setupResult = await runSql('setup', setup);
  assert.equal(setupResult.code, 0, setupResult.output);
  const firstAttempt = runSql('race-a', race('Race A', 90));
  await new Promise((resolveDelay) => setTimeout(resolveDelay, 45_000));
  const attempts = await Promise.all([firstAttempt, runSql('race-b', race('Race B'))]);
  const rejection = attempts.find(({ output }) => /seis o más competencias/i.test(output));
  assert.ok(rejection, JSON.stringify(attempts, null, 2));
  const successfulCandidate = attempts.find((attempt) => attempt !== rejection);
  assert.ok(successfulCandidate.code === 0 || /Transport error/i.test(successfulCandidate.output), successfulCandidate.output);
  const verification = await runSql('verify', verify);
  assert.equal(verification.code, 0, verification.output);
  console.log('  ok - two concurrent database sessions started from five groups');
  console.log('  ok - exactly one seventh-group create succeeded and one received the Spanish cap rejection');
} finally {
  cleanupResult = await runSql('cleanup-after', cleanup);
  rmSync(temporaryDirectory, { recursive: true, force: true });
}
assert.equal(cleanupResult.code, 0, cleanupResult.output);
console.log('athlete achievement concurrency harness: 2/2 passed; fixtures removed');
