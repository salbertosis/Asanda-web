do $$
declare
  asanda_logo public.media_assets%rowtype;
  asanda_org public.organizations%rowtype;
  unlinked_competitions integer;
begin
  select * into strict asanda_logo
  from public.media_assets
  where provider = 'cloudinary' and public_id = 'asanda';

  if asanda_logo.resource_type <> 'image' or not asanda_logo.is_public
    or asanda_logo.alt_text <> 'Logo de ASANDA'
  then
    raise exception 'ASANDA media asset is incomplete';
  end if;

  select * into strict asanda_org
  from public.organizations
  where slug = 'asanda';

  if asanda_org.logo_asset_id is distinct from asanda_logo.id then
    raise exception 'ASANDA organization is not linked to its logo';
  end if;

  select count(*) into unlinked_competitions
  from public.competitions
  where organizer_id = asanda_org.id
    and logo_asset_id is distinct from asanda_logo.id;

  if unlinked_competitions <> 0 then
    raise exception 'ASANDA competitions remain without their logo: %', unlinked_competitions;
  end if;
end;
$$;