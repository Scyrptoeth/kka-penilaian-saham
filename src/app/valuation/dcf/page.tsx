'use client'

import { useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeShareValue } from '@/lib/calculations/share-value'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeHistoricalUpstream, buildDcfInput } from '@/lib/calculations/upstream-helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'

export default function DcfPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers || !discountRateState) return null

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
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Discounted Cash Flow (DCF)</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Data belum tersedia.</p>
          <p className="mt-1">Isi <strong>HOME</strong>, <strong>Balance Sheet</strong>, <strong>Income Statement</strong>, <strong>Key Drivers</strong>, dan <strong>Discount Rate</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { dcfResult: r, shareValue: sv, projYears } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Discounted Cash Flow (DCF)</h1>
      <p className="mb-6 text-sm text-ink-muted">Metode arus kas terdiskonto — valuasi berdasarkan proyeksi FCF.</p>

      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {/* FCF */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Free Cash Flow</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">FCF ({data.lastHistYear})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.historicalFcf)}</td>
            </tr>
            {r.projectedFcf.map((v, i) => (
              <tr key={projYears[i]} className="border-b border-grid">
                <td className="px-3 py-2 text-ink">FCF ({projYears[i]})</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : ''}`}>{formatIdr(v)}</td>
              </tr>
            ))}

            {/* Discounting */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Discounting</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">WACC</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.dr.wacc)}</td>
            </tr>
            {r.discountFactors.map((df, i) => (
              <tr key={`df-${i}`} className="border-b border-grid">
                <td className="px-3 py-2 pl-6 text-ink">Discount Factor ({projYears[i]})</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{df.toFixed(6)}</td>
              </tr>
            ))}
            <tr className="border-t border-grid-strong bg-canvas-raised font-semibold">
              <td className="px-3 py-2 text-ink">Total PV of FCF</td>
              <td className={`px-3 py-2 text-right font-mono tabular-nums ${r.totalPvFcf < 0 ? 'text-negative' : ''}`}>{formatIdr(r.totalPvFcf)}</td>
            </tr>

            {/* Terminal Value */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Terminal Value</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Growth Rate</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.growthRate)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Terminal Value</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.terminalValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">PV of Terminal Value</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.pvTerminal)}</td>
            </tr>
            <tr className="border-t border-grid-strong bg-canvas-raised font-semibold">
              <td className="px-3 py-2 text-ink">Enterprise Value</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.enterpriseValue)}</td>
            </tr>

            {/* Equity → Share Value */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Equity → Share Value</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Equity Value (100%)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityValue100)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">DLOM ({formatPercent(data.home.dlomPercent)})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(sv.dlomDiscount)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Market Value (100%)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.marketValue100)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Market Value ({formatPercent(data.proporsiSaham)} Equity)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.marketValuePortion)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Rounded</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.rounded)}</td>
            </tr>
            <tr className="border-t-2 border-grid-strong bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">Nilai Per Saham (DCF)</td>
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
