'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'

/**
 * Page wrapper that derives NOPLAT live rows from the Income Statement
 * store slice, then hands them to the generic SheetPage via the
 * `liveRows` prop override introduced in Task 3. Keeps SheetPage free
 * of sheet-specific calc knowledge.
 *
 * Mode semantics (matching LESSON-031):
 *   home === null OR incomeStatement === null → liveRows = null → seed mode
 *   both present                              → compute NOPLAT → live mode
 */
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

  return <SheetPage manifest={NOPLAT_MANIFEST} liveRows={liveRows} />
}
