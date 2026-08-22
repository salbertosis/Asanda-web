# Apply Progress: Authorized Administration Panel

## Completed Tasks
- [x] 1.4 Admin session, protected routes, login, recovery, sign-out, noindex, and responsive shell.
- [x] 1.1 Remote SQL authorization and audit regression.
- [x] 1.2 Immutable private audit storage and managed-table triggers.
- [x] 1.5 Featured athletes, publication/consent guards, source mappings, grants, and atomic RPC contracts.
- [x] 4.2 Venue, competition lifecycle, and ordered event-program administration.

## Work Unit Evidence
| Evidence | Result |
|---|---|
| Threat RED | `npx playwright test tests/e2e/admin-auth.spec.js` before implementation: 0/3 passed; `/admin` exposed the public fallback and login controls did not exist. |
| Focused test | `npx playwright test tests/e2e/admin-auth.spec.js`: 3/3 passed. |
| Build | `npm run build`: passed; 1,476 modules transformed. |
| Runtime harness | `npm run test:e2e`: 51/51 passed, including anonymous denial, inactive-profile denial, active-session restore, and sign-out. |
| Rollback boundary | Revert `src/admin/`, `src/services/admin/auth.js`, the admin routing hunks in `src/App.jsx`, admin metadata in `src/seo/routeMetadata.js`, and `tests/e2e/admin-auth.spec.js`. Public data and database schema remain unchanged. |

Production Supabase was not mutated; all database changes were exercised only in hosted staging.

## Database Security Evidence
| Evidence | Result |
|---|---|
| Threat RED | Remote staging query failed with `Immutable admin audit storage is missing` after existing anonymous, inactive, and escalation guards held. |
| Focused test | `supabase db query --db-url <staging-pooler> --file supabase/tests/admin-security-foundation.sql`: `DO`, passed. |
| Migration | Dry-run selected only `20260817175000`; staging push passed and migration history matched. |
| Runtime harness | Real staging administrator/editor password login passed; role and active profile reads matched. |
| Build | `npm run build`: passed; 1,476 modules transformed. |
| Rollback boundary | Revert the audit migration, SQL regression, and SDD progress. No public query contract changed. |

## Correction Slice — Task 1.3a
**Work unit**: `task-1.3a-transactional-staff-rpc`; Standard Mode; auto-chain; stacked-to-main; approved issue #35; one attempt.
**Prior review findings**: The independent immutable-tree review found a CRITICAL administrator-count race and a CRITICAL Auth-before-profile ordering failure that could leave Auth and profile state inconsistent after a zero-row RLS update.

### Completed Tasks
- [x] 1.3a Service-role-only serialized staff profile transition RPC and focused SQL regression.
- [ ] 1.3 Parent correction remains open until Edge Function integration is complete.
- [ ] 1.3b Edge Function integration, fail-closed compensation/recovery, and expanded runtime regression.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused deterministic SQL/static contract check | `node --input-type=module -e "import fs from 'node:fs'; import assert from 'node:assert/strict'; const m=fs.readFileSync('supabase/migrations/20260817200000_add_staff_profile_transition_rpc.sql','utf8'); const t=fs.readFileSync('supabase/tests/admin-staff-profile-transition.sql','utf8'); const checks=[[m,'create or replace function public.transition_staff_profile'],[m,'security definer'],[m,'pg_advisory_xact_lock'],[m,'order by profile.id'],[m,'for update'],[m,'actor_profile.role <>'],[m,'next_active_admin_count'],[m,'Administrators cannot remove'],[m,'update public.profiles'],[m,'get diagnostics updated_rows = row_count'],[m,'set_config'],[m,'revoke all on function public.transition_staff_profile'],[m,'grant execute on function public.transition_staff_profile'],[t,'service_role'],[t,'has_function_privilege'],[t,'Invalid roles were accepted'],[t,'missing target profile'],[t,'previous_role'],[t,'next_role'],[t,'exactly one audit row'],[t,'Self-demotion was accepted'],[t,'Self-deactivation was accepted'],[t,'last active administrator'],[t,'The supplied actor'],[t,'begin;'],[t,'rollback;']]; let passed=0; for (const [source, needle] of checks) { assert.ok(source.includes(needle), needle); passed += 1; } assert.ok(!m.includes('email')); assert.ok(!m.includes('auth.users')); console.log('staff profile RPC static contract: '+passed+'/'+checks.length+' passed; privacy markers passed');"` → exit 0; **26/26 contract assertions passed**, including grants, deterministic locks, actor/target validation, admin-count guard, self-protection, exact update/audit markers, bounded return state, rollback test framing, and privacy markers. |
| Diff check | `git diff --check` → exit 0; only existing LF/CRLF warnings were emitted. |
| Runtime harness | ASANDA Staging dry-run selected only `20260817200000`; the migration applied once. After renaming the regression variable that collided with PostgreSQL `CURRENT_ROLE`, `supabase db query --linked --file supabase/tests/admin-staff-profile-transition.sql` passed in one attempt. Profile counts, fixture role/active state, and audit watermark were exactly equal before and after, proving rollback with no residue. Production was not contacted or mutated. |
| Rollback boundary | Delete `supabase/migrations/20260817200000_add_staff_profile_transition_rpc.sql` and `supabase/tests/admin-staff-profile-transition.sql`; revert only the 1.3a checkbox/state/progress additions. Leave the Edge Function, Node regression, task 1.5 files, and existing migrations untouched. |
| Evidence revision | Implementation: `sha256:760d812f1d0abfbeb4f9feda91bc14e0b04f847ec73af03d77510406e5cf8125`. Passing staging regression and rollback proof: `sha256:69b05fc6591ee6e8a3c5fe1cc908d8428d4f28f02731d9183c5cf56abde5b7fd`, recorded as remediation of `sha256:be1e3eb861c947aeec366d94d1294e51d46c6d3a26f6d1064d19c8e46dc12da0`. |

## Review-Warning Correction — `task-1.3a-review-warning-fix`
**Resolution**: Added inactive-administrator actor denial coverage, reactivated the fixture through the original administrator, and left the two-session concurrency proof as a non-blocking follow-up.
**Documentation**: Review Workload Forecast now records the resolved `auto-chain` / `stacked-to-main` delivery path; task 1.5 and all prior statuses remain unchanged.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused test | Inactive-administrator static assertions: exit 0, 8/8 passed; `git diff --check`: exit 0. |
| Runtime harness | Isolated ASANDA Staging pre/post SQL rows were exact-equal: `profile_count=2`, `fixture_profile_count=2`, `audit_count=8`, `audit_watermark_pre_equals_post=true`, both fixture-active booleans `true`; corrected regression: exit 0, one attempt, `[]`. The wrapper's raw-text comparison differed only on timestamped CLI telemetry/update notices; both read-only queries exited 0, the SQL fields remained exact, the query file was deleted/verified absent, migration history was unchanged, and production was not contacted. |
| Rollback boundary | Revert the inactive-administrator block in `supabase/tests/admin-staff-profile-transition.sql`, the forecast line in `tasks.md`, and this evidence section; no migration/RPC implementation changes. |
| Privacy boundary | No credentials, recipient data, Auth/profile IDs, audit IDs, tokens, or private staging details were persisted. |
| Evidence revision | `sha256:ffd14225dbfdbab00eeae6a23f91d9b65cf241c26c3371476910248016177e8a` |

