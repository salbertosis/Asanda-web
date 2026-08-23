-- Independent read-only residue proof for the complete MVP production RLS candidate.
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
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) || '-athlete' as athlete_label,
    md5(current_setting('rlsv.run_id') || ':venue')::uuid as venue_id,
    md5(current_setting('rlsv.run_id') || ':competition')::uuid as competition_id,
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) || '-competition' as competition_slug,
     md5(current_setting('rlsv.run_id') || ':competition-event')::uuid as competition_event_id,
    md5(current_setting('rlsv.run_id') || ':event-definition')::uuid as event_definition_id,
    'rlsv-' || substr(current_setting('rlsv.run_id'), 1, 24) || '-event-definition' as event_definition_code,
    (substr(md5(current_setting('rlsv.run_id') || ':athlete-mapping'), 1, 8) || '-' || substr(md5(current_setting('rlsv.run_id') || ':athlete-mapping'), 9, 4) || '-4' || substr(md5(current_setting('rlsv.run_id') || ':athlete-mapping'), 14, 3) || '-8' || substr(md5(current_setting('rlsv.run_id') || ':athlete-mapping'), 18, 3) || '-' || substr(md5(current_setting('rlsv.run_id') || ':athlete-mapping'), 21, 12))::uuid as athlete_mapping_id,
    (substr(md5(current_setting('rlsv.run_id') || ':club-mapping'), 1, 8) || '-' || substr(md5(current_setting('rlsv.run_id') || ':club-mapping'), 9, 4) || '-4' || substr(md5(current_setting('rlsv.run_id') || ':club-mapping'), 14, 3) || '-8' || substr(md5(current_setting('rlsv.run_id') || ':club-mapping'), 18, 3) || '-' || substr(md5(current_setting('rlsv.run_id') || ':club-mapping'), 21, 12))::uuid as club_mapping_id
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
      + (select count(*) from public.venues venue, fixture
        where venue.id = fixture.venue_id)
      + (select count(*) from public.competitions competition, fixture
        where competition.id = fixture.competition_id or competition.slug = fixture.competition_slug)
      + (select count(*) from public.event_definitions definition, fixture
        where definition.id = fixture.event_definition_id or definition.code = fixture.event_definition_code)
        + (select count(*) from public.competition_events event_row, fixture
          where event_row.id = fixture.competition_event_id or event_row.competition_id = fixture.competition_id)
        + (select count(*) from public.source_mappings mapping, fixture
          where mapping.id in (fixture.athlete_mapping_id, fixture.club_mapping_id)
            or mapping.source_organization = fixture.slug)
        + (select count(*) from public.source_documents document, fixture
          where document.competition_id = fixture.competition_id)
        + (select count(*) from public.import_batches batch
          join public.source_documents document on document.id = batch.source_document_id, fixture
          where document.competition_id = fixture.competition_id)
        + (select count(*) from public.entries entry, fixture
          where entry.competition_event_id = fixture.competition_event_id
            and entry.athlete_id = fixture.athlete_id)
        + (select count(*) from public.performances performance
          join public.entries entry on entry.id = performance.entry_id, fixture
          where entry.competition_event_id = fixture.competition_event_id
            and entry.athlete_id = fixture.athlete_id)
          ::integer as fixture_rows,
     (select count(*) from public.venues venue, fixture
       where venue.id = fixture.venue_id)
     + (select count(*) from public.competitions competition, fixture
       where competition.id = fixture.competition_id or competition.slug = fixture.competition_slug)
     + (select count(*) from public.event_definitions definition, fixture
       where definition.id = fixture.event_definition_id or definition.code = fixture.event_definition_code)
     + (select count(*) from public.competition_events event_row, fixture
       where event_row.id = fixture.competition_event_id or event_row.competition_id = fixture.competition_id)
       ::integer as calendar_fixture_rows,
      (select count(*) from public.source_mappings mapping, fixture
        where mapping.id in (fixture.athlete_mapping_id, fixture.club_mapping_id)
          or mapping.source_organization = fixture.slug)
      + (select count(*) from public.source_documents document, fixture
        where document.competition_id = fixture.competition_id)
      + (select count(*) from public.import_batches batch
        join public.source_documents document on document.id = batch.source_document_id, fixture
        where document.competition_id = fixture.competition_id)
      + (select count(*) from public.entries entry, fixture
        where entry.competition_event_id = fixture.competition_event_id and entry.athlete_id = fixture.athlete_id)
      + (select count(*) from public.performances performance
        join public.entries entry on entry.id = performance.entry_id, fixture
        where entry.competition_event_id = fixture.competition_event_id and entry.athlete_id = fixture.athlete_id)
        ::integer as result_fixture_rows,
       (select count(*) from private.admin_audit_log audit, fixture
       where audit.transaction_id is not null
         and audit.entity_id = any(array[
           fixture.id::text, fixture.club_id::text, fixture.athlete_id::text,
          md5(current_setting('rlsv.run_id') || ':public-contact')::uuid::text,
          md5(current_setting('rlsv.run_id') || ':private-contact')::uuid::text,
          md5(current_setting('rlsv.run_id') || ':public-consent')::uuid::text,
          md5(current_setting('rlsv.run_id') || ':results-consent')::uuid::text,
           md5(current_setting('rlsv.run_id') || ':membership')::uuid::text,
           md5(current_setting('rlsv.run_id') || ':category')::uuid::text,
             fixture.venue_id::text, fixture.competition_id::text,
             fixture.competition_event_id::text,
             fixture.athlete_mapping_id::text, fixture.club_mapping_id::text,
             fixture.athlete_id::text || ':' ||
              (select id::text from public.disciplines where code = 'swimming' limit 1)
           ]))::integer as fixture_audit_rows
       ,(select count(*) from private.admin_audit_log audit, fixture
         where audit.transaction_id is not null
          and audit.entity_table in ('venues', 'competitions', 'competition_events')
         and audit.entity_id = any(array[
           fixture.venue_id::text, fixture.competition_id::text,
            fixture.competition_event_id::text
          ]))::integer as calendar_audit_rows
       ,(select count(*) from private.admin_audit_log audit, fixture
         where audit.transaction_id is not null
           and audit.entity_table in ('source_documents', 'import_batches', 'entries', 'performances', 'competitions')
           and audit.reason = fixture.slug
           and audit.evidence = 'MVP rollback-only result validation')::integer as result_audit_rows
)
select
  fixture_rows,
  calendar_fixture_rows,
  result_fixture_rows,
  fixture_audit_rows::integer,
  calendar_audit_rows::integer,
  result_audit_rows::integer,
   (fixture_rows = 0 and fixture_audit_rows = 0 and result_audit_rows = 0) as residue_zero,
    36::integer as accepted_pass_sequence_allocations,
   0::integer as stopped_sequence_allocations_min,
   37::integer as stopped_sequence_allocations_max,
  false as profile_auth_migration_proof_in_slice
from residue;

commit;
