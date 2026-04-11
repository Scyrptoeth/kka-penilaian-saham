/**
 * Pure helpers for questionnaire scoring (DLOM, DLOC, dan kuisioner masa
 * depan). Tidak ada React, tidak ada store, tidak ada I/O — sengaja
 * dipisah dari `dlom.ts` / `dloc.ts` agar pages dan tests bisa share
 * implementasi yang sama tanpa duplikasi reduce loops.
 */

import type { QuestionnaireFactor } from '@/types/questionnaire'

export interface QuestionnaireScoring {
  /** Per-factor numeric scores, indexed by factor.number. */
  scores: Record<number, number>
  /** Sum of all factor scores. */
  totalScore: number
}

/**
 * Compute per-factor scores and total from raw `answers` map.
 *
 * Iterates the factor catalogue (not the answers) so unknown answer keys
 * are ignored gracefully and missing answers contribute zero. The lookup
 * cost is O(factors × options) which is bounded — both DLOM (10×3) and
 * DLOC (5×3) are tiny.
 *
 * Pure function. Replaces 4 inline reduce loops in dlom/page.tsx and
 * dloc/page.tsx (LESSON-022: kill the 2nd instance before it becomes the
 * 6th).
 */
export function computeQuestionnaireScores(
  factors: readonly QuestionnaireFactor[],
  answers: Record<number, string>,
): QuestionnaireScoring {
  const scores: Record<number, number> = {}
  for (const factor of factors) {
    const selectedLabel = answers[factor.number]
    if (selectedLabel === undefined) continue
    const option = factor.options.find((o) => o.label === selectedLabel)
    if (option) scores[factor.number] = option.score
  }
  let totalScore = 0
  for (const value of Object.values(scores)) totalScore += value
  return { scores, totalScore }
}
