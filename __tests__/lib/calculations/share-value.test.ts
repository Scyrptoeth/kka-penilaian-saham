import { describe, expect, it } from 'vitest'
import { computeShareValue, type ShareValueInput } from '@/lib/calculations/share-value'

/**
 * Ground truth from DCF fixture (rows C33→C42) and EEM fixture (D34→D45).
 *
 * DCF:
 *   C33 (equityValue100) = 345558864894519.2
 *   B34 (dlomPercent) = -0.4   → applied as 0.4 (positive input, function negates)
 *   C34 (dlomDiscount) = -138223545957807.69
 *   C35 (equityLessDlom) = 345558864894519.2 + (-138223545957807.69) = 207335318936711.5
 *   B36 (dlocPercent) = 0      → no DLOC
 *   C36 = 0
 *   C37 (marketValue100) = 207335318936711.5
 *   B38 (proporsiSaham) = 0.3
 *   C39 (marketValuePortion) = 62200595681013.445
 *   C40 (rounded) = 62200595682000
 *   C41 (jumlahSaham) = 600000000
 *   C42 (perShare) = C39/C41 = 103667.659...
 *
 * EEM:
 *   D34 (equityValue100) = 50569671980.081
 *   C35 (dlomPercent) = -0.4 (HOME!B15*-1)
 *   D35 = -20227868792.032
 *   D36 = 50569671980.081 + (-20227868792.032) = 30341803188.049
 *   C37 (dloc) = 0
 *   D38 (mv100) = 30341803188.049 - 0 = 30341803188.048 (float rounding)
 *   C39 (proporsi) = 0.3
 *   D40 (mvPortion) = 9102540956.415
 *   D43 (rounded) = 9102541000
 *   D44 (jumlahSaham) = 600000000
 *   D45 (perShare) = D42/D44 = 15.171...
 */

const PRECISION = 6

describe('computeShareValue', () => {
  it('matches DCF fixture equity→share value chain', () => {
    const input: ShareValueInput = {
      equityValue100: 345558864894519.2,
      dlomPercent: 0.4,
      dlocPercent: 0,
      proporsiSaham: 0.3,
      jumlahSahamBeredar: 600_000_000,
    }
    const r = computeShareValue(input)
    expect(r.dlomDiscount).toBeCloseTo(-138223545957807.69, 0) // large number, lower precision
    expect(r.equityLessDlom).toBeCloseTo(207335318936711.5, 0)
    expect(r.dlocDiscount).toBe(0)
    expect(r.marketValue100).toBeCloseTo(207335318936711.5, 0)
    expect(r.marketValuePortion).toBeCloseTo(62200595681013.445, 0)
    expect(r.rounded).toBe(62200595682000)
    expect(r.perShare).toBeCloseTo(103667.659, 2)
  })

  it('matches EEM fixture equity→share value chain', () => {
    const input: ShareValueInput = {
      equityValue100: 50569671980.081,
      dlomPercent: 0.4,
      dlocPercent: 0,
      proporsiSaham: 0.3,
      jumlahSahamBeredar: 600_000_000,
    }
    const r = computeShareValue(input)
    expect(r.dlomDiscount).toBeCloseTo(-20227868792.0324, 3)
    expect(r.equityLessDlom).toBeCloseTo(30341803188.0486, 3)
    expect(r.dlocDiscount).toBe(0)
    expect(r.marketValue100).toBeCloseTo(30341803188.0486, PRECISION)
    expect(r.marketValuePortion).toBeCloseTo(9102540956.41458, 2)
    expect(r.rounded).toBe(9102541000)
    expect(r.perShare).toBeCloseTo(15.170901594, PRECISION)
  })

  it('applies DLOC when non-zero', () => {
    const input: ShareValueInput = {
      equityValue100: 100_000_000,
      dlomPercent: 0.3,
      dlocPercent: 0.5,
      proporsiSaham: 1.0,
      jumlahSahamBeredar: 1_000_000,
    }
    const r = computeShareValue(input)
    // equity * -0.3 = -30M → equityLessDlom = 70M
    expect(r.dlomDiscount).toBe(-30_000_000)
    expect(r.equityLessDlom).toBe(70_000_000)
    // 70M * -0.5 = -35M → mv100 = 35M
    expect(r.dlocDiscount).toBe(-35_000_000)
    expect(r.marketValue100).toBe(35_000_000)
    expect(r.marketValuePortion).toBe(35_000_000) // 100%
    expect(r.rounded).toBe(35_000_000)
    expect(r.perShare).toBe(35)
  })

  it('handles zero equity value', () => {
    const input: ShareValueInput = {
      equityValue100: 0,
      dlomPercent: 0.4,
      dlocPercent: 0,
      proporsiSaham: 0.3,
      jumlahSahamBeredar: 600_000_000,
    }
    const r = computeShareValue(input)
    expect(r.dlomDiscount).toBe(0)
    expect(r.perShare).toBe(0)
  })

  it('handles negative equity value', () => {
    const input: ShareValueInput = {
      equityValue100: -10_000_000,
      dlomPercent: 0.4,
      dlocPercent: 0,
      proporsiSaham: 1.0,
      jumlahSahamBeredar: 1_000_000,
    }
    const r = computeShareValue(input)
    expect(r.dlomDiscount).toBe(4_000_000) // negative equity * -0.4 = positive
    expect(r.equityLessDlom).toBe(-6_000_000)
    expect(r.perShare).toBeCloseTo(-6, PRECISION)
  })
})
