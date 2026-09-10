begin;
do $$
declare
  editor_id uuid := gen_random_uuid();
  draft_id uuid;
  scheduled_id uuid;
  published_id uuid;
  media_id uuid;
  test_athlete uuid;
  expired_athlete uuid;
  feature_active uuid;
  feature_expired uuid;
  saved_article record;
  visible bigint;
  blocked boolean;
  violated_constraint text;

  audit_start_id bigint := coalesce((select max(id) from private.admin_audit_log), 0);
begin
  if has_function_privilege(
    'anon',
    'public.save_admin_news(uuid,bigint,text,text,text,text,text,uuid)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.save_admin_news(uuid,bigint,text,text,text,text,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'News RPC grants do not enforce the authenticated boundary.';
  end if;

  insert into auth.users (id) values (editor_id);
  insert into public.profiles (id, display_name, role, is_active)
  values (editor_id, 'Synthetic editorial editor', 'editor', true);

  execute 'set local role anon';
  blocked := false;
  begin
    perform public.set_admin_news_status(gen_random_uuid(), 1, 'archived', null);
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'Anonymous callers can invoke the news status RPC.'; end if;
  reset role;

  update public.profiles set is_active = false where id = editor_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    perform public.save_admin_news(
      null, null, 'test-inactive-news-rpc', 'Editor inactivo', null, null, null, null
    );
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'An inactive editor can invoke the news save RPC.'; end if;
  reset role;

  update public.profiles set is_active = true where id = editor_id;
  execute 'set local role authenticated';
  blocked := false;
  begin
    insert into public.news_articles (slug, title)
    values ('test-direct-news-dml', 'Bypass directo');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'An active editor can bypass News RPCs with direct DML.'; end if;
  if has_table_privilege('authenticated', 'public.news_articles', 'INSERT, UPDATE, DELETE') then
    raise exception 'Authenticated clients retain direct News DML privileges.';
  end if;
  if not has_table_privilege('anon', 'public.news_articles', 'SELECT')
    or not has_table_privilege('authenticated', 'public.news_articles', 'SELECT')
  then raise exception 'News read privileges were removed.'; end if;

  select * into strict saved_article from public.save_admin_news(
    null, null, 'test-borrador', 'Borrador de prueba', null, 'cuerpo', null, null
  );
  draft_id := saved_article.id;
  if saved_article.author_id <> editor_id or saved_article.revision <> 1
    or saved_article.publication_status <> 'draft'::public.publication_status
  then
    raise exception 'News creation did not derive author, revision, and draft lifecycle server-side.';
  end if;

  select * into strict saved_article from public.save_admin_news(
    draft_id, 1, 'test-borrador', 'Borrador actualizado', null, 'cuerpo', null, null
  );
  if saved_article.revision <> 2 or saved_article.author_id <> editor_id
    or saved_article.publication_status <> 'draft'::public.publication_status
  then raise exception 'News content save changed authority or lifecycle.'; end if;

  blocked := false;
  begin
    perform public.save_admin_news(
      draft_id, 1, 'test-borrador', 'Escritura obsoleta', null, 'cuerpo', null, null
    );
  exception when serialization_failure then
    blocked := true;
  end;
  if not blocked then raise exception 'A stale news revision was accepted.'; end if;

  select * into strict saved_article from public.set_admin_news_status(
    draft_id, 2, 'published', now() + interval '1 day'
  );
  select * into strict saved_article from public.set_admin_news_status(
    draft_id, 3, 'draft', null
  );
  if saved_article.revision <> 4 or saved_article.published_at is not null
    or saved_article.publication_status <> 'draft'::public.publication_status
  then raise exception 'Explicit news lifecycle transitions did not persist exactly.'; end if;
  reset role;

  insert into public.news_articles (slug, title, body, publication_status, published_at)
  values ('test-programada', 'Noticia programada', 'cuerpo', 'published', now() + interval '1 day') returning id into scheduled_id;
  insert into public.news_articles (slug, title, body, publication_status, published_at)
  values ('test-publicada', 'Noticia publicada', 'cuerpo', 'published', now() - interval '1 hour') returning id into published_id;

  update public.news_articles set body = null where id = draft_id;
  update public.news_articles set body = '' where id = draft_id;
  update public.news_articles set body = repeat('x', 20000) where id = draft_id;

  begin
    update public.news_articles set body = repeat('x', 20001) where id = draft_id;
    raise exception 'News body longer than 20,000 characters was accepted.';
  exception when check_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint <> 'news_articles_body_max_length' then
      raise exception 'Unexpected constraint rejected the oversized news body: %.', violated_constraint;
    end if;
  end;

  begin
    update public.news_articles set body = E'texto <script>\nalert(1)</script>' where id = draft_id;
    raise exception 'News body with an HTML tag was accepted.';
  exception when check_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint <> 'news_articles_body_no_html_tags' then
      raise exception 'Unexpected constraint rejected the HTML news body: %.', violated_constraint;
    end if;
  end;

  begin
    update public.news_articles set body = E'mira javascript\t:alert(1)' where id = draft_id;
    raise exception 'News body with a javascript scheme was accepted.';
  exception when check_violation then
    get stacked diagnostics violated_constraint = constraint_name;
    if violated_constraint <> 'news_articles_body_no_javascript_scheme' then
      raise exception 'Unexpected constraint rejected the javascript news body: %.', violated_constraint;
    end if;
  end;

  update public.news_articles set body = 'cuerpo' where id = draft_id;
  insert into public.media_assets (provider, public_id, resource_type, format, is_public)
  values ('cloudinary', 'contract-test-image', 'image', 'jpg', true) returning id into media_id;
  insert into public.athletes (display_name) values ('Content contract test') returning id into test_athlete;
  insert into public.athletes (display_name) values ('Content contract test expired') returning id into expired_athlete;
  reset role;
  insert into private.athlete_details (athlete_id, date_of_birth, national_id_hash, national_id_last4)
  values (test_athlete, date '2000-01-01', encode(extensions.digest(test_athlete::text, 'sha256'), 'hex'), '0000'),
         (expired_athlete, date '2000-01-02', encode(extensions.digest(expired_athlete::text, 'sha256'), 'hex'), '0001');
  execute 'set local role authenticated';
  insert into public.athlete_consents (athlete_id, consent_type, status, granted_at)
  values (test_athlete, 'public_profile', 'granted', now()),
    (test_athlete, 'results_publication', 'granted', now()),
    (expired_athlete, 'public_profile', 'granted', now()),
    (expired_athlete, 'results_publication', 'granted', now());
  update public.athletes set publication_status = 'published' where id in (test_athlete, expired_athlete);
  insert into public.featured_athletes (athlete_id, display_order, starts_at, ends_at)
  values (test_athlete, 1, now() - interval '1 day', null) returning id into feature_active;
  insert into public.featured_athletes (athlete_id, display_order, starts_at, ends_at)
  values (expired_athlete, 2, now() - interval '2 days', now() - interval '1 day') returning id into feature_expired;
  reset role;

  set role anon;
  select count(*) into visible from public.news_articles where id in (draft_id, scheduled_id, published_id);
  if visible <> 1 then raise exception 'Anonymous clients see drafts or scheduled articles: % visible.', visible; end if;
  select count(*) into visible from public.media_assets where id = media_id;
  if visible <> 0 then raise exception 'Anonymous clients see an unlinked media asset.'; end if;
  select count(*) into visible
  from public.featured_athletes f
  join public.athletes a on a.id = f.athlete_id
  where a.display_name like 'Content contract test%';
  if visible <> 1 then raise exception 'Anonymous clients see expired featured windows: % visible.', visible; end if;
  reset role;

  delete from public.featured_athletes where id in (feature_active, feature_expired);
  delete from public.athletes where id in (test_athlete, expired_athlete);
  delete from public.media_assets where id = media_id;
  delete from public.news_articles where id in (draft_id, scheduled_id, published_id);
  delete from private.admin_audit_log where id > audit_start_id;
end;
$$;
rollback;
