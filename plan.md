# Session 030 Plan — State-Driven Export Architecture

## Branch
`feat/session-030-state-driven-export` (off `main`)

## Full Dependency Matrix (29 visible nav sheets)

| # | Sheet Name | Upstream slices | Populated logic | Empty sentinel |
|---|---|---|---|---|
| 1 | HOME | `home` | write namaPerusahaan, NPWP, years, jumlahSaham, proporsi | home===null |
| 2 | BALANCE SHEET | `balanceSheet`, `home`, `fixedAsset` | existing `injectGridCells`+`injectBsCrossRefValues`+`injectExtendedBsAccounts`+`extendBsSectionSubtotals`, override col B labels from `accounts[].labelXx` | bs slice null |
| 3 | INCOME STATEMENT | `incomeStatement`, `home` | existing `injectGridCells`+`injectExtendedIsAccounts`+`replaceIsSectionSentinels`, override labels | is slice null |
| 4 | FIXED ASSET | `fixedAsset`, `home` | existing `injectGridCells`+`injectExtendedFaAccounts`+`extendFaSectionSubtotals`, override labels | fa slice null |
| 5 | KEY DRIVERS | `keyDrivers`, `home` | existing `injectArrayCells`+`injectScalarCells` (KD-scoped) | kd slice null |
| 6 | ACC PAYABLES | `accPayables`, `home` | existing `injectArrayCells` (AP-scoped) | ap slice null |
| 7 | CASH FLOW STATEMENT | `balanceSheet`, `incomeStatement`, `home` | `computeCashFlowStatement(buildCashFlowInput(state))` → write rows | any null |
| 8 | FCF | `balanceSheet`, `incomeStatement`, `fixedAsset`, `home` | `computeFcf(buildFcfInput(state))` → write | any null |
| 9 | NOPLAT | `incomeStatement`, `fixedAsset`, `home` | `computeNoplat(buildNoplatInput(state))` → write | any null |
| 10 | FINANCIAL RATIO | `balanceSheet`, `incomeStatement`, `fixedAsset`, `home` | `computeFinancialRatios(buildRatiosInput(state))` → write | any null |
| 11 | ROIC | same as #10 | `computeHistoricalUpstream` + ROIC per-year write | any null |
| 12 | GROWTH REVENUE | `incomeStatement`, `home` | `computeGrowthRevenue(...)` → write | any null |
| 13 | GROWTH RATE | `balanceSheet`, `incomeStatement`, `fixedAsset`, `home` | `computeGrowthRate(...)` → write | any null |
| 14 | PROY LR | `keyDrivers`, `incomeStatement`, `fixedAsset`, `home` | `computeFullProjectionPipeline(...)` → write PROY LR rows | any null |
| 15 | PROY FIXED ASSETS | `keyDrivers`, `fixedAsset`, `home` | projection pipeline → PROY FA rows | any null |
| 16 | PROY BALANCE SHEET | `keyDrivers`, `balanceSheet`, `incomeStatement`, `fixedAsset`, `home` | pipeline → PROY BS rows | any null |
| 17 | PROY NOPLAT | same as #16 | pipeline → PROY NOPLAT rows | any null |
| 18 | PROY CASH FLOW STATEMENT | same as #16 | pipeline → PROY CFS rows | any null |
| 19 | DLOM | `dlom` | existing `injectDlomAnswers`+`injectDlomJenisPerusahaan` | dlom null |
| 20 | DLOC(PFC) | `dloc` | existing `injectDlocAnswers` | dloc null |
| 21 | WACC | `wacc`, `home` | existing `injectScalarCells`+`injectArrayCells` (WACC-scoped) | wacc null |
| 22 | DISCOUNT RATE | `discountRate`, `home` | existing scalar/array (DR-scoped) | dr null |
| 23 | BORROWING CAP | `borrowingCapInput`, `home` | scalar cells | bcap null |
| 24 | DCF | `discountRate`, `wacc`, `keyDrivers`, `balanceSheet`, `incomeStatement`, `fixedAsset`, `home` | `computeDcf(buildDcfInput(state))` | any null |
| 25 | AAM | `balanceSheet`, `aamAdjustments`, `home` | `computeAam(buildAamInput(state))` + existing `injectAamAdjustments` + write labels from `accounts[].labelXx` | bs null or aamAdjustments empty |
| 26 | EEM | AAM set + `discountRate` + `wacc` | `computeEem(buildEemInput(state))` | any null |
| 27 | CFI | AAM set + `dlom` + `dloc` + `home` | `computeCfi(buildCfiInput(state))` | any null |
| 28 | SIMULASI POTENSI (AAM) | #25 set + `dlom` + `dloc` | `computeSimulasiPotensi(buildSimulasiPotensiInput(state))` — mirror `/valuation/simulasi-potensi` | any null |
| 29 | DASHBOARD | #24 + #25 + #26 + #27 + #28 + #10 | read all computed results, write KPI cells | any upstream null |

