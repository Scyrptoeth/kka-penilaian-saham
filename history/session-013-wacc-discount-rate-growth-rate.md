# Session 013 — WACC + Discount Rate + Growth Rate

**Date**: 2026-04-12
**Scope**: Valuation foundation — three independent pages for WACC, CAPM Discount Rate, and Growth Rate computation.
**Branch**: main

## Goals
- [x] WACC computation module + TDD + custom form + page
- [x] Discount Rate CAPM computation + TDD + form + page
- [x] Growth Rate live computation from ROIC/FA/BS upstream + page
- [x] Store v4→v5 (wacc + discountRate slices)

## Delivered

### WACC (Comparable Companies)
- `src/lib/calculations/wacc.ts` — computeBetaUnlevered, computeRelleveredBeta, computeWacc
- `src/components/forms/WaccForm.tsx` — dynamic table, bank rates, override
- `src/app/valuation/wacc/page.tsx` — 19 tests @ 12-decimal
- E22 = 0.1031 hardcoded ("Menurut WP"), IS!B33 = 0

### Discount Rate (CAPM)
- `src/lib/calculations/discount-rate.ts` — BU, BL, Ke, Kd, WACC = 11.463%
- `src/components/forms/DiscountRateForm.tsx` — CAPM params + 5 bank rates
- `src/app/valuation/discount-rate/page.tsx` — 15 tests @ 12-decimal

### Growth Rate
- `src/lib/calculations/growth-rate.ts` — net investment / IC
- `src/data/live/compute-growth-rate-live.ts` — full upstream chain adapter
- `src/app/analysis/growth-rate/page.tsx` — custom 2-column page
- 15 tests (7 unit + 8 integration)

## Verification
```
Tests:     525 / 525 passing (35 files)
Build:     ✅ 17 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 2 (1 feat + 1 docs)
- Files changed: 17
- Lines +1863/-23
- Test cases added: 49

## Lessons Extracted
- [LESSON-036](../lessons-learned.md#lesson-036): WACC vs DR intentionally different inputs
- [LESSON-037](../lessons-learned.md#lesson-037): ROUNDUP vs ROUND precision matching

## Files Added/Modified
```
src/lib/calculations/wacc.ts                        [NEW]
src/lib/calculations/discount-rate.ts               [NEW]
src/lib/calculations/growth-rate.ts                 [NEW]
src/data/live/compute-growth-rate-live.ts           [NEW]
src/components/forms/WaccForm.tsx                   [NEW]
src/components/forms/DiscountRateForm.tsx            [NEW]
src/app/valuation/wacc/page.tsx                     [NEW]
src/app/valuation/discount-rate/page.tsx            [NEW]
src/app/analysis/growth-rate/page.tsx               [NEW]
__tests__/lib/calculations/wacc.test.ts             [NEW]
__tests__/lib/calculations/discount-rate.test.ts    [NEW]
__tests__/lib/calculations/growth-rate.test.ts      [NEW]
__tests__/data/live/compute-growth-rate-live.test.ts [NEW]
src/lib/store/useKkaStore.ts                        [MODIFIED]
__tests__/lib/store/store-migration.test.ts         [MODIFIED]
src/components/layout/nav-tree.ts                   [MODIFIED]
```
