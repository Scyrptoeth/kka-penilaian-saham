/**
 * ROIC manifest — Return on Invested Capital schedule.
 *
 *   Total Invested Capital = Total Asset − Non-Op FA − Excess Cash − Marketable Sec
 *   ROIC = NOPLAT / Total Invested Capital (Beginning of Year)
 *
 * Columns: B(2019) C(2020) D(2021) — 3 historical years.
 *
 * Sheet ini **mixed**: rows 7-13 adalah stock values (IDR), row 15 adalah ratio
 * (percent). YoY growth pada line items tidak semantically meaningful (most
 * lines stay flat year-to-year by design), jadi **derivations dikosongkan**.
 *
 * Catatan row 15: ROIC hanya tersedia untuk tahun 2020 dan 2021 — tahun
 * baseline (2019) tidak memiliki "beginning of year invested capital" karena
 * data 2018 tidak tersedia di sheet ini. Sparse year handling sudah didukung
 * oleh `readValues` di build.ts (missing cells simply not set di output series).
 */

import type { SheetManifest } from './types'

export const ROIC_MANIFEST: SheetManifest = {
  title: 'ROIC — PT Raja Voltama Elektrik',
  slug: 'roic',
  years: [2019, 2020, 2021],
  columns: { 2019: 'B', 2020: 'C', 2021: 'D' },
  disclaimer:
    'Data demo workbook PT Raja Voltama Elektrik. ROIC = NOPLAT / Invested Capital (Beginning of Year). Tahun 2019 tidak memiliki ROIC karena tidak ada beginning capital baseline.',
  rows: [
    { label: 'INVESTED CAPITAL', type: 'header' },
    {
      excelRow: 7,
      label: 'NOPLAT',
      formula: { values: '=FCF!C20 — Net Operating Profit Less Adjusted Taxes' },
    },
    {
      excelRow: 8,
      label: 'Total Asset in Balance Sheet',
      formula: { values: "='BALANCE SHEET'!D27 — Total Assets" },
    },
    {
      excelRow: 9,
      label: 'Less Non Operating Fixed Assets',
      indent: 1,
      formula: { values: 'Idle/non-operating fixed assets — workbook default 0' },
    },
    {
      excelRow: 10,
      label: 'Less Excess Cash',
      indent: 1,
      formula: { values: "='BALANCE SHEET'!D8 × −1 — pre-signed excess cash" },
    },
    {
      excelRow: 11,
      label: 'Less Marketable Securities',
      indent: 1,
      formula: { values: 'Marketable securities — workbook default 0' },
    },
    {
      excelRow: 12,
      label: 'Total Invested Capital — End of Year',
      type: 'subtotal',
      formula: { values: '=SUM(B8:B11)' },
    },
    {
      excelRow: 13,
      label: 'Total Invested Capital — Beginning of Year',
      type: 'subtotal',
      formula: { values: '=prior year row 12 (only 2020 onwards)' },
    },

    { label: '', type: 'separator' },

    {
      excelRow: 15,
      label: 'ROIC = NOPLAT / Invested Capital (Beginning of Year)',
      type: 'total',
      valueKind: 'percent',
      formula: {
        values:
          '=row 7 / row 13 — only computed for 2020 and 2021; 2019 omitted (no prior year baseline)',
      },
    },
  ],
}
