'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { ROIC_MANIFEST } from '@/data/manifests/roic'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

/**
 * ROIC live-mode wrapper. Builds the full upstream chain:
 * IS → NOPLAT → CFS → FCF → ROIC, plus BS computed for invested capital.
 */
export function RoicLiveView() {
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
      ROIC_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)

    // 1. NOPLAT from IS
    const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, years)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, years)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    // 2. FA computed rows
    const faRows = fixedAsset?.rows ?? null
    const faComp = faRows
      ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, years)
      : null

    // 3. CFS from BS + IS + FA
    const cfsLeaf = computeCashFlowLiveRows(
      balanceSheet.rows, incomeStatement.rows, faRows, accPayables?.rows ?? null, years, bsYears,
    )
    const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, years)
    const allCfs = { ...cfsLeaf, ...cfsComp }

    // 4. FCF from upstream
    const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, years)
    const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, years)
    const allFcf = { ...fcfLeaf, ...fcfComp }

    // 5. BS computed (need row 27 = Total Assets)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, years)
    const allBs = { ...bsComp, ...balanceSheet.rows }

    // 6. ROIC
    return computeRoicLiveRows(allFcf, allBs, years)
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, accPayables])

  return <SheetPage manifest={ROIC_MANIFEST} liveRows={liveRows} />
}