---

## Tasks (10 total)

### T1 — Foundation: types + registry + `clearSheetCompletely` utility
**Files**:
- `src/lib/export/sheet-builders/types.ts` [NEW] — `SheetBuilder` interface, `UpstreamSlice` type, `BuilderContext`
- `src/lib/export/sheet-builders/populated.ts` [NEW] — `isPopulated(upstream, state): boolean`
- `src/lib/export/sheet-utils.ts` [NEW] — `clearSheetCompletely(sheet): void`
- `__tests__/lib/export/sheet-utils.test.ts` [NEW] — TDD for clearSheetCompletely + isPopulated

**RED**: 6 tests: clearSheetCompletely drops (a) cell values, (b) formulas, (c) merges, (d) images, (e) conditional formatting, (f) tables. isPopulated: truth-table across upstream combinations.

**GREEN**: implement both utilities.

**REFACTOR**: ensure zero ExcelJS private-API reliance.

**Commit**: `feat(export): SheetBuilder types + clearSheetCompletely utility`

---

### T2 — Formula reactivity probe + orchestrator skeleton
**Files**:
- `src/lib/export/export-xlsx.ts` [MODIFIED] — extract new `exportToXlsxV2` orchestrator that iterates `SHEET_BUILDERS` registry (empty array for now — fallback to old pipeline if registry empty). Keep old pipeline as `exportToXlsxLegacy`.
- `src/lib/export/sheet-builders/registry.ts` [NEW] — export `SHEET_BUILDERS: readonly SheetBuilder[] = []` for now
- `__tests__/lib/export/formula-reactivity.test.ts` [NEW] — probe: given a sheet with a formula `='OTHER'!D8`, can ExcelJS preserve across clear+repopulate of OTHER? Document exact behavior.

**RED**: 3 orchestrator tests — empty registry falls through to legacy; populated builder called when upstream satisfied; clearSheetCompletely called when upstream null.

**GREEN**: wire the orchestrator around registry iteration.

**Commit**: `feat(export): orchestrator v2 scaffold + formula reactivity probe`

---

### T3 — Input-driven builders: BS + IS + FA (primary user complaint)
**Files**:
- `src/lib/export/sheet-builders/balance-sheet.ts` [NEW] — `BalanceSheetBuilder` wraps existing `injectGridCells`+`injectBsCrossRefValues`+`injectExtendedBsAccounts`+`extendBsSectionSubtotals`, adds `writeBsLabelsFromStore(ws, state)` override for col B labels (rows 8–49 default catalog + 100+ synthetic)
- `src/lib/export/sheet-builders/income-statement.ts` [NEW] — `IncomeStatementBuilder` with parallel structure
- `src/lib/export/sheet-builders/fixed-asset.ts` [NEW] — `FixedAssetBuilder`, handles 7-block label mirror
- 3 corresponding test files

