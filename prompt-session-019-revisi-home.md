# Session 019 — CLI Prompt: Revisi HOME + Dampak Downstream

> **Scope**: Revisi UI/UX HOME form + field baru + integrasi Simulasi Potensi (Badan vs OP) + reset buttons
> **Pre-condition**: Session 017 selesai. 715 tests, 32 pages, build clean, store v8.
> **Prinsip**: Semua perubahan harus **system development** — bukan patching. Setiap field baru harus terintegrasi end-to-end (type → schema → store → form → calc → display → export).

---

## GAMBARAN BESAR PERUBAHAN

Session ini merevisi HOME form secara signifikan. Ada 7 sub-revisi yang saling terkait. Dampak downstream menyebar ke **44 source files** yang consume `HomeInputs`.

**Strategi minimalisasi risiko:**
- **JANGAN rename store field names** yang sudah dipakai di 44 files (misal: `namaPerusahaan` tetap `namaPerusahaan` di store/type). Cukup ganti UI LABEL saja. Ini mengikuti LESSON-030 (backward-compatible adapter > refactor).
- **Tambahkan field baru** untuk data yang benar-benar baru (subjek pajak, jenis informasi peralihan).
- **Store migration** v8 → v9 harus backward-compatible — semua field baru punya default values.

---

## TASK A: Update TypeScript Types + Zod Schema + Store Migration

### A1. Update `HomeInputs` Interface

**File**: `src/types/financial.ts` (lines 24-39)

```typescript
// BEFORE (v8):
interface HomeInputs {
  namaPerusahaan: string           // ← KEEP field name, change UI label only
  npwp: string                     // ← ini jadi NPWP Objek Pajak
  jenisPerusahaan: 'tertutup' | 'terbuka'
  jumlahSahamBeredar: number
  jumlahSahamYangDinilai: number
  tahunTransaksi: number
  objekPenilaian: 'saham' | 'bisnis'
  nilaiNominalPerSaham: number
  dlomPercent: number
  dlocPercent: number
}

// AFTER (v9):
interface HomeInputs {
  // === Objek Pajak (Perusahaan yang dinilai) ===
  namaPerusahaan: string           // UI label: "NAMA OBJEK PAJAK"
  npwp: string                     // UI label: "NPWP" (objek pajak)
  
  // === Subjek Pajak (Pihak yang mengalihkan saham) === [NEW]
  namaSubjekPajak: string          // UI label: "NAMA SUBJEK PAJAK"
  npwpSubjekPajak: string          // UI label: "NPWP" (subjek pajak)
  jenisSubjekPajak: JenisSubjekPajak // 'orang_pribadi' | 'badan' [NEW]
  
  // === Informasi Perusahaan ===
  jenisPerusahaan: 'tertutup' | 'terbuka'
  objekPenilaian: 'saham' | 'bisnis'
  jenisInformasiPeralihan: JenisInformasiPeralihan // 'lembar_saham' | 'modal_disetor' [NEW]
  
  // === Data Kuantitatif ===
  // Field names TETAP sama di store, UI label berubah berdasarkan jenisInformasiPeralihan:
  //   'lembar_saham'  → "JUMLAH SAHAM BEREDAR" / "JUMLAH SAHAM YANG DINILAI"
  //   'modal_disetor' → "JUMLAH MODAL DISETOR 100%" / "JUMLAH MODAL DISETOR YANG DINILAI"
  jumlahSahamBeredar: number       // generic: "total" (saham ATAU modal disetor 100%)
  jumlahSahamYangDinilai: number   // generic: "dinilai" (saham ATAU modal disetor dinilai)
  
  nilaiNominalPerSaham: number     // TETAP ADA, default 1, NOT required
  tahunTransaksi: number
  
  // === Auto-computed (dari DLOM/DLOC questionnaire) ===
  dlomPercent: number
  dlocPercent: number
}

// New enums:
type JenisSubjekPajak = 'orang_pribadi' | 'badan'
type JenisInformasiPeralihan = 'lembar_saham' | 'modal_disetor'
```

### A2. Update Zod Schema

**File**: `src/lib/schemas/home.ts`

