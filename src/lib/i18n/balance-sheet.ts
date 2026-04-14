/**
 * Bilingual dictionary for the Balance Sheet input page.
 *
 * Covers section headers, LINE ITEM structural labels, UI strings,
 * and dialog texts. Catalog account labels (labelEn/labelId) are
 * already bilingual in the catalog itself — this file handles
 * everything ELSE on the page.
 */

import type { BsSection } from '@/data/catalogs/balance-sheet-catalog'

type Lang = 'en' | 'id'

interface BsStrings {
  // Page
  pageTitle: string

  // Section dropdown headers
  sectionLabels: Record<BsSection, string>

  // LINE ITEM structural rows
  lineItem: {
    assets: string
    currentAssets: string
    totalCurrentAssets: string
    nonCurrentAssets: string
    fixedAssets: string
    fixedAssetsBeginning: string
    accumulatedDepreciation: string
    fixedAssetsNet: string
    totalNonCurrentAssets: string
    totalAssets: string
    liabilitiesAndEquity: string
    currentLiabilities: string
    totalCurrentLiabilities: string
    nonCurrentLiabilities: string
    totalNonCurrentLiabilities: string
    totalLiabilities: string
    shareholdersEquity: string
    shareholdersEquitySubtotal: string
    retainedEarningsEnding: string
    totalLiabilitiesAndEquity: string
  }

  // Grid header
  lineItemHeader: string

  // Year section
  addHistoricalYear: string
  addYear: string
  reduceYear: string

  // Per-section add-button labels (fully bilingual)
  addButtonLabels: Record<string, string>

  // UI controls
  addAccount: string
  manualEntry: string
  allAccountsAdded: string
  accountNamePlaceholder: string
  cancel: string
  add: string
  deleteAccount: string

  // Dialogs
  resetBsTitle: string
  resetBsMessage: string
  resetBsConfirm: string
  resetAllTitle: string
  resetAllMessage: string
  resetAllConfirm: string
}

const en: BsStrings = {
  pageTitle: 'Balance Sheet',

  sectionLabels: {
    current_assets: 'Current Assets',
    fixed_assets: 'Fixed Assets',
    intangible_assets: 'Intangible Assets',
    other_non_current_assets: 'Other Non-Current Assets',
    current_liabilities: 'Current Liabilities',
    non_current_liabilities: 'Non-Current Liabilities',
    equity: 'Equity',
  },

  lineItem: {
    assets: 'ASSETS',
    currentAssets: 'Current Assets',
    totalCurrentAssets: 'Total Current Assets',
    nonCurrentAssets: 'Non-Current Assets',
    fixedAssets: 'Fixed Assets',
    fixedAssetsBeginning: 'Fixed Assets, Beginning',
    accumulatedDepreciation: 'Accumulated Depreciation',
    fixedAssetsNet: 'Fixed Assets, Net',
    totalNonCurrentAssets: 'Total Non-Current Assets',
    totalAssets: 'TOTAL ASSETS',
    liabilitiesAndEquity: 'LIABILITIES & EQUITY',
    currentLiabilities: 'Current Liabilities',
    totalCurrentLiabilities: 'Total Current Liabilities',
    nonCurrentLiabilities: 'Non-Current Liabilities',
    totalNonCurrentLiabilities: 'Total Non-Current Liabilities',
    totalLiabilities: 'TOTAL LIABILITIES',
    shareholdersEquity: "SHAREHOLDERS' EQUITY",
    shareholdersEquitySubtotal: "Shareholders' Equity",
    retainedEarningsEnding: 'Retained Earnings, Ending Balance',
    totalLiabilitiesAndEquity: 'TOTAL LIABILITIES & EQUITY',
  },

  lineItemHeader: 'Line Item',

  addHistoricalYear: 'Historical Year Count',
  addYear: '+ Year',
  reduceYear: '− Year',

  addButtonLabels: {
    current_assets: '+ Add Current Asset',
    other_non_current_assets: '+ Add Non-Current Asset',
    current_liabilities: '+ Add Current Liability',
    non_current_liabilities: '+ Add Non-Current Liability',
    equity: '+ Add Equity Account',
  },

  addAccount: '+ Add Account',
  manualEntry: 'Manual Entry...',
  allAccountsAdded: 'All accounts added',
  accountNamePlaceholder: 'Account name...',
  cancel: 'Cancel',
  add: 'Add',
  deleteAccount: 'Delete account',

  resetBsTitle: 'Reset Balance Sheet',
  resetBsMessage:
    'Are you sure you want to reset Balance Sheet data? All accounts and values will be deleted.',
  resetBsConfirm: 'Reset BS',
  resetAllTitle: 'Reset All Data',
  resetAllMessage:
    'Are you sure you want to reset ALL data? All inputs on all pages will be deleted. This action cannot be undone.',
  resetAllConfirm: 'Reset All',
}

