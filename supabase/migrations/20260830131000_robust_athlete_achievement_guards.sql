-- Complete the grouped invariants for installations that already applied the foundation migration.
create or replace function private.enforce_athlete_achievement_group_children()
returns trigger language plpgsql security definer set search_path = '' as $$
declare checked_group_id uuid;
begin
  if tg_table_name = 'athlete_achievement_groups' then
    if tg_op = 'DELETE' then return null; end if;
    checked_group_id := new.id;
    if exists (select 1 from public.athlete_achievement_groups g where g.id = checked_group_id) and not exists (select 1 from public.athlete_achievement_results r where r.group_id = checked_group_id) then raise exception 'Cada competencia debe conservar al menos un resultado.' using errcode = '23514'; end if;
  else
    if tg_op <> 'INSERT' then
      checked_group_id := old.group_id;
      if exists (select 1 from public.athlete_achievement_groups g where g.id = checked_group_id) and not exists (select 1 from public.athlete_achievement_results r where r.group_id = checked_group_id) then raise exception 'Cada competencia debe conservar al menos un resultado.' using errcode = '23514'; end if;
    end if;
    if tg_op <> 'DELETE' then
      checked_group_id := new.group_id;
      if exists (select 1 from public.athlete_achievement_groups g where g.id = checked_group_id) and not exists (select 1 from public.athlete_achievement_results r where r.group_id = checked_group_id) then raise exception 'Cada competencia debe conservar al menos un resultado.' using errcode = '23514'; end if;
    end if;
  end if;
  return null;
end;
$$;

create or replace function private.enforce_athlete_achievement_record_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.record_id is not null and not exists (
    select 1 from public.athlete_achievement_groups g join public.records record on record.id = new.record_id
    where g.id = new.group_id and record.athlete_id = g.athlete_id
  ) then raise exception 'El récord estatal debe pertenecer al mismo atleta.' using errcode = '23514'; end if;
  return new;
end;
$$;

drop trigger if exists athlete_achievement_groups_require_child on public.athlete_achievement_groups;
create constraint trigger athlete_achievement_groups_require_child after insert or update on public.athlete_achievement_groups
deferrable initially deferred for each row execute function private.enforce_athlete_achievement_group_children();
drop trigger if exists athlete_achievement_results_require_child on public.athlete_achievement_results;
create constraint trigger athlete_achievement_results_require_child after insert or update or delete on public.athlete_achievement_results
deferrable initially deferred for each row execute function private.enforce_athlete_achievement_group_children();
drop trigger if exists athlete_achievement_result_owner on public.athlete_achievement_results;
create trigger athlete_achievement_result_owner before insert or update of group_id, record_id on public.athlete_achievement_results
for each row execute function private.enforce_athlete_achievement_record_owner();
revoke all on function private.enforce_athlete_achievement_group_children(), private.enforce_athlete_achievement_record_owner() from public, anon, authenticated;

