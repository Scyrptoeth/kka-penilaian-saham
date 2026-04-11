# Plan — KKA Penilaian Saham (Session 2A: Calc Engines)

Branch: `feat/phase2-calc-engines`
Target: 6 pure-function calculation modules + tests, validated against Excel fixtures at 12-decimal precision.

## Tasks

### Task 1 — Branch + fixture reconnaissance ✅
- Create branch `feat/phase2-calc-engines` off main
- Inspect `financial-ratio.json` → confirmed 19 ratios in B column across 4 sections (rows 6-11 Profitability, 14-16 Liquidity, 19-23 Leverage, 26-30 Cash Flow Indicator)
- Inspect `growth-revenue.json` → confirmed sales row 8, net income row 9; year columns B (2018) onwards. Company data only in scope.
- **Verify**: branch active, fixtures understood

### Task 2 — `fixed-asset.ts`
- Inspect `fixed-asset.json` column headers (C/D/E/F/G for year × category, row 7 Beginning, row 16 Additions, row 25 Ending; same pattern for Depreciation in rows 35/44/53; Net Value at row 62)
- Define types: `FixedAssetInput`, `FixedAssetSchedule`, `FixedAssetCategory`
- RED: test `Total Acquisition Ending` matches fixture row 32, `Total Depreciation Ending` matches row 60, `Net Value Total` matches row 69, for 3 years
- GREEN: implement `computeFixedAssetSchedule(input)` — pure function returning beginning/additions/disposals/ending per category plus totals
- **Verify**: tests pass (~5 assertions); commit `feat(calc): fixed asset schedule`

### Task 3 — `noplat.ts`
- Inspect `noplat.json`: rows 7 PBT, 8 Interest Exp, 9 Interest Inc, 10 Non-Op Inc, 11 EBIT, 13 Tax Provision, 14 Tax Shield on Interest Exp, 15 Tax on Interest Inc, 16 Tax on Non-Op, 17 Total Tax EBIT, 19 NOPLAT
- RED: test EBIT row 11, Total Tax row 17, NOPLAT row 19 for 3 years (cols C/D/E)
- GREEN: implement `computeNoplat(input)` — pure, derives EBIT from PBT + interest components, tax via component sum, NOPLAT = EBIT − TotalTax
- **Verify**: tests pass; commit `feat(calc): noplat`

### Task 4 — `fcf.ts`
- Inspect `fcf.json`: row 7 NOPLAT, 8 Depreciation, 9 GCF, 14 Total WC change, 16 CAPEX, 18 GI, 20 FCF
- RED: test GCF row 9, GI row 18, FCF row 20 for 3 years
- GREEN: implement `computeFcf(input)` — GCF = NOPLAT + Depr, GI = ΔWC + CAPEX, FCF = GCF − GI
- **Verify**: tests pass; commit `feat(calc): free cash flow`

### Task 5 — `cash-flow.ts`
- Inspect `cash-flow-statement.json`: row 5 EBITDA, 6 Corporate Tax, 7 ΔWC, 11 CFO, 13 CF Non-Ops, 17 CFI, 19 CF before Financing, 21-28 Financing rows, 30 Net CF, 33 Cash Ending
- Inspect `acc-payables.json` for installment/employee payable amounts per year
- RED: test CFO row 11, CF before Financing row 19, Net CF row 30 for 3 years
- GREEN: implement `computeCashFlowStatement(input)` — pure; takes EBITDA, tax, working capital deltas, CAPEX, loan deltas, acc payables data
- **Verify**: tests pass; commit `feat(calc): cash flow statement`

### Task 6 — `ratios.ts`
- Inspect `financial-ratio.json` column headers (year cols likely E/F/G/H)
- Define `FinancialRatios` type with 19 fields grouped by category
- RED: test 5 representative ratios at 12 decimal precision — Gross Profit Margin (row 6), Net Profit Margin (row 9), Return on Equity (row 11), Debt to Equity Ratio (row 20), Current Ratio (row 14)
- GREEN: implement `computeFinancialRatios(bs, is)` returning all 19 ratios; each ratio as a year-keyed series
- **Verify**: tests pass; commit `feat(calc): financial ratios`

### Task 7 — `growth-revenue.ts`
- Inspect `growth-revenue.json` row 8 (sales) + row 9 (net income); growth computed in subsequent rows or implicit
- RED: test Penjualan YoY for years 2 and 3 vs `yoyChangeSafe(sales[i], sales[i-1])`; same for Laba Bersih
- GREEN: implement `computeGrowthRevenue({sales, netIncome})` returning `{salesGrowth, netIncomeGrowth}` — both arrays of N-1 elements with IFERROR-safe semantics
- **Verify**: tests pass; commit `feat(calc): growth revenue`

### Task 8 — Update barrel + type check
- Add 6 new exports to `src/lib/calculations/index.ts` (functions only, no types — types stay in individual files/helpers)
- Run `npx tsc --noEmit`
- **Verify**: zero TS errors

### Task 9 — Full verify + progress + merge + push
- `npm test -- --run 2>&1 | tail -20` → expect ~40+ passing
- `npm run build 2>&1 | tail -25` → expect clean
- `npm run lint 2>&1 | tail -20` → expect clean
- Update `progress.md` with Session 2A summary + next-session priorities
- Commit `docs: session 2a wrap-up`
- Merge `feat/phase2-calc-engines` → `main`
- `git push origin main` (trigger Vercel deploy)
- **Verify**: Vercel deployment succeeds

## Progress

- [x] Task 1 — Branch + fixture reconnaissance
- [ ] Task 2 — `fixed-asset.ts`
- [ ] Task 3 — `noplat.ts`
- [ ] Task 4 — `fcf.ts`
- [ ] Task 5 — `cash-flow.ts`
- [ ] Task 6 — `ratios.ts`
- [ ] Task 7 — `growth-revenue.ts`
- [ ] Task 8 — Barrel + typecheck
- [ ] Task 9 — Verify + merge + push
