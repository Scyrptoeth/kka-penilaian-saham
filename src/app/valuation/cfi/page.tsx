'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeHistoricalUpstream, buildDcfInput, buildCfiInput } from '@/lib/calculations/upstream-helpers'
import { computeCfi } from '@/lib/calculations/cfi'
import { formatIdr } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'

const ROW_DEFS: { key: keyof ReturnType<typeof computeCfi>; labelKey: TranslationKey; bold?: boolean }[] = [
  { key: 'fcf', labelKey: 'cfi.row.fcf' },
  { key: 'nonOpCf', labelKey: 'cfi.row.addNonOp' },
  { key: 'cfi', labelKey: 'cfi.row.cfiTotal', bold: true },
]

export default function CfiPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const interestBearingDebt = useKkaStore(s => s.interestBearingDebt)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers || !discountRateState || interestBearingDebt === null) return null

    const pipeline = computeFullProjectionPipeline({
      home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
    })
    const { allBs, proyNoplatRows, proyFaRows, proyCfsRows, histYears3, histYears4, projYears, lastHistYear } = pipeline

    // ── Historical upstream (shared helper) ──
    const upstream = computeHistoricalUpstream({
      balanceSheetRows: balanceSheet.rows,
      incomeStatementRows: incomeStatement.rows,
      fixedAssetRows: fixedAsset?.rows ?? null,
      accPayablesRows: null,
      allBs, histYears3, histYears4,
    })

    // ── Projected FCF (via DCF) ──
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))
    const dcfResult = computeDcf(buildDcfInput({
      upstream, allBs, lastHistYear, projYears,
      proyNoplatRows, proyFaRows, proyCfsRows,
      wacc: dr.wacc, growthRate: upstream.growthRate,
      interestBearingDebt,
    }))

    // ── CFI via centralized input builder (LESSON-046) ──
    const cfiResult = computeCfi(buildCfiInput({
      upstream, histYears3, projYears,
      dcfProjectedFcf: dcfResult.projectedFcf,
      proyLrRows: pipeline.proyLrRows,
      incomeStatementRows: incomeStatement.rows,
    }))
    const allYears = [...histYears3, ...projYears]
    return { cfiResult, histYears3, projYears, allYears }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, interestBearingDebt])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section="PENILAIAN"
        title="CFI"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Key Drivers', href: '/input/key-drivers', filled: !!keyDrivers },
          { label: 'Discount Rate', href: '/valuation/discount-rate', filled: !!discountRateState },
          { label: t('nav.item.interestBearingDebt'), href: '/valuation/interest-bearing-debt', filled: interestBearingDebt !== null },
        ]}
      />
    )
  }

  const { cfiResult, projYears, allYears } = data
  const projStart = projYears[0]!

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('cfi.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('cfi.subtitle')}</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid">
              <th className="px-3 py-1 text-left font-medium text-ink-muted" />
              {data.histYears3.length > 0 && (
                <th colSpan={data.histYears3.length} className="px-3 py-1 text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
                  {t('common.historical')}
                </th>
              )}
              <th colSpan={projYears.length} className="px-3 py-1 text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
                {t('common.projection')}
              </th>
            </tr>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              {allYears.map(y => (
                <th
                  key={y}
                  className={`px-3 py-2 text-right font-mono font-medium tabular-nums ${y >= projStart ? 'text-ink-muted bg-canvas-raised' : 'text-ink-muted'}`}
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_DEFS.map(def => (
              <tr
                key={def.key}
                className={
                  def.bold
                    ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
                    : 'border-b border-grid'
                }
              >
                <td className="px-3 py-2 text-ink">{t(def.labelKey)}</td>
                {allYears.map(y => {
                  const v = cfiResult[def.key][y] ?? 0
                  return (
                    <td
                      key={y}
                      className={`px-3 py-2 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''} ${y >= projStart ? 'bg-canvas-raised' : ''}`}
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
