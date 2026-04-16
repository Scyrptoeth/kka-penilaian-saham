'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { computeEem } from '@/lib/calculations/eem-valuation'
import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { computeShareValue } from '@/lib/calculations/share-value'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeProporsiSaham } from '@/lib/store/useKkaStore'
import {
  computeHistoricalUpstream,
  buildAamInput, buildDcfInput, buildEemInput, buildBorrowingCapInput,
} from '@/lib/calculations/upstream-helpers'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/** Compact IDR formatter for chart axes */
function compactIdr(value: number): string {
  const abs = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)} T`
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)} M`
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(0)} Jt`
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)} Rb`
  return `${sign}${abs.toFixed(0)}`
}

function tooltipIdr(value: number): string {
  const abs = Math.abs(value)
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(abs)
  return value < 0 ? `(${formatted})` : formatted
}

const COLORS = {
  revenue: '#b8860b',
  netIncome: '#0a1628',
  assets: '#b8860b',
  liabilities: '#b91c1c',
  equity: '#15803d',
  dcf: '#0a1628',
  aam: '#b8860b',
  eem: '#64748b',
}

export default function DashboardPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const bcInput = useKkaStore(s => s.borrowingCapInput)
  const aamAdjustments = useKkaStore(s => s.aamAdjustments)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement) return null

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const ly = histYears4[histYears4.length - 1]!
    const isRows = incomeStatement.rows
    const proporsiSaham = computeProporsiSaham(home)

    // ── Chart 1: Revenue & Net Income ──
    const revenueData = histYears4.map(y => ({
      year: String(y),
      revenue: isRows[6]?.[y] ?? 0,
      netIncome: isRows[35]?.[y] ?? 0,
      type: 'hist',
    }))

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

    // ── Chart 2: BS Composition ──
    const bsData = histYears4.map(y => ({
      year: String(y),
      assets: allBs[26]?.[y] ?? 0,
      liabilities: allBs[40]?.[y] ?? 0,
      equity: allBs[48]?.[y] ?? 0,
    }))

    // ── Chart 3: Valuation Comparison ──
    const valuationData: Array<{ method: string; perShare: number }> = []
    const aamResult = computeAam(buildAamInput({ accounts: balanceSheet!.accounts, allBs, lastYear: ly, home, aamAdjustments }))
    // AAM ends at Market Value Portion (session 022). Per-share divides that
    // portion by the proportional share count (jumlahSahamBeredar × proporsiSaham).
    valuationData.push({
      method: 'AAM',
      perShare: aamResult.marketValuePortion / (home.jumlahSahamBeredar * proporsiSaham || 1),
    })

    // ── Historical upstream (computed once, reused for DCF + EEM + FCF chart) ──
    const upstream = computeHistoricalUpstream({
      balanceSheetRows: balanceSheet.rows,
      incomeStatementRows: incomeStatement.rows,
      fixedAssetRows: fixedAsset?.rows ?? null,
      accPayablesRows: null,
      allBs, histYears3, histYears4,
    })

    // DCF + EEM if data available
    if (keyDrivers && discountRateState && fixedAsset) {
      try {
        const pipeline = computeFullProjectionPipeline({
          home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
        })
        const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

        const dcfResult = computeDcf(buildDcfInput({
          upstream, allBs, lastHistYear: pipeline.lastHistYear, projYears: pipeline.projYears,
          proyNoplatRows: pipeline.proyNoplatRows, proyFaRows: pipeline.proyFaRows,
          proyCfsRows: pipeline.proyCfsRows,
          wacc: dr.wacc, growthRate: upstream.growthRate,
        }))

        const svDcf = computeShareValue({
          equityValue100: dcfResult.equityValue100,
          dlomPercent: home.dlomPercent, dlocPercent: 0,
          proporsiSaham, jumlahSahamBeredar: home.jumlahSahamBeredar,
        })
        valuationData.push({ method: 'DCF', perShare: svDcf.perShare })

        // EEM
        const bcData = computeBorrowingCap(buildBorrowingCapInput({ allBs, lastYear: ly, bcInput, dr }))
        const eemResult = computeEem(buildEemInput({
          aamResult, allBs, upstream, lastYear: ly,
          waccTangible: bcData.waccTangible, wacc: dr.wacc,
        }))
        const svEem = computeShareValue({
          equityValue100: eemResult.equityValue100,
          dlomPercent: home.dlomPercent, dlocPercent: home.dlocPercent,
          proporsiSaham, jumlahSahamBeredar: home.jumlahSahamBeredar,
        })
        valuationData.push({ method: 'EEM', perShare: svEem.perShare })
      } catch { /* DCF/EEM may fail */ }
    }

    // ── Chart 4: FCF Trend (reuse upstream — no duplicate computation) ──
    const fcfData = histYears3.map(y => ({
      year: String(y),
      fcf: upstream.allFcf[20]?.[y] ?? 0,
      type: 'hist',
    }))

    return { revenueData, bsData, valuationData, fcfData }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, bcInput, aamAdjustments])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1200px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section="RINGKASAN"
        title="Dashboard"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
        ]}
      />
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
                    <Cell key={entry.method} fill={i === 0 ? COLORS.aam : i === 1 ? COLORS.dcf : COLORS.eem} />
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
                <Line type="monotone" dataKey="fcf" name="FCF" stroke={COLORS.revenue} strokeWidth={2} dot={{ r: 4, fill: COLORS.revenue }} />
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