Perubahan:
- Tambah field baru: `namaSubjekPajak` (string, min 1, max 200)
- Tambah field baru: `npwpSubjekPajak` (string, regex sama dengan npwp existing)
- Tambah field baru: `jenisSubjekPajak` (enum: `['orang_pribadi', 'badan']`)
- Tambah field baru: `jenisInformasiPeralihan` (enum: `['lembar_saham', 'modal_disetor']`)
- `nilaiNominalPerSaham`: ubah validasi — tetap positive number tapi BUKAN required form field (berikan default 1 di `defaultValues` RHF). Di schema tetap wajib karena store selalu punya value.
- **HAPUS** helper text "Format: 15 digit" dari schema error messages untuk npwp objek pajak (hint dihapus per Sub-Revisi 2)
- Cross-field rule `jumlahSahamYangDinilai <= jumlahSahamBeredar` tetap berlaku (field name sama, semantik berbeda per mode)

### A3. Store Migration v8 → v9

**File**: `src/lib/store/useKkaStore.ts`

```typescript
// v8 → v9 migration:
if (fromVersion < 9) {
  if (state.home && typeof state.home === 'object') {
    const home = state.home as Record<string, unknown>
    state = {
      ...state,
      home: {
        ...home,
        namaSubjekPajak: home.namaSubjekPajak ?? '',
        npwpSubjekPajak: home.npwpSubjekPajak ?? '',
        jenisSubjekPajak: home.jenisSubjekPajak ?? 'orang_pribadi',
        jenisInformasiPeralihan: home.jenisInformasiPeralihan ?? 'lembar_saham',
      },
    }
  }
}
```

**Default values**: `namaSubjekPajak: ''`, `npwpSubjekPajak: ''`, `jenisSubjekPajak: 'orang_pribadi'`, `jenisInformasiPeralihan: 'lembar_saham'`. Backward-compatible — existing users get Orang Pribadi (current behavior) dan Lembar Saham (current behavior).

### Verification Task A
- Migration test: state v8 → v9 adds new fields with correct defaults
- Schema test: semua field baru validated correctly
- TypeScript: `tsc --noEmit` clean (zero errors dari type changes)
- Existing 715 tests tetap passing

---

## TASK B: Revisi HomeForm Component

**File**: `src/components/forms/HomeForm.tsx` (lines 39-279)

### B1. Sub-Revisi 1 — Privacy Notice 1 Baris

Ubah teks privacy notice agar menjadi **1 baris**:
```
"Seluruh data disimpan lokal di browser Anda. Tidak ada yang dikirim ke server. Auto-save aktif setiap kali form disimpan."
```
Pastikan tidak word-wrap ke baris kedua. Jika container terlalu sempit (mobile), biarkan wrap naturally — yang penting di desktop harus 1 baris. Mungkin perlu adjust font-size atau container width.

### B2. Sub-Revisi 2 — Rename Label + Hapus NPWP Hint

- Ganti label "NAMA PERUSAHAAN" → **"NAMA OBJEK PAJAK"**
- Hapus teks helper "Format: 15 digit (contoh: 01.234.567.8-901.000)" di bawah NPWP
- **JANGAN** ubah field name di store/type — hanya UI label

### B3. Sub-Revisi 3 — Tambah Baris Subjek Pajak + JENIS SUBJEK PAJAK

Layout baru (2 baris tambahan setelah baris Objek Pajak):

```
Row 1: [NAMA OBJEK PAJAK *]     [NPWP *]              ← existing (label renamed)
Row 2: [NAMA SUBJEK PAJAK *]    [NPWP *]              ← NEW (subjek pajak)
Row 3: [JENIS SUBJEK PAJAK ▼]   [JENIS INFO ▼]        ← NEW (dropdowns)
Row 4: [JENIS PERUSAHAAN ▼]     [OBJEK PENILAIAN ▼]   ← existing
Row 5: [JUMLAH SAHAM BEREDAR *] [JUMLAH SAHAM DINILAI *] ← conditional label
Row 6: [NILAI NOMINAL /SAHAM]   [TAHUN TRANSAKSI *]   ← nilaiNominal opsional
```

**JENIS SUBJEK PAJAK** dropdown:
- Options: "Orang Pribadi" | "Badan"
- Default: "Orang Pribadi"
- Store field: `jenisSubjekPajak`

### B4. Sub-Revisi 4 — JENIS INFORMASI PERALIHAN + Conditional Labels

**JENIS INFORMASI PERALIHAN YANG DIKETAHUI** dropdown:
- Options: "Lembar Saham" | "Modal Disetor"
- Default: "Lembar Saham"
- Store field: `jenisInformasiPeralihan`

**Conditional label rendering** (Row 5):

