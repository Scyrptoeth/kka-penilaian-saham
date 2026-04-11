/**
 * DLOC (PFC) — Premium for Control
 *
 * Mirrors the workbook formula chain in `DLOC(PFC)!A20..E24`:
 *
 *   A20 = IF(B20="DLOC Perusahaan tertutup", 1, 2)       // 1 = tertutup, 2 = terbuka
 *   B22 = IF(A20=1, " 30% - 70%", " 20% - 35%")          // range based on jenisPerusahaan
 *   E21 = 5                                              // maxScore — fixed to number of factors
 *   E22 = RIGHT(B22,3) − LEFT(B22,4)                     // range width
 *   E23 = SUM of factor scores
 *   E24 = LEFT(B22,4) + (E23 / E21 × E22)                // = computed percentage
 *
 * Note: DLOC range depends ONLY on `jenisPerusahaan`. Kepemilikan does NOT
 * affect range or maxScore in DLOC — verified by inspecting B22 formula
 * which references only A20 (jenisPerusahaan code), not A21 (kepemilikan
 * code which is computed but unused for range determination).
 *
 * Verified against fixture: with 5 factors, scores [1, 0.5, 0.5, 0.5, 0.5]
 * (totalScore = 3), jenisPerusahaan=tertutup → DLOC = 0.54 (matches
 * DLOC(PFC)!E24).
 */

import type { JenisPerusahaan } from '@/types/financial'

export interface DlocComputeParams {
  totalScore: number
  maxScore: number
  jenisPerusahaan: JenisPerusahaan
}

export interface DlocComputeResult {
  range: { min: number; max: number }
  percentage: number
}

/**
 * Lookup the [min, max] DLOC range based on jenisPerusahaan only.
 *
 * Mirror of DLOC(PFC)!B22 — kepemilikan is intentionally absent because
 * the workbook formula does not consult it.
 */
export function lookupDlocRange(
  jenisPerusahaan: JenisPerusahaan,
): { min: number; max: number } {
  return jenisPerusahaan === 'tertutup'
    ? { min: 0.3, max: 0.7 }
    : { min: 0.2, max: 0.35 }
}

/**
 * Compute DLOC (PFC) percentage from a questionnaire scoring result.
 *
 * Pure function — no kepemilikan parameter because the Excel formula
 * does not use it. UI may still capture kepemilikan for context, but
 * the computation is jenisPerusahaan-only.
 */
export function computeDlocPercentage(
  params: DlocComputeParams,
): DlocComputeResult {
  const { totalScore, maxScore, jenisPerusahaan } = params
  const range = lookupDlocRange(jenisPerusahaan)
  const width = range.max - range.min
  const percentage =
    maxScore > 0 ? range.min + (totalScore / maxScore) * width : range.min
  return { range, percentage }
}
