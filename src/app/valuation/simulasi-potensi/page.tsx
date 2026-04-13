'use client'

import { useMemo, useState, useCallback } from 'react'
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
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeSimulasiPotensi, computeResistensiWp } from '@/lib/calculations/simulasi-potensi'
import { formatIdr, formatPercent } from '@/components/financial/format'

const BORROWING_PERCENT_DEFAULT = 0.7

type ValuationMethod = 'AAM' | 'DCF' | 'EEM'

export default function SimulasiPotensiPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const bcInput = useKkaStore(s => s.borrowingCapInput)
  const faAdjustment = useKkaStore(s => s.faAdjustment)
  const nilaiPengalihanDilaporkan = useKkaStore(s => s.nilaiPengalihanDilaporkan)
  const setNilaiPengalihanDilaporkan = useKkaStore(s => s.setNilaiPengalihanDilaporkan)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const [method, setMethod] = useState<ValuationMethod>('AAM')

  const handleNilaiChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setNilaiPengalihanDilaporkan(Number.isFinite(val) ? val : 0)
  }, [setNilaiPengalihanDilaporkan])

  // Compute equity values from all available methods
  const equityValues = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet) return null

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
    const allBs = { ...balanceSheet.rows, ...bsComp }
    const ly = histYears4[histYears4.length - 1]!
    const bs = (row: number) => allBs[row]?.[ly] ?? 0
    const proporsiSaham = computeProporsiSaham(home)

    // ── AAM ──
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

    const result: Record<ValuationMethod, number | null> = {
      AAM: aamResult.equityValue,
      DCF: null,
      EEM: null,
    }

    // ── DCF (requires IS + key drivers + DR) ──
    if (incomeStatement && keyDrivers && discountRateState) {
      try {
        const pipeline = computeFullProjectionPipeline({
          home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
        })
        const { faComp, proyNoplatRows, proyFaRows, proyCfsRows, projYears, lastHistYear } = pipeline

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
          interestBearingDebt: -((allBs[31]?.[ly] ?? 0) + (allBs[38]?.[ly] ?? 0)),
          excessCash: -(roicRows[10]?.[ly] ?? 0),
          idleAsset: -(roicRows[9]?.[ly] ?? 0),
        })
        result.DCF = dcfResult.equityValue100
      } catch {
        // DCF may fail if wacc === growthRate; leave as null
      }
    }

    // ── EEM (requires IS + DR + borrowingCap) ──
    if (incomeStatement && discountRateState) {
      try {
        const faRows = fixedAsset?.rows ?? null
        const faComp = faRows ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, histYears3) : null
        const allFa = faComp ? { ...faRows!, ...faComp } : {}

        const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, histYears3)
        const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, histYears3)
        const allNoplat = { ...noplatLeaf, ...noplatComp }

        const cfsLeaf = computeCashFlowLiveRows(balanceSheet.rows, incomeStatement.rows, faRows, null, histYears3, histYears4)
        const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, histYears3)
        const allCfs = { ...cfsLeaf, ...cfsComp }

        const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

        // Borrowing Cap — uses same fields as EEM page
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
          aamRelatedPartyNCL: bs(39),
          aamCashOnHands: bs(8),
          waccTangible: bcData.waccTangible,
          historicalNoplat: allNoplat[19]?.[ly] ?? 0,
          historicalDepreciation: allFa[51]?.[ly] ?? 0,
          historicalTotalWC: (allCfs[8]?.[ly] ?? 0) + (allCfs[9]?.[ly] ?? 0),
          historicalCapex: -(allFa[23]?.[ly] ?? 0),
          wacc: dr.wacc,
          interestBearingDebt: -((allBs[31]?.[ly] ?? 0) + (allBs[38]?.[ly] ?? 0)),
          nonOperatingAsset: bs(8),
        })
        result.EEM = eemResult.equityValue100
      } catch {
        // EEM may fail if wacc === 0; leave as null
      }
    }

    return result
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, bcInput, faAdjustment])

  // Compute simulasi from selected method
  const simulasi = useMemo(() => {
    if (!equityValues || !home) return null
    const equity = equityValues[method]
    if (equity === null) return null

    return computeSimulasiPotensi({
      equityValue100: equity,
      dlomPercent: home.dlomPercent,
      dlocPercent: home.dlocPercent,
      proporsiKepemilikan: computeProporsiSaham(home),
      nilaiPengalihanDilaporkan,
    })
  }, [equityValues, home, method, nilaiPengalihanDilaporkan])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!equityValues || !home) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Simulasi Potensi PPh</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Data belum tersedia.</p>
          <p className="mt-1">Isi <strong>HOME</strong> dan <strong>Balance Sheet</strong> minimal.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Simulasi Potensi PPh</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Simulasi potensi Pajak Penghasilan kurang bayar atas pengalihan saham berdasarkan valuasi.
      </p>

      {/* Controls */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-grid bg-canvas-raised p-4">
          <label htmlFor="method" className="mb-1 block text-sm font-medium text-ink">
            Metode Valuasi
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as ValuationMethod)}
            className="w-full rounded border border-grid bg-canvas px-3 py-2 text-sm text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <option value="AAM">AAM (Adjusted Asset Method)</option>
            <option value="DCF" disabled={equityValues.DCF === null}>
              DCF (Discounted Cash Flow){equityValues.DCF === null ? ' — data belum lengkap' : ''}
            </option>
            <option value="EEM" disabled={equityValues.EEM === null}>
              EEM (Excess Earnings Method){equityValues.EEM === null ? ' — data belum lengkap' : ''}
            </option>
          </select>
        </div>

        <div className="rounded border border-grid bg-canvas-raised p-4">
          <label htmlFor="nilaiPengalihan" className="mb-1 block text-sm font-medium text-ink">
            Nilai Pengalihan yang Dilaporkan (Rp)
          </label>
          <input
            id="nilaiPengalihan"
            type="number"
            min={0}
            step="any"
            value={nilaiPengalihanDilaporkan || ''}
            onChange={handleNilaiChange}
            placeholder="0"
            className="w-full rounded border border-grid bg-canvas px-3 py-2 font-mono text-sm tabular-nums text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          />
        </div>
      </div>

      {/* Equity Values Comparison */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Metode</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">Equity Value (100%)</th>
            </tr>
          </thead>
          <tbody>
            {(['AAM', 'DCF', 'EEM'] as const).map(m => {
              const val = equityValues[m]
              const isActive = m === method
              return (
                <tr
                  key={m}
                  className={`border-b border-grid ${isActive ? 'bg-canvas-raised font-semibold' : ''}`}
                >
                  <td className="px-3 py-2 text-ink">
                    {m}
                    {isActive && <span className="ml-2 text-xs text-accent">● aktif</span>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {val !== null ? formatIdr(val) : <span className="text-ink-muted">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Simulasi Result */}
      {simulasi ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-grid-strong">
                <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
                <th className="px-3 py-2 text-right font-medium text-ink-muted">Nilai</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">Equity Value (100%) — {method}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(equityValues[method]!)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">DLOM ({formatPercent(home.dlomPercent)})</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(simulasi.dlomAmount)}</td>
              </tr>
              <tr className="border-b border-grid font-semibold">
                <td className="px-3 py-2 text-ink">Equity Less DLOM</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(simulasi.equityLessDlom)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">DLOC/PFC ({formatPercent(home.dlocPercent)})</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(simulasi.dlocAmount)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">Resistensi WP</td>
                <td className="px-3 py-2 text-right text-ink-muted">{computeResistensiWp('Moderat', 'Moderat')}</td>
              </tr>
              <tr className="border-b border-grid font-semibold">
                <td className="px-3 py-2 text-ink">Market Value of Equity (100%)</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(simulasi.marketValueEquity100)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">Proporsi Saham ({formatPercent(computeProporsiSaham(home))})</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(simulasi.marketValuePortion)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">Nilai Pengalihan Dilaporkan</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(nilaiPengalihanDilaporkan)}</td>
              </tr>
              <tr className="border-b-2 border-grid-strong bg-canvas-raised font-semibold">
                <td className="px-3 py-2 text-ink">Potensi Pengalihan Belum Dikenakan Pajak</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${simulasi.potensiPengalihan < 0 ? 'text-negative' : ''}`}>
                  {formatIdr(simulasi.potensiPengalihan)}
                </td>
              </tr>

              {/* PPh Progressive Tax */}
              <tr className="border-t-2 border-grid-strong">
                <td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  PPh Pasal 17 — Tarif Progresif
                </td>
              </tr>
              {simulasi.taxBrackets.map((bracket, i) => (
                <tr key={i} className="border-b border-grid">
                  <td className="px-3 py-2 pl-6 text-ink">
                    {formatPercent(bracket.rate)} × {formatIdr(bracket.taxableAmount)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    {formatIdr(bracket.tax)}
                  </td>
                </tr>
              ))}

              <tr className="border-t-2 border-grid-strong bg-canvas-raised">
                <td className="px-3 py-3 font-semibold text-ink">Total Potensi PPh Kurang Bayar</td>
                <td className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent">
                  {formatIdr(simulasi.totalPPhKurangBayar)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          Data metode {method} belum tersedia. Isi input yang dibutuhkan terlebih dahulu.
        </div>
      )}
    </div>
  )
}
