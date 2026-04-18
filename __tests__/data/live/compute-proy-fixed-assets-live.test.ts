import { describe, expect, it } from 'vitest'
import {
  computeProyFixedAssetsLive,
  computeFaAdditionsGrowths,
  type ProyFaInput,
} from '@/data/live/compute-proy-fixed-assets-live'
import { FA_OFFSET, FA_SUBTOTAL, type FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Session 045 — Roll-forward projection model.
 *
 *   Acq Add[Y+1] = Acq Add[Y] × (1 + acqAddGrowth)
 *   Acq Beg[Y+1] = Acq End[Y]       (identity)
 *   Acq End[Y]   = Acq Beg[Y] + Acq Add[Y]
 *   Dep mirrors Acq with its own depAddGrowth.
 *   Net Value[Y] = Acq End[Y] - Dep End[Y]
 */

const PRECISION = 4
const HIST_YEARS = [2019, 2020, 2021] as const
const PROJ_YEARS = [2022, 2023, 2024] as const

const land: readonly FaAccountEntry[] = [
  { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
] as const

describe('computeProyFixedAssetsLive — roll-forward model (Session 045)', () => {
  it('rolls Acq Beginning[Y+1] forward from Acq Ending[Y]', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2019: 100, 2020: 110, 2021: 121 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 10, 2020: 11, 2021: 12.1 },
      [8 + FA_OFFSET.ACQ_ENDING]:    { 2019: 110, 2020: 121, 2021: 133.1 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2019: 0, 2020: 0, 2021: 0 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 0, 2020: 0, 2021: 0 },
      [8 + FA_OFFSET.DEP_ENDING]:    { 2019: 0, 2020: 0, 2021: 0 },
      [8 + FA_OFFSET.NET_VALUE]:     { 2019: 110, 2020: 121, 2021: 133.1 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [...HIST_YEARS] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Acq Additions YoY: (11-10)/10 = 0.10; (12.1-11)/11 = 0.10 → avg = 0.10
    // Acq Add 2022 = 12.1 × 1.10 = 13.31
    // Acq Beg 2022 = Acq End 2021 = 133.1
    // Acq End 2022 = 133.1 + 13.31 = 146.41
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBeCloseTo(13.31, PRECISION)
    expect(result[8 + FA_OFFSET.ACQ_BEGINNING]?.[2022]).toBeCloseTo(133.1, PRECISION)
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2022]).toBeCloseTo(146.41, PRECISION)

    // Acq Beg 2023 = Acq End 2022 = 146.41
    // Acq Add 2023 = 13.31 × 1.10 = 14.641
    // Acq End 2023 = 146.41 + 14.641 = 161.051
    expect(result[8 + FA_OFFSET.ACQ_BEGINNING]?.[2023]).toBeCloseTo(146.41, PRECISION)
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2023]).toBeCloseTo(14.641, PRECISION)
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2023]).toBeCloseTo(161.051, PRECISION)
  })

  it('rolls Depreciation bands with their own Additions growth', () => {
    // Acq set high enough that Net stays positive across projection
    // (keeps Session 046 stopping rule dormant so Dep growth math isolated).
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2019: 1000, 2020: 1000, 2021: 1000 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 0, 2020: 0, 2021: 0 },
      [8 + FA_OFFSET.ACQ_ENDING]:    { 2019: 1000, 2020: 1000, 2021: 1000 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2019: 10, 2020: 15, 2021: 22 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 5, 2020: 7, 2021: 8 },
      [8 + FA_OFFSET.DEP_ENDING]:    { 2019: 15, 2020: 22, 2021: 30 },
      [8 + FA_OFFSET.NET_VALUE]:     { 2019: 985, 2020: 978, 2021: 970 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [...HIST_YEARS] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Dep Add growth = avg(2/5, 1/7) = avg(0.4, 0.142857) ≈ 0.271429
    // Dep Add 2022 = 8 × 1.271429 ≈ 10.1714
    // Dep Beg 2022 = Dep End 2021 = 30
    // Dep End 2022 = 30 + 10.1714 ≈ 40.1714
    expect(result[8 + FA_OFFSET.DEP_ADDITIONS]?.[2022]).toBeCloseTo(10.1714, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_BEGINNING]?.[2022]).toBeCloseTo(30, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2022]).toBeCloseTo(40.1714, PRECISION)
  })

  it('computes Net Value = Acq Ending - Dep Ending in projection years', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2019: 100, 2020: 100, 2021: 100 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 0, 2020: 0, 2021: 0 },
      [8 + FA_OFFSET.ACQ_ENDING]:    { 2019: 100, 2020: 100, 2021: 100 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2019: 0, 2020: 10, 2021: 20 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 10, 2020: 10, 2021: 10 },
      [8 + FA_OFFSET.DEP_ENDING]:    { 2019: 10, 2020: 20, 2021: 30 },
      [8 + FA_OFFSET.NET_VALUE]:     { 2019: 90, 2020: 80, 2021: 70 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [...HIST_YEARS] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // With zero Acq Additions growth (prev zero skipped), Acq flat at 100.
    // Dep Add growth avg = 0 (two zero-diff growths). Dep Add carries at 10.
    // Dep End 2022 = 30 + 10 = 40; Net 2022 = 100 - 40 = 60
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2022]).toBeCloseTo(100, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2022]).toBeCloseTo(40, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(60, PRECISION)
  })

  it('carries forward Additions when only 1 historical year (growth defaults to 0)', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 1000 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 100 },
      [8 + FA_OFFSET.ACQ_ENDING]:    { 2021: 1100 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 0 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 50 },
      [8 + FA_OFFSET.DEP_ENDING]:    { 2021: 50 },
      [8 + FA_OFFSET.NET_VALUE]:     { 2021: 1050 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Growth = 0 (< 2 years) → Additions carry forward
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBe(100)
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2023]).toBe(100)
    expect(result[8 + FA_OFFSET.DEP_ADDITIONS]?.[2022]).toBe(50)

    // Roll-forward identity still applies
    expect(result[8 + FA_OFFSET.ACQ_BEGINNING]?.[2022]).toBe(1100)
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2022]).toBe(1200)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2022]).toBe(100)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBe(1100)
  })

  it('preserves last historical year values unchanged in output', () => {
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2019: 50, 2020: 80, 2021: 120 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 30, 2020: 40, 2021: 50 },
      [8 + FA_OFFSET.ACQ_ENDING]:    { 2019: 80, 2020: 120, 2021: 170 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 0 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 0 },
      [8 + FA_OFFSET.DEP_ENDING]:    { 2021: 0 },
      [8 + FA_OFFSET.NET_VALUE]:     { 2021: 170 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [...HIST_YEARS] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    expect(result[8 + FA_OFFSET.ACQ_BEGINNING]?.[2021]).toBe(120)
    expect(result[8 + FA_OFFSET.ACQ_ADDITIONS]?.[2021]).toBe(50)
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2021]).toBe(170)
  })

  it('computes per-band subtotals summing across accounts', () => {
    const twoAccounts: readonly FaAccountEntry[] = [
      { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
      { catalogId: 'building', excelRow: 9, section: 'fixed_asset' },
    ] as const
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 20 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 5 },
      [9 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 30 },
      [9 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 10 },
    }
    const input: ProyFaInput = { accounts: twoAccounts, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Subtotals should sum both accounts (each carries forward Additions)
    expect(result[FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS]?.[2022]).toBeCloseTo(50, PRECISION)
    expect(result[FA_SUBTOTAL.TOTAL_DEP_ADDITIONS]?.[2022]).toBeCloseTo(15, PRECISION)
  })

  it('derives historical Ending from Beg+Add when ENDING rows missing from faRows (Session 046 Bug B)', () => {
    // Simulates real-world localStorage state: DynamicFaEditor (pre-Session 046)
    // only persists Beg + Add rows, NOT ACQ_ENDING / DEP_ENDING / NET_VALUE.
    // Compute must self-heal by deriving End[histYear] = Beg[histYear] + Add[histYear].
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 1000 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 200 },
      // ACQ_ENDING deliberately omitted — represents buggy persist state
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 300 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 100 },
      // DEP_ENDING deliberately omitted
      // NET_VALUE deliberately omitted
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Derived End[2021]: Acq 1000+200=1200, Dep 300+100=400
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2021]).toBeCloseTo(1200, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2021]).toBeCloseTo(400, PRECISION)

    // Roll-forward: Beg[2022] MUST equal derived End[2021], not 0
    expect(result[8 + FA_OFFSET.ACQ_BEGINNING]?.[2022]).toBeCloseTo(1200, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_BEGINNING]?.[2022]).toBeCloseTo(400, PRECISION)

    // End[2022]: 1-hist-year growth=0 → Add carries. Acq 1200+200=1400, Dep 400+100=500.
    expect(result[8 + FA_OFFSET.ACQ_ENDING]?.[2022]).toBeCloseTo(1400, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2022]).toBeCloseTo(500, PRECISION)

    // Net Value[2021] derived = 1200 - 400 = 800; Net[2022] = 1400 - 500 = 900
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2021]).toBeCloseTo(800, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(900, PRECISION)
  })

  it('stops depreciation additions once Net Value reaches 0 or below (Session 046 new rule)', () => {
    // Scenario: Dep growth > Acq growth → Net will hit 0 in a projection year.
    // Once Net[Y-1] ≤ 0, Dep Add[Y] must be 0 (asset fully depreciated / disposed).
    // Acq bands continue normally — user said only depreciation stops.
    const faRows: Record<number, YearKeyedSeries> = {
      // Acq: flat 100 (no additions ever)
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 100 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 0 },
      // Dep: starts at 80, adds 20/year (zero growth)
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 60 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 20 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Year 2021 (hist): Acq End = 100+0 = 100; Dep End = 60+20 = 80; Net = 20
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2021]).toBeCloseTo(20, PRECISION)

    // Year 2022: Dep End = 80+20 = 100; Acq End = 100+0 = 100; Net = 0
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2022]).toBeCloseTo(100, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(0, PRECISION)

    // Year 2023: Net[2022]=0 triggers stop → Dep Add[2023]=0
    // Dep End[2023] = Dep Beg[2023] + 0 = 100 (frozen)
    // Acq End[2023] = 100+0 = 100 (continues normally but no Acq growth here)
    // Net[2023] = 100 - 100 = 0
    expect(result[8 + FA_OFFSET.DEP_ADDITIONS]?.[2023]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2023]).toBeCloseTo(100, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2023]).toBeCloseTo(0, PRECISION)

    // Year 2024: same frozen state
    expect(result[8 + FA_OFFSET.DEP_ADDITIONS]?.[2024]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ENDING]?.[2024]).toBeCloseTo(100, PRECISION)
  })

  it('clamps projected Net Value to 0 when raw computation goes negative and stays 0 (Session 047)', () => {
    // Acq flat (Beg 100, Add 0) — Acq End stays at 100 across projection.
    // Dep Beg 60, Dep Add 20 historically → Dep grows 20/yr (0 growth from 1-hist-year).
    // Year 2021: Acq End 100, Dep End 80, Net 20 (positive, no clamp)
    // Year 2022: Acq End 100, Dep End 100, raw Net 0 → thisNet 0
    // Year 2023: prev=0 → assetDone, Dep Add=0. thisNet forced 0 via sticky.
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 100 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 0 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 60 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 20 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2021]).toBeCloseTo(20, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2023]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2024]).toBeCloseTo(0, PRECISION)
  })

  it('sticks Net at 0 even when Acq continues to grow after disposal (Session 047)', () => {
    // Acq grows, Dep grows faster. Raw Net goes negative year 2022 → clamp to 0.
    // Year 2023+: Dep Add=0 (halted), Acq Add continues. Raw math could swing positive again.
    // Sticky rule: once 0, stays 0 forever.
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2019: 100, 2020: 110, 2021: 120 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 10, 2020: 10, 2021: 10 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2019: 50, 2020: 75, 2021: 105 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 25, 2020: 30, 2021: 36 },
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [...HIST_YEARS] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Year 2022: raw Net negative → clamp to 0
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(0, PRECISION)
    // Year 2023: Dep Add=0 (halted). Acq Add continues → raw could be negative or positive;
    // sticky forces Net=0 regardless.
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2023]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.DEP_ADDITIONS]?.[2023]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2024]).toBeCloseTo(0, PRECISION)
  })

  it('preserves negative historical Net Value — Opsi A does not clamp historical (Session 047)', () => {
    // Edge case: user-entered data with Dep > Acq in historical → Net negative.
    // Rule: historical preserved as-is (ground truth), only projection years clamp.
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 100 },
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 0 },
      [8 + FA_OFFSET.DEP_BEGINNING]: { 2021: 90 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 50 },
      // Historical: Acq End 100, Dep End 140 → Net = -40 (preserve)
    }
    const input: ProyFaInput = { accounts: land, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    // Historical preserved, even if negative
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2021]).toBeCloseTo(-40, PRECISION)
    // Projection: prev=-40 → assetDone → Net forced 0
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2022]).toBeCloseTo(0, PRECISION)
    expect(result[8 + FA_OFFSET.NET_VALUE]?.[2023]).toBeCloseTo(0, PRECISION)
  })

  it('handles extended accounts (excelRow >= 100) via same roll-forward', () => {
    const ext: readonly FaAccountEntry[] = [
      { catalogId: 'lab_equip', excelRow: 100, section: 'fixed_asset' },
    ] as const
    const faRows: Record<number, YearKeyedSeries> = {
      [100 + FA_OFFSET.ACQ_BEGINNING]: { 2021: 500 },
      [100 + FA_OFFSET.ACQ_ADDITIONS]: { 2021: 50 },
      [100 + FA_OFFSET.ACQ_ENDING]:    { 2021: 550 },
      [100 + FA_OFFSET.DEP_BEGINNING]: { 2021: 0 },
      [100 + FA_OFFSET.DEP_ADDITIONS]: { 2021: 0 },
      [100 + FA_OFFSET.DEP_ENDING]:    { 2021: 0 },
      [100 + FA_OFFSET.NET_VALUE]:     { 2021: 550 },
    }
    const input: ProyFaInput = { accounts: ext, faRows, historicalYears: [2021] }
    const result = computeProyFixedAssetsLive(input, [...PROJ_YEARS])

    expect(result[100 + FA_OFFSET.ACQ_ADDITIONS]?.[2022]).toBe(50)
    expect(result[100 + FA_OFFSET.ACQ_BEGINNING]?.[2022]).toBe(550)
    expect(result[100 + FA_OFFSET.ACQ_ENDING]?.[2022]).toBe(600)
  })
})

