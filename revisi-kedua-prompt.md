# Revisi Kedua — INPUT DATA Balance Sheet (4 Sub-Revisi)

> Prompt ini berisi 4 sub-revisi untuk halaman INPUT DATA - Balance Sheet.
> Pastikan semua downstream yang terdampak juga disesuaikan.
> Referensi visual: screenshot files di folder superpowers/kka-penilaian-saham/revisi-kedua-*.png

---

## Sub-Revisi 1: Independent Scrolling (GLOBAL LAYOUT)

### Konteks
Saat ini sidebar navigasi (kiri) dan konten utama (kanan) scroll bersamaan sebagai satu halaman. Ini tidak nyaman — user ingin sidebar tetap terlihat saat scroll konten yang panjang (terutama tabel keuangan).

### Perubahan
Ubah layout global agar sidebar dan konten memiliki scroll terpisah:

**File: `src/components/layout/Shell.tsx`**
- Buat container utama (`<main>` atau wrapper) menjadi `h-screen overflow-hidden` (atau `h-dvh`)
- Sidebar wrapper: `h-full overflow-y-auto` — scrollable sendiri jika nav items banyak
- Konten area (children): `flex-1 h-full overflow-y-auto` — scroll independen

**File: `src/components/layout/Sidebar.tsx`**
- Pastikan sidebar container menggunakan `h-full flex flex-col`
- `SidebarNav` tetap `flex-1 overflow-y-auto`
- `SidebarHeader` dan `ExportButton` tetap fixed di atas/bawah sidebar

**File: `src/components/layout/MobileShell.tsx`**
- Mobile drawer sudah punya scroll sendiri (`overflow-y-auto`), kemungkinan tidak perlu diubah
- Verifikasi bahwa mobile layout tidak terganggu oleh perubahan Shell.tsx

### Verifikasi
- [ ] Desktop: sidebar tetap di posisi saat konten di-scroll
- [ ] Desktop: sidebar bisa di-scroll sendiri jika nav items overflow
- [ ] Mobile: drawer navigation tetap berfungsi normal
- [ ] Semua halaman (HOME, Balance Sheet, Income Statement, dll) tidak terganggu layout-nya
- [ ] Footer buttons di halaman input tetap accessible (tidak tertutup)

---

## Sub-Revisi 2: FIXED ASSETS Menjadi Read-Only (Balance Sheet)

### Konteks
Section FIXED ASSETS di Balance Sheet seharusnya TIDAK perlu input manual. Data-nya berasal dari halaman INPUT DATA - Fixed Asset:
- **Fixed Assets - Beginning** → dari Fixed Asset store (row 32: "Total Ending — Acquisition Cost")
- **Accumulated Depreciation** → dari Fixed Asset store (row 60: "Total Ending — Accumulated Depreciation")
- **Fixed Assets, Net** → computed: Beginning - Accumulated Depreciation

### Perubahan

**File: `src/components/forms/DynamicBsEditor.tsx`**
- HAPUS `SectionDropdown` untuk section `'fixed_assets'` (sekitar lines 245+)
- Hapus semua logic terkait fixed_assets accounts di event handlers (addAccount, removeAccount)
- Di area LINE ITEM, baris Fixed Assets harus:
  - Menampilkan label: "FIXED ASSETS" (header), "Fixed Assets - Beginning", "Accumulated Depreciation", "Fixed Assets, Net"
  - Semua baris ini **read-only** (bukan NumericInput)
  - Nilai di-pull dari Fixed Asset store (`useKkaStore.getState().fixedAsset`)

**File: `src/data/manifests/build-dynamic-bs.ts`**
- Section Fixed Assets tidak lagi bergantung pada `accounts` parameter
- Selalu generate baris Fixed Assets dengan type baru, misalnya `'cross-ref'` atau `'readonly'`
- Baris Fixed Assets:
  - Header: "FIXED ASSETS" (type: 'header')
  - "Fixed Assets - Beginning" (type: 'cross-ref', source: fixedAsset row 32)
  - "Accumulated Depreciation" (type: 'cross-ref', source: fixedAsset row 60)
  - "Fixed Assets, Net" (type: 'subtotal', computedFrom: [row_beginning, -row_accDepr]) ATAU (type: 'cross-ref', source: fixedAsset row 69 "TOTAL NET FIXED ASSETS")

