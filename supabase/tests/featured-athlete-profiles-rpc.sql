begin;

do $$
declare
  visible_athlete_id uuid; hidden_athlete_id uuid; future_athlete_id uuid; expired_athlete_id uuid; editor_id uuid; asset_id uuid;
  approved_source_id uuid; pending_source_id uuid; calendar_id uuid; event_definition_id uuid;
  sport_id uuid; competition_id uuid; competition_event_id uuid; entry_id uuid; paginated_athlete_id uuid; achievement_group_id uuid; payload jsonb;
  page_one_keys text[]; page_two_keys text[]; homepage_keys text[];
  page_one_orders integer[]; page_two_orders integer[]; homepage_orders integer[]; blocked boolean; i integer;
begin
  if to_regprocedure('public.get_featured_athlete_profiles()') is not null
    or to_regprocedure('public.get_featured_athlete_profiles(integer,integer)') is null
    or to_regprocedure('public.get_homepage_featured_athlete_profiles()') is null
  then raise exception 'The featured profile RPC signatures are incorrect.'; end if;
  if pg_get_function_result('public.get_featured_athlete_profiles(integer,integer)'::regprocedure)
    not like '%display_order integer%'
    or pg_get_function_result('public.get_homepage_featured_athlete_profiles()'::regprocedure)
      <> pg_get_function_result('public.get_featured_athlete_profiles(integer,integer)'::regprocedure)
  then raise exception 'The featured profile order is not integer.'; end if;
  if not has_function_privilege('anon', 'public.get_featured_athlete_profiles(integer,integer)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_featured_athlete_profiles(integer,integer)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.get_homepage_featured_athlete_profiles()', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.get_homepage_featured_athlete_profiles()', 'EXECUTE')
    or has_function_privilege('anon', 'private.get_featured_athlete_profiles(integer,integer)', 'EXECUTE')
    or has_function_privilege('authenticated', 'private.get_featured_athlete_profiles(integer,integer)', 'EXECUTE')
    or exists (
      select 1 from pg_proc
      where oid in (
        'public.get_featured_athlete_profiles(integer,integer)'::regprocedure,
        'public.get_homepage_featured_athlete_profiles()'::regprocedure
      ) and (not prosecdef or not proconfig @> array['search_path=""'])
  ) then raise exception 'The anonymous security-definer RPC contract is missing.'; end if;
  select id into strict editor_id from public.profiles where role in ('administrator', 'editor') and is_active
  order by role = 'administrator' desc, id limit 1;
  insert into public.athletes (display_name) values ('Visible featured RPC athlete') returning id into visible_athlete_id;
  insert into public.athletes (display_name) values ('Hidden featured RPC athlete') returning id into hidden_athlete_id;
  insert into public.athletes (display_name) values ('Future featured RPC athlete') returning id into future_athlete_id;
  insert into public.athletes (display_name) values ('Expired featured RPC athlete') returning id into expired_athlete_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at) values
    (visible_athlete_id, 'public_profile', 'granted', now()), (visible_athlete_id, 'results_publication', 'granted', now()),
    (hidden_athlete_id, 'public_profile', 'granted', now()), (hidden_athlete_id, 'results_publication', 'granted', now()),
    (future_athlete_id, 'public_profile', 'granted', now()), (future_athlete_id, 'results_publication', 'granted', now()),
    (expired_athlete_id, 'public_profile', 'granted', now()), (expired_athlete_id, 'results_publication', 'granted', now());
  update public.athletes set publication_status = 'published'
  where id in (visible_athlete_id, hidden_athlete_id, future_athlete_id, expired_athlete_id);
  delete from public.featured_athletes;
  insert into public.featured_athletes (athlete_id, display_order, starts_at, ends_at) values
    (visible_athlete_id, 1, null, null), (hidden_athlete_id, 2, null, null),
    (future_athlete_id, 3, now() + interval '1 day', null), (expired_athlete_id, 4, now() - interval '2 days', now() - interval '1 day');
  update public.athletes set publication_status = 'draft' where id = hidden_athlete_id;
  insert into public.media_assets (provider, external_url, resource_type, is_public) values ('local', '/rpc-evidence.pdf', 'document', false) returning id into asset_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at) values ('manual', asset_id, repeat('d', 64), 'processed', now()) returning id into approved_source_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at) values ('manual', asset_id, repeat('e', 64), 'processed', now()) returning id into pending_source_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true); execute 'set local role authenticated';
  update public.source_documents set approval_status = 'approved' where id = approved_source_id;

  select calendar.id, definition.id, discipline.sport_id into strict calendar_id, event_definition_id, sport_id
  from public.competition_calendars calendar join public.disciplines discipline on discipline.id = calendar.discipline_id
  join public.event_definitions definition on definition.discipline_id = discipline.id
  where calendar.season_year = 2026 and discipline.code = 'swimming' and definition.is_active order by definition.code limit 1;
  select group_id into strict achievement_group_id
  from public.save_athlete_achievement_group_draft(
    null, visible_athlete_id, 'national_podium', 'Visible sourced podium', 'RPC national meet', 'RPC pool', current_date,
    jsonb_build_array(jsonb_build_object('event_definition_id', event_definition_id, 'podium_place', 2))
  );
  perform public.publish_athlete_achievement_group(achievement_group_id);
  perform public.save_athlete_achievement_group_draft(
    null, visible_athlete_id, 'international_participation', 'Private draft selection', 'RPC invitational', 'RPC pool', current_date,
    jsonb_build_array(jsonb_build_object('event_definition_id', event_definition_id, 'participation_outcome', 'top_8'))
  );
  execute 'reset role';
  insert into public.competitions (name, slug, sport_id, calendar_id, starts_on, status, published_at)
  values ('Visible RPC competition', 'visible-rpc-' || replace(gen_random_uuid()::text, '-', ''), sport_id, calendar_id, date '2026-08-10', 'completed', now()) returning id into competition_id;
  insert into public.competition_events (competition_id, event_definition_id, sequence_number, status) values (competition_id, event_definition_id, 1, 'completed') returning id into competition_event_id;
  insert into public.entries (competition_event_id, athlete_id, status) values (competition_event_id, visible_athlete_id, 'confirmed') returning id into entry_id;
  insert into public.performances (entry_id, time_ms, place, status, source_document_id, recorded_at) values (entry_id, 62340, 2, 'official', approved_source_id, now());
  insert into public.competition_events (competition_id, event_definition_id, sequence_number, status) values (competition_id, event_definition_id, 2, 'completed') returning id into competition_event_id;
  insert into public.entries (competition_event_id, athlete_id, status) values (competition_event_id, visible_athlete_id, 'confirmed') returning id into entry_id;
  insert into public.performances (entry_id, time_ms, place, status, source_document_id, recorded_at) values (entry_id, 63340, 3, 'official', pending_source_id, now());

  execute 'set local role anon';
  select to_jsonb(profile) into strict payload
  from public.get_featured_athlete_profiles() profile
  where profile.display_name = 'Visible featured RPC athlete';
  execute 'reset role';
  if payload->>'profile_key' !~ '^v1_[0-9a-f]{64}$' or payload->>'display_name' <> 'Visible featured RPC athlete'
  then raise exception 'The RPC did not enforce featured/public state and opaque identity.'; end if;
  if (select array_agg(key order by key) from jsonb_object_keys(payload) key) <> array[
    'achievements', 'category_name', 'club_name', 'club_short_name', 'display_name', 'display_order', 'events',
    'photo_alt_text', 'photo_external_url', 'photo_provider', 'photo_public_id', 'preferred_name', 'profile_key', 'results'
  ] then raise exception 'The public RPC allowlist changed.'; end if;
  if jsonb_array_length(payload->'results') <> 1 or payload::text like '%63340%' or payload #>> '{achievements,0,title}' <> 'Visible sourced podium' or payload::text like '%Private draft selection%'
  then raise exception 'The RPC exposed unpublished or unapproved competitive facts.'; end if;
  if payload::text like '%' || approved_source_id::text || '%' or payload::text ~ 'athlete_id|source_document|approved_by|sort_date'
    or payload::text like '%/rpc-evidence.pdf%' or payload::text ~ 'evidence|bucket|storage_path'
  then raise exception 'The RPC exposed internal identifiers or private fields.'; end if;

  for i in 1..7 loop
    insert into public.athletes (display_name)
    values ('Paginated featured RPC athlete ' || lpad(i::text, 2, '0')) returning id into paginated_athlete_id;
    insert into public.athlete_consents (athlete_id, consent_type, status, granted_at) values
      (paginated_athlete_id, 'public_profile', 'granted', now()),
      (paginated_athlete_id, 'results_publication', 'granted', now());
    update public.athletes set publication_status = 'published' where id = paginated_athlete_id;
    insert into public.featured_athletes (athlete_id, display_order) values (paginated_athlete_id, i + 4);
  end loop;

  execute 'set local role anon';
  select array_agg(profile_key), array_agg(display_order) into strict page_one_keys, page_one_orders
  from public.get_featured_athlete_profiles(4, 0);
  select array_agg(profile_key), array_agg(display_order) into strict page_two_keys, page_two_orders
  from public.get_featured_athlete_profiles(4, 4);
  select array_agg(profile_key), array_agg(display_order) into strict homepage_keys, homepage_orders
  from public.get_homepage_featured_athlete_profiles();
  execute 'reset role';
  if cardinality(page_one_keys) is distinct from 4 or cardinality(page_two_keys) is distinct from 4
    or page_one_keys && page_two_keys
    or homepage_keys is distinct from page_one_keys || page_two_keys[1:2]
    or page_one_orders is distinct from array[1, 5, 6, 7]
    or page_two_orders is distinct from array[8, 9, 10, 11]
    or homepage_orders is distinct from array[1, 5, 6, 7, 8, 9]
  then raise exception 'Featured profile pagination duplicated, skipped, or reordered rows.'; end if;
  if cardinality(homepage_keys) is null or cardinality(homepage_keys) > 6
  then raise exception 'The homepage RPC returned more than six profiles.'; end if;

  blocked := false;
  begin
    perform public.get_featured_athlete_profiles(0, 0);
  exception when invalid_parameter_value then
    if sqlerrm <> 'Featured athlete profile limit must be between 1 and 100.' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'The featured profile RPC accepted a zero limit.'; end if;
  blocked := false;
  begin
    perform public.get_featured_athlete_profiles(101, 0);
  exception when invalid_parameter_value then
    if sqlerrm <> 'Featured athlete profile limit must be between 1 and 100.' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'The featured profile RPC accepted a limit above 100.'; end if;
  blocked := false;
  begin
    perform public.get_featured_athlete_profiles(1, -1);
  exception when invalid_parameter_value then
    if sqlerrm <> 'Featured athlete profile offset must be non-negative.' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'The featured profile RPC accepted a negative offset.'; end if;

  update public.competitions set status = 'archived' where id = competition_id;
  execute 'set local role anon';
  select to_jsonb(profile) into strict payload
  from public.get_featured_athlete_profiles() profile
  where profile.display_name = 'Visible featured RPC athlete';
  execute 'reset role';
  if jsonb_array_length(payload->'results') <> 0 then raise exception 'The RPC exposed a competition outside the public state allowlist.'; end if;
  update public.athlete_consents set status = 'withdrawn', granted_at = null where athlete_consents.athlete_id = visible_athlete_id and consent_type = 'results_publication';
  execute 'set local role anon';
  if exists (select 1 from public.get_featured_athlete_profiles() where display_name = 'Visible featured RPC athlete')
  then raise exception 'The RPC ignored consent withdrawal.'; end if;
  execute 'reset role';
end;
$$;

rollback;