```typescript
const isLembarSaham = watch('jenisInformasiPeralihan') === 'lembar_saham'

// Label untuk field jumlahSahamBeredar:
isLembarSaham ? "JUMLAH SAHAM BEREDAR" : "JUMLAH MODAL DISETOR 100%"

// Label untuk field jumlahSahamYangDinilai:
isLembarSaham ? "JUMLAH SAHAM YANG DINILAI" : "JUMLAH MODAL DISETOR YANG DINILAI"
```

**PENTING**: Store field names (`jumlahSahamBeredar`, `jumlahSahamYangDinilai`) TIDAK berubah. Hanya UI labels yang conditional. Ini memastikan **zero downstream changes** di 44 files yang consume fields ini. Proporsi dihitung identik: `dinilai / beredar`.

### B5. Sub-Revisi 5 — nilaiNominalPerSaham: Pertahankan tapi Opsional

- Field **TETAP ADA** di form
- **BUKAN** required (hapus asterisk merah `*`)
- Default value: `1` (Rp 1)
- Tambah helper text di bawah field:
  ```
  "Diperlukan untuk perhitungan paidUpCapitalDeduction pada metode AAM (Adjusted Asset Method).
  Default Rp 1 jika tidak diketahui."
  ```
- **Di Zod schema**: field tetap wajib (karena store selalu punya value), tapi di form `defaultValues` RHF set ke `1` sehingga user tidak perlu isi jika tidak relevan

### B6. Sub-Revisi 6 — Conditional Proporsi Label

Di section "NILAI TURUNAN (OTOMATIS)":

```typescript
const isLembarSaham = watch('jenisInformasiPeralihan') === 'lembar_saham'

// Label proporsi:
isLembarSaham ? "PROPORSI SAHAM YANG DINILAI" : "PROPORSI MODAL DISETOR YANG DINILAI"
```

Kalkulasi `computeProporsiSaham()` tetap sama — hanya label yang berubah.

### B7. Sub-Revisi 7 — Tombol Reset

Tambahkan 2 tombol di samping atau di bawah tombol "SIMPAN":

```
[SIMPAN]  [RESET HANYA HALAMAN INI]  [RESET SELURUH DATA]
```

**RESET HANYA HALAMAN INI**:
- Reset SEMUA field di HOME form ke default values
- Store: `setHome(null)` → mode kembali ke SEED
- **Konfirmasi dialog** sebelum reset: "Yakin ingin mereset data HOME? Data di halaman lain tidak terpengaruh."

**RESET SELURUH DATA**:
- Reset SELURUH Zustand store ke initial state (semua 13 slices)
- Efektif menghapus semua data user → kembali ke SEED mode penuh
- **Konfirmasi dialog** lebih tegas: "Yakin ingin mereset SELURUH data? Semua input di semua halaman akan dihapus. Tindakan ini tidak bisa dibatalkan."
- Implementation: call `useKkaStore.getState().reset()` — perlu tambah `reset()` action di store jika belum ada

**Styling**:
- "SIMPAN" → primary button (existing style)
- "RESET HANYA HALAMAN INI" → secondary/outline button, warna netral
- "RESET SELURUH DATA" → destructive/danger button (merah/outline merah)

### Verification Task B
- Visual: form layout match spesifikasi di atas
- Conditional labels: switch "Lembar Saham" ↔ "Modal Disetor" → labels berubah instant
- NPWP hint removed
- Privacy notice = 1 baris di desktop
- nilaiNominalPerSaham: helper text visible, default 1, bisa dikosongkan (fallback ke 1)
- Reset buttons: konfirmasi dialog muncul, data ter-reset correctly
- Build clean

---

## TASK C: Update Simulasi Potensi — PPh Badan (Tarif Flat 22%)

### Why
Saat ini `computeSimulasiPotensi()` HANYA support tarif progresif PPh Pasal 17 untuk Orang Pribadi. Dengan field baru `jenisSubjekPajak`, perlu ditambah logika untuk Badan (tarif flat 22%).

### What

**File**: `src/lib/calculations/simulasi-potensi.ts`

Update `SimulasiPotensiInput` interface:
```typescript
interface SimulasiPotensiInput {
  equityValue100: number;
  dlomPercent: number;
  dlocPercent: number;
  proporsiKepemilikan: number;
  nilaiPengalihanDilaporkan: number;
  jenisSubjekPajak: JenisSubjekPajak;  // [NEW] 'orang_pribadi' | 'badan'
}
```

