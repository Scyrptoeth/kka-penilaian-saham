# Session 020 — CLI Prompt: Revisi Balance Sheet INPUT DATA

> **Scope**: Revisi arsitektur input Balance Sheet — dynamic rows dari dropdown catalog, bilingual account names, dynamic year columns, SIMPAN + RESET buttons
> **Pre-condition**: Session 019 selesai. Store v9. Build clean.
> **Prinsip**: Semua perubahan harus **system development** — bukan patching. Arsitektur baru harus backward-compatible dengan 20+ downstream consumers yang reference BS row numbers.
> **Scope terbatas**: HANYA Balance Sheet. Income Statement dan Fixed Asset akan di-session berikutnya setelah pola terbukti stabil.

---

## GAMBARAN BESAR PERUBAHAN

Session ini merombak cara user menginput data Balance Sheet. Saat ini BS menggunakan **hardcoded leaf rows** di manifest (Cash on Hands row 8, Account Receivable row 10, dst.). Session ini menggantinya dengan **fully dynamic rows** — user memilih akun dari dropdown catalog, dan bisa menambah akun sebanyak yang diperlukan.

**4 Sub-Revisi:**
1. **Bilingual account names** — toggle EN/ID, default EN, berlaku untuk leaf rows
2. **Dynamic account rows** — TIDAK ada default leaf rows; user membangun BS dari nol via dropdown
3. **Dynamic year columns** — default hanya Y-1, tombol "Tambah Tahun" tanpa batas
4. **SIMPAN + RESET buttons** — persist data + reset per-halaman dan seluruh data

**Dampak downstream**: 20+ files consume `balanceSheet` dari store. Risiko regresi tinggi jika row number mapping berubah. Strategi: **auto-map via catalog** — setiap akun di dropdown membawa `excelRow` backward-compatible, sehingga downstream calc tetap bekerja dengan reference row yang sama.

```
BEFORE (Session ≤019):                    AFTER (Session 020):
┌──────────────────────────┐              ┌──────────────────────────┐
│ Manifest: 46 hardcoded   │              │ Manifest: structural     │
│ rows (leaf + computed)   │              │ rows only (headers,      │
│                          │              │ subtotals, totals)       │
│ User edits fixed rows    │              │                          │
│                          │              │ User ADDS leaf rows      │
│                          │              │ from dropdown catalog    │
│ 4 year columns (fixed)   │              │                          │
│                          │              │ Dynamic year columns     │
│ English labels only      │              │ (start Y-1, add more)   │
└──────────────────────────┘              │                          │
                                          │ Bilingual EN/ID toggle   │
                                          └──────────────────────────┘
```

**Strategi minimalisasi risiko:**
- **Store shape `balanceSheet.rows`** tetap `Record<number, YearKeyedSeries>` — key = excelRow number. Downstream consumers TIDAK perlu berubah.
- **Tambah** `balanceSheet.accounts` (daftar akun yang dipilih user) dan `balanceSheet.yearCount` ke store. Ini TAMBAHAN, bukan penggantian.
- **Catalog accounts** masing-masing punya `excelRow` yang match dengan Excel template asli → backward-compatible.
- **Custom accounts** (user ketik manual) mendapat `excelRow` di range 1000+ → otomatis masuk subtotal via section-based summing.
- **deriveComputedRows** perlu modifikasi: subtotals sekarang sum SEMUA leaf rows di section-nya (dynamic), bukan hardcoded `computedFrom` array.

---

## TASK A: Account Catalog — Fondasi Sistem Dynamic Rows

### Why
User perlu memilih akun BS dari daftar yang sudah didefinisikan (pre-defined), dengan nama bilingual (EN/ID). Catalog ini menjadi single source of truth untuk:
1. Dropdown options (sorted alphabetically)
2. Backward-compatible `excelRow` mapping ke Excel template
3. Section assignment (Current Assets, Fixed Assets, Non-Current Assets, Current Liabilities, Non-Current Liabilities, Equity)

### What

Buat file baru: `src/data/catalogs/balance-sheet-catalog.ts`

