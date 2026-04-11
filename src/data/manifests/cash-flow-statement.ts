/**
 * Cash Flow Statement manifest — indirect-method worksheet.
 *
 * Columns:
 *   values: C(2019) D(2020) E(2021) — 3 historical years
 *
 * No derivations: cash-flow line items routinely cross zero, making both
 * YoY growth and common-size percentages numerically unstable and
 * semantically meaningless. The page renders raw values only. Subtotals
 * (CFO/CFI/CFF/Net) are visually distinct via row `type`.
 *
 * Column offset note (LESSON-013): CFS uses C/D/E for 2019-2021, whereas
 * Balance Sheet + Income Statement use D/E/F for the same years. The
 * difference is baked into `manifest.columns` so builder/test code never
 * hardcodes column letters.
 *
 * Label fidelity: workbook cells contain two minor typos ("New Lloan",
 * "Interenst Payment") — corrected in the rendered labels for clarity
 * while the Excel cell addresses still map to the original rows.
 */

import type { SheetManifest } from './types'

export const CASH_FLOW_STATEMENT_MANIFEST: SheetManifest = {
  title: 'Cash Flow Statement',
  slug: 'cash-flow-statement',
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  disclaimer:
    'Data demo dari workbook prototipe. Indirect method, konvensi akuntansi: arus kas masuk positif, keluar negatif. Phase 3 akan menggantinya dengan input pengguna.',
  rows: [
    // ====================== CASH FLOW FROM OPERATIONS ======================
    { label: 'CASH FLOW FROM OPERATIONS', type: 'header' },
    {
      excelRow: 5,
      label: 'EBITDA',
      formula: { values: "='INCOME STATEMENT'!D18 — pulled from IS row 18 (EBITDA)" },
    },
    {
      excelRow: 6,
      label: 'Corporate Tax',
      formula: { values: "='INCOME STATEMENT'!D33 — tax stored with natural sign (negative)" },
    },
    { label: 'Changes in Working Capital', type: 'header' },
    {
      excelRow: 8,
      label: 'Current Assets',
      indent: 1,
      formula: {
        values: "=(Σ BS current-asset rows × −1) — increase in CA consumes cash",
      },
    },
    {
      excelRow: 9,
      label: 'Current Liabilities',
      indent: 1,
      formula: {
        values: "=Σ BS current-liability rows — increase in CL releases cash",
      },
    },
    {
      excelRow: 10,
      label: 'Working Capital',
      type: 'subtotal',
      formula: { values: '=C8 + C9 — net change in working capital' },
    },
    {
      excelRow: 11,
      label: 'Cash Flow from Operations',
      type: 'subtotal',
      formula: { values: '=SUM(C5:C9) — EBITDA + Tax + Working Capital change' },
    },

    { label: '', type: 'separator' },

    // ====================== NON-OPERATING ======================
    {
      excelRow: 13,
      label: 'Cash Flow from Non Operations',
      formula: { values: "='INCOME STATEMENT'!D30 — Non-operating income (net)" },
    },

    { label: '', type: 'separator' },

    // ====================== INVESTMENT ======================
    {
      excelRow: 17,
      label: 'Cash Flow from Investment (Capital Expenditure)',
      formula: {
        values: "='FIXED ASSET'!C23 × −1 — capex stored as negative per pre-signed convention",
      },
    },

    { label: '', type: 'separator' },

    {
      excelRow: 19,
      label: 'Cash Flow before Financing',
      type: 'subtotal',
      formula: { values: '=C11 + C13 + C17' },
    },

    { label: '', type: 'separator' },

    // ====================== FINANCING ======================
    { label: 'FINANCING', type: 'header' },
    { excelRow: 22, label: 'Equity Injection', indent: 1 },
    {
      excelRow: 23,
      label: 'New Loan',
      indent: 1,
      formula: { values: "='ACC PAYABLES'!C10 + 'ACC PAYABLES'!C19" },
    },
    {
      excelRow: 24,
      label: 'Interest Payment',
      indent: 1,
      formula: { values: "='INCOME STATEMENT'!D27 — interest expense (stored negative)" },
    },
    {
      excelRow: 25,
      label: 'Interest Income',
      indent: 1,
      formula: { values: "='INCOME STATEMENT'!D26" },
    },
    {
      excelRow: 26,
      label: 'Principal Repayment',
      indent: 1,
      formula: { values: "='ACC PAYABLES'!C20" },
    },
    {
      excelRow: 28,
      label: 'Cash Flow from Financing',
      type: 'subtotal',
      formula: { values: '=SUM(C22:C26)' },
    },

    { label: '', type: 'separator' },

    {
      excelRow: 30,
      label: 'Net Cash Flow',
      type: 'total',
      formula: { values: '=C11 + C13 + C17 + C28' },
    },

    { label: '', type: 'separator' },

    // ====================== CASH BALANCES ======================
    {
      excelRow: 32,
      label: 'Cash — Beginning Balance',
      formula: { values: "='BALANCE SHEET'!C8 + 'BALANCE SHEET'!C9 — prior-year total cash" },
    },
    {
      excelRow: 33,
      label: 'Cash — Ending Balance',
      type: 'subtotal',
      formula: { values: "='BALANCE SHEET'!D8 + 'BALANCE SHEET'!D9 — current-year total cash" },
    },

    { label: '', type: 'separator' },

    {
      excelRow: 35,
      label: 'Cash Ending in Bank',
      indent: 1,
      formula: { values: "='BALANCE SHEET'!D9" },
    },
    {
      excelRow: 36,
      label: 'Cash Ending in Cash on Hand',
      indent: 1,
      formula: { values: "='BALANCE SHEET'!D8" },
    },
  ],
}
