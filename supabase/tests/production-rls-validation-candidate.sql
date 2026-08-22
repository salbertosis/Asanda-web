-- Production RLS validation candidate, slices 1-3: access, editorial, athlete, club, and calendar authority.
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
  venue_id uuid;
  competition_id uuid;
  competition_event_id uuid;
  competition_slug text;
  athlete_label text;
  category_id uuid;
  discipline_id uuid;
  sport_id uuid;
  event_definition_id uuid;
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
  venue_id := md5(run_id || ':venue')::uuid;
  competition_id := md5(run_id || ':competition')::uuid;
  competition_event_id := md5(run_id || ':competition-event')::uuid;
  club_slug := fixture_slug || '-club';
  competition_slug := fixture_slug || '-competition';
  athlete_label := fixture_slug || '-athlete';
  select id into category_id from public.age_categories
    where code = 'youth-a' and is_active;
  select discipline.id, discipline.sport_id
    into discipline_id, sport_id
    from public.disciplines discipline
    join public.sports sport on sport.id = discipline.sport_id and sport.is_active
    where discipline.code = 'swimming' and discipline.is_active;
  select definition.id into event_definition_id
    from public.event_definitions definition
    join public.disciplines definition_discipline
      on definition_discipline.id = definition.discipline_id
    join public.sports definition_sport
      on definition_sport.id = definition_discipline.sport_id
    where definition_discipline.code = 'swimming'
      and definition_discipline.is_active
      and definition_sport.is_active
      and definition.is_active
    order by definition.code
    limit 1;
  checks := array[
    run_id ~ '^[a-f0-9]{32}$',
    administrator_id <> editor_id and administrator_id <> inactive_id and editor_id <> inactive_id,
    (select count(*) = 1 from public.profiles where id = administrator_id and role = 'administrator' and is_active),
    (select count(*) = 1 from public.profiles where id = editor_id and role = 'editor' and is_active),
    (select count(*) = 1 from public.profiles where id = inactive_id and not is_active),
    (select count(*) = 0 from public.news_articles where id = fixture_id or slug = fixture_slug),
    (select count(*) = 0 from public.organizations where id = club_id or slug = club_slug),
    (select count(*) = 0 from public.athletes where id = athlete_id or display_name = athlete_label),
    (select count(*) = 0 from public.venues where id = venue_id),
    (select count(*) = 0 from public.competitions where id = competition_id or slug = competition_slug),
    (select count(*) = 0 from public.competition_events where id = competition_event_id),
    category_id is not null,
    discipline_id is not null,
    sport_id is not null,
    event_definition_id is not null,
    pg_get_serial_sequence('private.admin_audit_log', 'id') is not null
  ];
  perform set_config('rlsv.fixture_id', fixture_id::text, true);
  perform set_config('rlsv.fixture_slug', fixture_slug, true);
  perform set_config('rlsv.club_id', club_id::text, true);
  perform set_config('rlsv.athlete_id', athlete_id::text, true);
  perform set_config('rlsv.club_slug', club_slug, true);
  perform set_config('rlsv.athlete_label', athlete_label, true);
  perform set_config('rlsv.venue_id', venue_id::text, true);
  perform set_config('rlsv.competition_id', competition_id::text, true);
  perform set_config('rlsv.competition_slug', competition_slug, true);
  perform set_config('rlsv.competition_event_id', competition_event_id::text, true);
  perform set_config('rlsv.category_id', coalesce(category_id::text, ''), true);
  perform set_config('rlsv.discipline_id', coalesce(discipline_id::text, ''), true);
  perform set_config('rlsv.sport_id', coalesce(sport_id::text, ''), true);
  perform set_config('rlsv.event_definition_id', coalesce(event_definition_id::text, ''), true);
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
  venue_id uuid := current_setting('rlsv.venue_id')::uuid;
  competition_id uuid := current_setting('rlsv.competition_id')::uuid;
  competition_event_id uuid := current_setting('rlsv.competition_event_id')::uuid;
  category_id uuid := nullif(current_setting('rlsv.category_id'), '')::uuid;
  discipline_id uuid := nullif(current_setting('rlsv.discipline_id'), '')::uuid;
  sport_id uuid := nullif(current_setting('rlsv.sport_id'), '')::uuid;
  event_definition_id uuid := nullif(current_setting('rlsv.event_definition_id'), '')::uuid;
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
      insert into public.venues (id, name, city, region, country_code)
      values (
        venue_id, current_setting('rlsv.club_slug') || '-venue',
        current_setting('rlsv.club_slug') || '-city',
        current_setting('rlsv.club_slug') || '-region', 'ZZ'
      );
      insert into public.competitions (
        id, name, slug, sport_id, organizer_id, venue_id, starts_on, ends_on,
        recognition_status, status, published_at
      ) values (
        competition_id, current_setting('rlsv.competition_slug'),
        current_setting('rlsv.competition_slug'), sport_id, club_id, venue_id,
        current_date, current_date + 1, 'recognized', 'scheduled', now()
      );
      insert into public.competition_events (
        id, competition_id, event_definition_id, category_id, competitive_sex,
        round, sequence_number, scheduled_at, status
      ) values (
        competition_event_id, competition_id, event_definition_id, category_id,
        'open', 'timed_final', 1, current_date + interval '1 hour', 'scheduled'
      );
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
  venue_visible boolean := false;
  competition_visible boolean := false;
  event_visible boolean := false;
  event_definition_visible boolean := false;
  calendar_category_visible boolean := false;
  athlete_write_denied boolean := false;
  club_write_denied boolean := false;
  venue_write_denied boolean := false;
  competition_write_denied boolean := false;
  event_write_denied boolean := false;
  reorder_denied boolean := false;
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
    update public.venues set city = 'anonymous' where id = current_setting('rlsv.venue_id')::uuid;
    get diagnostics affected = row_count;
    venue_write_denied := affected = 0;
    update public.competitions set description = 'anonymous' where id = current_setting('rlsv.competition_id')::uuid;
    get diagnostics affected = row_count;
    competition_write_denied := affected = 0;
    update public.competition_events set status = 'cancelled'
      where id = current_setting('rlsv.competition_event_id')::uuid;
    get diagnostics affected = row_count;
    event_write_denied := affected = 0;
    begin
      perform public.reorder_competition_events(
        current_setting('rlsv.competition_id')::uuid,
        array[current_setting('rlsv.competition_event_id')::uuid]
      );
    exception when insufficient_privilege then reorder_denied := true;
    end;
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
    select count(*) = 1 into venue_visible from public.venues
      where id = current_setting('rlsv.venue_id')::uuid;
    select count(*) = 1 into competition_visible from public.competitions
      where id = current_setting('rlsv.competition_id')::uuid;
    select count(*) = 1 into event_visible from public.competition_events
      where id = current_setting('rlsv.competition_event_id')::uuid;
    select count(*) = 1 into event_definition_visible from public.event_definitions
      where id = current_setting('rlsv.event_definition_id')::uuid;
    select count(*) = 1 into calendar_category_visible from public.age_categories
      where id = current_setting('rlsv.category_id')::uuid;
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
  perform set_config('rlsv.anonymous_venue_visible', venue_visible::text, true);
  perform set_config('rlsv.anonymous_competition_visible', competition_visible::text, true);
  perform set_config('rlsv.anonymous_event_visible', event_visible::text, true);
  perform set_config('rlsv.anonymous_event_definition_visible', event_definition_visible::text, true);
  perform set_config('rlsv.anonymous_event_category_visible', calendar_category_visible::text, true);
  perform set_config('rlsv.anonymous_venue_write_denied', venue_write_denied::text, true);
  perform set_config('rlsv.anonymous_competition_write_denied', competition_write_denied::text, true);
  perform set_config('rlsv.anonymous_event_write_denied', event_write_denied::text, true);
  perform set_config('rlsv.anonymous_calendar_write_denied',
    (venue_write_denied and competition_write_denied and event_write_denied)::text, true);
  perform set_config('rlsv.anonymous_reorder_denied', reorder_denied::text, true);
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
  venue_visible boolean := false;
  competition_visible boolean := false;
  event_visible boolean := false;
  event_definition_visible boolean := false;
  calendar_category_visible boolean := false;
  athlete_write_denied boolean := false;
  club_write_denied boolean := false;
  venue_write_denied boolean := false;
  competition_write_denied boolean := false;
  event_write_denied boolean := false;
  reorder_denied boolean := false;
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
    update public.venues set city = 'inactive' where id = current_setting('rlsv.venue_id')::uuid;
    get diagnostics affected = row_count;
    venue_write_denied := affected = 0;
    update public.competitions set description = 'inactive' where id = current_setting('rlsv.competition_id')::uuid;
    get diagnostics affected = row_count;
    competition_write_denied := affected = 0;
    update public.competition_events set status = 'cancelled'
      where id = current_setting('rlsv.competition_event_id')::uuid;
    get diagnostics affected = row_count;
    event_write_denied := affected = 0;
    begin
      perform public.reorder_competition_events(
        current_setting('rlsv.competition_id')::uuid,
        array[current_setting('rlsv.competition_event_id')::uuid]
      );
    exception when insufficient_privilege then reorder_denied := true;
    end;
    select count(*) = 1 into athlete_visible from public.athletes
      where id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 0 into private_contact_hidden from public.organization_contacts
      where organization_id = current_setting('rlsv.club_id')::uuid and not is_public;
    select count(*) = 0 into consents_hidden from public.athlete_consents
      where athlete_id = current_setting('rlsv.athlete_id')::uuid;
    select count(*) = 1 into venue_visible from public.venues
      where id = current_setting('rlsv.venue_id')::uuid;
    select count(*) = 1 into competition_visible from public.competitions
      where id = current_setting('rlsv.competition_id')::uuid;
    select count(*) = 1 into event_visible from public.competition_events
      where id = current_setting('rlsv.competition_event_id')::uuid;
    select count(*) = 1 into event_definition_visible from public.event_definitions
      where id = current_setting('rlsv.event_definition_id')::uuid;
    select count(*) = 1 into calendar_category_visible from public.age_categories
      where id = current_setting('rlsv.category_id')::uuid;
  end if;
  perform set_config('rlsv.inactive_write_denied', denied::text, true);
  perform set_config('rlsv.inactive_own_profile_only', own_profile_only::text, true);
  perform set_config('rlsv.inactive_athlete_visible', athlete_visible::text, true);
  perform set_config('rlsv.inactive_private_contact_hidden', private_contact_hidden::text, true);
  perform set_config('rlsv.inactive_consents_hidden', consents_hidden::text, true);
  perform set_config('rlsv.inactive_venue_visible', venue_visible::text, true);
  perform set_config('rlsv.inactive_competition_visible', competition_visible::text, true);
  perform set_config('rlsv.inactive_event_visible', event_visible::text, true);
  perform set_config('rlsv.inactive_event_definition_visible', event_definition_visible::text, true);
  perform set_config('rlsv.inactive_event_category_visible', calendar_category_visible::text, true);
  perform set_config('rlsv.inactive_athlete_write_denied', athlete_write_denied::text, true);
  perform set_config('rlsv.inactive_club_write_denied', club_write_denied::text, true);
  perform set_config('rlsv.inactive_calendar_write_denied',
    (venue_write_denied and competition_write_denied and event_write_denied)::text, true);
  perform set_config('rlsv.inactive_reorder_denied', reorder_denied::text, true);
