do $$
declare
  duplicate_athlete uuid;
  missing_details_athlete uuid;
  blocked boolean;
  existing_hash text;
begin
  select national_id_hash into strict existing_hash
  from private.athlete_details
  where athlete_id = '79cfe51f-40ad-40b3-ad35-c3eaf1c36a7e'::uuid;

  insert into public.athletes (display_name)
  values ('Duplicate national ID test')
  returning id into duplicate_athlete;

  blocked := false;
  begin
    insert into private.athlete_details (
      athlete_id,
      date_of_birth,
      national_id_hash,
      national_id_last4
    ) values (
      duplicate_athlete,
      date '2000-01-01',
      existing_hash,
      '5806'
    );
  exception when unique_violation then
    blocked := true;
  end;
  if not blocked then raise exception 'Duplicate national ID was accepted.'; end if;
  delete from public.athletes where id = duplicate_athlete;

  blocked := false;
  begin
    insert into public.athletes (display_name)
    values ('Missing private details test')
    returning id into missing_details_athlete;
    set constraints enforce_athlete_details_required immediate;
  exception when others then
    if sqlerrm not like 'Every athlete requires%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Athlete without private details was accepted.'; end if;
end;
$$;
