alter table public.organization_contacts
  add column url text;

alter table public.organization_contacts
  add constraint organization_contacts_url_https
  check (url is null or url ~ '^https://');
