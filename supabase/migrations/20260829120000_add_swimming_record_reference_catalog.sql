do $$
declare
  swimming_id uuid;
  catalog record;
  stored public.event_definitions%rowtype;
begin
  select id into strict swimming_id
  from public.disciplines
  where code = 'swimming';

  for catalog in
    select * from (values
      ('swimming-lc-50-freestyle', '50 metros libre', 50, 'freestyle'),
      ('swimming-lc-100-freestyle', '100 metros libre', 100, 'freestyle'),
      ('swimming-lc-200-freestyle', '200 metros libre', 200, 'freestyle'),
      ('swimming-lc-400-freestyle', '400 metros libre', 400, 'freestyle'),
      ('swimming-lc-800-freestyle', '800 metros libre', 800, 'freestyle'),
      ('swimming-lc-1500-freestyle', '1500 metros libre', 1500, 'freestyle'),
      ('swimming-lc-50-backstroke', '50 metros espalda', 50, 'backstroke'),
      ('swimming-lc-100-backstroke', '100 metros espalda', 100, 'backstroke'),
      ('swimming-lc-200-backstroke', '200 metros espalda', 200, 'backstroke'),
      ('swimming-lc-50-breaststroke', '50 metros pecho', 50, 'breaststroke'),
      ('swimming-lc-100-breaststroke', '100 metros pecho', 100, 'breaststroke'),
      ('swimming-lc-200-breaststroke', '200 metros pecho', 200, 'breaststroke'),
      ('swimming-lc-50-butterfly', '50 metros mariposa', 50, 'butterfly'),
      ('swimming-lc-100-butterfly', '100 metros mariposa', 100, 'butterfly'),
      ('swimming-lc-200-butterfly', '200 metros mariposa', 200, 'butterfly'),
      ('swimming-lc-200-individual-medley', '200 metros combinado individual', 200, 'individual_medley'),
      ('swimming-lc-400-individual-medley', '400 metros combinado individual', 400, 'individual_medley')
    ) as approved(code, name, distance_metres, stroke)
  loop
    insert into public.event_definitions (
      discipline_id, code, name, distance_metres, stroke, course, relay_size, is_active
    ) values (
      swimming_id, catalog.code, catalog.name, catalog.distance_metres,
      catalog.stroke, 'long_course', null, true
    ) on conflict (code) do nothing;

    select * into strict stored from public.event_definitions where code = catalog.code;
    if (stored.discipline_id, stored.name, stored.distance_metres, stored.stroke,
        stored.course, stored.relay_size, stored.is_active)
      is distinct from
       (swimming_id, catalog.name, catalog.distance_metres, catalog.stroke,
        'long_course'::text, null::smallint, true)
    then
      raise exception 'Event definition % conflicts with the approved swimming catalog.', catalog.code;
    end if;
  end loop;
end;
$$;
