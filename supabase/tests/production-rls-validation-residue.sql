-- Independent read-only residue proof for production RLS candidate slices 1-2.
-- Planning artifact only. Execute separately under the approved reviewer context.
-- Profile/Auth immutability and migration parity remain separate later-slice proofs.

begin;
set local transaction_read_only = on;

with fixture as (
  select
    (
      substr(md5(current_setting('rlsv.run_id')), 1, 8) || '-' ||
      substr(md5(current_setting('rlsv.run_id')), 9, 4) || '-' ||
      substr(md5(current_setting('rlsv.run_id')), 13, 4) || '-' ||
      substr(md5(current_setting('rlsv.run_id')), 17, 4) || '-' ||
      substr(md5(current_setting('rlsv.run_id')), 21, 12)
    )::uuid as id,
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) as slug,
    md5(current_setting('rlsv.run_id') || ':club')::uuid as club_id,
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) || '-club' as club_slug,
    md5(current_setting('rlsv.run_id') || ':athlete')::uuid as athlete_id,
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) || '-athlete' as athlete_label
), residue as (
  select
    (select count(*) from public.news_articles article, fixture
      where article.id = fixture.id or article.slug = fixture.slug)
    + (select count(*) from public.organizations organization, fixture
      where organization.id = fixture.club_id or organization.slug = fixture.club_slug)
    + (select count(*) from public.organization_contacts contact, fixture
      where contact.organization_id = fixture.club_id)
    + (select count(*) from public.athletes athlete, fixture
      where athlete.id = fixture.athlete_id or athlete.display_name = fixture.athlete_label)
    + (select count(*) from private.athlete_details detail, fixture
      where detail.athlete_id = fixture.athlete_id)
    + (select count(*) from public.athlete_consents consent, fixture
      where consent.athlete_id = fixture.athlete_id)
    + (select count(*) from public.athlete_category_assignments category, fixture
      where category.athlete_id = fixture.athlete_id)
    + (select count(*) from public.athlete_disciplines discipline, fixture
      where discipline.athlete_id = fixture.athlete_id)
    + (select count(*) from public.athlete_memberships membership, fixture
      where membership.athlete_id = fixture.athlete_id and membership.organization_id = fixture.club_id)
      ::integer as fixture_rows,
    (select count(*) from private.admin_audit_log audit, fixture
      where audit.transaction_id is not null
        and audit.entity_id = any(array[
          fixture.id::text, fixture.club_id::text, fixture.athlete_id::text,
          md5(current_setting('rlsv.run_id') || ':public-contact'),
          md5(current_setting('rlsv.run_id') || ':private-contact'),
          md5(current_setting('rlsv.run_id') || ':public-consent'),
          md5(current_setting('rlsv.run_id') || ':results-consent'),
          md5(current_setting('rlsv.run_id') || ':membership'),
          md5(current_setting('rlsv.run_id') || ':category'),
          fixture.athlete_id::text || ':' ||
            (select id::text from public.disciplines where code = 'swimming' limit 1)
        ]))::integer as fixture_audit_rows
)
select
  fixture_rows,
  fixture_audit_rows::integer,
  (fixture_rows = 0 and fixture_audit_rows = 0) as residue_zero,
  15::integer as accepted_pass_sequence_allocations,
  false as profile_auth_migration_proof_in_slice
from residue;

commit;
