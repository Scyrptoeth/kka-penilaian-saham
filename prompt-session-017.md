# Session 017 — CLI Prompt

> **Scope**: 6 tasks dalam dependency order. Kerjakan berurutan Task A → F.
> **Pre-condition**: Session 016 selesai sukses. 691 tests, build clean, store v7.
> **Source of truth**: `kka-penilaian-saham.xlsx`
> **Semua lessons learned dari HANDOFF-COWORK.md tetap berlaku.**

---

## TASK A: Extract `computeFullProjectionPipeline()` — REFACTOR DULU

### Why
Pipeline proyeksi (~90 baris) diduplikasi di:
- `src/app/valuation/dcf/page.tsx` (lines 46–134)
- `src/app/projection/cash-flow/page.tsx` (lines 56–121)

Task D (CFI) dan Task E (SIMULASI POTENSI) juga akan butuh pipeline ini. DRY principle: extract sekali, pakai di semua.

### What
Buat shared function `computeFullProjectionPipeline()` di `src/lib/calculations/projection-pipeline.ts`:

```typescript
interface ProjectionPipelineInput {
  // All Zustand slices needed for projection
  home: HomeInputs;
  balanceSheet: BalanceSheetInputState;
  incomeStatement: IncomeStatementInputState;
  fixedAsset: FixedAssetInputState;
  accPayables: AccPayablesInputState;
  keyDrivers: KeyDriversState;
  discountRate: DiscountRateState;
}

interface ProjectionPipelineOutput {
  projFaRows: Record<number, YearKeyedSeries>;
  proyLrRows: Record<number, YearKeyedSeries>;
  proyBsRows: Record<number, YearKeyedSeries>;
  proyNoplatRows: Record<number, YearKeyedSeries>;
  proyApRows: Record<number, YearKeyedSeries>;
  proyCfsRows: Record<number, YearKeyedSeries>;
  histYears: number[];
  projYears: number[];
  lastHistYear: number;
}

export function computeFullProjectionPipeline(
  input: ProjectionPipelineInput
): ProjectionPipelineOutput;
```

### How
1. Extract pipeline logic dari `valuation/dcf/page.tsx` ke pure function baru
2. Fungsi HARUS pure — tidak boleh akses store langsung, semua via parameter
3. Update `valuation/dcf/page.tsx` untuk pakai `computeFullProjectionPipeline()`
4. Update `projection/cash-flow/page.tsx` untuk pakai `computeFullProjectionPipeline()`
5. Cek halaman proyeksi lain (projection/income-statement, projection/balance-sheet, projection/noplat, projection/fixed-asset) — jika mereka compute sebagian pipeline secara inline, pertimbangkan apakah mereka bisa pakai subset dari output pipeline. Jangan paksa jika tidak natural.

### Verification
- `npm run test 2>&1 | tail -25` → 691 tests tetap passing (zero regression)
- `npm run build 2>&1 | tail -25` → zero errors
- `npm run typecheck 2>&1 | tail -5` → clean
- Buka `/valuation/dcf` di browser → output identik sebelum dan sesudah refactor
- Buka `/projection/cash-flow` di browser → output identik

### Lessons yang berlaku
- LESSON-038: PROY/valuation pages → custom, bukan manifest
- LESSON-043: `buildDiscountRateInput()` — centralize store→input (pattern serupa)

---

## TASK B: `nilaiNominalPerSaham` + Store v7 → v8

### Why
AAM `paidUpCapitalDeduction` saat ini = `jumlahSahamBeredar` (assumes par value Rp 1). Perusahaan dengan par value berbeda akan salah hitung. Ini known limitation dari handoff.

### What
1. Tambah field `nilaiNominalPerSaham: number` di `HomeInputs` (Zod schema + TypeScript type)
2. Default value: `1` (Rp 1 — backward compatible)
3. Update store version v7 → v8 dengan migration yang menambahkan field ini (default `1`)
4. Update `HomeForm` — tambah input field untuk nilai nominal per saham (tipe number, validasi > 0)
5. Update `aam-valuation.ts` — `paidUpCapitalDeduction = jumlahSahamBeredar × nilaiNominalPerSaham`
6. Update `eem-valuation.ts` — jika `paidUpCapitalDeduction` dipakai di sini juga, update serupa

### Interface Change (AAM)
```typescript
// Di AamInput, tambah:
nilaiNominalPerSaham: number; // dari home.nilaiNominalPerSaham

// Di computeAam(), ubah:
// BEFORE: paidUpCapitalDeduction = input.jumlahSahamBeredar
// AFTER:  paidUpCapitalDeduction = input.jumlahSahamBeredar * input.nilaiNominalPerSaham
```

