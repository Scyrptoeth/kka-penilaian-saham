# Lessons Learned — KKA Penilaian Saham

> Append-only. Jangan hapus lesson lama. Urutkan berdasarkan nomor, bukan tanggal.

## Kategori

- **Framework**: Next.js, React, React Compiler
- **Tailwind**: v4 CSS-first config
- **TypeScript**: Type system, generics, inference
- **Testing**: Vitest, fixture-based TDD
- **Excel**: openpyxl, workbook patterns
- **Design**: UI/UX decisions
- **Workflow**: Git, session structure, context management
- **Anti-pattern**: What NOT to do
- **Security**: Dependencies, credentials, privacy
- **Performance**: Bundle, waterfalls, caching

---

## Session 001 — 2026-04-11

### LESSON-001: Next.js 16 bukan Next.js dari training data

**Kategori**: Framework | Workflow
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Saat scaffolding project Next.js baru di folder kosong dengan `create-next-app@latest`.

**Apa yang terjadi**: Scaffold menghasilkan `AGENTS.md` di root dengan warning eksplisit: "This is NOT the Next.js you know. APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code."

**Root cause / insight**: Next.js 16 punya breaking changes dari versi sebelumnya:
- `params` dan `searchParams` sekarang `Promise<>` (harus di-`await`)
- Global helper `PageProps<'/route'>` dan `LayoutProps<'/route'>` auto-generated
- `middleware.ts` di-rename jadi `proxy.ts`
- `AGENTS.md` + `CLAUDE.md` di project root BUKAN leftover — itu file warning resmi dari scaffold

**Cara menerapkan di masa depan**:
1. Saat project menggunakan Next.js 16+, SELALU baca `node_modules/next/dist/docs/01-app/01-getting-started/*.md` sebelum menulis kode untuk fitur baru (layout, font, metadata, data fetching, middleware/proxy, dll.)
2. Jangan hapus `AGENTS.md` dan `CLAUDE.md` yang scaffolded oleh Next — itu instruksi resmi
3. Default assumption untuk Next < 15 mungkin salah di Next 16 — verifikasi tiap API via docs sebelum eksekusi

**Proven at**: session-001 (2026-04-11)

---

### LESSON-002: Tailwind v4 menggunakan `@theme inline` di CSS, bukan `tailwind.config.ts`

**Kategori**: Tailwind | Framework
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Saat setup custom design tokens (palette, fonts, radii) untuk project dengan Tailwind v4.

**Apa yang terjadi**: Plan awal menyebut `tailwind.config.ts` di file list, tapi `create-next-app@latest --tailwind` menghasilkan:
- `tailwindcss: "^4"` di package.json
- `@tailwindcss/postcss` sebagai PostCSS plugin
- **Tidak ada `tailwind.config.ts`** di project root
- Konfigurasi tema dilakukan via `@theme inline { ... }` block di `src/app/globals.css`

**Root cause / insight**: Tailwind v4 meninggalkan pattern JS config dan beralih ke CSS-first config. CSS vars yang di-declare di `@theme` otomatis terekspos jadi Tailwind utility classes (e.g. `--color-canvas: #fafaf9` → `bg-canvas`, `text-canvas`, `border-canvas`).

**Cara menerapkan di masa depan**:
1. Di Tailwind v4, JANGAN buat `tailwind.config.ts` — pakai `@theme inline` di `globals.css`
2. Pattern: declare `:root { --token: value; }` → reference di `@theme inline { --color-token: var(--token); }` → use sebagai `bg-token`, `text-token`, dll.
3. Untuk font variabel: `--font-sans: var(--font-sans), system-ui, sans-serif;` di `@theme` — setelah Next `next/font` mengisi `--font-sans` via className

**Proven at**: session-001 (2026-04-11). Lihat `src/app/globals.css` dan `src/app/layout.tsx` sebagai referensi.

---

### LESSON-003: SheetJS npm community version punya 2 high-severity vulns — gunakan ExcelJS

**Kategori**: Security | Anti-pattern
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Saat pilih library untuk client-side .xlsx read/write di aplikasi yang handle data sensitif (tax authority tool).

