begin;

-- RED contract for task 4.5. This file is intentionally not executed against a
-- linked, staging, or production database during task 4.4.
do $$
declare
  test_editor_id uuid;
  test_sport_id uuid;
  test_discipline_id uuid;
  test_event_definition_id uuid;
  test_competition_id uuid;
  test_event_id uuid;
  test_athlete_id uuid;
  no_consent_athlete_id uuid;
  test_club_id uuid;
  pending_mapping_id uuid;
  athlete_mapping_id uuid;
  club_mapping_id uuid;
  baseline_batch_id uuid;
  correction_batch_id uuid;
  test_row jsonb;
  correction_row jsonb;
  invalid_reference_row jsonb;
  valid_rows jsonb;
  correction_rows jsonb;
  mixed_rows jsonb;
  valid_mappings jsonb;
  current_revision bigint;
  revision_before bigint;
  source_count_before integer;
  batch_count_before integer;
  entry_count_before integer;
  performance_count_before integer;
  audit_count_before integer;
  visible integer;
  blocked boolean;
  failures text[] := array[]::text[];
  baseline_checksum text := repeat('a', 64);
  correction_checksum text := repeat('b', 64);
  duplicate_rows_checksum text := repeat('c', 64);
  atomicity_checksum text := repeat('d', 64);
  test_correction_reason text := 'Task 4.4 synthetic timing correction';
  test_correction_evidence text := 'Task 4.4 synthetic signed result sheet';
