'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeProyFixedAssetsLive } from '@/data/live/compute-proy-fixed-assets-live'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import { computeProyAccPayablesLive } from '@/data/live/compute-proy-acc-payables-live'
import { computeProyCfsLive, type ProyCfsInput } from '@/data/live/compute-proy-cfs-live'
import { computeAvgGrowth } from '@/lib/calculations/helpers'
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

    const histYears = computeHistoricalYears(home.tahunTransaksi, 4)
    const faYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const projYears = [home.tahunTransaksi, home.tahunTransaksi + 1, home.tahunTransaksi + 2]
    const histYear = home.tahunTransaksi - 1

    // ── Step 1: PROY FA ──
    let proyFaRows: Record<number, Record<number, number>> = {}
    if (fixedAsset) {
      const faComp = deriveComputedRows(FIXED_ASSET_MANIFEST.rows, fixedAsset.rows, faYears)
      const allFa = { ...fixedAsset.rows, ...faComp }
      proyFaRows = computeProyFixedAssetsLive(allFa, faYears, projYears)
    }

    // ── Step 2: PROY LR ──
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
      proyFaDepreciation: proyFaRows[51] ?? {},
    }
    const proyLrRows = computeProyLrLive(lrInput, histYear, projYears)

    // ── Step 3: PROY BS ──
    const bsRows = balanceSheet.rows
    const bsAvgGrowth: Record<number, number> = {}
    const bsLastYear: Record<number, number> = {}
    for (const [rowStr, series] of Object.entries(bsRows)) {
      const row = Number(rowStr)
      bsAvgGrowth[row] = computeAvgGrowth(series)
      bsLastYear[row] = series[histYear] ?? 0
    }
    const bsInput: ProyBsInput = {
      bsLastYear, bsAvgGrowth, proyFaRows,
      proyLrNetProfit: proyLrRows[39] ?? {},
      intangibleGrowth: bsAvgGrowth[24] ?? 0,
    }
    const proyBsRows = computeProyBsLive(bsInput, histYear, projYears)

    // ── Step 4: PROY ACC PAYABLES ──
    // Read loan balances from BS — works for any company (0 if no loans)
    const proyApRows = computeProyAccPayablesLive({
      interestRateST: keyDrivers.financialDrivers.interestRateShortTerm,
      interestRateLT: keyDrivers.financialDrivers.interestRateLongTerm,
      stEnding: bsLastYear[31] ?? 0, // BS row 31: Bank Loan — Short Term
      ltEnding: bsLastYear[38] ?? 0, // BS row 38: Bank Loan — Long Term
    }, histYear, projYears)

    // ── Step 5: PROY CFS ──
    // Historical Cash Ending = BS last year Cash on Hands + Cash in Banks
    const bsComputed = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, bsRows, histYears)
    const allBs = { ...bsRows, ...bsComputed }
    const histCashEnding = (allBs[8]?.[histYear] ?? 0) + (allBs[9]?.[histYear] ?? 0)

    const cfsInput: ProyCfsInput = {
      proyLrRows, proyBsRows, proyFaRows, proyApRows,
      histCashEnding,
    }
    const rows = computeProyCfsLive(cfsInput, histYear, projYears)
    return { rows, years: projYears } // CFS only shows projected years
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
