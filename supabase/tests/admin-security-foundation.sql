do $$
declare
  editor_id uuid;
  test_article_id uuid;
  blocked boolean;
  affected integer;
  audited boolean;
  audit_start_id bigint := 0;
begin
  if to_regclass('private.admin_audit_log') is not null then
    execute 'select coalesce(max(id), 0) from private.admin_audit_log' into audit_start_id;
  end if;

  select id into strict editor_id
  from public.profiles
  where display_name = 'Editor Staging' and role = 'editor' and is_active;

  if not exists (
    select 1 from public.profiles
    where display_name = 'Administrador Staging' and role = 'administrator' and is_active
  ) then
    raise exception 'Active staging administrator fixture is missing.';
  end if;

  execute 'set local role anon';
  blocked := false;
  begin
    insert into public.news_articles (slug, title)
    values ('anonymous-security-test', 'Unauthorized security test');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'Anonymous news insert was accepted.'; end if;
  execute 'reset role';

  update public.profiles set is_active = false where id = editor_id;
  perform set_config('request.jwt.claim.sub', editor_id::text, true);
  execute 'set local role authenticated';
  blocked := false;
  begin
    insert into public.news_articles (slug, title)
    values ('inactive-editor-security-test', 'Unauthorized security test');
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'Inactive editor news insert was accepted.'; end if;
  execute 'reset role';

  update public.profiles set is_active = true where id = editor_id;
  execute 'set local role authenticated';
  insert into public.news_articles (slug, title)
  values ('active-editor-audit-test', 'Audited editor mutation')
  returning id into test_article_id;

  update public.profiles set role = 'administrator' where id = editor_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Editor was allowed to escalate a profile role.'; end if;

  blocked := false;
  begin
    perform 1 from private.admin_audit_log limit 1;
  exception when insufficient_privilege then
    blocked := true;
  end;
  if not blocked then raise exception 'Editor was allowed to read the private audit log.'; end if;
  execute 'reset role';

  if to_regclass('private.admin_audit_log') is null then
    raise exception 'Immutable admin audit storage is missing.';
  end if;

  execute $audit$
    select exists (
      select 1 from private.admin_audit_log
      where actor_id = $1
        and entity_table = 'news_articles'
        and entity_id = $2
        and action = 'INSERT'
    )
  $audit$ into audited using editor_id, test_article_id::text;
  if not audited then raise exception 'Authorized content mutation was not audited.'; end if;

  delete from public.news_articles where id = test_article_id;
  execute 'delete from private.admin_audit_log where id > $1' using audit_start_id;
end;
$$;