**File: `src/data/manifests/types.ts`**
- Tambahkan row type baru jika perlu (misalnya `'cross-ref'`) untuk menandai baris yang nilai-nya diambil dari store lain
- Atau gunakan existing `'computed'` type dengan metadata tambahan

**File: `src/components/forms/RowInputGrid.tsx`**
- Handle row type baru (`'cross-ref'`): render sebagai read-only formatted number
- Pull nilai dari Fixed Asset store + computed rows
- Styling: bisa dibedakan secara visual (misalnya background sedikit berbeda atau italic) agar user tahu ini auto-populated

**File: `src/data/catalogs/balance-sheet-catalog.ts`**
- Hapus atau kosongkan section `'fixed_assets'` dari catalog, karena tidak ada lagi account selection

**Data Flow yang Harus Diperhatikan:**
- Fixed Asset page menyimpan data di `fixedAsset.rows` (Zustand store)
- Balance Sheet perlu SUBSCRIBE ke Fixed Asset store untuk reactivity
- Saat user mengubah data di Fixed Asset page, Balance Sheet LINE ITEM harus otomatis update
- **Year mapping**: Fixed Asset page menggunakan 3 tahun historis (2019-2021), Balance Sheet bisa 1-4 tahun. Pastikan mapping tahun yang benar — ambil nilai dari tahun yang sama
- Downstream sheets (Historical Balance Sheet, Cash Flow, ROIC, dll) yang membaca BS Fixed Assets rows harus tetap bekerja — pastikan row numbers yang dipakai konsisten

### Verifikasi
- [ ] Section FIXED ASSETS input (kotak hijau dengan "+ Tambah Akun") sudah tidak ada
- [ ] LINE ITEM menampilkan Fixed Assets rows yang read-only
- [ ] Nilai Fixed Assets di Balance Sheet === nilai dari Fixed Asset page (cross-check manual)
- [ ] Ubah nilai di Fixed Asset page → Balance Sheet LINE ITEM otomatis update
- [ ] Historical Balance Sheet (view) tetap menampilkan Fixed Assets dengan benar
- [ ] Cash Flow Statement yang reference BS Fixed Assets tetap computed correctly
- [ ] `npm run build` zero errors

---

## Sub-Revisi 3: Language Toggle — Teks Deskriptif (Balance Sheet Only)

### Konteks
Tombol "EN" / "ID" di kanan atas tidak intuitif. User bingung apakah "EN" berarti sedang dalam bahasa Inggris atau untuk beralih ke bahasa Inggris.

### Perubahan

**File: `src/components/forms/DynamicBsEditor.tsx`** (sekitar lines 228-235)
- Ganti tombol:
  - Saat `language === 'en'`: tampilkan "Tampilkan Nama Akun dalam Bahasa Indonesia"
  - Saat `language === 'id'`: tampilkan "Tampilkan Nama Akun dalam Bahasa Inggris"
- Styling: tombol lebih panjang, sesuaikan padding dan font size agar proporsional
- Posisi tetap di area header, sejajar dengan "+ Tambah Tahun"
- Pastikan responsive: di mobile, teks bisa wrap atau gunakan versi lebih pendek jika perlu

### Verifikasi
- [ ] Saat bahasa Inggris aktif, tombol menampilkan "Tampilkan Nama Akun dalam Bahasa Indonesia"
- [ ] Saat bahasa Indonesia aktif, tombol menampilkan "Tampilkan Nama Akun dalam Bahasa Inggris"
- [ ] Klik tombol → bahasa berubah, teks tombol berubah sesuai
- [ ] Layout tidak rusak di desktop dan mobile
- [ ] `npm run build` zero errors

---

## Sub-Revisi 4: LINE ITEM Structural Rows Selalu Visible

### Konteks
Saat ini, seluruh tabel LINE ITEM (termasuk header seperti "ASSETS", "CURRENT ASSETS", subtotal "Total Current Assets", dsb) hanya muncul jika minimal 1 akun ditambahkan. Ini membingungkan karena user tidak tahu ada tabel di bawah.

### Perubahan

