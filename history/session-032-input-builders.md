# Session 032 — T5: 8 Input-Driven SheetBuilders + IS!B33 Regression Fix

**Date**: 2026-04-17
**Scope**: Session 030 Phase 2 continuation — migrate 8 input-driven
sheets into state-driven `SHEET_BUILDERS` registry. Primary deliverable:
user with null slices no longer leaks prototipe PT Raja Voltama labels
on HOME, KEY DRIVERS, ACC PAYABLES, DLOM, DLOC(PFC), WACC, DISCOUNT
RATE, BORROWING CAP sheets. Secondary: resolve Session 031 IS!B33
regression via "source-slice owns all writes" pattern.
**Branch**: `feat/session-032-input-builders` → merged into `main`

## Goals (from Session 032 plan.md)
- [x] T1: Brainstorm + design.md
- [x] T2: plan.md + infrastructure extension (skipSheets coverage +
      accPayables in ExportableState + ACC_PAYABLES_GRID mapping)
- [x] T3: HomeBuilder (10 tests)
- [x] T4: KeyDriversBuilder (11 tests)
- [x] T5: AccPayablesBuilder (10 tests, NEW slice wiring)
- [x] T6: DlomBuilder (9 tests, upstream=['home'] for cross-slice behavior)
- [x] T7: DlocBuilder (5 tests)
- [x] T8: WaccBuilder (12 tests, IS!B33 regression fix)
- [x] T9: DiscountRateBuilder + BorrowingCapBuilder (folded, 10 tests)
- [x] T10: Cascade test extended 5→13 sheets + full verification + merge + Mode B

## Delivered

### T2 — Infrastructure prep (commit 3056b02)
- **`export-xlsx.ts`**:
  - Added `skipSheets` param to `injectArrayCells` + `injectDynamicRows`
    (mirrors Session 031 pattern for scalar/grid)
  - Call-site guards around `injectDlomAnswers`,
    `injectDlocAnswers`, `injectDlomJenisPerusahaan`
  - Added `accPayables: AccPayablesInputState | null` to
    `ExportableState`
  - Extracted helpers: `writeScalarMapping`, `writeArrayMapping`,
    `writeDynamicRowsMapping` for reuse by both legacy and builders
  - Exported 5 builder-facing helpers: `writeScalarsForSheet`,
    `writeArraysForSheet`, `writeDynamicRowsForSheet`,
    `writeGridForSheet`, `writeScalarsFromSlice`
  - Exported `injectDlomAnswers`, `injectDlocAnswers`,
    `injectDlomJenisPerusahaan` for builder reuse
- **`cell-mapping.ts`**:
  - Added `ACC_PAYABLES_GRID: GridCellMapping`
    - leafRows: [10, 11, 14, 19, 20, 23] (Addition/Repayment/Interest × ST/LT)
    - yearColumns: { 2019: 'C', 2020: 'D', 2021: 'E' }
  - Included in `ALL_GRID_MAPPINGS`
  - `accPayables` added to `MAPPED_STORE_SLICES`
- **`sheet-builders/types.ts`**: `accPayables` added to `UpstreamSlice` union
- **`ExportButton.tsx`**: passes `state.accPayables` in exportState
- **9 test files** updated with `accPayables: null` in their
  `ExportableState` literals (mechanical)

### T3 — HomeBuilder (commit e4174a7)
- **`src/lib/export/sheet-builders/home.ts`** [NEW]:
  `writeScalarsForSheet(wb, state, 'HOME')` — covers 6 scalars at
  B4/B5/B6/B7/B9/B12
- Formula cells B15/B16 (DLOM/DLOC summary) untouched —
  `writeScalarsForSheet` only writes cells in the scalar mapping
- Upstream: `['home']`
- 10 tests — metadata + 6 field writes + formula preservation +
  idempotence + no-throw on missing sheet

### T4 — KeyDriversBuilder (commit d316b38)
- `writeScalarsForSheet` (9 scalars) + `writeArraysForSheet` (12 arrays)
- Handles `_cogsRatioProjected` synthetic expansion via existing
  `writeArrayMapping` helper
- 11 tests

### T5 — AccPayablesBuilder (commit 8a1ae32)
- Fills ExportableState gap: slice was in store v4+ but never reached export
- `writeGridForSheet(wb, state, 'ACC PAYABLES')` — 6 leaf rows × 3 years
- Beginning/Ending formula cells preserved (not in leafRows)
- 10 tests

