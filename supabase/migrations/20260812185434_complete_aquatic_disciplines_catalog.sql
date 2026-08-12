alter table public.disciplines
  add column sort_order smallint not null default 0;

with aquatics as (
  select id from public.sports where code = 'aquatics'
)
insert into public.disciplines (sport_id, code, name, sort_order, is_active)
select aquatics.id, catalog.code, catalog.name, catalog.sort_order, true
from aquatics
cross join (values
  ('swimming', 'Natación', 10),
  ('open-water', 'Aguas Abiertas', 20),
  ('water-polo', 'Water Polo', 30),
  ('artistic-swimming', 'Nado Sincronizado', 40),
  ('diving', 'Saltos Ornamentales', 50)
) as catalog(code, name, sort_order)
on conflict (code) do update set
  sport_id = excluded.sport_id,
  name = excluded.name,
  sort_order = excluded.sort_order,
  is_active = true;