```typescript
// === Types ===

/** Section dalam Balance Sheet */
export type BsSection =
  | 'current_assets'
  | 'fixed_assets'          // sub-section dari non-current
  | 'intangible_assets'     // sub-section dari non-current
  | 'other_non_current_assets'
  | 'current_liabilities'
  | 'non_current_liabilities'
  | 'equity'

/** Satu akun dalam catalog */
export interface BsCatalogAccount {
  /** Unique ID — slug format, immutable setelah dibuat */
  id: string
  /** English name — ditampilkan saat language = 'en' */
  labelEn: string
  /** Indonesian name — ditampilkan saat language = 'id' */
  labelId: string
  /** Section tempat akun ini berada */
  section: BsSection
  /**
   * Row number di Excel template asli (kka-penilaian-saham.xlsx).
   * Ini yang tersimpan di store sebagai key di `rows` Record.
   * Custom accounts (user-defined) mendapat row number ≥ 1000.
   */
  excelRow: number
  /** Default indent level saat ditampilkan */
  indent?: 0 | 1 | 2
}

/** Akun yang dipilih user dan tersimpan di store */
export interface BsAccountEntry {
  /** ID dari catalog, atau `custom_${timestamp}` untuk akun manual */
  catalogId: string
  /** excelRow number — dari catalog atau generated (≥1000) untuk custom */
  excelRow: number
  /** Section assignment */
  section: BsSection
  /** Custom label (hanya untuk akun manual / "Isi Manual") */
  customLabel?: string
}

// === Catalog Data ===
// CLI: WAJIB verifikasi excelRow numbers terhadap file Excel asli.
// Buka kka-penilaian-saham.xlsx sheet "NERACA" dan cocokkan row numbers.

export const BS_CATALOG_ASSETS: BsCatalogAccount[] = [
  // Current Assets — excelRow harus match manifest existing
  { id: 'cash',              labelEn: 'Cash on Hands',              labelId: 'Kas dan Setara Kas',          section: 'current_assets',   excelRow: 8 },
  { id: 'short_term_invest', labelEn: 'Short-term Investment',      labelId: 'Investasi Jangka Pendek',     section: 'current_assets',   excelRow: 9 },
  { id: 'account_receivable',labelEn: 'Account Receivable',         labelId: 'Piutang Usaha',               section: 'current_assets',   excelRow: 10 },
  { id: 'other_receivable',  labelEn: 'Other Receivable',           labelId: 'Piutang Lain-lain',           section: 'current_assets',   excelRow: 11 },
  { id: 'inventory',         labelEn: 'Inventory',                  labelId: 'Persediaan',                  section: 'current_assets',   excelRow: 12 },
  { id: 'prepaid_expenses',  labelEn: 'Prepaid Expenses',           labelId: 'Biaya Dibayar Dimuka',        section: 'current_assets',   excelRow: 13 },
  { id: 'other_current_assets', labelEn: 'Other Current Assets',    labelId: 'Aset Lancar Lainnya',         section: 'current_assets',   excelRow: 14 },

  // Fixed Assets (sub-section non-current)
  { id: 'fixed_assets_beginning', labelEn: 'Fixed Assets, Beginning', labelId: 'Aset Tetap, Saldo Awal',   section: 'fixed_assets',     excelRow: 20 },
  { id: 'accum_depreciation',     labelEn: 'Accumulated Depreciation',labelId: 'Akumulasi Penyusutan',      section: 'fixed_assets',     excelRow: 21 },

  // Intangible Assets
  { id: 'intangible_assets', labelEn: 'Intangible Assets',          labelId: 'Aset Tak Berwujud',           section: 'intangible_assets', excelRow: 24 },

  // Other Non-Current
  { id: 'other_non_current', labelEn: 'Other Non-Current Assets',   labelId: 'Aset Tidak Lancar Lainnya',   section: 'other_non_current_assets', excelRow: 23 },
]

export const BS_CATALOG_LIABILITIES: BsCatalogAccount[] = [
  // Current Liabilities
  { id: 'account_payable',   labelEn: 'Account Payable',            labelId: 'Utang Usaha',                 section: 'current_liabilities',     excelRow: 31 },
  { id: 'short_term_debt',   labelEn: 'Short-term Debt',            labelId: 'Utang Jangka Pendek',         section: 'current_liabilities',     excelRow: 32 },
  { id: 'tax_payable',       labelEn: 'Tax Payable',                labelId: 'Utang Pajak',                 section: 'current_liabilities',     excelRow: 33 },
  { id: 'other_current_liab',labelEn: 'Other Current Liabilities',  labelId: 'Liabilitas Jangka Pendek Lainnya', section: 'current_liabilities', excelRow: 34 },

  // Non-Current Liabilities
  { id: 'long_term_debt',    labelEn: 'Long-term Debt',             labelId: 'Utang Jangka Panjang',        section: 'non_current_liabilities', excelRow: 38 },
  { id: 'other_non_current_liab', labelEn: 'Other Non-Current Liabilities', labelId: 'Liabilitas Jk Panjang Lainnya', section: 'non_current_liabilities', excelRow: 39 },
]

export const BS_CATALOG_EQUITY: BsCatalogAccount[] = [
  // Equity
  { id: 'paid_in_capital',   labelEn: 'Paid-in Capital',            labelId: 'Modal Disetor',               section: 'equity',  excelRow: 43 },
  { id: 'additional_paid_in',labelEn: 'Additional Paid-in Capital', labelId: 'Tambahan Modal Disetor',      section: 'equity',  excelRow: 44 },
  { id: 'retained_earnings_beginning', labelEn: 'Retained Earnings, Beginning', labelId: 'Laba Ditahan, Saldo Awal', section: 'equity', excelRow: 46 },
  { id: 'net_income',        labelEn: 'Net Income',                 labelId: 'Laba Bersih Tahun Berjalan',  section: 'equity',  excelRow: 47 },
]

// Combined catalog for lookups
export const BS_CATALOG_ALL: BsCatalogAccount[] = [
  ...BS_CATALOG_ASSETS,
  ...BS_CATALOG_LIABILITIES,
  ...BS_CATALOG_EQUITY,
]

// Helper: get account by ID
export function getCatalogAccount(id: string): BsCatalogAccount | undefined {
  return BS_CATALOG_ALL.find((a) => a.id === id)
}

// Helper: generate next custom excelRow (1000+)
export function generateCustomExcelRow(existingAccounts: BsAccountEntry[]): number {
  const customRows = existingAccounts
    .filter((a) => a.excelRow >= 1000)
    .map((a) => a.excelRow)
  return customRows.length === 0 ? 1000 : Math.max(...customRows) + 1
}

// Helper: get catalog accounts for a section, sorted alphabetically by label
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
```

**PENTING — CLI WAJIB verifikasi**:
1. Buka `kka-penilaian-saham.xlsx` sheet "NERACA" 
2. Cocokkan setiap `excelRow` number di catalog dengan row number SEBENARNYA di Excel
3. Jika ada perbedaan, sesuaikan catalog (Excel = source of truth)
4. Jika ada akun di Excel yang belum ada di catalog, TAMBAHKAN

### Verification Task A
- Semua `excelRow` numbers di catalog match dengan Excel template
- `getCatalogBySection()` returns sorted results
- `generateCustomExcelRow()` returns 1000 for first custom, increments correctly
- TypeScript clean

---

## TASK B: Update Types + Store — BalanceSheetInputState v2

### Why
Store shape `BalanceSheetInputState` perlu diperluas untuk menyimpan:
1. Daftar akun yang dipilih user (`accounts`)
2. Jumlah tahun yang ditampilkan (`yearCount`)
3. Bahasa yang dipilih (`language`)

**KRITIS**: `rows: Record<number, YearKeyedSeries>` TETAP ADA dan TETAP jadi key di store. Ini yang dibaca oleh 20+ downstream consumers. JANGAN ubah atau rename.

### B1. Update Type

**File**: `src/data/live/types.ts`

