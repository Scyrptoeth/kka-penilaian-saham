import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ExportableState } from '@/lib/export/export-xlsx'
import {
  applySheetVisibility,
  injectExtendedBsAccounts,
  extendBsSectionSubtotals,
  injectExtendedIsAccounts,
  replaceIsSectionSentinels,
  injectExtendedFaAccounts,
  extendFaSectionSubtotals,
  sanitizeDanglingFormulas,
  stripDecorativeTables,
  injectBsCrossRefValues,
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
  // Session 028 — IS extended injection (Approach δ: sentinel formula replacement).
  injectExtendedIsAccounts(wb, state)
  replaceIsSectionSentinels(wb, state)
  // Session 028 — FA extended injection (Approach η: 7-band mirror + SUM append).
  injectExtendedFaAccounts(wb, state)
  extendFaSectionSubtotals(wb, state)
  // Apply website-nav 1:1 visibility (Session 024)
  applySheetVisibility(wb)
  // Inject BS rows 20 & 21 from FA store cross-refs (Session 026 follow-up)
  injectBsCrossRefValues(wb, state)
  // Strip dangling external-link + #REF! formulas inherited from the
  // template's prior Excel life (Session 026)
  sanitizeDanglingFormulas(wb)
  // Drop decorative Tables that ExcelJS mis-serialises (Session 026)
  stripDecorativeTables(wb)

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
  accPayables: null,
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
      accPayables: null,
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

  // ─── Session 028: IS extended catalog native injection (Approach δ) ───
  describe('extended IS catalog native injection (Session 028 — Approach δ)', () => {
    const STATE_WITH_EXTENDED_IS: ExportableState = {
      ...TEST_STATE,
      incomeStatement: {
        accounts: [
          { catalogId: 'revenue', excelRow: 100, section: 'revenue' as const },
          { catalogId: 'service_revenue', excelRow: 102, section: 'revenue' as const },
          { catalogId: 'cogs', excelRow: 200, section: 'cost' as const },
          { catalogId: 'raw_materials', excelRow: 201, section: 'cost' as const },
          { catalogId: 'other_opex', excelRow: 300, section: 'operating_expense' as const },
          { catalogId: 'other_non_operating', excelRow: 400, section: 'non_operating' as const },
          { catalogId: 'interest_income', excelRow: 500, section: 'net_interest' as const, interestType: 'income' as const },
          { catalogId: 'interest_expense', excelRow: 501, section: 'net_interest' as const, interestType: 'expense' as const },
        ],
        yearCount: 4,
        language: 'en' as const,
        rows: {
          100: { 2018: 1000000, 2019: 1100000, 2020: 1200000, 2021: 1300000 },
          102: { 2018: 500000, 2019: 550000, 2020: 600000, 2021: 650000 },
          200: { 2018: -400000, 2019: -440000, 2020: -480000, 2021: -520000 },
          201: { 2018: -100000, 2019: -110000, 2020: -120000, 2021: -130000 },
          300: { 2018: -50000, 2019: -55000, 2020: -60000, 2021: -65000 },
          400: { 2018: 0, 2019: 10000, 2020: 20000, 2021: 30000 },
          500: { 2018: 5000, 2019: 6000, 2020: 7000, 2021: 8000 },
          501: { 2018: -3000, 2019: -3500, 2020: -4000, 2021: -4500 },
          // Pre-computed sentinels (from DynamicIsEditor schedulePersist)
          6: { 2018: 1500000, 2019: 1650000, 2020: 1800000, 2021: 1950000 },
          7: { 2018: -500000, 2019: -550000, 2020: -600000, 2021: -650000 },
          26: { 2018: 5000, 2019: 6000, 2020: 7000, 2021: 8000 },
          27: { 2018: -3000, 2019: -3500, 2020: -4000, 2021: -4500 },
          30: { 2018: 0, 2019: 10000, 2020: 20000, 2021: 30000 },
        },
      },
    }

    describe('injectExtendedIsAccounts', () => {
      it('writes extended-account label into column B at synthetic row', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect(is.getCell('B102').value).toBe('Service Revenue')
        expect(is.getCell('B201').value).toBe('Raw Materials')
        expect(is.getCell('B400').value).toBe('Other Non-Operating Income / (Charges)')
      })

      it('writes extended-account values into year columns at synthetic row', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect(is.getCell('C102').value).toBe(500000)
        expect(is.getCell('D102').value).toBe(550000)
        expect(is.getCell('E102').value).toBe(600000)
        expect(is.getCell('F102').value).toBe(650000)
        expect(is.getCell('F201').value).toBe(-130000)
      })

      it('writes label + values for net_interest extended rows (section skipped in sentinel replacement only)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect(is.getCell('B500').value).toBe('Interest Income')
        expect(is.getCell('B501').value).toBe('Interest Expense')
        expect(is.getCell('F500').value).toBe(8000)
        expect(is.getCell('F501').value).toBe(-4500)
      })

      it('fallback label priority: customLabel > catalog.labelEn > catalogId', async () => {
        const stateWithCustom: ExportableState = {
          ...STATE_WITH_EXTENDED_IS,
          incomeStatement: {
            ...STATE_WITH_EXTENDED_IS.incomeStatement!,
            accounts: [
              ...STATE_WITH_EXTENDED_IS.incomeStatement!.accounts,
              { catalogId: 'subscription_revenue', excelRow: 107, section: 'revenue' as const, customLabel: 'MyCustom Recurring' },
            ],
            rows: {
              ...STATE_WITH_EXTENDED_IS.incomeStatement!.rows,
              107: { 2018: 100, 2019: 200, 2020: 300, 2021: 400 },
            },
          },
        }
        const wb = await simulateExport(stateWithCustom)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect(is.getCell('B107').value).toBe('MyCustom Recurring')
      })

      it('handles state with null incomeStatement → no extended-row writes', async () => {
        const wb = await simulateExport(TEST_STATE)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect(is.getCell('B100').value).toBeFalsy()
        expect(is.getCell('C100').value).toBeFalsy()
      })

      it('skips accounts with excelRow < 100 (defensive guard)', async () => {
        const stateWithOriginalPos: ExportableState = {
          ...TEST_STATE,
          incomeStatement: {
            accounts: [
              // Synthetic legacy position — should be skipped
              { catalogId: 'revenue', excelRow: 6, section: 'revenue' as const },
            ],
            yearCount: 4,
            language: 'en' as const,
            rows: {
              6: { 2018: 1, 2019: 2, 2020: 3, 2021: 4 },
            },
          },
        }
        const wb = await simulateExport(stateWithOriginalPos)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        // No label written at B6 by injectExtendedIsAccounts (template's B6 label preserved)
        expect(is.getCell('B100').value).toBeFalsy()
      })
    })

    describe('replaceIsSectionSentinels', () => {
      it('replaces D6 sentinel with =SUM(D100:D119) when revenue has extended', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        const formula = (is.getCell('D6').value as { formula: string }).formula
        expect(formula).toBe('SUM(D100:D119)')
      })

      it('replaces D7 sentinel with =SUM(D200:D219) when cost has extended', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        const formula = (is.getCell('D7').value as { formula: string }).formula
        expect(formula).toBe('SUM(D200:D219)')
      })

      it('replaces D15 sentinel with =SUM(D300:D319) when operating_expense has extended', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        const formula = (is.getCell('D15').value as { formula: string }).formula
        expect(formula).toBe('SUM(D300:D319)')
      })

      it('replaces D30 sentinel with =SUM(D400:D419) when non_operating has extended', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        const formula = (is.getCell('D30').value as { formula: string }).formula
        expect(formula).toBe('SUM(D400:D419)')
      })

      it('keeps D26/D27 (net_interest) as hardcoded numbers — mixed-sign section cannot simple-SUM', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect(typeof is.getCell('D26').value).toBe('number')
        expect(typeof is.getCell('D27').value).toBe('number')
        expect(is.getCell('D26').value).toBe(6000)
        expect(is.getCell('D27').value).toBe(-3500)
      })

      it('applies sentinel replacement across all 4 year columns C/D/E/F', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        for (const col of ['C', 'D', 'E', 'F']) {
          const f = (is.getCell(`${col}6`).value as { formula: string }).formula
          expect(f, `${col}6`).toBe(`SUM(${col}100:${col}119)`)
        }
      })

      it('does NOT modify sentinel when that section has no extended accounts', async () => {
        const onlyRevenueState: ExportableState = {
          ...STATE_WITH_EXTENDED_IS,
          incomeStatement: {
            ...STATE_WITH_EXTENDED_IS.incomeStatement!,
            accounts: [
              { catalogId: 'revenue', excelRow: 100, section: 'revenue' as const },
            ],
            rows: {
              100: { 2018: 1000000, 2019: 1100000, 2020: 1200000, 2021: 1300000 },
              7: { 2018: -500000, 2019: -550000, 2020: -600000, 2021: -650000 },
            },
          },
        }
        const wb = await simulateExport(onlyRevenueState)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        expect((is.getCell('D6').value as { formula: string }).formula).toBe('SUM(D100:D119)')
        expect(typeof is.getCell('D7').value).toBe('number')
        expect(is.getCell('D7').value).toBe(-550000)
      })

      it('preserves derived row formula D8 Gross Profit (unchanged SUM(D6:D7))', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_IS)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        const f = (is.getCell('D8').value as { formula: string }).formula
        expect(f).toBe('SUM(D6:D7)')
      })

      it('handles state with null incomeStatement → no sentinel replacements', async () => {
        const wb = await simulateExport(TEST_STATE)
        const is = wb.getWorksheet('INCOME STATEMENT')!
        // D6 should remain as template value (null or empty), NOT a SUM formula
        const v = is.getCell('D6').value
        const isFormula = typeof v === 'object' && v !== null && 'formula' in v
        if (isFormula) {
          // If template had a formula at D6, must NOT be the SUM(D100:D119) form
          expect((v as { formula: string }).formula).not.toContain('SUM(D100:D119)')
        }
      })
    })
  })

  // ─── Session 028: FA extended catalog native injection (Approach η) ───
  describe('extended FA catalog native injection (Session 028 — Approach η: 7-band mirror)', () => {
    const STATE_WITH_EXTENDED_FA: ExportableState = {
      ...TEST_STATE,
      fixedAsset: {
        accounts: [
          // Original (legacy positions handled by existing injectGridCells)
          { catalogId: 'land', excelRow: 8, section: 'fixed_asset' as const },
          // Extended catalog at slot 0, 1
          { catalogId: 'computer_equipment', excelRow: 100, section: 'fixed_asset' as const },
          { catalogId: 'furniture_fixtures', excelRow: 101, section: 'fixed_asset' as const },
          // Custom at slot 2 (with customLabel)
          { catalogId: 'custom_asset_x', excelRow: 1000, section: 'fixed_asset' as const, customLabel: 'Custom Alpha' },
        ],
        yearCount: 3,
        language: 'en' as const,
        rows: {
          // Original row 8 (Land)
          8: { 2019: 500, 2020: 600, 2021: 700 },
          // Extended account at base 100 (slot 0)
          100:  { 2019: 1000, 2020: 1100, 2021: 1200 },  // Acq Begin
          2100: { 2019: 50,   2020: 55,   2021: 60   },  // Acq Add
          4100: { 2019: 300,  2020: 350,  2021: 400  },  // Dep Begin
          5100: { 2019: 30,   2020: 35,   2021: 40   },  // Dep Add
          // Extended account at base 101 (slot 1)
          101:  { 2019: 800, 2020: 850, 2021: 900 },
          2101: { 2019: 40,  2020: 45,  2021: 50  },
          4101: { 2019: 200, 2020: 220, 2021: 240 },
          5101: { 2019: 20,  2020: 22,  2021: 24  },
          // Custom at base 1000 (slot 2)
          1000: { 2019: 5000, 2020: 5500, 2021: 6000 },
          3000: { 2019: 200,  2020: 220,  2021: 240  },  // 1000 + 2000
          5000: { 2019: 1000, 2020: 1100, 2021: 1200 },  // 1000 + 4000
          6000: { 2019: 100,  2020: 110,  2021: 120  },  // 1000 + 5000
        },
      },
    }

    describe('injectExtendedFaAccounts — 4 user-input bands', () => {
      it('Band 1 Acq Begin: writes value at slot row (100 + slotIndex)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0 (base 100)
        expect(fa.getCell('C100').value).toBe(1000)
        expect(fa.getCell('D100').value).toBe(1100)
        expect(fa.getCell('E100').value).toBe(1200)
        // Slot 1 (base 101)
        expect(fa.getCell('C101').value).toBe(800)
        // Slot 2 (custom base 1000) lands on synthetic row 102
        expect(fa.getCell('C102').value).toBe(5000)
      })

      it('Band 2 Acq Add: reads rows[base + 2000] at slot row (140 + slotIndex)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0: rows[2100] → synthetic row 140
        expect(fa.getCell('C140').value).toBe(50)
        expect(fa.getCell('E140').value).toBe(60)
        // Slot 1: rows[2101] → row 141
        expect(fa.getCell('C141').value).toBe(40)
        // Slot 2: rows[3000] → row 142
        expect(fa.getCell('C142').value).toBe(200)
      })

      it('Band 4 Dep Begin: reads rows[base + 4000] at slot row (220 + slotIndex)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0: rows[4100] → row 220
        expect(fa.getCell('C220').value).toBe(300)
        expect(fa.getCell('E220').value).toBe(400)
        // Slot 2: rows[5000] → row 222
        expect(fa.getCell('C222').value).toBe(1000)
      })

      it('Band 5 Dep Add: reads rows[base + 5000] at slot row (260 + slotIndex)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0: rows[5100] → row 260
        expect(fa.getCell('C260').value).toBe(30)
        // Slot 1: rows[5101] → row 261
        expect(fa.getCell('C261').value).toBe(20)
        // Slot 2: rows[6000] → row 262
        expect(fa.getCell('C262').value).toBe(100)
      })
    })

    describe('injectExtendedFaAccounts — 3 formula bands (computed blocks)', () => {
      it('Band 3 Acq End: writes formula =+<col>(100+i)+<col>(140+i)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0 → row 180
        const f0 = (fa.getCell('C180').value as { formula: string }).formula
        expect(f0).toBe('+C100+C140')
        // Slot 2 → row 182
        const f2 = (fa.getCell('D182').value as { formula: string }).formula
        expect(f2).toBe('+D102+D142')
      })

      it('Band 6 Dep End: writes formula =+<col>(220+i)+<col>(260+i)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0 → row 300
        const f0 = (fa.getCell('C300').value as { formula: string }).formula
        expect(f0).toBe('+C220+C260')
        // Slot 1 → row 301
        const f1 = (fa.getCell('E301').value as { formula: string }).formula
        expect(f1).toBe('+E221+E261')
      })

      it('Band 7 Net Value: writes formula =+<col>(180+i)-<col>(300+i)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0 → row 340
        const f0 = (fa.getCell('C340').value as { formula: string }).formula
        expect(f0).toBe('+C180-C300')
        // Slot 2 → row 342
        const f2 = (fa.getCell('D342').value as { formula: string }).formula
        expect(f2).toBe('+D182-D302')
      })
    })

    describe('injectExtendedFaAccounts — slot assignment + labels', () => {
      it('slot index preserves accounts array insertion order', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Order in array: computer_equipment (100) → slot 0 → row 100
        //                 furniture_fixtures (101) → slot 1 → row 101
        //                 custom_asset_x (1000)    → slot 2 → row 102
        expect(fa.getCell('B100').value).toBe('Computer Equipment')
        expect(fa.getCell('B101').value).toBe('Furniture & Fixtures')
        expect(fa.getCell('B102').value).toBe('Custom Alpha')
      })

      it('writes labels to col B in ALL 7 bands (matches template convention)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // Slot 0 = Computer Equipment — appears in all 7 bands
        expect(fa.getCell('B100').value).toBe('Computer Equipment') // Band 1
        expect(fa.getCell('B140').value).toBe('Computer Equipment') // Band 2
        expect(fa.getCell('B180').value).toBe('Computer Equipment') // Band 3
        expect(fa.getCell('B220').value).toBe('Computer Equipment') // Band 4
        expect(fa.getCell('B260').value).toBe('Computer Equipment') // Band 5
        expect(fa.getCell('B300').value).toBe('Computer Equipment') // Band 6
        expect(fa.getCell('B340').value).toBe('Computer Equipment') // Band 7
      })

      it('skips accounts with excelRow < 100 (defensive — legacy positions)', async () => {
        const stateOriginalOnly: ExportableState = {
          ...TEST_STATE,
          fixedAsset: {
            accounts: [
              { catalogId: 'land', excelRow: 8, section: 'fixed_asset' as const },
            ],
            yearCount: 3,
            language: 'en' as const,
            rows: { 8: { 2019: 500, 2020: 600, 2021: 700 } },
          },
        }
        const wb = await simulateExport(stateOriginalOnly)
        const fa = wb.getWorksheet('FIXED ASSET')!
        // No writes in any extended band
        expect(fa.getCell('B100').value).toBeFalsy()
        expect(fa.getCell('C180').value).toBeFalsy()
      })

      it('handles null fixedAsset → no modifications anywhere', async () => {
        const wb = await simulateExport({ ...TEST_STATE, fixedAsset: null })
        const fa = wb.getWorksheet('FIXED ASSET')!
        expect(fa.getCell('B100').value).toBeFalsy()
        expect(fa.getCell('C100').value).toBeFalsy()
      })
    })

    describe('extendFaSectionSubtotals — appends +SUM(band) to 7 subtotals', () => {
      it('C14 Acq Begin subtotal: appends +SUM(<col>100:<col>139) for all year cols', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        for (const col of ['C', 'D', 'E']) {
          const f = (fa.getCell(`${col}14`).value as { formula: string }).formula
          expect(f, `${col}14`).toContain(`SUM(${col}100:${col}139)`)
        }
      })

      it('C23 Acq Add subtotal: appends +SUM(<col>140:<col>179)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C23').value as { formula: string }).formula
        expect(f).toContain('SUM(C140:C179)')
      })

      it('C32 Acq End subtotal: appends +SUM(<col>180:<col>219)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C32').value as { formula: string }).formula
        expect(f).toContain('SUM(C180:C219)')
      })

      it('C42 Dep Begin subtotal: appends +SUM(<col>220:<col>259)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C42').value as { formula: string }).formula
        expect(f).toContain('SUM(C220:C259)')
      })

      it('C51 Dep Add subtotal: appends +SUM(<col>260:<col>299)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C51').value as { formula: string }).formula
        expect(f).toContain('SUM(C260:C299)')
      })

      it('C60 Dep End subtotal: appends +SUM(<col>300:<col>339)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C60').value as { formula: string }).formula
        expect(f).toContain('SUM(C300:C339)')
      })

      it('C69 Net Value subtotal: appends +SUM(<col>340:<col>379)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C69').value as { formula: string }).formula
        expect(f).toContain('SUM(C340:C379)')
      })

      it('preserves original subtotal term (e.g., SUM(C8:C13) for C14)', async () => {
        const wb = await simulateExport(STATE_WITH_EXTENDED_FA)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C14').value as { formula: string }).formula
        expect(f).toContain('SUM(C8:C13)')
      })

      it('empty state (no extended FA) → subtotals unchanged', async () => {
        const stateNoExtended: ExportableState = {
          ...TEST_STATE,
          fixedAsset: {
            accounts: [
              { catalogId: 'land', excelRow: 8, section: 'fixed_asset' as const },
            ],
            yearCount: 3,
            language: 'en' as const,
            rows: { 8: { 2019: 500, 2020: 600, 2021: 700 } },
          },
        }
        const wb = await simulateExport(stateNoExtended)
        const fa = wb.getWorksheet('FIXED ASSET')!
        const f = (fa.getCell('C14').value as { formula: string }).formula
        expect(f).not.toContain('SUM(C100:C139)')
      })
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

    it('strips decorative Tables so Excel has no table metadata to flag', async () => {
      const wb = await simulateExport(TEST_STATE)
      // FINANCIAL RATIO sheet had Table7/8/9/11 in the template; after
      // stripDecorativeTables there should be zero tables anywhere.
      for (const ws of wb.worksheets) {
        const tables = (ws as unknown as { tables?: Record<string, unknown> }).tables
        if (!tables) continue
        expect(Object.keys(tables)).toEqual([])
      }
    })

    it('preserves FINANCIAL RATIO cell values even though Tables are removed', async () => {
      const wb = await simulateExport(TEST_STATE)
      // Row 5 first column (B5) had the Profitability header label in the
      // template. Removing the Table wrapper must not remove the cell.
      const fr = wb.getWorksheet('FINANCIAL RATIO')!
      expect(fr.getCell('B5').value).toBeTruthy()
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

  describe('injectBsCrossRefValues — BS rows 20 & 21 from FA store (Session 026 follow-up)', () => {
    const STATE_WITH_FA: ExportableState = {
      ...TEST_STATE,
      fixedAsset: {
        accounts: [],
        yearCount: 3,
        language: 'en' as const,
        rows: {
          // FA row 32 = Total Ending Acquisition Cost (positive)
          32: { 2019: 1000, 2020: 1500, 2021: 2000 },
          // FA row 60 = Total Ending Accum Depreciation (stored positive in FA)
          60: { 2019: 100, 2020: 250, 2021: 400 },
        },
      },
    }

    it('writes FA row 32 values into BS row 20 as positive numbers', async () => {
      const wb = await simulateExport(STATE_WITH_FA)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      expect(bs.getCell('D20').value).toBe(1000) // 2019 → D
      expect(bs.getCell('E20').value).toBe(1500) // 2020 → E
      expect(bs.getCell('F20').value).toBe(2000) // 2021 → F
    })

    it('writes FA row 60 values into BS row 21 negated (BS convention)', async () => {
      const wb = await simulateExport(STATE_WITH_FA)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      expect(bs.getCell('D21').value).toBe(-100)
      expect(bs.getCell('E21').value).toBe(-250)
      expect(bs.getCell('F21').value).toBe(-400)
    })

    it('preserves BS row 22 formula so Fixed Assets Net recomputes from 20+21', async () => {
      const wb = await simulateExport(STATE_WITH_FA)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      const f = (bs.getCell('D22').value as { formula?: string }).formula
      expect(f).toBe('D20+D21')
    })

    it('leaves BS rows 20 & 21 empty when FA store is null', async () => {
      const wb = await simulateExport(TEST_STATE) // fixedAsset: null
      const bs = wb.getWorksheet('BALANCE SHEET')!
      // No data injected — template already cleared these cells.
      expect(bs.getCell('D20').value).toBeFalsy()
      expect(bs.getCell('D21').value).toBeFalsy()
    })

    it('skips years not present in FA row 32/60 series', async () => {
      const partial: ExportableState = {
        ...TEST_STATE,
        fixedAsset: {
          accounts: [],
          yearCount: 1,
          language: 'en' as const,
          rows: {
            32: { 2021: 777 },
            60: { 2021: 50 },
          },
        },
      }
      const wb = await simulateExport(partial)
      const bs = wb.getWorksheet('BALANCE SHEET')!
      expect(bs.getCell('F20').value).toBe(777)
      expect(bs.getCell('F21').value).toBe(-50)
      // 2019/2020 untouched
      expect(bs.getCell('D20').value).toBeFalsy()
      expect(bs.getCell('E20').value).toBeFalsy()
    })
  })
})