### T6 — DlomBuilder (commit 432a18a)
- **Critical design choice**: upstream = `['home']` not `['dlom']`
  - DLOM!C30 "DLOM Perusahaan tertutup/terbuka" is sourced from
    `home.jenisPerusahaan`
  - User with HOME filled but DLOM questionnaire untouched should
    still see C30 reflect their choice
- `injectDlomJenisPerusahaan` (C30) + `writeScalarsForSheet` (C31
  kepemilikan, null-guarded by resolveSlice) + `injectDlomAnswers`
  (F7..F25, null-guarded internally)
- 9 tests

### T7 — DlocBuilder (commit bf81b8f)
- Simpler than DLOM — no home-derived cell on this sheet
- `writeScalarsForSheet` (B21) + `injectDlocAnswers` (E7..E15)
- Upstream: `['dloc']`
- 5 tests

### T8 — WaccBuilder + IS!B33 regression fix (commit 6fa3480)
- **Session 031 silent regression**: after IS migrated, legacy
  `injectScalarCells` skipped all INCOME STATEMENT-destination
  scalars. `wacc.taxRate → IS!B33` has storeSlice='wacc' but
  excelSheet='INCOME STATEMENT' → left blank when IS migrated.
  WACC Hamada formulas referencing IS!B33 silently broke.
- **Fix pattern**: source-slice builder owns all writes regardless of
  destination sheet. New helper `writeScalarsFromSlice('wacc')`
  iterates by storeSlice, naturally covering cross-sheet writes.
- **Registry order**: WaccBuilder MUST run AFTER IncomeStatementBuilder
  so its IS!B33 write survives `writeIsLabels` B33 label pass.
- Also writes WACC sheet B4/B5/B6/E22 + comparableCompanies (row 11) +
  bankRates (row 27) via `writeDynamicRowsForSheet`
- 12 tests including explicit regression assertion

### T9 — DiscountRateBuilder + BorrowingCapBuilder (commit 2741ebf)
- DR: 6 scalars C2..C8 + bankRates with rate×100 column transform
- BC: 2 scalars D5/D6 (piutangCalk, persediaanCalk from CALK)
- 10 tests combined

### T10 — Cascade test extension + Mode B (commit cf103e5)
- `MIGRATED_SHEETS` in cascade test grown 5 → 13
- Declarative coverage: adding sheet name auto-grows assertions
- Non-migrated sheet (DCF) still UNTOUCHED assertion

## Verification
```
Tests:     1066 / 1066 passing (81 files; 999 → 1066 over Session 032, +67)
Build:     ✅ 34 static pages, zero errors
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ zero i18n violations
Phase C:   ✅ 4/4 integrity gates green
Store:     v15 (unchanged)
```

## Stats
- Commits on feature branch: 9
- Files changed: 32
- Lines: +1,857 / -369 (net +1,488)
- Test cases added: 67 (10 home + 11 KD + 10 AP + 9 DLOM + 5 DLOC +
  12 WACC + 6 DR + 4 BC + 0 cascade extension — coverage doubles
  via data change only)
- New source files: 8
- New test files: 8

## Deviations from Plan

### T2 absorbed more than planned
Original plan.md T2 scope: skipSheets coverage + accPayables mapping.
Actual scope added: 5 exported builder-facing helpers
(`writeScalarsForSheet`, `writeArraysForSheet`,
`writeDynamicRowsForSheet`, `writeGridForSheet`,
`writeScalarsFromSlice`). Rationale: avoiding inline duplication of
scalar-resolution logic in 8 builder files; helpers keep each builder
at ~10 LOC while preserving the one-write-site invariant.
`writeScalarsFromSlice` specifically enabled the Session 031 IS!B33
regression fix without requiring an edit to IncomeStatementBuilder.

### DlomBuilder upstream
Plan.md called for upstream `['dlom']`. Actual: `['home']`. Why:
DLOM!C30 jenisPerusahaan is a home-derived cell, and user with HOME
filled should see accurate C30 even before opening the DLOM
questionnaire. Documented in builder file header.

