# Session 019 — Dynamic Fixed Asset Input (Catalog-Driven)

## Objective

Konversi halaman INPUT DATA — Fixed Asset dari hardcoded 6-kategori menjadi **catalog-driven dynamic input** menggunakan blueprint yang sudah terbangun di Dynamic Balance Sheet (Session 018). User bisa memilih akun Fixed Asset dari dropdown (maks 20 akun + "Isi Manual"), dan sections B (Depreciation) serta C (Net Value) auto-generate berdasarkan akun yang dipilih di A (Acquisition Costs - Beginning).

## Konteks Arsitektur

### Blueprint yang Sudah Ada (REUSE, jangan reinvent)

| Komponen | Lokasi | Reuse |
|----------|--------|-------|
| `RowInputGrid` | `src/components/forms/RowInputGrid.tsx` | As-is (fully generic) |
| `InlineDropdown` | Embedded di RowInputGrid.tsx | As-is |
| `ManifestRow` type | `src/data/manifests/types.ts` | As-is |
| `BsCatalogAccount` pattern | `src/data/catalogs/balance-sheet-catalog.ts` | Template untuk FA catalog |
| `buildDynamicBsManifest` | `src/data/manifests/build-dynamic-bs.ts` | Template untuk FA builder |
| `DynamicBsEditor` | `src/components/forms/DynamicBsEditor.tsx` | Template untuk FA editor |
| `getBsStrings` | `src/lib/i18n/balance-sheet.ts` | Template untuk FA i18n |

### Perbedaan Kunci FA vs BS

| Aspek | BS | FA |
|-------|----|----|
| Add-button | Per section (7 sections) | **SATU saja** di "A. Acquisition Costs - Beginning" |
| Row mirroring | Tidak ada | Setiap akun yang dipilih di Beginning auto-generate di: Additions, Ending (computed), B. Depreciation Beginning, Additions, Ending (computed), Net Value (computed) |
| Computed rows | Subtotals per section | Per-category Ending = Beginning + Additions; Net Value = Acq Ending - Dep Ending; Plus subtotals |
| Year count | Dynamic (default 4) | Dynamic (default 3, sesuai Excel) |
| Structure | Flat sections | 3-section roll-forward (Acquisition → Depreciation → Net Value) |

### Existing FA Structure (hardcoded, akan diganti)

```
A. ACQUISITION COSTS
  Beginning:     rows 8-13  (6 categories, editable)
  Total:         row 14     (SUM 8:13)
  Additions:     rows 17-22 (6 categories, editable)
  Total:         row 23     (SUM 17:22)
  Ending:        rows 26-31 (computed: Beginning + Additions per category)
  Total:         row 32     (= row 14 + row 23)

B. DEPRECIATION
  Beginning:     rows 36-41 (6 categories, editable)
  Total:         row 42     (SUM 36:41)
  Additions:     rows 45-50 (6 categories, editable)
  Total:         row 51     (SUM 45:50)
  Ending:        rows 54-59 (computed: Beginning + Additions per category)
  Total:         row 60     (= row 42 + row 51)

NET VALUE FIXED ASSETS
  Per category:  rows 63-68 (computed: Acq Ending - Dep Ending per category)
  TOTAL:         row 69     (SUM 63:68)
```

## Deliverables (URUTAN EKSEKUSI)

### 1. `src/data/catalogs/fixed-asset-catalog.ts`

Buat catalog akun Fixed Asset yang umum digunakan sesuai SAK/PSAK dan IFRS. Ikuti pattern persis dari `balance-sheet-catalog.ts`.

```typescript
export type FaSection = 'fixed_asset' // hanya 1 section (berbeda dari BS yang 7)

export interface FaCatalogAccount {
  id: string          // e.g. 'land', 'building', 'equipment_lab'
  labelEn: string     // English label
  labelId: string     // Indonesian label
  section: FaSection  // always 'fixed_asset'
  excelRow: number    // row di sub-block Beginning (8-13 for original, 100+ for extended)
}

export interface FaAccountEntry {
  catalogId: string
  excelRow: number
  section: FaSection
  customLabel?: string // for "Isi Manual" entries
}
```

**Akun catalog** (20 akun, bilingual, mengacu SAK/PSAK dan IFRS):

Contoh akun yang HARUS ada:
1. Tanah / Land
2. Bangunan / Building
3. Mesin & Peralatan / Equipment, Laboratory & Machinery
4. Kendaraan & Alat Berat / Vehicle & Heavy Equipment
5. Inventaris Kantor / Office Inventory
6. Instalasi Listrik / Electrical Installation
7. Peralatan Komputer / Computer Equipment
8. Furnitur / Furniture & Fixtures
9. Konstruksi Dalam Pengerjaan / Construction in Progress (CIP)
10. Peralatan Komunikasi / Communication Equipment
11-20. Tambahkan akun lain yang umum di PSAK 16 (Aset Tetap) dan IAS 16 (Property, Plant and Equipment)

