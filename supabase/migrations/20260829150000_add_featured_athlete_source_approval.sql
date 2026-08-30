alter table public.source_documents
  add column approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  add column approved_at timestamptz,
  add column approved_by uuid references public.profiles(id) on delete restrict,
  add constraint source_documents_approval_state_check check (
    (approval_status = 'approved'
      and status = 'processed'
      and asset_id is not null
      and checksum is not null
      and btrim(checksum) <> ''
      and approved_at is not null
      and approved_by is not null)
    or (approval_status <> 'approved' and approved_at is null and approved_by is null)
  );

create or replace function private.prepare_source_document_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.approval_status = 'approved' and (
    new.id,
    new.source_type,
    new.organization_id,
    new.asset_id,
    new.checksum,
    new.received_at,
    new.processed_at,
    new.status,
    new.competition_id,
    new.created_at
  ) is distinct from (
    old.id,
    old.source_type,
    old.organization_id,
    old.asset_id,
    old.checksum,
    old.received_at,
    old.processed_at,
    old.status,
    old.competition_id,
    old.created_at
  ) then
    raise exception 'Approved source documents must return to pending or rejected before material fields change.' using errcode = '42501';
  end if;

  if new.approval_status = 'approved' and (tg_op = 'INSERT' or old.approval_status is distinct from 'approved') then
    if not private.is_content_editor() then
      raise exception 'Only active content editors may approve source documents.' using errcode = '42501';
    end if;
    if new.status <> 'processed' or new.asset_id is null or new.checksum is null or btrim(new.checksum) = '' then
      raise exception 'Approved source documents require processed status, an evidence asset, and a non-empty checksum.' using errcode = '42501';
    end if;
    perform 1 from public.media_assets asset where asset.id = new.asset_id for share;
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

create or replace function private.protect_approved_source_document_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.approval_status = 'approved' then
    raise exception 'Approved source documents cannot be deleted.' using errcode = '42501';
  end if;
  return old;
end;
$$;

create or replace function private.protect_approved_source_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.source_documents document
    where document.asset_id = old.id
      and document.approval_status = 'approved'
  ) then
    if tg_op = 'DELETE' then
      raise exception 'Media assets referenced by approved source documents cannot be deleted.' using errcode = '42501';
    end if;

    if (
      new.id, new.provider, new.public_id, new.external_url, new.resource_type,
      new.format, new.width, new.height, new.bytes, new.alt_text, new.credit,
      new.is_public, new.created_at
    ) is distinct from (
      old.id, old.provider, old.public_id, old.external_url, old.resource_type,
      old.format, old.width, old.height, old.bytes, old.alt_text, old.credit,
      old.is_public, old.created_at
    ) then
      raise exception 'Media assets referenced by approved source documents cannot be materially changed.' using errcode = '42501';
    end if;
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.prepare_source_document_approval() from public, anon, authenticated;
revoke all on function private.protect_approved_source_document_delete() from public, anon, authenticated;
revoke all on function private.protect_approved_source_media() from public, anon, authenticated;

create trigger prepare_source_document_approval
before insert or update of id, source_type, organization_id, asset_id, checksum, received_at,
  processed_at, status, competition_id, created_at, approval_status, approved_at, approved_by
on public.source_documents
for each row execute function private.prepare_source_document_approval();

create trigger protect_approved_source_document_delete
before delete on public.source_documents
for each row execute function private.protect_approved_source_document_delete();

create trigger protect_approved_source_media
before update or delete on public.media_assets
for each row execute function private.protect_approved_source_media();
