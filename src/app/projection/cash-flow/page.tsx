'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeFullProjectionPipeline } from '@/lib/calculations/projection-pipeline'
import { formatIdr } from '@/components/financial/format'

const ROW_DEFS: { row: number; label: string; bold?: boolean; indent?: boolean; section?: string }[] = [
  { row: 5, label: 'EBITDA', section: 'Cash Flow from Operations' },
  { row: 6, label: 'Corporate Tax' },
  { row: 8, label: 'Changes in Current Assets' },
  { row: 9, label: 'Changes in Current Liabilities' },
  { row: 10, label: 'Working Capital', indent: true },
  { row: 11, label: 'Cash Flow from Operations', bold: true },
  { row: 13, label: 'Cash Flow from Non-Operations', section: 'Non-Operations' },
  { row: 17, label: 'Cash Flow from Investment (CapEx)', section: 'Investment', bold: true },
  { row: 19, label: 'Cash Flow before Financing', bold: true },
  { row: 22, label: 'Equity Injection', section: 'Financing' },
  { row: 23, label: 'New Loan' },
  { row: 24, label: 'Interest Expense' },
  { row: 25, label: 'Interest Income' },
  { row: 26, label: 'Principal Repayment' },
  { row: 28, label: 'Cash Flow from Financing', bold: true },
  { row: 30, label: 'Net Cash Flow', bold: true, section: 'Net Cash' },
  { row: 32, label: 'Cash — Beginning Balance' },
  { row: 33, label: 'Cash — Ending Balance', bold: true },
  { row: 36, label: 'Cash on Hand', indent: true },
  { row: 35, label: 'Cash in Bank', indent: true },
]

export default function ProyCashFlowPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers) return null

    const pipeline = computeFullProjectionPipeline({
      home, balanceSheet, incomeStatement, fixedAsset, keyDrivers,
    })

    return { rows: pipeline.proyCfsRows, years: pipeline.projYears }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Proy. Arus Kas</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Isi <strong>HOME</strong>, <strong>Balance Sheet</strong>, <strong>Income Statement</strong>, <strong>Fixed Asset</strong>, dan <strong>Key Drivers</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Proy. Arus Kas</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Proyeksi arus kas dari Proy. L/R, Proy. Neraca, Proy. Fixed Asset, dan Proy. Acc Payables.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
              {years.map(y => (
                <th key={y} className="px-3 py-2 text-right font-mono font-medium text-ink-muted tabular-nums">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_DEFS.map(def => (
              <tr
                key={def.row}
                className={
                  def.bold
                    ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
                    : 'border-b border-grid'
                }
              >
                <td className={`px-3 py-1.5 text-ink ${def.indent ? 'pl-8 text-ink-muted' : ''}`}>
                  {def.section && (
                    <span className="mb-1 block pt-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      {def.section}
                    </span>
                  )}
                  {def.label}
                </td>
                {years.map(y => {
                  const v = rows[def.row]?.[y]
                  if (v === undefined) return <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums">—</td>
                  const isNeg = v < 0
                  return (
                    <td
                      key={y}
                      className={`px-3 py-1.5 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''}`}
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
