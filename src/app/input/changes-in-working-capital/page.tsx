'use client'

import { useMemo, useState } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import {
  BS_CATALOG_ALL,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { formatIdr } from '@/components/financial/format'
import { averageSeries } from '@/lib/calculations/derivation-helpers'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'

/**
 * /input/changes-in-working-capital — Session 039
 *
 * Required gate for CFS / FCF / FR / DCF / EEM / CFI / Simulasi /
 * Dashboard / Proy CFS. Lets the user refine the scope of Operating
 * Working Capital by excluding specific CA / CL accounts (e.g. Cash,
 * IBD, short-term investments) from the ΔWC aggregation.
 *
 * Store slice shape:
 *   changesInWorkingCapital: {
 *     excludedCurrentAssets: number[]   // BS excelRow list
 *     excludedCurrentLiabilities: number[]
 *   } | null                             // null = not yet confirmed
 *
 * UX contract: clicking the trash icon on an account in the "Included"
 * list toggles it in-memory to the per-section exclusion set — the store
 * only changes on click of "Confirm Scope" / "Update Scope". Excluded
 * accounts appear in a collapsible section below each section with a
 * restore icon to move them back.
 */

type Section = 'current_assets' | 'current_liabilities'

function resolveLabel(
  account: BsAccountEntry,
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = BS_CATALOG_ALL.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

function WcScopeEditor() {
  const { t } = useT()
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const storedScope = useKkaStore((s) => s.changesInWorkingCapital)
  const confirmWcScope = useKkaStore((s) => s.confirmWcScope)
  const setScope = useKkaStore.setState

  const language: 'en' | 'id' = balanceSheet?.language ?? 'id'
  const tahunTransaksi = useKkaStore(
    (s) => s.home?.tahunTransaksi ?? new Date().getFullYear(),
  )
  const yearCount = balanceSheet?.yearCount ?? 3
  const historicalYears = useMemo(
    () => computeHistoricalYears(tahunTransaksi, yearCount),
    [tahunTransaksi, yearCount],
  )
  const lastHistYear = historicalYears[historicalYears.length - 1] ?? tahunTransaksi - 1

  // Local exclusion draft — commits to store via "Confirm" / "Update" button.
  const [localCA, setLocalCA] = useState<number[]>(
    () => storedScope?.excludedCurrentAssets ?? [],
  )
  const [localCL, setLocalCL] = useState<number[]>(
    () => storedScope?.excludedCurrentLiabilities ?? [],
  )

  const accounts = useMemo(() => balanceSheet?.accounts ?? [], [balanceSheet])
  const caAccounts = useMemo(
    () => accounts.filter((a) => a.section === 'current_assets'),
    [accounts],
  )
  const clAccounts = useMemo(
    () => accounts.filter((a) => a.section === 'current_liabilities'),
    [accounts],
  )

  const caExcludedSet = new Set(localCA)
  const clExcludedSet = new Set(localCL)

  const isDirty =
    storedScope === null ||
    JSON.stringify([...localCA].sort()) !==
      JSON.stringify([...(storedScope.excludedCurrentAssets ?? [])].sort()) ||
    JSON.stringify([...localCL].sort()) !==
      JSON.stringify([...(storedScope.excludedCurrentLiabilities ?? [])].sort())

  const toggleCA = (row: number) => {
    setLocalCA((prev) =>
      prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row],
    )
  }
  const toggleCL = (row: number) => {
    setLocalCL((prev) =>
      prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row],
    )
  }

  const handleConfirm = () => {
    if (storedScope === null) {
      confirmWcScope()
    }
    setScope({
      changesInWorkingCapital: {
        excludedCurrentAssets: [...localCA],
        excludedCurrentLiabilities: [...localCL],
      },
    })
  }

  const confirmed = storedScope !== null

  return (
    <div className="mx-auto max-w-[980px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('wc.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">{t('wc.subtitle')}</p>

      <SectionEditor
        section="current_assets"
        title={t('wc.section.currentAssets')}
        accounts={caAccounts}
        excludedSet={caExcludedSet}
        onToggle={toggleCA}
        language={language}
        years={historicalYears}
        displayYear={lastHistYear}
      />

      <div className="h-6" />

      <SectionEditor
        section="current_liabilities"
        title={t('wc.section.currentLiabilities')}
        accounts={clAccounts}
        excludedSet={clExcludedSet}
        onToggle={toggleCL}
        language={language}
        years={historicalYears}
        displayYear={lastHistYear}
      />

      <div className="sticky bottom-4 z-10 mt-8 flex items-center justify-between rounded-sm border border-grid bg-canvas-raised/95 p-4 shadow-[0_2px_8px_rgba(10,22,40,0.08)] backdrop-blur">
        <p
          role="status"
          className={`text-xs ${confirmed ? 'text-accent' : 'text-negative'}`}
        >
          {confirmed ? t('wc.state.confirmed') : t('wc.state.unconfirmed')}
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmed && !isDirty}
          className="rounded-sm border border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-canvas-raised transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {confirmed ? t('wc.action.update') : t('wc.action.confirm')}
        </button>
      </div>

      <div className="h-6" />

      <TriviaSection />
    </div>
  )
}

