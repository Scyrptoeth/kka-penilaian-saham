'use client'

import { useMemo, useState } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import {
  BS_CATALOG_ALL,
  type BsAccountEntry,
} from '@/data/catalogs/balance-sheet-catalog'
import {
  FA_CATALOG,
  type FaAccountEntry,
} from '@/data/catalogs/fixed-asset-catalog'
import type {
  InvestedCapitalState,
  SourceRef,
} from '@/lib/store/useKkaStore'
import { PageEmptyState } from '@/components/shared/PageEmptyState'

/**
 * /input/invested-capital — Session 055 Task 6.
 *
 * Three-row scope editor for Invested Capital (ROIC). User curates which
 * Balance Sheet asset-side accounts and/or Fixed Asset detail accounts flow
 * into the three "Less" rows:
 *   - otherNonOperatingAssets
 *   - excessCash
 *   - marketableSecurities
 *
 * Cross-row mutual exclusion: picking an account for row X removes it from
 * the other two rows (handled by `assignInvestedCapital` store setter).
 *
 * Soft warning when user mixes BS "Fixed Assets — Net" (excelRow 22) with any
 * FA detail row — risk of double-counting the same underlying PPE.
 *
 * Gate: HOME + Balance Sheet + Fixed Asset must all be filled before the
 * editor renders. Otherwise PageEmptyState points user to the upstream pages.
 */

type InvestedRow = keyof InvestedCapitalState

const EMPTY_STATE: InvestedCapitalState = {
  otherNonOperatingAssets: [],
  excessCash: [],
  marketableSecurities: [],
}

const IC_ROWS: InvestedRow[] = [
  'otherNonOperatingAssets',
  'excessCash',
  'marketableSecurities',
]

const BS_SECTION_WHITELIST = new Set([
  'current_assets',
  'other_non_current_assets',
  'intangible_assets',
])

