begin;

do $$
declare
  duplicate_athlete uuid;
  rpc_athlete uuid;
  photo_asset uuid;
  editor_id uuid;
  blocked boolean;
  consent_count integer;
  consent_before public.athlete_consents%rowtype;
  consent_after public.athlete_consents%rowtype;
  existing_hash text;
begin
  select national_id_hash into strict existing_hash
  from private.athlete_details
  where athlete_id = '79cfe51f-40ad-40b3-ad35-c3eaf1c36a7e'::uuid;

  insert into public.athletes (display_name)
  values ('Duplicate national ID test')
  returning id into duplicate_athlete;

  blocked := false;
  begin
    insert into private.athlete_details (
      athlete_id,
      date_of_birth,
      national_id_hash,
      national_id_last4
    ) values (
      duplicate_athlete,
      date '2000-01-01',
      existing_hash,
      '5806'
    );
  exception when unique_violation then
    blocked := true;
  end;
  if not blocked then raise exception 'Duplicate national ID was accepted.'; end if;
  delete from public.athletes where id = duplicate_athlete;

  select id into strict editor_id from public.profiles
  where display_name = 'Editor Staging' and role = 'editor' and is_active;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  select id into strict rpc_athlete from public.save_admin_athlete(
    null, 'Public-only draft', null, null, null, null, 'draft', false, false, false
  );

  perform public.save_admin_athlete(
    rpc_athlete, 'Public-only published', null, null, null, null, 'published', true, false, false
  );
  if not exists (select 1 from public.athletes where id = rpc_athlete and publication_status = 'published') then
    raise exception 'Public-only athlete was not published.';
  end if;

  update public.athlete_consents
  set granted_at = now() - interval '1 day', expires_at = now() + interval '30 days'
  where athlete_id = rpc_athlete and consent_type = 'public_profile'
  returning * into strict consent_before;
  perform public.save_admin_athlete(
    rpc_athlete, 'Name-only consent edit', null, null, null, null, 'published', true, false, false
  );
  select * into strict consent_after from public.athlete_consents
  where athlete_id = rpc_athlete and consent_type = 'public_profile';
  if consent_after.status is distinct from consent_before.status
    or consent_after.granted_at is distinct from consent_before.granted_at
    or consent_after.expires_at is distinct from consent_before.expires_at
  then raise exception 'Active consent term changed during a profile-only edit.'; end if;

  update public.athlete_consents
  set status = 'granted', granted_at = now() - interval '1 day', expires_at = now() + interval '30 days'
  where athlete_id = rpc_athlete and consent_type = 'results_publication';
  perform public.save_admin_athlete(
    rpc_athlete, 'Consent withdrawal', null, null, null, null, 'published', true, false, false
  );
  select * into strict consent_before from public.athlete_consents
  where athlete_id = rpc_athlete and consent_type = 'results_publication';
  if consent_before.status <> 'withdrawn'
    or consent_before.granted_at is not null
    or consent_before.expires_at is not null
  then raise exception 'Consent withdrawal did not clear its active term.'; end if;

  perform public.save_admin_athlete(
    rpc_athlete, 'Consent re-grant', null, null, null, null, 'published', true, false, true
  );
  select * into strict consent_after from public.athlete_consents
  where athlete_id = rpc_athlete and consent_type = 'results_publication';
  if consent_after.status <> 'granted'
    or consent_after.granted_at is distinct from now()
    or consent_after.granted_at is not distinct from consent_before.granted_at
    or consent_after.expires_at is not null
  then raise exception 'Withdrawn consent was not recorded as a new grant.'; end if;

  insert into public.media_assets (provider, public_id, resource_type, is_public)
  values ('cloudinary', 'atomic-athlete-photo-' || rpc_athlete, 'image', true)
  returning id into photo_asset;
  blocked := false;
  begin
    perform public.save_admin_athlete(
      rpc_athlete, 'Must roll back', null, null, null, null, 'published', false, false, false
    );
  exception when others then
    if sqlerrm not like 'Athletes require active%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Publication without profile consent was accepted.'; end if;
  select count(*) into consent_count from public.athlete_consents
  where athlete_id = rpc_athlete and consent_type = 'public_profile' and status = 'granted';
  if consent_count <> 1 or exists (
    select 1 from public.athletes where id = rpc_athlete and display_name = 'Must roll back'
  ) then raise exception 'Failed athlete save was not atomic.'; end if;

  blocked := false;
  begin
    perform public.save_admin_athlete(
      rpc_athlete, 'Missing photo consent', null, null, null, photo_asset, 'published', true, false, false
    );
  exception when check_violation then
    blocked := true;
  end;
  if not blocked then raise exception 'Photo publication without photo consent was accepted.'; end if;

  perform public.save_admin_athlete(
    rpc_athlete, 'Public athlete with photo', null, null, null, photo_asset, 'published', true, true, false
  );
  execute 'reset role';
  if exists (select 1 from private.athlete_details where athlete_id = rpc_athlete) then
    raise exception 'Public-only athlete unexpectedly created private details.';
  end if;

  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.save_admin_athlete(
      null, 'Unauthorized athlete', null, null, null, null, 'draft', false, false, false
    );
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'Unauthorized athlete save was accepted.'; end if;

  blocked := false;
  begin
    perform 1 from private.athlete_details limit 1;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'Authenticated clients can read private athlete details.'; end if;
  execute 'reset role';

  set constraints all immediate;
end;
$$;

rollback;
