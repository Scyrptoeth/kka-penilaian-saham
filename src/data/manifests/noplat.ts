/**
 * NOPLAT manifest — Net Operating Profit Less Adjusted Taxes.
 *
 * Two-block calculation:
 *   EBIT  = Profit Before Tax + Interest Exp − Interest Inc − Non-Op
 *   Taxes on EBIT = Tax Provision + Tax Shield − Tax on Interest Inc − Tax on Non-Op
 *   NOPLAT = EBIT − Taxes on EBIT
 *
 * Pre-signed convention (LESSON-011): workbook stores add-backs/less
 * items with a trailing `*-1` in the formula, so the rendered values
 * already carry the correct sign. The `toNoplatInput` adapter mirrors
 * this in the calc-engine pipeline; see src/lib/adapters/noplat-adapter.ts.
 *
 * Columns: C(2019) D(2020) E(2021).
 *
 * Derivations: yoyGrowth only — NOPLAT values are single-signed and
 * meaningful YoY. The workbook has NO pre-computed growth columns for
 * this sheet, so `growthColumns` is omitted and the tooltip shows
 * description only (the derived value has no corresponding Excel cell).
 *
 * Phase 3 roadmap: wire page through `toNoplatInput` + `validatedNoplat`
 * + `computeNoplat` once user-input forms replace the seed fixture.
 * Until then this page renders the workbook's own computed values via
 * the fixture directly — same seed-mode convention as FR + FCF.
 */

import type { SheetManifest } from './types'

const GROWTH_DESC = 'YoY growth: (current − prior) / prior, IFERROR → 0'

export const NOPLAT_MANIFEST: SheetManifest = {
  title: 'NOPLAT',
  slug: 'noplat',
  historicalYearCount: 3,
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  derivations: [{ type: 'yoyGrowth', safe: true }],
  showAverage: { growth: true },
  disclaimer:
    'Data demo dari workbook prototipe. NOPLAT menggunakan konvensi pre-signed: Interest Expense ditambahkan kembali (positif), Interest Income dikurangkan (negatif). Saat user mengisi data via Input Data, tampilan otomatis beralih ke mode live.',
  rows: [
    // ====================== EBIT CHAIN ======================
    { label: 'EBIT CALCULATION', type: 'header' },
    {
      excelRow: 7,
      label: 'Profit Before Tax',
      formula: {
        values: "='INCOME STATEMENT'!D32",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 8,
      label: 'Add: Interest Expenses',
      indent: 1,
      formula: {
        values: "='INCOME STATEMENT'!D27 × −1 — pre-signed add-back",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 9,
      label: 'Less: Interest Income',
      indent: 1,
      formula: {
        values: "='INCOME STATEMENT'!D26 × −1 — pre-signed less",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 10,
      label: 'Non Operating Income',
      indent: 1,
      formula: {
        values: "='INCOME STATEMENT'!D30 × −1 — pre-signed",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 11,
      label: 'EBIT',
      type: 'subtotal',
      computedFrom: [7, 8, 9, 10],
      formula: {
        values: '=SUM(C7:C10) — Earnings Before Interest & Tax',
        growth: GROWTH_DESC,
      },
    },

    { label: '', type: 'separator' },

    // ====================== TAXES ON EBIT ======================
    { label: 'TAXES ON EBIT', type: 'header' },
    {
      excelRow: 13,
      label: 'Tax Provision from Income Statement',
      formula: {
        values: "='INCOME STATEMENT'!D33 × −1",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 14,
      label: 'Add: Tax Shield on Interest Expenses',
      indent: 1,
      formula: {
        values: "='INCOME STATEMENT'!$B$33 × 'IS'!D27 × −1 — tax rate × interest exp",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 15,
      label: 'Less: Tax on Interest Income',
      indent: 1,
      formula: {
        values: "='INCOME STATEMENT'!$B$33 × 'IS'!D26 × −1",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 16,
      label: 'Tax on Non Operating Income',
      indent: 1,
      formula: {
        values: "='INCOME STATEMENT'!$B$33 × 'IS'!D30 × −1",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 17,
      label: 'Total Taxes on EBIT',
      type: 'subtotal',
      computedFrom: [13, 14, 15, 16],
      formula: { values: '=SUM(C13:C16)', growth: GROWTH_DESC },
    },

    { label: '', type: 'separator' },

    // ====================== NOPLAT ======================
    {
      excelRow: 19,
      label: 'NOPLAT',
      type: 'total',
      computedFrom: [11, -17],
      formula: {
        values: '=C11 − C17 — Net Operating Profit Less Adjusted Taxes',
        growth: GROWTH_DESC,
      },
    },
  ],
}
