# Design — Session 049 Proy. P&L Refactor (OpEx Merge + Common-Size Projection Drivers)

**Session**: 049
**Date**: 2026-04-19
**Scope**: Refactor PROJECTION > Proy. P&L untuk (a) hapus Selling/Others OpEx + General & Admin, pertahankan Total OpEx dengan driver baru (Revenue × avgCommonSize IS.15); (b) ubah driver proyeksi COGS/II/IE/NOI dari ratio-KD / prev-YoY menjadi (Revenue × avgCommonSize IS.<row>); (c) tampilkan baris info growth/common-size di bawah tiap akun leaf sebagai informasi driver yang digunakan compute.

---

## 1. Problem Statement

Current Proy. P&L memakai 3 ratio dari Key Drivers (`cogsRatio`, `sellingExpenseRatio`, `gaExpenseRatio`) untuk proyeksi COGS + dua OpEx, dan avgYoY-growth historis untuk Interest Income/Expense/Non-Op Income. Itu menghasilkan proyeksi yang:

- Tergantung pada dua input Key Drivers (Selling + G&A) yang tidak digunakan konsumer lain.
- Menyisakan 2 baris OpEx di Proy. P&L yang (i) membingungkan karena IS pakai convention satu Total OpEx tunggal, (ii) tidak mencerminkan diversity category OpEx user sesungguhnya (yang di-kelola dinamis di IS catalog).
- Tidak menunjukkan driver proyeksi apa yang dipakai — pengguna harus menebak dari Key Drivers.

User meminta:
1. Proy. P&L hanya punya satu baris Total OpEx, di-drive dari Revenue × average common size dari IS!Total OpEx (excl. Depreciation).
2. Driver proyeksi COGS / Interest Income / Interest Expense / Non-Op Income juga di-ubah ke Revenue × avgCommonSize pattern (konsisten dengan Total OpEx). Revenue tetap avgYoY growth.
3. Tampilkan baris info "growth" di bawah tiap akun leaf di Proy. P&L yang EKSPLISIT menunjukkan nilai driver proyeksi — transparency.

---

## 2. Scope

### In scope
- Refactor `computeProyLrLive` signature + logic.
- Update Proy. P&L page ROW_DEFS: hapus Selling/G&A, tambah 6 display sub-rows.
- Update 3 caller: `projection-pipeline.ts` + `projection/income-statement/page.tsx` + `projection/noplat/page.tsx`.
- Update export `ProyLrBuilder.managedRows` + clear template rows 15+16 cells.
- Add 6 i18n keys for common-size sub-row labels.
- Rewrite `compute-proy-lr-live.test.ts` fixtures to new compute expectations.
- Phase C whitelist maintenance — identify + document divergent cells.

### Out of scope
- Removing `cogsRatio` / `sellingExpenseRatio` / `gaExpenseRatio` from Key Drivers store (Q2=B: retain).
- Changing Key Drivers UI input fields (kept, dead data documented).
- Migrating store schema (v20 unchanged).
- Excel template structural change (rows 15/16 cells overwritten with 0; formula at row 17 overridden by explicit write).

---

## 3. Compute Contract

### New `ProyLrInput` shape

```ts
export interface ProyLrInput {
  keyDrivers: KeyDriversState  // only taxRate consumed
  revenueGrowth: number
  /**
   * Average common size (as decimal, e.g. -0.12 for 12% of Revenue) for each
   * leaf IS row whose projection is driven by Revenue × avg common size.
   * Sign preserved: expenses stored negative → common size negative → projected
   * expense negative (LESSON-055 convention).
   */
  commonSize: {
    cogs: number          // avg (IS.7 / IS.6)
    totalOpEx: number     // avg (IS.15 / IS.6)
    interestIncome: number // avg (IS.26 / IS.6)
    interestExpense: number // avg (IS.27 / IS.6)
    nonOpIncome: number   // avg (IS.30 / IS.6)
  }
  isLastYear: {
    revenue: number
    cogs: number
    grossProfit: number
    totalOpEx: number      // IS.15[histYear] (was: sellingOpex + gaOpex split)
    depreciation: number   // FA-negated
    interestIncome: number
    interestExpense: number
    nonOpIncome: number
    tax: number
  }
  proyFaDepreciation: YearKeyedSeries
}
```

