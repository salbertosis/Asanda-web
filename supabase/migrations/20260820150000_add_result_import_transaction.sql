alter table private.admin_audit_log
  add column if not exists reason text,
  add column if not exists evidence text;

alter table public.import_batches
  add column if not exists correction_evidence text;

alter table public.import_batches
  drop constraint if exists import_batches_correction_reason_nonempty,
  add constraint import_batches_correction_reason_nonempty
    check (correction_reason is null or (btrim(correction_reason) <> '' and char_length(correction_reason) <= 2000)),
  drop constraint if exists import_batches_correction_evidence_nonempty,
  add constraint import_batches_correction_evidence_nonempty
    check (correction_evidence is null or (btrim(correction_evidence) <> '' and char_length(correction_evidence) <= 4000));

drop index if exists public.source_documents_competition_checksum_idx;
create unique index source_documents_competition_checksum_lower_idx
  on public.source_documents (competition_id, lower(checksum))
  where competition_id is not null and checksum is not null;

create or replace function private.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  resolved_id text;
  audit_reason text;
  audit_evidence text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  resolved_id := coalesce(
    row_data ->> 'id',
    nullif(concat_ws(':',
      row_data ->> 'athlete_id',
      row_data ->> 'organization_id',
      row_data ->> 'discipline_id',
      row_data ->> 'user_id'
    ), '')
  );

  if resolved_id is null then
    raise exception 'Audited table %.% has no supported entity identifier.', tg_table_schema, tg_table_name;
  end if;

  audit_reason := nullif(current_setting('request.admin_audit_reason', true), '');
  audit_evidence := nullif(current_setting('request.admin_audit_evidence', true), '');
  insert into private.admin_audit_log (
    actor_id,
    action,
    entity_schema,
    entity_table,
    entity_id,
    reason,
    evidence
  ) values (
    auth.uid(),
    tg_op,
    tg_table_schema,
    tg_table_name,
    resolved_id,
    audit_reason,
    audit_evidence
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.capture_admin_audit() from public, anon, authenticated;

drop trigger if exists audit_admin_mutation on public.source_documents;
create trigger audit_admin_mutation
after insert or update or delete on public.source_documents
for each row execute function private.capture_admin_audit();

drop trigger if exists audit_admin_mutation on public.import_batches;
create trigger audit_admin_mutation
after insert or update or delete on public.import_batches
for each row execute function private.capture_admin_audit();

create or replace function public.commit_result_import(
  requested_competition_id uuid,
  requested_expected_revision bigint,
  requested_sanitized_rows jsonb,
  requested_source_checksum text,
  requested_mappings jsonb,
  requested_correction_reason text,
  requested_source_type text,
  requested_correction_evidence text
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
  normalized_checksum text := lower(btrim(requested_source_checksum));
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may import results.' using errcode = '42501';
  end if;

  if requested_source_type is null or requested_source_type not in ('hy3', 'csv', 'manual') then
    raise exception 'Result source type is invalid.';
  end if;
  if requested_correction_reason is not null and (
    btrim(requested_correction_reason) = '' or char_length(requested_correction_reason) > 2000
  ) then
    raise exception 'Correction reason is required and must be bounded.';
  end if;
  if requested_correction_evidence is not null and (
    btrim(requested_correction_evidence) = '' or char_length(requested_correction_evidence) > 4000
  ) then
    raise exception 'Correction evidence is required and must be bounded.';
  end if;
  if requested_source_type = 'manual' and (
    requested_correction_reason is null or btrim(requested_correction_reason) = ''
    or requested_correction_evidence is null or btrim(requested_correction_evidence) = ''
  ) then
    raise exception 'Manual result entry requires an audit reason and evidence.';
  end if;

  if requested_mappings is null or jsonb_typeof(requested_mappings) <> 'array' then
    raise exception 'Result mappings must be an array.';
  end if;
  if requested_source_type in ('hy3', 'csv') and jsonb_array_length(requested_mappings) = 0 then
    raise exception 'HY3 and CSV imports require resolved source mappings.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(requested_mappings) as mapping
    where jsonb_typeof(mapping) <> 'object'
      or mapping->>'id' is null
      or mapping->>'id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not exists (
        select 1
        from public.source_mappings stored
        where stored.id = (mapping->>'id')::uuid
          and stored.resolution_status = 'resolved'
      )
  ) then
    raise exception 'Every source mapping must be resolved before import.';
  end if;
  if exists (
    select mapping->>'id'
    from jsonb_array_elements(requested_mappings) as mapping
    group by mapping->>'id'
    having count(*) > 1
  ) then
    raise exception 'Result mappings must not be duplicated.';
  end if;

  if requested_sanitized_rows is null or jsonb_typeof(requested_sanitized_rows) <> 'array' then
    raise exception 'Sanitized result rows must be an array.';
  end if;
  rows_count := jsonb_array_length(requested_sanitized_rows);
  if rows_count = 0 then
    raise exception 'Result import requires at least one row.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(requested_sanitized_rows) as row_value
    where jsonb_typeof(row_value) <> 'object'
  ) then
    raise exception 'Every sanitized result row must be an object.';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(requested_sanitized_rows) as row_value
    cross join lateral jsonb_object_keys(row_value) as key_name
    where key_name not in (
      'sourceAlias', 'competition_event_id', 'athlete_id', 'represented_organization_id',
      'entry_status', 'seed_time_ms', 'lane', 'time_ms', 'place', 'status', 'notes'
    )
  ) then
    raise exception 'Sanitized result rows contain fields outside the public import contract.';
  end if;
  if requested_expected_revision is null or requested_expected_revision < 1
    or normalized_checksum !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Result import revision and checksum are invalid.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(requested_sanitized_rows) as payload(
      competition_event_id uuid,
      athlete_id uuid,
      represented_organization_id uuid,
      entry_status text,
      seed_time_ms bigint,
      lane smallint,
      time_ms bigint,
      place integer,
      status text,
      notes text
    )
    where payload.competition_event_id is null
      or payload.athlete_id is null
      or coalesce(payload.entry_status, 'confirmed') not in ('entered', 'confirmed', 'withdrawn', 'did_not_start', 'disqualified')
      or payload.seed_time_ms is not null and payload.seed_time_ms <= 0
      or payload.lane is not null and payload.lane <= 0
      or payload.time_ms is not null and payload.time_ms <= 0
      or payload.place is not null and payload.place <= 0
      or payload.notes is not null and char_length(payload.notes) > 2000
      or payload.status not in ('provisional', 'official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time')
      or not exists (
        select 1
        from public.competition_events event_row
        where event_row.id = payload.competition_event_id
          and event_row.competition_id = requested_competition_id
      )
      or not exists (select 1 from public.athletes where id = payload.athlete_id)
      or (payload.represented_organization_id is not null and not exists (
        select 1
        from public.organizations
        where id = payload.represented_organization_id and organization_type = 'club'
      ))
      or (payload.status in ('provisional', 'official') and payload.time_ms is null)
      or (payload.status not in ('provisional', 'official') and payload.time_ms is not null)
      or (payload.status = 'official' and not private.has_active_consent(payload.athlete_id, 'results_publication'))
  ) then
    raise exception 'Result rows failed event, identity, status, or consent validation.';
  end if;
  if requested_source_type in ('hy3', 'csv') and exists (
    select 1
    from jsonb_to_recordset(requested_sanitized_rows) as payload(athlete_id uuid, represented_organization_id uuid)
    where not exists (
      select 1 from jsonb_array_elements(requested_mappings) mapping
      join public.source_mappings stored on stored.id = (mapping->>'id')::uuid
      where stored.mapping_kind = 'athlete' and stored.athlete_id = payload.athlete_id
    ) or (payload.represented_organization_id is not null and not exists (
      select 1 from jsonb_array_elements(requested_mappings) mapping
      join public.source_mappings stored on stored.id = (mapping->>'id')::uuid
      where stored.mapping_kind = 'organization' and stored.organization_id = payload.represented_organization_id
    ))
  ) then
    raise exception 'Result row identities must match supplied resolved mappings.';
  end if;
  if exists (
    select payload.competition_event_id, payload.athlete_id
    from jsonb_to_recordset(requested_sanitized_rows) as payload(
      competition_event_id uuid,
      athlete_id uuid,
      represented_organization_id uuid,
      entry_status text,
      seed_time_ms bigint,
      lane smallint,
      time_ms bigint,
      place integer,
      status text,
      notes text
    )
    group by payload.competition_event_id, payload.athlete_id
    having count(*) > 1
  ) then
    raise exception 'The import contains duplicate results for an athlete and event.';
  end if;

  select * into strict competition_row
  from public.competitions
  where id = requested_competition_id
  for update;
  if competition_row.revision <> requested_expected_revision then
    raise exception 'Competition changed; create a fresh result preview.';
  end if;
  if exists (
    select 1
    from public.source_documents stored
    where stored.competition_id = requested_competition_id
      and lower(stored.checksum) = normalized_checksum
  ) then
    raise exception 'This source checksum was already imported for the competition.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(requested_sanitized_rows) as payload(
      competition_event_id uuid,
      athlete_id uuid,
      represented_organization_id uuid,
      entry_status text,
      seed_time_ms bigint,
      lane smallint,
      time_ms bigint,
      place integer,
      status text,
      notes text
    )
    join public.entries existing_entry
      on existing_entry.competition_event_id = payload.competition_event_id
      and existing_entry.athlete_id = payload.athlete_id
    join public.performances existing_performance on existing_performance.entry_id = existing_entry.id
  ) and (
    requested_correction_reason is null
    or btrim(requested_correction_reason) = ''
    or requested_correction_evidence is null
    or btrim(requested_correction_evidence) = ''
  ) then
    raise exception 'Manual corrections require an audit reason and evidence.';
  end if;

  perform set_config('request.admin_audit_reason', coalesce(nullif(btrim(requested_correction_reason), ''), ''), true);
  perform set_config('request.admin_audit_evidence', coalesce(nullif(btrim(requested_correction_evidence), ''), ''), true);

  insert into public.source_documents (source_type, competition_id, checksum, status, processed_at)
  values (requested_source_type, requested_competition_id, normalized_checksum, 'processed', now())
  returning id into source_document_id;
  insert into public.import_batches (
    source_document_id, status, rows_received, rows_accepted, rows_rejected,
    started_at, completed_at, expected_revision, correction_reason, correction_evidence
  ) values (
    source_document_id, 'completed', rows_count, rows_count, 0,
    now(), now(), requested_expected_revision,
    nullif(btrim(requested_correction_reason), ''),
    nullif(btrim(requested_correction_evidence), '')
  ) returning id into import_batch_id;

  for row_data in select * from jsonb_to_recordset(requested_sanitized_rows) as payload(
    competition_event_id uuid,
    athlete_id uuid,
    represented_organization_id uuid,
    entry_status text,
    seed_time_ms bigint,
    lane smallint,
    time_ms bigint,
    place integer,
    status text,
    notes text
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

  update public.competitions set updated_at = now() where id = requested_competition_id;
  return import_batch_id;
end;
$$;

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
begin
  return public.commit_result_import(
    $1, $2, $3, $4, $5, $6, 'hy3', null
  );
end;
$$;

revoke all on function public.commit_result_import(uuid, bigint, jsonb, text, jsonb, text) from public, anon;
revoke all on function public.commit_result_import(uuid, bigint, jsonb, text, jsonb, text, text, text) from public, anon;
grant execute on function public.commit_result_import(uuid, bigint, jsonb, text, jsonb, text) to authenticated;
grant execute on function public.commit_result_import(uuid, bigint, jsonb, text, jsonb, text, text, text) to authenticated;
