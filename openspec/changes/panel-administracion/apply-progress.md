# Apply Progress: Authorized Administration Panel

## Completed Tasks
- [x] 1.4 Admin session, protected routes, login, recovery, sign-out, noindex, and responsive shell.
- [x] 1.1 Remote SQL authorization and audit regression.
- [x] 1.2 Immutable private audit storage and managed-table triggers.

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
