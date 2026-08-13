do $$
declare
  copa public.competitions%rowtype;
  organizer_slug text;
  logo_public_id text;
begin
  select * into strict copa
  from public.competitions
  where slug = 'copa-pasion-acuatica-2026';

  select organization.slug into strict organizer_slug
  from public.organizations organization
  where organization.id = copa.organizer_id;

  if organizer_slug <> 'feveda' then
    raise exception 'Copa Pasión Acuática organizer is not FEVEDA: %', organizer_slug;
  end if;

  if copa.starts_on <> date '2026-12-07' or copa.ends_on <> date '2026-12-13' then
    raise exception 'Copa Pasión Acuática dates are incorrect: % to %', copa.starts_on, copa.ends_on;
  end if;

  if copa.recognition_status <> 'recognized' then
    raise exception 'Copa Pasión Acuática is not recognized: %', copa.recognition_status;
  end if;

  select asset.public_id into strict logo_public_id
  from public.media_assets asset
  where asset.id = copa.logo_asset_id;

  if logo_public_id <> 'feveda_logo' then
    raise exception 'Copa Pasión Acuática logo is not feveda_logo: %', logo_public_id;
  end if;
end;
$$;
