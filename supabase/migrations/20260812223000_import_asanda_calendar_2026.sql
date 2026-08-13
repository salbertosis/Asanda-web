do $$
declare
  league_logo uuid;
  feveda_logo uuid;
begin
  insert into public.media_assets (
    provider, public_id, resource_type, alt_text, is_public
  ) values (
    'cloudinary', 'liga_logo', 'image', 'Logo de la Liga', true
  )
  on conflict (provider, public_id) do update
  set alt_text = excluded.alt_text, is_public = true, updated_at = now()
  returning id into league_logo;

  insert into public.media_assets (
    provider, public_id, resource_type, alt_text, is_public
  ) values (
    'cloudinary', 'feveda_logo', 'image', 'Logo de FEVEDA', true
  )
  on conflict (provider, public_id) do update
  set alt_text = excluded.alt_text, is_public = true, updated_at = now()
  returning id into feveda_logo;

  insert into public.organizations (
    organization_type, name, short_name, slug, publication_status
  ) values (
    'association', 'Asociación de Deportes Acuáticos del Estado Anzoátegui', 'ASANDA', 'asanda', 'published'
  )
  on conflict (slug) do update
  set name = excluded.name, short_name = excluded.short_name,
      organization_type = excluded.organization_type,
      publication_status = excluded.publication_status, updated_at = now();

  insert into public.organizations (
    organization_type, name, short_name, slug, logo_asset_id, publication_status
  ) values (
    'association', 'Liga Municipal de Deportes Acuáticos', 'Liga', 'liga-municipal-deportes-acuaticos', league_logo, 'published'
  )
  on conflict (slug) do update
  set name = excluded.name, short_name = excluded.short_name,
      organization_type = excluded.organization_type, logo_asset_id = excluded.logo_asset_id,
      publication_status = excluded.publication_status, updated_at = now();

  insert into public.organizations (
    organization_type, name, short_name, slug, logo_asset_id, publication_status
  ) values (
    'federation', 'Federación Venezolana de Deportes Acuáticos', 'FEVEDA', 'feveda', feveda_logo, 'published'
  )
  on conflict (slug) do update
  set name = excluded.name, short_name = excluded.short_name,
      organization_type = excluded.organization_type, logo_asset_id = excluded.logo_asset_id,
      publication_status = excluded.publication_status, updated_at = now();

  insert into public.venues (name, city, region, country_code)
  select venue.name, venue.city, venue.region, 'VE'
  from (values
    ('Cantaura', 'Cantaura', 'Anzoátegui'),
    ('Bolívar', null, 'Bolívar'),
    ('Mantarrayas Swimming Club', null, 'Anzoátegui'),
    ('Maturín', 'Maturín', 'Monagas'),
    ('Mérida', 'Mérida', 'Mérida'),
    ('Caracas', 'Caracas', 'Distrito Capital'),
    ('YMCA Anaco', 'Anaco', 'Anzoátegui'),
    ('CIVET', null, 'Anzoátegui')
  ) as venue(name, city, region)
  where not exists (
    select 1 from public.venues existing where lower(existing.name) = lower(venue.name)
  );
end;
$$;

