# Session 008 — ROIC Page + DLOM & DLOC Interactive Forms

## Objective

Session ini deliver 3 hal dalam satu sesi:

1. **ROIC page** — pure manifest authoring (seed-mode, ~20 menit). Page ke-9.
2. **DLOM form** — interactive questionnaire (10 faktor), live scoring, persist ke Zustand → feed `home.dlomPercent`. Ini adalah **first interactive form page** setelah HOME.
3. **DLOC (PFC) form** — interactive questionnaire (5 faktor), live scoring, persist ke Zustand → feed `home.dlocPercent`. Share pattern & component primitives dengan DLOM.

**Why**: ROIC melengkapi analysis pages yang bisa di-ship seed-mode. DLOM + DLOC adalah natural on-ramp ke Phase 3 (user input mode) — mereka exercise form UI + calc engine + store wiring tanpa sekaligus introduce projection complexity. Setelah sesi ini, 11 dari ~30 sheets live.

---

## Part 1 — ROIC Page (Manifest Authoring)

### Fixture analysis (sudah dilakukan)

Sheet ROIC (`__tests__/fixtures/roic.json`):
- **3 tahun**: 2019, 2020, 2021
- **Columns**: B=2019, C=2020, D=2021
- **Row structure**:
  - Row 7: NOPLAT (from `FCF!C20..E20`)
  - Row 8: Total Asset in Balance Sheet (from `BALANCE SHEET!D27..F27`)
  - Row 9: Less Non Operating Fixed Assets — value 0 semua (asumsi)
  - Row 10: Less Excess Cash (from `BALANCE SHEET!D8*-1..F8*-1`)
  - Row 11: Less Marketable Securities — value 0 semua
  - Row 12: Total Invested Capital at End of Year (=SUM B8:B11)
  - Row 13: Total Invested Capital at Beginning of Year (=prev year's row 12)
  - Row 15: ROIC = NOPLAT / Invested Capital Beginning of Year — **hanya ada 2020 dan 2021** (2019 tidak ada beginning capital)
  - Row 18-20: Catatan (text notes)

### Instructions

1. Sync fixture ke seed: tambah `'roic'` ke `SHEETS` di `scripts/copy-fixtures.cjs`, run `npm run seed:sync`
2. Extend `SheetSlug` di `src/data/seed/loader.ts` + import JSON + tambah ke `FIXTURES` record
3. Extend slug di `src/data/manifests/types.ts`
4. Buat manifest `src/data/manifests/roic.ts`:
   - `years: [2019, 2020, 2021]`, `columns: { 2019: 'B', 2020: 'C', 2021: 'D' }`
   - **NO derivations** — ini mixed sheet (stock values + ratio), growth tidak semantically useful
   - Row 15 (ROIC) punya `valueKind: 'percent'`
   - Row 7 dan 8-12 punya `valueKind: 'idr'`
   - Rows 18-20 bisa di-skip (catatan text, bukan data)
   - Row 9 bisa keep as data row meskipun value 0 (transparansi)
5. Buat page `src/app/analysis/roic/page.tsx` — 11 lines, standard `<SheetPage>` pattern
6. Update `nav-tree.ts` — hapus `wip: true` atau tambah entry ROIC
7. Verify: `npm run build 2>&1 | tail -25` (expect ROIC as new static route)

**Smell test**: page file harus copy-paste-able. Zero code di luar manifest + page + nav update.

---

## Part 2 — Shared Questionnaire Infrastructure

Sebelum DLOM dan DLOC, bangun shared primitives yang akan dipakai keduanya.

### 2A. Types (`src/types/questionnaire.ts`)

```ts
/** A single factor in a DLOM/DLOC questionnaire */
export interface QuestionnaireFactor {
  /** 1-based factor number */
  number: number
  /** Factor label (e.g., "Entry Barier Perijinan Usaha") */
  label: string
  /** Long description of the factor */
  description: string
  /** Available options for this factor */
  options: readonly QuestionnaireOption[]
}

export interface QuestionnaireOption {
  /** Display label (e.g., "Ada", "Terbatas", "Tidak Ada") */
  label: string
  /** Numeric score: 0, 0.5, or 1 */
  score: number
}

export type KepemilikanType = 'mayoritas' | 'minoritas'

/** Result of scoring a questionnaire */
export interface QuestionnaireResult {
  /** Score per factor (indexed by factor number) */
  scores: Record<number, number>
  /** Total sum of all scores */
  totalScore: number
  /** Maximum possible score (= number of factors × 1) */
  maxScore: number
  /** Percentage range [min, max] determined by company type + ownership */
  range: { min: number; max: number }
  /** Final computed percentage */
  percentage: number
}
```

### 2B. Calc functions (TDD — pure functions)

**`src/lib/calculations/dlom.ts`**:

```ts
export function computeDlomPercentage(params: {
  totalScore: number
  maxScore: number
  jenisPerusahaan: JenisPerusahaan
  kepemilikan: KepemilikanType
}): { range: { min: number; max: number }; percentage: number }
```

Range logic (dari Excel `DLOM!C32` formula):
- `jenisPerusahaan` → code: tertutup=1, terbuka=2
- `kepemilikan` → code: minoritas=5, mayoritas=7
- Sum codes → range lookup:
  - 6 (tertutup+minoritas) → 30%–50%
  - 7 (terbuka+minoritas) → 10%–30%
  - 8 (tertutup+mayoritas) → 20%–40%
  - 9 (terbuka+mayoritas) → 0%–20%
- Formula: `percentage = range.min + (totalScore / maxScore × (range.max - range.min))`

**`src/lib/calculations/dloc.ts`**:

```ts
export function computeDlocPercentage(params: {
  totalScore: number
  maxScore: number
  jenisPerusahaan: JenisPerusahaan
  kepemilikan: KepemilikanType
}): { range: { min: number; max: number }; percentage: number }
```

Range logic (dari Excel `DLOC(PFC)!E22` + `B22` formulas):
- `jenisPerusahaan` → code: tertutup=1, terbuka=2
- `kepemilikan` → code: minoritas=5, mayoritas=7
- DLOC range lookup:
  - tertutup + mayoritas (code 8) → PFC range "30%–70%"
  - tertutup + minoritas (code 6) → PFC range (periksa fixture, kemungkinan "30%–50%")
  - terbuka + mayoritas (code 9) → PFC range "20%–35%"
  - terbuka + minoritas (code 7) → PFC range (periksa fixture)
- Formula: `percentage = range.min + (totalScore / maxScore × (range.max - range.min))`

> **PENTING**: Verifikasi range lookup DLOC dari fixture `DLOC(PFC)!B22` formula:
> `=IF(A20=1," 30% - 70%"," 20% - 35%")` — ini hanya cek tertutup/terbuka.
> Kemudian cek apakah `kepemilikan` juga affect range di DLOC.
> Dari fixture: `A21: =IF(B31="Minoritas",5,7)` dan `E21: 5` (maxScore).
> Analisa: `kepemilikan` affect **maxScore** di DLOC (5 untuk minoritas, 7 untuk mayoritas?).
> Baca formula teliti sebelum implement — jangan asumsi identik dengan DLOM.

### TDD targets

Test files: `__tests__/lib/calculations/dlom.test.ts` dan `dloc.test.ts`

Untuk DLOM, verifikasi terhadap fixture:
- 10 faktor, semua score = 1 → totalScore = 10
- jenisPerusahaan = tertutup, kepemilikan = mayoritas
- Range = 20%–40%, maxScore = 10
- Expected DLOM = 0.20 + (10/10 × 0.20) = 0.40 → matches `DLOM!F34` = 0.4 ✅

Untuk DLOC, verifikasi terhadap fixture:
- 5 faktor, scores: [1, 0.5, 0.5, 0.5, 0.5] → totalScore = 3
- jenisPerusahaan = tertutup, kepemilikan = mayoritas
- Range = 30%–70%, maxScore = 5
- Expected DLOC = 0.30 + (3/5 × 0.40) = 0.54 → matches `DLOC(PFC)!E24` = 0.54 ✅

### 2C. Factor definitions as data

Buat `src/data/questionnaires/dlom-factors.ts` dan `dloc-factors.ts` — pure data constants (mirip manifest pattern). Setiap factor memiliki: number, label, description, dan options array yang di-extract dari fixture.

**DLOM 10 factors** (dari fixture `DLOM!B7..G25`):

| # | Label | Options (label → score) |
|---|---|---|
| 1 | Entry Barier Perijinan Usaha | Ada→0, Terbatas→0.5, Tidak Ada→1 |
| 2 | Entry Barier Skala Ekonomis Usaha | Tidak Terbatas→0, Segmen Tertentu→0.5, Skala Besar→1 |
| 3 | Dividen | Ya→0, Kadang-kadang→0.5, Tidak Ada→1 |
| 4 | Profitabilitas (EBITDA) | Diatas→0, Rata-rata→0.5, Dibawah→1 |
| 5 | Fluktuasi Laba Bersih | Tidak, Meningkat→0, Sedang, Stabil→0.5, Ya, Menurun→1 |
| 6 | Struktur Permodalan | Dibawah→0, Rata-rata→0.5, Diatas→1 |
| 7 | Liquiditas | Diatas→0, Rata-rata→0.5, Dibawah→1 |
| 8 | Pertumbuhan Penjualan | Lebih Besar→0, Rata-rata→0.5, Lebih Kecil→1 |
| 9 | Prospek Perusahaan dan Industri | Meningkat→0, Seperti Saat Ini→0.5, Menurun→1 |
| 10 | Kualitas Manajemen | Ya→0, Seperti Saat Ini→0.5, Tidak→1 |

Pola: 3 opsi per faktor, skor selalu 0 / 0.5 / 1. Opsi pertama = kondisi paling positif (score 0, DLOM rendah).

**DLOC 5 factors** (dari fixture `DLOC(PFC)!A7..F15`):

| # | Label | Options (label → score) |
|---|---|---|
| 1 | Perjanjian antara Pemegang Saham | Ada→0, Tidak Ada→1 |
| 2 | Kerugian Saham Minoritas | Rendah→0, Sedang→0.5, Tinggi→1 |
| 3 | Pemegang Saham Pengendali | Rendah→0, Moderat→0.5, Dominan→1 |
| 4 | Penunjukkan Manajemen | Tidak Ada→0, Sebagian→0.5, Seluruhnya→1 |
| 5 | Pengendalian Operasional Perusahaan | Tidak→0, Sebagian→0.5, Ya→1 |

Pola: DLOC faktor 1 HANYA punya 2 opsi (binary: Ada/Tidak Ada → 0/1), sisanya 3 opsi.

---

## Part 3 — DLOM Interactive Form Page

### Component: `<QuestionnaireForm>` (shared, reusable)

File: `src/components/forms/QuestionnaireForm.tsx` — `'use client'`

Props interface:
```ts
interface QuestionnaireFormProps {
  /** Page title displayed above the form */
  title: string
  /** Factor definitions */
  factors: readonly QuestionnaireFactor[]
  /** Currently selected answers (factor number → option label) */
  answers: Record<number, string>
  /** Callback when answers change */
  onAnswersChange: (answers: Record<number, string>) => void
  /** "Mayoritas" | "Minoritas" selection */
  kepemilikan: KepemilikanType
  onKepemilikanChange: (k: KepemilikanType) => void
  /** Computed result (live) */
  result: QuestionnaireResult | null
  /** Disclaimer text */
  disclaimer?: string
}
```

UI requirements (sesuai design system proyek — Section 7 handoff):
- IBM Plex Sans untuk labels, IBM Plex Mono untuk skor
- Navy/muted-gold palette, sharp 4px radius
- Setiap faktor ditampilkan sebagai card/row dengan:
  - Nomor + label (bold)
  - Description (collapsible/expandable — text bisa panjang)
  - Radio group atau segmented control untuk opsi (visual: opsi terpilih di-highlight)
  - Skor per faktor ditampilkan di kanan (0 / 0.5 / 1)
- Summary section di bawah:
  - Kepemilikan dropdown (Mayoritas / Minoritas)
  - Jenis Perusahaan (auto-read dari Zustand HOME store, display only — tidak bisa diubah di sini)
  - Total Score / Max Score
  - Range yang berlaku (e.g., "20% - 40%")
  - **Hasil DLOM/DLOC percentage** — ditampilkan besar dan prominent
- Mobile responsive — factors stack vertically, radio groups wrap
- Accessible: proper `<fieldset>` + `<legend>`, keyboard navigable radio groups, aria-labels

### Page: `src/app/valuation/dlom/page.tsx`

**PENTING**: DLOM masuk di section `/valuation/`, BUKAN `/analysis/`. Sesuaikan routing.
Atau jika navigasi saat ini group DLOM di bawah "Penilaian" (yang map ke `/valuation/`), ikuti itu.

> **Catatan**: Periksa `nav-tree.ts` untuk lihat group structure saat ini. Jika "Penilaian" section belum ada routes selain placeholder, buat di sana.

Page ini adalah `'use client'` (butuh state + store interaction), BUKAN server component.

Alur:
1. Baca `jenisPerusahaan` dari Zustand HOME store
2. Local state: `answers` (Record<number, string>), `kepemilikan` (KepemilikanType)
3. Setiap kali `answers` atau `kepemilikan` berubah → compute live score via `computeDlomPercentage`
4. Auto-persist `answers` + `kepemilikan` + `percentage` ke Zustand (extend store)
5. Write `percentage` ke `home.dlomPercent` di store

### Zustand store extension

Extend `useKkaStore` dengan DLOM dan DLOC slices:

```ts
interface DlomState {
  answers: Record<number, string>    // factor number → selected option label
  kepemilikan: KepemilikanType
}

interface DlocState {
  answers: Record<number, string>
  kepemilikan: KepemilikanType
}

interface KkaState {
  home: HomeInputs | null
  dlom: DlomState | null
  dloc: DlocState | null
  setHome: (home: HomeInputs) => void
  setDlom: (dlom: DlomState) => void
  setDloc: (dloc: DlocState) => void
  // ... existing methods
}
```

Partialize: persist `home`, `dlom`, `dloc` ke localStorage.

**Penting**: saat DLOM/DLOC answers berubah, compute percentage dan update `home.dlomPercent` / `home.dlocPercent` juga. Ini bisa dilakukan di page component atau via Zustand middleware — pilih yang paling simpel. Jangan over-engineer.

---

## Part 4 — DLOC Interactive Form Page

### Page: `src/app/valuation/dloc-pfc/page.tsx`

Pattern identik dengan DLOM — reuse `<QuestionnaireForm>`. Perbedaan:
- Factors: 5 (bukan 10)
- Range logic: berbeda formula (cek fixture `DLOC(PFC)!B22`)
- Faktor 1 binary (2 opsi), sisanya 3 opsi
- Output → `home.dlocPercent`
- DLOC juga punya kolom "KONFIRMASI" (cell G7..G15 di fixture) — ini adalah text field per faktor dimana user bisa menulis alasan/justifikasi. **Include sebagai optional text input per faktor** jika design memungkinkan, atau defer ke iterasi berikutnya.

> **Decision**: kolom konfirmasi/justifikasi per faktor. Jika ini menambah kompleksitas signifikan, defer — tapi idealnya include karena ini bagian dari workflow asli Penilai DJP.

---

## Part 5 — Navigation Update

Update `src/components/layout/nav-tree.ts`:
- ROIC → group "Analisis", href `/analysis/roic`
- DLOM → group "Penilaian", href `/valuation/dlom`
- DLOC → group "Penilaian", href `/valuation/dloc-pfc`

Hapus `wip: true` jika ada placeholder entries.

---

## Part 6 — Verification Gauntlet

```bash
npm test 2>&1 | tail -15          # expect 107 + new DLOM/DLOC tests all passing
npm run build 2>&1 | tail -25     # expect 3 new routes (ROIC static, DLOM + DLOC dynamic/client)
npx tsc --noEmit 2>&1 | tail -5   # clean
npm run lint 2>&1 | tail -5       # zero warnings
```

**Crucial TDD checks**:
- DLOM: totalScore=10, tertutup+mayoritas → DLOM=0.40 (matches fixture `DLOM!F34`)
- DLOC: totalScore=3, tertutup+mayoritas → DLOC=0.54 (matches fixture `DLOC(PFC)!E24`)
- ROIC: page renders, build prerendered as static

---

## Execution Order (Recommended)

| Task | Type | Est. Time | Dependencies |
|---|---|---|---|
| T1: ROIC manifest + page + nav | Manifest authoring | 20 min | None |
| T2: Questionnaire types | Types | 10 min | None |
| T3: DLOM calc function + tests (RED→GREEN) | TDD | 20 min | T2 |
| T4: DLOC calc function + tests (RED→GREEN) | TDD | 15 min | T2 |
| T5: Factor definitions data (DLOM + DLOC) | Data | 15 min | T2 |
| T6: Zustand store extension (dlom + dloc slices) | Store | 15 min | T2 |
| T7: `<QuestionnaireForm>` shared component | UI Component | 40 min | T2, T5 |
| T8: DLOM page + wiring | Page | 20 min | T3, T5, T6, T7 |
| T9: DLOC page + wiring | Page | 15 min | T4, T5, T6, T7 |
| T10: Navigation update | Config | 5 min | T1, T8, T9 |
| T11: Full verification gauntlet | Verify | 10 min | All |

**T1 bisa dijalankan independen**, paralel dengan T2-T5.
**T3 dan T4 bisa paralel** setelah T2.
**T8 dan T9 sequential** (T8 dulu sebagai pilot, T9 reuse).

Total estimasi: **~3 jam** (termasuk debugging + iterasi).

---

## Commit Strategy (Conventional Commits)

```
chore: sync roic fixture + extend SheetSlug
feat: add ROIC analysis page
feat: add questionnaire types and factor definitions
feat: add DLOM/DLOC calculation functions with TDD
feat: add shared QuestionnaireForm component
feat: extend Zustand store with DLOM/DLOC slices
feat: add DLOM interactive form page
feat: add DLOC interactive form page
chore: activate ROIC, DLOM, DLOC in navigation
```

Atau consolidated jika atomic commits terlalu granular: group by deliverable (ROIC commit, shared infra commit, DLOM commit, DLOC commit).

---

## Constraints Reminder

- **LESSON-001**: Next.js 16 — `params`/`searchParams` are Promise<>. Baca `node_modules/next/dist/docs/` jika perlu API baru.
- **LESSON-002**: Tailwind v4 CSS-first — gunakan `@theme inline`, bukan `tailwind.config.ts`.
- **LESSON-004**: `useWatch` bukan `form.watch()` — React Compiler rule.
- **LESSON-005**: Zod `.default()` incompatible dengan `zodResolver` — defaults di `useForm({ defaultValues })`.
- **LESSON-016**: Derive state, don't `setState` in `useEffect`. React Compiler enforced.
- **Non-negotiable #1**: Kalkulasi HARUS identik dengan Excel — test terhadap fixture ground truth.
- **Non-negotiable #4**: Formula transparency — scoring formula visible ke user (skor per faktor ditampilkan, bukan blackbox).
- **Design system**: IBM Plex Sans/Mono, navy+gold, sharp 4px radius, tabular-nums, no Inter/Roboto/rounded-2xl.