Update `computeSimulasiPotensi()`:
```typescript
export function computeSimulasiPotensi(input: SimulasiPotensiInput): SimulasiPotensiOutput {
  // ... existing DLOM/DLOC/MV chain ...
  
  const potensiPengalihan = marketValuePortion - nilaiPengalihanDilaporkan;
  
  if (input.jenisSubjekPajak === 'badan') {
    // PPh Badan: flat 22%
    const TARIF_PPH_BADAN = 0.22;
    const taxAmount = Math.max(0, potensiPengalihan) * TARIF_PPH_BADAN;
    return {
      ...commonFields,
      taxBrackets: [{ rate: TARIF_PPH_BADAN, taxableAmount: Math.max(0, potensiPengalihan), tax: taxAmount }],
      totalPPhKurangBayar: taxAmount,
    };
  }
  
  // PPh Orang Pribadi: tarif progresif (existing logic)
  // ... existing progressive tax bracket code ...
}
```

**Named constant**: `TARIF_PPH_BADAN = 0.22` — export dari module agar reusable.

### Update Simulasi Potensi Page

**File**: `src/app/valuation/simulasi-potensi/page.tsx`

- Baca `home.jenisSubjekPajak` dari store
- Pass ke `computeSimulasiPotensi()` input
- UI: tampilkan info apakah perhitungan menggunakan tarif progresif (OP) atau flat 22% (Badan)
- Jika "Badan": tabel bracket hanya 1 baris (22%), bukan 5 baris progressive

### TDD
- Test existing: semua 17 tests tetap pass (default `jenisSubjekPajak: 'orang_pribadi'`)
- Test baru: `jenisSubjekPajak: 'badan'` → flat 22% applied
- Test baru: `jenisSubjekPajak: 'badan'` + potensi negatif → tax = 0
- Test baru: `jenisSubjekPajak: 'badan'` + potensi = 0 → tax = 0

### Verification Task C
- Simulasi Potensi page: switch jenis subjek pajak di HOME → perhitungan berubah otomatis
- Orang Pribadi: tarif progresif (5 bracket) — behavior existing
- Badan: tarif flat 22% — 1 baris tabel
- All tests passing

---

## TASK D: Update Downstream Consumers — Label-Only Changes

Perubahan ini **minimal** karena store field names TIDAK berubah. Yang perlu diupdate hanya LABELS/DISPLAY:

### D1. DataSourceHeader

**File**: `src/components/financial/DataSourceHeader.tsx` (lines 72-95)

- Saat ini menampilkan `home.namaPerusahaan`. Label di sini sudah generik ("Nama perusahaan" sebagai context, bukan form label), jadi mungkin tidak perlu diubah. Tapi jika ada teks literal "Perusahaan:" → ganti ke label yang lebih generik atau "Objek Pajak:".

### D2. Export Filename

**File**: `src/lib/export/export-xlsx.ts` (lines 108-112)

- `buildExportFilename()` menggunakan `home.namaPerusahaan` — tidak perlu diubah (field name sama).

### D3. Cell Mapping

**File**: `src/lib/export/cell-mapping.ts`

- Tambah mapping untuk field baru: `namaSubjekPajak`, `npwpSubjekPajak`, `jenisSubjekPajak`, `jenisInformasiPeralihan`
- Verify cell positions di Excel (mungkin perlu tambah cells baru jika belum ada di Excel template)
- Field baru yang TIDAK ada di Excel template → mark sebagai "UI-only, skip export" (sama pattern dengan `npwp`)

### D4. Upload Parser (jika sudah diimplementasi dari Session 018)

- Tambah parsing untuk field baru di template upload
- Atau: jika Session 018 belum dijalankan, ini akan di-handle saat Session 018

### Verification Task D
- DataSourceHeader menampilkan nama yang benar
- Export filename tetap bekerja
- Cell mapping updated (atau skipped jika field tidak ada di Excel)
- Build clean

---

## TASK E: Update Tests

### E1. Update Existing HomeInputs Tests

Semua test yang create `HomeInputs` fixtures perlu ditambahkan field baru:
```typescript
// Tambah ke setiap home fixture di tests:
namaSubjekPajak: 'Test Subjek',
npwpSubjekPajak: '01.234.567.8-901.001',
jenisSubjekPajak: 'orang_pribadi' as const,
jenisInformasiPeralihan: 'lembar_saham' as const,
```

**Cari semua test files yang membuat HomeInputs mock/fixture**: `grep -r "namaPerusahaan" __tests__/` — setiap file yang ditemukan perlu update fixture.

