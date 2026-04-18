/**
 * Income Statement Account Catalog — 6 sections with bilingual accounts.
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
 *   Sentinel row 28 = Net Interest (computed: 26 + 27 — IE entered negative)
 *   Sentinel row 30 = Non-Operating total
 *
 * Row 33 (Tax) is the only fixed leaf — not in any section.
 *
 * Session 041 Task 1: row 21 (Depreciation) is now a cross-ref read-only
 * sentinel sourced from FA row 51 — no longer a fixed leaf.
 *
 * Session 041 Task 3: the legacy single `net_interest` section is split into
 * two semantically distinct sections so each renders its own +Add dropdown
 * with a section-appropriate PSAK 71 / IFRS 9 / IAS 23 default catalog.
 *
 * excelRow ranges per section:
 *   100-119 : Revenue
 *   200-219 : Cost (COGS)
 *   300-319 : Operating Expense
 *   400-419 : Non-Operating
 *   500-519 : Interest Income     (Session 041)
 *   520-539 : Interest Expense    (Session 041)
 *   >= 1000 : user custom accounts
 */

export type IsSection =
  | 'revenue'
  | 'cost'
  | 'operating_expense'
  | 'non_operating'
  | 'interest_income'
  | 'interest_expense'

export interface IsCatalogAccount {
  id: string
  labelEn: string
  labelId: string
  section: IsSection
  excelRow: number
}

export interface IsAccountEntry {
  catalogId: string
  excelRow: number
  section: IsSection
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
// Interest Income accounts (excelRow 500-519) — PSAK 71 / IFRS 9
// Session 041 Task 3: split from legacy `net_interest` section.
// ---------------------------------------------------------------------------

const INTEREST_INCOME_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'time_deposit_interest', labelEn: 'Time Deposit Interest Income', labelId: 'Pendapatan Bunga Deposito', section: 'interest_income', excelRow: 500 },
  { id: 'current_account_interest', labelEn: 'Current Account Interest Income', labelId: 'Pendapatan Jasa Giro', section: 'interest_income', excelRow: 501 },
  { id: 'loan_receivable_interest', labelEn: 'Interest Income from Loans Receivable', labelId: 'Pendapatan Bunga Pinjaman Diberikan', section: 'interest_income', excelRow: 502 },
  { id: 'bond_interest_income', labelEn: 'Bond Interest Income', labelId: 'Pendapatan Bunga Obligasi', section: 'interest_income', excelRow: 503 },
  { id: 'sharia_profit_sharing_income', labelEn: 'Sharia Profit-Sharing Income', labelId: 'Pendapatan Bagi Hasil Bank Syariah', section: 'interest_income', excelRow: 504 },
  { id: 'other_interest_income', labelEn: 'Other Interest Income', labelId: 'Pendapatan Bunga Lain-lain', section: 'interest_income', excelRow: 505 },
]

// ---------------------------------------------------------------------------
// Interest Expense accounts (excelRow 520-539) — PSAK 71 / IFRS 9 + IAS 23
// Session 041 Task 3: split from legacy `net_interest` section.
// ---------------------------------------------------------------------------

const INTEREST_EXPENSE_ACCOUNTS: IsCatalogAccount[] = [
  { id: 'bank_loan_interest', labelEn: 'Bank Loan Interest Expense', labelId: 'Beban Bunga Pinjaman Bank', section: 'interest_expense', excelRow: 520 },
  { id: 'bond_interest_expense', labelEn: 'Bond Interest Expense', labelId: 'Beban Bunga Obligasi', section: 'interest_expense', excelRow: 521 },
  { id: 'finance_lease_interest', labelEn: 'Finance Lease Interest Expense', labelId: 'Beban Bunga Sewa Pembiayaan', section: 'interest_expense', excelRow: 522 },
  { id: 'other_loan_interest', labelEn: 'Other Loan Interest Expense', labelId: 'Beban Bunga Hutang Lainnya', section: 'interest_expense', excelRow: 523 },
  { id: 'sharia_profit_sharing_expense', labelEn: 'Sharia Profit-Sharing Expense', labelId: 'Beban Bagi Hasil Bank Syariah', section: 'interest_expense', excelRow: 524 },
  { id: 'loan_provision_admin_charge', labelEn: 'Loan Provision & Admin Charge', labelId: 'Beban Provisi & Administrasi Pinjaman', section: 'interest_expense', excelRow: 525 },
  { id: 'other_interest_expense', labelEn: 'Other Interest Expense', labelId: 'Beban Bunga Lain-lain', section: 'interest_expense', excelRow: 526 },
]