## Work Unit Evidence — Task 1.3b1a
**Work unit**: `task-1.3b1-staff-orchestration` (slice a); auto-chain; stacked-to-main; approved issue #38; one attempt.
**Prior context**: The first Edge integration candidate consumed its scoped review correction and still contained severe recovery/cleanup defects with structural-only tests. The maintainer approved replacing it with two clean slices: 1.3b1a (orchestration module + deterministic invitation/cleanup tests, this evidence) and 1.3b1b (issue #39: deterministic access-transition tests + OpenSpec completion). The unsafe candidate code was discarded, not patched.

### Completed Tasks
- [ ] 1.3b1 Add dependency-injected fail-closed staff orchestration and deterministic recovery tests (slice a: module and invitation/cleanup determinism).
- [ ] 1.3 Parent correction remains open until Edge Function integration (1.3b2) is complete.
- [ ] 1.3b2 Wire the Edge Function and prove staging contention, restoration, and cleanup.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused deterministic regression | `node scripts/admin-staff-orchestration-regression.mjs`: exit 0, **9/9 passed** — (1) invite rejects null/array/malformed/disallowed-role commands with zero effects; (2) setStaffAccess rejects null/array/malformed commands with zero effects; (3) failed or malformed auth invite without further effects; (4) bootstrap throw after auth creation; (5) RPC denial, malformed, and ambiguous variants; (6) cleanup deletion failure with residue; (7) deletion throw with exact absence; (8) success with each effect exactly once; (9) final state mismatch — with exact effect ordering and maximum call counts enforced by trace equality and handler-queue exhaustion, plus recursive output privacy assertions. |
| Package script | `npm run test:admin-staff-orchestration` runs the same deterministic regression. |
| Module check | `supabase/functions/manage-staff/orchestration.js` imports natively as ESM in Node without loaders or dependencies; no Deno, Supabase, network, timer, storage, or environment APIs are referenced. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Delete `supabase/functions/manage-staff/orchestration.js`, `scripts/admin-staff-orchestration-regression.mjs`, the `test:admin-staff-orchestration` package script, and revert only this 1.3b1a evidence section. The transactional RPC (1.3a), task 1.5 files, and public application behavior remain unchanged. |
| Privacy boundary | No credentials, recipient data, profile/Auth IDs, tokens, or private staging details were introduced or persisted; results expose only bounded staff fields and state codes. |

## Work Unit Evidence — Task 1.3b1b
**Work unit**: `task-1.3b1b-access-transition-tests`; auto-chain; stacked-to-main; approved issue #39; one attempt.
**Prior context**: Completes slice 1.3b1 on top of merged 1.3b1a (PR #40 / issue #38). Adds the deterministic access-transition suite (deactivation, reactivation compensation/recovery, role-only transitions), tightens the deactivation success check to also verify the requested role (reviewer note from 1.3b1a), and closes the 1.3b1 OpenSpec entry.

### Completed Tasks
- [x] 1.3b1 Add dependency-injected fail-closed staff orchestration and deterministic recovery tests.
- [ ] 1.3 Parent correction remains open until Edge Function integration (1.3b2) is complete.
- [ ] 1.3b2 Wire the Edge Function and prove staging contention, restoration, and cleanup.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused deterministic regression | `node scripts/admin-staff-orchestration-regression.mjs`: exit 0, **26/26 passed** — the 9 slice-a invitation/cleanup cases plus deactivation denial without Auth mutation, ambiguous deactivation proven inactive/still-active/unknown, ban-failure compensation, deactivation success with exact inactive/banned state, deactivation with role change verifying both role and inactive state, reactivation success, ambiguous reactivation never taking early success, compensation failure, Auth re-ban failure, unban failure desired-safe, ambiguous unban compensation, role change success/ambiguous-restore/unchanged, and non-managed/missing staff rejection — all with exact effect ordering and maximum call counts. |
| Module change | `supabase/functions/manage-staff/orchestration.js`: deactivation success now also verifies `final.value.role === role` (one condition); no other behavior changed. |
| Package script | `npm run test:admin-staff-orchestration` runs the same deterministic regression. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert the deactivation role-check condition in `orchestration.js`, the added access-transition tests in `scripts/admin-staff-orchestration-regression.mjs`, the 1.3b1 checkbox in `tasks.md`, the `state.yaml` pending/work-unit hunks, and this evidence section. The 1.3b1a module/test delivery, transactional RPC (1.3a), task 1.5 files, and public behavior remain intact. |
| Privacy boundary | No credentials, recipient data, profile/Auth IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 1.3b2
**Work unit**: `task-1.3b2-edge-runtime`; auto-chain; stacked-to-main; approved issue #42; one attempt; parent issue #35 closes after this evidence.
**Prior context**: Slice 1.3b2 wires the reviewed orchestration module into the `manage-staff` Edge Function with thin HTTP/Supabase adapters, deploys only to the isolated ASANDA Staging project (us-east-1) from the staging CLI context, and proves runtime contention, restoration, and verified cleanup. The module and transactional RPC were delivered in 1.3b1 and 1.3a and are used unchanged.

### Completed Tasks
- [x] 1.3 Correct `manage-staff` with serialized profile authority and fail-closed Auth ordering.
  - [x] 1.3a Add the service-role-only transactional staff profile transition RPC and focused SQL regression.
  - [x] 1.3b1 Add dependency-injected fail-closed staff orchestration and deterministic recovery tests.
  - [x] 1.3b2 Wire the Edge Function and prove staging contention, restoration, and cleanup.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Edge wiring | `supabase/functions/manage-staff/index.ts` (129 lines) only maps HTTP to commands and adapters: gateway CORS/methods, bearer verification, fresh active-administrator actor check, command validation, Supabase adapters over the reviewed module, Spanish bounded responses, and RPC status mapping (23514 → 409, self-removal 42501 → 409, other 42501 → 403, 22023 → 422). JWT verification is enabled by the platform default; `supabase/config.toml` contains no `verify_jwt = false` entry. No orchestration logic is duplicated. |
| Focused hosted regression | `npm run test:admin-staff` against staging: exit 0 — missing bearer and non-administrator actor denied; unknown action, missing fields, non-UUID target, disallowed role, non-boolean active flag, null/array/primitive/malformed JSON all 422; self-demotion and last-admin self-removal 409; role transition and restoration exact; deactivation exact with banned Auth and denied stale sessions; reactivation exact with fresh sign-in and profile read; real two-administrator contention race with exactly one winner and one safe denial (403/409/502, never recovery-required) and exactly one active administrator remaining; survivor restores the removed administrator; editor identity returns to editor; both fixtures verified with fresh sessions; invitation 201 with exact bounded staff and exact profile/Auth state; invited Auth user and cascaded profile deleted with exact absence verified; emergency service-role restoration exercised on both fixtures with exact final-state verification. |
| Deployment boundary | Function deployed only to the isolated ASANDA Staging project (us-east-1) via the staging CLI context; production project never linked, contacted, or deployed. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Delete the deployed staging function, revert `index.ts`, `scripts/admin-staff-regression.mjs`, the `test:admin-staff` package script, the 1.3b2 checkbox in `tasks.md`, the `state.yaml` completed/work-unit hunks, and this evidence section. The orchestration module (1.3b1), the transactional RPC (1.3a), task 1.5 files, and public application behavior remain unchanged. |
| Privacy boundary | No credentials, recipient data, profile/Auth IDs, tokens, or private staging details were introduced or persisted; the invitation recipient and service credentials exist only as process environment variables; results expose only bounded staff fields and state codes. |

## Content Contract Evidence — Task 1.5
**Work unit**: `task-1.5-content-contracts`; auto-chain; stacked-to-main; approved issue #44; one attempt.
**Prior context**: Delivered on top of the completed 1.3 correction chain (PRs #37/#40/#41/#43). The contracts were authored and verified on staging earlier and are now delivered as their own PR.
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused static contract check | `node --input-type=module -e '<6 migration markers (featured_athletes, source_mappings, commit_result_import, resolution_status, results_publication, revision) and 3 regression markers (has_table_privilege, Every source mapping, Athletes require active)>'`: exit 0. |
| Runtime harness | Isolated ASANDA Staging: dry-run selected only migration `20260817190000` (applied once); `supabase db query` from the staging CLI context ran `supabase/tests/admin-content-contracts.sql` in one attempt (exit 0) — privacy grants, publication/consent guards, featured constraints, unresolved-mapping rejection, and self-cleaning verified. Production was not mutated. |
| Cleanup evidence | Read-only staging query after the run: `athlete_count=0`, `mapping_count=0`, `featured_count=0`, `recent_test_table_audit_count=0`; the temporary SQL file was deleted and verified absent. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert `supabase/migrations/20260817190000_add_admin_content_contracts.sql`, `supabase/tests/admin-content-contracts.sql`, the 1.5 checkbox in `tasks.md`, and this evidence section; manage-staff work, public fixtures, and prior migrations remain untouched. |
| Privacy boundary | No credentials, recipient data, IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 1.6
**Work unit**: `task-1.6-sign-media-upload`; auto-chain; stacked-to-main; approved issue #46; one attempt.
**Prior context**: Adds the `sign-media-upload` Edge Function on top of the completed 1.3 chain and task 1.5 PR. Cloudinary signing secrets are read only from `Deno.env`; the public cloud name stays in the browser config.
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused deterministic regression | `node scripts/admin-sign-media-regression.mjs`: exit 0, **6/6 passed** — canonical parameter ordering, signature matches a known SHA-1 vector, signature changes with secret/timestamp/folder, folder validation accepts bounded `asanda/` folders (≤ 80 chars), rejects unsafe/foreign/malformed folders (`../`, spaces, wrong prefix, non-string), and the response payload never exposes the api secret. |
| Module isolation | `supabase/functions/sign-media-upload/signature.js` imports natively as ESM in Node without dependencies; hashing is dependency-injected (Web Crypto in Deno, `node:crypto` in tests); no Deno, Supabase, network, or environment APIs are referenced. |
| Focused hosted regression | `npm run test:admin-sign-media-harness` against staging with test-only Cloudinary secrets: exit 0, **11/11 passed** — anonymous and bogus bearer denied, non-POST denied, foreign folder rejected before authorization, missing folder, malformed body and invalid folder rejected, editor receives a bounded payload whose signature re-verifies against the staging secret, deactivated actor is denied immediately with the same session (Auth ban at the gateway or fresh role check), and the restored actor signs again without re-login. |
| Edge wiring | `index.ts` only maps HTTP to signing: gateway CORS/methods, bearer verification, fresh active editor/administrator check from `profiles` on every request, strict folder validation, bounded Spanish errors, and short-lived `folder`+`timestamp`+SHA-1 signature with secret isolation. |
| Deployment boundary | Function deployed only to the isolated ASANDA Staging project (us-east-1) via the staging CLI context with test-only Cloudinary secrets; production project never linked, contacted, or deployed. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Delete the deployed staging function, revert `index.ts`, `signature.js`, `scripts/admin-sign-media-regression.mjs`, the `test:admin-sign-media` package script, the 1.6 checkbox in `tasks.md`, and this evidence section. Manage-staff, task 1.5 contracts, and public application behavior remain unchanged. |
| Privacy boundary | No credentials, recipient data, profile/Auth IDs, tokens, or private staging details were introduced or persisted; Cloudinary secrets exist only as staging function secrets. |

## Work Unit Evidence — Task 2.1a
**Work unit**: `task-2.1a-editorial-core`; auto-chain; stacked-to-main; approved issue #48; one attempt.
**Prior context**: First slice of Phase 2 editorial operations on top of the merged 1.3/1.5/1.6 chain. Task 2.1 splits into 2.1a (service-level RED tests with the pure domain core, this unit) and 2.1b (E2E RED tests, lands with the UI unit).
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused deterministic regression | `node scripts/admin-editorial-regression.mjs`: exit 0, **12/12 passed** — valid input accepted; title/slug/summary/category/date boundaries; future publication accepted as scheduling; HTML markup and `javascript:` schemes rejected; plain text passes and renders inert; limited Markdown (bold, italic, http links, lists, paragraphs) renders safely with non-http links staying inert; image type/size/name validation; featured window order/uniqueness/date validation and time-based filtering without deletion; draft/scheduled/published/archived derivation. |
| Module isolation | `src/services/admin/editorialLogic.js` imports natively as ESM in Node without dependencies; no Supabase, Deno, network, timer, storage, or environment APIs are referenced. |
| Package script | `npm run test:admin-editorial` runs the same deterministic regression. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert `src/services/admin/editorialLogic.js`, `scripts/admin-editorial-regression.mjs`, the `test:admin-editorial` package script, the 2.1a tasks.md hunks, and this evidence section. Admin shell, public site, and prior deliveries remain untouched. |
| Privacy boundary | No credentials, recipient data, IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 2.2a
**Work unit**: `task-2.2a-editorial-services`; auto-chain; stacked-to-main; approved issue #50.
**Prior context**: Second slice of Phase 2 on top of merged 2.1a (editorial core, PR #49). Task 2.2 splits into 2.2a (services + RLS regression, this unit) and 2.2b (UI, later).
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused RLS regression | `supabase db query --linked --file supabase/tests/admin-editorial-services.sql` against isolated ASANDA Staging: exit 0 — anonymous clients see exactly one of draft/scheduled/published fixtures (drafts and future-scheduled articles hidden), unlinked media assets invisible to anonymous clients, expired featured windows hidden with only the active window visible; cleanup deleted every fixture row and audit residue. |
| Defect remediation | The regression exposed that migration 1.5 created `featured_athletes` and `source_mappings` with policies but without row-level security enabled (`relrowsecurity=false`), so anonymous clients read every featured window including expired ones. Corrective migration `20260818150000_enable_content_contracts_rls.sql` enables RLS on both tables; it was dry-run selected, applied once on staging, and both `admin-content-contracts.sql` (1.5) and `admin-editorial-services.sql` (2.2a) regressions pass after it. The regression also exercises editor-role writes (authenticated role) for news, media, and featured rows, proving the editor RLS policies are now effective. |
| Service wiring | `src/services/admin/news.js`, `media.js`, and `featured.js` are thin Supabase wrappers over the reviewed `editorialLogic` core: validation before every write, normalized admin rows with derived `status`, signature request through the deployed `sign-media-upload` function, and media/featured payloads constrained to public fields. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert the three service files, `supabase/tests/admin-editorial-services.sql`, migration `20260818150000_enable_content_contracts_rls.sql` (re-enables RLS on `featured_athletes` and `source_mappings`; without it anonymous clients again read every featured window), the 2.2a tasks.md hunks, and this evidence section. Editorial core, admin shell, public site, and prior deliveries remain untouched. |
| Privacy boundary | No credentials, recipient data, IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 2.2b
**Work unit**: `task-2.2b-admin-news-ui`; auto-chain; stacked-to-main; approved issue #52.
**Prior context**: Third slice of Phase 2 on top of merged 2.2a (editorial services, PR #51). Task 2.2 splits into 2.2a (services, done), 2.2b (news UI, this unit), and 2.2c (media and featured UI, later).
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Routes | `/admin` redirects to `/admin/noticias`; news list at `/admin/noticias`; editor at `/admin/noticias/nueva` and `/admin/noticias/:id`; all inside the guarded `AdminShell` layout with its new module navigation (Noticias). |
| News list | Status badges (Borrador, Publicada, Programada, Archivada), publish/archive actions wired to `publishNews`/`archiveNews` with per-row busy state, plus loading (`role=status`), empty, and error-with-retry (`role=alert`) states. |
| News editor | Title, slug (generator from title), category, summary, and safe-markdown body fields validated with the reviewed `validateNewsInput`; live preview rendered via `renderSafeBody` (escaped, link/bold/italic/lists only); save and publish wired to `createNews`/`updateNews`/`publishNews`; editing an article replaces the URL so publish works after first save. |
| Accessibility | Keyboard-operable controls, visible focus, semantic landmarks, Spanish copy, no motion-dependent feedback, Lucide icons only. |
| Build | `npm run build`: passed. |
| E2E baseline | `npm run test:e2e`: passed (existing scenarios, no new tests in this unit; 2.1b lands later). |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert `src/admin/AdminShell.jsx` (layout + nav), `src/admin/AdminNewsPage.jsx`, `src/admin/NewsEditorPage.jsx`, the `src/App.jsx` admin route hunks, the 2.2b tasks.md hunks, and this evidence section. Services, editorial core, admin login, and public site remain untouched. |
| Privacy boundary | No credentials, recipient data, IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 2.2c
**Work unit**: `task-2.2c-admin-media-ui`; auto-chain; stacked-to-main; approved issue #53.
**Prior context**: Fourth slice of Phase 2 on top of merged 2.2b (news UI, PR #54). Task 2.2 splits into 2.2a (services, done), 2.2b (news UI, done), 2.2c (media UI, this unit), and 2.2d (featured UI, later).
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Route | `/admin/media` inside the guarded `AdminShell` layout; module navigation gains Imágenes. |
| Media list | Latest-first grid of `media_assets` with thumbnails via the existing `getCloudinaryUrl` helper, format/size/dimensions metadata, plus loading (`role=status`), empty, and error-with-retry (`role=alert`) states. `listAdminMedia` added to `src/services/admin/media.js` following the existing normalize pattern. |
| Upload flow | File picker (JPG/PNG/WebP, up to 8 MB) validated with the reviewed `validateImageFile`; optional alt text; signature from the deployed `sign-media-upload` function for folder `asanda/media`; direct Cloudinary upload with the signed `folder`/`timestamp`/`api_key`/`signature`; asset inserted via `insertMediaAsset`; busy, success, and error feedback; the picker resets after a successful upload. |
| Accessibility | Keyboard-operable controls, visible focus, semantic landmarks, Spanish copy, Lucide icons only, thumbnails with alt text. |
| Build | `npm run build`: passed. |
| E2E baseline | `npm run test:e2e`: passed (existing scenarios, no new tests in this unit; 2.1b lands later). |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert `src/admin/AdminMediaPage.jsx`, the `listAdminMedia` addition in `src/services/admin/media.js`, the Imágenes nav hunks in `src/admin/AdminShell.jsx`, the `src/App.jsx` media route hunks, the 2.2c tasks.md hunks, and this evidence section. Services, editorial core, news UI, admin login, and public site remain untouched. |
| Privacy boundary | No credentials, recipient data, IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 2.2d
**Work unit**: `task-2.2d-admin-featured-ui`; auto-chain; stacked-to-main; approved issue #55.
**Prior context**: Fifth slice of Phase 2 on top of merged 2.2c (media UI, PR #56). Task 2.2 splits into 2.2a (services, done), 2.2b (news UI, done), 2.2c (media UI, done), and 2.2d (featured UI, this unit).
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Route | `/admin/destacados` inside the guarded `AdminShell` layout; module navigation gains Destacados. |
| Featured list | Ordered list (1-6) with window dates, active/out-of-window badge computed with the reviewed `featuredWindow`, edit and remove actions wired to `saveFeaturedAthlete`/`removeFeaturedAthlete`, plus loading (`role=status`), empty, and error-with-retry (`role=alert`) states. |
| Editor form | Publishable-athlete selector fed by the new `listPublishableAthletes` (`publication_status='published'`, excluding athletes already selected unless editing), order 1-6, start/end window in `datetime-local` converted to/from local time; client validation with `featuredWindow` before saving. |
| Accessibility | Keyboard-operable controls, visible focus, semantic landmarks, Spanish copy, Lucide icons only, labeled form fields. |
| Build | `npm run build`: passed. |
| E2E baseline | `npm run test:e2e`: passed (existing scenarios, no new tests in this unit; 2.1b lands later). |
| Diff check | `git diff --check`: passed. |
| Rollback boundary | Revert `src/admin/AdminFeaturedPage.jsx`, the `listPublishableAthletes` addition in `src/services/admin/featured.js`, the Destacados nav hunks in `src/admin/AdminShell.jsx`, the `src/App.jsx` featured route hunks, the 2.2d tasks.md hunks, and this evidence section. Services, editorial core, news and media UI, admin login, and public site remain untouched. |
| Privacy boundary | No credentials, recipient data, IDs, tokens, or private staging details were introduced or persisted. |

## Work Unit Evidence — Task 2.1b
**Work unit**: `task-2.1b-admin-editorial-e2e`; auto-chain; stacked-to-main; approved issue #58.
**Prior context**: Final E6 editorial validation slice on top of merged 2.2d (featured UI, PR #57). This unit adds browser coverage for the already delivered editorial UI and services without changing production code.
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Route coverage | Added `tests/e2e/admin-editorial.spec.js` with three Playwright workflows: news create/publish/archive, featured athlete add/edit/remove, and signed media upload. |
| PostgREST mock contract | News, featured, and media write mocks inspect the request `Accept` header and return an object when it includes `application/vnd.pgrst.object+json`; otherwise they return arrays. Featured POST also attaches the embedded `athletes.display_name` fixture used by the UI after reload. |
| Focused E2E command | `npx playwright test tests/e2e/admin-editorial.spec.js`: passed, **3/3 passed** — news, featured windows, and signed media upload workflows completed. |
| Delivery evidence | Commit `d470c8c` (`test: add admin editorial e2e flows`) merged through PR #59 into `main` as merge commit `b52f0c8`; issue #58 closed as completed by `Closes #58`. |
| Diff check | `git show --check HEAD`: passed after the E6 merge commit inspection; no whitespace errors reported. |
| Rollback boundary | Revert `tests/e2e/admin-editorial.spec.js` and this 2.1b evidence/checkbox update. Production admin routes, services, migrations, staff work, and public site behavior remain untouched. |
| Privacy boundary | No credentials, private profile IDs, tokens, recipient data, or real media uploads were introduced; E2E uses synthetic editor/profile fixtures and mocked Cloudinary responses only. |

## Work Unit Evidence — Task 2.3
**Work unit**: `task-2.3-public-news-migration`; auto-chain; stacked-to-main; approved issue #60.
**Prior context**: Public migration slice after E6 merged through PR #59. This unit moves public news reads from static fixtures to published Supabase articles and adds the public detail route.
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Public service | Added `src/services/news.js` with anonymous read helpers for due published `news_articles`, explicit `publication_status='published'` and `published_at <= now()` filters, Cloudinary hero normalization, and safe body rendering. |
| Homepage and list migration | `NewsSection.jsx` and `NoticiasPage.jsx` now load published news via the public service and render stable loading, error, empty, and linked-card states without exposing draft, archived, scheduled, author, profile, or private media fields. |
| Detail route | Added `src/pages/NoticiaPage.jsx` and `/noticias/:slug`, with loading, error, not-found, back-link, semantic article content, accessible image alt text, and safe rendered body. |
| Focused E2E command | `npx playwright test tests/e2e/public-news.spec.js`: passed, **3/3 passed** — homepage/list show only due published news, detail renders a published slug with safe body, and unpublished/missing slugs render not-found. |
| Regression compatibility | `npx playwright test tests/e2e/homepage-stats.spec.js tests/e2e/public-news.spec.js`: passed, **12/12 passed**. `homepage-stats.spec.js` now mocks public news for the existing palette assertion that inspects a news card. |
| Baseline E2E | `npm run test:e2e`: passed, **57/57 passed**. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed; only line-ending warnings were emitted by Git for touched files. |
| Rollback boundary | Revert `src/services/news.js`, `src/components/NewsSection.jsx`, `src/pages/NoticiasPage.jsx`, `src/pages/NoticiaPage.jsx`, the `/noticias/:slug` route in `src/App.jsx`, `tests/e2e/public-news.spec.js`, the public-news helper in `tests/e2e/homepage-stats.spec.js`, and this 2.3 OpenSpec evidence. Admin editorial/staff code and database migrations remain untouched. |
| Privacy boundary | Public queries request only article and hero media fields needed for rendering; tests prove draft and future-scheduled articles do not render publicly. No credentials, private profile data, raw uploads, or real external calls were introduced. |

## Work Unit Evidence — Task 3.2
**Work unit**: `task-3.2-athlete-relations`; auto-chain; stacked-to-main; approved issue #71; parent issue #64.
**Delivery chain**: SQL contracts merged through PR #66 at `515bdef`; athlete services through PR #68 at `2e9dc38`; wizard shell and consent coverage through PR #70 at `3eed8ac`. This unit completes task 3.2 with the remaining relation coverage on that exact base.

### Completed Tasks
- [x] 3.2 Athlete wizard for public profile, approved media, consent confirmation, categories, disciplines, and memberships.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused E2E | `npx playwright test tests/e2e/admin-athletes.spec.js`: passed, **4/4 passed** — consent preservation, category-overlap preservation, valid discipline/membership POST contracts, and federated/pre-infant rejection preservation. |
| Runtime harness | `npm run test:e2e`: passed, **61/61 passed**. |
| Build | `npm run build`: passed; Vite transformed **1,487 modules**. |
| Diff check | `git diff --check`: passed; only line-ending conversion warnings were emitted. |
| Authored budget | **174 additions plus deletions** across the athlete E2E coverage and surgical task 3.2 OpenSpec updates; below the 400-line limit. |
| Rollback boundary | Revert the relation helper and three relation scenarios in `tests/e2e/admin-athletes.spec.js`, the task 3.2 checkbox, and this evidence section. Leave merged SQL contracts, athlete services, wizard UI, task 3.1, task 3.3, and all prior deliveries unchanged. |
| Privacy and environment | Synthetic public athlete/reference fixtures only; no database, linked project, staging, production, credentials, private identity data, or external service was contacted. |

## Work Unit Evidence — Task 3.1
**Work unit**: `task-3.1-athlete-club-sql-contracts`; auto-chain; stacked-to-main; approved issue #65 (athlete slice) and issue #73 (club lifecycle slice); parent issue #64.
**Delivery chain**: Athlete SQL contracts merged through PR #66 at `515bdef`; this unit completes task 3.1 with the club lifecycle migration and archival/contact SQL coverage on `origin/main` at `30271cb`.

### Completed Tasks
- [x] 3.1 RED SQL/E2E tests for consent gates, category overlap, federation coverage, pre-infant rejection, contacts, and archival.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| SQL regression | `supabase/tests/admin-athlete-club-rules.sql` covers anonymous/private contact visibility, archival preserving memberships, and delete rejection for clubs referenced by memberships, competitions, and historical results; deterministic fixtures with transaction rollback. |
| Migration | `supabase/migrations/20260820120000_add_club_lifecycle_contracts.sql` adds `on delete restrict` for organization references, approved Cloudinary logo enforcement, and archive-only delete trigger. |
| Static SQL validation | `sqlfluff parse`/`lint --dialect postgres` on migration and regression: passed. |
| Build | `npm run build`: passed. |
| Diff check | `git diff --check`: passed; only line-ending conversion warnings were emitted. |
| SQL runtime | Not executed: local PostgreSQL/Docker unavailable; no linked, staging, or production database was contacted. |
| Authored budget | **225 additions plus deletions** across the migration, SQL regression, and surgical OpenSpec updates; below the 400-line limit. |
| Rollback boundary | Revert the club lifecycle migration, the club archival/contact SQL block, the task 3.1 checkbox, and this evidence section. Athlete contracts, services, wizard, and all prior deliveries remain unchanged. |
| Privacy and environment | Synthetic public fixtures only; no credentials, private identity data, or external services were contacted. |

## Work Unit Evidence — Task 3.3
**Work unit**: `task-3.3-club-admin-ui`; stacked-to-main; approved issue #77; parent #64; base `d296fe8`.
| Evidence | Result |
|---|---|
| Focused E2E | `npx playwright test tests/e2e/admin-clubs.spec.js`: **1/1 passed**; typed private contact hidden publicly and archive PATCH proven with zero DELETEs. |
| Baseline | `npm run test:e2e`: **62/62 passed**. `npm run build`: passed, **1,489 modules**. `git diff --check`: passed. |
| Authored budget | **170 additions plus deletions**; below 400. |
| Rollback boundary | Revert `AdminClubManager.jsx`, club route/nav hunks, `admin-clubs.spec.js`, task 3.3 checkbox, and this receipt; merged services, public reads, migrations, tasks 3.1/3.2, and other modules remain. |
| Environment | Synthetic mocked E2E only; no database, linked project, staging, production, or external service contacted. |

## Work Unit Evidence — Task 4.1
**Work unit**: `phase-4-task-4.1-hy3-red-fixtures`; Standard Mode (`strict_tdd: false`) with an explicit RED contract; auto-chain; stacked-to-main; no native attempt state was acquired or mutated.
### Completed Tasks
- [x] 4.1 Synthetic HY3 fixtures and RED parser contract.
### Exact Fixture Matrix
| Fixture | Coverage |
|---|---|
| `synthetic-supported.hy3` | A/B/C/D/E/F/H, decimal seconds, relay, DQ note, and synthetic private canaries. |
| `synthetic-windows-1252.hy3` | Windows-1252 bytes for accents, euro, punctuation, display names, and notes. |
| `synthetic-unsupported-version.hy3` | Well-formed geometry with unsupported `HY3-99.0` version. |
| `synthetic-malformed-record.hy3` | Supported header followed by a deliberately short 9-byte A record. |
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused fixture check | `npm run test:hy3-fixtures`: exit 0; 7/7 fixture checks passed. |
| RED parser regression | `npm run test:hy3`: exit 1 as expected; fixture checks 7/7, parser contract 0/8 with 8 expected RED failures because `src/services/admin/hy3Parser.js` is task 4.3 scope; no fixture or infrastructure failure. |
| Syntax check | `node --check scripts/hy3-regression.mjs; node --check tests/fixtures/hy3/harness.mjs`: exit 0. |
| Build | `npm run build`: exit 0; Vite transformed 1,489 modules. Prebuild-generated public metadata was restored. |
| Diff check | `git diff --check`: exit 0; only existing LF/CRLF conversion warnings for touched JSON/Markdown files. |
| Runtime harness | `npm run test:hy3-fixtures`: local byte-level fixture harness exercised 7/7; no external runtime boundary exists because parser/worker production behavior is task 4.3 scope. |
| Rollback boundary | Delete `scripts/hy3-regression.mjs` and `tests/fixtures/hy3/`; revert the HY3 package scripts, task 4.1 checkbox, and this evidence section. No parser, worker, UI, RPC, database, or public behavior was changed. |
| Privacy boundary | All names, aliases, IDs, dates, contacts, hosts, and private canaries are unmistakably synthetic; tests reject real-brand markers, credentials, external URLs, and private values in sanitized output. |
| Authored budget | 383 changed lines including fixture/test/docs and surgical OpenSpec/package updates; below the 400-line PR target and below the authorized 800-line maximum. |
| Expected RED boundary | The missing parser module is the only intentional failure; task 4.1 supplies no fake parser or worker implementation. |

## Work Unit Evidence — Task 4.2
**Work unit**: `phase-4-task-4.2-calendar-events`; Standard Mode (`strict_tdd: false`); auto-chain; stacked-to-main; native attempt state was not acquired or mutated.
### Completed Tasks
- [x] 4.2 Venue, competition lifecycle, and ordered event-program administration.
### Implementation
- Added RLS-compatible admin services and guarded routes for reusable venues, competition CRUD/publication/lifecycle states, and event-program CRUD.
- Added database contracts for exact venue identity reuse, active sport/category references, date-bounded schedules, historical deletion protection, and transactional deterministic event reordering.
- Added Spanish accessible UI states and behavior-first E2E coverage for invalid dates, venue creation, ordered events, publication, postponement, completion, and archival.
### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused behavior test | `npx playwright test tests/e2e/admin-calendar.spec.js`: exit 0; **1/1 passed**. |
| Runtime harness | `npm run test:e2e`: exit 0; **63/63 passed** with mocked Supabase Auth/PostgREST/RPC routes only. No database, linked project, staging, production, or external service was contacted. |
| SQL contract parse | `sqlfluff parse --dialect postgres` for the migration and regression: both passed. SQL runtime was intentionally not executed because this work unit forbids database contact. |
| Build | `npm run build`: exit 0; Vite transformed **1,491 modules**. Generated public manifest, robots, and sitemap metadata were restored. |
| Diff check | `git diff --check`: exit 0; only existing LF/CRLF conversion warnings were emitted. |
| Rollback boundary | Revert `AdminCalendarPage.jsx`, `src/services/admin/calendar.js`, the calendar route/nav hunks, the competition-admin migration and SQL regression, `admin-calendar.spec.js`, and this task/progress receipt. Existing public calendar reads, prior admin modules, HY3 fixtures, and result-import work remain untouched. |
| Privacy boundary | Only public venue/location, organization display, competition, event-definition, category, schedule, and lifecycle fields are requested; no contacts, identity details, credentials, raw HY3 data, or external service calls were added. |
| Authored budget | **628 final changed lines; 608 before this receipt; 800-line actor maximum respected.** Recommended split: schema contract slice **256 lines** (`20260820133000_add_competition_admin_contracts.sql` + `admin-calendar-contracts.sql`), application/runtime slice **372 lines** (service, UI, routes/nav, E2E, task checkbox, and progress receipt). Both slices remain below the repository's 400-line review target. |

## Work Unit Evidence — Task 4.3
**Work unit**: `phase-4-task-4.3-hy3-parser`; Standard Mode (`strict_tdd: false`); auto-chain; stacked-to-main; native attempt state was not acquired or mutated.

### Completed Tasks
- [x] 4.3 Local HY3 worker/parser, checksum, team/athlete reconciliation UI, source mappings, sanitized preview, and optional CSV fallback.

### Implementation
- Added a Windows-1252, fixed-width `HY3-8.0` parser for A/B/C/D/E/F/H records with decimal and clock times, relay semantics, DQ/no-time handling, stable fail-closed codes, duplicate/reference validation, and a SHA-256 checksum.
- Added a module worker boundary that parses bytes locally and returns only the sanitized preview; added a public-column-only CSV fallback.
- Added pure reconciliation for competition events and source mappings, RLS-backed mapping persistence, and an authenticated `/admin/resultados` preview flow with Spanish accessible states and no private-field rendering.
- Added deterministic worker/reconciliation regression coverage and a Playwright preview/blocked-mapping scenario.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused parser test | `npm run test:hy3`: exit 0; fixture checks **7/7** and the declared parser contract **8/8**, with **0 RED** failures. |
| Focused fixture test | `npm run test:hy3-fixtures`: exit 0; **7/7** fixture checks passed. |
| Focused worker/reconciliation test | `npm run test:hy3-import`: exit 0; **5/5** checksum/privacy, worker, resolved reconciliation, fail-closed mapping, and CSV fallback checks passed. |
| Focused runtime harness | `npx playwright test tests/e2e/admin-results.spec.js`: exit 0; **1/1 passed** for local HY3 processing, sanitized preview, inaccessible private canary, and blocked unresolved mappings using mocked Auth/PostgREST only. |
| Full runtime harness | `npm run test:e2e`: exit 0; **64/64 passed**. No database, linked project, staging, production, or external service was contacted. |
| Build | `npm run build`: exit 0; Vite transformed **1,495 modules**. Generated public manifest, robots, and sitemap files were restored. |
| Diff check | `git diff --check`: exit 0; only existing LF/CRLF conversion warnings were emitted. |
| Rollback boundary | Revert `src/services/admin/hy3Parser.js`, `src/services/admin/hy3Reconciliation.js`, `src/services/admin/results.js`, `src/workers/hy3Import.worker.js`, `src/admin/AdminResultsPage.jsx`, the results route/nav hunks, `scripts/hy3-import-regression.mjs`, `tests/e2e/admin-results.spec.js`, the HY3 README/package script, and this 4.3 evidence/checkbox. Leave the 4.1 fixtures, calendar module, existing source-mapping/RLS/RPC contracts, and public result behavior unchanged. |
| Privacy boundary | No raw HY3 bytes, exact birth dates, identity numbers, contacts, credentials, or external service data were added to source, UI, logs, fixtures, or network mocks. |
| Authored budget | **525 changed lines** for this candidate (parser/worker/reconciliation/service/UI/tests/docs/routes/package and surgical OpenSpec updates); below the 800-line actor maximum. Recommended repository PR split: **PR A — 252 lines** for parser/worker/import regression, package script, and fixture contract documentation; **PR B — 273 lines** for reconciliation/service/admin route/UI/E2E and OpenSpec receipt. Both boundaries are autonomous and below the repository's 400-line review target. |

## Work Unit Evidence — Task 4.4
**Work unit**: `phase-4-task-4.4-result-import-validation`; Standard Mode (`strict_tdd: false`); auto-chain; stacked-to-main; native attempt state was not acquired or mutated.

### Completed Tasks
- [x] 4.4 RED SQL/E2E validation for result import, manual correction, fail-closed validation, atomic rollback, and media fallbacks.

### Implementation
- Added `supabase/tests/admin-result-import-contracts.sql` as a RED database contract for the task 4.5 `commit_result_import` surface. The transaction covers unresolved mappings, malformed payload/checksum, missing event references, results consent, duplicate rows/checksums, manual correction reason and audit evidence, revision conflicts, atomic residue counts, and stable missing-media fallbacks.
- Extended `tests/e2e/admin-results.spec.js` with unsupported/malformed HY3 error states, closed import controls on blocked previews, and manual mapping correction through the current sanitized-preview UI. The resolved preview also proves disqualified rows retain an empty time and no media/private fields are rendered.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused E2E test | `npx playwright test tests/e2e/admin-results.spec.js`: exit 0; **3/3 passed** — sanitized blocked preview, unsupported/malformed error states with import closed, and manual mapping correction with no-time/media/privacy boundary. |
| Runtime harness | The focused Playwright suite is the real browser/runtime harness for the current application surface; it used only local Vite plus mocked Auth/PostgREST routes. No import RPC or task 4.5 runtime was required. |
| Full E2E regression | `npm run test:e2e`: exit 0; **66/66 passed**. |
| SQL contract parse | `sqlfluff parse --dialect postgres supabase/tests/admin-result-import-contracts.sql`: exit 0. |
| SQL RED/deferred-runtime boundary | The SQL regression was intentionally not executed: task 4.4 adds RED tests for the future transactional/manual-correction runtime, and the launch constraints prohibit database, linked, staging, production, and external-service contact. SQL execution remains deferred to task 4.5/verification. |
| Build | `npm run build`: exit 0; Vite transformed **1,495 modules**. Build-generated `public/manifest.webmanifest`, `public/robots.txt`, and `public/sitemap.xml` were restored and remain outside this slice. |
| Diff check | `git diff --check`: exit 0; only existing LF/CRLF conversion warnings were emitted. |
| Rollback boundary | Revert `supabase/tests/admin-result-import-contracts.sql`, the three added scenarios/assertion in `tests/e2e/admin-results.spec.js`, the task 4.4 checkbox, and this evidence section. Leave the 4.1 fixtures, 4.3 parser/worker/reconciliation implementation, task 4.5 RPC implementation, public result behavior, and all prior work untouched. |
| Privacy and environment | Synthetic aliases and display names only; no raw HY3 bytes, private identity/contact data, credentials, database endpoints, linked projects, staging, production, or external services were contacted. |

### Deviations and Issues
- None from the approved design. The current 4.3 surface does not expose the future task 4.5 import-submit button or manual-performance editor, so E2E coverage validates the pre-import gate and current mapping correction controls without inventing a parallel runtime.
- Current parser failures reach the existing formatter as `{ ok: false, code }` objects and therefore render its generic Spanish error notice. The E2E test records that current behavior rather than changing production error formatting outside task 4.4.

### Delivery Boundary
- Authorized actor maximum: **800 changed lines**; this candidate remains below the limit.
- Final authored count: **418 changed lines** (`328` SQL contract additions + `56` E2E additions + `32` progress additions + `2` task checkbox changes); below the authorized 800-line maximum.
- Repository PR target: **PR A — 328 lines**, SQL contract file only; **PR B — 90 lines**, E2E coverage plus the task/progress receipt. Both autonomous boundaries are below the repository's 400-line review target.

## Work Unit Evidence — Task 4.5
**Work unit**: `phase-4-task-4.5-transactional-import`; Standard Mode (`strict_tdd: false`); auto-chain; stacked-to-main; native attempt was acquired and settled by the orchestrator.

### Completed Tasks
- [x] 4.5 Transactional import RPC, manual correction, audit reason, summary, and public photo/logo-enriched result query.

### Implementation
- Added `supabase/migrations/20260820150000_add_result_import_transaction.sql` with the `public.commit_result_import` RPC (8-argument evidence-aware surface plus a 6-argument convenience overload): editor authorization, source-type validation, bounded correction reason/evidence, resolved-and-unique mapping requirements, public-contract-only sanitized row fields, event/athlete/club reference validation, consent enforcement for official results, duplicate-row and duplicate-checksum rejection, competition revision concurrency control, audit reason/evidence propagation via `request.admin_audit_*` settings into `private.admin_audit_log`, and atomic all-or-nothing writes to `source_documents`, `import_batches`, `entries`, and `performances`.
- Added `supabase/migrations/20260820151000_add_public_result_query.sql` with `public.get_published_result_rows(uuid)` projecting official published results with photo/logo media only when public and consent-backed; revoked from all and granted to anon/authenticated.
- Extended `supabase/tests/admin-result-import-contracts.sql` so the task 4.4 RED contracts now target the implemented surface (RPC existence, anon denial, unresolved mapping rejection, malformed payload/checksum, missing references, consent, duplicates, audit retention, checksum duplication, atomic residue counts, revision conflicts, and stable missing-media fallbacks).
- Added `src/services/admin/results.js` commit path (`commitResultImport` with local checksum derivation, mapping id payload, and correction fields) and the manual correction/import submission UI in `src/admin/AdminResultsPage.jsx` with audit reason/evidence fields and a post-commit summary; added `src/services/results.js` for the public photo/logo-enriched result projection; extended `tests/e2e/admin-results.spec.js` with transactional import success, atomic RPC rejection, and manual-correction payload scenarios.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused E2E test | `npx playwright test tests/e2e/admin-results.spec.js`: exit 0; **6/6 passed** — blocked preview, unsupported/malformed fail-closed, mapping correction with no-time/media/privacy boundary, transactional import summary, atomic RPC rejection with unchanged state, and manual-correction reason/evidence payload. |
| Full runtime harness | `npm run test:e2e`: exit 0; **69/69 passed**. No database, linked project, staging, production, or external service was contacted. |
| Parser and import regressions | `npm run test:hy3`: **8/8 passed**, 0 RED; `npm run test:hy3-import`: **5/5 passed**. |
| SQL contract parse | `sqlfluff parse --dialect postgres` on the two migrations and the extended contract regression: exit 0 on all three files. |
| SQL runtime boundary | The contract regression was not executed against a database: this work unit forbids database, linked, staging, production, and external-service contact. Execution remains for Phase 5 verification. |
| Build | `npm run build`: exit 0; Vite build succeeded. Generated `public/manifest.webmanifest`, `public/robots.txt`, and `public/sitemap.xml` were restored and remain outside this slice. |
| Diff check | `git diff --check`: exit 0; only existing LF/CRLF conversion warnings were emitted. |
| Rollback boundary | Revert the two result-import migrations, the contract-test updates, the service/UI/E2E additions for import commit and public result projection, the task 4.5 checkbox, and this evidence section. Leave 4.1 fixtures, 4.3 parser/worker/reconciliation, 4.4 contracts, calendar work, and prior modules untouched. |
| Privacy and environment | Synthetic aliases and display names only; no raw HY3 bytes, private identity/contact data, credentials, database endpoints, linked projects, staging, production, or external services were contacted. |

### Deviations and Issues
- None material. The RPC exposes both an evidence-aware 8-argument surface and a 6-argument overload so existing and new clients share one reviewed transaction path; the design's manual-correction and audit requirements are satisfied by the evidence-aware surface.

### Delivery Boundary
- Authorized actor maximum: **800 changed lines**; this candidate remains below the limit.
- Final authored count: approximately **670 changed lines** (two migrations, contract-test updates, admin results service/UI hunks, public results service, E2E additions, and OpenSpec receipt).
- Repository PR target: **PR A — 371 lines**, transactional import RPC migration only; **PR B — approximately 300 lines**, public result query migration, contract-test updates, admin commit service/UI hunks, public results service, E2E scenarios, and the task/progress receipt. Both autonomous boundaries are below the repository's 400-line review target.

## Work Unit Evidence — Task 5.1
**Work unit**: `phase-5-task-5.1-verification`; completed against authorized ASANDA Staging project `vtfqueybnvawevsoxwsl`; production was never contacted.

### Completed Task
- [x] 5.1 SQL regressions, focused Node checks, full E2E, build, and diff verification.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Local Node regressions | Passed **26/26**, **6/6**, **12/12**, **7/7**, **8/8**, and **5/5**. |
| Baseline verification | Full E2E passed **69/69**; build and `git diff --check` passed. Build-generated public metadata was restored. |
| Staging identity and initial migrations | Verified authorized staging identity `vtfqueybnvawevsoxwsl`; production was never contacted. Migrations `20260820120000`, `20260820133000`, `20260820150000`, and `20260820151000` matched the dry run and were applied once to staging. |
| SQL test corrections | Qualified `athlete_disciplines.discipline_id`; replaced the overlapping synthetic active age range with existing `youth-a`. |
| Forward-only correction | Added `20260820152000_fix_result_import_entry_conflict.sql`, redefining only `commit_result_import` to use `ON CONFLICT ON CONSTRAINT performances_entry_id_key`; **287 additions**. SQL parse and static contract passed **12/12**; the dry run selected only this migration and the staging push succeeded once. |
| Migration history | Final staging migration history matched **25/25** through `20260820152000`. |
| SQL runtime regressions | Seven SQL regressions passed exactly once in the required order. The final read-only residue proof returned `residue_count=0` and `residue_free=true`. |
| Native runtime evidence | Revision `sha256:7248b16853d3857d4e3ed1c9c7f55172b1ffe2fce1b464db25c86c81d2378a2c`; the final staging harness settled `state: complete`. |
| Rollback boundary | Revert the two test-line corrections and the new forward migration in Git. The staging migration is forward-applied and must be reverted only by a separately reviewed forward migration, never by rewriting history. |

### Remaining Tasks
- [ ] 5.2 Production RLS validation.
- [ ] 5.3 Approved fixture migration, fallback removal, and operations documentation.

## Work Unit Evidence — Task 5.2 Readiness Preparation
**Work unit**: `phase-5-task-5.2-production-rls-readiness`; started in Standard Mode under the resolved `auto-chain` / `stacked-to-main` delivery path. Production execution is not authorized, so task 5.2 intentionally remains open.

### Current Status
- [ ] 5.2 Validate production RLS with administrator, editor, inactive, and anonymous accounts before enabling navigation.
- [x] Prepared and reviewed the production RLS validation runbook without accessing production or handling credentials.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Structured apply status | OpenSpec artifacts are present, `phase: apply`, and task 5.2 is the assigned pending task. Strict TDD is disabled by `openspec/config.yaml`. |
| Focused artifact review | Local static review passed **45/45** assertions: all four roles, rollback-only boundary, zero-lasting-impact requirement, independent residue proof, navigation hold, explicit non-authorization, secret-shape exclusions, and **32/32** repository references. The first harness invocation used the wrong literal for the evidence field and was corrected without changing the runbook. |
| Navigation hold | Static inspection found no `/admin` link in the public headers or application shell. Protected routes remain directly addressable but are not exposed through public navigation. |
| RDD mode | `gentle-ai review mode status --json --cwd .` reported effective mode `off` from `clone_local`; repository identity resolution then returned `Access is denied`. This work is therefore `disabled/unmanaged`, with no receipt or approval claim. |
| Production boundary | Production was not contacted. No credential, token, target identity, raw production value, Auth/profile state, schema, deployment, fixture, or navigation change was used or performed. |
| Runtime harness | **Blocked / not run**: the applicable runtime boundary is the separately authorized rollback-only production transaction plus independent residue proof. The runbook explicitly does not grant that authorization and no safe credential wrapper or reviewed transaction candidate is available. |
| Rollback boundary | Remove `production-rls-validation-runbook.md` and this readiness section only. No application source, migration, production state, Auth/profile state, or public navigation behavior changed in this work unit. |

### Completion Blockers
- A separate, explicit, time-bounded production execution authorization naming the operator, independent reviewer, maintenance window, cleanup owner, stop authority, and escalation contact.
- An immutable delivered Git candidate and approved delivery receipt with an independently reviewed migration manifest and checksums.
- Approved pre-provisioned administrator, editor, and inactive validation identities plus a confirmed production target reference supplied through a safe channel.
- A separately reviewed non-echoing credential mechanism, exact rollback-only transaction candidate, operation ledger, aggregate-only evidence queries, and independent residue procedure.

Task 5.2 must remain unchecked until the authorized run completes with safe evidence and zero residue. Admin navigation remains disabled and requires a separate post-evidence maintainer decision.

### Candidate Admission — Slice 1

The maintainer accepted bounded, non-semantic audit identity-sequence advancement for mutation-bearing validation. This policy change authorizes local candidate preparation only; production execution remains unauthorized.

| Evidence | Result |
|---|---|
| Candidate | Added `supabase/tests/production-rls-validation-candidate.sql` for the access/editorial slice. It covers administrator, editor, inactive authenticated, and anonymous roles without printing claim UUIDs. |
| Operation ledger | Audit evidence is bound to the exact fixture identifier, transaction, table, action, and approved actor role/identity. Pass requires one editor insert, one editor update, and one administrator update. |
| Sequence bound | A completed pass contributes exactly **3** identity allocations. A stopped run contributes **0..4** because an unexpectedly allowed profile-escalation probe may allocate once before failure; no final aggregate evidence can be interpreted as pass. Reset and trigger disabling remain prohibited. |
| Rollback | The candidate contains no commit, persistent DDL, grant, persistent profile/Auth mutation, migration, deployment, navigation change, or compensating delete, and ends in unconditional `rollback;`. The editor escalation probe is expected to affect zero rows; any unexpected transactional change fails and rolls back. |
| Independent residue slice | Added `supabase/tests/production-rls-validation-residue.sql`, a separate read-only aggregate proof for zero synthetic article and audit-row residue. Profile/Auth immutability and migration parity are explicitly deferred to later reviewed proof slices. |
| Focused static validation | `node scripts/validate-production-rls-readiness.mjs`: exit 0; **18/18 passed** after candidate correction. |
| SQL parse | `sqlfluff parse --dialect postgres` passed for both candidate files. The residue proof uses transaction-local `transaction_read_only = on` before its first query. |
| Runtime harness | **N/A / unauthorized**: no database, network, staging, or production contact is permitted in this local slice. |
| Rollback boundary | Revert the accepted-sequence-policy edits in the runbook, remove the candidate/residue SQL files, restore the readiness validator, and remove this subsection. No external state is involved. |

Task 5.2 remains open. Athlete/club, calendar, result, profile/Auth immutability, migration-parity, credential-wrapper, and production-execution slices remain pending. Admin navigation remains disabled.

## Work Unit Evidence — Task 5.2 Athlete/Club RLS Candidate Coverage
**Work unit**: `task-5.2-athlete-club-rls-coverage`; Standard Mode (`strict_tdd: false`); auto-chain; stacked-to-main. Production execution remains unauthorized and the parent-owned native attempt was not acquired or settled here.

### Scope
- Extended the rollback-only candidate with a privileged synthetic athlete/club graph, all four role paths, consent-qualified public visibility, private contact/identity boundaries, relation reads, editor/admin mutations, editor escalation denial, archive-only club deletion, and exact audit attribution.
- Extended the independent read-only residue proof to aggregate news, club, contact, athlete, private-detail, consent, category, discipline, membership, and audit residue without emitting fixture rows or identity values.
- Task 5.2 remains unchecked; no navigation, Auth/profile state, migration parity, credential wrapper, calendar/result slice, database, or external runtime was changed or contacted.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused readiness validator | `node scripts/validate-production-rls-readiness.mjs`: exit 0; **25/25 passed**, including runbook-wide pass/stopped sequence-bound consistency and stale `3`/`0..4` rejection while athlete/club coverage is present. |
| Static contract assertions | Dependency-free Node contract: exit 0; **19/19 passed**, including four roles, athlete/club tables, synthetic private-detail derivation, exact 15-row ledger, aggregate residue, and unconditional rollback. |
| Node syntax | `node --check scripts/validate-production-rls-readiness.mjs`: exit 0. |
| SQL parse | `sqlfluff parse --ignore-local-config --config <temporary parser-only config> --dialect postgres -f none` passed for both candidate and residue; the candidate was actually parsed with `large_file_skip_byte_limit = 0` because it exceeds the parser's default 20,000-byte safety threshold. |
| Build | `npm run build`: exit 0; Vite transformed **1,495 modules**. Build-generated public metadata was restored and is outside this slice. |
| Whitespace checks | Explicit untracked-artifact scan: **4/4 passed** for the runbook, validator, candidate, and residue; `git diff --no-index --check -- /dev/null <file>` inspected all four (exit 1 is expected for content differing from `/dev/null`); plain `git diff --check`: exit 0 for tracked changes only. |
| Runtime harness | **N/A / unauthorized**: the applicable boundary is the separately authorized rollback-only production transaction plus independent residue proof; no database, network, staging, production, or external service was contacted. |
| Rollback boundary | Revert only `production-rls-validation-runbook.md`, `validate-production-rls-readiness.mjs`, `production-rls-validation-candidate.sql`, `production-rls-validation-residue.sql`, and this evidence subsection. No application source, migration, Auth/profile state, public navigation, or external state changed. |
| Review budget | **347 authored additions/deletions** relative to launch state: candidate 254, residue 45, validator 10, runbook 12, and this receipt 26; no commit or branch operation was performed. |

### Remaining 5.2 Gaps Before Calendar Slice
- [ ] Calendar and result/import production-RLS candidate coverage.
- [ ] Profile/Auth immutability, migration-parity, and non-echoing credential-wrapper evidence.
- [ ] Separate production execution authorization, approved delivery receipt, authorized rollback-only run, independent residue review, and maintainer acceptance before enabling navigation.

## Preserved Partial Receipt — Task 5.2 Calendar RLS Candidate Coverage
**Work unit**: `task-5.2-calendar-rls-coverage`; Standard Mode (`strict_tdd: false`); auto-chain; stacked-to-main; issue #100; parent-owned native attempt was not acquired or settled here.

### Scope
- Extended the rollback-only candidate with opaque venue, published competition, active event-definition/category references, ordered event-program checks, editor reorder/lifecycle mutations, administrator lifecycle mutation, and anonymous/inactive write denials.
- Extended the independent aggregate-only residue proof for venue, competition, event-program, and audit entities; aligned the validator and sequence bounds to the exact **24** pass / **0..25** stopped allocation contract.
- Task 5.2 remains unchecked; result/import, profile/Auth immutability, migration parity, credential wrapper, and production execution remain out of scope.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Focused readiness validator | `node scripts/validate-production-rls-readiness.mjs`: exit 0; **29/29 passed**. |
| Negative drift assertions | Dependency-free in-memory Node assertion: exit 0; **4/4 passed**, rejecting stale runbook, candidate, and residue bounds. |
| Node syntax | `node --check scripts/validate-production-rls-readiness.mjs`: exit 0. |
| PostgreSQL parse | `sqlfluff parse --ignore-local-config --config <temporary parser-only config> --dialect postgres -f none` passed for candidate and residue separately; no database was contacted. |
| Build | `npm run build`: exit 0; Vite transformed **1,495 modules**. Generated public metadata was restored. |
| Whitespace | Explicit `git diff --no-index --check` scan passed for all four untracked preparation artifacts; exit 1 was treated as expected content-difference status. Tracked `git diff --check` passed. |
| Runtime harness | **N/A / unauthorized**: the applicable boundary is the separately authorized rollback-only production transaction and independent residue proof; no database, network, staging, production, Auth, credentials, or external service was contacted. |
| Rollback boundary | Revert only `production-rls-validation-runbook.md`, `validate-production-rls-readiness.mjs`, `production-rls-validation-candidate.sql`, `production-rls-validation-residue.sql`, and this evidence section. Leave migrations, application code, navigation, Auth/profile state, and external state unchanged. |

### Remaining 5.2 Gaps
- [ ] Result/import production-RLS candidate coverage.
- [ ] Profile/Auth immutability, migration-parity, and non-echoing credential-wrapper evidence.
- [ ] Separate production execution authorization, approved delivery receipt, authorized rollback-only run, independent residue review, and maintainer acceptance before enabling navigation.

## Resume Audit — Task 5.2 Calendar RLS Candidate Coverage
**Work unit**: `task-5.2-calendar-rls-coverage`; resumed on the parent-owned retry after the prior actor's interrupted attempt. Standard Mode (`strict_tdd: false`), auto-chain, stacked-to-main, issue #100. Task 5.2 remains unchecked.

### Preserved-Partial Audit
- Native runtime history records the aborted actor as generation 37 with **27 changed lines** and no valid result; its preserved calendar mutations were audited before editing.
- Kept the in-scope venue, published competition, active event-definition/category, ordered event-program, four-role, rollback, residue, and sequence-bound candidate work.
- Repaired the stale calendar procedure wording that still instructed this slice to invoke `commit_result_import`; result/import writes remain explicitly deferred.
- Strengthened, without changing migrations or application code, inactive public calendar reads, editor reference reads, administrator competition-delete denial, exact audit entity attribution, independent calendar residue counters, and runbook/candidate/residue bound drift checks.
- No malformed, out-of-scope, duplicated migration, Auth, credential, navigation, deployment, database, staging, production, or Git operation was retained or introduced.

### Work Unit Evidence
| Evidence | Result |
|---|---|
| Structured apply status | `gentle-ai sdd-status panel-administracion --cwd . --json --instructions`: `applyState: ready`, **25/27** tasks complete, 5.2 and 5.3 pending; strict TDD disabled. The parent-owned token was not reacquired, reset, or settled here. |
| Focused readiness validator | `node scripts/validate-production-rls-readiness.mjs`: exit 0; **36/36 passed**. |
| Negative drift checks | In-memory stale-bound injection: exit 0; **4/4 passed**, rejecting stale 3/0..4, 15/0..16, and mismatched candidate/residue claims. |
| Node syntax | `node --check scripts/validate-production-rls-readiness.mjs`: exit 0. |
| PostgreSQL parse | `sqlfluff parse --ignore-local-config --config <temporary parser-only config> --dialect postgres -f none` passed for candidate and residue; parser limit was safely set to `large_file_skip_byte_limit = 0` outside the repository. |
| Build | `npm run build`: exit 0; Vite transformed **1,495 modules**. Build-generated `public/manifest.webmanifest`, `public/robots.txt`, and `public/sitemap.xml` were restored. |
| Whitespace | Explicit no-index checks covered all four untracked preparation artifacts; tracked `git diff --check` passed. |
| Runtime harness | **N/A / unauthorized**: this slice has no authorized runtime boundary; no network, Supabase, database, staging, production, Auth, credentials, or external service was contacted. |
| Rollback boundary | Revert only the calendar hunks in the runbook, readiness validator, candidate SQL, residue SQL, plus this resume section; preserve the prior access/editorial and athlete/club hunks in those shared artifacts. Leave migrations, app/navigation, Auth/profile state, and external state unchanged. |
| New authored line count | **241 changed lines** relative to the retry reset snapshot: 210 lines in the four preparation artifacts plus 31 apply-progress lines (29 appended and 2 header-replacement lines); below the 400-line bound. |

### Remaining 5.2 Gaps
- [ ] Result/import production-RLS candidate coverage.
- [ ] Profile/Auth immutability, migration parity, and non-echoing credential-wrapper evidence.
- [ ] Separate production execution authorization, approved delivery receipt, authorized rollback-only run, independent residue review, and maintainer acceptance before enabling navigation.
