'use client'

import { useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'

import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { BORROWING_PERCENT_DEFAULT } from '@/lib/calculations/upstream-helpers'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { computeEem } from '@/lib/calculations/eem-valuation'
import { computeShareValue } from '@/lib/calculations/share-value'
import { formatIdr, formatPercent } from '@/components/financial/format'

export default function EemPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const accPayables = useKkaStore(s => s.accPayables)
  const discountRateState = useKkaStore(s => s.discountRate)
  const bcInput = useKkaStore(s => s.borrowingCapInput)
  const faAdjustment = useKkaStore(s => s.faAdjustment)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !discountRateState) return null

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const lastHistYear = home.tahunTransaksi - 1

    // ── BS computed ──
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const bs = (row: number) => allBs[row]?.[lastHistYear] ?? 0

    // ── Historical NOPLAT ──
    const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, histYears3)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    // ── Historical FA ──
    const faRows = fixedAsset?.rows ?? null
    const faComp = faRows ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, histYears3) : null
    const allFa = faComp ? { ...(faRows ?? {}), ...faComp } : {}

    // ── Historical CFS ──
    const cfsLeaf = computeCashFlowLiveRows(balanceSheet.rows, incomeStatement.rows, faRows, accPayables?.rows ?? null, histYears3, histYears4)
    const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, histYears3)
    const allCfs = { ...cfsLeaf, ...cfsComp }

    // ── Discount Rate — uses buildDiscountRateInput for correct debtRate conversion ──
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

    // ── Borrowing Cap ──
    const bc = computeBorrowingCap({
      piutangCalk: bcInput?.piutangCalk ?? 0,
      persediaanCalk: bcInput?.persediaanCalk ?? 0,
      bsReceivables: bs(10) + bs(11),
      bsInventory: bs(12),
      bsFixedAssetNet: bs(22),
      borrowingPercent: BORROWING_PERCENT_DEFAULT,
      costDebtAfterTax: dr.kd,
      costEquity: dr.ke,
    })

    // ── AAM (for adjusted values) ──
    const proporsiSaham = computeProporsiSaham(home)
    const aam = computeAam({
      cashOnHands: bs(8),
      cashOnBank: bs(9),
      accountReceivable: bs(10),
      otherReceivable: bs(11),
      inventory: bs(12),
      otherCurrentAssets: bs(14),
      fixedAssetNet: bs(22),
      otherNonCurrentAssets: bs(23),
      intangibleAssets: bs(24),
      totalNonCurrentAssets: bs(25),
      faAdjustment,
      bankLoanST: bs(31),
      accountPayable: bs(32),
      taxPayable: bs(33),
      otherCurrentLiabilities: bs(34),
      bankLoanLT: bs(38),
      relatedPartyNCL: bs(39),
      modalDisetor: bs(43),
      agioDisagio: bs(44),
      retainedCurrentYear: bs(46),
      retainedPriorYears: bs(47),
      dlomPercent: home.dlomPercent,
      dlocPercent: home.dlocPercent,
      proporsiSaham,
      paidUpCapitalDeduction: home.jumlahSahamBeredar * home.nilaiNominalPerSaham,
    })

    // ── EEM ──
    const eemResult = computeEem({
      aamTotalCurrentAssets: aam.totalCurrentAssets,
      aamTotalNonCurrentAssets: aam.totalNonCurrentAssets,
      aamAccountPayable: bs(32), // adjusted = same as historical (adj=0)
      aamTaxPayable: bs(33),
      aamOtherCurrentLiabilities: bs(34),
      aamRelatedPartyNCL: bs(39),
      aamCashOnHands: bs(8),
      waccTangible: bc.waccTangible,
      historicalNoplat: allNoplat[19]?.[lastHistYear] ?? 0,
      historicalDepreciation: allFa[51]?.[lastHistYear] ?? 0,
      historicalTotalWC: allCfs[10]?.[lastHistYear] ?? 0,
      historicalCapex: -(allFa[23]?.[lastHistYear] ?? 0),
      wacc: dr.wacc,
      interestBearingDebt: -(bs(31) + bs(38)),
      nonOperatingAsset: bs(8),
    })

    // ── Share Value ──
    const sv = computeShareValue({
      equityValue100: eemResult.equityValue100,
      dlomPercent: home.dlomPercent,
      dlocPercent: 0, // EEM uses 0 for DLOC
      proporsiSaham,
      jumlahSahamBeredar: home.jumlahSahamBeredar,
    })

    return { eemResult, sv, bc, proporsiSaham, home }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, accPayables, discountRateState, bcInput, faAdjustment])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Excess Earnings Method (EEM)</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Data belum tersedia.</p>
          <p className="mt-1">Isi <strong>HOME</strong>, <strong>Balance Sheet</strong>, <strong>Income Statement</strong>, dan <strong>Discount Rate</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { eemResult: r, sv } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Excess Earnings Method (EEM)</h1>
      <p className="mb-6 text-sm text-ink-muted">Metode Kapitalisasi Kelebihan Pendapatan — valuasi berdasarkan excess earning di atas normal return.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">Nilai</th>
            </tr>
          </thead>
          <tbody>
            {/* NTA + Return */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Net Tangible Asset</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Net Tangible Asset Value</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.netTangibleAsset)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Return Rate (Borrowing Cap)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.bc.waccTangible)}</td>
            </tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">Earning Return on NTA</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.earningReturn)}</td>
            </tr>

            {/* Historical FCF */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Historical Free Cash Flow</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Gross Cash Flow</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.grossCashFlow)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Gross Investment</td>
              <td className={`px-3 py-2 text-right font-mono tabular-nums ${r.grossInvestment < 0 ? 'text-negative' : ''}`}>{formatIdr(r.grossInvestment)}</td>
            </tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">Free Cash Flow</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.fcf)}</td>
            </tr>

            {/* Excess Earning */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Excess Earning</td></tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Excess Earning (FCF - Normal Return)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.excessEarning)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Capitalized Excess Earning (/ WACC)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.capitalizedExcess)}</td>
            </tr>

            {/* Enterprise → Equity */}
            <tr className="border-t-2 border-grid-strong"><td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">Enterprise & Equity Value</td></tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">Enterprise Value (NTA + Capitalized Excess)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.enterpriseValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Equity Value (100%)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityValue100)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">DLOM ({formatPercent(data.home.dlomPercent)})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(sv.dlomDiscount)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Equity Less DLOM</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.equityLessDlom)}</td>
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
              <td className="px-3 py-2 text-ink">Rounded (ROUNDUP)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(sv.rounded)}</td>
            </tr>

            {/* Per Share */}
            <tr className="border-t-2 border-grid-strong bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">Nilai Per Saham (EEM)</td>
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