**Apa yang terjadi**: Install `xlsx` (SheetJS community) menyebabkan `npm audit` menampilkan 2 high-severity vulnerabilities:
- **Prototype Pollution** (GHSA-4r6h-8v6p-xvw6)
- **Regular Expression Denial of Service / ReDoS** (GHSA-5pgg-2g8v-p4x9)

Advisory menyatakan: "No fix available" di npm registry. SheetJS Pro version (via CDN) punya fix, tapi bukan MIT dan bukan npm.

**Root cause / insight**: SheetJS Community di npm sudah lama tidak di-update untuk security patches — fix hanya tersedia di paid Pro version. Untuk project non-commercial yang butuh free + secure + npm-registered: alternatif adalah **ExcelJS** (MIT, aktif maintained, 0 known high vulns).

**Cara menerapkan di masa depan**:
1. Project yang handle data sensitif (terutama government / tax authority tool) JANGAN pakai `xlsx` dari npm — pakai `exceljs`
2. Untuk read: kedua library bisa parse .xlsx; ExcelJS sedikit lebih lambat tapi secure
3. Untuk write: ExcelJS punya API yang lebih clean (builder pattern dengan `workbook.addWorksheet('name')`)
4. Kalau benar-benar butuh SheetJS, gunakan Pro version dari cdn.sheetjs.com (bayar), bukan npm
5. SELALU jalankan `npm audit` setelah install dependency baru, terutama yang handle parsing user data

**Proven at**: session-001 (2026-04-11). `npm audit` pasca swap: 0 vulnerabilities.

---

### LESSON-004: React Hook Form `watch()` incompatible dengan React Compiler — pakai `useWatch`

**Kategori**: Framework | TypeScript
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: HomeForm.tsx menggunakan `const watched = watch()` untuk subscribe ke seluruh form state dan hitung derived values live.

**Apa yang terjadi**: ESLint dengan React Compiler enabled (default di Next 16) memunculkan warning:
```
react-hooks/incompatible-library: React Hook Form's `useForm()` API returns a
`watch()` function which cannot be memoized safely.
```
Konsekuensi: component di-skip dari auto-memoization, bisa bikin stale UI downstream.

**Root cause / insight**: `watch()` mengembalikan function reference yang berubah tiap render, yang tidak kompatibel dengan React Compiler's assumption bahwa subscriber functions bisa di-memoize. Alternatif `useWatch({ control, name })` adalah hook-based subscription yang React Compiler-friendly.

**Cara menerapkan di masa depan**:
1. Di project dengan React Compiler aktif (Next 16+ default), JANGAN pakai `form.watch()` untuk subscribe ke form values
2. Pakai `useWatch({ control, name: 'fieldName' })` per field yang dibutuhkan
3. Pattern: extract `control` dari `useForm()`, lalu `useWatch` untuk field yang mau di-observe live
4. Kalau perlu observe multiple fields, multiple `useWatch` calls lebih eksplisit dari `watch()` all

**Proven at**: session-001 (2026-04-11). Fix: `const jumlahBeredar = useWatch({ control, name: 'jumlahSahamBeredar' })` etc.

---

### LESSON-005: Zod 4 `.default()` pada field bikin TypeScript error dengan zodResolver

**Kategori**: TypeScript | Framework
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Schema `homeInputsSchema` dengan `dlomPercent: z.number().min(0).max(1).default(0)` di-passed ke `zodResolver` dalam `useForm<HomeInputsSchema>`.

**Apa yang terjadi**: Build gagal dengan type error:
```
Type 'Resolver<{..., dlomPercent?: number | undefined}>' is not assignable
to type 'Resolver<{..., dlomPercent: number}>'
```
Input type dari schema adalah `{dlomPercent?: number | undefined}` (optional karena ada default), tapi output type adalah `{dlomPercent: number}` (required setelah default applied).

**Root cause / insight**: Zod's `.default()` mengubah input type jadi optional (pre-parse) tapi output type tetap required (post-parse). `zodResolver` dari RHF expect input = output type (single generic parameter), jadi mismatch.

**Cara menerapkan di masa depan**:
1. Untuk form fields: JANGAN pakai `.default()` di Zod schema kalau pakai `zodResolver`
2. Set default value di `useForm({ defaultValues: { ... } })` sebagai gantinya
3. Atau: pakai `z.input<typeof schema>` untuk form type (bukan `z.infer`), tapi ini lebih rumit
4. Alternatif kalau butuh default di schema: `.optional().transform(v => v ?? 0)` — tapi masih sama issue-nya