```typescript
// BEFORE:
export interface BalanceSheetInputState {
  rows: Record<number, YearKeyedSeries>
}

// AFTER:
import type { BsAccountEntry } from '@/data/catalogs/balance-sheet-catalog'

export interface BalanceSheetInputState {
  /** User-selected accounts — ordered as displayed */
  accounts: BsAccountEntry[]
  /** Number of historical years to display (minimum 1 = Y-1 only) */
  yearCount: number
  /** Display language for account labels: 'en' | 'id' */
  language: 'en' | 'id'
  /** Cell values keyed by excelRow → year → value. BACKWARD-COMPATIBLE — jangan ubah shape. */
  rows: Record<number, YearKeyedSeries>
}
```

### B2. Store Migration v9 → v10

**File**: `src/lib/store/useKkaStore.ts`

```typescript
// Bump STORE_VERSION dari 9 ke 10

// v9 → v10 migration:
if (fromVersion < 10) {
  if (state.balanceSheet && typeof state.balanceSheet === 'object') {
    const bs = state.balanceSheet as Record<string, unknown>
    state = {
      ...state,
      balanceSheet: {
        accounts: bs.accounts ?? [],        // empty = user belum pilih akun
        yearCount: bs.yearCount ?? 1,       // default 1 tahun (Y-1)
        language: bs.language ?? 'en',      // default English
        rows: bs.rows ?? {},                // preserve existing rows
      },
    }
  }
}
```

**Backward-compatibility**: User yang sudah punya `balanceSheet.rows` dari session sebelumnya:
- `rows` tetap preserved
- `accounts` akan kosong (user perlu re-add akun dari dropdown — ini expected karena format baru)
- Atau, CLI bisa implement **auto-detect**: jika `rows` sudah terisi tapi `accounts` kosong, reverse-lookup excelRow numbers ke catalog dan auto-populate `accounts`. Ini OPSIONAL — jika terlalu kompleks, skip. User bisa re-add manual.

### B3. Update Store Setters

Tambah/update setters di store:

```typescript
// New setters:
setBsAccounts: (accounts: BsAccountEntry[]) => void
setBsYearCount: (yearCount: number) => void  
setBsLanguage: (language: 'en' | 'id') => void
addBsAccount: (account: BsAccountEntry) => void
removeBsAccount: (catalogId: string) => void
resetBalanceSheet: () => void  // sudah ada, pastikan reset accounts + yearCount + language juga

// Update existing setter:
setBalanceSheet: (bs: BalanceSheetInputState) => void  // tetap sama signature
```

**Implementation `addBsAccount`**:
```typescript
addBsAccount: (account) => set((state) => ({
  balanceSheet: state.balanceSheet
    ? {
        ...state.balanceSheet,
        accounts: [...state.balanceSheet.accounts, account],
      }
    : {
        accounts: [account],
        yearCount: 1,
        language: 'en',
        rows: {},
      },
})),
```

**Implementation `removeBsAccount`**:
```typescript
removeBsAccount: (catalogId) => set((state) => {
  if (!state.balanceSheet) return state
  const account = state.balanceSheet.accounts.find(a => a.catalogId === catalogId)
  const newAccounts = state.balanceSheet.accounts.filter(a => a.catalogId !== catalogId)
  
  // Also clean up rows for this account's excelRow
  const newRows = { ...state.balanceSheet.rows }
  if (account) delete newRows[account.excelRow]
  
  return {
    balanceSheet: {
      ...state.balanceSheet,
      accounts: newAccounts,
      rows: newRows,
    },
  }
}),
```

### Verification Task B
- Migration test: v9 → v10 preserves existing `rows`, adds `accounts: []`, `yearCount: 1`, `language: 'en'`
- TypeScript: `tsc --noEmit` clean
- Existing tests tetap passing (downstream consumers masih baca `balanceSheet.rows` — shape sama)

---

## TASK C: Update deriveComputedRows — Dynamic Section-Based Summing

### Why
Saat ini `computedFrom` arrays di manifest HARDCODED:
```typescript
// Contoh existing:
{ excelRow: 16, label: 'Total Current Assets', computedFrom: [8, 9, 10, 11, 12, 13, 14] }
```

Dengan dynamic rows, user mungkin hanya menambah 3 dari 7 akun current assets. Subtotal harus sum HANYA akun yang ada, bukan semua 7.

### What — Dua Pendekatan (Pilih salah satu)

**Pendekatan A: Dynamic computedFrom dari accounts** (RECOMMENDED)

Buat fungsi baru yang membangun `computedFrom` array dari accounts yang aktif:

```typescript
// File: src/data/manifests/build-dynamic-manifest.ts (BARU)

import type { ManifestRow, SheetManifest } from './types'
import type { BsAccountEntry, BsSection } from '@/data/catalogs/balance-sheet-catalog'

/**
 * Section → subtotal/total excelRow mapping.
 * Key: section ID dari catalog. Value: excelRow subtotal-nya di manifest structural.
 */
const SECTION_SUBTOTAL_MAP: Record<BsSection, number> = {
  current_assets: 16,           // Total Current Assets
  fixed_assets: 22,             // Fixed Assets, Net
  intangible_assets: 24,        // (atau merge ke non-current total)
  other_non_current_assets: 25, // Total Non-Current Assets (mungkin perlu adjust)
  current_liabilities: 35,      // Total Current Liabilities
  non_current_liabilities: 40,  // Total Non-Current Liabilities
  equity: 49,                   // Shareholders' Equity
}

/**
 * Bangun manifest rows dari structural template + dynamic user accounts.
 * 
 * Structural rows (headers, subtotals, totals) selalu ada.
 * Leaf rows dibangun dari `accounts` array.
 * Subtotal `computedFrom` di-generate dynamic dari accounts di section-nya.
 */
export function buildDynamicBsManifest(
  accounts: BsAccountEntry[],
  language: 'en' | 'id',
  yearCount: number,
  tahunTransaksi: number,
): SheetManifest {
  // 1. Start with structural rows (headers, subtotals, totals)
  const structuralRows = buildStructuralRows()
  
  // 2. Insert leaf rows (from accounts) into correct positions
  const allRows = insertAccountRows(structuralRows, accounts, language)
  
  // 3. Update computedFrom arrays based on actual accounts per section
  const finalRows = updateComputedFromArrays(allRows, accounts)
  
  // 4. Build year axis
  const years = computeHistoricalYears(tahunTransaksi, yearCount)
  
  return {
    title: 'Balance Sheet',
    slug: 'balance-sheet',
    historicalYearCount: yearCount,
    years,
    columns: generateLiveColumns(years),
    totalAssetsRow: 27,
    derivations: [
      { type: 'commonSize' },
      { type: 'yoyGrowth', safe: true },
    ],
    rows: finalRows,
  }
}
```

