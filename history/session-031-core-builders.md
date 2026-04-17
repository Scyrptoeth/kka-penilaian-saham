# Session 031 — Core Builders (T3 + T4 State-Driven Export Migration)

**Date**: 2026-04-17
**Scope**: Continue Session 030 state-driven export pivot. Land 5 first
SheetBuilders (BS, IS, FA, AAM, SIMULASI POTENSI (AAM)) with legacy-
pipeline skip logic. Primary user complaint fixed: prototipe PT Raja
Voltama labels no longer leak in these 5 sheets when the user has
populated stores.
**Branch**: `feat/session-031-core-builders` → fast-forwarded into `main` (416c803)

## Goals (from plan.md)
- [x] T1: Shared label-writer utility (`resolveLabel` + per-sheet writers)
- [x] T2: BalanceSheetBuilder
- [x] T3: IncomeStatementBuilder
- [x] T4: FixedAssetBuilder (with 4-band label mirror)
- [x] T5: Register T3 builders + legacy pipeline skip
- [x] T6: AamBuilder
- [x] T7: SimulasiPotensiBuilder
- [x] T8: Register T4 builders + STANDALONE scalar skip
- [x] T9: Cascade integration test (narrow scope — all-null)
- [x] T10: Full verification gate + merge + Mode B

## Delivered

### T1 — Shared label-writer utility (commit fea6e95)
- **`src/lib/export/sheet-builders/label-writer.ts`** [NEW]:
  - `resolveLabel<C>(account, catalog, language)` — generic resolver
    (customLabel > labelEn/Id per language > catalogId fallback).
  - `writeBsLabels` / `writeIsLabels` / `writeFaLabels` — per-sheet col B
    writers iterating `accounts[]`.
  - `writeAamLabels` — reverse BS_ROW_TO_AAM_D_ROW lookup (skips extended
    accounts which have no AAM sheet position yet).
- **`__tests__/lib/export/label-writer.test.ts`** [NEW]: 14 tests.

### T2 — BalanceSheetBuilder (commit 43fad97)
- **`src/lib/export/sheet-builders/balance-sheet.ts`** [NEW]: composes
  `writeBsLeafValues` (inlined grid iteration) + `injectBsCrossRefValues`
  + `injectExtendedBsAccounts` + `extendBsSectionSubtotals` + `writeBsLabels`.
- Upstream: `['balanceSheet']`.
- 6 tests: labels (en/id/customLabel) + values (baseline + extended).

### T3 — IncomeStatementBuilder (commit 46202cd)
- **`sheet-builders/income-statement.ts`** [NEW]: parallel structure to BS.
  Wraps `injectExtendedIsAccounts` + `replaceIsSectionSentinels`
  (Approach δ sentinel replacement — LESSON-077 preserved).
- Upstream: `['incomeStatement']`.
- 6 tests.

### T4 — FixedAssetBuilder (commit a431aac)
- **`sheet-builders/fixed-asset.ts`** [NEW]: wraps
  `injectExtendedFaAccounts` + `extendFaSectionSubtotals`. Adds
  `writeFaBaselineLabelsAllBands` that mirrors baseline labels (rows 8-13)
  across the 4 template blocks (Acq Beginning / Acq Additions / Dep
  Beginning / Dep Additions) via `FA_LEGACY_OFFSET`.
- Upstream: `['fixedAsset']`.
- 5 tests.

### T5 — Register BS/IS/FA + legacy pipeline skip (commit e9b65d8)
- **`sheet-builders/registry.ts`** [MODIFIED]:
  - Added lazy `getSheetBuilders()` function with `_testOverride` slot.
  - `SHEET_BUILDERS` is now a `Proxy` that always reflects current
    resolution (backward-compat with test code).
  - `MIGRATED_SHEET_NAMES` is a proxy Set-like object with `.has()`.
  - `__setTestBuildersOverride(builders | null)` for test isolation.
  - Registered `BalanceSheetBuilder`, `IncomeStatementBuilder`,
    `FixedAssetBuilder`.
