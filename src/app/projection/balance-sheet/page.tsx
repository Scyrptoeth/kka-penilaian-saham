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
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

const ROW_DEFS: { row: number; labelKey: TranslationKey; kind: 'idr' | 'percent'; bold?: boolean; indent?: boolean; sectionKey?: TranslationKey }[] = [
  // Current Assets
  { row: 9, labelKey: 'proyBS.row.cashOnHands', kind: 'idr' },
  { row: 10, labelKey: 'proyBS.row.growth', kind: 'percent', indent: true },
  { row: 11, labelKey: 'proyBS.row.cashInBanks', kind: 'idr' },
  { row: 13, labelKey: 'proyBS.row.accountReceivable', kind: 'idr' },
  { row: 14, labelKey: 'proyBS.row.growth', kind: 'percent', indent: true },
  { row: 15, labelKey: 'proyBS.row.otherReceivable', kind: 'idr' },
  { row: 17, labelKey: 'proyBS.row.inventory', kind: 'idr' },
  { row: 18, labelKey: 'proyBS.row.growth', kind: 'percent', indent: true },
  { row: 19, labelKey: 'proyBS.row.others', kind: 'idr' },
  { row: 21, labelKey: 'proyBS.row.totalCurrentAssets', kind: 'idr', bold: true },
  // Non-Current Assets
  { row: 25, labelKey: 'proyBS.row.faBeginning', kind: 'idr', sectionKey: 'proyBS.section.nca' },
  { row: 26, labelKey: 'proyBS.row.accDepreciation', kind: 'idr' },
  { row: 28, labelKey: 'proyBS.row.faNet', kind: 'idr', bold: true },
  { row: 29, labelKey: 'proyBS.row.otherNCA', kind: 'idr' },
  { row: 30, labelKey: 'proyBS.row.intangible', kind: 'idr' },
  { row: 31, labelKey: 'proyBS.row.totalNCA', kind: 'idr', bold: true },
  { row: 33, labelKey: 'proyBS.row.totalAssets', kind: 'idr', bold: true },
  // Current Liabilities
  { row: 37, labelKey: 'proyBS.row.bankLoanST', kind: 'idr', sectionKey: 'proyBS.section.liabilities' },
  { row: 39, labelKey: 'proyBS.row.accountPayables', kind: 'idr' },
  { row: 41, labelKey: 'proyBS.row.taxPayable', kind: 'idr' },
  { row: 43, labelKey: 'proyBS.row.others', kind: 'idr' },
  { row: 45, labelKey: 'proyBS.row.totalCL', kind: 'idr', bold: true },
  { row: 48, labelKey: 'proyBS.row.bankLoanLT', kind: 'idr' },
  { row: 50, labelKey: 'proyBS.row.otherNCL', kind: 'idr' },
  { row: 52, labelKey: 'proyBS.row.totalNCL', kind: 'idr', bold: true },
  // Equity
  { row: 55, labelKey: 'proyBS.row.paidUpCapital', kind: 'idr', sectionKey: 'proyBS.section.equity' },
  { row: 57, labelKey: 'proyBS.row.surplus', kind: 'idr' },
  { row: 58, labelKey: 'proyBS.row.currentProfit', kind: 'idr' },
  { row: 59, labelKey: 'proyBS.row.retainedEarnings', kind: 'idr', bold: true },
  { row: 60, labelKey: 'proyBS.row.shareholdersEquity', kind: 'idr', bold: true },
  { row: 62, labelKey: 'proyBS.row.totalLE', kind: 'idr', bold: true },
  { row: 63, labelKey: 'proyBS.row.balanceControl', kind: 'idr', indent: true },
]

export default function ProyBalanceSheetPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers) return null

    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = home.tahunTransaksi - 1

    // Compute PROY FA for BS rows 25/26
    let proyFaRows: Record<number, Record<number, number>> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      proyFaRows = computeProyFixedAssetsLive(allFa, faYears, projYears)
    }

    // Compute PROY LR for Net Profit (row 39)
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0
    let proyFaDepreciation: Record<number, number> = {}
    if (proyFaRows[51]) {
      proyFaDepreciation = proyFaRows[51]
    }

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

    // Compute BS average growth from historical data
    const bsRows = balanceSheet.rows
    const bsAvgGrowth: Record<number, number> = {}
    const bsLastYear: Record<number, number> = {}
    for (const [rowStr, series] of Object.entries(bsRows)) {
      const row = Number(rowStr)
      bsAvgGrowth[row] = computeAvgGrowth(series)
      bsLastYear[row] = series[histYear] ?? 0
    }

    const bsInput: ProyBsInput = {
      bsLastYear,
      bsAvgGrowth,
      proyFaRows,
      proyLrNetProfit: proyLr[39] ?? {},
      intangibleGrowth: bsAvgGrowth[24] ?? 0,
    }

    const rows = computeProyBsLive(bsInput, histYear, projYears)
    return { rows, years: [histYear, ...projYears] }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('common.projection')}
        title={t('proyBS.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Key Drivers', href: '/input/key-drivers', filled: !!keyDrivers },
        ]}
      />
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyBS.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('proyBS.subtitle')}
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
              const isPct = def.kind === 'percent'
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
                    const formatted = isPct ? formatPercent(v) : formatIdr(v)
                    const isNeg = v < 0
                    return (
                      <td
                        key={y}
                        className={`px-3 py-1.5 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''} ${isPct ? 'text-ink-muted' : ''}`}
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
