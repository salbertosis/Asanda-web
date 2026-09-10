# Apply Progress: Harden Administrative Integrity

## WU01 / PR01 — Command outcomes

**Status:** Complete
**Root cluster:** Truthful command outcomes independent from readback
**Predecessor:** Feature Branch Chain tracker
**Successor:** WU02 / PR02 session fence (not started)

### Completed task and persisted checkbox

- [x] 1.1 WU01/PR01 `src/services/admin/commandOutcome.js` Outcomes; T:D(outcome);H:N/A-pure;R:APP.
- Confirmed in `openspec/changes/harden-admin-integrity/tasks.md` after GREEN and baseline verification.

### Implementation

- Added immutable constructors for `confirmed`, `rejected`, and non-retryable `unknown` outcomes.
- Added deterministic outcome resolution where authoritative confirmation wins, authoritative rejection follows, and absent or malformed evidence fails closed as `unknown`.
- Added structural outcome recognition and a dependency-free Node regression command.

### Files changed

- `src/services/admin/commandOutcome.js`
- `scripts/admin-command-outcome-regression.mjs`
- `package.json`
- `openspec/changes/harden-admin-integrity/tasks.md`
- `openspec/changes/harden-admin-integrity/apply-progress.md`

### TDD Cycle Evidence

| Stage | Command | Result |
| --- | --- | --- |
| RED | `npm run test:outcome` | Failed as expected with `ERR_MODULE_NOT_FOUND` for `src/services/admin/commandOutcome.js`. |
| GREEN | `npm run test:outcome` | Passed: 8 deterministic checks. |
| TRIANGULATE | Added malformed rejection evidence case; `npm run test:outcome` | Passed: 8 deterministic checks, including fail-closed malformed evidence. |
| REFACTOR | Reviewed names, immutable shapes, and branches; no behavior-preserving source change was needed. | Focused regression remained green in the final gate. |

### Verification evidence

- Deterministic local regression: `npm run test:outcome` — passed, 8 checks.
- Baseline build: `npm run build` — passed with Vite 5.4.21, 1,509 modules transformed; emitted only the existing stale Browserslist-data warning.
- Whitespace validation: `git diff --check` — passed; emitted only the existing `.gitignore` LF-to-CRLF warning.
- Runtime harness: **N/A** — WU01 is a pure deterministic module with no browser, network, server, database, or provider boundary.
- Environment: local repository workspace; no authorized runtime or production evidence claimed.

### Design deviations

None. The module stores no durable command ledger and does not combine readback with command truth.

### Workload / PR boundary

- Strategy: Feature Branch Chain.
- Dependency diagram: `tracker → PR01 📍 → PR02`.
- Current boundary contains only WU01 source, focused regression, test command, and OpenSpec evidence.
- WU02 and later units were not started.
- Independently counted WU01 gate candidate and current scoped diff: 277 changed lines (+275/-2, including tracked and untracked implementation, regression, and evidence files); this includes the two-line `tasks.md` table-separator normalization, which is formatter-enforced cosmetic scope, and remains within the 400-line budget.

### Rollback boundary

Remove `src/services/admin/commandOutcome.js` and `scripts/admin-command-outcome-regression.mjs`, remove `test:outcome` from `package.json`, and revert task 1.1 plus this WU01 progress section. No unrelated behavior or database state is affected.

### Structured status consumed

- Schema: `gentle-ai.sdd-status@2`; selected change `harden-admin-integrity`.
- Store: `openspec`; proposal, specs, design, and tasks were present; apply was ready.
- Action context: `repo-local`; workspace and allowed edit root were the repository root; warnings: none.
- Runtime attempt: same WU01 attempt authenticated with the parent token and returned `proceed`; the parent settled the implementation attempt as passed.

### Remaining implementation tasks

