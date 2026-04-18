# Session 051 — Plan

Branch: `feat/session-051-strict-growth-equity-capex-seed`

## Tasks (10)

### Task 1: Foundation — design.md + plan.md + feature branch
Write design.md (Session 051 scope + chosen approach) + plan.md (this file) +
create feature branch. Verify `git status` clean on new branch.

### Task 2: `averageYoYStrict` helper + TDD
File: `src/lib/calculations/derivation-helpers.ts` — new helper.
Tests: `__tests__/lib/calculations/average-yoy-strict.test.ts` — 8 cases.

### Task 3: Store v20→v21 equityProjectionOverrides
File: `src/lib/store/useKkaStore.ts` — add slice field + setter.
Migration v20 → v21 initializes `{}`. TDD migration + setter.

### Task 4: Refactor `computeProyBsLive`
File: `src/data/live/compute-proy-bs-live.ts` — strict helper + equity skip +
override consumption. Update + extend tests.

### Task 5: DynamicBsEditor Average column → strict
Files: `RowInputGrid.tsx` + `DynamicBsEditor.tsx` — resolver prop pattern.

### Task 6: Proy BS page — equity editable, no growth row
File: `src/app/projection/balance-sheet/page.tsx` — conditional render per
account.section.

### Task 7: Fix Proy FA seed fallback
File: `src/data/live/compute-proy-fixed-assets-live.ts` — `lastNonNullHistorical`
fallback for ACQ_ADDITIONS + DEP_ADDITIONS. TDD.

### Task 8: Downstream tests + Phase C + cascade
Run full suite, fix anything broken downstream (KD tests, projection pipeline,
Phase C).

### Task 9: Full gate verification
typecheck + lint + audit + test + build + verify:phase-c all GREEN.

### Task 10: Commit, merge, push, deploy, wrap-up
Feature commit → merge main → push → verify Vercel live → history/ +
progress.md + lessons-learned.md + docs commit + push.
