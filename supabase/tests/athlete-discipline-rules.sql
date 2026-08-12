do $$
declare
  test_athlete uuid;
  swimming uuid;
  open_water uuid;
  water_polo uuid;
  blocked boolean;
begin
  select id into strict swimming from public.disciplines where code = 'swimming';
  select id into strict open_water from public.disciplines where code = 'open-water';
  select id into strict water_polo from public.disciplines where code = 'water-polo';

  insert into public.athletes (display_name)
  values ('Discipline limit test')
  returning id into test_athlete;

  insert into private.athlete_details (
    athlete_id, date_of_birth, national_id_hash, national_id_last4
  ) values (
    test_athlete,
    date '2000-01-01',
    encode(extensions.digest(test_athlete::text, 'sha256'), 'hex'),
    '0000'
  );

  insert into public.athlete_disciplines (
    athlete_id, discipline_id, is_primary, valid_from
  ) values
    (test_athlete, swimming, true, current_date),
    (test_athlete, open_water, false, current_date);

  blocked := false;
  begin
    insert into public.athlete_disciplines (
      athlete_id, discipline_id, is_primary, valid_from
    ) values (test_athlete, water_polo, false, current_date);
  exception when others then
    if sqlerrm not like 'An athlete can have at most two%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Third simultaneous discipline was accepted.'; end if;

  blocked := false;
  begin
    update public.athlete_disciplines
    set is_primary = true
    where athlete_id = test_athlete and discipline_id = open_water;
  exception when others then
    if sqlerrm not like 'An athlete can have at most one primary%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Second primary discipline was accepted.'; end if;

  delete from public.athletes where id = test_athlete;
end;
$$;
