alter table public.venues
  add constraint venues_name_nonempty check (btrim(name) <> '');

create unique index venues_identity_idx on public.venues (
  lower(btrim(name)),
  lower(btrim(coalesce(address, ''))),
  lower(btrim(coalesce(city, ''))),
  lower(btrim(coalesce(region, ''))),
  upper(coalesce(country_code, ''))
);

create or replace function private.prevent_competition_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Competitions are historical records and must be archived.' using errcode = '23503';
  return old;
end;
$$;

create or replace function private.prevent_competition_event_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.entries where competition_event_id = old.id) then
    raise exception 'Competition events with entries or results cannot be deleted.' using errcode = '23503';
  end if;
  return old;
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
begin
  select * into strict competition_row from public.competitions where id = new.competition_id;
  if not exists (
    select 1
    from public.event_definitions definition
    join public.disciplines discipline on discipline.id = definition.discipline_id
    where definition.id = new.event_definition_id
      and definition.is_active
      and discipline.is_active
      and discipline.sport_id = competition_row.sport_id
  ) then
    raise exception 'Event definitions must be active and belong to the competition sport.' using errcode = '23514';
  end if;
  if new.category_id is not null and not exists (
    select 1 from public.age_categories category where category.id = new.category_id and category.is_active
  ) then
    raise exception 'Competition event categories must be active.' using errcode = '23514';
  end if;
  if new.scheduled_at is not null and (
    new.scheduled_at::date < competition_row.starts_on
    or (competition_row.ends_on is not null and new.scheduled_at::date > competition_row.ends_on)
  ) then
    raise exception 'Event schedules must remain inside the competition date range.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_competition_delete() from public, anon, authenticated;
revoke all on function private.prevent_competition_event_delete() from public, anon, authenticated;
revoke all on function private.enforce_competition_event_references() from public, anon, authenticated;

drop trigger if exists prevent_competition_delete on public.competitions;
create trigger prevent_competition_delete
before delete on public.competitions
for each row execute function private.prevent_competition_delete();

drop trigger if exists prevent_competition_event_delete on public.competition_events;
create trigger prevent_competition_event_delete
before delete on public.competition_events
for each row execute function private.prevent_competition_event_delete();

drop trigger if exists enforce_competition_event_references on public.competition_events;
create trigger enforce_competition_event_references
before insert or update on public.competition_events
for each row execute function private.enforce_competition_event_references();

create or replace function public.reorder_competition_events(
  requested_competition_id uuid,
  ordered_event_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  event_count integer;
  position integer;
  temporary_offset integer;
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may reorder competition events.' using errcode = '42501';
  end if;
  perform 1 from public.competitions where id = requested_competition_id for update;
  if not found then raise exception 'Competition not found.' using errcode = '23503'; end if;
  perform 1 from public.competition_events where competition_id = requested_competition_id for update;
  select count(*) into event_count from public.competition_events where competition_id = requested_competition_id;
  if coalesce(cardinality(ordered_event_ids), 0) <> event_count then
    raise exception 'The event program must contain every event exactly once.' using errcode = '23514';
  end if;
  if exists (
    select event_values.event_id
    from unnest(coalesce(ordered_event_ids, '{}'::uuid[])) as event_values(event_id)
    group by event_values.event_id having count(*) > 1
  ) or exists (
    select event_values.event_id
    from unnest(coalesce(ordered_event_ids, '{}'::uuid[])) as event_values(event_id)
    where event_values.event_id is null or not exists (
      select 1 from public.competition_events event_row
      where event_row.id = event_values.event_id and event_row.competition_id = requested_competition_id
    )
  ) then
    raise exception 'The event program contains duplicate or foreign events.' using errcode = '23514';
  end if;
  select coalesce(max(sequence_number), 0) into temporary_offset
  from public.competition_events where competition_id = requested_competition_id;
  if temporary_offset > 2147483647 - event_count then
    raise exception 'The event program sequence range is exhausted.' using errcode = '22003';
  end if;
  update public.competition_events event_row
  set sequence_number = temporary_offset + row_number
  from (
    select id, row_number() over (order by id) as row_number
    from public.competition_events where competition_id = requested_competition_id
  ) numbered
  where event_row.id = numbered.id;
  for position in 1..coalesce(cardinality(ordered_event_ids), 0) loop
    update public.competition_events
    set sequence_number = position
    where id = ordered_event_ids[position];
  end loop;
end;
$$;

revoke all on function public.reorder_competition_events(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_competition_events(uuid, uuid[]) to authenticated;
