-- Club records are historical entities. They may be archived, never deleted.
alter table public.source_documents
drop constraint if exists source_documents_organization_id_fkey,
add constraint source_documents_organization_id_fkey
foreign key (organization_id) references public.organizations (
    id
) on delete restrict;

alter table public.competitions
drop constraint if exists competitions_organizer_id_fkey,
add constraint competitions_organizer_id_fkey
foreign key (organizer_id) references public.organizations (
    id
) on delete restrict;

alter table public.entries
drop constraint if exists entries_represented_organization_id_fkey,
add constraint entries_represented_organization_id_fkey
foreign key (represented_organization_id) references public.organizations (
    id
) on delete restrict;

alter table public.qualification_standards
drop constraint if exists
qualification_standards_governing_organization_id_fkey,
add constraint qualification_standards_governing_organization_id_fkey
foreign key (governing_organization_id) references public.organizations (
    id
) on delete restrict;

alter table public.records
drop constraint if exists records_scope_organization_id_fkey,
add constraint records_scope_organization_id_fkey
foreign key (scope_organization_id) references public.organizations (
    id
) on delete restrict;

alter table public.organizations
add constraint organizations_club_identity
check (
    organization_type <> 'club'
    or (btrim(name) <> '' and slug = lower(slug))
);

create or replace function private.prevent_organization_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Organizations must be archived instead of deleted.'
    using errcode = '23503';
  return old;
end;
$$;

create or replace function private.enforce_approved_organization_logo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.logo_asset_id is not null and not exists (
    select 1
    from public.media_assets asset
    where asset.id = new.logo_asset_id
      and asset.provider = 'cloudinary'
      and asset.resource_type = 'image'
      and asset.is_public
      and btrim(coalesce(asset.public_id, '')) <> ''
      and btrim(coalesce(asset.alt_text, '')) <> ''
  ) then
    raise exception 'Organizations require an approved Cloudinary image logo.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.prevent_organization_delete() from public,
anon,
authenticated;
revoke all on function private.enforce_approved_organization_logo() from public,
anon,
authenticated;

drop trigger if exists prevent_organization_delete on public.organizations;
create trigger prevent_organization_delete
before delete on public.organizations
for each row execute function private.prevent_organization_delete();

drop trigger if exists enforce_approved_organization_logo
on public.organizations;
create trigger enforce_approved_organization_logo
before insert or update of logo_asset_id on public.organizations
for each row execute function private.enforce_approved_organization_logo();
