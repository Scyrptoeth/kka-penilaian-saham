/**
 * Financial Ratio manifest.
 *
 * Unlike the Historis sheets, the Financial Ratio worksheet stores
 * already-computed ratios in cells D..F for 2019/2020/2021. No growth or
 * common-size columns are needed — each section (Profitability,
 * Liquidity, Leverage, Cash Flow Indicator) renders its ratios with
 * per-row formatting:
 *
 *   - Profitability / Leverage / Cash Flow → 'percent'
 *   - Liquidity → 'ratio' (dimensionless multiples like Current Ratio 2,78)
 *
 * Formula descriptions are authored to match the exact Excel formulas
 * cited in fixture cell formulas (auto-pulled into the tooltip).
 *
 * SEED-MODE CONVENTION — IMPORTANT:
 * In Session 2B P1 (seed demo mode) this page renders values directly
 * from the fixture cells, which already hold the ratios pre-computed by
 * the workbook. This is intentional: the seed data IS the Excel source
 * of truth, so no recomputation is needed.
 *
 * When Phase 3+ introduces user input (Zustand-backed editable raw data),
 * this manifest will need a `derive` callback that:
 *   1. Extracts 18 input series from BS + IS + CFS + FCF raw data
 *   2. Calls `toRatiosInput` adapter (not yet created — see src/lib/adapters/)
 *   3. Calls `validatedFinancialRatios` from src/lib/validation/
 *   4. Returns the 18 computed ratios as values (not commonSize/growth)
 *
 * The FinancialRow shape does not currently carry pre-computed values
 * through `derive` — that signature returns { commonSize, growth } only.
 * Phase 3+ will likely extend `derive` to also produce `values` maps, or
 * route FR through a sibling mechanism. Flagged here so the Phase 3 author
 * does not silently miss the hardened pipeline.
 */

import type { SheetManifest } from './types'

export const FINANCIAL_RATIO_MANIFEST: SheetManifest = {
  title: 'Financial Ratios',
  slug: 'financial-ratio',
  years: [2019, 2020, 2021],
  columns: { 2019: 'D', 2020: 'E', 2021: 'F' },
  disclaimer:
    'Data demo dari workbook prototipe. Semua ratio sudah dihitung di workbook contoh dan dirender as-is. Phase 3 akan menggantinya dengan input pengguna.',
  rows: [
    { label: 'PROFITABILITY INDICATOR', type: 'header' },
    {
      excelRow: 6,
      label: 'Gross Profit Margin',
      valueKind: 'percent',
      formula: { values: 'Gross Profit / Revenue' },
    },
    {
      excelRow: 7,
      label: 'EBITDA Margin',
      valueKind: 'percent',
      formula: { values: 'EBITDA / Revenue' },
    },
    {
      excelRow: 8,
      label: 'EBIT Margin',
      valueKind: 'percent',
      formula: { values: 'EBIT / Revenue' },
    },
    {
      excelRow: 9,
      label: 'Net Profit Margin',
      valueKind: 'percent',
      formula: { values: 'Net Profit / Revenue' },
    },
    {
      excelRow: 10,
      label: 'Return On Assets (ROA)',
      valueKind: 'percent',
      formula: { values: 'Net Profit / Total Assets' },
    },
    {
      excelRow: 11,
      label: "Return On Equity (ROE)",
      valueKind: 'percent',
      formula: { values: "Net Profit / Shareholders' Equity" },
    },

    { label: '', type: 'separator' },
    { label: 'LIQUIDITY MEASUREMENT', type: 'header' },
    {
      excelRow: 14,
      label: 'Current Ratio',
      valueKind: 'ratio',
      formula: { values: 'Total Current Assets / Total Current Liabilities' },
    },
    {
      excelRow: 15,
      label: 'Quick Ratio',
      valueKind: 'ratio',
      formula: {
        values: '(Cash + Bank + Receivables) / Total Current Liabilities',
      },
    },
    {
      excelRow: 16,
      label: 'Cash Ratio',
      valueKind: 'ratio',
      formula: { values: '(Cash + Bank) / Total Current Liabilities' },
    },

    { label: '', type: 'separator' },
    { label: 'LEVERAGE', type: 'header' },
    {
      excelRow: 19,
      label: 'Debt to Assets Ratio',
      valueKind: 'percent',
      formula: {
        values: '(Current Liab + Non-Current Liab) / Total Assets',
      },
    },
    {
      excelRow: 20,
      label: 'Debt to Equity Ratio',
      valueKind: 'percent',
      formula: {
        values: "(Current Liab + Non-Current Liab) / Shareholders' Equity",
      },
    },
    {
      excelRow: 21,
      label: 'Capitalization Ratio',
      valueKind: 'percent',
      formula: {
        values: 'Long-Term Debt / (Long-Term Debt + Equity)',
      },
    },
    {
      excelRow: 22,
      label: 'Interest Coverage',
      valueKind: 'ratio',
      formula: {
        values: 'ABS(EBIT / Interest Expense), IFERROR → 0',
      },
    },
    {
      excelRow: 23,
      label: 'Equity to Total Assets',
      valueKind: 'percent',
      formula: { values: "Shareholders' Equity / Total Assets" },
    },

    { label: '', type: 'separator' },
    { label: 'CASH FLOW INDICATOR', type: 'header' },
    {
      excelRow: 26,
      label: 'Operating Cash Flow / Sales',
      valueKind: 'percent',
      formula: { values: 'CFO / Revenue' },
    },
    {
      excelRow: 27,
      label: 'FCF / Operating Cash Flow',
      valueKind: 'ratio',
      formula: { values: 'Free Cash Flow / Operating Cash Flow' },
    },
    {
      excelRow: 28,
      label: 'Short Term Debt Coverage',
      valueKind: 'ratio',
      formula: {
        values: 'CFO / Short-Term Bank Loan, IFERROR → 0',
      },
    },
    {
      excelRow: 30,
      label: 'Capex Coverage',
      valueKind: 'ratio',
      formula: {
        values: 'ABS(CFO / Capex), IFERROR → 0',
      },
    },
  ],
}
