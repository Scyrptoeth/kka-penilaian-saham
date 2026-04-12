import { describe, expect, it } from 'vitest'
import { computeProyLrLive, type ProyLrInput } from '@/data/live/compute-proy-lr-live'
import type { KeyDriversState } from '@/lib/store/useKkaStore'

const PRECISION = 3 // ROUNDUP(...,3) in COGS limits precision; 3 decimals matches Excel

/**
 * Fixture values from proy-lr.json + key-drivers.json + income-statement.json.
 */
const KEY_DRIVERS: KeyDriversState = {
  financialDrivers: {
    interestRateShortTerm: 0.14,
    interestRateLongTerm: 0.12,
    bankDepositRate: 0.09,
    corporateTaxRate: 0.22,
  },
  operationalDrivers: {
    salesVolumeBase: 1_091_700,
    salesPriceBase: 111_000,
    salesVolumeIncrements: [0.05, 0.10, 0.10, 0.10, 0.10, 0.10],
    salesPriceIncrements: [0.05, 0.05, 0.05, 0.05, 0.05, 0.05],
    // Stored POSITIVE (negated in adapter)
    cogsRatio: 0.5527843716596639,
    sellingExpenseRatio: 0.21390305158621747,
    gaExpenseRatio: 0.11767534091573767,
  },
  bsDrivers: {
    accReceivableDays: [35, 35, 35, 35, 35, 35, 35],
    inventoryDays: [50, 50, 50, 50, 50, 50, 50],
    accPayableDays: [90, 90, 90, 90, 90, 90, 90],
  },
  additionalCapex: {
    land: [0, 0, 0, 0, 0, 0, 0],
    building: [0, 0, 0, 0, 0, 0, 0],
    equipment: [1000, 1000, 1000, 1000, 1000, 1000, 1000],
    others: [500, 500, 500, 500, 500, 500, 500],
  },
}

const INPUT: ProyLrInput = {
  keyDrivers: KEY_DRIVERS,
  revenueGrowth: 0.23045401016035838, // IS K6
  interestIncomeGrowth: 0.0013996727674017585, // IS K26
  interestExpenseGrowth: -0.0002714340819281705, // IS K27
  nonOpIncomeGrowth: 0, // IS K30
  isLastYear: {
    revenue: 61_039_612_496,        // IS F6
    cogs: -26_008_410_685,          // IS F7
    grossProfit: 35_031_201_811,     // IS F8
    sellingOpex: -20_131_113_884,    // IS F12
    gaOpex: -7_406_641_195,         // IS F13
    depreciation: -159_972_488,      // FA E51 * -1 (note: slightly diff from fixture C22=-159972488)
    interestIncome: 105_200_220,     // IS F26
    interestExpense: -19_483_450,    // IS F27
    nonOpIncome: 0,                  // IS F30
    tax: -1_613_364_280,            // IS F33
  },
  // PROY FA row 51 (total depreciation additions) for projection years
  proyFaDepreciation: {
    2022: 267_708_942.36900568,
    2023: 643_810_255.1516942,
    2024: 1_819_074_645.0107172,
  },
}

const HIST_YEAR = 2021
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyLrLive — matches proy-lr.json fixture', () => {
  const result = computeProyLrLive(INPUT, HIST_YEAR, PROJ_YEARS)

  // Row 8: Revenue
  it('Revenue D8 = 75106435974.338', () => {
    expect(result[8]?.[2022]).toBeCloseTo(75_106_435_974.33751, PRECISION)
  })

  it('Revenue E8 = 92415015333.476', () => {
    expect(result[8]?.[2023]).toBeCloseTo(92_415_015_333.47578, PRECISION)
  })

  it('Revenue F8 = 113712426216.106', () => {
    expect(result[8]?.[2024]).toBeCloseTo(113_712_426_216.10628, PRECISION)
  })

  // Row 10: COGS (negative, ROUNDUP to 3 decimals)
  it('COGS D10 = -41517664017.671', () => {
    expect(result[10]?.[2022]).toBeCloseTo(-41_517_664_017.671, PRECISION)
  })

  // Row 11: Gross Profit
  it('Gross Profit D11 = 33588771956.667', () => {
    expect(result[11]?.[2022]).toBeCloseTo(33_588_771_956.66651, PRECISION)
  })

  // Row 19: EBITDA
  it('EBITDA D19 = 8685100649.745', () => {
    expect(result[19]?.[2022]).toBeCloseTo(8_685_100_649.744667, PRECISION)
  })

  // Row 22: Depreciation = -PROY FA row 51
  it('Depreciation D22 = -267708942.369', () => {
    expect(result[22]?.[2022]).toBeCloseTo(-267_708_942.36900568, PRECISION)
  })

  // Row 25: EBIT
  it('EBIT D25 = 8417391707.376', () => {
    expect(result[25]?.[2022]).toBeCloseTo(8_417_391_707.375662, PRECISION)
  })

  // Row 36: PBT
  it('PBT D36 = 8503261011.731', () => {
    expect(result[36]?.[2022]).toBeCloseTo(8_503_261_011.731084, PRECISION)
  })

  // Row 37: Tax
  it('Tax D37 = -1870717422.581', () => {
    expect(result[37]?.[2022]).toBeCloseTo(-1_870_717_422.5808384, PRECISION)
  })

  // Row 39: Net Profit
  it('Net Profit D39 = 6632543589.150', () => {
    expect(result[39]?.[2022]).toBeCloseTo(6_632_543_589.150246, PRECISION)
  })

  // Year 2 (E column)
  it('Net Profit E39 = 7900486394.848', () => {
    expect(result[39]?.[2023]).toBeCloseTo(7_900_486_394.848385, PRECISION)
  })

  // Year 3 (F column)
  it('Net Profit F39 = 8904862972.537', () => {
    expect(result[39]?.[2024]).toBeCloseTo(8_904_862_972.536745, PRECISION)
  })

  // Interest Income/Expense chain
  it('Interest Income D29 grows from historical', () => {
    expect(result[29]?.[2022]).toBeCloseTo(105_347_465.88305867, PRECISION)
  })

  it('Interest Expense D31 (negative)', () => {
    expect(result[31]?.[2022]).toBeCloseTo(-19_478_161.527636457, PRECISION)
  })
})
