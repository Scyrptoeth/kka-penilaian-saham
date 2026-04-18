'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import {
  computeProyLrLive,
  type ProyLrInput,
  type ProyLrCommonSize,
} from '@/data/live/compute-proy-lr-live'
import { computeAvgGrowth, ratioOfBase } from '@/lib/calculations/helpers'
import { computeAverage } from '@/lib/calculations/derivation-helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * ROW_DEFS discriminated union:
 * - `data`: renders values from computed `rows[row][year]` (idr or percent).
 * - `subGrowth`: Revenue YoY growth sub-row (displays `revenueGrowth` driver).
 * - `subCommonSize`: % of Revenue sub-row (displays `commonSize[driverKey]`).
 *
 * Sub-rows render only at projection years; historical column shows "—".
 */
type RowDef =
  | {
      kind: 'data'
      row: number
      labelKey: TranslationKey
      valueKind: 'idr' | 'percent'
      bold?: boolean
      indent?: boolean
    }
  | { kind: 'subGrowth'; id: 'revenue-growth'; labelKey: TranslationKey }
  | {
      kind: 'subCommonSize'
      id: string
      labelKey: TranslationKey
      driverKey: keyof ProyLrCommonSize
    }

const ROW_DEFS: readonly RowDef[] = [
  { kind: 'data', row: 8, labelKey: 'proy.revenue', valueKind: 'idr', bold: true },
  { kind: 'subGrowth', id: 'revenue-growth', labelKey: 'proy.revenueGrowth' },
  { kind: 'data', row: 10, labelKey: 'proy.cogs', valueKind: 'idr' },
  { kind: 'subCommonSize', id: 'cogs-cs', labelKey: 'proy.cogsCommonSize', driverKey: 'cogs' },
  { kind: 'data', row: 11, labelKey: 'proy.grossProfit', valueKind: 'idr', bold: true },
  { kind: 'data', row: 12, labelKey: 'proy.grossMargin', valueKind: 'percent', indent: true },
  { kind: 'data', row: 17, labelKey: 'proy.totalOpEx', valueKind: 'idr' },
  { kind: 'subCommonSize', id: 'total-opex-cs', labelKey: 'proy.totalOpExCommonSize', driverKey: 'totalOpEx' },
  { kind: 'data', row: 19, labelKey: 'proy.ebitda', valueKind: 'idr', bold: true },
  { kind: 'data', row: 20, labelKey: 'proy.ebitdaMargin', valueKind: 'percent', indent: true },
  { kind: 'data', row: 22, labelKey: 'proy.depreciation', valueKind: 'idr' },
  { kind: 'data', row: 25, labelKey: 'proy.ebit', valueKind: 'idr', bold: true },
  { kind: 'data', row: 26, labelKey: 'proy.ebitMargin', valueKind: 'percent', indent: true },
  { kind: 'data', row: 29, labelKey: 'proy.interestIncome', valueKind: 'idr' },
  { kind: 'subCommonSize', id: 'ii-cs', labelKey: 'proy.interestIncomeCommonSize', driverKey: 'interestIncome' },
  { kind: 'data', row: 31, labelKey: 'proy.interestExpense', valueKind: 'idr' },
  { kind: 'subCommonSize', id: 'ie-cs', labelKey: 'proy.interestExpenseCommonSize', driverKey: 'interestExpense' },
  { kind: 'data', row: 33, labelKey: 'proy.otherIncome', valueKind: 'idr' },
  { kind: 'data', row: 34, labelKey: 'proy.nonOpIncome', valueKind: 'idr' },
  { kind: 'subCommonSize', id: 'noi-cs', labelKey: 'proy.nonOpIncomeCommonSize', driverKey: 'nonOpIncome' },
  { kind: 'data', row: 36, labelKey: 'proy.pbt', valueKind: 'idr', bold: true },
  { kind: 'data', row: 37, labelKey: 'proy.tax', valueKind: 'idr' },
  { kind: 'data', row: 39, labelKey: 'proy.netProfit', valueKind: 'idr', bold: true },
  { kind: 'data', row: 40, labelKey: 'proy.netMargin', valueKind: 'percent', indent: true },
]

