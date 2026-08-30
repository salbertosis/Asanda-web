create table public.athlete_achievements (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  achievement_type text not null
    check (achievement_type in ('national_podium', 'international_medal', 'national_team')),
  title text not null check (btrim(title) <> '' and char_length(title) <= 180),
  competition_name text check (competition_name is null or (btrim(competition_name) <> '' and char_length(competition_name) <= 180)),
  medal text check (medal is null or medal in ('gold', 'silver', 'bronze')),
  place smallint check (place is null or place between 1 and 3),
  achieved_on date,
  valid_from date,
  valid_to date,
  publication_status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or (valid_from is not null and valid_to >= valid_from)),
  check (
    (achievement_type = 'national_podium' and competition_name is not null and place is not null and medal is null and achieved_on is not null and valid_from is null and valid_to is null)
    or (achievement_type = 'international_medal' and competition_name is not null and medal is not null and place is null and achieved_on is not null and valid_from is null and valid_to is null)
    or (achievement_type = 'national_team' and medal is null and place is null and achieved_on is null and valid_from is not null)
  ),
  check (
    (publication_status = 'published' and published_at is not null)
    or (publication_status <> 'published' and published_at is null)
  )
);

create index athlete_achievements_public_idx
  on public.athlete_achievements (athlete_id, achievement_type, achieved_on desc, valid_from desc)
  where publication_status = 'published';
create index athlete_achievements_source_idx
  on public.athlete_achievements (source_document_id);

create or replace function private.enforce_athlete_achievement_publication()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.publication_status = 'published' and not exists (
    select 1 from public.source_documents document
    where document.id = new.source_document_id
      and document.status = 'processed'
      and document.approval_status = 'approved'
  ) then
    raise exception 'Published athlete achievements require an approved source document.';
  end if;

  if new.publication_status = 'published' and not exists (
    select 1 from public.athletes athlete
    where athlete.id = new.athlete_id
      and athlete.publication_status = 'published'
      and private.has_active_consent(athlete.id, 'public_profile')
      and private.has_active_consent(athlete.id, 'results_publication')
  ) then
    raise exception 'Published athlete achievements require a published athlete and active public-profile and results consent.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_athlete_achievement_publication() from public, anon, authenticated;

create trigger enforce_athlete_achievement_publication
before insert or update of athlete_id, source_document_id, publication_status on public.athlete_achievements
for each row execute function private.enforce_athlete_achievement_publication();

create trigger set_updated_at
before update on public.athlete_achievements
for each row execute function private.set_updated_at();

create trigger audit_admin_mutation
after insert or update or delete on public.athlete_achievements
for each row execute function private.capture_admin_audit();

alter table public.athlete_achievements enable row level security;

create policy "Content editors manage athlete achievements"
  on public.athlete_achievements for all to authenticated
  using ((select private.is_content_editor()))
  with check ((select private.is_content_editor()));

revoke all on public.athlete_achievements from public, anon;
grant select, insert, update, delete on public.athlete_achievements to authenticated;
