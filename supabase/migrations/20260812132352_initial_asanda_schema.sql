create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_role as enum ('administrator', 'editor', 'club_manager', 'viewer');
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.membership_type as enum ('federated', 'associated');
create type public.membership_status as enum ('pending', 'active', 'suspended', 'ended');
create type public.consent_status as enum ('pending', 'granted', 'withdrawn', 'expired');
create type public.competition_status as enum (
  'draft', 'scheduled', 'in_progress', 'completed', 'postponed', 'cancelled', 'archived'
);
create type public.result_status as enum (
  'provisional', 'official', 'disqualified', 'did_not_start', 'did_not_finish', 'no_time'
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('cloudinary', 'supabase', 'external', 'local')),
  public_id text,
  external_url text,
  resource_type text not null default 'image' check (resource_type in ('image', 'video', 'document')),
  format text,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes bigint check (bytes is null or bytes >= 0),
  alt_text text,
  credit text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (provider in ('cloudinary', 'supabase') and public_id is not null)
    or (provider in ('external', 'local') and external_url is not null)
  ),
  unique (provider, public_id)
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  organization_type text not null check (organization_type in ('association', 'club', 'federation')),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text,
  founded_year smallint check (founded_year is null or founded_year between 1800 and 2200),
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_type text not null check (contact_type in ('email', 'phone', 'address', 'website', 'social')),
  label text,
  value text not null,
  is_public boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role public.app_role not null default 'viewer',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_staff (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null check (role = 'club_manager'),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.athletes (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  preferred_name text,
  competitive_sex text check (competitive_sex in ('female', 'male', 'mixed', 'open')),
  birth_year_public smallint check (birth_year_public is null or birth_year_public between 1900 and 2200),
  photo_asset_id uuid references public.media_assets(id) on delete set null,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table private.athlete_details (
  athlete_id uuid primary key references public.athletes(id) on delete cascade,
  legal_given_names text,
  legal_family_names text,
  date_of_birth date,
  national_id_encrypted text,
  national_id_last4 text check (national_id_last4 is null or national_id_last4 ~ '^[0-9]{4}$'),
  guardian_name text,
  guardian_contact text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.athlete_consents (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  consent_type text not null check (
    consent_type in ('data_processing', 'public_profile', 'photo', 'results_publication')
  ),
  status public.consent_status not null default 'pending',
  granted_at timestamptz,
  expires_at timestamptz,
  document_asset_id uuid references public.media_assets(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (athlete_id, consent_type),
  check (expires_at is null or granted_at is null or expires_at > granted_at)
);

create table public.athlete_memberships (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete restrict,
  membership_type public.membership_type not null,
  status public.membership_status not null default 'pending',
  valid_from date not null,
  valid_to date,
  is_primary boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_to is null or valid_to >= valid_from)
);

create unique index athlete_one_primary_active_membership
  on public.athlete_memberships (athlete_id)
  where status = 'active' and is_primary and valid_to is null;

create table public.sports (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  is_active boolean not null default true
);

create table public.disciplines (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  code text not null unique,
  name text not null,
  is_active boolean not null default true
);

create table public.athlete_disciplines (
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  is_primary boolean not null default false,
  valid_from date,
  valid_to date,
  primary key (athlete_id, discipline_id),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.age_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  minimum_age smallint check (minimum_age is null or minimum_age >= 0),
  maximum_age smallint check (maximum_age is null or maximum_age >= 0),
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  check (maximum_age is null or minimum_age is null or maximum_age >= minimum_age),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  region text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.source_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in ('pdf', 'csv', 'html', 'xml', 'manual', 'api')),
  organization_id uuid references public.organizations(id) on delete set null,
  asset_id uuid references public.media_assets(id) on delete restrict,
  checksum text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'rejected', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_accepted integer not null default 0 check (rows_accepted >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  error_summary jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (rows_accepted + rows_rejected <= rows_received),
  check (completed_at is null or started_at is null or completed_at >= started_at)
);

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sport_id uuid not null references public.sports(id) on delete restrict,
  organizer_id uuid references public.organizations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  starts_on date not null,
  ends_on date,
  recognition_status text not null default 'pending'
    check (recognition_status in ('pending', 'recognized', 'unrecognized')),
  status public.competition_status not null default 'draft',
  description text,
  logo_asset_id uuid references public.media_assets(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.event_definitions (
  id uuid primary key default gen_random_uuid(),
  discipline_id uuid not null references public.disciplines(id) on delete restrict,
  code text not null unique,
  name text not null,
  distance_metres integer check (distance_metres is null or distance_metres > 0),
  stroke text,
  course text not null check (course in ('long_course', 'short_course', 'open_water', 'not_applicable')),
  relay_size smallint check (relay_size is null or relay_size > 1),
  is_active boolean not null default true
);

create table public.competition_events (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  event_definition_id uuid not null references public.event_definitions(id) on delete restrict,
  category_id uuid references public.age_categories(id) on delete restrict,
  competitive_sex text check (competitive_sex in ('female', 'male', 'mixed', 'open')),
  round text not null default 'timed_final'
    check (round in ('heat', 'semifinal', 'final', 'timed_final')),
  sequence_number integer not null check (sequence_number > 0),
  scheduled_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  unique (competition_id, sequence_number)
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  competition_event_id uuid not null references public.competition_events(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  represented_organization_id uuid references public.organizations(id) on delete set null,
  seed_time_ms bigint check (seed_time_ms is null or seed_time_ms > 0),
  lane smallint check (lane is null or lane > 0),
  status text not null default 'entered'
    check (status in ('entered', 'confirmed', 'withdrawn', 'did_not_start', 'disqualified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (competition_event_id, athlete_id)
);

create table public.performances (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null unique references public.entries(id) on delete cascade,
  time_ms bigint check (time_ms is null or time_ms > 0),
  place integer check (place is null or place > 0),
  status public.result_status not null default 'provisional',
  is_personal_best boolean not null default false,
  source_document_id uuid references public.source_documents(id) on delete set null,
  recorded_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status in ('provisional', 'official') and time_ms is not null)
    or status in ('disqualified', 'did_not_start', 'did_not_finish', 'no_time')
  )
);

create table public.qualification_standards (
  id uuid primary key default gen_random_uuid(),
  event_definition_id uuid not null references public.event_definitions(id) on delete restrict,
  category_id uuid not null references public.age_categories(id) on delete restrict,
  competitive_sex text not null check (competitive_sex in ('female', 'male', 'mixed', 'open')),
  governing_organization_id uuid references public.organizations(id) on delete set null,
  time_ms bigint not null check (time_ms > 0),
  valid_from date not null,
  valid_to date,
  check (valid_to is null or valid_to >= valid_from)
);

create table public.records (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null unique references public.performances(id) on delete restrict,
  scope_type text not null check (scope_type in ('club', 'state', 'national')),
  scope_organization_id uuid references public.organizations(id) on delete set null,
  ratification_status text not null default 'pending'
    check (ratification_status in ('pending', 'ratified', 'rejected', 'superseded')),
  ratified_at timestamptz,
  superseded_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table public.awards (
  id uuid primary key default gen_random_uuid(),
  athlete_id uuid not null references public.athletes(id) on delete restrict,
  competition_id uuid references public.competitions(id) on delete set null,
  performance_id uuid references public.performances(id) on delete set null,
  award_type text not null,
  place smallint check (place is null or place > 0),
  title text,
  awarded_on date,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.news_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  body text,
  category text,
  hero_asset_id uuid references public.media_assets(id) on delete set null,
  publication_status public.publication_status not null default 'draft',
  published_at timestamptz,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  description text,
  provider text not null check (provider in ('youtube', 'mux', 'cloudinary')),
  provider_video_id text not null,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  thumbnail_asset_id uuid references public.media_assets(id) on delete set null,
  publication_status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_video_id)
);

create table public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  description text,
  category text,
  competition_id uuid references public.competitions(id) on delete set null,
  event_date date,
  publication_status public.publication_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.photo_albums(id) on delete cascade,
  asset_id uuid not null references public.media_assets(id) on delete restrict,
  title text,
  caption text,
  sort_order integer not null default 0,
  publication_status public.publication_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (album_id, asset_id)
);

create table public.photo_athletes (
  photo_id uuid not null references public.photos(id) on delete cascade,
  athlete_id uuid not null references public.athletes(id) on delete cascade,
  primary key (photo_id, athlete_id)
);

create index athletes_publication_status_idx on public.athletes (publication_status);
create index memberships_athlete_idx on public.athlete_memberships (athlete_id, status);
create index memberships_organization_idx on public.athlete_memberships (organization_id, status);
create index competitions_dates_idx on public.competitions (starts_on, ends_on);
create index competition_events_competition_idx on public.competition_events (competition_id);
create index entries_athlete_idx on public.entries (athlete_id);
create index photos_album_order_idx on public.photos (album_id, sort_order);

create or replace function private.is_content_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role in ('administrator', 'editor')
  );
$$;

create or replace function private.has_active_consent(
  requested_athlete_id uuid,
  requested_consent_type text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.athlete_consents
    where athlete_id = requested_athlete_id
      and consent_type = requested_consent_type
      and status = 'granted'
      and (expires_at is null or expires_at > now())
  );
$$;

create or replace function private.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_active
      and role = 'administrator'
  );
$$;

revoke all on function private.is_content_editor() from public, anon, authenticated;
revoke all on function private.is_administrator() from public, anon, authenticated;
revoke all on function private.has_active_consent(uuid, text) from public, anon, authenticated;
grant usage on schema private to anon, authenticated;
grant execute on function private.is_content_editor() to authenticated;
grant execute on function private.is_administrator() to authenticated;
grant execute on function private.has_active_consent(uuid, text) to anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'media_assets', 'organizations', 'organization_contacts', 'profiles', 'athletes',
    'athlete_consents', 'athlete_memberships', 'venues', 'competitions', 'entries',
    'performances', 'source_documents', 'awards', 'news_articles', 'videos', 'photo_albums'
  ]
  loop
    execute format(
      'create trigger set_updated_at before update on public.%I for each row execute function private.set_updated_at()',
      table_name
    );
  end loop;
end;
$$;

create trigger set_updated_at
before update on private.athlete_details
for each row execute function private.set_updated_at();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'media_assets', 'organizations', 'organization_contacts', 'profiles', 'organization_staff',
    'athletes', 'athlete_consents', 'athlete_memberships', 'sports', 'disciplines',
    'athlete_disciplines', 'age_categories', 'venues', 'competitions', 'event_definitions',
    'source_documents', 'import_batches', 'competition_events', 'entries', 'performances',
    'qualification_standards', 'records', 'awards',
    'news_articles', 'videos', 'photo_albums', 'photos', 'photo_athletes'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy "Published linked media is readable"
  on public.media_assets for select using (
    is_public and (
      exists (select 1 from public.organizations where organizations.logo_asset_id = media_assets.id)
      or exists (select 1 from public.athletes where athletes.photo_asset_id = media_assets.id)
      or exists (select 1 from public.competitions where competitions.logo_asset_id = media_assets.id)
      or exists (select 1 from public.news_articles where news_articles.hero_asset_id = media_assets.id)
      or exists (select 1 from public.videos where videos.thumbnail_asset_id = media_assets.id)
      or exists (select 1 from public.photos where photos.asset_id = media_assets.id)
    )
  );
create policy "Published organizations are readable"
  on public.organizations for select using (publication_status = 'published');
create policy "Approved contacts are readable"
  on public.organization_contacts for select using (
    is_public and exists (
      select 1 from public.organizations
      where organizations.id = organization_id
        and organizations.publication_status = 'published'
    )
  );
create policy "Published athletes with profile consent are readable"
  on public.athletes for select using (
    publication_status = 'published'
    and (select private.has_active_consent(id, 'public_profile'))
    and (
      photo_asset_id is null
      or (select private.has_active_consent(id, 'photo'))
    )
  );
create policy "Public athlete consents are internally readable for RLS"
  on public.athlete_consents for select using (false);
create policy "Active public memberships are readable"
  on public.athlete_memberships for select using (
    status = 'active'
    and (valid_to is null or valid_to >= current_date)
    and exists (select 1 from public.athletes where athletes.id = athlete_id)
    and exists (select 1 from public.organizations where organizations.id = organization_id)
  );
create policy "Reference sports are readable" on public.sports for select using (is_active);
create policy "Reference disciplines are readable" on public.disciplines for select using (is_active);
create policy "Public athlete disciplines are readable"
  on public.athlete_disciplines for select using (
    exists (select 1 from public.athletes where athletes.id = athlete_id)
  );
create policy "Reference categories are readable" on public.age_categories for select using (is_active);
create policy "Venues are readable" on public.venues for select using (true);
create policy "Published competitions are readable"
  on public.competitions for select using (published_at is not null and status <> 'draft');
create policy "Published competition events are readable"
  on public.competition_events for select using (
    exists (select 1 from public.competitions where competitions.id = competition_id)
  );
create policy "Published entries are readable"
  on public.entries for select using (
    exists (select 1 from public.competition_events where competition_events.id = competition_event_id)
    and exists (select 1 from public.athletes where athletes.id = athlete_id)
  );
create policy "Official performances are readable"
  on public.performances for select using (
    status = 'official'
    and exists (select 1 from public.entries where entries.id = entry_id)
  );
create policy "Event definitions are readable" on public.event_definitions for select using (is_active);
create policy "Qualification standards are readable"
  on public.qualification_standards for select using (valid_from <= current_date);
create policy "Ratified records are readable"
  on public.records for select using (ratification_status = 'ratified');
create policy "Published awards are readable"
  on public.awards for select using (
    publication_status = 'published'
    and exists (select 1 from public.athletes where athletes.id = athlete_id)
  );
create policy "Published news is readable"
  on public.news_articles for select using (
    publication_status = 'published' and published_at <= now()
  );
create policy "Published videos are readable"
  on public.videos for select using (
    publication_status = 'published' and published_at <= now()
  );
create policy "Published albums are readable"
  on public.photo_albums for select using (
    publication_status = 'published' and published_at <= now()
  );
create policy "Published photos are readable"
  on public.photos for select using (
    publication_status = 'published'
    and exists (select 1 from public.photo_albums where photo_albums.id = album_id)
  );
create policy "Published photo athlete links are readable"
  on public.photo_athletes for select using (
    exists (select 1 from public.photos where photos.id = photo_id)
    and exists (select 1 from public.athletes where athletes.id = athlete_id)
  );

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'media_assets', 'organizations', 'organization_contacts', 'athletes', 'athlete_consents',
    'athlete_memberships', 'sports', 'disciplines', 'athlete_disciplines', 'age_categories',
    'venues', 'source_documents', 'import_batches', 'competitions', 'event_definitions',
    'competition_events', 'entries', 'performances', 'qualification_standards', 'records', 'awards',
    'news_articles', 'videos',
    'photo_albums', 'photos', 'photo_athletes'
  ]
  loop
    execute format(
      'create policy "Content editors manage %1$s" on public.%1$I for all to authenticated using ((select private.is_content_editor())) with check ((select private.is_content_editor()))',
      table_name
    );
  end loop;
end;
$$;

create policy "Users read their profile"
  on public.profiles for select to authenticated using (id = (select auth.uid()) or (select private.is_administrator()));
create policy "Administrators manage profiles"
  on public.profiles for all to authenticated
  using ((select private.is_administrator()))
  with check ((select private.is_administrator()));
create policy "Administrators manage organization staff"
  on public.organization_staff for all to authenticated
  using ((select private.is_administrator()))
  with check ((select private.is_administrator()));

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

revoke all on private.athlete_details from public, anon, authenticated;
grant usage on schema private to service_role;
grant all on private.athlete_details to service_role;

insert into public.sports (code, name) values
  ('aquatics', 'Deportes acuáticos');

insert into public.disciplines (sport_id, code, name)
select id, 'swimming', 'Natación' from public.sports where code = 'aquatics'
union all
select id, 'open-water', 'Aguas abiertas' from public.sports where code = 'aquatics'
union all
select id, 'water-polo', 'Polo acuático' from public.sports where code = 'aquatics';
