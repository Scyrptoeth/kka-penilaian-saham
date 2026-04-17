# Session 032 Design — T5: 8 Input-Driven SheetBuilders

**Date**: 2026-04-17
**Branch**: `feat/session-032-input-builders`

## Problem Statement

Session 030 established the state-driven export foundation. Session 031
migrated the 5 core sheets (BS, IS, FA, AAM, SIMULASI POTENSI). The
remaining 24 sheets still run through the template-based legacy pipeline,
which means any sheet the user has NOT explicitly populated still leaks
prototipe PT Raja Voltama data on export.

Session 032 targets the **8 input-driven sheets**: HOME, KEY DRIVERS,
ACC PAYABLES, DLOM, DLOC(PFC), WACC, DISCOUNT RATE, BORROWING CAP.
These are the direct-entry sheets where the user types numbers and
strings; none require calc-engine chains. Each builder is a thin wrapper
over the existing scalar / grid / array / dynamic-row injectors,
filtered to the builder's own sheet.

## Chosen Approach

**Pattern**: follow Session 031 exactly. Each builder file exports a
`SheetBuilder` object with `{sheetName, upstream, build}`. `build()`
composes a subset of the existing injector helpers, filtered to the
builder's sheet via a per-sheet `skipSheets` extension.

**Registry**: register all 8 in `SHEET_BUILDERS`. The reactive
`MIGRATED_SHEET_NAMES` proxy (Session 031 LESSON-088) auto-skips them
in the legacy pipeline. Zero manual coordination needed.

**Builder-per-sheet table** (sheet name → upstream → operations):

| # | Sheet name | Upstream | Writes |
|---|---|---|---|
| 1 | `HOME` | `['home']` | 6 home scalars (B4,B5,B6,B7,B9,B12) |
| 2 | `KEY DRIVERS` | `['keyDrivers']` | 9 scalars + 12 arrays |
| 3 | `ACC PAYABLES` | `['accPayables']` | 6 leaf rows × 3 year columns (NEW: slice added to ExportableState) |
| 4 | `DLOM` | `['home']` ⚠ | 10 answers (F7..F25) + C31 kepemilikan + C30 jenisPerusahaan (sourced from home) |
| 5 | `DLOC(PFC)` | `['dloc']` | 5 answers (E7..E15) + B21 kepemilikan |
| 6 | `WACC` | `['wacc']` | 4 scalars + 2 dynamic-row tables + IS!B33 cross-sheet fix 🔧 |
| 7 | `DISCOUNT RATE` | `['discountRate']` | 6 scalars + 1 dynamic-row table |
| 8 | `BORROWING CAP` | `['borrowingCapInput']` | 2 scalars (D5, D6) |

⚠ **DlomBuilder upstream = `['home']`** (not `['dlom']`): DLOM!C30
jenisPerusahaan is sourced from HOME slice. If user has filled HOME but
not opened the DLOM factor questionnaire, DLOM sheet should still display
the correct jenisPerusahaan — so the builder must run when HOME exists
even if `state.dlom` is null. The 10 answer-row writes are conditional
on `state.dlom` inside `build()`.

🔧 **WACC builder includes IS!B33 fix**: `cell-mapping.ts` defines
`STANDALONE_SCALARS` entry `wacc.taxRate → INCOME STATEMENT!B33`. When
Session 031 migrated IS, the legacy `injectScalarCells` started skipping
this entry (because `excelSheet='INCOME STATEMENT'` is in `skipSheets`).
That left IS!B33 blank whenever IS is migrated — a silent Session 031
regression. Phase C uses minimal state and cascade test uses all-null,
so no test caught it. **Session 032 resolves this naturally** via
WaccBuilder writing IS!B33 directly as part of its build: "source-slice
owns all writes regardless of destination sheet". Registry order ensures
WaccBuilder runs AFTER IncomeStatementBuilder, so its write wins.

## Key Technical Decisions

### D1. ACC PAYABLES sheet gets NEW cell mapping + ExportableState extension

`ExportableState` currently has no `accPayables` field. AccPayables user
data never reaches Excel export. Session 032 adds:
- `ExportableState.accPayables: AccPayablesInputState | null`
- New `ACC_PAYABLES_GRID: GridCellMapping` in `cell-mapping.ts`:
  - `storeSlice: 'accPayables'`
  - `excelSheet: 'ACC PAYABLES'`
  - `leafRows: [10, 11, 14, 19, 20, 23]` — Addition/Repayment/Interest × ST/LT blocks
  - `yearColumns: { 2019: 'C', 2020: 'D', 2021: 'E' }` — 3 historical years
