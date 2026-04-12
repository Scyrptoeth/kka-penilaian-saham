import { describe, expect, it } from 'vitest'
import {
  buildLiveCellMap,
  generateLiveColumns,
} from '@/data/live/build-cell-map'
import { numOpt } from '@/data/seed/loader'
import type { YearKeyedSeries } from '@/types/financial'

describe('generateLiveColumns', () => {
  it('maps 4 years starting from column C', () => {
    expect(generateLiveColumns([2020, 2021, 2022, 2023])).toEqual({
      2020: 'C',
      2021: 'D',
      2022: 'E',
      2023: 'F',
    })
  })

  it('maps 3 years starting from column C', () => {
    expect(generateLiveColumns([2021, 2022, 2023])).toEqual({
      2021: 'C',
      2022: 'D',
      2023: 'E',
    })
  })

  it('returns empty object for empty years', () => {
    expect(generateLiveColumns([])).toEqual({})
  })
})

describe('buildLiveCellMap', () => {
  const years = [2020, 2021, 2022, 2023]
  const liveColumns = generateLiveColumns(years)

  it('creates cells at addresses matching `${col}${excelRow}` pattern', () => {
    const liveData: Record<number, YearKeyedSeries> = {
      8: { 2020: 100, 2021: 200, 2022: 300, 2023: 400 },
    }
    const map = buildLiveCellMap(liveColumns, liveData, years)
    expect(numOpt(map, 'C8')).toBe(100)
    expect(numOpt(map, 'D8')).toBe(200)
    expect(numOpt(map, 'E8')).toBe(300)
    expect(numOpt(map, 'F8')).toBe(400)
  })

  it('creates cells for multiple rows', () => {
    const liveData: Record<number, YearKeyedSeries> = {
      8: { 2020: 100, 2021: 200, 2022: 300, 2023: 400 },
      10: { 2020: 50, 2021: 75, 2022: 80, 2023: 90 },
    }
    const map = buildLiveCellMap(liveColumns, liveData, years)
    expect(numOpt(map, 'C8')).toBe(100)
    expect(numOpt(map, 'C10')).toBe(50)
    expect(numOpt(map, 'F10')).toBe(90)
  })

  it('defaults missing years to 0', () => {
    const liveData: Record<number, YearKeyedSeries> = {
      8: { 2023: 400 }, // only 2023 entered
    }
    const map = buildLiveCellMap(liveColumns, liveData, years)
    expect(numOpt(map, 'C8')).toBe(0)
    expect(numOpt(map, 'D8')).toBe(0)
    expect(numOpt(map, 'E8')).toBe(0)
    expect(numOpt(map, 'F8')).toBe(400)
  })

  it('returns empty CellMap for empty liveData', () => {
    const map = buildLiveCellMap(liveColumns, {}, years)
    expect(map.size).toBe(0)
  })

  it('handles negative values (accounting convention)', () => {
    const liveData: Record<number, YearKeyedSeries> = {
      21: { 2023: -1_500_000 },
    }
    const map = buildLiveCellMap(liveColumns, liveData, years)
    expect(numOpt(map, 'F21')).toBe(-1_500_000)
  })

  it('produces a CellMap compatible with numOpt (numeric data_type)', () => {
    const liveData: Record<number, YearKeyedSeries> = {
      8: { 2023: 1_234_567 },
    }
    const map = buildLiveCellMap(liveColumns, liveData, years)
    const cell = map.get('F8')
    expect(cell?.value).toBe(1_234_567)
    expect(cell?.data_type).toBe('n')
  })
})
