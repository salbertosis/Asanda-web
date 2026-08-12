create extension if not exists btree_gist with schema extensions;

alter table public.age_categories
  add column federation_eligible boolean not null default true,
  add column sort_order smallint not null default 0;

create table public.athlete_category_assignments (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  category_id uuid not null references public.age_categories(id) on delete restrict,
  valid_from date not null,
  valid_to date,
  assignment_period daterange generated always as (
    daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from),
  exclude using gist (athlete_id with =, assignment_period with &&)
);

create index athlete_category_assignments_athlete_idx
  on public.athlete_category_assignments (athlete_id, valid_from desc);

create or replace function private.enforce_preinfant_membership_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.membership_type = 'federated'
    and new.status = 'active'
    and exists (
      select 1
      from public.athlete_category_assignments assignment
      join public.age_categories category on category.id = assignment.category_id
      where assignment.athlete_id = new.athlete_id
        and not category.federation_eligible
        and assignment.assignment_period && daterange(
          new.valid_from,
          coalesce(new.valid_to, 'infinity'::date),
          '[]'
        )
    )
  then
    raise exception 'Pre-infant athletes cannot have an active federated membership.';
  end if;

  return new;
end;
$$;

create or replace function private.enforce_preinfant_category_rule()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.age_categories
    where id = new.category_id
      and not federation_eligible
  ) and exists (
    select 1
    from public.athlete_memberships membership
    where membership.athlete_id = new.athlete_id
      and membership.membership_type = 'federated'
      and membership.status = 'active'
      and daterange(
        membership.valid_from,
        coalesce(membership.valid_to, 'infinity'::date),
        '[]'
      ) && daterange(
        new.valid_from,
        coalesce(new.valid_to, 'infinity'::date),
        '[]'
      )
  )
  then
    raise exception 'Pre-infant athletes cannot have an active federated membership.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_preinfant_membership_rule() from public, anon, authenticated;
revoke all on function private.enforce_preinfant_category_rule() from public, anon, authenticated;

create trigger enforce_preinfant_membership_rule
before insert or update of athlete_id, membership_type, status, valid_from, valid_to
on public.athlete_memberships
for each row execute function private.enforce_preinfant_membership_rule();

create trigger enforce_preinfant_category_rule
before insert or update of athlete_id, category_id, valid_from, valid_to
on public.athlete_category_assignments
for each row execute function private.enforce_preinfant_category_rule();

create trigger set_updated_at
before update on public.athlete_category_assignments
for each row execute function private.set_updated_at();

alter table public.athlete_category_assignments enable row level security;

create policy "Public athlete categories are readable"
  on public.athlete_category_assignments for select using (
    exists (
      select 1
      from public.athletes
      where athletes.id = athlete_id
    )
  );

create policy "Content editors manage athlete categories"
  on public.athlete_category_assignments for all to authenticated
  using ((select private.is_content_editor()))
  with check ((select private.is_content_editor()));

grant select on public.athlete_category_assignments to anon;
grant select, insert, update, delete on public.athlete_category_assignments to authenticated;

insert into public.age_categories (code, name, federation_eligible, sort_order) values
  ('pre-infant-a', 'Pre Infantil A', false, 10),
  ('pre-infant-b', 'Pre Infantil B', false, 20),
  ('pre-infant-c', 'Pre Infantil C', false, 30),
  ('infant-a', 'Infantil A', true, 40),
  ('infant-b', 'Infantil B', true, 50),
  ('youth-a', 'Juvenil A', true, 60),
  ('youth-b', 'Juvenil B', true, 70),
  ('maximum', 'Máxima', true, 80)
on conflict (code) do update set
  name = excluded.name,
  federation_eligible = excluded.federation_eligible,
  sort_order = excluded.sort_order,
  is_active = true;