begin
  if to_regprocedure('public.commit_result_import(uuid,bigint,jsonb,text,jsonb,text)') is null then
    raise exception 'The transactional result import RPC surface is missing.';
  end if;
  if to_regprocedure('public.commit_result_import(uuid,bigint,jsonb,text,jsonb,text,text,text)') is null then
    raise exception 'The evidence-aware result import RPC surface is missing.';
  end if;
  if to_regprocedure('public.get_published_result_rows(uuid)') is null then
    raise exception 'The public photo/logo result query surface is missing.';
  end if;
  if has_function_privilege('anon', 'public.commit_result_import(uuid,bigint,jsonb,text,jsonb,text)', 'EXECUTE') then
    raise exception 'Anonymous clients can execute the result import RPC.';
  end if;
  if has_function_privilege('anon', 'public.commit_result_import(uuid,bigint,jsonb,text,jsonb,text,text,text)', 'EXECUTE') then
    raise exception 'Anonymous clients can execute the evidence-aware result import RPC.';
  end if;
  if not has_function_privilege('anon', 'public.get_published_result_rows(uuid)', 'EXECUTE') then
    raise exception 'Anonymous clients cannot execute the public result query.';
  end if;

  select id into strict test_editor_id
  from public.profiles
  where display_name = 'Editor Staging' and role = 'editor' and is_active;
  select id into strict test_sport_id from public.sports where code = 'aquatics';
  select id into strict test_discipline_id from public.disciplines where code = 'swimming';

  insert into public.organizations (organization_type, name, slug, publication_status)
  values (
    'club',
    'Task 4.4 Synthetic Club',
    'task-44-club-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'published'
  ) returning id into test_club_id;
  insert into public.event_definitions (
    discipline_id, code, name, distance_metres, stroke, course
  ) values (
    test_discipline_id,
    'task-44-event-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'Task 4.4 synthetic 50 freestyle',
    50,
    'freestyle',
    'long_course'
  ) returning id into test_event_definition_id;
  insert into public.competitions (
    name, slug, sport_id, starts_on, ends_on, status
  ) values (
    'Task 4.4 synthetic competition',
    'task-44-competition-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    test_sport_id,
    current_date,
    current_date,
    'scheduled'
  ) returning id into test_competition_id;
  insert into public.competition_events (
    competition_id, event_definition_id, competitive_sex, round, sequence_number, status
  ) values (
    test_competition_id,
    test_event_definition_id,
    'mixed',
    'final',
    1,
    'scheduled'
  ) returning id into test_event_id;
  insert into public.athletes (display_name) values ('Task 4.4 synthetic athlete') returning id into test_athlete_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (test_athlete_id, 'results_publication', 'granted', now());
  insert into public.athletes (display_name) values ('Task 4.4 no-consent athlete') returning id into no_consent_athlete_id;
  insert into public.source_mappings (
    provider, source_organization, external_code, mapping_kind, resolution_status
  ) values (
    'hy-tek',
    'TASK-44-SOURCE',
    'ATH-TASK-44-PENDING',
    'athlete',
    'pending'
  ) returning id into pending_mapping_id;
  insert into public.source_mappings (provider, source_organization, external_code, mapping_kind, athlete_id, resolution_status)
  values ('hy-tek', 'TASK-44-SOURCE', 'ATH-TASK-44', 'athlete', test_athlete_id, 'resolved') returning id into athlete_mapping_id;
  insert into public.source_mappings (provider, source_organization, external_code, mapping_kind, organization_id, resolution_status)
  values ('hy-tek', 'TASK-44-SOURCE', 'CLUB-TASK-44', 'organization', test_club_id, 'resolved') returning id into club_mapping_id;
  valid_mappings := jsonb_build_array(jsonb_build_object('id', athlete_mapping_id), jsonb_build_object('id', club_mapping_id));

  test_row := jsonb_build_object(
    'competition_event_id', test_event_id,
    'athlete_id', test_athlete_id,
    'represented_organization_id', test_club_id,
    'entry_status', 'confirmed',
    'seed_time_ms', 62340,
    'lane', 4,
    'time_ms', 62340,
    'place', 1,
    'status', 'official',
    'notes', 'Task 4.4 synthetic official result'
  );
  valid_rows := jsonb_build_array(test_row);

  select count(*) into audit_count_before
  from private.admin_audit_log
  where actor_id = test_editor_id and entity_table in ('entries', 'performances');

  perform set_config('request.jwt.claim.sub', test_editor_id::text, true);
  execute 'set local role authenticated';

  -- Unresolved mappings must fail before any source or result row is written.
  blocked := false;
  begin
    perform public.commit_result_import(
      test_competition_id, 1, valid_rows, repeat('f', 64),
      jsonb_build_array(jsonb_build_object('id', pending_mapping_id)), null
    );
    raise exception 'task-44-unresolved-mapping-not-rejected';
  exception when others then
    if position('task-44-unresolved-mapping-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'unresolved source mapping was accepted'); end if;

  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, 1, valid_rows, repeat('0', 64), '[]'::jsonb, null);
    raise exception 'task-44-empty-mappings-not-rejected';
  exception when others then blocked := sqlerrm like 'HY3 and CSV imports require resolved source mappings%'; end;
  if not blocked then failures := array_append(failures, 'HY3 import bypassed resolved mappings'); end if;

  blocked := false;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (no_consent_athlete_id, 'results_publication', 'granted', now());
  begin
    perform public.commit_result_import(test_competition_id, 1, jsonb_build_array(jsonb_set(test_row, '{athlete_id}', to_jsonb(no_consent_athlete_id), true)), repeat('1', 64), valid_mappings, null);
    raise exception 'task-44-mapping-target-not-rejected';
  exception when others then blocked := sqlerrm like 'Result row identities must match supplied resolved mappings%'; end;
  if not blocked then failures := array_append(failures, 'row identity bypassed supplied mapping targets'); end if;
  delete from public.athlete_consents where athlete_id = no_consent_athlete_id and consent_type = 'results_publication';

  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, 1, valid_rows, repeat('2', 64), '[]'::jsonb, null, 'manual', null);
    raise exception 'task-44-manual-audit-not-rejected';
  exception when others then blocked := sqlerrm like 'Manual result entry requires an audit reason and evidence%'; end;
  if not blocked then failures := array_append(failures, 'new manual result omitted reason or evidence'); end if;

  -- Malformed payloads and malformed checksums fail closed.
  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, 1, '{"rows":"not-an-array"}'::jsonb, baseline_checksum, valid_mappings, null);
    raise exception 'task-44-malformed-payload-not-rejected';
  exception when others then
    if position('task-44-malformed-payload-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'malformed sanitized payload was accepted'); end if;

  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, 1, valid_rows, repeat('g', 64), valid_mappings, null);
    raise exception 'task-44-malformed-checksum-not-rejected';
  exception when others then
    if position('task-44-malformed-checksum-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'malformed checksum was accepted'); end if;

  -- Missing event references and missing result-publication consent are rejected.
  invalid_reference_row := jsonb_set(test_row, '{competition_event_id}', to_jsonb(gen_random_uuid()), true);
  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, 1, jsonb_build_array(invalid_reference_row), repeat('h', 64), valid_mappings, null);
    raise exception 'task-44-missing-reference-not-rejected';
  exception when others then
    if position('task-44-missing-reference-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'missing competition reference was accepted'); end if;

  blocked := false;
  begin
    perform public.commit_result_import(
      test_competition_id,
      1,
      jsonb_build_array(jsonb_set(test_row, '{athlete_id}', to_jsonb(no_consent_athlete_id), true)),
      repeat('i', 64),
      valid_mappings,
      null
    );
    raise exception 'task-44-consent-not-rejected';
  exception when others then
    if position('task-44-consent-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'official result without consent was accepted'); end if;

  -- Duplicate result rows must not silently upsert the same athlete/event twice.
  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, 1, jsonb_build_array(test_row, test_row), duplicate_rows_checksum, valid_mappings, null);
    raise exception 'task-44-duplicate-row-not-rejected';
  exception when others then
    if position('task-44-duplicate-row-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'duplicate sanitized result row was accepted'); end if;

  select count(*) into visible from public.source_documents where competition_id = test_competition_id;
  if visible <> 0 then failures := array_append(failures, 'rejected imports left source-document residue'); end if;
  select count(*) into visible from public.import_batches batch
  join public.source_documents document on document.id = batch.source_document_id
  where document.competition_id = test_competition_id;
  if visible <> 0 then failures := array_append(failures, 'rejected imports left import-batch residue'); end if;

  -- A valid import is the baseline for duplicate-checksum and correction checks.
  select public.commit_result_import(
    test_competition_id, 1, valid_rows, baseline_checksum, valid_mappings, null
  ) into baseline_batch_id;
  select count(*) into visible
  from public.import_batches
  where id = baseline_batch_id and status = 'completed'
    and rows_received = 1 and rows_accepted = 1 and rows_rejected = 0;
  if visible <> 1 then failures := array_append(failures, 'valid import summary was not recorded'); end if;
  select count(*) into visible
  from public.source_documents
  where competition_id = test_competition_id and checksum = baseline_checksum
    and source_type = 'hy3' and status = 'processed';
  if visible <> 1 then failures := array_append(failures, 'valid source checksum was not recorded'); end if;

  -- Manual correction uses the same reviewed transaction and preserves its reason.
  select revision into current_revision from public.competitions where id = test_competition_id;
  correction_row := jsonb_set(test_row, '{time_ms}', to_jsonb(62400::bigint), true);
  correction_rows := jsonb_build_array(correction_row);
  select public.commit_result_import(
    test_competition_id,
    current_revision,
    correction_rows,
    correction_checksum,
    '[]'::jsonb,
    test_correction_reason,
    'manual',
    test_correction_evidence
  ) into correction_batch_id;
  select count(*) into visible
  from public.import_batches
  where id = correction_batch_id and correction_reason = test_correction_reason
    and correction_evidence = test_correction_evidence;
  if visible <> 1 then failures := array_append(failures, 'manual correction reason was not retained'); end if;
  select count(*) into visible
  from public.performances performance
  join public.entries entry on entry.id = performance.entry_id
  where entry.competition_event_id = test_event_id and entry.athlete_id = test_athlete_id
    and performance.time_ms = 62400 and performance.status = 'official';
  if visible <> 1 then failures := array_append(failures, 'manual correction did not replace the official performance'); end if;
  execute 'reset role';
  select count(*) into visible
  from private.admin_audit_log
  where actor_id = test_editor_id and entity_table in ('entries', 'performances')
    and reason = test_correction_reason and evidence = test_correction_evidence;
  if visible = 0 then failures := array_append(failures, 'result correction did not leave reason and evidence audit data'); end if;
  execute 'set local role authenticated';

  -- A checksum already committed for this competition is rejected at the current revision.
  select revision into current_revision from public.competitions where id = test_competition_id;
  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, current_revision, correction_rows, baseline_checksum, valid_mappings, null);
    raise exception 'task-44-duplicate-checksum-not-rejected';
  exception when others then
    if position('task-44-duplicate-checksum-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'duplicate source checksum was accepted'); end if;

  -- One invalid row must roll back every row in the same import transaction.
  select count(*) into source_count_before from public.source_documents where competition_id = test_competition_id;
  select count(*) into batch_count_before
  from public.import_batches batch
  join public.source_documents document on document.id = batch.source_document_id
  where document.competition_id = test_competition_id;
  select count(*) into entry_count_before
  from public.entries where competition_event_id = test_event_id;
  select count(*) into performance_count_before
  from public.performances performance
  join public.entries entry on entry.id = performance.entry_id
  where entry.competition_event_id = test_event_id;
  select revision into revision_before from public.competitions where id = test_competition_id;
  mixed_rows := jsonb_build_array(correction_row, invalid_reference_row);
  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, revision_before, mixed_rows, atomicity_checksum, valid_mappings, null);
    raise exception 'task-44-atomic-import-not-rejected';
  exception when others then
    if position('task-44-atomic-import-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'invalid mixed import was accepted'); end if;
  select count(*) into visible from public.source_documents where competition_id = test_competition_id;
  if visible <> source_count_before then failures := array_append(failures, 'atomic failure left source-document residue'); end if;
  select count(*) into visible
  from public.import_batches batch
  join public.source_documents document on document.id = batch.source_document_id
  where document.competition_id = test_competition_id;
  if visible <> batch_count_before then failures := array_append(failures, 'atomic failure left import-batch residue'); end if;
  select count(*) into visible from public.entries where competition_event_id = test_event_id;
  if visible <> entry_count_before then failures := array_append(failures, 'atomic failure changed entries'); end if;
  select count(*) into visible
  from public.performances performance
  join public.entries entry on entry.id = performance.entry_id
  where entry.competition_event_id = test_event_id;
  if visible <> performance_count_before then failures := array_append(failures, 'atomic failure changed performances'); end if;
  select revision into current_revision from public.competitions where id = test_competition_id;
  if current_revision <> revision_before then failures := array_append(failures, 'atomic failure changed competition revision'); end if;

  -- A stale preview revision is rejected after an intervening competition update.
  update public.competitions set description = 'Task 4.4 synthetic revision change' where id = test_competition_id;
  select revision into current_revision from public.competitions where id = test_competition_id;
  blocked := false;
  begin
    perform public.commit_result_import(test_competition_id, revision_before, correction_rows, atomicity_checksum, valid_mappings, null);
    raise exception 'task-44-revision-conflict-not-rejected';
  exception when others then
    if position('task-44-revision-conflict-not-rejected' in sqlerrm) > 0 then blocked := false; else blocked := true; end if;
  end;
  if not blocked then failures := array_append(failures, 'stale competition revision was accepted'); end if;
  if current_revision <= revision_before then failures := array_append(failures, 'competition revision did not advance'); end if;

  -- The future public projection must retain stable fallbacks when photo and logo media are absent.
  select count(*) into visible
  from public.entries entry
  join public.athletes athlete on athlete.id = entry.athlete_id
  left join public.media_assets athlete_photo on athlete_photo.id = athlete.photo_asset_id
  left join public.organizations club on club.id = entry.represented_organization_id
  left join public.media_assets club_logo on club_logo.id = club.logo_asset_id
  where entry.competition_event_id = test_event_id
    and coalesce(nullif(athlete_photo.public_id, ''), 'ASANDA') = 'ASANDA'
    and coalesce(nullif(club_logo.public_id, ''), 'ASANDA') = 'ASANDA';
  if visible <> 1 then failures := array_append(failures, 'missing media fallback projection was not stable'); end if;

  execute 'reset role';
  if coalesce(array_length(failures, 1), 0) > 0 then
    raise exception 'Task 4.4 result import contract failures: %', array_to_string(failures, '; ');
  end if;
end;
$$;

rollback;
