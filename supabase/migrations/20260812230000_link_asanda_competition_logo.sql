do $$
declare
  asanda_logo uuid;
begin
  insert into public.media_assets (
    provider, public_id, resource_type, alt_text, is_public
  ) values (
    'cloudinary', 'asanda', 'image', 'Logo de ASANDA', true
  )
  on conflict (provider, public_id) do update
  set alt_text = excluded.alt_text, is_public = true, updated_at = now()
  returning id into asanda_logo;

  update public.organizations
  set logo_asset_id = asanda_logo,
      updated_at = now()
  where slug = 'asanda';

  update public.competitions
  set logo_asset_id = asanda_logo,
      updated_at = now()
  where organizer_id = (
    select id from public.organizations where slug = 'asanda'
  )
  and logo_asset_id is null;
end;
$$;