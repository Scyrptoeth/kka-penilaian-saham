'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import type { TranslationKey } from '@/lib/i18n/translations'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeGrowthRateLive } from '@/data/live/compute-growth-rate-live'
import { computeRoicLiveRows } from '@/data/live/compute-roic-live'
import { computeFcfLiveRows } from '@/data/live/compute-fcf-live'
import { computeNoplatLiveRows } from '@/data/live/compute-noplat-live'
import { computeCashFlowLiveRows } from '@/data/live/compute-cash-flow-live'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { FCF_MANIFEST } from '@/data/manifests/fcf'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { formatPercent, formatIdr } from '@/components/financial/format'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

type RowKey = 'netFaEnd' | 'netCaEnd' | 'netFaBeg' | 'netCaBeg' | 'totalNetInvestment' | 'totalIcBoy' | 'growthRate'

const ROWS: { label: TranslationKey; key: RowKey; kind: 'idr' | 'percent'; bold?: boolean; spaceBefore?: boolean }[] = [
  { label: 'growthRate.row.netFA', key: 'netFaEnd', kind: 'idr' },
  { label: 'growthRate.row.netCA', key: 'netCaEnd', kind: 'idr' },
  { label: 'growthRate.row.lessNetFABeg', key: 'netFaBeg', kind: 'idr' },
  { label: 'growthRate.row.lessNetCABeg', key: 'netCaBeg', kind: 'idr' },
  { label: 'growthRate.row.totalNetInvestment', key: 'totalNetInvestment', kind: 'idr', bold: true },
  { label: 'growthRate.row.totalIC', key: 'totalIcBoy', kind: 'idr', spaceBefore: true },
  { label: 'growthRate.row.growthRate', key: 'growthRate', kind: 'percent', bold: true, spaceBefore: true },
]

export default function GrowthRatePage() {
  const { t } = useT()
  const home = useKkaStore(s => s.home)
  const balanceSheet = useKkaStore(s => s.balanceSheet)
  const incomeStatement = useKkaStore(s => s.incomeStatement)
  const fixedAsset = useKkaStore(s => s.fixedAsset)
  const accPayables = useKkaStore(s => s.accPayables)
  const hasHydrated = useKkaStore(s => s._hasHydrated)

  const data = useMemo(() => {
    if (!hasHydrated || !home || !balanceSheet || !incomeStatement) return null

    const years3 = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)

    // Full upstream chain: IS → NOPLAT → CFS → FCF → ROIC → Growth Rate
    const noplatLeaf = computeNoplatLiveRows(incomeStatement.rows, years3)
    const noplatComp = deriveComputedRows(NOPLAT_MANIFEST.rows, noplatLeaf, years3)
    const allNoplat = { ...noplatLeaf, ...noplatComp }

    const faRows = fixedAsset?.rows ?? null
    const faComp = faRows
      ? deriveComputedRows(FIXED_ASSET_MANIFEST.rows, faRows, years3)
      : null

    const cfsLeaf = computeCashFlowLiveRows(
      balanceSheet.rows, incomeStatement.rows, faRows, accPayables?.rows ?? null, years3, bsYears,
    )
    const cfsComp = deriveComputedRows(CASH_FLOW_STATEMENT_MANIFEST.rows, cfsLeaf, years3)
    const allCfs = { ...cfsLeaf, ...cfsComp }

    const fcfLeaf = computeFcfLiveRows(allNoplat, faComp, allCfs, years3)
    const fcfComp = deriveComputedRows(FCF_MANIFEST.rows, fcfLeaf, years3)
    const allFcf = { ...fcfLeaf, ...fcfComp }

    const bsComp = deriveComputedRows(BALANCE_SHEET_MANIFEST.rows, balanceSheet.rows, bsYears)
    const allBs = { ...bsComp, ...balanceSheet.rows }

    const roicRows = computeRoicLiveRows(allFcf, allBs, years3)

    // Merge FA computed rows for row 69
    const allFa = faComp ? { ...(faRows ?? {}), ...faComp } : {}

    return computeGrowthRateLive(allBs, allFa, roicRows, years3)
  }, [hasHydrated, home, balanceSheet, incomeStatement, fixedAsset, accPayables])

  if (!hasHydrated) return null
  if (!home || !balanceSheet || !incomeStatement) {
    return (
      <PageEmptyState section={t('nav.group.analysis')}
        title={t('nav.item.growthRate')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          { label: 'Balance Sheet', href: '/input/balance-sheet', filled: !!balanceSheet },
          { label: 'Income Statement', href: '/input/income-statement', filled: !!incomeStatement },
          { label: 'Fixed Asset', href: '/input/fixed-asset', filled: !!fixedAsset },
        ]}
      />
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-[900px] p-6">
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-ink">{t('growthRate.title')}</h1>
        <div className="rounded border border-grid bg-canvas-raised px-4 py-6 text-center text-sm text-ink-muted">
          <p>{t('common.noData')}</p>
        </div>
      </div>
    )
  }

  const { result, years, inputs } = data
  const displayArrays: Record<RowKey, number[]> = {
    netFaEnd: inputs.netFaEnd,
    netCaEnd: inputs.netCaEnd,
    netFaBeg: inputs.netFaBeg,
    netCaBeg: inputs.netCaBeg,
    totalNetInvestment: result.totalNetInvestment,
    totalIcBoy: inputs.totalIcBoy,
    growthRate: result.growthRates,
  }

  return (
    <div className="mx-auto max-w-[900px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">{t('growthRate.title')}</h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('growthRate.subtitle')}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-grid-strong">
              <th className="px-3 py-2 text-left font-medium text-ink-muted">{t('common.description')}</th>
              {years.map(y => (
                <th key={y} className="px-3 py-2 text-right font-mono font-medium text-ink-muted tabular-nums">
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr
                key={row.key}
                className={
                  row.bold
                    ? 'border-t-2 border-grid-strong bg-canvas-raised font-semibold'
                    : row.spaceBefore
                      ? 'border-t border-grid-strong'
                      : 'border-b border-grid'
                }
              >
                <td className="px-3 py-2 text-ink">{t(row.label)}</td>
                {years.map((y, i) => {
                  const val = displayArrays[row.key]?.[i]
                  const formatted =
                    val === undefined
                      ? '—'
                      : row.kind === 'percent'
                        ? formatPercent(val)
                        : formatIdr(val)
                  const isNeg = val !== undefined && val < 0
                  return (
                    <td
                      key={y}
                      className={`px-3 py-2 text-right font-mono tabular-nums ${isNeg ? 'text-negative' : ''}`}
                    >
                      {formatted}
                    </td>
                  )
                })}
              </tr>
            ))}
            {/* Empty row separator */}
            <tr className="border-t-2 border-grid-strong" />
            {/* Average row */}
            <tr className="bg-canvas-raised">
              <td className="px-3 py-3 font-semibold text-ink">{t('growthRate.average')}</td>
              <td
                colSpan={years.length}
                className="px-3 py-3 text-right font-mono text-lg font-semibold tabular-nums text-accent"
              >
                {formatPercent(result.average)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

