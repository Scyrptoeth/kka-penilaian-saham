/**
 * Bilingual dictionary for the Dynamic Fixed Asset editor.
 * Pattern follows balance-sheet.ts — single getFaStrings(language) export.
 */

type Lang = 'en' | 'id'

export interface FaStrings {
  pageTitle: string
  lineItemHeader: string
  addHistoricalYear: string
  addYear: string
  reduceYear: string
  addAccount: string
  manualEntry: string
  allAccountsAdded: string
  accountNamePlaceholder: string
  cancel: string
  add: string
  deleteAccount: string
  resetFaTitle: string
  resetFaMessage: string
  resetFaConfirm: string
  resetAllTitle: string
  resetAllMessage: string
  resetAllConfirm: string
  // Section labels (manifest headers)
  acquisitionCosts: string
  beginning: string
  additions: string
  ending: string
  depreciation: string
  netValueFixedAssets: string
  totalBeginning: string
  totalAdditions: string
  totalEnding: string
  totalNetFixedAssets: string
}

const en: FaStrings = {
  pageTitle: 'Input — Fixed Asset',
  lineItemHeader: 'LINE ITEM',
  addHistoricalYear: 'Historical Year Count',
  addYear: '+ Year',
  reduceYear: '− Year',
  addAccount: '+ Add Fixed Asset Account',
  manualEntry: 'Manual Entry...',
  allAccountsAdded: 'All accounts already added',
  accountNamePlaceholder: 'Account name...',
  cancel: 'Cancel',
  add: 'Add',
  deleteAccount: 'Delete account',
  resetFaTitle: 'Reset Fixed Asset?',
  resetFaMessage: 'All Fixed Asset data will be deleted. This action cannot be undone.',
  resetFaConfirm: 'Reset Fixed Asset',
  resetAllTitle: 'Reset All Data?',
  resetAllMessage: 'ALL form data (HOME + all inputs) will be deleted. This action cannot be undone.',
  resetAllConfirm: 'Reset All',
  acquisitionCosts: 'A. ACQUISITION COSTS',
  beginning: 'Beginning',
  additions: 'Additions',
  ending: 'Ending',
  depreciation: 'B. DEPRECIATION',
  netValueFixedAssets: 'NET VALUE FIXED ASSETS',
  totalBeginning: 'Total Beginning',
  totalAdditions: 'Total Additions',
  totalEnding: 'Total Ending',
  totalNetFixedAssets: 'TOTAL NET FIXED ASSETS',
}

const id: FaStrings = {
  pageTitle: 'Input — Aset Tetap',
  lineItemHeader: 'LINE ITEM',
  addHistoricalYear: 'Jumlah Tahun Historis',
  addYear: '+ Tahun',
  reduceYear: '− Tahun',
  addAccount: '+ Tambah Akun Aset Tetap',
  manualEntry: 'Isi Manual...',
  allAccountsAdded: 'Semua akun sudah ditambahkan',
  accountNamePlaceholder: 'Nama akun...',
  cancel: 'Batal',
  add: 'Tambah',
  deleteAccount: 'Hapus akun',
  resetFaTitle: 'Reset Aset Tetap?',
  resetFaMessage: 'Semua data Aset Tetap akan dihapus. Tindakan ini tidak dapat dibatalkan.',
  resetFaConfirm: 'Reset Aset Tetap',
  resetAllTitle: 'Reset Semua Data?',
  resetAllMessage: 'SEMUA data form (HOME + semua input) akan dihapus. Tindakan ini tidak dapat dibatalkan.',
  resetAllConfirm: 'Reset Semua',
  acquisitionCosts: 'A. HARGA PEROLEHAN',
  beginning: 'Awal',
  additions: 'Penambahan',
  ending: 'Akhir',
  depreciation: 'B. PENYUSUTAN',
  netValueFixedAssets: 'NILAI BUKU ASET TETAP',
  totalBeginning: 'Total Awal',
  totalAdditions: 'Total Penambahan',
  totalEnding: 'Total Akhir',
  totalNetFixedAssets: 'TOTAL NILAI BUKU ASET TETAP',
}

const translations: Record<Lang, FaStrings> = { en, id }

export function getFaStrings(language: Lang): FaStrings {
  return translations[language]
}
