# Featured athlete achievements

Featured athlete achievements use editorial evidence, not inferred competition labels or placements.

## Editorial contract

- Store the evidence in `source_documents` and move it to `approved` only after an active editor reviews a processed document.
- Return an approved source to `pending` or `rejected` before changing its asset, checksum, type, organization, competition, processing state, or other material source metadata.
- Create `athlete_achievements` as `draft`, using one controlled type: `national_podium`, `international_medal`, or `national_team`.
- Publish only after the athlete has active `public_profile` and `results_publication` consent. Publication is blocked until the linked evidence is approved.
- Withdrawing either consent immediately removes achievements and official results from the public profile RPC.
- The public RPC excludes source documents, internal identifiers, consent records, contact data, birth data, representatives, notes, and administrative history.

The existing authenticated table/RLS and audit surfaces support controlled editorial loading. A dedicated achievement editor UI is outside this work unit; until one is approved, editors must use the existing authenticated data administration workflow. No achievement data is seeded by this migration.
