'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
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
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { computeEem } from '@/lib/calculations/eem-valuation'
import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { computeShareValue } from '@/lib/calculations/share-value'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'

const BORROWING_PERCENT_DEFAULT = 0.7

/** Compact IDR formatter for chart axes — e.g. 1.5 T, 200 M, 50 Jt */
function compactIdr(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)} T`
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)} M`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)} Jt`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)} Rb`
  return `${sign}${abs.toFixed(0)}`
}

/** Tooltip formatter for charts */
function tooltipIdr(value: number): string {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(abs)
  return value < 0 ? `(${formatted})` : formatted
}

// Chart colors aligned with design system
const COLORS = {
  revenue: '#b8860b',    // accent (muted gold)
  netIncome: '#0a1628',  // ink (deep navy)
  assets: '#b8860b',
  liabilities: '#b91c1c', // negative (red-700)
  equity: '#15803d',      // positive (emerald-700)
  dcf: '#0a1628',
  aam: '#b8860b',
  eem: '#64748b',         // ink-muted
  fcfPositive: '#15803d',
  fcfNegative: '#b91c1c',
}

export default function DashboardPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const bcInput = useKkaStore(s => s.borrowingCapInput)
  const faAdjustment = useKkaStore(s => s.faAdjustment)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement) return null

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
    const allBs = { ...balanceSheet.rows, ...bsComp }
    const ly = histYears4[histYears4.length - 1]!
    const bs = (row: number) => allBs[row]?.[ly] ?? 0
    const isRows = incomeStatement.rows

    // ── Chart 1: Revenue & Net Income ──
    const revenueData = histYears4.map(y => ({
      year: String(y),
      revenue: isRows[6]?.[y] ?? 0,
      netIncome: isRows[35]?.[y] ?? 0,
      type: 'hist',
    }))

    // Add projections if available
    if (keyDrivers && fixedAsset) {
      const pipeline = computeFullProjectionPipeline({
        home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
      })
      for (const y of pipeline.projYears) {
        revenueData.push({
          year: String(y),
          revenue: pipeline.proyLrRows[6]?.[y] ?? 0,
          netIncome: pipeline.proyLrRows[39]?.[y] ?? 0,
          type: 'proj',
        })
      }
    }

    // ── Chart 2: BS Composition (last 4 years) ──
    const bsData = histYears4.map(y => ({
      year: String(y),
      assets: allBs[26]?.[y] ?? 0,       // Total Assets (row 26)
      liabilities: allBs[40]?.[y] ?? 0,   // Total Liabilities (row 40)
      equity: allBs[48]?.[y] ?? 0,         // Total Equity (row 48)
    }))

    // ── Chart 3: Valuation Comparison ──
    const proporsiSaham = computeProporsiSaham(home)
    const valuationData: Array<{ method: string; perShare: number }> = []

    // AAM always available with BS
    const aamResult = computeAam({
      cashOnHands: bs(8), cashOnBank: bs(9),
      accountReceivable: bs(10), otherReceivable: bs(11),
      inventory: bs(12), otherCurrentAssets: bs(14),
      fixedAssetNet: bs(22), otherNonCurrentAssets: bs(23),
      intangibleAssets: bs(24), totalNonCurrentAssets: bs(25),
      faAdjustment,
      bankLoanST: bs(31), accountPayable: bs(32),
      taxPayable: bs(33), otherCurrentLiabilities: bs(34),
      bankLoanLT: bs(38), relatedPartyNCL: bs(39),
      modalDisetor: bs(43), agioDisagio: bs(44),
      retainedCurrentYear: bs(46), retainedPriorYears: bs(47),
      dlomPercent: home.dlomPercent, dlocPercent: home.dlocPercent,
      proporsiSaham,
      paidUpCapitalDeduction: home.jumlahSahamBeredar * home.nilaiNominalPerSaham,
    })
    valuationData.push({ method: 'AAM', perShare: aamResult.finalValue / (home.jumlahSahamBeredar * proporsiSaham || 1) })

    // DCF if data available
    if (keyDrivers && discountRateState && fixedAsset) {
      try {
        const pipeline = computeFullProjectionPipeline({
          home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
        })
        const { faComp, proyNoplatRows, proyFaRows, proyCfsRows, projYears, lastHistYear } = pipeline

        const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, histYears3)
        const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
        const allNoplat = { ...noplatLeaf, ...noplatComp }

        const faRows = fixedAsset.rows
        const cfsLeaf = computeCashFlowLiveRows(balanceSheet.rows, incomeStatement.rows, faRows, null, histYears3, histYears4)
        const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, histYears3)
        const allCfs = { ...cfsLeaf, ...cfsComp }

        const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, histYears3)
        const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, histYears3)
        const allFcf = { ...fcfLeaf, ...fcfComp }
        const allFa = faComp ? { ...faRows, ...faComp } : {}
        const roicRows = computeRoicLiveRows(allFcf, allBs, histYears3)
        const grData = computeGrowthRateLive(allBs, allFa, roicRows, histYears3)
        const growthRate = grData?.result.average ?? 0
        const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

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
          excessCash: -(roicRows[10]?.[lastHistYear] ?? 0),
          idleAsset: -(roicRows[9]?.[lastHistYear] ?? 0),
        })

        const sv = computeShareValue({
          equityValue100: dcfResult.equityValue100,
          dlomPercent: home.dlomPercent, dlocPercent: 0,
          proporsiSaham, jumlahSahamBeredar: home.jumlahSahamBeredar,
        })
        valuationData.push({ method: 'DCF', perShare: sv.perShare })

        // EEM (reuse aam + dr)
        const bcData = computeBorrowingCap({
          piutangCalk: bcInput?.piutangCalk ?? 0,
          persediaanCalk: bcInput?.persediaanCalk ?? 0,
          bsReceivables: bs(10) + bs(11),
          bsInventory: bs(12),
          bsFixedAssetNet: bs(22),
          borrowingPercent: BORROWING_PERCENT_DEFAULT,
          costDebtAfterTax: dr.kd,
          costEquity: dr.ke,
        })
        const eemResult = computeEem({
          aamTotalCurrentAssets: aamResult.totalCurrentAssets,
          aamTotalNonCurrentAssets: aamResult.totalNonCurrentAssets,
          aamAccountPayable: bs(32), aamTaxPayable: bs(33),
          aamOtherCurrentLiabilities: bs(34),
          aamRelatedPartyNCL: bs(39), aamCashOnHands: bs(8),
          waccTangible: bcData.waccTangible,
          historicalNoplat: allNoplat[19]?.[ly] ?? 0,
          historicalDepreciation: allFa[51]?.[ly] ?? 0,
          historicalTotalWC: (allCfs[8]?.[ly] ?? 0) + (allCfs[9]?.[ly] ?? 0),
          historicalCapex: -(allFa[23]?.[ly] ?? 0),
          wacc: dr.wacc,
          interestBearingDebt: -((allBs[31]?.[ly] ?? 0) + (allBs[38]?.[ly] ?? 0)),
          nonOperatingAsset: bs(8),
        })
        const svEem = computeShareValue({
          equityValue100: eemResult.equityValue100,
          dlomPercent: home.dlomPercent, dlocPercent: home.dlocPercent,
          proporsiSaham, jumlahSahamBeredar: home.jumlahSahamBeredar,
        })
        valuationData.push({ method: 'EEM', perShare: svEem.perShare })
      } catch {
        // DCF/EEM may fail — skip
      }
    }

    // ── Chart 4: FCF Trend ──
    const fcfData: Array<{ year: string; fcf: number; type: string }> = []

    // Historical FCF
    const faRows = fixedAsset?.rows ?? null
    const faComp2 = faRows ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, histYears3) : null

    const noplatLeaf2 = computeNoplatLiveRows(incomeStatement.rows, histYears3)
    const noplatComp2 = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf2, histYears3)
    const allNoplat2 = { ...noplatLeaf2, ...noplatComp2 }

    const cfsLeaf2 = computeCashFlowLiveRows(balanceSheet.rows, incomeStatement.rows, faRows, null, histYears3, histYears4)
    const cfsComp2 = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf2, histYears3)
    const allCfs2 = { ...cfsLeaf2, ...cfsComp2 }

    const fcfLeaf2 = computeFcfLiveRows(allNoplat2, faComp2, allCfs2, histYears3)
    const fcfComp2 = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf2, histYears3)
    const allFcf2 = { ...fcfLeaf2, ...fcfComp2 }

    for (const y of histYears3) {
      fcfData.push({ year: String(y), fcf: allFcf2[20]?.[y] ?? 0, type: 'hist' })
    }

    return { revenueData, bsData, valuationData, fcfData }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, bcInput, faAdjustment])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1200px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1200px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Data belum tersedia.</p>
          <p className="mt-1">Isi <strong>HOME</strong>, <strong>Balance Sheet</strong>, dan <strong>Income Statement</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { revenueData, bsData, valuationData, fcfData } = data

  return (
    <div className="mx-auto max-w-[1200px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Dashboard</h1>
      <p className="mb-8 text-sm text-ink-muted">Ringkasan visual analisis keuangan dan hasil penilaian.</p>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Chart 1: Revenue & Net Income */}
        <div className="rounded border border-grid bg-canvas-raised p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-muted">Revenue & Net Income</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={compactIdr} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => tooltipIdr(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenue" name="Revenue" fill={COLORS.revenue} radius={[2, 2, 0, 0]} />
              <Bar dataKey="netIncome" name="Net Income" fill={COLORS.netIncome} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Balance Sheet Composition */}
        <div className="rounded border border-grid bg-canvas-raised p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-muted">Komposisi Neraca</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bsData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={compactIdr} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v) => tooltipIdr(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="assets" name="Total Assets" fill={COLORS.assets} radius={[2, 2, 0, 0]} />
              <Bar dataKey="liabilities" name="Total Liabilities" fill={COLORS.liabilities} radius={[2, 2, 0, 0]} />
              <Bar dataKey="equity" name="Total Equity" fill={COLORS.equity} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Valuation Comparison */}
        <div className="rounded border border-grid bg-canvas-raised p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-muted">Perbandingan Nilai Per Saham</h2>
          {valuationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={valuationData} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="method" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactIdr} tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v) => tooltipIdr(Number(v))} />
                <Bar dataKey="perShare" name="Per Saham (Rp)" radius={[2, 2, 0, 0]}>
                  {valuationData.map((entry, i) => (
                    <Cell
                      key={entry.method}
                      fill={i === 0 ? COLORS.dcf : i === 1 ? COLORS.aam : COLORS.eem}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-ink-muted">
              Belum ada data valuasi.
            </div>
          )}
        </div>

        {/* Chart 4: FCF Trend */}
        <div className="rounded border border-grid bg-canvas-raised p-4">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-ink-muted">Free Cash Flow</h2>
          {fcfData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={fcfData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={compactIdr} tick={{ fontSize: 11 }} width={70} />
                <Tooltip formatter={(v) => tooltipIdr(Number(v))} />
                <Line
                  type="monotone"
                  dataKey="fcf"
                  name="FCF"
                  stroke={COLORS.revenue}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COLORS.revenue }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center text-sm text-ink-muted">
              Belum ada data FCF.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
