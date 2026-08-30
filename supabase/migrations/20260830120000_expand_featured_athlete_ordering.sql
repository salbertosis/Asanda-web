alter table public.featured_athletes
  drop constraint featured_athletes_display_order_check,
  drop constraint featured_athletes_display_order_key;

alter table public.featured_athletes
  alter column display_order type integer,
  add constraint featured_athletes_display_order_positive check (display_order > 0),
  add constraint featured_athletes_display_order_key unique (display_order)
    deferrable initially deferred;

create or replace function private.is_featured_eligible_athlete(requested_athlete_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.athletes athlete
    where athlete.id = requested_athlete_id
      and athlete.publication_status = 'published'
      and private.has_active_consent(athlete.id, 'public_profile')
      and private.has_active_consent(athlete.id, 'results_publication')
      and (
        athlete.photo_asset_id is null
        or private.has_active_consent(athlete.id, 'photo')
      )
  );
$$;

revoke all on function private.is_featured_eligible_athlete(uuid) from public, anon, authenticated;
grant execute on function private.is_featured_eligible_athlete(uuid) to anon, authenticated;

create or replace function private.enforce_featured_athlete()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_featured_eligible_athlete(new.athlete_id) then
    raise exception 'Featured athletes must be published with active profile, results, and applicable photo consent.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_featured_athlete() from public, anon, authenticated;

drop policy if exists "Current featured athletes are readable"
on public.featured_athletes;
create policy "Current featured athletes are readable"
  on public.featured_athletes for select using (
    (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now())
    and private.is_featured_eligible_athlete(athlete_id)
  );

create or replace function public.append_featured_athlete(
  requested_athlete_id uuid,
  requested_starts_at timestamptz default null,
  requested_ends_at timestamptz default null
)
returns public.featured_athletes
language plpgsql security definer set search_path = ''
as $$
declare
  stored public.featured_athletes;
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may append featured athletes.' using errcode = '42501';
  end if;
  if requested_ends_at is not null and requested_starts_at is not null
    and requested_ends_at <= requested_starts_at
  then
    raise exception 'Featured athlete end time must be later than its start time.' using errcode = '22023';
  end if;
  if not private.is_featured_eligible_athlete(requested_athlete_id) then
    raise exception 'Featured athletes must be published with active profile, results, and applicable photo consent.' using errcode = '23514';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(685627461744428092::bigint);
  insert into public.featured_athletes (athlete_id, display_order, starts_at, ends_at)
  select requested_athlete_id, coalesce(max(display_order), 0) + 1,
    requested_starts_at, requested_ends_at
  from public.featured_athletes
  returning * into stored;
  return stored;
end;
$$;

create or replace function public.move_featured_athlete(
  requested_featured_id uuid,
  requested_direction text
)
returns public.featured_athletes
language plpgsql security definer set search_path = ''
as $$
declare
  stored public.featured_athletes;
  neighbor public.featured_athletes;
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may move featured athletes.' using errcode = '42501';
  end if;
  if requested_direction is null or requested_direction not in ('up', 'down') then
    raise exception 'Featured athlete direction must be up or down.' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(685627461744428092::bigint);
  select * into stored from public.featured_athletes
  where id = requested_featured_id;
  if not found then
    raise exception 'Featured athlete was not found.' using errcode = 'P0002';
  end if;

  if requested_direction = 'up' then
    select * into neighbor from public.featured_athletes
    where display_order < stored.display_order
    order by display_order desc limit 1;
  else
    select * into neighbor from public.featured_athletes
    where display_order > stored.display_order
    order by display_order limit 1;
  end if;
  if not found then return stored; end if;

  set constraints public.featured_athletes_display_order_key deferred;
  update public.featured_athletes set display_order = stored.display_order
  where id = neighbor.id;
  update public.featured_athletes set display_order = neighbor.display_order
  where id = stored.id returning * into stored;
  return stored;
end;
$$;

