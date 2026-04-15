'use client'

import { useMemo, useState, useCallback } from 'react'
import { useKkaStore, computeProporsiSaham } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeAam } from '@/lib/calculations/aam-valuation'
import { buildAamInput } from '@/lib/calculations/upstream-helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { parseFinancialInput } from '@/components/forms/parse-financial-input'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

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
  /** BS rows whose adjustments sum into this total row's D column. */
  adjSumRows?: number[]
}

const ASSET_ROWS: AamRowDef[] = [
  { section: 'Aktiva Lancar' },
  { label: 'Cash on Hands', bsRow: 8 },
  { label: 'Cash on Bank (Deposit)', bsRow: 9 },
  { label: 'Account Receivable', bsRow: 10 },
  { label: 'Other Receivable', bsRow: 11 },
  { label: 'Inventory', bsRow: 12 },
  { label: 'Others', bsRow: 14 },
  { label: 'Total Current Assets', bold: true, resultKey: 'totalCurrentAssets', adjSumRows: [8, 9, 10, 11, 12, 14] },
  { section: 'Aktiva Tidak Lancar' },
  { label: 'Fixed Asset Net', bsRow: 22, resultKey: 'adjustedFixedAssetNet' },
  { label: 'Other Non-Current Assets', bsRow: 23 },
  { label: 'Total Non-Current Assets', bold: true, resultKey: 'totalNonCurrentAssets', adjSumRows: [22, 23] },
  { label: 'Intangible Assets', bsRow: 24 },
  { label: 'TOTAL ASSETS', bold: true, resultKey: 'totalAssets', adjSumRows: [8, 9, 10, 11, 12, 14, 22, 23, 24] },
]

const LIABILITY_ROWS: AamRowDef[] = [
  { section: 'Kewajiban Lancar' },
  { label: 'Bank Loan (Short Term)', bsRow: 31 },
  { label: 'Account Payable', bsRow: 32 },
  { label: 'Tax Payable', bsRow: 33 },
  { label: 'Others Current Liabilities', bsRow: 34 },
  { label: 'Total Current Liabilities', bold: true, resultKey: 'totalCurrentLiabilities', adjSumRows: [31, 32, 33, 34] },
  { section: 'Kewajiban Jangka Panjang' },
  { label: 'Bank Loan (Long Term)', bsRow: 38 },
  { label: 'Related Party', bsRow: 39 },
  { label: 'Total Non-Current Liabilities', bold: true, resultKey: 'totalNonCurrentLiabilities', adjSumRows: [38, 39] },
]

/** Inline editable cell for the D (Penyesuaian) column. */
function AdjustmentCell({
  value,
  onCommit,
}: {
  value: number
  onCommit: (v: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const isEditing = draft !== null

  const handleBlur = useCallback(() => {
    if (draft === null) return
    const parsed = parseFinancialInput(draft)
    if (parsed !== value) onCommit(parsed)
    setDraft(null)
  }, [draft, value, onCommit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur()
    } else if (e.key === 'Escape') {
      setDraft(null)
    }
  }, [])

  return (
    <td className="px-1 py-1 text-right">
      {isEditing ? (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          className="w-full rounded border border-accent/40 bg-canvas px-2 py-1 text-right font-mono text-sm tabular-nums text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setDraft(value === 0 ? '' : String(value))}
          className="w-full rounded px-2 py-1 text-right font-mono text-sm tabular-nums text-accent hover:bg-accent/5 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          title="Klik untuk edit penyesuaian"
        >
          {formatIdr(value)}
        </button>
      )}
    </td>
  )
}

export default function AamPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const aamAdjustments = useKkaStore(s => s.aamAdjustments)
  const setAamAdjustments = useKkaStore(s => s.setAamAdjustments)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const handleAdjustmentCommit = useCallback((bsRow: number, value: number) => {
    const next = { ...aamAdjustments }
    if (value === 0) {
      delete next[bsRow]
    } else {
      next[bsRow] = value
    }
    setAamAdjustments(next)
  }, [aamAdjustments, setAamAdjustments])

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet) return null

    const histYears = computeHistoricalYears(home.tahunTransaksi, 4)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, histYears)
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const ly = histYears[histYears.length - 1]! // last year

    const result = computeAam(buildAamInput({ allBs, lastYear: ly, home, aamAdjustments }))

    return { result, allBs, ly }
  }, [hasHydrated, home, balanceSheet, aamAdjustments])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data...</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section="PENILAIAN"
        title="AAM"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
        ]}
      />
    )
  }

  const { result: r, allBs, ly } = data
  const bs = (row: number) => allBs[row]?.[ly] ?? 0

  /** Sum adjustments for a set of BS rows (used for bold/total rows). */
  const sumAdj = (rows: number[]) => rows.reduce((s, row) => s + (aamAdjustments[row] ?? 0), 0)

  const renderRow = (def: AamRowDef) => {
    if (def.section) {
      return (
        <tr key={def.section} className="border-t-2 border-grid-strong">
          <td colSpan={4} className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-ink-muted uppercase">{def.section}</td>
        </tr>
      )
    }

    const bsVal = def.bsRow !== undefined ? bs(def.bsRow) : undefined
    const cls = def.bold ? 'border-t border-grid-strong bg-canvas-raised font-semibold' : 'border-b border-grid'

    // Bold/total rows: D shows sum of constituent adjustments, E from result
    if (def.bold) {
      const adjTotal = def.adjSumRows ? sumAdj(def.adjSumRows) : 0
      const eVal = def.resultKey ? (r as unknown as Record<string, number>)[def.resultKey] : bsVal
      return (
        <tr key={def.label} className={cls}>
          <td className="px-3 py-2 text-ink">{def.label}</td>
          <td className="px-3 py-2 text-right font-mono tabular-nums">{bsVal !== undefined ? formatIdr(bsVal) : ''}</td>
          <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">{formatIdr(adjTotal)}</td>
          <td className="px-3 py-2 text-right font-mono tabular-nums">{eVal !== undefined ? formatIdr(eVal) : ''}</td>
        </tr>
      )
    }

    // Non-bold data rows: editable D column
    const adjVal = def.bsRow !== undefined ? (aamAdjustments[def.bsRow] ?? 0) : 0
    const eVal = def.resultKey
      ? (r as unknown as Record<string, number>)[def.resultKey]
      : bsVal !== undefined ? bsVal + adjVal : undefined

    return (
      <tr key={def.label} className={cls}>
        <td className="px-3 py-2 text-ink">{def.label}</td>
        <td className="px-3 py-2 text-right font-mono tabular-nums">{bsVal !== undefined ? formatIdr(bsVal) : ''}</td>
        {def.bsRow !== undefined ? (
          <AdjustmentCell
            value={adjVal}
            onCommit={(v) => handleAdjustmentCommit(def.bsRow!, v)}
          />
        ) : (
          <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">{formatIdr(0)}</td>
        )}
        <td className="px-3 py-2 text-right font-mono tabular-nums">{eVal !== undefined ? formatIdr(eVal) : ''}</td>
      </tr>
    )
  }

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Adjusted Asset Method (AAM)</h1>
      <p className="mb-6 text-sm text-ink-muted">Metode Penyesuaian Aset Bersih — klik angka di kolom Penyesuaian (D) untuk mengedit.</p>

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
            {ASSET_ROWS.map(def => renderRow(def))}
            {LIABILITY_ROWS.map(def => renderRow(def))}
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
            <tr className="border-t-2 border-grid-strong bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">Market Value ({formatPercent(computeProporsiSaham(home!))} Equity)</td>
              <td className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent">
                {formatIdr(r.marketValuePortion)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