- [x] 1.2 WU02/PR02 `src/admin/AdminSessionContext.jsx` Session-fence; T:auth-E2E;H:E;R:APP.
- [x] 1.3 WU03/PR03 `src/admin/AdminCommandContext.jsx` Feedback/dialog; T:command-E2E;H:E;R:APP.
- [x] 1.4 WU04/PR04 `src/admin/AdminShell.jsx` Focus/theme/responsive; T:shell-E2E;H:E;R:APP.
- [x] 2.1 WU05/PR05 `supabase/migrations/` News-RPC; T:S(editorial);H:AUTH-SQL;R:FWD.
- [ ] 2.2 WU06/PR06 `src/admin/NewsEditorPage.jsx` News-editor; T:D(admin-editorial);H:E;R:APP.
- [ ] 2.3 WU07/PR07 `src/admin/AdminNewsPage.jsx` News-list; T:news-E2E;H:E;R:APP.
- [ ] 2.4 WU08S/PR08S `supabase/migrations/` Featured-authority; T:S(editorial);H:AUTH-SQL;R:FWD.
- [ ] 2.5 WU08C/PR08C `src/services/admin/dateTime.js` Featured-UTC; T:D(admin-editorial);H:E;R:APP.
- [ ] 2.6 WU09/PR09 `supabase/functions/sign-media-upload/index.ts` Prepared-ID; T:D(admin-sign-media);H:P;R:STOP.
- [ ] 2.7 WU10/PR10 `supabase/migrations/` Registration/new-alt; T:S(media);H:AUTH-SQL;R:FWD.
- [ ] 2.8 WU11/PR11 `src/admin/AdminMediaPage.jsx` Reconciliation/no-reupload; T:media-E2E;H:E;R:APP.
- [ ] 3.1 WU12/PR12 `supabase/migrations/` Club-RPC; T:S(club);H:AUTH-SQL;R:FWD.
- [ ] 3.2 WU13/PR13 `src/services/admin/clubs.js` Club-client; T:clubs-E2E;H:E;R:APP.
- [ ] 3.3 WU14S/PR14S `supabase/migrations/` Athlete-revision; T:S(athlete);H:AUTH-SQL;R:FWD.
- [ ] 3.4 WU14C/PR14C `src/services/admin/athletes.js` Athlete-client; T:athletes-E2E;H:E;R:APP.
- [ ] 3.5 WU15/PR15 `src/admin/AdminAthleteWizard.jsx` Exact-relations; T:athletes-E2E;H:E;R:APP.
- [ ] 3.6 WU16/PR16 `supabase/migrations/` Competition-lifecycle; T:S(calendar);H:AUTH-SQL;R:FWD.
- [ ] 3.7 WU17/PR17 `supabase/migrations/` Program-version/reorder; T:S(calendar);H:AUTH-SQL;R:FWD.
- [ ] 3.8 WU18A/PR18A `src/services/admin/calendar.js` Competition-client; T:calendar-E2E;H:E;R:APP.
- [ ] 3.9 WU18B/PR18B `src/admin/AdminCalendarPage.jsx` Program-client; T:calendar-E2E;H:E;R:APP.
- [ ] 4.1 WU19/PR19 `src/services/admin/importLimits.js` Limits/privacy; T:D(hy3-import);H:local-worker;R:APP.
- [ ] 4.2 WU20/PR20 `src/admin/AdminResultsPage.jsx` Ambiguity/invalidation; T:results-E2E;H:E;R:APP.
- [ ] 4.3 WU21/PR21 `supabase/migrations/` Result-token-RPC; T:S(results);H:AUTH-SQL;R:FWD.
- [ ] 4.4 WU22/PR22 `src/services/admin/results.js` Result-commit; T:D(hy3-import);H:E;R:APP.
- [ ] 4.5 WU23/PR23 `supabase/migrations/` Record-authority; T:S(records);H:AUTH-SQL;R:FWD.
- [ ] 4.6 WU24/PR24 `src/admin/` Records-page-discovery/adoption; T:records-E2E;H:E;R:APP.
- [ ] 5.1 WU25S/PR25S `supabase/migrations/` Logros-RPC (#207-landed-gate); T:S(achievements);H:AUTH-SQL;R:FWD.
- [ ] 5.2 WU25C/PR25C `src/admin/AthleteAchievementPanel.jsx` Preserve-#207/adopt; T:D(athlete-achievements);H:E;R:APP.
- [ ] 5.3 WU26/PR26 `src/admin/AthleteEvidencePanel.jsx` Consumer-first removal after recursive inventory; T:D(migration-readiness);H:N/A-deletion;R:APP.
- [ ] 5.4 WU27/PR27 `scripts/`,`docs/`,`package.json` Local-gate/runbooks; T:B+E;H:local-gate;R:APP.
- [ ] 6.1 `supabase/tests/` (read-only) Separate SQL/provider/admin/editor smoke; T:S/SM;H:AUTH;R:STOP.
- [ ] 6.2 `tests/e2e/` (read-only) Public reads/authorized cleanup/independent reads; T:SM;H:AUTH;R:STOP.
- [ ] 6.3 `media_assets` (read-only) Legacy-alt inventory→reviewed-remediation→fresh-zero-gate; T:AUTH-query;H:AUTH;R:STOP.
- [ ] 7.1 WU28/PR28 `supabase/migrations/` Zero-gated-alt-enforcement; T:S(media);H:AUTH-public;R:FWD.
- [ ] 7.2 WU29/PR29 `supabase/migrations/` Evidence-gated-legacy-tightening; T:S(all);H:AUTH-roles;R:FWD.
- [ ] 7.3 `openspec/changes/harden-admin-integrity/` (read-only) B+E; audit AUTH/#207/budgets/smoke/public/cleanup/`src/data/`/SEO/privacy/AthleteEvidence-zero; H:receipts;R:STOP.

## WU02 / PR02 — Session fence

**Status:** Complete after the single corrective gatekeeper rerun
**Boundary:** `tracker → PR01 → PR02 📍 → PR03`; PR02 targets the PR01 branch.

### Completed task and persisted checkbox

- [x] 1.2 WU02/PR02 `src/admin/AdminSessionContext.jsx` Session-fence; T:auth-E2E;H:E;R:APP.
- The task remains checked because the corrective implementation passed its focused browser contract and baseline gates.

### Implementation and files

- `src/admin/AdminSessionContext.jsx`: fences profile resolution by session generation and identity, distinguishes unavailable authority, revokes locally before remote sign-out, and ignores stale completions.
- `tests/e2e/admin-auth.spec.js`: retains the existing auth coverage and adds focused stale-completion and failed-remote-sign-out scenarios while reusing shared setup and sign-in helpers.
- `openspec/changes/harden-admin-integrity/{tasks.md,apply-progress.md}`: persists completion and cumulative evidence.

### Verification evidence

- Parent-owned runtime attempt authority was authenticated for this exact bounded remediation. The earlier WU02 attempt was later settled by the parent; settlement of this remediation remains parent-owned and was not performed here. No opaque attempt token or hash is persisted.
- Final formatted-candidate focused mocked runtime harness: `npx playwright test tests/e2e/admin-auth.spec.js` — **6 passed (52.9s)** using one Chromium worker and the local Vite server.
- Transient retry history, reported separately: an earlier post-format run had 5 passing tests and 1 timeout at `page.reload`; the unchanged suite then passed with 6 tests. This history is not presented as the final candidate run.
- Final formatted-candidate baseline: `npm run build` — **passed** with Vite 5.4.21, 1,509 modules transformed, built in 31.86s; the only warning was stale Browserslist data.
- Whitespace validation first run: `git diff --check` — **failed** on three trailing-whitespace lines introduced in this evidence artifact; those lines were corrected without formatting.
- Final formatted-candidate whitespace validation corrective rerun: `git diff --check` — **passed** with no whitespace errors; it emitted only LF-to-CRLF working-tree warnings for `.gitignore` and the three touched text files.
- No authenticated server, production, or deployment evidence is claimed.

### Corrective workload result

- One honest simplification pass restored surrounding quote/layout conventions and reused test fixtures/helpers without deleting either valuable focused behavior scenario.
- The cohesive PR02 boundary remains the session-fence behavior, its focused E2E tests, and matching OpenSpec evidence as one rollback unit; WU03 was not started.
- Maintainer `salbertosis` explicitly approved `size:exception`: session-fence behavior and valuable focused tests are one cohesive rollback unit, and the one honest simplification pass could not stay under 400 changed lines after enforced formatting.
- Final scoped diff: **482 changed lines (+349/-133)** across `src/admin/AdminSessionContext.jsx`, `tests/e2e/admin-auth.spec.js`, `openspec/changes/harden-admin-integrity/tasks.md`, and this apply-progress artifact; the evidence remediation accounts for the increase from the pre-remediation formatted count.

### Design deviations and rollback

The implementation has no behavioral design deviation; server-side fresh-role enforcement remains assigned to later server work units. The 400-line delivery bound is exceeded only under the explicit maintainer-approved `size:exception` recorded above.

Rollback only the WU02 changes in `src/admin/AdminSessionContext.jsx` and `tests/e2e/admin-auth.spec.js`, then revert task 1.2 and this WU02 progress section. This does not remove WU01, later work, database state, static data, or SEO metadata.

### Structured status and remaining tasks

The user resolved the selected change as `harden-admin-integrity`; the authoritative action context is repo-local with the repository root as the allowed edit root. This remediation edited only `apply-progress.md`, as authorized. Unrelated source, test, tasks, `.gitignore`, `.pi/`, and `.codegraph/` state was preserved. Every exact unchecked `- [ ]` line in the cumulative **Remaining implementation tasks** list above remains pending; task 1.3 / WU03 is next.

## WU03 / PR03 — Command feedback and confirmation

**Status:** Complete after bounded reconciliation remediation
**Boundary:** `tracker → PR01 → PR02 → PR03 📍 → PR04`; PR03 targets `feat/harden-admin-integrity-02-session-fence`.

- [x] 1.3 WU03/PR03 `src/admin/AdminCommandContext.jsx` Feedback/dialog; T:command-E2E;H:E;R:APP. The persisted checkbox was re-read after verification.
- `AdminCommandContext.jsx` provides scoped pending state, truthful feedback/readback actions, and an accessible named confirmation dialog with focus containment and return.
- `AdminGuard.jsx` mounts the provider only after authorization; loading and denied routes remain outside it. `App.jsx` is restored exactly to branch HEAD.
- `admin-command.spec.js` covers duplicate prevention, independent pending keys, dialog keyboard/focus behavior, cancellation, confirmation, rejected feedback, and unknown reconciliation that invokes only its supplied read, clears successful feedback, and neither offers nor repeats mutation.
- Final unchanged-candidate verification: `npx playwright test tests/e2e/admin-command.spec.js` — **3 passed (14.7s)**; `npm run build` — **passed**, 1,511 modules transformed in 8.84s with only the stale Browserslist warning; `git diff --check` — **passed** with only unrelated line-ending warnings. Primary pi-lens LSP analysis of `AdminCommandContext.jsx`, `AdminGuard.jsx`, and `admin-command.spec.js` returned clean exit status with no diagnostics.
- The cohesive boundary is exactly **400 changed lines (+396/-4)** including untracked files. `App.jsx` content matches branch HEAD, and the WU03-owned surfaces contain no opaque authority values. The same parent-owned remediation attempt authenticated as `proceed`; settlement remains parent-owned and no opaque value is persisted.
- No design deviation or deployed-server claim. Rollback the context, guard mount, focused test, task checkbox, and this section only.
- Consumed the explicit `harden-admin-integrity` OpenSpec status and repo-local edit roots; no action-context warnings. Task 1.4 and all later unchecked tasks remain pending.

## WU04 / PR04 — Accessible administrative shell

**Status:** Complete after bounded independent-verification remediation
**Boundary:** `tracker → PR01 → PR02 → PR03 → PR04 📍 → PR05`; PR04 targets `feat/harden-admin-integrity-03-command-feedback`.

### Completed task and persisted checkbox

- [x] 1.4 WU04/PR04 `src/admin/AdminShell.jsx` Focus/theme/responsive; T:shell-E2E;H:E;R:APP.
- The matching checkbox in `tasks.md` was marked only after focused, full browser, build, and whitespace gates passed.

### Implementation and files

- `src/admin/AdminShell.jsx`: adds a first-practical skip control, route-driven focus transfer, the shared theme toggle, contained horizontal module navigation, responsive header reflow, 44px targets, visible focus, and reduced-motion-safe transitions.
- `src/components/DarkModeToggle.jsx`: disables its color transition under reduced motion and removes its unused React import.
- `tests/e2e/admin-shell.spec.js`: covers one main landmark, skip and route focus, semantic current-route state, system and persisted themes, 320/390px overflow containment, reduced-motion transition behavior, and both target dimensions.
- `openspec/changes/harden-admin-integrity/{tasks.md,apply-progress.md}`: persists WU04 completion and cumulative evidence.

### TDD Cycle Evidence

| Stage | Command | Result |
| --- | --- | --- |
| RED | `npx playwright test tests/e2e/admin-shell.spec.js` | Failed as expected: 3 failed because route focus, theme control, and the bounded navigation marker were absent. |
| GREEN | Same focused command after shell implementation | Theme passed; focus and narrow-loop harness assumptions exposed 2 failures. |
| TRIANGULATE | Corrected the tests to distinguish route-focused tab order and one authenticated session across both viewports; reran focused tests. | First rerun had 2 passed and 1 skip-focus harness failure; final rerun passed 3 tests in 10.3s. |
| REFACTOR | Consolidated module navigation into one immutable configuration and retained shared `DarkModeToggle`. | Final focused and full browser suites remained green. |

### Verification evidence

- Focused mocked runtime harness: `npx playwright test tests/e2e/admin-shell.spec.js` — **3 passed (10.3s)**.
- Full browser regression: `npm run test:e2e` — **149 passed (5.8m)** with one Chromium worker.
- Baseline build: `npm run build` — **passed**, Vite 5.4.21 transformed 1,513 modules and built in 9.98s; only the stale Browserslist-data warning appeared.
- Final whitespace validation after artifact persistence: `git diff --check` — **passed** with only preserved LF-to-CRLF warnings for unrelated `.gitignore` and content-identical `src/App.jsx`, plus the touched shell.
- Runtime evidence is local and mocked; no authenticated server, production, or deployment evidence is claimed.
- The same parent-owned WU04 attempt authenticated as `proceed`; settlement remains parent-owned and no authority value is persisted.

### Design, workload, and rollback

- No design deviation. The shell reuses the existing theme lifecycle and does not start route-level WU05 adoption.
- Strategy: Feature Branch Chain. PR04 is one cohesive shell-plus-E2E rollback unit and targets PR03; PR05 and later were not started. Final scoped diff, including the untracked focused test, is **363 changed lines (+306/-57)**, within the 400-line budget.
- Rollback `src/admin/AdminShell.jsx`, remove `tests/e2e/admin-shell.spec.js`, and revert task 1.4 plus this WU04 section. No database, static-data, SEO, predecessor, or unrelated working-tree state is affected.

### Structured status consumed

- Fresh `gentle-ai.sdd-status@2` selected `harden-admin-integrity`; OpenSpec proposal, specs, design, tasks, and prior progress were complete enough for apply.
- Action context was repo-local with the repository root authorized and no warnings. Edits stayed within the four WU04 allowed surfaces.
- Delivery authority was the resolved `feature-branch-chain` strategy with a 400-line review budget.

### Independent-verification remediation

- The same parent-owned remediation attempt authenticated as `proceed`; settlement remains parent-owned and no authority value is persisted.
- RED: the strengthened focused test failed because the shared theme control still exposed an active transition under reduced motion.
- Remediation guarantees at least 44px width and height for theme, sign-out, and every module navigation control at 320px and 390px; the computed reduced-motion transition property is `none`.
- Final unchanged-candidate checks: focused Playwright **3 passed (49.5s)**; build **passed** with 1,513 modules transformed in 45.05s; primary pi-lens LSP diagnostics were clean for the three touched code/test files; whitespace validation passed with only unrelated line-ending warnings.
- No design deviation. Rollback additionally restores `src/components/DarkModeToggle.jsx`; no unrelated source or generated state was changed.

### Remaining implementation tasks

Task 2.1 is complete; every exact unchecked `- [ ]` task line from task 2.2 onward in `tasks.md` remains pending. WU06/PR06 is next and was not started.

## WU05 / PR05 — Secure administrative News RPC

**Status:** Complete after authorized forward-only correction
**Boundary:** `tracker → PR01 → PR02 → PR03 → PR04 → PR05 📍 → PR06`; PR05 targets `feat/harden-admin-integrity-04-admin-shell`.

### Completed task and persisted checkbox

- [x] 2.1 WU05/PR05 `supabase/migrations/` News-RPC; T:S(editorial);H:AUTH-SQL;R:FWD.
- The checkbox was marked only after the forward migration was confirmed remotely and the strengthened editorial contract passed.

### Implementation and files

- `supabase/migrations/20260901120000_add_admin_news_rpcs.sql`: adds revision-checked News save and lifecycle RPCs with server-derived authorship and fresh editor/administrator authorization.
- `supabase/tests/admin-editorial-services.sql`: verifies grants, anonymous and inactive denial, server-derived authorship, lifecycle preservation, stale-write rejection, and exact revision transitions. Its editor fixture is synthetic and the contract rolls back all test data.
- `openspec/changes/harden-admin-integrity/{tasks.md,apply-progress.md}`: records completion and cumulative evidence.
- No WU06 work was started; unrelated `.gitignore`, `src/App.jsx`, `.pi/`, `.codegraph/`, and predecessor state were preserved.

### TDD Cycle Evidence

| Stage | Command | Result |
| --- | --- | --- |
| RED | `supabase.exe db query --linked --file supabase/tests/admin-editorial-services.sql` | Failed with `P0002 query returned no rows` because the authorized empty test database had no pre-existing active editor fixture. The migration was already confirmed applied, so it was not retried or edited. |
| GREEN | Made the SQL contract self-contained with a synthetic editor and transaction rollback; reran the same linked query. | Passed with an empty result set and no SQL error. |
| TRIANGULATE | The passing contract exercised authenticated success plus anonymous, inactive-editor, and stale-revision failures in one rollback-safe transaction. | All assertions completed successfully against the linked non-production database. |
| REFACTOR | Retained the focused migration unchanged after application and limited remediation to fixture setup and rollback in the SQL contract. | The final linked contract remained green. |

### Authorized migration and SQL evidence

- Linked dry-run selected exactly `20260901120000_add_admin_news_rpcs.sql` and no other migration.
- One linked push applied `20260901120000_add_admin_news_rpcs.sql` successfully. No retry, history edit, or second push occurred.
- `supabase.exe migration list --linked` showed local and remote version `20260901120000` aligned.
- `supabase.exe db query --linked --file supabase/tests/admin-editorial-services.sql` — **passed** after the bounded test-fixture remediation; this is authorized non-production SQL evidence, not production evidence.
- Independent verification — **failed**: the pre-existing authenticated editor policy and table DML privileges still permit direct News writes, bypassing RPC authorship, validation, revision, and lifecycle enforcement. Because the migration is applied, remediation requires a new forward migration and a regression assertion.
- `npm run build` — **passed**, Vite 5.4.21 transformed 1,513 modules and built in 11.43s; only the existing stale Browserslist warning appeared.
- `git diff --check` — **passed** with only preserved line-ending warnings on unrelated working-tree files.
- This passing run remediates the prior failed evidence revision. No credentials, project references, connection strings, or authority tokens are recorded.

### Forward-correction TDD Cycle Evidence

| Stage | Command | Result |
| --- | --- | --- |
| RED | `supabase.exe db query --linked --file supabase/tests/admin-editorial-services.sql` before the correction migration | Failed as expected with `An active editor can bypass News RPCs with direct DML.` |
| GREEN | Applied the single forward migration, then reran the same contract. | The first post-migration run proved direct DML was denied and exposed privileged fixture setup still running as `authenticated`; resetting to the privileged test role fixed the harness, and the next run passed. |
| TRIANGULATE | Final linked editorial contract | Passed direct-editor denial plus RPC success, anonymous denial, inactive-editor denial, stale revision rejection, lifecycle transitions, read visibility, and rollback cleanup. |
| REFACTOR | Kept the correction to privilege revocation, explicit `service_role` DML preservation, and one test-role reset. | Both applied migrations remained unchanged after their respective applications. |

### Forward migration and verification evidence

- `20260901121000_restrict_admin_news_dml.sql` revokes direct authenticated News insert/update/delete while preserving reads, RPC execution, and explicit privileged server DML.
- Linked dry-run selected only `20260901121000_restrict_admin_news_dml.sql`; one linked push applied it, and no retry or migration-history edit occurred.
- `supabase.exe migration list --linked` showed both `20260901120000` and `20260901121000` aligned locally and remotely.
- Final `supabase.exe db query --linked --file supabase/tests/admin-editorial-services.sql` — **passed** with rollback-safe fixtures and no SQL errors.
- `npm run build` — **passed**, Vite 5.4.21 transformed 1,513 modules and built in 9.41s; only the existing stale Browserslist warning appeared.
- `git diff --check` — **passed** with only preserved line-ending warnings on unrelated working-tree files.
- This passing correction remediates the independent failed evidence revision without persisting credentials, project references, connection strings, or authority tokens.

### Design, workload, rollback, and status

- No design deviation: direct authenticated News DML is closed while the server-first RPC boundary and required reads remain available.
- Feature Branch Chain remains resolved. PR05 contains both sequential migrations, the strengthened SQL contract, and matching OpenSpec evidence; PR06 and later remain excluded. Final scoped diff is 320 changed lines (+312/-8), within the 400-line budget.
- Both migrations are confirmed applied and immutable. Any future database correction requires another separately reviewed forward migration.
- Consumed named `gentle-ai.sdd-status@2`: apply ready, repo-local workspace root authorized, and no action-context warnings.
- Parent-owned runtime authority was not acquired, reset, rescoped, or settled.

### Remaining implementation tasks

Every exact unchecked `- [ ]` task line from task 2.2 onward in `tasks.md` remains pending. WU06/PR06 is next and was not started.

## WU06 / PR06 — Truthful News editor commands

**Status:** Complete after one honest reduction
**Boundary:** `tracker → PR01 → PR02 → PR03 → PR04 → PR05 → PR06 📍 → PR07`; PR06 targets the WU05 branch.

### Completed task and persisted checkbox

- [x] 2.2 WU06/PR06 `src/admin/NewsEditorPage.jsx` News-editor; T:D(admin-editorial);H:E;R:APP.
- The checkbox was marked only after focused regression, build, whitespace, and primary source LSP checks passed.

### Implementation and files

- `src/services/admin/news.js`: uses WU05 save/lifecycle RPCs, carries revisions, derives no client author, maps stable stale/auth/validation/duplicate failures to rejection, and treats unverifiable results as unknown.
- `src/admin/NewsEditorPage.jsx`: adopts `AdminCommandContext` keys, confirmation, shared feedback, duplicate/conflicting-action prevention, revision-preserving save/publish, and read-only unknown reconciliation without mutation retry.
- `scripts/admin-editorial-regression.mjs`: adds focused RPC, outcome, reconciliation, and shared-adoption checks while retaining the existing editorial suite.
- `openspec/changes/harden-admin-integrity/{tasks.md,apply-progress.md}`: persists completion and evidence.

### TDD Cycle Evidence

| Stage | Command | Result |
| --- | --- | --- |
| Safety net | `npm run test:admin-editorial` | Passed 15 existing deterministic checks before production edits. |
| RED | `npm run test:admin-editorial` | Failed first on the legacy update signature/direct transport, then on missing exact postcondition reconciliation. |
| GREEN | `npm run test:admin-editorial` | Passed after the RPC outcome adapter and editor adoption. |
| TRIANGULATE | Added stale/auth/validation/duplicate/unknown and identity/revision/content variants; same command | Passed 18 checks. |
| REFACTOR | Restored existing formatting/rendering and reduced adapters/tests once; same command | Passed 18 checks on the reduced candidate. |

### Verification, workload, and rollback

- Deterministic local regression: `npm run test:admin-editorial` — **18 passed**.
- Baseline: `npm run build` — **passed**, 1,513 modules transformed; only the stale Browserslist warning appeared.
- Whitespace: `git diff --check` — **passed** with preserved line-ending warnings only.
- Primary source LSP: exact installed `pi-lens-analyze --lsp` commands for `NewsEditorPage.jsx` and `news.js` exited 0 with no diagnostics; the regression `.mjs` had no LSP project and reported one non-blocking await-parentheses advisory.
- Runtime harness: no authenticated server or production evidence is claimed; WU05 already supplied the authorized News RPC SQL contract.
- One permitted honest reduction removed formatter-only rewrites. Final scoped numstat is recorded in the return envelope and remains below 400 changed lines including these artifacts.
- No design deviation. Roll back the editor/service/regression changes and task/progress entry only; no database, WU05, list-page, static-data, or SEO state is changed.
- Consumed named `gentle-ai.sdd-status@2`: apply ready, repo-local authorized root, no action-context warnings. Parent-owned runtime authority was not acquired, reset, rescoped, or settled.

### Remaining implementation tasks

The cumulative exact unchecked list above remains authoritative from task 2.3 onward. The next line is:

- [ ] 2.3 WU07/PR07 `src/admin/AdminNewsPage.jsx` News-list; T:news-E2E;H:E;R:APP.

### Browser-mock correction evidence

- **Status:** Passing after formatter-churn remediation; task 2.2 remains checked. The two source files were reconstructed from branch HEAD with only the confirmed identity/revision fixes, then source and browser test surfaces were made read-only.
- GREEN focused mocked browser contract: exact lifecycle grep — **1 passed (18.3s)**. Whole `admin-editorial.spec.js` — **5 passed (46.8s)** with the exact News RPC mocks and adjacent existing-image RPC compatibility.
- Deterministic regression: `npm run test:admin-editorial` — **18 passed**. Build — **passed**, 1,513 modules transformed in 10.01s with only the existing Browserslist warning. Primary package-local pi-lens LSP commands previously exited 0 with no diagnostics.
- Final `git diff --check` — **passed** with preserved line-ending warnings only. Correction numstat: **+65/-28 (93 lines)**; complete PR06 numstat against its predecessor: **+227/-99 (326 lines)**, within 400 and correction runtime within 220.
- No WU07 shared outcomes, reconciliation, or UI redesign was added. Rollback this correction in the editor, list compatibility calls, browser mocks, and this evidence subsection only.
- Consumed named `gentle-ai.sdd-status@2`: apply ready, repo-local allowed root, no warnings. Parent-owned authority was not acquired, reset, rescoped, or settled.
