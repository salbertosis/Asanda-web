alter table private.athlete_details
  add column national_id_hash text;

alter table private.athlete_details
  alter column date_of_birth set not null,
  alter column national_id_last4 set not null,
  alter column national_id_hash set not null;

alter table private.athlete_details
  add constraint athlete_details_national_id_hash_format
  check (national_id_hash ~ '^[0-9a-f]{64}$'),
  add constraint athlete_details_national_id_hash_unique
  unique (national_id_hash);

comment on column private.athlete_details.national_id_hash is
  'SHA-256 of the normalized national ID. Used only for uniqueness checks.';

create or replace function private.enforce_athlete_details_required()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from private.athlete_details
    where athlete_id = new.id
  )
  then
    raise exception 'Every athlete requires private identity details in the same transaction.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_athlete_details_required() from public, anon, authenticated;

create constraint trigger enforce_athlete_details_required
after insert or update on public.athletes
deferrable initially deferred
for each row execute function private.enforce_athlete_details_required();