**RED per sheet**: (a) null slice → sheet blank (all cells, merges, images gone); (b) populated with catalog defaults → col B labels match `BS_CATALOG_ALL[i].labelEn`; (c) populated with renamed account → col B reflects user rename; (d) extended synthetic accounts still write correctly via existing helpers.

**GREEN**: implement builders. Add `SHEET_BUILDERS` entries.

**REFACTOR**: extract `writeLabelsFromStore` as shared utility if 3 implementations overlap.

**Commit**: `feat(export): BS + IS + FA builders with store-sourced labels`

---

### T4 — AAM + SIMULASI POTENSI (AAM) builders (second core complaint)
**Files**:
- `src/lib/export/sheet-builders/aam.ts` [NEW] — `AamBuilder` uses `buildAamInput(state)` + `computeAam`. Writes section structure from `balanceSheet.accounts` iteration (mirror of website `/valuation/aam`). Handles EKUITAS section + per-row adjustments via existing `injectAamAdjustments`.
- `src/lib/export/sheet-builders/simulasi-potensi.ts` [NEW] — `SimulasiPotensiBuilder` uses `buildSimulasiPotensiInput(state)` + `computeSimulasiPotensi`.
- 2 test files

**RED**: null upstream → blank; populated → section-based rows from user `accounts[]`, zero prototipe label leakage.

**Commit**: `feat(export): AAM + SIMULASI POTENSI builders with dynamic sections`

---

### T5 — Remaining input-driven builders
**Files**:
- `sheet-builders/home.ts` — HomeBuilder
- `sheet-builders/key-drivers.ts` — KeyDriversBuilder
- `sheet-builders/acc-payables.ts` — AccPayablesBuilder
- `sheet-builders/dlom.ts` — DlomBuilder
- `sheet-builders/dloc.ts` — DlocBuilder (sheet name `DLOC(PFC)`)
- `sheet-builders/wacc.ts` — WaccBuilder
- `sheet-builders/discount-rate.ts` — DiscountRateBuilder
- `sheet-builders/borrowing-cap.ts` — BorrowingCapBuilder
- 8 test files (null + populated × 8)

**RED/GREEN**: each wraps existing cell-mapping-based inject logic. Small delta per sheet.

**Commit**: `feat(export): 8 input-driven builders wired to registry`

---

### T6 — Computed analysis builders
**Files**:
- `sheet-builders/cash-flow-statement.ts` — calls `computeCashFlowStatement` via existing `buildCashFlowInput` helper in upstream-helpers
- `sheet-builders/fcf.ts` — `computeFcf`
- `sheet-builders/noplat.ts` — `computeNoplat`
- `sheet-builders/financial-ratio.ts` — `computeFinancialRatios`
- `sheet-builders/roic.ts` — `computeHistoricalUpstream`
- `sheet-builders/growth-revenue.ts` — `computeGrowthRevenue`
- `sheet-builders/growth-rate.ts` — `computeGrowthRate`
- 7 test files

**Strategy**: each builder computes values from upstream slices, writes to leaf-value cells, preserves formula cells where formula result = computed value (cross-sheet refs into populated sheets). Where upstream is null → clearSheetCompletely.

**Commit**: `feat(export): 7 computed analysis builders`

---

### T7 — Projection + Valuation + Dashboard builders
**Files**:
- `sheet-builders/proy-lr.ts`
- `sheet-builders/proy-fixed-assets.ts`
- `sheet-builders/proy-balance-sheet.ts`
- `sheet-builders/proy-noplat.ts`
- `sheet-builders/proy-cash-flow-statement.ts`
- `sheet-builders/dcf.ts` — `computeDcf`
- `sheet-builders/eem.ts` — `computeEem`
- `sheet-builders/cfi.ts` — `computeCfi`
- `sheet-builders/dashboard.ts` — consolidate all upstream computed results into KPI cells
- 9 test files