**Proven at**: session-001 (2026-04-11). Fix: hapus `.default(0)`, set di DEFAULTS const.

---

### LESSON-006: `export *` dari multiple modules gagal kalau ada duplicate type name

**Kategori**: TypeScript | Anti-pattern
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Barrel file `src/lib/calculations/index.ts` dengan:
```ts
export * from './helpers'
export * from './balance-sheet'
export * from './income-statement'
```
Di mana `balance-sheet.ts` dan `income-statement.ts` sama-sama mendeklarasi `interface YearlySeries`.

**Apa yang terjadi**: Type error:
```
Module './balance-sheet' has already exported a member named 'YearlySeries'.
Consider explicitly re-exporting to resolve the ambiguity.
```
Meski kedua declaration secara struktur identik, TypeScript menganggap mereka **distinct types** dan `export *` dari barrel conflict.

**Root cause / insight**: `export *` tidak melakukan structural deduplication. Kalau dua module export symbol dengan nama sama (even with identical shapes), barrel akan conflict.

**Cara menerapkan di masa depan**:
1. **Hoist shared types ke module tunggal** (biasanya `helpers.ts` atau `types.ts`). Module lain import from there, jangan re-declare.
2. Kalau benar-benar perlu duplicate declaration, pakai **named re-export** di barrel:
   ```ts
   export { ratioOfBase, yoyChange } from './helpers'
   export { commonSizeBalanceSheet, growthBalanceSheet } from './balance-sheet'
   export type { YearlySeries } from './helpers'
   ```
3. Rule of thumb: **single source of truth untuk setiap type**, terutama di barrel structure

**Proven at**: session-001 (2026-04-11). Fix: move `YearlySeries` to `helpers.ts`, import di `balance-sheet.ts` dan `income-statement.ts` tanpa re-export.

---

### LESSON-007: Vitest config harus di-exclude dari Next.js tsconfig

**Kategori**: Testing | TypeScript | Framework
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Project pakai Vitest untuk testing + Next.js untuk framework. Dua-duanya bergantung ke Vite internally (Next via rolldown/turbopack, Vitest via standard vite).

**Apa yang terjadi**: `next build` gagal type-check dengan error ratusan baris tentang Plugin<> type incompatibility antara `@vitejs/plugin-react` (imported by vitest.config.ts) dan Vite yang di-bundle oleh Vitest (`node_modules/vitest/node_modules/vite`). Dua Vite instance punya type definitions yang berbeda.

**Root cause / insight**: Next 16 menggunakan rolldown (Rust-based bundler) yang punya type definitions berbeda dari Vite standar (yang dipakai Vitest). Saat Next.js build menjalankan `tsc --noEmit` pada seluruh project, `vitest.config.ts` ikut di-type-check dan gagal karena dua Vite-nya konflik.

**Cara menerapkan di masa depan**:
1. Di `tsconfig.json`, tambah exclude untuk Vitest-related files:
   ```json
   "exclude": [
     "node_modules",
     "vitest.config.ts",
     "vitest.setup.ts",
     "__tests__"
   ]
   ```
2. Vitest punya TypeScript loader sendiri (`tsx`/`esbuild`), jadi exclude dari `tsc --noEmit` TIDAK mempengaruhi test execution
3. Pattern ini berlaku untuk semua kombinasi Next 15+/Next 16 + Vitest 3+
4. Alternatif (lebih invasive): install Vite sebagai direct dependency dan lock version untuk match, tapi ini bikin extra overhead

**Proven at**: session-001 (2026-04-11). Build berhasil pasca exclude.

---

### LESSON-008: Multi-lockfile di home dir butuh `turbopack.root` di next.config.ts

**Kategori**: Framework | Workflow
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: User punya `package-lock.json` di `~/` (home directory), dan project Next.js juga punya lockfile sendiri di project root.

**Apa yang terjadi**: `next build` menampilkan warning:
```
Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles and selected the directory of
/Users/persiapantubel/package-lock.json as the root directory.
```
Next.js memilih home dir sebagai workspace root (salah), karena ada lockfile di sana.

