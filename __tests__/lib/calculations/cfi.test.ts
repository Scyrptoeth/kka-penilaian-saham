import { describe, expect, it } from 'vitest'
import { computeCfi } from '@/lib/calculations/cfi'

/**
 * CFI fixture ground truth from kka-penilaian-saham.xlsx "CFI" sheet.
 *
 * Column mapping (fixture):
 *   B=2019, C=2020, D=2021 (historical — from FCF!C/D/E row 20)
 *   E=2022, F=2023, G=2024 (projected — from DCF!D/E/F row 20)
 *
 * Row 7: Free Cash Flow
 * Row 8: Non-Operational Cash Flow (IS row 30 hist / PROY LR row 34 proj)
 * Row 9: CFI = Row 7 + Row 8
 */

const PRECISION = 6

// Historical FCF from FCF!C/D/E20
const HIST_FCF = {
  2019: -1280082601,
  2020: 1483348156,
  2021: 5021507390,
}

// Projected FCF from DCF!D/E/F20
const PROJ_FCF = {
  2022: -36528651640.709785,
  2023: -634461085546.7982,
  2024: -9845395220476.354,
}

// Historical Non-Op CF from IS!D/E/F30 (all 0 in this prototype)
const HIST_NON_OP = {
  2019: 0,
  2020: 0,
  2021: 0,
}

// Projected Non-Op CF from PROY LR!D/E/F34 (all 0 in this prototype)
const PROJ_NON_OP = {
  2022: 0,
  2023: 0,
  2024: 0,
}

describe('computeCfi matches Excel fixture', () => {
  const result = computeCfi({
    historicalFcf: HIST_FCF,
    projectedFcf: PROJ_FCF,
    historicalNonOpCf: HIST_NON_OP,
    projectedNonOpCf: PROJ_NON_OP,
  })

  it('merges historical + projected FCF', () => {
    expect(result.fcf[2019]).toBeCloseTo(-1280082601, PRECISION)
    expect(result.fcf[2020]).toBeCloseTo(1483348156, PRECISION)
    expect(result.fcf[2021]).toBeCloseTo(5021507390, PRECISION)
    expect(result.fcf[2022]).toBeCloseTo(-36528651640.709785, PRECISION)
    expect(result.fcf[2023]).toBeCloseTo(-634461085546.7982, PRECISION)
    expect(result.fcf[2024]).toBeCloseTo(-9845395220476.354, PRECISION)
  })

  it('merges historical + projected non-op CF', () => {
    for (const year of [2019, 2020, 2021, 2022, 2023, 2024]) {
      expect(result.nonOpCf[year]).toBe(0)
    }
  })

  it('CFI = FCF + NonOpCf for each year', () => {
    // Row 9 = Row 7 + Row 8 per year
    expect(result.cfi[2019]).toBeCloseTo(-1280082601, PRECISION)
    expect(result.cfi[2020]).toBeCloseTo(1483348156, PRECISION)
    expect(result.cfi[2021]).toBeCloseTo(5021507390, PRECISION)
    expect(result.cfi[2022]).toBeCloseTo(-36528651640.709785, PRECISION)
    expect(result.cfi[2023]).toBeCloseTo(-634461085546.7982, PRECISION)
    expect(result.cfi[2024]).toBeCloseTo(-9845395220476.354, PRECISION)
  })

  it('handles non-zero nonOpCf correctly', () => {
    const r = computeCfi({
      historicalFcf: { 2021: 5000 },
      projectedFcf: { 2022: 10000 },
      historicalNonOpCf: { 2021: 1500 },
      projectedNonOpCf: { 2022: -2000 },
    })
    expect(r.cfi[2021]).toBe(6500)
    expect(r.cfi[2022]).toBe(8000)
  })
})
