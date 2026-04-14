/**
 * Cell Mapping Registry — single source of truth for Excel ↔ Zustand store
 * mapping. Used by both export (store → Excel) and upload (Excel → store).
 *
 * Cell positions verified against kka-penilaian-saham.xlsx via ExcelJS
 * (Session 018 brainstorm analysis).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single scalar cell mapping (one store field ↔ one Excel cell). */
export interface ScalarCellMapping {
  kind: 'scalar'
  storeSlice: string
  storeField: string
  excelSheet: string
  excelCell: string
  valueType: 'string' | 'number'
  /** When export writes to Excel, apply this transform to the store value. */
  exportTransform?: 'multiplyBy100'
}

/**
 * Year-keyed grid mapping: a set of leaf rows × year columns.
 * Used for BS, IS, FA where data is `Record<excelRow, YearKeyedSeries>`.
 */
export interface GridCellMapping {
  kind: 'grid'
  storeSlice: string
  excelSheet: string
  /** Leaf rows that are user-editable (no computedFrom). */
  leafRows: readonly number[]
  /** Year → Excel column letter. */
  yearColumns: Readonly<Record<number, string>>
}

/**
 * Array cell mapping for projection-year arrays.
 * E.g. salesVolumeIncrements stored in E15,F15,...,J15.
 */
export interface ArrayCellMapping {
  kind: 'array'
  storeSlice: string
  storeField: string
  excelSheet: string
  /** Start cell, then extend rightward for each element. */
  startColumn: string
  row: number
  /** Number of elements expected. */
  length: number
}

/**
 * Dynamic rows mapping for variable-length arrays (e.g. WACC companies).
 * Rows start at `startRow` and extend downward. Unused rows are cleared.
 */
export interface DynamicRowsMapping {
  kind: 'dynamicRows'
  storeSlice: string
  storeField: string
  excelSheet: string
  startRow: number
  /** Max rows available in the template. */
  maxRows: number
  /** Column letter → sub-field name within each array element. */
  columns: Record<string, string>
  /** When export writes to Excel, apply this transform to specific columns. */
  columnTransforms?: Record<string, 'multiplyBy100'>
}

export type CellMapping =
  | ScalarCellMapping
  | GridCellMapping
  | ArrayCellMapping
  | DynamicRowsMapping

// ---------------------------------------------------------------------------
// Column helpers
// ---------------------------------------------------------------------------

/** Convert column letter to 1-based index. A=1, B=2, ..., Z=26. */
export function colLetterToIndex(letter: string): number {
  return letter.charCodeAt(0) - 64
}

/** Convert 1-based index to column letter. 1=A, 2=B, ..., 26=Z. */
export function colIndexToLetter(index: number): string {
  return String.fromCharCode(64 + index)
}

/** Get column letter offset from a starting letter. E.g. offsetCol('E', 2) → 'G'. */
export function offsetCol(startCol: string, offset: number): string {
  return colIndexToLetter(colLetterToIndex(startCol) + offset)
}

// ---------------------------------------------------------------------------
// HOME mappings
// ---------------------------------------------------------------------------

const HOME_SCALARS: ScalarCellMapping[] = [
  { kind: 'scalar', storeSlice: 'home', storeField: 'namaPerusahaan', excelSheet: 'HOME', excelCell: 'B4', valueType: 'string' },
  { kind: 'scalar', storeSlice: 'home', storeField: 'jenisPerusahaan', excelSheet: 'HOME', excelCell: 'B5', valueType: 'string' },
  { kind: 'scalar', storeSlice: 'home', storeField: 'jumlahSahamBeredar', excelSheet: 'HOME', excelCell: 'B6', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'home', storeField: 'jumlahSahamYangDinilai', excelSheet: 'HOME', excelCell: 'B7', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'home', storeField: 'tahunTransaksi', excelSheet: 'HOME', excelCell: 'B9', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'home', storeField: 'objekPenilaian', excelSheet: 'HOME', excelCell: 'B12', valueType: 'string' },
  // npwp: NOT IN EXCEL — skip
  // nilaiNominalPerSaham: NOT IN EXCEL — skip
  // dlomPercent, dlocPercent: formula cells B15/B16 — skip (auto-computed)
]