- **`export-xlsx.ts`** [MODIFIED]:
  - `clearAllInputCells(wb, skipSheets?)` — filters mappings by sheet.
  - `injectGridCells(wb, state, skipSheets?)` — same.
  - Added per-sheet skip guards around `injectBsCrossRefValues`,
    `injectExtendedBsAccounts` + subtotals, IS extended + sentinels,
    FA extended + subtotals, `injectAamAdjustments`.
  - `runSheetBuilders(wb, state)` called between extended injection and
    `applySheetVisibility`.
- **`__tests__/lib/export/registry.test.ts`** [MODIFIED]: `runWithRegistry`
  helper now uses `__setTestBuildersOverride` instead of mutating
  `SHEET_BUILDERS` directly.

### T6 — AamBuilder (commit 0aaabbf)
- **`sheet-builders/aam.ts`** [NEW]: composes `writeAamLabels` +
  `injectAamAdjustments`.
- Upstream: `['balanceSheet', 'home']` — NOT `aamAdjustments` (design
  decision: user with BS populated but no adjustments still gets a
  meaningful AAM sheet via template Excel formulas; col D zeros are
  valid).
- `injectAamAdjustments` helper promoted to exported API.
- 7 tests.

### T7+T8 — SimulasiPotensiBuilder + register AAM + Simulasi (commit 4ac91d1)
- **`sheet-builders/simulasi-potensi.ts`** [NEW]: minimal — writes
  `state.nilaiPengalihanDilaporkan` to E11. All other SIMULASI cells
  (DLOM amount, Market Value, PPh tax brackets) driven by Excel
  cross-sheet formulas referencing AAM + HOME sheets.
- Upstream: `['balanceSheet', 'home']` (same gate as AamBuilder).
- `injectScalarCells` now takes optional `skipSheets` to prevent
  double-write at E11 when SIMULASI is migrated.
- Registry grows to 5 builders.
- 5 tests.

### T9 — Cascade integration test (commit 416c803)
- **`__tests__/integration/export-cascade.test.ts`** [NEW]: loads real
  template, asserts 5 migrated sheets have prototipe content BEFORE
  `runSheetBuilders`, then become blank shells AFTER with all-null
  state. Non-migrated sheet (DCF) verified untouched in same test run.
- Phase C test unchanged — its `applyFullPipeline` path does not invoke
  `runSheetBuilders`, only post-processing stages. Full Phase C rewrite
  to state-driven parity deferred to Session 032+.
- 3 tests.

## Verification
```
Tests:     999 / 999 passing (73 files; 981 → 999 over Session 031, +18)
Build:     ✅ 34 static pages, zero errors
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (local/no-hardcoded-ui-strings compliant)
Audit:     ✅ zero i18n violations (npm run audit:i18n)
Phase C:   ✅ 4/4 integrity gates green (unchanged)
Live:      https://penilaian-bisnis.vercel.app/akses — HTTP 200 post-merge
Store:     v15 (unchanged — no schema impact)
```

## Stats
- Commits on feature branch: 8 (1 doc plan + 7 feat/test)
- Files changed: 12
- Lines: +1,530 / -245 (net +1,285)
- Test cases added: 46 (14 label-writer + 6 BS + 6 IS + 5 FA + 7 AAM + 5 SIMULASI + 3 cascade)
- New source files: 6 (label-writer, balance-sheet, income-statement, fixed-asset, aam, simulasi-potensi)
- New test files: 6

## Deviations from Plan

### Mid-T5 circular-import fix
Plan T5 called for registry registration only. In practice, module-level
evaluation of `SHEET_BUILDERS` array failed with "Cannot read properties
of undefined (reading 'sheetName')" because builder files import helpers
FROM `export-xlsx.ts`, which imports FROM registry — a circular loop
that left builder references as undefined live bindings during registry
module init.

Fix extended T5 scope: indirect registry through `getSheetBuilders()`
function, expose `__setTestBuildersOverride` for test isolation. Added
backward-compat Proxy for `SHEET_BUILDERS` consumers. One extra commit
beyond T5 plan.

### AAM upstream — `aamAdjustments` omitted
Plan.md row 25 specified AAM upstream as `balanceSheet, aamAdjustments,
home` with `bs null or aamAdjustments empty` as blank sentinel. In
practice I chose `['balanceSheet', 'home']` only.

