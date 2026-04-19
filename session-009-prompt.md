# Session 009 — Phase 3 Design Brainstorm

## Objective

Design session (bukan code execution). Output: `design.md` update + `plan.md` untuk Sessions 010-014. Estimasi ~30-45 menit brainstorm. Semua keputusan arsitektural harus committed sebelum sesi berakhir.

**Context**: Setelah 008.5 + 008.6, aplikasi jujur tentang state-nya — 9 financial pages clearly marked sebagai "MODE DEMO · WORKBOOK PROTOTIPE", sementara HOME + DLOM + DLOC sudah fully company-agnostic. Phase 3 adalah transisi dari demo viewer ke **tool penilaian aktif** dimana user memasukkan data perusahaan mereka sendiri.

---

## Input yang Sudah Diputuskan (dari User)

**Input strategy: Form per row manual (ketik atau copy-paste per cell)**

User (Penilai DJP) biasa input data keuangan secara manual — diketik satu per satu atau copy-paste dari sumber lain ke individual fields. Ini berarti:
- TIDAK perlu file upload parsing (ExcelJS read mode bisa defer)
- TIDAK perlu clipboard grid detection
- TIDAK perlu spreadsheet-like grid component
- Setiap baris financial statement punya input field(s) — satu per tahun
- User bisa tab antar fields, paste angka individual per cell
- Validation per field (numeric, non-negative where appropriate, format IDR)

**Implikasi arsitektural**: Ini adalah approach yang paling straightforward. Setiap sheet yang butuh user input (BS, IS, dan mungkin Fixed Asset) punya form mode dimana rows menjadi editable. Data flow: form input → Zustand store → calc engine → derived sheets (CFS, FR, FCF, NOPLAT, Growth Revenue, ROIC) auto-recompute.

---

## 6 Design Topics untuk Brainstorm

### Topic 1: DataSource Abstraction

Desain interface yang bisa serve kedua mode:
- **Seed mode** (current): baca dari `src/data/seed/fixtures/*.json` — data PT Raja Voltama
- **Live mode** (Phase 3): baca dari Zustand store — data perusahaan user

Pertanyaan kunci:
- Apakah `DataSource` adalah interface/type yang `SheetPage` terima sebagai prop?
- Atau apakah `SheetPage` detect mode dari store state (ada data user → live, tidak ada → seed)?
- Bagaimana coexistence? Apakah user bisa switch antara "lihat demo" dan "lihat data saya"?

Constraint: `SheetPage.tsx` saat ini punya `<DataSourceHeader mode="seed" />` — ini sudah single switching point. Saat Phase 3 live, tinggal ubah ke `mode="live"` (atau derive otomatis).

### Topic 2: Input Form Architecture untuk BS & IS

Balance Sheet punya ~27 baris data × 4 tahun = ~108 input fields.
Income Statement punya ~35 baris data × 4 tahun = ~140 input fields.

Pertanyaan kunci:
- Apakah form di-render di halaman yang sama dengan tabel output (toggle view/edit)?
- Atau halaman terpisah (e.g., `/input/balance-sheet` → isi form, `/historical/balance-sheet` → lihat hasil)?
- Bagaimana structure form state di Zustand? Flat `Record<string, Record<number, number>>` (rowLabel → year → value)? Atau nested by sheet?
- Apakah input form reuse `ManifestRow[]` definition untuk generate fields (sehingga rows tetap defined di satu tempat)?
- Validasi apa saja? (numeric only, specific rows harus non-negative, total rows auto-computed, cross-row consistency checks?)

Preferensi user: input manual per baris, bisa copy-paste per cell. Artinya:
- `<input type="text" inputMode="numeric">` per cell
- Tab navigation antar cells (left-to-right per row, top-to-bottom per column)
- Paste angka langsung ke field (auto-strip formatting: Rp, titik ribuan, koma desimal)
- Visual feedback: field berubah warna saat diisi
- Auto-save ke Zustand pada setiap change (debounced)

### Topic 3: Year Span Dynamic

Saat ini manifests hardcode `years: [2018, 2019, 2020, 2021]` atau `[2019, 2020, 2021]`.

