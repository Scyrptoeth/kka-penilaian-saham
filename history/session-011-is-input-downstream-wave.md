# Session 011 — IS Input + First Downstream Wave

**Date**: 2026-04-12
**Scope**: Income Statement input page + 3 downstream live migrations (NOPLAT, Growth Revenue, Financial Ratio). CFS deferred to Session 012.
**Branch**: `feat/session-011-is-input-downstream` → merged to `main` via fast-forward

## Goals (from session-011-prompt.md)

- [x] Extract `<ManifestEditor>` generic component (Task 0)
- [x] Extend `deriveComputedRows` for signed refs (Task 1)
- [x] IS `computedFrom` declarations + fixture verification (Task 2)
- [x] `/input/income-statement` page via ManifestEditor (Task 2)
- [x] `liveRows` prop on SheetPage for downstream override (Task 3)
- [x] NOPLAT live mode from IS (Task 4)
- [x] Growth Revenue live mode from IS (Task 5)
- [x] Financial Ratio live mode — 14/18 ratios, CF ratios = 0 + footer note (Task 6)
- [ ] Cash Flow Statement live mode — **deferred to Session 012** (Opsi C, approved pre-session)
- [x] Verify gauntlet + production deploy (Task 7)
- [x] progress.md updated (Task 8)

## Delivered

### Task 0 — ManifestEditor extraction
- New `src/components/forms/ManifestEditor.tsx` — generic `'use client'` component with hydration-seed + debounced-persist + computed-row pattern
- `/input/balance-sheet/page.tsx` refactored from 144 → 60 lines, zero behavior change
- Props: `manifest`, `tahunTransaksi`, `yearCount`, `sliceSelector`, `sliceSetter`, `headerTitle`
- Lazy `useState` initializer for `getState()` read (per `rerender-lazy-state-init` best practice)

### Task 1 — Signed computedFrom
- `deriveComputedRows` now resolves `Math.abs(ref)` and applies `ref < 0 ? -1 : 1` sign multiplier
- 3-line change in function body, zero impact on positive-only refs (BS)
- 4 new tests: subtraction, mixed, chained, backward-compat regression

### Task 2 — IS manifest + input page
- 7 `computedFrom` declarations added to IS manifest with fixture-verified signs:
  - row 8 Gross Profit = `[6, -7]`
  - row 15 Total OpEx = `[12, 13]`
  - row 18 EBITDA = `[8, -15]`
  - row 22 EBIT = `[18, -21]`
  - row 28 Net Interest = `[26, -27]` (relabeled — was "Other Incomes/(Charges)")
  - row 32 PBT = `[22, 28, 30]`
  - row 35 Net Profit = `[32, -33]`
- **Discovery**: IS manifest rows 28 and 30 had been mis-typed since Session 004. Fixture formula `D28 = =+D26+D27` proved row 28 is a computed subtotal (Net Interest), not a leaf. Row 30 is a leaf (Other Non-Op), not a subtotal. Labels and types corrected. See LESSON-035.
- 24 fixture tests: 6 profit subtotals × 4 years at 6-decimal precision
- `/input/income-statement/page.tsx` — 60 lines (parent gate + ManifestEditor)
- Nav entry activated in Input Data group

### Task 3 — SheetPage liveRows prop
- Optional `liveRows?: Record<number, YearKeyedSeries> | null` prop added
- `undefined` → legacy slug-based store lookup (BS/IS/FA pages unchanged)
- `null` → "upstream not ready" → pin to seed mode
- non-null → use as live data source, bypass store lookup

### Task 4 — NOPLAT live mode
- `src/data/live/compute-noplat-live.ts` — Approach B (direct formulas, no adapter chain)
- Maps IS values onto NOPLAT manifest leaves: PBT (→row 7), IE add-back (→row 8), II subtract (→row 9), Non-Op subtract (→row 10), Tax provision (→row 13), tax shields zeroed (rows 14–16)
- NOPLAT manifest gained `computedFrom` on rows 11 (EBIT), 17 (Total Taxes), 19 (NOPLAT)
- `src/components/analysis/NoplatLiveView.tsx` — lazy `useMemo` wrapper
- 24 integration tests: 8 rows × 3 years vs NOPLAT fixture

### Task 5 — Growth Revenue live mode
- `src/data/live/compute-growth-revenue-live.ts` — projects IS row 6 (Revenue) and IS row 35 (NPAT, computed subtotal) onto GR rows 8/9
- `yoyGrowth` derivation on GR manifest auto-fills growth columns
- `src/components/analysis/GrowthRevenueLiveView.tsx`
- 8 fixture tests: 2 rows × 4 years

