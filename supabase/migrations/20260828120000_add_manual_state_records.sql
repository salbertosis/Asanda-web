alter table public.records
  alter column performance_id drop not null,
  add column athlete_id uuid references public.athletes(id) on delete restrict,
  add column athlete_name_snapshot text,
  add column athlete_photo_asset_id uuid references public.media_assets(id) on delete restrict,
  add column club_name_snapshot text,
  add column event_definition_id uuid references public.event_definitions(id) on delete restrict,
  add column event_name_snapshot text,
  add column age_category_id uuid references public.age_categories(id) on delete restrict,
  add column age_category_name_snapshot text,
  add column competitive_sex text,
  add column time_ms bigint,
  add column achieved_year smallint,
  add column competition_name_snapshot text,
  add column course text default 'long_course',
  add column publication_status text,
  add column published_at timestamptz,
  add column revision bigint not null default 1,
  add column updated_at timestamptz not null default now();

-- Retain ratification metadata for history, but do not populate a second state
-- machine for records created through the new authoritative contract.
alter table public.records alter column ratification_status drop default, alter column ratification_status drop not null;

update public.records record
set athlete_id = entry.athlete_id,
    athlete_name_snapshot = athlete.display_name,
    athlete_photo_asset_id = athlete.photo_asset_id,
    club_name_snapshot = coalesce(club.short_name, club.name),
    event_definition_id = event_definition.id,
    event_name_snapshot = event_definition.name,
    age_category_id = competition_event.category_id,
    age_category_name_snapshot = category.name,
    competitive_sex = competition_event.competitive_sex,
    time_ms = performance.time_ms,
    achieved_year = extract(year from competition.starts_on)::smallint,
    competition_name_snapshot = competition.name,
    course = event_definition.course,
    publication_status = case when record.ratification_status = 'ratified' then 'published' else 'draft' end,
    published_at = case when record.ratification_status = 'ratified' then coalesce(record.ratified_at, record.created_at) end
from public.performances performance
join public.entries entry on entry.id = performance.entry_id
join public.athletes athlete on athlete.id = entry.athlete_id
join public.competition_events competition_event on competition_event.id = entry.competition_event_id
join public.competitions competition on competition.id = competition_event.competition_id
join public.event_definitions event_definition on event_definition.id = competition_event.event_definition_id
left join public.age_categories category on category.id = competition_event.category_id
left join public.organizations club on club.id = entry.represented_organization_id
where record.performance_id = performance.id;

do $$
begin
  if exists (
    select 1 from public.records
    where athlete_name_snapshot is null or btrim(athlete_name_snapshot) = ''
       or club_name_snapshot is null or btrim(club_name_snapshot) = ''
       or event_definition_id is null or event_name_snapshot is null or btrim(event_name_snapshot) = ''
       or age_category_id is null or age_category_name_snapshot is null or btrim(age_category_name_snapshot) = ''
       or competitive_sex is null or time_ms is null or achieved_year is null
       or competition_name_snapshot is null or btrim(competition_name_snapshot) = ''
       or course <> 'long_course' or publication_status is null
       or (athlete_photo_asset_id is not null and not exists (
         select 1 from public.media_assets photo where photo.id = athlete_photo_asset_id
           and photo.provider = 'cloudinary' and photo.resource_type = 'image' and photo.is_public
           and btrim(coalesce(photo.public_id, '')) <> '' and btrim(coalesce(photo.alt_text, '')) <> ''
       ))
  ) then
    raise exception 'Existing records cannot be safely backfilled as authoritative long-course state records.';
  end if;
end;
$$;

