import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  ALL_SCALAR_MAPPINGS,
  ALL_GRID_MAPPINGS,
  DLOM_ANSWER_ROWS,
  DLOC_ANSWER_ROWS,
  offsetCol,
  ALL_ARRAY_MAPPINGS,
  ALL_DYNAMIC_ROWS_MAPPINGS,
} from '@/lib/export/cell-mapping'

// ---------------------------------------------------------------------------
// Test helper: load the template directly from disk (no fetch in Node)
// ---------------------------------------------------------------------------

async function loadTemplate(): Promise<ExcelJS.Workbook> {
  const templatePath = resolve(__dirname, '../../../public/templates/kka-template.xlsx')
  const buffer = readFileSync(templatePath)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer)
  return wb
}

/**
 * Simulate export logic in a test-friendly way: load template from disk,
 * clear input cells, inject state, return workbook for assertions.
 */
async function simulateExport(state: ExportableState): Promise<ExcelJS.Workbook> {
  const wb = await loadTemplate()

  // Clear all input cells
  clearAllInputCells(wb)
  // Inject user data
  injectAll(wb, state)

  // Round-trip through buffer to verify formula preservation
  const buf = await wb.xlsx.writeBuffer()
  const wb2 = new ExcelJS.Workbook()
  await wb2.xlsx.load(buf)
  return wb2
}