end
$inactive$;

do $editor$
declare
  affected integer := 0;
  fixture_visible boolean := false;
  audit_denied boolean := false;
  athlete_updated boolean := false;
  club_visible boolean := false;
  competition_updated boolean := false;
  venue_updated boolean := false;
  event_updated boolean := false;
  event_reordered boolean := false;
  event_definition_visible boolean := false;
  calendar_category_visible boolean := false;
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
    update public.competitions
      set status = 'postponed', description = current_setting('rlsv.competition_slug') || '-editor'
      where id = current_setting('rlsv.competition_id')::uuid;
    get diagnostics affected = row_count;
    competition_updated := affected = 1;
    update public.venues
      set city = current_setting('rlsv.competition_slug') || '-editor-city'
      where id = current_setting('rlsv.venue_id')::uuid;
    get diagnostics affected = row_count;
    venue_updated := affected = 1;
    update public.competition_events set status = 'completed'
      where id = current_setting('rlsv.competition_event_id')::uuid;
    get diagnostics affected = row_count;
    event_updated := affected = 1;
    begin
      perform public.reorder_competition_events(
        current_setting('rlsv.competition_id')::uuid,
        array[current_setting('rlsv.competition_event_id')::uuid]
      );
      select count(*) = 1 into event_reordered
        from public.competition_events
        where id = current_setting('rlsv.competition_event_id')::uuid and sequence_number = 1;
    exception when others then event_reordered := false;
    end;
    select count(*) = 1 into event_definition_visible from public.event_definitions
      where id = current_setting('rlsv.event_definition_id')::uuid;
    select count(*) = 1 into calendar_category_visible from public.age_categories
      where id = current_setting('rlsv.category_id')::uuid;
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
  perform set_config('rlsv.editor_competition_updated', competition_updated::text, true);
  perform set_config('rlsv.editor_venue_updated', venue_updated::text, true);
  perform set_config('rlsv.editor_event_updated', event_updated::text, true);
  perform set_config('rlsv.editor_event_reordered', event_reordered::text, true);
  perform set_config('rlsv.editor_event_definition_visible', event_definition_visible::text, true);
  perform set_config('rlsv.editor_event_category_visible', calendar_category_visible::text, true);
  perform set_config('rlsv.editor_calendar_visible',
    (competition_updated and venue_updated and event_updated and event_reordered)::text, true);
