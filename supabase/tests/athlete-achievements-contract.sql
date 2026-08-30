begin;

do $$
declare
  test_athlete_id uuid;
  draft_athlete_id uuid;
  editor_id uuid;
  viewer_id uuid := gen_random_uuid();
  asset_id uuid;
  approved_source_id uuid;
  pending_source_id uuid;
  matching_evidence_source_id uuid;
  mismatched_evidence_source_id uuid;
  achievement_id uuid;
  blocked boolean;
begin
  if to_regclass('public.athlete_achievements') is null
    or has_table_privilege('anon', 'public.athlete_achievements', 'SELECT')
  then raise exception 'The private athlete achievement contract is missing.'; end if;
  select id into strict editor_id from public.profiles
  where role in ('administrator', 'editor') and is_active
  order by role = 'administrator' desc, id limit 1;
  insert into auth.users (id) values (viewer_id);
  insert into public.profiles (id, display_name, role, is_active)
  values (viewer_id, 'Achievement SQL viewer', 'viewer', true);
  insert into public.athletes (display_name)
  values ('Published achievement athlete') returning id into test_athlete_id;
  insert into public.athletes (display_name)
  values ('Draft achievement athlete') returning id into draft_athlete_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at) values
    (test_athlete_id, 'public_profile', 'granted', now()),
    (test_athlete_id, 'results_publication', 'granted', now());
  update public.athletes set publication_status = 'published' where id = test_athlete_id;
  insert into public.media_assets (provider, external_url, resource_type, is_public)
  values ('local', '/achievement-evidence.pdf', 'document', false) returning id into asset_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at)
  values ('manual', asset_id, repeat('b', 64), 'processed', now()) returning id into approved_source_id;
  insert into public.source_documents (source_type, asset_id, checksum, status, processed_at)
  values ('manual', asset_id, repeat('c', 64), 'processed', now()) returning id into pending_source_id;
  insert into public.source_documents (
    source_type, athlete_id, evidence_kind, evidence_label, official_url,
    checksum, status, processed_at
  ) values (
    'manual', test_athlete_id, 'official_url', 'Matching official evidence',
    'https://example.test/evidence/matching', repeat('d', 64), 'processed', now()
  ) returning id into matching_evidence_source_id;
  insert into public.source_documents (
    source_type, athlete_id, evidence_kind, evidence_label, official_url,
    checksum, status, processed_at
  ) values (
    'manual', draft_athlete_id, 'official_url', 'Other athlete evidence',
    'https://example.test/evidence/other-athlete', repeat('e', 64), 'processed', now()
  ) returning id into mismatched_evidence_source_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  update public.source_documents set approval_status = 'approved' where id = approved_source_id;
  update public.source_documents set approval_status = 'approved' where id = matching_evidence_source_id;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    insert into public.athlete_achievements (
      athlete_id, source_document_id, achievement_type, title, valid_from
    ) values (test_athlete_id, pending_source_id, 'national_team', 'Viewer draft', current_date);
  exception when insufficient_privilege then blocked := true; end;
  execute 'reset role';
  if not blocked then raise exception 'A viewer managed athlete achievements.'; end if;

  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    insert into public.athlete_achievements (
      athlete_id, source_document_id, achievement_type, title, competition_name,
      medal, achieved_on, publication_status, published_at
    ) values (
      test_athlete_id, pending_source_id, 'international_medal', 'Unapproved evidence',
      'International meet', 'gold', current_date, 'published', now()
    );
  exception when others then
    if sqlerrm not like 'Published athlete achievements require an approved source document%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'An achievement with unapproved evidence was published.'; end if;

  blocked := false;
  begin
    insert into public.athlete_achievements (
      athlete_id, source_document_id, achievement_type, title, valid_from,
      publication_status, published_at
    ) values (
      draft_athlete_id, approved_source_id, 'national_team', 'Draft athlete selection',
      current_date, 'published', now()
    );
  exception when others then
    if sqlerrm not like 'Published athlete achievements require a published athlete%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'A draft or unconsented athlete received a published achievement.'; end if;

  blocked := false;
  begin
    insert into public.athlete_achievements (
      athlete_id, source_document_id, achievement_type, title, valid_from
    ) values (
      test_athlete_id, mismatched_evidence_source_id, 'national_team',
      'Mismatched athlete evidence', current_date
    );
  exception when check_violation then
    if sqlerrm not like 'Athlete achievement evidence must belong to the same athlete%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'An achievement accepted evidence owned by another athlete.'; end if;

  insert into public.athlete_achievements (
    athlete_id, source_document_id, achievement_type, title, competition_name,
    place, achieved_on, publication_status, published_at
  ) values (
    test_athlete_id, matching_evidence_source_id, 'national_podium', 'Published national podium',
    'National meet', 2, current_date, 'published', now()
  ) returning id into achievement_id;
  execute 'reset role';

  if not exists (
    select 1 from private.admin_audit_log
    where actor_id = editor_id and action = 'INSERT'
      and entity_table = 'athlete_achievements' and entity_id = achievement_id::text
  ) then raise exception 'Achievement creation was not audited.'; end if;

  update public.athlete_consents set status = 'withdrawn', granted_at = null
  where athlete_consents.athlete_id = test_athlete_id and consent_type = 'results_publication';
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  update public.athlete_achievements set publication_status = 'draft', published_at = null
  where id = achievement_id;
  blocked := false;
  begin
    update public.athlete_achievements set publication_status = 'published', published_at = now()
    where id = achievement_id;
  exception when others then
    if sqlerrm not like 'Published athlete achievements require a published athlete%' then raise; end if;
    blocked := true;
  end;
  execute 'reset role';
  if not blocked then raise exception 'An achievement was published without active results consent.'; end if;
  if not exists (
    select 1 from public.athlete_achievements
    where id = achievement_id and publication_status = 'draft' and published_at is null
  ) then raise exception 'A blocked achievement republication did not preserve its draft state.'; end if;
end;
$$;

rollback;
