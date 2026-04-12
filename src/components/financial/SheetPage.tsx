'use client'

import { useMemo } from 'react'
import { loadCells } from '@/data/seed/loader'
import { buildRowsFromManifest } from '@/data/manifests/build'
import type { SheetManifest } from '@/data/manifests/types'
import { useKkaStore } from '@/lib/store/useKkaStore'
import {
  buildLiveCellMap,
  generateLiveColumns,
} from '@/data/live/build-cell-map'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type {
  BalanceSheetInputState,
  IncomeStatementInputState,
  FixedAssetInputState,
} from '@/data/live/types'
import type { YearKeyedSeries } from '@/types/financial'
import { FinancialTable } from './FinancialTable'
import { DataSourceHeader } from './DataSourceHeader'

/**
 * <SheetPage> — universal renderer for any sheet manifest.
 *
 * Mode is auto-detected from domain state (LESSON-031):
 *
 *   home === null                              → seed mode
 *   home !== null AND liveData !== null        → live mode
 *   home !== null AND no live data for sheet   → seed mode (downstream
 *                                                 sheets the user hasn't
 *                                                 reached input for yet)
 *
 * Live mode synthesizes a CellMap from the store via {@link buildLiveCellMap},
 * then hands a manifest override (years + synthetic columns) to the same
 * {@link buildRowsFromManifest} pipeline the seed mode uses. Zero changes
 * to build.ts or applyDerivations — see LESSON-030.
 *
 * Session 010 wires the pilot sheets that have their own input pages
 * (balance-sheet, income-statement, fixed-asset). Downstream sheets
 * (cash-flow-statement, noplat, fcf, etc.) still render seed data until
 * Sessions 011–012 wire their compute adapters.
 */

interface SheetPageProps {
  manifest: SheetManifest
  /** Override: force common-size column group on/off. */
  showCommonSize?: boolean
  /** Override: force growth column group on/off. */
  showGrowth?: boolean
}

interface LiveInputSlices {
  balanceSheet: BalanceSheetInputState | null
  incomeStatement: IncomeStatementInputState | null
  fixedAsset: FixedAssetInputState | null
}

function getLiveRowsForSlug(
  slug: SheetManifest['slug'],
  slices: LiveInputSlices,
): Record<number, YearKeyedSeries> | null {
  switch (slug) {
    case 'balance-sheet':
      return slices.balanceSheet?.rows ?? null
    case 'income-statement':
      return slices.incomeStatement?.rows ?? null
    case 'fixed-asset':
      return slices.fixedAsset?.rows ?? null
    // Downstream sheets get live support in Sessions 011–012 once their
    // compute adapters land. Return null to fall back to seed mode.
    default:
      return null
  }
}

export function SheetPage({
  manifest,
  showCommonSize,
  showGrowth,
}: SheetPageProps) {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(
    () =>
      getLiveRowsForSlug(manifest.slug, {
        balanceSheet,
        incomeStatement,
        fixedAsset,
      }),
    [manifest.slug, balanceSheet, incomeStatement, fixedAsset],
  )

  // Mode: only flip to live once Zustand has rehydrated from localStorage.
  // Before hydration we render seed mode so SSR output matches the initial
  // client paint and React has nothing to reconcile.
  const isLive = hasHydrated && home !== null && liveRows !== null

  const liveYears = useMemo(() => {
    if (!isLive || !home) return manifest.years
    return computeHistoricalYears(
      home.tahunTransaksi,
      manifest.historicalYearCount ?? 4,
    )
  }, [isLive, home, manifest.years, manifest.historicalYearCount])

  // Live mode uses a manifest override with synthetic columns matching the
  // live CellMap addresses. Clearing commonSizeColumns/growthColumns keeps
  // column-group visibility driven by actual derivation output instead of
  // dangling Excel-formula pointers that can't resolve against user data.
  const effectiveManifest = useMemo<SheetManifest>(() => {
    if (!isLive) return manifest
    return {
      ...manifest,
      years: liveYears,
      columns: generateLiveColumns(liveYears),
      commonSizeColumns: undefined,
      growthColumns: undefined,
    }
  }, [isLive, manifest, liveYears])

  const cells = useMemo(() => {
    if (!isLive || !liveRows) return loadCells(manifest.slug)
    return buildLiveCellMap(
      effectiveManifest.columns,
      liveRows,
      effectiveManifest.years,
    )
  }, [isLive, liveRows, manifest.slug, effectiveManifest.columns, effectiveManifest.years])

  const rows = useMemo(
    () => buildRowsFromManifest(effectiveManifest, cells),
    [effectiveManifest, cells],
  )

  const autoShowCommonSize =
    effectiveManifest.commonSizeColumns !== undefined ||
    rows.some((r) => r.commonSize !== undefined)
  const autoShowGrowth =
    effectiveManifest.growthColumns !== undefined ||
    rows.some((r) => r.growth !== undefined)

  return (
    <div className="mx-auto max-w-[1400px]">
      <DataSourceHeader mode={isLive ? 'live' : 'seed'} />
      <FinancialTable
        title={effectiveManifest.title}
        years={effectiveManifest.years}
        rows={rows}
        showCommonSize={showCommonSize ?? autoShowCommonSize}
        showGrowth={showGrowth ?? autoShowGrowth}
        disclaimer={isLive ? undefined : effectiveManifest.disclaimer}
      />
    </div>
  )
}
