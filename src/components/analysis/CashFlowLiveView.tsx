'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * Live-only view for Cash Flow Statement — derives CFS rows from
 * BS + IS + FA + AP store slices, shows PageEmptyState when incomplete.
 *
 * FA optional (CapEx defaults to 0 if null)
 * AP optional (financing defaults to 0 if null)
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

  if (!hasHydrated) return null

  if (!liveRows) {
    return (
      <PageEmptyState
        section="ANALISIS"
        title="Cash Flow Statement"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
        ]}
      />
    )
  }

  return <SheetPage manifest={CASH_FLOW_STATEMENT_MANIFEST} liveRows={liveRows} />
}
