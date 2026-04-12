'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'

const ROW_DEFS: { row: number; label: string; kind: 'idr' | 'percent'; bold?: boolean; indent?: boolean }[] = [
  { row: 8, label: 'Revenue', kind: 'idr', bold: true },
  { row: 10, label: 'Cost of Goods Sold', kind: 'idr' },
  { row: 11, label: 'Gross Profit', kind: 'idr', bold: true },
  { row: 12, label: 'Gross Profit Margin', kind: 'percent', indent: true },
  { row: 15, label: 'Selling/Others OpEx', kind: 'idr' },
  { row: 16, label: 'General & Admin', kind: 'idr' },
  { row: 17, label: 'Total Operating Expenses', kind: 'idr' },
  { row: 19, label: 'EBITDA', kind: 'idr', bold: true },
  { row: 20, label: 'EBITDA Margin', kind: 'percent', indent: true },
  { row: 22, label: 'Depreciation', kind: 'idr' },
  { row: 25, label: 'EBIT', kind: 'idr', bold: true },
  { row: 26, label: 'EBIT Margin', kind: 'percent', indent: true },
  { row: 29, label: 'Interest Income', kind: 'idr' },
  { row: 31, label: 'Interest Expense', kind: 'idr' },
  { row: 33, label: 'Other Income/(Charges)', kind: 'idr' },
  { row: 34, label: 'Non Operating Income', kind: 'idr' },
  { row: 36, label: 'Profit Before Tax', kind: 'idr', bold: true },
  { row: 37, label: 'Corporate Tax', kind: 'idr' },
  { row: 39, label: 'Net Profit After Tax', kind: 'idr', bold: true },
  { row: 40, label: 'Net Profit Margin', kind: 'percent', indent: true },
]

export default function ProyIncomeStatementPage() {
  const home = useKkaStore(s => s.home)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !incomeStatement || !keyDrivers) return null

    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = home.tahunTransaksi - 1 // last historical year

    // PROY FA for depreciation (if FA data available)
    let proyFaDepreciation: Record<number, number> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      const proyFa = computeProyFixedAssetsLive(allFa, faYears, projYears)
      // Row 51 = Total Depreciation Additions
      proyFaDepreciation = proyFa[51] ?? {}
    }

    // IS last historical year values
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0

    // Compute IS average growth rates from user's historical data (not hardcoded)
    const isAvgGrowth = (row: number) => computeAvgGrowth(isRows[row] ?? {})

    const input: ProyLrInput = {
      keyDrivers,
      revenueGrowth: isAvgGrowth(6),
      interestIncomeGrowth: isAvgGrowth(26),
      interestExpenseGrowth: isAvgGrowth(27),
      nonOpIncomeGrowth: isAvgGrowth(30),
      isLastYear: {
        revenue: isVal(6),
        cogs: isVal(7),
        grossProfit: isVal(8),
        sellingOpex: isVal(12),
        gaOpex: isVal(13),
        depreciation: -(isVal(21) ?? 0), // FA depreciation negated
        interestIncome: isVal(26),
        interestExpense: isVal(27),
        nonOpIncome: isVal(30),
        tax: isVal(33),
      },
      proyFaDepreciation,
    }

    const rows = computeProyLrLive(input, histYear, projYears)
    return { rows, years: [histYear, ...projYears] }
  }, [hasHydrated, home, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Proy. Laba Rugi</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Isi <strong>HOME</strong>, <strong>Income Statement</strong>, dan <strong>Key Drivers</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Proy. Laba Rugi</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Proyeksi laporan laba rugi berdasarkan Key Drivers. Kolom pertama = tahun historis terakhir.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">Keterangan</th>
              {years.map((y, i) => (
                <th key={y} className="px-3 py-2 text-right font-mono font-medium text-ink-muted tabular-nums">
                  {y}{i === 0 ? ' (hist)' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROW_DEFS.map(def => {
              const isMargin = def.kind === 'percent'
              return (
                <tr
                  key={def.row}
                  className={
                    def.bold
                      ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
                      : 'border-b border-grid'
                  }
                >
                  <td className={`px-3 py-1.5 text-ink ${def.indent ? 'pl-8 text-ink-muted italic' : ''}`}>
                    {def.label}
                  </td>
                  {years.map(y => {
                    const v = rows[def.row]?.[y]
                    if (v === undefined) return <td key={y} className="px-3 py-1.5 text-right font-mono tabular-nums">—</td>
                    const formatted = isMargin ? formatPercent(v) : formatIdr(v)
                    const isNeg = v < 0
                    return (
                      <td
                        key={y}
                        className={`px-3 py-1.5 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''} ${isMargin ? 'text-ink-muted' : ''}`}
                      >
                        {formatted}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