### Projection formulas

```
Revenue[t]        = Revenue[t-1] × (1 + revenueGrowth)
COGS[t]           = Revenue[t] × commonSize.cogs          // no ROUNDUP
Gross Profit[t]   = Revenue[t] + COGS[t]
Total OpEx[t]     = Revenue[t] × commonSize.totalOpEx
EBITDA[t]         = Gross Profit[t] + Total OpEx[t]
Depreciation[t]   = -proyFaDepreciation[t]
EBIT[t]           = EBITDA[t] + Depreciation[t]
Interest Inc[t]   = Revenue[t] × commonSize.interestIncome
Interest Exp[t]   = Revenue[t] × commonSize.interestExpense
Other Income[t]   = Interest Inc[t] + Interest Exp[t]
Non-Op Income[t]  = Revenue[t] × commonSize.nonOpIncome
PBT[t]            = EBIT[t] + Other Income[t] + Non-Op Income[t]
Tax[t]            = -taxRate × PBT[t]
Net Profit[t]     = PBT[t] + Tax[t]
```

### Historical column (year = histYear)

```
row 8 Revenue       = isLastYear.revenue
row 10 COGS         = isLastYear.cogs
row 11 Gross Profit = isLastYear.grossProfit
row 17 Total OpEx   = isLastYear.totalOpEx        // NEW: sebelumnya 0
row 19 EBITDA       = grossProfit + totalOpEx
row 22 Depreciation = isLastYear.depreciation
row 25 EBIT         = ebitda + depreciation
row 29 Int Income   = isLastYear.interestIncome
row 31 Int Expense  = isLastYear.interestExpense
row 33 Other Income = interestIncome + interestExpense
row 34 Non-Op Inc   = isLastYear.nonOpIncome
row 36 PBT          = ebit + otherIncome + nonOpInc
row 37 Tax          = isLastYear.tax
row 39 Net Profit   = pbt + tax

Margin/growth rows (display helpers):
row 9 Revenue Growth = revenueGrowth (at histYear column only, as info)
row 12 GP Margin     = grossProfit / revenue
row 20 EBITDA Margin = ebitda / revenue
row 26 EBIT Margin   = ebit / revenue
row 40 Net Margin    = netProfit / revenue
```

Rows 15, 16 are NEVER written (dropped from output).

---

## 4. Display Contract (ROW_DEFS)

```ts
// Numeric row → looked up in rows[r][year]
// String id rows → looked up in commonSizeDisplay / growthDisplay
type RowDef =
  | { kind: 'idr' | 'percent', row: number, labelKey: TK, bold?: bool, indent?: bool }
  | { kind: 'sub-growth', id: string, labelKey: TK }   // Revenue YoY growth row
  | { kind: 'sub-common-size', id: string, labelKey: TK, driverKey: keyof CommonSize }

ORDER (top→bottom):
  8 Revenue (idr, bold)
    → sub-growth 'revenue-growth'
  10 COGS (idr)
    → sub-common-size 'cogs-cs'
  11 Gross Profit (idr, bold)
  12 GP Margin (percent, indent)
  17 Total OpEx (idr)
    → sub-common-size 'total-opex-cs'
  19 EBITDA (idr, bold)
  20 EBITDA Margin (percent, indent)
  22 Depreciation (idr)
  25 EBIT (idr, bold)
  26 EBIT Margin (percent, indent)
  29 Interest Income (idr)
    → sub-common-size 'ii-cs'
  31 Interest Expense (idr)
    → sub-common-size 'ie-cs'
  33 Other Income (idr)
  34 Non-Op Income (idr)
    → sub-common-size 'noi-cs'
  36 PBT (idr, bold)
  37 Tax (idr)
  39 Net Profit (idr, bold)
  40 Net Margin (percent, indent)
```

