import { describe, expect, it } from 'vitest'
import { computeDcf, type DcfInput } from '@/lib/calculations/dcf'

/**
 * Ground truth from __tests__/fixtures/dcf.json — ALL values read from fixture.
 *
 * IMPORTANT: E/F column projected values are much larger than D column.
 * The projection model compounds aggressively. Trust the fixture, not assumptions.
 *
 * Key fixture values:
 *   D20=-36528651640.710  E20=-634461085546.798  F20=-9845395220476.354
 *   C25=-7652964599236.76 (total PV FCF)
 *   C27=489126530666314.06 (terminal value — positive because F20 negative / negative denominator)
 *   C29=345553229752301.2 (enterprise value)
 *   C33=345558864894519.2 (equity value 100%)
 */

const FIXTURE_INPUT: DcfInput = {
  // Historical last year
  historicalNoplat: 5720109965,
  historicalDepreciation: 159972488,
  historicalChangesCA: 1913225999,
  historicalChangesCL: -2039568042,
  historicalCapex: -412288044,
  // Projected NOPLAT (from fixture D7/E7/F7)
  projectedNoplat: [6565565531.753016, 7833389201.018673, 8837646482.41399],
  // Projected Depreciation (from fixture D8/E8/F8)
  projectedDepreciation: [267708942.36900568, 643810255.1516942, 1819074645.0107172],
  // Projected Changes in CA (from fixture D12/E12/F12)
  projectedChangesCA: [-41220345927.22062, -637016612558.0105, -9834491109505.791],
  // Projected Changes in CL (from fixture D13/E13/F13)
  projectedChangesCL: [-717762194.2992687, -498795868.0355153, -327776528.3118696],
  // Projected CapEx (from fixture D16/E16/F16, pre-signed negative)
  projectedCapex: [-1423817993.311922, -5422876576.922622, -21233055569.6742],
  // Discount rate
  wacc: 0.11463062037189403,
  // Growth rate
  growthRate: 0.1375273675434634,
  // Equity adjustments
  interestBearingDebt: -1000000000,
  excessCash: 6635142218,
  idleAsset: 0,
}

describe('computeDcf matches Excel fixture', () => {
  const result = computeDcf(FIXTURE_INPUT)

  // Part 1 — FCF
  it('computes historical FCF (C20)', () => {
    expect(result.historicalFcf).toBeCloseTo(5341452366, 0)
  })

  it('computes projected FCF year 1 (D20)', () => {
    expect(result.projectedFcf[0]).toBeCloseTo(-36528651640.710, 0)
  })

  it('computes projected FCF year 2 (E20)', () => {
    expect(result.projectedFcf[1]).toBeCloseTo(-634461085546.798, 0)
  })

  it('computes projected FCF year 3 (F20)', () => {
    expect(result.projectedFcf[2]).toBeCloseTo(-9845395220476.354, 0)
  })

  // Part 2 — Discounting
  it('computes discount factors', () => {
    expect(result.discountFactors[0]).toBeCloseTo(0.8971581990689904, 10)
    expect(result.discountFactors[1]).toBeCloseTo(0.8048928341567142, 10)
    expect(result.discountFactors[2]).toBeCloseTo(0.7221162055355733, 10)
  })

  it('computes PV of projected FCF (D24/E24/F24)', () => {
    expect(result.pvFcf[0]).toBeCloseTo(-32771979320.3977, -1)
    expect(result.pvFcf[1]).toBeCloseTo(-510673181307.908, -1)
    expect(result.pvFcf[2]).toBeCloseTo(-7109519438608.454, -1)
  })

  it('computes total PV of FCF (C25)', () => {
    expect(result.totalPvFcf).toBeCloseTo(-7652964599236.76, -2)
  })

  // Part 3 — Terminal Value
  it('computes terminal value (C27)', () => {
    expect(result.terminalValue).toBeCloseTo(489126530666314.06, -4)
  })

  it('computes PV of terminal value (C28)', () => {
    expect(result.pvTerminal).toBeCloseTo(353206194351537.94, -4)
  })

  it('computes enterprise value (C29)', () => {
    expect(result.enterpriseValue).toBeCloseTo(345553229752301.2, -4)
  })

  // Part 4 — Equity Value
  it('computes equity value 100% (C33)', () => {
    expect(result.equityValue100).toBeCloseTo(345558864894519.2, -4)
  })

  // Guards
  it('allows growth rate > WACC (negative FCF produces valid positive TV)', () => {
    // The fixture itself has g (13.75%) > r (11.46%) — Excel computes it fine
    expect(result.terminalValue).toBeGreaterThan(0)
  })

  it('throws when growth rate exactly equals WACC (division by zero)', () => {
    expect(() =>
      computeDcf({ ...FIXTURE_INPUT, growthRate: FIXTURE_INPUT.wacc })
    ).toThrow()
  })
})
