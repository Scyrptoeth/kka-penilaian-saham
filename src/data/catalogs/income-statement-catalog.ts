/**
 * Income Statement Account Catalog — 5 sections with bilingual accounts.
 *
 * Original IS leaf rows (6, 7, 12, 13, 26, 27, 30) are mapped to EXTENDED
 * excelRow ranges so the original positions become section-subtotal sentinels
 * for downstream compatibility:
 *
 *   Sentinel row 6  = Revenue total
 *   Sentinel row 7  = COGS total
 *   Sentinel row 15 = OpEx total
 *   Sentinel row 26 = Interest Income total
 *   Sentinel row 27 = Interest Expense total
 *   Sentinel row 28 = Net Interest (computed: 26 − 27)
 *   Sentinel row 30 = Non-Operating total
 *
 * Rows 21 (Depreciation) and 33 (Tax) are fixed leaves — not in any section.
 *
 * excelRow ranges per section:
 *   100-119 : Revenue
 *   200-219 : Cost (COGS)
 *   300-319 : Operating Expense
 *   400-419 : Non-Operating
 *   500-519 : Net Interest
 *   >= 1000 : user custom accounts
 */

export type IsSection =
  | 'revenue'
  | 'cost'
  | 'operating_expense'
  | 'non_operating'
  | 'net_interest'

export interface IsCatalogAccount {
  id: string
  labelEn: string
  labelId: string
  section: IsSection
  excelRow: number
  /** For net_interest accounts: determines sign in Net Interest computation */
  interestType?: 'income' | 'expense'
}

export interface IsAccountEntry {
  catalogId: string
  excelRow: number
  section: IsSection
  interestType?: 'income' | 'expense'
  customLabel?: string
}

// ---------------------------------------------------------------------------
// Revenue accounts (excelRow 100-119)
// ---------------------------------------------------------------------------

const REVENUE_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'revenue', labelEn: 'Revenue', labelId: 'Pendapatan Usaha', section: 'revenue', excelRow: 100 },
  { id: 'product_sales', labelEn: 'Product Sales', labelId: 'Penjualan Produk', section: 'revenue', excelRow: 101 },
  { id: 'service_revenue', labelEn: 'Service Revenue', labelId: 'Pendapatan Jasa', section: 'revenue', excelRow: 102 },
  { id: 'construction_revenue', labelEn: 'Construction Revenue', labelId: 'Pendapatan Konstruksi', section: 'revenue', excelRow: 103 },
  { id: 'rental_income', labelEn: 'Rental Income', labelId: 'Pendapatan Sewa', section: 'revenue', excelRow: 104 },
  { id: 'commission_income', labelEn: 'Commission Income', labelId: 'Pendapatan Komisi', section: 'revenue', excelRow: 105 },
  { id: 'royalty_income', labelEn: 'Royalty Income', labelId: 'Pendapatan Royalti', section: 'revenue', excelRow: 106 },
  { id: 'subscription_revenue', labelEn: 'Subscription Revenue', labelId: 'Pendapatan Langganan', section: 'revenue', excelRow: 107 },
  { id: 'other_revenue', labelEn: 'Other Revenue', labelId: 'Pendapatan Lain-lain', section: 'revenue', excelRow: 108 },
]

// ---------------------------------------------------------------------------
// Cost (COGS) accounts (excelRow 200-219)
// ---------------------------------------------------------------------------

const COST_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'cogs', labelEn: 'Cost of Goods Sold', labelId: 'Beban Pokok Penjualan', section: 'cost', excelRow: 200 },
  { id: 'raw_materials', labelEn: 'Raw Materials', labelId: 'Bahan Baku', section: 'cost', excelRow: 201 },
  { id: 'direct_labor', labelEn: 'Direct Labor', labelId: 'Tenaga Kerja Langsung', section: 'cost', excelRow: 202 },
  { id: 'manufacturing_overhead', labelEn: 'Manufacturing Overhead', labelId: 'Overhead Pabrik', section: 'cost', excelRow: 203 },
  { id: 'freight_shipping', labelEn: 'Freight & Shipping', labelId: 'Ongkos Kirim & Pengiriman', section: 'cost', excelRow: 204 },
  { id: 'subcontractor_cost', labelEn: 'Subcontractor Cost', labelId: 'Biaya Subkontraktor', section: 'cost', excelRow: 205 },
  { id: 'packaging_cost', labelEn: 'Packaging Cost', labelId: 'Biaya Pengemasan', section: 'cost', excelRow: 206 },
  { id: 'other_cogs', labelEn: 'Other COGS', labelId: 'Beban Pokok Lainnya', section: 'cost', excelRow: 207 },
]