function resolveBsLabel(
  account: BsAccountEntry,
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = BS_CATALOG_ALL.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

function resolveFaLabel(
  account: FaAccountEntry,
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const catalogEntry = FA_CATALOG.find((c) => c.id === account.catalogId)
  if (!catalogEntry) return account.catalogId
  return language === 'en' ? catalogEntry.labelEn : catalogEntry.labelId
}

interface OptionRef extends SourceRef {
  label: string
}

function refKey(ref: SourceRef): string {
  return `${ref.source}:${ref.excelRow}`
}

function sameRef(a: SourceRef, b: SourceRef): boolean {
  return a.source === b.source && a.excelRow === b.excelRow
}

function normalizeDraft(draft: InvestedCapitalState): string {
  const sortRefs = (refs: SourceRef[]) =>
    [...refs]
      .map(refKey)
      .sort()
      .join(',')
  return [
    sortRefs(draft.otherNonOperatingAssets),
    sortRefs(draft.excessCash),
    sortRefs(draft.marketableSecurities),
  ].join('|')
}

function InvestedCapitalEditor() {
  const { t, language } = useT()
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const storedScope = useKkaStore((s) => s.investedCapital)
  const confirmInvestedCapitalScope = useKkaStore(
    (s) => s.confirmInvestedCapitalScope,
  )
  const setStore = useKkaStore.setState

  // Local draft — commits to store via Confirm/Update button.
  const [localDraft, setLocalDraft] = useState<InvestedCapitalState>(
    () => storedScope ?? EMPTY_STATE,
  )

  const confirmed = storedScope !== null

  const isDirty = useMemo(() => {
    if (!confirmed) return true
    return normalizeDraft(localDraft) !== normalizeDraft(storedScope)
  }, [confirmed, localDraft, storedScope])

  // Build the union option pool: eligible BS asset-side accounts + all FA
  // detail accounts, labeled with [BS] / [FA] prefix, sorted alphabetically,
  // filtered to exclude anything already in ANY of the 3 local draft rows.
  const optionPool = useMemo<OptionRef[]>(() => {
    const bsAccounts = (balanceSheet?.accounts ?? []).filter((a) =>
      BS_SECTION_WHITELIST.has(a.section),
    )
    const bsOptions: OptionRef[] = bsAccounts.map((a) => ({
      source: 'bs',
      excelRow: a.excelRow,
      label: t('investedCapital.dropdown.optionBs', {
        label: resolveBsLabel(a, language),
      }),
    }))
    const faOptions: OptionRef[] = (fixedAsset?.accounts ?? []).map((a) => ({
      source: 'fa',
      excelRow: a.excelRow,
      label: t('investedCapital.dropdown.optionFa', {
        label: resolveFaLabel(a, language),
      }),
    }))
    const merged = [...bsOptions, ...faOptions]
    merged.sort((a, b) => a.label.localeCompare(b.label))
    // Filter out anything already assigned in any of the 3 rows.
    const used = new Set<string>()
    for (const row of IC_ROWS) {
      for (const ref of localDraft[row]) used.add(refKey(ref))
    }
    return merged.filter((opt) => !used.has(refKey(opt)))
  }, [balanceSheet, fixedAsset, language, localDraft, t])

  // Label lookup for refs already stored in the draft (used in list rendering).
  const labelForRef = useMemo(() => {
    const map = new Map<string, string>()
    for (const a of balanceSheet?.accounts ?? []) {
      if (!BS_SECTION_WHITELIST.has(a.section)) continue
      map.set(refKey({ source: 'bs', excelRow: a.excelRow }), t('investedCapital.dropdown.optionBs', {
        label: resolveBsLabel(a, language),
      }))
    }
    for (const a of fixedAsset?.accounts ?? []) {
      map.set(refKey({ source: 'fa', excelRow: a.excelRow }), t('investedCapital.dropdown.optionFa', {
        label: resolveFaLabel(a, language),
      }))
    }
    return map
  }, [balanceSheet, fixedAsset, language, t])

  const handleAdd = (row: InvestedRow, encoded: string) => {
    if (!encoded) return
    const [source, excelRowStr] = encoded.split(':')
    if (source !== 'bs' && source !== 'fa') return
    const excelRow = Number(excelRowStr)
    if (!Number.isFinite(excelRow)) return
    const ref: SourceRef = { source, excelRow }
    setLocalDraft((prev) => {
      // Cross-row mutex: strip from all rows first, then append to target.
      const next: InvestedCapitalState = {
        otherNonOperatingAssets: prev.otherNonOperatingAssets.filter(
          (r) => !sameRef(r, ref),
        ),
        excessCash: prev.excessCash.filter((r) => !sameRef(r, ref)),
        marketableSecurities: prev.marketableSecurities.filter(
          (r) => !sameRef(r, ref),
        ),
      }
      next[row] = [...next[row], ref]
      return next
    })
  }

  const handleRemove = (row: InvestedRow, ref: SourceRef) => {
    setLocalDraft((prev) => ({
      ...prev,
      [row]: prev[row].filter((r) => !sameRef(r, ref)),
    }))
  }

  const handleConfirm = () => {
    if (!confirmed) confirmInvestedCapitalScope()
    setStore({ investedCapital: localDraft })
  }

  // Soft warning — draft mixes BS "Fixed Assets — Net" (row 22) with any FA
  // detail. We scan all 3 local rows to catch every placement.
  const hasPpeOverlap = useMemo(() => {
    const allRefs: SourceRef[] = [
      ...localDraft.otherNonOperatingAssets,
      ...localDraft.excessCash,
      ...localDraft.marketableSecurities,
    ]
    const hasBsFaNet = allRefs.some(
      (r) => r.source === 'bs' && r.excelRow === 22,
    )
    const hasFaDetail = allRefs.some((r) => r.source === 'fa')
    return hasBsFaNet && hasFaDetail
  }, [localDraft])

  return (
    <div className="mx-auto max-w-[980px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('investedCapital.title')}
      </h1>
      <p className="mb-6 text-sm text-ink-muted">
        {t('investedCapital.subtitle')}
      </p>

      <div className="space-y-6">
        <SectionEditor
          row="otherNonOperatingAssets"
          title={t('investedCapital.section.otherNonOperatingAssets')}
          refs={localDraft.otherNonOperatingAssets}
          options={optionPool}
          labelForRef={labelForRef}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <SectionEditor
          row="excessCash"
          title={t('investedCapital.section.excessCash')}
          refs={localDraft.excessCash}
          options={optionPool}
          labelForRef={labelForRef}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
        <SectionEditor
          row="marketableSecurities"
          title={t('investedCapital.section.marketableSecurities')}
          refs={localDraft.marketableSecurities}
          options={optionPool}
          labelForRef={labelForRef}
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </div>

      {hasPpeOverlap && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-xs text-ink-muted">
          {t('investedCapital.warning.ppeOverlap')}
        </p>
      )}

      <div className="sticky bottom-4 z-10 mt-8 flex flex-col gap-3 rounded-sm border border-grid bg-canvas-raised/95 p-4 shadow-[0_2px_8px_rgba(10,22,40,0.08)] backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p
          role="status"
          className={`text-xs ${confirmed ? 'text-accent' : 'text-negative'}`}
        >
          {confirmed
            ? t('investedCapital.state.confirmed')
            : t('investedCapital.state.unconfirmed')}
        </p>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={confirmed && !isDirty}
          className="rounded-sm border border-ink bg-ink px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-canvas-raised transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ink disabled:hover:text-canvas-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {confirmed
            ? t('investedCapital.action.update')
            : t('investedCapital.action.confirm')}
        </button>
      </div>

      <div className="h-6" />

      <TriviaSection />
    </div>
  )
}