Display rendering rule for sub-rows:
- Style: italic, muted, indent (same as Margin rows).
- Historical column (year 0): render "—".
- Projection columns (year > 0): render the driver value as percent (e.g. `-12.1%` for common size cogs).
- 'sub-growth' uses `revenueGrowth` prop; 'sub-common-size' uses `commonSize[driverKey]`.

---

## 5. i18n New Keys (~6)

```
'proy.revenueGrowth':         EN: 'Revenue Growth',             ID: 'Pertumbuhan Pendapatan'
'proy.cogsCommonSize':        EN: 'COGS (% of Revenue)',        ID: 'HPP (% Pendapatan)'
'proy.totalOpExCommonSize':   EN: 'Total OpEx (% of Revenue)',  ID: 'Total Beban Operasi (% Pendapatan)'
'proy.interestIncomeCommonSize': EN: 'Interest Income (% of Revenue)', ID: 'Pendapatan Bunga (% Pendapatan)'
'proy.interestExpenseCommonSize': EN: 'Interest Expense (% of Revenue)', ID: 'Beban Bunga (% Pendapatan)'
'proy.nonOpIncomeCommonSize': EN: 'Non-Op Income (% of Revenue)', ID: 'Pendapatan Non-Operasi (% Pendapatan)'
```

---

## 6. Export Contract

```ts
ProyLrBuilder.managedRows = [
  8, 9, 10, 11, 12, 17, 19, 20, 22, 25, 26,
  29, 31, 33, 34, 36, 37, 39, 40,
]
// Rows 15, 16 DROPPED.
```

Pre-write clear step: for `col in [C, D, E, F]`, set `ws.getCell(`${col}15`).value = 0` and `${col}16` = 0. Prevents template residue.

Template formula at `row 17` (if any, e.g. `=SUM(C15:C16)`) → overridden by builder explicit write of projected common-size value. Clean.

---

## 7. Phase C Impact

Expected divergent cells vs prototipe fixture:
- PROY_LR!C15, C16, D15, D16, E15, E16, F15, F16 → now 0 (was Selling/G&A values).
- PROY_LR!C17 → now populated (was blank).
- PROY_LR!D10, E10, F10 → new common-size-driven values (was cogsRatio × Revenue + ROUNDUP).
- PROY_LR!D17, E17, F17 → new common-size-driven values (was Selling + G&A sum).
- PROY_LR!D29, E29, F29 → new common-size-driven (was prev × (1+growth)).
- PROY_LR!D31, E31, F31 → new common-size-driven.
- PROY_LR!D34, E34, F34 → new common-size-driven.
- Downstream: PROY_NOPLAT / PROY_CFS rows that depend on Proy LR will drift — expected.

Mitigation: add entries to `phase-c-verification.test.ts` KNOWN_DIVERGENT_CELLS for these. No cross-sheet live formulas reference these cells (grep-verified in Phase C process per LESSON-112).

---

## 8. Out of Scope / Deferred

- Key Drivers UI/form cleanup (cogsRatio/sellingRatio/gaRatio kept as dead fields).
- Store migration v20→v21 (none needed).
- Excel template restructuring.
- Tax rate driver change (keeps Key Drivers `corporateTaxRate`).
- Growth row in HISTORICAL column (per Q4: projection years only).

---

## 9. Risk Mitigation

1. **Phase C whitelist drift** — guarded by LESSON-112 grep audit; computed + test.
2. **Downstream NOPLAT/CFS changes** — they consume row 17 (Total OpEx) and row 22 (Dep). Row 17 semantics unchanged (still negative, represents same concept). Row 22 unchanged. So no compute-logic change downstream.
3. **Existing user data** — Key Drivers store retained → no migration required; existing localStorage backward-compatible.
4. **Test fixture rewrite** — current fixture uses ROUNDUP(3) PRECISION=3. New compute is exact, use PRECISION=6.
