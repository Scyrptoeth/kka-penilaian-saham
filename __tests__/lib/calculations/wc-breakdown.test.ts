import { describe, expect, it } from 'vitest'
import { computeWcBreakdown } from '@/lib/calculations/wc-breakdown'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Sum helper — per-column total across included account breakdown entries.
 */
function sumPerYear(
  entries: { series: YearKeyedSeries }[],
  years: readonly number[],
): YearKeyedSeries {
  const out: YearKeyedSeries = {}
  for (const year of years) {
    let total = 0
    for (const entry of entries) total += entry.series[year] ?? 0
    out[year] = total
  }
  return out
}

describe('computeWcBreakdown — Session 053', () => {
  const CFS_YEARS = [2019, 2020, 2021] as const
  const BS_YEARS = [2018, 2019, 2020, 2021] as const

  const accounts: readonly BsAccountEntry[] = [
    { catalogId: 'cashOnHands', excelRow: 8, section: 'current_assets' },
    { catalogId: 'acctReceivables', excelRow: 10, section: 'current_assets' },
    { catalogId: 'inventory', excelRow: 12, section: 'current_assets' },
    { catalogId: 'acctPayables', excelRow: 27, section: 'current_liabilities' },
    { catalogId: 'taxPayable', excelRow: 30, section: 'current_liabilities' },
  ] as const

  const bsRows: Record<number, YearKeyedSeries> = {
    8: { 2018: 100, 2019: 120, 2020: 110, 2021: 150 },    // Cash
    10: { 2018: 500, 2019: 600, 2020: 700, 2021: 800 },   // AR
    12: { 2018: 300, 2019: 350, 2020: 400, 2021: 450 },   // Inventory
    27: { 2018: 200, 2019: 250, 2020: 300, 2021: 400 },   // AP
    30: { 2018: 50, 2019: 80, 2020: 100, 2021: 150 },     // Tax
  }

  it('year 1 CA contribution = absolute level negated (Excel quirk)', () => {
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS])
    const cashEntry = result.caIncluded.find((e) => e.excelRow === 8)!
    // Year 1 (2019): Cash level 120 → contribution = -120
    expect(cashEntry.series[2019]).toBe(-120)
  })

  it('year 2+ CA contribution = -(delta)', () => {
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS])
    const arEntry = result.caIncluded.find((e) => e.excelRow === 10)!
    // 2020: AR 700 - AR 600 = 100; contribution = -100
    expect(arEntry.series[2020]).toBe(-100)
    // 2021: AR 800 - AR 700 = 100; contribution = -100
    expect(arEntry.series[2021]).toBe(-100)
  })

  it('CL contribution = delta (year 1 uses bsYears[0] as prior)', () => {
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS])
    const apEntry = result.clIncluded.find((e) => e.excelRow === 27)!
    // Year 1 (2019): AP 250 - AP 200 (bsYears[0]=2018) = 50
    expect(apEntry.series[2019]).toBe(50)
    // 2020: AP 300 - AP 250 = 50
    expect(apEntry.series[2020]).toBe(50)
  })

  it('excluded CA accounts land in caExcluded (not caIncluded)', () => {
    const excludedCA = [8] // Exclude cash
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS], excludedCA)
    expect(result.caIncluded.find((e) => e.excelRow === 8)).toBeUndefined()
    expect(result.caExcluded.find((e) => e.excelRow === 8)).toBeDefined()
    // Still includes AR + Inventory
    expect(result.caIncluded.length).toBe(2)
  })

  it('sum of CA breakdown across included accounts = FCF row 12 contract', () => {
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS])
    const totals = sumPerYear(result.caIncluded, [...CFS_YEARS])
    // Year 1: -(120 + 600 + 350) = -1070
    expect(totals[2019]).toBe(-1070)
    // Year 2: -((110-120) + (700-600) + (400-350)) = -(-10 + 100 + 50) = -140
    expect(totals[2020]).toBe(-140)
    // Year 3: -((150-110) + (800-700) + (450-400)) = -(40 + 100 + 50) = -190
    expect(totals[2021]).toBe(-190)
  })

  it('sum of CL breakdown across included accounts = FCF row 13 contract', () => {
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS])
    const totals = sumPerYear(result.clIncluded, [...CFS_YEARS])
    // Year 1: (250-200) + (80-50) = 80
    expect(totals[2019]).toBe(80)
    // Year 2: (300-250) + (100-80) = 70
    expect(totals[2020]).toBe(70)
    // Year 3: (400-300) + (150-100) = 150
    expect(totals[2021]).toBe(150)
  })

  it('empty exclusions → caIncluded + clIncluded contain all section accounts', () => {
    const result = computeWcBreakdown(accounts, bsRows, [...CFS_YEARS], [...BS_YEARS])
    expect(result.caIncluded.length).toBe(3)
    expect(result.clIncluded.length).toBe(2)
    expect(result.caExcluded.length).toBe(0)
    expect(result.clExcluded.length).toBe(0)
  })
})
