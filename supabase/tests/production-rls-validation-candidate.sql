-- Production RLS validation candidate, slices 1-2: access, editorial, athlete, and club authority.
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
  club_id uuid;
  athlete_id uuid;
  club_slug text;
  athlete_label text;
  category_id uuid;
  discipline_id uuid;
  checks boolean[];
begin
  fixture_id := (
    substr(md5(run_id), 1, 8) || '-' || substr(md5(run_id), 9, 4) || '-' ||
    substr(md5(run_id), 13, 4) || '-' || substr(md5(run_id), 17, 4) || '-' ||
    substr(md5(run_id), 21, 12)
  )::uuid;
  fixture_slug := 'rlsv-' || substr(run_id, 1, 24);
  club_id := md5(run_id || ':club')::uuid;
  athlete_id := md5(run_id || ':athlete')::uuid;
  club_slug := fixture_slug || '-club';
  athlete_label := fixture_slug || '-athlete';
  select id into category_id from public.age_categories
    where code = 'youth-a' and is_active;
  select id into discipline_id from public.disciplines
    where code = 'swimming' and is_active;
  checks := array[
    run_id ~ '^[a-f0-9]{32}$',
    administrator_id <> editor_id and administrator_id <> inactive_id and editor_id <> inactive_id,
    (select count(*) = 1 from public.profiles where id = administrator_id and role = 'administrator' and is_active),
    (select count(*) = 1 from public.profiles where id = editor_id and role = 'editor' and is_active),
    (select count(*) = 1 from public.profiles where id = inactive_id and not is_active),
    (select count(*) = 0 from public.news_articles where id = fixture_id or slug = fixture_slug),
    (select count(*) = 0 from public.organizations where id = club_id or slug = club_slug),
    (select count(*) = 0 from public.athletes where id = athlete_id or display_name = athlete_label),
    category_id is not null,
    discipline_id is not null,
    pg_get_serial_sequence('private.admin_audit_log', 'id') is not null
  ];
  perform set_config('rlsv.fixture_id', fixture_id::text, true);
  perform set_config('rlsv.fixture_slug', fixture_slug, true);
  perform set_config('rlsv.club_id', club_id::text, true);
  perform set_config('rlsv.athlete_id', athlete_id::text, true);
  perform set_config('rlsv.club_slug', club_slug, true);
  perform set_config('rlsv.athlete_label', athlete_label, true);
  perform set_config('rlsv.category_id', coalesce(category_id::text, ''), true);
  perform set_config('rlsv.discipline_id', coalesce(discipline_id::text, ''), true);
  perform set_config('rlsv.preflight_ok', (false <> all(checks))::text, true);
  perform set_config('rlsv.preflight_passed', coalesce(array_length(array_remove(checks, false), 1), 0)::text, true);
  perform set_config('rlsv.setup_ok', 'false', true);
end
$preflight$;

do $setup$
declare
  run_id text := current_setting('rlsv.run_id');
  administrator_id uuid := current_setting('rlsv.administrator_id')::uuid;
  club_id uuid := current_setting('rlsv.club_id')::uuid;
  athlete_id uuid := current_setting('rlsv.athlete_id')::uuid;
  category_id uuid := nullif(current_setting('rlsv.category_id'), '')::uuid;
  discipline_id uuid := nullif(current_setting('rlsv.discipline_id'), '')::uuid;
