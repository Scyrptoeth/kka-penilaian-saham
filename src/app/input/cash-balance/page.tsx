'use client'

import { useMemo, useState } from 'react'
import { useKkaStore, type CashBalanceState } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import {
  getCatalogBySection,
  type BsCatalogAccount,
} from '@/data/catalogs/balance-sheet-catalog'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * /input/cash-balance — Session 055 Task 7.
 *
 * Scope editor for "what counts as Cash?". User picks a subset of Balance
 * Sheet current_assets accounts that represent cash holdings. CFS Cash
 * Beginning/Ending rows are then derived from these at compute time.
 *
 * Store slice shape (Session 055):
 *   cashBalance: {
 *     accounts: number[]              // BS excelRow list
 *     preHistoryBeginning?: number    // Optional Y0 pre-period balance
 *   } | null                           // null = not yet confirmed
 *
 * UX contract mirrors /input/interest-bearing-debt — local draft commits
 * via "Confirm Scope" / "Update Scope" button. Dropdown-driven add +
 * trash-icon removal (simpler than IBD's trash-to-exclude because here
 * we build up a positive include-list rather than curate an exclude-list).
 */

function resolveLabel(
  excelRow: number,
  catalogMap: Map<number, BsCatalogAccount>,
  language: 'en' | 'id',
  fallbackLabel?: string,
): string {
  const entry = catalogMap.get(excelRow)
  if (entry) return language === 'en' ? entry.labelEn : entry.labelId
  // Custom BS account (excelRow >= 1000) — fall back to customLabel if passed.
  if (fallbackLabel) return fallbackLabel
  return `#${excelRow}`
}

