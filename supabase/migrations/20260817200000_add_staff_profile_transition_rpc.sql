create or replace function public.transition_staff_profile(
  requested_actor_id uuid,
  requested_target_id uuid,
  requested_role text,
  requested_is_active boolean
)
returns table (
  target_id uuid,
  display_name text,
  previous_role public.app_role,
  previous_is_active boolean,
  next_role public.app_role,
  next_is_active boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_profile public.profiles%rowtype;
  target_profile public.profiles%rowtype;
  target_after public.profiles%rowtype;
  locked_profile public.profiles%rowtype;
  actor_found boolean := false;
  target_row_count integer := 0;
  active_admin_count integer := 0;
  next_active_admin_count integer;
  updated_rows integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('asanda:staff-profile-transition', 0)
  );

  if requested_actor_id is null or requested_target_id is null then
    raise exception 'Actor and target profile IDs are required.' using errcode = '22023';
  end if;

  for locked_profile in
    select profile.*
    from public.profiles profile
    where profile.id in (requested_actor_id, requested_target_id)
       or (profile.role = 'administrator'::public.app_role and profile.is_active)
    order by profile.id
    for update
  loop
    if locked_profile.id = requested_actor_id then
      actor_profile := locked_profile;
      actor_found := true;
    end if;
    if locked_profile.id = requested_target_id then
      target_profile := locked_profile;
      target_row_count := target_row_count + 1;
    end if;
    if locked_profile.role = 'administrator'::public.app_role and locked_profile.is_active then
      active_admin_count := active_admin_count + 1;
    end if;
  end loop;

  if not actor_found
    or not actor_profile.is_active
    or actor_profile.role <> 'administrator'::public.app_role
  then
    raise exception 'The supplied actor is not an active administrator.' using errcode = '42501';
  end if;

  if target_row_count <> 1 then
    raise exception 'The target profile must resolve to exactly one row.' using errcode = '22023';
  end if;

  if requested_role is null or requested_role not in ('administrator', 'editor') then
    raise exception 'The requested role must be administrator or editor.' using errcode = '22023';
  end if;
  if requested_is_active is null then
    raise exception 'The requested active state is required.' using errcode = '22023';
  end if;

  next_active_admin_count := active_admin_count;
  if target_profile.role = 'administrator'::public.app_role and target_profile.is_active then
    next_active_admin_count := next_active_admin_count - 1;
  end if;
  if requested_role = 'administrator' and requested_is_active then
    next_active_admin_count := next_active_admin_count + 1;
  end if;
  if next_active_admin_count < 1 then
    raise exception 'At least one active administrator must remain.' using errcode = '23514';
  end if;

  if requested_actor_id = requested_target_id
    and (requested_role <> 'administrator' or not requested_is_active)
  then
    raise exception 'Administrators cannot remove their own access.' using errcode = '42501';
  end if;

  perform pg_catalog.set_config('request.jwt.claim.sub', requested_actor_id::text, true);
  update public.profiles
  set role = requested_role::public.app_role,
      is_active = requested_is_active
  where id = requested_target_id;
  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then
    raise exception 'The target profile transition did not affect exactly one row.';
  end if;

  select * into strict target_after
  from public.profiles
  where id = requested_target_id;

  return query
  select requested_target_id,
    target_profile.display_name,
    target_profile.role,
    target_profile.is_active,
    target_after.role,
    target_after.is_active;
end;
$$;

revoke all on function public.transition_staff_profile(uuid, uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.transition_staff_profile(uuid, uuid, text, boolean)
  to service_role;
