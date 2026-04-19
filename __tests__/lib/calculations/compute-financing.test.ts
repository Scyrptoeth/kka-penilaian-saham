import { describe, it, expect } from 'vitest'
import {
  computeFinancing,
  type FinancingState,
} from '@/lib/calculations/compute-financing'
import type { YearKeyedSeries } from '@/types/financial'

const CFS_YEARS = [2019, 2020, 2021] as const
const BS_YEARS = [2018, 2019, 2020, 2021] as const

function emptyState(): FinancingState {
  return {
    equityInjection: [],
    newLoan: [],
    interestPayment: [],
    interestIncome: [],
    principalRepayment: [],
  }
}

function zeroCfs(): YearKeyedSeries {
  return { 2019: 0, 2020: 0, 2021: 0 }
}

describe('computeFinancing', () => {
  it('null state → all 5 series zeros per cfsYear', () => {
    const result = computeFinancing({
      financing: null,
      bsRows: {},
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.equityInjection).toEqual(zeroCfs())
    expect(result.newLoan).toEqual(zeroCfs())
    expect(result.interestPayment).toEqual(zeroCfs())
    expect(result.interestIncome).toEqual(zeroCfs())
    expect(result.principalRepayment).toEqual(zeroCfs())
  })

  it('empty confirmed state → all 5 series zeros per cfsYear', () => {
    const result = computeFinancing({
      financing: emptyState(),
      bsRows: {},
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.equityInjection).toEqual(zeroCfs())
    expect(result.newLoan).toEqual(zeroCfs())
    expect(result.interestPayment).toEqual(zeroCfs())
    expect(result.interestIncome).toEqual(zeroCfs())
    expect(result.principalRepayment).toEqual(zeroCfs())
  })

  it('equityInjection year 1 uses bsYears[0] as prior', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      44: { 2018: 100, 2019: 150, 2020: 150, 2021: 150 },
    }
    const scope = emptyState()
    scope.equityInjection = [44]

    const result = computeFinancing({
      financing: scope,
      bsRows,
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    // 2019 delta = BS[44][2019] - BS[44][2018] = 150 - 100 = 50
    expect(result.equityInjection[2019]).toBe(50)
  })

  it('equityInjection year 2+ uses cfsYears[i-1] as prior', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      44: { 2018: 100, 2019: 150, 2020: 180, 2021: 180 },
    }
    const scope = emptyState()
    scope.equityInjection = [44]

    const result = computeFinancing({
      financing: scope,
      bsRows,
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    // 2020 delta = BS[44][2020] - BS[44][2019] = 180 - 150 = 30
    expect(result.equityInjection[2020]).toBe(30)
    // 2021 delta = 180 - 180 = 0
    expect(result.equityInjection[2021]).toBe(0)
  })

  it('equityInjection multi-account delta sums', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      43: { 2018: 10, 2019: 20, 2020: 25, 2021: 30 },
      44: { 2018: 100, 2019: 150, 2020: 180, 2021: 180 },
    }
    const scope = emptyState()
    scope.equityInjection = [43, 44]

    const result = computeFinancing({
      financing: scope,
      bsRows,
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    // 2019: (20+150) - (10+100) = 170 - 110 = 60
    expect(result.equityInjection[2019]).toBe(60)
    // 2020: (25+180) - (20+150) = 205 - 170 = 35
    expect(result.equityInjection[2020]).toBe(35)
    // 2021: (30+180) - (25+180) = 210 - 205 = 5
    expect(result.equityInjection[2021]).toBe(5)
  })

  it('equityInjection missing year value treated as 0', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      // 2018 missing → treated as 0
      44: { 2019: 150, 2020: 180 },
    }
    const scope = emptyState()
    scope.equityInjection = [44]

    const result = computeFinancing({
      financing: scope,
      bsRows,
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    // 2019 delta = 150 - 0 = 150 (prior missing)
    expect(result.equityInjection[2019]).toBe(150)
    // 2020 delta = 180 - 150 = 30
    expect(result.equityInjection[2020]).toBe(30)
    // 2021 delta = 0 - 180 = -180 (current missing)
    expect(result.equityInjection[2021]).toBe(-180)
  })

  it('newLoan single account pass-through sum', () => {
    const apRows: Record<number, YearKeyedSeries> = {
      10: { 2019: 500, 2020: 0, 2021: 250 },
    }
    const scope = emptyState()
    scope.newLoan = [10]

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves: {},
      apRows,
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.newLoan).toEqual({ 2019: 500, 2020: 0, 2021: 250 })
  })

  it('newLoan multi-account sum', () => {
    const apRows: Record<number, YearKeyedSeries> = {
      10: { 2019: 500, 2020: 100, 2021: 250 },
      19: { 2019: 300, 2020: 50, 2021: 0 },
    }
    const scope = emptyState()
    scope.newLoan = [10, 19]

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves: {},
      apRows,
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.newLoan).toEqual({ 2019: 800, 2020: 150, 2021: 250 })
  })

  it('interestPayment passes through IS convention (negative expense)', () => {
    const isLeaves: Record<number, YearKeyedSeries> = {
      520: { 2019: -300, 2020: -250, 2021: -200 },
    }
    const scope = emptyState()
    scope.interestPayment = [520]

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves,
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.interestPayment).toEqual({
      2019: -300,
      2020: -250,
      2021: -200,
    })
  })

  it('interestIncome positive pass-through', () => {
    const isLeaves: Record<number, YearKeyedSeries> = {
      500: { 2019: 100, 2020: 120, 2021: 140 },
    }
    const scope = emptyState()
    scope.interestIncome = [500]

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves,
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.interestIncome).toEqual({ 2019: 100, 2020: 120, 2021: 140 })
  })

  it('principalRepayment from apRows (negative by convention)', () => {
    const apRows: Record<number, YearKeyedSeries> = {
      20: { 2019: -200, 2020: -150, 2021: -100 },
    }
    const scope = emptyState()
    scope.principalRepayment = [20]

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves: {},
      apRows,
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.principalRepayment).toEqual({
      2019: -200,
      2020: -150,
      2021: -100,
    })
  })

  it('all 5 fields populated — complete scenario with known expected values', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      44: { 2018: 1000, 2019: 1200, 2020: 1500, 2021: 1500 },
    }
    const isLeaves: Record<number, YearKeyedSeries> = {
      520: { 2019: -300, 2020: -250, 2021: -200 }, // interest payment
      500: { 2019: 50, 2020: 60, 2021: 70 }, // interest income
    }
    const apRows: Record<number, YearKeyedSeries> = {
      10: { 2019: 800, 2020: 0, 2021: 400 }, // new loan
      19: { 2019: 200, 2020: 0, 2021: 0 }, // new loan
      20: { 2019: -100, 2020: -150, 2021: -200 }, // principal repayment
    }
    const scope: FinancingState = {
      equityInjection: [44],
      newLoan: [10, 19],
      interestPayment: [520],
      interestIncome: [500],
      principalRepayment: [20],
    }

    const result = computeFinancing({
      financing: scope,
      bsRows,
      isLeaves,
      apRows,
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.equityInjection).toEqual({ 2019: 200, 2020: 300, 2021: 0 })
    expect(result.newLoan).toEqual({ 2019: 1000, 2020: 0, 2021: 400 })
    expect(result.interestPayment).toEqual({
      2019: -300,
      2020: -250,
      2021: -200,
    })
    expect(result.interestIncome).toEqual({ 2019: 50, 2020: 60, 2021: 70 })
    expect(result.principalRepayment).toEqual({
      2019: -100,
      2020: -150,
      2021: -200,
    })
  })

  it('PT Raja parity reconstruction — output structure well-formed', () => {
    const isLeaves: Record<number, YearKeyedSeries> = {
      520: { 2019: -450, 2020: -420, 2021: -380 },
      500: { 2019: 10, 2020: 12, 2021: 15 },
    }
    const apRows: Record<number, YearKeyedSeries> = {
      10: { 2019: 1200, 2020: 0, 2021: 600 },
      19: { 2019: 400, 2020: 0, 2021: 0 },
      20: { 2019: -300, 2020: -400, 2021: -500 },
    }
    const scope: FinancingState = {
      equityInjection: [],
      newLoan: [10, 19],
      interestPayment: [520],
      interestIncome: [500],
      principalRepayment: [20],
    }

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves,
      apRows,
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    // Structure check: every key present, every cfsYear populated, no NaN
    for (const series of [
      result.equityInjection,
      result.newLoan,
      result.interestPayment,
      result.interestIncome,
      result.principalRepayment,
    ]) {
      for (const year of CFS_YEARS) {
        expect(series[year]).toBeDefined()
        expect(Number.isNaN(series[year])).toBe(false)
      }
    }

    // empty equityInjection → all zeros
    expect(result.equityInjection).toEqual(zeroCfs())

    // newLoan = [10,19] summed
    expect(result.newLoan).toEqual({ 2019: 1600, 2020: 0, 2021: 600 })

    // interest* pass-through
    expect(result.interestPayment).toEqual({
      2019: -450,
      2020: -420,
      2021: -380,
    })
    expect(result.interestIncome).toEqual({ 2019: 10, 2020: 12, 2021: 15 })

    // principal pass-through
    expect(result.principalRepayment).toEqual({
      2019: -300,
      2020: -400,
      2021: -500,
    })
  })

  it('missing row in bsRows/isLeaves/apRows treated as 0 (no NaN, no throws)', () => {
    const scope: FinancingState = {
      equityInjection: [99], // not in bsRows
      newLoan: [77], // not in apRows
      interestPayment: [88], // not in isLeaves
      interestIncome: [66], // not in isLeaves
      principalRepayment: [55], // not in apRows
    }

    const result = computeFinancing({
      financing: scope,
      bsRows: {},
      isLeaves: {},
      apRows: {},
      cfsYears: CFS_YEARS,
      bsYears: BS_YEARS,
    })

    expect(result.equityInjection).toEqual(zeroCfs())
    expect(result.newLoan).toEqual(zeroCfs())
    expect(result.interestPayment).toEqual(zeroCfs())
    expect(result.interestIncome).toEqual(zeroCfs())
    expect(result.principalRepayment).toEqual(zeroCfs())
  })
})