function SectionEditor({
  section,
  title,
  accounts,
  excludedSet,
  onToggle,
  language,
  years,
  displayYear,
}: {
  section: Section
  title: string
  accounts: BsAccountEntry[]
  excludedSet: Set<number>
  onToggle: (row: number) => void
  language: 'en' | 'id'
  years: number[]
  displayYear: number
}) {
  const { t } = useT()
  const bsRows = useKkaStore((s) => s.balanceSheet?.rows)
  const [excludedOpen, setExcludedOpen] = useState(false)

  const included = accounts.filter((a) => !excludedSet.has(a.excelRow))
  const excluded = accounts.filter((a) => excludedSet.has(a.excelRow))

  const valueFor = (row: number, year: number): number =>
    bsRows?.[row]?.[year] ?? 0

  return (
    <section
      aria-labelledby={`wc-section-${section}`}
      className="rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <header className="mb-4 flex items-center justify-between">
        <h2
          id={`wc-section-${section}`}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          {title}
        </h2>
        <span className="text-xs text-ink-muted">{t('wc.included.label')}</span>
      </header>

      {accounts.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">{t('wc.empty.section')}</p>
      ) : included.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">—</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-grid text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                <th className="py-2 pr-4 text-left font-semibold">
                  {t('wc.col.account')}
                </th>
                {years.map((year) => (
                  <th
                    key={year}
                    className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums"
                  >
                    {year}
                  </th>
                ))}
                <th className="whitespace-nowrap border-l-2 border-grid px-3 py-2 text-right font-semibold">
                  {t('common.average')}
                </th>
                <th className="w-10 py-2 pl-3" aria-label="" />
              </tr>
            </thead>
            <tbody className="divide-y divide-grid">
              {included.map((account) => {
                const series = bsRows?.[account.excelRow]
                const avg = averageSeries(series, years)
                return (
                  <tr key={account.excelRow}>
                    <td className="py-2.5 pr-4 text-ink">
                      {resolveLabel(account, language)}
                    </td>
                    {years.map((year) => (
                      <td
                        key={year}
                        className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm tabular-nums text-ink-soft"
                      >
                        {formatIdr(valueFor(account.excelRow, year))}
                      </td>
                    ))}
                    <td className="whitespace-nowrap border-l-2 border-grid px-3 py-2.5 text-right font-mono text-sm tabular-nums font-semibold text-ink">
                      {avg == null ? '—' : formatIdr(avg)}
                    </td>
                    <td className="py-2.5 pl-3 text-right">
                      <button
                        type="button"
                        onClick={() => onToggle(account.excelRow)}
                        aria-label={t('wc.action.exclude')}
                        title={t('wc.action.exclude')}
                        className="shrink-0 rounded-sm border border-grid p-1.5 text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {excluded.length > 0 && (
        <div className="mt-4 border-t border-dashed border-grid pt-3">
          <button
            type="button"
            onClick={() => setExcludedOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted transition-colors hover:text-ink"
          >
            <span>
              {t('wc.excluded.label')} ·{' '}
              {t('wc.excluded.count', { count: excluded.length })}
            </span>
            <ChevronIcon open={excludedOpen} />
          </button>
          {excludedOpen && (
            <ul className="mt-3 divide-y divide-grid/70">
              {excluded.map((account) => (
                <li
                  key={account.excelRow}
                  className="flex items-center gap-3 py-2 opacity-70"
                >
                  <span className="flex-1 text-sm text-ink-muted line-through">
                    {resolveLabel(account, language)}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-ink-muted">
                    {formatIdr(valueFor(account.excelRow, displayYear))}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(account.excelRow)}
                    aria-label={t('wc.action.include')}
                    title={t('wc.action.include')}
                    className="shrink-0 rounded-sm border border-grid p-1.5 text-ink-muted transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <RestoreIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}

function TriviaSection() {
  const { t } = useT()
  return (
    <section
      aria-labelledby="wc-trivia-heading"
      className="rounded-sm border border-grid bg-canvas-raised p-6 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="wc-trivia-heading"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('wc.trivia.heading')}
      </h2>

      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('wc.trivia.intro1')}
      </p>
      <p className="mb-6 text-sm leading-relaxed text-ink-soft">
        {t('wc.trivia.intro2')}
      </p>

      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('wc.trivia.excludeCA.heading')}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('wc.trivia.excludeCA.intro')}
      </p>
      <ul className="mb-8 space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem term={t('wc.trivia.excludeCA.cash.term')} desc={t('wc.trivia.excludeCA.cash.desc')} />
        <TriviaItem term={t('wc.trivia.excludeCA.stInvest.term')} desc={t('wc.trivia.excludeCA.stInvest.desc')} />
        <TriviaItem term={t('wc.trivia.excludeCA.nonTradeRecv.term')} desc={t('wc.trivia.excludeCA.nonTradeRecv.desc')} />
        <TriviaItem term={t('wc.trivia.excludeCA.derivative.term')} desc={t('wc.trivia.excludeCA.derivative.desc')} />
      </ul>

      <div className="mb-4 border-t border-grid" />

      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('wc.trivia.excludeCL.heading')}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('wc.trivia.excludeCL.intro')}
      </p>
      <ul className="mb-8 space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem term={t('wc.trivia.excludeCL.stBank.term')} desc={t('wc.trivia.excludeCL.stBank.desc')} />
        <TriviaItem term={t('wc.trivia.excludeCL.currentPortion.term')} desc={t('wc.trivia.excludeCL.currentPortion.desc')} />
        <TriviaItem term={t('wc.trivia.excludeCL.interestPayable.term')} desc={t('wc.trivia.excludeCL.interestPayable.desc')} />
        <TriviaItem term={t('wc.trivia.excludeCL.dividendsPayable.term')} desc={t('wc.trivia.excludeCL.dividendsPayable.desc')} />
      </ul>

      <div className="mb-4 border-t border-grid" />

      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('wc.trivia.include.heading')}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('wc.trivia.include.intro')}
      </p>

      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {t('wc.trivia.include.ca.heading')}
      </h4>
      <ul className="mb-6 space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem term={t('wc.trivia.include.ca.ar.term')} desc={t('wc.trivia.include.ca.ar.desc')} />
        <TriviaItem term={t('wc.trivia.include.ca.inventory.term')} desc={t('wc.trivia.include.ca.inventory.desc')} />
        <TriviaItem term={t('wc.trivia.include.ca.prepaid.term')} desc={t('wc.trivia.include.ca.prepaid.desc')} />
      </ul>

      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted">
        {t('wc.trivia.include.cl.heading')}
      </h4>
      <ul className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem term={t('wc.trivia.include.cl.ap.term')} desc={t('wc.trivia.include.cl.ap.desc')} />
        <TriviaItem term={t('wc.trivia.include.cl.accrued.term')} desc={t('wc.trivia.include.cl.accrued.desc')} />
        <TriviaItem term={t('wc.trivia.include.cl.unearned.term')} desc={t('wc.trivia.include.cl.unearned.desc')} />
      </ul>
    </section>
  )
}

function TriviaItem({ term, desc }: { term: string; desc: string }) {
  return (
    <li className="pl-5 relative">
      <span
        aria-hidden
        className="absolute left-0 top-[9px] block h-1.5 w-1.5 rounded-full bg-accent"
      />
      <strong className="font-semibold text-ink">{term}</strong>
      <span className="text-ink-soft"> — {desc}</span>
    </li>
  )
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <polyline points="3 3 3 9 9 9" />
    </svg>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function ChangesInWorkingCapitalPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[760px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  if (!balanceSheet || balanceSheet.accounts.length === 0) {
    return (
      <PageEmptyState
        section={t('nav.group.analysis')}
        title={t('wc.title')}
        inputs={[
          {
            label: t('nav.item.balanceSheet'),
            href: '/input/balance-sheet',
            filled: !!balanceSheet && balanceSheet.accounts.length > 0,
          },
        ]}
      />
    )
  }

  return <WcScopeEditor />
}
