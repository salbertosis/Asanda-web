insert into public.organizations (
  organization_type,
  name,
  short_name,
  slug,
  description,
  founded_year,
  publication_status
)
values (
  'club',
  'Mantarrayas Swimming Club',
  'MANSC',
  'mantarrayas-swimming-club',
  'Fundado el 15 de enero de 2020. Club de formación y alto rendimiento, donde se forma a un atleta integral con principios deportivos y humanistas. Donde rendirse no es una opción.',
  2020,
  'published'
)
on conflict (slug) do update
set
  organization_type = excluded.organization_type,
  name = excluded.name,
  short_name = excluded.short_name,
  description = excluded.description,
  founded_year = excluded.founded_year,
  publication_status = excluded.publication_status,
  updated_at = now();
