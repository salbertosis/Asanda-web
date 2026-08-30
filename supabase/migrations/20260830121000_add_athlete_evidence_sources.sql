alter table public.source_documents
  add column athlete_id uuid references public.athletes(id) on delete restrict,
  add column evidence_kind text,
  add column evidence_label text,
  add column storage_bucket_id text,
  add column storage_object_path text,
  add column official_url text,
  drop constraint if exists source_documents_approval_state_check,
  add constraint source_documents_evidence_shape_check check (
    (evidence_kind is null and athlete_id is null and evidence_label is null
      and storage_bucket_id is null and storage_object_path is null and official_url is null)
    or (evidence_kind = 'private_object' and athlete_id is not null
      and btrim(evidence_label) <> '' and storage_bucket_id = 'athlete-evidence'
      and btrim(storage_object_path) <> '' and official_url is null and asset_id is null)
    or (evidence_kind = 'official_url' and athlete_id is not null
      and btrim(evidence_label) <> '' and official_url ~* '^https://[^[:space:]]+$'
      and storage_bucket_id is null and storage_object_path is null and asset_id is null)
  ),
  add constraint source_documents_approval_state_check check (
    (approval_status = 'approved' and status = 'processed'
      and checksum is not null and btrim(checksum) <> ''
      and approved_at is not null and approved_by is not null
      and ((evidence_kind is null and asset_id is not null)
        or evidence_kind in ('private_object', 'official_url')))
    or (approval_status <> 'approved' and approved_at is null and approved_by is null)
  );

create unique index source_documents_private_object_idx
  on public.source_documents (storage_bucket_id, storage_object_path)
  where evidence_kind = 'private_object';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'athlete-evidence', 'athlete-evidence', false, 10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Active staff read athlete evidence" on storage.objects;
create policy "Active staff read athlete evidence"
  on storage.objects for select to authenticated
  using (bucket_id = 'athlete-evidence' and (select private.is_content_editor()));

drop policy if exists "Active staff upload own athlete evidence" on storage.objects;
create policy "Active staff upload own athlete evidence"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'athlete-evidence'
    and (select private.is_content_editor())
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and owner_id = (select auth.uid())::text
  );

drop policy if exists "Active staff delete orphan athlete evidence" on storage.objects;
create policy "Active staff delete orphan athlete evidence"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'athlete-evidence'
    and (select private.is_content_editor())
    and owner_id = (select auth.uid())::text
    and not exists (
      select 1 from public.source_documents document
      where document.storage_bucket_id = bucket_id
        and document.storage_object_path = name
    )
  );

create or replace function private.prepare_source_document_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and not private.is_administrator()
    and (old.approval_status <> 'pending' or new.approval_status <> 'pending')
  then
    raise exception 'Only active administrators may review source documents.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.approval_status <> 'pending' and not private.is_administrator() then
    raise exception 'Only active administrators may review source documents.' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' and old.approval_status = 'approved' and (
    new.id, new.source_type, new.organization_id, new.asset_id, new.checksum,
    new.received_at, new.processed_at, new.status, new.competition_id, new.created_at,
    new.athlete_id, new.evidence_kind, new.evidence_label, new.storage_bucket_id,
    new.storage_object_path, new.official_url
  ) is distinct from (
    old.id, old.source_type, old.organization_id, old.asset_id, old.checksum,
    old.received_at, old.processed_at, old.status, old.competition_id, old.created_at,
    old.athlete_id, old.evidence_kind, old.evidence_label, old.storage_bucket_id,
    old.storage_object_path, old.official_url
  ) then
    raise exception 'Approved source documents must return to pending or rejected before material fields change.' using errcode = '42501';
  end if;

  if new.approval_status = 'approved'
    and (tg_op = 'INSERT' or old.approval_status is distinct from 'approved')
  then
    if new.status <> 'processed' or new.checksum is null or btrim(new.checksum) = ''
      or (new.evidence_kind is null and new.asset_id is null)
    then
      raise exception 'Approved source documents require processed status and valid evidence with a non-empty checksum.' using errcode = '42501';
    end if;
    if new.evidence_kind = 'private_object' and not exists (
      select 1 from storage.objects object
      where object.bucket_id = new.storage_bucket_id and object.name = new.storage_object_path
    ) then
      raise exception 'Private athlete evidence object does not exist.' using errcode = 'P0002';
    end if;
    new.approved_at := now();
    new.approved_by := auth.uid();
  elsif new.approval_status = 'approved'
    and (new.approved_at is distinct from old.approved_at or new.approved_by is distinct from old.approved_by)
  then
    raise exception 'Source document approval metadata is managed by the approval workflow.' using errcode = '42501';
  elsif new.approval_status <> 'approved' then
    new.approved_at := null;
    new.approved_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists prepare_source_document_approval on public.source_documents;