### Task 6 — Financial Ratio live mode (partial)
- `src/data/live/compute-financial-ratio-live.ts` — 14 ratios from BS + IS via `safeDiv` helper
  - Profitability (6): GPM, EBITDA margin, EBIT margin, NPM, ROA, ROE
  - Liquidity (3): Current, Quick, Cash
  - Leverage (5): D/A, D/E, Capitalization, Interest Coverage, Equity/Assets
  - Cash Flow (4): pinned to 0 until Session 012
- `src/components/analysis/FinancialRatioLiveView.tsx` — footer note explaining zero CF ratios
- 54 integration tests: 14 real ratios × 3 years + 4 zero placeholders × 3 years

## Verification

```
Tests:     283 / 283 passing (27 files) — +114 vs Session 010
Build:     ✅ 20 routes, 13 static pages prerendered
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Smoke:     ✅ 15/15 production routes HTTP 200
```

## Stats

- Commits: 8 feature + 1 wrap-up docs
- New files: 11 (4 source + 4 test + 3 live-view wrappers)
- Files modified: 10
- Net delta: +1053 / −138 lines
- New tests: 114
- Deployments: 1 production (Vercel auto-deploy)

## Deviations from Plan

- **CFS deferred entirely**: Plan offered 3 options (ship partial / ship with warning / defer). User + CLI jointly chose defer (Opsi C) because partial CFS with missing capex/equity would mislead DJP auditors. Not a slip — explicit pre-session decision.
- **IS manifest relabeling**: Rows 28 and 30 had wrong type/label since Session 004. Discovered during fixture formula inspection for `computedFrom` authoring. Fixed in-flight — no extra commit, folded into Task 2.
- **Test count exceeded estimate by 10×**: Plan estimated ~10 tests; shipped 114. The fixture-grounded integration test pattern (every row × every year × every downstream sheet) produced many more assertions than anticipated, which is a net positive for regression confidence.

## Deferred

- CFS live mode → Session 012 (needs FA + Acc Payables)
- FCF live mode → Session 012 (needs FA)
- ROIC live mode → Session 012 (needs NOPLAT + FA)
- Fixed Asset input page → Session 012
- Validation warn border on non-numeric input → pending user feedback

## Lessons Extracted

- [LESSON-035](../lessons-learned.md#lesson-035): Trust fixture formulas over your own past manifest labels

## Files & Components Added/Modified

```
src/components/forms/ManifestEditor.tsx                     [NEW]
src/components/analysis/NoplatLiveView.tsx                   [NEW]
src/components/analysis/GrowthRevenueLiveView.tsx            [NEW]
src/components/analysis/FinancialRatioLiveView.tsx           [NEW]
src/data/live/compute-noplat-live.ts                         [NEW]
src/data/live/compute-growth-revenue-live.ts                 [NEW]
src/data/live/compute-financial-ratio-live.ts                [NEW]
src/app/input/income-statement/page.tsx                      [NEW]
__tests__/data/manifests/income-statement-computed-from.test.ts [NEW]
__tests__/data/live/compute-noplat-live.test.ts              [NEW]
__tests__/data/live/compute-growth-revenue-live.test.ts      [NEW]
__tests__/data/live/compute-financial-ratio-live.test.ts     [NEW]
src/app/input/balance-sheet/page.tsx                         [MODIFIED — refactored to ManifestEditor]
src/components/financial/SheetPage.tsx                        [MODIFIED — liveRows prop]
src/lib/calculations/derive-computed-rows.ts                 [MODIFIED — signed refs]
__tests__/lib/calculations/derive-computed-rows.test.ts      [MODIFIED — +4 signed tests]
src/data/manifests/income-statement.ts                       [MODIFIED — computedFrom + relabel]
src/data/manifests/noplat.ts                                 [MODIFIED — computedFrom rows 11/17/19]
src/components/layout/nav-tree.ts                            [MODIFIED — IS wip removed]
src/app/analysis/noplat/page.tsx                             [MODIFIED — NoplatLiveView]
src/app/analysis/growth-revenue/page.tsx                     [MODIFIED — GrowthRevenueLiveView]
src/app/analysis/financial-ratio/page.tsx                    [MODIFIED — FinancialRatioLiveView]
```

## Next Session Recommendation

Based on delivered + deferred, Session 012 priorities:
1. FA `computedFrom` declarations + `/input/fixed-asset` page via ManifestEditor
2. Acc Payables minimal input surface (hidden sheet dependency for CFS)
3. CFS live mode (complete, not partial)
4. FCF live mode
5. ROIC live mode
