/**
 * Balance Sheet Account Catalog — single source of truth for:
 * 1. Dropdown options (sorted alphabetically by active language)
 * 2. Backward-compatible excelRow mapping to Excel template
 * 3. Section assignment for dynamic subtotal computation
 *
 * Accounts with excelRow < 60 map directly to kka-penilaian-saham.xlsx.
 * Accounts with excelRow 100-399 are extended catalog entries — they flow
 * into subtotals and appear in the "RINCIAN NERACA" export sheet but have
 * no fixed cell in the original Excel template.
 * Custom accounts (user-defined via "Isi Manual") get excelRow >= 1000.
 *
 * excelRow ranges:
 *   8-51    : original Excel template rows (verified)
 *   100-119 : extended current assets
 *   120-139 : extended fixed assets
 *   140-159 : extended intangible assets
 *   160-179 : extended other non-current assets
 *   200-219 : extended current liabilities
 *   220-239 : extended non-current liabilities
 *   300-319 : extended equity
 *   >= 1000 : user custom accounts
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
  /** Row number — original Excel rows or extended range */
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
// Catalog data
// ---------------------------------------------------------------------------

export const BS_CATALOG_ASSETS: readonly BsCatalogAccount[] = [
  // === Current Assets (excelRow 8-14 = original, 100-119 = extended) ===
  { id: 'cash',                  labelEn: 'Cash on Hands',                    labelId: 'Kas',                              section: 'current_assets', excelRow: 8 },
  { id: 'cash_bank',             labelEn: 'Cash on Bank (Deposit)',            labelId: 'Bank (Deposito)',                  section: 'current_assets', excelRow: 9 },
  { id: 'account_receivable',    labelEn: 'Account Receivable',               labelId: 'Piutang Usaha',                    section: 'current_assets', excelRow: 10 },
  { id: 'other_receivable',      labelEn: 'Deposito',                         labelId: 'Deposito',                         section: 'current_assets', excelRow: 11 },
  { id: 'inventory',             labelEn: 'Inventory',                        labelId: 'Persediaan',                       section: 'current_assets', excelRow: 12 },
  { id: 'prepaid_expenses',      labelEn: 'Prepaid Expenses',                 labelId: 'Pembayaran Dimuka',                section: 'current_assets', excelRow: 13 },
  { id: 'other_current_assets',  labelEn: 'Others - PPn/PPh',                 labelId: 'Lainnya - PPn/PPh',                section: 'current_assets', excelRow: 14 },
  // Extended current assets
  { id: 'short_term_invest',     labelEn: 'Short-term Investments',           labelId: 'Investasi Jangka Pendek',          section: 'current_assets', excelRow: 100 },
  { id: 'notes_receivable',      labelEn: 'Notes Receivable',                 labelId: 'Piutang Wesel',                    section: 'current_assets', excelRow: 101 },
  { id: 'related_party_recv',    labelEn: 'Receivable from Related Parties',  labelId: 'Piutang Pihak Berelasi',           section: 'current_assets', excelRow: 102 },
  { id: 'accrued_revenue',       labelEn: 'Accrued Revenue',                  labelId: 'Pendapatan yang Masih Harus Diterima', section: 'current_assets', excelRow: 103 },
  { id: 'tax_receivable',        labelEn: 'Tax Receivable (PPh/PPN)',         labelId: 'Piutang Pajak (PPh/PPN)',           section: 'current_assets', excelRow: 104 },
  { id: 'advances_suppliers',    labelEn: 'Advances to Suppliers',            labelId: 'Uang Muka Pemasok',                section: 'current_assets', excelRow: 105 },
  { id: 'marketable_securities', labelEn: 'Marketable Securities',            labelId: 'Surat Berharga',                   section: 'current_assets', excelRow: 106 },
  { id: 'financial_assets_fv',   labelEn: 'Financial Assets at Fair Value',   labelId: 'Aset Keuangan Nilai Wajar',        section: 'current_assets', excelRow: 107 },
  { id: 'restricted_cash',       labelEn: 'Restricted Cash',                  labelId: 'Kas yang Dibatasi Penggunaannya',   section: 'current_assets', excelRow: 108 },
  { id: 'other_current_assets_2',labelEn: 'Other Current Assets',             labelId: 'Aset Lancar Lainnya',              section: 'current_assets', excelRow: 109 },
  { id: 'employee_receivable',   labelEn: 'Employee Receivable',              labelId: 'Piutang Karyawan',                 section: 'current_assets', excelRow: 110 },
  { id: 'supplies',              labelEn: 'Supplies',                         labelId: 'Perlengkapan',                     section: 'current_assets', excelRow: 111 },
  { id: 'contract_assets',       labelEn: 'Contract Assets',                  labelId: 'Aset Kontrak',                     section: 'current_assets', excelRow: 112 },

  // === Fixed Assets — REMOVED from catalog ===
  // Fixed Assets section is now cross-referenced from the Fixed Asset input page.
  // BS rows 20 (FA Beginning) and 21 (Accum Depreciation) are auto-populated
  // from FA store rows 32 and 60 respectively. Row 22 (FA Net) is computed.

  // === Other Non-Current Assets (excelRow 23 = original, 160-179 = extended) ===
  { id: 'other_non_current',      labelEn: 'Other Non-Current Assets',        labelId: 'Aset Tidak Lancar Lainnya',        section: 'other_non_current_assets', excelRow: 23 },
  { id: 'deferred_tax_asset',     labelEn: 'Deferred Tax Assets',             labelId: 'Aset Pajak Tangguhan',             section: 'other_non_current_assets', excelRow: 160 },
  { id: 'long_term_invest',       labelEn: 'Long-term Investments',           labelId: 'Investasi Jangka Panjang',         section: 'other_non_current_assets', excelRow: 161 },
  { id: 'invest_associates',      labelEn: 'Investment in Associates',        labelId: 'Investasi pada Entitas Asosiasi',  section: 'other_non_current_assets', excelRow: 162 },
  { id: 'investment_property',     labelEn: 'Investment Property',             labelId: 'Properti Investasi',               section: 'other_non_current_assets', excelRow: 163 },
  { id: 'long_term_receivable',    labelEn: 'Long-term Receivables',           labelId: 'Piutang Jangka Panjang',           section: 'other_non_current_assets', excelRow: 164 },
  { id: 'security_deposits',      labelEn: 'Security Deposits',               labelId: 'Uang Jaminan',                     section: 'other_non_current_assets', excelRow: 165 },
  { id: 'invest_subsidiaries',    labelEn: 'Investment in Subsidiaries',      labelId: 'Investasi pada Entitas Anak',      section: 'other_non_current_assets', excelRow: 166 },

  // === Intangible Assets (excelRow 24 = original, 140-159 = extended) ===
  { id: 'intangible_assets',      labelEn: 'Intangible Assets',               labelId: 'Aset Tak Berwujud',                section: 'intangible_assets', excelRow: 24 },
  { id: 'goodwill',               labelEn: 'Goodwill',                        labelId: 'Goodwill',                         section: 'intangible_assets', excelRow: 140 },
  { id: 'software',               labelEn: 'Software & IT Systems',           labelId: 'Perangkat Lunak & Sistem TI',      section: 'intangible_assets', excelRow: 141 },
  { id: 'patents',                labelEn: 'Patents & Trademarks',            labelId: 'Paten & Merek Dagang',             section: 'intangible_assets', excelRow: 142 },
  { id: 'customer_relationships', labelEn: 'Customer Relationships',          labelId: 'Hubungan Pelanggan',               section: 'intangible_assets', excelRow: 143 },
  { id: 'mining_rights',          labelEn: 'Mining Rights / Concessions',     labelId: 'Hak Penambangan / Konsesi',        section: 'intangible_assets', excelRow: 144 },
  { id: 'franchise_rights',       labelEn: 'Franchise Rights',                labelId: 'Hak Waralaba',                     section: 'intangible_assets', excelRow: 145 },
  { id: 'amortization',           labelEn: 'Accumulated Amortization',        labelId: 'Akumulasi Amortisasi',             section: 'intangible_assets', excelRow: 146 },
]

