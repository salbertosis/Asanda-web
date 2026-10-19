-- Synthetic rollback contract for ODD T1 / S1-S3.
-- The snapshot importer deliberately rejects provisional rows instead of storing them.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

do $contract$
declare
  editor_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  imported_id uuid;
  returned_name text;
  returned_events integer;
  returned_results integer;
  payload jsonb;
  changed_payload jsonb;
  public_rows jsonb;
  blocked boolean;
  role_name text;
  athletes_before bigint;
  organizations_before bigint;
  entries_before bigint;
  performances_before bigint;
  snapshots_before bigint;
  events_before bigint;
  results_before bigint;
  old_public_before bigint;
  old_public_after bigint;
  audit_count integer;
  failures text[] := array[]::text[];
begin
  if to_regprocedure('public.import_competition_result_snapshot(jsonb,text)') is null then
    raise exception 'RED: imported competition snapshot RPC is absent.';
  end if;
  if to_regprocedure('public.get_public_imported_competitions()') is null
    or to_regprocedure('public.get_public_imported_competition_results(uuid)') is null
  then
    raise exception 'Imported competition public RPCs are absent.';
  end if;
  if to_regprocedure('public.get_published_result_rows(uuid)') is null then
    raise exception 'The existing profile-based public result RPC is absent.';
  end if;

  if has_function_privilege('anon', 'public.import_competition_result_snapshot(jsonb,text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.import_competition_result_snapshot(jsonb,text)', 'EXECUTE')
  then
    failures := array_append(failures, 'snapshot import execution grants are unsafe');
  end if;
  if not has_function_privilege('anon', 'public.get_public_imported_competitions()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_public_imported_competitions()', 'EXECUTE')
    or not has_function_privilege('anon', 'public.get_public_imported_competition_results(uuid)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_public_imported_competition_results(uuid)', 'EXECUTE')
  then
    failures := array_append(failures, 'snapshot public read grants are incomplete');
  end if;
  if (select prosecdef from pg_proc where oid = 'public.get_public_imported_competitions()'::regprocedure)
    or (select prosecdef from pg_proc where oid = 'public.get_public_imported_competition_results(uuid)'::regprocedure)
  then
    failures := array_append(failures, 'snapshot public reads are not security invoker');
  end if;
  if not has_table_privilege('anon', 'public.imported_competition_snapshots', 'SELECT')
    or has_table_privilege('authenticated', 'public.imported_competition_snapshots', 'INSERT,UPDATE,DELETE')
    or has_table_privilege('anon', 'private.imported_competition_snapshot_sources', 'SELECT')
    or has_table_privilege('authenticated', 'private.imported_competition_snapshot_sources', 'SELECT')
  then
    failures := array_append(failures, 'snapshot table privileges do not enforce public-read/private-source boundaries');
  end if;

  insert into auth.users (id) values (editor_id), (viewer_id);
  insert into public.profiles (id, display_name, role, is_active) values
    (editor_id, 'Synthetic snapshot editor', 'editor', true),
    (viewer_id, 'Synthetic snapshot viewer', 'viewer', true);

  select count(*) into athletes_before from public.athletes;
  select count(*) into organizations_before from public.organizations;
  select count(*) into entries_before from public.entries;
  select count(*) into performances_before from public.performances;
  select count(*) into snapshots_before from public.imported_competition_snapshots;
  select count(*) into events_before from public.imported_competition_events;
  select count(*) into results_before from public.imported_competition_results;
  select count(*) into old_public_before from public.get_published_result_rows(null::uuid);

  payload := jsonb_build_object(
    'competition', jsonb_build_object(
      'name', 'T1 Copa sintética HY3',
      'startsOn', '2026-10-17',
      'endsOn', '2026-10-18',
      'poolLengthMetres', 25,
      'venue', 'Piscina sintética'
    ),
    'events', jsonb_build_array(
      jsonb_build_object(
        'alias', 'E1', 'label', '50 m Libre Femenino', 'distanceMetres', 50,
        'stroke', 'freestyle', 'sex', 'female', 'round', 'timed_final',
        'category', 'Abierta'
      ),
      jsonb_build_object(
        'alias', 'E2', 'label', '4 x 50 m Libre Mixto', 'distanceMetres', 200,
        'stroke', 'freestyle', 'sex', 'mixed', 'round', 'final'
      )
    ),
    'results', jsonb_build_array(
      jsonb_build_object('alias', 'R1', 'eventAlias', 'E1', 'resultType', 'individual', 'participantName', 'Ana Sintética', 'clubName', 'Club Norte', 'place', 1, 'timeMs', 30123, 'lane', 4, 'status', 'official'),
      jsonb_build_object('alias', 'R2', 'eventAlias', 'E1', 'resultType', 'individual', 'participantName', 'Bea Sintética', 'clubName', 'Club Sur', 'timeMs', 30999, 'lane', 5, 'status', 'disqualified'),
      jsonb_build_object('alias', 'R3', 'eventAlias', 'E1', 'resultType', 'individual', 'participantName', 'Carla Sintética', 'lane', 6, 'status', 'did_not_start'),
      jsonb_build_object('alias', 'R4', 'eventAlias', 'E1', 'resultType', 'individual', 'participantName', 'Diana Sintética', 'status', 'did_not_finish'),
      jsonb_build_object('alias', 'R5', 'eventAlias', 'E1', 'resultType', 'individual', 'participantName', 'Elena Sintética', 'status', 'no_time'),
      jsonb_build_object('alias', 'R6', 'eventAlias', 'E2', 'resultType', 'relay', 'teamName', 'Relevo Mar Azul', 'clubName', 'Club Mar', 'relayMembers', jsonb_build_array('Luz Sintética', 'Mar Sintética', 'Sol Sintética', 'Paz Sintética'), 'place', 1, 'timeMs', 121500, 'lane', 3, 'status', 'official'),
      jsonb_build_object('alias', 'R7', 'eventAlias', 'E2', 'resultType', 'relay', 'teamName', 'Relevo Sin Piernas Identificadas', 'status', 'no_time')
    )
  );

  -- Anonymous and ordinary authenticated users cannot mutate snapshots.
  execute 'set local role anon';
  blocked := false;
  begin
    perform public.import_competition_result_snapshot(payload, repeat('a', 64));
  exception when insufficient_privilege then blocked := true;
  end;
  execute 'reset role';
  if not blocked then failures := array_append(failures, 'anonymous snapshot import was accepted'); end if;

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.import_competition_result_snapshot(payload, repeat('a', 64));
  exception when insufficient_privilege then blocked := true;
  end;
  execute 'reset role';
  if not blocked then failures := array_append(failures, 'non-editor snapshot import was accepted'); end if;

  -- Every rejected payload must leave aggregate counters and public output unchanged.
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  foreach changed_payload in array array[
    jsonb_set(payload, '{rawHy3}', '"private source"'::jsonb, true),
    jsonb_set(payload, '{competition,cedulas}', '[]'::jsonb, true),
    jsonb_set(payload, '{events,0,birthdate}', '"2000-01-01"'::jsonb, true),
    jsonb_set(payload, '{results,0,contact}', '"privado@example.test"'::jsonb, true),
    jsonb_set(payload, '{competition,startsOn}', '"2026-02-30"'::jsonb, true),
    jsonb_set(payload, '{competition,poolLengthMetres}', '33'::jsonb, true),
    jsonb_set(payload, '{events,0,sex}', '"unknown"'::jsonb, true),
    jsonb_set(payload, '{results,0,timeMs}', '0'::jsonb, true),
    jsonb_set(payload, '{results,0,place}', '1.5'::jsonb, true),
    jsonb_set(payload, '{results,0,status}', '"provisional"'::jsonb, true),
    jsonb_set(payload, '{results,0,eventAlias}', '"MISSING"'::jsonb, true),
    jsonb_set(payload, '{events,1,alias}', '"E1"'::jsonb, true),
    jsonb_set(payload, '{results,1,alias}', '"R1"'::jsonb, true),
    jsonb_set(payload, '{results,0,participantName}', 'null'::jsonb, true),
    jsonb_set(payload, '{results,5,teamName}', 'null'::jsonb, true),
    jsonb_set(payload, '{results,5,relayMembers}', '["Repeated", "Repeated"]'::jsonb, true)
  ] loop
    blocked := false;
    begin
      perform public.import_competition_result_snapshot(changed_payload, repeat('b', 64));
    exception when others then blocked := true;
    end;
    if not blocked then failures := array_append(failures, 'invalid, private, provisional, duplicate, or unscoped payload was accepted'); end if;
    if (select count(*) from public.imported_competition_snapshots) <> snapshots_before
      or (select count(*) from public.imported_competition_events) <> events_before
      or (select count(*) from public.imported_competition_results) <> results_before
      or (select count(*) from public.get_public_imported_competitions()) <> 0
    then
      failures := array_append(failures, 'rejected payload changed snapshot storage or public output');
    end if;
  end loop;

  select import_id, competition_name, event_count, result_count
    into strict imported_id, returned_name, returned_events, returned_results
  from public.import_competition_result_snapshot(payload, repeat('c', 64));
  execute 'reset role';

  if returned_name <> 'T1 Copa sintética HY3' or returned_events <> 2 or returned_results <> 7 then
    failures := array_append(failures, 'valid import did not return its public id, name, and counts');
  end if;
  if (select count(*) from public.athletes) <> athletes_before
    or (select count(*) from public.organizations) <> organizations_before
    or (select count(*) from public.entries) <> entries_before
    or (select count(*) from public.performances) <> performances_before
  then
    failures := array_append(failures, 'snapshot import created or changed profile-based sporting records');
  end if;

  -- Exact checksum and ambiguous name/date identity are immutable conflicts.
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  foreach changed_payload in array array[
    payload,
    jsonb_set(payload, '{competition,venue}', '"Otra piscina"'::jsonb, true)
  ] loop
    blocked := false;
    begin
      perform public.import_competition_result_snapshot(
        changed_payload,
        case when changed_payload = payload then repeat('c', 64) else repeat('d', 64) end
      );
    exception when unique_violation then blocked := true;
    end;
    if not blocked then failures := array_append(failures, 'duplicate checksum or ambiguous competition identity was accepted'); end if;
  end loop;
  execute 'reset role';
  if (select count(*) from public.imported_competition_snapshots) <> snapshots_before + 1
    or (select count(*) from public.imported_competition_events) <> events_before + 2
    or (select count(*) from public.imported_competition_results) <> results_before + 7
  then
    failures := array_append(failures, 'duplicate attempts created unintended snapshot rows');
  end if;

  -- Even privileged maintenance cannot silently replace or delete an import.
  blocked := false;
  begin
    update public.imported_competition_snapshots set venue = 'Cambio prohibido' where id = imported_id;
  exception when object_not_in_prerequisite_state then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'published snapshot update was accepted'); end if;
  blocked := false;
  begin
    delete from public.imported_competition_results where snapshot_id = imported_id;
  exception when object_not_in_prerequisite_state then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'published snapshot result deletion was accepted'); end if;

  select count(*) into audit_count
  from private.admin_audit_log
  where actor_id = editor_id
    and entity_table = 'imported_competition_snapshots'
    and entity_id = imported_id::text
    and action = 'INSERT';
  if audit_count <> 1 then failures := array_append(failures, 'snapshot import audit attribution is missing'); end if;

  foreach role_name in array array['anon', 'authenticated'] loop
    if role_name = 'authenticated' then
      perform set_config('request.jwt.claim.sub', viewer_id::text, true);
    end if;
    execute format('set local role %I', role_name);

    if (select count(*) from public.get_public_imported_competitions()) <> 1 then
      failures := array_append(failures, role_name || ' did not see exactly one published snapshot');
    end if;
    if exists (
      select 1
      from public.get_public_imported_competitions() summary
      cross join lateral jsonb_object_keys(to_jsonb(summary)) key_name
      where key_name not in (
        'import_id','competition_name','starts_on','ends_on','pool_length_metres',
        'venue','event_count','result_count'
      )
    ) then
      failures := array_append(failures, role_name || ' received a field outside the public competition summary whitelist');
    end if;
    select coalesce(jsonb_agg(to_jsonb(result_row) order by result_alias), '[]'::jsonb)
      into public_rows
    from public.get_public_imported_competition_results(imported_id) result_row;
    if jsonb_array_length(public_rows) <> 7 then
      failures := array_append(failures, role_name || ' silently omitted an individual or relay result');
    end if;
    if exists (
      select 1
      from jsonb_array_elements(public_rows) item
      cross join lateral jsonb_object_keys(item) key_name
      where key_name not in (
        'import_id','competition_name','starts_on','ends_on','pool_length_metres','venue',
        'event_alias','event_label','distance_metres','stroke','competitive_sex','round','category',
        'result_alias','result_type','participant_name','team_name','club_name','relay_members',
        'place','time_ms','lane','status'
      )
    ) then
      failures := array_append(failures, role_name || ' received a field outside the exact public result whitelist');
    end if;
    if (select count(*) from jsonb_array_elements(public_rows) item where item->>'status' = 'provisional') <> 0 then
      failures := array_append(failures, role_name || ' received a provisional result');
    end if;
    if (select count(*) from jsonb_array_elements(public_rows) item where item->>'status' in ('official','disqualified','did_not_start','did_not_finish','no_time')) <> 7 then
      failures := array_append(failures, role_name || ' did not receive the complete final-status set');
    end if;
    if not exists (
      select 1 from jsonb_array_elements(public_rows) item
      where item->>'result_alias' = 'R6'
        and item->>'team_name' = 'Relevo Mar Azul'
        and jsonb_array_length(item->'relay_members') = 4
    ) or not exists (
      select 1 from jsonb_array_elements(public_rows) item
      where item->>'result_alias' = 'R7'
        and item->>'team_name' = 'Relevo Sin Piernas Identificadas'
        and item->'relay_members' = '[]'::jsonb
    ) then
      failures := array_append(failures, role_name || ' relay identity or team fallback is incomplete');
    end if;
    if exists (
      select 1 from jsonb_array_elements(public_rows) item
      where item->>'competition_name' <> 'T1 Copa sintética HY3'
        or item->>'starts_on' <> '2026-10-17'
        or item->>'ends_on' <> '2026-10-18'
        or item->>'pool_length_metres' <> '25'
        or item->>'venue' <> 'Piscina sintética'
        or item->>'event_alias' not in ('E1', 'E2')
        or item->>'event_label' is null
    ) then
      failures := array_append(failures, role_name || ' public competition/event metadata is incomplete or mis-scoped');
    end if;
    if (select count(*) from public.get_public_imported_competition_results(gen_random_uuid())) <> 0 then
      failures := array_append(failures, role_name || ' result query ignored import scoping');
    end if;
    execute 'reset role';
  end loop;

  select count(*) into old_public_after from public.get_published_result_rows(null::uuid);
  if old_public_after <> old_public_before then
    failures := array_append(failures, 'existing profile-based public result behavior changed');
  end if;

  if coalesce(array_length(failures, 1), 0) > 0 then
    raise exception 'Imported snapshot contract failures: %', array_to_string(failures, '; ');
  end if;
end
$contract$;

rollback;

-- Last SELECT is explicit CLI evidence that synthetic auth and snapshot rows rolled back.
select
  not exists (select 1 from public.profiles where display_name like 'Synthetic snapshot %')
  and not exists (select 1 from public.imported_competition_snapshots where name = 'T1 Copa sintética HY3')
  as imported_competition_snapshots_contract_passed;