function SectionEditor({
  row,
  title,
  refs,
  options,
  labelForRef,
  onAdd,
  onRemove,
}: {
  row: InvestedRow
  title: string
  refs: SourceRef[]
  options: OptionRef[]
  labelForRef: Map<string, string>
  onAdd: (row: InvestedRow, encoded: string) => void
  onRemove: (row: InvestedRow, ref: SourceRef) => void
}) {
  const { t } = useT()

  return (
    <section
      aria-labelledby={`ic-section-${row}`}
      className="rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h2
          id={`ic-section-${row}`}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
        >
          {title}
        </h2>
        <select
          value=""
          onChange={(e) => {
            onAdd(row, e.target.value)
            // Reset the select back to placeholder after add.
            e.currentTarget.value = ''
          }}
          className="max-w-[280px] rounded-sm border border-grid bg-canvas-raised px-2 py-1.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={t('investedCapital.dropdown.placeholder')}
        >
          <option value="">
            {t('investedCapital.dropdown.placeholder')}
          </option>
          {options.map((opt) => (
            <option key={refKey(opt)} value={refKey(opt)}>
              {opt.label}
            </option>
          ))}
        </select>
      </header>

      {refs.length === 0 ? (
        <p className="py-3 text-sm text-ink-muted">
          {t('investedCapital.empty.section')}
        </p>
      ) : (
        <ul className="divide-y divide-grid">
          {refs.map((ref) => {
            const key = refKey(ref)
            const label = labelForRef.get(key) ?? key
            return (
              <li key={key} className="flex items-center gap-3 py-2.5">
                <span className="flex-1 text-sm text-ink">{label}</span>
                <button
                  type="button"
                  onClick={() => onRemove(row, ref)}
                  aria-label={t('investedCapital.action.remove')}
                  title={t('investedCapital.action.remove')}
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

function TriviaSection() {
  const { t } = useT()
  return (
    <section
      aria-labelledby="ic-trivia-heading"
      className="rounded-sm border border-grid bg-canvas-raised p-6 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
    >
      <h2
        id="ic-trivia-heading"
        className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent"
      >
        {t('investedCapital.title')}
      </h2>

      <TriviaBlock
        heading={t('investedCapital.trivia.otherNonOp.heading')}
        body={t('investedCapital.trivia.otherNonOp.body')}
      />
      <TriviaBlock
        heading={t('investedCapital.trivia.excessCash.heading')}
        body={t('investedCapital.trivia.excessCash.body')}
      />
      <TriviaBlock
        heading={t('investedCapital.trivia.marketable.heading')}
        body={t('investedCapital.trivia.marketable.body')}
      />
    </section>
  )
}

function TriviaBlock({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="mb-6 last:mb-0">
      <h3 className="mb-2 text-sm font-semibold text-ink">{heading}</h3>
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

export default function InvestedCapitalPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[760px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  const bsFilled = !!balanceSheet && balanceSheet.accounts.length > 0
  const faFilled = !!fixedAsset && fixedAsset.accounts.length > 0

  if (!home || !bsFilled || !faFilled) {
    return (
      <PageEmptyState
        section={t('nav.group.inputData')}
        title={t('investedCapital.title')}
        inputs={[
          { label: t('nav.item.home'), href: '/', filled: !!home },
          {
            label: t('nav.item.balanceSheet'),
            href: '/input/balance-sheet',
            filled: bsFilled,
          },
          {
            label: t('nav.item.fixedAsset'),
            href: '/input/fixed-asset',
            filled: faFilled,
          },
        ]}
      />
    )
  }

  return <InvestedCapitalEditor />
}