**Root cause / insight**: Turbopack mencari ancestor directory dengan lockfile sebagai "workspace root". Kalau ada lockfile di home dir (biasanya leftover dari `npm init` yang dijalankan di tempat salah), Turbopack akan ambil itu.

**Cara menerapkan di masa depan**:
1. Di `next.config.ts`, set explicit `turbopack.root`:
   ```ts
   import path from 'node:path'
   const nextConfig: NextConfig = {
     turbopack: {
       root: path.resolve(__dirname),
     },
   }
   ```
2. Alternatif: hapus lockfile yang stray di home dir (kalau bukan intentional)
3. `__dirname` bekerja di `next.config.ts` karena Next compile config sebagai CJS — jangan beralih ke `import.meta.url` kecuali di-tuntut

**Proven at**: session-001 (2026-04-11). Warning hilang pasca set `turbopack.root`.

---

### LESSON-009: openpyxl butuh dual-pass untuk extract values + formulas

**Kategori**: Excel | Testing
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Build Python script untuk extract Excel workbook ke JSON fixtures sebagai ground truth untuk TDD.

**Apa yang terjadi**: openpyxl punya dua mode load:
- `load_workbook(path, data_only=True)` — return cell.value sebagai computed value (last cached), tapi `cell.value` untuk cell dengan formula akan NONE atau cached value (formulanya tidak visible)
- `load_workbook(path, data_only=False)` — return cell.value sebagai raw string including formulas (e.g. `"=SUM(A1:A10)"`), tapi computed result tidak tersedia

**Root cause / insight**: openpyxl tidak bisa simultaneously memberi values DAN formulas karena internal implementation memilih satu perspective saja saat load. Untuk test terhadap Excel formula (perlu both), harus load dua kali.

**Cara menerapkan di masa depan**:
1. Load workbook dua kali:
   ```python
   wb_values = load_workbook(path, data_only=True)    # computed values
   wb_formulas = load_workbook(path, data_only=False) # raw formulas
   ```
2. Iterate cells parallel via `zip(ws_v.iter_rows(), ws_f.iter_rows())` dan output keduanya ke JSON
3. Ini pattern standard untuk Excel extraction — bukan bug, tapi desain openpyxl
4. Overhead: 2x memory, 2x parse time. Untuk workbook besar (>10MB) pertimbangkan streaming approach atau split per sheet

**Proven at**: session-001 (2026-04-11). `scripts/extract-fixtures.py` sukses extract 34 sheets dengan values + formulas.

---

### LESSON-010: Excel column labels bisa MISLEADING — test terhadap formula, bukan label

**Kategori**: Excel | Testing | Workflow
**Sesi**: session-001
**Tanggal**: 2026-04-11

**Konteks**: Saat menulis test untuk `yoyGrowthIncomeStatement` pada Income Statement sheet, cek kolom H..K yang labeled "COMMON SIZE".

**Apa yang terjadi**: Kolom H..K Income Statement di-merge cell dengan label "COMMON SIZE". Intuisi: seharusnya formula adalah `rowValue / revenue`. **Realita**: formula untuk row Revenue (row 6) adalah `H6 = (D6-C6)/C6` — yaitu year-over-year GROWTH rate, bukan common size.

Lebih parah: untuk row lain (contoh Gross Profit row 8), formula `H8 = D8/D$6` yang itu common size vs revenue. Jadi H..K mengandung **dua fungsi berbeda tergantung row**: YoY untuk Revenue row, Common Size untuk non-Revenue rows.

**Root cause / insight**: Workbook author memakai kolom yang sama untuk display purposes berbeda tergantung semantic row, meskipun label header-nya sama. Intent: untuk Revenue, "% of itself" trivial (100%), jadi kolom di-reuse untuk growth. Decision ini tidak di-dokumentasi di header.

**Cara menerapkan di masa depan**:
1. **JANGAN percaya label kolom Excel saat menulis test atau implementasi** — baca formula aktual dari cell via openpyxl
2. Test pattern: extract formula dari fixture (`cells.get('H6').formula`), replikasi formula di TypeScript, assert match dengan `toBeCloseTo(expected, 12)`
3. Kalau kolom punya semantic berbeda per row, dokumentasikan di JSDoc calculation function:
   ```ts
   /**
    * For Revenue row 6, columns H..K compute YoY growth:
    *   H6 = (D6-C6)/C6
    * For non-Revenue rows, columns H..K compute margin ratio:
    *   H8 = D8/D$6
    */
   ```
