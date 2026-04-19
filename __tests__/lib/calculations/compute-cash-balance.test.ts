/**
 * Tests for `computeCashBalance` — Session 055 Task 4.
 *
 * Validates scope-aware roll-up of user-selected BS `current_assets` rows
 * into CFS Cash Beginning / Ending, with year-shift accounting identity
 * Ending[Y-1] = Beginning[Y].
 */

import { describe, expect, it } from 'vitest'
import { computeCashBalance } from '@/lib/calculations/compute-cash-balance'
import type { YearKeyedSeries } from '@/types/financial'

describe('computeCashBalance', () => {
  it('returns all zeros when scope accounts list is empty', () => {
    const cfsYears = [2019, 2020, 2021] as const
    const bsYears = [2018, 2019, 2020, 2021] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2018: 100, 2019: 200, 2020: 300, 2021: 400 },
    }

    const result = computeCashBalance({
      scope: { accounts: [] },
      bsRows,
      cfsYears,
      bsYears,
    })

    expect(result.ending).toEqual({ 2019: 0, 2020: 0, 2021: 0 })
    expect(result.beginning).toEqual({ 2019: 0, 2020: 0, 2021: 0 })
  })

  it('single account with 4-year BS / 3-year CFS — ending[Y] = BS[Y], beginning[Y] = BS[Y-1]', () => {
    const cfsYears = [2019, 2020, 2021] as const
    const bsYears = [2018, 2019, 2020, 2021] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2018: 100, 2019: 250, 2020: 400, 2021: 550 },
    }

    const result = computeCashBalance({
      scope: { accounts: [10] },
      bsRows,
      cfsYears,
      bsYears,
    })

    expect(result.ending).toEqual({ 2019: 250, 2020: 400, 2021: 550 })
    // beginning[2019] comes from bsYears prior (2018), not preHistoryBeginning
    expect(result.beginning).toEqual({ 2019: 100, 2020: 250, 2021: 400 })
  })

  it('multiple accounts sum across years', () => {
    const cfsYears = [2019, 2020, 2021] as const
    const bsYears = [2018, 2019, 2020, 2021] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2018: 100, 2019: 200, 2020: 300, 2021: 400 },
      11: { 2018: 50, 2019: 75, 2020: 100, 2021: 125 },
      12: { 2018: 10, 2019: 20, 2020: 30, 2021: 40 },
    }

    const result = computeCashBalance({
      scope: { accounts: [10, 11, 12] },
      bsRows,
      cfsYears,
      bsYears,
    })

    expect(result.ending).toEqual({
      2019: 200 + 75 + 20,
      2020: 300 + 100 + 30,
      2021: 400 + 125 + 40,
    })
    expect(result.beginning).toEqual({
      2019: 100 + 50 + 10,
      2020: 200 + 75 + 20,
      2021: 300 + 100 + 30,
    })
  })

  it('uses preHistoryBeginning when CFS first year has no prior year in BS', () => {
    const cfsYears = [2019, 2020, 2021] as const
    // BS span = CFS span; no year earlier than 2019 available in BS.
    const bsYears = [2019, 2020, 2021] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2019: 250, 2020: 400, 2021: 550 },
    }

    const result = computeCashBalance({
      scope: { accounts: [10], preHistoryBeginning: 999 },
      bsRows,
      cfsYears,
      bsYears,
    })

    expect(result.ending).toEqual({ 2019: 250, 2020: 400, 2021: 550 })
    // beginning[2019] = preHistoryBeginning (no bs prior), then year-shifts.
    expect(result.beginning).toEqual({ 2019: 999, 2020: 250, 2021: 400 })
  })

  it('defaults preHistoryBeginning to 0 when absent + no BS prior year', () => {
    const cfsYears = [2019, 2020] as const
    const bsYears = [2019, 2020] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2019: 250, 2020: 400 },
    }

    const result = computeCashBalance({
      scope: { accounts: [10] },
      bsRows,
      cfsYears,
      bsYears,
    })

    expect(result.ending).toEqual({ 2019: 250, 2020: 400 })
    expect(result.beginning).toEqual({ 2019: 0, 2020: 250 })
  })

  it('treats missing year values as 0', () => {
    const cfsYears = [2019, 2020, 2021] as const
    const bsYears = [2018, 2019, 2020, 2021] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      // row 10 is missing 2020 entirely
      10: { 2018: 100, 2019: 200, 2021: 400 },
      // row 11 is missing from bsRows entirely
    }

    const result = computeCashBalance({
      scope: { accounts: [10, 11] },
      bsRows,
      cfsYears,
      bsYears,
    })

    expect(result.ending).toEqual({
      2019: 200, // row 10 only
      2020: 0, // row 10 missing, row 11 missing
      2021: 400, // row 10 only
    })
    expect(result.beginning).toEqual({
      2019: 100, // bs[2018] row 10
      2020: 200, // bs[2019] row 10
      2021: 0, // bs[2020] row 10 missing
    })
  })

  it('year-shift identity: beginning[Y] === ending[Y-1] for i>0 (2-year span)', () => {
    const cfsYears = [2019, 2020] as const
    const bsYears = [2018, 2019, 2020] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2018: 100, 2019: 250, 2020: 400 },
      11: { 2018: 50, 2019: 75, 2020: 100 },
    }

    const result = computeCashBalance({
      scope: { accounts: [10, 11] },
      bsRows,
      cfsYears,
      bsYears,
    })

    for (let i = 1; i < cfsYears.length; i++) {
      expect(result.beginning[cfsYears[i]]).toBe(result.ending[cfsYears[i - 1]])
    }
  })

  it('year-shift identity: beginning[Y] === ending[Y-1] for i>0 (3-year span)', () => {
    const cfsYears = [2019, 2020, 2021] as const
    const bsYears = [2018, 2019, 2020, 2021] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      10: { 2018: 100, 2019: 250, 2020: 400, 2021: 550 },
      11: { 2018: 50, 2019: 75, 2020: 100, 2021: 125 },
      12: { 2018: 10, 2019: 20, 2020: 30, 2021: 40 },
    }

    const result = computeCashBalance({
      scope: { accounts: [10, 11, 12] },
      bsRows,
      cfsYears,
      bsYears,
    })

    for (let i = 1; i < cfsYears.length; i++) {
      expect(result.beginning[cfsYears[i]]).toBe(result.ending[cfsYears[i - 1]])
    }
  })
})
