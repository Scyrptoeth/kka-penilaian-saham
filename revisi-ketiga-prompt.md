# Revisi Ketiga — INPUT DATA Balance Sheet (3 Sub-Revisi + Font Overhaul)

> Prompt untuk CLI. Revisi ini mencakup 3 sub-revisi UI/UX + perubahan font global.
> Referensi visual: screenshot files di folder superpowers/kka-penilaian-saham/revisi-ketiga-*.png
> Website live: https://kka-penilaian-saham.vercel.app/
> Repo: https://github.com/Scyrptoeth/kka-penilaian-saham

---

## Sub-Revisi 1: Full Bilingual — SEMUA Teks di Halaman Toggle Bahasa

### Konteks
Saat ini toggle bahasa hanya mengubah nama akun (catalog labels). Akibatnya, tombol pergantian bahasa terasa "tidak berguna" karena perubahan yang terjadi minimal. Perlu diubah agar SELURUH informasi di halaman ikut berubah bahasa.

### Scope Perubahan
**SEMUA teks** di halaman INPUT DATA - Balance Sheet harus berubah sesuai bahasa yang dipilih, **KECUALI:**
- Frasa "INPUT DATA" (tetap English)
- "Tahun historis: ..." (tetap Indonesian)
- Tombol-tombol action ("Simpan", "Reset Halaman Ini", "Reset Seluruh Data") — tetap sesuai saat ini

**Yang HARUS berubah (Indonesian ↔ English):**

### A. Section Headers di Area Input (DynamicBsEditor.tsx, SECTION_LABELS ~line 25-33)

| English | Indonesian (SAK/PSAK) |
|---------|----------------------|
| Current Assets | Aset Lancar |
| Fixed Assets | Aset Tetap |
| Intangible Assets | Aset Tak Berwujud |
| Other Non-Current Assets | Aset Tidak Lancar Lainnya |
| Current Liabilities | Liabilitas Jangka Pendek |
| Non-Current Liabilities | Liabilitas Jangka Panjang |
| Equity | Ekuitas |

### B. LINE ITEM Headers di Tabel (build-dynamic-bs.ts, ~lines 103-169)

| English | Indonesian (SAK/PSAK) |
|---------|----------------------|
| ASSETS | ASET |
| CURRENT ASSETS | ASET LANCAR |
| Total Current Assets | Total Aset Lancar |
| NON-CURRENT ASSETS | ASET TIDAK LANCAR |
| FIXED ASSETS | ASET TETAP |
| Fixed Assets, Beginning | Aset Tetap, Saldo Awal |
| Accumulated Depreciation | Akumulasi Penyusutan |
| Fixed Assets, Net | Aset Tetap, Neto |
| OTHER NON-CURRENT ASSETS | ASET TIDAK LANCAR LAINNYA |
| INTANGIBLE ASSETS | ASET TAK BERWUJUD |
| Total Non-Current Assets | Total Aset Tidak Lancar |
| TOTAL ASSETS | TOTAL ASET |
| LIABILITIES & EQUITY | LIABILITAS & EKUITAS |
| CURRENT LIABILITIES | LIABILITAS JANGKA PENDEK |
| Total Current Liabilities | Total Liabilitas Jangka Pendek |
| NON-CURRENT LIABILITIES | LIABILITAS JANGKA PANJANG |
| Total Non-Current Liabilities | Total Liabilitas Jangka Panjang |
| TOTAL LIABILITIES | TOTAL LIABILITAS |
| SHAREHOLDERS' EQUITY | EKUITAS PEMEGANG SAHAM |
| Shareholders' Equity | Ekuitas Pemegang Saham |
| Retained Earnings, Ending Balance | Saldo Laba, Saldo Akhir |
| TOTAL LIABILITIES & EQUITY | TOTAL LIABILITAS & EKUITAS |

### C. UI Strings di DynamicBsEditor.tsx