4. Alternative approach: **extract formulas via script** lalu analyze pattern — kalau 80% row punya formula pattern A tapi beberapa row punya pattern B, itu tanda semantic shift
5. Ground truth = computed value + formula, bukan label. Label bisa misleading, computed value tidak lie.

**Proven at**: session-001 (2026-04-11). Test `yoyGrowthIncomeStatement` matches `H6..K6` AND `M6..P6` (keduanya pakai formula identik untuk Revenue).

---

## Session 002 — 2026-04-11 (Phase 2A Calc Engines)

### LESSON-011: Excel "pre-signed" sign convention harus di-isolate di adapter layer

**Kategori**: Excel | Anti-pattern | Workflow
**Sesi**: session-002 (observed), session-003 (fixed)
**Tanggal**: 2026-04-11

**Konteks**: Saat implementasi `fcf.ts` dan `cash-flow.ts`. FCF sheet row 8 ("Add: Depreciation") punya formula `='FIXED ASSET'!C51*-1` — artinya nilai depresiasi dari FA (positif) di-negate menjadi negatif di FCF, lalu di-SUM dengan NOPLAT untuk menghasilkan Gross Cash Flow. Similarly row 16 capex: `='FIXED ASSET'!C23*-1`.

**Apa yang terjadi**: Implementasi pertama di `computeFcf()` harus menerima `depreciationAddback` sebagai *already-negative* value. Jika caller lupa negate sebelum call, hasil diam-diam salah. JSDoc menyebut "pre-signed convention" tapi tidak ada compile-time atau test-time guard. Future developer (human atau AI) yang membaca code tanpa konteks akan salah menebak "ini butuh positif atau negatif?".

**Root cause / insight**: Sign convention yang implicit di function signature adalah technical debt terselubung. Sama seperti "magic string" atau "magic number", "magic sign" membuat pure function terlihat simple tapi membawa asumsi tak tertulis. Calc function harus tetap pure DAN transparent — sign handling adalah concern yang HARUS hidup di satu tempat per modul.

**Cara menerapkan di masa depan**:
1. Setiap kali modul calc mirror sebuah Excel sheet yang pakai `*-1` dalam formulanya, **buat adapter function** di `src/lib/adapters/` bernama `to<Module>Input(raw)` yang:
   - Menerima data positif/natural (sesuai struktur store UI)
   - Apply sign transformations di sini
   - Return shape yang sesuai `<Module>Input` interface
2. JSDoc adapter WAJIB cite formula Excel yang memotivasi flip (cth: "FCF row 8 = FIXED ASSET!C51*-1")
3. Calc function tetap pure, terima signed input, tidak punya knowledge tentang Excel conventions
4. Pattern flow: `raw store data → adapter (sign flip) → validator → pure calc → output`
5. Kalau sign flip terjadi >1 tempat, refactor ke adapter SEGERA. Technical debt yang menular lebih mahal dari refactor pencegahan.

**Proven at**: session-003 (2026-04-11). `src/lib/adapters/fcf-adapter.ts` + `cash-flow-adapter.ts` + `noplat-adapter.ts` centralize semua `*-1` dengan JSDoc citing source formula. Integration test `calc-pipeline.test.ts` asserts adapter-fed pipeline matches raw fixture values at 12-decimal precision.

---

### LESSON-012: `YearKeyedSeries = Record<number, number>` > positional `number[]` untuk data finansial multi-sheet

**Kategori**: TypeScript | Design | Anti-pattern
**Sesi**: session-002 (observed), session-003 (fixed)
**Tanggal**: 2026-04-11

**Konteks**: Saat implementasi 6 Phase 2A calc modules, setiap input/output adalah `readonly number[]` dimana index 0 = tahun pertama, index 1 = tahun kedua, dst. Berbeda sheet bisa punya jumlah tahun berbeda (BS/IS 4 tahun, FA/NOPLAT 3 tahun).

