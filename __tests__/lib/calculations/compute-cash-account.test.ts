import { describe, it, expect } from 'vitest'
import { computeCashAccount } from '@/lib/calculations/compute-cash-account'
import type { YearKeyedSeries } from '@/types/financial'
import type { CashAccountState } from '@/lib/store/useKkaStore'

const YEARS = [2020, 2021, 2022] as const

function emptyScope(): CashAccountState {
  return { bank: [], cashOnHand: [] }
}

describe('computeCashAccount', () => {
  it('returns zero-for-every-year objects when scope is empty', () => {
    const result = computeCashAccount({
      scope: emptyScope(),
      bsRows: {},
      years: YEARS,
    })

    expect(result.bank).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
    expect(result.cashOnHand).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
  })

  it('sums bank accounts correctly when cashOnHand is empty', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      100: { 2020: 10, 2021: 20, 2022: 30 },
    }
    const scope: CashAccountState = { bank: [100], cashOnHand: [] }

    const result = computeCashAccount({ scope, bsRows, years: YEARS })

    expect(result.bank).toEqual({ 2020: 10, 2021: 20, 2022: 30 })
    expect(result.cashOnHand).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
  })

  it('sums cashOnHand accounts correctly when bank is empty', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      200: { 2020: 5, 2021: 15, 2022: 25 },
    }
    const scope: CashAccountState = { bank: [], cashOnHand: [200] }

    const result = computeCashAccount({ scope, bsRows, years: YEARS })

    expect(result.bank).toEqual({ 2020: 0, 2021: 0, 2022: 0 })
    expect(result.cashOnHand).toEqual({ 2020: 5, 2021: 15, 2022: 25 })
  })

  it('computes both buckets independently when disjoint', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      100: { 2020: 10, 2021: 20, 2022: 30 },
      200: { 2020: 1, 2021: 2, 2022: 3 },
    }
    const scope: CashAccountState = { bank: [100], cashOnHand: [200] }

    const result = computeCashAccount({ scope, bsRows, years: YEARS })

    expect(result.bank).toEqual({ 2020: 10, 2021: 20, 2022: 30 })
    expect(result.cashOnHand).toEqual({ 2020: 1, 2021: 2, 2022: 3 })
  })

  it('sums multiple accounts within the same bucket', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      100: { 2020: 10, 2021: 20, 2022: 30 },
      101: { 2020: 5, 2021: 5, 2022: 5 },
      200: { 2020: 1, 2021: 2, 2022: 3 },
      201: { 2020: 4, 2021: 4, 2022: 4 },
    }
    const scope: CashAccountState = {
      bank: [100, 101],
      cashOnHand: [200, 201],
    }

    const result = computeCashAccount({ scope, bsRows, years: YEARS })

    expect(result.bank).toEqual({ 2020: 15, 2021: 25, 2022: 35 })
    expect(result.cashOnHand).toEqual({ 2020: 5, 2021: 6, 2022: 7 })
  })

  it('defaults missing BS rows to 0 (no NaN)', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      100: { 2020: 10, 2021: 20, 2022: 30 },
      // row 999 referenced below is intentionally absent
    }
    const scope: CashAccountState = { bank: [100, 999], cashOnHand: [] }

    const result = computeCashAccount({ scope, bsRows, years: YEARS })

    expect(result.bank).toEqual({ 2020: 10, 2021: 20, 2022: 30 })
    for (const v of Object.values(result.bank)) {
      expect(Number.isNaN(v)).toBe(false)
    }
  })

  it('defaults years missing from BS row to 0 (no NaN)', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      100: { 2020: 10, 2022: 30 }, // 2021 missing on purpose
    }
    const scope: CashAccountState = { bank: [100], cashOnHand: [] }

    const result = computeCashAccount({ scope, bsRows, years: YEARS })

    expect(result.bank).toEqual({ 2020: 10, 2021: 0, 2022: 30 })
    expect(Number.isNaN(result.bank[2021])).toBe(false)
  })
})
