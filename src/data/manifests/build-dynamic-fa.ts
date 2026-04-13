/**
 * Dynamic Fixed Asset manifest builder — generates a SheetManifest from
 * user-selected accounts with automatic row mirroring across 7 sub-blocks:
 *
 *   A. Acquisition Costs: Beginning, Additions, Ending (computed)
 *   B. Depreciation: Beginning, Additions, Ending (computed)
 *   Net Value (computed: Acq Ending − Dep Ending)
 *
 * Row mirroring uses multiplier offsets (FA_OFFSET) so every account's
 * excelRow appears in each sub-block at a deterministic offset. This
 * avoids collision even with dynamic user accounts.
 *
 * The add-button lives only under A. Acquisition Costs — Beginning.
 */

import type { ManifestRow, SheetManifest } from './types'
import type { FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { FA_OFFSET, FA_SUBTOTAL, getCatalogAccount } from '@/data/catalogs/fixed-asset-catalog'
import { getFaStrings } from '@/lib/i18n/fixed-asset'

/**
 * Build a dynamic FA manifest from selected accounts.
 */
export function buildDynamicFaManifest(
  accounts: readonly FaAccountEntry[],
  language: 'en' | 'id',
  yearCount: number,
  tahunTransaksi: number,
): SheetManifest {
  const t = getFaStrings(language)
  const years = Array.from({ length: yearCount }, (_, i) => tahunTransaksi - yearCount + i)

  // Build column map — FA uses C, D, E for 3 years by convention
  const colLetters = 'CDEFGHIJKLMNOP'
  const columns: Record<number, string> = {}
  for (let i = 0; i < years.length; i++) {
    columns[years[i]] = colLetters[i]
  }

  const rows = buildRows(accounts, t, language)

  return {
    title: t.pageTitle,
    slug: 'fixed-asset',
    years,
    columns,
    rows,
    historicalYearCount: yearCount,
  }
}

// ---------------------------------------------------------------------------
// Internal row builder
// ---------------------------------------------------------------------------

function getLabel(entry: FaAccountEntry, language: 'en' | 'id'): string {
  if (entry.customLabel) return entry.customLabel
  const cat = getCatalogAccount(entry.catalogId)
  if (!cat) return entry.catalogId
  return language === 'en' ? cat.labelEn : cat.labelId
}

function leafRows(
  accounts: readonly FaAccountEntry[],
  offset: number,
  language: 'en' | 'id',
): ManifestRow[] {
  return accounts.map((entry) => ({
    excelRow: entry.excelRow + offset,
    label: getLabel(entry, language),
    indent: 1 as const,
    type: 'normal' as const,
    catalogId: offset === FA_OFFSET.ACQ_BEGINNING ? entry.catalogId : undefined,
  }))
}

function computedLeafRows(
  accounts: readonly FaAccountEntry[],
  offset: number,
  language: 'en' | 'id',
  computedFromOffsets: readonly number[],
): ManifestRow[] {
  return accounts.map((entry) => ({
    excelRow: entry.excelRow + offset,
    label: getLabel(entry, language),
    indent: 1 as const,
    type: 'subtotal' as const,
    computedFrom: computedFromOffsets.map((o) => entry.excelRow + o),
  }))
}

/**
 * Net Value leaf rows: Acq Ending − Dep Ending per account.
 * Uses signed computedFrom: [+acqEnding, −depEnding].
 */
function netValueLeafRows(
  accounts: readonly FaAccountEntry[],
  language: 'en' | 'id',
): ManifestRow[] {
  return accounts.map((entry) => ({
    excelRow: entry.excelRow + FA_OFFSET.NET_VALUE,
    label: getLabel(entry, language),
    indent: 1 as const,
    type: 'subtotal' as const,
    computedFrom: [
      entry.excelRow + FA_OFFSET.ACQ_ENDING,
      -(entry.excelRow + FA_OFFSET.DEP_ENDING),
    ],
  }))
}

function buildRows(
  accounts: readonly FaAccountEntry[],
  t: ReturnType<typeof getFaStrings>,
  language: 'en' | 'id',
): ManifestRow[] {
  const baseRows = accounts.map((a) => a.excelRow)

  const acqBeginRows = baseRows.map((r) => r + FA_OFFSET.ACQ_BEGINNING)
  const acqAddRows = baseRows.map((r) => r + FA_OFFSET.ACQ_ADDITIONS)
  const depBeginRows = baseRows.map((r) => r + FA_OFFSET.DEP_BEGINNING)
  const depAddRows = baseRows.map((r) => r + FA_OFFSET.DEP_ADDITIONS)
  const netRows = baseRows.map((r) => r + FA_OFFSET.NET_VALUE)

  const rows: ManifestRow[] = []

  // ═══════════════════════════════════════════════════════════════════════
  // A. ACQUISITION COSTS
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.acquisitionCosts, type: 'header' })

  // A. Beginning
  rows.push({ label: t.beginning, type: 'header', indent: 0 })
  rows.push(...leafRows(accounts, FA_OFFSET.ACQ_BEGINNING, language))
  rows.push({
    label: t.addAccount,
    type: 'add-button',
    section: 'fixed_asset',
  })
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_ACQ_BEGINNING,
    label: t.totalBeginning,
    type: 'subtotal',
    computedFrom: acqBeginRows,
  })

  rows.push({ label: '', type: 'separator' })

  // A. Additions
  rows.push({ label: t.additions, type: 'header', indent: 0 })
  rows.push(...leafRows(accounts, FA_OFFSET.ACQ_ADDITIONS, language))
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS,
    label: t.totalAdditions,
    type: 'subtotal',
    computedFrom: acqAddRows,
  })

  rows.push({ label: '', type: 'separator' })

  // A. Ending (computed: Beginning + Additions per account)
  rows.push({ label: t.ending, type: 'header', indent: 0 })
  rows.push(...computedLeafRows(accounts, FA_OFFSET.ACQ_ENDING, language, [
    FA_OFFSET.ACQ_BEGINNING,
    FA_OFFSET.ACQ_ADDITIONS,
  ]))
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_ACQ_ENDING,
    label: t.totalEnding,
    type: 'subtotal',
    computedFrom: [FA_SUBTOTAL.TOTAL_ACQ_BEGINNING, FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS],
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // B. DEPRECIATION
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.depreciation, type: 'header' })

  // B. Beginning
  rows.push({ label: t.beginning, type: 'header', indent: 0 })
  rows.push(...leafRows(accounts, FA_OFFSET.DEP_BEGINNING, language))
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_DEP_BEGINNING,
    label: t.totalBeginning,
    type: 'subtotal',
    computedFrom: depBeginRows,
  })

  rows.push({ label: '', type: 'separator' })

  // B. Additions
  rows.push({ label: t.additions, type: 'header', indent: 0 })
  rows.push(...leafRows(accounts, FA_OFFSET.DEP_ADDITIONS, language))
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_DEP_ADDITIONS,
    label: t.totalAdditions,
    type: 'subtotal',
    computedFrom: depAddRows,
  })

  rows.push({ label: '', type: 'separator' })

  // B. Ending (computed: Dep Beginning + Dep Additions per account)
  rows.push({ label: t.ending, type: 'header', indent: 0 })
  rows.push(...computedLeafRows(accounts, FA_OFFSET.DEP_ENDING, language, [
    FA_OFFSET.DEP_BEGINNING,
    FA_OFFSET.DEP_ADDITIONS,
  ]))
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_DEP_ENDING,
    label: t.totalEnding,
    type: 'subtotal',
    computedFrom: [FA_SUBTOTAL.TOTAL_DEP_BEGINNING, FA_SUBTOTAL.TOTAL_DEP_ADDITIONS],
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // NET VALUE FIXED ASSETS (Acq Ending − Dep Ending per account)
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.netValueFixedAssets, type: 'header' })
  rows.push(...netValueLeafRows(accounts, language))
  rows.push({
    excelRow: FA_SUBTOTAL.TOTAL_NET_VALUE,
    label: t.totalNetFixedAssets,
    type: 'total',
    computedFrom: netRows,
  })

  return rows
}
