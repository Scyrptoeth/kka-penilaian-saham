import { describe, expect, it } from 'vitest'
import { computeQuestionnaireScores } from '@/lib/calculations/questionnaire-helpers'
import { DLOM_FACTORS } from '@/data/questionnaires/dlom-factors'
import { DLOC_FACTORS } from '@/data/questionnaires/dloc-factors'

describe('computeQuestionnaireScores — DLOM catalogue', () => {
  it('returns totalScore = 10 when every factor picks the worst (score 1) option', () => {
    const allWorst: Record<number, string> = {
      1: 'Tidak Ada',
      2: 'Skala Besar',
      3: 'Tidak Ada',
      4: 'Dibawah',
      5: 'Ya, Menurun',
      6: 'Diatas',
      7: 'Dibawah',
      8: 'Lebih Kecil',
      9: 'Menurun',
      10: 'Tidak',
    }
    const { scores, totalScore } = computeQuestionnaireScores(DLOM_FACTORS, allWorst)
    expect(totalScore).toBe(10)
    expect(Object.keys(scores)).toHaveLength(10)
  })

  it('returns totalScore = 0 when every factor picks the best option', () => {
    const allBest: Record<number, string> = {
      1: 'Ada',
      2: 'Tidak Terbatas',
      3: 'Ya',
      4: 'Diatas',
      5: 'Tidak, Meningkat',
      6: 'Dibawah',
      7: 'Diatas',
      8: 'Lebih Besar',
      9: 'Meningkat',
      10: 'Ya',
    }
    const { totalScore } = computeQuestionnaireScores(DLOM_FACTORS, allBest)
    expect(totalScore).toBe(0)
  })

  it('handles partial answers gracefully — only counts answered factors', () => {
    const partial = { 1: 'Ada', 5: 'Sedang, Stabil' }
    const { scores, totalScore } = computeQuestionnaireScores(DLOM_FACTORS, partial)
    expect(scores).toEqual({ 1: 0, 5: 0.5 })
    expect(totalScore).toBe(0.5)
  })

  it('ignores unknown option labels (e.g. typo) without throwing', () => {
    const garbled = { 1: 'NonExistentLabel' }
    const { scores, totalScore } = computeQuestionnaireScores(DLOM_FACTORS, garbled)
    expect(scores).toEqual({})
    expect(totalScore).toBe(0)
  })
})

describe('computeQuestionnaireScores — DLOC catalogue', () => {
  it('reproduces fixture: scores [1, 0.5, 0.5, 0.5, 0.5] = 3', () => {
    const fixtureAnswers: Record<number, string> = {
      1: 'Tidak Ada',
      2: 'Sedang',
      3: 'Moderat',
      4: 'Sebagian',
      5: 'Sebagian',
    }
    const { scores, totalScore } = computeQuestionnaireScores(DLOC_FACTORS, fixtureAnswers)
    expect(scores).toEqual({ 1: 1, 2: 0.5, 3: 0.5, 4: 0.5, 5: 0.5 })
    expect(totalScore).toBe(3)
  })

  it('factor 1 binary: "Ada" → 0, "Tidak Ada" → 1', () => {
    const ada = computeQuestionnaireScores(DLOC_FACTORS, { 1: 'Ada' })
    const tidakAda = computeQuestionnaireScores(DLOC_FACTORS, { 1: 'Tidak Ada' })
    expect(ada.totalScore).toBe(0)
    expect(tidakAda.totalScore).toBe(1)
  })
})
