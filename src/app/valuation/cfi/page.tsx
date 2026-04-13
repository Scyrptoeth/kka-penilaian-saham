'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeHistoricalUpstream, buildDcfInput } from '@/lib/calculations/upstream-helpers'
import { computeCfi } from '@/lib/calculations/cfi'
import type { YearKeyedSeries } from '@/types/financial'
import { formatIdr } from '@/components/financial/format'

const ROW_DEFS: { key: keyof ReturnType<typeof computeCfi>; label: string; bold?: boolean }[] = [
  { key: 'fcf', label: 'Free Cash Flow' },
  { key: 'nonOpCf', label: 'Add: Cash Flow from Non Operational' },
  { key: 'cfi', label: 'Cash Flow Available to Investor', bold: true },
]

export default function CfiPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers || !discountRateState) return null

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

    // Historical FCF row 20
    const historicalFcf: YearKeyedSeries = {}
    for (const y of histYears3) {
      historicalFcf[y] = upstream.allFcf[20]?.[y] ?? 0
    }

    // ── Projected FCF (via DCF) ──
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))
    const dcfResult = computeDcf(buildDcfInput({
      upstream, allBs, lastHistYear, projYears,
      proyNoplatRows, proyFaRows, proyCfsRows,
      wacc: dr.wacc, growthRate: upstream.growthRate,
    }))

    const projectedFcf: YearKeyedSeries = {}
    projYears.forEach((y, i) => { projectedFcf[y] = dcfResult.projectedFcf[i] ?? 0 })

    // ── Non-Op CF ──
    const isRows = incomeStatement.rows
    const historicalNonOpCf: YearKeyedSeries = {}
    for (const y of histYears3) { historicalNonOpCf[y] = isRows[30]?.[y] ?? 0 }

    const projectedNonOpCf: YearKeyedSeries = {}
    for (const y of projYears) { projectedNonOpCf[y] = pipeline.proyLrRows[34]?.[y] ?? 0 }

    const cfiResult = computeCfi({ historicalFcf, projectedFcf, historicalNonOpCf, projectedNonOpCf })
    const allYears = [...histYears3, ...projYears]
    return { cfiResult, histYears3, projYears, allYears }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Cash Flow to Investor (CFI)</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Data belum tersedia.</p>
          <p className="mt-1">Isi <strong>HOME</strong>, <strong>Balance Sheet</strong>, <strong>Income Statement</strong>, <strong>Key Drivers</strong>, dan <strong>Discount Rate</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { cfiResult, projYears, allYears } = data
  const projStart = projYears[0]!

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Cash Flow to Investor (CFI)</h1>
      <p className="mb-6 text-sm text-ink-muted">Arus kas yang tersedia untuk investor — historis dan proyeksi.</p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-grid">
              <th className="px-3 py-1 text-left font-medium text-ink-muted" />
              {data.histYears3.length > 0 && (
                <th colSpan={data.histYears3.length} className="px-3 py-1 text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
                  Historis
                </th>
              )}
              <th colSpan={projYears.length} className="px-3 py-1 text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
                Proyeksi
              </th>
            </tr>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
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
                <td className="px-3 py-2 text-ink">{def.label}</td>
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
