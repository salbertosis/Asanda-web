begin;
do $$
declare
  editor_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  discipline_id uuid;
  event_id uuid;
  short_event_id uuid;
  category_id uuid;
  athlete_id uuid;
  photo_id uuid;
  external_photo_id uuid;
  manual_id uuid;
  linked_id uuid;
  club_record_id uuid;
  national_record_id uuid;
  manual_revision bigint;
  linked_revision bigint;
  visible integer;
  blocked boolean;
  invalid_sql text;
  failures text[] := array[]::text[];
begin
  if exists (select 1 from pg_proc where oid = 'public.get_published_state_records()'::regprocedure and prosecdef)
     or pg_get_function_result('public.get_published_state_records()'::regprocedure) ~* 'external_url' then
    raise exception 'Public state records bypass RLS or expose external URLs.';
  end if;
  if has_table_privilege('authenticated', 'public.records', 'INSERT')
     or has_table_privilege('authenticated', 'public.records', 'UPDATE')
     or has_table_privilege('authenticated', 'public.records', 'DELETE') then
    raise exception 'Authenticated clients retain direct records DML.';
  end if;
  if pg_get_function_arguments('public.save_state_record_draft(uuid,bigint,uuid,text,uuid,text,uuid,uuid,text,bigint,smallint,text)'::regprocedure)
     ~* 'birth|document|national|contact|json|position|course' then
    raise exception 'The draft RPC accepts private, ranking, or editable-course data.';
  end if;
  if (select count(*) from pg_attribute where attrelid = 'public.records'::regclass and attnotnull and attname in ('athlete_name_snapshot', 'club_name_snapshot', 'event_name_snapshot', 'age_category_name_snapshot', 'competition_name_snapshot')) <> 5 then raise exception 'Required snapshots are nullable.'; end if;
  insert into auth.users (id) values (editor_id), (viewer_id);
  insert into public.profiles (id, display_name, role, is_active) values
    (editor_id, 'Synthetic records editor', 'editor', true),
    (viewer_id, 'Synthetic records viewer', 'viewer', true);
  select id into strict discipline_id from public.disciplines where code = 'swimming';
  insert into public.age_categories (code, name) values
    ('record-test-' || substr(gen_random_uuid()::text, 1, 8), 'Synthetic historical category') returning id into category_id;
  insert into public.event_definitions (discipline_id, code, name, course) values
    (discipline_id, 'record-lc-' || substr(gen_random_uuid()::text, 1, 8), 'Synthetic 100 freestyle', 'long_course') returning id into event_id;
  insert into public.event_definitions (discipline_id, code, name, course) values
    (discipline_id, 'record-sc-' || substr(gen_random_uuid()::text, 1, 8), 'Synthetic short-course event', 'short_course') returning id into short_event_id;
  insert into public.media_assets (provider, public_id, resource_type, is_public, alt_text) values
    ('cloudinary', 'record-photo-' || substr(gen_random_uuid()::text, 1, 8), 'image', true, 'Synthetic swimmer portrait') returning id into photo_id;
  insert into public.media_assets (provider, external_url, resource_type, is_public, alt_text) values
    ('external', 'https://example.invalid/portrait.jpg', 'image', true, 'Uncontrolled synthetic portrait') returning id into external_photo_id;
  insert into public.athletes (display_name, competitive_sex) values
    ('Directory-only synthetic athlete', 'female') returning id into athlete_id;

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.save_state_record_draft(null::uuid, null::bigint, null::uuid, 'Viewer swimmer', null::uuid, 'Viewer club', event_id, category_id, 'male', 60000::bigint, 2020::smallint, 'Viewer meet');
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then failures := array_append(failures, 'non-editor created a draft'); end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.save_state_record_draft(null::uuid, null::bigint, null::uuid, 'External photo swimmer', external_photo_id, 'Synthetic club', event_id, category_id, 'male', 60000::bigint, 2020::smallint, 'Synthetic meet');
  exception when check_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'external photo was accepted'); end if;
  blocked := false;
  begin
    perform public.save_state_record_draft(null::uuid, null::bigint, null::uuid, 'Short swimmer', null::uuid, 'Synthetic club', short_event_id, category_id, 'male', 60000::bigint, 2020::smallint, 'Synthetic meet');
  exception when no_data_found then blocked := true; end;
  if not blocked then failures := array_append(failures, 'short-course event was accepted'); end if;
  select record_id, revision into manual_id, manual_revision from public.save_state_record_draft(
    null::uuid, null::bigint, null::uuid, 'Historic Synthetic Swimmer', photo_id, 'Archive Aquatics', event_id, category_id, 'male', 60123::bigint, 1998::smallint, 'Synthetic State Meet');
  select record_id, revision into linked_id, linked_revision from public.save_state_record_draft(
    null::uuid, null::bigint, athlete_id, 'Authorized Snapshot Name', null::uuid, 'Future Waves Club', event_id, category_id, 'male', 58987::bigint, 2025::smallint, 'Synthetic Invitational');
  if exists (select 1 from public.get_published_state_records() where record_id in (manual_id, linked_id)) then
    failures := array_append(failures, 'draft record was visible');
  end if;
  manual_revision := public.set_state_record_published(manual_id, manual_revision, true);
  execute 'set local role anon';
  select count(*) into visible from public.get_published_state_records()
  where record_id = manual_id and athlete_photo_public_id is not null and athlete_photo_alt = 'Synthetic swimmer portrait';
  if visible <> 1 then failures := array_append(failures, 'invoker projection hid the controlled photo or published record'); end if;
  execute 'reset role';
  execute 'set local role authenticated';

  blocked := false;
  begin perform public.set_state_record_published(manual_id, manual_revision, true);
  exception when check_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'publish no-op was accepted'); end if;
  blocked := false;
  begin perform public.set_state_record_published(manual_id, manual_revision, null::boolean);
  exception when check_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'null publication target was accepted'); end if;
  blocked := false;
  begin perform public.set_state_record_published(manual_id, 0::bigint, false);
  exception when check_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'invalid expected revision was accepted'); end if;
  blocked := false;
  begin perform public.set_state_record_published(linked_id, linked_revision, true);
  exception when unique_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'duplicate published slot was accepted'); end if;
  manual_revision := public.set_state_record_published(manual_id, manual_revision, false);
  blocked := false; begin perform public.set_state_record_published(manual_id, manual_revision, false); exception when check_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'draft no-op was accepted'); end if;
  linked_revision := public.set_state_record_published(linked_id, linked_revision, true);
  blocked := false;
  begin perform public.set_state_record_published(manual_id, manual_revision - 1::bigint, true);
  exception when serialization_failure then blocked := true; end;
  if not blocked then failures := array_append(failures, 'stale revision was accepted'); end if;
  execute 'reset role';
  insert into public.records (scope_type, ratification_status, athlete_name_snapshot, club_name_snapshot,
    event_definition_id, event_name_snapshot, age_category_id, age_category_name_snapshot, competitive_sex,
    time_ms, achieved_year, competition_name_snapshot, course, publication_status)
  values ('club', 'ratified', 'Historic Club Swimmer', 'Historic Club', event_id, 'Historic Event', category_id,
    'Historic Category', 'open', 61000, 2010, 'Historic Club Meet', 'long_course', 'draft') returning id into club_record_id;
  insert into public.records (scope_type, ratification_status, athlete_name_snapshot, club_name_snapshot,
    event_definition_id, event_name_snapshot, age_category_id, age_category_name_snapshot, competitive_sex,
    time_ms, achieved_year, competition_name_snapshot, course, publication_status)
  values ('national', 'ratified', 'Historic National Swimmer', 'Historic Club', event_id, 'Historic Event', category_id,
    'Historic Category', 'open', 60000, 2011, 'Historic National Meet', 'long_course', 'draft') returning id into national_record_id;
  execute 'set local role anon';
  select count(*) into visible from public.records where id in (manual_id, linked_id, club_record_id, national_record_id);
  if visible <> 3 then failures := array_append(failures, 'RLS did not preserve historical scopes or hide state draft'); end if;
  select count(*) into visible from public.get_published_state_records() where record_id = linked_id and athlete_name = 'Authorized Snapshot Name' and category_name = 'Synthetic historical category';
  if visible <> 1 then failures := array_append(failures, 'state projection leaked historical scopes'); end if;
  execute 'reset role';
  select count(*) into visible from private.admin_audit_log where actor_id = editor_id and entity_table = 'records'
    and action = 'UPDATE' and reason in ('publish-state-record', 'unpublish-state-record');
  if visible <> 3 then failures := array_append(failures, 'publication actions were not clearly audited'); end if;
  blocked := false;
  begin update public.records set athlete_photo_asset_id = external_photo_id where id = manual_id;
  exception when check_violation then blocked := true; end;
  if not blocked then failures := array_append(failures, 'direct external photo write was accepted'); end if;
  foreach invalid_sql in array array[
    format('update public.records set time_ms = 0 where id = %L', manual_id),
    format('update public.records set achieved_year = 1800 where id = %L', manual_id),
    format('update public.records set competitive_sex = %L where id = %L', 'unknown', manual_id),
    format('update public.records set course = %L where id = %L', 'short_course', manual_id)
  ] loop
    begin execute invalid_sql; failures := array_append(failures, 'record constraint accepted: ' || invalid_sql);
    exception when check_violation then null; end;
  end loop;
  if coalesce(array_length(failures, 1), 0) > 0 then
    raise exception 'State record contract failures: %', array_to_string(failures, '; ');
  end if;
end;
$$;
rollback;
