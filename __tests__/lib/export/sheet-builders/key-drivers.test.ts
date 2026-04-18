import { describe, expect, it, beforeEach } from 'vitest'
import ExcelJS from 'exceljs'
import { KeyDriversBuilder } from '@/lib/export/sheet-builders/key-drivers'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { KeyDriversState } from '@/lib/store/useKkaStore'
import type { FixedAssetInputState } from '@/data/live/types'
import type { HomeInputs } from '@/types/financial'

function makeWorkbook(): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook()
  wb.addWorksheet('KEY DRIVERS')
  return wb
}

function makeKeyDrivers(overrides: Partial<KeyDriversState> = {}): KeyDriversState {
  return {
    financialDrivers: {
      interestRateShortTerm: 0.08,
      interestRateLongTerm: 0.09,
      bankDepositRate: 0.04,
      corporateTaxRate: 0.22,
    },
    operationalDrivers: {
      salesVolumeBase: 100000,
      salesPriceBase: 500,
      salesVolumeIncrements: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1],
      salesPriceIncrements: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06],
      cogsRatio: 0.6,
      sellingExpenseRatio: 0.05,
      gaExpenseRatio: 0.03,
    },
    bsDrivers: {
      accReceivableDays: [30, 31, 32, 33, 34, 35, 36],
      inventoryDays: [40, 41, 42, 43, 44, 45, 46],
      accPayableDays: [50, 51, 52, 53, 54, 55, 56],
    },
    additionalCapexByAccount: {},
    ...overrides,
  } as KeyDriversState
}

function makeState(overrides: Partial<ExportableState>): ExportableState {
  return {
    home: null,
    balanceSheet: null,
    incomeStatement: null,
    fixedAsset: null,
    accPayables: null,
    wacc: null,
    discountRate: null,
    keyDrivers: makeKeyDrivers(),
    dlom: null,
    dloc: null,
    borrowingCapInput: null,
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: 0, interestBearingDebt: 0,
    ...overrides,
  }
}

describe('KeyDriversBuilder — metadata', () => {
  it('has correct sheetName + upstream', () => {
    expect(KeyDriversBuilder.sheetName).toBe('KEY DRIVERS')
    expect(KeyDriversBuilder.upstream).toEqual(['keyDrivers'])
  })
})

describe('KeyDriversBuilder.build — scalars', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes interestRateShortTerm to C8', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('C8').value).toBe(0.08)
  })

  it('writes corporateTaxRate to C11', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('C11').value).toBe(0.22)
  })

  it('writes salesVolumeBase to D14', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('D14').value).toBe(100000)
  })

  // Session 040 Task #5: cogsRatio stored positive (0.6) → written negative
  // (-0.6) to match template + PROY LR live formula sign convention.
  it('writes cogsRatio scalar to D20 as negated value', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    expect(wb.getWorksheet('KEY DRIVERS')!.getCell('D20').value).toBe(-0.6)
  })
})

describe('KeyDriversBuilder.build — arrays', () => {
  let wb: ExcelJS.Workbook
  beforeEach(() => {
    wb = makeWorkbook()
  })

  it('writes salesVolumeIncrements across E15..J15', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('E15').value).toBe(0.05)
    expect(ws.getCell('J15').value).toBe(0.1)
  })

  it('writes accReceivableDays across D28..J28', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D28').value).toBe(30)
    expect(ws.getCell('J28').value).toBe(36)
  })

  // Session 040 Task #5: projected ratios also negated at export boundary.
  it('expands cogsRatio scalar to E20..J20 via _cogsRatioProjected — negated', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('E20').value).toBe(-0.6)
    expect(ws.getCell('J20').value).toBe(-0.6)
  })

  // Session 036: additionalCapex migrated to dynamic per-account map
  // (additionalCapexByAccount). Old 4-row static injection removed.
  // Dedicated dynamic-account injection deferred to Session 037+.
  it.skip('writes additionalCapex.building across D34..J34 — deprecated Session 036', () => {
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D34').value).toBe(100)
    expect(ws.getCell('J34').value).toBe(700)
  })
})

describe('KeyDriversBuilder.build — edge cases', () => {
  it('missing worksheet — no throw', () => {
    const blankWb = new ExcelJS.Workbook()
    expect(() => KeyDriversBuilder.build(blankWb, makeState({}))).not.toThrow()
  })

  it('idempotent — same output on repeated build', () => {
    const wb = makeWorkbook()
    const state = makeState({})
    KeyDriversBuilder.build(wb, state)
    const first = wb.getWorksheet('KEY DRIVERS')!.getCell('C8').value
    KeyDriversBuilder.build(wb, state)
    const second = wb.getWorksheet('KEY DRIVERS')!.getCell('C8').value
    expect(second).toBe(first)
  })
})

