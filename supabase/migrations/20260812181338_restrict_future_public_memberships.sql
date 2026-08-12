drop policy "Active public memberships are readable" on public.athlete_memberships;

create policy "Active public memberships are readable"
  on public.athlete_memberships for select using (
    status = 'active'
    and valid_from <= current_date
    and (valid_to is null or valid_to >= current_date)
    and exists (select 1 from public.athletes where athletes.id = athlete_id)
    and exists (select 1 from public.organizations where organizations.id = organization_id)
  );

drop policy "Public athlete categories are readable" on public.athlete_category_assignments;

create policy "Public athlete categories are readable"
  on public.athlete_category_assignments for select using (
    valid_from <= current_date
    and (valid_to is null or valid_to >= current_date)
    and exists (
      select 1
      from public.athletes
      where athletes.id = athlete_id
    )
  );
