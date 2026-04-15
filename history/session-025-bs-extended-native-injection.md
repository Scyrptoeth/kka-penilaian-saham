# Session 025 — Extended BS Catalog Native Injection (Approach E3)

**Date**: 2026-04-15
**Scope**: Phase B (BS portion) — make user-added BS accounts beyond template baseline (`excelRow ≥ 100`) flow natively into the BALANCE SHEET sheet + section subtotals + 244 cross-sheet downstream formulas. Replaces the RINCIAN NERACA workaround sheet pattern.
**Branch**: `feat/session-025-extended-catalog-native` → fast-forwarded into `main` (c00b9c5).

## Goals
- [x] BS extended-catalog accounts written as native rows in BALANCE SHEET sheet
- [x] Section subtotals auto-extended to include extended ranges
- [x] RINCIAN NERACA workaround sheet removed (superseded)
- [x] Full test coverage (7 new tests)
- [x] Live deploy verified
- [~] IS extended-catalog: deferred to Session 026 (sentinel interplay complexity)
- [~] FA extended-catalog: deferred to Session 026 (7-block mirror complexity)

## Approach decision

**Approach A — Insert rows + auto-shift formulas**: REJECTED.
- ExcelJS does NOT reliably shift cross-sheet formula refs
- 244 cross-sheet formulas across 23 sheets reference BS cells; mixed `SUM(range)` and explicit `+D38+D39` styles
- Custom formula parser/rewriter = high silent-bug risk

**Approach E3 — Synthetic-row write + subtotal +SUM append**: CHOSEN.
- Catalog already pre-allocates synthetic `excelRow` ranges per section (100-139 current_assets, 140-159 intangible, 160-199 other_non_current, 200-219 current_liab, 220-239 non_current_liab, 300-319 equity)
- Write extended account label (col B) + values (year cols) directly to those synthetic rows
- For each section with ≥1 extended account, append `+SUM(<col>{start}:<col>{end})` to that section's subtotal formula across all year columns
- ZERO row shifts → ZERO cross-sheet ref updates → ZERO silent breakage risk
- Reversible: if extended accounts removed, `SUM(empty)` = 0 = benign no-op

## Delivered

### `BS_SECTION_INJECT` map (`export-xlsx.ts`)
6 entries: section → `{extendedRowStart, extendedRowEnd, subtotalRow}`. Two sections (intangible_assets, other_non_current_assets) share subtotal row 25 (Total Non Current Assets) — each appends its own SUM term independently.

### `injectExtendedBsAccounts(workbook, state)`
- Iterates `state.balanceSheet.accounts`, picks accounts with `excelRow ≥ 100`
- Writes label to col B at synthetic row (priority: customLabel > catalog labelEn > catalogId fallback)
- Writes values to year columns per `BALANCE_SHEET_GRID.yearColumns` mapping
- Original-row accounts (excelRow < 100) skipped — handled by existing `injectGridCells`

### `extendBsSectionSubtotals(workbook, state)`
- Computes set of sections with ≥1 extended account
- Per matching section, per year column: reads existing subtotal cell formula/value, appends `+SUM(<col>{start}:{end})`, writes back as `{ formula }` object
- Handles 4 cell-value shapes: ExcelJS formula object, raw string formula `=...`, hardcoded number, empty cell
- Wired into `exportToXlsx` pipeline at step 5

### Removed code
- `addBsDetailSheet()` function (110+ lines) — generated separate RINCIAN NERACA sheet, now superseded
- `SECTION_ORDER` and `SECTION_HEADER_LABELS` constants
- `RINCIAN NERACA` entry from `applySheetVisibility` visible-set
- Unused imports (`BsAccountEntry`, `computeHistoricalYears`)

### Tests (7 new BS, 3 obsolete RINCIAN removed = +4 net)
- writes extended-account label into column B at synthetic row
- writes extended-account values into year columns at synthetic row
- appends +SUM(extendedRange) to current_assets subtotal at row 16
- appends +SUM(extendedRange) to equity subtotal at row 49 for all year columns
- does NOT modify subtotals for sections without extended accounts
- preserves original-row accounts (excelRow < 100) unchanged in formula injection
- handles state with no extended accounts → no formula changes (regression guard)

## Verification
```
Tests:     846 / 846 passing (842 → 846, +4 net)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Live:      https://kka-penilaian-saham.vercel.app HTTP 200, age: 44s post-deploy
```

## Stats
- Commits: 1 (c00b9c5)
- Files changed: 4 (export-xlsx.ts source + test, design.md + plan.md docs)
- Lines +289 / −221 (net +68; mostly +Session 025 code, −110 deleted RINCIAN code)

## Deviations from Plan
- IS + FA originally scoped for same session; deferred to Session 026 due to complexity:
  - IS: sentinel pre-computation interplay (D6/D7/D12/D13/D21/D26/D27/D30/D33 are sentinel-filled positions, not simple leaves) — deciding "where to redirect aggregations" is non-trivial
  - FA: 7-block mirror pattern (Acquisition Beginning/Additions/Disposals/Ending + AccDep Beginning/Additions/Ending) requires extended accounts to be replicated across 7 sub-blocks at correct row offsets

## Deferred to Session 026
- IS extended-catalog native injection (rows 100-139 revenue, 200-239 cost, 300-339 opex, 400-439 non_op, 500-539 net_interest)
- FA extended-catalog native injection across 7 sub-blocks
- Optional: replace section "single-leaf" cells with `=SUM(extendedRange)` formulas so user edits in Excel propagate to derived totals (full Excel reactivity)

## Lessons Extracted
- [LESSON-067](../lessons-learned.md#lesson-067): Synthetic-row write + subtotal append > row insertion + auto-shift for Excel template modifications with cross-sheet refs
- [LESSON-068](../lessons-learned.md#lesson-068): Catalog design with pre-allocated synthetic excelRow ranges per section enables append-only export modifications without row insertion
- [LESSON-069](../lessons-learned.md#lesson-069): When superseded, DELETE the old code path entirely (don't leave dead exports/tests "for compat")

## Files Changed
```
design.md                                                     [REWRITTEN — Approach E3 design]
plan.md                                                       [REWRITTEN — 8-task plan]
src/lib/export/export-xlsx.ts                                 [+BS_SECTION_INJECT, +injectExtendedBsAccounts, +extendBsSectionSubtotals, −addBsDetailSheet, cleanup imports]
__tests__/lib/export/export-xlsx.test.ts                      [+7 BS tests, −3 RINCIAN tests, simulateExport pipeline updated]
```

## Next Session Recommendation
**Session 026 — IS + FA extended catalog native injection**:
1. IS: design "section → aggregation cell" map; choose between (a) replace section single-leaf with `=SUM(extendedRange)` or (b) append `+SUM` to derived row formula (D8 Gross Profit, D15 OpEx, D28 Other Inc/Charges, D32 PBT)
2. FA: design 7-block mirror handling; for each extended FA account at row N, write to N + (2000, 3000, 4000, 5000, 6000, 7000) offsets matching Acquisition Add/Disp/End + AccDep Beg/Add/End sub-blocks
3. Per-page numerical verification (Phase C from audit) — generate sample export, manual Excel inspection, fix mismatches per sheet