// ---------------------------------------------------------------------------
// Financial statement grids (BS, IS, FA)
// ---------------------------------------------------------------------------

const BALANCE_SHEET_GRID: GridCellMapping = {
  kind: 'grid',
  storeSlice: 'balanceSheet',
  excelSheet: 'BALANCE SHEET',
  leafRows: [8, 9, 10, 11, 12, 13, 14, 20, 21, 24, 31, 32, 33, 34, 38, 39, 43, 44, 46, 47],
  yearColumns: { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' },
}

const INCOME_STATEMENT_GRID: GridCellMapping = {
  kind: 'grid',
  storeSlice: 'incomeStatement',
  excelSheet: 'INCOME STATEMENT',
  leafRows: [6, 7, 12, 13, 21, 26, 27, 30, 33],
  yearColumns: { 2018: 'C', 2019: 'D', 2020: 'E', 2021: 'F' },
}

const FIXED_ASSET_GRID: GridCellMapping = {
  kind: 'grid',
  storeSlice: 'fixedAsset',
  excelSheet: 'FIXED ASSET',
  leafRows: [
    8, 9, 10, 11, 12, 13,    // Acquisition Beginning
    17, 18, 19, 20, 21, 22,   // Acquisition Additions
    36, 37, 38, 39, 40, 41,   // Depreciation Beginning
    45, 46, 47, 48, 49, 50,   // Depreciation Additions
  ],
  yearColumns: { 2019: 'C', 2020: 'D', 2021: 'E' },
}

// ---------------------------------------------------------------------------
// KEY DRIVERS
// ---------------------------------------------------------------------------

const KEY_DRIVERS_SCALARS: ScalarCellMapping[] = [
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'financialDrivers.interestRateShortTerm', excelSheet: 'KEY DRIVERS', excelCell: 'C8', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'financialDrivers.interestRateLongTerm', excelSheet: 'KEY DRIVERS', excelCell: 'C9', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'financialDrivers.bankDepositRate', excelSheet: 'KEY DRIVERS', excelCell: 'C10', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'financialDrivers.corporateTaxRate', excelSheet: 'KEY DRIVERS', excelCell: 'C11', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.salesVolumeBase', excelSheet: 'KEY DRIVERS', excelCell: 'D14', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.salesPriceBase', excelSheet: 'KEY DRIVERS', excelCell: 'D17', valueType: 'number' },
  // COGS/selling/GA ratios — overwrite Excel formulas with user values
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.cogsRatio', excelSheet: 'KEY DRIVERS', excelCell: 'D20', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.sellingExpenseRatio', excelSheet: 'KEY DRIVERS', excelCell: 'D23', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.gaExpenseRatio', excelSheet: 'KEY DRIVERS', excelCell: 'D24', valueType: 'number' },
]

const KEY_DRIVERS_ARRAYS: ArrayCellMapping[] = [
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.salesVolumeIncrements', excelSheet: 'KEY DRIVERS', startColumn: 'E', row: 15, length: 6 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'operationalDrivers.salesPriceIncrements', excelSheet: 'KEY DRIVERS', startColumn: 'E', row: 18, length: 6 },
  // Projected ratios (E-J) — copy the scalar ratio across all projection years
  { kind: 'array', storeSlice: 'keyDrivers', storeField: '_cogsRatioProjected', excelSheet: 'KEY DRIVERS', startColumn: 'E', row: 20, length: 6 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: '_sellingExpenseRatioProjected', excelSheet: 'KEY DRIVERS', startColumn: 'E', row: 23, length: 6 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: '_gaExpenseRatioProjected', excelSheet: 'KEY DRIVERS', startColumn: 'E', row: 24, length: 6 },
  // Working capital days (D-J = 7 columns)
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'bsDrivers.accReceivableDays', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 28, length: 7 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'bsDrivers.inventoryDays', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 29, length: 7 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'bsDrivers.accPayableDays', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 30, length: 7 },
  // Additional capex (D-J = 7 columns)
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'additionalCapex.land', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 33, length: 7 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'additionalCapex.building', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 34, length: 7 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'additionalCapex.equipment', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 35, length: 7 },
  { kind: 'array', storeSlice: 'keyDrivers', storeField: 'additionalCapex.others', excelSheet: 'KEY DRIVERS', startColumn: 'D', row: 36, length: 7 },
]

