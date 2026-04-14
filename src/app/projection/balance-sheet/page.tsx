'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears, computeProjectionYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

const ROW_DEFS: { row: number; label: string; kind: 'idr' | 'percent'; bold?: boolean; indent?: boolean; section?: string }[] = [
  // Current Assets
  { row: 9, label: 'Cash on Hands', kind: 'idr' },
  { row: 10, label: 'Growth', kind: 'percent', indent: true },
  { row: 11, label: 'Cash in Banks', kind: 'idr' },
  { row: 13, label: 'Account Receivable', kind: 'idr' },
  { row: 14, label: 'Growth', kind: 'percent', indent: true },
  { row: 15, label: 'Other Receivable', kind: 'idr' },
  { row: 17, label: 'Inventory', kind: 'idr' },
  { row: 18, label: 'Growth', kind: 'percent', indent: true },
  { row: 19, label: 'Others', kind: 'idr' },
  { row: 21, label: 'Total Current Assets', kind: 'idr', bold: true },
  // Non-Current Assets
  { row: 25, label: 'Fixed Assets (Beginning)', kind: 'idr', section: 'Non-Current Assets' },
  { row: 26, label: 'Accumulated Depreciation', kind: 'idr' },
  { row: 28, label: 'Fixed Assets, Net', kind: 'idr', bold: true },
  { row: 29, label: 'Other Non-Current Asset', kind: 'idr' },
  { row: 30, label: 'Intangible Assets', kind: 'idr' },
  { row: 31, label: 'Total Non-Current Assets', kind: 'idr', bold: true },
  { row: 33, label: 'TOTAL ASSETS', kind: 'idr', bold: true },
  // Current Liabilities
  { row: 37, label: 'Bank Loan — Short Term', kind: 'idr', section: 'Liabilities' },
  { row: 39, label: 'Account Payables', kind: 'idr' },
  { row: 41, label: 'Tax Payable', kind: 'idr' },
  { row: 43, label: 'Others', kind: 'idr' },
  { row: 45, label: 'Total Current Liabilities', kind: 'idr', bold: true },
  { row: 48, label: 'Bank Loan — Long Term', kind: 'idr' },
  { row: 50, label: 'Other Non-Current Liabilities', kind: 'idr' },
  { row: 52, label: 'Total Non-Current Liabilities', kind: 'idr', bold: true },
  // Equity
  { row: 55, label: 'Paid-Up Capital', kind: 'idr', section: 'Equity' },
  { row: 57, label: 'Surplus', kind: 'idr' },
  { row: 58, label: 'Current Profit', kind: 'idr' },
  { row: 59, label: 'Retained Earnings', kind: 'idr', bold: true },
  { row: 60, label: "Shareholders' Equity", kind: 'idr', bold: true },
  { row: 62, label: 'TOTAL LIABILITIES & EQUITY', kind: 'idr', bold: true },
  { row: 63, label: 'Balance Control', kind: 'idr', indent: true },
]

export default function ProyBalanceSheetPage() {
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const keyDrivers = useKkaStore(s => s.keyDrivers)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement || !keyDrivers) return null

    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = computeProjectionYears(home.tahunTransaksi)
    const histYear = home.tahunTransaksi - 1

    // Compute PROY FA for BS rows 25/26
    let proyFaRows: Record<number, Record<number, number>> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      proyFaRows = computeProyFixedAssetsLive(allFa, faYears, projYears)
    }

    // Compute PROY LR for Net Profit (row 39)
    const isRows = incomeStatement.rows
    const isVal = (row: number) => isRows[row]?.[histYear] ?? 0
    let proyFaDepreciation: Record<number, number> = {}
    if (proyFaRows[51]) {
      proyFaDepreciation = proyFaRows[51]
    }

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

    // Compute BS average growth from historical data
    const bsRows = balanceSheet.rows
    const bsAvgGrowth: Record<number, number> = {}
    const bsLastYear: Record<number, number> = {}
    for (const [rowStr, series] of Object.entries(bsRows)) {
      const row = Number(rowStr)
      bsAvgGrowth[row] = computeAvgGrowth(series)
      bsLastYear[row] = series[histYear] ?? 0
    }

    const bsInput: ProyBsInput = {
      bsLastYear,
      bsAvgGrowth,
      proyFaRows,
      proyLrNetProfit: proyLr[39] ?? {},
      intangibleGrowth: bsAvgGrowth[24] ?? 0,
    }

    const rows = computeProyBsLive(bsInput, histYear, projYears)
    return { rows, years: [histYear, ...projYears] }
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, keyDrivers])

  if (!hasHydrated) {
    return <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">Memuat data…</div>
  }

  if (!data) {
    return (
      <PageEmptyState
        section="PROYEKSI"
        title="Proy. Balance Sheet"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Key Drivers', href: '/input/key-drivers', filled: !!keyDrivers },
        ]}
      />
    )
  }

  const { rows, years } = data

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">Proy. Neraca</h1>
      <p className="mb-6 text-sm text-ink-muted">
        Proyeksi neraca berdasarkan rata-rata pertumbuhan historis. Kolom pertama = tahun historis terakhir.
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
              const isPct = def.kind === 'percent'
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
                    const formatted = isPct ? formatPercent(v) : formatIdr(v)
                    const isNeg = v < 0
                    return (
                      <td
                        key={y}
                        className={`px-3 py-1.5 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''} ${isPct ? 'text-ink-muted' : ''}`}
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
