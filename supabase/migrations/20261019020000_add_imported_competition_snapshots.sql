-- Dedicated immutable sporting-result snapshots for confirmed complete HY3 imports.
-- This domain intentionally has no foreign keys to athletes, organizations, entries,
-- performances, consents, or media. Provisional results are rejected at import.
create table public.imported_competition_snapshots (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> '' and char_length(name) <= 200),
  starts_on date not null,
  ends_on date not null,
  pool_length_metres smallint check (pool_length_metres is null or pool_length_metres in (25, 50)),
  venue text check (venue is null or (btrim(venue) <> '' and char_length(venue) <= 200)),
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create unique index imported_competition_snapshots_identity_idx
  on public.imported_competition_snapshots (lower(name), starts_on, ends_on);

create table public.imported_competition_events (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.imported_competition_snapshots(id) on delete restrict,
  event_alias text not null check (event_alias ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  label text not null check (btrim(label) <> '' and char_length(label) <= 200),
  distance_metres integer check (distance_metres is null or distance_metres between 1 and 100000),
  stroke text check (stroke is null or stroke in (
    'freestyle', 'backstroke', 'breaststroke', 'butterfly', 'medley', 'open_water', 'other'
  )),
  competitive_sex text check (competitive_sex is null or competitive_sex in ('female', 'male', 'mixed', 'open')),
  round text check (round is null or round in ('heat', 'semifinal', 'final', 'timed_final', 'swim_off')),
  category text check (category is null or (btrim(category) <> '' and char_length(category) <= 120)),
  sort_order integer not null check (sort_order between 1 and 500),
  unique (snapshot_id, event_alias),
  unique (snapshot_id, id)
);

create table public.imported_competition_results (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references public.imported_competition_snapshots(id) on delete restrict,
  event_id uuid not null,
  result_alias text not null check (result_alias ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'),
  result_type text not null check (result_type in ('individual', 'relay')),
  participant_name text check (participant_name is null or (btrim(participant_name) <> '' and char_length(participant_name) <= 200)),
  team_name text check (team_name is null or (btrim(team_name) <> '' and char_length(team_name) <= 200)),
  club_name text check (club_name is null or (btrim(club_name) <> '' and char_length(club_name) <= 200)),
  relay_members jsonb not null default '[]'::jsonb check (jsonb_typeof(relay_members) = 'array'),
  place integer check (place is null or place between 1 and 100000),
  time_ms bigint check (time_ms is null or time_ms between 1 and 864000000),
  lane smallint check (lane is null or lane between 1 and 1000),
  status public.result_status not null check (status <> 'provisional'),
  sort_order integer not null check (sort_order between 1 and 10000),
  created_at timestamptz not null default now(),
  foreign key (snapshot_id, event_id)
    references public.imported_competition_events(snapshot_id, id) on delete restrict,
  unique (snapshot_id, result_alias),
  check (
    (result_type = 'individual' and participant_name is not null and team_name is null and relay_members = '[]'::jsonb)
    or (result_type = 'relay' and participant_name is null and team_name is not null)
  ),
  check (status = 'official' or place is null),
  check (status not in ('did_not_start', 'did_not_finish', 'no_time') or time_ms is null),
  check (status <> 'official' or time_ms is not null)
);

-- Checksum and import provenance remain outside the public schema/projection.
create table private.imported_competition_snapshot_sources (
  snapshot_id uuid primary key references public.imported_competition_snapshots(id) on delete restrict,
  source_checksum text not null unique check (source_checksum ~ '^[0-9a-f]{64}$'),
  imported_by uuid not null,
  imported_at timestamptz not null default now()
);

create index imported_competition_events_snapshot_order_idx
  on public.imported_competition_events (snapshot_id, sort_order);
create index imported_competition_results_event_order_idx
  on public.imported_competition_results (event_id, sort_order);

create function private.reject_imported_competition_snapshot_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Published imported competition snapshots are immutable.' using errcode = '55000';
end;
$$;

revoke all on function private.reject_imported_competition_snapshot_mutation() from public, anon, authenticated;

create trigger reject_imported_competition_snapshot_update_delete
before update or delete on public.imported_competition_snapshots
for each row execute function private.reject_imported_competition_snapshot_mutation();
create trigger reject_imported_competition_event_update_delete
before update or delete on public.imported_competition_events
for each row execute function private.reject_imported_competition_snapshot_mutation();
create trigger reject_imported_competition_result_update_delete
before update or delete on public.imported_competition_results
for each row execute function private.reject_imported_competition_snapshot_mutation();
create trigger reject_imported_competition_source_update_delete
before update or delete on private.imported_competition_snapshot_sources
for each row execute function private.reject_imported_competition_snapshot_mutation();

create trigger audit_admin_mutation
after insert on public.imported_competition_snapshots
for each row execute function private.capture_admin_audit();

alter table public.imported_competition_snapshots enable row level security;
alter table public.imported_competition_events enable row level security;
alter table public.imported_competition_results enable row level security;

create policy "Published imported competition snapshots are readable"
  on public.imported_competition_snapshots for select to anon, authenticated
  using (published_at is not null);
create policy "Published imported competition events are readable"
  on public.imported_competition_events for select to anon, authenticated
  using (exists (
    select 1 from public.imported_competition_snapshots snapshot
    where snapshot.id = snapshot_id and snapshot.published_at is not null
  ));
create policy "Published imported competition results are readable"
  on public.imported_competition_results for select to anon, authenticated
  using (exists (
    select 1
    from public.imported_competition_events event_row
    join public.imported_competition_snapshots snapshot on snapshot.id = event_row.snapshot_id
    where event_row.id = event_id
      and event_row.snapshot_id = imported_competition_results.snapshot_id
      and snapshot.published_at is not null
  ));

revoke all on public.imported_competition_snapshots from public, anon, authenticated;
revoke all on public.imported_competition_events from public, anon, authenticated;
revoke all on public.imported_competition_results from public, anon, authenticated;
revoke all on private.imported_competition_snapshot_sources from public, anon, authenticated;
grant select on public.imported_competition_snapshots to anon, authenticated;
grant select on public.imported_competition_events to anon, authenticated;
grant select on public.imported_competition_results to anon, authenticated;
grant select on private.imported_competition_snapshot_sources to service_role;

create function public.import_competition_result_snapshot(
  requested_payload jsonb,
  requested_source_checksum text
)
returns table (
  import_id uuid,
  competition_name text,
  event_count integer,
  result_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  competition_payload jsonb;
  events_payload jsonb;
  results_payload jsonb;
  event_payload jsonb;
  result_payload jsonb;
  member_value jsonb;
  stored_snapshot_id uuid;
  stored_event_id uuid;
  normalized_checksum text := lower(btrim(requested_source_checksum));
  normalized_name text;
  normalized_venue text;
  normalized_members jsonb;
  parsed_starts_on date;
  parsed_ends_on date;
  event_position integer := 0;
  result_position integer := 0;
begin
  if not private.is_content_editor() then
    raise exception 'Only active content editors may import competition snapshots.' using errcode = '42501';
  end if;
  if requested_payload is null or jsonb_typeof(requested_payload) <> 'object'
    or pg_column_size(requested_payload) > 10485760
    or exists (
      select 1 from jsonb_object_keys(requested_payload) key_name
      where key_name not in ('competition', 'events', 'results')
    )
    or not (requested_payload ?& array['competition', 'events', 'results'])
  then
    raise exception 'Snapshot payload must be a bounded object containing only competition, events, and results.' using errcode = '22023';
  end if;

  competition_payload := requested_payload->'competition';
  events_payload := requested_payload->'events';
  results_payload := requested_payload->'results';
  if jsonb_typeof(competition_payload) <> 'object'
    or jsonb_typeof(events_payload) <> 'array'
    or jsonb_typeof(results_payload) <> 'array'
    or jsonb_array_length(events_payload) not between 1 and 500
    or jsonb_array_length(results_payload) not between 1 and 10000
  then
    raise exception 'Snapshot competition, event count, or result count is invalid.' using errcode = '22023';
  end if;

  if exists (
      select 1 from jsonb_object_keys(competition_payload) key_name
      where key_name not in ('name', 'startsOn', 'endsOn', 'poolLengthMetres', 'venue')
    )
    or not (competition_payload ?& array['name', 'startsOn', 'endsOn'])
    or jsonb_typeof(competition_payload->'name') <> 'string'
    or jsonb_typeof(competition_payload->'startsOn') <> 'string'
    or jsonb_typeof(competition_payload->'endsOn') <> 'string'
    or competition_payload->>'startsOn' !~ '^\d{4}-\d{2}-\d{2}$'
    or competition_payload->>'endsOn' !~ '^\d{4}-\d{2}-\d{2}$'
    or (competition_payload ? 'poolLengthMetres' and competition_payload->'poolLengthMetres' <> 'null'::jsonb
      and (jsonb_typeof(competition_payload->'poolLengthMetres') <> 'number'
        or competition_payload->>'poolLengthMetres' not in ('25', '50')))
    or (competition_payload ? 'venue' and competition_payload->'venue' <> 'null'::jsonb
      and jsonb_typeof(competition_payload->'venue') <> 'string')
  then
    raise exception 'Competition metadata is malformed or contains unknown fields.' using errcode = '22023';
  end if;

  normalized_name := btrim(competition_payload->>'name');
  normalized_venue := nullif(btrim(competition_payload->>'venue'), '');
  if normalized_name = '' or char_length(normalized_name) > 200
    or competition_payload->>'name' ~ '[[:cntrl:]]'
    or (competition_payload->>'venue' is not null and (
      normalized_venue is null or char_length(normalized_venue) > 200
      or competition_payload->>'venue' ~ '[[:cntrl:]]'
    ))
    or normalized_checksum is null
    or normalized_checksum !~ '^[0-9a-f]{64}$'
  then
    raise exception 'Competition text or source checksum is invalid.' using errcode = '22023';
  end if;
  begin
    parsed_starts_on := (competition_payload->>'startsOn')::date;
    parsed_ends_on := (competition_payload->>'endsOn')::date;
  exception when datetime_field_overflow or invalid_datetime_format then
    raise exception 'Competition dates are invalid.' using errcode = '22007';
  end;
  if parsed_ends_on < parsed_starts_on then
    raise exception 'Competition end date must not precede its start date.' using errcode = '22023';
  end if;

  for event_payload in select value from jsonb_array_elements(events_payload) loop
    event_position := event_position + 1;
    if jsonb_typeof(event_payload) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(event_payload) key_name
        where key_name not in ('alias', 'label', 'distanceMetres', 'stroke', 'sex', 'round', 'category')
      )
      or not (event_payload ?& array['alias', 'label'])
      or jsonb_typeof(event_payload->'alias') <> 'string'
      or jsonb_typeof(event_payload->'label') <> 'string'
      or event_payload->>'alias' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
      or btrim(event_payload->>'label') = ''
      or char_length(event_payload->>'label') > 200
      or event_payload->>'label' ~ '[[:cntrl:]]'
      or (event_payload ? 'distanceMetres' and event_payload->'distanceMetres' <> 'null'::jsonb and (
        jsonb_typeof(event_payload->'distanceMetres') <> 'number'
        or event_payload->>'distanceMetres' !~ '^[0-9]+$'
        or (event_payload->>'distanceMetres')::numeric not between 1 and 100000
      ))
      or (event_payload ? 'stroke' and event_payload->'stroke' <> 'null'::jsonb and (
        jsonb_typeof(event_payload->'stroke') <> 'string'
        or event_payload->>'stroke' not in ('freestyle','backstroke','breaststroke','butterfly','medley','open_water','other')
      ))
      or (event_payload ? 'sex' and event_payload->'sex' <> 'null'::jsonb and (
        jsonb_typeof(event_payload->'sex') <> 'string'
        or event_payload->>'sex' not in ('female','male','mixed','open')
      ))
      or (event_payload ? 'round' and event_payload->'round' <> 'null'::jsonb and (
        jsonb_typeof(event_payload->'round') <> 'string'
        or event_payload->>'round' not in ('heat','semifinal','final','timed_final','swim_off')
      ))
      or (event_payload ? 'category' and event_payload->'category' <> 'null'::jsonb and (
        jsonb_typeof(event_payload->'category') <> 'string'
        or btrim(event_payload->>'category') = ''
        or char_length(event_payload->>'category') > 120
        or event_payload->>'category' ~ '[[:cntrl:]]'
      ))
    then
      raise exception 'Event % is malformed or contains unknown fields.', event_position using errcode = '22023';
    end if;
  end loop;
  if exists (
    select item->>'alias' from jsonb_array_elements(events_payload) item
    group by item->>'alias' having count(*) > 1
  ) then
    raise exception 'Event aliases must be unique within a snapshot.' using errcode = '22023';
  end if;

  for result_payload in select value from jsonb_array_elements(results_payload) loop
    result_position := result_position + 1;
    if jsonb_typeof(result_payload) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(result_payload) key_name
        where key_name not in (
          'alias', 'eventAlias', 'resultType', 'participantName', 'teamName',
          'clubName', 'relayMembers', 'place', 'timeMs', 'lane', 'status'
        )
      )
      or not (result_payload ?& array['alias', 'eventAlias', 'resultType', 'status'])
      or jsonb_typeof(result_payload->'alias') <> 'string'
      or jsonb_typeof(result_payload->'eventAlias') <> 'string'
      or jsonb_typeof(result_payload->'resultType') <> 'string'
      or jsonb_typeof(result_payload->'status') <> 'string'
      or result_payload->>'alias' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
      or result_payload->>'eventAlias' !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$'
      or result_payload->>'resultType' not in ('individual', 'relay')
      or result_payload->>'status' not in ('official','disqualified','did_not_start','did_not_finish','no_time')
      or not exists (
        select 1 from jsonb_array_elements(events_payload) event_item
        where event_item->>'alias' = result_payload->>'eventAlias'
      )
      or (result_payload ? 'participantName' and result_payload->'participantName' <> 'null'::jsonb
        and jsonb_typeof(result_payload->'participantName') <> 'string')
      or (result_payload ? 'teamName' and result_payload->'teamName' <> 'null'::jsonb
        and jsonb_typeof(result_payload->'teamName') <> 'string')
      or (result_payload ? 'clubName' and result_payload->'clubName' <> 'null'::jsonb
        and jsonb_typeof(result_payload->'clubName') <> 'string')
      or (result_payload ? 'relayMembers' and result_payload->'relayMembers' <> 'null'::jsonb
        and jsonb_typeof(result_payload->'relayMembers') <> 'array')
      or (result_payload ? 'place' and result_payload->'place' <> 'null'::jsonb and (
        jsonb_typeof(result_payload->'place') <> 'number'
        or result_payload->>'place' !~ '^[0-9]+$'
        or (result_payload->>'place')::numeric not between 1 and 100000
      ))
      or (result_payload ? 'timeMs' and result_payload->'timeMs' <> 'null'::jsonb and (
        jsonb_typeof(result_payload->'timeMs') <> 'number'
        or result_payload->>'timeMs' !~ '^[0-9]+$'
        or (result_payload->>'timeMs')::numeric not between 1 and 864000000
      ))
      or (result_payload ? 'lane' and result_payload->'lane' <> 'null'::jsonb and (
        jsonb_typeof(result_payload->'lane') <> 'number'
        or result_payload->>'lane' !~ '^[0-9]+$'
        or (result_payload->>'lane')::numeric not between 1 and 1000
      ))
    then
      raise exception 'Result % is malformed, provisional, unscoped, or contains unknown fields.', result_position using errcode = '22023';
    end if;

    if (result_payload->>'participantName' is not null and (
        btrim(result_payload->>'participantName') = ''
        or char_length(result_payload->>'participantName') > 200
        or result_payload->>'participantName' ~ '[[:cntrl:]]'
      ))
      or (result_payload->>'teamName' is not null and (
        btrim(result_payload->>'teamName') = ''
        or char_length(result_payload->>'teamName') > 200
        or result_payload->>'teamName' ~ '[[:cntrl:]]'
      ))
      or (result_payload->>'clubName' is not null and (
        btrim(result_payload->>'clubName') = ''
        or char_length(result_payload->>'clubName') > 200
        or result_payload->>'clubName' ~ '[[:cntrl:]]'
      ))
      or (result_payload->>'resultType' = 'individual' and (
        result_payload->>'participantName' is null
        or result_payload->>'teamName' is not null
        or coalesce(result_payload->'relayMembers', '[]'::jsonb) <> '[]'::jsonb
      ))
      or (result_payload->>'resultType' = 'relay' and (
        result_payload->>'teamName' is null or result_payload->>'participantName' is not null
      ))
      or (result_payload->>'status' = 'official' and result_payload->>'timeMs' is null)
      or (result_payload->>'status' <> 'official' and result_payload->>'place' is not null)
      or (result_payload->>'status' in ('did_not_start','did_not_finish','no_time')
        and result_payload->>'timeMs' is not null)
    then
      raise exception 'Result % has an invalid sporting identity, status, place, or time combination.', result_position using errcode = '22023';
    end if;

    normalized_members := coalesce(result_payload->'relayMembers', '[]'::jsonb);
    if jsonb_array_length(normalized_members) > 32 then
      raise exception 'Result % has too many relay member names.', result_position using errcode = '22023';
    end if;
    for member_value in select value from jsonb_array_elements(normalized_members) loop
      if jsonb_typeof(member_value) <> 'string'
        or btrim(member_value#>>'{}') = ''
        or char_length(member_value#>>'{}') > 200
        or member_value#>>'{}' ~ '[[:cntrl:]]'
      then
        raise exception 'Result % has a malformed relay member name.', result_position using errcode = '22023';
      end if;
    end loop;
    if exists (
      select 1 from jsonb_array_elements(normalized_members) member
      group by lower(btrim(member#>>'{}')) having count(*) > 1
    ) then
      raise exception 'Result % repeats a relay member name.', result_position using errcode = '22023';
    end if;
  end loop;
  if exists (
    select item->>'alias' from jsonb_array_elements(results_payload) item
    group by item->>'alias' having count(*) > 1
  ) then
    raise exception 'Result aliases must be unique within a snapshot.' using errcode = '22023';
  end if;

  -- All validation precedes writes. Publication is visible only when this
  -- transaction commits after every event and result has been inserted.
  insert into public.imported_competition_snapshots (
    name, starts_on, ends_on, pool_length_metres, venue, published_at
  ) values (
    normalized_name,
    parsed_starts_on,
    parsed_ends_on,
    (competition_payload->>'poolLengthMetres')::smallint,
    normalized_venue,
    now()
  ) returning id into stored_snapshot_id;

  insert into private.imported_competition_snapshot_sources (
    snapshot_id, source_checksum, imported_by
  ) values (
    stored_snapshot_id, normalized_checksum, auth.uid()
  );

  event_position := 0;
  for event_payload in select value from jsonb_array_elements(events_payload) loop
    event_position := event_position + 1;
    insert into public.imported_competition_events (
      snapshot_id, event_alias, label, distance_metres, stroke,
      competitive_sex, round, category, sort_order
    ) values (
      stored_snapshot_id,
      event_payload->>'alias',
      btrim(event_payload->>'label'),
      (event_payload->>'distanceMetres')::integer,
      event_payload->>'stroke',
      event_payload->>'sex',
      event_payload->>'round',
      nullif(btrim(event_payload->>'category'), ''),
      event_position
    );
  end loop;

  result_position := 0;
  for result_payload in select value from jsonb_array_elements(results_payload) loop
    result_position := result_position + 1;
    select id into strict stored_event_id
    from public.imported_competition_events
    where snapshot_id = stored_snapshot_id
      and event_alias = result_payload->>'eventAlias';

    select coalesce(jsonb_agg(to_jsonb(btrim(member#>>'{}')) order by member_order), '[]'::jsonb)
      into normalized_members
    from jsonb_array_elements(coalesce(result_payload->'relayMembers', '[]'::jsonb))
      with ordinality member(member, member_order);

    insert into public.imported_competition_results (
      snapshot_id, event_id, result_alias, result_type, participant_name,
      team_name, club_name, relay_members, place, time_ms, lane, status, sort_order
    ) values (
      stored_snapshot_id,
      stored_event_id,
      result_payload->>'alias',
      result_payload->>'resultType',
      nullif(btrim(result_payload->>'participantName'), ''),
      nullif(btrim(result_payload->>'teamName'), ''),
      nullif(btrim(result_payload->>'clubName'), ''),
      normalized_members,
      (result_payload->>'place')::integer,
      (result_payload->>'timeMs')::bigint,
      (result_payload->>'lane')::smallint,
      (result_payload->>'status')::public.result_status,
      result_position
    );
  end loop;

  return query select
    stored_snapshot_id,
    normalized_name,
    jsonb_array_length(events_payload),
    jsonb_array_length(results_payload);
end;
$$;

revoke all on function public.import_competition_result_snapshot(jsonb, text) from public, anon, authenticated;
grant execute on function public.import_competition_result_snapshot(jsonb, text) to authenticated;

create function public.get_public_imported_competitions()
returns table (
  import_id uuid,
  competition_name text,
  starts_on date,
  ends_on date,
  pool_length_metres smallint,
  venue text,
  event_count bigint,
  result_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    snapshot.id,
    snapshot.name,
    snapshot.starts_on,
    snapshot.ends_on,
    snapshot.pool_length_metres,
    snapshot.venue,
    count(distinct event_row.id),
    count(result_row.id)
  from public.imported_competition_snapshots snapshot
  join public.imported_competition_events event_row on event_row.snapshot_id = snapshot.id
  join public.imported_competition_results result_row
    on result_row.snapshot_id = snapshot.id and result_row.event_id = event_row.id
  where snapshot.published_at is not null
  group by snapshot.id
  order by snapshot.starts_on desc, snapshot.name, snapshot.id;
$$;

create function public.get_public_imported_competition_results(requested_import_id uuid)
returns table (
  import_id uuid,
  competition_name text,
  starts_on date,
  ends_on date,
  pool_length_metres smallint,
  venue text,
  event_alias text,
  event_label text,
  distance_metres integer,
  stroke text,
  competitive_sex text,
  round text,
  category text,
  result_alias text,
  result_type text,
  participant_name text,
  team_name text,
  club_name text,
  relay_members jsonb,
  place integer,
  time_ms bigint,
  lane smallint,
  status public.result_status
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    snapshot.id,
    snapshot.name,
    snapshot.starts_on,
    snapshot.ends_on,
    snapshot.pool_length_metres,
    snapshot.venue,
    event_row.event_alias,
    event_row.label,
    event_row.distance_metres,
    event_row.stroke,
    event_row.competitive_sex,
    event_row.round,
    event_row.category,
    result_row.result_alias,
    result_row.result_type,
    result_row.participant_name,
    result_row.team_name,
    result_row.club_name,
    result_row.relay_members,
    result_row.place,
    result_row.time_ms,
    result_row.lane,
    result_row.status
  from public.imported_competition_results result_row
  join public.imported_competition_events event_row
    on event_row.id = result_row.event_id
    and event_row.snapshot_id = result_row.snapshot_id
  join public.imported_competition_snapshots snapshot on snapshot.id = event_row.snapshot_id
  where snapshot.id = requested_import_id
    and snapshot.published_at is not null
    and result_row.status in ('official','disqualified','did_not_start','did_not_finish','no_time')
  order by event_row.sort_order, result_row.place nulls last, result_row.sort_order;
$$;

revoke all on function public.get_public_imported_competitions() from public;
revoke all on function public.get_public_imported_competition_results(uuid) from public;
grant execute on function public.get_public_imported_competitions() to anon, authenticated;
grant execute on function public.get_public_imported_competition_results(uuid) to anon, authenticated;

comment on function public.import_competition_result_snapshot(jsonb, text) is
'Atomically validates and publishes one immutable complete HY3 sporting snapshot. DTO keys are competition{name,startsOn,endsOn,poolLengthMetres?,venue?}, events[{alias,label,distanceMetres?,stroke?,sex?,round?,category?}], and results[{alias,eventAlias,resultType,participantName?|teamName?,clubName?,relayMembers?,place?,timeMs?,lane?,status}]. Unknown/private keys and provisional statuses are rejected.';
comment on function public.get_public_imported_competitions() is
'Lists fully published imported sporting snapshots without checksum, actor, profile, organization, consent, or media data.';
comment on function public.get_public_imported_competition_results(uuid) is
'Returns final individual and relay sporting rows for one published imported snapshot; teamName is required for every relay and relayMembers may be empty.';
