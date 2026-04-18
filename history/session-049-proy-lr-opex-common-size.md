# Session 049 — Proy. P&L OpEx Merge + Common-Size Projection Drivers

**Date**: 2026-04-19
**Scope**: Refactor PROJECTION > Proy. P&L per user 4-point spec — (1) add 6 growth/common-size info sub-rows under leaf accounts, (2) drop Selling/Others OpEx + General & Admin, retain Total OpEx sourced from IS!TOTAL_OPEX sentinel, (3) show growth info under Total OpEx too, (4) propagate across the integrated system.
**Branch**: `feat/session-049-proy-lr-opex-common-size` (1 feature commit, merged fast-forward to main + pushed, Vercel production deploy live).

## Goals (from plan.md)

- [x] Create feature branch.
- [x] Refactor `compute-proy-lr-live.ts` — drop Selling/G&A rows from output, new `ProyLrInput` with `commonSize: { cogs, totalOpEx, interestIncome, interestExpense, nonOpIncome }`, historical row 17 = `isLastYear.totalOpEx`, all non-Revenue leaves projected via `Revenue × commonSize.<key>` (including COGS — drops KD `cogsRatio` + ROUNDUP(3)).
- [x] Rewrite test fixture — synthetic round numbers at PRECISION=6 (up from 3).
- [x] Update 3 consumers — `projection-pipeline.ts`, `projection/income-statement/page.tsx`, `projection/noplat/page.tsx` with shared `avgCommonSizeFor(row)` helper.
- [x] Update Proy. P&L display — drop rows 15/16 from ROW_DEFS, add discriminated union for data/subGrowth/subCommonSize rows; render sub-rows at projection years only (historical = "—").
- [x] Update export `ProyLrBuilder` — drop 15/16 from managedRows, pre-write clear cells C15:F15 + C16:F16 to prevent template residue.
- [x] Add 6 i18n keys (EN + ID).
- [x] Full gate: typecheck, tests, lint, audit, build, Phase C.
- [x] Commit + merge to main + push + verify live deploy.

## Delivered (commit `2c32f09`)

### Compute refactor — `src/data/live/compute-proy-lr-live.ts` (226 LOC rewrite)

New signature:
```ts
interface ProyLrCommonSize {
  cogs: number           // avg(IS.7 / IS.6)
  totalOpEx: number      // avg(IS.15 / IS.6)
  interestIncome: number // avg(IS.26 / IS.6)
  interestExpense: number // avg(IS.27 / IS.6)
  nonOpIncome: number    // avg(IS.30 / IS.6)
}
interface ProyLrInput {
  keyDrivers, revenueGrowth,
  commonSize: ProyLrCommonSize,
  isLastYear: { revenue, cogs, grossProfit, totalOpEx, depreciation,
                interestIncome, interestExpense, nonOpIncome, tax },
  proyFaDepreciation
}
```

Dropped fields: `interestIncomeGrowth`, `interestExpenseGrowth`, `nonOpIncomeGrowth`, `isLastYear.sellingOpex`, `isLastYear.gaOpex`. Dropped helper `roundUp3`. Added `PROY_LR_ROW.TOTAL_OPEX = 17` semantic constant.

Projection:
- Revenue[t] = Revenue[t-1] × (1 + revenueGrowth) — unchanged
- COGS[t] / TotalOpEx[t] / II[t] / IE[t] / NOI[t] = Revenue[t] × commonSize.<key> — uniform pattern
- Other Income = II + IE — unchanged
- EBITDA / Dep / EBIT / PBT / Tax / NetProfit / Margins — unchanged formula shape

Historical column row 17 = `isLastYear.totalOpEx` (NEW — previously 0). Rows 15, 16 no longer in output.

### Display refactor — `src/app/projection/income-statement/page.tsx` (186 LOC rewrite)

Discriminated union:
```ts
type RowDef =
  | { kind: 'data', row, labelKey, valueKind: 'idr'|'percent', bold?, indent? }
  | { kind: 'subGrowth', id: 'revenue-growth', labelKey }
  | { kind: 'subCommonSize', id, labelKey, driverKey: keyof ProyLrCommonSize }
```

6 new sub-rows inserted below leaf data rows:
- row 8 Revenue → 'revenue-growth' (avg YoY)
- row 10 COGS → 'cogs-cs' (cogs common size avg)
- row 17 Total OpEx → 'total-opex-cs'
- row 29 Interest Income → 'ii-cs'
- row 31 Interest Expense → 'ie-cs'
- row 34 Non-Op Income → 'noi-cs'

Row 33 Other Income — NO sub-row (per user: Other Income = II + IE, hybrid).

Sub-row render rule: historical column renders "—"; projection columns show `formatPercent(driverValue)`. Style mirrors Margin rows — italic muted indent, negative values red.

### Consumer updates (3 files)

- `projection-pipeline.ts` — `avgCommonSizeFor(row)` local helper computing `computeAverage(histYears4.map(y => ratioOfBase(isRows[row][y], isRows[6][y])))`. Replaces `computeAvgGrowth(isRows[N])` × 3 + Selling/G&A splits.
- `projection/income-statement/page.tsx` — same helper inline.
- `projection/noplat/page.tsx` — same helper inline (consumer of Proy. LR chain).

### Export builder — `src/lib/export/sheet-builders/proy-lr.ts`

```ts
const managedRows = [8, 9, 10, 11, 12, 17, 19, 20, 22, 25, 26,
                      29, 31, 33, 34, 36, 37, 39, 40]
// Pre-clear residue at dropped rows:
for (const [col] of cols) {
  ws.getCell(`${col}15`).value = 0
  ws.getCell(`${col}16`).value = 0
}
```

