do $$
declare
  test_club uuid;
  first_athlete uuid;
  second_athlete uuid;
  preinfant_category uuid;
  blocked boolean;
begin
  select id into strict test_club
  from public.organizations
  where slug = 'centro-cultural-espanol';

  select id into preinfant_category
  from public.age_categories
  where code = 'pre-infant-a';

  insert into public.athletes (display_name)
  values ('Pre-infant rule test 1')
  returning id into first_athlete;

  insert into public.athlete_category_assignments (athlete_id, category_id, valid_from)
  values (first_athlete, preinfant_category, current_date);

  blocked := false;
  begin
    insert into public.athlete_memberships (
      athlete_id,
      organization_id,
      membership_type,
      status,
      valid_from
    ) values (
      first_athlete,
      test_club,
      'federated',
      'active',
      current_date
    );
  exception when others then
    if sqlerrm not like 'Pre-infant athletes cannot%' then raise; end if;
    blocked := true;
  end;

  if not blocked then
    raise exception 'Expected federated membership to be rejected.';
  end if;

  insert into public.athlete_memberships (
    athlete_id,
    organization_id,
    membership_type,
    status,
    valid_from
  ) values (
    first_athlete,
    test_club,
    'associated',
    'active',
    current_date
  );

  insert into public.athletes (display_name)
  values ('Pre-infant rule test 2')
  returning id into second_athlete;

  insert into public.athlete_memberships (
    athlete_id,
    organization_id,
    membership_type,
    status,
    valid_from
  ) values (
    second_athlete,
    test_club,
    'federated',
    'active',
    current_date
  );

  blocked := false;
  begin
    insert into public.athlete_category_assignments (athlete_id, category_id, valid_from)
    values (second_athlete, preinfant_category, current_date);
  exception when others then
    if sqlerrm not like 'Pre-infant athletes cannot%' then raise; end if;
    blocked := true;
  end;

  if not blocked then
    raise exception 'Expected pre-infant category to be rejected.';
  end if;

  delete from public.athletes where id in (first_athlete, second_athlete);
end;
$$;
