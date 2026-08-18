begin;

do $$
declare
  administrator_id uuid;
  editor_id uuid;
  extra_administrator_id uuid;
  missing_id uuid := gen_random_uuid();
  transition_row record;
  observed_role public.app_role;
  current_is_active boolean;
  audit_start_id bigint := coalesce((select max(id) from private.admin_audit_log), 0);
  audit_count integer;
  blocked boolean;
begin
  if not has_function_privilege(
    'service_role',
    'public.transition_staff_profile(uuid,uuid,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'service_role cannot execute the staff profile transition RPC.';
  end if;
  if has_function_privilege(
    'anon',
    'public.transition_staff_profile(uuid,uuid,text,boolean)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.transition_staff_profile(uuid,uuid,text,boolean)',
    'EXECUTE'
  ) then
    raise exception 'Non-service roles can execute the staff profile transition RPC.';
  end if;

  select id into strict administrator_id
  from public.profiles
  where display_name = 'Administrador Staging'
    and role = 'administrator'
    and is_active;
  select id into strict editor_id
  from public.profiles
  where display_name = 'Editor Staging'
    and role = 'editor'
    and is_active;

  execute 'set local role service_role';

  for extra_administrator_id in
    select id from public.profiles
    where role = 'administrator' and is_active and id <> administrator_id
  loop
    perform public.transition_staff_profile(
      administrator_id, extra_administrator_id, 'editor', true
    );
  end loop;

  blocked := false;
  begin
    perform public.transition_staff_profile(
      administrator_id, editor_id, 'viewer', true
    );
  exception when others then
    if sqlerrm not like 'The requested role must%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Invalid roles were accepted.'; end if;

  blocked := false;
  begin
    perform public.transition_staff_profile(
      administrator_id, missing_id, 'editor', true
    );
  exception when others then
    if sqlerrm not like 'The target profile must%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'A missing target profile was accepted.'; end if;

  select * into strict transition_row
  from public.transition_staff_profile(
    administrator_id, editor_id, 'administrator', true
  );
  if transition_row.previous_role <> 'editor'::public.app_role
    or transition_row.previous_is_active is not true
    or transition_row.next_role <> 'administrator'::public.app_role
    or transition_row.next_is_active is not true
  then
    raise exception 'The transition did not return bounded prior/current state.';
  end if;

  select role, is_active into observed_role, current_is_active
  from public.profiles where id = editor_id;
  if observed_role <> 'administrator'::public.app_role or not current_is_active then
    raise exception 'The exact target profile state was not updated.';
  end if;
  select count(*)::integer into audit_count
  from private.admin_audit_log
  where id > audit_start_id
    and actor_id = administrator_id
    and entity_table = 'profiles'
    and entity_id = editor_id::text
    and action = 'UPDATE';
  if audit_count <> 1 then
    raise exception 'The profile transition did not create exactly one audit row.';
  end if;

  perform public.transition_staff_profile(
    administrator_id, editor_id, 'administrator', false
  );
  blocked := false;
  begin
    perform public.transition_staff_profile(
      editor_id, administrator_id, 'editor', true
    );
  exception when others then
    if sqlerrm not like 'The supplied actor%' then raise; end if;
    blocked := true;
  end;
  if not blocked then
    raise exception 'An inactive administrator actor was accepted.';
  end if;
  perform public.transition_staff_profile(
    administrator_id, editor_id, 'administrator', true
  );

  blocked := false;
  begin
    perform public.transition_staff_profile(
      administrator_id, administrator_id, 'editor', true
    );
  exception when others then
    if sqlerrm not like 'Administrators cannot remove%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Self-demotion was accepted.'; end if;

  blocked := false;
  begin
    perform public.transition_staff_profile(
      administrator_id, administrator_id, 'administrator', false
    );
  exception when others then
    if sqlerrm not like 'Administrators cannot remove%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Self-deactivation was accepted.'; end if;

  perform public.transition_staff_profile(
    administrator_id, editor_id, 'editor', true
  );
  blocked := false;
  begin
    perform public.transition_staff_profile(
      administrator_id, administrator_id, 'editor', true
    );
  exception when others then
    if sqlerrm not like 'At least one active administrator%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'The last active administrator was removable.'; end if;

  blocked := false;
  begin
    perform public.transition_staff_profile(
      editor_id, administrator_id, 'editor', true
    );
  exception when others then
    if sqlerrm not like 'The supplied actor%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'An inactive-role actor was accepted.'; end if;

  execute 'reset role';
end;
$$;

rollback;
