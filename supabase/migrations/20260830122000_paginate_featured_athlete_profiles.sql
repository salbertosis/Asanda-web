drop function public.get_featured_athlete_profiles();

create function private.get_featured_athlete_profiles(
  requested_limit integer,
  requested_offset integer
)
returns table (
  profile_key text, display_order integer, display_name text, preferred_name text,
  photo_provider text, photo_public_id text, photo_external_url text,
  photo_alt_text text, club_name text, club_short_name text, category_name text,
  events jsonb, results jsonb, achievements jsonb
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if requested_limit is null or requested_limit < 1 or requested_limit > 100 then
    raise exception 'Featured athlete profile limit must be between 1 and 100.'
      using errcode = '22023';
  end if;
  if requested_offset is null or requested_offset < 0 then
    raise exception 'Featured athlete profile offset must be non-negative.'
      using errcode = '22023';
  end if;

  return query
  with visible_featured as (
    select featured.athlete_id, featured.display_order
    from public.featured_athletes featured
    where (featured.starts_at is null or featured.starts_at <= now())
      and (featured.ends_at is null or featured.ends_at > now())
      and private.is_featured_eligible_athlete(featured.athlete_id)
    order by featured.display_order
    limit requested_limit offset requested_offset
  ),
  published_result_rows as (
    select entry.athlete_id, definition.name as event_name, performance.time_ms,
      performance.place, competition.name as competition_name,
      competition.starts_on as competition_date
    from visible_featured featured
    join public.entries entry on entry.athlete_id = featured.athlete_id
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
end;
$$;

create function public.get_featured_athlete_profiles(
  requested_limit integer default 100,
  requested_offset integer default 0
)
returns table (
  profile_key text, display_order integer, display_name text, preferred_name text,
  photo_provider text, photo_public_id text, photo_external_url text,
  photo_alt_text text, club_name text, club_short_name text, category_name text,
  events jsonb, results jsonb, achievements jsonb
)
language sql stable security definer set search_path = ''
as $$
  select * from private.get_featured_athlete_profiles(requested_limit, requested_offset);
$$;

create function public.get_homepage_featured_athlete_profiles()
returns table (
  profile_key text, display_order integer, display_name text, preferred_name text,
  photo_provider text, photo_public_id text, photo_external_url text,
  photo_alt_text text, club_name text, club_short_name text, category_name text,
  events jsonb, results jsonb, achievements jsonb
)
language sql stable security definer set search_path = ''
as $$
  select * from private.get_featured_athlete_profiles(6, 0);
$$;

revoke all on function private.get_featured_athlete_profiles(integer, integer) from public, anon, authenticated;
revoke all on function public.get_featured_athlete_profiles(integer, integer) from public, anon, authenticated;
revoke all on function public.get_homepage_featured_athlete_profiles() from public, anon, authenticated;
grant execute on function public.get_featured_athlete_profiles(integer, integer) to anon, authenticated;
grant execute on function public.get_homepage_featured_athlete_profiles() to anon, authenticated;

comment on function public.get_featured_athlete_profiles(integer, integer) is
'Returns one bounded page of allowlisted public competitive profile fields.';
comment on function public.get_homepage_featured_athlete_profiles() is
'Returns the first six allowlisted public competitive profiles.';
