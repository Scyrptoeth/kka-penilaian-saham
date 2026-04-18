'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { computeProyFixedAssetsLive, type ProyFaInput } from '@/data/live/compute-proy-fixed-assets-live'
import { FA_OFFSET, FA_SUBTOTAL, getCatalogAccount, type FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { computeAvgGrowth, yoyChangeSafe } from '@/lib/calculations/helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * Session 036 — PROY FIXED ASSET (per-account Net Value growth).
 *
 * Every account from `fixedAsset.accounts` renders across 7 bands
 * (Acq Begin/Add/End, Dep Begin/Add/End, Net Value) read-only.
 *
 * Display semantics:
 *   - Historical year: all 7 bands show values.
 *   - Projection years: only NET VALUE band shows values (projected
 *     via per-account avg YoY growth of NET VALUE). Acq/Dep bands
 *     show "—" for projection years (but are computed internally
 *     for PROY LR / NOPLAT / CFS cascade).
 *   - Below each NET VALUE row, a Growth row shows per-account
 *     historical (col 1) + avg (proj cols) growth rate.
 */

interface BandDef {
  titleKey: 'proyFA.acquisitionCost' | 'proyFA.accDepreciation' | 'proyFA.netValue'
  sections: Array<{
    labelKey: 'proyFA.beginning' | 'proyFA.additions' | 'proyFA.ending' | ''
    offset: number
    totalRow: number
    /** Whether projection values are DISPLAYED. Net Value = yes; others = no */
    displayProjection: boolean
    /** Whether this row gets a Growth sub-row (Net Value only) */
    showGrowthRow: boolean
  }>
}

const BANDS: readonly BandDef[] = [
  {
    titleKey: 'proyFA.acquisitionCost',
    sections: [
      { labelKey: 'proyFA.beginning', offset: FA_OFFSET.ACQ_BEGINNING, totalRow: FA_SUBTOTAL.TOTAL_ACQ_BEGINNING, displayProjection: false, showGrowthRow: false },
      { labelKey: 'proyFA.additions', offset: FA_OFFSET.ACQ_ADDITIONS, totalRow: FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS, displayProjection: false, showGrowthRow: false },
      { labelKey: 'proyFA.ending',    offset: FA_OFFSET.ACQ_ENDING,    totalRow: FA_SUBTOTAL.TOTAL_ACQ_ENDING,    displayProjection: false, showGrowthRow: false },
    ],
  },
  {
    titleKey: 'proyFA.accDepreciation',
    sections: [
      { labelKey: 'proyFA.beginning', offset: FA_OFFSET.DEP_BEGINNING, totalRow: FA_SUBTOTAL.TOTAL_DEP_BEGINNING, displayProjection: false, showGrowthRow: false },
      { labelKey: 'proyFA.additions', offset: FA_OFFSET.DEP_ADDITIONS, totalRow: FA_SUBTOTAL.TOTAL_DEP_ADDITIONS, displayProjection: false, showGrowthRow: false },
      { labelKey: 'proyFA.ending',    offset: FA_OFFSET.DEP_ENDING,    totalRow: FA_SUBTOTAL.TOTAL_DEP_ENDING,    displayProjection: false, showGrowthRow: false },
    ],
  },
  {
    titleKey: 'proyFA.netValue',
    sections: [
      { labelKey: '', offset: FA_OFFSET.NET_VALUE, totalRow: FA_SUBTOTAL.TOTAL_NET_VALUE, displayProjection: true, showGrowthRow: true },
    ],
  },
] as const

function getLabel(acct: FaAccountEntry, language: 'en' | 'id'): string {
  if (acct.customLabel) return acct.customLabel
  const cat = getCatalogAccount(acct.catalogId)
  if (!cat) return acct.catalogId
  return language === 'en' ? cat.labelEn : cat.labelId
}

export default function ProyFixedAssetPage() {
  const { t, language } = useT()
  const home = useKkaStore((s) => s.home)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !fixedAsset) return null
    const historicalYears = computeHistoricalYears(home.tahunTransaksi, fixedAsset.yearCount)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = historicalYears[historicalYears.length - 1]!

    const input: ProyFaInput = {
      accounts: fixedAsset.accounts,
      faRows: fixedAsset.rows,
      historicalYears,
      // historicalYears argument: `ProyFaInput` signature uses `historicalYears`
    }
    const rows = computeProyFixedAssetsLive(input, projYears)

    // Per-account Net Value avg growth (for Growth sub-row display)
    const avgGrowth: Record<number, number> = {}
    for (const acct of fixedAsset.accounts) {
      const netSeries = fixedAsset.rows[acct.excelRow + FA_OFFSET.NET_VALUE] ?? {}
      avgGrowth[acct.excelRow] = computeAvgGrowth(netSeries)
    }

    return { rows, histYear, projYears, avgGrowth, accounts: fixedAsset.accounts }
  }, [hasHydrated, home, fixedAsset])

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }
  if (!data) {
    return (
      <PageEmptyState
        section={t('common.projection')}
        title={t('proyFA.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Fixed Asset', href: '/input/fixed-asset', filled: !!fixedAsset },
        ]}
      />
    )
  }

  const { rows, histYear, projYears, avgGrowth, accounts } = data
  const yearCols = [histYear, ...projYears]

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyFA.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('proyFA.subtitle')}</p>

      <div className="overflow-x-auto">
        {BANDS.map((band) => (
          <div key={band.titleKey} className="mb-6">
            <h2 className="mb-2 text-base font-semibold text-ink">{t(band.titleKey)}</h2>
            {band.sections.map((section) => (
              <table key={`${band.titleKey}-${section.offset}`} className="mb-4 w-full border-collapse text-sm">
                {section.labelKey && (
                  <thead>
                    <tr className="border-b border-grid">
                      <th className="px-2 py-1 text-left text-ink-muted">{t(section.labelKey)}</th>
                      {yearCols.map((y) => (
                        <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {accounts.map((acct) => renderAccountRow(
                    acct, section, rows, yearCols, histYear, language, avgGrowth, t,
                  ))}
                  <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
                    <td className="px-2 py-1.5 text-ink">{t('common.total')}</td>
                    {yearCols.map((y, i) => {
                      const v = rows[section.totalRow]?.[y]
                      // Hide projection totals for bands that don't display projection
                      if (i > 0 && !section.displayProjection) {
                        return <td key={y} className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-muted">—</td>
                      }
                      if (v === undefined) {
                        return <td key={y} className="px-2 py-1.5 text-right font-mono tabular-nums text-ink-muted">—</td>
                      }
                      return (
                        <td key={y} className={`px-2 py-1.5 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>
                          {formatIdr(v)}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function renderAccountRow(
  acct: FaAccountEntry,
  section: BandDef['sections'][number],
  rows: Record<number, import('@/types/financial').YearKeyedSeries>,
  yearCols: readonly number[],
  histYear: number,
  language: 'en' | 'id',
  avgGrowth: Record<number, number>,
  t: ReturnType<typeof useT>['t'],
): React.ReactNode {
  const rowKey = acct.excelRow + section.offset
  const label = getLabel(acct, language)
  const series = rows[rowKey] ?? {}

  const valueRow = (
    <tr key={`v-${rowKey}`} className="border-b border-grid">
      <td className="px-2 py-1 text-ink">{label}</td>
      {yearCols.map((y, i) => {
        // Hide projection values for non-Net-Value bands
        if (i > 0 && !section.displayProjection) {
          return <td key={y} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">—</td>
        }
        const v = series[y]
        if (v === undefined) {
          return <td key={y} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">—</td>
        }
        return (
          <td key={y} className={`px-2 py-1 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>
            {formatIdr(v)}
          </td>
        )
      })}
    </tr>
  )

  if (!section.showGrowthRow) return valueRow

  // Growth sub-row (Net Value only)
  const growth = avgGrowth[acct.excelRow] ?? 0
  const growthRow = (
    <tr key={`g-${rowKey}`} className="border-b border-grid">
      <td className="px-2 py-1 pl-8 text-xs italic text-ink-muted">{t('proyBS.row.growth')}</td>
      {yearCols.map((y, i) => {
        if (i === 0) {
          const prevYear = histYear - 1
          const prev = series[prevYear]
          const curr = series[histYear]
          if (prev === undefined || curr === undefined) {
            return <td key={y} className="px-2 py-1 text-right font-mono tabular-nums text-ink-muted">—</td>
          }
          const g = yoyChangeSafe(curr, prev)
          return (
            <td key={y} className={`px-2 py-1 text-right font-mono tabular-nums text-ink-muted ${g < 0 ? 'text-negative' : ''}`}>
              {formatPercent(g)}
            </td>
          )
        }
        return (
          <td key={y} className={`px-2 py-1 text-right font-mono tabular-nums text-ink-muted ${growth < 0 ? 'text-negative' : ''}`}>
            {formatPercent(growth)}
          </td>
        )
      })}
    </tr>
  )

  return [valueRow, growthRow]
}
