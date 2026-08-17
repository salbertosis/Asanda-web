create table private.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  entity_schema text not null,
  entity_table text not null,
  entity_id text not null,
  transaction_id bigint not null default txid_current(),
  occurred_at timestamptz not null default now()
);

create index admin_audit_log_actor_time_idx
  on private.admin_audit_log (actor_id, occurred_at desc);
create index admin_audit_log_entity_idx
  on private.admin_audit_log (entity_table, entity_id, occurred_at desc);

revoke all on private.admin_audit_log from public, anon, authenticated;
grant select on private.admin_audit_log to service_role;

create or replace function private.capture_admin_audit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  resolved_id text;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  resolved_id := coalesce(
    row_data ->> 'id',
    nullif(concat_ws(':',
      row_data ->> 'athlete_id',
      row_data ->> 'organization_id',
      row_data ->> 'discipline_id',
      row_data ->> 'user_id'
    ), '')
  );

  if resolved_id is null then
    raise exception 'Audited table %.% has no supported entity identifier.', tg_table_schema, tg_table_name;
  end if;

  insert into private.admin_audit_log (
    actor_id,
    action,
    entity_schema,
    entity_table,
    entity_id
  ) values (
    auth.uid(),
    tg_op,
    tg_table_schema,
    tg_table_name,
    resolved_id
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function private.capture_admin_audit() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'media_assets', 'organizations', 'organization_contacts', 'profiles',
    'athletes', 'athlete_consents', 'athlete_memberships', 'athlete_category_assignments',
    'athlete_disciplines', 'venues', 'competitions', 'competition_events',
    'entries', 'performances', 'records', 'awards', 'news_articles', 'videos',
    'photo_albums', 'photos'
  ]
  loop
    execute format(
      'create trigger audit_admin_mutation after insert or update or delete on public.%I for each row execute function private.capture_admin_audit()',
      table_name
    );
  end loop;
end;
$$;
