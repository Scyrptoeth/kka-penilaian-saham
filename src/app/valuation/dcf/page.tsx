'use client'

import { useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeShareValue } from '@/lib/calculations/share-value'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeHistoricalUpstream, buildDcfInput } from '@/lib/calculations/upstream-helpers'
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
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers || !discountRateState || interestBearingDebt === null) return null

    // ── Projection pipeline (shared with PROY CFS, CFI, etc.) ──
    const pipeline = computeFullProjectionPipeline({
      home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
    })
    const { allBs, proyNoplatRows, proyFaRows, proyCfsRows, histYears3, projYears, lastHistYear } = pipeline

    // ── Historical upstream chain (shared helper) ──
    const upstream = computeHistoricalUpstream({
      balanceSheetRows: balanceSheet.rows,
      incomeStatementRows: incomeStatement.rows,
      fixedAssetRows: fixedAsset?.rows ?? null,
      accPayablesRows: null,
      allBs, histYears3, histYears4: pipeline.histYears4,
    })

    // ── Discount Rate ──
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

    // ── DCF ──
    const dcfResult = computeDcf(buildDcfInput({
      upstream, allBs, lastHistYear, projYears,
      proyNoplatRows, proyFaRows, proyCfsRows,
      wacc: dr.wacc, growthRate: upstream.growthRate,
      interestBearingDebt,
    }))

    // ── Share Value ──
    const proporsiSaham = computeProporsiSaham(home)
    const shareValue = computeShareValue({
      equityValue100: dcfResult.equityValue100,
      dlomPercent: home.dlomPercent,
      dlocPercent: 0,
      proporsiSaham,
      jumlahSahamBeredar: home.jumlahSahamBeredar,
    })

    return { dcfResult, shareValue, projYears, lastHistYear, dr, growthRate: upstream.growthRate, proporsiSaham, home }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, interestBearingDebt])

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
        ]}
      />
    )
  }

  const { dcfResult: r, shareValue: sv, projYears } = data

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
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('dcf.fcfYearRow', { year: data.lastHistYear })}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.historicalFcf)}</td>
            </tr>
            {r.projectedFcf.map((v, i) => (
              <tr key={projYears[i]} className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('dcf.fcfYearRow', { year: projYears[i] })}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>{formatIdr(v)}</td>
              </tr>
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
