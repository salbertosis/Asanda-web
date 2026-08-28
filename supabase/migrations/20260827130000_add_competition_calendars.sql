create table public.competition_calendars (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  season_year smallint not null check (season_year between 2000 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (discipline_id, season_year)
);

create index competition_calendars_season_idx
  on public.competition_calendars (season_year, discipline_id);

alter table public.competitions
  add column calendar_id uuid references public.competition_calendars(id) on delete restrict;

create index competitions_calendar_idx
  on public.competitions (calendar_id) where calendar_id is not null;

create or replace function private.enforce_competition_calendar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  calendar_row public.competition_calendars;
begin
  if new.calendar_id is null then return new; end if;

  select * into strict calendar_row
  from public.competition_calendars where id = new.calendar_id;

  if extract(year from new.starts_on)::smallint <> calendar_row.season_year then
    raise exception 'Competition start year must match the calendar season.' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.competition_events event_row
    join public.event_definitions definition on definition.id = event_row.event_definition_id
    where event_row.competition_id = new.id
      and definition.discipline_id <> calendar_row.discipline_id
  ) then
    raise exception 'Every competition event must match the calendar discipline.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validate_calendar_sports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.competition_calendars calendar
    join public.disciplines discipline on discipline.id = calendar.discipline_id
    join public.competitions competition on competition.calendar_id = calendar.id
    where competition.sport_id <> discipline.sport_id
      and ((tg_table_name = 'competitions' and competition.id = new.id)
        or (tg_table_name = 'disciplines' and discipline.id = new.id))
  ) then
    raise exception 'Competition sport must match the calendar discipline parent sport.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.prevent_used_calendar_identity_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.discipline_id, new.season_year) is distinct from (old.discipline_id, old.season_year)
    and exists (select 1 from public.competitions where calendar_id = old.id)
  then
    raise exception 'A calendar with competitions cannot change discipline or season.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_competition_event_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  competition_row public.competitions;
  calendar_discipline_id uuid;
begin
  select * into strict competition_row from public.competitions where id = new.competition_id;
  if competition_row.calendar_id is not null then
    select discipline_id into strict calendar_discipline_id
    from public.competition_calendars where id = competition_row.calendar_id;
  end if;
  if not exists (
    select 1
    from public.event_definitions definition
    join public.disciplines discipline on discipline.id = definition.discipline_id
    where definition.id = new.event_definition_id
      and definition.is_active
      and discipline.is_active
      and case when calendar_discipline_id is null
        then discipline.sport_id = competition_row.sport_id
        else definition.discipline_id = calendar_discipline_id
      end
  ) then
    raise exception 'Event definitions must be active and match the competition discipline.' using errcode = '23514';
  end if;
  if new.category_id is not null and not exists (
    select 1 from public.age_categories category where category.id = new.category_id and category.is_active
  ) then
    raise exception 'Competition event categories must be active.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_competition_event_schedule()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  competition_row public.competitions;
begin
  select * into strict competition_row from public.competitions where id = new.competition_id;
  if new.scheduled_at is not null and (
    (new.scheduled_at at time zone 'America/Caracas')::date < competition_row.starts_on
    or (competition_row.ends_on is not null and (new.scheduled_at at time zone 'America/Caracas')::date > competition_row.ends_on)
  ) then
    raise exception 'Event schedules must remain inside the competition date range.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_competition_range_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.competition_events event_row
    where event_row.competition_id = new.id
      and event_row.scheduled_at is not null
      and (
        (event_row.scheduled_at at time zone 'America/Caracas')::date < new.starts_on
        or (new.ends_on is not null and (event_row.scheduled_at at time zone 'America/Caracas')::date > new.ends_on)
      )
  ) then
    raise exception 'Competition ranges must contain every scheduled event.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_definition_calendar_discipline()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.discipline_id is distinct from old.discipline_id and exists (
    select 1
    from public.competition_events event_row
    join public.competitions competition on competition.id = event_row.competition_id
    join public.competition_calendars calendar on calendar.id = competition.calendar_id
    where event_row.event_definition_id = old.id and calendar.discipline_id <> new.discipline_id
  ) then
    raise exception 'An event definition must match every linked calendar discipline.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_competition_calendar() from public, anon, authenticated;
revoke all on function private.validate_calendar_sports() from public, anon, authenticated;
revoke all on function private.prevent_used_calendar_identity_change() from public, anon, authenticated;
revoke all on function private.enforce_definition_calendar_discipline() from public, anon, authenticated;
revoke all on function private.enforce_competition_event_schedule() from public, anon, authenticated;
revoke all on function private.enforce_competition_range_events() from public, anon, authenticated;

create trigger enforce_competition_calendar
before insert or update of calendar_id, starts_on on public.competitions
for each row execute function private.enforce_competition_calendar();

create constraint trigger validate_competition_calendar_sport
after insert or update on public.competitions
deferrable initially deferred
for each row execute function private.validate_calendar_sports();

create constraint trigger validate_discipline_calendar_sport
after update on public.disciplines
deferrable initially deferred
for each row execute function private.validate_calendar_sports();

create trigger prevent_used_calendar_identity_change
before update of discipline_id, season_year on public.competition_calendars
for each row execute function private.prevent_used_calendar_identity_change();

create trigger enforce_definition_calendar_discipline
before update of discipline_id on public.event_definitions
for each row execute function private.enforce_definition_calendar_discipline();

drop trigger if exists enforce_competition_event_references on public.competition_events;
create trigger enforce_competition_event_references
before insert or update of competition_id, event_definition_id, category_id
on public.competition_events
for each row execute function private.enforce_competition_event_references();

create trigger enforce_competition_event_schedule
before insert or update of competition_id, scheduled_at on public.competition_events
for each row execute function private.enforce_competition_event_schedule();

create constraint trigger enforce_competition_range_events
after update of starts_on, ends_on on public.competitions
deferrable initially deferred
for each row
when ((new.starts_on, new.ends_on) is distinct from (old.starts_on, old.ends_on))
execute function private.enforce_competition_range_events();

create trigger set_updated_at before update on public.competition_calendars
for each row execute function private.set_updated_at();

create trigger audit_admin_mutation
after insert or update or delete on public.competition_calendars
for each row execute function private.capture_admin_audit();

alter table public.competition_calendars enable row level security;

create policy "Visible competition calendars are readable"
  on public.competition_calendars for select using (
    exists (
      select 1 from public.competitions
      where competitions.calendar_id = competition_calendars.id
    )
  );
create policy "Content editors manage competition calendars"
  on public.competition_calendars for all to authenticated
  using ((select private.is_content_editor()))
  with check ((select private.is_content_editor()));

revoke all on public.competition_calendars from public, anon;
grant select on public.competition_calendars to anon;
grant select, insert, update, delete on public.competition_calendars to authenticated;

drop policy "Published competitions are readable" on public.competitions;
create policy "Published competitions are readable"
  on public.competitions for select using (
    published_at is not null
    and status in ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')
  );