create or replace function public.list_featured_athlete_candidates()
returns table (id uuid, display_name text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may list featured athlete candidates.' using errcode = '42501';
  end if;
  return query
  select athlete.id, athlete.display_name
  from public.athletes athlete
  where private.is_featured_eligible_athlete(athlete.id)
    and not exists (
      select 1 from public.featured_athletes featured
      where featured.athlete_id = athlete.id
    )
  order by athlete.display_name, athlete.id;
end;
$$;

drop function public.get_featured_athlete_profiles();
create function public.get_featured_athlete_profiles()
returns table (
  profile_key text, display_order integer, display_name text, preferred_name text,
  photo_provider text, photo_public_id text, photo_external_url text,
  photo_alt_text text, club_name text, club_short_name text, category_name text,
  events jsonb, results jsonb, achievements jsonb
)
language sql stable security definer set search_path = ''
as $$
  with visible_featured as (
    select featured.athlete_id, featured.display_order
    from public.featured_athletes featured
    where (featured.starts_at is null or featured.starts_at <= now())
      and (featured.ends_at is null or featured.ends_at > now())
      and private.is_featured_eligible_athlete(featured.athlete_id)
  ),
  published_result_rows as (
    select entry.athlete_id, definition.name as event_name, performance.time_ms,
      performance.place, competition.name as competition_name,
      competition.starts_on as competition_date
    from public.entries entry
    join public.performances performance on performance.entry_id = entry.id
    join public.source_documents document on document.id = performance.source_document_id
      and document.status = 'processed' and document.approval_status = 'approved'
    join public.competition_events competition_event on competition_event.id = entry.competition_event_id
    join public.competitions competition on competition.id = competition_event.competition_id
    join public.event_definitions definition on definition.id = competition_event.event_definition_id
    where performance.status = 'official'
      and competition.published_at is not null
      and competition.status in ('scheduled', 'in_progress', 'completed', 'postponed', 'cancelled')
      and competition_event.status <> 'cancelled'
  )
  select
    'v1_' || encode(extensions.digest('asanda:featured-athlete:v1:' || athlete.id::text, 'sha256'), 'hex'),
    featured.display_order, athlete.display_name, athlete.preferred_name,
    photo.provider, photo.public_id, photo.external_url, photo.alt_text,
    club.name, club.short_name, category.name,
    coalesce((
      select jsonb_agg(event_row.event_name order by event_row.event_name)
      from (select distinct result.event_name from published_result_rows result
        where result.athlete_id = athlete.id) event_row
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(result_row) order by result_row.competition_date desc, result_row.event_name)
      from (select result.event_name, result.time_ms, result.place,
          result.competition_name, result.competition_date
        from published_result_rows result where result.athlete_id = athlete.id
        order by result.competition_date desc, result.event_name limit 8) result_row
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(achievement_row) - 'sort_date'
        order by achievement_row.sort_date desc, achievement_row.title)
      from (select achievement.achievement_type, achievement.title,
          achievement.competition_name, achievement.medal, achievement.place,
          achievement.achieved_on, achievement.valid_from, achievement.valid_to,
          coalesce(achievement.achieved_on, achievement.valid_from) as sort_date
        from public.athlete_achievements achievement
        join public.source_documents document on document.id = achievement.source_document_id
        where achievement.athlete_id = athlete.id
          and achievement.publication_status = 'published'
          and achievement.published_at <= now()
          and document.status = 'processed'
          and document.approval_status = 'approved') achievement_row
    ), '[]'::jsonb)
  from visible_featured featured
  join public.athletes athlete on athlete.id = featured.athlete_id
  left join public.media_assets photo on photo.id = athlete.photo_asset_id and photo.is_public
  left join lateral (
    select organization.name, organization.short_name
    from public.athlete_memberships membership
    join public.organizations organization on organization.id = membership.organization_id
    where membership.athlete_id = athlete.id
      and membership.status = 'active'
      and membership.valid_from <= current_date
      and (membership.valid_to is null or membership.valid_to >= current_date)
      and organization.publication_status = 'published'
    order by organization.id limit 1
  ) club on true
  left join lateral (
    select age_category.name
    from public.athlete_category_assignments assignment
    join public.age_categories age_category on age_category.id = assignment.category_id
    where assignment.athlete_id = athlete.id
      and assignment.valid_from <= current_date
      and (assignment.valid_to is null or assignment.valid_to >= current_date)
      and age_category.is_active
    order by assignment.valid_from desc, age_category.sort_order desc limit 1
  ) category on true
  order by featured.display_order;
$$;

revoke all on function public.append_featured_athlete(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.move_featured_athlete(uuid, text) from public, anon, authenticated;
revoke all on function public.list_featured_athlete_candidates() from public, anon, authenticated;
revoke all on function public.get_featured_athlete_profiles() from public, anon, authenticated;
grant execute on function public.append_featured_athlete(uuid, timestamptz, timestamptz)
to authenticated;
grant execute on function public.move_featured_athlete(uuid, text) to authenticated;
grant execute on function public.list_featured_athlete_candidates() to authenticated;
grant execute on function public.get_featured_athlete_profiles() to anon, authenticated;

comment on function public.get_featured_athlete_profiles() is
'Returns only allowlisted public competitive profile fields. Evidence '
'documents and internal identifiers are intentionally excluded.';
