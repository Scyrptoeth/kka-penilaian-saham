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
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
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
 * Sheets with direct input slices (balance-sheet, income-statement,
 * fixed-asset) get their live rows from the Zustand store automatically.
 * Downstream sheets (cash-flow, noplat, fcf, financial-ratio, etc.) have
 * no dedicated slice — their page wrappers compute live rows themselves
 * from upstream slices and hand them back via the optional `liveRows`
 * prop. Passing `liveRows` as a fresh object flips the page into live
 * mode; passing `null` signals "upstream data missing, stay in seed";
 * leaving it `undefined` falls back to the slug-based store lookup.
 */

interface SheetPageProps {
  manifest: SheetManifest
  /**
   * Downstream override. When defined, this takes precedence over the
   * store-slug lookup — the page's own wrapper has already computed the
   * live rows from upstream slices and just hands us the result. `null`
   * is a first-class "upstream not ready" signal that pins us to seed
   * mode without bypassing the hydration gate.
   */
  liveRows?: Record<number, YearKeyedSeries> | null
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
  liveRows: liveRowsOverride,
  showCommonSize,
  showGrowth,
}: SheetPageProps) {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(() => {
    // Explicit override from a downstream page wrapper wins over the
    // slug-based store lookup, including the `null` case which means
    // "upstream data not ready — stay in seed mode".
    if (liveRowsOverride !== undefined) return liveRowsOverride
    return getLiveRowsForSlug(manifest.slug, {
      balanceSheet,
      incomeStatement,
      fixedAsset,
    })
  }, [
    liveRowsOverride,
    manifest.slug,
    balanceSheet,
    incomeStatement,
    fixedAsset,
  ])

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
    // Materialize subtotal/total rows into the synthesized CellMap so the
    // downstream pipeline (readValues + applyDerivations common-size) sees
    // the same shape it would in seed mode. Manifest rows without a
    // `computedFrom` declaration (currently IS, FA) contribute nothing to
    // the derived map — no-op until their manifests get the same treatment.
    const derived = deriveComputedRows(
      manifest.rows,
      liveRows,
      effectiveManifest.years,
    )
    const fullRows = { ...liveRows, ...derived }
    return buildLiveCellMap(
      effectiveManifest.columns,
      fullRows,
      effectiveManifest.years,
    )
  }, [
    isLive,
    liveRows,
    manifest.slug,
    manifest.rows,
    effectiveManifest.columns,
    effectiveManifest.years,
  ])

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
