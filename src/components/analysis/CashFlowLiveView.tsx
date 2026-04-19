'use client'

import { useMemo } from 'react'
import { SheetPage } from '@/components/financial/SheetPage'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { computeCashBalance } from '@/lib/calculations/compute-cash-balance'
import { computeCashAccount } from '@/lib/calculations/compute-cash-account'
import { computeFinancing } from '@/lib/calculations/compute-financing'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

/**
 * Live-only view for Cash Flow Statement — derives CFS rows from
 * BS + IS + FA + AP + CWC + Cash Balance + Cash Account + Financing
 * store slices; shows PageEmptyState when any required input is missing.
 *
 * FA optional (CapEx defaults to 0 if null)
 * AP optional (Financing pass-through sums against `apRows ?? {}` → 0)
 *
 * Cash Balance + Cash Account are REQUIRED (Session 055): the CFS Cash
 * Beginning / Ending (rows 32/33) and Bank / On Hand split (rows 35/36)
 * now come from user-curated scope editors, not hardcoded BS rows 8+9.
 *
 * Financing is REQUIRED (Session 056): CFS Financing rows
 * (22 Equity Injection, 23 New Loan, 24 Interest Payment,
 *  25 Interest Income, 26 Principal Repayment) now come from a user-curated
 * scope (`/input/financing`) instead of hardcoded AP/IS row references.
 */
export function CashFlowLiveView() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const accPayables = useKkaStore((s) => s.accPayables)
  const changesInWorkingCapital = useKkaStore((s) => s.changesInWorkingCapital)
  const cashBalance = useKkaStore((s) => s.cashBalance)
  const cashAccount = useKkaStore((s) => s.cashAccount)
  const financing = useKkaStore((s) => s.financing)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  const liveRows = useMemo(() => {
    if (
      !hasHydrated ||
      !home ||
      !balanceSheet ||
      !incomeStatement ||
      changesInWorkingCapital === null ||
      cashBalance === null ||
      cashAccount === null ||
      financing === null
    ) {
      return null
    }

    const cfsYears = computeHistoricalYears(
      home.tahunTransaksi,
      CASH_FLOW_STATEMENT_MANIFEST.historicalYearCount ?? 3,
    )
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)

    const cashBalanceResult = computeCashBalance({
      scope: cashBalance,
      bsRows: balanceSheet.rows,
      cfsYears,
      bsYears,
    })
    const cashAccountResult = computeCashAccount({
      scope: cashAccount,
      bsRows: balanceSheet.rows,
      years: cfsYears,
    })
    const financingResult = computeFinancing({
      financing,
      bsRows: balanceSheet.rows,
      isLeaves: incomeStatement.rows,
      apRows: accPayables?.rows ?? {},
      cfsYears,
      bsYears,
    })

    return computeCashFlowLiveRows(
      balanceSheet.accounts,
      balanceSheet.rows,
      incomeStatement.rows,
      fixedAsset?.rows ?? null,
      accPayables?.rows ?? null,
      cfsYears,
      bsYears,
      changesInWorkingCapital?.excludedCurrentAssets ?? [],
      changesInWorkingCapital?.excludedCurrentLiabilities ?? [],
      cashBalanceResult,
      cashAccountResult,
      financingResult,
    )
  }, [
    hasHydrated,
    home,
    balanceSheet,
    incomeStatement,
    fixedAsset,
    accPayables,
    changesInWorkingCapital,
    cashBalance,
    cashAccount,
    financing,
  ])

  if (!hasHydrated) return null

  if (!liveRows) {
    return (
      <PageEmptyState
        section={t('nav.group.analysis')}
        title={t('nav.item.cashFlowStatement')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: t('wc.gate.required.label'), href: '/input/changes-in-working-capital', filled: changesInWorkingCapital !== null },
          { label: t('cashBalance.gate.required.label'), href: '/input/cash-balance', filled: cashBalance !== null },
          { label: t('cashAccount.gate.required.label'), href: '/input/cash-account', filled: cashAccount !== null },
          { label: t('financing.gate.required.label'), href: '/input/financing', filled: financing !== null },
        ]}
      />
    )
  }

  return <SheetPage manifest={CASH_FLOW_STATEMENT_MANIFEST} liveRows={liveRows} />
}
