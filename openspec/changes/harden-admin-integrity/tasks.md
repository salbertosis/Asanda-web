# Tasks: Harden Administrative Integrity

- [x] Delivery decision: chained PRs via Feature Branch Chain; ask-on-risk risk decision resolved.

Apply remains blocked until an approved issue exists for the first non-Logros WU; #207 is Logros-only and cannot be reused elsewhere.

## Review Workload Forecast

| Field | Value |
| --- | --- |
| Estimated changed lines | 8,100–11,500 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR01 → PR29 |
| Delivery strategy | ask-on-risk (risk decision resolved) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Tracker is draft/no-merge. PR01 targets the tracker branch; each later child targets its immediate predecessor. Only the tracker ultimately targets main. Retarget/rebase polluted child diffs.

**Legend:** T=focused test; H=runtime harness; R=rollback. B=`npm run build && git diff --check`; E=`npm run test:e2e`; D(x)=`npm run test:x`; S(x)=`AUTH psql "$AUTHORIZED_DATABASE_URL" -v ON_ERROR_STOP=1 -f x`; P=`AUTH provider/Edge harness`; SM=`AUTH role smoke`. APP=revert adopter; FWD=new forward migration; STOP=unknown/no retry. Each WU is one cohesive ≤400-line likely PR, follows listed dependency order, and uses RED→GREEN→TRIANGULATE→REFACTOR.

## 1. Shared foundations

- [x] 1.1 WU01/PR01 `src/services/admin/commandOutcome.js` Outcomes; T:D(outcome);H:N/A-pure;R:APP.
- [x] 1.2 WU02/PR02 `src/admin/AdminSessionContext.jsx` Session-fence; T:auth-E2E;H:E;R:APP.
- [ ] 1.3 WU03/PR03 `src/admin/AdminCommandContext.jsx` Feedback/dialog; T:command-E2E;H:E;R:APP.
- [ ] 1.4 WU04/PR04 `src/admin/AdminShell.jsx` Focus/theme/responsive; T:shell-E2E;H:E;R:APP.

## 2. Server-first editorial/media

- [ ] 2.1 WU05/PR05 `supabase/migrations/` News-RPC; T:S(editorial);H:AUTH-SQL;R:FWD.
- [ ] 2.2 WU06/PR06 `src/admin/NewsEditorPage.jsx` News-editor; T:D(admin-editorial);H:E;R:APP.
- [ ] 2.3 WU07/PR07 `src/admin/AdminNewsPage.jsx` News-list; T:news-E2E;H:E;R:APP.
- [ ] 2.4 WU08S/PR08S `supabase/migrations/` Featured-authority; T:S(editorial);H:AUTH-SQL;R:FWD.
- [ ] 2.5 WU08C/PR08C `src/services/admin/dateTime.js` Featured-UTC; T:D(admin-editorial);H:E;R:APP.
- [ ] 2.6 WU09/PR09 `supabase/functions/sign-media-upload/index.ts` Prepared-ID; T:D(admin-sign-media);H:P;R:STOP.
- [ ] 2.7 WU10/PR10 `supabase/migrations/` Registration/new-alt; T:S(media);H:AUTH-SQL;R:FWD.
- [ ] 2.8 WU11/PR11 `src/admin/AdminMediaPage.jsx` Reconciliation/no-reupload; T:media-E2E;H:E;R:APP.

## 3. Relations/calendar

- [ ] 3.1 WU12/PR12 `supabase/migrations/` Club-RPC; T:S(club);H:AUTH-SQL;R:FWD.
- [ ] 3.2 WU13/PR13 `src/services/admin/clubs.js` Club-client; T:clubs-E2E;H:E;R:APP.
- [ ] 3.3 WU14S/PR14S `supabase/migrations/` Athlete-revision; T:S(athlete);H:AUTH-SQL;R:FWD.
- [ ] 3.4 WU14C/PR14C `src/services/admin/athletes.js` Athlete-client; T:athletes-E2E;H:E;R:APP.
- [ ] 3.5 WU15/PR15 `src/admin/AdminAthleteWizard.jsx` Exact-relations; T:athletes-E2E;H:E;R:APP.
- [ ] 3.6 WU16/PR16 `supabase/migrations/` Competition-lifecycle; T:S(calendar);H:AUTH-SQL;R:FWD.
- [ ] 3.7 WU17/PR17 `supabase/migrations/` Program-version/reorder; T:S(calendar);H:AUTH-SQL;R:FWD.
- [ ] 3.8 WU18A/PR18A `src/services/admin/calendar.js` Competition-client; T:calendar-E2E;H:E;R:APP.
- [ ] 3.9 WU18B/PR18B `src/admin/AdminCalendarPage.jsx` Program-client; T:calendar-E2E;H:E;R:APP.

## 4. Results/Records

- [ ] 4.1 WU19/PR19 `src/services/admin/importLimits.js` Limits/privacy; T:D(hy3-import);H:local-worker;R:APP.
- [ ] 4.2 WU20/PR20 `src/admin/AdminResultsPage.jsx` Ambiguity/invalidation; T:results-E2E;H:E;R:APP.
- [ ] 4.3 WU21/PR21 `supabase/migrations/` Result-token-RPC; T:S(results);H:AUTH-SQL;R:FWD.
- [ ] 4.4 WU22/PR22 `src/services/admin/results.js` Result-commit; T:D(hy3-import);H:E;R:APP.
- [ ] 4.5 WU23/PR23 `supabase/migrations/` Record-authority; T:S(records);H:AUTH-SQL;R:FWD.
- [ ] 4.6 WU24/PR24 `src/admin/` Records-page-discovery/adoption; T:records-E2E;H:E;R:APP.

## 5. Gates/retirement

- [ ] 5.1 WU25S/PR25S `supabase/migrations/` Logros-RPC (#207-landed-gate); T:S(achievements);H:AUTH-SQL;R:FWD.
- [ ] 5.2 WU25C/PR25C `src/admin/AthleteAchievementPanel.jsx` Preserve-#207/adopt; T:D(athlete-achievements);H:E;R:APP.
- [ ] 5.3 WU26/PR26 `src/admin/AthleteEvidencePanel.jsx` Consumer-first removal after recursive inventory; T:D(migration-readiness);H:N/A-deletion;R:APP.
- [ ] 5.4 WU27/PR27 `scripts/`,`docs/`,`package.json` Local-gate/runbooks; T:B+E;H:local-gate;R:APP.

## 6. Authorized evidence

- [ ] 6.1 `supabase/tests/` (read-only) Separate SQL/provider/admin/editor smoke; T:S/SM;H:AUTH;R:STOP.
- [ ] 6.2 `tests/e2e/` (read-only) Public reads/authorized cleanup/independent reads; T:SM;H:AUTH;R:STOP.
- [ ] 6.3 `media_assets` (read-only) Legacy-alt inventory→reviewed-remediation→fresh-zero-gate; T:AUTH-query;H:AUTH;R:STOP.

## 7. Tightening/closure

- [ ] 7.1 WU28/PR28 `supabase/migrations/` Zero-gated-alt-enforcement; T:S(media);H:AUTH-public;R:FWD.
- [ ] 7.2 WU29/PR29 `supabase/migrations/` Evidence-gated-legacy-tightening; T:S(all);H:AUTH-roles;R:FWD.
- [ ] 7.3 `openspec/changes/harden-admin-integrity/` (read-only) B+E; audit AUTH/#207/budgets/smoke/public/cleanup/`src/data/`/SEO/privacy/AthleteEvidence-zero; H:receipts;R:STOP.