end
$editor$;

do $administrator$
declare
  profiles_visible boolean := false;
  affected integer := 0;
  athlete_visible boolean := false;
  club_updated boolean := false;
  club_delete_denied boolean := false;
  competition_updated boolean := false;
  calendar_visible boolean := false;
  event_definition_visible boolean := false;
  calendar_category_visible boolean := false;
  competition_delete_denied boolean := false;
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
    update public.competitions
      set status = 'completed', description = current_setting('rlsv.competition_slug') || '-administrator'
      where id = current_setting('rlsv.competition_id')::uuid;
    get diagnostics affected = row_count;
    competition_updated := affected = 1;
    select count(*) = 1 into calendar_visible
      from public.venues venue
      join public.competitions competition on competition.venue_id = venue.id
      join public.competition_events event_row on event_row.competition_id = competition.id
      where venue.id = current_setting('rlsv.venue_id')::uuid
        and competition.id = current_setting('rlsv.competition_id')::uuid
        and event_row.id = current_setting('rlsv.competition_event_id')::uuid
        and event_row.event_definition_id = current_setting('rlsv.event_definition_id')::uuid
        and event_row.category_id = current_setting('rlsv.category_id')::uuid;
    select count(*) = 1 into event_definition_visible from public.event_definitions
      where id = current_setting('rlsv.event_definition_id')::uuid;
    select count(*) = 1 into calendar_category_visible from public.age_categories
      where id = current_setting('rlsv.category_id')::uuid;
    select count(*) = 1 into athlete_visible from public.athletes
      where id = current_setting('rlsv.athlete_id')::uuid;
    begin
      delete from public.organizations where id = current_setting('rlsv.club_id')::uuid;
    exception when foreign_key_violation then
      club_delete_denied := true;
    end;
    begin
      delete from public.competitions where id = current_setting('rlsv.competition_id')::uuid;
    exception when foreign_key_violation then
      competition_delete_denied := true;
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
  perform set_config('rlsv.administrator_competition_updated', competition_updated::text, true);
  perform set_config('rlsv.administrator_competition_delete_denied', competition_delete_denied::text, true);
  perform set_config('rlsv.administrator_event_definition_visible', event_definition_visible::text, true);
  perform set_config('rlsv.administrator_event_category_visible', calendar_category_visible::text, true);
  perform set_config('rlsv.administrator_calendar_visible',
    (calendar_visible and competition_updated)::text, true);
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
    (current_setting('rlsv.anonymous_event_category_visible')::boolean),
    (current_setting('rlsv.anonymous_discipline_visible')::boolean),
    (current_setting('rlsv.anonymous_athlete_write_denied')::boolean),
    (current_setting('rlsv.anonymous_club_write_denied')::boolean),
    (current_setting('rlsv.anonymous_venue_visible')::boolean),
    (current_setting('rlsv.anonymous_competition_visible')::boolean),
    (current_setting('rlsv.anonymous_event_visible')::boolean),
    (current_setting('rlsv.anonymous_event_definition_visible')::boolean),
    (current_setting('rlsv.anonymous_category_visible')::boolean),
    (current_setting('rlsv.anonymous_venue_write_denied')::boolean),
    (current_setting('rlsv.anonymous_competition_write_denied')::boolean),
    (current_setting('rlsv.anonymous_event_write_denied')::boolean),
    (current_setting('rlsv.anonymous_calendar_write_denied')::boolean),
    (current_setting('rlsv.anonymous_reorder_denied')::boolean),
    (current_setting('rlsv.inactive_write_denied')::boolean),
    (current_setting('rlsv.inactive_own_profile_only')::boolean),
     (current_setting('rlsv.inactive_athlete_visible')::boolean),
     (current_setting('rlsv.inactive_private_contact_hidden')::boolean),
     (current_setting('rlsv.inactive_consents_hidden')::boolean),
     (current_setting('rlsv.inactive_venue_visible')::boolean),
     (current_setting('rlsv.inactive_competition_visible')::boolean),
     (current_setting('rlsv.inactive_event_visible')::boolean),
     (current_setting('rlsv.inactive_event_definition_visible')::boolean),
     (current_setting('rlsv.inactive_event_category_visible')::boolean),
     (current_setting('rlsv.inactive_athlete_write_denied')::boolean),
    (current_setting('rlsv.inactive_club_write_denied')::boolean),
    (current_setting('rlsv.inactive_calendar_write_denied')::boolean),
    (current_setting('rlsv.inactive_reorder_denied')::boolean),
    (current_setting('rlsv.editor_fixture_visible')::boolean),
    (current_setting('rlsv.editor_escalation_denied')::boolean),
    (current_setting('rlsv.editor_audit_denied')::boolean),
    (current_setting('rlsv.editor_athlete_updated')::boolean),
    (current_setting('rlsv.editor_club_visible')::boolean),
    (current_setting('rlsv.editor_competition_updated')::boolean),
     (current_setting('rlsv.editor_venue_updated')::boolean),
     (current_setting('rlsv.editor_event_updated')::boolean),
     (current_setting('rlsv.editor_event_reordered')::boolean),
     (current_setting('rlsv.editor_event_definition_visible')::boolean),
     (current_setting('rlsv.editor_event_category_visible')::boolean),
     (current_setting('rlsv.editor_calendar_visible')::boolean),
    (current_setting('rlsv.administrator_profiles_visible')::boolean),
    (current_setting('rlsv.administrator_athlete_visible')::boolean),
    (current_setting('rlsv.administrator_club_updated')::boolean),
     (current_setting('rlsv.administrator_club_delete_denied')::boolean),
     (current_setting('rlsv.administrator_competition_updated')::boolean),
     (current_setting('rlsv.administrator_competition_delete_denied')::boolean),
      (current_setting('rlsv.administrator_event_definition_visible')::boolean),
       (current_setting('rlsv.administrator_event_category_visible')::boolean),
       (current_setting('rlsv.administrator_calendar_visible')::boolean)
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
    ,count(*) filter (
      where actor_id = current_setting('rlsv.administrator_id')::uuid
        and action = 'INSERT'
        and (
          (entity_table = 'organizations' and entity_id = current_setting('rlsv.club_id'))
          or (entity_table = 'organization_contacts' and entity_id = any(array[
            md5(current_setting('rlsv.run_id') || ':public-contact'),
            md5(current_setting('rlsv.run_id') || ':private-contact')
          ]))
          or (entity_table = 'venues' and entity_id = current_setting('rlsv.venue_id'))
          or (entity_table = 'competitions' and entity_id = current_setting('rlsv.competition_id'))
          or (entity_table = 'competition_events' and entity_id = current_setting('rlsv.competition_event_id'))
          or (entity_table = 'athletes' and entity_id = current_setting('rlsv.athlete_id'))
          or (entity_table = 'athlete_consents' and entity_id = any(array[
            md5(current_setting('rlsv.run_id') || ':public-consent'),
            md5(current_setting('rlsv.run_id') || ':results-consent')
          ]))
           or (entity_table = 'athlete_category_assignments' and entity_id = md5(current_setting('rlsv.run_id') || ':category'))
           or (entity_table = 'athlete_disciplines' and entity_id = current_setting('rlsv.athlete_id') || ':' || current_setting('rlsv.discipline_id'))
            or (entity_table = 'athlete_memberships' and entity_id = md5(current_setting('rlsv.run_id') || ':membership'))
         )
    )::integer as administrator_setup_attributed
    ,count(*) filter (
      where actor_id = current_setting('rlsv.editor_id')::uuid
        and action = 'INSERT'
        and entity_table = 'news_articles'
        and entity_id = current_setting('rlsv.fixture_id')
    )::integer as editor_news_insert_attributed
    ,count(*) filter (
      where actor_id = current_setting('rlsv.editor_id')::uuid
        and action = 'UPDATE'
        and (
          (entity_table = 'news_articles' and entity_id = current_setting('rlsv.fixture_id'))
           or (entity_table = 'athletes' and entity_id = current_setting('rlsv.athlete_id'))
           or (entity_table = 'competitions' and entity_id = current_setting('rlsv.competition_id'))
           or (entity_table = 'venues' and entity_id = current_setting('rlsv.venue_id'))
           or (entity_table = 'competition_events' and entity_id = current_setting('rlsv.competition_event_id'))
         )
    )::integer as editor_updates_attributed
    ,count(*) filter (
      where actor_id = current_setting('rlsv.administrator_id')::uuid
        and action = 'UPDATE'
        and (
          (entity_table = 'news_articles' and entity_id = current_setting('rlsv.fixture_id'))
          or (entity_table = 'athletes' and entity_id = current_setting('rlsv.athlete_id'))
          or (entity_table = 'organizations' and entity_id = current_setting('rlsv.club_id'))
          or (entity_table = 'competitions' and entity_id = current_setting('rlsv.competition_id'))
        )
    )::integer as administrator_updates_attributed
  from private.admin_audit_log
  where transaction_id = txid_current()
    and entity_table in (
      'news_articles', 'organizations', 'organization_contacts', 'athletes',
      'athlete_consents', 'athlete_memberships', 'athlete_category_assignments',
       'athlete_disciplines', 'venues', 'competitions', 'competition_events'
    )
    and (
      entity_id = any(array[
        current_setting('rlsv.fixture_id'), current_setting('rlsv.club_id'),
         current_setting('rlsv.athlete_id'), md5(current_setting('rlsv.run_id') || ':public-contact'),
        md5(current_setting('rlsv.run_id') || ':private-contact'),
        md5(current_setting('rlsv.run_id') || ':public-consent'),
        md5(current_setting('rlsv.run_id') || ':results-consent'),
        md5(current_setting('rlsv.run_id') || ':membership'),
        md5(current_setting('rlsv.run_id') || ':category'),
         current_setting('rlsv.athlete_id') || ':' || current_setting('rlsv.discipline_id'),
         current_setting('rlsv.venue_id'), current_setting('rlsv.competition_id'),
         current_setting('rlsv.competition_event_id')
       ])
     )
), evidence as (
  select
    current_setting('rlsv.preflight_ok')::boolean as preflight_ok,
    current_setting('rlsv.setup_ok')::boolean as setup_ok,
    count(*) filter (where passed)::integer as role_checks_passed,
    count(*)::integer as role_checks_total,
    audit_ledger.*,
    audit_ledger.actual_rows = 24
      and audit_ledger.administrator_inserts = 12
      and audit_ledger.editor_inserts = 1
      and audit_ledger.editor_updates = 7
      and audit_ledger.administrator_updates = 4
      and audit_ledger.administrator_setup_attributed = 12
      and audit_ledger.editor_news_insert_attributed = 1
      and audit_ledger.editor_updates_attributed = 6
      and audit_ledger.administrator_updates_attributed = 4 as ledger_matches
  from role_checks cross join audit_ledger
  group by audit_ledger.actual_rows, audit_ledger.editor_inserts,
    audit_ledger.editor_updates, audit_ledger.administrator_updates,
      audit_ledger.administrator_inserts,
    audit_ledger.administrator_setup_attributed,
    audit_ledger.editor_news_insert_attributed,
    audit_ledger.editor_updates_attributed,
    audit_ledger.administrator_updates_attributed
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
       then 24 else null end as exact_sequence_allocations_on_pass,
     0::integer as stopped_sequence_allocations_min,
     25::integer as stopped_sequence_allocations_max,
  (select count(*)::integer from public.news_articles
    where id = current_setting('rlsv.fixture_id')::uuid)
    + (select count(*)::integer from public.organizations
      where id = current_setting('rlsv.club_id')::uuid)
     + (select count(*)::integer from public.athletes
       where id = current_setting('rlsv.athlete_id')::uuid)
     + (select count(*)::integer from private.athlete_details
       where athlete_id = current_setting('rlsv.athlete_id')::uuid)
     + (select count(*)::integer from public.athlete_consents
       where athlete_id = current_setting('rlsv.athlete_id')::uuid)
     + (select count(*)::integer from public.athlete_category_assignments
       where athlete_id = current_setting('rlsv.athlete_id')::uuid)
     + (select count(*)::integer from public.athlete_disciplines
       where athlete_id = current_setting('rlsv.athlete_id')::uuid)
     + (select count(*)::integer from public.athlete_memberships
       where athlete_id = current_setting('rlsv.athlete_id')::uuid)
     + (select count(*)::integer from public.organization_contacts
       where organization_id = current_setting('rlsv.club_id')::uuid)
     + (select count(*)::integer from public.venues
       where id = current_setting('rlsv.venue_id')::uuid)
     + (select count(*)::integer from public.competitions
       where id = current_setting('rlsv.competition_id')::uuid)
       + (select count(*)::integer from public.competition_events
         where id = current_setting('rlsv.competition_event_id')::uuid) as in_transaction_fixture_rows
from evidence;

rollback;
