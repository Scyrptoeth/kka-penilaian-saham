# Session 016 — DCF + AAM + EEM + BORROWING CAP

> **Milestone**: First share value output — the culmination of 15 sessions.
> **Store**: v6 → v7 (BORROWING CAP CALK values)
> **Pattern**: Custom pages (LESSON-038), shared `computeShareValue()` DRY helper

## Approved Decisions

1. BORROWING CAP CALK values: Opsi A — pure user input, default 0
2. DLOM/DLOC: all methods use `home.dlomPercent` / `home.dlocPercent`. DCF/EEM DLOC=0
3. AAM row 60: BS store Modal Disetor, not hardcoded 600M
4. AAM no ROUNDUP/perShare — follow Excel format exactly
5. ROIC D9=0 (idle), D10=BS!F8*-1 (excess cash) — derivable from store
6. AAM D20 = FIXED ASSET!H74 = 0 — default adjustment to 0, editable masa depan
7. EEM depends on AAM — execution order: AAM first, EEM consumes AAM results
8. Store v6→v7 for `borrowingCap: { piutangCalk, persediaanCalk }` (LESSON-028)

## Dependency Chain

```
Task 1: Store v6→v7 + roundUp helper          (foundation)
Task 2: computeShareValue() + tests            (shared, no deps)
Task 3: computeBorrowingCap() + tests           (BS + DR)
Task 4: computeAam() + tests                    (BS + FA + HOME)
Task 5: computeDcf() + tests                    (PROY + hist + DR + GR + HOME)
Task 6: computeEem() + tests                    (AAM + BC + DR + hist + HOME)
Task 7: Borrowing Cap page + CALK form          (Task 1+3)
Task 8: DCF page                                (Task 1+2+5)
Task 9: AAM page                                (Task 1+2+4)
Task 10: EEM page + nav + verify gauntlet       (Task 1+2+6)
```

## Task Breakdown

### Task 1 — Store v6→v7 + roundUp helper
- **Files**: `src/lib/store/useKkaStore.ts`, `src/lib/calculations/helpers.ts`
- **Changes**:
  - Add `BorrowingCapInputState { piutangCalk: number; persediaanCalk: number }` interface
  - Add `borrowingCapInput: BorrowingCapInputState | null` to KkaState
  - Add setter `setBorrowingCapInput` + reset in `resetAll`
  - Bump `STORE_VERSION = 7`, add `if (fromVersion < 7)` migration block
  - Update `partialize` to include new slice
  - Add `roundUp(value: number, digits: number): number` to helpers.ts
    (Excel ROUNDUP: always rounds away from zero to `digits` decimal places)
- **Verify**: typecheck clean, existing tests pass

### Task 2 — computeShareValue() + tests
- **Files**: `src/lib/calculations/share-value.ts`, `__tests__/lib/calculations/share-value.test.ts`
- **Input**: `{ equityValue100, dlomPercent, dlocPercent, proporsiSaham, jumlahSahamBeredar }`
- **Output**: `{ dlomDiscount, equityLessDlom, dlocDiscount, marketValue100, marketValuePortion, rounded, perShare }`
- **Logic**: dlom = equity * (-dlom%), equityLessDlom = equity + dlom, dloc = eqLessDlom * (-dloc%), mv100 = eqLessDlom + dloc, mvPortion = mv100 * proporsi, rounded = roundUp(mvPortion, -3), perShare = mvPortion / jumlahSaham
- **Tests**: Verify against DCF fixture (C33→C42) and EEM fixture (D34→D45)
- **Note**: AAM does NOT use this — AAM has different tail (no roundUp/perShare, has 600M deduction)

### Task 3 — computeBorrowingCap() + tests
- **Files**: `src/lib/calculations/borrowing-cap.ts`, `__tests__/lib/calculations/borrowing-cap.test.ts`
- **Input**: `{ piutangCalk, persediaanCalk, bsReceivables (F10+F11), bsInventory (F12), bsFixedAssetNet (F22), borrowingPercent (default 0.7), costDebtAfterTax (DR!G7), costEquity (DR!G8) }`
- **Output**: `{ assets: [...], totalAssets, totalBorrowingCap, weightDebt, weightEquity, waccTangible (F14) }`
- **Tests**: 8-10 tests against fixture (D5-F14 values)