**Structural rows** yang SELALU ada (tidak bisa dihapus user):

```typescript
function buildStructuralRows(): ManifestRow[] {
  return [
    // === ASSETS ===
    { label: 'ASSETS', type: 'header' },
    
    // Current Assets section
    { label: 'Current Assets', type: 'header', indent: 0 },
    // ... leaf rows akan di-insert di sini ...
    { excelRow: 16, label: 'Total Current Assets', type: 'subtotal', computedFrom: [] },
    
    { type: 'separator' },
    
    // Non-Current Assets section  
    { label: 'Non-Current Assets', type: 'header', indent: 0 },
    // Fixed Assets sub-section
    // ... leaf rows di-insert ...
    { excelRow: 22, label: 'Fixed Assets, Net', type: 'subtotal', computedFrom: [] },
    // Intangible + Other non-current
    // ... leaf rows di-insert ...
    { excelRow: 25, label: 'Total Non-Current Assets', type: 'subtotal', computedFrom: [22] },
    // NOTE: computedFrom [22] akan di-extend dengan intangible dan other rows
    
    { type: 'separator' },
    { excelRow: 27, label: 'TOTAL ASSETS', type: 'total', computedFrom: [16, 25] },
    
    { type: 'separator' },
    
    // === LIABILITIES & EQUITY ===
    { label: 'LIABILITIES & EQUITY', type: 'header' },
    
    // Current Liabilities
    { label: 'Current Liabilities', type: 'header', indent: 0 },
    // ... leaf rows di-insert ...
    { excelRow: 35, label: 'Total Current Liabilities', type: 'subtotal', computedFrom: [] },
    
    { type: 'separator' },
    
    // Non-Current Liabilities
    { label: 'Non-Current Liabilities', type: 'header', indent: 0 },
    // ... leaf rows di-insert ...
    { excelRow: 40, label: 'Total Non-Current Liabilities', type: 'subtotal', computedFrom: [] },
    
    { type: 'separator' },
    { excelRow: 41, label: 'TOTAL LIABILITIES', type: 'total', computedFrom: [35, 40] },
    
    { type: 'separator' },
    
    // Equity
    { label: 'Equity', type: 'header', indent: 0 },
    // ... leaf rows di-insert ...
    { excelRow: 48, label: 'Retained Earnings, Ending Balance', type: 'subtotal', computedFrom: [] },
    { excelRow: 49, label: "Shareholders' Equity", type: 'subtotal', computedFrom: [] },
    
    { type: 'separator' },
    { excelRow: 51, label: 'TOTAL LIABILITIES & EQUITY', type: 'total', computedFrom: [41, 49] },
  ]
}
```

**`updateComputedFromArrays`** — logika dynamic summing:

```typescript
function updateComputedFromArrays(
  rows: ManifestRow[],
  accounts: BsAccountEntry[],
): ManifestRow[] {
  // Group accounts by section
  const bySection = new Map<BsSection, number[]>()
  for (const acc of accounts) {
    const existing = bySection.get(acc.section) ?? []
    existing.push(acc.excelRow)
    bySection.set(acc.section, existing)
  }
  
  return rows.map((row) => {
    if (!row.computedFrom) return row
    if (!row.excelRow) return row
    
    // Map subtotal excelRow → sections it should sum
    switch (row.excelRow) {
      case 16: // Total Current Assets → sum all current_assets accounts
        return { ...row, computedFrom: bySection.get('current_assets') ?? [] }
      
      case 22: // Fixed Assets Net → sum fixed_assets accounts (with sign)
        return { ...row, computedFrom: buildFixedAssetRefs(bySection.get('fixed_assets') ?? []) }
      
      case 25: // Total Non-Current Assets → Fixed Assets Net + intangible + other
        return {
          ...row,
          computedFrom: [
            22, // Fixed Assets Net (already computed)
            ...(bySection.get('intangible_assets') ?? []),
            ...(bySection.get('other_non_current_assets') ?? []),
          ],
        }
      
      case 35: // Total Current Liabilities
        return { ...row, computedFrom: bySection.get('current_liabilities') ?? [] }
      
      case 40: // Total Non-Current Liabilities
        return { ...row, computedFrom: bySection.get('non_current_liabilities') ?? [] }
      
      case 48: // Retained Earnings Ending Balance → beginning + net income
        return {
          ...row,
          computedFrom: accounts
            .filter((a) => a.catalogId === 'retained_earnings_beginning' || a.catalogId === 'net_income')
            .map((a) => a.excelRow),
        }
      
      case 49: // Shareholders' Equity → paid-in + additional + retained ending
        return {
          ...row,
          computedFrom: [
            ...accounts
              .filter((a) => a.catalogId === 'paid_in_capital' || a.catalogId === 'additional_paid_in')
              .map((a) => a.excelRow),
            48, // Retained Earnings Ending (computed)
          ],
        }
      
      default:
        return row
    }
  })
}
```

