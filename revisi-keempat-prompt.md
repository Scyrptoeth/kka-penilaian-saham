# Revisi Keempat — Inline Add Account di LINE ITEM Table

> Prompt untuk CLI. Perubahan arsitektural: memindahkan mekanisme add/remove account dari SectionDropdown (di atas tabel) ke DALAM tabel LINE ITEM.
> Referensi visual: screenshot di superpowers/kka-penilaian-saham/revisi-keempat-*.png
> Website live: https://kka-penilaian-saham.vercel.app/
> Repo: https://github.com/Scyrptoeth/kka-penilaian-saham

---

## Ringkasan Perubahan

**SEBELUM (Current State):**
- Add/remove account dilakukan via SectionDropdown components yang terpisah di ATAS tabel LINE ITEM
- User harus scroll bolak-balik antara area dropdown (atas) dan tabel (bawah) untuk melihat efek penambahan
- Tabel LINE ITEM (RowInputGrid) murni display + input angka

**SESUDAH (Target State):**
- Area SectionDropdown di atas tabel DIHAPUS TOTAL
- Tombol add account dipindahkan ke DALAM tabel LINE ITEM sebagai baris interaktif
- User langsung melihat akun baru muncul di tabel saat ditambahkan
- Akun yang ditambahkan menampilkan trash icon di kiri untuk menghapus
- Dropdown catalog (pilih akun + isi manual) muncul inline di bawah tombol, identik dengan behavior saat ini

---

## Arsitektur Perubahan

### 1. Tambahkan Row Type Baru: `'add-button'`

**File: `src/data/manifests/types.ts`** (~line 23-29)

Tambahkan `'add-button'` ke RowType union:
```typescript
type RowType = 'normal' | 'subtotal' | 'total' | 'header' | 'separator' | 'cross-ref' | 'add-button'
```

Tambahkan property opsional di ManifestRow interface:
```typescript
interface ManifestRow {
  // ...existing properties...
  /** For 'add-button' rows: which section this add button belongs to */
  section?: BsSection
  /** For 'add-button' rows: label for the button */
  buttonLabel?: string
}
```

### 2. Generate Add-Button Rows di Manifest Builder

**File: `src/data/manifests/build-dynamic-bs.ts`**

Dalam `buildRows()`, setelah leaf rows untuk setiap section, SEBELUM subtotal, sisipkan baris `'add-button'`:

```
Contoh struktur untuk Current Assets:
1. Header: "CURRENT ASSETS"
2. Normal: [user accounts...] ← leaf rows
3. Add-button: "(+ Tambah Akun Current Asset)" ← NEW
4. Subtotal: "Total Current Assets"
```

**Pola untuk setiap section:**

| Section | Button Label (tetap Indonesian) |
|---------|-------------------------------|
| current_assets | (+ Tambah Akun Current Asset) |
| other_non_current_assets | (+ Tambah Akun Non-Current Asset) |
| intangible_assets | (+ Tambah Akun Intangible Asset) |
| current_liabilities | (+ Tambah Akun Current Liability) |
| non_current_liabilities | (+ Tambah Akun Non-Current Liability) |
| equity | (+ Tambah Akun Equity) |

> **Catatan**: Label tombol TETAP Indonesian apapun bahasa yang dipilih (sesuai keputusan user).

**Posisi add-button per section di dalam buildRows():**

```
ASSETS (header)
CURRENT ASSETS (header)
  [...user current_assets accounts]
  (+ Tambah Akun Current Asset) ← add-button
Total Current Assets (subtotal)

NON-CURRENT ASSETS (header)
FIXED ASSETS (header)
  Fixed Assets, Beginning (cross-ref)
  Accumulated Depreciation (cross-ref)
Fixed Assets, Net (subtotal/cross-ref)

OTHER NON-CURRENT ASSETS (header) ← jika section ini active
  [...user other_non_current_assets accounts]
  (+ Tambah Akun Non-Current Asset) ← add-button

INTANGIBLE ASSETS (header) ← jika section ini active
  [...user intangible_assets accounts]
  (+ Tambah Akun Intangible Asset) ← add-button

Total Non-Current Assets (subtotal)

TOTAL ASSETS (total)

LIABILITIES & EQUITY (header)
CURRENT LIABILITIES (header)
  [...user current_liabilities accounts]
  (+ Tambah Akun Current Liability) ← add-button
Total Current Liabilities (subtotal)

NON-CURRENT LIABILITIES (header)
  [...user non_current_liabilities accounts]
  (+ Tambah Akun Non-Current Liability) ← add-button
Total Non-Current Liabilities (subtotal)

TOTAL LIABILITIES (total)

SHAREHOLDERS' EQUITY (header)
  [...user equity accounts]
  (+ Tambah Akun Equity) ← add-button
Shareholders' Equity (subtotal)

TOTAL LIABILITIES & EQUITY (total)
```