export const BS_CATALOG_LIABILITIES: readonly BsCatalogAccount[] = [
  // === Current Liabilities (excelRow 31-34 = original, 200-219 = extended) ===
  { id: 'short_term_debt',        labelEn: 'Bank Loan - Short Term',          labelId: 'Utang Bank Jangka Pendek',          section: 'current_liabilities', excelRow: 31 },
  { id: 'account_payable',        labelEn: 'Account Payables',                labelId: 'Utang Usaha',                       section: 'current_liabilities', excelRow: 32 },
  { id: 'tax_payable',            labelEn: 'Tax Payable',                     labelId: 'Utang Pajak',                       section: 'current_liabilities', excelRow: 33 },
  { id: 'other_current_liab',     labelEn: 'Others - Short/Long Term Debt',   labelId: 'Lainnya - Utang JK Pendek/Panjang', section: 'current_liabilities', excelRow: 34 },
  { id: 'accrued_expenses',       labelEn: 'Accrued Expenses',                labelId: 'Beban yang Masih Harus Dibayar',    section: 'current_liabilities', excelRow: 200 },
  { id: 'current_portion_ltd',    labelEn: 'Current Portion of Long-term Debt', labelId: 'Bagian Lancar Utang Jangka Panjang', section: 'current_liabilities', excelRow: 201 },
  { id: 'unearned_revenue',       labelEn: 'Unearned Revenue',                labelId: 'Pendapatan Diterima Dimuka',        section: 'current_liabilities', excelRow: 202 },
  { id: 'employee_payable',       labelEn: 'Employee Benefits Payable',       labelId: 'Utang Imbalan Kerja',               section: 'current_liabilities', excelRow: 203 },
  { id: 'dividends_payable',      labelEn: 'Dividends Payable',               labelId: 'Utang Dividen',                    section: 'current_liabilities', excelRow: 204 },
  { id: 'interest_payable',       labelEn: 'Interest Payable',                labelId: 'Utang Bunga',                       section: 'current_liabilities', excelRow: 205 },
  { id: 'advances_customers',     labelEn: 'Advances from Customers',         labelId: 'Uang Muka dari Pelanggan',         section: 'current_liabilities', excelRow: 206 },
  { id: 'related_party_payable_st', labelEn: 'Related Party Payable (Short-term)', labelId: 'Utang Pihak Berelasi (JK Pendek)', section: 'current_liabilities', excelRow: 207 },
  { id: 'contract_liabilities',   labelEn: 'Contract Liabilities',            labelId: 'Liabilitas Kontrak',               section: 'current_liabilities', excelRow: 208 },
  { id: 'other_current_liab_2',   labelEn: 'Other Current Liabilities',       labelId: 'Liabilitas Jangka Pendek Lainnya', section: 'current_liabilities', excelRow: 209 },
  { id: 'current_lease_liab',     labelEn: 'Current Lease Liabilities',       labelId: 'Liabilitas Sewa Jangka Pendek',    section: 'current_liabilities', excelRow: 210 },
  { id: 'provisions_current',     labelEn: 'Provisions (Current)',             labelId: 'Provisi (Jangka Pendek)',          section: 'current_liabilities', excelRow: 211 },

  // === Non-Current Liabilities (excelRow 38-39 = original, 220-239 = extended) ===
  { id: 'long_term_debt',         labelEn: 'Bank Loan - Long Term',           labelId: 'Utang Bank Jangka Panjang',        section: 'non_current_liabilities', excelRow: 38 },
  { id: 'related_party_debt',     labelEn: 'Related Party Payable & Employee Benefits', labelId: 'Utang Pihak Berelasi & Imbalan Kerja', section: 'non_current_liabilities', excelRow: 39 },
  { id: 'bonds_payable',          labelEn: 'Bonds Payable',                   labelId: 'Utang Obligasi',                   section: 'non_current_liabilities', excelRow: 220 },
  { id: 'post_employment',        labelEn: 'Post-employment Benefits',        labelId: 'Liabilitas Imbalan Pascakerja',    section: 'non_current_liabilities', excelRow: 221 },
  { id: 'deferred_tax_liab',      labelEn: 'Deferred Tax Liabilities',        labelId: 'Liabilitas Pajak Tangguhan',       section: 'non_current_liabilities', excelRow: 222 },
  { id: 'long_term_lease_liab',   labelEn: 'Long-term Lease Liabilities',     labelId: 'Liabilitas Sewa Jangka Panjang',   section: 'non_current_liabilities', excelRow: 223 },
  { id: 'provisions_non_current', labelEn: 'Provisions (Non-Current)',         labelId: 'Provisi (Jangka Panjang)',         section: 'non_current_liabilities', excelRow: 224 },
  { id: 'long_term_bank_loan_2',  labelEn: 'Other Long-term Borrowings',      labelId: 'Pinjaman Jangka Panjang Lainnya',  section: 'non_current_liabilities', excelRow: 225 },
  { id: 'convertible_bonds',      labelEn: 'Convertible Bonds',               labelId: 'Obligasi Konversi',                section: 'non_current_liabilities', excelRow: 226 },
  { id: 'other_non_current_liab', labelEn: 'Other Non-Current Liabilities',   labelId: 'Liabilitas Jk Panjang Lainnya',    section: 'non_current_liabilities', excelRow: 227 },
]

