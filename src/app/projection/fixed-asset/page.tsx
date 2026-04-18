'use client'

import { Fragment, useMemo } from 'react'
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
 * Session 046 — PROY FIXED ASSET (unified column alignment).
 *
 * Three tables — Acquisition Cost, Depreciation, Net Value Fixed Assets —
 * each using `table-fixed` + `<colgroup>` with identical width percentages
 * so year columns align across every category. Acq + Dep contain three
 * sub-sections each (Beginning / Additions / Ending) rendered as
 * `<tr>` sub-header rows inside the same table, guaranteeing column
 * alignment within a category as well.
 *
 * Compute model unchanged from Session 045 — roll-forward per band with
 * per-account Additions growth; Session 046 added:
 *   1. Self-healing seed: derive End[histYear] = Beg+Add when store
 *      lacks persisted Ending.
 *   2. Stopping rule: Net Value ≤ 0 → halt Dep Additions (asset disposed).
 *
 * Growth sub-row is rendered ONLY below Acq Additions and Dep Additions
 * bands (the two inputs driving projection).
 */

type GrowthSource = 'acq' | 'dep' | null

interface BandSection {
  labelKey: 'proyFA.beginning' | 'proyFA.additions' | 'proyFA.ending'
  offset: number
  totalRow: number
  /** Growth sub-row source (acq/dep band growth), null = no growth row */
  growthSource: GrowthSource
}

interface CategoryDef {
  titleKey: 'proyFA.acquisitionCost' | 'proyFA.accDepreciation' | 'proyFA.netValue'
  sections: BandSection[] | null
  /** When `sections` is null, use this offset + totalRow for the single band (Net Value). */
  singleOffset?: number
  singleTotalRow?: number
}

const CATEGORIES: readonly CategoryDef[] = [
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
    sections: null,
    singleOffset: FA_OFFSET.NET_VALUE,
    singleTotalRow: FA_SUBTOTAL.TOTAL_NET_VALUE,
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
  // Column widths: 40% for label, remainder evenly split across year columns.
  // Using percentages keeps alignment identical across every category table.
  const yearColWidth = `${60 / yearCols.length}%`

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyFA.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('proyFA.subtitle')}</p>

      <div className="overflow-x-auto">
        {CATEGORIES.map((cat) => (
          <div key={cat.titleKey} className="mb-8">
            <h2 className="mb-2 text-base font-semibold text-ink">{t(cat.titleKey)}</h2>
            <table className="w-full table-fixed border-collapse text-sm">
              <colgroup>
                <col style={{ width: '40%' }} />
                {yearCols.map((y) => <col key={y} style={{ width: yearColWidth }} />)}
              </colgroup>
              <thead>
                <tr className="border-b-2 border-grid-strong">
                  <th className="px-2 py-1 text-left text-ink-muted">&nbsp;</th>
                  {yearCols.map((y) => (
                    <th key={y} className="px-2 py-1 text-right font-mono text-ink-muted tabular-nums">
                      {y}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cat.sections
                  ? cat.sections.map((section, idx) => (
                      <Fragment key={`${cat.titleKey}-${section.offset}`}>
                        <SubSectionHeaderRow
                          labelKey={section.labelKey}
                          t={t}
                          colSpan={yearCols.length + 1}
                          isFirst={idx === 0}
                        />
                        {accounts.map((acct) => renderAccountRows(
                          acct, section, rows, yearCols, histYear, language, growths, t,
                        ))}
                        <TotalRow totalRow={section.totalRow} rows={rows} yearCols={yearCols} t={t} />
                      </Fragment>
                    ))
                  : (
                    <>
                      {accounts.map((acct) => renderAccountRows(
                        acct,
                        {
                          labelKey: 'proyFA.ending', // unused (growthSource=null)
                          offset: cat.singleOffset!,
                          totalRow: cat.singleTotalRow!,
                          growthSource: null,
                        },
                        rows, yearCols, histYear, language, growths, t,
                      ))}
                      <TotalRow totalRow={cat.singleTotalRow!} rows={rows} yearCols={yearCols} t={t} />
                    </>
                  )}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

function SubSectionHeaderRow({
  labelKey, t, colSpan, isFirst,
}: {
  labelKey: BandSection['labelKey']
  t: ReturnType<typeof useT>['t']
  colSpan: number
  isFirst: boolean
}) {
  return (
    <tr className={isFirst ? '' : 'border-t-2 border-grid-strong'}>
      <td colSpan={colSpan} className="bg-canvas-raised px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {t(labelKey)}
      </td>
    </tr>
  )
}

function TotalRow({
  totalRow, rows, yearCols, t,
}: {
  totalRow: number
  rows: Record<number, import('@/types/financial').YearKeyedSeries>
  yearCols: readonly number[]
  t: ReturnType<typeof useT>['t']
}) {
  return (
    <tr className="border-t border-grid bg-canvas-raised font-semibold">
      <td className="px-2 py-1.5 text-ink">{t('common.total')}</td>
      {yearCols.map((y) => {
        const v = rows[totalRow]?.[y]
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
  )
}

function renderAccountRows(
  acct: FaAccountEntry,
  section: BandSection,
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

  return (
    <Fragment key={`vg-${rowKey}`}>
      {valueRow}
      {growthRow}
    </Fragment>
  )
}
