'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import {
  computeProyFixedAssetsLive,
  computeFaAdditionsGrowths,
  type ProyFaInput,
} from '@/data/live/compute-proy-fixed-assets-live'
import { FA_OFFSET, FA_SUBTOTAL, getCatalogAccount, type FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import { yoyChangeSafe } from '@/lib/calculations/helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * Session 045 — PROY FIXED ASSET (roll-forward model).
 *
 * Each account projects its 7 bands as:
 *   Acq Add[Y+1] = Acq Add[Y] × (1 + acqAddGrowth)
 *   Acq Beg[Y+1] = Acq End[Y]  (identity)
 *   Acq End[Y]   = Acq Beg[Y] + Acq Add[Y]
 *   (Dep mirrors with its own depAddGrowth)
 *   Net Value[Y] = Acq End[Y] - Dep End[Y]
 *
 * Growth sub-row is shown ONLY below Acq Additions and Dep Additions bands
 * (the two inputs driving projection). Historical year shows actual YoY;
 * projection years show the avg growth rate that will be applied.
 * Net Value band no longer carries a Growth sub-row — it's derived, not driven.
 */

type BandLabelKey =
  | 'proyFA.beginning'
  | 'proyFA.additions'
  | 'proyFA.ending'
  | ''

type GrowthSource = 'acq' | 'dep' | null

interface BandDef {
  titleKey: 'proyFA.acquisitionCost' | 'proyFA.accDepreciation' | 'proyFA.netValue'
  sections: Array<{
    labelKey: BandLabelKey
    offset: number
    totalRow: number
    /** Growth sub-row source (acq/dep band growth), null = no growth row */
    growthSource: GrowthSource
  }>
}

const BANDS: readonly BandDef[] = [
  {
    titleKey: 'proyFA.acquisitionCost',
    sections: [
      { labelKey: 'proyFA.beginning', offset: FA_OFFSET.ACQ_BEGINNING, totalRow: FA_SUBTOTAL.TOTAL_ACQ_BEGINNING, growthSource: null },
      { labelKey: 'proyFA.additions', offset: FA_OFFSET.ACQ_ADDITIONS, totalRow: FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS, growthSource: 'acq' },
      { labelKey: 'proyFA.ending',    offset: FA_OFFSET.ACQ_ENDING,    totalRow: FA_SUBTOTAL.TOTAL_ACQ_ENDING,    growthSource: null },
    ],
  },
  {
    titleKey: 'proyFA.accDepreciation',
    sections: [
      { labelKey: 'proyFA.beginning', offset: FA_OFFSET.DEP_BEGINNING, totalRow: FA_SUBTOTAL.TOTAL_DEP_BEGINNING, growthSource: null },
      { labelKey: 'proyFA.additions', offset: FA_OFFSET.DEP_ADDITIONS, totalRow: FA_SUBTOTAL.TOTAL_DEP_ADDITIONS, growthSource: 'dep' },
      { labelKey: 'proyFA.ending',    offset: FA_OFFSET.DEP_ENDING,    totalRow: FA_SUBTOTAL.TOTAL_DEP_ENDING,    growthSource: null },
    ],
  },
  {
    titleKey: 'proyFA.netValue',
    sections: [
      { labelKey: '', offset: FA_OFFSET.NET_VALUE, totalRow: FA_SUBTOTAL.TOTAL_NET_VALUE, growthSource: null },
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
    }
    const rows = computeProyFixedAssetsLive(input, projYears)

    // Session 045: per-account growth for Acq Additions + Dep Additions
    const growths = computeFaAdditionsGrowths(fixedAsset.accounts, fixedAsset.rows)

    return { rows, histYear, projYears, growths, accounts: fixedAsset.accounts }
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

  const { rows, histYear, projYears, growths, accounts } = data
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
                    acct, section, rows, yearCols, histYear, language, growths, t,
                  ))}
                  <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
                    <td className="px-2 py-1.5 text-ink">{t('common.total')}</td>
                    {yearCols.map((y) => {
                      const v = rows[section.totalRow]?.[y]
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
  section: { labelKey: BandLabelKey; offset: number; totalRow: number; growthSource: GrowthSource },
  rows: Record<number, import('@/types/financial').YearKeyedSeries>,
  yearCols: readonly number[],
  histYear: number,
  language: 'en' | 'id',
  growths: { acqAdd: Record<number, number>; depAdd: Record<number, number> },
  t: ReturnType<typeof useT>['t'],
): React.ReactNode {
  const rowKey = acct.excelRow + section.offset
  const label = getLabel(acct, language)
  const series = rows[rowKey] ?? {}

  const valueRow = (
    <tr key={`v-${rowKey}`} className="border-b border-grid">
      <td className="px-2 py-1 text-ink">{label}</td>
      {yearCols.map((y) => {
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

  if (section.growthSource === null) return valueRow

  // Growth sub-row — only for Acq Additions + Dep Additions bands (Session 045)
  const growth =
    section.growthSource === 'acq'
      ? growths.acqAdd[acct.excelRow] ?? 0
      : growths.depAdd[acct.excelRow] ?? 0

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
