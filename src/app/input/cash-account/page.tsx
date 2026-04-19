'use client'

import { useMemo, useState } from 'react'
import {
  useKkaStore,
  type CashAccountState,
} from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import {
  BS_CATALOG_ALL,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * /input/cash-account — Session 055 Task 8 scope editor.
 *
 * Partitions the user's BS current-assets accounts into TWO disjoint buckets:
 *   - `bank`        → Cash Ending in Bank (CFS row 35)
 *   - `cashOnHand`  → Cash Ending in Cash on Hand (CFS row 36)
 *
 * Cross-list mutual exclusion: each BS account can live in AT MOST one bucket.
 * The store's `assignCashAccount` setter already enforces this, but the UI
 * draft also enforces it client-side so the dropdown filter behaves correctly
 * before the user commits. Soft warning renders if any selected account is
 * not in `state.cashBalance.accounts` — this nudges consistency between the
 * Cash Balance scope (which accounts count as "cash") and the Cash Account
 * partition (where that cash physically lives).
 *
 * UX contract: local draft + "Confirm Scope" / "Update Scope" commit button
 * mirroring the IBD / CWC pattern. First confirm flips `cashAccount` from
 * null → object and unlocks the downstream Cash Flow Statement page.
 */

type BucketRow = keyof CashAccountState

function resolveLabel(
  account: BsAccountEntry,
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = BS_CATALOG_ALL.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

function CashAccountScopeEditor() {
  const { t } = useT()
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const storedScope = useKkaStore((s) => s.cashAccount)
  const cashBalance = useKkaStore((s) => s.cashBalance)
  const confirmCashAccountScope = useKkaStore((s) => s.confirmCashAccountScope)

  const language: 'en' | 'id' = balanceSheet?.language ?? 'id'

  const [localDraft, setLocalDraft] = useState<CashAccountState>(
    () => storedScope ?? { bank: [], cashOnHand: [] },
  )

  const currentAssets = useMemo<BsAccountEntry[]>(
    () =>
      (balanceSheet?.accounts ?? []).filter(
        (a) => a.section === 'current_assets',
      ),
    [balanceSheet],
  )

  const assignedSet = useMemo(
    () => new Set<number>([...localDraft.bank, ...localDraft.cashOnHand]),
    [localDraft],
  )

  const availableForAdd = useMemo(
    () => currentAssets.filter((a) => !assignedSet.has(a.excelRow)),
    [currentAssets, assignedSet],
  )

  const addTo = (row: BucketRow, excelRow: number) => {
    setLocalDraft((prev) => ({
      bank: row === 'bank'
        ? [...prev.bank.filter((r) => r !== excelRow), excelRow]
        : prev.bank.filter((r) => r !== excelRow),
      cashOnHand: row === 'cashOnHand'
        ? [...prev.cashOnHand.filter((r) => r !== excelRow), excelRow]
        : prev.cashOnHand.filter((r) => r !== excelRow),
    }))
  }

  const removeFrom = (row: BucketRow, excelRow: number) => {
    setLocalDraft((prev) => ({
      ...prev,
      [row]: prev[row].filter((r) => r !== excelRow),
    }))
  }

  const isDirty =
    storedScope === null ||
    JSON.stringify([...localDraft.bank].sort()) !==
      JSON.stringify([...(storedScope.bank ?? [])].sort()) ||
    JSON.stringify([...localDraft.cashOnHand].sort()) !==
      JSON.stringify([...(storedScope.cashOnHand ?? [])].sort())

  const handleConfirm = () => {
    if (storedScope === null) {
      confirmCashAccountScope()
    }
    useKkaStore.setState({ cashAccount: localDraft })
  }

  const confirmed = storedScope !== null

  // Soft warning: any draft account NOT in cashBalance.accounts
  const warningAccounts = useMemo<BsAccountEntry[]>(() => {
    if (!cashBalance) return []
    const cashBalanceSet = new Set(cashBalance.accounts)
    return currentAssets.filter(
      (a) => assignedSet.has(a.excelRow) && !cashBalanceSet.has(a.excelRow),
    )
  }, [cashBalance, currentAssets, assignedSet])

  return (
    <div className="mx-auto max-w-[980px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('cashAccount.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('cashAccount.subtitle')}
      </p>

      <BucketEditor
        row="bank"
        title={t('cashAccount.section.bank')}
        bucket={localDraft.bank}
        currentAssets={currentAssets}
        available={availableForAdd}
        onAdd={(excelRow) => addTo('bank', excelRow)}
        onRemove={(excelRow) => removeFrom('bank', excelRow)}
        language={language}
      />

      <div className="h-6" />

      <BucketEditor
        row="cashOnHand"
        title={t('cashAccount.section.cashOnHand')}
        bucket={localDraft.cashOnHand}
        currentAssets={currentAssets}
        available={availableForAdd}
        onAdd={(excelRow) => addTo('cashOnHand', excelRow)}
        onRemove={(excelRow) => removeFrom('cashOnHand', excelRow)}
        language={language}
      />

      {warningAccounts.length > 0 && (
        <aside
          role="note"
          className="mt-6 border-l-2 border-accent pl-3 text-sm text-ink-muted"
        >
          {t('cashAccount.warning.notInCashBalance')}
        </aside>
      )}

      <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-sm border border-grid bg-canvas-raised/95 p-4 shadow-[0_2px_8px_rgba(10,22,40,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`text-xs ${confirmed ? 'text-accent' : 'text-negative'}`}
        >
          {confirmed
            ? t('cashAccount.state.confirmed')
            : t('cashAccount.state.unconfirmed')}
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmed && !isDirty}
          className="rounded-sm border border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-canvas-raised transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {confirmed
            ? t('cashAccount.action.update')
            : t('cashAccount.action.confirm')}
        </button>
      </div>

      <div className="h-6" />

      <TriviaSection />
    </div>
  )
}

function BucketEditor({
  row,
  title,
  bucket,
  currentAssets,
  available,
  onAdd,
  onRemove,
  language,
}: {
  row: BucketRow
  title: string
  bucket: number[]
  currentAssets: BsAccountEntry[]
  available: BsAccountEntry[]
  onAdd: (excelRow: number) => void
  onRemove: (excelRow: number) => void
  language: 'en' | 'id'
}) {
  const { t } = useT()

  const selected = bucket
    .map((excelRow) => currentAssets.find((a) => a.excelRow === excelRow))
    .filter((a): a is BsAccountEntry => a !== undefined)

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    if (!value) return
    onAdd(Number(value))
    e.target.value = ''
  }

  return (
    <section
      aria-labelledby={`cash-account-section-${row}`}
      className="rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <header className="mb-4 flex items-center justify-between">
        <h2
          id={`cash-account-section-${row}`}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          {title}
        </h2>
      </header>

      <div className="mb-4">
        <select
          onChange={handleChange}
          defaultValue=""
          className="w-full rounded-sm border border-grid bg-canvas px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="" disabled>
            {t('cashAccount.dropdown.placeholder')}
          </option>
          {available.map((account) => (
            <option key={account.excelRow} value={account.excelRow}>
              {resolveLabel(account, language)}
            </option>
          ))}
        </select>
      </div>

      {selected.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">
          {t('cashAccount.empty.section')}
        </p>
      ) : (
        <ul className="divide-y divide-grid">
          {selected.map((account) => (
            <li
              key={account.excelRow}
              className="flex items-center gap-3 py-2.5"
            >
              <span className="flex-1 text-sm text-ink">
                {resolveLabel(account, language)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(account.excelRow)}
                aria-label={t('cashAccount.action.remove')}
                title={t('cashAccount.action.remove')}
                className="shrink-0 rounded-sm border border-grid p-1.5 text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function TriviaSection() {
  const { t } = useT()
  return (
    <section
      aria-labelledby="cash-account-trivia-heading"
      className="rounded-sm border border-grid bg-canvas-raised p-6 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="cash-account-trivia-heading"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('cashAccount.trivia.heading')}
      </h2>
      <p className="text-sm leading-relaxed text-ink-soft">
        {t('cashAccount.trivia.intro')}
      </p>
    </section>
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

export default function CashAccountPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[760px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  const bsFilled = !!balanceSheet && balanceSheet.accounts.length > 0

  if (!home || !bsFilled) {
    return (
      <PageEmptyState
        section={t('nav.group.inputData')}
        title={t('cashAccount.title')}
        inputs={[
          { label: t('nav.item.home'), href: '/', filled: !!home },
          {
            label: t('nav.item.balanceSheet'),
            href: '/input/balance-sheet',
            filled: bsFilled,
          },
        ]}
      />
    )
  }

  return <CashAccountScopeEditor />
}