### Verification
- Migration test: state v7 → v8 harus add `nilaiNominalPerSaham: 1` ke home
- AAM test: update test fixture dengan nilaiNominalPerSaham = 1 → output identik (backward compatible)
- AAM test: tambah test baru dengan nilaiNominalPerSaham = 100 → paidUpCapitalDeduction = jumlahSaham × 100
- Build + typecheck clean

### Lessons yang berlaku
- LESSON-028: Always implement Zustand migrate
- LESSON-029: App harus company-agnostic

---

## TASK C: FA Adjustment Input di AAM Page

### Why
`faAdjustment` saat ini hardcoded `0`. Penilai DJP perlu memasukkan penyesuaian nilai aset tetap (dari sheet "ADJUSTMENT TANAH" di Excel) secara manual.

### What
1. Tambah input field `faAdjustment` di halaman AAM (`/valuation/aam/page.tsx`)
2. Field ini BUKAN di store global — cukup local state di AAM page, karena hanya dipakai di AAM
3. Atau jika SIMULASI POTENSI (Task E) juga butuh — pertimbangkan tambah ke store
4. Default: `0` (backward compatible)
5. Input type: number, format IDR, bisa negatif (penyesuaian turun) atau positif (penyesuaian naik)
6. Saat `faAdjustment` berubah, AAM result langsung re-compute via `useMemo`

### Verification
- AAM page: input faAdjustment = 0 → output identik dengan sebelumnya
- AAM page: input faAdjustment = 1.000.000.000 → aset tetap adjusted berubah, NAV berubah, equity berubah
- Build clean

### Catatan
- Cek Excel sheet "ADJUSTMENT TANAH" untuk memahami konteks — ini biasanya adjustment appraisal value tanah yang beda dari book value. Tapi di aplikasi, cukup satu field input numeric (user sudah tahu nilainya).

---

## TASK D: CFI Page (Cash Flow to Investor)

### Why
CFI adalah sheet di Excel yang menampilkan Cash Flow Available to Investors. Data ini menggabungkan historis dan proyeksi.

### What
Buat halaman baru: `/valuation/cfi/page.tsx`

### Data dari Excel (Sheet "CFI")
Sheet CFI hanya punya 3 baris data substantif dengan kolom historis (B-D/E) + proyeksi (E-H):

| Row | Label | Historis | Proyeksi |
|-----|-------|----------|----------|
| 7 | Free Cash Flow | FCF sheet rows (historical) | DCF sheet rows (projected FCF) |
| 8 | Non-Operational Cash Flow | INCOME STATEMENT row 30 (historis) | PROY LR row 34 (proyeksi) |
| 9 | **CFI** | **= Row 7 + Row 8** | **= Row 7 + Row 8** |

### Implementation Notes
- **Custom page** (bukan manifest) — sesuai LESSON-038 karena kolom campuran historis + proyeksi
- **Pakai `computeFullProjectionPipeline()`** dari Task A untuk mendapat projected data
- FCF historis sudah ada di `compute-fcf-live.ts`
- Non-Operational CF historis = IS row 30 (cek label di manifest income-statement — kemungkinan "Pendapatan / Beban Lain-lain" atau similar)
- Non-Operational CF proyeksi = PROY LR row 34 (cek output `computeProyLrLive`)
- FCF proyeksi perlu di-derive dari projected NOPLAT + CFS (sudah available dari pipeline output)
- **Tabel format**: historis (4 tahun) + proyeksi (3 tahun) = 7 kolom, 3 baris data + headers

### Calc Module
Buat `src/lib/calculations/cfi.ts`:
```typescript
interface CfiInput {
  historicalFcf: YearKeyedSeries;         // dari FCF computation
  projectedFcf: YearKeyedSeries;         // dari DCF computation (projected FCF per year)
  historicalNonOpCf: YearKeyedSeries;    // IS row 30 per year
  projectedNonOpCf: YearKeyedSeries;    // PROY LR row 34 per year
}

interface CfiOutput {
  fcf: YearKeyedSeries;       // gabungan hist + proj
  nonOpCf: YearKeyedSeries;   // gabungan hist + proj
  cfi: YearKeyedSeries;       // fcf + nonOpCf per year
}

export function computeCfi(input: CfiInput): CfiOutput;
```

### TDD
1. Tulis test dulu dengan expected values dari Excel fixture
2. Extract fixture CFI dari Excel jika belum ada (`npm run extract:fixtures` atau manual Python extraction)
3. Test: CFI = FCF + NonOpCf untuk setiap tahun (historis dan proyeksi)