**Apa yang terjadi**: Setelah 6 modul selesai, review arsitektur menemukan 3 rough edges. Salah satunya: caller UI harus tahu bahwa `bs[0]` = 2018 tapi `fcf[0]` = 2019 (karena FCF pertama kali terhitung satu tahun setelah BS). Mismapping satu offset diam-diam mengkorupsi semua ratio downstream. TypeScript type system tidak bisa menangkap positional index mismatches.

**Root cause / insight**: Array positional index adalah ENCODING dari "tahun". Encoding implicit yang harus di-decode di setiap callsite. Lebih buruk: encoding-nya BERBEDA per sheet (BS/IS col D=2019, CFS/FCF col C=2019). `number[]` memaksa setiap caller menjadi "translator" antar konvensi, dan translator yang salah = bug yang tidak menggugurkan test tapi menghasilkan angka salah di production.

**Cara menerapkan di masa depan**:
1. Data finansial yang hidup di >1 sheet atau yang year-span-nya bisa bervariasi WAJIB pakai `YearKeyedSeries = Record<number, number>` dari `src/types/financial.ts`
2. Iterate via `yearsOf(series)` (ascending sorted) alih-alih `for (let i = 0; i < N; i++)`
3. Cross-field consistency check via `assertSameYears(label, anchor, other)` — anchor = primary input, others must match exactly
4. Hanya pakai `number[]` untuk data yang jelas-jelas single-axis dan non-financial (misal `[weights]` untuk regression coefficients, `[pixels]` untuk chart)
5. Untuk interop dengan library yang butuh dense array, gunakan `seriesToArray(series)` — tapi keep internal representation year-keyed
6. Zustand store untuk historical data juga pakai year-keyed, bukan positional array. UI code bicara dalam year (`data[2020]`) bukan index (`data[1]`)
7. **Anti-pattern**: Jangan pakai `YearlySeries {y0, y1, y2, y3}` untuk modul baru. Interface itu hanya cocok untuk sheet yang PASTI 4 tahun (BS/IS Phase 1). Modul analysis layer gunakan `YearKeyedSeries`.

**Proven at**: session-003 (2026-04-11). 6 modules refactored, 7 year-set guard tests added, zero positional-index bugs possible. Integration test proves BS/IS (col D/E/F) and CFS/FCF (col C/D/E) merge correctly via year-key, no offset mistakes possible at compile time.

---

### LESSON-013: Cross-sheet column offset adalah silent landmine — selalu pakai per-sheet column map di test helper

**Kategori**: Excel | Testing
**Sesi**: session-002
**Tanggal**: 2026-04-11

**Konteks**: Menulis test untuk `ratios.ts` yang konsumsi data dari 4 sheet berbeda: Balance Sheet, Income Statement, Cash Flow Statement, FCF. Satu test melakukan `num(balanceSheetCells, 'D8')` dan `num(cashFlowStatementCells, 'D8')` — mengharapkan keduanya mewakili year yang sama.

**Apa yang terjadi**: Ternyata BS dan IS pakai cols D/E/F untuk tahun 2019/2020/2021 (4 tahun total dengan C = 2018 sebagai baseline). Tapi Cash Flow Statement dan FCF pakai cols C/D/E untuk tahun 2019/2020/2021 (hanya 3 tahun karena CFS pertama kali dihitung di 2019). Satu pergeseran kolom = satu tahun pergeseran = 100% salah tapi angka masih plausible di mata manusia.

**Root cause / insight**: Workbook author reset kolom per sheet untuk meng-compress layout. Sheet dengan 4 tahun history mulai di C; sheet yang derive dari sheet lain dan hanya punya 3 tahun mulai di C juga (bukan D). Hasilnya: col C di satu sheet ≠ col C di sheet lain. Tidak ada warning header. Eye test tidak akan menangkap ini karena angka-angka masih "masuk akal".

**Cara menerapkan di masa depan**:
1. Saat menulis test yang cross-reference multi-sheet, definisikan **per-sheet column map** sebagai konstanta di top of test file:
   ```ts
   const BS_IS_COL: Record<number, string> = { 2019: 'D', 2020: 'E', 2021: 'F' }
   const CFS_FCF_COL: Record<number, string> = { 2019: 'C', 2020: 'D', 2021: 'E' }
   ```
