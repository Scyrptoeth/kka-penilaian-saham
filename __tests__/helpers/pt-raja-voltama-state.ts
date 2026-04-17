/**
 * Fixture-to-state adapter — reconstructs the full `ExportableState` shape
 * that Phase C verification feeds through the complete export pipeline.
 *
 * The PT Raja Voltama Elektrik data is the origin both of the template
 * (`public/templates/kka-template.xlsx`) and of the per-sheet fixtures in
 * `__tests__/fixtures/` (extracted via `scripts/extract-fixtures.py`).
 * Feeding a state reconstructed from those fixtures back through
 * `exportToXlsx` MUST yield a workbook cell-by-cell equivalent to the
 * template, modulo a small set of known divergences (sanitizer touches,
 * visibility flips, table-strip).
 *
 * For BS/IS/FA the `accounts` array is intentionally EMPTY:
 *   - PT Raja Voltama has no user-defined extended accounts (excelRow ≥ 100)
 *   - With accounts=[], `writeXxxLabels` writes nothing, leaving template
 *     col B labels untouched (catalog labelEn often differs from the
 *     template's localized label)
 *   - `injectExtended*` helpers short-circuit when no excelRow ≥ 100 exist
 *
 * Numeric values are derived from the per-sheet fixture JSONs; the
 * `rows` grids honor the `leafRows`/`yearColumns` from `cell-mapping.ts`.
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ExportableState } from '@/lib/export/export-xlsx'
import type { KepemilikanType } from '@/types/questionnaire'

const FIXTURES_DIR = resolve(__dirname, '../fixtures')

interface FixtureCell {
  addr: string
  row: number
  col: number
  value?: number | string | boolean | null
  formula?: string | null
  data_type?: string
}

type CellMap = Record<string, FixtureCell>

function loadFixture(name: string): CellMap {
  const raw = readFileSync(resolve(FIXTURES_DIR, `${name}.json`), 'utf8')
  const data = JSON.parse(raw) as { cells: FixtureCell[] }
  const map: CellMap = {}
  for (const c of data.cells) map[c.addr] = c
  return map
}

function num(cells: CellMap, addr: string): number {
  const c = cells[addr]
  if (!c || typeof c.value !== 'number') return 0
  return c.value
}

function str(cells: CellMap, addr: string): string {
  const c = cells[addr]
  if (!c || typeof c.value !== 'string') return ''
  return c.value
}

function buildGrid(
  cells: CellMap,
  leafRows: readonly number[],
  yearColumns: Readonly<Record<number, string>>,
): Record<number, Record<number, number>> {
  const out: Record<number, Record<number, number>> = {}
  for (const row of leafRows) {
    out[row] = {}
    for (const [yearStr, col] of Object.entries(yearColumns)) {
      const year = Number(yearStr)
      out[row][year] = num(cells, `${col}${row}`)
    }
  }
  return out
}

function colOffset(startCol: string, offset: number): string {
  return String.fromCharCode(startCol.charCodeAt(0) + offset)
}

function readArray(
  cells: CellMap,
  startCol: string,
  row: number,
  length: number,
): number[] {
  const out: number[] = []
  for (let i = 0; i < length; i++) {
    out.push(num(cells, `${colOffset(startCol, i)}${row}`))
  }
  return out
}

/**
 * Reads every fixture and assembles the complete ExportableState that
 * matches the PT Raja Voltama template content.
 */