**Fixed Assets khusus** — row 22 (Net) = Beginning + Accumulated Depreciation (negatif):
```typescript
function buildFixedAssetRefs(fixedAssetRows: number[]): number[] {
  // Convention: Accum Depreciation di-subtract (negatif)
  // catalogId 'accum_depreciation' → negative ref
  // Ini bergantung pada data: CLI harus cek apakah user input accum depreciation
  // sebagai angka positif (lalu di-subtract) atau sudah negatif
  // 
  // SAFEST: ikuti convention existing manifest — row 22 computedFrom: [20, 21]
  // dimana row 21 (accum depreciation) diinput sebagai NEGATIF oleh user
  // Jadi semua refs positif (sum), user yang input negatif.
  return fixedAssetRows
}
```

### Penting: deriveComputedRows TIDAK perlu diubah

Fungsi `deriveComputedRows()` di `src/lib/calculations/derive-computed-rows.ts` sudah generic — ia membaca `computedFrom` array dari manifest row dan melakukan sum. Karena kita membangun manifest row dengan `computedFrom` yang sudah dynamic, `deriveComputedRows` tetap bekerja tanpa modifikasi.

Yang berubah adalah **INPUT ke deriveComputedRows** (manifest rows dengan computedFrom yang dynamic), bukan fungsinya sendiri.

### Verification Task C
- Unit test: `buildDynamicBsManifest()` dengan 3 current asset accounts → subtotal row 16 computedFrom = [those 3 excelRows]
- Unit test: zero accounts → subtotals computedFrom = [] → semua total = 0
- Unit test: custom account (excelRow 1000) → masuk subtotal section yang benar
- `deriveComputedRows` existing tests tetap passing
- Downstream consumers yang pakai `deriveComputedRows(manifest.rows, ...)` tetap bekerja

---

## TASK D: New Balance Sheet Input Page — Dynamic UI

### Why
Halaman input BS saat ini menggunakan `ManifestEditor` yang generic dan expects hardcoded manifest. Untuk dynamic rows, perlu komponen baru yang mendukung: dropdown account selection, add/remove rows, bilingual toggle, dan dynamic year columns.

### What

Buat komponen baru: `src/components/forms/DynamicBsEditor.tsx`

**JANGAN modifikasi ManifestEditor.tsx** — itu masih dipakai oleh Income Statement dan Fixed Asset pages. Buat komponen terpisah untuk Balance Sheet.

### D1. Component Structure

```
DynamicBsEditor
├── Header (title + bilingual toggle + year controls)
├── Section: ASSETS
│   ├── SectionHeader "Current Assets"
│   ├── AccountRow × N (from accounts where section = current_assets)
│   ├── AddAccountDropdown (filtered to current_assets catalog)
│   ├── SubtotalRow "Total Current Assets" (computed)
│   ├── ... (Fixed Assets, Intangible, Other Non-Current sections)
│   └── TotalRow "TOTAL ASSETS" (computed)
├── Section: LIABILITIES & EQUITY
│   ├── ... (same pattern)
│   └── TotalRow "TOTAL LIABILITIES & EQUITY" (computed)
└── Footer (SIMPAN + RESET buttons)
```

### D2. Props & State

```typescript
'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildDynamicBsManifest } from '@/data/manifests/build-dynamic-manifest'
import {
  BS_CATALOG_ASSETS,
  BS_CATALOG_LIABILITIES,
  BS_CATALOG_EQUITY,
  getCatalogBySection,
  generateCustomExcelRow,
  type BsAccountEntry,
  type BsCatalogAccount,
  type BsSection,
} from '@/data/catalogs/balance-sheet-catalog'
import { deriveComputedRows } from '@/lib/calculations/derive-computed-rows'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'

export default function DynamicBsEditor() {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const setBalanceSheet = useKkaStore((s) => s.setBalanceSheet)
  
  // Local state — mirrors store, debounced persist
  const [accounts, setAccounts] = useState<BsAccountEntry[]>(
    () => balanceSheet?.accounts ?? []
  )
  const [yearCount, setYearCount] = useState(
    () => balanceSheet?.yearCount ?? 1
  )
  const [language, setLanguage] = useState<'en' | 'id'>(
    () => balanceSheet?.language ?? 'en'
  )
  const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(
    () => balanceSheet?.rows ?? {}
  )
  
  // Debounced persist (same 500ms pattern as ManifestEditor)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const persistToStore = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setBalanceSheet({
        accounts,
        yearCount,
        language,
        rows: localRows,
      })
    }, 500)
  }, [accounts, yearCount, language, localRows, setBalanceSheet])
  
  // Build dynamic manifest from current accounts
  const dynamicManifest = useMemo(
    () => buildDynamicBsManifest(accounts, language, yearCount, home!.tahunTransaksi),
    [accounts, language, yearCount, home],
  )
  
  // Derive computed rows (subtotals, totals)
  const years = useMemo(
    () => computeHistoricalYears(home!.tahunTransaksi, yearCount),
    [home, yearCount],
  )
  const computedValues = useMemo(
    () => deriveComputedRows(dynamicManifest.rows, localRows, years),
    [dynamicManifest.rows, localRows, years],
  )
  
  // ... handlers below
}
```

### D3. Add Account Handler

```typescript
const handleAddAccount = useCallback((catalogAccount: BsCatalogAccount) => {
  const entry: BsAccountEntry = {
    catalogId: catalogAccount.id,
    excelRow: catalogAccount.excelRow,
    section: catalogAccount.section,
  }
  setAccounts((prev) => [...prev, entry])
  // Trigger persist
  persistToStore()
}, [persistToStore])

const handleAddCustomAccount = useCallback((section: BsSection, label: string) => {
  const excelRow = generateCustomExcelRow(accounts)
  const entry: BsAccountEntry = {
    catalogId: `custom_${Date.now()}`,
    excelRow,
    section,
    customLabel: label,
  }
  setAccounts((prev) => [...prev, entry])
  persistToStore()
}, [accounts, persistToStore])

const handleRemoveAccount = useCallback((catalogId: string) => {
  setAccounts((prev) => {
    const account = prev.find((a) => a.catalogId === catalogId)
    if (account) {
      // Clean up row values too
      setLocalRows((prevRows) => {
        const next = { ...prevRows }
        delete next[account.excelRow]
        return next
      })
    }
    return prev.filter((a) => a.catalogId !== catalogId)
  })
  persistToStore()
}, [persistToStore])
```

