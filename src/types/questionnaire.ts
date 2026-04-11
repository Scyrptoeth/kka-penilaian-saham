/**
 * Questionnaire type definitions for DLOM and DLOC scoring forms.
 *
 * DLOM = Discount for Lack of Marketability
 *   - 10 factors, each with 3 options (0 / 0.5 / 1)
 *   - Range depends on jenisPerusahaan + kepemilikan combination
 *   - Final percentage applied as discount to share value
 *
 * DLOC (PFC) = Premium for Control
 *   - 5 factors (factor 1 binary, factors 2-5 with 3 options)
 *   - Range depends ONLY on jenisPerusahaan (kepemilikan does NOT affect range)
 *   - Final percentage applied as premium to share value when valuing
 *     a controlling stake
 *
 * Both scoring formulas share the same shape:
 *   percentage = rangeMin + (totalScore / maxScore) × (rangeMax − rangeMin)
 *
 * Verified against fixture cells:
 *   DLOM!F34 = 0.40 (totalScore=10, maxScore=10, tertutup+mayoritas → 20-40%)
 *   DLOC(PFC)!E24 = 0.54 (totalScore=3, maxScore=5, tertutup → 30-70%)
 */

/** Selectable kepemilikan saham yang dinilai. */
export type KepemilikanType = 'mayoritas' | 'minoritas'

/** A single answer option within a questionnaire factor. */
export interface QuestionnaireOption {
  /** Display label, e.g. "Ada", "Terbatas", "Tidak Ada". */
  label: string
  /** Numeric score: 0, 0.5, or 1. */
  score: number
}

/** A single factor row in a DLOM/DLOC questionnaire. */
export interface QuestionnaireFactor {
  /** 1-based factor number, used as the React key and store map key. */
  number: number
  /** Short factor label rendered as the question header. */
  label: string
  /** Long-form description rendered below the label. */
  description: string
  /** Available options for this factor. */
  options: readonly QuestionnaireOption[]
}

/** Result of a single scoring computation, suitable for direct UI display. */
export interface QuestionnaireResult {
  /** Score per factor, indexed by factor number. */
  scores: Record<number, number>
  /** Sum of all scores. */
  totalScore: number
  /** Maximum possible score (= number of factors × 1). */
  maxScore: number
  /** Percentage range determined by jenisPerusahaan (+ kepemilikan for DLOM). */
  range: { min: number; max: number }
  /** Final computed percentage = range.min + (totalScore / maxScore) × (max − min). */
  percentage: number
}