| English | Indonesian | Lokasi (approx) |
|---------|-----------|-----------------|
| + Add Account | + Tambah Akun | line 407 |
| Manual Entry... | Isi Manual... | line 435 |
| All accounts added | Semua akun sudah ditambahkan | line 426 |
| Account name... | Nama akun... | line 446 |
| Cancel | Batal | line 451 |
| Add | Tambah | line 452 |
| Delete account | Hapus akun | line 473 |
| Line Item | Pos-Pos | RowInputGrid line 59 |

### D. Dialog Texts

| English | Indonesian | Lokasi (approx) |
|---------|-----------|-----------------|
| Reset Balance Sheet | Reset Balance Sheet | line 331 |
| Are you sure you want to reset Balance Sheet data? All accounts and values will be deleted. | Yakin ingin mereset data Balance Sheet? Semua akun dan nilai yang sudah diinput akan dihapus. | line 332 |
| Reset BS | Reset BS | line 333 |
| Reset All Data | Reset Seluruh Data | line 340 |
| Are you sure you want to reset ALL data? All inputs on all pages will be deleted. This action cannot be undone. | Yakin ingin mereset SELURUH data? Semua input di semua halaman akan dihapus. Tindakan ini tidak bisa dibatalkan. | line 341 |
| Reset All | Reset Semua | line 342 |

### Implementasi yang Disarankan

1. **Buat file i18n dictionary**: `src/lib/i18n/balance-sheet.ts`
   ```typescript
   export const bsTranslations = {
     en: {
       sectionLabels: { current_assets: 'Current Assets', ... },
       lineItemHeaders: { assets: 'ASSETS', ... },
       ui: { addAccount: '+ Add Account', ... },
       dialogs: { ... }
     },
     id: {
       sectionLabels: { current_assets: 'Aset Lancar', ... },
       lineItemHeaders: { assets: 'ASET', ... },
       ui: { addAccount: '+ Tambah Akun', ... },
       dialogs: { ... }
     }
   }
   ```

2. **Propagate language ke manifest builder**: `buildDynamicBsManifest()` perlu menerima parameter `language` agar row labels di manifest ikut berubah bahasa.

3. **Propagate language ke RowInputGrid**: "Line Item" header column perlu bilingual.

4. **File yang perlu diubah:**
   - `src/lib/i18n/balance-sheet.ts` (BARU)
   - `src/components/forms/DynamicBsEditor.tsx` — gunakan dictionary, pass language ke manifest/grid
   - `src/data/manifests/build-dynamic-bs.ts` — terima language param, generate bilingual labels
   - `src/components/forms/RowInputGrid.tsx` — terima language, render "Line Item"/"Pos-Pos"
   - `src/data/catalogs/balance-sheet-catalog.ts` — sudah punya labelEn/labelId, tidak perlu diubah

### Verifikasi
- [ ] Toggle ke English → SEMUA teks berubah ke English (section headers, LINE ITEM, UI strings)
- [ ] Toggle ke Indonesian → SEMUA teks berubah ke Indonesian (SAK/PSAK terminology)
- [ ] Frasa "INPUT DATA", "Tahun historis", tombol action TIDAK berubah
- [ ] Account names dari catalog ikut berubah (sudah ada labelEn/labelId)
- [ ] Custom account labels tetap tampil apa adanya (tidak diterjemahkan)
- [ ] Dialog texts berubah sesuai bahasa aktif

---

## Sub-Revisi 2: Tombol Bahasa — Desain Globe + Label + Deskripsi

### Konteks
Tombol saat ini "Tampilkan Nama Akun dalam Bahasa Inggris/Indonesia" sudah lebih baik dari "EN"/"ID", tapi perlu di-upgrade visualnya agar lebih profesional dan intuitif.

### Desain Baru
Mengadopsi pattern dari referensi screenshot (revisi-ketiga-INPUT-DATA-Balance-Sheet-tombol-EN.png dan tombol-ID.png):

