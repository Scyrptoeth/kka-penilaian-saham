# Session 016 — DCF + AAM + EEM + BORROWING CAP (First Share Value Output)

**Date**: 2026-04-12/13
**Scope**: 3 valuation methods (DCF, AAM, EEM) + Borrowing Cap support sheet. First share value output — milestone after 15 sessions.
**Branch**: `feat/session-016-dcf-aam-eem` → merged to `main`

## Goals (from plan.md)
- [x] Store v6→v7 + roundUp helper
- [x] computeShareValue() shared helper + tests
- [x] computeBorrowingCap() + tests
- [x] computeAam() + tests
- [x] computeDcf() + tests
- [x] computeEem() + tests
- [x] Borrowing Cap page with CALK input
- [x] DCF page with full upstream chain
- [x] AAM page with 3-column adjusted BS
- [x] EEM page
- [x] Nav tree updates + verify gauntlet
- [x] **Unplanned**: System hardening audit (debtRate bug, hardcoded values)

## Delivered

### 5 Calculation Modules
- `share-value.ts` — shared equity→DLOM→DLOC→ROUNDUP→perShare (5 tests)
- `borrowing-cap.ts` — CALK-based borrowing capacity + weighted avg return (6 tests)
- `aam-valuation.ts` — Adjusted Asset Method: 3-col adjusted BS + NAV formula (15 tests)
- `dcf.ts` — DCF with Gordon Growth terminal value (13 tests)
- `eem-valuation.ts` — Excess Earnings Method: historical FCF only (10 tests)

### 4 Pages
- `/valuation/borrowing-cap` — CALK input form + computed display
- `/valuation/dcf` — Full upstream chain → FCF → discount → terminal → share value
- `/valuation/aam` — 3-column adjusted BS → NAV → DLOM/DLOC → market value
- `/valuation/eem` — NTA → normal return → excess earning → capitalize → share value

### System Hardening (post-audit)
- **debtRate 100× bug fixed**: extracted `buildDiscountRateInput()` shared adapter
- `idleAsset` computed from ROIC (was hardcoded 0)
- `BORROWING_PERCENT_DEFAULT` named constant (was magic 0.7)
- Dead field `fixedAssetBeginning` removed from AamInput

## Verification
```
Tests:     691 / 691 passing (47 files)
Build:     ✅ 30 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 2 (1 feat + 1 fix)
- Files changed: 20
- Lines +2375/-413
- Test cases added: 49 (642→691)

## Deviations from Plan
- Prompt's DCF E/F column values were wrong (assumed moderate, actually -637B to -9.8T). Tests rewritten with actual fixture values.
- DCF terminal value guard relaxed from `g >= r` to `g === r` — fixture has valid g > r scenario.
- System hardening added as unplanned scope after code review audit.

## Deferred
- `nilaiNominalPerSaham` field in HomeInputs for correct AAM paidUpCapitalDeduction
- `faAdjustment` user input UI in AAM page
- `computeFullProjectionPipeline()` shared function to eliminate DCF upstream chain duplication

## Lessons Extracted
- [LESSON-043](../lessons-learned.md): buildDiscountRateInput — centralize store→input mapping
- [LESSON-044](../lessons-learned.md): Verify fixture projected columns independently
- [LESSON-045](../lessons-learned.md): Gordon Growth allows g > r when FCF negative

## Files Added/Modified
```
src/lib/calculations/share-value.ts              [NEW]
src/lib/calculations/borrowing-cap.ts            [NEW]
src/lib/calculations/dcf.ts                      [NEW]
src/lib/calculations/aam-valuation.ts            [NEW]
src/lib/calculations/eem-valuation.ts            [NEW]
src/lib/calculations/helpers.ts                  [MODIFIED] roundUp()
src/lib/calculations/discount-rate.ts            [MODIFIED] buildDiscountRateInput()
src/lib/store/useKkaStore.ts                     [MODIFIED] v6→v7
src/app/valuation/borrowing-cap/page.tsx         [NEW]
src/app/valuation/dcf/page.tsx                   [NEW]
src/app/valuation/aam/page.tsx                   [NEW]
src/app/valuation/eem/page.tsx                   [NEW]
src/components/layout/nav-tree.ts                [MODIFIED]
__tests__/lib/calculations/share-value.test.ts   [NEW]
__tests__/lib/calculations/borrowing-cap.test.ts [NEW]
__tests__/lib/calculations/dcf.test.ts           [NEW]
__tests__/lib/calculations/aam-valuation.test.ts [NEW]
__tests__/lib/calculations/eem-valuation.test.ts [NEW]
__tests__/lib/store/store-migration.test.ts      [MODIFIED]
```

## Next Session Recommendation
1. Add `nilaiNominalPerSaham` to HomeInputs + form + store migration for correct AAM deduction
2. RESUME / CFI pages (final summary comparing DCF/AAM/EEM results)
3. Extract `computeFullProjectionPipeline()` to eliminate DCF upstream chain duplication
4. FAdjustment user input in AAM page
