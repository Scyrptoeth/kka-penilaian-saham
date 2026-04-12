'use client'

import { useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { computeGrowthRateLive } from '@/data/live/compute-growth-rate-live'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeProyNoplatLive, type ProyNoplatInput } from '@/data/live/compute-proy-noplat-live'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { computeProyAccPayablesLive } from '@/data/live/compute-proy-acc-payables-live'
import { computeProyCfsLive, type ProyCfsInput } from '@/data/live/compute-proy-cfs-live'
import { computeDiscountRate } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeShareValue } from '@/lib/calculations/share-value'
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

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const lastHistYear = home.tahunTransaksi - 1

    // ── Historical upstream chain ──
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
    const allBs = { ...balanceSheet.rows, ...bsComp }

    const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, histYears3)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    const faRows = fixedAsset?.rows ?? null
    const faComp = faRows ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, histYears3) : null
    const allFa = faComp ? { ...(faRows ?? {}), ...faComp } : {}

    const cfsLeaf = computeCashFlowLiveRows(balanceSheet.rows, incomeStatement.rows, faRows, null, histYears3, histYears4)
    const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, histYears3)
    const allCfs = { ...cfsLeaf, ...cfsComp }

    // ── Projected upstream chain (same as PROY CFS page) ──
    let proyFaRows: Record<number, Record<number, number>> = {}
    if (fixedAsset) {
      const allFaHist = { ...fixedAsset.rows, ...(faComp ?? {}) }
      proyFaRows = computeProyFixedAssetsLive(allFaHist, histYears3, projYears)
    }

    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[lastHistYear] ?? 0

    const lrInput: ProyLrInput = {
      keyDrivers,
      revenueGrowth: computeAvgGrowth(isRows[6] ?? {}),
      interestIncomeGrowth: computeAvgGrowth(isRows[26] ?? {}),
      interestExpenseGrowth: computeAvgGrowth(isRows[27] ?? {}),
      nonOpIncomeGrowth: computeAvgGrowth(isRows[30] ?? {}),
      isLastYear: {
        revenue: isVal(6), cogs: isVal(7), grossProfit: isVal(8),
        sellingOpex: isVal(12), gaOpex: isVal(13),
        depreciation: -(isVal(21) ?? 0),
        interestIncome: isVal(26), interestExpense: isVal(27),
        nonOpIncome: isVal(30), tax: isVal(33),
      },
      proyFaDepreciation: proyFaRows[51] ?? {},
    }
    const proyLrRows = computeProyLrLive(lrInput, lastHistYear, projYears)

    const histPbt = isVal(32)
    const histTax = isVal(33)
    const histTaxRate = histPbt !== 0 ? Math.abs(histTax / histPbt) : 0
    const noplatInput: ProyNoplatInput = {
      proyLrRows,
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
    const proyNoplatRows = computeProyNoplatLive(noplatInput, lastHistYear, projYears)

    // BS average growth + last year for PROY BS
    const bsAvgGrowth: Record<number, number> = {}
    const bsLastYear: Record<number, number> = {}
    for (const [rowStr, series] of Object.entries(balanceSheet.rows)) {
      const row = Number(rowStr)
      bsAvgGrowth[row] = computeAvgGrowth(series)
      bsLastYear[row] = series[lastHistYear] ?? 0
    }

    const bsInput: ProyBsInput = {
      bsLastYear, bsAvgGrowth, proyFaRows,
      proyLrNetProfit: proyLrRows[39] ?? {},
      intangibleGrowth: bsAvgGrowth[24] ?? 0,
    }
    const proyBsRows = computeProyBsLive(bsInput, lastHistYear, projYears)

    const proyApRows = computeProyAccPayablesLive({
      interestRateST: keyDrivers.financialDrivers.interestRateShortTerm,
      interestRateLT: keyDrivers.financialDrivers.interestRateLongTerm,
      stEnding: bsLastYear[31] ?? 0,
      ltEnding: bsLastYear[38] ?? 0,
    }, lastHistYear, projYears)

    const histCashEnding = (allBs[8]?.[lastHistYear] ?? 0) + (allBs[9]?.[lastHistYear] ?? 0)
    const cfsInput: ProyCfsInput = {
      proyLrRows, proyBsRows, proyFaRows, proyApRows,
      histCashEnding,
    }
    const proyCfsRows = computeProyCfsLive(cfsInput, lastHistYear, projYears)

    // ── Discount Rate ──
    const dr = computeDiscountRate({
      taxRate: discountRateState.taxRate,
      riskFree: discountRateState.riskFree,
      beta: discountRateState.beta,
      erp: discountRateState.equityRiskPremium,
      countrySpread: discountRateState.countryDefaultSpread,
      debtRate: discountRateState.bankRates.length > 0
        ? discountRateState.bankRates.reduce((s, b) => s + b.rate, 0) / discountRateState.bankRates.length
        : 0,
      der: discountRateState.derIndustry,
    })

    // ── Growth Rate ──
    const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, histYears3)
    const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, histYears3)
    const allFcf = { ...fcfLeaf, ...fcfComp }
    const roicRows = computeRoicLiveRows(allFcf, allBs, histYears3)
    const grData = computeGrowthRateLive(allBs, allFa, roicRows, histYears3)
    const growthRate = grData?.result.average ?? 0

    // ── DCF ──
    const dcfResult = computeDcf({
      historicalNoplat: allNoplat[19]?.[lastHistYear] ?? 0,
      historicalDepreciation: allFa[51]?.[lastHistYear] ?? 0,
      historicalChangesCA: allCfs[8]?.[lastHistYear] ?? 0,
      historicalChangesCL: allCfs[9]?.[lastHistYear] ?? 0,
      historicalCapex: -(allFa[23]?.[lastHistYear] ?? 0),
      projectedNoplat: projYears.map(y => proyNoplatRows[19]?.[y] ?? 0),
      projectedDepreciation: projYears.map(y => proyFaRows[51]?.[y] ?? 0),
      projectedChangesCA: projYears.map(y => proyCfsRows[8]?.[y] ?? 0),
      projectedChangesCL: projYears.map(y => proyCfsRows[9]?.[y] ?? 0),
      projectedCapex: projYears.map(y => -(proyFaRows[23]?.[y] ?? 0)),
      wacc: dr.wacc,
      growthRate,
      interestBearingDebt: -((allBs[31]?.[lastHistYear] ?? 0) + (allBs[38]?.[lastHistYear] ?? 0)),
      excessCash: allBs[8]?.[lastHistYear] ?? 0,
      idleAsset: 0,
    })

    // ── Share Value ──
    const proporsiSaham = computeProporsiSaham(home)
    const shareValue = computeShareValue({
      equityValue100: dcfResult.equityValue100,
      dlomPercent: home.dlomPercent,
      dlocPercent: 0,
      proporsiSaham,
      jumlahSahamBeredar: home.jumlahSahamBeredar,
    })

    return { dcfResult, shareValue, projYears, lastHistYear, dr, growthRate, proporsiSaham, home }
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