### D4. AddAccountDropdown Component

Buat sub-component `AddAccountDropdown`:

```typescript
interface AddAccountDropdownProps {
  section: BsSection
  language: 'en' | 'id'
  existingAccountIds: string[]  // IDs already added — exclude from dropdown
  onSelect: (account: BsCatalogAccount) => void
  onCustom: (label: string) => void
}
```

**UX Requirements:**
- Dropdown button: "+ Tambah Akun" (atau "+ Add Account" jika language EN)
- Saat diklik: munculkan list akun dari catalog untuk section ini, MINUS yang sudah dipilih
- Sort alphabetically berdasarkan language aktif
- Option terakhir: **"Isi Manual..."** — munculkan text input untuk user ketik nama akun custom
- Setelah dipilih, dropdown tertutup dan row baru muncul di section

**Styling**: 
- Dropdown mirip `<select>` atau custom popover — sesuaikan dengan design system existing
- Button style: dashed border, text muted, hover highlight (mirip "add item" pattern)
- Posisi: di bawah leaf rows terakhir di section, SEBELUM subtotal row

### D5. Bilingual Toggle

Di header area:
```
[Input — Balance Sheet]                              [EN | ID] toggle
```

- Toggle switch atau segmented button: "EN" | "ID"
- Default: "EN" (English)
- Saat toggle:
  1. Update `language` state
  2. Semua leaf row labels re-render sesuai bahasa
  3. Structural rows (headers, subtotals, totals) TETAP dalam English (konsisten dengan Excel template)
  4. Persist language ke store

### D6. Dynamic Year Columns

**Default**: hanya 1 tahun (Y-1 = tahunTransaksi - 1)

**"Tambah Tahun" button**: di header, samping bilingual toggle
```
[Input — Balance Sheet]     [+ Tambah Tahun]     [EN | ID]
```

- Klik → `yearCount` increment by 1
- Tahun bertambah ke KIRI (historis lebih jauh): jika tahunTransaksi=2021, yearCount=1 → [2020]. yearCount=2 → [2019, 2020]. yearCount=3 → [2018, 2019, 2020]. dst.
- **Tidak ada batas** jumlah tahun
- Jika yearCount > 1, tampilkan juga tombol "- Kurangi Tahun" (minimum 1 tahun)
- Year headers di tabel: tampilkan angka tahun

**Integrasi dengan computeHistoricalYears**: sudah ada helper `computeHistoricalYears(tahunTransaksi, count)` di `src/lib/calculations/year-helpers.ts`. Gunakan ini.

### D7. AccountRow Rendering

Setiap leaf row (dari accounts) render:
```
[Trash icon] [Account Label]  |  [Year 1 input]  |  [Year 2 input]  |  ...
```

- **Trash icon**: klik → konfirmasi → hapus akun + data-nya
- **Account Label**: dari catalog (bilingual) atau customLabel. Indent level 1.
- **Year inputs**: `<NumericInput>` components (reuse dari RowInputGrid pattern)
  - IDR format
  - Negative numbers displayed in red
  - Focus: show raw number. Blur: format with dots

**PENTING**: Value storage tetap di `localRows[excelRow][year]` — sama pattern seperti ManifestEditor. Hanya cara RENDERING rows yang berbeda (dynamic dari accounts vs hardcoded dari manifest).

### D8. Cell Value Change Handler

```typescript
const handleCellChange = useCallback(
  (excelRow: number, year: number, value: number) => {
    setLocalRows((prev) => {
      const nextRow = { ...(prev[excelRow] ?? {}), [year]: value }
      const next = { ...prev, [excelRow]: nextRow }
      return next
    })
    persistToStore()
  },
  [persistToStore],
)
```

### D9. SIMPAN + RESET Buttons

Di footer:
```
[SIMPAN]  [RESET HALAMAN INI]  [RESET SELURUH DATA]
```

Pattern sama persis dengan Sub-Revisi 7 di Session 019 (HomeForm):

**SIMPAN**:
- Force persist ke store (skip debounce, langsung `setBalanceSheet(...)`)
- Visual feedback: brief "Tersimpan!" toast atau green checkmark

**RESET HALAMAN INI**:
- Reset `balanceSheet` slice ke null → `resetBalanceSheet()`
- Konfirmasi dialog: "Yakin ingin mereset data Balance Sheet? Semua akun dan nilai yang sudah diinput akan dihapus."
- Setelah reset: halaman kembali ke state kosong (no accounts, no rows)

**RESET SELURUH DATA**:
- Reset seluruh Zustand store
- Konfirmasi dialog: "Yakin ingin mereset SELURUH data? Semua input di semua halaman akan dihapus. Tindakan ini tidak bisa dibatalkan."

### D10. Update Balance Sheet Page

**File**: `src/app/input/balance-sheet/page.tsx`

Replace `ManifestEditor` usage dengan `DynamicBsEditor`:

```typescript
// BEFORE:
import { ManifestEditor } from '@/components/forms/ManifestEditor'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'

// AFTER:
import DynamicBsEditor from '@/components/forms/DynamicBsEditor'

export default function InputBalanceSheetPage() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  if (!hasHydrated) return <p className="text-sm text-ink-muted">Memuat...</p>
  if (!home) return <HomeGuard />  // existing pattern

  return <DynamicBsEditor />
}
```

### Verification Task D
- Halaman input BS render tanpa error
- Toggle EN/ID: leaf row labels berubah, structural rows tetap English
- "Tambah Tahun": kolom bertambah ke kiri (tahun historis lebih jauh)
- "Kurangi Tahun": kolom berkurang (minimum 1)
- Add account dari dropdown: row muncul di section yang benar
- "Isi Manual": bisa ketik nama custom, row muncul
- Remove account: row + data hilang, subtotals update
- Input nilai → subtotals dan totals auto-update (via deriveComputedRows)
- SIMPAN: data persist ke store (refresh halaman → data masih ada)
- RESET HALAMAN INI: BS kembali kosong
- Negative values: ditampilkan merah
- Build clean

