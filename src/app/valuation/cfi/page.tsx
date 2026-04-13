'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
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
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
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
    const { allBs, faComp, proyNoplatRows, proyFaRows, proyCfsRows, histYears3, histYears4, projYears, lastHistYear } = pipeline

    // ── Historical upstream for FCF ──
    const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, histYears3)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    const faRows = fixedAsset?.rows ?? null
    const cfsLeaf = computeCashFlowLiveRows(balanceSheet.rows, incomeStatement.rows, faRows, null, histYears3, histYears4)
    const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, histYears3)
    const allCfs = { ...cfsLeaf, ...cfsComp }

    const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, histYears3)
    const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, histYears3)
    const allFcf = { ...fcfLeaf, ...fcfComp }

    // Historical FCF row 20
    const historicalFcf: YearKeyedSeries = {}
    for (const y of histYears3) {
      historicalFcf[y] = allFcf[20]?.[y] ?? 0
    }

    // ── Projected FCF (via DCF computation) ──
    const allFa = faComp ? { ...(faRows ?? {}), ...faComp } : {}
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

    const projectedFcf: YearKeyedSeries = {}
    projYears.forEach((y, i) => {
      projectedFcf[y] = dcfResult.projectedFcf[i] ?? 0
    })

    // ── Non-Op CF ──
    const isRows = incomeStatement.rows
    const historicalNonOpCf: YearKeyedSeries = {}
    for (const y of histYears3) {
      historicalNonOpCf[y] = isRows[30]?.[y] ?? 0
    }

    const proyLrRows = pipeline.proyLrRows
    const projectedNonOpCf: YearKeyedSeries = {}
    for (const y of projYears) {
      projectedNonOpCf[y] = proyLrRows[34]?.[y] ?? 0
    }

    // ── Compute CFI ──
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

  const { cfiResult, histYears3, projYears, allYears } = data
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
              {histYears3.length > 0 && (
                <th colSpan={histYears3.length} className="px-3 py-1 text-center text-xs font-medium uppercase tracking-wider text-ink-muted">
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
