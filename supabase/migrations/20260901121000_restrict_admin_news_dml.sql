revoke insert, update, delete on table public.news_articles from authenticated;

grant select,
insert,
update,
delete on table public.news_articles to service_role;