---

## TASK E: Update Downstream Integration — SheetPage + Historical View

### Why
Halaman historical BS (`/historical/balance-sheet`) dan komponen `SheetPage` juga membaca `balanceSheet` dari store. Mereka perlu bisa handle format baru (dynamic accounts + dynamic years).

### E1. SheetPage Live Mode Override

**File**: `src/components/financial/SheetPage.tsx`

SheetPage sudah punya mekanisme live mode override (lines 136-145) yang membangun `effectiveManifest`. Perlu update agar menggunakan `buildDynamicBsManifest()` saat slug = 'balance-sheet':

```typescript
const effectiveManifest = useMemo<SheetManifest>(() => {
  if (!isLive) return manifest
  
  // Balance Sheet: use dynamic manifest builder
  if (manifest.slug === 'balance-sheet' && liveState?.accounts) {
    return buildDynamicBsManifest(
      liveState.accounts,
      liveState.language ?? 'en',
      liveState.yearCount ?? liveYears.length,
      home!.tahunTransaksi,
    )
  }
  
  // Other sheets: existing override logic
  return {
    ...manifest,
    years: liveYears,
    columns: generateLiveColumns(liveYears),
    commonSizeColumns: undefined,
    growthColumns: undefined,
  }
}, [isLive, manifest, liveState, liveYears, home])
```

**PENTING**: `liveState` di sini perlu akses ke full `BalanceSheetInputState` (bukan hanya `rows`). Cek apakah `sliceSelector` saat ini hanya return `rows` atau full state. Jika hanya `rows`, perlu adjust selector di historical page.

### E2. Historical BS Page

**File**: `src/app/historical/balance-sheet/page.tsx`

Pastikan selector mengoper full `BalanceSheetInputState` ke SheetPage (bukan hanya `rows`), atau adjust SheetPage agar bisa handle kedua kasus.

### E3. Downstream Calculation Consumers

File-file berikut membaca `balanceSheet.rows` dari store — mereka TIDAK perlu diubah karena `rows` shape tetap `Record<number, YearKeyedSeries>`:

```
src/app/valuation/dcf/page.tsx
src/app/valuation/aam/page.tsx
src/app/valuation/eem/page.tsx
src/app/valuation/borrowing-cap/page.tsx
src/app/valuation/cfi/page.tsx
src/app/valuation/simulasi-potensi/page.tsx
src/app/dashboard/page.tsx
src/app/analysis/growth-rate/page.tsx
src/components/analysis/RoicLiveView.tsx
src/components/analysis/FinancialRatioLiveView.tsx
src/components/analysis/FcfLiveView.tsx
src/components/analysis/CashFlowLiveView.tsx
src/app/projection/balance-sheet/page.tsx
src/lib/calculations/projection-pipeline.ts
```

**Validasi CLI**: Grep semua file yang import/reference `balanceSheet` → pastikan mereka hanya akses `.rows` property. Jika ada yang akses property lain (e.g., `balanceSheet.accounts`), itu perlu adjustment.

### Verification Task E
- Historical BS page: menampilkan data sesuai dynamic accounts + years
- SheetPage live mode: derivations (commonSize, yoyGrowth) computed correctly
- Downstream calc pages: tetap berfungsi tanpa error
- Build clean

---

## TASK F: Update Balance Sheet Manifest (Legacy) — Keep for Seed Mode

### Why
File `src/data/manifests/balance-sheet.ts` masih diperlukan sebagai SEED data (demo mode saat user belum input). Jangan hapus, tapi pastikan ia TIDAK konflik dengan dynamic system baru.

### What

- **JANGAN hapus** file `balance-sheet.ts` manifest
- Rename export ke `BALANCE_SHEET_SEED_MANIFEST` (opsional — CLI assess apakah ini breaking)
- Atau: TETAP sebagai `BALANCE_SHEET_MANIFEST` tapi hanya dipakai di seed/demo context
- Pastikan `SheetPage` menggunakannya di seed mode (saat `balanceSheet` store = null) dan `buildDynamicBsManifest` di live mode

### Verification Task F
- Seed mode (store kosong): BS pages menampilkan demo data dari manifest
- Live mode (store terisi): BS pages menggunakan dynamic manifest
- Build clean

---

## TASK G: Tests

### G1. Account Catalog Tests

```typescript
describe('balance-sheet-catalog', () => {
  it('semua excelRow unique dalam catalog', () => { ... })
  it('getCatalogBySection returns sorted results', () => { ... })
  it('generateCustomExcelRow starts at 1000', () => { ... })
  it('generateCustomExcelRow increments correctly', () => { ... })
})
```

### G2. Dynamic Manifest Builder Tests

```typescript
describe('buildDynamicBsManifest', () => {
  it('no accounts → all subtotals/totals = 0 computedFrom', () => { ... })
  it('3 current asset accounts → Total Current Assets sums them', () => { ... })
  it('custom account (excelRow 1000) included in correct subtotal', () => { ... })
  it('Fixed Assets: Beginning + AccumDepr → Net computed correctly', () => { ... })
  it('TOTAL ASSETS = Total Current + Total Non-Current', () => { ... })
  it('TOTAL LIAB & EQUITY = Total Liabilities + Shareholders Equity', () => { ... })
  it('year columns match yearCount', () => { ... })
  it('language affects leaf labels only, not structural', () => { ... })
})
```

### G3. Store Migration Test

```typescript
describe('store migration v9 → v10', () => {
  it('preserves existing rows', () => { ... })
  it('adds accounts: [], yearCount: 1, language: en', () => { ... })
  it('handles balanceSheet: null gracefully', () => { ... })
})
```

### G4. Integration Test — deriveComputedRows with Dynamic Manifest

