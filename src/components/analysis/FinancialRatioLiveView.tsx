'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { FINANCIAL_RATIO_MANIFEST } from '@/data/manifests/financial-ratio'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeFinancialRatioLiveRows } from '@/data/live/compute-financial-ratio-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'

/**
 * Financial Ratio live-mode wrapper. Computes all 18 ratios when BS + IS
 * are present. Builds CFS + FCF upstream chain for CF indicator ratios.
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

    // 3. NOPLAT from IS (for FCF chain)
    const noplatLeafRows = computeNoplatLiveRows(incomeStatement.rows, cfsYears)
    const noplatComputed = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeafRows, cfsYears)
    const allNoplatRows = { ...noplatLeafRows, ...noplatComputed }

    // 4. FA computed rows
    const faRows = fixedAsset?.rows ?? null
    const faComputed = faRows
      ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, cfsYears)
      : null

    // 5. FCF from upstream
    const fcfLeafRows = computeFcfLiveRows(allNoplatRows, faComputed, allCfsRows, cfsYears)
    const fcfComputed = deriveComputedRows(FCF_MANIFEST.rows, fcfLeafRows, cfsYears)
    const allFcfRows = { ...fcfLeafRows, ...fcfComputed }

    return computeFinancialRatioLiveRows(
      balanceSheet.rows,
      incomeStatement.rows,
      frYears,
      allCfsRows,
      allFcfRows,
    )
  }, [isLive, home, balanceSheet, incomeStatement, fixedAsset, accPayables])

  return (
    <>
      <SheetPage manifest={FINANCIAL_RATIO_MANIFEST} liveRows={liveRows} />
      {/* All 18 ratios now computed — no footer note needed */}
    </>
  )
}
