'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { formatIdr } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

const ROW_DEFS: { row: number; label: TranslationKey; bold?: boolean; indent?: boolean; section?: TranslationKey }[] = [
  { row: 5, label: 'proyCF.row.ebitda', section: 'proyCF.section.cfOps' },
  { row: 6, label: 'proyCF.row.corpTax' },
  { row: 8, label: 'proyCF.row.changesCA' },
  { row: 9, label: 'proyCF.row.changesCL' },
  { row: 10, label: 'proyCF.row.workingCapital', indent: true },
  { row: 11, label: 'proyCF.row.cfOps', bold: true },
  { row: 13, label: 'proyCF.row.cfNonOps', section: 'proyCF.section.nonOps' },
  { row: 17, label: 'proyCF.row.cfInvestment', section: 'proyCF.section.investment', bold: true },
  { row: 19, label: 'proyCF.row.cfBeforeFinancing', bold: true },
  { row: 22, label: 'proyCF.row.equityInjection', section: 'proyCF.section.financing' },
  { row: 23, label: 'proyCF.row.newLoan' },
  { row: 24, label: 'proyCF.row.interestExpense' },
  { row: 25, label: 'proyCF.row.interestIncome' },
  { row: 26, label: 'proyCF.row.principalRepayment' },
  { row: 28, label: 'proyCF.row.cfFinancing', bold: true },
  { row: 30, label: 'proyCF.row.netCashFlow', bold: true, section: 'proyCF.section.netCash' },
  { row: 32, label: 'proyCF.row.cashBeginning' },
  { row: 33, label: 'proyCF.row.cashEnding', bold: true },
  { row: 36, label: 'proyCF.row.cashOnHand', indent: true },
  { row: 35, label: 'proyCF.row.cashInBank', indent: true },
]

export default function ProyCashFlowPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const changesInWorkingCapital = useKkaStore(s => s.changesInWorkingCapital)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers || changesInWorkingCapital === null) return null

    const pipeline = computeFullProjectionPipeline({
      home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
      changesInWorkingCapital,
    })

    return { rows: pipeline.proyCfsRows, years: pipeline.projYears }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, changesInWorkingCapital])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section={t('nav.group.projection')}
        title={t('nav.item.proyCashFlow')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Fixed Asset', href: '/input/fixed-asset', filled: !!fixedAsset },
          { label: 'Key Drivers', href: '/input/key-drivers', filled: !!keyDrivers },
          { label: t('wc.gate.required.label'), href: '/analysis/changes-in-working-capital', filled: changesInWorkingCapital !== null },
        ]}
      />
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('proyCF.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('proyCF.subtitle')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              {years.map(y => (
                <th key={y} className="px-3 py-2 text-right font-mono font-medium text-ink-muted tabular-nums">
                  {y}
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
                  {def.section && (
                    <span className="mb-1 block pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {t(def.section)}
                    </span>
                  )}
                  {t(def.label)}
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