```typescript
describe('deriveComputedRows with dynamic BS', () => {
  it('sums only active accounts in section', () => {
    const accounts = [
      { catalogId: 'cash', excelRow: 8, section: 'current_assets' },
      { catalogId: 'inventory', excelRow: 12, section: 'current_assets' },
    ]
    const manifest = buildDynamicBsManifest(accounts, 'en', 1, 2021)
    const values = {
      8: { 2020: 100_000_000 },
      12: { 2020: 50_000_000 },
    }
    const computed = deriveComputedRows(manifest.rows, values, [2020])
    expect(computed[16][2020]).toBe(150_000_000) // Total Current Assets
  })
})
```

### G5. Existing Tests

- **SEMUA existing tests harus tetap passing** tanpa modifikasi (kecuali fixture yang perlu update untuk v10 migration)
- Jika ada test yang hardcode `BALANCE_SHEET_MANIFEST.rows` dan expect specific computedFrom arrays, itu mungkin perlu update

### Verification Task G
- `npm run test 2>&1 | tail -25` → all tests passing
- Zero regressions
- New tests cover: catalog, dynamic manifest, store migration, integration

---

## URUTAN EKSEKUSI

```
Task A (Account Catalog)                → commit: "feat: add BS account catalog with bilingual labels and excelRow mapping"
Task B (Types + Store v10)              → commit: "feat: extend BalanceSheetInputState with accounts, yearCount, language (store v9→v10)"
Task C (Dynamic Manifest Builder)       → commit: "feat: buildDynamicBsManifest with section-based computedFrom"
Task D (Dynamic BS Editor UI)           → commit: "feat: new DynamicBsEditor — dropdown accounts, bilingual toggle, dynamic years"
Task E (Downstream Integration)         → commit: "fix: update SheetPage and historical view for dynamic BS manifest"
Task F (Legacy Manifest Seed Mode)      → commit: "refactor: preserve BS manifest for seed mode, use dynamic manifest for live mode"
Task G (Tests)                          → commit: "test: add tests for BS catalog, dynamic manifest, store v10 migration"
```

Task A-C bisa dikerjakan berurutan karena saling bergantung. Task D bergantung pada A-C. Task E bergantung pada D. Task F dan G bisa dikerjakan kapan saja setelah D.

---

## FINAL VERIFICATION

```bash
npm run test 2>&1 | tail -25          # all tests passing
npm run build 2>&1 | tail -25         # zero errors
npm run typecheck 2>&1 | tail -5      # clean
npm run lint 2>&1 | tail -5           # zero warnings
```

### Manual Verification Checklist:
- [ ] Input BS page: no default leaf rows saat pertama kali
- [ ] Add account dari dropdown: row muncul di section yang benar
- [ ] Isi Manual: bisa ketik nama custom, row muncul dengan excelRow ≥ 1000
- [ ] Remove account: row + data hilang, subtotals update otomatis
- [ ] Input nilai: subtotals dan totals auto-compute via deriveComputedRows
- [ ] Toggle EN/ID: leaf row labels berubah, structural rows tetap English
- [ ] Tambah Tahun: kolom bertambah ke kiri (tahun historis lebih jauh)
- [ ] Kurangi Tahun: kolom berkurang, minimum 1 tahun
- [ ] SIMPAN: data persist (refresh → data masih ada)
- [ ] RESET HALAMAN INI: BS kosong (accounts + rows + yearCount reset)
- [ ] RESET SELURUH DATA: seluruh store reset
- [ ] Historical BS page: menampilkan data dynamic correctly
- [ ] Downstream pages (DCF, AAM, EEM, etc.): tetap berfungsi, baca `balanceSheet.rows` tanpa error
- [ ] Negative values: ditampilkan merah
- [ ] Balance check: TOTAL ASSETS === TOTAL LIABILITIES & EQUITY (jika data benar)
- [ ] Build + TypeScript + Lint clean

---

## CATATAN ARSITEKTURAL UNTUK CLI

### Hal yang WAJIB Diperhatikan

1. **Jangan ubah `deriveComputedRows()`** — fungsinya sudah generic. Yang diubah adalah MANIFEST yang menjadi input-nya.

2. **Jangan ubah downstream consumers** yang baca `balanceSheet.rows` — shape-nya tetap `Record<number, YearKeyedSeries>`. Backward-compatible by design.

3. **`ManifestEditor.tsx` jangan dimodifikasi** — masih dipakai IS dan FA. Buat komponen terpisah `DynamicBsEditor`.

4. **Store migration HARUS backward-compatible** — user dengan data v9 harus bisa upgrade ke v10 tanpa kehilangan `rows` data.

5. **excelRow numbers di catalog HARUS match Excel template** — ini kritis untuk export/upload compatibility.

6. **Custom accounts (excelRow ≥ 1000)** masuk subtotal via section-based summing, tapi TIDAK dimapping ke cell Excel saat export. Export hanya map catalog accounts yang punya excelRow < 1000.

7. **Language preference** di-persist per-halaman (di `balanceSheet.language`), bukan global. Session berikutnya untuk IS/FA akan punya language terpisah.

8. **JANGAN buat global state baru** untuk language — setiap sheet punya language sendiri di slice-nya.

### Pattern untuk IS/FA Nanti (Preview — TIDAK dikerjakan sekarang)

Session berikutnya akan menerapkan pattern yang sama ke Income Statement dan Fixed Asset. Oleh karena itu:
- `BsCatalogAccount` type bisa di-generalize jadi `CatalogAccount` (atau buat yang mirip untuk IS/FA)
- `buildDynamicBsManifest` pattern bisa di-extract jadi generic `buildDynamicManifest(catalogType, ...)` NANTI
- Untuk sekarang: **JANGAN over-abstract**. Buat BS-specific dulu, abstract nanti saat pattern terbukti stabil di 3 sheets.

### Lessons Learned yang Relevan
- **LESSON-030**: Backward-compatible adapter lebih baik dari refactor massal. Diterapkan di sini: `rows` shape tetap.
- **LESSON-046**: Gunakan centralized builders. Diterapkan: `buildDynamicBsManifest()` sebagai single builder.
- **LESSON-048**: Bracket WIDTH pattern, bukan cumulative limit. Relevan jika ada range-based logic.