### Verification
- Tests passing untuk CFI calc module
- Halaman CFI menampilkan tabel dengan data historis + proyeksi
- Angka match dengan Excel
- Build clean

### Navigation
Tambahkan link CFI di sidebar navigation (`nav-tree.ts`) di grup "Penilaian" (valuation group).

---

## TASK E: SIMULASI POTENSI Page

### Why
Ini adalah output UTAMA untuk Penilai DJP — menghitung potensi PPh kurang bayar dari pengalihan saham berdasarkan valuasi.

### What
Buat halaman baru: `/valuation/simulasi-potensi/page.tsx`

### Data dari Excel (Sheet "SIMULASI POTENSI (AAM)")
Sheet ini punya 18 baris. Berikut mapping lengkap:

| Row | Label | Formula/Value | Source |
|-----|-------|---------------|--------|
| 1 | Nett Asset Value | `=AAM!E51` | AAM computation |
| 2 | Interest Bearing Debt | `=AAM!E52` | AAM computation |
| 3 | Equity Value | `=AAM!E53` | AAM computation |
| 4 | DLOM | Persentase dari halaman DLOM | `home.dlomPercent` (sudah computed) |
| 4E | DLOM Amount | `= Equity Value × DLOM%` | Computed |
| 5 | Equity Value (100%) Less DLOM | `= Equity Value + DLOM Amount` | Computed |
| 6 | DLOC/PFC | Persentase dari halaman DLOC (PFC) | `home.dlocPercent` (sudah computed) |
| 6E | DLOC Amount | `= (Equity Less DLOM) × DLOC%` | Computed |
| 7 | Resistensi WP | Auto-determined | Derived from DLOM+DLOC category |
| 8 | Market Value of Equity (100%) | `= Equity Less DLOM + DLOC Amount` | Computed |
| 9 | Percentage of Shares | `=HOME!B8` | `home.proporsiKepemilikan` |
| 10 | Market Value of X% Equity | `= MV 100% × Proportion` | Computed |
| 11 | Nilai Pengalihan Saham yang Dilaporkan | **USER INPUT** | New field |
| 12 | Potensi Pengalihan Belum Dikenakan Pajak | `= MV Equity - Reported Value` | Computed |
| 13-17 | **Tarif PPh Progresif Pasal 17** | 5 bracket progressive tax | Computed |
| 18 | **Total Potensi PPh Kurang Bayar** | `= SUM(row 13:17)` | Final output |

### PENTING — Method Selector
Di Excel, sheet ini hanya pakai AAM. **Di aplikasi web, user harus bisa memilih metode valuasi** (DCF, AAM, atau EEM) sebagai basis equity value. Ini karena DLOM dan DLOC dipakai di semua metode.

**Implementasi method selector:**
- Dropdown/radio: DCF | AAM | EEM
- Saat pilih DCF → equity value dari `computeDcf()` output
- Saat pilih AAM → equity value dari `computeAam()` output (NAV, IBD, Equity — rows 1-3)
- Saat pilih EEM → equity value dari `computeEem()` output
- Default: AAM (sesuai Excel)

**Catatan**: Untuk DCF dan EEM, baris 1 (NAV) dan 2 (IBD) mungkin tidak relevan — hanya equity value yang dipakai. Conditional rendering: jika metode = AAM, tampilkan NAV + IBD + Equity. Jika DCF/EEM, langsung tampilkan Equity Value saja.

### Calc Module
Buat `src/lib/calculations/simulasi-potensi.ts`:

```typescript
// PPh Pasal 17 progressive brackets (2024)
const PPH_BRACKETS = [
  { rate: 0.05, limit: 60_000_000 },
  { rate: 0.15, limit: 250_000_000 },
  { rate: 0.25, limit: 500_000_000 },
  { rate: 0.30, limit: 5_000_000_000 },
  { rate: 0.35, limit: Infinity },
] as const;

interface SimulasiPotensiInput {
  equityValue100: number;          // dari DCF/AAM/EEM (sebelum DLOM/DLOC)
  dlomPercent: number;             // dari home.dlomPercent (negatif, misal -0.30)
  dlocPercent: number;             // dari home.dlocPercent (negatif, misal -0.50)
  proporsiKepemilikan: number;     // dari home.proporsiKepemilikan (0-1)
  nilaiPengalihanDilaporkan: number; // USER INPUT — nilai yang WP laporkan
}

interface SimulasiPotensiOutput {
  dlomAmount: number;
  equityLessDlom: number;
  dlocAmount: number;
  marketValueEquity100: number;
  marketValuePortion: number;      // MV × proporsi
  potensiPengalihan: number;       // MV portion - reported
  taxBrackets: Array<{ rate: number; taxableAmount: number; tax: number }>;
  totalPPhKurangBayar: number;     // FINAL OUTPUT
}

export function computeSimulasiPotensi(input: SimulasiPotensiInput): SimulasiPotensiOutput;
```

