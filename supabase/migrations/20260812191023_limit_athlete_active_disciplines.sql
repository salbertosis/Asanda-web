alter table public.athlete_disciplines
  add column assignment_period daterange generated always as (
    daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]')
  ) stored;

create or replace function private.enforce_athlete_discipline_limits()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  maximum_assignments integer;
  maximum_primary_assignments integer;
  previous_athlete_id uuid;
  previous_discipline_id uuid;
begin
  if tg_op = 'UPDATE' then
    previous_athlete_id := old.athlete_id;
    previous_discipline_id := old.discipline_id;
  end if;

  with periods as (
    select assignment_period as period, is_primary
    from public.athlete_disciplines
    where athlete_id = new.athlete_id
      and not coalesce(
        athlete_id = previous_athlete_id
        and discipline_id = previous_discipline_id,
        false
      )
    union all
    select
      daterange(new.valid_from, coalesce(new.valid_to, 'infinity'::date), '[]'),
      new.is_primary
  ), starts as (
    select lower(period) as point from periods
  )
  select
    coalesce(max((select count(*) from periods where period @> starts.point)), 0),
    coalesce(max((select count(*) from periods where is_primary and period @> starts.point)), 0)
  into maximum_assignments, maximum_primary_assignments
  from starts;

  if maximum_assignments > 2 then
    raise exception 'An athlete can have at most two simultaneous disciplines.';
  end if;

  if maximum_primary_assignments > 1 then
    raise exception 'An athlete can have at most one primary discipline at a time.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_athlete_discipline_limits() from public, anon, authenticated;

create trigger enforce_athlete_discipline_limits
before insert or update of athlete_id, discipline_id, is_primary, valid_from, valid_to
on public.athlete_disciplines
for each row execute function private.enforce_athlete_discipline_limits();

drop policy "Public athlete disciplines are readable" on public.athlete_disciplines;

create policy "Public athlete disciplines are readable"
  on public.athlete_disciplines for select using (
    (valid_from is null or valid_from <= current_date)
    and (valid_to is null or valid_to >= current_date)
    and exists (select 1 from public.athletes where athletes.id = athlete_id)
  );
