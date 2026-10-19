-- Extend public result visibility to every final result state while retaining
-- athlete publication, consent, competition publication, and RLS enforcement.
drop policy if exists "Official performances with results consent are readable" on public.performances;
create policy "Final performances with results consent are readable"
  on public.performances for select using (
    status in ('official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time')
    and exists (
      select 1
      from public.entries entry
      join public.athletes athlete on athlete.id = entry.athlete_id
      where entry.id = entry_id
        and athlete.publication_status = 'published'
        and private.has_active_consent(athlete.id, 'results_publication')
    )
    and (
      status = 'official'
      or exists (
        select 1
        from public.entries entry
        join public.competition_events competition_event
          on competition_event.id = entry.competition_event_id
        join public.competitions competition
          on competition.id = competition_event.competition_id
        where entry.id = entry_id
          and competition.published_at is not null
          and competition.status in ('scheduled', 'in_progress', 'completed', 'postponed')
          and competition_event.status <> 'cancelled'
      )
    )
  );

create function public.get_public_competition_result_rows(requested_competition_id uuid default null)
returns table (
  result_id uuid,
  competition_id uuid,
  competition_name text,
  competition_starts_on date,
  competition_ends_on date,
  competition_event_id uuid,
  event_definition_id uuid,
  event_definition_code text,
  event_name text,
  event_category_id uuid,
  event_category_name text,
  competitive_sex text,
  round text,
  sequence_number integer,
  scheduled_at timestamptz,
  athlete_id uuid,
  athlete_name text,
  athlete_photo_public_id text,
  athlete_photo_external_url text,
  athlete_photo_alt text,
  club_id uuid,
  club_name text,
  club_logo_public_id text,
  club_logo_external_url text,
  club_logo_alt text,
  lane smallint,
  time_ms bigint,
  place integer,
  status public.result_status
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    performance.id,
    competition.id,
    competition.name,
    competition.starts_on,
    competition.ends_on,
    competition_event.id,
    event_definition.id,
    event_definition.code,
    event_definition.name,
    event_category.id,
    event_category.name,
    competition_event.competitive_sex,
    competition_event.round,
    competition_event.sequence_number,
    competition_event.scheduled_at,
    athlete.id,
    athlete.display_name,
    case when athlete_photo.is_public then athlete_photo.public_id end,
    case when athlete_photo.is_public then athlete_photo.external_url end,
    case when athlete_photo.is_public then athlete_photo.alt_text end,
    club.id,
    coalesce(club.short_name, club.name),
    case when club_logo.is_public then club_logo.public_id end,
    case when club_logo.is_public then club_logo.external_url end,
    case when club_logo.is_public then club_logo.alt_text end,
    entry.lane,
    performance.time_ms,
    performance.place,
    performance.status
  from public.performances performance
  join public.entries entry on entry.id = performance.entry_id
  join public.competition_events competition_event on competition_event.id = entry.competition_event_id
  join public.competitions competition on competition.id = competition_event.competition_id
  join public.event_definitions event_definition on event_definition.id = competition_event.event_definition_id
  left join public.age_categories event_category on event_category.id = competition_event.category_id
  join public.athletes athlete on athlete.id = entry.athlete_id
  left join public.media_assets athlete_photo on athlete_photo.id = athlete.photo_asset_id
  left join public.organizations club on club.id = entry.represented_organization_id
  left join public.media_assets club_logo on club_logo.id = club.logo_asset_id
  where performance.status in ('official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time')
    and competition.published_at is not null
    and competition.status in ('scheduled', 'in_progress', 'completed', 'postponed')
    and competition_event.status <> 'cancelled'
    and (requested_competition_id is null or competition.id = requested_competition_id)
    and private.is_publishable_athlete(athlete.id)
    and private.has_active_consent(athlete.id, 'results_publication')
  order by
    competition.starts_on desc,
    competition.name,
    competition_event.sequence_number,
    performance.place nulls last,
    athlete.display_name,
    performance.id;
$$;

revoke all on function public.get_public_competition_result_rows(uuid) from public;
grant execute on function public.get_public_competition_result_rows(uuid) to anon, authenticated;

comment on function public.get_public_competition_result_rows(uuid) is
'Returns final published competition result rows and public event metadata. '
'Provisional results, private athlete data, and non-public media are excluded.';
