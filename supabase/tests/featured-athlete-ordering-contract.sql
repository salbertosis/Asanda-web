begin;

do $$
declare
  editor_id uuid := gen_random_uuid();
  viewer_id uuid := gen_random_uuid();
  athlete_id uuid;
  ineligible_id uuid;
  candidate_id uuid;
  featured_ids uuid[] := array[]::uuid[];
  moved public.featured_athletes;
  blocked boolean;
  i integer;
begin
  if (select data_type from information_schema.columns
      where table_schema = 'public' and table_name = 'featured_athletes'
        and column_name = 'display_order') <> 'integer'
  then raise exception 'Featured athlete order is not integer.'; end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.featured_athletes'::regclass
      and conname = 'featured_athletes_display_order_key'
      and condeferrable and condeferred
  ) then raise exception 'Featured athlete order uniqueness is not initially deferred.'; end if;
  if has_function_privilege('anon', 'public.append_featured_athlete(uuid,timestamptz,timestamptz)', 'EXECUTE')
    or has_function_privilege('anon', 'public.move_featured_athlete(uuid,text)', 'EXECUTE')
    or has_function_privilege('anon', 'public.list_featured_athlete_candidates()', 'EXECUTE')
  then raise exception 'Anonymous clients received featured athlete editor RPC access.'; end if;
  if not has_function_privilege('authenticated', 'public.append_featured_athlete(uuid,timestamptz,timestamptz)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.move_featured_athlete(uuid,text)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.list_featured_athlete_candidates()', 'EXECUTE')
  then raise exception 'Authenticated clients are missing featured athlete RPC access.'; end if;

  insert into auth.users (id) values (editor_id), (viewer_id);
  insert into public.profiles (id, display_name, role, is_active) values
    (editor_id, 'Featured ordering editor', 'editor', true),
    (viewer_id, 'Featured ordering viewer', 'viewer', true);
  delete from public.featured_athletes;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  for i in 1..8 loop
    execute 'reset role';
    insert into public.athletes (display_name)
    values ('Featured ordering athlete ' || lpad(i::text, 2, '0')) returning id into athlete_id;
    insert into public.athlete_consents (athlete_id, consent_type, status, granted_at) values
      (athlete_id, 'public_profile', 'granted', now()),
      (athlete_id, 'results_publication', 'granted', now());
    update public.athletes set publication_status = 'published' where id = athlete_id;
    execute 'set local role authenticated';
    select result.id into athlete_id
    from public.append_featured_athlete(athlete_id) result;
    featured_ids := array_append(featured_ids, athlete_id);
  end loop;

  if (select count(*) from public.featured_athletes) <> 8
    or (select max(display_order) from public.featured_athletes) <> 8
  then raise exception 'Append did not support more than six featured athletes.'; end if;
  if exists (select 1 from public.featured_athletes where display_order <= 0)
    or (select count(*) from public.featured_athletes) <>
       (select count(distinct display_order) from public.featured_athletes)
  then raise exception 'Featured athlete order is not positive and unique.'; end if;

  select * into moved from public.move_featured_athlete(featured_ids[1], 'up');
  if moved.display_order <> 1 then raise exception 'Moving the first athlete up was not a no-op.'; end if;
  select * into moved from public.move_featured_athlete(featured_ids[2], 'up');
  if moved.display_order <> 1
    or (select display_order from public.featured_athletes where id = featured_ids[1]) <> 2
  then raise exception 'Moving up did not swap deferred unique orders.'; end if;
  select * into moved from public.move_featured_athlete(featured_ids[2], 'down');
  if moved.display_order <> 2
    or (select display_order from public.featured_athletes where id = featured_ids[1]) <> 1
  then raise exception 'Moving down did not restore adjacent orders.'; end if;
  select * into moved from public.move_featured_athlete(featured_ids[8], 'down');
  if moved.display_order <> 8 then raise exception 'Moving the last athlete down was not a no-op.'; end if;

  execute 'reset role';
  update public.athlete_consents ac set status = 'withdrawn', granted_at = null
  where ac.athlete_id = (select fa.athlete_id from public.featured_athletes fa where fa.id = featured_ids[1])
    and ac.consent_type = 'results_publication';
  execute 'set local role anon';
  if exists (select 1 from public.featured_athletes where id = featured_ids[1])
  then raise exception 'Public featured policy ignored shared eligibility.'; end if;

  execute 'reset role';
  insert into public.athletes (display_name) values ('Ineligible featured ordering athlete') returning id into ineligible_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (ineligible_id, 'public_profile', 'granted', now());
  update public.athletes set publication_status = 'published' where id = ineligible_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.append_featured_athlete(ineligible_id);
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'An athlete without results consent was featured.'; end if;

  execute 'reset role';
  insert into public.athletes (display_name) values ('Eligible featured ordering candidate') returning id into candidate_id;
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at) values
    (candidate_id, 'public_profile', 'granted', now()),
    (candidate_id, 'results_publication', 'granted', now());
  update public.athletes set publication_status = 'published' where id = candidate_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  if not exists (select 1 from public.list_featured_athlete_candidates() where id = candidate_id)
    or exists (select 1 from public.list_featured_athlete_candidates()
      where id = ineligible_id or id = any(featured_ids))
  then raise exception 'Candidate listing did not apply shared eligibility and featured exclusion.'; end if;
  blocked := false;
  begin
    insert into public.featured_athletes (athlete_id, display_order) values (candidate_id, 1);
    set constraints public.featured_athletes_display_order_key immediate;
  exception when unique_violation then blocked := true; end;
  if not blocked then raise exception 'A duplicate featured athlete order was accepted.'; end if;
  blocked := false;
  begin
    insert into public.featured_athletes (athlete_id, display_order) values (candidate_id, 0);
  exception when check_violation then blocked := true; end;
  if not blocked then raise exception 'A non-positive featured athlete order was accepted.'; end if;

  perform set_config('request.jwt.claim.sub', viewer_id::text, true);
  blocked := false;
  begin
    perform public.append_featured_athlete(candidate_id);
  exception when insufficient_privilege then blocked := true; end;
  if not blocked then raise exception 'A viewer appended a featured athlete.'; end if;
  execute 'reset role';
end;
$$;

rollback;