2. Jangan pernah hardcode `'C'`, `'D'`, dll. di assertion — selalu lookup via `COLMAP[year]`
3. Pakai `YearKeyedSeries` di kalkulasi (LESSON-012) sehingga setelah data masuk ke calc function, offset bukan lagi masalah
4. Saat extract data baru dari fixture, check dulu row 4 atau 5 untuk year headers — jangan asumsi col C = tahun pertama
5. Kalau ada kecurigaan offset, run `python3 extract-fixtures.py` output dan grep year headers (`B5`, `C5`, `D5`, dst) per sheet
6. Dokumentasikan offset di JSDoc module, cth: `// CFS uses C/D/E for the same 3 years that BS uses D/E/F`

**Proven at**: session-002 (2026-04-11). Ratio test awal salah karena offset tidak disadari; refactor ke column map pattern + documented offset. Session-003 refactor ke YearKeyedSeries menghilangkan offset sebagai concern di layer kalkulasi — yang tersisa hanya di test fixture loader.

---

### LESSON-014: Zod validation di boundary antara store/UI dan pure calc — JANGAN di dalam pure function

**Kategori**: TypeScript | Workflow
**Sesi**: session-003
**Tanggal**: 2026-04-11

**Konteks**: Saat menambah Zod validation layer di Session 2A.5, muncul pilihan: (a) panggil schema `.parse()` di awal setiap calc function, atau (b) buat wrapper terpisah `validated*` di layer atas yang validate lalu panggil pure function.

**Apa yang terjadi**: Jika validation di dalam pure function, function tidak lagi pure — ada runtime dependency on Zod, bundle size meningkat, error handling mencampur 2 concerns (validation + calculation), dan callers yang sudah yakin input bersih (test fixtures, internal composition) terpaksa ikut bayar cost Zod.

**Root cause / insight**: Separation of concerns: pure calc function = math. Validation = boundary contract. Keduanya hidup di layer berbeda dengan audience berbeda:
- **Pure calc**: dipanggil oleh adapter layer (trusted), integration test (trusted), dan `validated*` wrapper (trusted after validation). Tidak perlu re-validate.
- **Boundary wrapper**: dipanggil oleh UI/store (untrusted). Harus validate setiap input termasuk cross-field constraints.

Layering ini sesuai dengan Hexagonal Architecture / Ports-and-Adapters principle: core domain (calc) bebas dari infrastructure concerns (validation, I/O, serialization).

**Cara menerapkan di masa depan**:
1. Struktur folder:
   ```
   src/lib/calculations/   # pure, no Zod dependency
   src/lib/validation/     # Zod schemas + validated* wrappers
   src/lib/adapters/       # sign-convention + reshape
   ```
2. Pure calc function tetap punya runtime guards SEPERLUNYA (`assertSameYears`, length checks) — itu defensive programming di dalam trusted zone, bukan boundary validation
3. Zod `safeParse` di wrapper function, throw `ValidationError` (custom class) dengan path-aware message
4. UI / Server Action / Route Handler memanggil `validated*`, bukan calc function langsung. Internal composition (cth adapter feeding calc) boleh panggil calc directly karena input sudah ter-shape
5. Test split: unit test pure calc dengan data bersih, separate test Zod layer dengan edge cases (NaN, Infinity, mismatch, empty)
6. **Anti-pattern**: Jangan pakai `z.parse()` di test fixtures — test pakai typed constructors langsung

**Proven at**: session-003 (2026-04-11). `src/lib/validation/` punya 6 wrapper functions. Pure calc tidak import dari `zod`. Integration test `calc-pipeline.test.ts` menunjukkan flow UI-bound: `raw → toFcfInput → validatedFcf → result`. 15 validation tests assert NaN/Infinity/empty/mismatch rejection tanpa sentuh pure calc.

---

### LESSON-015: Architectural harden-before-UI prevents debug graveyards di UI layer

**Kategori**: Workflow | Anti-pattern
**Sesi**: session-003
**Tanggal**: 2026-04-11

**Konteks**: Setelah Session 002 (Phase 2A) selesai dengan 47 tests hijau dan deploy sukses, user bertanya: "Apakah semua pengembangan adalah system development, bukan patching atau manual?". Jawaban jujur mengidentifikasi 3 rough edges: column offset burden, no boundary validation, implicit sign convention. Ada pilihan: lanjut ke Session 2B (UI) dan fix saat muncul, atau insert Session 2A.5 untuk hardening dulu.

