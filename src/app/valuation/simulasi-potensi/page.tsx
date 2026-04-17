'use client'

import { useMemo, useState, useCallback } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeDcf } from '@/lib/calculations/dcf'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { computeEem } from '@/lib/calculations/eem-valuation'
import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { computeSimulasiPotensi, computeResistensiWp } from '@/lib/calculations/simulasi-potensi'
import {
  computeHistoricalUpstream,
  buildAamInput, buildDcfInput, buildEemInput, buildBorrowingCapInput,
  deriveDlomRiskCategory, deriveDlocRiskCategory,
} from '@/lib/calculations/upstream-helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

type ValuationMethod = 'AAM' | 'DCF' | 'EEM'

export default function SimulasiPotensiPage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const discountRateState = useKkaStore(s => s.discountRate)
  const bcInput = useKkaStore(s => s.borrowingCapInput)
  const aamAdjustments = useKkaStore(s => s.aamAdjustments)
  const nilaiPengalihanDilaporkan = useKkaStore(s => s.nilaiPengalihanDilaporkan)
  const setNilaiPengalihanDilaporkan = useKkaStore(s => s.setNilaiPengalihanDilaporkan)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const [method, setMethod] = useState<ValuationMethod>('AAM')

  const handleNilaiChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value)
    setNilaiPengalihanDilaporkan(Number.isFinite(val) ? val : 0)
  }, [setNilaiPengalihanDilaporkan])

  const equityValues = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet) return null

    const histYears4 = computeHistoricalYears(home.tahunTransaksi, 4)
    const histYears3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears4)
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const ly = histYears4[histYears4.length - 1]!

    // ── AAM (always available with BS) ──
    const aamResult = computeAam(buildAamInput({ accounts: balanceSheet!.accounts, allBs, lastYear: ly, home, aamAdjustments }))

    const result: Record<ValuationMethod, number | null> = {
      AAM: aamResult.equityValue,
      DCF: null,
      EEM: null,
    }

    // ── DCF + EEM (require IS + DR) ──
    if (incomeStatement && discountRateState) {
      const upstream = computeHistoricalUpstream({
        balanceSheetRows: balanceSheet.rows,
        incomeStatementRows: incomeStatement.rows,
        fixedAssetRows: fixedAsset?.rows ?? null,
        accPayablesRows: null,
        allBs, histYears3, histYears4,
      })
      const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

      // DCF (also needs keyDrivers for projection pipeline)
      if (keyDrivers) {
        try {
          const pipeline = computeFullProjectionPipeline({
            home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
          })
          const dcfResult = computeDcf(buildDcfInput({
            upstream, allBs, lastHistYear: pipeline.lastHistYear, projYears: pipeline.projYears,
            proyNoplatRows: pipeline.proyNoplatRows, proyFaRows: pipeline.proyFaRows,
            proyCfsRows: pipeline.proyCfsRows,
            wacc: dr.wacc, growthRate: upstream.growthRate,
          }))
          result.DCF = dcfResult.equityValue100
        } catch { /* DCF may fail if wacc === growthRate */ }
      }

      // EEM
      try {
        const bcData = computeBorrowingCap(buildBorrowingCapInput({ allBs, lastYear: ly, bcInput, dr }))
        const eemResult = computeEem(buildEemInput({
          aamResult, allBs, upstream, lastYear: ly,
          waccTangible: bcData.waccTangible, wacc: dr.wacc,
        }))
        result.EEM = eemResult.equityValue100
      } catch { /* EEM may fail if wacc === 0 */ }
    }

    return result
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers, discountRateState, bcInput, aamAdjustments])

  // Derive risk categories from actual DLOM/DLOC percentages (not hardcoded!)
  const dlomRisk = home ? deriveDlomRiskCategory(home.dlomPercent) : 'Moderat'
  const dlocRisk = home ? deriveDlocRiskCategory(home.dlocPercent) : 'Moderat'
  const resistensiWp = computeResistensiWp(dlomRisk, dlocRisk)

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
      jenisSubjekPajak: home.jenisSubjekPajak,
    })
  }, [equityValues, home, method, nilaiPengalihanDilaporkan])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">{t('common.loadingData')}</div>
  }

  if (!equityValues || !home) {
    return (
      <PageEmptyState
        section={t('nav.group.valuation')}
        title={t('nav.item.simulasiPotensi')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
        ]}
      />
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('simulasi.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">{t('simulasi.subtitle')}</p>

      {/* Controls */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-grid bg-canvas-raised p-4">
          <label htmlFor="method" className="mb-1 block text-sm font-medium text-ink">
            {t('simulasi.methodLabel')}
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as ValuationMethod)}
            className="w-full rounded border border-grid bg-canvas px-3 py-2 text-sm text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <option value="AAM">{t('simulasi.method.aam')}</option>
            <option value="DCF" disabled={equityValues.DCF === null}>
              {t('simulasi.method.dcf')}{equityValues.DCF === null ? t('simulasi.dataIncomplete') : ''}
            </option>
            <option value="EEM" disabled={equityValues.EEM === null}>
              {t('simulasi.method.eem')}{equityValues.EEM === null ? t('simulasi.dataIncomplete') : ''}
            </option>
          </select>
        </div>

        <div className="rounded border border-grid bg-canvas-raised p-4">
          <label htmlFor="nilaiPengalihan" className="mb-1 block text-sm font-medium text-ink">
            {t('simulasi.nilaiPengalihanLabel')}
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
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('simulasi.table.method')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('simulasi.table.equityValue')}</th>
            </tr>
          </thead>
          <tbody>
            {(['AAM', 'DCF', 'EEM'] as const).map(m => {
              const val = equityValues[m]
              const isActive = m === method
              return (
                <tr key={m} className={`border-b border-grid ${isActive ? 'bg-canvas-raised font-semibold' : ''}`}>
                  <td className="px-3 py-2 text-ink">
                    {m}
                    {isActive && <span className="ml-2 text-xs text-accent">{t('simulasi.active')}</span>}
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
                <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
                <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('common.value')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('simulasi.table.equityValue')} — {method}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(equityValues[method]!)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('dcf.dlomWithPercentRow', { pct: formatPercent(home.dlomPercent) })}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(simulasi.dlomAmount)}</td>
              </tr>
              <tr className="border-b border-grid font-semibold">
                <td className="px-3 py-2 text-ink">{t('simulasi.equityLessDlom')}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(simulasi.equityLessDlom)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('simulasi.dlocWithPercentRow', { pct: formatPercent(home.dlocPercent) })}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(simulasi.dlocAmount)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('simulasi.resistensiWp')}</td>
                <td className="px-3 py-2 text-right text-ink-muted">{resistensiWp}</td>
              </tr>
              <tr className="border-b border-grid font-semibold">
                <td className="px-3 py-2 text-ink">{t('simulasi.mvEquity100')}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(simulasi.marketValueEquity100)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('simulasi.proporsiSahamRow', { pct: formatPercent(computeProporsiSaham(home)) })}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(simulasi.marketValuePortion)}</td>
              </tr>
              <tr className="border-b border-grid">
                <td className="px-3 py-2 text-ink">{t('simulasi.nilaiPengalihanDilaporkan')}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(nilaiPengalihanDilaporkan)}</td>
              </tr>
              <tr className="border-b-2 border-grid-strong bg-canvas-raised font-semibold">
                <td className="px-3 py-2 text-ink">{t('simulasi.potensiPengalihan')}</td>
                <td className={`px-3 py-2 text-right font-mono tabular-nums ${simulasi.potensiPengalihan < 0 ? 'text-negative' : ''}`}>
                  {formatIdr(simulasi.potensiPengalihan)}
                </td>
              </tr>

              {/* PPh Progressive Tax */}
              <tr className="border-t-2 border-grid-strong">
                <td colSpan={2} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">
                  {t('simulasi.pphProgressive')}
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
                <td className="px-3 py-3 font-semibold text-ink">{t('simulasi.totalPPh')}</td>
                <td className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent">
                  {formatIdr(simulasi.totalPPhKurangBayar)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          {method} {t('simulasi.methodNotAvailable')}
        </div>
      )}
    </div>
  )
}
