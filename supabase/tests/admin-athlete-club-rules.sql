begin;

do $$
declare
  test_club uuid;
  test_athlete uuid;
  category_athlete uuid;
  discipline_athlete uuid;
  federation_athlete uuid;
  preinfant_athlete uuid;
  photo_asset uuid;
  category_id uuid;
  second_category_id uuid;
  preinfant_category_id uuid;
  association_id uuid;
  federation_id uuid;
  sport_id uuid;
  discipline_id uuid;
  swimming_calendar_id uuid;
  open_water_id uuid;
  water_polo_id uuid;
  event_definition_id uuid;
  competition_id uuid;
  competition_event_id uuid;
  entry_id uuid;
  performance_id uuid;
  competition_club uuid;
  history_club uuid;
  history_competition_id uuid;
  history_event_id uuid;
  history_entry_id uuid;
  history_performance_id uuid;
  blocked boolean;
  visible integer;
  failures text[] := array[]::text[];
begin
  insert into public.organizations (
    organization_type, name, short_name, slug, publication_status
  ) values (
    'club', 'Task 3.1 Club', 'T31',
    'task-31-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'published'
  ) returning id into test_club;

  insert into public.media_assets (
    provider, public_id, resource_type, format, is_public, alt_text
  ) values (
    'cloudinary', 'task-31-photo-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'image', 'jpg', true, 'Synthetic task 3.1 athlete portrait'
  ) returning id into photo_asset;

  insert into public.athletes (display_name, photo_asset_id)
  values ('Task 3.1 consent athlete', photo_asset)
  returning id into test_athlete;
  insert into private.athlete_details (
    athlete_id, date_of_birth, national_id_hash, national_id_last4
  ) values (
    test_athlete,
    date '2000-01-01',
    encode(extensions.digest(test_athlete::text, 'sha256'), 'hex'),
    '0000'
  );

  -- Publication requires profile consent, then photo consent when an asset is linked.
  blocked := false;
  begin
    update public.athletes set publication_status = 'published' where id = test_athlete;
  exception when others then
    if sqlerrm not like 'Athletes require active public-profile%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'publication without profile consent was accepted'); end if;

  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (test_athlete, 'public_profile', 'granted', now());
  blocked := false;
  begin
    update public.athletes set publication_status = 'published' where id = test_athlete;
  exception when others then
    if sqlerrm not like 'Athletes require active public-profile%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'publication with linked photo and no photo consent was accepted'); end if;

  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (test_athlete, 'photo', 'granted', now());
  update public.athletes set publication_status = 'published' where id = test_athlete;

  -- An official performance is hidden until results-publication consent is active.
  select id into strict sport_id from public.sports where code = 'aquatics';
  select id into strict discipline_id from public.disciplines where code = 'swimming';
  select calendar.id into strict swimming_calendar_id
  from public.competition_calendars calendar
  join public.disciplines discipline on discipline.id = calendar.discipline_id
  where discipline.code = 'swimming' and calendar.season_year = 2026;
  select id into strict open_water_id from public.disciplines where code = 'open-water';
  select id into strict water_polo_id from public.disciplines where code = 'water-polo';
  select id into strict category_id from public.age_categories where code = 'youth-a';
  select id into strict second_category_id from public.age_categories where code = 'infant-a';
  select id into strict preinfant_category_id from public.age_categories where code = 'pre-infant-a';
  insert into public.event_definitions (
    discipline_id, code, name, distance_metres, stroke, course
  ) values (
    discipline_id,
    'task-31-event-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'Task 3.1 synthetic event', 50, 'freestyle', 'long_course'
  ) returning id into event_definition_id;
  insert into public.competitions (
    name, slug, sport_id, organizer_id, starts_on, ends_on, calendar_id,
    recognition_status, status, published_at
  ) values (
    'Task 3.1 synthetic competition',
    'task-31-competition-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    sport_id, test_club, date '2026-06-01', date '2026-06-01', swimming_calendar_id,
    'recognized', 'completed', now()
  ) returning id into competition_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex, sequence_number, status
  ) values (
    competition_id, event_definition_id, category_id, 'open', 1, 'completed'
  ) returning id into competition_event_id;
  insert into public.entries (
    competition_event_id, athlete_id, represented_organization_id, status
  ) values (
    competition_event_id, test_athlete, test_club, 'confirmed'
  ) returning id into entry_id;
  insert into public.performances (
    entry_id, time_ms, place, status, recorded_at
  ) values (
    entry_id, 32100, 1, 'official', now()
  ) returning id into performance_id;

  execute 'set local role anon';
  select count(*) into visible from public.performances where id = performance_id;
  if visible <> 0 then failures := array_append(failures, 'official performance without results consent was publicly visible'); end if;
  execute 'reset role';
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (test_athlete, 'results_publication', 'granted', now());
  execute 'set local role anon';
  select count(*) into visible from public.performances where id = performance_id;
  if visible <> 1 then failures := array_append(failures, 'official performance with results consent was hidden'); end if;
  execute 'reset role';

  -- Category periods for one athlete cannot overlap, regardless of category code.
  insert into public.athletes (display_name)
  values ('Task 3.1 category athlete')
  returning id into category_athlete;
  insert into private.athlete_details (
    athlete_id, date_of_birth, national_id_hash, national_id_last4
  ) values (
    category_athlete,
    date '2001-01-01',
    encode(extensions.digest(category_athlete::text, 'sha256'), 'hex'),
    '0001'
  );
  insert into public.athlete_category_assignments (
    athlete_id, category_id, valid_from, valid_to
  ) values (
    category_athlete, category_id, current_date, current_date + 30
  );
  blocked := false;
  begin
    insert into public.athlete_category_assignments (
      athlete_id, category_id, valid_from, valid_to
    ) values (
      category_athlete, second_category_id, current_date + 15, current_date + 45
    );
  exception when exclusion_violation then
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'overlapping category period was accepted'); end if;

  -- An athlete can have at most two simultaneous disciplines and one primary.
  insert into public.athletes (display_name)
  values ('Task 3.1 discipline athlete')
  returning id into discipline_athlete;
  insert into private.athlete_details (
    athlete_id, date_of_birth, national_id_hash, national_id_last4
  ) values (
    discipline_athlete,
    date '2001-06-01',
    encode(extensions.digest(discipline_athlete::text, 'sha256'), 'hex'),
    '0004'
  );
  insert into public.athlete_disciplines (
    athlete_id, discipline_id, is_primary, valid_from
  ) values
    (discipline_athlete, discipline_id, true, current_date),
    (discipline_athlete, open_water_id, false, current_date);
  blocked := false;
  begin
    insert into public.athlete_disciplines (
      athlete_id, discipline_id, is_primary, valid_from
    ) values (
      discipline_athlete, water_polo_id, false, current_date
    );
  exception when others then
    if sqlerrm not like 'An athlete can have at most two%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'third simultaneous discipline was accepted'); end if;
  blocked := false;
  begin
    update public.athlete_disciplines
    set is_primary = true
    where athlete_id = discipline_athlete and athlete_disciplines.discipline_id = open_water_id;
  exception when others then
    if sqlerrm not like 'An athlete can have at most one primary%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'second primary discipline was accepted'); end if;

  -- Federation is valid only when the same club association covers the full period.
  insert into public.athletes (display_name)
  values ('Task 3.1 federation athlete')
  returning id into federation_athlete;
  insert into private.athlete_details (
    athlete_id, date_of_birth, national_id_hash, national_id_last4
  ) values (
    federation_athlete,
    date '2002-01-01',
    encode(extensions.digest(federation_athlete::text, 'sha256'), 'hex'),
    '0002'
  );
  insert into public.athlete_memberships (
    athlete_id, organization_id, membership_type, status, valid_from, valid_to
  ) values (
    federation_athlete, test_club, 'associated', 'active', current_date, current_date + 30
  ) returning id into association_id;
  insert into public.athlete_memberships (
    athlete_id, organization_id, membership_type, status, valid_from, valid_to
  ) values (
    federation_athlete, test_club, 'federated', 'active', current_date + 5, current_date + 25
  ) returning id into federation_id;
  select count(*) into visible
  from public.athlete_memberships
  where id in (association_id, federation_id) and status = 'active';
  if visible <> 2 then failures := array_append(failures, 'covered federation and association were not both retained'); end if;

  blocked := false;
  begin
    insert into public.athlete_memberships (
      athlete_id, organization_id, membership_type, status, valid_from, valid_to
    ) values (
      federation_athlete, test_club, 'federated', 'active', current_date + 31, current_date + 40
    );
  exception when others then
    if sqlerrm not like 'Federated membership requires%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'federation outside association coverage was accepted'); end if;

  blocked := false;
  begin
    update public.athlete_memberships
    set valid_to = current_date + 10
    where id = association_id;
    set constraints protect_federated_association_coverage immediate;
  exception when others then
    if sqlerrm not like 'Active association cannot%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'association was shortened beneath federated coverage'); end if;

  -- A pre-infant category must reject an otherwise covered federation.
  insert into public.athletes (display_name)
  values ('Task 3.1 pre-infant athlete')
  returning id into preinfant_athlete;
  insert into private.athlete_details (
    athlete_id, date_of_birth, national_id_hash, national_id_last4
  ) values (
    preinfant_athlete,
    date '2015-01-01',
    encode(extensions.digest(preinfant_athlete::text, 'sha256'), 'hex'),
    '0003'
  );
  insert into public.athlete_category_assignments (athlete_id, category_id, valid_from)
  values (preinfant_athlete, preinfant_category_id, current_date);
  insert into public.athlete_memberships (
    athlete_id, organization_id, membership_type, status, valid_from
  ) values (
    preinfant_athlete, test_club, 'associated', 'active', current_date
  );
  blocked := false;
  begin
    insert into public.athlete_memberships (
      athlete_id, organization_id, membership_type, status, valid_from
    ) values (
      preinfant_athlete, test_club, 'federated', 'active', current_date
    );
  exception when others then
    if sqlerrm not like 'Pre-infant athletes cannot%' then raise; end if;
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'pre-infant federation was accepted'); end if;

  -- Only explicitly public typed contacts are visible to anonymous clients.
  insert into public.organization_contacts (
    organization_id, contact_type, label, value, url, is_public, sort_order
  ) values
    (test_club, 'email', 'Public email', 'task-31@example.test', null, true, 1),
    (test_club, 'phone', 'Private phone', '000-000-0000', null, false, 2);
  execute 'set local role anon';
  select count(*) into visible
  from public.organization_contacts
  where organization_id = test_club and contact_type = 'email';
  if visible <> 1 then failures := array_append(failures, 'public typed contact was hidden'); end if;
  select count(*) into visible
  from public.organization_contacts
  where organization_id = test_club and contact_type = 'phone';
  if visible <> 0 then failures := array_append(failures, 'private typed contact was publicly visible'); end if;
  execute 'reset role';

  -- Archival must preserve membership references and prevent hard deletion.
  update public.organizations set publication_status = 'archived' where id = test_club;
  select count(*) into visible
  from public.athlete_memberships
  where organization_id = test_club;
  if visible <> 3 then failures := array_append(failures, 'archival did not preserve membership references'); end if;
  blocked := false;
  begin
    delete from public.organizations where id = test_club;
  exception when foreign_key_violation then
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'club referenced by memberships was hard-deleted'); end if;

  -- Competition organizers must also be archived rather than deleted.
  insert into public.organizations (
    organization_type, name, short_name, slug, publication_status
  ) values (
    'club', 'Task 3.1 Competition Club', 'T31C',
    'task-31-competition-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'published'
  ) returning id into competition_club;
  insert into public.competitions (
    name, slug, sport_id, organizer_id, starts_on, status, calendar_id
  ) values (
    'Task 3.1 organizer reference',
    'task-31-organizer-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    sport_id, competition_club, date '2026-06-01', 'completed', swimming_calendar_id
  ) returning id into history_competition_id;
  blocked := false;
  begin
    delete from public.organizations where id = competition_club;
  exception when foreign_key_violation then
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'club referenced by a competition was hard-deleted'); end if;

  -- Historical result references must survive the club lifecycle operation.
  insert into public.organizations (
    organization_type, name, short_name, slug, publication_status
  ) values (
    'club', 'Task 3.1 History Club', 'T31H',
    'task-31-history-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    'published'
  ) returning id into history_club;
  insert into public.competitions (
    name, slug, sport_id, starts_on, status, calendar_id
  ) values (
    'Task 3.1 historical result competition',
    'task-31-history-competition-' || replace(substr(gen_random_uuid()::text, 1, 8), '-', ''),
    sport_id, date '2026-06-01', 'completed', swimming_calendar_id
  ) returning id into history_competition_id;
  insert into public.competition_events (
    competition_id, event_definition_id, category_id, competitive_sex, sequence_number, status
  ) values (
    history_competition_id, event_definition_id, category_id, 'open', 1, 'completed'
  ) returning id into history_event_id;
  insert into public.entries (
    competition_event_id, athlete_id, represented_organization_id, status
  ) values (
    history_event_id, test_athlete, history_club, 'confirmed'
  ) returning id into history_entry_id;
  insert into public.performances (
    entry_id, time_ms, place, status, recorded_at
  ) values (
    history_entry_id, 32200, 2, 'official', now()
  ) returning id into history_performance_id;
  insert into public.records (
    performance_id, scope_type, scope_organization_id, ratification_status
  ) values (
    history_performance_id, 'club', history_club, 'ratified'
  );
  blocked := false;
  begin
    delete from public.organizations where id = history_club;
  exception when foreign_key_violation then
    blocked := true;
  end;
  if not blocked then failures := array_append(failures, 'club referenced by historical results was hard-deleted'); end if;

  if coalesce(array_length(failures, 1), 0) > 0 then
    raise exception 'Task 3.1 contract failures: %', array_to_string(failures, '; ');
  end if;
end;
$$;

rollback;
