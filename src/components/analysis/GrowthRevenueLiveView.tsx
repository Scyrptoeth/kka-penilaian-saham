'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { GROWTH_REVENUE_MANIFEST } from '@/data/manifests/growth-revenue'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeGrowthRevenueLiveRows } from '@/data/live/compute-growth-revenue-live'
import { AnalysisEmptyState } from './AnalysisEmptyState'

/**
 * Growth Revenue live-mode wrapper — projects IS Revenue (row 6) and
 * Net Profit After Tax (row 35) onto GR manifest rows 8/9 and hands
 * the result to SheetPage via `liveRows`. The yoyGrowth derivation
 * declared on the GR manifest fills the growth columns automatically.
 */
export function GrowthRevenueLiveView() {
  const home = useKkaStore((s) => s.home)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(() => {
    if (!hasHydrated || !home || !incomeStatement) return null
    const years = computeHistoricalYears(
      home.tahunTransaksi,
      GROWTH_REVENUE_MANIFEST.historicalYearCount ?? 4,
    )
    return computeGrowthRevenueLiveRows(incomeStatement.rows, years)
  }, [hasHydrated, home, incomeStatement])

  if (!hasHydrated) return null
  if (!home || !incomeStatement) {
    return (
      <AnalysisEmptyState
        title="Growth Revenue"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
        ]}
      />
    )
  }

  return <SheetPage manifest={GROWTH_REVENUE_MANIFEST} liveRows={liveRows} />
}
