'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { AnalysisEmptyState } from './AnalysisEmptyState'

export function NoplatLiveView() {
  const home = useKkaStore((s) => s.home)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(() => {
    if (!hasHydrated || !home || !incomeStatement) return null
    const years = computeHistoricalYears(
      home.tahunTransaksi,
      NOPLAT_MANIFEST.historicalYearCount ?? 3,
    )
    return computeNoplatLiveRows(incomeStatement.rows, years)
  }, [hasHydrated, home, incomeStatement])

  if (!hasHydrated) return null
  if (!home || !incomeStatement) {
    return (
      <AnalysisEmptyState
        title="NOPLAT"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
        ]}
      />
    )
  }

  return <SheetPage manifest={NOPLAT_MANIFEST} liveRows={liveRows} />
}
