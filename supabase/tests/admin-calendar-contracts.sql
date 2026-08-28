begin;

do $$
declare
  sport_id uuid;
  other_sport_id uuid;
  discipline_id uuid;
  swimming_calendar_id uuid;
  other_discipline_id uuid;
  definition_id uuid;
  other_definition_id uuid;
  category_id uuid;
  inactive_category_id uuid;
  venue_id uuid;
  competition_id uuid;
  event_id uuid;
  athlete_id uuid;
  blocked boolean;
  failures text[] := array[]::text[];
begin
  select id into strict sport_id from public.sports where code = 'aquatics';
  select id into strict discipline_id from public.disciplines where code = 'swimming';
  select calendar.id into strict swimming_calendar_id
  from public.competition_calendars calendar
  join public.disciplines discipline on discipline.id = calendar.discipline_id
  where discipline.code = 'swimming' and calendar.season_year = 2026;
  insert into public.sports (code, name) values ('task-42-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), 'Task 4.2 sport') returning id into other_sport_id;
  insert into public.disciplines (sport_id, code, name) values (other_sport_id, 'task-42-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), 'Task 4.2 discipline') returning id into other_discipline_id;
  insert into public.event_definitions (discipline_id, code, name, distance_metres, course)
  values (discipline_id, 'task-42-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), 'Task 4.2 event', 50, 'long_course') returning id into definition_id;
  insert into public.event_definitions (discipline_id, code, name, distance_metres, course)
  values (other_discipline_id, 'task-42-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), 'Task 4.2 foreign event', 50, 'long_course') returning id into other_definition_id;
  select id into strict category_id from public.age_categories where code = 'youth-a';
  insert into public.age_categories (code, name, is_active) values ('task-42-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), 'Task 4.2 inactive category', false) returning id into inactive_category_id;

  insert into public.venues (name, address, city, region, country_code)
  values ('Task 4.2 venue', 'Public avenue 1', 'Barcelona', 'Anzoátegui', 'VE') returning id into venue_id;
  blocked := false;
  begin
    insert into public.venues (name, address, city, region, country_code)
    values (' task 4.2 VENUE ', 'Public avenue 1', 'Barcelona', 'Anzoátegui', 'VE');
  exception when unique_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'exact venue identity was duplicated'); end if;

  blocked := false;
  begin
    insert into public.competitions (name, slug, sport_id, starts_on, ends_on, calendar_id)
    values ('Task 4.2 invalid dates', 'task-42-invalid-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), sport_id, date '2026-06-02', date '2026-06-01', swimming_calendar_id);
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'invalid competition date range was accepted'); end if;

  insert into public.competitions (name, slug, sport_id, venue_id, starts_on, ends_on, status, calendar_id)
  values ('Task 4.2 competition', 'task-42-competition-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''), sport_id, venue_id, date '2026-06-01', date '2026-06-02', 'draft', swimming_calendar_id) returning id into competition_id;
  insert into public.competition_events (competition_id, event_definition_id, category_id, competitive_sex, sequence_number, scheduled_at)
  values (competition_id, definition_id, category_id, 'open', 1, timestamptz '2026-06-01 04:00:00+00') returning id into event_id;

  blocked := false;
  begin
    insert into public.competition_events (competition_id, event_definition_id, sequence_number, scheduled_at)
    values (competition_id, definition_id, 2, timestamptz '2026-06-01 03:59:00+00');
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'Caracas previous-day event boundary was accepted'); end if;

  update public.competition_events set scheduled_at = timestamptz '2026-06-03 03:59:00+00' where id = event_id;
  blocked := false;
  begin
    update public.competitions set ends_on = date '2026-06-01' where id = competition_id;
    set constraints enforce_competition_range_events immediate;
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'competition range was shortened past an existing event'); end if;

  update public.competitions set ends_on = date '2026-06-03' where id = competition_id;
  set constraints enforce_competition_range_events immediate;
  set constraints enforce_competition_range_events deferred;
  blocked := false;
  begin
    update public.competitions set starts_on = date '2026-06-03' where id = competition_id;
    set constraints enforce_competition_range_events immediate;
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'competition range was moved past an existing event'); end if;
  update public.competition_events set scheduled_at = timestamptz '2026-06-01 04:00:00+00' where id = event_id;

  blocked := false;
  begin
    insert into public.competition_events (competition_id, event_definition_id, sequence_number)
    values (competition_id, other_definition_id, 2);
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'foreign sport event definition was accepted'); end if;

  blocked := false;
  begin
    insert into public.competition_events (competition_id, event_definition_id, category_id, sequence_number)
    values (competition_id, definition_id, inactive_category_id, 2);
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'inactive event category was accepted'); end if;

  blocked := false;
  begin
    insert into public.competition_events (competition_id, event_definition_id, sequence_number)
    values (competition_id, definition_id, 1);
  exception when unique_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'duplicate event sequence was accepted'); end if;

  blocked := false;
  begin
    update public.competition_events set scheduled_at = timestamptz '2026-06-04 04:00:00+00' where id = event_id;
  exception when check_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'out-of-range event schedule was accepted'); end if;

  insert into public.athletes (display_name) values ('Task 4.2 synthetic athlete') returning id into athlete_id;
  insert into public.entries (competition_event_id, athlete_id, status) values (event_id, athlete_id, 'entered');
  blocked := false;
  begin
    delete from public.competition_events where id = event_id;
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'event with an entry was deleted'); end if;

  blocked := false;
  begin
    delete from public.competitions where id = competition_id;
  exception when foreign_key_violation then blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'historical competition was deleted'); end if;
  if coalesce(array_length(failures, 1), 0) > 0 then raise exception 'Task 4.2 contract failures: %', array_to_string(failures, '; '); end if;
end;
$$;

rollback;
