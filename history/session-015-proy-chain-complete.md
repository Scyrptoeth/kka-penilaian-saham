# Session 015 — PROY Chain Complete + System Development Hardening

**Date**: 2026-04-12
**Scope**: Complete projection chain (4 sheets) + exhaustive company-agnostic audit + system development fixes.
**Branch**: `feat/session-015-proy-chain` → merged to `main`

## Goals
- [x] PROY BS (Projected Balance Sheet)
- [x] PROY NOPLAT (Projected NOPLAT)
- [x] PROY ACC PAYABLES (hidden sheet, structural)
- [x] PROY CFS (Projected Cash Flow Statement)
- [x] Nav tree updates + verify gauntlet
- [x] Push to main + Vercel production deploy
- [x] **Unplanned**: Full company-agnostic audit (3 rounds) + system fixes

## Delivered

### 4 Projection Sheets
- `compute-proy-bs-live.ts` — from BS avg growth + PROY FA + PROY LR net profit (32 tests)
- `compute-proy-noplat-live.ts` — from PROY LR, split hist/proj tax rates (16 tests)
- `compute-proy-acc-payables-live.ts` — hidden, structural, all zeros in prototype (10 tests)
- `compute-proy-cfs-live.ts` — full upstream chain, 4 sections (17 tests)
- 3 new pages: `/projection/balance-sheet`, `/projection/noplat`, `/projection/cash-flow`

### System Development Hardening (3 audit rounds)
**Round 1**: IS_GROWTH_DEFAULTS (23% revenue growth) hardcoded → `computeAvgGrowth()` from user IS data. histTaxRate: 0 → `abs(tax/PBT)`. Loan balances: 0 → from BS store.

**Round 2**: NOPLAT historical adapter rows 14-16 hardcoded to 0 → effective tax rate from IS. Projection years `[T,T+1,T+2]` in 5 files → `computeProjectionYears()` centralized.

**Round 3**: Manifest header "PT RAJA VOLTAMA ELEKTRIK" → generic. 9 stale "Phase 3 akan..." disclaimers updated.

### Infrastructure Improvements
- `computeAvgGrowth()` moved to shared `helpers.ts`
- `computeProjectionYears()` + `PROJECTION_YEAR_COUNT` in `year-helpers.ts`
- `historicalYearCount` type widened from `3|4` to `number`
- Tests refactored: fixture-match for unaffected rows, structural verification for NOPLAT-cascading rows

## Verification
```
Tests:     641 / 641 passing (42 files)
Build:     ✅ 27 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 5 (1 feat + 1 docs + 3 refactor/fix)
- Files changed: 32
- Lines +1991/-74
- Test cases added: 78 (75 new + 3 refactored)

## Deviations from Plan
- Session prompt planned 5 tasks (4 sheets + verify). Actual delivery expanded with 3 rounds of company-agnostic audit triggered by user's repeated system-development question.
- PROY NOPLAT needed split hist/proj processing (not in prompt — discovered from fixture).
- PROY LR fixture values E/F columns diverged from test file values (LESSON-040).

## Lessons Extracted
- [LESSON-039](../lessons-learned.md#lesson-039): PROY NOPLAT hist vs proj different source sheets + tax rates
- [LESSON-040](../lessons-learned.md#lesson-040): Never reuse fixture values from one test in another
- [LESSON-041](../lessons-learned.md#lesson-041): Page-level wiring is where case-specific values hide
- [LESSON-042](../lessons-learned.md#lesson-042): Centralize projection year count — scattered magic number

## Files Added/Modified
```
src/data/live/compute-proy-bs-live.ts                  [NEW]
src/data/live/compute-proy-noplat-live.ts              [NEW]
src/data/live/compute-proy-acc-payables-live.ts        [NEW]
src/data/live/compute-proy-cfs-live.ts                 [NEW]
src/app/projection/balance-sheet/page.tsx              [NEW]
src/app/projection/noplat/page.tsx                     [NEW]
src/app/projection/cash-flow/page.tsx                  [NEW]
__tests__/data/live/compute-proy-bs-live.test.ts       [NEW]
__tests__/data/live/compute-proy-noplat-live.test.ts   [NEW]
__tests__/data/live/compute-proy-acc-payables-live.test.ts [NEW]
__tests__/data/live/compute-proy-cfs-live.test.ts      [NEW]
src/data/live/compute-noplat-live.ts                   [MODIFIED - tax adj fix]
src/lib/calculations/helpers.ts                        [MODIFIED - computeAvgGrowth]
src/lib/calculations/year-helpers.ts                   [MODIFIED - computeProjectionYears]
src/app/projection/income-statement/page.tsx           [MODIFIED - agnostic fix]
src/app/projection/fixed-asset/page.tsx                [MODIFIED - agnostic fix]
src/components/layout/nav-tree.ts                      [MODIFIED]
src/data/manifests/*.ts (9 files)                      [MODIFIED - disclaimers]
__tests__/data/live/compute-noplat-live.test.ts        [MODIFIED - structural]
__tests__/data/live/compute-fcf-live.test.ts           [MODIFIED - structural]
__tests__/data/live/compute-roic-live.test.ts          [MODIFIED - structural]
__tests__/data/live/compute-financial-ratio-live.test.ts [MODIFIED - structural]
```

## Next Session Recommendation
1. **DCF + AAM + EEM** — first share value output! All upstream data ready.
2. CFI (Cash Flow from Invested Capital) if needed as intermediate
3. RESUME page (summary of all valuation methods)
