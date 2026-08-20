create or replace function public.get_published_result_rows(requested_competition_id uuid default null)
returns table (
  result_id uuid,
  competition_id uuid,
  competition_name text,
  competition_event_id uuid,
  event_name text,
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
    competition_event.id,
    event_definition.name,
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
    performance.time_ms,
    performance.place,
    performance.status
  from public.performances performance
  join public.entries entry on entry.id = performance.entry_id
  join public.competition_events competition_event on competition_event.id = entry.competition_event_id
  join public.competitions competition on competition.id = competition_event.competition_id
  join public.event_definitions event_definition on event_definition.id = competition_event.event_definition_id
  join public.athletes athlete on athlete.id = entry.athlete_id
  left join public.media_assets athlete_photo on athlete_photo.id = athlete.photo_asset_id
  left join public.organizations club on club.id = entry.represented_organization_id
  left join public.media_assets club_logo on club_logo.id = club.logo_asset_id
  where performance.status = 'official'
    and competition.published_at is not null
    and competition.status <> 'draft'
    and competition_event.status <> 'cancelled'
    and (requested_competition_id is null or competition.id = requested_competition_id)
    and athlete.publication_status = 'published'
    and private.has_active_consent(athlete.id, 'results_publication')
  order by competition.starts_on desc, competition.name, competition_event.sequence_number, performance.place nulls last, athlete.display_name;
$$;

revoke all on function public.get_published_result_rows(uuid) from public;
grant execute on function public.get_published_result_rows(uuid) to anon, authenticated;
