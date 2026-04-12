'use client'

import { useMemo } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { formatIdr, formatPercent } from '@/components/financial/format'

/** Row definitions for the 3-column adjusted balance sheet display. */
type AamRowDef = {
  label?: string
  /** Row key for BS store (F column = last year). */
  bsRow?: number
  /** Whether this is a computed total row (render bold). */
  bold?: boolean
  /** Section header text (render as divider). */
  section?: string
  /** Key in AAM result to show in adjusted (E) column. */
  resultKey?: string
}

const ASSET_ROWS: AamRowDef[] = [
  { section: 'Aktiva Lancar' },
  { label: 'Cash on Hands', bsRow: 8 },
  { label: 'Cash on Bank (Deposit)', bsRow: 9 },
  { label: 'Account Receivable', bsRow: 10 },
  { label: 'Other Receivable', bsRow: 11 },
  { label: 'Inventory', bsRow: 12 },
  { label: 'Others', bsRow: 14 },
  { label: 'Total Current Assets', bold: true, resultKey: 'totalCurrentAssets' },
  { section: 'Aktiva Tidak Lancar' },
  { label: 'Fixed Asset Net', bsRow: 22, resultKey: 'adjustedFixedAssetNet' },
  { label: 'Other Non-Current Assets', bsRow: 23 },
  { label: 'Total Non-Current Assets', bold: true, resultKey: 'totalNonCurrentAssets' },
  { label: 'Intangible Assets', bsRow: 24 },
  { label: 'TOTAL ASSETS', bold: true, resultKey: 'totalAssets' },
]

const LIABILITY_ROWS: AamRowDef[] = [
  { section: 'Kewajiban Lancar' },
  { label: 'Bank Loan (Short Term)', bsRow: 31 },
  { label: 'Account Payable', bsRow: 32 },
  { label: 'Tax Payable', bsRow: 33 },
  { label: 'Others Current Liabilities', bsRow: 34 },
  { label: 'Total Current Liabilities', bold: true, resultKey: 'totalCurrentLiabilities' },
  { section: 'Kewajiban Jangka Panjang' },
  { label: 'Bank Loan (Long Term)', bsRow: 38 },
  { label: 'Related Party', bsRow: 39 },
  { label: 'Total Non-Current Liabilities', bold: true, resultKey: 'totalNonCurrentLiabilities' },
]

export default function AamPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet) return null

    const histYears = computeHistoricalYears(home.tahunTransaksi, 4)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears)
    const allBs = { ...balanceSheet.rows, ...bsComp }
    const ly = histYears[histYears.length - 1]! // last year

    const bs = (row: number) => allBs[row]?.[ly] ?? 0

    const result = computeAam({
      cashOnHands: bs(8),
      cashOnBank: bs(9),
      accountReceivable: bs(10),
      otherReceivable: bs(11),
      inventory: bs(12),
      otherCurrentAssets: bs(14),
      fixedAssetBeginning: bs(20),
      fixedAssetNet: bs(22),
      otherNonCurrentAssets: bs(23),
      intangibleAssets: bs(24),
      totalNonCurrentAssets: bs(25),
      faAdjustment: 0, // default, user-editable in future
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
      proporsiSaham: computeProporsiSaham(home),
      paidUpCapitalDeduction: home.jumlahSahamBeredar, // fixture uses 600M = jumlahSahamBeredar
    })

    return { result, allBs, ly }
  }, [hasHydrated, home, balanceSheet])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Adjusted Asset Method (AAM)</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Data belum tersedia.</p>
          <p className="mt-1">Isi <strong>HOME</strong> dan <strong>Balance Sheet</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { result: r, allBs, ly } = data
  const bs = (row: number) => allBs[row]?.[ly] ?? 0

  const renderRow = (def: AamRowDef, bsVal?: number, adjVal?: number, eVal?: number) => {
    if (def.section) {
      return (
        <tr key={def.section} className="border-t-2 border-grid-strong">
          <td colSpan={4} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{def.section}</td>
        </tr>
      )
    }
    const cls = def.bold ? 'border-t border-grid-strong bg-canvas-raised font-semibold' : 'border-b border-grid'
    const adjusted = eVal ?? bsVal ?? 0
    return (
      <tr key={def.label} className={cls}>
        <td className="px-3 py-2 text-ink">{def.label}</td>
        <td className="px-3 py-2 text-right font-mono tabular-nums">{bsVal !== undefined ? formatIdr(bsVal) : ''}</td>
        <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">{adjVal !== undefined ? formatIdr(adjVal) : formatIdr(0)}</td>
        <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(adjusted)}</td>
      </tr>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Adjusted Asset Method (AAM)</h1>
      <p className="mb-6 text-sm text-ink-muted">Metode Penyesuaian Aset Bersih — valuasi berdasarkan neraca yang disesuaikan.</p>

      {/* 3-column Balance Sheet */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">Historis (C)</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">Penyesuaian (D)</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">Disesuaikan (E)</th>
            </tr>
          </thead>
          <tbody>
            {ASSET_ROWS.map(def =>
              renderRow(
                def,
                def.bsRow !== undefined ? bs(def.bsRow) : undefined,
                0,
                def.resultKey ? (r as unknown as Record<string, number>)[def.resultKey] : def.bsRow !== undefined ? bs(def.bsRow) : undefined,
              ),
            )}
            {LIABILITY_ROWS.map(def =>
              renderRow(
                def,
                def.bsRow !== undefined ? bs(def.bsRow) : undefined,
                0,
                def.resultKey ? (r as unknown as Record<string, number>)[def.resultKey] : def.bsRow !== undefined ? bs(def.bsRow) : undefined,
              ),
            )}
          </tbody>
        </table>
      </div>

      {/* Valuation Chain */}
      <h2 className="mb-3 text-base font-semibold text-ink">Valuasi</h2>
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
              <td className="px-3 py-2 text-ink">Net Asset Value</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.netAssetValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Interest Bearing Debt</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.interestBearingDebt)}</td>
            </tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">Equity Value</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityValue)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">DLOM ({formatPercent(home!.dlomPercent)})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(r.dlomDiscount)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Equity Less DLOM</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.equityLessDlom)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">DLOC/PFC ({formatPercent(home!.dlocPercent)})</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-negative">{formatIdr(r.dlocDiscount)}</td>
            </tr>
            <tr className="border-b border-grid font-semibold">
              <td className="px-3 py-2 text-ink">Market Value of Equity (100%)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.marketValue100)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">Market Value ({formatPercent(computeProporsiSaham(home!))} Equity)</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(r.marketValuePortion)}</td>
            </tr>
            <tr className="border-t-2 border-grid-strong bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">Nilai Akhir (AAM)</td>
              <td className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent">
                {formatIdr(r.finalValue)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
