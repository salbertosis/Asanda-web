create or replace function public.get_homepage_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with published_clubs as (
    select id
    from public.organizations
    where organization_type = 'club'
      and publication_status = 'published'
  ), current_memberships as (
    select membership.athlete_id, membership.membership_type
    from public.athlete_memberships membership
    join published_clubs club on club.id = membership.organization_id
    where membership.status = 'active'
      and membership.valid_from <= current_date
      and (membership.valid_to is null or membership.valid_to >= current_date)
  ), associated as (
    select distinct athlete_id
    from current_memberships
    where membership_type = 'associated'
  ), federated as (
    select distinct membership.athlete_id
    from current_memberships membership
    join associated using (athlete_id)
    where membership.membership_type = 'federated'
  ), current_preinfant as (
    select distinct assignment.athlete_id
    from public.athlete_category_assignments assignment
    join public.age_categories category on category.id = assignment.category_id
    join associated on associated.athlete_id = assignment.athlete_id
    where category.is_active
      and not category.federation_eligible
      and assignment.valid_from <= current_date
      and (assignment.valid_to is null or assignment.valid_to >= current_date)
  )
  select jsonb_build_object(
    'clubs', (select count(*) from published_clubs),
    'associatedAthletes', (select count(*) from associated),
    'federatedAthletes', (select count(*) from federated),
    'preinfantAthletes', (select count(*) from current_preinfant),
    'asOf', current_date
  );
$$;

revoke all on function public.get_homepage_stats() from public;
grant execute on function public.get_homepage_stats() to anon, authenticated;