### Resistensi WP (Optional Enhancement)
Di Excel ada formula "Resistensi WP" yang auto-categorize (Tinggi/Moderat/Rendah) berdasarkan DLOM + DLOC level. Ini informational saja. Implement jika straightforward, skip jika complex.

### Store Consideration
- `nilaiPengalihanDilaporkan` — ini per-case input. Bisa di local state AAM page ATAU di store.
- **Rekomendasi**: Tambahkan ke store (persist) karena user mungkin navigate away dan kembali. Bisa sebagai bagian dari store v8 (bundle dengan nilaiNominalPerSaham dari Task B), atau v9 terpisah.

### TDD
1. Test progressive tax calculation dengan known values dari Excel
2. Test edge cases: potensi = 0 (reported >= market), potensi negatif (skip tax), boundary brackets
3. Test DLOM/DLOC application chain

### Verification
- Tests passing
- Halaman SIMULASI POTENSI menampilkan simulasi lengkap
- Method selector works (DCF/AAM/EEM switch)
- PPh progresif match dengan tarif Pasal 17
- Build clean

### Navigation
Tambahkan di sidebar — bisa di grup baru "Simulasi" atau di akhir "Penilaian" group.

---

## TASK F: Dashboard (Nice to Have)

### Why
Visualisasi Recharts untuk overview keuangan perusahaan. Ini pelengkap, kerjakan hanya jika Task A-E selesai.

### What
Buat halaman `/dashboard/page.tsx` dengan chart-chart berikut (prioritas):

1. **Revenue & Net Income Trend** (historis + proyeksi) — Line/Bar chart
2. **Balance Sheet Composition** — Stacked bar (Assets vs Liabilities vs Equity)
3. **Valuation Comparison** — Bar chart DCF vs AAM vs EEM share values
4. **FCF Trend** — Line chart historis + proyeksi

### Implementation
- Recharts sudah installed (v3)
- Data dari Zustand store + compute functions
- Server component wrapper + client chart components
- Responsive: stack vertically di mobile

### Verification
- Charts render dengan data demo (seed mode) dan data user (live mode)
- Build clean

---

## URUTAN EKSEKUSI & COMMIT STRATEGY

```
Task A (refactor pipeline)        → commit: "refactor: extract computeFullProjectionPipeline shared function"
Task B (nilaiNominalPerSaham)     → commit: "feat: add nilaiNominalPerSaham to HomeInputs, fix AAM par value deduction"
Task C (FA adjustment)            → commit: "feat: add faAdjustment input to AAM page"
Task D (CFI page)                 → commit: "feat: add CFI (Cash Flow to Investor) page"
Task E (SIMULASI POTENSI)        → commit: "feat: add SIMULASI POTENSI page with method selector and PPh progressive tax"
Task F (Dashboard)                → commit: "feat: add dashboard with Recharts visualizations"
```

## FINAL VERIFICATION (setelah semua task)

```bash
npm run test 2>&1 | tail -25          # semua test passing
npm run build 2>&1 | tail -25         # zero errors
npm run typecheck 2>&1 | tail -5      # clean
npm run lint 2>&1 | tail -5           # zero warnings
```

Hitung total tests, total pages, store version — update progress.md.

## CRITICAL REMINDERS

1. **buildDiscountRateInput()** — WAJIB pakai saat butuh Discount Rate input (LESSON-043)
2. **computeFullProjectionPipeline()** — setelah Task A, WAJIB pakai di semua page yang butuh projection data
3. **Pure functions** — semua calc module harus pure, testable, no store access
4. **Sign flips** — hanya di adapter layer (LESSON-011)
5. **YearKeyedSeries** — `Record<number, number>`, bukan array (LESSON-012)
6. **Next.js 16 breaking changes** — `params`/`searchParams` = `Promise<>`. Baca docs di `node_modules/next/dist/docs/` jika ragu.
7. **Tailwind v4** — No `tailwind.config.ts`. Pakai `@theme inline {}` di `globals.css`.
8. **React Compiler** — `useWatch()` bukan `watch()`. Derived state pattern bukan setState-in-effect.
9. **TDD** — Tulis test DULU untuk setiap calc module baru (CFI, Simulasi Potensi)
10. **Company-agnostic** — Zero hardcoded company values (LESSON-029)