export default function ProyIncomeStatementPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !incomeStatement || !keyDrivers) return null

    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = home.tahunTransaksi - 1

    // PROY FA for depreciation (if FA data available)
    let proyFaDepreciation: Record<number, number> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      const proyFa = computeProyFixedAssetsLive(
        { accounts: fixedAsset.accounts, faRows: allFa, historicalYears: faYears },
        projYears,
      )
      proyFaDepreciation = proyFa[51] ?? {}
    }

    // IS values for adapter
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0

    // Average common size driver per leaf (LESSON-105 pattern).
    const avgCommonSizeFor = (row: number): number => {
      const ratios = histYears4.map((y) =>
        ratioOfBase(isRows[row]?.[y] ?? 0, isRows[6]?.[y] ?? 0),
      )
      return computeAverage(ratios) ?? 0
    }

    const commonSize: ProyLrCommonSize = {
      cogs: avgCommonSizeFor(7),
      totalOpEx: avgCommonSizeFor(15),
      interestIncome: avgCommonSizeFor(26),
      interestExpense: avgCommonSizeFor(27),
      nonOpIncome: avgCommonSizeFor(30),
    }

    const revenueGrowth = computeAvgGrowth(isRows[6] ?? {})

    const input: ProyLrInput = {
      keyDrivers,
      revenueGrowth,
      commonSize,
      isLastYear: {
        revenue: isVal(6),
        cogs: isVal(7),
        grossProfit: isVal(8),
        totalOpEx: isVal(15),
        depreciation: -(isVal(21) ?? 0),
        interestIncome: isVal(26),
        interestExpense: isVal(27),
        nonOpIncome: isVal(30),
        tax: isVal(33),
      },
      proyFaDepreciation,
    }

    const rows = computeProyLrLive(input, histYear, projYears)
    return {
      rows,
      years: [histYear, ...projYears],
      histYear,
      revenueGrowth,
      commonSize,
    }
  }, [hasHydrated, home, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('common.projection')}
        title={t('proyLR.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Key Drivers', href: '/input/key-drivers', filled: !!keyDrivers },
        ]}
      />
    )
  }

  const { rows, years, histYear, revenueGrowth, commonSize } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyLR.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('proyLR.subtitle')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              {years.map((y, i) => (
                <th key={y} className="px-3 py-2 text-right font-mono font-medium text-ink-muted tabular-nums">
                  {y}{i === 0 ? t('common.histSuffix') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_DEFS.map(def => {
              if (def.kind === 'data') {
                const isMargin = def.valueKind === 'percent'
                return (
                  <tr
                    key={`data-${def.row}`}
                    className={
                      def.bold
                        ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
                        : 'border-b border-grid'
                    }
                  >
                    <td className={`px-3 py-1.5 text-ink ${def.indent ? 'pl-8 text-ink-muted italic' : ''}`}>
                      {t(def.labelKey)}
                    </td>
                    {years.map(y => {
                      const v = rows[def.row]?.[y]
                      if (v === undefined) return <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums">—</td>
                      const formatted = isMargin ? formatPercent(v) : formatIdr(v)
                      const isNeg = v < 0
                      return (
                        <td
                          key={y}
                          className={`px-3 py-1.5 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''} ${isMargin ? 'text-ink-muted' : ''}`}
                        >
                          {formatted}
                        </td>
                      )
                    })}
                  </tr>
                )
              }

              // Sub-row: growth / common-size driver — projection years only.
              const driverValue =
                def.kind === 'subGrowth' ? revenueGrowth : commonSize[def.driverKey]

              return (
                <tr key={`sub-${def.id}`} className="border-b border-grid">
                  <td className="px-3 py-1.5 pl-8 text-ink-muted italic">
                    {t(def.labelKey)}
                  </td>
                  {years.map(y => {
                    if (y === histYear) {
                      return <td key={y} className="px-3 py-1.5 text-right font-mono text-ink-muted tabular-nums">—</td>
                    }
                    const isNeg = driverValue < 0
                    return (
                      <td
                        key={y}
                        className={`px-3 py-1.5 text-right font-mono text-ink-muted tabular-nums ${isNeg ? 'text-negative' : ''}`}
                      >
                        {formatPercent(driverValue)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