alter table public.records
  alter column athlete_name_snapshot set not null,
  alter column club_name_snapshot set not null,
  alter column event_definition_id set not null,
  alter column event_name_snapshot set not null,
  alter column age_category_id set not null,
  alter column age_category_name_snapshot set not null,
  alter column competitive_sex set not null,
  alter column time_ms set not null,
  alter column achieved_year set not null,
  alter column competition_name_snapshot set not null,
  alter column course set not null,
  alter column publication_status set not null,
  add constraint records_athlete_name_snapshot_present check (btrim(athlete_name_snapshot) <> ''),
  add constraint records_club_name_snapshot_present check (btrim(club_name_snapshot) <> ''),
  add constraint records_event_name_snapshot_present check (btrim(event_name_snapshot) <> ''),
  add constraint records_category_name_snapshot_present check (btrim(age_category_name_snapshot) <> ''),
  add constraint records_competition_name_snapshot_present check (btrim(competition_name_snapshot) <> ''),
  add constraint records_competitive_sex_check check (competitive_sex in ('female', 'male', 'mixed', 'open')),
  add constraint records_time_ms_positive check (time_ms > 0),
  add constraint records_achieved_year_reasonable check (achieved_year between 1900 and 2200),
  add constraint records_course_long_course check (course = 'long_course'),
  add constraint records_publication_status_check check (publication_status in ('draft', 'published')),
  add constraint records_revision_positive check (revision > 0),
  add constraint records_published_at_consistent check (
    (publication_status = 'draft' and published_at is null)
    or (publication_status = 'published' and published_at is not null)
  );

create unique index records_one_published_state_slot
  on public.records (event_definition_id, age_category_id, competitive_sex)
  where scope_type = 'state' and publication_status = 'published';

create or replace function private.enforce_state_record_photo()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.athlete_photo_asset_id is not null and not exists (
    select 1 from public.media_assets where id = new.athlete_photo_asset_id and provider = 'cloudinary'
      and resource_type = 'image' and is_public and btrim(coalesce(public_id, '')) <> ''
      and btrim(coalesce(alt_text, '')) <> ''
  ) then raise exception 'Record photos must be approved public Cloudinary images.' using errcode = '23514'; end if;
  return new;
end;
$$;
revoke all on function private.enforce_state_record_photo() from public, anon, authenticated;
create trigger enforce_state_record_photo before insert or update of athlete_photo_asset_id on public.records
for each row execute function private.enforce_state_record_photo();

drop policy if exists "Ratified records are readable" on public.records;
create policy "Published state and ratified historical records are readable"
  on public.records for select using (
    (scope_type = 'state' and publication_status = 'published')
    or (scope_type in ('club', 'national') and ratification_status = 'ratified')
  );
create policy "Published state record photos are readable" on public.media_assets for select using (
  provider = 'cloudinary' and resource_type = 'image' and is_public
  and btrim(coalesce(public_id, '')) <> '' and btrim(coalesce(alt_text, '')) <> ''
  and exists (select 1 from public.records where athlete_photo_asset_id = media_assets.id)
);
revoke insert, update, delete on public.records from authenticated;

create or replace function public.save_state_record_draft(
  requested_record_id uuid, requested_expected_revision bigint, requested_athlete_id uuid,
  requested_athlete_name text, requested_photo_asset_id uuid, requested_club_name text,
  requested_event_definition_id uuid, requested_age_category_id uuid,
  requested_competitive_sex text, requested_time_ms bigint, requested_achieved_year smallint,
  requested_competition_name text
) returns table (record_id uuid, revision bigint)
language plpgsql security definer set search_path = '' as $$
declare
  event_row public.event_definitions%rowtype;
  category_name text;
begin
  if not private.is_content_editor() then raise exception 'State records require an active editor.' using errcode = '42501'; end if;
  if requested_record_id is null and requested_expected_revision is not null then raise exception 'New drafts cannot have an expected revision.'; end if;
  if requested_record_id is not null and coalesce(requested_expected_revision, 0) < 1 then raise exception 'Existing drafts require an expected revision.'; end if;
  if btrim(coalesce(requested_athlete_name, '')) = '' or btrim(coalesce(requested_club_name, '')) = ''
     or btrim(coalesce(requested_competition_name, '')) = '' then raise exception 'Record snapshots are required.'; end if;
  select * into strict event_row from public.event_definitions where id = requested_event_definition_id and course = 'long_course';
  select name into strict category_name from public.age_categories where id = requested_age_category_id;

  if requested_record_id is null then
    insert into public.records as stored (
      performance_id, athlete_id, athlete_name_snapshot, athlete_photo_asset_id, club_name_snapshot,
      event_definition_id, event_name_snapshot, age_category_id, age_category_name_snapshot,
      competitive_sex, time_ms, achieved_year, competition_name_snapshot, course,
      scope_type, scope_organization_id, publication_status
    ) values (
      null, requested_athlete_id, btrim(requested_athlete_name), requested_photo_asset_id, btrim(requested_club_name),
      event_row.id, event_row.name, requested_age_category_id, category_name,
      requested_competitive_sex, requested_time_ms, requested_achieved_year,
      btrim(requested_competition_name), 'long_course', 'state', null, 'draft'
    ) returning stored.id, stored.revision into record_id, revision;
  else
    update public.records as stored set
      athlete_id = requested_athlete_id, athlete_name_snapshot = btrim(requested_athlete_name),
      athlete_photo_asset_id = requested_photo_asset_id, club_name_snapshot = btrim(requested_club_name),
      event_definition_id = event_row.id, event_name_snapshot = event_row.name,
      age_category_id = requested_age_category_id, age_category_name_snapshot = category_name,
      competitive_sex = requested_competitive_sex, time_ms = requested_time_ms,
      achieved_year = requested_achieved_year, competition_name_snapshot = btrim(requested_competition_name),
      revision = stored.revision + 1, updated_at = now()
    where stored.id = requested_record_id and stored.scope_type = 'state' and stored.publication_status = 'draft'
      and stored.revision = requested_expected_revision
    returning stored.id, stored.revision into record_id, revision;
    if not found then raise exception 'State record revision conflict.' using errcode = '40001'; end if;
  end if;
  return next;