const id: BsStrings = {
  pageTitle: 'Neraca',

  sectionLabels: {
    current_assets: 'Aset Lancar',
    fixed_assets: 'Aset Tetap',
    intangible_assets: 'Aset Tak Berwujud',
    other_non_current_assets: 'Aset Tidak Lancar Lainnya',
    current_liabilities: 'Liabilitas Jangka Pendek',
    non_current_liabilities: 'Liabilitas Jangka Panjang',
    equity: 'Ekuitas',
  },

  lineItem: {
    assets: 'ASET',
    currentAssets: 'Aset Lancar',
    totalCurrentAssets: 'Total Aset Lancar',
    nonCurrentAssets: 'Aset Tidak Lancar',
    fixedAssets: 'Aset Tetap',
    fixedAssetsBeginning: 'Aset Tetap, Saldo Awal',
    accumulatedDepreciation: 'Akumulasi Penyusutan',
    fixedAssetsNet: 'Aset Tetap, Neto',
    totalNonCurrentAssets: 'Total Aset Tidak Lancar',
    totalAssets: 'TOTAL ASET',
    liabilitiesAndEquity: 'LIABILITAS & EKUITAS',
    currentLiabilities: 'Liabilitas Jangka Pendek',
    totalCurrentLiabilities: 'Total Liabilitas Jangka Pendek',
    nonCurrentLiabilities: 'Liabilitas Jangka Panjang',
    totalNonCurrentLiabilities: 'Total Liabilitas Jangka Panjang',
    totalLiabilities: 'TOTAL LIABILITAS',
    shareholdersEquity: 'EKUITAS PEMEGANG SAHAM',
    shareholdersEquitySubtotal: 'Ekuitas Pemegang Saham',
    retainedEarningsEnding: 'Saldo Laba, Saldo Akhir',
    totalLiabilitiesAndEquity: 'TOTAL LIABILITAS & EKUITAS',
  },

  lineItemHeader: 'Pos-Pos',

  addHistoricalYear: 'Jumlah Tahun Historis',
  addYear: '+ Tahun',
  reduceYear: '− Tahun',

  addButtonLabels: {
    current_assets: '+ Tambah Aset Lancar',
    other_non_current_assets: '+ Tambah Aset Tidak Lancar Lainnya',
    current_liabilities: '+ Tambah Liabilitas Jangka Pendek',
    non_current_liabilities: '+ Tambah Liabilitas Jangka Panjang',
    equity: '+ Tambah Akun Ekuitas',
  },

  addAccount: '+ Tambah Akun',
  manualEntry: 'Isi Manual...',
  allAccountsAdded: 'Semua akun sudah ditambahkan',
  accountNamePlaceholder: 'Nama akun...',
  cancel: 'Batal',
  add: 'Tambah',
  deleteAccount: 'Hapus akun',

  resetBsTitle: 'Reset Balance Sheet',
  resetBsMessage:
    'Yakin ingin mereset data Balance Sheet? Semua akun dan nilai yang sudah diinput akan dihapus.',
  resetBsConfirm: 'Reset BS',
  resetAllTitle: 'Reset Seluruh Data',
  resetAllMessage:
    'Yakin ingin mereset SELURUH data? Semua input di semua halaman akan dihapus. Tindakan ini tidak bisa dibatalkan.',
  resetAllConfirm: 'Reset Semua',
}

const translations: Record<Lang, BsStrings> = { en, id }

export function getBsStrings(lang: Lang): BsStrings {
  return translations[lang]
}

export type { BsStrings, Lang }