// ---------------------------------------------------------------------------
// WACC
// ---------------------------------------------------------------------------

const WACC_SCALARS: ScalarCellMapping[] = [
  { kind: 'scalar', storeSlice: 'wacc', storeField: 'marketParams.equityRiskPremium', excelSheet: 'WACC', excelCell: 'B4', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'wacc', storeField: 'marketParams.ratingBasedDefaultSpread', excelSheet: 'WACC', excelCell: 'B5', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'wacc', storeField: 'marketParams.riskFree', excelSheet: 'WACC', excelCell: 'B6', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'wacc', storeField: 'waccOverride', excelSheet: 'WACC', excelCell: 'E22', valueType: 'number' },
]

const WACC_COMPANIES: DynamicRowsMapping = {
  kind: 'dynamicRows',
  storeSlice: 'wacc',
  storeField: 'comparableCompanies',
  excelSheet: 'WACC',
  startRow: 11,
  maxRows: 10,
  columns: { A: 'name', B: 'betaLevered', C: 'marketCap', D: 'debt' },
}

const WACC_BANK_RATES: DynamicRowsMapping = {
  kind: 'dynamicRows',
  storeSlice: 'wacc',
  storeField: 'bankRates',
  excelSheet: 'WACC',
  startRow: 27,
  maxRows: 10,
  columns: { A: 'name', B: 'rate' },
}

// ---------------------------------------------------------------------------
// DISCOUNT RATE
// ---------------------------------------------------------------------------

const DISCOUNT_RATE_SCALARS: ScalarCellMapping[] = [
  { kind: 'scalar', storeSlice: 'discountRate', storeField: 'taxRate', excelSheet: 'DISCOUNT RATE', excelCell: 'C2', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'discountRate', storeField: 'riskFree', excelSheet: 'DISCOUNT RATE', excelCell: 'C3', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'discountRate', storeField: 'beta', excelSheet: 'DISCOUNT RATE', excelCell: 'C4', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'discountRate', storeField: 'equityRiskPremium', excelSheet: 'DISCOUNT RATE', excelCell: 'C5', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'discountRate', storeField: 'countryDefaultSpread', excelSheet: 'DISCOUNT RATE', excelCell: 'C6', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'discountRate', storeField: 'derIndustry', excelSheet: 'DISCOUNT RATE', excelCell: 'C8', valueType: 'number' },
]

const DISCOUNT_RATE_BANK_RATES: DynamicRowsMapping = {
  kind: 'dynamicRows',
  storeSlice: 'discountRate',
  storeField: 'bankRates',
  excelSheet: 'DISCOUNT RATE',
  startRow: 6,
  maxRows: 10,
  columns: { K: 'name', L: 'rate' },
  columnTransforms: { L: 'multiplyBy100' },
}

// ---------------------------------------------------------------------------
// DLOM / DLOC
// ---------------------------------------------------------------------------

/** DLOM answers sit at F7, F9, F11, F13, F15, F17, F19, F21, F23, F25 (odd rows 7-25). */
const DLOM_ANSWER_ROWS = [7, 9, 11, 13, 15, 17, 19, 21, 23, 25] as const

const DLOM_SCALARS: ScalarCellMapping[] = [
  // kepemilikan → C31 ("Mayoritas" / "Minoritas")
  { kind: 'scalar', storeSlice: 'dlom', storeField: 'kepemilikan', excelSheet: 'DLOM', excelCell: 'C31', valueType: 'string' },
]

/** DLOC answers sit at E7, E9, E11, E13, E15 (odd rows 7-15). */
const DLOC_ANSWER_ROWS = [7, 9, 11, 13, 15] as const

