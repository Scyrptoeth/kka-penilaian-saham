import { describe, expect, it } from 'vitest'
import { computeEem, type EemInput } from '@/lib/calculations/eem-valuation'

/**
 * Ground truth from __tests__/fixtures/eem.json
 *
 * D7=20800698885 (NTA from AAM adjusted values)
 * C8=0.12379278094673796 (BC!F14 waccTangible)
 * D9=2574976360.6098614 (earning return = D7*C8)
 * D12=5720109965 (NOPLAT hist), D13=159972488 (depreciation)
 * D14=5880082453 (gross CF), D19=-126342043 (total WC)
 * D21=-412288044 (capex), D23=-538630087 (gross investment)
 * D25=5341452366 (FCF)
 * D27=2766476005.3901386 (excess earning = FCF - earning return)
 * C28=0.11463062037189403 (WACC = capitalization rate)
 * D29=24133830877.080757 (capitalized excess = D27/C28)
 * D31=44934529762.08076 (EV = NTA + capitalized excess)
 * D32=-1000000000 (IBD)
 * D33=6635142218 (non-operating asset = BS!F8 cash)
 * D34=50569671980.08076 (equity value 100%)
 */

const PRECISION = 3

const FIXTURE_INPUT: EemInput = {
  // NTA components from AAM adjusted values
  aamTotalCurrentAssets: 24441137688, // AAM!E16
  aamTotalNonCurrentAssets: 6264339945, // AAM!E22
  aamAccountPayable: 1096222695, // AAM!E29
  aamTaxPayable: 480490835, // AAM!E30
  aamOtherCurrentLiabilities: 1692923000, // AAM!E31
  aamRelatedPartyNCL: 0, // AAM!E36
  aamCashOnHands: 6635142218, // AAM!E9
  // Borrowing Cap rate
  waccTangible: 0.12379278094673796, // BC!F14
  // Historical FCF components (last year, pre-signed)
  historicalNoplat: 5720109965, // NOPLAT!E19
  historicalDepreciation: 159972488, // FA!E51
  historicalTotalWC: -126342043, // CFS!E10
  historicalCapex: -412288044, // FA!E23*-1
  // Discount rate
  wacc: 0.11463062037189403, // DISCOUNT RATE!H10
  // Equity adjustments
  interestBearingDebt: -1000000000, // (BS!F31+F38)*-1
  nonOperatingAsset: 6635142218, // BS!F8 (cash on hands)
}

describe('computeEem matches Excel fixture', () => {
  const result = computeEem(FIXTURE_INPUT)

  it('computes net tangible asset (D7)', () => {
    expect(result.netTangibleAsset).toBeCloseTo(20800698885, PRECISION)
  })

  it('computes earning return on NTA (D9)', () => {
    expect(result.earningReturn).toBeCloseTo(2574976360.6098614, PRECISION)
  })

  it('computes gross cash flow (D14)', () => {
    expect(result.grossCashFlow).toBeCloseTo(5880082453, PRECISION)
  })

  it('computes gross investment (D23)', () => {
    expect(result.grossInvestment).toBeCloseTo(-538630087, PRECISION)
  })

  it('computes free cash flow (D25)', () => {
    expect(result.fcf).toBeCloseTo(5341452366, PRECISION)
  })

  it('computes excess earning (D27 = FCF - earning return)', () => {
    expect(result.excessEarning).toBeCloseTo(2766476005.3901386, PRECISION)
  })

  it('computes capitalized excess earning (D29 = D27 / WACC)', () => {
    expect(result.capitalizedExcess).toBeCloseTo(24133830877.080757, PRECISION)
  })

  it('computes enterprise value (D31 = NTA + capitalized excess)', () => {
    expect(result.enterpriseValue).toBeCloseTo(44934529762.08076, PRECISION)
  })

  it('computes equity value 100% (D34 = EV + IBD + non-op asset)', () => {
    expect(result.equityValue100).toBeCloseTo(50569671980.08076, PRECISION)
  })

  it('handles zero WACC gracefully', () => {
    expect(() =>
      computeEem({ ...FIXTURE_INPUT, wacc: 0 })
    ).toThrow()
  })
})
