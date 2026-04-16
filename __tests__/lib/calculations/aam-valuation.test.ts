import { describe, expect, it } from 'vitest'
import { computeAam, type AamInput } from '@/lib/calculations/aam-valuation'

/**
 * Ground truth from __tests__/fixtures/aam.json
 *
 * Section totals computed from individual fixture values:
 *
 * Current assets (adjusted, all D=0 in prototype):
 *   Cash on Hands=6635142218, Cash on Bank=9652447673, AR=3382100694,
 *   Other Recv=1000000000, Inventory=1423637783, Others=2347809320
 *   Total CA = 24441137688
 *
 * Non-current assets:
 *   FA Net=6264339945, Other NC=0
 *   Total NCA = 6264339945
 *
 * Intangible = 0
 *
 * Total Assets = 24441137688 + 6264339945 + 0 = 30705477633
 *
 * Non-IBD current liabilities:
 *   AP=1096222695, Tax=480490835, Others=1692923000
 *   Total non-IBD CL = 3269636530
 *
 * Non-IBD non-current liabilities:
 *   Related Party=0
 *   Total non-IBD NCL = 0
 *
 * IBD (historical, not adjusted):
 *   Bank Loan ST=1000000000, Bank Loan LT=0
 *   Total IBD = 1000000000
 *
 * Total current liabilities = 3269636530 + 1000000000 = 4269636530
 * Total non-current liabilities = 0
 *
 * Equity:
 *   Modal Disetor=2000000000, Agio=0, Retained Current=5805826735,
 *   Retained Prior=21560655469
 *   Total Equity = 29366482204
 *
 * Valuation:
 *   NAV = 30705477633 - 3269636530 - 0 = 27435841103
 *   IBD = 1000000000
 *   Equity Value = 27435841103 - 1000000000 = 26435841103
 *   DLOM (30%) = -7930752330.9
 *   Equity less DLOM = 18505088772.1
 *   DLOC (54%) = -9992747936.934
 *   Market Value 100% = 8512340835.166
 *   Market Value Portion (30%) = 2553702250.5498
 */

const PRECISION = 6

const FIXTURE_INPUT: AamInput = {
  // Section totals (adjusted C+D, all adjustments=0 in prototype)
  totalCurrentAssets: 24441137688,
  totalNonCurrentAssets: 6264339945,
  intangibleAssets: 0,
  totalAssets: 30705477633,
  // Liabilities split by IBD
  nonIbdCurrentLiabilities: 3269636530,
  ibdCurrentLiabilities: 1000000000,
  totalCurrentLiabilities: 4269636530,
  nonIbdNonCurrentLiabilities: 0,
  ibdNonCurrentLiabilities: 0,
  totalNonCurrentLiabilities: 0,
  interestBearingDebtHistorical: 1000000000,
  // Equity
  totalEquity: 29366482204,
  totalAdjustments: 0,
  // Valuation params
  dlomPercent: 0.3,
  dlocPercent: 0.54,
  proporsiSaham: 0.3,
}

describe('computeAam matches Excel fixture', () => {
  const result = computeAam(FIXTURE_INPUT)

  it('computes adjusted total current assets (E16)', () => {
    expect(result.totalCurrentAssets).toBeCloseTo(24441137688, PRECISION)
  })

  it('computes adjusted total non-current assets (E22)', () => {
    expect(result.totalNonCurrentAssets).toBeCloseTo(6264339945, PRECISION)
  })

  it('computes adjusted total assets (E24)', () => {
    expect(result.totalAssets).toBeCloseTo(30705477633, PRECISION)
  })

  it('computes total current liabilities (E32)', () => {
    expect(result.totalCurrentLiabilities).toBeCloseTo(4269636530, PRECISION)
  })

  it('computes total non-current liabilities (E37)', () => {
    expect(result.totalNonCurrentLiabilities).toBe(0)
  })

  it('computes total shareholders equity (E47)', () => {
    expect(result.totalEquity).toBeCloseTo(29366482204, PRECISION)
  })

  it('computes NAV (E51) — total assets minus non-IBD liabilities only', () => {
    expect(result.netAssetValue).toBeCloseTo(27435841103, PRECISION)
  })

  it('computes Interest Bearing Debt (E52) from HISTORICAL values', () => {
    expect(result.interestBearingDebt).toBeCloseTo(1000000000, PRECISION)
  })

  it('computes equity value (E53 = NAV - IBD)', () => {
    expect(result.equityValue).toBeCloseTo(26435841103, PRECISION)
  })

  it('computes DLOM discount (E54)', () => {
    expect(result.dlomDiscount).toBeCloseTo(-7930752330.9, PRECISION)
  })

  it('computes equity less DLOM (E55)', () => {
    expect(result.equityLessDlom).toBeCloseTo(18505088772.1, PRECISION)
  })

  it('computes DLOC discount (E56)', () => {
    expect(result.dlocDiscount).toBeCloseTo(-9992747936.934, 2)
  })

  it('computes market value 100% (E57)', () => {
    expect(result.marketValue100).toBeCloseTo(8512340835.166, 2)
  })

  it('computes market value portion — AAM final output (E59)', () => {
    expect(result.marketValuePortion).toBeCloseTo(2553702250.5498, 2)
  })

  it('does not expose finalValue (removed — AAM ends at Market Value Portion)', () => {
    expect('finalValue' in result).toBe(false)
  })
})
