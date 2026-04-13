/**
 * Dynamic Balance Sheet manifest builder — generates a SheetManifest
 * from user-selected accounts, with dynamic computedFrom arrays.
 *
 * replaces the hardcoded BALANCE_SHEET_MANIFEST for live input mode.
 * deriveComputedRows() consumes the output unchanged (LESSON-033).
 */

import type { ManifestRow, SheetManifest } from './types'
import type { BsAccountEntry, BsSection } from '@/data/catalogs/balance-sheet-catalog'
import { getCatalogAccount } from '@/data/catalogs/balance-sheet-catalog'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { generateLiveColumns } from '@/data/live/build-cell-map'

/**
 * Build a complete BS manifest from user-selected accounts.
 * Structural rows (headers, subtotals, totals) are always present.
 * Leaf rows come from `accounts`. computedFrom arrays are built
 * dynamically based on which accounts belong to each section.
 */
export function buildDynamicBsManifest(
  accounts: readonly BsAccountEntry[],
  language: 'en' | 'id',
  yearCount: number,
  tahunTransaksi: number,
): SheetManifest {
  const years = computeHistoricalYears(tahunTransaksi, yearCount)

  // Group accounts by section
  const bySection = new Map<BsSection, number[]>()
  for (const acc of accounts) {
    const existing = bySection.get(acc.section) ?? []
    existing.push(acc.excelRow)
    bySection.set(acc.section, existing)
  }

  // Build rows with leaf accounts inserted into correct sections
  const rows = buildRows(accounts, bySection, language)

  return {
    title: 'Balance Sheet',
    slug: 'balance-sheet',
    historicalYearCount: yearCount,
    years,
    columns: generateLiveColumns(years),
    totalAssetsRow: 27,
    derivations: [
      { type: 'commonSize' },
      { type: 'yoyGrowth', safe: true },
    ],
    rows,
  }
}

function getLabel(acc: BsAccountEntry, language: 'en' | 'id'): string {
  if (acc.customLabel) return acc.customLabel
  const catalog = getCatalogAccount(acc.catalogId)
  if (!catalog) return acc.catalogId
  return language === 'en' ? catalog.labelEn : catalog.labelId
}

function leafRows(
  accounts: readonly BsAccountEntry[],
  section: BsSection,
  language: 'en' | 'id',
): ManifestRow[] {
  return accounts
    .filter((a) => a.section === section)
    .map((a) => ({
      excelRow: a.excelRow,
      label: getLabel(a, language),
      indent: 1 as const,
      type: 'normal' as const,
    }))
}

function buildRows(
  accounts: readonly BsAccountEntry[],
  bySection: Map<BsSection, number[]>,
  language: 'en' | 'id',
): ManifestRow[] {
  const currentAssetRows = bySection.get('current_assets') ?? []
  const fixedAssetRows = bySection.get('fixed_assets') ?? []
  const intangibleRows = bySection.get('intangible_assets') ?? []
  const otherNcRows = bySection.get('other_non_current_assets') ?? []
  const currentLiabRows = bySection.get('current_liabilities') ?? []
  const nonCurrentLiabRows = bySection.get('non_current_liabilities') ?? []

  // Equity: need specific accounts for Retained Earnings
  const equityAccounts = accounts.filter((a) => a.section === 'equity')
  const retainedEarningsRows = equityAccounts
    .filter((a) => a.catalogId === 'retained_earnings_beginning' || a.catalogId === 'net_income')
    .map((a) => a.excelRow)
  const paidCapitalRows = equityAccounts
    .filter((a) => a.catalogId === 'paid_in_capital' || a.catalogId === 'additional_paid_in')
    .map((a) => a.excelRow)
  // Custom equity accounts go into shareholders' equity directly
  const otherEquityRows = equityAccounts
    .filter((a) =>
      !['paid_in_capital', 'additional_paid_in', 'retained_earnings_beginning', 'net_income'].includes(a.catalogId),
    )
    .map((a) => a.excelRow)

  const rows: ManifestRow[] = [
    // === ASSETS ===
    { label: 'ASSETS', type: 'header' },

    { label: 'Current Assets', type: 'header', indent: 0 },
    ...leafRows(accounts, 'current_assets', language),
    { excelRow: 16, label: 'Total Current Assets', type: 'subtotal', computedFrom: currentAssetRows },

    { label: '', type: 'separator' },

    { label: 'Non-Current Assets', type: 'header', indent: 0 },
    { label: 'Fixed Assets', type: 'header', indent: 1 },
    ...leafRows(accounts, 'fixed_assets', language),
    { excelRow: 22, label: 'Fixed Assets, Net', type: 'subtotal', computedFrom: fixedAssetRows },
    ...leafRows(accounts, 'other_non_current_assets', language),
    ...leafRows(accounts, 'intangible_assets', language),
    {
      excelRow: 25,
      label: 'Total Non-Current Assets',
      type: 'subtotal',
      computedFrom: [22, ...otherNcRows, ...intangibleRows],
    },

    { label: '', type: 'separator' },
    { excelRow: 27, label: 'TOTAL ASSETS', type: 'total', computedFrom: [16, 25] },

    { label: '', type: 'separator' },

    // === LIABILITIES & EQUITY ===
    { label: 'LIABILITIES & EQUITY', type: 'header' },

    { label: 'Current Liabilities', type: 'header', indent: 0 },
    ...leafRows(accounts, 'current_liabilities', language),
    { excelRow: 35, label: 'Total Current Liabilities', type: 'subtotal', computedFrom: currentLiabRows },

    { label: '', type: 'separator' },

    { label: 'Non-Current Liabilities', type: 'header', indent: 0 },
    ...leafRows(accounts, 'non_current_liabilities', language),
    { excelRow: 40, label: 'Total Non-Current Liabilities', type: 'subtotal', computedFrom: nonCurrentLiabRows },

    { label: '', type: 'separator' },
    { excelRow: 41, label: 'TOTAL LIABILITIES', type: 'total', computedFrom: [35, 40] },

    { label: '', type: 'separator' },

    // Equity
    { label: "Shareholders' Equity", type: 'header', indent: 0 },
    ...leafRows(accounts, 'equity', language),
    ...(retainedEarningsRows.length > 0
      ? [{ excelRow: 48, label: 'Retained Earnings, Ending Balance', type: 'subtotal' as const, computedFrom: retainedEarningsRows }]
      : []),
    {
      excelRow: 49,
      label: "Shareholders' Equity",
      type: 'subtotal',
      computedFrom: [
        ...paidCapitalRows,
        ...(retainedEarningsRows.length > 0 ? [48] : []),
        ...otherEquityRows,
      ],
    },

    { label: '', type: 'separator' },
    { excelRow: 51, label: 'TOTAL LIABILITIES & EQUITY', type: 'total', computedFrom: [41, 49] },
  ]

  return rows
}