create trigger prepare_source_document_approval
before insert or update on public.source_documents
for each row execute function private.prepare_source_document_approval();

create or replace function public.create_athlete_evidence_source(
  requested_athlete_id uuid,
  requested_evidence_kind text,
  requested_evidence_label text,
  requested_storage_bucket_id text default null,
  requested_storage_object_path text default null,
  requested_official_url text default null,
  requested_checksum text default null
)
returns public.source_documents
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_url text := btrim(requested_official_url);
  created_document public.source_documents;
begin
  if not private.is_content_editor() then
    raise exception 'Only active content staff may create athlete evidence.' using errcode = '42501';
  end if;
  if requested_athlete_id is null or requested_evidence_label is null or btrim(requested_evidence_label) = '' then
    raise exception 'Athlete evidence requires an athlete and non-empty label.' using errcode = '22023';
  end if;

  if requested_evidence_kind = 'private_object' then
    if requested_storage_bucket_id is distinct from 'athlete-evidence'
      or requested_storage_object_path is null or btrim(requested_storage_object_path) = ''
      or requested_official_url is not null or requested_checksum is null
      or requested_checksum !~ '^[0-9a-fA-F]{64}$'
    then
      raise exception 'Private athlete evidence request is invalid.' using errcode = '22023';
    end if;
    if not exists (
      select 1 from storage.objects object
      where object.bucket_id = requested_storage_bucket_id
        and object.name = requested_storage_object_path
        and object.owner_id = auth.uid()::text
    ) then
      raise exception 'Private athlete evidence object does not exist or is not owned by the caller.' using errcode = 'P0002';
    end if;
  elsif requested_evidence_kind = 'official_url' then
    if requested_storage_bucket_id is not null or requested_storage_object_path is not null
      or normalized_url is null or normalized_url !~* '^https://[^[:space:]]+$'
    then
      raise exception 'Official athlete evidence URL is invalid.' using errcode = '22023';
    end if;
    requested_checksum := encode(extensions.digest(normalized_url, 'sha256'), 'hex');
  else
    raise exception 'Athlete evidence kind is invalid.' using errcode = '22023';
  end if;

  insert into public.source_documents (
    source_type, athlete_id, evidence_kind, evidence_label, storage_bucket_id,
    storage_object_path, official_url, checksum, status, processed_at, approval_status
  ) values (
    'manual', requested_athlete_id, requested_evidence_kind, btrim(requested_evidence_label),
    requested_storage_bucket_id, requested_storage_object_path,
    case when requested_evidence_kind = 'official_url' then normalized_url end,
    lower(requested_checksum), 'processed', now(), 'pending'
  ) returning * into created_document;
  return created_document;
end;
$$;

create or replace function public.review_athlete_evidence(
  requested_source_document_id uuid,
  requested_decision text
)
returns public.source_documents
language plpgsql
security definer
set search_path = ''
as $$
declare reviewed_document public.source_documents;
begin
  if not private.is_administrator() then
    raise exception 'Only active administrators may review athlete evidence.' using errcode = '42501';
  end if;
  if requested_decision is null or requested_decision not in ('approved', 'rejected') then
    raise exception 'Athlete evidence decision must be approved or rejected.' using errcode = '22023';
  end if;
  update public.source_documents
  set approval_status = requested_decision
  where id = requested_source_document_id and evidence_kind is not null
  returning * into reviewed_document;
  if reviewed_document.id is null then
    raise exception 'Athlete evidence source was not found.' using errcode = 'P0002';
  end if;
  return reviewed_document;
end;
$$;

revoke all on function public.create_athlete_evidence_source(uuid,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.review_athlete_evidence(uuid,text) from public, anon, authenticated;
grant execute on function public.create_athlete_evidence_source(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.review_athlete_evidence(uuid,text) to authenticated;

create or replace function private.enforce_athlete_achievement_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.source_documents document
    where document.id = new.source_document_id
      and document.athlete_id is not null
      and document.athlete_id <> new.athlete_id
  ) then
    raise exception 'Athlete achievement evidence must belong to the same athlete.' using errcode = '23514';
  end if;
  if new.publication_status = 'published' and not exists (
    select 1 from public.source_documents document
    where document.id = new.source_document_id
      and document.status = 'processed' and document.approval_status = 'approved'
  ) then
    raise exception 'Published athlete achievements require an approved source document.';
  end if;
  if new.publication_status = 'published' and not exists (
    select 1 from public.athletes athlete
    where athlete.id = new.athlete_id and athlete.publication_status = 'published'
      and private.has_active_consent(athlete.id, 'public_profile')
      and private.has_active_consent(athlete.id, 'results_publication')
  ) then
    raise exception 'Published athlete achievements require a published athlete and active public-profile and results consent.';
  end if;
  return new;
end;
$$;