export function loadPtRajaVoltamaState(): ExportableState {
  const home = loadFixture('home')
  const bs = loadFixture('balance-sheet')
  const is = loadFixture('income-statement')
  const fa = loadFixture('fixed-asset')
  const ap = loadFixture('acc-payables')
  const wacc = loadFixture('wacc')
  const dr = loadFixture('discount-rate')
  const kd = loadFixture('key-drivers')
  const dlom = loadFixture('dlom')
  const dloc = loadFixture('dloc-pfc')
  const bc = loadFixture('borrowing-cap')
  const sim = loadFixture('simulasi-potensi-aam')

  // --- Balance Sheet --------------------------------------------------
  // Mirrors BALANCE_SHEET_GRID.leafRows + yearColumns in cell-mapping.ts
  const bsLeafRows = [
    8, 9, 10, 11, 12, 13, 14, 20, 21, 24, 31, 32, 33, 34, 38, 39, 43, 44, 46, 47,
  ]
  const bsYearCols = { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' }
  const bsRows = buildGrid(bs, bsLeafRows, bsYearCols)

  // --- Income Statement -----------------------------------------------
  const isLeafRows = [6, 7, 12, 13, 21, 26, 27, 30, 33]
  const isYearCols = { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' }
  const isRows = buildGrid(is, isLeafRows, isYearCols)

  // --- Fixed Asset ----------------------------------------------------
  // 4 bands: Acq Begin (8-13), Acq Add (17-22), Dep Begin (36-41), Dep Add (45-50)
  const faLeafRows = [
    8, 9, 10, 11, 12, 13,
    17, 18, 19, 20, 21, 22,
    36, 37, 38, 39, 40, 41,
    45, 46, 47, 48, 49, 50,
  ]
  const faYearCols = { 2019: 'C', 2020: 'D', 2021: 'E' }
  const faRows = buildGrid(fa, faLeafRows, faYearCols)

  // --- Acc Payables ---------------------------------------------------
  const apLeafRows = [10, 11, 14, 19, 20, 23]
  const apYearCols = { 2019: 'C', 2020: 'D', 2021: 'E' }
  const apRows = buildGrid(ap, apLeafRows, apYearCols)

  // --- WACC comparable companies (rows 11-13 only; 14+ are avgs/formulas)
  const comparableCompanies: { name: string; betaLevered: number; marketCap: number; debt: number }[] = []
  for (let r = 11; r <= 13; r++) {
    const name = str(wacc, `A${r}`)
    if (!name) continue
    comparableCompanies.push({
      name,
      betaLevered: num(wacc, `B${r}`),
      marketCap: num(wacc, `C${r}`),
      debt: num(wacc, `D${r}`),
    })
  }

  // --- WACC bank rates (rows 27-29 only; 30 is avg)
  const waccBankRates: { name: string; rate: number }[] = []
  for (let r = 27; r <= 29; r++) {
    const name = str(wacc, `A${r}`)
    if (!name) continue
    waccBankRates.push({ name, rate: num(wacc, `B${r}`) })
  }

  // --- DR bank rates (rows 6-10 only; 11 is AVERAGE)
  // Fixture stores EXPORTED form (rate × 100). Reverse transform to raw.
  const drBankRates: { name: string; rate: number }[] = []
  for (let r = 6; r <= 10; r++) {
    const name = str(dr, `K${r}`)
    if (!name) continue
    drBankRates.push({ name, rate: num(dr, `L${r}`) / 100 })
  }

  return {
    home: {
      namaPerusahaan: str(home, 'B4'),
      npwp: str(home, 'D4'),
      namaSubjekPajak: '',
      npwpSubjekPajak: '',
      jenisSubjekPajak: 'badan',
      jenisPerusahaan: (str(home, 'B5') || 'tertutup') as 'tertutup' | 'terbuka',
      objekPenilaian: (str(home, 'B12') || 'saham') as 'saham' | 'modal',
      jenisInformasiPeralihan: 'kemungkinan',
      jumlahSahamBeredar: num(home, 'B6'),
      jumlahSahamYangDinilai: num(home, 'B7'),
      nilaiNominalPerSaham: 1,
      tahunTransaksi: num(home, 'B9'),
      dlomPercent: 0,
      dlocPercent: 0,
    },
    balanceSheet: {
      accounts: [],
      yearCount: 4,
      language: 'en',
      rows: bsRows,
    },
    incomeStatement: {
      accounts: [],
      yearCount: 4,
      language: 'en',
      rows: isRows,
    },
    fixedAsset: {
      accounts: [],
      yearCount: 3,
      language: 'en',
      rows: faRows,
    },
    accPayables: { rows: apRows },
    wacc: {
      marketParams: {
        equityRiskPremium: num(wacc, 'B4'),
        ratingBasedDefaultSpread: num(wacc, 'B5'),
        riskFree: num(wacc, 'B6'),
      },
      comparableCompanies,
      // Tax rate for Hamada equation. PT Raja Voltama template leaves
      // IS!B33 empty in the fixture; use DR.taxRate (= 0.22) as a
      // reasonable stand-in. Value drives WACC Hamada formula only.
      taxRate: num(dr, 'C2'),
      bankRates: waccBankRates,
      waccOverride: num(wacc, 'E22') || null,
    },
    discountRate: {
      taxRate: num(dr, 'C2'),
      riskFree: num(dr, 'C3'),
      beta: num(dr, 'C4'),
      equityRiskPremium: num(dr, 'C5'),
      countryDefaultSpread: num(dr, 'C6'),
      derIndustry: num(dr, 'C8'),
      bankRates: drBankRates,
    },
    keyDrivers: {
      financialDrivers: {
        interestRateShortTerm: num(kd, 'C8'),
        interestRateLongTerm: num(kd, 'C9'),
        bankDepositRate: num(kd, 'C10'),
        corporateTaxRate: num(kd, 'C11'),
      },
      operationalDrivers: {
        salesVolumeBase: num(kd, 'D14'),
        salesPriceBase: num(kd, 'D17'),
        salesVolumeIncrements: readArray(kd, 'E', 15, 6),
        salesPriceIncrements: readArray(kd, 'E', 18, 6),
        cogsRatio: num(kd, 'D20'),
        sellingExpenseRatio: num(kd, 'D23'),
        gaExpenseRatio: num(kd, 'D24'),
      },
      bsDrivers: {
        accReceivableDays: readArray(kd, 'D', 28, 7),
        inventoryDays: readArray(kd, 'D', 29, 7),
        accPayableDays: readArray(kd, 'D', 30, 7),
      },
      additionalCapex: {
        land: readArray(kd, 'D', 33, 7),
        building: readArray(kd, 'D', 34, 7),
        equipment: readArray(kd, 'D', 35, 7),
        others: readArray(kd, 'D', 36, 7),
      },
    },
    dlom: {
      answers: {
        1: str(dlom, 'F7'),
        2: str(dlom, 'F9'),
        3: str(dlom, 'F11'),
        4: str(dlom, 'F13'),
        5: str(dlom, 'F15'),
        6: str(dlom, 'F17'),
        7: str(dlom, 'F19'),
        8: str(dlom, 'F21'),
        9: str(dlom, 'F23'),
        10: str(dlom, 'F25'),
      },
      kepemilikan: (str(dlom, 'C31').toLowerCase() || 'mayoritas') as KepemilikanType,
      percentage: 0,
    },
    dloc: {
      answers: {
        1: str(dloc, 'E7'),
        2: str(dloc, 'E9'),
        3: str(dloc, 'E11'),
        4: str(dloc, 'E13'),
        5: str(dloc, 'E15'),
      },
      kepemilikan: (str(dloc, 'B21').toLowerCase() || 'mayoritas') as KepemilikanType,
      percentage: 0,
    },
    borrowingCapInput: {
      piutangCalk: num(bc, 'D5'),
      persediaanCalk: num(bc, 'D6'),
    },
    aamAdjustments: {},
    nilaiPengalihanDilaporkan: num(sim, 'E11'),
  }
}
