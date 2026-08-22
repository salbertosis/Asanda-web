-- Production RLS validation candidate, slice 1: access and editorial authority.
-- Planning artifact only. This file does not authorize production execution.
-- The approved wrapper supplies rlsv.* settings without echoing values and
-- guarantees rollback on client/session failure.

begin;

do $preflight$
declare
  run_id text := current_setting('rlsv.run_id');
  administrator_id uuid := current_setting('rlsv.administrator_id')::uuid;
  editor_id uuid := current_setting('rlsv.editor_id')::uuid;
  inactive_id uuid := current_setting('rlsv.inactive_id')::uuid;
  fixture_id uuid;
  fixture_slug text;
  checks boolean[];
begin
  fixture_id := (
    substr(md5(run_id), 1, 8) || '-' || substr(md5(run_id), 9, 4) || '-' ||
    substr(md5(run_id), 13, 4) || '-' || substr(md5(run_id), 17, 4) || '-' ||
    substr(md5(run_id), 21, 12)
  )::uuid;
  fixture_slug := 'rlsv-' || substr(run_id, 1, 24);
  checks := array[
    run_id ~ '^[a-f0-9]{32}$',
    administrator_id <> editor_id and administrator_id <> inactive_id and editor_id <> inactive_id,
    (select count(*) = 1 from public.profiles where id = administrator_id and role = 'administrator' and is_active),
    (select count(*) = 1 from public.profiles where id = editor_id and role = 'editor' and is_active),
    (select count(*) = 1 from public.profiles where id = inactive_id and not is_active),
    (select count(*) = 0 from public.news_articles where id = fixture_id or slug = fixture_slug),
    pg_get_serial_sequence('private.admin_audit_log', 'id') is not null
  ];
  perform set_config('rlsv.fixture_id', fixture_id::text, true);
  perform set_config('rlsv.fixture_slug', fixture_slug, true);
  perform set_config('rlsv.preflight_ok', (false <> all(checks))::text, true);
  perform set_config('rlsv.preflight_passed', coalesce(array_length(array_remove(checks, false), 1), 0)::text, true);
end
$preflight$;

set local role anon;
do $anonymous$
declare
  denied boolean := false;
  profiles_hidden boolean := false;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  if current_setting('rlsv.preflight_ok')::boolean then
    begin
      insert into public.news_articles (id, slug, title, publication_status)
      values (
        current_setting('rlsv.fixture_id')::uuid,
        current_setting('rlsv.fixture_slug'),
        'RLS validation',
        'draft'
      );
    exception when insufficient_privilege then denied := true;
    end;
    select count(*) = 0 into profiles_hidden from public.profiles;
  end if;
  perform set_config('rlsv.anonymous_write_denied', denied::text, true);
  perform set_config('rlsv.anonymous_profiles_hidden', profiles_hidden::text, true);
end
$anonymous$;

reset role;
set local role authenticated;
do $inactive$
declare
  denied boolean := false;
  own_profile_only boolean := false;
begin
  perform set_config('request.jwt.claim.sub', current_setting('rlsv.inactive_id'), true);
  if current_setting('rlsv.preflight_ok')::boolean then
    begin
      insert into public.news_articles (id, slug, title, publication_status)
      values (
        current_setting('rlsv.fixture_id')::uuid,
        current_setting('rlsv.fixture_slug'),
        'RLS validation',
        'draft'
      );
    exception when insufficient_privilege then denied := true;
    end;
    select count(*) = 1 into own_profile_only from public.profiles;
  end if;
  perform set_config('rlsv.inactive_write_denied', denied::text, true);
  perform set_config('rlsv.inactive_own_profile_only', own_profile_only::text, true);
end
$inactive$;

do $editor$
declare
  affected integer := 0;
  fixture_visible boolean := false;
  audit_denied boolean := false;
