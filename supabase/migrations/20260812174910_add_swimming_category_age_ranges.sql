alter table public.age_categories
  add column age_range int4range generated always as (
    int4range(minimum_age, maximum_age + 1, '[)')
  ) stored;

alter table public.age_categories
  add constraint age_categories_no_active_overlap
  exclude using gist (age_range with &&)
  where (is_active and minimum_age is not null);

update public.age_categories
set
  minimum_age = case code
    when 'pre-infant-a' then 4
    when 'pre-infant-b' then 8
    when 'pre-infant-c' then 9
    when 'infant-a' then 10
    when 'infant-b' then 12
    when 'youth-a' then 14
    when 'youth-b' then 16
    when 'maximum' then 19
  end,
  maximum_age = case code
    when 'pre-infant-a' then 7
    when 'pre-infant-b' then 8
    when 'pre-infant-c' then 9
    when 'infant-a' then 11
    when 'infant-b' then 13
    when 'youth-a' then 15
    when 'youth-b' then 18
    when 'maximum' then null
  end,
  name = case code
    when 'maximum' then 'Máxima / Abierta (Open)'
    else name
  end
where code in (
  'pre-infant-a',
  'pre-infant-b',
  'pre-infant-c',
  'infant-a',
  'infant-b',
  'youth-a',
  'youth-b',
  'maximum'
);
