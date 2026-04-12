/**
 * FCF manifest — 3 historical years (2019/2020/2021) of Free Cash Flow
 * schedule. Values are pre-signed in the workbook (see Session 2A lessons):
 * depreciation and capex arrive as negatives via `='FIXED ASSET'!*-1`,
 * which is why the FinancialTable will show them in parentheses.
 *
 * Note column-offset: the FCF sheet uses cols C/D/E for 2019/2020/2021 —
 * one column LEFT of the Balance Sheet / Income Statement layout (which
 * use D/E/F). This is handled transparently by the manifest's columns map.
 *
 * SEED-MODE CONVENTION — IMPORTANT:
 * In Session 2B P1 (seed demo mode) this page renders values directly
 * from the fixture cells — the workbook already contains the full FCF
 * schedule pre-computed. No recomputation is needed here.
 *
 * When Phase 3+ introduces user input, this manifest will need to route
 * through the existing hardened pipeline:
 *     raw data (store) → toFcfInput adapter → validatedFcf → render
 * The adapter (`src/lib/adapters/fcf-adapter.ts`) and validator
 * (`src/lib/validation/index.ts`) are already in place from Session 2A.5;
 * only the manifest's derive hook and the page's data source need
 * updating. Pre-signed convention (negative depreciation + capex) is
 * handled by the adapter.
 */

import type { SheetManifest } from './types'

export const FCF_MANIFEST: SheetManifest = {
  title: 'Free Cash Flow',
  slug: 'fcf',
  historicalYearCount: 3,
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  disclaimer:
    'Data demo dari workbook prototipe. Depreciation dan capex sudah pre-signed negatif (convention Excel source). Phase 3 akan menggantinya dengan input pengguna.',
  rows: [
    {
      excelRow: 7,
      label: 'NOPLAT',
      type: 'subtotal',
      formula: {
        values: "Pulled from NOPLAT!C19 (Net Operating Profit Less Adjusted Tax)",
      },
    },
    {
      excelRow: 8,
      label: 'Add: Depreciation',
      indent: 1,
      formula: {
        values: "='FIXED ASSET'!<col>51 × −1 (pre-signed negative addback)",
      },
    },
    {
      excelRow: 9,
      label: 'Gross Cash Flow',
      type: 'subtotal',
      computedFrom: [7, 8],
      formula: { values: 'NOPLAT + Depreciation addback' },
    },

    { label: '', type: 'separator' },
    { label: 'CHANGES IN WORKING CAPITAL', type: 'header' },
    {
      excelRow: 12,
      label: '(Increase) / Decrease in Current Assets',
      indent: 1,
      formula: {
        values: "Pulled from CASH FLOW STATEMENT!<col>8",
      },
    },
    {
      excelRow: 13,
      label: 'Increase / (Decrease) in Current Liabilities',
      indent: 1,
      formula: {
        values: "Pulled from CASH FLOW STATEMENT!<col>9",
      },
    },
    {
      excelRow: 14,
      label: 'Total Net Changes in Working Capital',
      type: 'subtotal',
      formula: {
        values: "Pulled from CASH FLOW STATEMENT!<col>10 (sum of lines 12 + 13)",
      },
    },

    { label: '', type: 'separator' },
    {
      excelRow: 16,
      label: 'Less: Capital Expenditures',
      indent: 1,
      formula: {
        values: "='FIXED ASSET'!<col>23 × −1 (pre-signed negative)",
      },
    },
    {
      excelRow: 18,
      label: 'Gross Investment',
      type: 'subtotal',
      computedFrom: [14, 16],
      formula: { values: 'Total Net WC Change + Capex' },
    },

    { label: '', type: 'separator' },
    {
      excelRow: 20,
      label: 'FREE CASH FLOW',
      type: 'total',
      computedFrom: [9, 18],
      formula: { values: 'Gross Cash Flow + Gross Investment' },
    },
  ],
}
