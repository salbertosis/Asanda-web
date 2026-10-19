begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

-- Public behavior contract for ODD task T1 (S2-S3).
do $contract$
declare
  sport_id uuid;
  swimming_discipline_id uuid;
  calendar_id uuid;
  definition_id uuid;
  category_id uuid;
  competition_id uuid;
  other_competition_id uuid;
  unpublished_competition_id uuid;
  draft_competition_id uuid;
  archived_competition_id uuid;
  cancelled_competition_id uuid;
  event_id uuid;
  cancelled_event_id uuid;
  other_event_id uuid;
  unpublished_event_id uuid;
  draft_event_id uuid;
  archived_event_id uuid;
  cancelled_competition_event_id uuid;
  athlete_id uuid;
  entry_id uuid;
  baseline_cancelled_event_official_id uuid;
  cancelled_event_performance_id uuid;
  unpublished_final_performance_id uuid;
  draft_final_performance_id uuid;
  archived_final_performance_id uuid;
  cancelled_competition_performance_id uuid;
  privacy_performance_ids uuid[] := array[]::uuid[];
  scope_performance_id uuid;
  club_id uuid;
  private_photo_id uuid;
  visible_count integer;
  payload jsonb;
  expected_statuses public.result_status[] := array[
    'official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time'
  ]::public.result_status[];
  result_status public.result_status;
  role_name text;
  athlete_index integer := 0;
  failures text[] := array[]::text[];
