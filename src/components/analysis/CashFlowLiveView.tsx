'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'

/**
 * Page wrapper that derives CFS live rows from BS + IS + FA + AP
 * store slices, then hands them to SheetPage via the `liveRows` prop.
 *
 * Mode semantics (LESSON-031):
 *   Any required upstream slice null → liveRows = null → seed mode
 *   BS + IS both present            → compute CFS → live mode
 *   FA optional (CapEx defaults to 0 if null)
 *   AP optional (financing defaults to 0 if null)
 */
export function CashFlowLiveView() {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const accPayables = useKkaStore((s) => s.accPayables)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement) return null

    const cfsYears = computeHistoricalYears(
      home.tahunTransaksi,
      CASH_FLOW_STATEMENT_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)

    return computeCashFlowLiveRows(
      balanceSheet.rows,
      incomeStatement.rows,
      fixedAsset?.rows ?? null,
      accPayables?.rows ?? null,
      cfsYears,
      bsYears,
    )
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, accPayables])

  return <SheetPage manifest={CASH_FLOW_STATEMENT_MANIFEST} liveRows={liveRows} />
}