**Komponen tombol:**
1. **Globe icon** (🌐 atau Lucide `Globe` icon) — warna netral
2. **Label bahasa TARGET** (bold, warna hitam/ink tegas) — bahasa yang akan dituju saat diklik
3. **Deskripsi penegas** (warna soft/muted) — menjelaskan aksi

**Skenario A — Saat halaman dalam English, tombol menampilkan:**
```
🌐  Indonesia   Tampilkan dalam Bahasa Indonesia
```
- "Indonesia" = bold, text-ink (hitam tegas)
- "Tampilkan dalam Bahasa Indonesia" = text-ink-muted (warna lebih soft)

**Skenario B — Saat halaman dalam Indonesian, tombol menampilkan:**
```
🌐  English   Tampilkan dalam Bahasa Inggris
```
- "English" = bold, text-ink (hitam tegas)
- "Tampilkan dalam Bahasa Inggris" = text-ink-muted (warna lebih soft)

> **Catatan:** Karena sekarang SEMUA teks berubah (bukan hanya Nama Akun), deskripsi sebaiknya "Tampilkan dalam Bahasa Indonesia/Inggris" (tanpa "Nama Akun"). Namun jika user prefer tetap pakai "Nama Akun", gunakan versi yang user tentukan.

### Styling
- Border: `border border-grid rounded-md` (rounded sedikit lebih dari saat ini)
- Padding: `px-4 py-2`
- Layout: `flex items-center gap-2`
- Globe icon: 20px, text-ink-muted
- Label: `font-semibold text-ink text-sm`
- Deskripsi: `text-ink-muted text-xs`
- Hover: `hover:bg-surface-hover` (subtle background change)
- Posisi: tetap di area header halaman, sebelah kanan

### File yang perlu diubah
- `src/components/forms/DynamicBsEditor.tsx` — replace tombol bahasa (lines ~261-264)
- Mungkin extract ke komponen baru `LanguageToggleButton.tsx` di `src/components/ui/` agar reusable

### Verifikasi
- [ ] Saat English: tampil globe + "Indonesia" (bold) + deskripsi (muted)
- [ ] Saat Indonesian: tampil globe + "English" (bold) + deskripsi (muted)
- [ ] Klik → bahasa berubah, tombol berubah sesuai skenario
- [ ] Globe icon terlihat jelas dan proporsional
- [ ] Hover state ada feedback visual
- [ ] Responsive di mobile (teks mungkin wrap, pastikan tidak rusak)

---

## Sub-Revisi 3: TAMBAH TAHUN HISTORIS — Section Header Style

### Konteks
Tombol "+ Tambah Tahun" saat ini ada di header halaman (kanan atas), terasa terpisah dari konteks data. Perlu diubah menjadi section header style yang konsisten dengan CURRENT ASSETS, OTHER NON-CURRENT ASSETS, dll.

### Desain Baru
Buat section baru **di atas CURRENT ASSETS** dengan styling yang identik:

```
┌─────────────────────────────────────────────────────────────────┐
│  TAMBAH TAHUN HISTORIS                          [+ Tambah Tahun] │
├─────────────────────────────────────────────────────────────────┤
│  CURRENT ASSETS                                  [+ Tambah Akun] │
├─────────────────────────────────────────────────────────────────┤
│  OTHER NON-CURRENT ASSETS                        [+ Tambah Akun] │
├─────────────────────────────────────────────────────────────────┤
│  ...dst                                                          │
└─────────────────────────────────────────────────────────────────┘
```

**Spesifikasi:**
- Container: `rounded-sm border border-grid bg-canvas-raised p-3` (identik dengan section lain)
- Label kiri: "TAMBAH TAHUN HISTORIS" — uppercase, font-semibold, text-sm, text-ink-muted (matching section headers)
- Tombol kanan: "+ Tambah Tahun" — styling identik dengan "+ Tambah Akun"
- **Behavior saat klik**: Otomatis tambah 1 tahun historis (tahun transaksi - N). Misalnya jika saat ini tahun 2021 dengan 1 tahun, klik akan menambah tahun 2020.
- Tombol "- Kurangi" di header halaman juga dipindahkan ke sini (atau tetap, sesuaikan UX) — mungkin jadi icon tombol minus di dalam section ini