### E2. New Tests

1. **Store migration v8→v9**: default values correct
2. **Schema validation**: new fields validated correctly
3. **Simulasi Potensi Badan**: flat 22% tax rate
4. **Conditional labels**: (jika ada component tests) — label berubah sesuai jenisInformasiPeralihan
5. **Reset functionality**: HOME reset dan full reset

### Verification Task E
- `npm run test 2>&1 | tail -25` → all tests passing
- Zero regressions dari existing 715 tests

---

## URUTAN EKSEKUSI

```
Task A (Types + Schema + Migration) → commit: "feat: add subjek pajak, jenis informasi peralihan to HomeInputs (store v8→v9)"
Task B (HomeForm UI revisi)         → commit: "feat: revise HOME form — new fields, conditional labels, reset buttons"
Task C (Simulasi Potensi PPh Badan) → commit: "feat: add PPh Badan flat 22% rate to Simulasi Potensi"
Task D (Downstream label updates)   → commit: "chore: update downstream labels and cell mapping for HOME revisions"
Task E (Tests)                      → commit: "test: update fixtures and add tests for HOME revisions"
```

Boleh juga gabung Task A + B dalam 1 commit jika lebih natural.

---

## FINAL VERIFICATION

```bash
npm run test 2>&1 | tail -25          # all tests passing
npm run build 2>&1 | tail -25         # zero errors (32+ static pages)
npm run typecheck 2>&1 | tail -5      # clean
npm run lint 2>&1 | tail -5           # zero warnings
```

### Manual Verification Checklist:
- [ ] HOME form: layout match spesifikasi (6 baris field)
- [ ] Label "NAMA OBJEK PAJAK" (bukan "NAMA PERUSAHAAN")
- [ ] NPWP hint text dihapus
- [ ] Privacy notice = 1 baris di desktop
- [ ] NAMA SUBJEK PAJAK + NPWP SUBJEK PAJAK visible dan functional
- [ ] JENIS SUBJEK PAJAK dropdown: Orang Pribadi / Badan
- [ ] JENIS INFORMASI PERALIHAN dropdown: Lembar Saham / Modal Disetor
- [ ] Switch ke "Modal Disetor" → labels berubah ke "JUMLAH MODAL DISETOR 100%" / "YANG DINILAI"
- [ ] Switch ke "Lembar Saham" → labels kembali ke "JUMLAH SAHAM BEREDAR" / "YANG DINILAI"
- [ ] NILAI NOMINAL PER SAHAM: helper text visible, default 1, opsional
- [ ] PROPORSI (derived): label berubah sesuai jenisInformasiPeralihan
- [ ] Tombol RESET HANYA HALAMAN INI: konfirmasi → reset HOME only
- [ ] Tombol RESET SELURUH DATA: konfirmasi → reset semua store
- [ ] Simulasi Potensi: Orang Pribadi → tarif progresif (5 bracket)
- [ ] Simulasi Potensi: Badan → tarif flat 22%
- [ ] Semua halaman lain tetap berfungsi normal (zero regression)

---

## CRITICAL REMINDERS

1. **JANGAN rename store field names** — `namaPerusahaan`, `jumlahSahamBeredar`, `jumlahSahamYangDinilai` tetap sama di store/type. Rename 44+ files = risiko tinggi. Cukup ganti UI label. (LESSON-030)
2. **WAJIB pakai shared builders** dari `upstream-helpers.ts` — JANGAN copy-paste parameter mapping (LESSON-046)
3. **Store migration backward-compatible** — semua field baru punya sensible defaults (LESSON-028)
4. **useWatch() bukan watch()** — React Compiler requirement (LESSON-004)
5. **Derived state pattern** — conditional labels harus derived dari state, bukan setState-in-effect (LESSON-016)
6. **TARIF_PPH_BADAN = 0.22** — named constant, bukan magic number
7. **Proporsi calculation IDENTIK** untuk kedua mode — `dinilai / beredar` regardless of jenisInformasiPeralihan. Downstream calcs **tidak berubah**.
8. **nilaiNominalPerSaham** tetap di schema sebagai required (default 1), tapi di form tampil sebagai opsional (tanpa asterisk, dengan helper text).
9. **Konfirmasi dialog** untuk kedua tombol reset — destructive action wajib konfirmasi.
10. **PPh Badan edge case**: jika potensiPengalihan <= 0, totalPPh = 0 (jangan negative tax).