describe('computeFaAdditionsGrowths', () => {
  it('returns avg YoY growth of Acq + Dep Additions per account', () => {
    const accounts: readonly FaAccountEntry[] = [
      { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
    ] as const
    const faRows: Record<number, YearKeyedSeries> = {
      [8 + FA_OFFSET.ACQ_ADDITIONS]: { 2019: 100, 2020: 110, 2021: 132 },
      [8 + FA_OFFSET.DEP_ADDITIONS]: { 2019: 10, 2020: 12, 2021: 14.4 },
    }
    const result = computeFaAdditionsGrowths(accounts, faRows)

    // Acq Add: avg(10/100, 22/110) = avg(0.10, 0.20) = 0.15
    expect(result.acqAdd[8]).toBeCloseTo(0.15, PRECISION)
    // Dep Add: avg(2/10, 2.4/12) = avg(0.20, 0.20) = 0.20
    expect(result.depAdd[8]).toBeCloseTo(0.20, PRECISION)
  })

  it('returns 0 for accounts with no historical series', () => {
    const accounts: readonly FaAccountEntry[] = [
      { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
    ] as const
    const result = computeFaAdditionsGrowths(accounts, {})
    expect(result.acqAdd[8]).toBe(0)
    expect(result.depAdd[8]).toBe(0)
  })
})