const DLOC_SCALARS: ScalarCellMapping[] = [
  // kepemilikan → B21 ("Mayoritas" / "Minoritas")
  { kind: 'scalar', storeSlice: 'dloc', storeField: 'kepemilikan', excelSheet: 'DLOC(PFC)', excelCell: 'B21', valueType: 'string' },
]

// ---------------------------------------------------------------------------
// BORROWING CAP
// ---------------------------------------------------------------------------

const BORROWING_CAP_SCALARS: ScalarCellMapping[] = [
  { kind: 'scalar', storeSlice: 'borrowingCapInput', storeField: 'piutangCalk', excelSheet: 'BORROWING CAP', excelCell: 'D5', valueType: 'number' },
  { kind: 'scalar', storeSlice: 'borrowingCapInput', storeField: 'persediaanCalk', excelSheet: 'BORROWING CAP', excelCell: 'D6', valueType: 'number' },
]

// ---------------------------------------------------------------------------
// Standalone scalars (not in a dedicated sheet)
// ---------------------------------------------------------------------------

const STANDALONE_SCALARS: ScalarCellMapping[] = [
  // nilaiPengalihanDilaporkan → SIMULASI POTENSI (AAM)!E11
  { kind: 'scalar', storeSlice: '_root', storeField: 'nilaiPengalihanDilaporkan', excelSheet: 'SIMULASI POTENSI (AAM)', excelCell: 'E11', valueType: 'number' },
  // WACC taxRate → IS!B33 (used by WACC Hamada equation formulas)
  { kind: 'scalar', storeSlice: 'wacc', storeField: 'taxRate', excelSheet: 'INCOME STATEMENT', excelCell: 'B33', valueType: 'number' },
]

/**
 * BS row number → AAM Excel D-column row number.
 * Used to inject per-row adjustments from aamAdjustments store into AAM sheet.
 * Derived from prompt-session-016 AAM sheet analysis.
 */
export const BS_ROW_TO_AAM_D_ROW: Readonly<Record<number, number>> = {
  8: 9,    // Cash on Hands
  9: 10,   // Cash in Banks
  10: 11,  // Account Receivable
  11: 12,  // Other Receivable
  12: 13,  // Inventory
  14: 14,  // Others (Current Assets)
  22: 20,  // Fixed Asset Net
  23: 21,  // Other Non-Current Assets
  31: 28,  // Bank Loan (Short Term)
  32: 29,  // Account Payable
  33: 30,  // Tax Payable
  34: 31,  // Others Current Liabilities
  38: 35,  // Bank Loan (Long Term)
  39: 36,  // Related Party NCL
}

// ---------------------------------------------------------------------------
// Combined registry
// ---------------------------------------------------------------------------

export const ALL_SCALAR_MAPPINGS: readonly ScalarCellMapping[] = [
  ...HOME_SCALARS,
  ...KEY_DRIVERS_SCALARS,
  ...WACC_SCALARS,
  ...DISCOUNT_RATE_SCALARS,
  ...DLOM_SCALARS,
  ...DLOC_SCALARS,
  ...BORROWING_CAP_SCALARS,
  ...STANDALONE_SCALARS,
]

export const ALL_GRID_MAPPINGS: readonly GridCellMapping[] = [
  BALANCE_SHEET_GRID,
  INCOME_STATEMENT_GRID,
  FIXED_ASSET_GRID,
]

export const ALL_ARRAY_MAPPINGS: readonly ArrayCellMapping[] = [
  ...KEY_DRIVERS_ARRAYS,
]

export const ALL_DYNAMIC_ROWS_MAPPINGS: readonly DynamicRowsMapping[] = [
  WACC_COMPANIES,
  WACC_BANK_RATES,
  DISCOUNT_RATE_BANK_RATES,
]

export { DLOM_ANSWER_ROWS, DLOC_ANSWER_ROWS }

/** All store slices that have at least one cell mapping. */
export const MAPPED_STORE_SLICES = [
  'home',
  'balanceSheet',
  'incomeStatement',
  'fixedAsset',
  'keyDrivers',
  'wacc',
  'discountRate',
  'dlom',
  'dloc',
  'borrowingCapInput',
  '_root', // aamAdjustments, nilaiPengalihanDilaporkan
] as const
