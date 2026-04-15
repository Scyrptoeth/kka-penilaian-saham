import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  applySheetVisibility,
  injectExtendedBsAccounts,
  extendBsSectionSubtotals,
  sanitizeDanglingFormulas,
} from '@/lib/export/export-xlsx'
import {
  ALL_SCALAR_MAPPINGS,
  ALL_GRID_MAPPINGS,
  DLOM_ANSWER_ROWS,
  DLOC_ANSWER_ROWS,
  BS_ROW_TO_AAM_D_ROW,
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
  // Inject extended BS accounts as native rows + extend subtotals (Session 025).
  // Replaces the RINCIAN NERACA detail sheet pattern.
  injectExtendedBsAccounts(wb, state)
  extendBsSectionSubtotals(wb, state)
  // Apply website-nav 1:1 visibility (Session 024)
  applySheetVisibility(wb)
  // Strip dangling external-link + #REF! formulas inherited from the
  // template's prior Excel life (Session 026)
  sanitizeDanglingFormulas(wb)

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

  // AAM per-row adjustments
  if (state.aamAdjustments && Object.keys(state.aamAdjustments).length > 0) {
    const ws = wb.getWorksheet('AAM')
    if (ws) {
      for (const [bsRowStr, value] of Object.entries(state.aamAdjustments)) {
        if (value === 0) continue
        const aamRow = BS_ROW_TO_AAM_D_ROW[Number(bsRowStr)]
        if (aamRow !== undefined) {
          ws.getCell(`D${aamRow}`).value = value
        }
      }
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
    accounts: [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' as const },
      { catalogId: 'cash_bank', excelRow: 9, section: 'current_assets' as const },
    ],
    yearCount: 4,
    language: 'en' as const,
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
  aamAdjustments: { 22: 5000000 },
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

  it('injects aamAdjustments into AAM D column', async () => {
    const wb = await simulateExport(TEST_STATE)
    const aam = wb.getWorksheet('AAM')!

    // BS row 22 (Fixed Asset Net) maps to AAM row 20
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
      aamAdjustments: {},
      nilaiPengalihanDilaporkan: 0,
    }
    // Should not throw
    const wb = await simulateExport(minimalState)
    expect(wb.worksheets.length).toBe(45) // no RINCIAN NERACA when bs=null
  })

  // RINCIAN NERACA detail sheet was DELETED in Session 025 — extended accounts
  // now write directly to BALANCE SHEET as native rows. See "extended BS catalog
  // native injection" describe block below for replacement coverage.

  // ─── Session 024: website-nav 1:1 visibility ───
  describe('sheet visibility — website nav 1:1', () => {
    it('unhides KEY DRIVERS and ACC PAYABLES (now visible in website nav)', async () => {
      const wb = await simulateExport(TEST_STATE)
      expect(wb.getWorksheet('KEY DRIVERS')!.state).toBe('visible')
      expect(wb.getWorksheet('ACC PAYABLES')!.state).toBe('visible')
    })

    it('hides TL, RESUME, DIVIDEND DISCOUNT MODEL (not in website nav)', async () => {
      const wb = await simulateExport(TEST_STATE)
      expect(wb.getWorksheet('TL')!.state).toBe('hidden')
      expect(wb.getWorksheet('RESUME')!.state).toBe('hidden')
      expect(wb.getWorksheet('DIVIDEND DISCOUNT MODEL')!.state).toBe('hidden')
    })

    it('keeps all 29 website-nav sheets visible', async () => {
      const wb = await simulateExport(TEST_STATE)
      const navSheets = [
        'HOME', 'FIXED ASSET', 'BALANCE SHEET', 'INCOME STATEMENT',
        'KEY DRIVERS', 'ACC PAYABLES', 'FINANCIAL RATIO', 'FCF', 'NOPLAT',
        'GROWTH REVENUE', 'ROIC', 'GROWTH RATE', 'CASH FLOW STATEMENT',
        'PROY LR', 'PROY FIXED ASSETS', 'PROY BALANCE SHEET', 'PROY NOPLAT',
        'PROY CASH FLOW STATEMENT', 'DLOM', 'DLOC(PFC)', 'WACC',
        'DISCOUNT RATE', 'BORROWING CAP', 'DCF', 'AAM', 'EEM', 'CFI',
        'SIMULASI POTENSI (AAM)', 'DASHBOARD',
      ]
      for (const name of navSheets) {
        expect(wb.getWorksheet(name)!.state, name).toBe('visible')
      }
    })
  })

  // ─── Session 025: extended catalog native injection ───
  describe('extended BS catalog native injection (Session 025)', () => {
    const STATE_WITH_EXTENDED: ExportableState = {
      ...TEST_STATE,
      balanceSheet: {
        accounts: [
          // Original-row accounts
          { catalogId: 'cash', excelRow: 8, section: 'current_assets' as const },
          // Extended-row account in current_assets (excelRow ≥ 100)
          { catalogId: 'short_term_invest', excelRow: 100, section: 'current_assets' as const },
          { catalogId: 'restricted_cash', excelRow: 108, section: 'current_assets' as const },
          // Extended in equity section
          { catalogId: 'treasury_stock', excelRow: 300, section: 'equity' as const },
        ],
        yearCount: 4,
        language: 'en' as const,
        rows: {
          8: { 2018: 100, 2019: 200, 2020: 300, 2021: 400 },
          100: { 2018: 1000, 2019: 1100, 2020: 1200, 2021: 1300 },
          108: { 2018: 50, 2019: 60, 2020: 70, 2021: 80 },
          300: { 2018: -500, 2019: -600, 2020: -700, 2021: -800 },
        },
      },
    }

    it('writes extended-account label into column B at synthetic row', async () => {
      const wb = await simulateExport(STATE_WITH_EXTENDED)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      // catalog "short_term_invest" → labelEn "Short-term Investments"
      expect(bs.getCell('B100').value).toBe('Short-term Investments')
      expect(bs.getCell('B108').value).toBe('Restricted Cash')
      expect(bs.getCell('B300').value).toBe('Treasury Stock')
    })

    it('writes extended-account values into year columns at synthetic row', async () => {
      const wb = await simulateExport(STATE_WITH_EXTENDED)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      // yearColumns C/D/E/F = 2018/2019/2020/2021
      expect(bs.getCell('C100').value).toBe(1000)
      expect(bs.getCell('D100').value).toBe(1100)
      expect(bs.getCell('E100').value).toBe(1200)
      expect(bs.getCell('F100').value).toBe(1300)
      // negative for treasury_stock
      expect(bs.getCell('F300').value).toBe(-800)
    })

    it('appends +SUM(extendedRange) to current_assets subtotal at row 16', async () => {
      const wb = await simulateExport(STATE_WITH_EXTENDED)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      const cell = bs.getCell('D16')
      const formula = (cell.value as { formula: string }).formula
      // Original: SUM(D8:D14) → appended: ...+SUM(D100:D139)
      expect(formula).toContain('SUM(D8:D14)')
      expect(formula).toContain('SUM(D100:D139)')
    })

    it('appends +SUM(extendedRange) to equity subtotal at row 49 for all year columns', async () => {
      const wb = await simulateExport(STATE_WITH_EXTENDED)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      // Original D49 = +D43+D48+D44 → +D43+D48+D44+SUM(D300:D319)
      for (const col of ['C', 'D', 'E', 'F']) {
        const formula = (bs.getCell(`${col}49`).value as { formula: string }).formula
        expect(formula, `${col}49`).toContain(`SUM(${col}300:${col}319)`)
      }
    })

    it('does NOT modify subtotals for sections without extended accounts', async () => {
      const wb = await simulateExport(STATE_WITH_EXTENDED)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      // current_liabilities row 35: STATE_WITH_EXTENDED has no extended for this section
      const formula = (bs.getCell('D35').value as { formula: string }).formula
      expect(formula).not.toContain('SUM(D200:D219)')
      // Should still contain original
      expect(formula).toContain('SUM(D31:D34)')
    })

    it('preserves original-row accounts (excelRow < 100) unchanged in formula injection', async () => {
      const wb = await simulateExport(STATE_WITH_EXTENDED)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      // Original cash account at D8 = 200 (year 2019)
      expect(bs.getCell('D8').value).toBe(200)
    })

    it('handles state with no extended accounts → no formula changes', async () => {
      // Reuse base TEST_STATE which has only original-row accounts
      const wb = await simulateExport(TEST_STATE)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      const formula = (bs.getCell('D16').value as { formula: string }).formula
      expect(formula).toBe('SUM(D8:D14)') // unchanged
    })
  })

  describe('sanitizeDanglingFormulas — strip external-link + #REF! formulas (Session 026)', () => {
    it('replaces external-link formulas like [3]BALANCE SHEET!A3 with cached value', async () => {
      const wb = await simulateExport(TEST_STATE)
      // INCOME STATEMENT!A3 had formula `'[3]BALANCE SHEET'!A3` → cached `(IDR)`
      const cell = wb.getWorksheet('INCOME STATEMENT')!.getCell('A3')
      // After sanitize, value is the cached string, formula is gone
      expect(typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value).toBe(false)
      expect(cell.value).toBe('(IDR)')
    })

    it('strips [4]BANGUNAN external ref from FIXED ASSET!H64 and keeps cached value', async () => {
      const wb = await simulateExport(TEST_STATE)
      const cell = wb.getWorksheet('FIXED ASSET')!.getCell('H64')
      expect(typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value).toBe(false)
      // Cached value in template was ≈166_342_337_027.93
      expect(typeof cell.value).toBe('number')
      expect(cell.value as number).toBeGreaterThan(0)
    })

    it('strips [4]FIXTURE FURNITURE EQUIPMENT external ref from FIXED ASSET!H65', async () => {
      const wb = await simulateExport(TEST_STATE)
      const cell = wb.getWorksheet('FIXED ASSET')!.getCell('H65')
      expect(typeof cell.value === 'object' && cell.value !== null && 'formula' in cell.value).toBe(false)
      expect(typeof cell.value).toBe('number')
    })

    it('leaves live in-workbook formulas untouched', async () => {
      const wb = await simulateExport(TEST_STATE)
      // BALANCE SHEET!D16 is a live SUM formula from Session 025 — must stay live
      const bs = wb.getWorksheet('BALANCE SHEET')!
      const f = (bs.getCell('D16').value as { formula: string }).formula
      expect(f).toContain('SUM(')
      expect(f).not.toMatch(/\[\d+\]/)
      expect(f).not.toContain('#REF!')
    })

    it('leaves no cell with [N] or #REF! in any formula after sanitize', async () => {
      const wb = await simulateExport(TEST_STATE)
      const offenders: string[] = []
      for (const ws of wb.worksheets) {
        ws.eachRow({ includeEmpty: false }, (row) => {
          row.eachCell({ includeEmpty: false }, (cell) => {
            const v = cell.value as unknown
            if (!v || typeof v !== 'object') return
            const f = (v as { formula?: unknown }).formula
            if (typeof f !== 'string') return
            if (/\[\d+\]|#REF!/.test(f)) {
              offenders.push(`${ws.name}!${cell.address}: ${f}`)
            }
          })
        })
      }
      expect(offenders).toEqual([])
    })

    it('drops conditional-formatting rules whose formulae contain #REF!', async () => {
      const wb = await simulateExport(TEST_STATE)
      // WACC!A4:A5 had a cfRule `#REF!="Country"` inherited from a
      // missing table source — must be filtered out.
      for (const ws of wb.worksheets) {
        type CfRule = { formulae?: unknown }
        type Cf = { rules?: CfRule[] }
        const cfs = (ws as unknown as { conditionalFormattings?: Cf[] }).conditionalFormattings
        if (!Array.isArray(cfs)) continue
        for (const cf of cfs) {
          if (!Array.isArray(cf.rules)) continue
          for (const rule of cf.rules) {
            const fs = rule.formulae
            if (!Array.isArray(fs)) continue
            for (const f of fs) {
              expect(typeof f === 'string' && /\[\d+\]|#REF!/.test(f)).toBe(false)
            }
          }
        }
      }
    })

    it('clears cells that store a raw #REF! error value with no formula', async () => {
      const wb = await simulateExport(TEST_STATE)
      // PASAR PEMBANDING_ C3/D3/E3 held `<v>#REF!</v>` after formula strip.
      const ws = wb.getWorksheet('PASAR PEMBANDING_')
      if (!ws) return // sheet may be dropped; skip if so
      for (const addr of ['C3', 'D3', 'E3']) {
        const cell = ws.getCell(addr)
        const v = cell.value as unknown
        if (v && typeof v === 'object' && 'error' in v) {
          expect((v as { error: string }).error).not.toBe('#REF!')
        }
      }
    })
  })
})
