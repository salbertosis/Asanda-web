do $$
declare
  test_athlete uuid;
  test_mapping uuid;
  test_feature uuid;
  editor_id uuid;
  blocked boolean;
  audit_start_id bigint := coalesce((select max(id) from private.admin_audit_log), 0);
begin
  if to_regclass('public.featured_athletes') is null or to_regclass('public.source_mappings') is null then
    raise exception 'Featured athlete and source mapping tables are missing.';
  end if;

  if not has_table_privilege('anon', 'public.featured_athletes', 'SELECT') or has_table_privilege('anon', 'public.source_mappings', 'SELECT') then
    raise exception 'Featured/source mapping grants do not preserve the public privacy boundary.';
  end if;
  if has_function_privilege('anon', 'public.commit_result_import(uuid,bigint,jsonb,text,jsonb,text)', 'EXECUTE') then
    raise exception 'Anonymous clients can execute the result import RPC.';
  end if;

  select id into strict editor_id from public.profiles where display_name = 'Editor Staging' and role = 'editor' and is_active;
  insert into public.athletes (display_name) values ('Content contract test') returning id into test_athlete;
  insert into private.athlete_details (athlete_id, date_of_birth, national_id_hash, national_id_last4)
  values (test_athlete, date '2000-01-01', encode(extensions.digest(test_athlete::text, 'sha256'), 'hex'), '0000');

  blocked := false;
  begin
    update public.athletes set publication_status = 'published' where id = test_athlete;
  exception when others then
    if sqlerrm not like 'Athletes require active%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Athlete publication without consent was accepted.'; end if;

  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (test_athlete, 'public_profile', 'granted', now());
  update public.athletes set publication_status = 'published' where id = test_athlete;
  insert into public.featured_athletes (athlete_id, display_order) values (test_athlete, 1) returning id into test_feature;

  insert into public.source_mappings (
    provider, source_organization, external_code, mapping_kind, resolution_status
  ) values ('hy-tek', 'contract-test', 'unresolved-athlete', 'athlete', 'pending')
  returning id into test_mapping;

  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.commit_result_import(
      gen_random_uuid(), 1, '[]'::jsonb, repeat('a', 64),
      jsonb_build_array(jsonb_build_object('id', test_mapping)), null
    );
  exception when others then
    if sqlerrm not like 'Every source mapping must be resolved%' then raise; end if;
    blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'An unresolved source mapping reached the import RPC.'; end if;

  delete from public.source_mappings where id = test_mapping;
  delete from public.featured_athletes where id = test_feature;
  delete from public.athletes where id = test_athlete;
  delete from private.admin_audit_log where id > audit_start_id;
end;
$$;
