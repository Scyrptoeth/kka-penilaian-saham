/**
 * Balance Sheet manifest — maps Excel rows of the BALANCE SHEET worksheet
 * to a rendered <FinancialTable>. English labels match the source workbook.
 *
 * Columns:
 *   values:     C(2018) D(2019) E(2020) F(2021)  — 4 historical years
 *   commonSize: H(2019) I(2020) J(2021)          — formulas =D8/D$27 etc.
 *   growth:     N(2019) O(2020) P(2021)          — formulas =IFERROR((D8-C8)/C8,0)
 *
 * NOTE: the workbook column H4 header says "2021" but the H8 formula is
 * =D8/D$27 which points to year D=2019 — we trust the formula, not the
 * header (see Session 1 lessons learned).
 */

import type { SheetManifest } from './types'

const COMMON_SIZE_DESC = 'Line value ÷ TOTAL ASSETS for the same year'
const GROWTH_DESC = 'YoY growth: (current − prior) / prior, IFERROR → 0'

export const BALANCE_SHEET_MANIFEST: SheetManifest = {
  title: 'Balance Sheet',
  slug: 'balance-sheet',
  historicalYearCount: 4,
  years: [2018, 2019, 2020, 2021],
  columns: { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' },
  commonSizeColumns: { 2019: 'H', 2020: 'I', 2021: 'J' },
  growthColumns: { 2019: 'N', 2020: 'O', 2021: 'P' },
  totalAssetsRow: 27,
  derivations: [
    // Common-size ratio against TOTAL ASSETS (row 27 — declared above).
    { type: 'commonSize' },
    // IFERROR-safe YoY growth per Excel convention for BS.
    { type: 'yoyGrowth', safe: true },
  ],
  disclaimer:
    'Data demo dari workbook prototipe (kka-penilaian-saham.xlsx). Phase 3 akan menggantinya dengan input pengguna — nama perusahaan ditampilkan dari HOME store.',
  rows: [
    // ====================== ASSETS ======================
    { label: 'ASSETS', type: 'header' },
    {
      excelRow: 8,
      label: 'Cash on Hands',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 9,
      label: 'Cash on Bank (Deposit)',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 10,
      label: 'Account Receivable',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 11,
      label: 'Deposito',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 12,
      label: 'Inventory',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 13,
      label: 'Pembayaran Dimuka',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 14,
      label: 'Others — PPn/PPh',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 16,
      label: 'Total Current Assets',
      type: 'subtotal',
      computedFrom: [8, 9, 10, 11, 12, 13, 14],
      formula: {
        values: 'SUM of Current Asset line items',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    { label: '', type: 'separator' },
    {
      excelRow: 20,
      label: 'Fixed Assets — Beginning',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 21,
      label: 'Accumulated Depreciation',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 22,
      label: 'Fixed Assets, Net',
      type: 'subtotal',
      computedFrom: [20, 21],
      formula: {
        values: 'Beginning − Accumulated Depreciation',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 24,
      label: 'Intangible Assets',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 25,
      label: 'Total Non-Current Assets',
      type: 'subtotal',
      computedFrom: [22, 24],
      formula: {
        values: 'Fixed Assets Net + Intangibles',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 27,
      label: 'TOTAL ASSETS',
      type: 'total',
      computedFrom: [16, 25],
      formula: {
        values: 'Total Current + Total Non-Current',
        commonSize: 'By definition 100% of itself',
        growth: GROWTH_DESC,
      },
    },

    { label: '', type: 'separator' },

    // ====================== LIABILITIES & EQUITY ======================
    { label: 'LIABILITIES & EQUITY', type: 'header' },
    {
      excelRow: 31,
      label: 'Bank Loan — Short Term',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 32,
      label: 'Account Payables',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 33,
      label: 'Tax Payable',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 34,
      label: 'Others — Short / Long Term Debt',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 35,
      label: 'Total Current Liabilities',
      type: 'subtotal',
      computedFrom: [31, 32, 33, 34],
      formula: {
        values: 'SUM of Current Liability line items',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    { label: '', type: 'separator' },
    {
      excelRow: 38,
      label: 'Bank Loan — Long Term',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 39,
      label: 'Related Party Payable & Employee Benefits',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 40,
      label: 'Total Non-Current Liabilities',
      type: 'subtotal',
      computedFrom: [38, 39],
      formula: {
        values: 'SUM of Non-Current Liability line items',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 41,
      label: 'TOTAL LIABILITIES',
      type: 'subtotal',
      computedFrom: [35, 40],
      formula: {
        values: 'Current Liabilities + Non-Current Liabilities',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    { label: '', type: 'separator' },
    {
      excelRow: 43,
      label: 'Paid Up Capital',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 44,
      label: 'Addition',
      indent: 1,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 46,
      label: 'Retained Earnings — Surplus',
      indent: 2,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 47,
      label: 'Retained Earnings — Current Profit',
      indent: 2,
      formula: { commonSize: COMMON_SIZE_DESC, growth: GROWTH_DESC },
    },
    {
      excelRow: 48,
      label: 'Retained Earnings, Ending Balance',
      indent: 1,
      type: 'subtotal',
      computedFrom: [46, 47],
      formula: {
        values: 'Surplus + Current Profit',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 49,
      label: "Shareholders' Equity",
      type: 'subtotal',
      computedFrom: [43, 44, 48],
      formula: {
        values: 'Paid Up + Addition + Retained Earnings',
        commonSize: COMMON_SIZE_DESC,
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 51,
      label: 'TOTAL LIABILITIES & EQUITY',
      type: 'total',
      computedFrom: [41, 49],
      formula: {
        values: 'Total Liabilities + Shareholders Equity',
        commonSize: 'Equal to TOTAL ASSETS (accounting identity)',
        growth: GROWTH_DESC,
      },
    },
  ],
}