begin
  if current_setting('rlsv.preflight_ok')::boolean then
    perform set_config('request.jwt.claim.sub', administrator_id::text, true);
    begin
      insert into public.organizations (id, organization_type, name, slug, publication_status)
      values (club_id, 'club', current_setting('rlsv.club_slug'), current_setting('rlsv.club_slug'), 'published');
      insert into public.organization_contacts
        (id, organization_id, contact_type, label, value, is_public, sort_order)
      values
        (md5(run_id || ':public-contact')::uuid, club_id, 'social',
         current_setting('rlsv.club_slug') || '-public-label',
         current_setting('rlsv.club_slug') || '-public-value', true, 1),
        (md5(run_id || ':private-contact')::uuid, club_id, 'social',
         current_setting('rlsv.club_slug') || '-private-label',
         current_setting('rlsv.club_slug') || '-private-value', false, 2);
      insert into public.athletes (id, display_name, publication_status)
      values (athlete_id, current_setting('rlsv.athlete_label'), 'draft');
      insert into private.athlete_details
        (athlete_id, date_of_birth, national_id_hash, national_id_last4)
      values (
        athlete_id, date '2000-01-01',
        encode(extensions.digest(run_id || ':private-details', 'sha256'), 'hex'), '0000'
      );
      insert into public.athlete_consents (id, athlete_id, consent_type, status, granted_at)
      values
        (md5(run_id || ':public-consent')::uuid, athlete_id, 'public_profile', 'granted', now()),
        (md5(run_id || ':results-consent')::uuid, athlete_id, 'results_publication', 'granted', now());
      insert into public.athlete_category_assignments
        (id, athlete_id, category_id, valid_from)
      values (md5(run_id || ':category')::uuid, athlete_id, category_id, current_date);
      insert into public.athlete_disciplines
        (athlete_id, discipline_id, is_primary, valid_from)
      values (athlete_id, discipline_id, true, current_date);
      insert into public.athlete_memberships
        (id, athlete_id, organization_id, membership_type, status, valid_from)
      values (md5(run_id || ':membership')::uuid, athlete_id, club_id, 'associated', 'active', current_date);
      update public.athletes set publication_status = 'published' where id = athlete_id;
      perform set_config('rlsv.setup_ok', 'true', true);
    exception when others then
      perform set_config('rlsv.setup_ok', 'false', true);
    end;
    perform set_config('request.jwt.claim.sub', '', true);
  end if;
end
$setup$;

set local role anon;
do $anonymous$
declare
  denied boolean := false;
  profiles_hidden boolean := false;
  affected integer := 0;
  athlete_visible boolean := false;
  public_contact_visible boolean := false;
  private_contact_hidden boolean := false;
  consents_hidden boolean := false;
  membership_visible boolean := false;
  category_visible boolean := false;
  discipline_visible boolean := false;
  athlete_write_denied boolean := false;
  club_write_denied boolean := false;
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
    update public.athletes set preferred_name = 'anonymous' where id = current_setting('rlsv.athlete_id')::uuid;
    get diagnostics affected = row_count;
    athlete_write_denied := affected = 0;
    update public.organizations set description = 'anonymous' where id = current_setting('rlsv.club_id')::uuid;
    get diagnostics affected = row_count;
    club_write_denied := affected = 0;
    select count(*) = 1 into athlete_visible from public.athletes
      where id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 1 into public_contact_visible from public.organization_contacts
      where organization_id = current_setting('rlsv.club_id')::uuid and is_public;
    select count(*) = 0 into private_contact_hidden from public.organization_contacts
      where organization_id = current_setting('rlsv.club_id')::uuid and not is_public;
    select count(*) = 0 into consents_hidden from public.athlete_consents
      where athlete_id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 1 into membership_visible from public.athlete_memberships
      where athlete_id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 1 into category_visible from public.athlete_category_assignments
      where athlete_id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 1 into discipline_visible from public.athlete_disciplines
      where athlete_id = current_setting('rlsv.athlete_id')::uuid;
  end if;
  perform set_config('rlsv.anonymous_write_denied', denied::text, true);
  perform set_config('rlsv.anonymous_profiles_hidden', profiles_hidden::text, true);
  perform set_config('rlsv.anonymous_athlete_visible', athlete_visible::text, true);
  perform set_config('rlsv.anonymous_public_contact_visible', public_contact_visible::text, true);
  perform set_config('rlsv.anonymous_private_contact_hidden', private_contact_hidden::text, true);
  perform set_config('rlsv.anonymous_consents_hidden', consents_hidden::text, true);
  perform set_config('rlsv.anonymous_membership_visible', membership_visible::text, true);
  perform set_config('rlsv.anonymous_category_visible', category_visible::text, true);
  perform set_config('rlsv.anonymous_discipline_visible', discipline_visible::text, true);
  perform set_config('rlsv.anonymous_athlete_write_denied', athlete_write_denied::text, true);
  perform set_config('rlsv.anonymous_club_write_denied', club_write_denied::text, true);
end
$anonymous$;

