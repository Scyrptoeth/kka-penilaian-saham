/**
 * Growth Revenue manifest — Penjualan & Laba Bersih with YoY growth.
 *
 * Unlike other sheets, this one covers **four** historical years
 * (2018-2021) and its value columns start from **column B** — the
 * 3-year schedules (CFS/FA/NOPLAT) start from C. Mapping is encoded
 * explicitly in `manifest.columns` so the builder never has to guess.
 *
 * The workbook also ships pre-computed growth columns at H/I/J for
 * 2019-2021. We attach those via `growthColumns` so the FormulaTooltip
 * can expose the raw Excel formula — but the numeric growth values
 * are still produced by the declarative `yoyGrowth` derivation, which
 * keeps the pipeline identical to BS/IS and verifies that the workbook
 * and the calc-engine primitive agree.
 *
 * The "Industri" comparison section in the workbook (rows 38-41) holds
 * placeholder zeros for user-editable industry benchmarks — we render
 * it for completeness so the page surface mirrors the Excel layout.
 */

import type { SheetManifest } from './types'

const GROWTH_DESC = 'YoY growth: (current − prior) / prior, IFERROR → 0'

export const GROWTH_REVENUE_MANIFEST: SheetManifest = {
  title: 'Growth Revenue',
  slug: 'growth-revenue',
  years: [2018, 2019, 2020, 2021],
  columns: { 2018: 'B', 2019: 'C', 2020: 'D', 2021: 'E' },
  growthColumns: { 2019: 'H', 2020: 'I', 2021: 'J' },
  derivations: [{ type: 'yoyGrowth', safe: true }],
  disclaimer:
    'Data demo dari workbook prototipe. Kolom growth 2019-2021 dihitung dari primitive yoyGrowth dan divalidasi cocok dengan formula Excel (H8-J9 = IF(prior=0,0,(current−prior)/prior)). Phase 3 akan menggantinya dengan input pengguna.',
  rows: [
    // ====================== PERUSAHAAN ======================
    { label: 'DATA PENJUALAN PT RAJA VOLTAMA ELEKTRIK', type: 'header' },
    {
      excelRow: 8,
      label: 'Penjualan',
      formula: {
        values: "='INCOME STATEMENT'!C6..F6 — Revenue 2018-2021",
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 9,
      label: 'Laba Bersih',
      formula: {
        values: "='INCOME STATEMENT'!C35..F35 — Net Profit 2018-2021",
        growth: GROWTH_DESC,
      },
    },

    { label: '', type: 'separator' },

    // ====================== INDUSTRI (placeholder) ======================
    { label: 'DATA PENJUALAN / PENDAPATAN INDUSTRI', type: 'header' },
    {
      excelRow: 40,
      label: 'Penjualan (Industri)',
      formula: {
        values: 'User-input benchmark — blank in demo workbook',
        growth: GROWTH_DESC,
      },
    },
    {
      excelRow: 41,
      label: 'Pendapatan Bersih (Industri)',
      formula: {
        values: 'User-input benchmark — blank in demo workbook',
        growth: GROWTH_DESC,
      },
    },
  ],
}
