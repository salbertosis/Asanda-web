do $$
declare
  approved_slugs constant text[] := array[
    'i-campeonato-municipal-fondo-2026', 'i-campeonato-estadal-2026',
    'ii-campeonato-municipal-2026', 'campeonato-regional-2026',
    'i-campeonato-estadal-preinfantil-2026', 'iii-campeonato-municipal-2026',
    'campeonato-nacional-categorias-mayo-2026', 'campeonato-nacional-infantil-2026',
    'juegos-nacionales-juveniles-2026', 'campeonato-nacional-ascenso-2026',
    'ii-campeonato-estadal-preinfantil-2026', 'iv-campeonato-municipal-2026',
    'ii-campeonato-estadal-2026', 'campeonato-nacional-categorias-agosto-2026',
    'v-campeonato-municipal-2026', 'iii-campeonato-estadal-preinfantil-2026',
    'vi-campeonato-municipal-2026', 'iii-campeonato-estadal-2026',
    'vii-campeonato-municipal-2026', 'copa-pasion-acuatica-2026'
  ];
  imported_count integer;
  invalid_count integer;
  national_logo text;
  preinfant_organizer text;
begin
  select count(*) into imported_count
  from public.competitions
  where description like '%Fuente: Calendario ASANDA 2026.%';

  if imported_count <> 20 then
    raise exception 'Expected 20 ASANDA 2026 competitions, found %', imported_count;
  end if;

  select count(*) into imported_count
  from public.competitions competition
  join public.competition_calendars calendar on calendar.id = competition.calendar_id
  join public.disciplines discipline on discipline.id = calendar.discipline_id
  where competition.slug = any(approved_slugs)
    and calendar.season_year = 2026
    and discipline.code = 'swimming'
    and extract(year from competition.starts_on)::integer = 2026
    and competition.sport_id = discipline.sport_id;
  if imported_count <> 20 then
    raise exception 'Expected 20 explicit swimming calendar links, found %', imported_count;
  end if;

  select count(*) into invalid_count
  from public.competition_calendars calendar
  join public.disciplines discipline on discipline.id = calendar.discipline_id
  where discipline.code = 'swimming' and calendar.season_year = 2026;
  if invalid_count <> 1 then
    raise exception 'Expected one reused swimming calendar, found %', invalid_count;
  end if;

  select count(*) into invalid_count from public.competitions where calendar_id is null;
  if invalid_count <> 0 then
    raise exception 'Competitions without calendars remain: %', invalid_count;
  end if;

  if not exists (
    select 1 from pg_attribute
    where attrelid = 'public.competitions'::regclass
      and attname = 'calendar_id' and attnotnull and not attisdropped
  ) then
    raise exception 'competitions.calendar_id is not enforced as NOT NULL';
  end if;

  if not exists (
    select 1 from public.competitions
    where slug = 'i-campeonato-estadal-2026'
      and starts_on = date '2026-02-27'
      and ends_on = date '2026-03-01'
  ) then
    raise exception 'I Campeonato Estadal exact dates were not imported';
  end if;

  if not exists (
    select 1 from public.competitions
    where slug = 'juegos-nacionales-juveniles-2026'
      and starts_on = date '2026-06-08'
      and ends_on = date '2026-06-21'
  ) then
    raise exception 'Juegos Nacionales Juveniles was not consolidated correctly';
  end if;

  select asset.public_id into strict national_logo
  from public.competitions competition
  join public.media_assets asset on asset.id = competition.logo_asset_id
  where competition.slug = 'campeonato-nacional-infantil-2026';

  if national_logo <> 'feveda_logo' then
    raise exception 'National competition does not use FEVEDA logo';
  end if;

  select organization.slug into strict preinfant_organizer
  from public.competitions competition
  join public.organizations organization on organization.id = competition.organizer_id
  where competition.slug = 'i-campeonato-estadal-preinfantil-2026';

  if preinfant_organizer <> 'mantarrayas-swimming-club' then
    raise exception 'Mantarrayas preinfant event organizer is incorrect';
  end if;

  if exists (
    select 1 from public.competitions
    where starts_on between date '2026-01-01' and date '2026-12-31'
      and (lower(name) like '%carnaval%' or lower(name) like '%semana santa%')
  ) then
    raise exception 'Non-competition holidays were imported';
  end if;
end;
$$;