begin
  perform set_config('request.jwt.claim.sub', current_setting('rlsv.editor_id'), true);
  if current_setting('rlsv.preflight_ok')::boolean then
    insert into public.news_articles (id, slug, title, publication_status)
    values (
      current_setting('rlsv.fixture_id')::uuid,
      current_setting('rlsv.fixture_slug'),
      'RLS validation',
      'draft'
    );
    update public.news_articles
      set title = 'RLS validation editor'
      where id = current_setting('rlsv.fixture_id')::uuid;
    update public.profiles set role = 'administrator'
      where id = current_setting('rlsv.editor_id')::uuid;
    get diagnostics affected = row_count;
    select count(*) = 1 into fixture_visible
      from public.news_articles where id = current_setting('rlsv.fixture_id')::uuid;
    begin
      perform count(*) from private.admin_audit_log;
    exception when insufficient_privilege then audit_denied := true;
    end;
  end if;
  perform set_config('rlsv.editor_fixture_visible', fixture_visible::text, true);
  perform set_config('rlsv.editor_escalation_denied', (affected = 0)::text, true);
  perform set_config('rlsv.editor_audit_denied', audit_denied::text, true);
end
$editor$;

do $administrator$
declare
  profiles_visible boolean := false;
begin
  perform set_config('request.jwt.claim.sub', current_setting('rlsv.administrator_id'), true);
  if current_setting('rlsv.preflight_ok')::boolean then
    update public.news_articles
      set title = 'RLS validation administrator'
      where id = current_setting('rlsv.fixture_id')::uuid;
    select count(*) = 3 into profiles_visible
      from public.profiles
      where id = any(array[
        current_setting('rlsv.administrator_id')::uuid,
        current_setting('rlsv.editor_id')::uuid,
        current_setting('rlsv.inactive_id')::uuid
      ]);
  end if;
  perform set_config('rlsv.administrator_profiles_visible', profiles_visible::text, true);
end
$administrator$;

reset role;
do $clear_claim$
begin
  perform set_config('request.jwt.claim.sub', '', true);
end
$clear_claim$;

with role_checks(passed) as (
  values
    (current_setting('rlsv.anonymous_write_denied')::boolean),
    (current_setting('rlsv.anonymous_profiles_hidden')::boolean),
    (current_setting('rlsv.inactive_write_denied')::boolean),
    (current_setting('rlsv.inactive_own_profile_only')::boolean),
    (current_setting('rlsv.editor_fixture_visible')::boolean),
    (current_setting('rlsv.editor_escalation_denied')::boolean),
    (current_setting('rlsv.editor_audit_denied')::boolean),
    (current_setting('rlsv.administrator_profiles_visible')::boolean)
), audit_ledger as (
  select
    count(*)::integer as actual_rows,
    count(*) filter (
      where actor_id = current_setting('rlsv.editor_id')::uuid and action = 'INSERT'
    )::integer as editor_inserts,
    count(*) filter (
      where actor_id = current_setting('rlsv.editor_id')::uuid and action = 'UPDATE'
    )::integer as editor_updates,
    count(*) filter (
      where actor_id = current_setting('rlsv.administrator_id')::uuid and action = 'UPDATE'
    )::integer as administrator_updates
  from private.admin_audit_log
  where transaction_id = txid_current()
    and entity_table = 'news_articles'
    and entity_id = current_setting('rlsv.fixture_id')
), evidence as (
  select
    current_setting('rlsv.preflight_passed')::integer as preflight_passed,
    count(*) filter (where passed)::integer as role_checks_passed,
    audit_ledger.*,
    audit_ledger.actual_rows = 3
      and audit_ledger.editor_inserts = 1
      and audit_ledger.editor_updates = 1
      and audit_ledger.administrator_updates = 1 as ledger_matches
  from role_checks cross join audit_ledger
  group by audit_ledger.actual_rows, audit_ledger.editor_inserts,
    audit_ledger.editor_updates, audit_ledger.administrator_updates
)
select
  preflight_passed + role_checks_passed + ledger_matches::integer as passed_checks,
  16 - (preflight_passed + role_checks_passed + ledger_matches::integer) as failed_checks,
  case when preflight_passed = 7 and role_checks_passed = 8 and ledger_matches
    then 'pass' else 'fail' end as candidate_outcome,
  actual_rows as actual_candidate_audit_rows,
  case when preflight_passed = 7 and role_checks_passed = 8 and ledger_matches
    then 3 else null end as exact_sequence_allocations_on_pass,
  0::integer as stopped_sequence_allocations_min,
  4::integer as stopped_sequence_allocations_max,
  (select count(*)::integer from public.news_articles
    where id = current_setting('rlsv.fixture_id')::uuid) as in_transaction_fixture_rows
from evidence;

rollback;
