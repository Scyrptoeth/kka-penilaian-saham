/**
 * DLOM — Discount for Lack of Marketability
 *
 * Mirrors the workbook formula chain in `DLOM!B30..F34`:
 *
 *   B30 = IF(jenisPerusahaan="tertutup", 1, 2)        // 1 = tertutup, 2 = terbuka
 *   B31 = IF(kepemilikan="Minoritas", 5, 7)           // 5 = minoritas, 7 = mayoritas
 *   C32 = IF(B30+B31=6, "30% - 50%",                  // tertutup + minoritas
 *         IF(B30+B31=8, "20% - 40%",                  // tertutup + mayoritas
 *         IF(B30+B31=7, "10% - 30%",                  // terbuka + minoritas
 *                       " 0% - 20%")))                // terbuka + mayoritas
 *   F31 = number of factors                           // = maxScore
 *   F32 = rangeMax − rangeMin                         // range width
 *   F33 = SUM of scores                               // = totalScore
 *   F34 = rangeMin + (F33 / F31 × F32)                // = computed percentage
 *
 * Verified against fixture: with 10 factors, all answered with score 1,
 * jenisPerusahaan=tertutup, kepemilikan=mayoritas → DLOM = 0.40 (matches DLOM!F34).
 */

import type { JenisPerusahaan } from '@/types/financial'
import type { KepemilikanType } from '@/types/questionnaire'

export interface DlomComputeParams {
  totalScore: number
  maxScore: number
  jenisPerusahaan: JenisPerusahaan
  kepemilikan: KepemilikanType
}

export interface DlomComputeResult {
  range: { min: number; max: number }
  percentage: number
}

/**
 * Lookup the [min, max] DLOM range based on jenisPerusahaan + kepemilikan.
 *
 * Mirror of DLOM!C32 IF chain — single source of truth for the four
 * matrix combinations.
 */
export function lookupDlomRange(
  jenisPerusahaan: JenisPerusahaan,
  kepemilikan: KepemilikanType,
): { min: number; max: number } {
  const jenisCode = jenisPerusahaan === 'tertutup' ? 1 : 2
  const kepemilikanCode = kepemilikan === 'minoritas' ? 5 : 7

  switch (jenisCode + kepemilikanCode) {
    case 6: // tertutup + minoritas
      return { min: 0.3, max: 0.5 }
    case 8: // tertutup + mayoritas
      return { min: 0.2, max: 0.4 }
    case 7: // terbuka + minoritas
      return { min: 0.1, max: 0.3 }
    case 9: // terbuka + mayoritas
      return { min: 0.0, max: 0.2 }
    default:
      // Unreachable — JenisPerusahaan + KepemilikanType union is exhaustive.
      throw new Error(
        `lookupDlomRange: unexpected combination ${jenisPerusahaan}/${kepemilikan}`,
      )
  }
}

/**
 * Compute DLOM percentage from a questionnaire scoring result.
 *
 * Pure function — no side effects, no I/O. Caller (typically the
 * DLOM page) supplies the scoring result and ownership context.
 */
export function computeDlomPercentage(
  params: DlomComputeParams,
): DlomComputeResult {
  const { totalScore, maxScore, jenisPerusahaan, kepemilikan } = params
  const range = lookupDlomRange(jenisPerusahaan, kepemilikan)
  const width = range.max - range.min
  const percentage =
    maxScore > 0 ? range.min + (totalScore / maxScore) * width : range.min
  return { range, percentage }
}
