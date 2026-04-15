import { describe, expect, it } from 'vitest'
import { computeAam, type AamInput } from '@/lib/calculations/aam-valuation'

/**
 * Ground truth from __tests__/fixtures/aam.json
 *
 * Assets (E column, all adjustments = 0 in prototype):
 *   E9=6635142218, E10=9652447673, E11=3382100694, E12=1000000000
 *   E13=1423637783, E14=2347809320
 *   E16=24441137688 (total current)
 *   E20=6264339945 (FA net), E21=0 (other non-current), E22=6264339945 (total NC)
 *   E23=0 (intangible), E24=30705477633 (total assets)
 *
 * Liabilities:
 *   E28=1000000000 (bank loan ST), E29=1096222695 (AP), E30=480490835 (tax)
 *   E31=1692923000 (others), E32=4269636530 (total CL)
 *   E35=0 (bank loan LT), E36=0 (related party), E37=0 (total NCL)
 *
 * Equity:
 *   E40=2000000000 (modal disetor), E41=0 (agio), E45=27366482204 (retained)
 *   E46=0 (revaluation), E47=29366482204 (total SE)
 *
 * Valuation:
 *   E51=27435841103 (NAV = E24 - (E29+E30+E31) - E36)
 *   E52=1000000000 (IBD = C28 + C35, HISTORICAL not adjusted)
 *   E53=26435841103 (equity = NAV - IBD)
 *   D54=-0.3 (DLOM), E54=-7930752330.9
 *   E55=18505088772.1 (equity less DLOM)
 *   D56=-0.54 (DLOC), E56=-9992747936.934
 *   E57=8512340835.166 (market value 100%)
 *   D58=0.3 (proporsi), E59=2553702250.5498 (FINAL — AAM ends here)
 *
 * Note: Row 60 ("Nilai Akhir") removed from UI & pure calc per user feedback
 * (revisi-kedua-PENILAIAN-AAM.png) — AAM finishes at Market Value Portion (E59).
 * Dashboard perShare now uses marketValuePortion directly.
 */

const PRECISION = 6

const FIXTURE_INPUT: AamInput = {
  // Current assets from BS last year (F column)
  cashOnHands: 6635142218,
  cashOnBank: 9652447673,
  accountReceivable: 3382100694,
  otherReceivable: 1000000000,
  inventory: 1423637783,
  otherCurrentAssets: 2347809320,
  // Non-current assets
  fixedAssetNet: 6264339945, // BS!F22
  otherNonCurrentAssets: 0, // BS!F23
  intangibleAssets: 0, // BS!F24
  totalNonCurrentAssets: 6264339945, // BS!F25
  // Adjustments (all 0 in prototype)
  totalAdjustments: 0,
  // Current liabilities
  bankLoanST: 1000000000, // BS!F31
  accountPayable: 1096222695, // BS!F32
  taxPayable: 480490835, // BS!F33
  otherCurrentLiabilities: 1692923000, // BS!F34
  // Non-current liabilities
  bankLoanLT: 0, // BS!F38
  relatedPartyNCL: 0, // BS!F39
  // Equity
  modalDisetor: 2000000000, // BS!F43
  agioDisagio: 0, // BS!F44
  retainedCurrentYear: 5805826735, // BS!F46
  retainedPriorYears: 21560655469, // BS!F47
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

  it('computes adjusted total assets (E24 = E16 + E22 + E23)', () => {
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

  it('computes NAV (E51) — total assets minus specific liabilities, NOT total liabilities', () => {
    // E51 = E24 - (E29 + E30 + E31) - E36
    // = 30705477633 - (1096222695 + 480490835 + 1692923000) - 0
    expect(result.netAssetValue).toBeCloseTo(27435841103, PRECISION)
  })

  it('computes Interest Bearing Debt (E52) from HISTORICAL values', () => {
    // E52 = C28 + C35 (historical, not adjusted)
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
