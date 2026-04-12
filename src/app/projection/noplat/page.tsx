'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeProyNoplatLive, type ProyNoplatInput } from '@/data/live/compute-proy-noplat-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { formatIdr } from '@/components/financial/format'

const ROW_DEFS: { row: number; label: string; bold?: boolean; indent?: boolean; section?: string }[] = [
  { row: 7, label: 'Profit Before Tax', section: 'EBIT' },
  { row: 8, label: 'Add: Interest Expenses' },
  { row: 9, label: 'Less: Interest Income' },
  { row: 10, label: 'Non Operating Income' },
  { row: 11, label: 'EBIT', bold: true },
  { row: 13, label: 'Tax Provision', section: 'Total Taxes on EBIT' },
  { row: 14, label: 'Tax Shield on Interest Expenses', indent: true },
  { row: 15, label: 'Tax on Interest Income', indent: true },
  { row: 16, label: 'Tax on Non-Operating Income', indent: true },
  { row: 17, label: 'Total Taxes on EBIT', bold: true },
  { row: 19, label: 'NOPLAT', bold: true },
]

export default function ProyNoplatPage() {
  const home = useKkaStore(s => s.home)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !incomeStatement || !keyDrivers) return null

    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = [home.tahunTransaksi, home.tahunTransaksi + 1, home.tahunTransaksi + 2]
    const histYear = home.tahunTransaksi - 1

    // PROY FA for depreciation
    let proyFaDepreciation: Record<number, number> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      const proyFa = computeProyFixedAssetsLive(allFa, faYears, projYears)
      proyFaDepreciation = proyFa[51] ?? {}
    }

    // Compute PROY LR
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0
    const isAvgGrowth = (row: number) => computeAvgGrowth(isRows[row] ?? {})

    const lrInput: ProyLrInput = {
      keyDrivers,
      revenueGrowth: isAvgGrowth(6),
      interestIncomeGrowth: isAvgGrowth(26),
      interestExpenseGrowth: isAvgGrowth(27),
      nonOpIncomeGrowth: isAvgGrowth(30),
      isLastYear: {
        revenue: isVal(6), cogs: isVal(7), grossProfit: isVal(8),
        sellingOpex: isVal(12), gaOpex: isVal(13),
        depreciation: -(isVal(21) ?? 0),
        interestIncome: isVal(26), interestExpense: isVal(27),
        nonOpIncome: isVal(30), tax: isVal(33),
      },
      proyFaDepreciation,
    }
    const proyLr = computeProyLrLive(lrInput, histYear, projYears)

    // Compute historical effective tax rate from IS data
    const histPbt = isVal(32)
    const histTax = isVal(33)
    const histTaxRate = histPbt !== 0 ? Math.abs(histTax / histPbt) : 0

    // Compute PROY NOPLAT
    const noplatInput: ProyNoplatInput = {
      proyLrRows: proyLr,
      taxRate: keyDrivers.financialDrivers.corporateTaxRate,
      isLastYear: {
        pbt: histPbt,
        interestExpense: isVal(27),
        interestIncome: isVal(26),
        nonOpIncome: isVal(30),
        tax: histTax,
      },
      histTaxRate,
    }

    const rows = computeProyNoplatLive(noplatInput, histYear, projYears)
    return { rows, years: [histYear, ...projYears] }
  }, [hasHydrated, home, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[1100px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">Proy. NOPLAT</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>Isi <strong>HOME</strong>, <strong>Income Statement</strong>, dan <strong>Key Drivers</strong> terlebih dahulu.</p>
        </div>
      </div>
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Proy. NOPLAT</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Proyeksi NOPLAT (Net Operating Profit Less Adjusted Taxes) dari Proy. Laba Rugi. Kolom pertama = tahun historis terakhir.
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