create or replace function public.publish_athlete_achievement_group(requested_group_id uuid)
returns table (group_id uuid, publication_status public.publication_status, published_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare stored public.athlete_achievement_groups%rowtype; stored_athlete_id uuid; child_count integer;
begin
  if not private.is_administrator() then raise exception 'ACHIEVEMENT_UNAUTHORIZED' using errcode = '42501'; end if;
  select athlete_id into strict stored_athlete_id from public.athlete_achievement_groups where id = requested_group_id;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('asanda:athlete-achievement-groups:' || stored_athlete_id::text, 0));
  select * into strict stored from public.athlete_achievement_groups where id = requested_group_id for update;
  if stored.publication_status = 'published' then raise exception 'La competencia ya está publicada.' using errcode = '22023'; end if;
  select count(*) into child_count from public.athlete_achievement_results r where r.group_id = stored.id;
  if child_count = 0 then raise exception 'La competencia requiere al menos un resultado.' using errcode = '22023'; end if;
  if exists (select 1 from public.athlete_achievement_results r left join public.event_definitions e on e.id = r.event_definition_id where r.group_id = stored.id and (r.event_definition_id is null or e.is_active is not true or not exists (select 1 from public.disciplines d where d.id = e.discipline_id and d.code = 'swimming' and d.is_active and e.relay_size is null))) then raise exception 'Hay resultados sin evento activo del catálogo; corregilos antes de publicar.' using errcode = '23514'; end if;
  if stored.achievement_type in ('national_podium', 'international_podium') and exists (select 1 from public.athlete_achievement_results r where r.group_id = stored.id and (r.podium_place is null or r.participation_outcome is not null or r.record_id is not null)) then raise exception 'Los resultados de podio no son válidos.' using errcode = '23514'; end if;
  if stored.achievement_type = 'international_participation' and exists (select 1 from public.athlete_achievement_results r where r.group_id = stored.id and (r.participation_outcome is null or r.participation_outcome not in ('top_8', 'outstanding_participation') or r.podium_place is not null or r.record_id is not null)) then raise exception 'Los resultados de participación no son válidos.' using errcode = '23514'; end if;
  if stored.achievement_type = 'state_record' and exists (select 1 from public.athlete_achievement_results r left join public.records record on record.id = r.record_id where r.group_id = stored.id and (r.record_id is null or r.podium_place is not null or r.participation_outcome is not null or record.id is null or record.athlete_id is distinct from stored.athlete_id or record.scope_type <> 'state' or record.publication_status <> 'published' or record.published_at is null or record.published_at > now() or record.event_definition_id <> r.event_definition_id)) then raise exception 'El récord estatal debe seguir publicado y coincidir con su evento.' using errcode = '23514'; end if;
  if not exists (select 1 from public.athletes a where a.id = stored.athlete_id and a.publication_status = 'published' and private.has_active_consent(a.id, 'public_profile') and private.has_active_consent(a.id, 'results_publication')) then raise exception 'La publicación requiere un atleta publicado y ambos consentimientos de perfil y resultados.' using errcode = '23514'; end if;
  update public.athlete_achievement_groups as g set publication_status = 'published', published_at = now() where g.id = stored.id returning g.id, g.publication_status, g.published_at into group_id, publication_status, published_at;
  return next;
end;
$$;

create or replace function private.get_public_athlete_achievement_groups(requested_athlete_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
select coalesce(jsonb_agg(card order by achieved_on desc, group_id), '[]'::jsonb) from (
  select g.id group_id, g.achieved_on, jsonb_build_object('type', g.achievement_type, 'title', g.title, 'competitionName', g.competition_name, 'location', g.location, 'achievedOn', g.achieved_on, 'children', child.children) card
  from public.athlete_achievement_groups g cross join lateral (
    select count(*) filter (where eligible.valid) child_count, coalesce(jsonb_agg(jsonb_build_object('eventName', eligible.name, 'podiumPlace', eligible.podium_place, 'participationOutcome', eligible.participation_outcome, 'record', case when g.achievement_type = 'state_record' then jsonb_build_object('timeMs', eligible.time_ms, 'achievedYear', eligible.achieved_year, 'competitionName', eligible.competition_name_snapshot, 'categoryName', eligible.age_category_name_snapshot, 'competitiveSex', eligible.competitive_sex, 'course', eligible.course) end) order by eligible.code, eligible.id) filter (where eligible.valid), '[]'::jsonb) children
    from (select r.*, e.name, e.code, e.is_active, e.relay_size, record.athlete_id record_athlete_id, record.scope_type, record.publication_status record_status, record.published_at record_published_at, record.event_definition_id record_event, record.time_ms, record.achieved_year, record.competition_name_snapshot, record.age_category_name_snapshot, record.competitive_sex, record.course, ((e.id is not null and e.is_active and e.relay_size is null and exists (select 1 from public.disciplines d where d.id = e.discipline_id and d.code = 'swimming' and d.is_active)) and ((g.achievement_type in ('national_podium', 'international_podium') and r.podium_place in (1, 2, 3) and r.participation_outcome is null and r.record_id is null) or (g.achievement_type = 'international_participation' and r.participation_outcome in ('top_8', 'outstanding_participation') and r.podium_place is null and r.record_id is null) or (g.achievement_type = 'state_record' and r.record_id is not null and r.podium_place is null and r.participation_outcome is null and record.athlete_id = g.athlete_id and record.scope_type = 'state' and record.publication_status = 'published' and record.published_at is not null and record.published_at <= now() and record.event_definition_id = r.event_definition_id))) valid from public.athlete_achievement_results r left join public.event_definitions e on e.id = r.event_definition_id left join public.records record on record.id = r.record_id where r.group_id = g.id) eligible
  ) child
  where g.athlete_id = requested_athlete_id and g.publication_status = 'published' and g.published_at <= now() and child.child_count > 0
  order by g.achieved_on desc, g.id limit 6
) cards;
$$;