with calendar as (
  select * from (values
    ('i-campeonato-municipal-fondo-2026', 'I Campeonato Municipal de Fondo', date '2026-02-09', date '2026-02-15', 'liga-municipal-deportes-acuaticos', null, 'Pre B, C, Infantil y Juvenil'),
    ('i-campeonato-estadal-2026', 'I Campeonato Estadal', date '2026-02-27', date '2026-03-01', 'asanda', 'Cantaura', 'Masificación y Especialización'),
    ('ii-campeonato-municipal-2026', 'II Campeonato Municipal', date '2026-03-23', date '2026-03-29', 'liga-municipal-deportes-acuaticos', null, 'Masificación y Especialización'),
    ('campeonato-regional-2026', 'Campeonato Regional', date '2026-04-07', date '2026-04-11', 'asanda', 'Bolívar', 'Masificación y Especialización'),
    ('i-campeonato-estadal-preinfantil-2026', 'I Campeonato Estadal Preinfantil', date '2026-04-20', date '2026-04-26', 'mantarrayas-swimming-club', 'Mantarrayas Swimming Club', 'Preinfantil'),
    ('iii-campeonato-municipal-2026', 'III Campeonato Municipal', date '2026-05-11', date '2026-05-17', 'liga-municipal-deportes-acuaticos', null, 'Pre B, C, Masificación y Especialización'),
    ('campeonato-nacional-categorias-mayo-2026', 'Campeonato Nacional por Categorías', date '2026-05-26', date '2026-05-30', 'feveda', 'Maturín', 'Especialización'),
    ('campeonato-nacional-infantil-2026', 'Campeonato Nacional Infantil', date '2026-06-01', date '2026-06-07', 'feveda', 'Mérida', 'Masificación'),
    ('juegos-nacionales-juveniles-2026', 'Juegos Nacionales Juveniles', date '2026-06-08', date '2026-06-21', 'feveda', 'Caracas', 'Juvenil'),
    ('campeonato-nacional-ascenso-2026', 'Campeonato Nacional de Ascenso', date '2026-06-22', date '2026-06-28', 'feveda', null, 'Masificación y Especialización'),
    ('ii-campeonato-estadal-preinfantil-2026', 'II Campeonato Estadal Preinfantil', date '2026-06-29', date '2026-07-05', 'asanda', 'YMCA Anaco', 'Preinfantil'),
    ('iv-campeonato-municipal-2026', 'IV Campeonato Municipal', date '2026-07-06', date '2026-07-12', 'liga-municipal-deportes-acuaticos', null, 'Pre B, C, Masificación y Especialización'),
    ('ii-campeonato-estadal-2026', 'II Campeonato Estadal', date '2026-07-30', date '2026-08-01', 'asanda', null, 'Masificación y Especialización'),
    ('campeonato-nacional-categorias-agosto-2026', 'Campeonato Nacional por Categorías', date '2026-08-18', date '2026-08-22', 'feveda', null, 'Infantil y Juvenil'),
    ('v-campeonato-municipal-2026', 'V Campeonato Municipal', date '2026-08-31', date '2026-09-06', 'liga-municipal-deportes-acuaticos', null, 'Pre B, C, Masificación y Especialización'),
    ('iii-campeonato-estadal-preinfantil-2026', 'III Campeonato Estadal Preinfantil', date '2026-09-28', date '2026-10-04', 'asanda', 'CIVET', 'Preinfantil'),
    ('vi-campeonato-municipal-2026', 'VI Campeonato Municipal', date '2026-10-12', date '2026-10-18', 'liga-municipal-deportes-acuaticos', null, 'Pre B, C, Masificación y Especialización'),
    ('iii-campeonato-estadal-2026', 'III Campeonato Estadal', date '2026-10-26', date '2026-11-01', 'asanda', null, 'Pre C, Masificación y Especialización'),
    ('vii-campeonato-municipal-2026', 'VII Campeonato Municipal', date '2026-11-23', date '2026-11-29', 'liga-municipal-deportes-acuaticos', null, 'Pre B, C, Masificación y Especialización'),
    ('copa-pasion-acuatica-2026', 'Copa Pasión Acuática', date '2026-12-07', date '2026-12-13', 'asanda', null, 'Masificación y Especialización')
  ) as item(slug, name, starts_on, ends_on, organizer_slug, venue_name, category_description)
), resolved as (
  select
    calendar.*,
    sport.id as sport_id,
    organizer.id as organizer_id,
    organizer.logo_asset_id,
    venue.id as venue_id
  from calendar
  cross join public.sports sport
  join public.organizations organizer on organizer.slug = calendar.organizer_slug
  left join public.venues venue on lower(venue.name) = lower(calendar.venue_name)
  where sport.code = 'aquatics'
)
insert into public.competitions (
  name, slug, sport_id, organizer_id, venue_id, starts_on, ends_on,
  recognition_status, status, description, logo_asset_id, published_at
)
select
  name, slug, sport_id, organizer_id, venue_id, starts_on, ends_on,
  'recognized', 'scheduled',
  'Categorías: ' || category_description || '. Fuente: Calendario ASANDA 2026.',
  logo_asset_id, now()
from resolved
on conflict (slug) do update
set
  name = excluded.name,
  sport_id = excluded.sport_id,
  organizer_id = excluded.organizer_id,
  venue_id = excluded.venue_id,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  recognition_status = excluded.recognition_status,
  status = excluded.status,
  description = excluded.description,
  logo_asset_id = excluded.logo_asset_id,
  published_at = excluded.published_at,
  updated_at = now();
