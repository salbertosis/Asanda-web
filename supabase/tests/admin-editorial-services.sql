do $$
declare
  editor_id uuid;
  draft_id uuid;
  scheduled_id uuid;
  published_id uuid;
  media_id uuid;
  test_athlete uuid;
  expired_athlete uuid;
  feature_active uuid;
  feature_expired uuid;
  visible bigint;
  audit_start_id bigint := coalesce((select max(id) from private.admin_audit_log), 0);
begin
  select id into strict editor_id from public.profiles where display_name = 'Editor Staging' and role = 'editor' and is_active;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';

  insert into public.news_articles (slug, title, body, publication_status, published_at)
  values ('test-borrador', 'Borrador de prueba', 'cuerpo', 'draft', null) returning id into draft_id;
  insert into public.news_articles (slug, title, body, publication_status, published_at)
  values ('test-programada', 'Noticia programada', 'cuerpo', 'published', now() + interval '1 day') returning id into scheduled_id;
  insert into public.news_articles (slug, title, body, publication_status, published_at)
  values ('test-publicada', 'Noticia publicada', 'cuerpo', 'published', now() - interval '1 hour') returning id into published_id;
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
  values (test_athlete, 'public_profile', 'granted', now()), (expired_athlete, 'public_profile', 'granted', now());
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