**Apa yang terjadi**: Pilih opsi hardening — Session 2A.5 = 10 tasks, 43 tests baru, 3 layer baru (types, validation, adapters). Hasilnya Session 2B bisa dibangun di atas pipeline yang sudah integration-tested: `raw → adapter → validator → calc`. Tanpa hardening, UI code akan jadi tempat di mana 3 bugs architectural berakumulasi — debugging UI visual regression + calc bug + validation bug secara bersamaan sangat mahal.

**Root cause / insight**: Rough edges di layer bawah secara eksponensial lebih mahal saat merambat ke layer atas. Satu sign convention bug di FCF layer, ketika UI mulai render 8 halaman yang consume FCF, akan muncul sebagai 8 visual bug yang "looks weird" tanpa jelas root cause-nya. Technical debt di core = debugging nightmare di UI.

Prinsip: **harden core before adding consumers**. Mirip dengan "test boundary before middle", "stabilize API before client code", "seed data before UI queries".

**Cara menerapkan di masa depan**:
1. Setelah menyelesaikan layer foundation (kalkulasi, API, data model), jalankan **architectural review** SEBELUM membangun consumer layer:
   - "Apakah consumer bisa salah pakai ini dengan cara yang tidak terdeteksi compile-time?"
   - "Ada berapa implicit convention yang harus consumer tahu?"
   - "Apakah boundary saya bersih?"
2. Kalau ada >1 rough edge, schedule mini-session hardening (disebut "Session NA.5" atau "phase NA.5") sebelum consumer session
3. Hardening session harus produce: (a) tighter types yang mencegah salah pakai, (b) validation layer yang reject input tidak valid, (c) adapter/translator untuk menyembunyikan implicit conventions
4. Budget hardening sebagai ROI vs probabilitas bug di consumer session: `cost = hardening_time; benefit = (bug_count * bug_debug_time)`. Biasanya ratio 1:5 atau lebih baik
5. User yang bertanya "apakah ini system development?" adalah signal yang valuable — jawab jujur, tunjukkan rough edges yang kamu sendiri temukan, dan propose hardening session
6. **Anti-pattern**: Merasionalisasi rough edges dengan "kita akan handle di UI layer" — UI layer punya concerns sendiri (state, rendering, accessibility, responsive), tidak boleh jadi tempat fix arsitektur

**Proven at**: session-003 (2026-04-11). 10 task hardening menambah 43 tests, 0 UI code, tapi integration test membuktikan pipeline bekerja end-to-end. Session 2B (belum dilakukan) dapat mengkonsumsi validator+adapter tanpa re-derivasi convention.

---

## Threshold untuk Promote ke `/start-kka-penilaian-saham`

Lesson berikut sudah di-promote ke section 8 "Tech Stack Gotchas" di
`~/.claude/skills/start-kka-penilaian-saham/SKILL.md` karena relevan
untuk 3+ sesi ke depan:

### Session 001 (foundation)
- LESSON-001 (Next 16 breaking changes)
- LESSON-002 (Tailwind v4 `@theme`)
- LESSON-003 (ExcelJS vs SheetJS)
- LESSON-004 (useWatch vs watch)
- LESSON-005 (Zod .default() dengan zodResolver)
- LESSON-006 (export * + duplicate types)
- LESSON-007 (Vitest config exclude dari Next tsconfig)
- LESSON-008 (turbopack.root multi-lockfile)
- LESSON-009 (openpyxl dual-pass)
- LESSON-010 (Excel label misleading)

### Session 002 & 003 (Phase 2A + hardening)
- LESSON-011 (Pre-signed convention → adapter layer)
- LESSON-012 (YearKeyedSeries > number[])
- LESSON-013 (Cross-sheet column offset landmine)

LESSON-014 (Zod boundary placement) dan LESSON-015 (harden-before-UI)
**TIDAK** di-promote — keduanya adalah workflow/architecture insights
yang akan relevan di project lain tapi terlalu general untuk section 8
(yang fokus ke KKA-specific gotchas). Simpan di lessons-learned saja.