export const BS_CATALOG_EQUITY: readonly BsCatalogAccount[] = [
  // === Equity (excelRow 43-47 = original, 300-319 = extended) ===
  { id: 'paid_in_capital',              labelEn: 'Paid Up Capital',                   labelId: 'Modal Disetor',                       section: 'equity', excelRow: 43 },
  { id: 'additional_paid_in',           labelEn: 'Additional Paid-in Capital',         labelId: 'Tambahan Modal Disetor',              section: 'equity', excelRow: 44 },
  { id: 'retained_earnings_beginning',  labelEn: 'Retained Earnings - Surplus',        labelId: 'Laba Ditahan - Surplus',              section: 'equity', excelRow: 46 },
  { id: 'net_income',                   labelEn: 'Retained Earnings - Current Profit', labelId: 'Laba Bersih Tahun Berjalan',          section: 'equity', excelRow: 47 },
  { id: 'treasury_stock',              labelEn: 'Treasury Stock',                     labelId: 'Saham Treasuri',                      section: 'equity', excelRow: 300 },
  { id: 'oci',                         labelEn: 'Other Comprehensive Income',         labelId: 'Pendapatan Komprehensif Lain',        section: 'equity', excelRow: 301 },
  { id: 'revaluation_surplus',         labelEn: 'Revaluation Surplus',                labelId: 'Surplus Revaluasi',                   section: 'equity', excelRow: 302 },
  { id: 'appropriated_re',             labelEn: 'Appropriated Retained Earnings',     labelId: 'Laba Ditahan yang Dicadangkan',       section: 'equity', excelRow: 303 },
  { id: 'nci',                         labelEn: 'Non-controlling Interest',           labelId: 'Kepentingan Nonpengendali',           section: 'equity', excelRow: 304 },
  { id: 'share_premium',               labelEn: 'Share Premium',                      labelId: 'Agio Saham',                          section: 'equity', excelRow: 305 },
  { id: 'equity_component_cb',         labelEn: 'Equity Component of Convertible Bonds', labelId: 'Komponen Ekuitas Obligasi Konversi', section: 'equity', excelRow: 306 },
  { id: 'accumulated_deficit',         labelEn: 'Accumulated Deficit',                labelId: 'Akumulasi Kerugian',                  section: 'equity', excelRow: 307 },
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

/** Check if an excelRow maps to the original Excel template (< 60) */
export function isOriginalExcelRow(excelRow: number): boolean {
  return excelRow < 60
}

/**
 * Interest-Bearing Debt catalog IDs — bank loans excluded from NAV
 * in AAM calculation and counted separately as IBD.
 * Custom accounts default to non-IBD (conservative).
 */
export const IBD_CATALOG_IDS: ReadonlySet<string> = new Set([
  'short_term_debt', // Bank Loan - Short Term (excelRow 31)
  'long_term_debt',  // Bank Loan - Long Term (excelRow 38)
])

/** Whether an account is classified as Interest-Bearing Debt */
export function isIbdAccount(account: BsAccountEntry): boolean {
  return IBD_CATALOG_IDS.has(account.catalogId)
}

/**
 * Resolve display label for a BS account.
 * Custom entries use customLabel; catalog entries use language-specific label.
 */
export function resolveAccountLabel(
  account: BsAccountEntry,
  language: 'en' | 'id',
): string {
  if (account.customLabel) return account.customLabel
  const catalog = getCatalogAccount(account.catalogId)
  if (!catalog) return account.catalogId
  return language === 'en' ? catalog.labelEn : catalog.labelId
}

/**
 * BS sentinel rows — subtotals/totals that downstream consumers need.
 * Pre-computed at persist time to include extended catalog accounts that
 * the static BALANCE_SHEET_MANIFEST's computedFrom arrays don't reference.
 */
export const BS_SENTINEL_ROWS: readonly number[] = [
  16,  // Total Current Assets
  22,  // Fixed Assets, Net
  25,  // Total Non-Current Assets
  27,  // TOTAL ASSETS
  35,  // Total Current Liabilities
  40,  // Total Non-Current Liabilities
  41,  // TOTAL LIABILITIES
  48,  // Retained Earnings subtotal
  49,  // Shareholders' Equity
  51,  // TOTAL LIABILITIES & EQUITY
]
