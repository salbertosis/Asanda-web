-- Independent read-only residue proof for production RLS candidate slice 1.
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
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) as slug
), residue as (
  select
    (select count(*) from public.news_articles article, fixture
      where article.id = fixture.id or article.slug = fixture.slug) as fixture_rows,
    (select count(*) from private.admin_audit_log audit, fixture
      where audit.entity_table = 'news_articles' and audit.entity_id = fixture.id::text)
      as fixture_audit_rows
)
select
  fixture_rows::integer,
  fixture_audit_rows::integer,
  (fixture_rows = 0 and fixture_audit_rows = 0) as residue_zero,
  3::integer as accepted_pass_sequence_allocations,
  false as profile_auth_migration_proof_in_slice
from residue;

commit;