### 3. Render Add-Button Rows di RowInputGrid

**File: `src/components/forms/RowInputGrid.tsx`**

Tambahkan case baru dalam row rendering loop (~line 76-166):

```typescript
case 'add-button':
  // Render baris yang menampilkan tombol add account
  // - Spans full width (colspan semua kolom tahun)
  // - Label: row.buttonLabel (e.g., "(+ Tambah Akun Current Asset)")
  // - On click: trigger onAddButtonClick(row.section)
  // - Styling: mirip dashed-border button saat ini, tapi inline di tabel
  //   font-medium text-ink-muted, cursor-pointer, hover effect
```

**Props baru untuk RowInputGrid:**
```typescript
interface RowInputGridProps {
  // ...existing props...
  /** Callback when inline add-button row is clicked */
  onAddButtonClick?: (section: BsSection) => void
  /** Callback when account remove icon is clicked */
  onRemoveAccount?: (catalogId: string) => void
  /** Set of catalogIds currently in the grid (for showing trash icon) */
  removableAccountIds?: Set<string>
}
```

**Untuk `'normal'` rows yang merupakan user-added accounts:**
- Tambahkan trash icon (🗑 atau Lucide `Trash2`) di kolom kiri (sebelum label)
- Icon hanya muncul jika `removableAccountIds?.has(catalogId)`
- On click: `onRemoveAccount(catalogId)`
- Styling: icon kecil (14-16px), text-negative/40 → hover:text-negative

### 4. Inline Dropdown di RowInputGrid

Saat user klik add-button row, perlu muncul dropdown catalog. Ada 2 pendekatan:

**Pendekatan A (Recommended): State di DynamicBsEditor, render lewat RowInputGrid**
- DynamicBsEditor mengelola state: `openDropdownSection: BsSection | null`
- Saat `onAddButtonClick(section)` dipanggil → set `openDropdownSection = section`
- Pass state ke RowInputGrid: `openDropdownSection` + `catalogItems` + `onSelectCatalogItem` + `onCustomEntry`
- RowInputGrid merender dropdown tepat di bawah add-button row yang aktif
- Dropdown: absolute positioned, z-30, max-h-48 overflow-y-auto (identik styling saat ini)
- Isi dropdown: catalog accounts yang belum dipilih + "Isi Manual..." option
- Klik di luar dropdown → close

**Pendekatan B: Portal/popover component**
- Gunakan popover library atau Radix popover
- Anchor ke add-button row
- Lebih robust positioning tapi tambah dependency

> **Rekomendasi: Pendekatan A** — lebih sederhana, reuse pattern SectionDropdown yang sudah ada.

### 5. Hapus SectionDropdown Area

**File: `src/components/forms/DynamicBsEditor.tsx`**

- **HAPUS** rendering ALL_SECTIONS.map → SectionDropdown (~line 289+)
- **HAPUS** SectionDropdown component definition (~lines 375-509) — atau pindahkan logic dropdown ke inline helper
- **PERTAHANKAN** semua handler functions: `handleAddAccount`, `handleAddCustom`, `handleRemoveAccount` — ini tetap diperlukan, hanya trigger-nya yang berubah (dari SectionDropdown ke RowInputGrid callback)
- **PINDAHKAN** dropdown state + catalog logic ke level DynamicBsEditor agar bisa di-pass ke RowInputGrid

### 6. Update DynamicBsEditor Integration

**File: `src/components/forms/DynamicBsEditor.tsx`**

```typescript
// New state untuk inline dropdown
const [openDropdownSection, setOpenDropdownSection] = useState<BsSection | null>(null)

// Pass ke RowInputGrid
<RowInputGrid
  manifest={dynamicManifest}
  values={localRows}
  computedValues={computedRows}
  years={years}
  language={language}
  onChange={handleCellChange}
  // NEW PROPS:
  onAddButtonClick={(section) => setOpenDropdownSection(section)}
  onRemoveAccount={(catalogId) => handleRemoveAccount(catalogId)}
  removableAccountIds={new Set(accounts.map(a => a.catalogId))}
  openDropdownSection={openDropdownSection}
  dropdownCatalog={openDropdownSection ? getCatalogBySection(openDropdownSection, language)
    .filter(item => !existingIds.has(item.id)) : []}
  onSelectCatalogItem={(item) => {
    handleAddAccount(item)
    setOpenDropdownSection(null)
  }}
  onCustomEntry={(section, label) => {
    handleAddCustom(section, label)
    setOpenDropdownSection(null)
  }}
  onCloseDropdown={() => setOpenDropdownSection(null)}
/>
```

### 7. Update ManifestRow untuk Normal Rows — Track Account Identity

Saat ini `ManifestRow` untuk normal rows tidak menyimpan `catalogId`. Untuk trash icon, RowInputGrid perlu tahu mana rows yang removable dan apa `catalogId`-nya.