- `ExportButton.tsx` passes `state.accPayables` in the exportState object

Beginning (rows 9, 18) + Ending (rows 12, 21) are NOT in `leafRows` —
they are template formulas `=C9+C10+C11` etc., fed by the leaves once
the leaves are injected. Full Excel reactivity preserved.

AccPayablesBuilder is still owning the whole sheet: it writes ONLY the
leaf rows (Addition/Repayment/Interest). The Beginning/Ending formula
cells remain whatever the template has — `clearSheetCompletely` runs
only when state is null (via orchestrator), not on populated-state
builds.

### D2. Legacy injector skipSheets param expansion

Session 031 extended `clearAllInputCells`, `injectScalarCells`,
`injectGridCells` with optional `skipSheets` param. Session 032
extends the same pattern to:
- `injectArrayCells(wb, state, skipSheets?)`
- `injectDynamicRows(wb, state, skipSheets?)`
- `injectDlomAnswers(wb, state, skipSheets?)`
- `injectDlocAnswers(wb, state, skipSheets?)`
- `injectDlomJenisPerusahaan(wb, state, skipSheets?)`

Then `exportToXlsx` passes `MIGRATED_SHEET_NAMES` to each. Builder
authors never touch these helpers directly — they wrap the same
injectors filtered to their own sheet.

### D3. Builder test shape

Each builder gets a dedicated test file
`__tests__/lib/export/sheet-builders/<name>.test.ts`:

1. Load real template via `ExcelJS.Workbook().xlsx.load(buffer)` using
   the `loadTemplate()` helper already in Session 031 tests.
2. Construct minimal `state` with the relevant slice populated.
3. Call `builder.build(workbook, state)` directly.
4. Assert key cells written correctly.
5. Assert no cross-sheet leakage (e.g. WACC test also reads IS!B33).

### D4. Registry order

Final order reflects a stable dependency reading. WaccBuilder MUST run
after IncomeStatementBuilder so its IS!B33 write survives IS's own
`writeIsLabels` pass:

```ts
return [
  // Financial statements (Session 031)
  BalanceSheetBuilder,
  IncomeStatementBuilder,
  FixedAssetBuilder,
  // Input master + supporting inputs (Session 032)
  HomeBuilder,
  KeyDriversBuilder,
  AccPayablesBuilder,
  // Questionnaires (Session 032)
  DlomBuilder,
  DlocBuilder,
  // Valuation parameters (Session 032) — Wacc must run AFTER IS
  WaccBuilder,
  DiscountRateBuilder,
  BorrowingCapBuilder,
  // AAM chain (Session 031)
  AamBuilder,
  SimulasiPotensiBuilder,
]
```

### D5. Cascade integration test extension

Existing `__tests__/integration/export-cascade.test.ts` asserts 5
migrated sheets become blank when state is all-null. Session 032
extends its `WANT_BLANK_SHEETS` list from 5 → 13 (add 8 new sheet
names). Non-migrated sheets (DCF, EEM, etc.) remain in the `UNTOUCHED`
assertion set.

## What is OUT OF SCOPE

- ❌ T6 (7 computed analysis builders — CFS, FR, FCF, NOPLAT, ROIC,
      Growth Revenue, Growth Rate) — deferred to Session 033
- ❌ T7-T10 (9 projection/valuation/dashboard + legacy cleanup + Phase C
      rewrite + V2 promotion) — deferred to Session 034+
- ❌ AccPayables extended-account catalog (excelRow ≥ 100) — baseline
      leaf mapping only; extended catalog is a separate architectural
      decision (matches BS/IS/FA deferred pattern)
- ❌ AAM extended-account (excelRow ≥ 100) native injection — deferred
      from Session 031
- ❌ Upload parser (.xlsx → store) — reverse of export, different
      feature entirely
- ❌ RESUME page, Dashboard polish, multi-case management — lower
      priority, deferred

## Verification Strategy

- Per-builder: unit tests with real template + mock state (RED first)
- Orchestrator: cascade integration test extended to 13 sheets
- Pipeline: Session 029 Phase C test unchanged (still 4/4 gates)
- Build/lint/typecheck/audit: full gate before merge
- Manual: load an exported .xlsx in Excel (LESSON-071 — look for repair
      dialogs)
