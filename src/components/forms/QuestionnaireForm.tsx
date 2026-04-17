'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils/cn'
import type {
  QuestionnaireFactor,
  QuestionnaireResult,
  KepemilikanType,
} from '@/types/questionnaire'
import type { JenisPerusahaan } from '@/types/financial'
import { useT } from '@/lib/i18n/useT'

/**
 * Universal questionnaire form used by both DLOM and DLOC pages.
 *
 * Props are intentionally minimal — the parent page owns the answers
 * state, runs the live computation through the appropriate calc function
 * (computeDlomPercentage or computeDlocPercentage), and feeds the
 * `result` back in. The component itself is a controlled view: it
 * renders factors, captures clicks, and displays the live score.
 *
 * Kepemilikan controls are optional — DLOC pages omit them because the
 * Excel formula does not consult kepemilikan for range determination.
 */
interface QuestionnaireFormProps {
  /** Page title rendered above the factor list. */
  title: string
  /** Optional subtitle / disclaimer rendered under the title. */
  disclaimer?: string
  /** Read-only display of the current jenisPerusahaan from HOME store. */
  jenisPerusahaan: JenisPerusahaan
  /** Factor catalogue (DLOM_FACTORS or DLOC_FACTORS). */
  factors: readonly QuestionnaireFactor[]
  /** Current answers, indexed by factor.number. */
  answers: Record<number, string>
  /** Callback when user picks a different option for a factor. */
  onAnswerChange: (factorNumber: number, optionLabel: string) => void
  /**
   * Optional kepemilikan controls. When omitted, the kepemilikan section
   * is not rendered (used by DLOC where the formula ignores kepemilikan).
   */
  kepemilikan?: KepemilikanType
  onKepemilikanChange?: (k: KepemilikanType) => void
  /** Live computed result from the appropriate calc function. */
  result: QuestionnaireResult
  /** Label shown for the final percentage row (e.g. "DLOM Objek Penilaian"). */
  resultLabel: string
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function formatRange(range: { min: number; max: number }): string {
  return `${formatPercent(range.min)} – ${formatPercent(range.max)}`
}

function formatScore(score: number): string {
  return score.toFixed(score % 1 === 0 ? 0 : 1)
}

/**
 * Render one factor card. Pure presentational — no state.
 */
function FactorCard({
  factor,
  selectedLabel,
  selectedScore,
  onPick,
  factorLabel,
}: {
  factor: QuestionnaireFactor
  selectedLabel: string | undefined
  selectedScore: number | undefined
  onPick: (label: string) => void
  factorLabel: string
}): ReactNode {
  const groupName = `factor-${factor.number}`
  return (
    <fieldset className="border border-grid bg-canvas-raised p-4 sm:p-5">
      <legend className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {factorLabel} {factor.number}
      </legend>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-ink">{factor.label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {factor.description}
          </p>
        </div>
        <div className="shrink-0 self-start">
          <span
            className={cn(
              'inline-flex h-10 min-w-[3rem] items-center justify-center border px-3 font-mono text-sm tabular-nums',
              selectedScore === undefined
                ? 'border-grid bg-canvas text-ink-muted'
                : selectedScore === 0
                  ? 'border-positive/40 bg-positive/10 text-positive'
                  : selectedScore === 1
                    ? 'border-negative/40 bg-negative/10 text-negative'
                    : 'border-accent/40 bg-accent/10 text-ink',
            )}
            aria-label={`Skor faktor ${factor.number}`}
          >
            {selectedScore === undefined ? '—' : formatScore(selectedScore)}
          </span>
        </div>
      </div>
      <div
        role="radiogroup"
        aria-label={`Opsi untuk ${factor.label}`}
        className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"
      >
        {factor.options.map((option) => {
          const id = `${groupName}-${option.label.replace(/\s+/g, '-')}`
          const checked = selectedLabel === option.label
          return (
            <label
              key={option.label}
              htmlFor={id}
              className={cn(
                'relative flex cursor-pointer items-center justify-between gap-2 border px-3 py-2 text-sm transition-colors',
                checked
                  ? 'border-ink bg-ink text-canvas-raised'
                  : 'border-grid bg-canvas hover:border-ink',
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  checked ? 'text-canvas-raised' : 'text-ink-muted',
                )}
              >
                {formatScore(option.score)}
              </span>
              <input
                id={id}
                type="radio"
                name={groupName}
                value={option.label}
                checked={checked}
                onChange={() => onPick(option.label)}
                className="sr-only"
              />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

export function QuestionnaireForm({
  title,
  disclaimer,
  jenisPerusahaan,
  factors,
  answers,
  onAnswerChange,
  kepemilikan,
  onKepemilikanChange,
  result,
  resultLabel,
}: QuestionnaireFormProps) {
  const { t } = useT()
  const showKepemilikan = kepemilikan !== undefined && onKepemilikanChange !== undefined

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-6 p-4 sm:p-6">
      <header className="border-l-4 border-accent bg-canvas-raised px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-ink">{title}</h1>
        {disclaimer && (
          <p className="mt-2 text-xs text-ink-muted">{disclaimer}</p>
        )}
        <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
          <div className="flex justify-between sm:justify-start sm:gap-2">
            <dt className="text-ink-muted">{t('questionnaire.companyType')}</dt>
            <dd className="font-mono uppercase text-ink">{jenisPerusahaan}</dd>
          </div>
          {showKepemilikan && (
            <div className="flex justify-between sm:justify-start sm:gap-2">
              <dt className="text-ink-muted">{t('questionnaire.ownership')}</dt>
              <dd className="font-mono uppercase text-ink">{kepemilikan}</dd>
            </div>
          )}
        </dl>
      </header>

      <section className="flex flex-col gap-3">
        {factors.map((factor) => {
          const selectedLabel = answers[factor.number]
          const selectedScore =
            selectedLabel === undefined
              ? undefined
              : factor.options.find((o) => o.label === selectedLabel)?.score
          return (
            <FactorCard
              key={factor.number}
              factor={factor}
              selectedLabel={selectedLabel}
              selectedScore={selectedScore}
              onPick={(label) => onAnswerChange(factor.number, label)}
              factorLabel={t('questionnaire.factorLabel')}
            />
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 border border-grid-strong bg-canvas-raised p-5 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          {showKepemilikan && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="kepemilikan-select"
                className="text-xs font-semibold uppercase tracking-wider text-ink-soft"
              >
                {t('questionnaire.ownershipLabel')}
              </label>
              <select
                id="kepemilikan-select"
                value={kepemilikan}
                onChange={(event) =>
                  onKepemilikanChange(event.target.value as KepemilikanType)
                }
                className="h-10 w-full border border-grid-strong bg-canvas-raised px-3 text-sm text-ink focus:border-ink focus:outline-none"
              >
                <option value="mayoritas">{t('questionnaire.option.majority')}</option>
                <option value="minoritas">{t('questionnaire.option.minority')}</option>
              </select>
              <p className="text-xs text-ink-muted">
                {t('questionnaire.ownershipHint')}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between border-b border-grid pb-2">
              <span className="text-ink-muted">{t('questionnaire.totalScore')}</span>
              <span className="font-mono tabular-nums text-ink">
                {formatScore(result.totalScore)} / {formatScore(result.maxScore)}
              </span>
            </div>
            <div className="flex justify-between border-b border-grid pb-2">
              <span className="text-ink-muted">{t('questionnaire.rangeLabel')}</span>
              <span className="font-mono tabular-nums text-ink">
                {formatRange(result.range)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">{t('questionnaire.factorsFilled')}</span>
              <span className="font-mono tabular-nums text-ink">
                {Object.keys(answers).length} / {factors.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch justify-center gap-1 border-l-0 border-t border-grid pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {resultLabel}
          </span>
          <span className="font-mono text-4xl font-semibold tabular-nums text-accent">
            {formatPercent(result.percentage)}
          </span>
          <span className="text-xs text-ink-muted">
            = {formatPercent(result.range.min)} +{' '}
            {formatScore(result.totalScore)}/{formatScore(result.maxScore)} ×{' '}
            {formatPercent(result.range.max - result.range.min)}
          </span>
          <span className="mt-1 text-xs text-ink-muted">
            {t('questionnaire.autoSyncNotice')}
          </span>
        </div>
      </section>
    </div>
  )
}
