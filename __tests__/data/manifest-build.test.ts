import { describe, expect, it } from 'vitest'
import { buildRowsFromManifest } from '@/data/manifests/build'
import type { SheetManifest } from '@/data/manifests/types'
import type { CellMap, FixtureCell } from '@/data/seed/loader'

function makeCells(entries: Array<Partial<FixtureCell> & { addr: string }>): CellMap {
  const map = new Map<string, FixtureCell>()
  for (const e of entries) {
    map.set(e.addr, {
      addr: e.addr,
      row: e.row ?? 0,
      col: e.col ?? 0,
      value: e.value ?? null,
      formula: e.formula,
      number_format: e.number_format,
      data_type: e.data_type ?? 'n',
    })
  }
  return map
}

const MANIFEST: SheetManifest = {
  title: 'Test Sheet',
  slug: 'balance-sheet',
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  commonSizeColumns: { 2020: 'G', 2021: 'H' },
  growthColumns: { 2020: 'J', 2021: 'K' },
  rows: [
    { label: 'ASSETS', type: 'header' },
    {
      excelRow: 8,
      label: 'Cash',
      indent: 1,
      formula: {
        commonSize: 'Cash / Total Assets',
        growth: 'YoY: (current - prior) / prior',
      },
    },
    {
      excelRow: 10,
      label: 'TOTAL',
      type: 'total',
      formula: { values: 'Sum of current assets' },
    },
  ],
}

describe('buildRowsFromManifest', () => {
  it('builds value series from cell map using year → column map', () => {
    const cells = makeCells([
      { addr: 'C8', value: 100 },
      { addr: 'D8', value: 200 },
      { addr: 'E8', value: 300 },
      { addr: 'C10', value: 500 },
      { addr: 'D10', value: 600, formula: '=SUM(C10:C9)' },
      { addr: 'E10', value: 700 },
    ])
    const rows = buildRowsFromManifest(MANIFEST, cells)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      label: 'ASSETS',
      values: {},
      indent: undefined,
      type: 'header',
    })
    expect(rows[1].values).toEqual({ 2019: 100, 2020: 200, 2021: 300 })
    expect(rows[1].type).toBe('normal')
    expect(rows[1].indent).toBe(1)
    expect(rows[2].values).toEqual({ 2019: 500, 2020: 600, 2021: 700 })
    expect(rows[2].type).toBe('total')
  })

  it('auto-pulls raw Excel formulas from fixture cells when present', () => {
    const cells = makeCells([
      { addr: 'C8', value: 100 },
      { addr: 'D8', value: 200 },
      { addr: 'E8', value: 300 },
      { addr: 'G8', value: 0.2, formula: '=D8/D$15' },
      { addr: 'H8', value: 0.3, formula: '=E8/E$15' },
      { addr: 'J8', value: 0.1, formula: '=(D8-C8)/C8' },
      { addr: 'K8', value: 0.5, formula: '=(E8-D8)/D8' },
    ])
    const rows = buildRowsFromManifest(MANIFEST, cells)
    const cash = rows[1]
    expect(cash.formula?.commonSize?.description).toBe('Cash / Total Assets')
    expect(cash.formula?.commonSize?.excelByYear).toEqual({
      2020: '=D8/D$15',
      2021: '=E8/E$15',
    })
    expect(cash.formula?.growth?.excelByYear).toEqual({
      2020: '=(D8-C8)/C8',
      2021: '=(E8-D8)/D8',
    })
  })

  it('attaches derived column series keyed by Excel row', () => {
    const cells = makeCells([
      { addr: 'C8', value: 100 },
      { addr: 'D8', value: 200 },
      { addr: 'E8', value: 300 },
    ])
    const rows = buildRowsFromManifest(MANIFEST, cells, {
      commonSize: {
        8: { 2020: 0.21, 2021: 0.34 },
      },
      growth: {
        8: { 2020: 1.0, 2021: 0.5 },
      },
    })
    const cash = rows[1]
    expect(cash.commonSize).toEqual({ 2020: 0.21, 2021: 0.34 })
    expect(cash.growth).toEqual({ 2020: 1.0, 2021: 0.5 })
  })

  it('skips missing cells gracefully (no throw)', () => {
    const cells = makeCells([{ addr: 'C8', value: 100 }])
    const rows = buildRowsFromManifest(MANIFEST, cells)
    expect(rows[1].values).toEqual({ 2019: 100 })
  })
})