**Strategy**: projection uses `computeFullProjectionPipeline`, valuation uses existing `buildXxxInput` + `computeXxx` helpers.

**Commit**: `feat(export): 9 projection/valuation/dashboard builders — cascade complete`

---

### T8 — Cross-sheet formula preservation cleanup + legacy removal
**Files**:
- `src/lib/export/export-xlsx.ts` [MODIFIED] — delete old `exportToXlsx` body, promote `exportToXlsxV2` to `exportToXlsx`. Remove `clearAllInputCells` helper (superseded by per-builder clear). Remove old orchestration.
- `src/lib/export/cross-sheet-cleanup.ts` [NEW] — `stripCrossSheetRefsToBlankSheets(workbook, state)`: for each populated sheet with formulas referencing a blank sheet, replace formula with cached value or empty.
- `__tests__/lib/export/cross-sheet-cleanup.test.ts` [NEW]

**RED**: construct a workbook with `'OTHER'!D8` formula where OTHER is blank → cell becomes empty, not `#REF!`.

**GREEN**: implement + wire into pipeline between `builder.build` loop and `applySheetVisibility`.

**Commit**: `refactor(export): remove legacy pipeline + cross-sheet cleanup`

---

### T9 — Phase C rewrite + cascade integration test
**Files**:
- `__tests__/integration/phase-c-verification.test.ts` [REWRITTEN] — pivot from template formula-preservation to website-state parity. Reconstruct `ExportableState` from PT Raja Voltama fixtures in `__tests__/fixtures/`. Export → load → for every visible nav sheet, read every numeric cell, compute website live-mode equivalent, assert match @ 1e-6.
- `__tests__/integration/export-cascade.test.ts` [NEW] — cascade matrix:
  1. All-null state → all 29 sheets blank
  2. Only `home` populated → HOME populated, 28 blank
  3. home + BS + IS + FA → inputs + CFS/FR/FCF/NOPLAT/ROIC populated; PROY/valuation/dashboard blank
  4. + keyDrivers → PROY\* populated
  5. + dlom + dloc + wacc + dr + bcap + aamAdjustments → DCF/EEM/CFI/AAM/SIMULASI/DASHBOARD populated
  6. Full state → cross-sheet formulas preserved and evaluate

**RED/GREEN**: tests before pipeline final tweaks. Fix root causes, don't patch tests.

**Commit**: `feat(verify): Phase C rewrite — website-state parity + cascade matrix`

---

### T10 — Full verification + docs + merge
**Steps**:
1. `npm run test 2>&1 | tail -25`
2. `npm run build 2>&1 | tail -15`
3. `npm run typecheck 2>&1 | tail -10`
4. `npm run lint 2>&1 | tail -15`
5. `npm run audit:i18n`
6. `npm run verify:phase-c`
7. All-green? Write `history/session-030-state-driven-export.md` via `/update-kka-penilaian-saham` Mode B
8. Manual export probe: trigger export from empty store → open in Excel → assert no prototipe labels; trigger with full fixture → assert Excel opens cleanly, no repair dialog
9. Merge to `main` + push + verify live at https://penilaian-bisnis.vercel.app

**Commit**: `docs: session 030 wrap-up — state-driven export + N lessons`

---

## Verification Gates (per T10)

```
Tests:     >= 935 passing (expected 970+ after new suites)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Audit:     ✅ zero i18n violations
Phase C:   ✅ new parity assertions pass
Live:      /akses HTTP 200 post-merge
Store:     v15 (unchanged — no schema change)
```

## Risk Escape Valve

If at end of any task the gates regress and root cause is non-trivial:
- STOP. Record issue in `progress.md`.
- Revert the breaking commit on feature branch (not main).
- Open discussion with user on scope reduction before proceeding.

3-strike rule per superpowers Phase 5: after 3 failed fix attempts on the
same root cause, stop and re-examine design.
