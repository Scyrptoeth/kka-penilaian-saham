'use client'

import { useMemo, useCallback } from 'react'
import { useKkaStore, type DlomState } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { QuestionnaireForm } from '@/components/forms/QuestionnaireForm'
import { DLOM_FACTORS } from '@/data/questionnaires/dlom-factors'
import { computeDlomPercentage } from '@/lib/calculations/dlom'
import { computeQuestionnaireScores } from '@/lib/calculations/questionnaire-helpers'
import type { KepemilikanType, QuestionnaireResult } from '@/types/questionnaire'

const DEFAULT_DLOM: DlomState = {
  answers: {},
  kepemilikan: 'mayoritas',
  percentage: 0,
}

// Hoisted: factor count is a compile-time constant of the DLOM catalogue.
// Inline `DLOM_FACTORS.length` would force the lint rule to flag every
// useMemo / useCallback dependency that closes over it.
const DLOM_MAX_SCORE = DLOM_FACTORS.length

export default function DlomPage() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const dlom = useKkaStore((s) => s.dlom)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const setDlom = useKkaStore((s) => s.setDlom)

  // Default to "tertutup" until HOME is filled — most KKA cases are private companies.
  const jenisPerusahaan = home?.jenisPerusahaan ?? 'tertutup'
  const current = dlom ?? DEFAULT_DLOM
  const maxScore = DLOM_MAX_SCORE

  // Single source of truth for scoring — used by both display memo and
  // persistence callback. Replaces 2 inline reduce loops per page.
  const { scores, totalScore } = useMemo(
    () => computeQuestionnaireScores(DLOM_FACTORS, current.answers),
    [current.answers],
  )

  const result: QuestionnaireResult = useMemo(() => {
    const computed = computeDlomPercentage({
      totalScore,
      maxScore,
      jenisPerusahaan,
      kepemilikan: current.kepemilikan,
    })
    return {
      scores,
      totalScore,
      maxScore,
      range: computed.range,
      percentage: computed.percentage,
    }
  }, [scores, totalScore, maxScore, jenisPerusahaan, current.kepemilikan])

  // Persist whenever answers/kepemilikan change. Helper centralizes the
  // score reduction so the persistence path uses identical logic to the
  // display path.
  const persistDlom = useCallback(
    (next: Pick<DlomState, 'answers' | 'kepemilikan'>) => {
      const { totalScore: nextTotal } = computeQuestionnaireScores(
        DLOM_FACTORS,
        next.answers,
      )
      const computed = computeDlomPercentage({
        totalScore: nextTotal,
        maxScore,
        jenisPerusahaan,
        kepemilikan: next.kepemilikan,
      })
      setDlom({
        answers: next.answers,
        kepemilikan: next.kepemilikan,
        percentage: computed.percentage,
      })
    },
    [jenisPerusahaan, maxScore, setDlom],
  )

  const handleAnswerChange = useCallback(
    (factorNumber: number, optionLabel: string) => {
      persistDlom({
        answers: { ...current.answers, [factorNumber]: optionLabel },
        kepemilikan: current.kepemilikan,
      })
    },
    [current.answers, current.kepemilikan, persistDlom],
  )

  const handleKepemilikanChange = useCallback(
    (k: KepemilikanType) => {
      persistDlom({ answers: current.answers, kepemilikan: k })
    },
    [current.answers, persistDlom],
  )

  if (!hasHydrated) {
    // Avoid SSR/CSR mismatch on first paint — store hasn't loaded localStorage yet.
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('dlom.loading')}
      </div>
    )
  }

  return (
    <QuestionnaireForm
      title={t('dlom.title')}
      disclaimer={t('dlom.disclaimer')}
      jenisPerusahaan={jenisPerusahaan}
      factors={DLOM_FACTORS}
      answers={current.answers}
      onAnswerChange={handleAnswerChange}
      kepemilikan={current.kepemilikan}
      onKepemilikanChange={handleKepemilikanChange}
      result={result}
      resultLabel={t('dlom.resultLabel')}
    />
  )
}