### Session 031 regression discovery
Not in plan.md. Discovered during T1 brainstorm while reading
`cell-mapping.ts` STANDALONE_SCALARS. `wacc.taxRate → IS!B33` had been
silently skipped since Session 031 IS migration. No test caught it
(Phase C uses minimal state, cascade uses all-null). Incorporated into
T8 WaccBuilder scope — pattern solution was cheaper than a dedicated
regression-fix commit.

## Deferred to Future Sessions

- T6 (7 computed analysis builders: CFS, FR, FCF, NOPLAT, ROIC,
  Growth Revenue, Growth Rate) — Session 033 target
- T7 (9 projection/valuation/dashboard: PROY×5, DCF, EEM, CFI,
  Dashboard) — Session 034 target
- T8 (legacy `exportToXlsx` body cleanup +
  `stripCrossSheetRefsToBlankSheets`) — Session 035 target
- T9 (Phase C rewrite to website-state parity) — Session 035 target
- T10 (promote `exportToXlsxV2`) — Session 036 target
- AAM extended-account (excelRow ≥ 100) native injection
- AccPayables extended-catalog (excelRow ≥ 100) — mirror BS/IS/FA
  pattern when user demand surfaces

## Lessons Extracted
- [LESSON-091](../lessons-learned.md#lesson-091): Source-slice builder
  owns all writes, not destination-sheet builder — prevents silent
  cross-sheet regressions
- [LESSON-092](../lessons-learned.md#lesson-092): When adding a new
  store slice, audit the full export pipeline (ExportableState,
  cell mapping, injector path, ExportButton wiring) — AccPayables
  gap persisted invisibly 20+ sessions
- [LESSON-093](../lessons-learned.md#lesson-093): Cascade integration
  test should be declarative over MIGRATED_SHEETS — adding sheet name
  auto-grows coverage without new assertions

## Files & Components Added/Modified
```
design.md                                                  [REWRITTEN]
plan.md                                                    [REWRITTEN]
src/lib/export/cell-mapping.ts                             [MODIFIED — ACC_PAYABLES_GRID]
src/lib/export/export-xlsx.ts                              [MODIFIED — helpers + skipSheets]
src/lib/export/sheet-builders/types.ts                     [MODIFIED — UpstreamSlice]
src/lib/export/sheet-builders/registry.ts                  [MODIFIED — 8 new entries]
src/lib/export/sheet-builders/home.ts                      [NEW]
src/lib/export/sheet-builders/key-drivers.ts               [NEW]
src/lib/export/sheet-builders/acc-payables.ts              [NEW]
src/lib/export/sheet-builders/dlom.ts                      [NEW]
src/lib/export/sheet-builders/dloc.ts                      [NEW]
src/lib/export/sheet-builders/wacc.ts                      [NEW]
src/lib/export/sheet-builders/discount-rate.ts             [NEW]
src/lib/export/sheet-builders/borrowing-cap.ts             [NEW]
src/components/layout/ExportButton.tsx                     [MODIFIED — accPayables wire]
__tests__/lib/export/sheet-builders/{home,key-drivers,acc-payables,dlom,dloc,wacc,discount-rate,borrowing-cap}.test.ts [NEW × 8]
__tests__/integration/export-cascade.test.ts               [EXTENDED 5→13 sheets]
__tests__/lib/export/{sheet-utils,registry,export-xlsx}.test.ts [MECHANICAL accPayables:null]
__tests__/lib/export/sheet-builders/{balance-sheet,income-statement,fixed-asset,aam,simulasi-potensi}.test.ts [MECHANICAL]
```

## Next Session Recommendation (Session 033)

**T6 — 7 computed analysis builders**:
- CashFlowStatementBuilder (depends on BS + IS + FA + accPayables)
- FcfBuilder (depends on FA + NOPLAT)
- NoplatBuilder (depends on IS + historical tax)
- FinancialRatioBuilder (depends on BS + IS + CFS)
- RoicBuilder (depends on NOPLAT + BS)
- GrowthRevenueBuilder (depends on IS)
- GrowthRateBuilder (depends on ROIC + FA + BS)

Each composes `computeXxx(buildXxxInput(state))` from
`src/lib/calculations/` then writes leaf-value cells. Template formulas
that reference populated cells continue to evaluate. Registry position:
after valuation parameters (Session 032) so all upstream data populates
before computed sheets read it.

Estimated Session 033 budget: ~30-40 tool calls. Single session feasible.