// Session 040 Task #4 — Additional Capex dynamic per-FA-account injection.
describe('KeyDriversBuilder.build — additionalCapexByAccount (Session 040)', () => {
  function makeHome(over: Partial<HomeInputs> = {}): HomeInputs {
    return {
      namaPerusahaan: 'X', npwp: '99.999.999.9-999.000', namaSubjekPajak: 'Y',
      npwpSubjekPajak: '', jenisSubjekPajak: 'badan', jenisPerusahaan: 'tertutup',
      objekPenilaian: 'saham', jenisInformasiPeralihan: 'jualBeli',
      jumlahSahamBeredar: 1000, jumlahSahamYangDinilai: 500,
      nilaiNominalPerSaham: 1, tahunTransaksi: 2022,
      proporsiSaham: 0.5, dlomPercent: 0, dlocPercent: 0,
      ...over,
    } as HomeInputs
  }

  function makeFa(language: 'en' | 'id' = 'en'): FixedAssetInputState {
    return {
      accounts: [
        { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
        { catalogId: 'building', excelRow: 9, section: 'fixed_asset' },
        { catalogId: 'computer_equipment', excelRow: 100, section: 'fixed_asset' },
        { catalogId: 'custom_1000', excelRow: 1000, section: 'fixed_asset', customLabel: 'Proprietary Rig' },
      ],
      yearCount: 3, language, rows: {},
    }
  }

  function seedCapexTemplate(wb: ExcelJS.Workbook): void {
    // Simulate template with residual labels at B33-B36 from the prototipe.
    const ws = wb.getWorksheet('KEY DRIVERS')!
    for (let r = 33; r <= 36; r++) {
      ws.getCell(`B${r}`).value = 'PROTOTIPE_RESIDUE'
    }
  }

  it('writes first FA account label at B33 (en)', () => {
    const wb = makeWorkbook()
    seedCapexTemplate(wb)
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: makeFa('en') }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('B33').value).toBe('Land')
  })

  it('writes all accounts sequentially at rows 33-36 (4 accounts)', () => {
    const wb = makeWorkbook()
    seedCapexTemplate(wb)
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: makeFa('en') }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('B33').value).toBe('Land')
    expect(ws.getCell('B34').value).toBe('Building')
    expect(ws.getCell('B35').value).toBe('Computer Equipment')
    expect(ws.getCell('B36').value).toBe('Proprietary Rig')
  })

  it('writes capex values at D/E/F for each account (3 projection years)', () => {
    const wb = makeWorkbook()
    const kd = makeKeyDrivers({
      additionalCapexByAccount: {
        8:    { 2022: 100, 2023: 110, 2024: 121 },  // Land
        9:    { 2022: 200, 2023: 220, 2024: 242 },  // Building
        100:  { 2022: 50,  2023: 55,  2024: 60 },   // Computer Equipment
        1000: { 2022: 300, 2023: 330, 2024: 363 },  // Custom
      },
    })
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: makeFa('en'), keyDrivers: kd }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    // Row 33 Land: D33=100 (2022), E33=110 (2023), F33=121 (2024)
    expect(ws.getCell('D33').value).toBe(100)
    expect(ws.getCell('E33').value).toBe(110)
    expect(ws.getCell('F33').value).toBe(121)
    // Row 36 custom
    expect(ws.getCell('D36').value).toBe(300)
    expect(ws.getCell('F36').value).toBe(363)
  })

  it('honors language=id for FA label lookup', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: makeFa('id') }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('B33').value).toBe('Tanah')
    expect(ws.getCell('B34').value).toBe('Bangunan')
    expect(ws.getCell('B35').value).toBe('Peralatan Komputer')
  })

  it('account with empty capex series writes label only (no values)', () => {
    const wb = makeWorkbook()
    const kd = makeKeyDrivers({ additionalCapexByAccount: {} }) // no data
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: makeFa('en'), keyDrivers: kd }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('B33').value).toBe('Land')
    for (const col of ['D', 'E', 'F']) {
      expect(ws.getCell(`${col}33`).value == null).toBe(true)
    }
  })

  it('clears prototipe-residue labels at unused rows 35-36 when user has only 2 accounts', () => {
    const wb = makeWorkbook()
    seedCapexTemplate(wb)
    const fa2Acc: FixedAssetInputState = {
      accounts: [
        { catalogId: 'land', excelRow: 8, section: 'fixed_asset' },
        { catalogId: 'building', excelRow: 9, section: 'fixed_asset' },
      ],
      yearCount: 3, language: 'en', rows: {},
    }
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: fa2Acc }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('B33').value).toBe('Land')
    expect(ws.getCell('B34').value).toBe('Building')
    // Rows 35-36: prototipe residue must be cleared
    expect(ws.getCell('B35').value == null).toBe(true)
    expect(ws.getCell('B36').value == null).toBe(true)
  })

  it('skips capex injection entirely when home=null (upstream missing)', () => {
    const wb = makeWorkbook()
    seedCapexTemplate(wb)
    KeyDriversBuilder.build(wb, makeState({ home: null, fixedAsset: makeFa('en') }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    // No injection → template residue remains untouched
    expect(ws.getCell('B33').value).toBe('PROTOTIPE_RESIDUE')
  })

  it('skips capex injection when fixedAsset=null', () => {
    const wb = makeWorkbook()
    seedCapexTemplate(wb)
    KeyDriversBuilder.build(wb, makeState({ home: makeHome(), fixedAsset: null }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('B33').value).toBe('PROTOTIPE_RESIDUE')
  })
})

// Session 040 Task #5 — Sign convention reconciliation.
// Store keeps ratios POSITIVE (LESSON-011); Excel template + live PROY LR
// formulas expect NEGATIVE (so `=D8*'KEY DRIVERS'!D23` yields negative
// selling expense in Projected IS). Reconciled at the export boundary.
describe('KeyDriversBuilder.build — ratio sign reconciliation (Session 040)', () => {
  it('writes cogsRatio as NEGATIVE at D20', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    // Store has 0.6, export must be -0.6 to match template + PROY LR formulas
    expect(ws.getCell('D20').value).toBe(-0.6)
  })

  it('writes sellingExpenseRatio as NEGATIVE at D23', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D23').value).toBe(-0.05)
  })

  it('writes gaExpenseRatio as NEGATIVE at D24', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D24').value).toBe(-0.03)
  })

  it('expands negated cogsRatio across E20-J20 (all same negative)', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    for (const col of ['E', 'F', 'G', 'H', 'I', 'J']) {
      expect(ws.getCell(`${col}20`).value, `${col}20`).toBe(-0.6)
    }
  })

  it('expands negated sellingExpenseRatio across E23-J23', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    for (const col of ['E', 'F', 'G', 'H', 'I', 'J']) {
      expect(ws.getCell(`${col}23`).value, `${col}23`).toBe(-0.05)
    }
  })

  it('expands negated gaExpenseRatio across E24-J24', () => {
    const wb = makeWorkbook()
    KeyDriversBuilder.build(wb, makeState({}))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    for (const col of ['E', 'F', 'G', 'H', 'I', 'J']) {
      expect(ws.getCell(`${col}24`).value, `${col}24`).toBe(-0.03)
    }
  })

  it('handles already-negative input via Math.abs — idempotent', () => {
    const wb = makeWorkbook()
    const kd = makeKeyDrivers({
      operationalDrivers: {
        salesVolumeBase: 100000, salesPriceBase: 500,
        salesVolumeIncrements: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1],
        salesPriceIncrements: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06],
        // Edge case: user somehow has negative stored (pre-convention data)
        cogsRatio: -0.55, sellingExpenseRatio: 0.04, gaExpenseRatio: 0.02,
      },
    })
    KeyDriversBuilder.build(wb, makeState({ keyDrivers: kd }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    // -0.55 → -0.55 (stays negative, abs normalizes first)
    expect(ws.getCell('D20').value).toBe(-0.55)
  })

  it('handles zero ratio — stays 0 (no -0)', () => {
    const wb = makeWorkbook()
    const kd = makeKeyDrivers({
      operationalDrivers: {
        salesVolumeBase: 100000, salesPriceBase: 500,
        salesVolumeIncrements: [0.05, 0.06, 0.07, 0.08, 0.09, 0.1],
        salesPriceIncrements: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06],
        cogsRatio: 0, sellingExpenseRatio: 0, gaExpenseRatio: 0,
      },
    })
    KeyDriversBuilder.build(wb, makeState({ keyDrivers: kd }))
    const ws = wb.getWorksheet('KEY DRIVERS')!
    expect(ws.getCell('D20').value).toBe(0)
    expect(ws.getCell('D23').value).toBe(0)
    expect(ws.getCell('D24').value).toBe(0)
  })
})
