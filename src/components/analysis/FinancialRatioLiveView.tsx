'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { FINANCIAL_RATIO_MANIFEST } from '@/data/manifests/financial-ratio'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeFinancialRatioLiveRows } from '@/data/live/compute-financial-ratio-live'

/**
 * Financial Ratio live-mode wrapper. Computes the 14 BS + IS ratios
 * on demand when both upstream slices are present, pins the 4 cash
 * flow ratios to zero until Session 012 adds Fixed Asset + Acc Payables
 * input, and renders a small footer note explaining the zeros so users
 * don't misread them as a legitimate "no CFO" signal.
 */
export function FinancialRatioLiveView() {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const isLive =
    hasHydrated && home !== null && balanceSheet !== null && incomeStatement !== null

  const liveRows = useMemo(() => {
    if (!isLive) return null
    const years = computeHistoricalYears(
      home.tahunTransaksi,
      FINANCIAL_RATIO_MANIFEST.historicalYearCount ?? 3,
    )
    return computeFinancialRatioLiveRows(
      balanceSheet.rows,
      incomeStatement.rows,
      years,
    )
  }, [isLive, home, balanceSheet, incomeStatement])

  return (
    <>
      <SheetPage manifest={FINANCIAL_RATIO_MANIFEST} liveRows={liveRows} />
      {isLive && (
        <div className="mx-auto mt-4 max-w-[1400px] px-1">
          <p className="text-[11px] leading-relaxed text-ink-muted">
            <span className="font-semibold text-ink">Catatan:</span> rasio
            Cash Flow Indicator (CFO/Sales, FCF/CFO, Short Term Debt
            Coverage, Capex Coverage) saat ini bernilai 0,00 karena
            perhitungannya membutuhkan data Cash Flow Statement dan Fixed
            Asset yang belum diinput. Rasio-rasio ini akan terisi otomatis
            setelah input Fixed Asset tersedia.
          </p>
        </div>
      )}
    </>
  )
}
