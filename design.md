# Design — Session 030: State-Driven Export Architecture

**Date**: 2026-04-17
**Branch**: `feat/session-030-state-driven-export`

## Problem Statement

Current export pipeline (Session 018–028) is **template-based injection**:
open `kka-template.xlsx` prototipe → clear specific input ranges →
inject user data at mapped cells → inject extended catalog accounts →
visibility + sanitize + strip tables.

**Consequence**: Labels in column B for sheets BALANCE SHEET, INCOME
STATEMENT, FIXED ASSET, AAM, and SIMULASI POTENSI (AAM) remain from the
prototipe (e.g. "Kas dan setara kas" at `'BALANCE SHEET'!B8`). Even when
the user customises a catalog on the website, the export still shows the
prototipe label. When a user has not opened an editor at all, the sheet
still shows the full prototipe structure with zeros — not an empty
worksheet.

All 25+ downstream sheets (CFS, FR, FCF, NOPLAT, ROIC, Projection,
Valuation, Dashboard) share the same problem: template-driven,
inconsistent with the website's PageEmptyState UX.

## User-Approved Contract (4 clarifications this session)

1. **Empty sentinel**: `store` slice = `null` → editor never opened → sheet
   is a **completely blank worksheet** (no header, logo, label, value, or
   formula). Sheet name preserved, everything else cleared.
2. **Label source**: `store` is the **sole source of truth**. Prototipe
   labels in the template are overwritten or cleared. Exported sheet = what
   the user sees in the website editor, nothing else.
3. **Cascade semantics**: if a sheet's upstream slices are null, the sheet
   is blank. Mirrors website's PageEmptyState end-to-end across all 29
   visible nav sheets.
4. **Cross-sheet formula preservation**: formulas preserved when both source
   and target sheets are populated. When either endpoint is blank, formulas
   in the other endpoint that reference it are cleared (no `#REF!` in
   exported file).

## Chosen Approach — `SheetBuilder` Registry with Dependency Graph

```ts
// src/lib/export/sheet-builders/types.ts
export type UpstreamSlice =
  | 'home' | 'balanceSheet' | 'incomeStatement' | 'fixedAsset'
  | 'keyDrivers' | 'accPayables' | 'wacc' | 'discountRate'
  | 'dlom' | 'dloc' | 'borrowingCapInput' | 'aamAdjustments'

export interface SheetBuilder {
  readonly sheetName: string
  readonly upstream: readonly UpstreamSlice[]
  build(workbook: ExcelJS.Workbook, state: ExportableState): void
}
```

### New `exportToXlsx` orchestrator

```ts
export async function exportToXlsx(state: ExportableState): Promise<Blob> {
  const workbook = await loadTemplate()

  for (const builder of SHEET_BUILDERS) {
    const sheet = workbook.getWorksheet(builder.sheetName)
    if (!sheet) continue

    if (isPopulated(builder.upstream, state)) {
      builder.build(workbook, state)
    } else {
      clearSheetCompletely(sheet)
    }
  }

  applySheetVisibility(workbook)
  sanitizeDanglingFormulas(workbook)
  stripDecorativeTables(workbook)
  return toBlob(await workbook.xlsx.writeBuffer())
}
```

`isPopulated(upstream, state)` returns true iff every required slice is
non-null (with `aamAdjustments` treated as non-empty object = populated).

### `clearSheetCompletely(sheet)` utility

Clears cells (values + formulas), merges, images, conditional formatting,
data validations, tables, sheet views, print areas, frozen panes. Sheet
name preserved so `getWorksheet(name)` still finds an empty shell.

### Template role (reduced)

Template becomes **structural scaffolding only** — row heights, column
widths, styles, and within-sheet formulas that stay valid when populated.
Label cells + leaf value cells are overridden from store. Blank sheets
wipe everything.

### Single source of truth for values

Builders reuse website live-mode compute functions in `src/lib/calculations/`.
Zero duplicate logic between website render and export.

Examples:
- `BalanceSheetBuilder` → `state.balanceSheet` → write `accounts[].labelXx` (per `state.language`) + values → call existing `injectExtendedBsAccounts` + `extendBsSectionSubtotals` for synthetic rows.
- `FinancialRatioBuilder` → `computeFinancialRatios(buildRatiosInput(state))` → write results at existing cells; preserve formula cells where they evaluate to the same number.
- `DcfBuilder` → `computeDcf(buildDcfInput(state))` → write.

