drop index if exists public.athlete_one_primary_active_membership;

alter table public.athlete_memberships
  drop column is_primary;

alter table public.athlete_memberships
  add column membership_period daterange generated always as (
    daterange(valid_from, coalesce(valid_to, 'infinity'::date), '[]')
  ) stored;

alter table public.athlete_memberships
  add constraint athlete_memberships_no_type_overlap
  exclude using gist (
    athlete_id with =,
    organization_id with =,
    membership_type with =,
    membership_period with &&
  ) where (status = 'active');

create or replace function private.enforce_association_before_federation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.membership_type = 'federated'
    and new.status = 'active'
    and not exists (
      select 1
      from public.athlete_memberships association
      where association.athlete_id = new.athlete_id
        and association.organization_id = new.organization_id
        and association.membership_type = 'associated'
        and association.status = 'active'
        and daterange(
          association.valid_from,
          coalesce(association.valid_to, 'infinity'::date),
          '[]'
        ) @> daterange(
          new.valid_from,
          coalesce(new.valid_to, 'infinity'::date),
          '[]'
        )
    )
  then
    raise exception 'Federated membership requires an active association covering the same period.';
  end if;

  return new;
end;
$$;

create or replace function private.protect_federated_association_coverage()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.athlete_memberships federation
    where federation.athlete_id = old.athlete_id
      and federation.organization_id = old.organization_id
      and federation.membership_type = 'federated'
      and federation.status = 'active'
      and not exists (
        select 1
        from public.athlete_memberships association
        where association.athlete_id = federation.athlete_id
          and association.organization_id = federation.organization_id
          and association.membership_type = 'associated'
          and association.status = 'active'
          and association.membership_period @> federation.membership_period
      )
  )
  then
    raise exception 'Active association cannot be removed or shortened while federation depends on it.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function private.enforce_association_before_federation() from public, anon, authenticated;
revoke all on function private.protect_federated_association_coverage() from public, anon, authenticated;

create trigger enforce_association_before_federation
before insert or update of athlete_id, organization_id, membership_type, status, valid_from, valid_to
on public.athlete_memberships
for each row execute function private.enforce_association_before_federation();

create constraint trigger protect_federated_association_coverage
after update or delete
on public.athlete_memberships
deferrable initially deferred
for each row execute function private.protect_federated_association_coverage();
