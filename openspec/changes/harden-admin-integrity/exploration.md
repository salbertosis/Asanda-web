## Exploration: Harden Administrative Integrity

### Current State
The audited admin baseline has five systemic roots: (1) stale or out-of-order session authority; (2) commands, multipart work, and readback treated as one operation; (3) an admin shell outside the shared accessibility, theme, and Spanish-feedback contract; (4) tests that mock Auth, PostgREST, RPC, RLS, Edge, and Cloudinary rather than proving deployed runtime behavior; and (5) retired, unconsumed `AthleteEvidence` code that preserves a parallel representation.

These roots affect eight modules: News, Media, Featured Athletes, Athletes/Achievements, Clubs, Calendar, Results, and Records. The reported disappearance of achievements remains unexplained. The in-flight false-ack hotfix is owned externally by **#207** and must not be duplicated or treated as proof that disappearance is fixed. Supporting more than six Featured Athletes is intentional, not a defect.

### Affected Areas
- `src/admin/AdminSessionContext.jsx` and auth/server guards — current-identity sequencing, recoverable logout, and fresh `administrator`/`editor` authorization.
- Eight admin modules and `src/services/admin/*` — truthful command outcomes, affected-row/revision checks, atomic or reconcilable multipart operations, and independent reads.
- `src/admin/AdminShell.jsx` and shared UI primitives — keyboard/focus access, responsive navigation, dark mode, and consistent Spanish UI.
- Supabase/RPC/Edge/Cloudinary boundaries and test suites — runtime evidence beyond mocked contracts.
- `AthleteEvidence*` and `src/services/admin/athleteEvidence.js` — consumer-first removal; the withdrawn migration must not be revived.

### Approaches
1. **Patch each screen** — add local notices, retries, and guards.
   - Pros: Small apparent changes.
   - Cons: Duplicates state, can misreport commits, and encourages unsafe retries.
   - Effort: High

2. **One systemic contract, adopted in bounded slices** — define fresh session authority; `confirmed`, `rejected`, and `unknown` command outcomes; separate reconciliation; shared shell/feedback; and layered runtime evidence.
   - Pros: Fixes roots without a second durable truth and preserves domain behavior.
   - Cons: Requires call-site inventory and coordinated server contracts.
   - Effort: High

### Recommendation
Choose approach 2. Authorize session transitions sequentially, retry only idempotent reads, and never blindly retry uncertain writes or migrations. Use no direct production SQL; any migration requires separate authorization, sequential execution, and independent verification. Keep raw HY3 processing local, preserve scheduling/archival/revision behavior, and deliver autonomous review slices of **≤400 changed lines**.

### Risks
- Mocked tests may be mistaken for runtime or production proof.
- Broad RPC conversion could cross domain boundaries unnecessarily.
- #207 could be overwritten or the unknown achievement symptom falsely closed.
- Destructive smoke, uncertain retries, or premature media cleanup could create residue.
- Removing `AthleteEvidence` without repository-wide string/consumer checks could orphan references.

### Ready for Proposal
Yes — propose one root-clustered change with named tests, explicit runtime-evidence limits, no blind retries/direct production SQL, and chained ≤400-line delivery slices.
