begin;
do $$
declare
  swimming_id uuid;
  catalog record;
  matched integer := 0;
begin
  select id into strict swimming_id from public.disciplines where code = 'swimming';

  for catalog in
    select * from (values
      ('swimming-lc-50-freestyle', '50 metros libre', 50, 'freestyle'), ('swimming-lc-100-freestyle', '100 metros libre', 100, 'freestyle'),
      ('swimming-lc-200-freestyle', '200 metros libre', 200, 'freestyle'), ('swimming-lc-400-freestyle', '400 metros libre', 400, 'freestyle'),
      ('swimming-lc-800-freestyle', '800 metros libre', 800, 'freestyle'), ('swimming-lc-1500-freestyle', '1500 metros libre', 1500, 'freestyle'),
      ('swimming-lc-50-backstroke', '50 metros espalda', 50, 'backstroke'), ('swimming-lc-100-backstroke', '100 metros espalda', 100, 'backstroke'),
      ('swimming-lc-200-backstroke', '200 metros espalda', 200, 'backstroke'), ('swimming-lc-50-breaststroke', '50 metros pecho', 50, 'breaststroke'),
      ('swimming-lc-100-breaststroke', '100 metros pecho', 100, 'breaststroke'), ('swimming-lc-200-breaststroke', '200 metros pecho', 200, 'breaststroke'),
      ('swimming-lc-50-butterfly', '50 metros mariposa', 50, 'butterfly'), ('swimming-lc-100-butterfly', '100 metros mariposa', 100, 'butterfly'),
      ('swimming-lc-200-butterfly', '200 metros mariposa', 200, 'butterfly'),
      ('swimming-lc-200-individual-medley', '200 metros combinado individual', 200, 'individual_medley'),
      ('swimming-lc-400-individual-medley', '400 metros combinado individual', 400, 'individual_medley')
    ) as approved(code, name, distance_metres, stroke)
  loop
    if (select count(*) from public.event_definitions
        where discipline_id = swimming_id and code = catalog.code and name = catalog.name
          and distance_metres = catalog.distance_metres and stroke = catalog.stroke
          and course = 'long_course' and relay_size is null and is_active) <> 1 then
      raise exception 'Missing or invalid approved event definition: %', catalog.code;
    end if;
    matched := matched + 1;
  end loop;

  if matched <> 17 or (select count(*) from public.event_definitions
      where discipline_id = swimming_id and course = 'long_course' and is_active) <> 17 then
    raise exception 'The active long-course swimming catalog must contain exactly 17 events.';
  end if;
  if exists (select 1 from public.event_definitions
      where discipline_id = swimming_id and course = 'long_course' and is_active and relay_size is not null) then
    raise exception 'Relay events are not approved for the record reference catalog.';
  end if;
end;
$$;
rollback;