**excelRow mapping:**
- rows 8-13: reserved for first 6 accounts (backward-compatible with existing data)
- rows 100-119: extended catalog accounts
- rows >= 1000: custom user accounts ("Isi Manual")

**Fungsi helper** (ikuti pattern BS):
- `getCatalogAccount(id: string): FaCatalogAccount | undefined`
- `generateCustomExcelRow(): number` — returns next available >= 1000
- `getCatalogBySection(): FaCatalogAccount[]`
- `FA_CATALOG: FaCatalogAccount[]` — sorted by excelRow

### 2. `src/lib/i18n/fixed-asset.ts`

Bilingual dictionary untuk UI Fixed Asset editor. Ikuti pattern dari `src/lib/i18n/balance-sheet.ts`.

```typescript
interface FaStrings {
  pageTitle: string
  lineItemHeader: string
  addHistoricalYear: string
  addYear: string
  reduceYear: string
  addAccount: string             // "+ Tambah Akun Fixed Asset"
  manualEntry: string            // "Isi Manual"
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
  // Section labels (for headers in manifest)
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

export function getFaStrings(language: 'en' | 'id'): FaStrings
```

### 3. `src/data/manifests/build-dynamic-fa.ts`

**Ini adalah deliverable paling kritis.** Dynamic manifest builder untuk Fixed Asset. Ikuti pattern `build-dynamic-bs.ts` tapi dengan logika mirroring.

```typescript
export function buildDynamicFaManifest(
  accounts: readonly FaAccountEntry[],
  language: 'en' | 'id',
  yearCount: number,
  tahunTransaksi: number,
): SheetManifest
```

**Logika kunci:**

Untuk setiap akun yang user pilih (misal excelRow = N, label = "Tanah"):

| Sub-block | Row | Type | Computed? |
|-----------|-----|------|-----------|
| A. Acq Beginning | N | normal (editable) | No |
| A. Acq Additions | N + OFFSET_ADD | normal (editable) | No |
| A. Acq Ending | N + OFFSET_END | computed | = Beginning + Additions |
| B. Dep Beginning | N + OFFSET_DEP_BEG | normal (editable) | No |
| B. Dep Additions | N + OFFSET_DEP_ADD | normal (editable) | No |
| B. Dep Ending | N + OFFSET_DEP_END | computed | = Dep Beginning + Dep Additions |
| Net Value | N + OFFSET_NET | computed | = Acq Ending - Dep Ending |

**OFFSET constants** (derived from existing manifest):
- Jika Beginning base = 8, maka: Additions = +9 (17-8), Ending = +18 (26-8), Dep Beginning = +28 (36-8), Dep Additions = +37 (45-8), Dep Ending = +46 (54-8), Net Value = +55 (63-8)
- Tapi ini HANYA berlaku untuk original 6 rows. Untuk dynamic rows, gunakan formula offset yang scalable.
- **Pendekatan yang LEBIH BAIK**: Jangan gunakan fixed offset. Assign excelRow ranges dynamically per sub-block:
  - Acq Beginning: use account.excelRow as-is
  - Acq Additions: 2000 + account.excelRow
  - Acq Ending: 3000 + account.excelRow
  - Dep Beginning: 4000 + account.excelRow
  - Dep Additions: 5000 + account.excelRow
  - Dep Ending: 6000 + account.excelRow
  - Net Value: 7000 + account.excelRow

**Subtotal rows** (dynamic computedFrom based on selected accounts):
- Total Beginning Acq: computedFrom = [all acq beginning excelRows]
- Total Additions Acq: computedFrom = [all acq additions excelRows]
- Total Ending Acq: computedFrom = [total beginning, total additions] (= row 14 + row 23 pattern)
- Same pattern for Depreciation
- Total Net Fixed Assets: computedFrom = [all net value excelRows]

**Add-button row**: Satu saja, ditempatkan di bawah leaf rows "A. Acquisition Costs - Beginning", dengan:
```typescript
{ type: 'add-button', label: '', section: 'fixed_asset', buttonLabel: strings.addAccount }
```

**PENTING**: Karena ManifestRow.section saat ini typed ke `BsSection`, perlu **generalisasi** tipe section di `src/data/manifests/types.ts`:
```typescript
section?: string  // was: BsSection — now generic for BS, FA, IS
```
Dan update RowInputGrid.tsx props yang mereferensikan BsSection ke `string`.

### 4. Update `src/data/live/types.ts` — FixedAssetInputState

Expand dari flat rows ke dynamic state (ikuti pattern BalanceSheetInputState):

```typescript
export interface FixedAssetInputState {
  accounts: FaAccountEntry[]
  yearCount: number
  language: 'en' | 'id'
  rows: Record<number, YearKeyedSeries>
}
```

### 5. `src/components/forms/DynamicFaEditor.tsx`

Page editor component. Ikuti pattern DynamicBsEditor.tsx dengan adaptasi:

**Perbedaan dari DynamicBsEditor:**
1. **Single dropdown point**: openDropdownSection tidak perlu, cukup boolean `showDropdown`
2. **Row mirroring**: saat user menambah akun, rows untuk SEMUA 7 sub-blocks dibuat otomatis
3. **Row removal**: saat user hapus akun, rows dari SEMUA 7 sub-blocks dihapus
4. **Cross-ref**: Tidak ada cross-ref ke sheet lain (berbeda dari BS yang cross-ref ke FA)

**Handlers:**
- `handleAddAccount(catalogItem)`: Tambah account + auto-create empty rows untuk semua 7 sub-blocks
- `handleAddCustom(label)`: Custom account + auto-create rows
- `handleRemoveAccount(catalogId)`: Hapus account + hapus rows dari semua 7 sub-blocks
- `handleCellChange(excelRow, year, value)`: Update localRows + debounced persist
- `handleYearCountChange(delta)`: +/- year count
- `handleLanguageToggle()`: en <-> id
- `handleSave()`: Explicit save

**State management** (local state, seeded from store — LESSON-034):
```typescript
const [accounts, setAccounts] = useState<FaAccountEntry[]>(() => store.fixedAsset?.accounts ?? [])
const [yearCount, setYearCount] = useState(() => store.fixedAsset?.yearCount ?? 3)
const [language, setLanguage] = useState<'en' | 'id'>(() => store.fixedAsset?.language ?? 'id')
const [localRows, setLocalRows] = useState<Record<number, YearKeyedSeries>>(() => store.fixedAsset?.rows ?? {})
```

### 6. Update `src/app/input/fixed-asset/page.tsx`

Ganti dari ManifestEditor ke DynamicFaEditor. Ikuti pattern dari `src/app/input/balance-sheet/page.tsx` (wait for hydration, then mount editor).

### 7. Store migration v11 → v12

Di `useKkaStore.ts`, tambah migration:
- v11 → v12: Transform `fixedAsset` dari `{ rows }` ke `{ accounts, yearCount: 3, language: 'id', rows }`.
- Default accounts: 6 original categories (Land, Building, Equipment, Vehicle, Office Inventory, Electrical) — backward-compatible.
- Map existing row data ke excelRow ranges baru (jika menggunakan offset-based approach).

### 8. Generalisasi types di ManifestRow

Di `src/data/manifests/types.ts`:
- `section?: string` (ganti dari `BsSection`)
- Ini memungkinkan FA dan nanti IS menggunakan section mereka sendiri

Di `src/components/forms/RowInputGrid.tsx`:
- Update prop types yang menggunakan `BsSection` ke `string`
- `onAddButtonClick?: (section: string) => void`
- `onRemoveAccount?: (catalogId: string) => void` (sudah generic)
- `openDropdownSection?: string | null`

### 9. Tests

**Unit tests** (TDD — RED → GREEN → REFACTOR):

1. `__tests__/data/catalogs/fixed-asset-catalog.test.ts`:
   - Catalog has exactly 20 accounts
   - All have both labelEn and labelId
   - excelRow values unique
   - getCatalogAccount returns correct items
   - generateCustomExcelRow returns >= 1000

2. `__tests__/data/manifests/build-dynamic-fa.test.ts`:
   - Empty accounts → only structural rows (headers, add-button)
   - 1 account → generates 7 rows (across 3 sections) + subtotals
   - 6 accounts → matches original manifest structure
   - computedFrom arrays correct (Ending = Begin + Add, Net = Acq End - Dep End)
   - Subtotal computedFrom includes all account rows in section
   - Add-button row exists under Acq Beginning only
   - Language toggle changes labels

3. `__tests__/lib/store/migration-v12.test.ts`:
   - v11 state migrates to v12 with default 6 accounts
   - Existing row data preserved

### 10. Build & Verification

Setelah semua selesai:
```bash
npx vitest run 2>&1 | tail -25       # all tests pass
npm run build 2>&1 | tail -25        # zero errors
npx tsc --noEmit 2>&1 | tail -10     # typecheck clean
```

## Constraints

- **JANGAN** patching manual — semua melalui system development
- **JANGAN** mengubah komponen RowInputGrid kecuali untuk generalisasi type section
- **JANGAN** mengubah deriveComputedRows — manifest builder harus produce output yang compatible
- **Backward-compatible**: Data yang sudah tersimpan di localStorage harus tetap berfungsi setelah migration
- **Kalkulasi identik**: Untuk 6 original categories, output harus sama persis dengan Excel
- Commit dengan conventional commits: `feat: dynamic fixed asset input with catalog-driven accounts`

## Urutan Eksekusi yang Direkomendasikan

1. Generalisasi types (ManifestRow.section → string, RowInputGrid props)
2. FA Catalog
3. FA i18n dictionary
4. FA manifest builder + tests
5. Store migration v11→v12 + tests
6. DynamicFaEditor component
7. Update page.tsx
8. Integration test: build + typecheck + full test suite
9. Manual spot-check di browser
