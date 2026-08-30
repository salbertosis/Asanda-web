begin;

do $$
declare
  administrator_id uuid := gen_random_uuid();
  editor_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  evidence_asset_id uuid;
  alternate_asset_id uuid;
  approved_source_id uuid;
  incomplete_source_id uuid;
  blocked boolean;
  blocked_count integer := 0;
  affected_rows integer;
  mutation text;
begin
  insert into auth.users (id) values (administrator_id), (editor_id), (viewer_id);
  insert into public.profiles (id, display_name, role, is_active) values
    (administrator_id, 'Source approval SQL administrator', 'administrator', true),
    (editor_id, 'Source approval SQL editor', 'editor', true),
    (viewer_id, 'Source approval SQL viewer', 'viewer', true);
  insert into public.media_assets (provider, external_url, resource_type, is_public)
  values ('local', '/source-approval-evidence.pdf', 'document', false)
  returning id into evidence_asset_id;
  insert into public.media_assets (provider, external_url, resource_type, is_public)
  values ('local', '/source-approval-alternate.pdf', 'document', false)
  returning id into alternate_asset_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at)
  values ('manual', evidence_asset_id, repeat('a', 64), 'processed', now())
  returning id into approved_source_id;
  insert into public.source_documents (source_type, status, processed_at)
  values ('manual', 'processed', now()) returning id into incomplete_source_id;

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    update public.source_documents set approval_status = 'approved'
    where id = approved_source_id;
    get diagnostics affected_rows = row_count;
    blocked := affected_rows = 0;
  exception when insufficient_privilege then
    if sqlerrm not like 'Only active content editors%' then raise; end if;
    blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'A viewer approved editorial evidence.'; end if;
  if not exists (
    select 1 from public.source_documents where id = approved_source_id
      and approval_status = 'pending' and approved_at is null and approved_by is null
  ) then raise exception 'A blocked viewer approval changed editorial evidence.'; end if;

  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  foreach mutation in array array['approved', 'rejected'] loop
    blocked := false;
    begin
      update public.source_documents set approval_status = mutation
      where id = approved_source_id;
    exception when insufficient_privilege then
      if sqlerrm not like 'Only active administrators may review source documents%' then raise; end if;
      blocked := true;
    end;
    if not blocked then raise exception 'An editor reviewed editorial evidence as %.', mutation; end if;
  end loop;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', administrator_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    update public.source_documents set approval_status = 'approved'
    where id = incomplete_source_id;
  exception when insufficient_privilege then
    if sqlerrm not like 'Approved source documents require processed status%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Incomplete editorial evidence was approved.'; end if;
  update public.source_documents set approval_status = 'approved' where id = approved_source_id;
  update public.source_documents set approval_status = 'rejected' where id = incomplete_source_id;
  execute 'reset role';

  if not exists (
    select 1 from public.source_documents where id = approved_source_id
      and status = 'processed' and asset_id is not null and checksum <> ''
      and approval_status = 'approved' and approved_at is not null
      and approved_by = administrator_id
  ) then raise exception 'Approval did not capture complete evidence and reviewer metadata.'; end if;
  if not exists (
    select 1 from public.source_documents where id = incomplete_source_id
      and approval_status = 'rejected' and approved_at is null and approved_by is null
  ) then raise exception 'Administrator rejection did not clear approval metadata.'; end if;

  perform set_config('request.jwt.claim.sub', administrator_id::text, true);
  execute 'set local role authenticated';
  foreach mutation in array array[
    format('update public.source_documents set id = %L where id = %L', gen_random_uuid(), approved_source_id),
    format('update public.source_documents set source_type = %L where id = %L', 'api', approved_source_id),
    format('update public.source_documents set asset_id = %L where id = %L', alternate_asset_id, approved_source_id),
    format('update public.source_documents set checksum = %L where id = %L', repeat('f', 64), approved_source_id),
    format('update public.source_documents set received_at = now() - interval %L where id = %L', '1 day', approved_source_id),
    format('update public.source_documents set processed_at = now() - interval %L where id = %L', '1 day', approved_source_id),
    format('update public.source_documents set status = %L where id = %L', 'archived', approved_source_id),
    format('update public.source_documents set created_at = now() - interval %L where id = %L', '1 day', approved_source_id)
  ] loop
    begin
      execute mutation;
    exception when insufficient_privilege then
      if sqlerrm not like 'Approved source documents must return%' then raise; end if;
      blocked_count := blocked_count + 1;
    end;
  end loop;
  if blocked_count <> 8 then raise exception 'Approved source material fields were mutable.'; end if;

  blocked := false;
  begin
    update public.source_documents set approved_at = approved_at - interval '1 day'
    where id = approved_source_id;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'Approval metadata was directly editable.'; end if;

  blocked := false;
  begin
    update public.media_assets set external_url = '/mutated.pdf' where id = evidence_asset_id;
  exception when insufficient_privilege then
    if sqlerrm not like 'Media assets referenced by approved source documents cannot be materially changed%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Approved evidence media was mutable.'; end if;
  update public.media_assets set updated_at = updated_at where id = evidence_asset_id;

  blocked := false;
  begin
    delete from public.media_assets where id = evidence_asset_id;
  exception when insufficient_privilege then
    if sqlerrm not like 'Media assets referenced by approved source documents cannot be deleted%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Approved evidence media was deleted.'; end if;

  blocked := false;
  begin
    delete from public.source_documents where id = approved_source_id;
  exception when insufficient_privilege then
    if sqlerrm not like 'Approved source documents cannot be deleted%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Approved editorial evidence was deleted.'; end if;
  delete from public.source_documents where id = incomplete_source_id;
  execute 'reset role';
end;
$$;

rollback;
