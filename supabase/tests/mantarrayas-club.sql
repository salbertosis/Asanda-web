do $$
declare
  club public.organizations%rowtype;
begin
  select * into strict club
  from public.organizations
  where slug = 'mantarrayas-swimming-club';

  if club.organization_type <> 'club'
    or club.name <> 'Mantarrayas Swimming Club'
    or club.short_name <> 'MANSC'
    or club.founded_year <> 2020
    or club.publication_status <> 'published'
    or club.description not like 'Fundado el 15 de enero de 2020.%'
    or club.description not like '%Donde rendirse no es una opción.'
  then
    raise exception 'Mantarrayas Swimming Club publication data is incomplete';
  end if;
end;
$$;
