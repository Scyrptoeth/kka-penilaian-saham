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
 * Helper: build the six per-category leaf rows for a sub-block.
 * These are user-editable input rows with no computedFrom.
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

/**
 * Ending = Beginning + Additions per category.
 * Each row is computed (read-only in input grid).
 * Formula: =+C{beginRow+i}+C{addRow+i}
 */
function endingCategoryRows(
  startRow: number,
  beginRow: number,
  addRow: number,
  labels: readonly string[],
): ManifestRow[] {
  return labels.map((label, i) => ({
    excelRow: startRow + i,
    label,
    indent: 1 as const,
    computedFrom: [beginRow + i, addRow + i] as readonly number[],
  }))
}

/**
 * Net Value = Ending Acquisition − Ending Depreciation per category.
 * Uses signed refs: positive for acq, negative for dep.
 * Formula: =+C{acqRow+i}-C{depRow+i}
 */
function netValueCategoryRows(
  startRow: number,
  acqRow: number,
  depRow: number,
  labels: readonly string[],
): ManifestRow[] {
  return labels.map((label, i) => ({
    excelRow: startRow + i,
    label,
    indent: 1 as const,
    computedFrom: [acqRow + i, -(depRow + i)] as readonly number[],
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
  title: 'Fixed Asset Schedule',
  slug: 'fixed-asset',
  historicalYearCount: 3,
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  disclaimer:
    'Data demo dari workbook prototipe. Roll-forward schedule: Acquisition + Depreciation + Net Book Value. Phase 3 akan menggantinya dengan input pengguna.',
  rows: [
    // ====================== A. ACQUISITION COSTS ======================
    { label: 'A. Acquisition Costs', type: 'header' },

    { label: 'Beginning', type: 'header' },
    ...categoryRows(8, ACQUISITION_LABELS),
    {
      excelRow: 14,
      label: 'Total Beginning',
      type: 'subtotal',
      computedFrom: [8, 9, 10, 11, 12, 13],
      formula: { values: '=SUM(C8:C13)' },
    },

    { label: '', type: 'separator' },

    { label: 'Additions', type: 'header' },
    ...categoryRows(17, ADDITIONS_LABELS),
    {
      excelRow: 23,
      label: 'Total Additions',
      type: 'subtotal',
      computedFrom: [17, 18, 19, 20, 21, 22],
      formula: { values: '=SUM(C17:C22) — also drives Capex line in FCF' },
    },

    { label: '', type: 'separator' },

    { label: 'Ending', type: 'header' },
    ...endingCategoryRows(26, 8, 17, ACQUISITION_LABELS),
    {
      excelRow: 32,
      label: 'Total Ending — Acquisition Cost',
      type: 'subtotal',
      computedFrom: [14, 23],
      formula: { values: '=+C14+C23 — Total Beginning + Total Additions' },
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
      computedFrom: [36, 37, 38, 39, 40, 41],
      formula: { values: '=SUM(C36:C41)' },
    },

    { label: '', type: 'separator' },

    { label: 'Additions', type: 'header' },
    ...categoryRows(45, ACQUISITION_LABELS),
    {
      excelRow: 51,
      label: 'Total Additions',
      type: 'subtotal',
      computedFrom: [45, 46, 47, 48, 49, 50],
      formula: { values: '=SUM(C45:C50) — feeds Depreciation add-back in FCF' },
    },

    { label: '', type: 'separator' },

    { label: 'Ending', type: 'header' },
    ...endingCategoryRows(54, 36, 45, ACQUISITION_LABELS),
    {
      excelRow: 60,
      label: 'Total Ending — Accumulated Depreciation',
      type: 'subtotal',
      computedFrom: [42, 51],
      formula: { values: '=+C42+C51 — Total Beginning + Total Additions' },
    },

    { label: '', type: 'separator' },

    // ====================== NET VALUE FIXED ASSETS ======================
    { label: 'Net Value Fixed Assets', type: 'header' },
    ...netValueCategoryRows(63, 26, 54, ACQUISITION_LABELS),
    {
      excelRow: 69,
      label: 'TOTAL NET FIXED ASSETS',
      type: 'total',
      computedFrom: [63, 64, 65, 66, 67, 68],
      formula: { values: '=SUM(C63:C68)' },
    },
  ],
}