begin
  if to_regprocedure('public.get_public_competition_result_rows(uuid)') is null then
    raise exception 'The additive public competition result projection is missing.';
  end if;
  if to_regprocedure('public.get_published_result_rows(uuid)') is null then
    raise exception 'The existing public result RPC was removed.';
  end if;
  if not has_function_privilege('anon', 'public.get_public_competition_result_rows(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_public_competition_result_rows(uuid)', 'EXECUTE')
  then
    raise exception 'Public roles cannot execute the additive result projection.';
  end if;
  if (
    select prosecdef
    from pg_proc
    where oid = 'public.get_public_competition_result_rows(uuid)'::regprocedure
  ) then
    raise exception 'The public competition result projection must remain security invoker.';
  end if;

  select discipline.id, discipline.sport_id
    into strict swimming_discipline_id, sport_id
  from public.disciplines discipline
  where discipline.code = 'swimming' and discipline.is_active;
  select calendar.id into strict calendar_id
  from public.competition_calendars calendar
  where calendar.discipline_id = swimming_discipline_id and calendar.season_year = 2026;

  insert into public.age_categories (code, name)
  values ('t1-public-results-category', 'T1 categoría pública')
  returning id into category_id;
  insert into public.event_definitions (
    discipline_id, code, name, distance_metres, stroke, course
  ) values (
    swimming_discipline_id, 't1-public-results-event', 'T1 50 libre', 50, 'freestyle', 'long_course'
  ) returning id into definition_id;
  insert into public.organizations (organization_type, name, slug, publication_status)
  values ('club', 'T1 Club público', 't1-public-results-club', 'published')
  returning id into club_id;
  insert into public.media_assets (provider, public_id, resource_type, is_public, alt_text)
  values ('cloudinary', 't1-private-athlete-photo', 'image', false, 'T1 retrato privado')
  returning id into private_photo_id;

  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status, published_at, calendar_id
  ) values (
    'T1 competencia publicada', 't1-public-results-main', sport_id,
    date '2026-07-10', date '2026-07-12', 'completed', now(), calendar_id
  ) returning id into competition_id;
  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status, published_at, calendar_id
  ) values (
    'T1 otra competencia', 't1-public-results-other', sport_id,
    date '2026-08-01', date '2026-08-01', 'completed', now(), calendar_id
  ) returning id into other_competition_id;
  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status, calendar_id
  ) values (
    'T1 competencia no publicada', 't1-public-results-unpublished', sport_id,
    date '2026-09-01', date '2026-09-01', 'completed', calendar_id
  ) returning id into unpublished_competition_id;
  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status, published_at, calendar_id
  ) values (
    'T1 competencia borrador', 't1-public-results-draft', sport_id,
    date '2026-09-02', date '2026-09-02', 'draft', now(), calendar_id
  ) returning id into draft_competition_id;
  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status, published_at, calendar_id
  ) values (
    'T1 competencia archivada', 't1-public-results-archived', sport_id,
    date '2026-09-03', date '2026-09-03', 'archived', now(), calendar_id
  ) returning id into archived_competition_id;
  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status, published_at, calendar_id
  ) values (
    'T1 competencia cancelada', 't1-public-results-cancelled', sport_id,
    date '2026-09-04', date '2026-09-04', 'cancelled', now(), calendar_id
  ) returning id into cancelled_competition_id;

  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, scheduled_at, status
  ) values (
    competition_id, definition_id, category_id, 'female', 'final', 7,
    timestamptz '2026-07-11 14:00:00+00', 'completed'
  ) returning id into event_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, status
  ) values (
    competition_id, definition_id, category_id, 'female', 'final', 8, 'cancelled'
  ) returning id into cancelled_event_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, status
  ) values (
    other_competition_id, definition_id, category_id, 'female', 'timed_final', 1, 'completed'
  ) returning id into other_event_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, status
  ) values (
    unpublished_competition_id, definition_id, category_id, 'female', 'timed_final', 1, 'completed'
  ) returning id into unpublished_event_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, status
  ) values (
    draft_competition_id, definition_id, category_id, 'female', 'timed_final', 1, 'completed'
  ) returning id into draft_event_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, status
  ) values (
    archived_competition_id, definition_id, category_id, 'female', 'timed_final', 1, 'completed'
  ) returning id into archived_event_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex,
    round, sequence_number, status
  ) values (
    cancelled_competition_id, definition_id, category_id, 'female', 'timed_final', 1, 'completed'
  ) returning id into cancelled_competition_event_id;

  foreach result_status in array expected_statuses || array['provisional'::public.result_status] loop
    athlete_index := athlete_index + 1;
    insert into public.athletes (display_name, competitive_sex, photo_asset_id)
    values (
      'T1 atleta visible ' || athlete_index,
      'female',
      case when result_status = 'disqualified' then private_photo_id end
    ) returning id into athlete_id;
    insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
    values
      (athlete_id, 'public_profile', 'granted', now()),
      (athlete_id, 'results_publication', 'granted', now());
    if result_status = 'disqualified' then
      insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
      values (athlete_id, 'photo', 'granted', now());
    end if;
    update public.athletes set publication_status = 'published' where id = athlete_id;
    insert into public.entries (
      competition_event_id, athlete_id, represented_organization_id, lane, status
    ) values (
      event_id, athlete_id, club_id, athlete_index,
      case when result_status = 'did_not_start' then 'did_not_start' else 'confirmed' end
    ) returning id into entry_id;
    insert into public.performances (entry_id, time_ms, place, status)
    values (
      entry_id,
      case when result_status in ('official', 'provisional') then 30000 + athlete_index else null end,
      case when result_status = 'official' then 1 else null end,
      result_status
    );
  end loop;

  -- Published athletes without active result consent remain private.
  foreach role_name in array array['missing', 'revoked', 'draft'] loop
    insert into public.athletes (display_name, competitive_sex)
    values ('T1 atleta oculto ' || role_name, 'female') returning id into athlete_id;
    insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
    values (athlete_id, 'public_profile', 'granted', now());
    if role_name = 'revoked' then
      insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
      values (athlete_id, 'results_publication', 'withdrawn', now());
    elsif role_name = 'draft' then
      insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
      values (athlete_id, 'results_publication', 'granted', now());
    end if;
    if role_name <> 'draft' then
      update public.athletes set publication_status = 'published' where id = athlete_id;
    end if;
    insert into public.entries (competition_event_id, athlete_id, lane, status)
    values (event_id, athlete_id, 8 + athlete_index, 'confirmed') returning id into entry_id;
    athlete_index := athlete_index + 1;
    insert into public.performances (entry_id, status)
    values (entry_id, 'disqualified') returning id into scope_performance_id;
    privacy_performance_ids := array_append(privacy_performance_ids, scope_performance_id);
  end loop;

  -- Keep one official row in the other published competition for scoping and
  -- old-RPC preservation checks.
  insert into public.athletes (display_name, competitive_sex)
  values ('T1 atleta de otra competencia', 'female') returning id into athlete_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values
    (athlete_id, 'public_profile', 'granted', now()),
    (athlete_id, 'results_publication', 'granted', now());
  update public.athletes set publication_status = 'published' where id = athlete_id;
  insert into public.entries (competition_event_id, athlete_id, lane, status)
  values (other_event_id, athlete_id, 1, 'confirmed') returning id into entry_id;
  insert into public.performances (entry_id, time_ms, place, status)
  values (entry_id, 50000, 1, 'official');

  -- Preserve the pre-existing direct-table behavior for official rows. The
  -- additive RPC still excludes this row because its event is cancelled.
  insert into public.athletes (display_name, competitive_sex)
  values ('T1 atleta oficial de evento cancelado', 'female') returning id into athlete_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values
    (athlete_id, 'public_profile', 'granted', now()),
    (athlete_id, 'results_publication', 'granted', now());
  update public.athletes set publication_status = 'published' where id = athlete_id;
  insert into public.entries (competition_event_id, athlete_id, lane, status)
  values (cancelled_event_id, athlete_id, 2, 'confirmed') returning id into entry_id;
  insert into public.performances (entry_id, time_ms, place, status)
  values (entry_id, 51000, 1, 'official') returning id into baseline_cancelled_event_official_id;

  -- Final-state rows must not become directly readable when their event or
  -- competition is outside the new public projection's publication scope.
  foreach role_name in array array[
    'cancelled-event', 'unpublished', 'draft', 'archived', 'cancelled-competition'
  ] loop
    insert into public.athletes (display_name, competitive_sex)
    values ('T1 atleta de ámbito ' || role_name, 'female') returning id into athlete_id;
    insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
    values
      (athlete_id, 'public_profile', 'granted', now()),
      (athlete_id, 'results_publication', 'granted', now());
    update public.athletes set publication_status = 'published' where id = athlete_id;
    insert into public.entries (competition_event_id, athlete_id, lane, status)
    values (
      case role_name
        when 'cancelled-event' then cancelled_event_id
        when 'unpublished' then unpublished_event_id
        when 'draft' then draft_event_id
        when 'archived' then archived_event_id
        else cancelled_competition_event_id
      end,
      athlete_id, 1, 'confirmed'
    ) returning id into entry_id;
    insert into public.performances (entry_id, status)
    values (entry_id, 'disqualified') returning id into scope_performance_id;
    case role_name
      when 'cancelled-event' then cancelled_event_performance_id := scope_performance_id;
      when 'unpublished' then unpublished_final_performance_id := scope_performance_id;
      when 'draft' then draft_final_performance_id := scope_performance_id;
      when 'archived' then archived_final_performance_id := scope_performance_id;
      else cancelled_competition_performance_id := scope_performance_id;
    end case;
  end loop;

  foreach role_name in array array['anon', 'authenticated'] loop
    execute format('set local role %I', role_name);
    select count(*), coalesce(jsonb_agg(to_jsonb(result_row)), '[]'::jsonb)
      into visible_count, payload
    from public.get_public_competition_result_rows(competition_id) result_row;

    if visible_count <> 5 then
      failures := array_append(failures, role_name || ' did not receive exactly five final public rows');
    end if;
    if (
      select array_agg(
        (item->>'status')::public.result_status
        order by (item->>'status')::public.result_status
      )
      from jsonb_array_elements(payload) item
    ) is distinct from (
      select array_agg(status order by status) from unnest(expected_statuses) status
    ) then
      failures := array_append(failures, role_name || ' final status set is incorrect');
    end if;
    if exists (
      select 1 from jsonb_array_elements(payload) item
      where (item->>'competition_id')::uuid <> competition_id
        or item->>'competition_name' <> 'T1 competencia publicada'
        or (item->>'competition_starts_on')::date <> date '2026-07-10'
        or (item->>'competition_ends_on')::date <> date '2026-07-12'
        or (item->>'competition_event_id')::uuid <> event_id
        or (item->>'event_definition_id')::uuid <> definition_id
        or item->>'event_definition_code' <> 't1-public-results-event'
        or item->>'event_name' <> 'T1 50 libre'
        or (item->>'event_category_id')::uuid <> category_id
        or item->>'event_category_name' <> 'T1 categoría pública'
        or item->>'competitive_sex' <> 'female'
        or item->>'round' <> 'final'
        or (item->>'sequence_number')::integer <> 7
        or (item->>'lane')::integer not between 1 and 5
    ) then
      failures := array_append(failures, role_name || ' received incomplete competition/event metadata');
    end if;
    if exists (
      select 1 from jsonb_array_elements(payload) item
      where item ?| array[
        'preferred_name', 'birth_year_public', 'date_of_birth', 'national_id_encrypted',
        'national_id_last4', 'notes', 'source_document_id'
      ]
    ) then
      failures := array_append(failures, role_name || ' received fields outside the safe public contract');
    end if;
    if exists (
      select 1 from jsonb_array_elements(payload) item
      where item->>'status' = 'disqualified'
        and (item->>'athlete_photo_public_id' is not null
          or item->>'athlete_photo_external_url' is not null
          or item->>'athlete_photo_alt' is not null)
    ) then
      failures := array_append(failures, role_name || ' received non-public athlete media');
    end if;
    if exists (
      select 1 from public.performances
      where id = any(array[
        cancelled_event_performance_id,
        unpublished_final_performance_id,
        draft_final_performance_id,
        archived_final_performance_id,
        cancelled_competition_performance_id
      ])
    ) then
      failures := array_append(
        failures,
        role_name || ' can directly read a final result outside published event/competition scope'
      );
    end if;
    if exists (
      select 1 from public.performances where id = any(privacy_performance_ids)
    ) then
      failures := array_append(
        failures,
        role_name || ' can directly read a final result without publication and active results consent'
      );
    end if;
    if (select count(*) from public.performances where id = baseline_cancelled_event_official_id) <> 1 then
      failures := array_append(failures, role_name || ' lost pre-existing official direct-table visibility');
    end if;
    if (select count(*) from public.get_published_result_rows(competition_id)) <> 1 then
      failures := array_append(failures, role_name || ' existing official-only RPC behavior changed');
    end if;
    if (select count(*) from public.get_public_competition_result_rows(other_competition_id)) <> 1 then
      failures := array_append(failures, role_name || ' requested competition scoping is incorrect');
    end if;
    if (select count(*) from public.get_public_competition_result_rows(unpublished_competition_id)) <> 0 then
      failures := array_append(failures, role_name || ' unpublished competition result became public');
    end if;
    if (select count(*) from public.get_public_competition_result_rows(cancelled_competition_id)) <> 0 then
      failures := array_append(failures, role_name || ' cancelled competition result became public');
    end if;
    execute 'reset role';
  end loop;

  if coalesce(array_length(failures, 1), 0) > 0 then
    raise exception 'Public competition result contract failures: %', array_to_string(failures, '; ');
  end if;
end
$contract$;

rollback;

-- The last statement is the single CLI-visible evidence row and proves rollback cleanup.
select
  not exists (select 1 from public.competitions where slug like 't1-public-results-%')
  and not exists (select 1 from public.organizations where slug = 't1-public-results-club')
  and not exists (select 1 from public.event_definitions where code = 't1-public-results-event')
  and not exists (select 1 from public.age_categories where code = 't1-public-results-category')
  and not exists (select 1 from public.athletes where display_name like 'T1 atleta%')
  as public_competition_results_contract_passed;
