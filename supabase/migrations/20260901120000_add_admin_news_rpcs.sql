alter table public.news_articles
  add column revision bigint not null default 1,
  add constraint news_articles_revision_positive check (revision > 0);

create or replace function private.bump_news_revision()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.revision := old.revision + 1;
  return new;
end;
$$;

revoke all on function private.bump_news_revision() from public, anon, authenticated;

create trigger bump_news_revision
before update on public.news_articles
for each row execute function private.bump_news_revision();

create or replace function public.save_admin_news(
  requested_article_id uuid,
  requested_expected_revision bigint,
  requested_slug text,
  requested_title text,
  requested_summary text,
  requested_body text,
  requested_category text,
  requested_hero_asset_id uuid
)
returns public.news_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.news_articles;
begin
  if not private.is_content_editor() then
    raise exception 'NEWS_UNAUTHORIZED' using errcode = '42501';
  end if;
  if requested_title is null or char_length(btrim(requested_title)) not between 3 and 120
    or requested_slug is null or btrim(requested_slug) !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
    or char_length(coalesce(btrim(requested_summary), '')) > 280
    or char_length(coalesce(btrim(requested_category), '')) > 40
    or char_length(coalesce(requested_body, '')) > 20000
  then
    raise exception 'NEWS_INVALID' using errcode = '22023';
  end if;

  if requested_article_id is null then
    if requested_expected_revision is not null then
      raise exception 'NEWS_REVISION_INVALID' using errcode = '22023';
    end if;
    insert into public.news_articles (
      slug, title, summary, body, category, hero_asset_id, publication_status, author_id
    ) values (
      btrim(requested_slug), btrim(requested_title), nullif(btrim(requested_summary), ''),
      requested_body, nullif(btrim(requested_category), ''), requested_hero_asset_id,
      'draft', auth.uid()
    ) returning * into stored;
  else
    if requested_expected_revision is null or requested_expected_revision < 1 then
      raise exception 'NEWS_REVISION_INVALID' using errcode = '22023';
    end if;
    update public.news_articles article set
      slug = btrim(requested_slug),
      title = btrim(requested_title),
      summary = nullif(btrim(requested_summary), ''),
      body = requested_body,
      category = nullif(btrim(requested_category), ''),
      hero_asset_id = requested_hero_asset_id
    where article.id = requested_article_id
      and article.revision = requested_expected_revision
    returning article.* into stored;
    if not found then
      raise exception 'NEWS_REVISION_CONFLICT' using errcode = '40001';
    end if;
  end if;

  return stored;
end;
$$;

create or replace function public.set_admin_news_status(
  requested_article_id uuid,
  requested_expected_revision bigint,
  requested_status text,
  requested_published_at timestamptz
)
returns public.news_articles
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored public.news_articles;
begin
  if not private.is_content_editor() then
    raise exception 'NEWS_UNAUTHORIZED' using errcode = '42501';
  end if;
  if requested_article_id is null
    or requested_expected_revision is null or requested_expected_revision < 1
    or requested_status is null or requested_status not in ('draft', 'published', 'archived')
    or (requested_status = 'published' and requested_published_at is null)
    or (requested_status <> 'published' and requested_published_at is not null)
  then
    raise exception 'NEWS_STATUS_INVALID' using errcode = '22023';
  end if;

  update public.news_articles article set
    publication_status = requested_status::public.publication_status,
    published_at = case
      when requested_status = 'draft' then null
      when requested_status = 'published' then requested_published_at
      else article.published_at
    end
  where article.id = requested_article_id
    and article.revision = requested_expected_revision
  returning article.* into stored;
  if not found then
    raise exception 'NEWS_REVISION_CONFLICT' using errcode = '40001';
  end if;

  return stored;
end;
$$;

revoke all on function public.save_admin_news(uuid,bigint,text,text,text,text,text,uuid)
  from public, anon, authenticated;
revoke all on function public.set_admin_news_status(uuid,bigint,text,timestamptz)
  from public, anon, authenticated;
grant execute on function public.save_admin_news(uuid,bigint,text,text,text,text,text,uuid)
  to authenticated;
grant execute on function public.set_admin_news_status(uuid,bigint,text,timestamptz)
  to authenticated;