reset role;
set local role authenticated;
do $inactive$
declare
  denied boolean := false;
  own_profile_only boolean := false;
  affected integer := 0;
  athlete_visible boolean := false;
  private_contact_hidden boolean := false;
  consents_hidden boolean := false;
  athlete_write_denied boolean := false;
  club_write_denied boolean := false;
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
    update public.athletes set preferred_name = 'inactive' where id = current_setting('rlsv.athlete_id')::uuid;
    get diagnostics affected = row_count;
    athlete_write_denied := affected = 0;
    update public.organizations set description = 'inactive' where id = current_setting('rlsv.club_id')::uuid;
    get diagnostics affected = row_count;
    club_write_denied := affected = 0;
    select count(*) = 1 into athlete_visible from public.athletes
      where id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 0 into private_contact_hidden from public.organization_contacts
      where organization_id = current_setting('rlsv.club_id')::uuid and not is_public;
    select count(*) = 0 into consents_hidden from public.athlete_consents
      where athlete_id = current_setting('rlsv.athlete_id')::uuid;
  end if;
  perform set_config('rlsv.inactive_write_denied', denied::text, true);
  perform set_config('rlsv.inactive_own_profile_only', own_profile_only::text, true);
  perform set_config('rlsv.inactive_athlete_visible', athlete_visible::text, true);
  perform set_config('rlsv.inactive_private_contact_hidden', private_contact_hidden::text, true);
  perform set_config('rlsv.inactive_consents_hidden', consents_hidden::text, true);
  perform set_config('rlsv.inactive_athlete_write_denied', athlete_write_denied::text, true);
  perform set_config('rlsv.inactive_club_write_denied', club_write_denied::text, true);
end
$inactive$;

do $editor$
declare
  affected integer := 0;
  fixture_visible boolean := false;
  audit_denied boolean := false;
  athlete_updated boolean := false;
  club_visible boolean := false;
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
    update public.athletes
      set preferred_name = current_setting('rlsv.athlete_label') || '-edited'
      where id = current_setting('rlsv.athlete_id')::uuid;
    get diagnostics affected = row_count;
    athlete_updated := affected = 1;
    select count(*) = 1 into club_visible from public.organizations
      where id = current_setting('rlsv.club_id')::uuid;
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
  perform set_config('rlsv.editor_athlete_updated', athlete_updated::text, true);
  perform set_config('rlsv.editor_club_visible', club_visible::text, true);
end
$editor$;

do $administrator$
declare
  profiles_visible boolean := false;
  affected integer := 0;
  athlete_visible boolean := false;
  club_updated boolean := false;
  club_delete_denied boolean := false;