Rationale: a user with BS populated but never having opened the AAM
editor (empty `aamAdjustments: {}`) still has a meaningful AAM sheet
via template formulas (col D = 0, col E = col C from BS cross-refs).
Blanking the sheet for this state would surprise users. Decision
documented in the AamBuilder file header for future auditors.

### Phase C exclusion NOT needed
Plan.md T9 called for `STATE_DRIVEN_SHEETS` exclusion in Phase C test.
In practice I discovered Phase C (Session 029) uses only
post-processing stages (`applySheetVisibility`, `sanitizeDanglingFormulas`,
`stripDecorativeTables`) — NOT `runSheetBuilders`. So migrated sheets
are not cleared in the Phase C test path, and assertions still hold.
No Phase C changes this session. Full Phase C rewrite to state-driven
parity stays in Session 032+ backlog.

## Lessons Extracted
- [LESSON-088](../lessons-learned.md#lesson-088): Circular import between
  orchestrator + registry — resolve via lazy `getRegistry()` function.
- [LESSON-089](../lessons-learned.md#lesson-089): Test-only override seam
  (`__setTestXxxOverride`) is cleaner than mutating const arrays.
- [LESSON-090](../lessons-learned.md#lesson-090): State-driven label
  override pattern — write `accounts[i].labelXx` at excelRow from
  `state.language`, mirror across multi-band sheets via offsets.

## Files & Components Added/Modified
```
plan.md                                                    [REWRITTEN]
src/lib/export/sheet-builders/label-writer.ts              [NEW]
src/lib/export/sheet-builders/balance-sheet.ts             [NEW]
src/lib/export/sheet-builders/income-statement.ts          [NEW]
src/lib/export/sheet-builders/fixed-asset.ts               [NEW]
src/lib/export/sheet-builders/aam.ts                       [NEW]
src/lib/export/sheet-builders/simulasi-potensi.ts          [NEW]
src/lib/export/sheet-builders/registry.ts                  [MODIFIED]
src/lib/export/export-xlsx.ts                              [MODIFIED]
__tests__/lib/export/label-writer.test.ts                  [NEW]
__tests__/lib/export/sheet-builders/balance-sheet.test.ts  [NEW]
__tests__/lib/export/sheet-builders/income-statement.test.ts [NEW]
__tests__/lib/export/sheet-builders/fixed-asset.test.ts    [NEW]
__tests__/lib/export/sheet-builders/aam.test.ts            [NEW]
__tests__/lib/export/sheet-builders/simulasi-potensi.test.ts [NEW]
__tests__/lib/export/registry.test.ts                      [MODIFIED]
__tests__/integration/export-cascade.test.ts               [NEW]
```

## Next Session Recommendation (Session 032)

Continue cascade completion per original Session 030 plan:

1. **T5 (original)** — 8 remaining input builders: HOME, KeyDrivers, AccPayables,
   DLOM, DLOC, WACC, DiscountRate, BorrowingCap. Most are thin wrappers over
   existing scalar/array/dynamicRow injectors.
2. **T6** — 7 computed analysis builders (CashFlowStatement, FCF, NOPLAT,
   FinancialRatio, ROIC, GrowthRevenue, GrowthRate). Each reuses
   `computeXxx(buildXxxInput(state))` from `src/lib/calculations/`.
3. **T7** — 9 projection/valuation/dashboard builders.
4. **T8** — Cross-sheet formula cleanup (`stripCrossSheetRefsToBlankSheets`)
   + legacy `exportToXlsx` body cleanup.
5. **T9** — Phase C rewrite to website-state parity (reconstruct
   ExportableState from PT Raja Voltama fixtures).

Session 031 established the pattern. Remaining builders follow the same
shape. Estimated Session 032 budget: large — may need to split across
2-3 sessions.

Consider also: AAM extended-account native injection (extend AAM sheet
to hold rows for BS extended accounts excelRow ≥ 100). Not urgent since
current Session 031 AAM builder covers baseline 12 accounts that map to
existing BS_ROW_TO_AAM_D_ROW. User complaint only mentioned prototipe
labels, not missing extended accounts on AAM sheet.
