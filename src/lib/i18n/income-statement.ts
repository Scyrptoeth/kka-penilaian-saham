/**
 * Bilingual dictionary for the Dynamic Income Statement editor.
 */

type Lang = 'en' | 'id'

export interface IsStrings {
  pageTitle: string
  lineItemHeader: string
  addHistoricalYear: string
  addYear: string
  reduceYear: string
  manualEntry: string
  allAccountsAdded: string
  accountNamePlaceholder: string
  cancel: string
  add: string
  deleteAccount: string
  resetIsTitle: string
  resetIsMessage: string
  resetIsConfirm: string
  resetAllTitle: string
  resetAllMessage: string
  resetAllConfirm: string

  // Per-section add-button labels (fully bilingual)
  addButtonLabels: Record<string, string>

  // Structural line item labels
  revenueAndCost: string
  totalRevenue: string
  totalCost: string
  grossProfit: string
  operatingExpenses: string
  totalOperatingExpenses: string
  ebitda: string
  depreciation: string
  ebit: string
  netInterest: string
  interestIncome: string
  interestExpense: string
  totalInterestIncome: string
  totalInterestExpense: string
  nonOperating: string
  totalNonOperating: string
  profitBeforeTax: string
  corporateTax: string
  netProfitAfterTax: string
  // Session 041 Task 4 — Fiscal Correction adjustment between PBT and Tax.
  koreksiFiskal: string
  taxableProfit: string
}

const en: IsStrings = {
  pageTitle: 'Input — Income Statement',
  lineItemHeader: 'Line Item',
  addHistoricalYear: 'Historical Year Count',
  addYear: '+ Year',
  reduceYear: '− Year',
  manualEntry: 'Manual Entry...',
  allAccountsAdded: 'All accounts already added',
  accountNamePlaceholder: 'Account name...',
  cancel: 'Cancel',
  add: 'Add',
  deleteAccount: 'Delete account',
  resetIsTitle: 'Reset Income Statement?',
  resetIsMessage: 'All Income Statement data will be deleted. This action cannot be undone.',
  resetIsConfirm: 'Reset IS',
  resetAllTitle: 'Reset All Data?',
  resetAllMessage: 'ALL form data (HOME + all inputs) will be deleted. This action cannot be undone.',
  resetAllConfirm: 'Reset All',

  addButtonLabels: {
    revenue: '+ Add Revenue Account',
    cost: '+ Add Cost Account',
    operating_expense: '+ Add Operating Expense',
    non_operating: '+ Add Non-Operating Account',
    interest_income: '+ Add Interest Income',
    interest_expense: '+ Add Interest Expense',
  },

  revenueAndCost: 'REVENUE & COST',
  totalRevenue: 'Total Revenue',
  totalCost: 'Total Cost of Goods Sold',
  grossProfit: 'GROSS PROFIT',
  operatingExpenses: 'OPERATING EXPENSES',
  totalOperatingExpenses: 'Total Operating Expenses (excl. Depreciation)',
  ebitda: 'EBITDA',
  depreciation: 'Depreciation',
  ebit: 'EBIT',
  netInterest: 'NET INTEREST',
  interestIncome: 'Interest Income',
  interestExpense: 'Interest Expense',
  totalInterestIncome: 'Total Interest Income',
  totalInterestExpense: 'Total Interest Expense',
  nonOperating: 'NON-OPERATING',
  totalNonOperating: 'Total Non-Operating',
  profitBeforeTax: 'PROFIT BEFORE TAX',
  corporateTax: 'Corporate Tax',
  netProfitAfterTax: 'NET PROFIT AFTER TAX',
  koreksiFiskal: 'Fiscal Correction',
  taxableProfit: 'TAXABLE PROFIT',
}

const id: IsStrings = {
  pageTitle: 'Input — Laba Rugi',
  lineItemHeader: 'Pos-Pos',
  addHistoricalYear: 'Jumlah Tahun Historis',
  addYear: '+ Tahun',
  reduceYear: '− Tahun',
  manualEntry: 'Isi Manual...',
  allAccountsAdded: 'Semua akun sudah ditambahkan',
  accountNamePlaceholder: 'Nama akun...',
  cancel: 'Batal',
  add: 'Tambah',
  deleteAccount: 'Hapus akun',
  resetIsTitle: 'Reset Laba Rugi?',
  resetIsMessage: 'Semua data Laba Rugi akan dihapus. Tindakan ini tidak dapat dibatalkan.',
  resetIsConfirm: 'Reset LR',
  resetAllTitle: 'Reset Semua Data?',
  resetAllMessage: 'SEMUA data form (HOME + semua input) akan dihapus. Tindakan ini tidak dapat dibatalkan.',
  resetAllConfirm: 'Reset Semua',

  addButtonLabels: {
    revenue: '+ Tambah Akun Pendapatan',
    cost: '+ Tambah Akun Beban Pokok',
    operating_expense: '+ Tambah Beban Operasional',
    non_operating: '+ Tambah Akun Non-Operasional',
    interest_income: '+ Tambah Pendapatan Bunga',
    interest_expense: '+ Tambah Beban Bunga',
  },

  revenueAndCost: 'PENDAPATAN & BEBAN POKOK',
  totalRevenue: 'Total Pendapatan',
  totalCost: 'Total Beban Pokok Penjualan',
  grossProfit: 'LABA KOTOR',
  operatingExpenses: 'BEBAN OPERASIONAL',
  totalOperatingExpenses: 'Total Beban Operasional (tanpa Penyusutan)',
  ebitda: 'EBITDA',
  depreciation: 'Penyusutan',
  ebit: 'EBIT',
  netInterest: 'BUNGA BERSIH',
  interestIncome: 'Pendapatan Bunga',
  interestExpense: 'Beban Bunga',
  totalInterestIncome: 'Total Pendapatan Bunga',
  totalInterestExpense: 'Total Beban Bunga',
  nonOperating: 'NON-OPERASIONAL',
  totalNonOperating: 'Total Non-Operasional',
  profitBeforeTax: 'LABA SEBELUM PAJAK',
  corporateTax: 'Pajak Penghasilan Badan',
  netProfitAfterTax: 'LABA BERSIH SETELAH PAJAK',
  koreksiFiskal: 'Koreksi Fiskal',
  taxableProfit: 'LABA KENA PAJAK',
}

const translations: Record<Lang, IsStrings> = { en, id }

export function getIsStrings(language: Lang): IsStrings {
  return translations[language]
}