/** Full sorted catalog */
export const IS_CATALOG: IsCatalogAccount[] = [
  ...REVENUE_ACCOUNTS,
  ...COST_ACCOUNTS,
  ...OPEX_ACCOUNTS,
  ...NON_OPERATING_ACCOUNTS,
  ...INTEREST_INCOME_ACCOUNTS,
  ...INTEREST_EXPENSE_ACCOUNTS,
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
  // Session 041 Task 4: Fiscal Correction (signed user-editable leaf) and
  // TAXABLE PROFIT (computed = PBT + KOREKSI_FISKAL). Synthetic excelRows
  // outside the existing template range so downstream consumers (Tax row 33,
  // NPAT row 35, KEY DRIVERS, NOPLAT) remain backward compatible — they keep
  // referencing rows 32/33/35 without seeing a row-number shift. NPAT formula
  // unchanged: PBT (32) + Tax (33) per LESSON-055 plain-addition convention.
  KOREKSI_FISKAL: 600,
  TAXABLE_PROFIT: 601,
} as const

/** All sentinel row numbers that the editor pre-computes for downstream */
export const IS_SENTINEL_ROWS: readonly number[] = Object.values(IS_SENTINEL)

/**
 * Fixed leaf rows that live in sentinel range but are user-editable.
 *
 * Session 041 Task 1: Depreciation (21) is no longer in this set — it is
 * now an FA-cross-ref read-only computed sentinel sourced from FA row 51
 * (TOTAL_DEP_ADDITIONS), negated at the boundary by `computeDepreciationFromFa`.
 *
 * Session 041 Task 4: Fiscal Correction (600) is added — signed user-editable
 * leaf. TAXABLE PROFIT (601) is NOT a fixed leaf — it is computed in the
 * dynamic IS manifest as `PBT + KOREKSI_FISKAL` and resolved by `deriveComputedRows`.
 */
const IS_FIXED_LEAF_ROWS = new Set<number>([IS_SENTINEL.TAX, IS_SENTINEL.KOREKSI_FISKAL])

/**
 * Computed sentinel rows only — used by editor initializer to filter out
 * non-leaf data on remount.
 *
 * Excludes TAX (33) which is the only remaining user-editable fixed leaf in
 * sentinel range. DEPRECIATION (21) IS included here because it is now
 * computed from FA at persist time (Session 041 Task 1).
 */
export const IS_COMPUTED_SENTINEL_ROWS: readonly number[] =
  IS_SENTINEL_ROWS.filter((r) => !IS_FIXED_LEAF_ROWS.has(r))

/** Original leaf rows mapping to catalog IDs (for store migration) */
export const ORIGINAL_ROW_TO_CATALOG: Record<number, string> = {
  6: 'revenue',
  7: 'cogs',
  12: 'other_opex',
  13: 'general_admin',
  26: 'time_deposit_interest',
  27: 'bank_loan_interest',
  30: 'other_non_operating',
}

/** Default accounts for migration — maps original IS structure to catalog */
export const DEFAULT_IS_ACCOUNTS: IsAccountEntry[] = [
  { catalogId: 'revenue', excelRow: 100, section: 'revenue' },
  { catalogId: 'cogs', excelRow: 200, section: 'cost' },
  { catalogId: 'other_opex', excelRow: 300, section: 'operating_expense' },
  { catalogId: 'general_admin', excelRow: 301, section: 'operating_expense' },
  { catalogId: 'time_deposit_interest', excelRow: 500, section: 'interest_income' },
  { catalogId: 'bank_loan_interest', excelRow: 520, section: 'interest_expense' },
  { catalogId: 'other_non_operating', excelRow: 400, section: 'non_operating' },
]
