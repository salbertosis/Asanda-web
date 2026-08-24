do $$
declare
  feveda_logo uuid;
begin
  select id into strict feveda_logo
  from public.media_assets
  where provider = 'cloudinary' and public_id = 'feveda_logo';

  update public.competitions
  set organizer_id = (select id from public.organizations where slug = 'feveda'),
      logo_asset_id = feveda_logo,
      updated_at = now()
  where slug = 'copa-pasion-acuatica-2026';
end;
$$;