Template formula at row 17 (`=SUM(C15:C16)` if present) → overridden by builder direct write of common-size projection. Rows 15/16 in export file show 0.

### i18n — 6 new keys (EN + ID)
- `proy.revenueGrowth` — "Revenue Growth" / "Pertumbuhan Pendapatan"
- `proy.cogsCommonSize` — "COGS (% of Revenue)" / "HPP (% Pendapatan)"
- `proy.totalOpExCommonSize` — "Total OpEx (% of Revenue)" / "Total Beban Operasi (% Pendapatan)"
- `proy.interestIncomeCommonSize` — "Interest Income (% of Revenue)" / "Pendapatan Bunga (% Pendapatan)"
- `proy.interestExpenseCommonSize` — "Interest Expense (% of Revenue)" / "Beban Bunga (% Pendapatan)"
- `proy.nonOpIncomeCommonSize` — "Non-Op Income (% of Revenue)" / "Pendapatan Non-Operasi (% Pendapatan)"

### Test rewrite — `__tests__/data/live/compute-proy-lr-live.test.ts`

13 → 31 test cases. Synthetic fixture with clean round numbers (Revenue 100M, Rev growth 10%, cogs cs -60%, opex cs -20%, etc.) so every assertion hand-verifiable. Explicit `expect(result[15]).toBeUndefined()` + `expect(result[16]).toBeUndefined()` regression guards. Chained year compounding tested (2022→2023→2024). PRECISION=6 (was 3 due to ROUNDUP).

### Key Drivers store — unchanged per user Q2=B

`cogsRatio` / `sellingExpenseRatio` / `gaExpenseRatio` retained as dead fields. `ProyLrInput` stops reading them, but store v20 schema unchanged, KeyDriversBuilder still writes them to export (harmless), and existing users' localStorage preserved. Zero migration.

## Verification

```
Tests:     1344 / 1344 passing + 1 skipped  (+16 net since Session 048)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Live:      HTTP 200 (penilaian-bisnis.vercel.app/projection/income-statement)
```

## Stats

- Commits on feature branch: 1
- Files touched: 9 (6 src + 1 test + design.md + plan.md)
- LOC: +768 / −361
- Test cases: 13 → 31 in compute-proy-lr-live.test.ts (net +18 in file, +16 session net)
- Store version: unchanged (v20)
- Build routes: 42 static pages (unchanged)
- i18n keys added: 6

## Deviations from Plan

- Plan Task 9 "Phase C whitelist additions" — not needed. Phase C state-parity test runs PT Raja Voltama through the full pipeline and asserts 29-sheet visibility + coverage invariants. Divergent projected values on PROY LR rows 10/17/29/31/34 fall under the "computed + projected sheets: coverage invariant" gate (LESSON-100) rather than strict cell parity. No KNOWN_DIVERGENT_CELLS entries needed. 5/5 Phase C green as-is.
- Integration consumer update count: 3, not 2 as initially estimated. `projection/noplat/page.tsx` had its own inline Proy LR compute (not using `computeFullProjectionPipeline`) — updated separately.

## Deferred

None from this session.

## Lessons Extracted

- [LESSON-139](../lessons-learned.md#lesson-139): Driver-display sync — sub-row labels must render the SAME value that drives compute, never a parallel/approximate metric [PROMOTED]
- [LESSON-140](../lessons-learned.md#lesson-140): Pre-write clear dropped-row cells in template export when managedRows shrinks [local]

## Files Added/Modified

```
src/data/live/compute-proy-lr-live.ts                [REWRITTEN — 226 LOC, new signature + uniform common-size projection]
src/app/projection/income-statement/page.tsx        [REWRITTEN — 186 LOC, discriminated-union ROW_DEFS + sub-row rendering]
src/app/projection/noplat/page.tsx                  [MODIFIED — avgCommonSizeFor helper + new ProyLrInput shape]
src/lib/calculations/projection-pipeline.ts         [MODIFIED — avgCommonSizeFor helper + new ProyLrInput shape]
src/lib/export/sheet-builders/proy-lr.ts            [MODIFIED — managedRows drops 15/16 + pre-clear residue cells]
src/lib/i18n/translations.ts                        [MODIFIED — +6 bilingual keys]
__tests__/data/live/compute-proy-lr-live.test.ts    [REWRITTEN — synthetic fixture @ PRECISION 6, 31 cases]
design.md                                            [REWRITTEN — Session 049 architecture]
plan.md                                              [REWRITTEN — Session 049 10 tasks]
```

## Next Session Recommendation

1. **User visual QA** — verify at `/projection/income-statement`: (a) Selling + G&A rows gone, (b) Total OpEx populated at historical 2021 column, (c) 6 sub-rows render at projection years with driver values, (d) compute numbers match displayed driver × Revenue.
2. **Upload parser (.xlsx → store)** — long-standing priority #1. Reverse direction of export. Needs architecture discussion (null-on-upload force re-confirm for IBD/WC scope slices vs trust-mode preserving uploaded structure).
3. **Dashboard projected FCF chart** — leverages Session 045-047 Proy FA improvements + Session 049's new uniform Proy LR compute.
4. **Re-evaluate Key Drivers UI** — `cogsRatio` / `sellingExpenseRatio` / `gaExpenseRatio` inputs now have no compute effect on Proy LR. UX debt: user can still edit them in Key Drivers form but changes don't affect projection. Options: (a) hide them, (b) add deprecation note, (c) remove from KD UI but keep in store for backward compat.
