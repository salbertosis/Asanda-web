create or replace function private.enforce_athlete_details_required()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.athletes where id = new.id
  ) and not exists (
    select 1 from private.athlete_details where athlete_id = new.id
  )
  then
    raise exception 'Every athlete requires private identity details in the same transaction.';
  end if;

  return new;
end;
$$;
