'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { FINANCIAL_RATIO_MANIFEST } from '@/data/manifests/financial-ratio'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeFinancialRatioLiveRows } from '@/data/live/compute-financial-ratio-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

/**
 * Financial Ratio live-mode wrapper. Computes 17/18 ratios when BS + IS
 * are present. The 3 CFS-dependent ratios (CFO/Sales, ST Debt Coverage,
 * Capex Coverage) auto-compute when BS + IS enables CFS derivation.
 * FCF/CFO (row 27) remains 0 until FCF live mode is wired (Task 4).
 */
export function FinancialRatioLiveView() {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const accPayables = useKkaStore((s) => s.accPayables)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const isLive =
    hasHydrated && home !== null && balanceSheet !== null && incomeStatement !== null

  const liveRows = useMemo(() => {
    if (!isLive) return null

    const frYears = computeHistoricalYears(
      home.tahunTransaksi,
      FINANCIAL_RATIO_MANIFEST.historicalYearCount ?? 3,
    )

    // Compute CFS rows for CF ratios
    const cfsYears = computeHistoricalYears(
      home.tahunTransaksi,
      CASH_FLOW_STATEMENT_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)

    const cfsLeafRows = computeCashFlowLiveRows(
      balanceSheet.rows,
      incomeStatement.rows,
      fixedAsset?.rows ?? null,
      accPayables?.rows ?? null,
      cfsYears,
      bsYears,
    )
    const cfsComputed = deriveComputedRows(
      CASH_FLOW_STATEMENT_MANIFEST.rows,
      cfsLeafRows,
      cfsYears,
    )
    const allCfsRows = { ...cfsLeafRows, ...cfsComputed }

    return computeFinancialRatioLiveRows(
      balanceSheet.rows,
      incomeStatement.rows,
      frYears,
      allCfsRows,
      null, // FCF rows — wired in Task 4
    )
  }, [isLive, home, balanceSheet, incomeStatement, fixedAsset, accPayables])

  return (
    <>
      <SheetPage manifest={FINANCIAL_RATIO_MANIFEST} liveRows={liveRows} />
      {isLive && (
        <div className="mx-auto mt-4 max-w-[1400px] px-1">
          <p className="text-[11px] leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink">Catatan:</span> rasio
            FCF/Operating Cash Flow (baris 27) saat ini bernilai 0,00 karena
            perhitungannya membutuhkan data Free Cash Flow yang belum tersedia.
          </p>
        </div>
      )}
    </>
  )
}
