/**
 * Balance Sheet Account Catalog — single source of truth for:
 * 1. Dropdown options (sorted alphabetically by active language)
 * 2. Backward-compatible excelRow mapping to Excel template
 * 3. Section assignment for dynamic subtotal computation
 *
 * excelRow numbers verified against kka-penilaian-saham.xlsx "BALANCE SHEET" sheet.
 * Custom accounts (user-defined) get excelRow >= 1000.
 */

/** Section dalam Balance Sheet */
export type BsSection =
  | 'current_assets'
  | 'fixed_assets'
  | 'intangible_assets'
  | 'other_non_current_assets'
  | 'current_liabilities'
  | 'non_current_liabilities'
  | 'equity'

/** A pre-defined account in the catalog */
export interface BsCatalogAccount {
  /** Unique slug ID — immutable after creation */
  id: string
  /** English label */
  labelEn: string
  /** Indonesian label */
  labelId: string
  /** Which section this account belongs to */
  section: BsSection
  /** Row number in the Excel template (kka-penilaian-saham.xlsx) */
  excelRow: number
}

/** A user-selected account stored in the Zustand store */
export interface BsAccountEntry {
  /** ID from catalog, or `custom_${timestamp}` for manual entries */
  catalogId: string
  /** excelRow number — from catalog or generated (>=1000) for custom */
  excelRow: number
  /** Section assignment */
  section: BsSection
  /** Custom label (only for manual entries) */
  customLabel?: string
}

// ---------------------------------------------------------------------------
// Catalog data — excelRow verified against Excel "BALANCE SHEET" sheet
// ---------------------------------------------------------------------------

export const BS_CATALOG_ASSETS: readonly BsCatalogAccount[] = [
  // Current Assets (section subtotal = row 16)
  { id: 'cash',               labelEn: 'Cash on Hands',              labelId: 'Kas dan Setara Kas',          section: 'current_assets', excelRow: 8 },
  { id: 'short_term_invest',  labelEn: 'Cash on Bank (Deposit)',     labelId: 'Deposito / Investasi JK Pendek', section: 'current_assets', excelRow: 9 },
  { id: 'account_receivable', labelEn: 'Account Receivable',         labelId: 'Piutang Usaha',               section: 'current_assets', excelRow: 10 },
  { id: 'other_receivable',   labelEn: 'Deposito',                   labelId: 'Deposito',                    section: 'current_assets', excelRow: 11 },
  { id: 'inventory',          labelEn: 'Inventory',                  labelId: 'Persediaan',                  section: 'current_assets', excelRow: 12 },
  { id: 'prepaid_expenses',   labelEn: 'Prepaid Expenses',           labelId: 'Pembayaran Dimuka',           section: 'current_assets', excelRow: 13 },
  { id: 'other_current_assets', labelEn: 'Others - PPn/PPh',         labelId: 'Lainnya - PPn/PPh',           section: 'current_assets', excelRow: 14 },

  // Fixed Assets (sub-section of non-current, subtotal = row 22)
  { id: 'fixed_assets_beginning', labelEn: 'Fixed Assets, Beginning', labelId: 'Aset Tetap, Saldo Awal',    section: 'fixed_assets', excelRow: 20 },
  { id: 'accum_depreciation',     labelEn: 'Accumulated Depreciation', labelId: 'Akumulasi Penyusutan',     section: 'fixed_assets', excelRow: 21 },

  // Other Non-Current Assets (row 23 = leaf, value 0 in prototype but included in C25 formula)
  { id: 'other_non_current', labelEn: 'Other Non-Current Assets',    labelId: 'Aset Tidak Lancar Lainnya',   section: 'other_non_current_assets', excelRow: 23 },

  // Intangible Assets
  { id: 'intangible_assets', labelEn: 'Intangible Assets',           labelId: 'Aset Tak Berwujud',           section: 'intangible_assets', excelRow: 24 },
]

export const BS_CATALOG_LIABILITIES: readonly BsCatalogAccount[] = [
  // Current Liabilities (subtotal = row 35)
  { id: 'short_term_debt',    labelEn: 'Bank Loan - Short Term',     labelId: 'Utang Bank Jangka Pendek',    section: 'current_liabilities', excelRow: 31 },
  { id: 'account_payable',    labelEn: 'Account Payables',           labelId: 'Utang Usaha',                 section: 'current_liabilities', excelRow: 32 },
  { id: 'tax_payable',        labelEn: 'Tax Payable',                labelId: 'Utang Pajak',                 section: 'current_liabilities', excelRow: 33 },
  { id: 'other_current_liab', labelEn: 'Others - Short/Long Term Debt', labelId: 'Lainnya - Utang JK Pendek/Panjang', section: 'current_liabilities', excelRow: 34 },

  // Non-Current Liabilities (subtotal = row 40)
  { id: 'long_term_debt',     labelEn: 'Bank Loan - Long Term',      labelId: 'Utang Bank Jangka Panjang',   section: 'non_current_liabilities', excelRow: 38 },
  { id: 'related_party_debt', labelEn: 'Related Party Payable & Employee Benefits', labelId: 'Utang Pihak Berelasi & Imbalan Kerja', section: 'non_current_liabilities', excelRow: 39 },
]

export const BS_CATALOG_EQUITY: readonly BsCatalogAccount[] = [
  { id: 'paid_in_capital',    labelEn: 'Paid Up Capital',            labelId: 'Modal Disetor',               section: 'equity', excelRow: 43 },
  { id: 'additional_paid_in', labelEn: 'Addition',                   labelId: 'Tambahan Modal Disetor',      section: 'equity', excelRow: 44 },
  { id: 'retained_earnings_beginning', labelEn: 'Retained Earnings - Surplus', labelId: 'Laba Ditahan - Surplus', section: 'equity', excelRow: 46 },
  { id: 'net_income',         labelEn: 'Retained Earnings - Current Profit', labelId: 'Laba Bersih Tahun Berjalan', section: 'equity', excelRow: 47 },
]

/** Combined catalog for lookups */
export const BS_CATALOG_ALL: readonly BsCatalogAccount[] = [
  ...BS_CATALOG_ASSETS,
  ...BS_CATALOG_LIABILITIES,
  ...BS_CATALOG_EQUITY,
]

/** Get account by ID */
export function getCatalogAccount(id: string): BsCatalogAccount | undefined {
  return BS_CATALOG_ALL.find((a) => a.id === id)
}

/** Generate next custom excelRow (>= 1000) */
export function generateCustomExcelRow(existingAccounts: readonly BsAccountEntry[]): number {
  const customRows = existingAccounts
    .filter((a) => a.excelRow >= 1000)
    .map((a) => a.excelRow)
  return customRows.length === 0 ? 1000 : Math.max(...customRows) + 1
}

/** Get catalog accounts for a section, sorted alphabetically by label */
export function getCatalogBySection(
  section: BsSection,
  language: 'en' | 'id',
): BsCatalogAccount[] {
  return BS_CATALOG_ALL
    .filter((a) => a.section === section)
    .sort((a, b) => {
      const labelA = language === 'en' ? a.labelEn : a.labelId
      const labelB = language === 'en' ? b.labelEn : b.labelId
      return labelA.localeCompare(labelB)
    })
}