// ---------------------------------------------------------------------------
// Operating Expense accounts (excelRow 300-319)
// ---------------------------------------------------------------------------

const OPEX_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'other_opex', labelEn: 'Others', labelId: 'Lain-lain', section: 'operating_expense', excelRow: 300 },
  { id: 'general_admin', labelEn: 'General & Administrative Overheads', labelId: 'Beban Umum & Administrasi', section: 'operating_expense', excelRow: 301 },
  { id: 'salaries_wages', labelEn: 'Salaries & Wages', labelId: 'Gaji & Upah', section: 'operating_expense', excelRow: 302 },
  { id: 'rent_expense', labelEn: 'Rent Expense', labelId: 'Beban Sewa', section: 'operating_expense', excelRow: 303 },
  { id: 'utilities', labelEn: 'Utilities', labelId: 'Beban Utilitas', section: 'operating_expense', excelRow: 304 },
  { id: 'insurance_expense', labelEn: 'Insurance Expense', labelId: 'Beban Asuransi', section: 'operating_expense', excelRow: 305 },
  { id: 'professional_fees', labelEn: 'Professional Fees', labelId: 'Beban Jasa Profesional', section: 'operating_expense', excelRow: 306 },
  { id: 'marketing_advertising', labelEn: 'Marketing & Advertising', labelId: 'Beban Pemasaran & Iklan', section: 'operating_expense', excelRow: 307 },
  { id: 'travel_transport', labelEn: 'Travel & Transportation', labelId: 'Beban Perjalanan & Transportasi', section: 'operating_expense', excelRow: 308 },
  { id: 'office_supplies', labelEn: 'Office Supplies', labelId: 'Beban Perlengkapan Kantor', section: 'operating_expense', excelRow: 309 },
  { id: 'research_development', labelEn: 'Research & Development', labelId: 'Riset & Pengembangan', section: 'operating_expense', excelRow: 310 },
  { id: 'other_operating_expense', labelEn: 'Other Operating Expense', labelId: 'Beban Operasional Lainnya', section: 'operating_expense', excelRow: 311 },
]

// ---------------------------------------------------------------------------
// Non-Operating accounts (excelRow 400-419)
// ---------------------------------------------------------------------------

const NON_OPERATING_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'other_non_operating', labelEn: 'Other Non-Operating Income / (Charges)', labelId: 'Pendapatan / (Beban) Non-Operasional Lainnya', section: 'non_operating', excelRow: 400 },
  { id: 'gain_asset_disposal', labelEn: 'Gain on Asset Disposal', labelId: 'Keuntungan Pelepasan Aset', section: 'non_operating', excelRow: 401 },
  { id: 'loss_asset_disposal', labelEn: 'Loss on Asset Disposal', labelId: 'Kerugian Pelepasan Aset', section: 'non_operating', excelRow: 402 },
  { id: 'fx_gain_loss', labelEn: 'Foreign Exchange Gain / (Loss)', labelId: 'Laba / (Rugi) Selisih Kurs', section: 'non_operating', excelRow: 403 },
  { id: 'impairment_loss', labelEn: 'Impairment Loss', labelId: 'Kerugian Penurunan Nilai', section: 'non_operating', excelRow: 404 },
  { id: 'insurance_claim', labelEn: 'Insurance Claim Income', labelId: 'Pendapatan Klaim Asuransi', section: 'non_operating', excelRow: 405 },
]

// ---------------------------------------------------------------------------
// Net Interest accounts (excelRow 500-519)
// ---------------------------------------------------------------------------

