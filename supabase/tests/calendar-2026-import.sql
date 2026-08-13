do $$
declare
  imported_count integer;
  national_logo text;
  preinfant_organizer text;
begin
  select count(*) into imported_count
  from public.competitions
  where description like '%Fuente: Calendario ASANDA 2026.%';

  if imported_count <> 20 then
    raise exception 'Expected 20 ASANDA 2026 competitions, found %', imported_count;
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
