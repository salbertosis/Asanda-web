do $$
declare
  result jsonb;
  expected_keys text[] := array[
    'asOf',
    'associatedAthletes',
    'clubs',
    'federatedAthletes',
    'preinfantAthletes'
  ];
  actual_keys text[];
begin
  result := public.get_homepage_stats();

  select array_agg(key order by key)
  into actual_keys
  from jsonb_object_keys(result) as key;

  if actual_keys <> expected_keys then
    raise exception 'Unexpected homepage statistics keys: %', actual_keys;
  end if;

  if (result->>'clubs')::integer < 0
    or (result->>'associatedAthletes')::integer < 0
    or (result->>'federatedAthletes')::integer < 0
    or (result->>'preinfantAthletes')::integer < 0
  then
    raise exception 'Homepage statistics cannot be negative.';
  end if;

  if (result->>'federatedAthletes')::integer > (result->>'associatedAthletes')::integer then
    raise exception 'Federated count cannot exceed associated count.';
  end if;

  if result::text ~* 'athlete_id|display_name|date_of_birth|national_id' then
    raise exception 'Homepage statistics leaked identity fields.';
  end if;
end;
$$;
