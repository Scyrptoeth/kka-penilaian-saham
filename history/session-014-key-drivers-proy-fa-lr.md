# Session 014 — KEY DRIVERS + PROY FA + PROY LR

**Date**: 2026-04-12
**Scope**: Projection chain start — KEY DRIVERS input form, projected fixed assets, projected income statement.
**Branch**: main

## Goals
- [x] KEY DRIVERS input form + store v5→v6
- [x] PROY Fixed Assets computation from historical FA + growth rates
- [x] PROY LR projected income statement from KEY DRIVERS + IS + PROY FA
- [x] Nav-tree updates for all 3 pages

## Delivered

### KEY DRIVERS (Input Form)
- `src/lib/calculations/key-drivers.ts` — computeSalesVolumes (ROUND), computeSalesPrices (ROUNDUP), computeTotalCapex
- `src/components/forms/KeyDriversForm.tsx` — 4-section form with 7-year grid, auto-persist (debounced 500ms)
- `src/app/input/key-drivers/page.tsx` — hydration gate + HOME guard
- Store v5→v6: `keyDrivers: KeyDriversState | null`
- 16 tests matching fixture Sales Vol/Price exactly

### PROY Fixed Assets
- `src/data/live/compute-proy-fixed-assets-live.ts` — growth rate computation + 3-section projection (acquisition, depreciation, net value)
- `src/app/projection/fixed-asset/page.tsx` — custom 4-column page (1 hist + 3 proj)
- 9 structural tests (chaining, totals, ending=beg+add, net=acq-dep)
- Custom page (not manifest-based) — PROY structure doesn't fit manifest system

### PROY LR (Projected Income Statement)
- `src/data/live/compute-proy-lr-live.ts` — full revenue-to-net-profit chain with KEY DRIVERS ratios, IS historical seed, PROY FA depreciation
- `src/app/projection/income-statement/page.tsx` — custom page with margin rows
- 15 fixture-grounded tests (Revenue, COGS, GP, EBITDA, EBIT, PBT, Tax, NP all match @ 3-decimal)
- Sign convention: store positive ratios, negate in adapter (LESSON-011)
- ROUNDUP applied to COGS per Excel formula

## Verification
```
Tests:     563 / 563 passing (38 files)
Build:     ✅ 20 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 2 (1 feat + 1 docs)
- Files changed: 13
- Lines +1625/-79
- Test cases added: 38

## Deviations from Plan
- Seed sync not done — PROY pages are downstream computed, seed mode not meaningful
- Manifests not created — custom pages used instead (LESSON-038)
- LiveView wrappers embedded in pages (not separate components)
- PROY FA exact fixture-precision tests deferred — structural tests verify correctness

## Lessons Extracted
- [LESSON-037](../lessons-learned.md#lesson-037): ROUNDUP vs ROUND precision matching
- [LESSON-038](../lessons-learned.md#lesson-038): PROY pages → custom page, not manifest+SheetPage

## Files Added/Modified
```
src/lib/calculations/key-drivers.ts                      [NEW]
src/data/live/compute-proy-fixed-assets-live.ts          [NEW]
src/data/live/compute-proy-lr-live.ts                    [NEW]
src/components/forms/KeyDriversForm.tsx                  [NEW]
src/app/input/key-drivers/page.tsx                       [NEW]
src/app/projection/fixed-asset/page.tsx                  [NEW]
src/app/projection/income-statement/page.tsx             [NEW]
__tests__/lib/calculations/key-drivers.test.ts           [NEW]
__tests__/data/live/compute-proy-fixed-assets-live.test.ts [NEW]
__tests__/data/live/compute-proy-lr-live.test.ts         [NEW]
src/lib/store/useKkaStore.ts                             [MODIFIED]
__tests__/lib/store/store-migration.test.ts              [MODIFIED]
src/components/layout/nav-tree.ts                        [MODIFIED]
```

## Next Session Recommendation
1. PROY BS + PROY NOPLAT + PROY CFS + PROY AP (projection chain complete)
2. DCF + AAM + EEM (first share value output!)
