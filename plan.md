# Plan — Session 040: Extended Injection + Sign Reconciliation

**Branch**: `feat/session-040-extended-proy-kd-injection` (after Task #1 merges Session 039 to main).

**Strategy**: serial per-task mini-cycles (brainstorm → implement → verify → commit), not a monolithic design-then-execute. Tighter feedback, cleaner commits, context-budget friendly.

## Task Breakdown

### Task #1 — Merge Session 039 to main (mechanical)
- [x] Verify gates on `feat/wc-scope-page-and-dcf-breakdown` (tests 1222, build/TC/lint clean)
- [x] Fetch + checkout main + pull
- [x] Merge feature branch FF
- [x] Push origin main (production deploy trigger)
- [x] Delete feature branch local + remote
- [x] Create new branch `feat/session-040-extended-proy-kd-injection`

### Task #2 — Proy BS extended injection
- [x] Read current ProyBsBuilder + BS_SECTION_INJECT reference (export-xlsx.ts Session 025)
- [x] Read computeProyBsLive — confirm extended accounts emitted
- [x] Read buildDynamicBsManifest — confirm computedFrom includes extended excelRows
- [x] Design: leaf-only injection, no subtotal append (double-count analysis)
- [x] RED: 5 TDD tests for extended catalog + custom account + language variants
- [x] GREEN: extend ProyBsBuilder.build() with second pass for excelRow ≥ 100
- [x] Verify: tests 1227, typecheck/lint/build clean
- [x] Commit: `feat(proy-bs): inject extended + custom accounts at synthetic rows`

### Task #3 — Proy FA extended injection
- [x] Read current ProyFaBuilder + FA_BAND reference
- [x] Read computeProyFixedAssetsLive — confirm extended emitted across 7 bands
- [x] Read FA catalog — identify extended entry for test (`computer_equipment` excelRow 100)
- [x] Design: 7-band slot layout (rows 100-379, 40 slots/band), static values (diverges Session 028)
- [x] RED: 7 TDD tests for labels + values across bands, custom account, language, regression
- [x] GREEN: extend ProyFaBuilder.build() with 7-band injection pass
- [x] Verify: tests 1234, all gates green
- [x] Commit: `feat(proy-fa): inject extended + custom accounts at 7-band slot layout`

### Task #4 — KEY DRIVERS dynamic additionalCapex injection
- [x] Read current KeyDriversBuilder + cell-mapping KD entries
- [x] Read KeyDriversForm for display layout reference
- [x] Confirm Session 036 T8 removed old cell-mapping entries
- [x] Design: per-account row from 33, clear-before-write, skip-if-empty-accounts
- [x] RED: 8 TDD tests for labels, values, clear residue, skip-if-null-upstream, language
- [x] GREEN: add injectAdditionalCapexByAccount helper, wire into build()
- [x] Handle Phase C fixture edge case: skip if accounts.length === 0
- [x] Verify: tests 1242, all gates green + Phase C 5/5
- [x] Commit: `feat(key-drivers): inject additionalCapexByAccount per FA account`

### Task #5 — KD ratio sign reconciliation
- [x] Identify functional bug: PROY LR live formulas `=D8*KD!D23` yield positive expense when KD is exported positive — wrong after Excel reopen
- [x] Design: reconcileRatioSigns at export boundary (LESSON-011 adapter pattern), store stays positive
- [x] RED: 8 TDD tests for D20/D23/D24 scalar + E-J projected expansions, idempotent, zero passthrough
- [x] GREEN: reconcileRatioSigns helper, wire after writeScalars/writeArrays
- [x] Update 2 pre-existing tests that assumed positive export values
- [x] Remove 21 entries from KNOWN_DIVERGENT_CELLS in phase-c-verification.test.ts
- [x] Verify: tests 1250, all gates green + Phase C 5/5
- [x] Commit: `feat(key-drivers): reconcile ratio sign convention at export boundary`

### Task #6 — Session wrap-up via /update-kka-penilaian-saham Mode B
- [ ] Invoke Mode B: verify gates, extract lessons, write history/session-040-*.md
- [ ] Update progress.md with Session 040 delivered state
- [ ] Append LESSONs to lessons-learned.md (target: 2-3 new)
- [ ] Update start-kka-penilaian-saham SKILL.md section 2 + section 8 for promoted lessons
- [ ] Commit docs
- [ ] Merge feature branch to main (option b: langsung merge setelah local gates hijau)
- [ ] Push origin main + delete feature branch local + remote

## Verification Target

- Tests: 1250+ passing
- Build: 41+ static pages, zero errors
- Typecheck: `tsc --noEmit` clean
- Lint: zero warnings
- Phase C: 5/5 green
- Cascade integration: 3/3 (29/29 MIGRATED_SHEETS)
- Audit (i18n): zero violations
