'use client'

import { useMemo, useCallback } from 'react'
import { useKkaStore, type DlomState } from '@/lib/store/useKkaStore'
import { QuestionnaireForm } from '@/components/forms/QuestionnaireForm'
import { DLOM_FACTORS } from '@/data/questionnaires/dlom-factors'
import { computeDlomPercentage } from '@/lib/calculations/dlom'
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
  const home = useKkaStore((s) => s.home)
  const dlom = useKkaStore((s) => s.dlom)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const setDlom = useKkaStore((s) => s.setDlom)

  // Default to "tertutup" until HOME is filled — most KKA cases are private companies.
  const jenisPerusahaan = home?.jenisPerusahaan ?? 'tertutup'
  const current = dlom ?? DEFAULT_DLOM

  // Score map per factor — sourced from selected option label.
  const scores: Record<number, number> = useMemo(() => {
    const out: Record<number, number> = {}
    for (const factor of DLOM_FACTORS) {
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
  const maxScore = DLOM_MAX_SCORE

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

  // Persist whenever answers/kepemilikan change. Result.percentage is the
  // single source of truth for home.dlomPercent (sync handled inside store).
  const persistDlom = useCallback(
    (next: Pick<DlomState, 'answers' | 'kepemilikan'>) => {
      const computed = computeDlomPercentage({
        totalScore: Object.entries(next.answers).reduce((sum, [num, label]) => {
          const factor = DLOM_FACTORS.find((f) => f.number === Number(num))
          const opt = factor?.options.find((o) => o.label === label)
          return sum + (opt?.score ?? 0)
        }, 0),
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
        Memuat data DLOM…
      </div>
    )
  }

  return (
    <QuestionnaireForm
      title="DLOM — Discount for Lack of Marketability"
      disclaimer="Pilih opsi terbaik untuk setiap faktor. Hasil persentase otomatis ter-sync ke HOME store dan dipakai sebagai discount factor di final valuation."
      jenisPerusahaan={jenisPerusahaan}
      factors={DLOM_FACTORS}
      answers={current.answers}
      onAnswerChange={handleAnswerChange}
      kepemilikan={current.kepemilikan}
      onKepemilikanChange={handleKepemilikanChange}
      result={result}
      resultLabel="DLOM Objek Penilaian"
    />
  )
}