**File: `src/data/manifests/build-dynamic-bs.ts`**
- Fungsi `buildDynamicBsManifest()` harus SELALU generate structural rows (headers, separators, subtotals, totals) bahkan ketika `accounts` array kosong
- Baris structural yang harus selalu muncul:
  - "ASSETS" (header)
  - "CURRENT ASSETS" (header)
  - "Total Current Assets" (subtotal, row 16)
  - "NON-CURRENT ASSETS" (header)
  - "FIXED ASSETS" (header) — sekarang read-only (lihat Sub-Revisi 2)
  - "Fixed Assets - Beginning" (cross-ref)
  - "Accumulated Depreciation" (cross-ref)
  - "Fixed Assets, Net" (subtotal/cross-ref)
  - "OTHER NON-CURRENT ASSETS" (header) — jika ada
  - "INTANGIBLE ASSETS" (header) — jika ada
  - "Total Non-Current Assets" (subtotal, row 25)
  - "TOTAL ASSETS" (total, row 27)
  - "LIABILITIES & EQUITY" (header)
  - "CURRENT LIABILITIES" (header)
  - "Total Current Liabilities" (subtotal, row 30)
  - "NON-CURRENT LIABILITIES" (header)
  - "Total Non-Current Liabilities" (subtotal, row 33)
  - "TOTAL LIABILITIES" (total, row 34)
  - "SHAREHOLDERS' EQUITY" (header)
  - "Shareholders' Equity" / "Total Equity" (subtotal/total)
  - "TOTAL LIABILITIES & EQUITY" (total, row 38)
- Subtotal/total rows yang belum ada leaf accounts akan menampilkan `-` atau `0`

**File: `src/components/forms/RowInputGrid.tsx`**
- Pastikan rendering tetap benar saat computed values menghasilkan 0 atau undefined
- Subtotal tanpa leaf rows → tampilkan `-` (dash) bukan kosong

### Verifikasi
- [ ] Buka Balance Sheet dengan 0 akun → LINE ITEM structural rows tetap muncul
- [ ] Subtotal/total menampilkan `-` saat belum ada data
- [ ] Tambahkan 1 akun → structural rows + akun baru muncul bersamaan, subtotal terhitung
- [ ] Semua structural rows ada (ASSETS → TOTAL LIABILITIES & EQUITY)
- [ ] `npm run build` zero errors

---

## Cross-Cutting Concerns

### Dampak ke Downstream Sheets
Perubahan Sub-Revisi 2 (Fixed Assets read-only) berpotensi mempengaruhi:
1. **Historical Balance Sheet** (`/historical/balance-sheet`) — pastikan tetap bisa render Fixed Assets
2. **Cash Flow Statement** — references BS rows untuk Fixed Assets
3. **Financial Ratio** — mungkin reference BS Total Assets
4. **ROIC** — reference invested capital dari BS
5. **Projection Balance Sheet** — sudah ada logic baca Fixed Asset store (lines 70-74 di projection page)

Pastikan row numbers yang dipakai untuk Fixed Assets di Balance Sheet manifest KONSISTEN dengan yang direferensi oleh sheet-sheet downstream.

### Data Migration
Jika ada user yang sudah menyimpan data Fixed Assets di Balance Sheet store (via `accounts` dan `rows`), pertimbangkan:
- Migration function di Zustand persist (increment `STORE_VERSION`)
- Hapus fixed_assets accounts dari `balanceSheet.accounts`
- Hapus fixed_assets rows dari `balanceSheet.rows`
- Ini mencegah stale data yang tidak terpakai

### Testing Priority
1. Buka website fresh (no localStorage) → semua structural rows muncul
2. Isi data Fixed Asset → Balance Sheet Fixed Assets rows auto-populated
3. Isi data Current Assets, Liabilities, Equity → subtotals/totals terhitung benar
4. Navigate antar halaman → data persisted
5. `npm run build` → zero errors
6. Test responsive: desktop dan mobile

---

## Urutan Eksekusi yang Disarankan

1. **Sub-Revisi 1** (Independent Scrolling) — independent, bisa dikerjakan duluan
2. **Sub-Revisi 4** (LINE ITEM Always Visible) — prerequisite untuk Sub-Revisi 2
3. **Sub-Revisi 2** (Fixed Assets Read-Only) — paling complex, butuh Sub-Revisi 4 selesai
4. **Sub-Revisi 3** (Language Toggle) — independent, bisa kapan saja
5. **Build verification + cross-check downstream**
6. **Git commit** per sub-revisi (conventional commits: `fix:` atau `feat:`)