Phase 3 harus derive dari `home.tahunTransaksi`:
- Jika `tahunTransaksi = 2022` → historis = 2018, 2019, 2020, 2021 (4 tahun untuk BS/IS, 3 tahun untuk sheets lain)
- Jika `tahunTransaksi = 2025` → historis = 2021, 2022, 2023, 2024

Pertanyaan kunci:
- Apakah year span di-compute sekali dan disimpan di store?
- Bagaimana manifests berubah? Apakah `years` dan `columns` menjadi dynamic (generated at runtime)?
- Column letters (B, C, D, E, F) hanya relevan untuk seed mode — di live mode, column mapping tidak diperlukan. Bagaimana abstraction-nya?

### Topic 4: Cross-Sheet Dependency Resolution

Dependency chain (dari Excel Dependency Map):
```
BS + IS → CFS, FR, NOPLAT, Growth Revenue
BS → ROIC (via Total Assets, Cash)
NOPLAT → FCF → ROIC
Fixed Asset → FCF
```

Saat user mengubah satu cell di Balance Sheet, semua downstream sheets harus recompute.

Pertanyaan kunci:
- **Reactive computation**: apakah setiap downstream sheet recompute on-demand saat user navigate ke page-nya? Atau eager recompute semua saat input berubah?
- **Dependency graph**: explicit graph structure, atau implicit (setiap page compute dari store state saat render)?
- **Performance**: 9 sheets × ~100 rows × 3-4 years = ~3000 cells computation. Apakah ini cukup cepat untuk reactive? Atau perlu memoization?

Rekomendasi arah: **lazy recompute** (compute saat page diakses, dari store state terkini). Pure calc functions sudah ada — tinggal wire input dari store ke calc function parameters. Memoize per sheet via `useMemo` di page level.

### Topic 5: Migration Plan — 9 Existing Pages

Bagaimana 9 seed-mode pages migrate ke DataSource abstraction tanpa breaking?

Proposed incremental approach:
1. Buat `DataSource` type/interface
2. Refactor `SheetPage` untuk accept `DataSource` (bisa seed atau live)
3. Migrate satu page (BS) sebagai pilot — form input + live computation + live table
4. Setelah BS proven, migrate IS (pattern identik)
5. Downstream sheets (CFS, FR, FCF, NOPLAT, Growth, ROIC) auto-live begitu upstream data tersedia di store
6. Fixed Asset terakhir (punya structure unik — category-based)

### Topic 6: UI Mode Toggle

Apakah user bisa switch antara seed (demo) dan live (data mereka)?

Options:
- **A**: Saat HOME form diisi, SEMUA pages otomatis switch ke live mode. Demo data tidak accessible lagi.
- **B**: Toggle button di header — "Lihat Demo" / "Lihat Data Saya". User bisa compare.
- **C**: Demo data always accessible di `/demo/*` routes terpisah.

Pertimbangan: Penilai DJP mungkin ingin lihat demo dulu untuk memahami format/output sebelum input data sendiri. Tapi setelah input, mereka jarang kembali ke demo.

---

## Expected Output dari Session Ini

1. **`design.md` update** — Semua 6 keputusan di atas committed dengan rationale
2. **`plan.md`** — Roadmap Sessions 010-014 dengan task breakdown per session:
   - Session 010: DataSource abstraction + BS input form (pilot)
   - Session 011: IS input form + downstream auto-compute (CFS, FR, NOPLAT)
   - Session 012: Remaining downstream sheets live + Fixed Asset
   - Session 013: WACC/Discount Rate + DCF valuation
   - Session 014: AAM + EEM + final valuation summary
3. **Lesson candidates** dari design decisions

## Constraints Reminder

- Semua computation client-side (Non-negotiable #2: Privacy-first)
- Calc functions sudah ada dan TDD-proven — Phase 3 wires them, tidak rewrite them
- `DataSourceHeader` mode="seed" sudah jadi switching point (Session 008.6)
- Zustand store sudah punya home, dlom, dloc slices
- 133 tests harus tetap passing setelah setiap migration step
