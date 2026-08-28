do $$
begin
  if exists (select 1 from public.competitions where calendar_id is null) then
    raise exception 'Competitions without a calendar remain; calendar_id cannot be enforced.';
  end if;
end;
$$;

alter table public.competitions
  alter column calendar_id set not null;
