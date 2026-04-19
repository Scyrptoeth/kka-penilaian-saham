'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { computeWcBreakdown } from '@/lib/calculations/wc-breakdown'
import {
  BS_CATALOG_ALL,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'
import { formatIdr } from '@/components/financial/format'
import type { YearKeyedSeries } from '@/types/financial'
import type { WcAccountBreakdown } from '@/lib/calculations/wc-breakdown'

/**
 * Inline breakdown of CHANGES IN WORKING CAPITAL rendered below the FCF
 * aggregate table — Session 053 (Q3=Z).
 *
 * Pure transparency: for each included CA / CL account, shows per-year
 * contribution to the aggregate. Summing each column across included
 * accounts equals FCF row 12 / row 13 exactly (LESSON-139 driver-display
 * sync applied — the breakdown IS the aggregate).
 *
 * No editor here — scope edits happen at `/analysis/changes-in-working-capital`.
 * A link to the dedicated page is provided for convenience.
 */
export function FcfCwcBreakdown() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const scope = useKkaStore((s) => s.changesInWorkingCapital)

  const language: 'en' | 'id' = balanceSheet?.language ?? 'id'

  const breakdown = useMemo(() => {
    if (!home || !balanceSheet || scope === null) return null
    const cfsYears = computeHistoricalYears(home.tahunTransaksi, 3)
    const bsYears = computeHistoricalYears(home.tahunTransaksi, 4)
    return {
      cfsYears,
      data: computeWcBreakdown(
        balanceSheet.accounts,
        balanceSheet.rows,
        cfsYears,
        bsYears,
        scope.excludedCurrentAssets,
        scope.excludedCurrentLiabilities,
      ),
    }
  }, [home, balanceSheet, scope])

  if (!breakdown || !balanceSheet) return null

  const { cfsYears, data } = breakdown

  return (
    <section className="mx-auto mt-10 max-w-[1100px] px-6 pb-16">
      <header className="mb-4 flex items-end justify-between gap-4 border-b border-grid pb-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-ink">
            {t('fcf.cwcBreakdown.heading')}
          </h2>
          <p className="mt-1 text-xs text-ink-muted">
            {t('fcf.cwcBreakdown.subtitle')}
          </p>
        </div>
        <Link
          href="/analysis/changes-in-working-capital"
          className="shrink-0 rounded-sm border border-grid px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t('fcf.cwcBreakdown.editScope')}
        </Link>
      </header>

      <BreakdownTable
        sectionTitle={t('fcf.cwcBreakdown.ca.heading')}
        totalLabel={t('fcf.cwcBreakdown.ca.total')}
        included={data.caIncluded}
        excluded={data.caExcluded}
        accounts={balanceSheet.accounts}
        language={language}
        years={cfsYears}
      />

      <BreakdownTable
        sectionTitle={t('fcf.cwcBreakdown.cl.heading')}
        totalLabel={t('fcf.cwcBreakdown.cl.total')}
        included={data.clIncluded}
        excluded={data.clExcluded}
        accounts={balanceSheet.accounts}
        language={language}
        years={cfsYears}
      />

      <TriviaPanel />
    </section>
  )
}

function BreakdownTable({
  sectionTitle,
  totalLabel,
  included,
  excluded,
  accounts,
  language,
  years,
}: {
  sectionTitle: string
  totalLabel: string
  included: readonly WcAccountBreakdown[]
  excluded: readonly WcAccountBreakdown[]
  accounts: readonly BsAccountEntry[]
  language: 'en' | 'id'
  years: readonly number[]
}) {
  const { t } = useT()
  const [showExcluded, setShowExcluded] = useState(false)

  const totals = useMemo<YearKeyedSeries>(() => {
    const out: YearKeyedSeries = {}
    for (const year of years) {
      let sum = 0
      for (const entry of included) sum += entry.series[year] ?? 0
      out[year] = sum
    }
    return out
  }, [included, years])

  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.08em] text-ink-muted">
        {sectionTitle}
        <span className="ml-2 text-xs font-normal text-ink-muted">
          ({t('fcf.cwcBreakdown.includedCount', { count: included.length })})
        </span>
      </h3>

      {included.length === 0 ? (
        <p className="py-4 text-sm text-ink-muted">{t('fcf.cwcBreakdown.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-grid">
                <th className="px-3 py-2 text-left font-medium text-ink-muted"></th>
                {years.map((y) => (
                  <th
                    key={y}
                    className="px-3 py-2 text-right font-mono text-xs font-semibold text-ink-muted"
                  >
                    {y}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {included.map((entry) => (
                <tr key={entry.excelRow} className="border-b border-grid">
                  <td className="px-3 py-1.5 text-ink-soft">
                    {resolveLabel(entry.excelRow, accounts, language)}
                  </td>
                  {years.map((y) => {
                    const v = entry.series[y] ?? 0
                    return (
                      <td
                        key={y}
                        className={`px-3 py-1.5 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : 'text-ink'}`}
                      >
                        {formatIdr(v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-t-2 border-grid-strong font-semibold">
                <td className="px-3 py-1.5 text-ink">{totalLabel}</td>
                {years.map((y) => {
                  const v = totals[y] ?? 0
                  return (
                    <td
                      key={y}
                      className={`px-3 py-1.5 text-right font-mono tabular-nums ${v < 0 ? 'text-negative' : 'text-ink'}`}
                    >
                      {formatIdr(v)}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {excluded.length > 0 && (
        <div className="mt-3 border-t border-dashed border-grid pt-2">
          <button
            type="button"
            onClick={() => setShowExcluded((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-expanded={showExcluded}
          >
            <span>
              {t('fcf.cwcBreakdown.excludedLabel', { count: excluded.length })}
            </span>
            <span aria-hidden="true">{showExcluded ? '−' : '+'}</span>
          </button>
          {showExcluded && (
            <ul className="mt-2 divide-y divide-grid/60">
              {excluded.map((entry) => (
                <li
                  key={entry.excelRow}
                  className="flex items-center gap-3 py-1.5 opacity-70"
                >
                  <span className="flex-1 text-sm text-ink-muted line-through">
                    {resolveLabel(entry.excelRow, accounts, language)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function TriviaPanel() {
  const { t } = useT()
  return (
    <aside
      role="note"
      className="mt-8 rounded-sm border-l-2 border-accent bg-canvas-raised px-5 py-4 text-sm text-ink-soft"
    >
      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('wc.trivia.heading')}
      </h3>
      <p className="text-xs leading-relaxed">{t('wc.trivia.intro1')}</p>
      <p className="mt-2 text-xs leading-relaxed">{t('wc.trivia.intro2')}</p>
      <p className="mt-3 text-[11px] italic text-ink-muted">
        {t('fcf.cwcBreakdown.triviaFooter')}
      </p>
    </aside>
  )
}

function resolveLabel(
  excelRow: number,
  accounts: readonly BsAccountEntry[],
  language: 'en' | 'id',
): string {
  const account = accounts.find((a) => a.excelRow === excelRow)
  if (!account) return `Row ${excelRow}`
  if (account.customLabel) return account.customLabel
  const catalogEntry = BS_CATALOG_ALL.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}
