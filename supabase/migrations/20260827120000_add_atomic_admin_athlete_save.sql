drop trigger if exists enforce_athlete_details_required on public.athletes;
drop function if exists private.enforce_athlete_details_required();

create or replace function public.save_admin_athlete(
  requested_athlete_id uuid,
  requested_display_name text,
  requested_preferred_name text,
  requested_competitive_sex text,
  requested_birth_year_public smallint,
  requested_photo_asset_id uuid,
  requested_publication_status text,
  requested_profile_consent boolean,
  requested_photo_consent boolean,
  requested_results_consent boolean
)
returns table (
  id uuid,
  display_name text,
  preferred_name text,
  competitive_sex text,
  birth_year_public smallint,
  photo_asset_id uuid,
  publication_status public.publication_status
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  stored public.athletes%rowtype;
begin
  if not private.is_content_editor() then
    raise exception 'ATHLETE_SAVE_UNAUTHORIZED' using errcode = '42501';
  end if;
  if requested_display_name is null or btrim(requested_display_name) = ''
    or requested_publication_status is null
    or requested_publication_status not in ('draft', 'published')
    or requested_profile_consent is null
    or requested_photo_consent is null
    or requested_results_consent is null
  then
    raise exception 'ATHLETE_SAVE_INVALID' using errcode = '22023';
  end if;
  if requested_competitive_sex is not null
    and requested_competitive_sex not in ('female', 'male', 'mixed', 'open')
  then
    raise exception 'ATHLETE_SAVE_INVALID' using errcode = '22023';
  end if;
  if requested_photo_asset_id is not null and not requested_photo_consent then
    raise exception 'ATHLETE_SAVE_PHOTO_CONSENT_REQUIRED' using errcode = '23514';
  end if;

  if requested_athlete_id is null then
    insert into public.athletes (
      display_name, preferred_name, competitive_sex, birth_year_public,
      photo_asset_id, publication_status
    ) values (
      btrim(requested_display_name), nullif(btrim(requested_preferred_name), ''),
      requested_competitive_sex, requested_birth_year_public, requested_photo_asset_id, 'draft'
    ) returning * into stored;
  else
    update public.athletes set
      display_name = btrim(requested_display_name),
      preferred_name = nullif(btrim(requested_preferred_name), ''),
      competitive_sex = requested_competitive_sex,
      birth_year_public = requested_birth_year_public,
      photo_asset_id = requested_photo_asset_id,
      publication_status = 'draft'
    where athletes.id = requested_athlete_id
    returning * into stored;
    if not found then
      raise exception 'ATHLETE_SAVE_NOT_FOUND' using errcode = '22023';
    end if;
  end if;

  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at, expires_at)
  values
    (stored.id, 'public_profile', case when requested_profile_consent then 'granted'::public.consent_status else 'withdrawn'::public.consent_status end, case when requested_profile_consent then now() end, null),
    (stored.id, 'photo', case when requested_photo_consent then 'granted'::public.consent_status else 'withdrawn'::public.consent_status end, case when requested_photo_consent then now() end, null),
    (stored.id, 'results_publication', case when requested_results_consent then 'granted'::public.consent_status else 'withdrawn'::public.consent_status end, case when requested_results_consent then now() end, null)
  on conflict (athlete_id, consent_type) do update set
    status = excluded.status,
    granted_at = case
      when athlete_consents.status = 'granted'
        and athlete_consents.granted_at is not null
        and (athlete_consents.expires_at is null or athlete_consents.expires_at > now())
        and excluded.status = 'granted'
      then athlete_consents.granted_at
      else excluded.granted_at
    end,
    expires_at = case
      when athlete_consents.status = 'granted'
        and athlete_consents.granted_at is not null
        and (athlete_consents.expires_at is null or athlete_consents.expires_at > now())
        and excluded.status = 'granted'
      then athlete_consents.expires_at
      else excluded.expires_at
    end;

  update public.athletes
  set publication_status = requested_publication_status::public.publication_status
  where athletes.id = stored.id
  returning * into stored;

  return query select stored.id, stored.display_name, stored.preferred_name,
    stored.competitive_sex, stored.birth_year_public, stored.photo_asset_id,
    stored.publication_status;
end;
$$;

revoke all on function public.save_admin_athlete(uuid, text, text, text, smallint, uuid, text, boolean, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.save_admin_athlete(uuid, text, text, text, smallint, uuid, text, boolean, boolean, boolean)
  to authenticated;