function CashBalanceScopeEditor() {
  const { t } = useT()
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const storedScope = useKkaStore((s) => s.cashBalance)
  const confirmCashBalanceScope = useKkaStore((s) => s.confirmCashBalanceScope)
  const setStoreState = useKkaStore.setState

  const language: 'en' | 'id' = balanceSheet?.language ?? 'id'

  // Local draft — commits to store on "Confirm Scope" / "Update Scope".
  const [localDraft, setLocalDraft] = useState<CashBalanceState>(
    () => storedScope ?? { accounts: [] },
  )

  // Catalog map keyed by excelRow for label lookups.
  const catalogMap = useMemo(() => {
    const entries = getCatalogBySection('current_assets', language)
    return new Map(entries.map((e) => [e.excelRow, e]))
  }, [language])

  // BS accounts user actually added to the Balance Sheet, filtered to
  // current_assets only — these populate the dropdown.
  const bsCurrentAssetAccounts = useMemo(() => {
    const accounts = balanceSheet?.accounts ?? []
    return accounts.filter((a) => a.section === 'current_assets')
  }, [balanceSheet])

  // Dropdown options: BS current_assets MINUS already-added to draft.
  const dropdownOptions = useMemo(() => {
    const draftSet = new Set(localDraft.accounts)
    return bsCurrentAssetAccounts.filter((a) => !draftSet.has(a.excelRow))
  }, [bsCurrentAssetAccounts, localDraft.accounts])

  const isDirty = useMemo(() => {
    const stored = storedScope
    if (stored === null) return true
    return JSON.stringify(normalize(localDraft)) !== JSON.stringify(normalize(stored))
  }, [localDraft, storedScope])

  const confirmed = storedScope !== null

  const handleAdd = (excelRow: number) => {
    setLocalDraft((prev) => ({
      ...prev,
      accounts: [...prev.accounts, excelRow],
    }))
  }

  const handleRemove = (excelRow: number) => {
    setLocalDraft((prev) => ({
      ...prev,
      accounts: prev.accounts.filter((r) => r !== excelRow),
    }))
  }

  const handlePreHistoryBlur = (raw: string) => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      setLocalDraft((prev) => ({ accounts: prev.accounts }))
      return
    }
    const parsed = Number(trimmed)
    if (!Number.isFinite(parsed)) return
    setLocalDraft((prev) => ({ ...prev, preHistoryBeginning: parsed }))
  }

  const handleConfirm = () => {
    if (storedScope === null) {
      confirmCashBalanceScope()
    }
    setStoreState({ cashBalance: { ...localDraft } })
  }

  // Account list: resolve each excelRow to a BsAccountEntry (for customLabel)
  // plus its catalog label fallback.
  const draftRows = useMemo(() => {
    const bsAccountMap = new Map(
      bsCurrentAssetAccounts.map((a) => [a.excelRow, a]),
    )
    return localDraft.accounts.map((row) => {
      const bsEntry = bsAccountMap.get(row)
      return {
        excelRow: row,
        label: resolveLabel(row, catalogMap, language, bsEntry?.customLabel),
      }
    })
  }, [localDraft.accounts, bsCurrentAssetAccounts, catalogMap, language])

  return (
    <div className="mx-auto max-w-[980px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('cashBalance.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">{t('cashBalance.subtitle')}</p>

      <section
        aria-labelledby="cash-balance-accounts-heading"
        className="rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2
            id="cash-balance-accounts-heading"
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
          >
            {t('cashBalance.section.accounts')}
          </h2>
        </header>

        <div className="mb-4">
          <select
            value=""
            onChange={(e) => {
              const value = e.target.value
              if (value === '') return
              handleAdd(Number(value))
            }}
            className="w-full rounded-sm border border-grid bg-canvas px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">{t('cashBalance.dropdown.placeholder')}</option>
            {dropdownOptions.map((acc) => (
              <option key={acc.excelRow} value={acc.excelRow}>
                {resolveLabel(acc.excelRow, catalogMap, language, acc.customLabel)}
              </option>
            ))}
          </select>
        </div>

        {draftRows.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">
            {t('cashBalance.empty.section')}
          </p>
        ) : (
          <ul className="divide-y divide-grid">
            {draftRows.map((row) => (
              <li key={row.excelRow} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm text-ink">{row.label}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(row.excelRow)}
                  aria-label={t('cashBalance.action.remove')}
                  title={t('cashBalance.action.remove')}
                  className="shrink-0 rounded-sm border border-grid p-1.5 text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <TrashIcon />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 border-t border-dashed border-grid pt-4">
          <label
            htmlFor="pre-history-beginning"
            className="block text-sm font-medium text-ink"
          >
            {t('cashBalance.preHistory.label')}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {t('cashBalance.preHistory.helper')}
          </p>
          <input
            id="pre-history-beginning"
            type="number"
            value={
              localDraft.preHistoryBeginning === undefined
                ? ''
                : localDraft.preHistoryBeginning
            }
            onChange={(e) =>
              setLocalDraft((prev) => {
                const raw = e.target.value
                if (raw === '') {
                  return { accounts: prev.accounts }
                }
                const parsed = Number(raw)
                if (!Number.isFinite(parsed)) return prev
                return { ...prev, preHistoryBeginning: parsed }
              })
            }
            onBlur={(e) => handlePreHistoryBlur(e.target.value)}
            className="mt-3 w-full max-w-[240px] rounded-sm border border-grid bg-canvas px-3 py-2 font-mono text-sm tabular-nums text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
        </div>
      </section>

      <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-sm border border-grid bg-canvas-raised/95 p-4 shadow-[0_2px_8px_rgba(10,22,40,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`text-xs ${confirmed ? 'text-accent' : 'text-negative'}`}
        >
          {confirmed
            ? t('cashBalance.state.confirmed')
            : t('cashBalance.state.unconfirmed')}
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmed && !isDirty}
          className="rounded-sm border border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-canvas-raised transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {confirmed
            ? t('cashBalance.action.update')
            : t('cashBalance.action.confirm')}
        </button>
      </div>

      <div className="h-6" />

      <TriviaSection />
    </div>
  )
}

function normalize(state: CashBalanceState): {
  accounts: number[]
  preHistoryBeginning?: number
} {
  const sorted = [...state.accounts].sort((a, b) => a - b)
  if (state.preHistoryBeginning === undefined) {
    return { accounts: sorted }
  }
  return { accounts: sorted, preHistoryBeginning: state.preHistoryBeginning }
}

function TriviaSection() {
  const { t } = useT()
  const body = t('cashBalance.trivia.intro')
  const paragraphs = body.split('\n\n')

  return (
    <section
      aria-labelledby="cash-balance-trivia-heading"
      className="rounded-sm border border-grid bg-canvas-raised p-6 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="cash-balance-trivia-heading"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('cashBalance.trivia.heading')}
      </h2>
      {paragraphs.map((para, idx) => (
        <p
          key={idx}
          className={`${idx < paragraphs.length - 1 ? 'mb-3' : ''} text-sm leading-relaxed text-ink-soft`}
        >
          {para}
        </p>
      ))}
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

export default function CashBalancePage() {
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

  if (!home || !balanceSheet) {
    return (
      <PageEmptyState
        section={t('nav.group.inputData')}
        title={t('cashBalance.title')}
        inputs={[
          { label: 'HOME', href: '/', filled: !!home },
          {
            label: t('nav.item.balanceSheet'),
            href: '/input/balance-sheet',
            filled: !!balanceSheet,
          },
        ]}
      />
    )
  }

  return <CashBalanceScopeEditor />
}
