import { describe, expect, it } from 'vitest'
import { buildDynamicFaManifest } from '@/data/manifests/build-dynamic-fa'
import { FA_OFFSET, FA_SUBTOTAL, type FaAccountEntry } from '@/data/catalogs/fixed-asset-catalog'

const TAHUN = 2022

function entry(catalogId: string, excelRow: number): FaAccountEntry {
  return { catalogId, excelRow, section: 'fixed_asset' }
}

describe('buildDynamicFaManifest', () => {
  it('empty accounts → only structural rows (headers, add-button, subtotals)', () => {
    const m = buildDynamicFaManifest([], 'en', 3, TAHUN)
    const headers = m.rows.filter((r) => r.type === 'header')
    expect(headers.length).toBeGreaterThanOrEqual(7) // 3 main sections × sub-headers
    const addButtons = m.rows.filter((r) => r.type === 'add-button')
    expect(addButtons).toHaveLength(1)
    expect(addButtons[0].section).toBe('fixed_asset')
    // No leaf rows
    const normals = m.rows.filter((r) => r.type === 'normal')
    expect(normals).toHaveLength(0)
  })

  it('1 account → generates leaf rows across all 7 sub-blocks', () => {
    const accounts = [entry('land', 8)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    // 4 editable leaf rows (Acq Begin, Acq Add, Dep Begin, Dep Add)
    const normals = m.rows.filter((r) => r.type === 'normal')
    expect(normals).toHaveLength(4)
    expect(normals.map((r) => r.excelRow)).toEqual([
      8 + FA_OFFSET.ACQ_BEGINNING,
      8 + FA_OFFSET.ACQ_ADDITIONS,
      8 + FA_OFFSET.DEP_BEGINNING,
      8 + FA_OFFSET.DEP_ADDITIONS,
    ])

    // 3 computed leaf rows (Acq Ending, Dep Ending, Net Value)
    const computedLeaves = m.rows.filter(
      (r) => r.type === 'subtotal' && r.excelRow !== undefined && r.excelRow > 100
    )
    expect(computedLeaves).toHaveLength(3)
    expect(computedLeaves.map((r) => r.excelRow)).toEqual([
      8 + FA_OFFSET.ACQ_ENDING,
      8 + FA_OFFSET.DEP_ENDING,
      8 + FA_OFFSET.NET_VALUE,
    ])
  })

  it('6 original accounts → 24 editable + 18 computed leaf rows', () => {
    const accounts = [
      entry('land', 8), entry('building', 9), entry('equipment', 10),
      entry('vehicle', 11), entry('inventory', 12), entry('electrical', 13),
    ]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const normals = m.rows.filter((r) => r.type === 'normal')
    expect(normals).toHaveLength(24) // 6 accounts × 4 editable sub-blocks

    // 6 per computed sub-block × 3 sub-blocks = 18
    // + 7 subtotal rows = 25 total subtotal-type rows
    const subtotals = m.rows.filter((r) => r.type === 'subtotal')
    expect(subtotals).toHaveLength(18 + 6) // 18 computed leaves + 6 section subtotals
  })

  it('Acq Ending computedFrom = [Acq Beginning + Acq Additions] per account', () => {
    const accounts = [entry('land', 8)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const acqEnding = m.rows.find((r) => r.excelRow === 8 + FA_OFFSET.ACQ_ENDING)
    expect(acqEnding).toBeDefined()
    expect(acqEnding!.computedFrom).toEqual([
      8 + FA_OFFSET.ACQ_BEGINNING,
      8 + FA_OFFSET.ACQ_ADDITIONS,
    ])
  })

  it('Dep Ending computedFrom = [Dep Beginning + Dep Additions] per account', () => {
    const accounts = [entry('building', 9)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const depEnding = m.rows.find((r) => r.excelRow === 9 + FA_OFFSET.DEP_ENDING)
    expect(depEnding).toBeDefined()
    expect(depEnding!.computedFrom).toEqual([
      9 + FA_OFFSET.DEP_BEGINNING,
      9 + FA_OFFSET.DEP_ADDITIONS,
    ])
  })

  it('Net Value computedFrom = [+Acq Ending, −Dep Ending] (signed)', () => {
    const accounts = [entry('land', 8)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const netValue = m.rows.find((r) => r.excelRow === 8 + FA_OFFSET.NET_VALUE)
    expect(netValue).toBeDefined()
    expect(netValue!.computedFrom).toEqual([
      8 + FA_OFFSET.ACQ_ENDING,     // positive
      -(8 + FA_OFFSET.DEP_ENDING),  // negative (subtracted)
    ])
  })

  it('Total Acq Ending = Total Acq Beginning + Total Acq Additions', () => {
    const accounts = [entry('land', 8), entry('building', 9)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const totalAcqEnding = m.rows.find((r) => r.excelRow === FA_SUBTOTAL.TOTAL_ACQ_ENDING)
    expect(totalAcqEnding).toBeDefined()
    expect(totalAcqEnding!.computedFrom).toEqual([
      FA_SUBTOTAL.TOTAL_ACQ_BEGINNING,
      FA_SUBTOTAL.TOTAL_ACQ_ADDITIONS,
    ])
  })

  it('Total Net Value computedFrom = all net value leaf rows', () => {
    const accounts = [entry('land', 8), entry('building', 9), entry('equipment', 10)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const totalNet = m.rows.find((r) => r.excelRow === FA_SUBTOTAL.TOTAL_NET_VALUE)
    expect(totalNet).toBeDefined()
    expect(totalNet!.computedFrom).toEqual([
      8 + FA_OFFSET.NET_VALUE,
      9 + FA_OFFSET.NET_VALUE,
      10 + FA_OFFSET.NET_VALUE,
    ])
  })

  it('subtotal Beginning computedFrom includes all account beginning rows', () => {
    const accounts = [entry('land', 8), entry('building', 9)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const totalBegin = m.rows.find((r) => r.excelRow === FA_SUBTOTAL.TOTAL_ACQ_BEGINNING)
    expect(totalBegin!.computedFrom).toEqual([8, 9])

    const totalDepBegin = m.rows.find((r) => r.excelRow === FA_SUBTOTAL.TOTAL_DEP_BEGINNING)
    expect(totalDepBegin!.computedFrom).toEqual([
      8 + FA_OFFSET.DEP_BEGINNING,
      9 + FA_OFFSET.DEP_BEGINNING,
    ])
  })

  it('add-button row exists under Acq Beginning only', () => {
    const accounts = [entry('land', 8)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const addButtons = m.rows.filter((r) => r.type === 'add-button')
    expect(addButtons).toHaveLength(1)
    expect(addButtons[0].section).toBe('fixed_asset')

    // Verify it's between the last Beginning leaf and the Beginning subtotal
    const addIdx = m.rows.indexOf(addButtons[0])
    const lastLeaf = m.rows.findIndex((r) => r.excelRow === 8 + FA_OFFSET.ACQ_BEGINNING)
    const subtotal = m.rows.findIndex((r) => r.excelRow === FA_SUBTOTAL.TOTAL_ACQ_BEGINNING)
    expect(addIdx).toBeGreaterThan(lastLeaf)
    expect(addIdx).toBeLessThan(subtotal)
  })

  it('language toggle changes labels', () => {
    const accounts = [entry('land', 8)]
    const en = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)
    const id = buildDynamicFaManifest(accounts, 'id', 3, TAHUN)

    const enLeaf = en.rows.find((r) => r.excelRow === 8 && r.type === 'normal')
    const idLeaf = id.rows.find((r) => r.excelRow === 8 && r.type === 'normal')
    expect(enLeaf!.label).toBe('Land')
    expect(idLeaf!.label).toBe('Tanah')

    // Header labels differ
    const enHeader = en.rows.find((r) => r.type === 'header' && r.label.includes('ACQUISITION'))
    const idHeader = id.rows.find((r) => r.type === 'header' && r.label.includes('PEROLEHAN'))
    expect(enHeader).toBeDefined()
    expect(idHeader).toBeDefined()
  })

  it('years generated correctly for yearCount=3 and tahunTransaksi=2022', () => {
    const m = buildDynamicFaManifest([], 'en', 3, TAHUN)
    expect(m.years).toEqual([2019, 2020, 2021])
    expect(m.columns).toEqual({ 2019: 'C', 2020: 'D', 2021: 'E' })
  })

  it('years generated correctly for yearCount=4', () => {
    const m = buildDynamicFaManifest([], 'en', 4, TAHUN)
    expect(m.years).toEqual([2018, 2019, 2020, 2021])
    expect(m.columns).toEqual({ 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' })
  })

  it('catalogId only set on Acq Beginning leaf rows (for remove button)', () => {
    const accounts = [entry('land', 8)]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const withCatalogId = m.rows.filter((r) => r.catalogId)
    expect(withCatalogId).toHaveLength(1)
    expect(withCatalogId[0].excelRow).toBe(8) // Only Beginning row
  })

  it('custom account with customLabel renders label correctly', () => {
    const accounts: FaAccountEntry[] = [
      { catalogId: 'custom_1', excelRow: 1000, section: 'fixed_asset', customLabel: 'Drone Fleet' },
    ]
    const m = buildDynamicFaManifest(accounts, 'en', 3, TAHUN)

    const leaf = m.rows.find((r) => r.excelRow === 1000 && r.type === 'normal')
    expect(leaf!.label).toBe('Drone Fleet')

    // Same label appears in all sub-blocks
    const netLeaf = m.rows.find((r) => r.excelRow === 1000 + FA_OFFSET.NET_VALUE)
    expect(netLeaf!.label).toBe('Drone Fleet')
  })
})
