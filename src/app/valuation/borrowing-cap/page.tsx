'use client'

import { useMemo, useState, useCallback } from 'react'
import { useKkaStore, type BorrowingCapInputState } from '@/lib/store/useKkaStore'
import { computeBorrowingCap } from '@/lib/calculations/borrowing-cap'
import { computeDiscountRate, buildDiscountRateInput } from '@/lib/calculations/discount-rate'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { formatIdr, formatPercent } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { useT } from '@/lib/i18n/useT'

import { BORROWING_PERCENT_DEFAULT } from '@/lib/calculations/upstream-helpers'

function parseNumber(raw: string): number {
  const cleaned = raw.replace(/[^0-9.-]/g, '')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : 0
}

function BorrowingCapEditor() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const discountRateState = useKkaStore(s => s.discountRate)
  const bcInput = useKkaStore(s => s.borrowingCapInput)
  const setBcInput = useKkaStore(s => s.setBorrowingCapInput)

  const [piutangCalk, setPiutangCalk] = useState(bcInput?.piutangCalk ?? 0)
  const [persediaanCalk, setPersediaanCalk] = useState(bcInput?.persediaanCalk ?? 0)

  const persist = useCallback(
    (next: BorrowingCapInputState) => setBcInput(next),
    [setBcInput],
  )

  const data = useMemo(() => {
    if (!home || !balanceSheet || !discountRateState) return null

    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)
    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, bsYears)
    const allBs = { ...bsComp, ...balanceSheet.rows }
    const lastYear = bsYears[bsYears.length - 1]!

    // BS values from last historical year
    const bsReceivables =
      (allBs[10]?.[lastYear] ?? 0) + (allBs[11]?.[lastYear] ?? 0) // F10 + F11
    const bsInventory = allBs[12]?.[lastYear] ?? 0 // F12
    const bsFixedAssetNet = allBs[22]?.[lastYear] ?? 0 // F22

    // Discount Rate — uses buildDiscountRateInput for correct debtRate conversion
    const dr = computeDiscountRate(buildDiscountRateInput(discountRateState))

    return computeBorrowingCap({
      piutangCalk,
      persediaanCalk,
      bsReceivables,
      bsInventory,
      bsFixedAssetNet,
      // TODO: make user-editable — 70% is a standard assumption but varies by industry
      borrowingPercent: BORROWING_PERCENT_DEFAULT,
      costDebtAfterTax: dr.kd,
      costEquity: dr.ke,
    })
  }, [home, balanceSheet, discountRateState, piutangCalk, persediaanCalk])

  if (!data) {
    return (
      <PageEmptyState
        section="PENILAIAN"
        title="Borrowing Cap"
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Discount Rate', href: '/valuation/discount-rate', filled: !!discountRateState },
        ]}
      />
    )
  }

  const handleBlur = () => {
    persist({ piutangCalk, persediaanCalk })
  }

  return (
    <div className="mx-auto max-w-[900px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('borrowingCap.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('borrowingCap.subtitle')}
      </p>

      {/* Section 1 — Borrowing Capacity */}
      <h2 className="mb-3 text-base font-semibold text-ink">{t('borrowingCap.sectionBc')}</h2>
      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('borrowingCap.table.assetType')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('borrowingCap.table.amount')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('borrowingCap.table.borrowingPct')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('borrowingCap.table.capacity')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('borrowingCap.receivables')}</td>
              <td className="px-3 py-2 text-right">
                <input
                  type="text"
                  className="w-44 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={piutangCalk === 0 ? '' : piutangCalk.toLocaleString('id-ID')}
                  onChange={e => setPiutangCalk(parseNumber(e.target.value))}
                  onBlur={handleBlur}
                  placeholder="0"
                />
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">—</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(data.borrowingCapReceivables)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('borrowingCap.inventory')}</td>
              <td className="px-3 py-2 text-right">
                <input
                  type="text"
                  className="w-44 rounded border border-grid bg-canvas px-2 py-1 text-right font-mono tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  value={persediaanCalk === 0 ? '' : persediaanCalk.toLocaleString('id-ID')}
                  onChange={e => setPersediaanCalk(parseNumber(e.target.value))}
                  onBlur={handleBlur}
                  placeholder="0"
                />
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-ink-muted">—</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(data.borrowingCapInventory)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('borrowingCap.fixedAsset')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(data.totalAssets > 0 ? data.totalAssets - piutangCalk - persediaanCalk : 0)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">70%</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(data.borrowingCapFixedAsset)}</td>
            </tr>
            <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
              <td className="px-3 py-2 text-ink">{t('common.total')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(data.totalAssets)}</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatIdr(data.totalBorrowingCap)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section 2 — Weighted Average Rate */}
      <h2 className="mb-3 text-base font-semibold text-ink">{t('borrowingCap.weightedAvgTitle')}</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('borrowingCap.table2.capitalType')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('borrowingCap.table2.costOfCapital')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('borrowingCap.table2.weight')}</th>
              <th className="px-3 py-2 text-right font-medium text-ink-muted">{t('borrowingCap.table2.weightedCost')}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('common.debt')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.weightDebt > 0 ? data.weightedCostDebt / data.weightDebt : 0)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.weightDebt)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.weightedCostDebt)}</td>
            </tr>
            <tr className="border-b border-grid">
              <td className="px-3 py-2 text-ink">{t('common.equity')}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.weightEquity > 0 ? data.weightedCostEquity / data.weightEquity : 0)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.weightEquity)}</td>
              <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPercent(data.weightedCostEquity)}</td>
            </tr>
            <tr className="border-t-2 border-grid-strong bg-canvas-raised font-semibold">
              <td className="px-3 py-2 text-ink">{t('common.total')}</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right font-mono text-lg tabular-nums text-accent">
                {formatPercent(data.waccTangible)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BorrowingCapPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[900px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  return <BorrowingCapEditor />
}