**Opsi A**: Tambahkan `catalogId?: string` ke ManifestRow
**Opsi B**: Build lookup map `excelRow → catalogId` dari accounts array dan pass ke grid

> **Rekomendasi: Opsi A** — lebih clean, langsung embedded di manifest row.

**File: `src/data/manifests/types.ts`**
```typescript
interface ManifestRow {
  // ...existing...
  catalogId?: string  // For removable account rows
  section?: BsSection // For add-button rows (already added above)
}
```

**File: `src/data/manifests/build-dynamic-bs.ts`** — `leafRows()` function:
```typescript
// Update leafRows to include catalogId
function leafRows(accounts, section, language) {
  return accounts
    .filter(a => a.section === section)
    .map(a => ({
      excelRow: a.excelRow,
      label: getLabel(a, language),
      indent: 1,
      type: 'normal' as const,
      catalogId: a.catalogId,  // NEW
    }))
}
```

---

## Cross-Cutting Concerns

### Dampak ke Downstream
1. **RowInputGrid** — perubahan besar (new row types, new props, dropdown rendering)
2. **build-dynamic-bs.ts** — perubahan sedang (add-button rows, catalogId di leaf rows)
3. **types.ts** — perubahan kecil (new RowType, new ManifestRow fields)
4. **DynamicBsEditor.tsx** — perubahan besar (hapus SectionDropdown, rewire handlers ke grid)

### Yang TIDAK Boleh Berubah
- **Kalkulasi** — `deriveComputedRows()` harus tetap bekerja identik (add-button rows tidak punya excelRow, jadi aman)
- **Persistence** — accounts array dan rows storage tetap identik
- **Data model** — `BsAccountEntry` interface tidak berubah
- **Downstream sheets** — Historical BS, Cash Flow, dll tetap referensi excelRow yang sama

### Store Version
- Increment `STORE_VERSION` jika ada perubahan struktur yang stored (kemungkinan TIDAK perlu karena data model tidak berubah — hanya UI rendering berubah)

---

## Urutan Eksekusi yang Disarankan

1. **types.ts** — Tambah `'add-button'` ke RowType + properties baru di ManifestRow
2. **build-dynamic-bs.ts** — Generate add-button rows + catalogId di leaf rows
3. **RowInputGrid.tsx** — Render add-button rows + trash icons + inline dropdown
4. **DynamicBsEditor.tsx** — Hapus SectionDropdown, rewire ke RowInputGrid callbacks
5. **Build verification** — `npm run build 2>&1 | tail -25`
6. **Visual verification** — Buka Balance Sheet, test add/remove beberapa akun
7. **Cross-check** — Pastikan computed values (subtotals, totals) tetap benar setelah add/remove
8. **Git commit** — `feat: move add-account inline to LINE ITEM table`

---

## Verifikasi Checklist

### Fungsional
- [ ] SectionDropdown area di atas LINE ITEM sudah TIDAK ada
- [ ] Setiap section di LINE ITEM memiliki baris "(+ Tambah Akun ...)"
- [ ] Klik tombol add → dropdown catalog muncul di bawah baris
- [ ] Pilih akun dari catalog → akun muncul di tabel dengan input field
- [ ] "Isi Manual..." → text input muncul, bisa tambah custom account
- [ ] Akun baru muncul dengan trash icon di kiri
- [ ] Klik trash icon → akun dihapus, baris hilang, subtotal recalculated
- [ ] Subtotal/Total tetap terhitung benar setelah add/remove
- [ ] Klik di luar dropdown → dropdown tertutup

### UX
- [ ] Dropdown positioning tidak terpotong (overflow visible)
- [ ] Smooth transition saat akun ditambah/dihapus (tidak ada layout jump)
- [ ] Mobile responsive — dropdown tidak overflow di layar kecil
- [ ] Trash icon tidak terlalu besar/mengganggu tapi mudah diklik
- [ ] Scroll behavior: saat tambah akun, tabel tidak jump ke atas

### Integrasi
- [ ] Bahasa toggle masih berfungsi (account labels berubah, tombol add tetap Indonesian)
- [ ] Tambah/kurangi tahun historis masih berfungsi
- [ ] Fixed Assets (cross-ref) tetap read-only dan tidak terganggu
- [ ] Save/persist berfungsi — reload page, data masih ada
- [ ] Historical Balance Sheet tetap render dengan benar
- [ ] `npm run build` → zero errors

### Catatan Penting
- Ini adalah **system development**, bukan patching. Perubahan harus melalui arsitektur yang proper:
  - Type system diperbarui dulu (types.ts)
  - Manifest builder updated (build-dynamic-bs.ts)
  - Grid renderer extended (RowInputGrid.tsx)
  - Editor rewired (DynamicBsEditor.tsx)
- Jangan gunakan workaround/hack — setiap perubahan harus konsisten dengan architecture patterns yang sudah ada