const NET_INTEREST_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'interest_income', labelEn: 'Interest Income', labelId: 'Pendapatan Bunga', section: 'net_interest', excelRow: 500, interestType: 'income' },
  { id: 'interest_expense', labelEn: 'Interest Expense', labelId: 'Beban Bunga', section: 'net_interest', excelRow: 501, interestType: 'expense' },
  { id: 'bank_interest_income', labelEn: 'Bank Interest Income', labelId: 'Pendapatan Bunga Bank', section: 'net_interest', excelRow: 502, interestType: 'income' },
  { id: 'loan_interest', labelEn: 'Loan Interest Expense', labelId: 'Beban Bunga Pinjaman', section: 'net_interest', excelRow: 503, interestType: 'expense' },
  { id: 'bond_interest', labelEn: 'Bond Interest Expense', labelId: 'Beban Bunga Obligasi', section: 'net_interest', excelRow: 504, interestType: 'expense' },
  { id: 'finance_charge', labelEn: 'Finance Charge', labelId: 'Beban Keuangan', section: 'net_interest', excelRow: 505, interestType: 'expense' },
]

/** Full sorted catalog */
export const IS_CATALOG: IsCatalogAccount[] = [
  ...REVENUE_ACCOUNTS,
  ...COST_ACCOUNTS,
  ...OPEX_ACCOUNTS,
  ...NON_OPERATING_ACCOUNTS,
  ...NET_INTEREST_ACCOUNTS,
].sort((a, b) => a.excelRow - b.excelRow)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getCatalogAccount(id: string): IsCatalogAccount | undefined {
  return IS_CATALOG.find((a) => a.id === id)
}

export function generateCustomExcelRow(existingAccounts: readonly IsAccountEntry[]): number {
  const customRows = existingAccounts
    .filter((a) => a.excelRow >= 1000)
    .map((a) => a.excelRow)
  if (customRows.length === 0) return 1000
  return Math.max(...customRows) + 1
}

export function getCatalogBySection(
  section: IsSection,
  language: 'en' | 'id',
): IsCatalogAccount[] {
  return IS_CATALOG
    .filter((a) => a.section === section)
    .sort((a, b) => {
      const la = language === 'en' ? a.labelEn : a.labelId
      const lb = language === 'en' ? b.labelEn : b.labelId
      return la.localeCompare(lb)
    })
}

/** Sentinel row numbers — downstream reads these for backward compat */
export const IS_SENTINEL = {
  REVENUE: 6,
  COGS: 7,
  GROSS_PROFIT: 8,
  TOTAL_OPEX: 15,
  EBITDA: 18,
  DEPRECIATION: 21,
  EBIT: 22,
  INTEREST_INCOME: 26,
  INTEREST_EXPENSE: 27,
  NET_INTEREST: 28,
  NON_OPERATING: 30,
  PBT: 32,
  TAX: 33,
  NET_PROFIT: 35,
} as const

/** All sentinel row numbers that the editor pre-computes for downstream */
export const IS_SENTINEL_ROWS: readonly number[] = Object.values(IS_SENTINEL)

/** Fixed leaf rows that live in sentinel range but are user-editable (Depreciation, Tax) */
const IS_FIXED_LEAF_ROWS = new Set<number>([IS_SENTINEL.DEPRECIATION, IS_SENTINEL.TAX])

/** Computed sentinel rows only — used by editor initializer to filter out non-leaf data.
 *  Excludes DEPRECIATION (21) and TAX (33) which are user-editable fixed leaves. */
export const IS_COMPUTED_SENTINEL_ROWS: readonly number[] =
  IS_SENTINEL_ROWS.filter((r) => !IS_FIXED_LEAF_ROWS.has(r))

/** Original leaf rows mapping to catalog IDs (for store migration) */
export const ORIGINAL_ROW_TO_CATALOG: Record<number, string> = {
  6: 'revenue',
  7: 'cogs',
  12: 'other_opex',
  13: 'general_admin',
  26: 'interest_income',
  27: 'interest_expense',
  30: 'other_non_operating',
}

/** Default accounts for migration — maps original IS structure to catalog */
export const DEFAULT_IS_ACCOUNTS: IsAccountEntry[] = [
  { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
  { catalogId: 'cogs', excelRow: 200, section: 'cost' },
  { catalogId: 'other_opex', excelRow: 300, section: 'operating_expense' },
  { catalogId: 'general_admin', excelRow: 301, section: 'operating_expense' },
  { catalogId: 'interest_income', excelRow: 500, section: 'net_interest', interestType: 'income' },
  { catalogId: 'interest_expense', excelRow: 501, section: 'net_interest', interestType: 'expense' },
  { catalogId: 'other_non_operating', excelRow: 400, section: 'non_operating' },
]