**Bilingual label:**
- English: "ADD HISTORICAL YEAR"
- Indonesian: "TAMBAH TAHUN HISTORIS"
(ikut toggle bahasa sesuai Sub-Revisi 1)

### File yang perlu diubah
- `src/components/forms/DynamicBsEditor.tsx`:
  - Hapus tombol "+ Tambah Tahun" dan "- Kurangi" dari header area (lines ~245-253)
  - Tambah section baru sebelum CURRENT ASSETS section (sebelum loop `ALL_SECTIONS`)
  - Style identik dengan `SectionDropdown` container

### Verifikasi
- [ ] Section "TAMBAH TAHUN HISTORIS" muncul di atas CURRENT ASSETS
- [ ] Styling identik (border, padding, background) dengan section headers lain
- [ ] Klik "+ Tambah Tahun" → tahun baru ditambahkan, kolom muncul di grid
- [ ] Ada cara untuk mengurangi tahun (tombol minus atau "- Kurangi")
- [ ] Label bilingual mengikuti toggle bahasa
- [ ] Tidak ada lagi tombol "+ Tambah Tahun" di header halaman (sudah pindah)

---

## Font Overhaul: Switch ke Inter + Inter Display

### Konteks
Saat ini website menggunakan **IBM Plex Sans** (sans) + **IBM Plex Mono** (mono). Perlu diganti ke **Inter** sebagai font utama, mengadopsi karakteristik tipografi dari shchebet.design.

### Font dari shchebet.design (Hasil Riset)

| Elemen | Font | Weight | Size | Letter-Spacing |
|--------|------|--------|------|----------------|
| Hero heading | Inter | 700 | 139px | -5.58px (-4%) |
| Display heading | Inter Display | 700 | 96px | -3.84px (-4%) |
| Large heading | Inter | 700 | 72px | -2.88px (-4%) |
| Medium heading | Inter | 700 | 64px | -2.56px (-4%) |
| Section heading | Inter | 700 | 40px | -1px |
| Card heading | Inter | 700 | 32px | -1.28px (-4%) |
| Nav/Menu | Inter | 700 | 24px | -0.96px (-4%) |
| Label | Inter | 700 | 18px | -0.72px (-4%) |
| Body/Caption | Inter | 400 | 16px | -0.64px (-4%) |
| Small label | Inter | 700 | 16px | -0.64px (-4%) |

**Pola kunci:**
- Letter-spacing: konsisten **-4% dari font-size** (atau -0.04em)
- Font weight: 700 untuk headings/labels, 400 untuk body text
- **Kobzar KS** hanya dipakai untuk aksen dekoratif — **TIDAK perlu** untuk financial app

### Perubahan yang Diperlukan

**File: `src/app/layout.tsx` (~lines 1-18)**
- Ganti `IBM_Plex_Sans` → `Inter` dari `next/font/google`
  - Subsets: `['latin']`
  - Weights: `['400', '500', '600', '700']`
  - CSS variable: `--font-sans`
  - Display: `swap`
- Ganti `IBM_Plex_Mono` → tetap `IBM_Plex_Mono` ATAU ganti ke `JetBrains Mono` / `Fira Code` (untuk tabular numerals di tabel keuangan)
  - Pertimbangan: monospace font tetap IBM Plex Mono karena bagus untuk angka, ATAU switch ke Inter monospace alternative
  - **Rekomendasi: tetap IBM Plex Mono** untuk angka financial — sudah proven

**File: `src/app/globals.css` (~lines 34-35)**
- Update CSS variable `--font-sans` ke Inter
- Tambah global letter-spacing: `-0.04em` (atau per-class basis)
- Pastikan `.tabular` class tetap menggunakan font-feature-settings untuk tabular numerals (Inter mendukung ini)

**File: `tailwind.config.ts` (jika ada custom font config)**
- Update fontFamily configuration