begin
  perform set_config('request.jwt.claim.sub', current_setting('rlsv.administrator_id'), true);
  if current_setting('rlsv.preflight_ok')::boolean then
    update public.news_articles
      set title = 'RLS validation administrator'
      where id = current_setting('rlsv.fixture_id')::uuid;
    update public.organizations
      set description = current_setting('rlsv.club_slug') || '-edited'
      where id = current_setting('rlsv.club_id')::uuid;
    get diagnostics affected = row_count;
    club_updated := affected = 1;
    select count(*) = 1 into athlete_visible from public.athletes
      where id = current_setting('rlsv.athlete_id')::uuid;
    begin
      delete from public.organizations where id = current_setting('rlsv.club_id')::uuid;
    exception when foreign_key_violation then
      club_delete_denied := true;
    end;
    select count(*) = 3 into profiles_visible
      from public.profiles
      where id = any(array[
        current_setting('rlsv.administrator_id')::uuid,
        current_setting('rlsv.editor_id')::uuid,
        current_setting('rlsv.inactive_id')::uuid
      ]);
  end if;
  perform set_config('rlsv.administrator_profiles_visible', profiles_visible::text, true);
  perform set_config('rlsv.administrator_athlete_visible', athlete_visible::text, true);
  perform set_config('rlsv.administrator_club_updated', club_updated::text, true);
  perform set_config('rlsv.administrator_club_delete_denied', club_delete_denied::text, true);
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
    (current_setting('rlsv.anonymous_athlete_visible')::boolean),
    (current_setting('rlsv.anonymous_public_contact_visible')::boolean),
    (current_setting('rlsv.anonymous_private_contact_hidden')::boolean),
    (current_setting('rlsv.anonymous_consents_hidden')::boolean),
    (current_setting('rlsv.anonymous_membership_visible')::boolean),
    (current_setting('rlsv.anonymous_category_visible')::boolean),
    (current_setting('rlsv.anonymous_discipline_visible')::boolean),
    (current_setting('rlsv.anonymous_athlete_write_denied')::boolean),
    (current_setting('rlsv.anonymous_club_write_denied')::boolean),
    (current_setting('rlsv.inactive_write_denied')::boolean),
    (current_setting('rlsv.inactive_own_profile_only')::boolean),
    (current_setting('rlsv.inactive_athlete_visible')::boolean),
    (current_setting('rlsv.inactive_private_contact_hidden')::boolean),
    (current_setting('rlsv.inactive_consents_hidden')::boolean),
    (current_setting('rlsv.inactive_athlete_write_denied')::boolean),
    (current_setting('rlsv.inactive_club_write_denied')::boolean),
    (current_setting('rlsv.editor_fixture_visible')::boolean),
    (current_setting('rlsv.editor_escalation_denied')::boolean),
    (current_setting('rlsv.editor_audit_denied')::boolean),
    (current_setting('rlsv.editor_athlete_updated')::boolean),
    (current_setting('rlsv.editor_club_visible')::boolean),
    (current_setting('rlsv.administrator_profiles_visible')::boolean),
    (current_setting('rlsv.administrator_athlete_visible')::boolean),
    (current_setting('rlsv.administrator_club_updated')::boolean),
    (current_setting('rlsv.administrator_club_delete_denied')::boolean)
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
    )::integer as administrator_updates,
    count(*) filter (
      where actor_id = current_setting('rlsv.administrator_id')::uuid and action = 'INSERT'
    )::integer as administrator_inserts
  from private.admin_audit_log
  where transaction_id = txid_current()
    and entity_table in (
      'news_articles', 'organizations', 'organization_contacts', 'athletes',
      'athlete_consents', 'athlete_memberships', 'athlete_category_assignments',
      'athlete_disciplines'
    )
    and entity_id = any(array[
      current_setting('rlsv.fixture_id'), current_setting('rlsv.club_id'),
      current_setting('rlsv.athlete_id'), md5(current_setting('rlsv.run_id') || ':public-contact'),
      md5(current_setting('rlsv.run_id') || ':private-contact'),
      md5(current_setting('rlsv.run_id') || ':public-consent'),
      md5(current_setting('rlsv.run_id') || ':results-consent'),
      md5(current_setting('rlsv.run_id') || ':membership'),
      md5(current_setting('rlsv.run_id') || ':category'),
      current_setting('rlsv.athlete_id') || ':' || current_setting('rlsv.discipline_id')
    ])
), evidence as (
  select
    current_setting('rlsv.preflight_ok')::boolean as preflight_ok,
    current_setting('rlsv.setup_ok')::boolean as setup_ok,
    count(*) filter (where passed)::integer as role_checks_passed,
    count(*)::integer as role_checks_total,
    audit_ledger.*,
    audit_ledger.actual_rows = 15
      and audit_ledger.administrator_inserts = 9
      and audit_ledger.editor_inserts = 1
      and audit_ledger.editor_updates = 2
      and audit_ledger.administrator_updates = 3 as ledger_matches
  from role_checks cross join audit_ledger
  group by audit_ledger.actual_rows, audit_ledger.editor_inserts,
    audit_ledger.editor_updates, audit_ledger.administrator_updates,
    audit_ledger.administrator_inserts
)
select
  (case when preflight_ok then 1 else 0 end) +
    (case when setup_ok then 1 else 0 end) + role_checks_passed +
    (case when ledger_matches then 1 else 0 end) as passed_checks,
  role_checks_total + 3 - (
    (case when preflight_ok then 1 else 0 end) +
    (case when setup_ok then 1 else 0 end) + role_checks_passed +
    (case when ledger_matches then 1 else 0 end)
  ) as failed_checks,
  case when preflight_ok and setup_ok and role_checks_passed = role_checks_total and ledger_matches
    then 'pass' else 'fail' end as candidate_outcome,
  actual_rows as actual_candidate_audit_rows,
  case when preflight_ok and setup_ok and role_checks_passed = role_checks_total and ledger_matches
    then 15 else null end as exact_sequence_allocations_on_pass,
  0::integer as stopped_sequence_allocations_min,
  16::integer as stopped_sequence_allocations_max,
  (select count(*)::integer from public.news_articles
    where id = current_setting('rlsv.fixture_id')::uuid)
    + (select count(*)::integer from public.organizations
      where id = current_setting('rlsv.club_id')::uuid)
    + (select count(*)::integer from public.athletes
      where id = current_setting('rlsv.athlete_id')::uuid) as in_transaction_fixture_rows
from evidence;

rollback;
