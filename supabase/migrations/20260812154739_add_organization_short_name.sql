alter table public.organizations
  add column short_name text;

alter table public.organizations
  add constraint organizations_short_name_length
  check (short_name is null or char_length(short_name) between 2 and 20);

create unique index organizations_short_name_unique
  on public.organizations (lower(short_name))
  where short_name is not null;
