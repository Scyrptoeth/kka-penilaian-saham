import { describe, expect, it } from 'vitest'
import {
  computeProyFixedAssetsLive,
  type ProyFaInput,
} from '@/data/live/compute-proy-fixed-assets-live'
import { FA_OFFSET, FA_SUBTOTAL, type FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Session 036 — Per-account Net Value growth model.
 *
 * Each FA account's 7 bands (Acq Begin/Add/End, Dep Begin/Add/End, Net
 * Value) project using the per-account avg YoY growth of its NET VALUE
 * band. Subtotals sum across accounts. Page filters display to Net
 * Value only in projection years (bands still computed for cascade).
 */

const PRECISION = 4
const HIST_YEARS = [2019, 2020, 2021] as const
const PROJ_YEARS = [2022, 2023, 2024] as const

describe('computeProyFixedAssetsLive — per-account Net Value growth', () => {
  /** One Land account, simple values for deterministic growth. */
  const oneAccount: readonly FaAccountEntry[] = [
    { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
  ] as const

  it('projects Net Value band via per-account historical avg growth', () => {
    // Land NET VALUE: 100 → 121 → 146.41 → avg growth = 21% (21/100 = 25.41/121 = 0.21)
    const faRows: Record<number, YearKeyedSeries> = {
      // NET VALUE at offset 7000
      [8 + FA_OFFSET.NET_VALUE]: { 2019: 100, 2020: 121, 2021: 146.41 },
      // All other bands (minimal — just last year values to seed)
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 200 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 50 },
      [8 + FA_OFFSET.ACQ_ENDING]: { 2021: 250 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 80 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 23.59 },
      [8 + FA_OFFSET.DEP_ENDING]: { 2021: 103.59 },
    }
    const input: ProyFaInput = {
      accounts: oneAccount,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Net Value projection: 146.41 × 1.21^n
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(177.1561, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2023]).toBeCloseTo(214.358881, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2024]).toBeCloseTo(259.37424601, PRECISION)
  })

  it('projects ALL 7 bands internally using Net Value growth rate (for cascade)', () => {
    // Land NET VALUE growth = 10%. All other bands projected with 10% too.
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.NET_VALUE]: { 2019: 100, 2020: 121, 2021: 146.41 },
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2019: 100, 2020: 110, 2021: 200 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 10, 2020: 90, 2021: 50 },
      [8 + FA_OFFSET.ACQ_ENDING]: { 2019: 110, 2020: 200, 2021: 250 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2019: 10, 2020: 40, 2021: 80 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 30, 2020: 40, 2021: 23.59 },
      [8 + FA_OFFSET.DEP_ENDING]: { 2019: 40, 2020: 80, 2021: 103.59 },
    }
    const input: ProyFaInput = {
      accounts: oneAccount,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // All bands grow at 21% (Land NV avg growth) from last historical year
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBeCloseTo(60.5, PRECISION) // 50 × 1.21
    expect(result[8 + FA_OFFSET.DEP_ADDITIONS]?.[2022]).toBeCloseTo(28.5439, PRECISION) // 23.59 × 1.21
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2022]).toBeCloseTo(302.5, PRECISION) // 250 × 1.21
  })

  it('preserves last historical year values at histYear in output', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.NET_VALUE]: { 2019: 100, 2020: 121, 2021: 146.41 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 0, 2020: 0, 2021: 50 },
    }
    const input: ProyFaInput = {
      accounts: oneAccount,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2021]).toBeCloseTo(146.41, PRECISION)
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2021]).toBe(50)
  })

  it('computes subtotals at SUBTOTAL rows summing across all accounts', () => {
    const twoAccounts: readonly FaAccountEntry[] = [
      { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
      { catalogId: 'building', excelRow: 9, section: 'fixed_asset' },
    ] as const
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.NET_VALUE]: { 2019: 100, 2020: 110, 2021: 121 },
      [9 + FA_OFFSET.NET_VALUE]: { 2019: 200, 2020: 240, 2021: 288 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 5, 2020: 10, 2021: 20 },
      [9 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 10, 2020: 20, 2021: 40 },
    }
    const input: ProyFaInput = {
      accounts: twoAccounts,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])
    // Row 69 (TOTAL_NET_VALUE) at 2021 = 121 + 288 = 409
    expect(result[FA_SUBTOTAL.TOTAL_NET_VALUE]?.[2021]).toBeCloseTo(409, PRECISION)
    // Row 51 (TOTAL_DEP_ADDITIONS) at 2021 = 20 + 40 = 60
    expect(result[FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]?.[2021]).toBeCloseTo(60, PRECISION)
  })

  it('handles extended accounts (excelRow >= 100) uniformly', () => {
    const extAccounts: readonly FaAccountEntry[] = [
      { catalogId: 'lab_equip', excelRow: 100, section: 'fixed_asset' },
    ] as const
    const faRows: Record<number, YearKeyedSeries> = {
      [100 + FA_OFFSET.NET_VALUE]: { 2019: 1000, 2020: 1100, 2021: 1210 },
      [100 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 100, 2020: 110, 2021: 121 },
    }
    const input: ProyFaInput = {
      accounts: extAccounts,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])
    expect(result[100 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(1331, PRECISION)
    expect(result[100 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBeCloseTo(133.1, PRECISION)
  })

  it('handles custom accounts (excelRow >= 1000) uniformly', () => {
    const customAccounts: readonly FaAccountEntry[] = [
      {
        catalogId: 'custom_123',
        excelRow: 1000,
        section: 'fixed_asset',
        customLabel: 'Mesin Pabrik',
      },
    ] as const
    const faRows: Record<number, YearKeyedSeries> = {
      [1000 + FA_OFFSET.NET_VALUE]: { 2019: 500, 2020: 600, 2021: 720 },
    }
    const input: ProyFaInput = {
      accounts: customAccounts,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])
    // Avg growth: (100/500 + 120/600)/2 = (0.2 + 0.2)/2 = 0.2
    expect(result[1000 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(864, PRECISION)
  })

  it('handles zero-growth Net Value (flat projection)', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.NET_VALUE]: { 2019: 100, 2020: 100, 2021: 100 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 50, 2020: 50, 2021: 50 },
    }
    const input: ProyFaInput = {
      accounts: oneAccount,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBe(100)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2024]).toBe(100)
    // All bands flat
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBe(50)
  })

  it('handles missing Net Value historical (all zero) gracefully', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      // No NET_VALUE row — edge case
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 50 },
    }
    const input: ProyFaInput = {
      accounts: oneAccount,
      faRows,
      historicalYears: [...HIST_YEARS],
    }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])
    // Missing Net Value → avg growth = 0 → flat projection
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBe(50)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBe(0)
  })
})
