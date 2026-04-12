/**
 * Income Statement manifest.
 *
 * Column layout note — the workbook's H..J columns are labeled "COMMON
 * SIZE" in the header row but the actual formulas (=(D6-C6)/C6 etc.) are
 * YEAR-OVER-YEAR GROWTH, not margin. We trust the formulas, not the
 * header, and map H..J to the GROWTH column group. Common-size (line /
 * revenue) is then computed separately by the calc engine and exposed as
 * a DERIVED column group without a corresponding Excel address.
 *
 * Margin percentage rows (R9 Gross Margin, R19 EBITDA Margin, R23 EBIT
 * Margin, R36 NP Margin) are intentionally skipped — our derived
 * common-size column already shows these values inline.
 */

import type { SheetManifest } from './types'

const MARGIN_DESC = 'Line value ÷ Revenue — traditional margin %'
const GROWTH_DESC = 'YoY growth: (current − prior) / prior'

export const INCOME_STATEMENT_MANIFEST: SheetManifest = {
  title: 'Income Statement',
  slug: 'income-statement',
  historicalYearCount: 4,
  years: [2018, 2019, 2020, 2021],
  columns: { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' },
  // commonSizeColumns intentionally omitted — the derived common-size values
  // come from the calc engine and have no corresponding Excel cells.
  growthColumns: { 2019: 'H', 2020: 'I', 2021: 'J' },
  // Revenue row — denominator for margin / common-size derivation.
  anchorRow: 6,
  derivations: [
    // Margin = line / Revenue (uses anchorRow above).
    { type: 'marginVsAnchor' },
    // IFERROR-safe YoY growth — revenue may be zero for non-operating lines.
    { type: 'yoyGrowth', safe: true },
  ],
  disclaimer:
    'Data demo dari workbook prototipe. Kolom Common Size adalah margin (line / Revenue) hasil kalkulasi dari calc engine, bukan dari Excel. Phase 3 akan menggantinya dengan input pengguna.',
  rows: [
    { label: 'REVENUE & COST', type: 'header' },
    {
      excelRow: 6,
      label: 'Revenue',
      type: 'subtotal',
      formula: {
        commonSize: 'By definition 100% — the denominator',
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 7,
      label: 'Cost of Goods Sold',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 8,
      label: 'Gross Profit',
      type: 'subtotal',
      formula: {
        values: 'Revenue − COGS',
        commonSize: 'Gross Profit Margin = Gross Profit / Revenue',
        growth: GROWTH_DESC,
      },
    },

    { label: '', type: 'separator' },
    { label: 'OPERATING EXPENSES', type: 'header' },
    {
      excelRow: 12,
      label: 'Others',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 13,
      label: 'General & Administrative Overheads',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 15,
      label: 'Total Operating Expenses (ex-Depreciation)',
      type: 'subtotal',
      formula: {
        values: 'SUM of operating expense line items',
        commonSize: MARGIN_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 18,
      label: 'EBITDA',
      type: 'subtotal',
      formula: {
        values: 'Gross Profit − Operating Expenses',
        commonSize: 'EBITDA Margin = EBITDA / Revenue',
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 21,
      label: 'Depreciation',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 22,
      label: 'EBIT',
      type: 'subtotal',
      formula: {
        values: 'EBITDA − Depreciation',
        commonSize: 'EBIT Margin = EBIT / Revenue',
        growth: GROWTH_DESC,
      },
    },

    { label: '', type: 'separator' },
    { label: 'NON-OPERATING', type: 'header' },
    {
      excelRow: 26,
      label: 'Interest Income',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 27,
      label: 'Interest Expense',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 28,
      label: 'Other Incomes / (Charges)',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 30,
      label: 'Non-Operating Income (net)',
      type: 'subtotal',
      formula: {
        values: 'SUM of non-operating line items',
        commonSize: MARGIN_DESC,
        growth: GROWTH_DESC,
      },
    },

    { label: '', type: 'separator' },
    {
      excelRow: 32,
      label: 'Profit Before Tax',
      type: 'subtotal',
      formula: {
        values: 'EBIT + Non-Operating Income',
        commonSize: MARGIN_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 33,
      label: 'Corporate Tax',
      indent: 1,
      formula: { commonSize: MARGIN_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 35,
      label: 'NET PROFIT AFTER TAX',
      type: 'total',
      formula: {
        values: 'Profit Before Tax − Corporate Tax',
        commonSize: 'Net Profit Margin = Net Profit / Revenue',
        growth: GROWTH_DESC,
      },
    },
  ],
}
