'use client'

import { useMemo, useCallback } from 'react'
import { useKkaStore, type DlocState } from '@/lib/store/useKkaStore'
import { QuestionnaireForm } from '@/components/forms/QuestionnaireForm'
import { DLOC_FACTORS } from '@/data/questionnaires/dloc-factors'
import { computeDlocPercentage } from '@/lib/calculations/dloc'
import type { QuestionnaireResult } from '@/types/questionnaire'

const DEFAULT_DLOC: DlocState = {
  answers: {},
  kepemilikan: 'mayoritas',
  percentage: 0,
}

// Hoisted: see corresponding note in dlom/page.tsx.
const DLOC_MAX_SCORE = DLOC_FACTORS.length

export default function DlocPage() {
  const home = useKkaStore((s) => s.home)
  const dloc = useKkaStore((s) => s.dloc)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const setDloc = useKkaStore((s) => s.setDloc)

  const jenisPerusahaan = home?.jenisPerusahaan ?? 'tertutup'
  const current = dloc ?? DEFAULT_DLOC

  const scores: Record<number, number> = useMemo(() => {
    const out: Record<number, number> = {}
    for (const factor of DLOC_FACTORS) {
      const selected = current.answers[factor.number]
      if (selected === undefined) continue
      const option = factor.options.find((o) => o.label === selected)
      if (option) out[factor.number] = option.score
    }
    return out
  }, [current.answers])

  const totalScore = useMemo(
    () => Object.values(scores).reduce((sum, s) => sum + s, 0),
    [scores],
  )
  const maxScore = DLOC_MAX_SCORE

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
      const computed = computeDlocPercentage({
        totalScore: Object.entries(nextAnswers).reduce((sum, [num, label]) => {
          const factor = DLOC_FACTORS.find((f) => f.number === Number(num))
          const opt = factor?.options.find((o) => o.label === label)
          return sum + (opt?.score ?? 0)
        }, 0),
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
        Memuat data DLOC…
      </div>
    )
  }

  return (
    <QuestionnaireForm
      title="DLOC (PFC) — Premium for Control / Discount for Lack of Control"
      disclaimer="Pilih opsi terbaik untuk setiap faktor. Range persentase ditentukan oleh jenis perusahaan saja (tertutup → 30–70%, terbuka → 20–35%) sesuai formula DLOC(PFC)!B22."
      jenisPerusahaan={jenisPerusahaan}
      factors={DLOC_FACTORS}
      answers={current.answers}
      onAnswerChange={handleAnswerChange}
      result={result}
      resultLabel="DLOC Objek Penilaian"
    />
  )
}
