'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

/**
 * FCF live-mode wrapper. Builds the full upstream computation chain:
 * IS → NOPLAT, BS+IS+FA → CFS, FA → computed, then derives FCF rows.
 *
 * Mode semantics (LESSON-031):
 *   BS + IS both present → live mode. FA optional (CapEx/Dep = 0 if null).
 */
export function FcfLiveView() {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const accPayables = useKkaStore((s) => s.accPayables)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement) return null

    const years = computeHistoricalYears(
      home.tahunTransaksi,
      FCF_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)

    // 1. NOPLAT from IS
    const noplatLeafRows = computeNoplatLiveRows(incomeStatement.rows, years)
    const noplatComputed = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeafRows, years)
    const allNoplatRows = { ...noplatLeafRows, ...noplatComputed }

    // 2. FA computed rows (rows 23, 51)
    const faRows = fixedAsset?.rows ?? null
    const faComputed = faRows
      ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, years)
      : null

    // 3. CFS from BS + IS + FA
    const cfsLeafRows = computeCashFlowLiveRows(
      balanceSheet.rows, incomeStatement.rows, faRows, accPayables?.rows ?? null, years, bsYears,
    )
    const cfsComputed = deriveComputedRows(
      CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeafRows, years,
    )
    const allCfsRows = { ...cfsLeafRows, ...cfsComputed }

    // 4. FCF from upstream
    return computeFcfLiveRows(allNoplatRows, faComputed, allCfsRows, years)
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, accPayables])

  return <SheetPage manifest={FCF_MANIFEST} liveRows={liveRows} />
}
