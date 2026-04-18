'use client'

import { Fragment, useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeShareValue } from '@/lib/calculations/share-value'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeHistoricalUpstream, buildDcfInput, computeInterestBearingDebt } from '@/lib/calculations/upstream-helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

export default function DcfPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const interestBearingDebt = useKkaStore(s => s.interestBearingDebt)
  const changesInWorkingCapital = useKkaStore(s => s.changesInWorkingCapital)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers || !discountRateState || interestBearingDebt === null || changesInWorkingCapital === null) return null

    // ── Projection pipeline (shared with PROY CFS, CFI, etc.) ──
    const pipeline = computeFullProjectionPipeline({
      home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
      changesInWorkingCapital,
    })
    const { allBs, proyNoplatRows, proyFaRows, proyCfsRows, histYears3, projYears, lastHistYear } = pipeline

    // ── Historical upstream chain (shared helper) ──
    const upstream = computeHistoricalUpstream({
      balanceSheetRows: balanceSheet.rows,
      balanceSheetAccounts: balanceSheet.accounts,
      incomeStatementRows: incomeStatement.rows,
      fixedAssetRows: fixedAsset?.rows ?? null,
      accPayablesRows: null,
      allBs, histYears3, histYears4: pipeline.histYears4,
      changesInWorkingCapital,
    })

    // ── Discount Rate ──
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

    // Session 041 Task 5 — IBD as a derived total (LESSON-011 sign reconciliation
    // happens inside `buildDcfInput`).
    const ibdAmount = computeInterestBearingDebt({
      balanceSheetAccounts: balanceSheet.accounts,
      balanceSheetRows: allBs,
      interestBearingDebt,
      year: lastHistYear,
    })

    // ── DCF ──
    const dcfInput = buildDcfInput({
      upstream, allBs, lastHistYear, projYears,
      proyNoplatRows, proyFaRows, proyCfsRows,
      wacc: dr.wacc, growthRate: upstream.growthRate,
      interestBearingDebt: ibdAmount,
    })
    const dcfResult = computeDcf(dcfInput)

    // ── Share Value ──
    const proporsiSaham = computeProporsiSaham(home)
    const shareValue = computeShareValue({
      equityValue100: dcfResult.equityValue100,
      dlomPercent: home.dlomPercent,
      dlocPercent: 0,
      proporsiSaham,
      jumlahSahamBeredar: home.jumlahSahamBeredar,
    })

    return { dcfInput, dcfResult, shareValue, projYears, lastHistYear, dr, growthRate: upstream.growthRate, proporsiSaham, home }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, interestBearingDebt, changesInWorkingCapital])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section="PENILAIAN"
        title="DCF"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Key Drivers', href: '/input/key-drivers', filled: !!keyDrivers },
          { label: 'Discount Rate', href: '/valuation/discount-rate', filled: !!discountRateState },
          { label: t('nav.item.interestBearingDebt'), href: '/valuation/interest-bearing-debt', filled: interestBearingDebt !== null },
          { label: t('wc.gate.required.label'), href: '/analysis/changes-in-working-capital', filled: changesInWorkingCapital !== null },
        ]}
      />
    )
  }

  const { dcfInput: di, dcfResult: r, shareValue: sv, projYears } = data

  // FCF component tuple per year: [NOPLAT, Dep, ΔCA, ΔCL, CapEx]
  // Values are already pre-signed per Excel convention (CapEx negative, etc.)
  const fcfBreakdown = (
    yearIndex: number | null, // null = historical row
  ): Array<{ labelKey: 'dcf.break.noplat' | 'dcf.break.depreciation' | 'dcf.break.changesCA' | 'dcf.break.changesCL' | 'dcf.break.capex'; value: number }> => {
    if (yearIndex === null) {
      return [
        { labelKey: 'dcf.break.noplat', value: di.historicalNoplat },
        { labelKey: 'dcf.break.depreciation', value: di.historicalDepreciation },
        { labelKey: 'dcf.break.changesCA', value: di.historicalChangesCA },
        { labelKey: 'dcf.break.changesCL', value: di.historicalChangesCL },
        { labelKey: 'dcf.break.capex', value: di.historicalCapex },
      ]
    }
    return [
      { labelKey: 'dcf.break.noplat', value: di.projectedNoplat[yearIndex] ?? 0 },
      { labelKey: 'dcf.break.depreciation', value: di.projectedDepreciation[yearIndex] ?? 0 },
      { labelKey: 'dcf.break.changesCA', value: di.projectedChangesCA[yearIndex] ?? 0 },
      { labelKey: 'dcf.break.changesCL', value: di.projectedChangesCL[yearIndex] ?? 0 },
      { labelKey: 'dcf.break.capex', value: di.projectedCapex[yearIndex] ?? 0 },
    ]
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('dcf.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('dcf.subtitle')}</p>

      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('common.value')}</th>
            </tr>
          </thead>
          <tbody>
            {/* FCF */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('dcf.section.fcf')}</td></tr>
            {/* FCF (historical) — headline then breakdown */}
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.fcfYearRow', { year: data.lastHistYear })}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.historicalFcf)}</td>
            </tr>
            {fcfBreakdown(null).map((b, i) => (
              <tr key={`hist-break-${i}`} className="border-b border-grid">
                <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t(b.labelKey)}</td>
                <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${b.value < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(b.value)}</td>
              </tr>
            ))}
            <tr><td colSpan={2} className="border-b-2 border-grid-strong" /></tr>
            {/* FCF (projected) — headline then breakdown per year */}
            {r.projectedFcf.map((v, i) => (
              <Fragment key={`proj-${projYears[i]}`}>
                <tr className="border-b border-grid">
                  <td className="px-3 py-2 text-ink">{t('dcf.fcfYearRow', { year: projYears[i] })}</td>
                  <td className={`px-3 py-2 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>{formatIdr(v)}</td>
                </tr>
                {fcfBreakdown(i).map((b, j) => (
                  <tr key={`proj-break-${projYears[i]}-${j}`} className="border-b border-grid">
                    <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t(b.labelKey)}</td>
                    <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${b.value < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(b.value)}</td>
                  </tr>
                ))}
                <tr><td colSpan={2} className="border-b-2 border-grid-strong" /></tr>
              </Fragment>
            ))}

            {/* Discounting */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('dcf.section.discounting')}</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">WACC</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.dr.wacc)}</td>
            </tr>
            {r.discountFactors.map((df, i) => (
              <tr key={`df-${i}`} className="border-b border-grid">
                <td className="px-3 py-2 pl-6 text-ink">{t('dcf.discountFactorYearRow', { year: projYears[i] })}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{df.toFixed(6)}</td>
              </tr>
            ))}
            <tr className="border-t border-grid-strong bg-canvas-raised font-semibold">
              <td className="px-3 py-2 text-ink">{t('dcf.totalPvFcf')}</td>
              <td className={`px-3 py-2 text-right font-mono tabular-nums ${r.totalPvFcf < 0 ? 'text-negative' : ''}`}>{formatIdr(r.totalPvFcf)}</td>
            </tr>
            {/* Breakdown: PV of FCF per projected year */}
            {r.pvFcf.map((pv, i) => (
              <tr key={`pv-break-${i}`} className="border-b border-grid">
                <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t('dcf.break.pvFcfYearRow', { year: projYears[i] })}</td>
                <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${pv < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(pv)}</td>
              </tr>
            ))}
            <tr><td colSpan={2} className="border-b-2 border-grid-strong" /></tr>

            {/* Terminal Value */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('dcf.section.terminalValue')}</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.growthRate')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.growthRate)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.terminalValue')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.terminalValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.pvTerminal')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.pvTerminal)}</td>
            </tr>
            <tr className="border-t border-grid-strong bg-canvas-raised font-semibold">
              <td className="px-3 py-2 text-ink">{t('dcf.enterpriseValue')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.enterpriseValue)}</td>
            </tr>

            {/* Equity → Share Value */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{t('dcf.section.equityShare')}</td></tr>
            {/* Breakdown: EV − IBD + Surplus Cash + Idle Non-Op = Equity Value (100%) */}
            <tr className="border-b border-grid">
              <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t('dcf.enterpriseValue')}</td>
              <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${r.enterpriseValue < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(r.enterpriseValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t('dcf.break.ibdRow')}</td>
              <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${di.interestBearingDebt < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(di.interestBearingDebt)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t('dcf.break.surplusCash')}</td>
              <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${di.excessCash < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(di.excessCash)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-1 pl-12 text-sm text-ink-muted">{t('dcf.break.idleNonOp')}</td>
              <td className={`px-3 py-1 text-right font-mono text-sm tabular-nums ${di.idleAsset < 0 ? 'text-negative' : 'text-ink-muted'}`}>{formatIdr(di.idleAsset)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.equityValue100')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityValue100)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.dlomWithPercentRow', { pct: formatPercent(data.home.dlomPercent) })}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(sv.dlomDiscount)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.marketValue100')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.marketValue100)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.marketValuePortionRow', { pct: formatPercent(data.proporsiSaham) })}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.marketValuePortion)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.rounded')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.rounded)}</td>
            </tr>
            <tr className="border-t-2 border-grid-strong bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">{t('dcf.perShare')}</td>
              <td className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent">
                {formatIdr(sv.perShare)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
