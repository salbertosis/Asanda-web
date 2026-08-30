begin;

do $$
declare
  editor_id uuid := gen_random_uuid();
  other_editor_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  orphan_path text := editor_id::text || '/' || gen_random_uuid()::text;
  evidence_path text := editor_id::text || '/' || gen_random_uuid()::text;
  visible integer;
  affected integer;
  blocked boolean;
begin
  insert into auth.users (id) values
    (editor_id), (other_editor_id), (viewer_id);
  insert into public.profiles (id, display_name, role, is_active) values
    (editor_id, 'Evidence storage SQL editor', 'editor', true),
    (other_editor_id, 'Evidence storage SQL second editor', 'editor', true),
    (viewer_id, 'Evidence storage SQL viewer', 'viewer', true);

  if not exists (
    select 1 from storage.buckets
    where id = 'athlete-evidence' and name = 'athlete-evidence' and not public
      and file_size_limit = 10485760
      and allowed_mime_types @> array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
      and cardinality(allowed_mime_types) = 4
  ) then raise exception 'The athlete evidence bucket configuration is invalid.'; end if;
  if (
    select count(*) from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname in (
        'Active staff read athlete evidence',
        'Active staff upload own athlete evidence',
        'Active staff delete orphan athlete evidence'
      )
  ) <> 3 then raise exception 'Athlete evidence storage policies are missing.'; end if;
  -- DELETE is catalog-validated because storage.protect_delete() blocks SQL deletes; behavior requires a Storage API integration test.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'Active staff delete orphan athlete evidence'
      and permissive = 'PERMISSIVE' and roles = array['authenticated'::name] and cmd = 'DELETE'
      and qual like '%bucket_id = ''athlete-evidence''::text%'
      and qual like '%private.is_content_editor()%'
      and qual like '%owner_id%auth.uid()%'
      and qual like '%NOT (EXISTS ( SELECT 1%'
      and qual like '%FROM source_documents document%'
      and qual like '%document.storage_bucket_id = objects.bucket_id%'
      and qual like '%document.storage_object_path = objects.name%'
  ) then raise exception 'The athlete evidence DELETE policy is invalid.'; end if;
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects' and cmd = 'UPDATE'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%athlete-evidence%'
  ) then raise exception 'Athlete evidence unexpectedly has an UPDATE policy.'; end if;

  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  insert into storage.objects (bucket_id, name, owner_id, metadata) values
    ('athlete-evidence', orphan_path, editor_id::text, '{"mimetype":"application/pdf","size":128}'),
    ('athlete-evidence', evidence_path, editor_id::text, '{"mimetype":"image/webp","size":128}');
  select count(*) into visible from storage.objects
  where bucket_id = 'athlete-evidence' and name in (orphan_path, evidence_path);
  if visible <> 2 then raise exception 'Active content staff could not read athlete evidence.'; end if;

  blocked := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('athlete-evidence', other_editor_id::text || '/' || gen_random_uuid()::text, editor_id::text);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'An editor uploaded into another user path.'; end if;
  blocked := false;
  begin
    update storage.objects set metadata = '{"changed":true}'
    where bucket_id = 'athlete-evidence' and name = evidence_path;
    get diagnostics affected = row_count;
    blocked := affected = 0;
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'An athlete evidence object was updated.'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';
  select count(*) into visible from storage.objects where bucket_id = 'athlete-evidence';
  if visible <> 0 then raise exception 'A viewer read private athlete evidence.'; end if;
  blocked := false;
  begin
    insert into storage.objects (bucket_id, name, owner_id)
    values ('athlete-evidence', viewer_id::text || '/' || gen_random_uuid()::text, viewer_id::text);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'A viewer uploaded athlete evidence.'; end if;
  execute 'reset role';

  execute 'set local role anon';
  blocked := false;
  begin
    select count(*) into visible from storage.objects where bucket_id = 'athlete-evidence';
    blocked := visible = 0;
  exception when insufficient_privilege then blocked := true; end;
  execute 'reset role';
  if not blocked then raise exception 'Anonymous access exposed private athlete evidence.'; end if;
end;
$$;

rollback;
