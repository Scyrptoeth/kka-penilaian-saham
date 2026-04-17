'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

const ROW_DEFS: { row: number; labelKey: TranslationKey; kind: 'idr' | 'percent'; bold?: boolean; indent?: boolean }[] = [
  { row: 8, labelKey: 'proy.revenue', kind: 'idr', bold: true },
  { row: 10, labelKey: 'proy.cogs', kind: 'idr' },
  { row: 11, labelKey: 'proy.grossProfit', kind: 'idr', bold: true },
  { row: 12, labelKey: 'proy.grossMargin', kind: 'percent', indent: true },
  { row: 15, labelKey: 'proy.sellingOpEx', kind: 'idr' },
  { row: 16, labelKey: 'proy.gaAdmin', kind: 'idr' },
  { row: 17, labelKey: 'proy.totalOpEx', kind: 'idr' },
  { row: 19, labelKey: 'proy.ebitda', kind: 'idr', bold: true },
  { row: 20, labelKey: 'proy.ebitdaMargin', kind: 'percent', indent: true },
  { row: 22, labelKey: 'proy.depreciation', kind: 'idr' },
  { row: 25, labelKey: 'proy.ebit', kind: 'idr', bold: true },
  { row: 26, labelKey: 'proy.ebitMargin', kind: 'percent', indent: true },
  { row: 29, labelKey: 'proy.interestIncome', kind: 'idr' },
  { row: 31, labelKey: 'proy.interestExpense', kind: 'idr' },
  { row: 33, labelKey: 'proy.otherIncome', kind: 'idr' },
  { row: 34, labelKey: 'proy.nonOpIncome', kind: 'idr' },
  { row: 36, labelKey: 'proy.pbt', kind: 'idr', bold: true },
  { row: 37, labelKey: 'proy.tax', kind: 'idr' },
  { row: 39, labelKey: 'proy.netProfit', kind: 'idr', bold: true },
  { row: 40, labelKey: 'proy.netMargin', kind: 'percent', indent: true },
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
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = home.tahunTransaksi - 1 // last historical year

    // PROY FA for depreciation (if FA data available)
    let proyFaDepreciation: Record<number, number> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      const proyFa = computeProyFixedAssetsLive(allFa, faYears, projYears)
      // Row 51 = Total Depreciation Additions
      proyFaDepreciation = proyFa[51] ?? {}
    }

    // IS last historical year values
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0

    // Compute IS average growth rates from user's historical data (not hardcoded)
    const isAvgGrowth = (row: number) => computeAvgGrowth(isRows[row] ?? {})

    const input: ProyLrInput = {
      keyDrivers,
      revenueGrowth: isAvgGrowth(6),
      interestIncomeGrowth: isAvgGrowth(26),
      interestExpenseGrowth: isAvgGrowth(27),
      nonOpIncomeGrowth: isAvgGrowth(30),
      isLastYear: {
        revenue: isVal(6),
        cogs: isVal(7),
        grossProfit: isVal(8),
        sellingOpex: isVal(12),
        gaOpex: isVal(13),
        depreciation: -(isVal(21) ?? 0), // FA depreciation negated
        interestIncome: isVal(26),
        interestExpense: isVal(27),
        nonOpIncome: isVal(30),
        tax: isVal(33),
      },
      proyFaDepreciation,
    }

    const rows = computeProyLrLive(input, histYear, projYears)
    return { rows, years: [histYear, ...projYears] }
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

  const { rows, years } = data

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
              const isMargin = def.kind === 'percent'
              return (
                <tr
                  key={def.row}
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
