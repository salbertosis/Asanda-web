do $$
declare
  test_club uuid;
  test_athlete uuid;
  association_id uuid;
  blocked boolean;
begin
  select id into strict test_club
  from public.organizations
  where slug = 'centro-cultural-espanol';

  insert into public.athletes (display_name)
  values ('Membership hierarchy test')
  returning id into test_athlete;

  blocked := false;
  begin
    insert into public.athlete_memberships (
      athlete_id, organization_id, membership_type, status, valid_from
    ) values (
      test_athlete, test_club, 'federated', 'active', current_date
    );
  exception when others then
    if sqlerrm not like 'Federated membership requires%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Federation without association was accepted.'; end if;

  insert into public.athlete_memberships (
    athlete_id, organization_id, membership_type, status, valid_from
  ) values (
    test_athlete, test_club, 'associated', 'active', current_date
  ) returning id into association_id;

  insert into public.athlete_memberships (
    athlete_id, organization_id, membership_type, status, valid_from
  ) values (
    test_athlete, test_club, 'federated', 'active', current_date
  );

  blocked := false;
  begin
    update public.athlete_memberships
    set status = 'ended', valid_to = current_date
    where id = association_id;
    set constraints protect_federated_association_coverage immediate;
  exception when others then
    if sqlerrm not like 'Active association cannot%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Required association was allowed to end.'; end if;

  delete from public.athletes where id = test_athlete;
end;
$$;
