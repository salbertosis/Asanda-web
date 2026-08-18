alter table public.competitions
  add column revision bigint not null default 1,
  add constraint competitions_revision_positive check (revision > 0);

alter table public.source_documents
  add column competition_id uuid references public.competitions(id) on delete restrict;

alter table public.import_batches
  add column expected_revision bigint,
  add column correction_reason text;

alter table public.source_documents
  drop constraint if exists source_documents_source_type_check,
  add constraint source_documents_source_type_check
    check (source_type in ('pdf', 'csv', 'html', 'xml', 'manual', 'api', 'hy3'));

create unique index source_documents_competition_checksum_idx
  on public.source_documents (competition_id, checksum)
  where competition_id is not null and checksum is not null;

create table public.featured_athletes (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  display_order smallint not null check (display_order between 1 and 6),
  starts_at timestamptz, ends_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (athlete_id), unique (display_order),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.source_mappings (
  id uuid primary key default gen_random_uuid(), provider text not null check (btrim(provider) <> ''),
  source_organization text not null check (btrim(source_organization) <> ''),
  external_code text not null check (btrim(external_code) <> ''),
  mapping_kind text not null check (mapping_kind in ('organization', 'athlete')),
  organization_id uuid references public.organizations(id) on delete restrict,
  athlete_id uuid references public.athletes(id) on delete restrict,
  resolution_status text not null default 'pending'
    check (resolution_status in ('pending', 'resolved', 'rejected')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (provider, source_organization, external_code),
  check ((resolution_status = 'resolved' and (
    (mapping_kind = 'organization' and organization_id is not null and athlete_id is null)
    or (mapping_kind = 'athlete' and athlete_id is not null and organization_id is null)
  )) or (resolution_status <> 'resolved' and organization_id is null and athlete_id is null))
);

create or replace function private.has_publishable_athlete_consents(requested_athlete_id uuid, requested_photo_asset_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select private.has_active_consent(requested_athlete_id, 'public_profile'))
    and (
      requested_photo_asset_id is null
      or (select private.has_active_consent(requested_athlete_id, 'photo'))
    );
$$;

create or replace function private.is_publishable_athlete(requested_athlete_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes athlete
    where athlete.id = requested_athlete_id
      and athlete.publication_status = 'published'
      and private.has_publishable_athlete_consents(athlete.id, athlete.photo_asset_id)
  );
$$;

create or replace function private.enforce_athlete_publication()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.publication_status = 'published'
    and not private.has_publishable_athlete_consents(new.id, new.photo_asset_id)
  then
    raise exception 'Athletes require active public-profile consent and photo consent when a photo is linked.';
  end if;
  return new;
end;
$$;

create or replace function private.enforce_featured_athlete()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_publishable_athlete(new.athlete_id) then
    raise exception 'Featured athletes must be published with active consent.';
  end if;
  return new;
end;
$$;

create or replace function private.bump_competition_revision()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.revision = old.revision + 1;
  return new;
end;
$$;

revoke all on function private.has_publishable_athlete_consents(uuid, uuid) from public, anon, authenticated;
revoke all on function private.is_publishable_athlete(uuid) from public, anon, authenticated;
revoke all on function private.enforce_athlete_publication() from public, anon, authenticated;
revoke all on function private.enforce_featured_athlete() from public, anon, authenticated;
revoke all on function private.bump_competition_revision() from public, anon, authenticated;
grant execute on function private.is_publishable_athlete(uuid) to anon, authenticated;

drop trigger if exists enforce_athlete_publication on public.athletes;
create trigger enforce_athlete_publication
before insert or update of publication_status, photo_asset_id on public.athletes
for each row execute function private.enforce_athlete_publication();

create trigger enforce_featured_athlete
before insert or update of athlete_id on public.featured_athletes
for each row execute function private.enforce_featured_athlete();

create trigger set_updated_at
before update on public.featured_athletes
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.source_mappings
for each row execute function private.set_updated_at();

create trigger bump_competition_revision
before update on public.competitions
for each row execute function private.bump_competition_revision();

create trigger audit_admin_mutation
after insert or update or delete on public.featured_athletes
for each row execute function private.capture_admin_audit();

create trigger audit_admin_mutation
after insert or update or delete on public.source_mappings
for each row execute function private.capture_admin_audit();

drop policy if exists "Published athletes with profile consent are readable" on public.athletes;
create policy "Published athletes with profile consent are readable"
  on public.athletes for select using (private.is_publishable_athlete(id));

drop policy if exists "Official performances are readable" on public.performances;
create policy "Official performances with results consent are readable"
  on public.performances for select using (
    status = 'official'
    and exists (
      select 1
      from public.entries entry
      join public.athletes athlete on athlete.id = entry.athlete_id
      where entry.id = entry_id
        and athlete.publication_status = 'published'
        and private.has_active_consent(athlete.id, 'results_publication')
    )
  );

create policy "Current featured athletes are readable"
  on public.featured_athletes for select using (
    (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and private.is_publishable_athlete(athlete_id)
  );

create policy "Content editors manage featured athletes"
  on public.featured_athletes for all to authenticated
  using ((select private.is_content_editor()))
  with check ((select private.is_content_editor()));

create policy "Content editors manage source mappings"
  on public.source_mappings for all to authenticated
  using ((select private.is_content_editor()))
  with check ((select private.is_content_editor()));

revoke all on public.featured_athletes from public, anon;
grant select on public.featured_athletes to anon;
grant select, insert, update, delete on public.featured_athletes to authenticated;
revoke all on public.source_mappings from public, anon;
grant select, insert, update, delete on public.source_mappings to authenticated;

create or replace function public.commit_result_import(
  competition_id uuid,
  expected_revision bigint,
  sanitized_rows jsonb,
  source_checksum text,
  mappings jsonb default '[]'::jsonb,
  correction_reason text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  competition_row public.competitions;
  source_document_id uuid;
  import_batch_id uuid;
  entry_id uuid;
  rows_count integer;
  row_data record;
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may import results.' using errcode = '42501';
  end if;
  if mappings is null or jsonb_typeof(mappings) <> 'array' then
    raise exception 'Result mappings must be an array.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(mappings) mapping
    where mapping->>'id' is null
      or not exists (
        select 1 from public.source_mappings stored
        where stored.id = (mapping->>'id')::uuid
          and stored.resolution_status = 'resolved'
      )
  ) then
    raise exception 'Every source mapping must be resolved before import.';
  end if;
  if sanitized_rows is null or jsonb_typeof(sanitized_rows) <> 'array' then
    raise exception 'Sanitized result rows must be an array.';
  end if;
  select count(*) into rows_count from jsonb_array_elements(sanitized_rows);
  if rows_count = 0 then raise exception 'Result import requires at least one row.'; end if;
  if expected_revision is null or expected_revision < 1
    or source_checksum is null or source_checksum !~ '^[0-9a-fA-F]{64}$'
  then
    raise exception 'Result import revision and checksum are invalid.';
  end if;

  select * into strict competition_row
  from public.competitions
  where id = competition_id
  for update;
  if competition_row.revision <> expected_revision then
    raise exception 'Competition changed; create a fresh result preview.';
  end if;
  if exists (
    select 1 from public.source_documents stored
    where stored.competition_id = competition_id and stored.checksum = source_checksum
  ) then
    raise exception 'This source checksum was already imported for the competition.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(sanitized_rows) as payload(
      competition_event_id uuid, athlete_id uuid, represented_organization_id uuid,
      entry_status text, seed_time_ms bigint, lane smallint, time_ms bigint,
      place integer, status text, notes text
    )
    where payload.competition_event_id is null or payload.athlete_id is null
      or payload.status not in ('provisional', 'official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time')
      or not exists (
        select 1 from public.competition_events event_row
        where event_row.id = payload.competition_event_id
          and event_row.competition_id = competition_id
      )
      or not exists (select 1 from public.athletes where id = payload.athlete_id)
      or (payload.represented_organization_id is not null and not exists (
        select 1 from public.organizations where id = payload.represented_organization_id
      ))
      or (payload.status in ('provisional', 'official') and (payload.time_ms is null or payload.time_ms <= 0))
      or (payload.status not in ('provisional', 'official') and payload.time_ms is not null)
      or (payload.status = 'official'
        and not private.has_active_consent(payload.athlete_id, 'results_publication'))
  ) then raise exception 'Result rows failed event, identity, status, or consent validation.'; end if;

  insert into public.source_documents (source_type, competition_id, checksum, status, processed_at)
  values ('hy3', competition_id, source_checksum, 'processed', now())
  returning id into source_document_id;
  insert into public.import_batches (
    source_document_id, status, rows_received, rows_accepted, rows_rejected,
    started_at, completed_at, expected_revision, correction_reason
  ) values (
    source_document_id, 'completed', rows_count, rows_count, 0,
    now(), now(), expected_revision, correction_reason
  ) returning id into import_batch_id;

  for row_data in select * from jsonb_to_recordset(sanitized_rows) as payload(
    competition_event_id uuid, athlete_id uuid, represented_organization_id uuid,
    entry_status text, seed_time_ms bigint, lane smallint, time_ms bigint,
    place integer, status text, notes text
  ) loop
    insert into public.entries (
      competition_event_id, athlete_id, represented_organization_id,
      seed_time_ms, lane, status
    ) values (
      row_data.competition_event_id, row_data.athlete_id, row_data.represented_organization_id,
      row_data.seed_time_ms, row_data.lane, coalesce(row_data.entry_status, 'confirmed')
    ) on conflict (competition_event_id, athlete_id) do update set
      represented_organization_id = excluded.represented_organization_id,
      seed_time_ms = excluded.seed_time_ms,
      lane = excluded.lane,
      status = excluded.status,
      updated_at = now()
    returning id into entry_id;

    insert into public.performances (
      entry_id, time_ms, place, status, source_document_id, recorded_at, notes
    ) values (
      entry_id, row_data.time_ms, row_data.place, row_data.status::public.result_status,
      source_document_id, now(), row_data.notes
    ) on conflict (entry_id) do update set
      time_ms = excluded.time_ms,
      place = excluded.place,
      status = excluded.status,
      source_document_id = excluded.source_document_id,
      recorded_at = excluded.recorded_at,
      notes = excluded.notes,
      updated_at = now();
  end loop;

  update public.competitions set updated_at = now() where id = competition_id;
  return import_batch_id;
end;
$$;

revoke all on function public.commit_result_import(uuid, bigint, jsonb, text, jsonb, text) from public, anon;
grant execute on function public.commit_result_import(uuid, bigint, jsonb, text, jsonb, text) to authenticated;
