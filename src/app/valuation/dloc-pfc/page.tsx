'use client'

import { useMemo, useCallback } from 'react'
import { useKkaStore, type DlocState } from '@/lib/store/useKkaStore'
import { useT } from '@/lib/i18n/useT'
import { QuestionnaireForm } from '@/components/forms/QuestionnaireForm'
import { DLOC_FACTORS } from '@/data/questionnaires/dloc-factors'
import { computeDlocPercentage } from '@/lib/calculations/dloc'
import { computeQuestionnaireScores } from '@/lib/calculations/questionnaire-helpers'
import type { QuestionnaireResult } from '@/types/questionnaire'

const DEFAULT_DLOC: DlocState = {
  answers: {},
  kepemilikan: 'mayoritas',
  percentage: 0,
}

// Hoisted: see corresponding note in dlom/page.tsx.
const DLOC_MAX_SCORE = DLOC_FACTORS.length

export default function DlocPage() {
  const { t } = useT()
  const home = useKkaStore((s) => s.home)
  const dloc = useKkaStore((s) => s.dloc)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const setDloc = useKkaStore((s) => s.setDloc)

  const jenisPerusahaan = home?.jenisPerusahaan ?? 'tertutup'
  const current = dloc ?? DEFAULT_DLOC
  const maxScore = DLOC_MAX_SCORE

  const { scores, totalScore } = useMemo(
    () => computeQuestionnaireScores(DLOC_FACTORS, current.answers),
    [current.answers],
  )

  const result: QuestionnaireResult = useMemo(() => {
    const computed = computeDlocPercentage({
      totalScore,
      maxScore,
      jenisPerusahaan,
    })
    return {
      scores,
      totalScore,
      maxScore,
      range: computed.range,
      percentage: computed.percentage,
    }
  }, [scores, totalScore, maxScore, jenisPerusahaan])

  // DLOC kepemilikan is informational only — Excel formula B22 ignores it.
  // Carry it through state for consistency with DLOM but never feed to calc.
  const handleAnswerChange = useCallback(
    (factorNumber: number, optionLabel: string) => {
      const nextAnswers = { ...current.answers, [factorNumber]: optionLabel }
      const { totalScore: nextTotal } = computeQuestionnaireScores(
        DLOC_FACTORS,
        nextAnswers,
      )
      const computed = computeDlocPercentage({
        totalScore: nextTotal,
        maxScore,
        jenisPerusahaan,
      })
      setDloc({
        answers: nextAnswers,
        kepemilikan: current.kepemilikan,
        percentage: computed.percentage,
      })
    },
    [current.answers, current.kepemilikan, jenisPerusahaan, maxScore, setDloc],
  )

  if (!hasHydrated) {
    return (
      <div className="mx-auto max-w-[1100px] p-6 text-sm text-ink-muted">
        {t('dloc.loading')}
      </div>
    )
  }

  return (
    <QuestionnaireForm
      title={t('dloc.title')}
      disclaimer={t('dloc.disclaimer')}
      jenisPerusahaan={jenisPerusahaan}
      factors={DLOC_FACTORS}
      answers={current.answers}
      onAnswerChange={handleAnswerChange}
      result={result}
      resultLabel={t('dloc.resultLabel')}
    />
  )
}
