begin;

do $$
declare
  aquatics_id uuid;
  other_sport_id uuid;
  swimming_id uuid;
  other_discipline_id uuid;
  other_sport_discipline_id uuid;
  swimming_definition_id uuid;
  other_definition_id uuid;
  inactive_definition_id uuid;
  calendar_id uuid;
  competition_id uuid;
  event_id uuid;
  editor_calendar_id uuid;
  editor_id uuid;
  blocked boolean;
  visible integer;
  audit_start_id bigint := coalesce((select max(id) from private.admin_audit_log), 0);
begin
  select id into strict aquatics_id from public.sports where code = 'aquatics';
  select id into strict swimming_id from public.disciplines where code = 'swimming';
  editor_id := gen_random_uuid();
  insert into auth.users (id) values (editor_id);
  insert into public.profiles (id, display_name, role, is_active)
  values (editor_id, 'Calendar test editor', 'editor', true);

  insert into public.sports (code, name) values ('calendar-test-sport', 'Calendar test sport')
  returning id into other_sport_id;
  insert into public.disciplines (sport_id, code, name) values
    (aquatics_id, 'calendar-test-aquatics', 'Calendar test aquatics') returning id into other_discipline_id;
  insert into public.disciplines (sport_id, code, name) values
    (other_sport_id, 'calendar-test-other', 'Calendar test other') returning id into other_sport_discipline_id;
  insert into public.event_definitions (discipline_id, code, name, course) values
    (other_discipline_id, 'calendar-test-swimming', 'Calendar test swimming', 'long_course')
    returning id into swimming_definition_id;
  insert into public.event_definitions (discipline_id, code, name, course) values
    (swimming_id, 'calendar-test-aquatics-event', 'Calendar test aquatics event', 'long_course')
    returning id into other_definition_id;
  insert into public.event_definitions (discipline_id, code, name, course, is_active) values
    (other_discipline_id, 'calendar-test-inactive', 'Calendar test inactive', 'long_course', false)
    returning id into inactive_definition_id;

  insert into public.competition_calendars (discipline_id, season_year)
  values (other_discipline_id, 2030) returning id into calendar_id;
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.competitions'::regclass
      and tgname = 'enforce_competition_range_events'
      and tgdeferrable and tginitdeferred
  ) then raise exception 'Deferred competition range trigger is missing.'; end if;
  execute 'set local role anon';
  select count(*) into visible from public.competition_calendars where id = calendar_id;
  execute 'reset role';
  if visible <> 0 then raise exception 'Empty calendar was publicly visible.'; end if;

  blocked := false;
  begin
    insert into public.competition_calendars (discipline_id, season_year) values (other_discipline_id, 2030);
  exception when unique_violation then blocked := true;
  end;
  if not blocked then raise exception 'Duplicate discipline seasons were accepted.'; end if;
  blocked := false;
  begin
    insert into public.competition_calendars (discipline_id, season_year) values (other_discipline_id, 1999);
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Out-of-range calendar season was accepted.'; end if;

  blocked := false;
  begin
    insert into public.competitions (name, slug, sport_id, starts_on, calendar_id)
    values ('Wrong season', 'calendar-test-wrong-season', aquatics_id, date '2031-01-01', calendar_id);
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Competition/calendar season mismatch was accepted.'; end if;
  blocked := false;
  begin
    insert into public.competitions (name, slug, sport_id, starts_on, calendar_id)
    values ('Wrong sport', 'calendar-test-wrong-sport', other_sport_id, date '2030-01-01', calendar_id);
    set constraints all immediate;
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Deferred sport mismatch was accepted.'; end if;

  insert into public.competitions (name, slug, sport_id, starts_on, calendar_id)
  values ('Calendar test', 'calendar-test-valid', aquatics_id, date '2030-01-01', calendar_id)
  returning id into competition_id;
  set constraints all immediate;
  insert into public.competition_events (competition_id, event_definition_id, sequence_number)
  values (competition_id, swimming_definition_id, 1) returning id into event_id;
  blocked := false;
  begin
    insert into public.competition_events (competition_id, event_definition_id, sequence_number)
    values (competition_id, other_definition_id, 2);
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Same-sport, different-discipline event was accepted.'; end if;

  update public.event_definitions set is_active = false where id = swimming_definition_id;
  update public.disciplines set is_active = false where id = other_discipline_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  perform public.reorder_competition_events(competition_id, array[event_id]);
  update public.competition_events set status = 'completed' where id = event_id;
  execute 'reset role';
  blocked := false;
  begin
    update public.competition_events set event_definition_id = inactive_definition_id where id = event_id;
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Changing to an inactive event reference was accepted.'; end if;

  set constraints all deferred;
  update public.disciplines set sport_id = other_sport_id where id = other_discipline_id;
  update public.competitions set sport_id = other_sport_id where id = competition_id;
  set constraints all immediate;
  set constraints all deferred;
  blocked := false;
  begin
    update public.competitions set sport_id = aquatics_id where id = competition_id;
    set constraints all immediate;
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Inconsistent final parent sport was accepted.'; end if;

  blocked := false;
  begin
    update public.competition_calendars set season_year = 2031 where id = calendar_id;
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Used calendar identity was changed.'; end if;

  execute 'set local role anon';
  select count(*) into visible from public.competition_calendars where id = calendar_id;
  execute 'reset role';
  if visible <> 0 then raise exception 'Draft-backed calendar was publicly visible.'; end if;
  update public.competitions set status = 'scheduled', published_at = now() where id = competition_id;
  execute 'set local role anon';
  select count(*) into visible from public.competition_calendars where id = calendar_id;
  execute 'reset role';
  if visible <> 1 then raise exception 'Published competition calendar was not publicly visible.'; end if;
  update public.competitions set status = 'archived' where id = competition_id;
  execute 'set local role anon';
  select count(*) into visible from public.competitions where id = competition_id;
  execute 'reset role';
  if visible <> 0 then raise exception 'Published archived competition was publicly visible.'; end if;

  update public.profiles set is_active = false where id = editor_id;
  execute 'set local role authenticated';
  blocked := false;
  begin
    insert into public.competition_calendars (discipline_id, season_year)
    values (other_sport_discipline_id, 2030);
  exception when insufficient_privilege then blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'Inactive editor created a calendar.'; end if;
  update public.profiles set is_active = true where id = editor_id;
  execute 'set local role authenticated';
  insert into public.competition_calendars (discipline_id, season_year)
  values (other_sport_discipline_id, 2030) returning id into editor_calendar_id;
  execute 'reset role';
  if not exists (
    select 1 from private.admin_audit_log where id > audit_start_id and actor_id = editor_id
      and entity_table = 'competition_calendars' and entity_id = editor_calendar_id::text and action = 'INSERT'
  ) then raise exception 'Editor calendar mutation was not audited.'; end if;
  set constraints all immediate;
end;
$$;

rollback;