### PENTING — Yang TIDAK berubah:
- **Warna** — semua warna tetap sama
- **Fungsi** — tidak ada perubahan logic/behavior
- **Layout** — spacing/padding tetap (kecuali jika Inter memiliki metrics berbeda yang perlu adjustment minor)

### Adaptasi Typography Scale untuk Financial App

Karena KKA bukan portfolio website seperti shchebet.design, font sizes perlu di-scale down. Gunakan prinsip -4% letter-spacing tapi dengan ukuran yang sesuai:

| Elemen KKA | Saat ini (IBM Plex) | Target (Inter) | Weight | Letter-Spacing |
|------------|-------------------|----------------|--------|----------------|
| Page title ("Balance Sheet") | text-2xl (24px) | text-2xl (24px) | 700 | -0.04em |
| Section header ("CURRENT ASSETS") | text-sm (14px) | text-sm (14px) | 600 | -0.04em |
| "+ Tambah Akun" button | text-sm (14px) | text-sm (14px) | 500 | -0.04em |
| Table header ("LINE ITEM") | text-xs (12px) | text-xs (12px) | 600 | -0.04em |
| Table body (numbers) | text-sm (14px) | text-sm (14px) | 400 | -0.04em |
| Subtotal/Total row | text-sm (14px) | text-sm (14px) | 600 | -0.04em |
| Sidebar nav | text-sm (14px) | text-sm (14px) | 500 | -0.04em |
| Sidebar group label | text-xs (12px) | text-xs (12px) | 600 | -0.04em |
| Button ("Simpan") | text-sm (14px) | text-sm (14px) | 600 | -0.04em |

**Kuncinya: font size TETAP sama, yang berubah hanya font-family + letter-spacing global -0.04em.**

### Verifikasi
- [ ] Font di seluruh website berubah ke Inter (inspect via DevTools)
- [ ] Letter-spacing -0.04em diterapkan secara global
- [ ] Tabular numerals tetap bekerja di tabel keuangan (angka rata kanan, lebar seragam)
- [ ] Monospace font tetap bekerja untuk elemen yang memerlukan (jika ada)
- [ ] Warna TIDAK berubah sama sekali
- [ ] Layout tidak rusak — spacing/padding masih proporsional
- [ ] Mobile responsive tetap baik
- [ ] `npm run build` zero errors

---

## Cross-Cutting Concerns

### Dampak ke Halaman Lain
1. **Font Overhaul** berdampak ke SEMUA halaman (global). Verifikasi sampling di: HOME, Income Statement, Fixed Asset, Historical BS, Dashboard.
2. **Sub-Revisi 1-3** hanya berdampak ke Balance Sheet INPUT DATA. Tapi jika language state disimpan dan dipakai downstream (Historical BS, dll), pastikan konsisten.
3. **i18n dictionary** bisa jadi foundation untuk halaman input lain nanti (Income Statement, dll). Buat strukturnya modular.

### Urutan Eksekusi yang Disarankan
1. **Font Overhaul** — independent, foundational, bisa duluan
2. **Sub-Revisi 1** (Full bilingual) — paling complex, butuh dictionary + perubahan di 4-5 file
3. **Sub-Revisi 3** (TAMBAH TAHUN HISTORIS) — UI restructure
4. **Sub-Revisi 2** (Tombol bahasa baru) — paling kecil, bergantung pada Sub-Revisi 1 (butuh language state)
5. **Build verification + visual check semua halaman**
6. **Git commit** per sub-revisi (conventional commits)

### Testing Priority
1. Font: cek visual di 3-4 halaman berbeda (desktop + mobile)
2. Bilingual: toggle bolak-balik 5x, pastikan tidak ada string yang tertinggal English/Indonesian
3. Section TAMBAH TAHUN HISTORIS: tambah/kurangi tahun, cek grid kolom
4. Tombol bahasa: visual match dengan referensi screenshot
5. `npm run build` → zero errors
6. Cross-check: Historical BS, Cash Flow Statement tetap render dengan benar
