'use client'

import { useMemo, useState } from 'react'
import {
  useKkaStore,
  type FinancingState,
} from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import {
  BS_CATALOG_ALL,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'
import {
  IS_CATALOG,
  type IsAccountEntry,
} from '@/data/catalogs/income-statement-catalog'
import { apRowFor } from '@/data/catalogs/acc-payables-catalog'
import type {
  ApSchedule,
  BalanceSheetInputState,
  IncomeStatementInputState,
  AccPayablesInputState,
} from '@/data/live/types'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * /input/financing — Session 056 Cluster C scope editor.
 *
 * Five-row curator for the CFS FINANCING section (rows 27-31). Each row is a
 * disjoint list of source excelRows with cross-row mutual exclusion: a single
 * excelRow lives in ONE target row at a time.
 *
 * Sources differ per target:
 *   - equityInjection     → BS equity accounts
 *   - newLoan             → AP `add` band rows (per schedule)
 *   - interestPayment     → IS `interest_expense` accounts
 *   - interestIncome      → IS `interest_income` accounts
 *   - principalRepayment  → ALL 3 AP bands (beg/add/end) for every schedule
 *     (legacy prototipe uses row 20 which is outside AP_BANDS — giving the
 *     user full AP row space covers that + keeps company-agnostic — LESSON-029)
 *
 * Gate: HOME + BS + IS + AP must be filled. Otherwise PageEmptyState routes
 * the user to the upstream input pages.
 *
 * React Compiler safe — no `useEffect` + setState. LESSON-034 parent-gate-
 * child-mount: `FinancingEditor` mounts only after the gate passes, so its
 * useState initializer reads `storedScope` at the correct moment.
 */

type FinancingRow = keyof FinancingState

const EMPTY_STATE: FinancingState = {
  equityInjection: [],
  newLoan: [],
  interestPayment: [],
  interestIncome: [],
  principalRepayment: [],
}

const FIN_ROWS: readonly FinancingRow[] = [
  'equityInjection',
  'newLoan',
  'interestPayment',
  'interestIncome',
  'principalRepayment',
] as const

type PoolSource = 'bs-equity' | 'is-interest-income' | 'is-interest-expense' | 'ap-add' | 'ap-any'

interface PoolEntry {
  excelRow: number
  label: string
  source: PoolSource
}

// ---------------------------------------------------------------------------
// Label resolvers
// ---------------------------------------------------------------------------

function resolveBsLabel(account: BsAccountEntry, language: 'en' | 'id'): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = BS_CATALOG_ALL.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

function resolveIsLabel(account: IsAccountEntry, language: 'en' | 'id'): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = IS_CATALOG.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

function resolveApScheduleName(
  schedule: ApSchedule,
  schedulesInSection: readonly ApSchedule[],
  sectionLabel: string,
): string {
  if (schedule.customLabel) return schedule.customLabel
  const sortedIndex =
    schedulesInSection
      .slice()
      .sort((a, b) => a.slotIndex - b.slotIndex)
      .findIndex((s) => s.id === schedule.id) + 1
  return `${sectionLabel} ${sortedIndex}`
}

function normalizeDraft(draft: FinancingState): string {
  const sort = (rows: number[]) => [...rows].sort((a, b) => a - b).join(',')
  return FIN_ROWS.map((row) => sort(draft[row])).join('|')
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------

interface EditorProps {
  balanceSheet: BalanceSheetInputState
  incomeStatement: IncomeStatementInputState
  accPayables: AccPayablesInputState
}

function FinancingEditor({
  balanceSheet,
  incomeStatement,
  accPayables,
}: EditorProps) {
  const { t, language } = useT()
  const storedScope = useKkaStore((s) => s.financing)
  const confirmFinancingScope = useKkaStore((s) => s.confirmFinancingScope)
  const resetFinancingScope = useKkaStore((s) => s.resetFinancingScope)
  const setStore = useKkaStore.setState

  // Local draft — commits to store via Confirm/Update button.
  const [localDraft, setLocalDraft] = useState<FinancingState>(
    () => storedScope ?? EMPTY_STATE,
  )

  const confirmed = storedScope !== null

  const isDirty = useMemo(() => {
    if (!confirmed) return true
    return normalizeDraft(localDraft) !== normalizeDraft(storedScope)
  }, [confirmed, localDraft, storedScope])

  // --- Per-row source pools (before mutex filtering) -----------------------

  const equityPool = useMemo<PoolEntry[]>(() => {
    const accounts = balanceSheet.accounts.filter((a) => a.section === 'equity')
    return accounts
      .map<PoolEntry>((a) => ({
        excelRow: a.excelRow,
        label: resolveBsLabel(a, language),
        source: 'bs-equity',
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [balanceSheet.accounts, language])

  const interestIncomePool = useMemo<PoolEntry[]>(() => {
    const accounts = incomeStatement.accounts.filter(
      (a) => a.section === 'interest_income',
    )
    return accounts
      .map<PoolEntry>((a) => ({
        excelRow: a.excelRow,
        label: resolveIsLabel(a, language),
        source: 'is-interest-income',
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [incomeStatement.accounts, language])

  const interestExpensePool = useMemo<PoolEntry[]>(() => {
    const accounts = incomeStatement.accounts.filter(
      (a) => a.section === 'interest_expense',
    )
    return accounts
      .map<PoolEntry>((a) => ({
        excelRow: a.excelRow,
        label: resolveIsLabel(a, language),
        source: 'is-interest-expense',
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [incomeStatement.accounts, language])

  // AP helpers — build pools indexed by band. `add` only for newLoan;
  // all 3 (beg/add/end) for principalRepayment per design justification above.
  const { apAddPool, apAnyPool } = useMemo(() => {
    const sectionLabel: Record<'st_bank_loans' | 'lt_bank_loans', string> = {
      st_bank_loans: t('accPayables.shortTerm'),
      lt_bank_loans: t('accPayables.longTerm'),
    }
    const bandLabel: Record<'beg' | 'add' | 'end', string> = {
      beg: language === 'en' ? 'Beg' : 'Awal',
      add: language === 'en' ? 'Add' : 'Penambahan',
      end: language === 'en' ? 'End' : 'Akhir',
    }

    const schedules = accPayables.schedules
    const stSchedules = schedules.filter((s) => s.section === 'st_bank_loans')
    const ltSchedules = schedules.filter((s) => s.section === 'lt_bank_loans')

    const addEntries: PoolEntry[] = []
    const anyEntries: PoolEntry[] = []

    for (const schedule of schedules) {
      const schedulesInSection =
        schedule.section === 'st_bank_loans' ? stSchedules : ltSchedules
      const name = resolveApScheduleName(
        schedule,
        schedulesInSection,
        sectionLabel[schedule.section],
      )

      const addRow = apRowFor(schedule.section, schedule.slotIndex, 'add')
      addEntries.push({
        excelRow: addRow,
        label: `${name} · ${bandLabel.add} (row ${addRow})`,
        source: 'ap-add',
      })

      for (const band of ['beg', 'add', 'end'] as const) {
        const row = apRowFor(schedule.section, schedule.slotIndex, band)
        anyEntries.push({
          excelRow: row,
          label: `${name} · ${bandLabel[band]} (row ${row})`,
          source: 'ap-any',
        })
      }
    }

    addEntries.sort((a, b) => a.label.localeCompare(b.label))
    anyEntries.sort((a, b) => a.label.localeCompare(b.label))
    // `apAnyPool` may include the same excelRow for `add` that appears in
    // `apAddPool`; dedup by excelRow so a single row shows up once.
    const deduped = new Map<number, PoolEntry>()
    for (const entry of anyEntries) {
      if (!deduped.has(entry.excelRow)) deduped.set(entry.excelRow, entry)
    }
    return {
      apAddPool: addEntries,
      apAnyPool: [...deduped.values()].sort((a, b) =>
        a.label.localeCompare(b.label),
      ),
    }
  }, [accPayables.schedules, language, t])

  // Label lookup for ALL possibly-selected rows (for list rendering — rows
  // already in draft may no longer be in the filtered dropdown pool).
  const labelForRow = useMemo(() => {
    const map = new Map<number, string>()
    for (const e of equityPool) map.set(e.excelRow, e.label)
    for (const e of interestIncomePool) map.set(e.excelRow, e.label)
    for (const e of interestExpensePool) map.set(e.excelRow, e.label)
    for (const e of apAnyPool) map.set(e.excelRow, e.label)
    // apAddPool shares excelRows with apAnyPool — prefer `any`-labeled entry
    // for list rendering consistency, so no overwrite needed.
    return map
  }, [equityPool, interestIncomePool, interestExpensePool, apAnyPool])

  // Cross-row mutex: an excelRow assigned to any row filters out of every
  // other row's dropdown. Compute the global used-set once.
  const usedRows = useMemo(() => {
    const used = new Set<number>()
    for (const row of FIN_ROWS) for (const r of localDraft[row]) used.add(r)
    return used
  }, [localDraft])

  const filterOptions = (pool: PoolEntry[]): PoolEntry[] =>
    pool.filter((opt) => !usedRows.has(opt.excelRow))

  // --- Handlers ------------------------------------------------------------

  const handleAdd = (row: FinancingRow, excelRowStr: string) => {
    if (!excelRowStr) return
    const excelRow = Number(excelRowStr)
    if (!Number.isFinite(excelRow)) return
    setLocalDraft((prev) => {
      // Cross-row mutex: strip from all 5 lists then append to target.
      const next: FinancingState = {
        equityInjection: prev.equityInjection.filter((r) => r !== excelRow),
        newLoan: prev.newLoan.filter((r) => r !== excelRow),
        interestPayment: prev.interestPayment.filter((r) => r !== excelRow),
        interestIncome: prev.interestIncome.filter((r) => r !== excelRow),
        principalRepayment: prev.principalRepayment.filter((r) => r !== excelRow),
      }
      next[row] = [...next[row], excelRow]
      return next
    })
  }

  const handleRemove = (row: FinancingRow, excelRow: number) => {
    setLocalDraft((prev) => ({
      ...prev,
      [row]: prev[row].filter((r) => r !== excelRow),
    }))
  }

  const handleConfirm = () => {
    if (!confirmed) confirmFinancingScope()
    setStore({ financing: localDraft })
  }

  const handleReset = () => {
    resetFinancingScope()
    setLocalDraft(EMPTY_STATE)
  }

  return (
    <div className="mx-auto max-w-[980px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('financing.page.title')}
      </h1>
      <p className="mb-4 text-sm text-ink-muted">
        {t('financing.page.subtitle')}
      </p>

      <p className="mb-6 whitespace-pre-line rounded-sm border-l-2 border-accent bg-canvas-raised p-4 text-sm leading-relaxed text-ink-soft">
        {t('financing.intro.body')}
      </p>

      <div className="space-y-6">
        <SectionEditor
          row="equityInjection"
          title={t('financing.section.equityInjection.heading')}
          subtitle={t('financing.section.equityInjection.subtitle')}
          emptyLabel={t('financing.section.equityInjection.empty')}
          refs={localDraft.equityInjection}
          options={filterOptions(equityPool)}
          labelForRow={labelForRow}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <SectionEditor
          row="newLoan"
          title={t('financing.section.newLoan.heading')}
          subtitle={t('financing.section.newLoan.subtitle')}
          emptyLabel={t('financing.section.newLoan.empty')}
          refs={localDraft.newLoan}
          options={filterOptions(apAddPool)}
          labelForRow={labelForRow}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <SectionEditor
          row="interestPayment"
          title={t('financing.section.interestPayment.heading')}
          subtitle={t('financing.section.interestPayment.subtitle')}
          emptyLabel={t('financing.section.interestPayment.empty')}
          refs={localDraft.interestPayment}
          options={filterOptions(interestExpensePool)}
          labelForRow={labelForRow}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <SectionEditor
          row="interestIncome"
          title={t('financing.section.interestIncome.heading')}
          subtitle={t('financing.section.interestIncome.subtitle')}
          emptyLabel={t('financing.section.interestIncome.empty')}
          refs={localDraft.interestIncome}
          options={filterOptions(interestIncomePool)}
          labelForRow={labelForRow}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <SectionEditor
          row="principalRepayment"
          title={t('financing.section.principalRepayment.heading')}
          subtitle={t('financing.section.principalRepayment.subtitle')}
          emptyLabel={t('financing.section.principalRepayment.empty')}
          refs={localDraft.principalRepayment}
          options={filterOptions(apAnyPool)}
          labelForRow={labelForRow}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </div>

      <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-sm border border-grid bg-canvas-raised/95 p-4 shadow-[0_2px_8px_rgba(10,22,40,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`text-xs ${confirmed ? 'text-accent' : 'text-negative'}`}
        >
          {confirmed
            ? t('financing.state.confirmed')
            : t('financing.state.unconfirmed')}
        </p>
        <div className="flex items-center gap-3">
          {confirmed && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-sm border border-grid px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('common.resetPage')}
            </button>
          )}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={confirmed && !isDirty}
            className="rounded-sm border border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-canvas-raised transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {confirmed
              ? t('financing.action.update')
              : t('financing.action.confirm')}
          </button>
        </div>
      </div>

      <div className="h-6" />

      <TriviaSection />
    </div>
  )
}

// ---------------------------------------------------------------------------
// SectionEditor — one per financing target row
// ---------------------------------------------------------------------------

interface SectionEditorProps {
  row: FinancingRow
  title: string
  subtitle: string
  emptyLabel: string
  refs: number[]
  options: PoolEntry[]
  labelForRow: Map<number, string>
  onAdd: (row: FinancingRow, value: string) => void
  onRemove: (row: FinancingRow, excelRow: number) => void
}

function SectionEditor({
  row,
  title,
  subtitle,
  emptyLabel,
  refs,
  options,
  labelForRow,
  onAdd,
  onRemove,
}: SectionEditorProps) {
  const { t } = useT()
  const selectId = `financing-select-${row}`

  return (
    <section
      aria-labelledby={`financing-section-${row}`}
      className="rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <header className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id={`financing-section-${row}`}
            className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
          >
            {title}
          </h2>
          <p className="mt-1 max-w-[520px] text-xs leading-relaxed text-ink-muted">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={selectId} className="sr-only">
            {t('financing.dropdown.placeholder')}
          </label>
          <select
            id={selectId}
            value=""
            onChange={(e) => {
              onAdd(row, e.target.value)
              e.currentTarget.value = ''
            }}
            className="max-w-[320px] rounded-sm border border-grid bg-canvas-raised px-2 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t('financing.dropdown.placeholder')}
          >
            <option value="">
              {t('financing.dropdown.placeholder')}
            </option>
            {options.map((opt) => (
              <option key={opt.excelRow} value={opt.excelRow}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      {refs.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-grid">
          {refs.map((excelRow) => {
            const label = labelForRow.get(excelRow) ?? `#${excelRow}`
            return (
              <li
                key={excelRow}
                className="flex items-center gap-3 py-2.5"
              >
                <span className="flex-1 text-sm text-ink">{label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(row, excelRow)}
                  aria-label={t('financing.action.remove')}
                  title={t('financing.action.remove')}
                  className="shrink-0 rounded-sm border border-grid p-1.5 text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <TrashIcon />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

// ---------------------------------------------------------------------------
// Trivia — bilingual educational block
// ---------------------------------------------------------------------------

function TriviaSection() {
  const { t } = useT()
  return (
    <section
      aria-labelledby="financing-trivia-heading"
      className="rounded-sm border border-grid bg-canvas-raised p-6 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="financing-trivia-heading"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('financing.trivia.heading')}
      </h2>
      <TriviaBlock body={t('financing.trivia.intro')} />
      <TriviaBlock
        heading={t('financing.section.equityInjection.heading')}
        body={t('financing.trivia.equity')}
      />
      <TriviaBlock
        heading={t('financing.section.newLoan.heading')}
        body={t('financing.trivia.loan')}
      />
      <TriviaBlock
        heading={t('financing.section.interestPayment.heading')}
        body={t('financing.trivia.interest')}
      />
      <TriviaBlock
        heading={t('financing.section.principalRepayment.heading')}
        body={t('financing.trivia.repayment')}
      />
    </section>
  )
}

function TriviaBlock({ heading, body }: { heading?: string; body: string }) {
  return (
    <div className="mb-6 last:mb-0">
      {heading && (
        <h3 className="mb-2 text-sm font-semibold text-ink">{heading}</h3>
      )}
      {body.split('\n\n').map((para, idx) => (
        <p
          key={idx}
          className="mb-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft last:mb-0"
        >
          {para}
        </p>
      ))}
    </div>
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

// ---------------------------------------------------------------------------
// Gate + entry
// ---------------------------------------------------------------------------

function FinancingGate() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const accPayables = useKkaStore((s) => s.accPayables)

  const bsFilled = !!balanceSheet && balanceSheet.accounts.length > 0
  const isFilled = !!incomeStatement && incomeStatement.accounts.length > 0
  const apFilled = !!accPayables && accPayables.schedules.length > 0

  if (!home || !bsFilled || !isFilled || !apFilled) {
    return (
      <PageEmptyState
        section={t('nav.group.inputData')}
        title={t('financing.page.title')}
        inputs={[
          { label: t('nav.item.home'), href: '/', filled: !!home },
          {
            label: t('nav.item.balanceSheet'),
            href: '/input/balance-sheet',
            filled: bsFilled,
          },
          {
            label: t('nav.item.incomeStatement'),
            href: '/input/income-statement',
            filled: isFilled,
          },
          {
            label: t('nav.item.accPayables'),
            href: '/input/acc-payables',
            filled: apFilled,
          },
        ]}
      />
    )
  }

  return (
    <FinancingEditor
      balanceSheet={balanceSheet}
      incomeStatement={incomeStatement}
      accPayables={accPayables}
    />
  )
}

export default function FinancingPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[760px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  return <FinancingGate />
}

