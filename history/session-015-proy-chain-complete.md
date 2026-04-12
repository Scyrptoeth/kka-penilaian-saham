# Session 015 — PROY BS + PROY NOPLAT + PROY ACC PAYABLES + PROY CFS

**Date**: 2026-04-12
**Scope**: Complete the projection chain — all 4 remaining projection sheets.
**Branch**: `feat/session-015-proy-chain` → merged to `main` via fast-forward

## Goals
- [x] PROY BS (Projected Balance Sheet) — from BS historical growth + PROY FA + PROY LR
- [x] PROY NOPLAT — from PROY LR with sign-flipped inputs
- [x] PROY ACC PAYABLES — hidden sheet, structural loan schedule
- [x] PROY CFS (Projected Cash Flow Statement) — from all upstream PROY sheets
- [x] Nav tree updates + verify gauntlet
- [x] Push to main + Vercel production deploy

## Delivered

### PROY BS (Projected Balance Sheet)
- `src/data/live/compute-proy-bs-live.ts` — `computeProyBsLive` + `computeAvgGrowth` helper
- Growth rates from BS historical Q column (AVERAGE of 3 YoY growth periods)
- Row 45 Total CL = SUM(37:43) including growth rows (faithful Excel reproduction)
- Row 13 AR supports optional `arAdjustments` for "copas number" manual entries
- IFERROR-safe for zero-base NCL rows (48/49 protected, 50/51 safe-clamped)
- `src/app/projection/balance-sheet/page.tsx` — custom page with 3 sections
- 32 tests (fixture-grounded at 3-decimal precision + structural + computeAvgGrowth unit tests)

### PROY NOPLAT
- `src/data/live/compute-proy-noplat-live.ts` — split historical/projected processing
- Historical column: uses IS values + IS B33 tax rate (0 — empty cell)
- Projected columns: uses PROY LR values + KEY DRIVERS tax rate (0.22)
- `src/app/projection/noplat/page.tsx` — custom page
- 16 tests (fixture-grounded, all 3 years + historical)

### PROY ACC PAYABLES
- `src/data/live/compute-proy-acc-payables-live.ts` — ST + LT loan schedule
- Hidden sheet, no visible page. Consumed by PROY CFS row 26.
- All balances 0 in prototype (no active loans)
- Interest: Ending * rate * -1 pattern
- 10 tests (structural + non-zero balance scenario)

### PROY CFS (Projected Cash Flow Statement)
- `src/data/live/compute-proy-cfs-live.ts` — full upstream chain
- CFO: EBITDA + Tax + Working Capital (CA delta * -1 + CL delta)
- CFI: PROY FA CapEx * -1
- CFF: Interest + Principal from upstream
- Cash balance: from PROY BS rows 9 + 11
- `src/app/projection/cash-flow/page.tsx` — custom page with 4 sections
- 17 tests (fixture-grounded + structural)

## Verification
```
Tests:     638 / 638 passing (42 files)
Build:     ✅ 27 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 1 feat
- Files changed: 12
- Lines +1724/-3
- Test cases added: 75

## Deviations from Plan
- PROY NOPLAT needed split historical/projected processing — IS B33 tax rate (0) differs from KEY DRIVERS tax rate (0.22). Not in prompt but discovered from fixture analysis.
- PROY LR fixture values for E/F columns differ from the PROY LR test's computed values — always use raw fixture values, not values derived from other tests.

## Lessons Extracted
- LESSON-039: PROY NOPLAT historical and projected columns use different source sheets AND different tax rates — IS B33 (0) vs PROY LR B37 (0.22). Always check ALL cross-sheet references per column, not just per row.
- LESSON-040: Never reuse fixture values from one test file in another — always extract from the primary fixture JSON. The PROY LR test values for E/F columns diverged from the actual proy-lr.json fixture.

## Files Added/Modified
```
src/data/live/compute-proy-bs-live.ts                          [NEW]
src/data/live/compute-proy-noplat-live.ts                      [NEW]
src/data/live/compute-proy-acc-payables-live.ts                [NEW]
src/data/live/compute-proy-cfs-live.ts                         [NEW]
src/app/projection/balance-sheet/page.tsx                      [NEW]
src/app/projection/noplat/page.tsx                             [NEW]
src/app/projection/cash-flow/page.tsx                          [NEW]
__tests__/data/live/compute-proy-bs-live.test.ts               [NEW]
__tests__/data/live/compute-proy-noplat-live.test.ts           [NEW]
__tests__/data/live/compute-proy-acc-payables-live.test.ts     [NEW]
__tests__/data/live/compute-proy-cfs-live.test.ts              [NEW]
src/components/layout/nav-tree.ts                              [MODIFIED]
```

## Next Session Recommendation
1. **DCF + AAM + EEM** — first share value output! All upstream projection data ready.
2. CFI (Cash Flow from Invested Capital) if needed as intermediate
3. RESUME page (summary of all valuation methods)
