# Apply Progress: Authorized Administration Panel

## Completed Tasks
- [x] 1.4 Admin session, protected routes, login, recovery, sign-out, noindex, and responsive shell.
- [x] 1.1 Remote SQL authorization and audit regression.
- [x] 1.2 Immutable private audit storage and managed-table triggers.
- [x] 1.5 Featured athletes, publication/consent guards, source mappings, grants, and atomic RPC contracts.

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
