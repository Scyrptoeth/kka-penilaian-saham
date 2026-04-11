# Session 002 — Phase 2 Calc Engines

**Date**: 2026-04-11
**Scope**: Phase 2A — 6 calculation modules for the analysis layer (Fixed Asset, NOPLAT, FCF, Cash Flow, Ratios, Growth Revenue)
**Branch**: `feat/phase2-calc-engines` → `main` (fast-forward merged)

## Goals (dari plan.md awal sesi)

9-task plan:

- [x] Task 1 — Branch + fixture reconnaissance
- [x] Task 2 — `fixed-asset.ts` schedule (6 categories, beginning/additions/ending, net value)
- [x] Task 3 — `noplat.ts` (EBIT, Total Taxes, NOPLAT)
- [x] Task 4 — `fcf.ts` (GCF, GI, FCF with pre-signed convention)
- [x] Task 5 — `cash-flow.ts` (CFO, CFI, CFF, Net Cash Flow — 11 input series)
- [x] Task 6 — `ratios.ts` (18 ratios across 4 sections)
- [x] Task 7 — `growth-revenue.ts` (YoY for sales + net income)
- [x] Task 8 — Update `src/lib/calculations/index.ts` barrel
- [x] Task 9 — Full verify + merge + push

## Delivered

### 6 Pure Calculation Modules

All under `src/lib/calculations/`, validated against Excel fixtures at **12-decimal precision**.

**fixed-asset.ts** — `computeFixedAssetSchedule`
- 6 canonical asset categories: Land, Building, Equipment & Laboratory, Vehicle & Heavy Equipment, Office Inventory, Electrical Installation
- Three sections per category: Acquisition Costs, Accumulated Depreciation, Net Value
- Ending = Beginning + Additions − Disposals (workbook has no disposals data, but function supports it)
- Totals exposed for downstream FCF/Cash Flow consumption

**noplat.ts** — `computeNoplat`
- EBIT = PBT + InterestExpense + InterestIncome + NonOperatingIncome (Excel SUM with pre-signed values)
- Total Taxes = TaxProvision + 3 tax adjustments (shield, interest income tax, non-op tax)
- NOPLAT = EBIT − Total Taxes
- Optional tax adjustment inputs default to zero

**fcf.ts** — `computeFcf`
- GrossCashFlow = NOPLAT + depreciation (pre-signed negative)
- TotalWorkingCapitalChange = ΔCA + ΔCL
- GrossInvestment = TotalWC + capex (pre-signed negative)
- FreeCashFlow = GCF + GI
- Pre-signed convention documented in JSDoc

**cash-flow.ts** — `computeCashFlowStatement`
- 11 input series producing CFO, CFI, CFbF, CFF, NetCashFlow
- CFO = EBITDA + tax + ΔCA + ΔCL (Excel SUM skipping empty header row)
- CFI = capex (pre-signed)
- CFF = equity + newLoan + interestPayment + interestIncome + principalRepayment

**ratios.ts** — `computeFinancialRatios`
- 18 ratios in 4 sections: Profitability (6), Liquidity (3), Leverage (5), Cash Flow Indicator (4)
- Inputs span IS, BS, CFS, FCF (19 source series)
- `absRatioSafe` and `safeRatio` helpers for zero-division (matches IFERROR,0 pattern)

**growth-revenue.ts** — `computeGrowthRevenue`
- YoY growth for sales + net income
- Uses `yoyChangeSafe` (IF prev==0 return 0) matching Excel IF guard
- Produces N−1 elements from N years of input

### Supporting Infrastructure
- `src/lib/calculations/index.ts` barrel extended with 6 new modules
- `__tests__/helpers/fixture.ts` extended with 7 new fixture loaders (fixed-asset, noplat, fcf, cash-flow-statement, financial-ratio, growth-revenue, acc-payables) + optional `numOpt` helper

## Verification

```
Tests:     47 / 47 passing (9 files)  [was 21]
Build:     ✅ Compiled successfully in 2.0s
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ Zero warnings
```

## Stats

- Commits: 7 (6 feature + 1 barrel/wrap-up)
- Files changed: 17
- Lines: +1612 / −152
- Test cases added: +26 (21 → 47)
- New files: 6 calc modules + 6 test files
- New fixtures: 0 (all pre-existing from Phase 1)
- New dependencies: 0

## Deviations from Plan

None. All 9 planned tasks delivered in sequence. One minor scope addition: added 7th test per module (year-set guard) was not in the original plan but grew organically from the typed assertions.

## Deferred

Nothing from this plan. Phase 2B (UI layer) moved to separate future session per the "calc-first" split decision.

## Lessons Extracted

- [LESSON-011](../lessons-learned.md#lesson-011): Pre-signed convention must be centralized — Excel sheets store `FA!C51*-1` and `FA!C23*-1` patterns, so FCF/CashFlow inputs arrive pre-negated. Silently applied `*-1` is a future-maintenance hazard.
- [LESSON-013](../lessons-learned.md#lesson-013): Cross-sheet column offset is a silent landmine — BS/IS use cols D/E/F for 2019–2021; CFS/FCF use C/D/E for the identical years. Test helpers must document and enforce per-sheet column maps.
- [LESSON-016](../lessons-learned.md#lesson-016): Different Excel sheets have different year spans — BS/IS have 4 years (2018–2021), but FA/NOPLAT/FCF/CFS have 3 years (2019–2021) because the first year's beginning balance = the prior year's ending.
- [LESSON-017](../lessons-learned.md#lesson-017): Financial Ratio sheet exposes pre-computed cells but our function must compute from raw primitives — `IS!D9` is GP/Revenue already computed on IS. Don't reference pre-computed ratio cells; re-compute from raw line items to remain engine-agnostic.

## Files & Components Added/Modified

```
src/lib/calculations/fixed-asset.ts                 [NEW]
src/lib/calculations/noplat.ts                      [NEW]
src/lib/calculations/fcf.ts                         [NEW]
src/lib/calculations/cash-flow.ts                   [NEW]
src/lib/calculations/ratios.ts                      [NEW]
src/lib/calculations/growth-revenue.ts              [NEW]
src/lib/calculations/index.ts                       [MODIFIED — barrel]
__tests__/lib/calculations/fixed-asset.test.ts      [NEW]
__tests__/lib/calculations/noplat.test.ts           [NEW]
__tests__/lib/calculations/fcf.test.ts              [NEW]
__tests__/lib/calculations/cash-flow.test.ts        [NEW]
__tests__/lib/calculations/ratios.test.ts           [NEW]
__tests__/lib/calculations/growth-revenue.test.ts   [NEW]
__tests__/helpers/fixture.ts                        [MODIFIED — 7 new loaders]
design.md / plan.md / progress.md                   [MODIFIED]
```

## Next Session Recommendation

Raised by user after Session 002 closed: **"Apakah ini system development atau patching?"** This led to identification of 3 architectural rough edges:
1. Column offset is caller's burden (risky)
2. No boundary validation (NaN/Infinity/length errors opaque)
3. Implicit sign convention (future maintainer trap)

Recommendation: Session 2A.5 hardening BEFORE Session 2B (UI) to prevent these becoming debug graveyards during UI wiring.
