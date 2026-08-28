do $$
declare
  approved_slugs constant text[] := array[
    'i-campeonato-municipal-fondo-2026',
    'i-campeonato-estadal-2026',
    'ii-campeonato-municipal-2026',
    'campeonato-regional-2026',
    'i-campeonato-estadal-preinfantil-2026',
    'iii-campeonato-municipal-2026',
    'campeonato-nacional-categorias-mayo-2026',
    'campeonato-nacional-infantil-2026',
    'juegos-nacionales-juveniles-2026',
    'campeonato-nacional-ascenso-2026',
    'ii-campeonato-estadal-preinfantil-2026',
    'iv-campeonato-municipal-2026',
    'ii-campeonato-estadal-2026',
    'campeonato-nacional-categorias-agosto-2026',
    'v-campeonato-municipal-2026',
    'iii-campeonato-estadal-preinfantil-2026',
    'vi-campeonato-municipal-2026',
    'iii-campeonato-estadal-2026',
    'vii-campeonato-municipal-2026',
    'copa-pasion-acuatica-2026'
  ];
  swimming_count integer;
  swimming_id uuid;
  parent_sport_id uuid;
  target_count integer;
  invalid_count integer;
  swimming_calendar_id uuid;
begin
  select count(*), min(id::text)::uuid, min(sport_id::text)::uuid
  into swimming_count, swimming_id, parent_sport_id
  from public.disciplines
  where code = 'swimming';

  if swimming_count <> 1 or parent_sport_id is null then
    raise exception 'Swimming discipline resolution failed; match count: %', swimming_count;
  end if;
  if not exists (select 1 from public.sports where id = parent_sport_id) then
    raise exception 'Swimming parent sport resolution failed; match count: 0';
  end if;

  select count(*) into invalid_count
  from unnest(approved_slugs) as approved(slug);
  if invalid_count <> 20 then
    raise exception 'Approved competition identity count is invalid: %', invalid_count;
  end if;
  select count(*) into invalid_count
  from (select distinct slug from unnest(approved_slugs) as approved(slug)) unique_slugs;
  if invalid_count <> 20 then
    raise exception 'Approved competition identities contain duplicates; unique count: %', invalid_count;
  end if;

  select count(*) into target_count
  from public.competitions
  where slug = any(approved_slugs);
  if target_count <> 20 then
    raise exception 'Approved ASANDA 2026 competition target count is invalid: %', target_count;
  end if;

  select count(*) into invalid_count
  from public.competitions
  where slug = any(approved_slugs)
    and extract(year from starts_on)::integer <> 2026;
  if invalid_count <> 0 then
    raise exception 'Approved competition start-year conflicts: %', invalid_count;
  end if;

  select count(*) into invalid_count
  from public.competitions
  where slug = any(approved_slugs) and sport_id <> parent_sport_id;
  if invalid_count <> 0 then
    raise exception 'Approved competition parent-sport conflicts: %', invalid_count;
  end if;

  insert into public.competition_calendars (discipline_id, season_year)
  values (swimming_id, 2026)
  on conflict (discipline_id, season_year) do nothing;

  select id into strict swimming_calendar_id
  from public.competition_calendars
  where discipline_id = swimming_id and season_year = 2026;

  select count(*) into invalid_count
  from public.competitions
  where slug = any(approved_slugs)
    and calendar_id is not null
    and calendar_id <> swimming_calendar_id;
  if invalid_count <> 0 then
    raise exception 'Approved competition calendar conflicts: %', invalid_count;
  end if;

  update public.competitions
  set calendar_id = swimming_calendar_id,
      sport_id = parent_sport_id
  where slug = any(approved_slugs)
    and (calendar_id is distinct from swimming_calendar_id
      or sport_id is distinct from parent_sport_id);

  select count(*) into invalid_count
  from public.competitions
  where calendar_id is null;
  if invalid_count <> 0 then
    raise exception 'Competitions without a calendar remain after backfill: %', invalid_count;
  end if;
end;
$$;
