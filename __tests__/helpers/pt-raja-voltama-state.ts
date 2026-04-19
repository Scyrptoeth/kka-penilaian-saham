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

/**
 * Build a year-keyed row grid from a fixture by scanning every cell whose
 * column is in `yearColumns` and whose value (or cached formula result)
 * is numeric. This mirrors the DynamicBsEditor/DynamicIsEditor/DynamicFaEditor
 * persist-time behavior, which stores BOTH leaf inputs AND pre-computed
 * sentinel/subtotal values so downstream builders can read them directly
 * (e.g. `computeNoplatLiveRows` reads IS!row 32 PBT, IS!row 26 Interest
 * Income — both sentinel computed rows). Restricting to leaf rows would
 * leave downstream computes reading 0 for every subtotal.
 */
function buildGrid(
  cells: CellMap,
  yearColumns: Readonly<Record<number, string>>,
): Record<number, Record<number, number>> {
  const colToYear: Record<string, number> = {}
  for (const [y, c] of Object.entries(yearColumns)) colToYear[c] = Number(y)

  const out: Record<number, Record<number, number>> = {}
  for (const addr of Object.keys(cells)) {
    const cell = cells[addr]
    const col = addr.charAt(0)
    if (!(col in colToYear)) continue
    const year = colToYear[col]
    const row = cell.row
    let value: number | null = null
    if (typeof cell.value === 'number') {
      value = cell.value
    }
    if (value === null) continue
    if (!out[row]) out[row] = {}
    out[row][year] = value
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

  // --- Balance Sheet (all rows with numeric year-col values) ---------
  const bsYearCols = { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' }
  const bsRows = buildGrid(bs, bsYearCols)

  // --- Income Statement (all rows: leaves + sentinel subtotals) ------
  const isYearCols = { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' }
  const isRows = buildGrid(is, isYearCols)

  // --- Fixed Asset (all rows: 7 bands + subtotals) -------------------
  const faYearCols = { 2019: 'C', 2020: 'D', 2021: 'E' }
  const faRows = buildGrid(fa, faYearCols)

  // --- Acc Payables (all rows) ---------------------------------------
  const apYearCols = { 2019: 'C', 2020: 'D', 2021: 'E' }
  const apRows = buildGrid(ap, apYearCols)

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
    accPayables: {
      // Session 042 Task 4 migration shape: default 1 ST + 1 LT schedule,
      // fixture's legacy flat rows mapped onto baseline rows 9/10/12/18/19/21.
      schedules: [
        { id: 'st_default', section: 'st_bank_loans', slotIndex: 0 },
        { id: 'lt_default', section: 'lt_bank_loans', slotIndex: 0 },
      ],
      rows: apRows,
    },
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
        // Store convention: ratios are POSITIVE (LESSON-011) — compute
        // adapters apply sign internally. Fixture/template has them as
        // negative percentages (display convention). abs() bridges the gap.
        cogsRatio: Math.abs(num(kd, 'D20')),
        sellingExpenseRatio: Math.abs(num(kd, 'D23')),
        gaExpenseRatio: Math.abs(num(kd, 'D24')),
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
    // Session 041 Task 5: IBD scope confirmed with empty exclusion sets — every
    // CL/NCL account counts toward IBD (matches the legacy Session 038
    // behaviour where the full numeric IBD was provided manually).
    interestBearingDebt: {
      excludedCurrentLiabilities: [],
      excludedNonCurrentLiabilities: [],
    },
    // Session 039: WC scope confirmed with empty exclusion sets.
    changesInWorkingCapital: {
      excludedCurrentAssets: [],
      excludedCurrentLiabilities: [],
    },
    // Session 054 — growthRevenue slice (null = not visited by user; row 40/41
    // remain absent in output, matching template behavior)
    growthRevenue: null,
    // Session 055 — Invested Capital scope. To match legacy ROIC behavior where
    // row 10 (Less Excess Cash) = -BS[8], confirm scope with BS row 8 curated
    // as Excess Cash. Other Non-Op + Marketable stay empty (template default 0).
    investedCapital: {
      otherNonOperatingAssets: [],
      excessCash: [{ source: 'bs', excelRow: 8 }],
      marketableSecurities: [],
    },
    // Session 055 — Cash Balance scope. Legacy CFS used BS rows [8, 9]
    // (Cash on Hand + Cash in Bank) for both Beginning and Ending. Reconstruct
    // with those 2 accounts to maintain Phase C numeric parity.
    cashBalance: {
      accounts: [8, 9],
    },
    // Session 055 — Cash Account split. Legacy CFS row 35 (Cash in Bank) = BS[9],
    // row 36 (Cash on Hand) = BS[8]. Reconstruct the split faithfully.
    cashAccount: {
      bank: [9],
      cashOnHand: [8],
    },
  } as ExportableState
}
