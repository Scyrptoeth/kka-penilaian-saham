'use client'

import { useCallback, useState } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { parseFinancialInput } from '@/components/forms/parse-financial-input'
import { formatIdr } from '@/components/financial/format'
import { useT } from '@/lib/i18n/useT'

/**
 * /valuation/interest-bearing-debt — Session 038
 *
 * Single required valuation input page. The stored `interestBearingDebt`
 * value (nullable) is read by AAM, DCF, and EEM page wrappers via
 * `buildAamInput` / `buildDcfInput` / `buildEemInput`. A `null` value keeps
 * those three downstream pages in their PageEmptyState; a numeric value
 * (including 0) unblocks them.
 *
 * Rendering: single numeric input + always-visible educational trivia. All
 * content flows through `useT()` so it honours the global EN/ID toggle and
 * the light/dark theme palette auto-adapts via existing CSS vars.
 */

const NUMBER_FORMATTER = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
})

function formatDisplay(value: number): string {
  if (value === 0) return ''
  return NUMBER_FORMATTER.format(value)
}

function InterestBearingDebtEditor() {
  const { t } = useT()
  const stored = useKkaStore((s) => s.interestBearingDebt)
  const setStored = useKkaStore((s) => s.setInterestBearingDebt)

  // Local draft so typing doesn't bounce through the store on every keystroke.
  const [draft, setDraft] = useState<string | null>(null)

  const isEditing = draft !== null
  const display = isEditing
    ? draft
    : stored === null
      ? ''
      : formatDisplay(stored)

  const handleFocus = useCallback(() => {
    setDraft(stored === null || stored === 0 ? '' : String(stored))
  }, [stored])

  const handleBlur = useCallback(() => {
    if (draft === null) return
    const trimmed = draft.trim()
    if (trimmed === '') {
      if (stored !== null) setStored(null)
    } else {
      const parsed = parseFinancialInput(draft)
      if (parsed !== stored) setStored(parsed)
    }
    setDraft(null)
  }, [draft, stored, setStored])

  const handleClear = useCallback(() => {
    setDraft(null)
    setStored(null)
  }, [setStored])

  const isFilled = stored !== null

  return (
    <div className="mx-auto max-w-[760px] p-6">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-ink">
        {t('ibd.title')}
      </h1>
      <p className="mb-8 text-sm text-ink-muted">{t('ibd.subtitle')}</p>

      {/* Input field card */}
      <section
        aria-labelledby="ibd-input-heading"
        className="mb-10 rounded-sm border border-grid bg-canvas-raised p-5 shadow-[0_1px_0_rgba(10,22,40,0.04)]"
      >
        <label
          id="ibd-input-heading"
          htmlFor="ibd-input"
          className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted"
        >
          {t('ibd.input.label')}
        </label>
        <div className="flex items-center gap-2">
          <input
            id="ibd-input"
            type="text"
            inputMode="decimal"
            value={display}
            placeholder={t('ibd.input.placeholder')}
            onFocus={handleFocus}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleBlur}
            aria-describedby="ibd-input-helper"
            className="w-full rounded-sm border border-grid bg-canvas px-3 py-2 text-right font-mono text-base tabular-nums text-ink transition-colors placeholder:text-ink-muted/60 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
          {isFilled && (
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 rounded-sm border border-dashed border-grid px-2.5 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-ink-muted transition-colors hover:border-negative hover:text-negative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {t('ibd.input.clear')}
            </button>
          )}
        </div>
        <p id="ibd-input-helper" className="mt-2 text-xs text-ink-muted">
          {t('ibd.input.helper')}
        </p>
        <p
          role="status"
          className={`mt-3 text-[12px] font-medium ${
            isFilled ? 'text-accent' : 'text-negative'
          }`}
        >
          {isFilled ? (
            <>
              {t('ibd.state.filled')}{' '}
              <span className="font-mono tabular-nums">{formatIdr(stored ?? 0)}</span>
            </>
          ) : (
            t('ibd.state.empty')
          )}
        </p>
      </section>

      {/* Trivia — always visible per user spec */}
      <TriviaSection />
    </div>
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
        <TriviaItem
          term={t('ibd.trivia.include.bankLoans.term')}
          desc={t('ibd.trivia.include.bankLoans.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.include.bonds.term')}
          desc={t('ibd.trivia.include.bonds.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.include.notes.term')}
          desc={t('ibd.trivia.include.notes.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.include.mortgage.term')}
          desc={t('ibd.trivia.include.mortgage.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.include.lease.term')}
          desc={t('ibd.trivia.include.lease.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.include.commercialPaper.term')}
          desc={t('ibd.trivia.include.commercialPaper.desc')}
        />
      </ul>

      <div className="mb-4 border-t border-grid" />

      <h3 className="mb-2 text-sm font-semibold text-ink">
        {t('ibd.trivia.exclude.heading')}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-ink-soft">
        {t('ibd.trivia.exclude.intro')}
      </p>
      <ul className="space-y-2.5 text-sm leading-relaxed text-ink-soft">
        <TriviaItem
          term={t('ibd.trivia.exclude.accountsPayable.term')}
          desc={t('ibd.trivia.exclude.accountsPayable.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.exclude.accrued.term')}
          desc={t('ibd.trivia.exclude.accrued.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.exclude.unearnedRevenue.term')}
          desc={t('ibd.trivia.exclude.unearnedRevenue.desc')}
        />
        <TriviaItem
          term={t('ibd.trivia.exclude.taxesPayable.term')}
          desc={t('ibd.trivia.exclude.taxesPayable.desc')}
        />
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

export default function InterestBearingDebtPage() {
  const { t } = useT()
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[760px] p-6 text-sm text-ink-muted">
        {t('common.loadingData')}
      </div>
    )
  }

  return <InterestBearingDebtEditor />
}
