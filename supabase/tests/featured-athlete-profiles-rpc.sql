begin;

do $$
declare
  athlete_id uuid; hidden_athlete_id uuid; future_athlete_id uuid; expired_athlete_id uuid; editor_id uuid; asset_id uuid;
  approved_source_id uuid; pending_source_id uuid; calendar_id uuid; event_definition_id uuid;
  sport_id uuid; competition_id uuid; competition_event_id uuid; entry_id uuid; payload jsonb;
begin
  if not has_function_privilege('anon', 'public.get_featured_athlete_profiles()', 'EXECUTE') or not exists (
    select 1 from pg_proc where oid = 'public.get_featured_athlete_profiles()'::regprocedure
      and prosecdef and proconfig @> array['search_path=""']
  ) then raise exception 'The anonymous security-definer RPC contract is missing.'; end if;
  select id into strict editor_id from public.profiles where role in ('administrator', 'editor') and is_active
  order by role = 'administrator' desc, id limit 1;
  insert into public.athletes (display_name, publication_status) values ('Visible featured RPC athlete', 'published') returning id into athlete_id;
  insert into public.athletes (display_name) values ('Hidden featured RPC athlete') returning id into hidden_athlete_id;
  insert into public.athletes (display_name, publication_status) values ('Future featured RPC athlete', 'published') returning id into future_athlete_id;
  insert into public.athletes (display_name, publication_status) values ('Expired featured RPC athlete', 'published') returning id into expired_athlete_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at) values
    (athlete_id, 'public_profile', 'granted', now()), (athlete_id, 'results_publication', 'granted', now()),
    (hidden_athlete_id, 'public_profile', 'granted', now()), (hidden_athlete_id, 'results_publication', 'granted', now()),
    (future_athlete_id, 'public_profile', 'granted', now()), (future_athlete_id, 'results_publication', 'granted', now()),
    (expired_athlete_id, 'public_profile', 'granted', now()), (expired_athlete_id, 'results_publication', 'granted', now());
  delete from public.featured_athletes;
  insert into public.featured_athletes (athlete_id, display_order, starts_at, ends_at) values
    (athlete_id, 1, null, null), (hidden_athlete_id, 2, null, null),
    (future_athlete_id, 3, now() + interval '1 day', null), (expired_athlete_id, 4, now() - interval '2 days', now() - interval '1 day');
  insert into public.media_assets (provider, external_url, resource_type, is_public) values ('local', '/rpc-evidence.pdf', 'document', false) returning id into asset_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at) values ('manual', asset_id, repeat('d', 64), 'processed', now()) returning id into approved_source_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at) values ('manual', asset_id, repeat('e', 64), 'processed', now()) returning id into pending_source_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true); execute 'set local role authenticated';
  update public.source_documents set approval_status = 'approved' where id = approved_source_id;
  insert into public.athlete_achievements (athlete_id, source_document_id, achievement_type, title, competition_name, place, achieved_on, publication_status, published_at)
  values (athlete_id, approved_source_id, 'national_podium', 'Visible sourced podium', 'RPC national meet', 2, current_date, 'published', now());
  insert into public.athlete_achievements (athlete_id, source_document_id, achievement_type, title, valid_from)
  values (athlete_id, pending_source_id, 'national_team', 'Private draft selection', current_date); execute 'reset role';

  select calendar.id, definition.id, discipline.sport_id into strict calendar_id, event_definition_id, sport_id
  from public.competition_calendars calendar join public.disciplines discipline on discipline.id = calendar.discipline_id
  join public.event_definitions definition on definition.discipline_id = discipline.id
  where calendar.season_year = 2026 and discipline.code = 'swimming' and definition.is_active order by definition.code limit 1;
  insert into public.competitions (name, slug, sport_id, calendar_id, starts_on, status, published_at)
  values ('Visible RPC competition', 'visible-rpc-' || replace(gen_random_uuid()::text, '-', ''), sport_id, calendar_id, date '2026-08-10', 'completed', now()) returning id into competition_id;
  insert into public.competition_events (competition_id, event_definition_id, sequence_number, status) values (competition_id, event_definition_id, 1, 'completed') returning id into competition_event_id;
  insert into public.entries (competition_event_id, athlete_id, status) values (competition_event_id, athlete_id, 'confirmed') returning id into entry_id;
  insert into public.performances (entry_id, time_ms, place, status, source_document_id, recorded_at) values (entry_id, 62340, 2, 'official', approved_source_id, now());
  insert into public.competition_events (competition_id, event_definition_id, sequence_number, status) values (competition_id, event_definition_id, 2, 'completed') returning id into competition_event_id;
  insert into public.entries (competition_event_id, athlete_id, status) values (competition_event_id, athlete_id, 'confirmed') returning id into entry_id;
  insert into public.performances (entry_id, time_ms, place, status, source_document_id, recorded_at) values (entry_id, 63340, 3, 'official', pending_source_id, now());

  execute 'set local role anon'; select to_jsonb(profile) into strict payload from public.get_featured_athlete_profiles() profile; execute 'reset role';
  if payload->>'profile_key' !~ '^v1_[0-9a-f]{64}$' or payload->>'display_name' <> 'Visible featured RPC athlete'
  then raise exception 'The RPC did not enforce featured/public state and opaque identity.'; end if;
  if (select array_agg(key order by key) from jsonb_object_keys(payload) key) <> array[
    'achievements', 'category_name', 'club_name', 'club_short_name', 'display_name', 'display_order', 'events',
    'photo_alt_text', 'photo_external_url', 'photo_provider', 'photo_public_id', 'preferred_name', 'profile_key', 'results'
  ] then raise exception 'The public RPC allowlist changed.'; end if;
  if jsonb_array_length(payload->'results') <> 1 or payload::text like '%63340%' or payload #>> '{achievements,0,title}' <> 'Visible sourced podium' or payload::text like '%Private draft selection%'
  then raise exception 'The RPC exposed unpublished or unapproved competitive facts.'; end if;
  if payload::text like '%' || approved_source_id::text || '%' or payload::text ~ 'athlete_id|source_document|approved_by|sort_date'
  then raise exception 'The RPC exposed internal identifiers or private fields.'; end if;

  update public.competitions set status = 'archived' where id = competition_id;
  execute 'set local role anon'; select to_jsonb(profile) into strict payload from public.get_featured_athlete_profiles() profile; execute 'reset role';
  if jsonb_array_length(payload->'results') <> 0 then raise exception 'The RPC exposed a competition outside the public state allowlist.'; end if;
  update public.athlete_consents set status = 'withdrawn', granted_at = null where athlete_consents.athlete_id = athlete_id and consent_type = 'results_publication';
  execute 'set local role anon';
  if exists (select 1 from public.get_featured_athlete_profiles()) then raise exception 'The RPC ignored consent withdrawal.'; end if;
  execute 'reset role';
end;
$$;

rollback;
