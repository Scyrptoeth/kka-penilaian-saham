import { describe, expect, it } from 'vitest'
import {
  computeSalesVolumes,
  computeSalesPrices,
  computeTotalCapex,
} from '@/lib/calculations/key-drivers'

/**
 * Fixture values from __tests__/fixtures/key-drivers.json.
 * Sales Vol: D14=1091700, increments [5%, 10%, 10%, 10%, 10%, 10%]
 * Sales Price: D17=111000, increments all 5%
 */

describe('computeSalesVolumes — ROUND(prev*(1+inc), -2)', () => {
  const vols = computeSalesVolumes(1_091_700, [0.05, 0.10, 0.10, 0.10, 0.10, 0.10])

  it('year 0 (base) = 1091700', () => {
    expect(vols[0]).toBe(1_091_700)
  })

  it('year 1 (5%) matches E14 = 1146300', () => {
    expect(vols[1]).toBe(1_146_300)
  })

  it('year 2 (10%) matches F14 = 1260900', () => {
    expect(vols[2]).toBe(1_260_900)
  })

  it('year 3 (10%) matches G14 = 1387000', () => {
    expect(vols[3]).toBe(1_387_000)
  })

  it('year 4 (10%) matches H14 = 1525700', () => {
    expect(vols[4]).toBe(1_525_700)
  })

  it('year 5 (10%) matches I14 = 1678300', () => {
    expect(vols[5]).toBe(1_678_300)
  })

  it('year 6 (10%) matches J14 = 1846100', () => {
    expect(vols[6]).toBe(1_846_100)
  })
})

describe('computeSalesPrices — ROUNDUP(prev*(1+inc), -3)', () => {
  const prices = computeSalesPrices(111_000, [0.05, 0.05, 0.05, 0.05, 0.05, 0.05])

  it('year 0 (base) = 111000', () => {
    expect(prices[0]).toBe(111_000)
  })

  it('year 1 (5%) matches E17 = 117000', () => {
    expect(prices[1]).toBe(117_000)
  })

  it('year 2 (5%) matches F17 = 123000', () => {
    expect(prices[2]).toBe(123_000)
  })

  it('year 3 (5%) matches G17 = 130000', () => {
    expect(prices[3]).toBe(130_000)
  })

  it('year 4 (5%) matches H17 = 137000', () => {
    expect(prices[4]).toBe(137_000)
  })

  it('year 5 (5%) matches I17 = 144000', () => {
    expect(prices[5]).toBe(144_000)
  })

  it('year 6 (5%) matches J17 = 152000', () => {
    expect(prices[6]).toBe(152_000)
  })
})

describe('computeTotalCapex', () => {
  it('matches row 37 = SUM(land+building+equipment+others) per year', () => {
    // Fixture: land=[0,0,...], building=[0,0,...], equipment=[1000,...], others=[500,...]
    const land = [0, 0, 0, 0, 0, 0, 0]
    const building = [0, 0, 0, 0, 0, 0, 0]
    const equipment = [1000, 1000, 1000, 1000, 1000, 1000, 1000]
    const others = [500, 500, 500, 500, 500, 500, 500]
    const totals = computeTotalCapex(land, building, equipment, others)
    expect(totals).toEqual([1500, 1500, 1500, 1500, 1500, 1500, 1500])
  })

  it('handles uneven lengths gracefully', () => {
    const totals = computeTotalCapex([100], [], [200, 300], [])
    expect(totals).toEqual([300, 300])
  })
})
