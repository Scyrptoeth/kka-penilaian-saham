/**
 * Fixed Asset Schedule manifest — three-section roll-forward:
 *
 *   A. Acquisition Costs  = Beginning + Additions → Ending
 *   B. Depreciation       = Beginning + Additions → Ending
 *   C. Net Value          = Ending (A) − Ending (B), per category
 *
 * Six asset categories at indent 1 under each sub-block, each sub-block
 * closed with a category-wide Total at indent 0 (subtotal style).
 *
 * Columns: C(2019) D(2020) E(2021) — same 3-year offset as CFS/NOPLAT/FCF.
 *
 * No derivations: this is a raw schedule, not a flow statement. Common
 * size and YoY growth would be noisy for asset cost lines (many are
 * static across years by design).
 */

import type { ManifestRow, SheetManifest } from './types'

/**
 * Helper: build the six per-category rows for a sub-block.
 * Produces ManifestRow[] with indent 1 and pre-assigned Excel rows.
 * The caller appends the Total row separately.
 */
function categoryRows(
  startRow: number,
  labels: readonly string[],
): ManifestRow[] {
  return labels.map((label, i) => ({
    excelRow: startRow + i,
    label,
    indent: 1 as const,
  }))
}

const ACQUISITION_LABELS = [
  'Land',
  'Building',
  'Equipment, Laboratory, & Machinery',
  'Vehicle & Heavy Equipment',
  'Office Inventory',
  'Electrical',
] as const

// Additions block uses slightly different labels in the workbook
// (e.g. "Building & CIP") — mirror them for fidelity.
const ADDITIONS_LABELS = [
  'Land',
  'Building & CIP',
  'Equipment, Laboratory, & Machinery',
  'Vehicle & Heavy Equipment',
  'Office Inventory',
  'Electrical',
] as const

export const FIXED_ASSET_MANIFEST: SheetManifest = {
  title: 'Fixed Asset Schedule — PT Raja Voltama Elektrik',
  slug: 'fixed-asset',
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  disclaimer:
    'Data demo workbook PT Raja Voltama Elektrik. Roll-forward schedule: Acquisition + Depreciation + Net Book Value.',
  rows: [
    // ====================== A. ACQUISITION COSTS ======================
    { label: 'A. Acquisition Costs', type: 'header' },

    { label: 'Beginning', type: 'header' },
    ...categoryRows(8, ACQUISITION_LABELS),
    {
      excelRow: 14,
      label: 'Total Beginning',
      type: 'subtotal',
      formula: { values: '=SUM(C8:C13)' },
    },

    { label: '', type: 'separator' },

    { label: 'Additions', type: 'header' },
    ...categoryRows(17, ADDITIONS_LABELS),
    {
      excelRow: 23,
      label: 'Total Additions',
      type: 'subtotal',
      formula: { values: '=SUM(C17:C22) — also drives Capex line in FCF' },
    },

    { label: '', type: 'separator' },

    { label: 'Ending', type: 'header' },
    ...categoryRows(26, ACQUISITION_LABELS),
    {
      excelRow: 32,
      label: 'Total Ending — Acquisition Cost',
      type: 'subtotal',
      formula: { values: '=SUM(C26:C31) — carries into next-year Beginning' },
    },

    { label: '', type: 'separator' },

    // ====================== B. DEPRECIATION ======================
    { label: 'B. Depreciation', type: 'header' },

    { label: 'Beginning', type: 'header' },
    ...categoryRows(36, ACQUISITION_LABELS),
    {
      excelRow: 42,
      label: 'Total Beginning',
      type: 'subtotal',
      formula: { values: '=SUM(C36:C41)' },
    },

    { label: '', type: 'separator' },

    { label: 'Additions', type: 'header' },
    ...categoryRows(45, ACQUISITION_LABELS),
    {
      excelRow: 51,
      label: 'Total Additions',
      type: 'subtotal',
      formula: { values: '=SUM(C45:C50) — feeds Depreciation add-back in FCF' },
    },

    { label: '', type: 'separator' },

    { label: 'Ending', type: 'header' },
    ...categoryRows(54, ACQUISITION_LABELS),
    {
      excelRow: 60,
      label: 'Total Ending — Accumulated Depreciation',
      type: 'subtotal',
      formula: { values: '=SUM(C54:C59)' },
    },

    { label: '', type: 'separator' },

    // ====================== NET VALUE FIXED ASSETS ======================
    { label: 'Net Value Fixed Assets', type: 'header' },
    ...ACQUISITION_LABELS.map<ManifestRow>((label, i) => ({
      excelRow: 63 + i,
      label,
      indent: 1,
      formula: {
        values: `=C${26 + i} − C${54 + i} — Ending Cost − Accumulated Depreciation`,
      },
    })),
    {
      excelRow: 69,
      label: 'TOTAL NET FIXED ASSETS',
      type: 'total',
      formula: { values: '=SUM(C63:C68)' },
    },
  ],
}
