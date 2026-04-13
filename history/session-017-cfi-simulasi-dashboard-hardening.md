# Session 017 — CFI + SIMULASI POTENSI + Dashboard + System Hardening

**Date**: 2026-04-13
**Scope**: 6 tasks from prompt: pipeline extraction, nilaiNominalPerSaham, FA adjustment, CFI page, SIMULASI POTENSI page, Dashboard. Plus unplanned system hardening audit.
**Branch**: `feat/session-017-cfi-simulasi` + `fix/session-017-system-hardening` → merged to `main`

## Goals (from prompt-session-017.md)
- [x] Task A: Extract `computeFullProjectionPipeline()`
- [x] Task B: `nilaiNominalPerSaham` + store v7→v8
- [x] Task C: FA Adjustment input on AAM page
- [x] Task D: CFI page + calc module
- [x] Task E: SIMULASI POTENSI page + PPh Pasal 17
- [x] Task F: Dashboard with Recharts
- [x] **Unplanned**: System hardening — centralize shared logic

## Delivered

### 3 Calculation Modules
- `projection-pipeline.ts` — shared 6-step projection chain (was duplicated in DCF + PROY CFS)
- `cfi.ts` — Cash Flow to Investor: merge hist+proj FCF + non-op CF (4 tests)
- `simulasi-potensi.ts` — PPh Pasal 17 progressive tax + Resistensi WP matrix (17 tests)

### System Development Infrastructure
- `upstream-helpers.ts` — 7 shared builders eliminating ~150 lines of copy-paste:
  - `computeHistoricalUpstream()` — NOPLAT→CFS→FCF→ROIC→GrowthRate chain
  - `buildAamInput()` — 20-param AAM input centralized
  - `buildDcfInput()` — 15-param DCF input centralized
  - `buildEemInput()` — EEM input centralized
  - `buildBorrowingCapInput()` — BC input centralized
  - `deriveDlomRiskCategory()` / `deriveDlocRiskCategory()` — percentage→category
  - `BORROWING_PERCENT_DEFAULT` — single source of truth

### Store v7→v8
- `nilaiNominalPerSaham` added to HomeInputs (Zod + TS + form)
- `faAdjustment` added (AAM asset revaluation)
- `nilaiPengalihanDilaporkan` added (SIMULASI POTENSI user input)
- Migration chain v1→v8 tested (3 new migration tests)

### 4 New Pages
- `/valuation/cfi` — historis+proyeksi CFI table with visual distinction
- `/valuation/simulasi-potensi` — method selector (DCF/AAM/EEM), DLOM/DLOC chain, PPh progresif
- `/dashboard` — 4 Recharts charts (Revenue, BS Composition, Valuation Comparison, FCF Trend)
- AAM page enhanced with FA Adjustment input

## Verification
```
Tests:     715 / 715 passing (49 files)
Build:     ✅ 32 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 6 (1 refactor + 3 feat + 1 fix + 1 feat dashboard)
- Files changed: 20
- Lines +1731/-273
- Test cases added: 24 (691→715)

## Deviations from Plan
- System hardening was unplanned — triggered by user asking "is this system development or patching?"
- Audit found 2 CRITICAL bugs (hardcoded Resistensi WP, EEM ignoring faAdjustment) and 5 HIGH duplication issues
- All fixed in dedicated hardening commit

## Lessons Extracted
- [LESSON-046](../lessons-learned.md): Centralize store→input builders (upstream-helpers pattern)
- [LESSON-047](../lessons-learned.md): Audit for hardcoded values after every multi-page session
- [LESSON-048](../lessons-learned.md): PPh progressive tax — bracket WIDTH not cumulative limit

## Files Added/Modified
```
src/lib/calculations/projection-pipeline.ts        [NEW]
src/lib/calculations/cfi.ts                        [NEW]
src/lib/calculations/simulasi-potensi.ts           [NEW]
src/lib/calculations/upstream-helpers.ts            [NEW]
src/app/valuation/cfi/page.tsx                     [NEW]
src/app/valuation/simulasi-potensi/page.tsx        [NEW]
src/app/dashboard/page.tsx                         [REWRITTEN]
src/app/valuation/dcf/page.tsx                     [REFACTORED]
src/app/valuation/aam/page.tsx                     [MODIFIED]
src/app/valuation/eem/page.tsx                     [MODIFIED]
src/app/valuation/borrowing-cap/page.tsx           [MODIFIED]
src/app/projection/cash-flow/page.tsx              [REFACTORED]
src/lib/store/useKkaStore.ts                       [MODIFIED v7→v8]
src/lib/schemas/home.ts                            [MODIFIED]
src/types/financial.ts                             [MODIFIED]
src/components/forms/HomeForm.tsx                  [MODIFIED]
src/components/layout/nav-tree.ts                  [MODIFIED]
__tests__/lib/calculations/cfi.test.ts             [NEW]
__tests__/lib/calculations/simulasi-potensi.test.ts [NEW]
__tests__/lib/store/store-migration.test.ts        [MODIFIED]
```

## Next Session Recommendation
1. RESUME page — final summary comparing DCF/AAM/EEM results side by side
2. Export ke .xlsx via ExcelJS (lib/export/ masih kosong)
3. File upload parsing (.xlsx → live data) — eliminate manual data entry
4. Polish Dashboard — add projected FCF to FCF chart, add more KPIs