end;
$$;

create or replace function public.set_state_record_published(
  requested_record_id uuid, requested_expected_revision bigint, requested_published boolean
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  current_status text;
  next_revision bigint;
  prior_reason text := current_setting('request.admin_audit_reason', true);
begin
  if not private.is_content_editor() then raise exception 'State records require an active editor.' using errcode = '42501'; end if;
  if requested_published is null then raise exception 'A publication target is required.' using errcode = '23514'; end if;
  if coalesce(requested_expected_revision, 0) < 1 then raise exception 'A positive expected revision is required.' using errcode = '23514'; end if;
  select publication_status into current_status from public.records
  where id = requested_record_id and scope_type = 'state' and revision = requested_expected_revision for update;
  if not found then raise exception 'State record revision conflict.' using errcode = '40001'; end if;
  if current_status = (case when requested_published then 'published' else 'draft' end) then
    raise exception 'State record is already %.', current_status using errcode = '23514';
  end if;
  perform set_config('request.admin_audit_reason', case when requested_published then 'publish-state-record' else 'unpublish-state-record' end, true);
  update public.records as stored set
    publication_status = case when requested_published then 'published' else 'draft' end,
    published_at = case when requested_published then now() else null end,
    revision = stored.revision + 1, updated_at = now()
  where stored.id = requested_record_id
  returning stored.revision into next_revision;
  perform set_config('request.admin_audit_reason', coalesce(prior_reason, ''), true);
  return next_revision;
end;
$$;

create or replace function public.get_published_state_records()
returns table (
  record_id uuid, athlete_id uuid, athlete_name text, athlete_photo_public_id text,
  athlete_photo_alt text, club_name text,
  event_name text, category_name text, competitive_sex text, time_ms bigint,
  achieved_year smallint, competition_name text, course text
) language sql stable security invoker set search_path = '' as $$
  select record.id, record.athlete_id, record.athlete_name_snapshot,
    photo.public_id, photo.alt_text,
    record.club_name_snapshot, record.event_name_snapshot, record.age_category_name_snapshot,
    record.competitive_sex, record.time_ms, record.achieved_year,
    record.competition_name_snapshot, record.course
  from public.records record
  left join public.media_assets photo on photo.id = record.athlete_photo_asset_id
  where record.scope_type = 'state' and record.publication_status = 'published'
  order by record.event_name_snapshot, record.age_category_name_snapshot, record.competitive_sex;
$$;

revoke all on function public.save_state_record_draft(uuid,bigint,uuid,text,uuid,text,uuid,uuid,text,bigint,smallint,text) from public;
revoke all on function public.set_state_record_published(uuid,bigint,boolean) from public;
revoke all on function public.get_published_state_records() from public;
grant execute on function public.save_state_record_draft(uuid,bigint,uuid,text,uuid,text,uuid,uuid,text,bigint,smallint,text) to authenticated;
grant execute on function public.set_state_record_published(uuid,bigint,boolean) to authenticated;
grant execute on function public.get_published_state_records() to anon, authenticated;
