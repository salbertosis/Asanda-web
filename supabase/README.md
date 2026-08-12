# Create the ASANDA Supabase database

The repository now contains a reproducible Supabase migration. The recommended path is to create an empty hosted project and apply `supabase/migrations/20260812132352_initial_asanda_schema.sql` through the CLI.

## Quick path

1. Create the hosted Supabase project.
2. Link this repository to it.
3. Push the migration.
4. Create the first administrator safely.
5. Add only the browser-safe project URL and publishable key to Vercel.

## 1. Create the project

1. Open <https://supabase.com/dashboard>.
2. Select **New project**.
3. Choose your organization.
4. Use `asanda-web` as the project name.
5. Generate a strong database password and store it in a password manager.
6. Choose the region closest to the majority of ASANDA users. Do not choose based only on the dashboard default.
7. Select the plan appropriate for the current stage and create the project.
8. Wait until the project reports that it is ready.

Never paste the database password, secret key, or service-role key into chat, Git, React, or a `VITE_*` variable.

## 2. Link the repository

From the repository root, run:

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list
```

Find `YOUR_PROJECT_REF` in **Project Settings > General > Reference ID**. Login opens a browser or requests a personal access token; do not commit that token.

## 3. Apply the schema

Review the target project name, then run:

```powershell
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Expected result: migration `20260812132352` appears as applied remotely.

If CLI linking is unavailable, open **SQL Editor**, create a new query, paste the complete migration file, and run it once. The CLI remains preferable because it preserves deployment history.

## 4. Verify the database

In **Table Editor**, verify that these tables exist:

- `athletes`
- `media_assets`
- `organizations`
- `athlete_memberships`
- `athlete_consents`
- `competitions`
- `competition_events`
- `entries`
- `performances`
- `source_documents`
- `import_batches`
- `awards`
- `news_articles`
- `videos`
- `photo_albums`
- `photos`

In **Authentication > Policies**, verify that RLS is enabled. Do not disable RLS to solve an access problem; fix the applicable policy.

The restricted `private.athlete_details` table should not appear as a browser-accessible Data API resource.

## 5. Create the first administrator

1. Open **Authentication > Users**.
2. Create or invite the administrator account.
3. Copy that user's UUID, not their email password.
4. Open **SQL Editor** and run the following once, replacing both values:

```sql
insert into public.profiles (id, display_name, role)
values ('AUTH_USER_UUID', 'Administrator name', 'administrator');
```

After this bootstrap, build a reviewed administration flow before delegating role management. Do not add a public policy that lets users choose their own role.

## 6. Get browser-safe credentials

Open **Project Settings > API** and copy only:

- Project URL
- Publishable key

Create a local `.env.local` file that is not committed:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Add the same names in **Vercel > Project > Settings > Environment Variables**.

The publishable key is designed for browsers and is constrained by RLS. The secret/service-role key bypasses RLS and belongs only in trusted server-side functions if they are added later.

The React client is intentionally not installed or connected by this database-design change. Add `@supabase/supabase-js` when the first read path is migrated from `src/data/`.

## 7. Register the first athlete photo

For the existing Cloudinary test asset:

```sql
begin;

with new_asset as (
  insert into public.media_assets (
    provider,
    public_id,
    resource_type,
    format,
    width,
    height,
    bytes,
    alt_text,
    is_public
  ) values (
    'cloudinary',
    'atleta-prueba-01',
    'image',
    'jpg',
    780,
    1040,
    37601,
    'Retrato de atleta de prueba',
    false
  )
  returning id
), new_athlete as (
  insert into public.athletes (display_name, photo_asset_id)
  select 'Atleta de prueba', id from new_asset
  returning id
)
insert into public.athlete_consents (athlete_id, consent_type, status)
select id, consent_type, 'pending'::public.consent_status
from new_athlete
cross join (values ('public_profile'), ('photo')) as required_consents(consent_type);

commit;
```

The athlete and its media reference remain private drafts. Set the asset and athlete publication state only after verifying the data and recording the required consents.

Cloudinary public delivery is not protected by Supabase RLS. If consent is withdrawn, unpublish the athlete and remove or restrict the corresponding Cloudinary asset as part of the same operational workflow.

## 8. Normal migration workflow

Every future schema change should be a new migration:

```powershell
npx supabase migration new describe_the_change
npx supabase db push --dry-run
npx supabase db push
```

Do not edit an already-applied migration. Create a corrective migration instead.

## Local development limitation

`supabase start` requires Docker. Docker is not currently available in this workspace, so local database reset and pgTAP execution cannot run yet. Hosted migration deployment remains available through `supabase link` and `supabase db push`.

## Operational checklist

- [ ] Strong database password stored outside the repository.
- [ ] Correct project region selected.
- [ ] Migration applied and listed remotely.
- [ ] RLS remains enabled on every public table.
- [ ] First administrator profile created manually.
- [ ] Only URL and publishable key added to Vercel.
- [ ] No cédulas in public IDs, URLs, or filenames.
- [ ] Real athlete publication requires reviewed data and consent.
