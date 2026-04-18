'use client'

import { useMemo, useState } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import {
  BS_CATALOG_ALL,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'
import { computeInterestBearingDebt } from '@/lib/calculations/upstream-helpers'
import { PageEmptyState } from '@/components/shared/PageEmptyState'
import { formatIdr } from '@/components/financial/format'

/**
 * /valuation/interest-bearing-debt — Session 041 Task 5 redesign.
 *
 * Replaces the Session 038 single-numeric-input page with a Working-Capital-style
 * scope editor: list every Current + Non-Current Liability account from the
 * Balance Sheet read-only, give the user a trash icon to mark each account
 * "NOT Interest Bearing Debt". The IBD total is then derived in real-time from
 * the remaining (included) accounts via `computeInterestBearingDebt`.
 *
 * Store slice shape (Session 041 v18→v19 migration):
 *   interestBearingDebt: {
 *     excludedCurrentLiabilities: number[]      // BS excelRow list
 *     excludedNonCurrentLiabilities: number[]
 *   } | null                                     // null = not yet confirmed
 *
 * UX contract: identical to /analysis/changes-in-working-capital — local
 * exclusion draft commits to store via "Confirm Scope" / "Update Scope".
 * Excluded accounts appear in a collapsible section below each section with
 * a restore icon to put them back. Trivia block (always-visible) preserved
 * from the Session 038 design — content is unchanged, helpful for the
 * "exclude which?" decision.
 */

type Section = 'current_liabilities' | 'non_current_liabilities'

function resolveLabel(
  account: BsAccountEntry,
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = BS_CATALOG_ALL.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

function IbdScopeEditor() {
  const { t } = useT()
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const storedScope = useKkaStore((s) => s.interestBearingDebt)
  const confirmIbdScope = useKkaStore((s) => s.confirmIbdScope)
  const setScope = useKkaStore.setState

  const language: 'en' | 'id' = balanceSheet?.language ?? 'id'
  const lastHistYear = useKkaStore((s) => s.home?.tahunTransaksi ?? new Date().getFullYear())
  const displayYear = lastHistYear - 1

  // Local exclusion draft — commits to store via "Confirm" / "Update" button.
  const [localCL, setLocalCL] = useState<number[]>(
    () => storedScope?.excludedCurrentLiabilities ?? [],
  )
  const [localNCL, setLocalNCL] = useState<number[]>(
    () => storedScope?.excludedNonCurrentLiabilities ?? [],
  )

  const accounts = useMemo(() => balanceSheet?.accounts ?? [], [balanceSheet])
  const clAccounts = useMemo(
    () => accounts.filter((a) => a.section === 'current_liabilities'),
    [accounts],
  )
  const nclAccounts = useMemo(
    () => accounts.filter((a) => a.section === 'non_current_liabilities'),
    [accounts],
  )

  const clExcludedSet = new Set(localCL)
  const nclExcludedSet = new Set(localNCL)

  const isDirty =
    storedScope === null ||
    JSON.stringify([...localCL].sort()) !==
      JSON.stringify([...(storedScope.excludedCurrentLiabilities ?? [])].sort()) ||
    JSON.stringify([...localNCL].sort()) !==
      JSON.stringify([...(storedScope.excludedNonCurrentLiabilities ?? [])].sort())

  const toggleCL = (row: number) => {
    setLocalCL((prev) =>
      prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row],
    )
  }
  const toggleNCL = (row: number) => {
    setLocalNCL((prev) =>
      prev.includes(row) ? prev.filter((r) => r !== row) : [...prev, row],
    )
  }

  const handleConfirm = () => {
    if (storedScope === null) {
      confirmIbdScope()
    }
    setScope({
      interestBearingDebt: {
        excludedCurrentLiabilities: [...localCL],
        excludedNonCurrentLiabilities: [...localNCL],
      },
    })
  }

  // Live IBD total preview — uses the LOCAL exclusion draft (not store) so the
  // user sees the impact of every trash-icon click before committing.
  const ibdTotal = useMemo(() => {
    if (!balanceSheet) return 0
    return computeInterestBearingDebt({
      balanceSheetAccounts: accounts,
      balanceSheetRows: balanceSheet.rows,
      interestBearingDebt: {
        excludedCurrentLiabilities: localCL,
        excludedNonCurrentLiabilities: localNCL,
      },
      year: displayYear,
    })
  }, [accounts, balanceSheet, localCL, localNCL, displayYear])

  const confirmed = storedScope !== null

  return (
    <div className="mx-auto max-w-[980px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('ibd.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">{t('ibd.subtitle')}</p>

      <SectionEditor
        section="current_liabilities"
        title={t('ibd.section.currentLiabilities')}
        accounts={clAccounts}
        excludedSet={clExcludedSet}
        onToggle={toggleCL}
        language={language}
        displayYear={displayYear}
      />

      <div className="h-6" />

      <SectionEditor
        section="non_current_liabilities"
        title={t('ibd.section.nonCurrentLiabilities')}
        accounts={nclAccounts}
        excludedSet={nclExcludedSet}
        onToggle={toggleNCL}
        language={language}
        displayYear={displayYear}
      />

      <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-sm border border-grid bg-canvas-raised/95 p-4 shadow-[0_2px_8px_rgba(10,22,40,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p
            role="status"
            className={`text-xs ${confirmed ? 'text-accent' : 'text-negative'}`}
          >
            {confirmed ? t('ibd.state.confirmed') : t('ibd.state.unconfirmed')}
          </p>
          <p className="text-[11px] uppercase tracking-[0.1em] text-ink-muted">
            {t('ibd.totalLabel')}{' '}
            <span className="ml-2 font-mono text-sm tabular-nums text-ink">
              {formatIdr(ibdTotal)}
            </span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmed && !isDirty}
          className="rounded-sm border border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-canvas-raised transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {confirmed ? t('ibd.action.update') : t('ibd.action.confirm')}
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
  displayYear,
}: {
  section: Section
  title: string
  accounts: BsAccountEntry[]
  excludedSet: Set<number>
  onToggle: (row: number) => void
  language: 'en' | 'id'
  displayYear: number
}) {
  const { t } = useT()
  const bsRows = useKkaStore((s) => s.balanceSheet?.rows)
  const [excludedOpen, setExcludedOpen] = useState(false)

  const included = accounts.filter((a) => !excludedSet.has(a.excelRow))
  const excluded = accounts.filter((a) => excludedSet.has(a.excelRow))

  const valueFor = (row: number): number => bsRows?.[row]?.[displayYear] ?? 0

  return (
    <section
      aria-labelledby={`ibd-section-${section}`}
      className="rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <header className="mb-4 flex items-center justify-between">
        <h2
          id={`ibd-section-${section}`}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          {title}
        </h2>
        <span className="text-xs text-ink-muted">{t('ibd.included.label')}</span>
      </header>

      {accounts.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">{t('ibd.empty.section')}</p>
      ) : (
        <ul className="divide-y divide-grid">
          {included.length === 0 && (
            <li className="py-3 text-sm text-ink-muted">—</li>
          )}
          {included.map((account) => (
            <li
              key={account.excelRow}
              className="flex items-center gap-3 py-2.5"
            >
              <span className="flex-1 text-sm text-ink">
                {resolveLabel(account, language)}
              </span>
              <span className="font-mono text-sm tabular-nums text-ink-soft">
                {formatIdr(valueFor(account.excelRow))}
              </span>
              <button
                type="button"
                onClick={() => onToggle(account.excelRow)}
                aria-label={t('ibd.action.exclude')}
                title={t('ibd.action.exclude')}
                className="shrink-0 rounded-sm border border-grid p-1.5 text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {excluded.length > 0 && (
        <div className="mt-4 border-t border-dashed border-grid pt-3">
          <button
            type="button"
            onClick={() => setExcludedOpen((v) => !v)}
            className="flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted transition-colors hover:text-ink"
          >
            <span>
              {t('ibd.excluded.label')} ·{' '}
              {t('ibd.excluded.count', { count: excluded.length })}
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
                    {formatIdr(valueFor(account.excelRow))}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggle(account.excelRow)}
                    aria-label={t('ibd.action.include')}
                    title={t('ibd.action.include')}
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
      aria-labelledby="ibd-trivia-heading"
      className="rounded-sm border border-grid bg-canvas-raised p-6 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="ibd-trivia-heading"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('ibd.trivia.heading')}
      </h2>

      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('ibd.trivia.intro1')}
      </p>
      <p className="mb-6 text-sm leading-relaxed text-ink-soft">
        {t('ibd.trivia.intro2')}
      </p>

      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('ibd.trivia.include.heading')}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('ibd.trivia.include.intro')}
      </p>
      <ul className="mb-8 space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem term={t('ibd.trivia.include.bankLoans.term')} desc={t('ibd.trivia.include.bankLoans.desc')} />
        <TriviaItem term={t('ibd.trivia.include.bonds.term')} desc={t('ibd.trivia.include.bonds.desc')} />
        <TriviaItem term={t('ibd.trivia.include.notes.term')} desc={t('ibd.trivia.include.notes.desc')} />
        <TriviaItem term={t('ibd.trivia.include.mortgage.term')} desc={t('ibd.trivia.include.mortgage.desc')} />
        <TriviaItem term={t('ibd.trivia.include.lease.term')} desc={t('ibd.trivia.include.lease.desc')} />
        <TriviaItem term={t('ibd.trivia.include.commercialPaper.term')} desc={t('ibd.trivia.include.commercialPaper.desc')} />
      </ul>

      <div className="mb-4 border-t border-grid" />

      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('ibd.trivia.exclude.heading')}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('ibd.trivia.exclude.intro')}
      </p>
      <ul className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem term={t('ibd.trivia.exclude.accountsPayable.term')} desc={t('ibd.trivia.exclude.accountsPayable.desc')} />
        <TriviaItem term={t('ibd.trivia.exclude.accrued.term')} desc={t('ibd.trivia.exclude.accrued.desc')} />
        <TriviaItem term={t('ibd.trivia.exclude.unearnedRevenue.term')} desc={t('ibd.trivia.exclude.unearnedRevenue.desc')} />
        <TriviaItem term={t('ibd.trivia.exclude.taxesPayable.term')} desc={t('ibd.trivia.exclude.taxesPayable.desc')} />
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

export default function InterestBearingDebtPage() {
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
        section={t('nav.group.valuation')}
        title={t('ibd.title')}
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

  return <IbdScopeEditor />
}
