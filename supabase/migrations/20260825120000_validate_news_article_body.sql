alter table public.news_articles
  add constraint news_articles_body_max_length
    check (body is null or char_length(body) <= 20000),
  add constraint news_articles_body_no_html_tags
    check (body is null or body !~* '</?[a-z][^>]*>'),
  add constraint news_articles_body_no_javascript_scheme
    check (body is null or body !~* 'javascript[[:space:]]*:');