### Dependency graph (high-level)

```
home            ──> HOME
balanceSheet    ──> BALANCE SHEET
incomeStatement ──> INCOME STATEMENT
fixedAsset      ──> FIXED ASSET
keyDrivers      ──> KEY DRIVERS
accPayables     ──> ACC PAYABLES
dlom            ──> DLOM
dloc            ──> DLOC(PFC)
wacc            ──> WACC
discountRate    ──> DISCOUNT RATE
borrowingCapInput ──> BORROWING CAP

balanceSheet + incomeStatement ──> CASH FLOW STATEMENT
(+ fixedAsset) ──> FCF, NOPLAT, FINANCIAL RATIO, ROIC, GROWTH REVENUE, GROWTH RATE

keyDrivers + balanceSheet + incomeStatement + fixedAsset ──> PROY LR, PROY FIXED ASSETS, PROY BALANCE SHEET, PROY NOPLAT, PROY CASH FLOW STATEMENT

all-upstream (discountRate + wacc + keyDrivers + {bs,is,fa}) ──> DCF
(+ borrowingCapInput) ──> BORROWING CAP richer
(+ aamAdjustments + home) ──> AAM
(+ dlom + dloc + aam) ──> EEM, CFI, SIMULASI POTENSI (AAM)

all-populated ──> DASHBOARD
```

(Full 29-row dependency matrix in `plan.md`.)

### Testing strategy

1. **Per-builder unit tests** — `__tests__/lib/export/sheet-builders/*.test.ts`. Matrix: (null-slice → sheet blank) × (populated-slice → sheet has expected cells + labels + values).
2. **Cascade integration test** — new `__tests__/integration/export-cascade.test.ts`:
   - `state = {}` all-null → every sheet blank
   - `state = { home }` → only HOME populated, 28 others blank
   - `state = { home, balanceSheet, incomeStatement, fixedAsset }` → inputs + analysis populated, projection + DCF/EEM blank
   - Full state → everything populated, cross-sheet formulas intact
3. **Phase C rewrite** — pivot from "template formula-preservation" (Session 029) to "website-state parity" (LESSON-084 planned pivot). Reconstruct `ExportableState` from PT Raja Voltama fixtures. Export → load → every cell matches website live-mode output @ 1e-6.

## Non-Negotiables

- **System development, not patching** — clean `SheetBuilder` interface, registry pattern, dependency-graph-driven cascade.
- All existing `inject*` / `replace*` / `extend*` helpers are **reused by new builders**, not deleted. They already implement per-sheet write logic correctly. Builders wrap them and add empty-state handling.
- **935 existing tests** → refactor must not shrink test count. Old per-function tests migrate into per-builder tests.
- **All gates green before merge**: tests + build + typecheck + lint + audit-i18n + new Phase C.
- **Commits per task** (max 10 tasks in `plan.md`).

## Out of Scope

- Upload parser (.xlsx → store)
- RESUME page
- Dashboard visual polish (no new charts)
- Multi-case management
- ESLint `uiPropNames` enhancement

## Risks & Mitigation

- **Context window exhaustion**: strict TDD + commit per builder. If context > 70% mid-session, checkpoint via `/update-kka-penilaian-saham` Mode B and resume next session with plan already written.
- **Test regression during migration**: old `inject*` tests stay green until the replacing builder's first passing test commits. Per-sheet swap, never big-bang.
- **Formula reactivity**: cross-sheet preservation is the riskiest invariant. Task T3 includes a formula-reactivity probe test **before** any builder migration starts.
- **Visibility regressions**: `applySheetVisibility` + `sanitizeDanglingFormulas` + `stripDecorativeTables` stay in pipeline unchanged. Sessions 024/026 guarantees retained.

## Success Criteria

1. User opens exported `.xlsx` after using **only HOME form** → all 28 other sheets blank worksheets.
2. User fills all editors → exported sheets contain labels + values that match website live-mode render @ 1e-6.
3. Cross-sheet formulas in populated-set sheets continue to evaluate correctly in Excel.
4. Zero prototipe PT Raja Voltama label leakage anywhere in the exported file.
5. All test gates pass; new Phase C assertion set passes.