// Re-implement core logic in test (avoids browser-only fetch dependency)
function clearAllInputCells(wb: ExcelJS.Workbook): void {
  for (const m of ALL_SCALAR_MAPPINGS) {
    const ws = wb.getWorksheet(m.excelSheet)
    if (ws) ws.getCell(m.excelCell).value = null
  }
  for (const g of ALL_GRID_MAPPINGS) {
    const ws = wb.getWorksheet(g.excelSheet)
    if (!ws) continue
    for (const row of g.leafRows) {
      for (const col of Object.values(g.yearColumns)) {
        ws.getCell(`${col}${row}`).value = null
      }
    }
  }
  for (const a of ALL_ARRAY_MAPPINGS) {
    const ws = wb.getWorksheet(a.excelSheet)
    if (!ws) continue
    for (let i = 0; i < a.length; i++) {
      ws.getCell(`${offsetCol(a.startColumn, i)}${a.row}`).value = null
    }
  }
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    const ws = wb.getWorksheet(d.excelSheet)
    if (!ws) continue
    for (let r = d.startRow; r < d.startRow + d.maxRows; r++) {
      for (const col of Object.keys(d.columns)) {
        ws.getCell(`${col}${r}`).value = null
      }
    }
  }
  const dlomWs = wb.getWorksheet('DLOM')
  if (dlomWs) {
    for (const row of DLOM_ANSWER_ROWS) dlomWs.getCell(`F${row}`).value = null
    dlomWs.getCell('C31').value = null
  }
  const dlocWs = wb.getWorksheet('DLOC(PFC)')
  if (dlocWs) {
    for (const row of DLOC_ANSWER_ROWS) dlocWs.getCell(`E${row}`).value = null
    dlocWs.getCell('B21').value = null
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

function injectAll(wb: ExcelJS.Workbook, state: ExportableState): void {
  // Scalars
  for (const m of ALL_SCALAR_MAPPINGS) {
    const ws = wb.getWorksheet(m.excelSheet)
    if (!ws) continue
    let value: unknown
    if (m.storeSlice === '_root') {
      value = (state as unknown as Record<string, unknown>)[m.storeField]
    } else {
      const slice = (state as unknown as Record<string, unknown>)[m.storeSlice]
      if (!slice) continue
      value = getNestedValue(slice as Record<string, unknown>, m.storeField)
    }
    if (value === undefined || value === null) continue
    if (m.exportTransform === 'multiplyBy100' && typeof value === 'number') value = value * 100
    ws.getCell(m.excelCell).value = value as ExcelJS.CellValue
  }

  // Grids
  for (const g of ALL_GRID_MAPPINGS) {
    const ws = wb.getWorksheet(g.excelSheet)
    if (!ws) continue
    const slice = (state as unknown as Record<string, unknown>)[g.storeSlice] as
      | { rows: Record<number, Record<number, number>> }
      | null
    if (!slice) continue
    for (const row of g.leafRows) {
      const yearValues = slice.rows[row]
      if (!yearValues) continue
      for (const [yearStr, col] of Object.entries(g.yearColumns)) {
        const val = yearValues[Number(yearStr)]
        if (val !== undefined) ws.getCell(`${col}${row}`).value = val
      }
    }
  }

  // Arrays
  for (const a of ALL_ARRAY_MAPPINGS) {
    const ws = wb.getWorksheet(a.excelSheet)
    if (!ws) continue
    const slice = (state as unknown as Record<string, unknown>)[a.storeSlice]
    if (!slice) continue
    let values: number[] | undefined
    if (a.storeField.startsWith('_') && a.storeField.endsWith('Projected')) {
      const baseField = a.storeField.replace(/^_/, '').replace(/Projected$/, '')
      const baseValue = getNestedValue(slice as Record<string, unknown>, `operationalDrivers.${baseField}`)
      if (typeof baseValue === 'number') values = Array(a.length).fill(baseValue) as number[]
    } else {
      const raw = getNestedValue(slice as Record<string, unknown>, a.storeField)
      if (Array.isArray(raw)) values = raw as number[]
    }
    if (!values) continue
    for (let i = 0; i < a.length && i < values.length; i++) {
      ws.getCell(`${offsetCol(a.startColumn, i)}${a.row}`).value = values[i]
    }
  }

  // Dynamic rows
  for (const d of ALL_DYNAMIC_ROWS_MAPPINGS) {
    const ws = wb.getWorksheet(d.excelSheet)
    if (!ws) continue
    const slice = (state as unknown as Record<string, unknown>)[d.storeSlice]
    if (!slice) continue
    const items = getNestedValue(slice as Record<string, unknown>, d.storeField)
    if (!Array.isArray(items)) continue
    const count = Math.min(items.length, d.maxRows)
    for (let i = 0; i < count; i++) {
      const item = items[i] as Record<string, unknown>
      const row = d.startRow + i
      for (const [col, field] of Object.entries(d.columns)) {
        let value = item[field]
        if (value === undefined || value === null) continue
        if (d.columnTransforms?.[col] === 'multiplyBy100' && typeof value === 'number') value = value * 100
        ws.getCell(`${col}${row}`).value = value as ExcelJS.CellValue
      }
    }
  }

  // DLOM answers
  if (state.dlom) {
    const ws = wb.getWorksheet('DLOM')
    if (ws) {
      for (let f = 1; f <= 10; f++) {
        const answer = state.dlom.answers[f]
        if (answer) ws.getCell(`F${DLOM_ANSWER_ROWS[f - 1]}`).value = answer
      }
      ws.getCell('C31').value =
        state.dlom.kepemilikan === 'mayoritas' ? 'Mayoritas' : 'Minoritas'
    }
  }

  // DLOC answers
  if (state.dloc) {
    const ws = wb.getWorksheet('DLOC(PFC)')
    if (ws) {
      for (let f = 1; f <= 5; f++) {
        const answer = state.dloc.answers[f]
        if (answer) ws.getCell(`E${DLOC_ANSWER_ROWS[f - 1]}`).value = answer
      }
      ws.getCell('B21').value =
        state.dloc.kepemilikan === 'mayoritas' ? 'Mayoritas' : 'Minoritas'
    }
  }

  // DLOM jenis perusahaan
  if (state.home) {
    const ws = wb.getWorksheet('DLOM')
    if (ws) {
      ws.getCell('C30').value =
        state.home.jenisPerusahaan === 'tertutup'
          ? 'DLOM Perusahaan tertutup '
          : 'DLOM Perusahaan terbuka '
    }
  }
}

// ---------------------------------------------------------------------------
// Minimal test state
// ---------------------------------------------------------------------------

const TEST_STATE: ExportableState = {
  home: {
    namaPerusahaan: 'PT Test Corp',
    npwp: '01.234.567.8-901.000',
    namaSubjekPajak: 'Test Subjek',
    npwpSubjekPajak: '01.234.567.8-901.001',
    jenisSubjekPajak: 'orang_pribadi' as const,
    jenisPerusahaan: 'tertutup' as const,
    objekPenilaian: 'saham' as const,
    jenisInformasiPeralihan: 'lembar_saham' as const,
    jumlahSahamBeredar: 1000000,
    jumlahSahamYangDinilai: 300000,
    nilaiNominalPerSaham: 1000,
    tahunTransaksi: 2023,
    dlomPercent: 0.4,
    dlocPercent: 0.54,
  },
  balanceSheet: {
    rows: {
      8: { 2018: 100, 2019: 200, 2020: 300, 2021: 400 },
      9: { 2018: 50, 2019: 60, 2020: 70, 2021: 80 },
    },
  },
  incomeStatement: null,
  fixedAsset: null,
  wacc: {
    marketParams: { equityRiskPremium: 0.0762, ratingBasedDefaultSpread: 0.0226, riskFree: 0.027 },
    comparableCompanies: [
      { name: 'Company A', betaLevered: 1.2, marketCap: 1000000000, debt: 500000000 },
      { name: 'Company B', betaLevered: 0.8, marketCap: 2000000000, debt: 1000000000 },
    ],
    taxRate: 0.22,
    bankRates: [
      { name: 'Bank X', rate: 0.12 },
    ],
    waccOverride: null,
  },
  discountRate: {
    taxRate: 0.22,
    riskFree: 0.065,
    beta: 1.09,
    equityRiskPremium: 0.0738,
    countryDefaultSpread: 0.0207,
    derIndustry: 0.2154,
    bankRates: [
      { name: 'BANK PERSERO', rate: 0.0941 },
      { name: 'BANK SWASTA', rate: 0.0823 },
    ],
  },
  keyDrivers: null,
  dlom: {
    answers: { 1: 'Tidak Ada', 2: 'Skala Besar', 3: 'Tidak Ada' },
    kepemilikan: 'mayoritas',
    percentage: 0.4,
  },
  dloc: {
    answers: { 1: 'Tidak Ada', 2: 'Sedang' },
    kepemilikan: 'mayoritas',
    percentage: 0.54,
  },
  borrowingCapInput: { piutangCalk: 333625997484, persediaanCalk: 425521174257 },
  faAdjustment: 5000000,
  nilaiPengalihanDilaporkan: 600000000,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('export-xlsx (template-based)', () => {
  it('template loads without error', async () => {
    const wb = await loadTemplate()
    expect(wb.worksheets.length).toBe(45)
  })

  it('template preserves formulas after round-trip', async () => {
    const wb = await loadTemplate()
    const buf = await wb.xlsx.writeBuffer()
    const wb2 = new ExcelJS.Workbook()
    await wb2.xlsx.load(buf)

    const is = wb2.getWorksheet('INCOME STATEMENT')!
    const c8 = is.getCell('C8').value as { formula?: string }
    expect(c8.formula).toBe('SUM(C6:C7)')
  })

  it('clears prototype data from input cells', async () => {
    const wb = await loadTemplate()
    clearAllInputCells(wb)

    // HOME B4 should be cleared (was "PT RAJA VOLTAMA ELEKTRIK")
    const home = wb.getWorksheet('HOME')!
    expect(home.getCell('B4').value).toBeNull()

    // BS C8 should be cleared (was 14216370131)
    const bs = wb.getWorksheet('BALANCE SHEET')!
    expect(bs.getCell('C8').value).toBeNull()
  })

  it('injects HOME scalars into correct cells', async () => {
    const wb = await simulateExport(TEST_STATE)
    const home = wb.getWorksheet('HOME')!

    expect(home.getCell('B4').value).toBe('PT Test Corp')
    expect(home.getCell('B5').value).toBe('tertutup')
    expect(home.getCell('B6').value).toBe(1000000)
    expect(home.getCell('B7').value).toBe(300000)
    expect(home.getCell('B9').value).toBe(2023)
    expect(home.getCell('B12').value).toBe('saham')
  })

  it('injects BS grid data into correct cells', async () => {
    const wb = await simulateExport(TEST_STATE)
    const bs = wb.getWorksheet('BALANCE SHEET')!

    // Row 8 (Cash on Hands), year 2018 → col C
    expect(bs.getCell('C8').value).toBe(100)
    expect(bs.getCell('D8').value).toBe(200)
    expect(bs.getCell('E8').value).toBe(300)
    expect(bs.getCell('F8').value).toBe(400)

    // Row 9, year 2019 → col D
    expect(bs.getCell('D9').value).toBe(60)
  })

  it('preserves BS formula cells after injection', async () => {
    const wb = await simulateExport(TEST_STATE)
    const bs = wb.getWorksheet('BALANCE SHEET')!

    // C16 = SUM(C8:C14) should still be a formula
    const c16 = bs.getCell('C16').value as { formula?: string }
    expect(c16.formula).toBe('SUM(C8:C14)')
  })

  it('injects WACC comparable companies as dynamic rows', async () => {
    const wb = await simulateExport(TEST_STATE)
    const wacc = wb.getWorksheet('WACC')!

    expect(wacc.getCell('A11').value).toBe('Company A')
    expect(wacc.getCell('B11').value).toBe(1.2)
    expect(wacc.getCell('C11').value).toBe(1000000000)
    expect(wacc.getCell('D11').value).toBe(500000000)

    expect(wacc.getCell('A12').value).toBe('Company B')

    // Row 13 should be cleared (was PT Surya Sehat in template)
    expect(wacc.getCell('A13').value).toBeNull()
  })

  it('injects DISCOUNT RATE bank rates with ×100 transform', async () => {
    const wb = await simulateExport(TEST_STATE)
    const dr = wb.getWorksheet('DISCOUNT RATE')!

    // Store has rate 0.0941 → Excel expects 9.41
    expect(dr.getCell('K6').value).toBe('BANK PERSERO')
    expect(dr.getCell('L6').value).toBeCloseTo(9.41, 2)

    expect(dr.getCell('K7').value).toBe('BANK SWASTA')
    expect(dr.getCell('L7').value).toBeCloseTo(8.23, 2)
  })

  it('injects DLOM answers and kepemilikan', async () => {
    const wb = await simulateExport(TEST_STATE)
    const dlom = wb.getWorksheet('DLOM')!

    expect(dlom.getCell('F7').value).toBe('Tidak Ada')
    expect(dlom.getCell('F9').value).toBe('Skala Besar')
    expect(dlom.getCell('F11').value).toBe('Tidak Ada')

    expect(dlom.getCell('C31').value).toBe('Mayoritas')
    expect(dlom.getCell('C30').value).toBe('DLOM Perusahaan tertutup ')
  })

  it('injects DLOC answers', async () => {
    const wb = await simulateExport(TEST_STATE)
    const dloc = wb.getWorksheet('DLOC(PFC)')!

    expect(dloc.getCell('E7').value).toBe('Tidak Ada')
    expect(dloc.getCell('E9').value).toBe('Sedang')

    expect(dloc.getCell('B21').value).toBe('Mayoritas')
  })

  it('injects BORROWING CAP CALK values', async () => {
    const wb = await simulateExport(TEST_STATE)
    const bc = wb.getWorksheet('BORROWING CAP')!

    expect(bc.getCell('D5').value).toBe(333625997484)
    expect(bc.getCell('D6').value).toBe(425521174257)
  })

  it('injects faAdjustment into AAM D20', async () => {
    const wb = await simulateExport(TEST_STATE)
    const aam = wb.getWorksheet('AAM')!

    expect(aam.getCell('D20').value).toBe(5000000)
  })

  it('injects nilaiPengalihanDilaporkan into SIMULASI POTENSI E11', async () => {
    const wb = await simulateExport(TEST_STATE)
    const sp = wb.getWorksheet('SIMULASI POTENSI (AAM)')!

    expect(sp.getCell('E11').value).toBe(600000000)
  })

  it('handles null slices gracefully (no crash)', async () => {
    const minimalState: ExportableState = {
      home: null,
      balanceSheet: null,
      incomeStatement: null,
      fixedAsset: null,
      wacc: null,
      discountRate: null,
      keyDrivers: null,
      dlom: null,
      dloc: null,
      borrowingCapInput: null,
      faAdjustment: 0,
      nilaiPengalihanDilaporkan: 0,
    }
    // Should not throw
    const wb = await simulateExport(minimalState)
    expect(wb.worksheets.length).toBe(45)
  })
})
