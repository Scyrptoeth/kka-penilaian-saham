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
import { computeProyNoplatLive, type ProyNoplatInput } from '@/data/live/compute-proy-noplat-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { formatIdr } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

const ROW_DEFS: { row: number; labelKey: TranslationKey; bold?: boolean; indent?: boolean; sectionKey?: TranslationKey }[] = [
  { row: 7, labelKey: 'proyNoplat.row.pbt', sectionKey: 'proy.ebit' },
  { row: 8, labelKey: 'proyNoplat.row.addInterestExp' },
  { row: 9, labelKey: 'proyNoplat.row.lessInterestInc' },
  { row: 10, labelKey: 'proyNoplat.row.nonOpIncome' },
  { row: 11, labelKey: 'proy.ebit', bold: true },
  { row: 13, labelKey: 'proyNoplat.row.taxProvision', sectionKey: 'proyNoplat.row.totalTaxesEBIT' },
  { row: 14, labelKey: 'proyNoplat.row.taxShield', indent: true },
  { row: 15, labelKey: 'proyNoplat.row.taxOnInterest', indent: true },
  { row: 16, labelKey: 'proyNoplat.row.taxOnNonOp', indent: true },
  { row: 17, labelKey: 'proyNoplat.row.totalTaxesEBIT', bold: true },
  { row: 19, labelKey: 'proyNoplat.row.noplat', bold: true },
]

export default function ProyNoplatPage() {
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
    const histYear = home.tahunTransaksi - 1

    // PROY FA for depreciation
    let proyFaDepreciation: Record<number, number> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      const proyFa = computeProyFixedAssetsLive(allFa, faYears, projYears)
      proyFaDepreciation = proyFa[51] ?? {}
    }

    // Compute PROY LR
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0
    const isAvgGrowth = (row: number) => computeAvgGrowth(isRows[row] ?? {})

    const lrInput: ProyLrInput = {
      keyDrivers,
      revenueGrowth: isAvgGrowth(6),
      interestIncomeGrowth: isAvgGrowth(26),
      interestExpenseGrowth: isAvgGrowth(27),
      nonOpIncomeGrowth: isAvgGrowth(30),
      isLastYear: {
        revenue: isVal(6), cogs: isVal(7), grossProfit: isVal(8),
        sellingOpex: isVal(12), gaOpex: isVal(13),
        depreciation: -(isVal(21) ?? 0),
        interestIncome: isVal(26), interestExpense: isVal(27),
        nonOpIncome: isVal(30), tax: isVal(33),
      },
      proyFaDepreciation,
    }
    const proyLr = computeProyLrLive(lrInput, histYear, projYears)

    // Compute historical effective tax rate from IS data
    const histPbt = isVal(32)
    const histTax = isVal(33)
    const histTaxRate = histPbt !== 0 ? Math.abs(histTax / histPbt) : 0

    // Compute PROY NOPLAT
    const noplatInput: ProyNoplatInput = {
      proyLrRows: proyLr,
      taxRate: keyDrivers.financialDrivers.corporateTaxRate,
      isLastYear: {
        pbt: histPbt,
        interestExpense: isVal(27),
        interestIncome: isVal(26),
        nonOpIncome: isVal(30),
        tax: histTax,
      },
      histTaxRate,
    }

    const rows = computeProyNoplatLive(noplatInput, histYear, projYears)
    return { rows, years: [histYear, ...projYears] }
  }, [hasHydrated, home, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('common.projection')}
        title={t('proyNoplat.title')}
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
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyNoplat.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('proyNoplat.subtitle')}
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
            {ROW_DEFS.map(def => (
              <tr
                key={def.row}
                className={
                  def.bold
                    ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
                    : 'border-b border-grid'
                }
              >
                <td className={`px-3 py-1.5 text-ink ${def.indent ? 'pl-8 text-ink-muted' : ''}`}>
                  {def.sectionKey && (
                    <span className="mb-1 block pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {t(def.sectionKey)}
                    </span>
                  )}
                  {t(def.labelKey)}
                </td>
                {years.map(y => {
                  const v = rows[def.row]?.[y]
                  if (v === undefined) return <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums">—</td>
                  const isNeg = v < 0
                  return (
                    <td
                      key={y}
                      className={`px-3 py-1.5 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''}`}
                    >
                      {formatIdr(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