### Task 4 — computeAam() + tests
- **Files**: `src/lib/calculations/aam-valuation.ts`, `__tests__/lib/calculations/aam-valuation.test.ts`
- **Input**: BS last-year rows, FA adjustment (default 0), dlomPercent, dlocPercent, proporsiSaham, modalDisetor (BS row 43)
- **Output**: adjusted assets/liabilities/equity, NAV (E51), equityValue (E53), dlomDiscount (E54), dlocDiscount (E56), marketValue100 (E57), marketValuePortion (E59), finalDeduction (E60)
- **Tests**: 12-15 tests against fixture (E9→E60)
- **Key**: Row 51 NAV = TotalAssets - (AP+Tax+Others+RelatedParty) - NOT total liabilities. Row 60 = E59 - modalDisetor (from BS store).

### Task 5 — computeDcf() + tests
- **Files**: `src/lib/calculations/dcf.ts`, `__tests__/lib/calculations/dcf.test.ts`
- **Input**: 
  - Historical last year: NOPLAT!E19, FA!E51 (dep), FA!E23 (capex), CFS!E8/E9 (changes CA/CL)
  - Projected (3 years): PROY NOPLAT rows, PROY CFS rows, PROY FA rows
  - Parameters: wacc (DR!H10), growthRate (GR!C14)
  - Equity adjustments: interestBearingDebt (BS!F31+F38), excessCash (BS!F8)
- **Output**: FCF per year (hist+proj), discountFactors, pvFcf, totalPvFcf, terminalValue, pvTerminal, enterpriseValue, equityValue100
- **Tests**: 15-18 tests covering FCF computation, discounting, terminal value (Gordon model), EV chain
- **Guard**: g >= r check for terminal value (would produce infinite/negative TV)

### Task 6 — computeEem() + tests
- **Files**: `src/lib/calculations/eem-valuation.ts`, `__tests__/lib/calculations/eem-valuation.test.ts`
- **Input**: 
  - AAM adjusted values: E16 (totalCurrentAssets), E22 (totalNonCurrentAssets), E29/E30/E31/E36 (specific liabilities), E9 (cash)
  - BC rate: borrowingCap.waccTangible (F14)
  - Historical: NOPLAT!E19, FA!E51/E23, CFS!E8/E9/E10
  - Parameters: wacc (DR!H10)
  - Equity adjustments: interestBearingDebt, nonOperatingAsset (BS!F8)
- **Output**: netTangibleAsset, earningReturn, fcf, excessEarning, capitalizedExcess, enterpriseValue, equityValue100
- **Tests**: 12-15 tests against fixture (D7→D34)
- **Note**: EEM uses historical FCF only (last year), not projected

### Task 7 — Borrowing Cap page + CALK input form
- **Files**: `src/app/valuation/borrowing-cap/page.tsx`
- **Pattern**: Custom page with CALK input fields (piutangCalk, persediaanCalk) + computed display
- **Store**: reads `borrowingCapInput`, `balanceSheet`, `discountRate` from store
- **Display**: Section 1 (borrowing capacity table) + Section 2 (weighted avg return)

### Task 8 — DCF page
- **Files**: `src/app/valuation/dcf/page.tsx`
- **Pattern**: Custom page, full upstream chain in useMemo
- **Display**: Part 1 (FCF 4-col: hist + 3 proj), Part 2 (discounting), Part 3 (terminal + EV), Part 4 (equity→share via computeShareValue)
- **Upstream**: PROY NOPLAT/CFS/FA + historical adapters + DR + GR + ROIC + HOME

### Task 9 — AAM page
- **Files**: `src/app/valuation/aam/page.tsx`
- **Pattern**: Custom page, 3-column (historical C, adjustments D, adjusted E)
- **Display**: Assets → Liabilities → Equity → NAV → Valuation → DLOM/DLOC → Market Value → Final deduction
- **Note**: Adjustments column renders as read-only 0 (user-editable masa depan)

### Task 10 — EEM page + nav updates + verify gauntlet
- **Files**: `src/app/valuation/eem/page.tsx`, `src/components/layout/nav-tree.ts`
- **Nav**: Add Borrowing Cap, remove `wip` from DCF/AAM/EEM
- **Display**: NTA → Earning Return → Historical FCF → Excess Earning → Capitalization → EV → Share Value
- **Verify**: `npm test`, `npm run build`, `npm run typecheck`, `npm run lint`
- **Commit**: `feat: DCF + AAM + EEM + BORROWING CAP — first share value output (Session 016)`

## Estimated Tests
- share-value: ~6
- borrowing-cap: ~8
- aam-valuation: ~14
- dcf: ~16
- eem-valuation: ~14
- Total: ~58 new tests

## Non-Negotiables
- TDD: RED → GREEN → REFACTOR per module
- Sign convention: store positive, negate in adapters per Excel formula
- Company-agnostic: zero hardcoded prototype values
- Guard division by zero (DCF terminal value g >= r)
- ROUNDUP for final rounding (DCF/EEM), NOT for AAM
- All existing 641 tests must remain green
