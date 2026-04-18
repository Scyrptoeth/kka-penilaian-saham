import { describe, expect, it } from 'vitest'
import { computeProyBsLive, type ProyBsInput } from '@/data/live/compute-proy-bs-live'
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'
import type { ManifestRow } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'
import { computeAvgGrowth } from '@/lib/calculations/helpers'

/**
 * Session 036 — Full Simple Growth model.
 *
 * Every leaf account projects `value[N] = value[N-1] × (1 + avgGrowth)`.
 * Subtotals sum leaves via `computedFrom`. No FA cross-ref, no Proy LR
 * cascade, no Cash-in-Banks=0, no AR adjustments, no IFERROR, no equity
 * carry-forward.
 */

const PRECISION = 6

describe('computeProyBsLive — Full Simple Growth model', () => {
  // ── Shared fixture: 2 asset leaves + 1 liability + 1 equity, with subtotals
  const accounts: readonly BsAccountEntry[] = [
    { catalogId: 'cash_on_hands', excelRow: 8, section: 'current_assets' },
    { catalogId: 'ar', excelRow: 10, section: 'current_assets' },
    { catalogId: 'bank_loan_st', excelRow: 31, section: 'current_liabilities' },
    { catalogId: 'paid_up_capital', excelRow: 43, section: 'equity' },
  ] as const

  const manifestRows: readonly ManifestRow[] = [
    { excelRow: 8, label: 'Cash on Hands', type: 'normal' },
    { excelRow: 10, label: 'Account Receivable', type: 'normal' },
    { excelRow: 21, label: 'Total Current Assets', type: 'subtotal', computedFrom: [8, 10] },
    { excelRow: 31, label: 'Bank Loan-ST', type: 'normal' },
    { excelRow: 45, label: 'Total Current Liabilities', type: 'subtotal', computedFrom: [31] },
    { excelRow: 43, label: 'Paid-Up Capital', type: 'normal' },
    { excelRow: 62, label: 'Total L&E', type: 'total', computedFrom: [45, 43] },
    { excelRow: 33, label: 'TOTAL ASSETS', type: 'total', computedFrom: [21] },
    { excelRow: 63, label: 'Balance Control', type: 'normal', computedFrom: undefined },
  ] as const

  const historicalYears = [2019, 2020, 2021] as const
  const projYears = [2022, 2023, 2024] as const

  it('projects each leaf via value[N] = prev × (1 + avgGrowth)', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 }, // 10% growth
      10: { 2019: 1000, 2020: 1200, 2021: 1440 }, // 20% growth
      31: { 2019: 500, 2020: 450, 2021: 405 }, // -10% growth
      43: { 2019: 2000, 2020: 2000, 2021: 2000 }, // 0% growth
    }
    const input: ProyBsInput = {
      accounts,
      bsRows,
      historicalYears: [...historicalYears],
      manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])

    // Cash on Hands: 121 × 1.1 = 133.1
    expect(result[8]?.[2022]).toBeCloseTo(133.1, PRECISION)
    expect(result[8]?.[2023]).toBeCloseTo(146.41, PRECISION)
    expect(result[8]?.[2024]).toBeCloseTo(161.051, PRECISION)
    // AR: 1440 × 1.2 = 1728
    expect(result[10]?.[2022]).toBeCloseTo(1728, PRECISION)
    // Bank Loan-ST: 405 × 0.9 = 364.5
    expect(result[31]?.[2022]).toBeCloseTo(364.5, PRECISION)
    // Paid-Up Capital: 2000 × 1 = 2000 (flat)
    expect(result[43]?.[2022]).toBe(2000)
    expect(result[43]?.[2024]).toBe(2000)
  })

  it('preserves last historical year value at histYear in output', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 },
      10: { 2019: 1000, 2020: 1200, 2021: 1440 },
      31: { 2019: 500, 2020: 450, 2021: 405 },
      43: { 2019: 2000, 2020: 2000, 2021: 2000 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])
    expect(result[8]?.[2021]).toBe(121)
    expect(result[10]?.[2021]).toBe(1440)
    expect(result[31]?.[2021]).toBe(405)
    expect(result[43]?.[2021]).toBe(2000)
  })

  it('computes subtotals via computedFrom at every year (hist + proj)', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 },
      10: { 2019: 1000, 2020: 1200, 2021: 1440 },
      31: { 2019: 500, 2020: 450, 2021: 405 },
      43: { 2019: 2000, 2020: 2000, 2021: 2000 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])
    // Total CA = 8 + 10. At 2022: 133.1 + 1728 = 1861.1
    expect(result[21]?.[2022]).toBeCloseTo(1861.1, PRECISION)
    // TOTAL ASSETS = Total CA (no other assets). At 2022: 1861.1
    expect(result[33]?.[2022]).toBeCloseTo(1861.1, PRECISION)
    // Total CL = Bank Loan-ST. At 2022: 364.5
    expect(result[45]?.[2022]).toBeCloseTo(364.5, PRECISION)
    // Total L&E = 45 + 43 = 364.5 + 2000
    expect(result[62]?.[2022]).toBeCloseTo(2364.5, PRECISION)
  })

  it('projects extended catalog accounts (excelRow >= 100) uniformly', () => {
    const extendedAccounts: readonly BsAccountEntry[] = [
      ...accounts,
      { catalogId: 'setara_kas', excelRow: 100, section: 'current_assets' },
    ] as const
    const extendedManifest: readonly ManifestRow[] = [
      { excelRow: 8, label: 'Cash on Hands', type: 'normal' },
      { excelRow: 10, label: 'AR', type: 'normal' },
      { excelRow: 100, label: 'Setara Kas', type: 'normal' },
      { excelRow: 21, label: 'Total CA', type: 'subtotal', computedFrom: [8, 10, 100] },
      { excelRow: 31, label: 'Bank Loan-ST', type: 'normal' },
      { excelRow: 45, label: 'Total CL', type: 'subtotal', computedFrom: [31] },
      { excelRow: 43, label: 'Equity', type: 'normal' },
      { excelRow: 62, label: 'Total L&E', type: 'total', computedFrom: [45, 43] },
      { excelRow: 33, label: 'TOTAL ASSETS', type: 'total', computedFrom: [21] },
    ] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 },
      10: { 2019: 1000, 2020: 1200, 2021: 1440 },
      31: { 2019: 500, 2020: 450, 2021: 405 },
      43: { 2019: 2000, 2020: 2000, 2021: 2000 },
      100: { 2019: 50, 2020: 75, 2021: 100 }, // ~41% avg growth
    }
    const input: ProyBsInput = {
      accounts: extendedAccounts,
      bsRows,
      historicalYears: [...historicalYears],
      manifestRows: extendedManifest,
    }
    const result = computeProyBsLive(input, [...projYears])
    const expectedGrowth = computeAvgGrowth(bsRows[100]!)
    expect(result[100]?.[2022]).toBeCloseTo(100 * (1 + expectedGrowth), PRECISION)
    // Subtotal includes extended account
    const expected2022 = result[8]![2022]! + result[10]![2022]! + result[100]![2022]!
    expect(result[21]?.[2022]).toBeCloseTo(expected2022, PRECISION)
  })

  it('projects custom accounts (excelRow >= 1000) uniformly', () => {
    const customAccount: BsAccountEntry = {
      catalogId: 'custom_123',
      excelRow: 1000,
      section: 'current_assets',
      customLabel: 'Piutang Koperasi',
    }
    const customManifest: readonly ManifestRow[] = [
      { excelRow: 1000, label: 'Piutang Koperasi', type: 'normal' },
      { excelRow: 21, label: 'Total CA', type: 'subtotal', computedFrom: [1000] },
      { excelRow: 33, label: 'TOTAL ASSETS', type: 'total', computedFrom: [21] },
    ] as const
    const bsRows: Record<number, YearKeyedSeries> = {
      1000: { 2019: 500, 2020: 600, 2021: 720 }, // 20% growth
    }
    const input: ProyBsInput = {
      accounts: [customAccount],
      bsRows,
      historicalYears: [...historicalYears],
      manifestRows: customManifest,
    }
    const result = computeProyBsLive(input, [...projYears])
    expect(result[1000]?.[2022]).toBeCloseTo(864, PRECISION)
    expect(result[1000]?.[2024]).toBeCloseTo(1244.16, PRECISION)
  })

  it('handles zero-growth account (flat projection)', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 100, 2021: 100 },
      10: { 2019: 0, 2020: 0, 2021: 0 },
      31: { 2019: 0, 2020: 0, 2021: 0 },
      43: { 2019: 0, 2020: 0, 2021: 0 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])
    expect(result[8]?.[2022]).toBe(100)
    expect(result[8]?.[2023]).toBe(100)
    expect(result[8]?.[2024]).toBe(100)
  })

  it('handles missing historical data (empty series) gracefully', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      // No data for row 8 — simulate edge case
      10: { 2019: 100, 2020: 110, 2021: 121 },
      31: { 2019: 100, 2020: 100, 2021: 100 },
      43: { 2019: 100, 2020: 100, 2021: 100 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])
    // Missing rows emit zero series at each year
    expect(result[8]?.[2022]).toBe(0)
    expect(result[8]?.[2023]).toBe(0)
  })

  it('emits output keyed by excelRow, with all account leaves present', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 },
      10: { 2019: 200, 2020: 210, 2021: 220 },
      31: { 2019: 50, 2020: 50, 2021: 50 },
      43: { 2019: 0, 2020: 0, 2021: 0 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])
    // All declared leaves have entries
    for (const acct of accounts) expect(result[acct.excelRow]).toBeDefined()
    // Subtotal 21 + total 33 present
    expect(result[21]).toBeDefined()
    expect(result[33]).toBeDefined()
  })

  it('computes balance control diagnostic as TOTAL ASSETS - TOTAL L&E', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 },
      10: { 2019: 1000, 2020: 1200, 2021: 1440 },
      31: { 2019: 500, 2020: 450, 2021: 405 },
      43: { 2019: 2000, 2020: 2000, 2021: 2000 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [...projYears])
    // BC = 33 - 62. At 2022: 1861.1 - 2364.5 = -503.4 (won't reconcile — expected)
    expect(result[63]?.[2022]).toBeCloseTo(-503.4, PRECISION)
  })

  it('supports 1-year projection only', () => {
    const bsRows: Record<number, YearKeyedSeries> = {
      8: { 2019: 100, 2020: 110, 2021: 121 },
      10: { 2019: 1000, 2020: 1200, 2021: 1440 },
      31: { 2019: 500, 2020: 450, 2021: 405 },
      43: { 2019: 2000, 2020: 2000, 2021: 2000 },
    }
    const input: ProyBsInput = {
      accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
    }
    const result = computeProyBsLive(input, [2022])
    expect(result[8]?.[2022]).toBeCloseTo(133.1, PRECISION)
    expect(result[8]?.[2023]).toBeUndefined()
  })

  // ─── Session 051: strict growth on sparse-historical leaves ───
  describe('Session 051 strict-average growth for sparse-historical leaves', () => {
    it('sparse asset leaf (single trailing value) projects flat (× 1.0)', () => {
      // Setara Kas with ONLY 2021 = 635M — strictAvgGrowth returns null
      const sparseAccounts: readonly BsAccountEntry[] = [
        { catalogId: 'setara_kas', excelRow: 100, section: 'current_assets' },
      ] as const
      const sparseManifest: readonly ManifestRow[] = [
        { excelRow: 100, label: 'Setara Kas', type: 'normal' },
      ] as const
      const bsRows: Record<number, YearKeyedSeries> = {
        100: { 2021: 635_077_549 },
      }
      const input: ProyBsInput = {
        accounts: sparseAccounts,
        bsRows,
        historicalYears: [...historicalYears],
        manifestRows: sparseManifest,
      }
      const result = computeProyBsLive(input, [...projYears])
      // Flat — no extrapolation from single observation
      expect(result[100]?.[2022]).toBe(635_077_549)
      expect(result[100]?.[2023]).toBe(635_077_549)
      expect(result[100]?.[2024]).toBe(635_077_549)
    })

    it('sparse liability leaf (2 trailing values → 1 real YoY obs) projects flat', () => {
      // Hutang PPh Pasal 21/2021 with 2020=48115 + 2021=81022 — 1 real YoY, null under strict
      const sparseAccounts: readonly BsAccountEntry[] = [
        { catalogId: 'hutang_pph_21', excelRow: 200, section: 'current_liabilities' },
      ] as const
      const sparseManifest: readonly ManifestRow[] = [
        { excelRow: 200, label: 'Hutang PPh Pasal 21/2021', type: 'normal' },
      ] as const
      const bsRows: Record<number, YearKeyedSeries> = {
        200: { 2020: 48_115, 2021: 81_022 },
      }
      const input: ProyBsInput = {
        accounts: sparseAccounts,
        bsRows,
        historicalYears: [...historicalYears],
        manifestRows: sparseManifest,
      }
      const result = computeProyBsLive(input, [...projYears])
      // 1 real YoY < 2 required → null → flat at 81022
      expect(result[200]?.[2022]).toBe(81_022)
      expect(result[200]?.[2023]).toBe(81_022)
    })

    it('strict-average matches mean of real YoY observations', () => {
      // 2019: 100, 2020: 200, 2021: 300 → 2 real obs (1.0, 0.5) → avg = 0.75
      const richAccounts: readonly BsAccountEntry[] = [
        { catalogId: 'rich', excelRow: 9, section: 'current_assets' },
      ] as const
      const richManifest: readonly ManifestRow[] = [
        { excelRow: 9, label: 'Rich', type: 'normal' },
      ] as const
      const bsRows: Record<number, YearKeyedSeries> = {
        9: { 2019: 100, 2020: 200, 2021: 300 },
      }
      const input: ProyBsInput = {
        accounts: richAccounts,
        bsRows,
        historicalYears: [...historicalYears],
        manifestRows: richManifest,
      }
      const result = computeProyBsLive(input, [2022])
      expect(result[9]?.[2022]).toBeCloseTo(300 * 1.75, PRECISION)
    })
  })

  // ─── Session 051: equity section flat-default + per-cell overrides ───
  describe('Session 051 equity section flat-default + per-cell overrides', () => {
    it('equity leaf without override uses historical last-year value at every projection year', () => {
      const bsRows: Record<number, YearKeyedSeries> = {
        8: { 2019: 100, 2020: 110, 2021: 121 },
        10: { 2019: 1000, 2020: 1200, 2021: 1440 },
        31: { 2019: 500, 2020: 450, 2021: 405 },
        43: { 2019: 3_000, 2020: 4_000, 2021: 5_280_000_000 }, // varying → would have growth under old model
      }
      const input: ProyBsInput = {
        accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
      }
      const result = computeProyBsLive(input, [...projYears])
      // Flat at 2021 value — no growth multiplier
      expect(result[43]?.[2022]).toBe(5_280_000_000)
      expect(result[43]?.[2023]).toBe(5_280_000_000)
      expect(result[43]?.[2024]).toBe(5_280_000_000)
    })

    it('equity override at a specific year wins over historical default', () => {
      const bsRows: Record<number, YearKeyedSeries> = {
        8: { 2019: 100, 2020: 110, 2021: 121 },
        10: { 2019: 1000, 2020: 1200, 2021: 1440 },
        31: { 2019: 500, 2020: 450, 2021: 405 },
        43: { 2019: 2000, 2020: 2000, 2021: 2000 },
      }
      const equityOverrides: Record<number, YearKeyedSeries> = {
        43: { 2023: 9_999 }, // only 2023 overridden; 2022/2024 should stay at default
      }
      const input: ProyBsInput = {
        accounts,
        bsRows,
        historicalYears: [...historicalYears],
        manifestRows: [...manifestRows],
        equityOverrides,
      }
      const result = computeProyBsLive(input, [...projYears])
      // Per-cell INDEPENDENT: edit 2023 does NOT touch 2022 or 2024
      expect(result[43]?.[2022]).toBe(2_000) // default (historical 2021)
      expect(result[43]?.[2023]).toBe(9_999) // override
      expect(result[43]?.[2024]).toBe(2_000) // default (historical 2021, not override cascade)
    })

    it('equity override for excelRow without historical data uses override at that cell, default 0 elsewhere', () => {
      // New equity account (no historical). Only 2022 overridden.
      const extAccounts: readonly BsAccountEntry[] = [
        { catalogId: 'new_equity', excelRow: 300, section: 'equity' },
      ] as const
      const extManifest: readonly ManifestRow[] = [
        { excelRow: 300, label: 'Treasury Stock', type: 'normal' },
      ] as const
      const bsRows: Record<number, YearKeyedSeries> = {}
      const equityOverrides: Record<number, YearKeyedSeries> = {
        300: { 2022: 1_234 },
      }
      const input: ProyBsInput = {
        accounts: extAccounts,
        bsRows,
        historicalYears: [...historicalYears],
        manifestRows: extManifest,
        equityOverrides,
      }
      const result = computeProyBsLive(input, [...projYears])
      expect(result[300]?.[2022]).toBe(1_234)
      expect(result[300]?.[2023]).toBe(0) // default fallback (no historical)
      expect(result[300]?.[2024]).toBe(0)
    })

    it('backward-compat: omitting equityOverrides behaves same as empty map', () => {
      const bsRows: Record<number, YearKeyedSeries> = {
        8: { 2019: 100, 2020: 110, 2021: 121 },
        10: { 2019: 1000, 2020: 1200, 2021: 1440 },
        31: { 2019: 500, 2020: 450, 2021: 405 },
        43: { 2019: 2000, 2020: 2000, 2021: 2000 },
      }
      const input: ProyBsInput = {
        accounts, bsRows, historicalYears: [...historicalYears], manifestRows: [...manifestRows],
      }
      const result = computeProyBsLive(input, [...projYears])
      expect(result[43]?.[2022]).toBe(2000)
      expect(result[43]?.[2024]).toBe(2000)
    })
  })
})
