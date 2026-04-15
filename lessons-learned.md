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

### Session 004 (Phase 2B P1)
- LESSON-016 (React Compiler setState-in-effect → derived state)
- LESSON-018 (Fixture-as-seed via copy-fixtures.cjs)

### Session 005 & 006 (Systematization 2B.6 + 2B.6.1)
- LESSON-019 (Manifest owns sheet-specific knobs — no hardcoded constants in page files)
- LESSON-021 (Declarative DerivationSpec > callback functions)

### Session 007 (Phase 2B.5 remaining pages)
- LESSON-023 (CF sheets skip yoyGrowth — line items cross zero)
- LESSON-024 (manifest.columns map is fully year-agnostic — any column, any year count)
- LESSON-025 (tactical DRY helpers live inside the manifest file — never in build.ts)

### Sessions 008 + 008.5 + 008.6 + 009 (DLOM/DLOC + hardening + Phase 3 design)
- LESSON-026 (Cross-sheet formula divergence — DLOC formula differs from DLOM despite similar shape)
- LESSON-028 (Always implement Zustand persist `migrate` saat bump version)
- LESSON-029 (App harus company-agnostic dari hari satu — workbook prototype hanya 1 case study)
- LESSON-030 (Backward-compatible additions > breaking refactor — synthesize CellMap pattern)
- LESSON-031 (Auto-detect mode dari domain state > explicit toggles)
- LESSON-032 (Lazy compute via `useMemo` per page > global reactive graph)

### Session 010 (Phase 3 execution — DataSource + BS pilot)
- LESSON-033 (Declarative `computedFrom[]` beats structural indent-based derivation for irregular accounting hierarchies)
- LESSON-034 (Gate local-state seed via hydration-aware child mount — elegant `useState(initial)` without setState-in-effect)

### Session 011 (Phase 3 IS + downstream wave)
- LESSON-035 (Trust fixture formulas over your own past manifest labels — re-verify before live migration)

### Sessions 013 + 014 (WACC/DR/GR + KEY DRIVERS/PROY FA/PROY LR)
- LESSON-036 (WACC vs DISCOUNT RATE intentionally different — don't assume parameter symmetry)
- LESSON-037 (ROUNDUP vs ROUND — match exact Excel rounding function in JS implementation)
- LESSON-038 (PROY pages → custom page, not manifest+SheetPage — mixed structure doesn't fit)

### Session 015 (PROY chain complete + system hardening)
- LESSON-039 (PROY NOPLAT hist vs proj different source sheets + tax rates)
- LESSON-041 (Page-level wiring is where case-specific values hide — audit checklist)
- LESSON-042 (Centralize projection year count — scattered magic number)

### Session 016 (DCF + AAM + EEM + Borrowing Cap — first share value)
- LESSON-043 (buildDiscountRateInput — centralize store→input mapping to prevent debtRate-class bugs)
- LESSON-044 (Prompt fixture values vs real fixture — always verify E/F columns independently)
- LESSON-045 (Gordon Growth Model allows g > r when FCF is negative — don't over-guard)

### Session 017 (CFI + SIMULASI POTENSI + Dashboard + System Hardening)
- LESSON-046 (Centralize store→input builders in upstream-helpers — one builder per calc consumer)
- LESSON-047 (Audit for hardcoded values after every multi-page session)

### Session 018 (Export + HOME Revisi + Dynamic BS + Catalog Expansion)
- LESSON-049 (ExcelJS round-trip preserves formulas — safe for template-based export)
- LESSON-050 (Always verify Excel cell positions with ExcelJS before writing cell mappings)
- LESSON-051 (Extended catalog accounts need "RINCIAN" detail sheet in export)

### Session 019 (Dynamic FA + IS Catalogs)
- LESSON-052 (Sentinel pre-computation for downstream backward compat)
- LESSON-053 (Generalize ManifestRow.section to string for multi-sheet catalogs)

### Session 020 (Audit Gate + IS Sign Fix + Analysis Live Mode)
- LESSON-055 (Excel uses plain addition for IS — expenses negative, formulas SUM)
- LESSON-056 (Sentinel pre-computation needed for ALL dynamic catalog sheets)
- LESSON-057 (Downstream merge order: recomputed first, then storeRows — sentinels win)

### Session 021 (UX Fixes + Auto-Save + AAM Per-Row Adjustments)
- LESSON-058 (BS sentinel must include FA cross-ref values at persist time)
- LESSON-059 (Distinguish computed sentinels from fixed leaf rows)
- LESSON-060 (sr-only inputs need positioned parent to prevent scroll jump)
- LESSON-061 (Replace scalar adjustments with per-row Record for extensibility)

### Session 022 (AAM finalValue Removal + Simulasi Sign Fix)
- LESSON-062 (Shared-parameter calc modules MUST share sign convention — contract mismatch = silent bug)
- LESSON-063 (Grep all consumers before removing a field from a pure-calc result)

### Session 023 (B&W Redesign — Creddo-Inspired)
- LESSON-064 (`useSyncExternalStore` SSR-safe mounted gate replaces React Compiler-incompatible `useState+useEffect`)
- LESSON-065 (Tailwind v4 CSS-var single-file design overhaul — `globals.css` is the only switching point)

### Session 024 (Export Visibility Audit + Cleanup)
- LESSON-066 (Audit-first methodology for opaque export formats — generate static analyzer before coding fixes)

### Session 025 (Extended BS Catalog Native Injection)
- LESSON-067 (Synthetic-row write + subtotal append > row insertion + auto-shift for Excel modifications with cross-sheet refs)
- LESSON-068 (Catalog design with pre-allocated synthetic excelRow ranges per section enables append-only export modifications)
- LESSON-069 (When superseded, DELETE the old code path entirely — don't leave dead exports/tests "for compat")

LESSON-014, 015, 017, 020, 022, 027, 040, 048, 054 **TIDAK** di-promote — workflow/session-specific
insights yang general ke project lain tapi terlalu luas atau terlalu
session-specific untuk section 8 (yang fokus KKA-specific gotchas).
Tersimpan di lessons-learned saja.

---

## Session 004 — Phase 2B P1 (UI Financial Tables + Navigation)

### LESSON-016: React Compiler `react-hooks/set-state-in-effect` — derive state, don't call setState in effect on path change

**Kategori**: Framework | React | Anti-pattern
**Sesi**: session-004
**Tanggal**: 2026-04-11

**Konteks**: Mobile drawer component yang harus auto-close saat route change di Next.js App Router.

**Apa yang terjadi**: Initial implementation pakai pattern klasik `useEffect(() => setOpen(false), [pathname])` untuk close drawer saat `usePathname` berubah. ESLint `react-hooks/set-state-in-effect` (React Compiler rule) menolak dengan "Avoid calling setState() directly within an effect — causes cascading renders".

**Root cause / insight**: React Compiler tidak suka setState-in-effect karena memicu second render immediately. Idiomatic React solution adalah **derive state dari props** bukan sync via effect.

**Solusi yang bekerja** (di `MobileShell.tsx`):
```ts
// ❌ Rejected by React Compiler
const [open, setOpen] = useState(false)
useEffect(() => setOpen(false), [pathname])

// ✅ Derived state — no effect needed
const [openedAt, setOpenedAt] = useState<string | null>(null)
const open = openedAt !== null && openedAt === pathname

const openDrawer = () => setOpenedAt(pathname)  // open at current path
const close = () => setOpenedAt(null)
// Route change → pathname !== openedAt → open becomes false automatically
```

**Cara menerapkan di masa depan**:
- Setiap kali ada "close X when Y changes" pattern → derive from Y equality, jangan effect + setState
- React Compiler rules adalah hint untuk pattern yang lebih reliable, bukan noise — ikuti
- Body scroll lock + Escape key effects tetap boleh (mereka tidak setState yang tergantung props — mereka set document.body style / addEventListener)

**Proven at**: session-004 (2026-04-11, MobileShell drawer auto-close)

---

### LESSON-017: Manifest-driven rendering — separate row layout data from render code

**Kategori**: Design | Workflow | TypeScript
**Sesi**: session-004
**Tanggal**: 2026-04-11

**Konteks**: Rendering 4+ Excel sheets ke halaman website — setiap sheet punya puluhan rows dengan label, indent level, row type (subtotal/total/header), dan formula metadata.

**Apa yang terjadi**: Pilihan awal antara (a) tulis JSX hand-crafted per sheet (terlalu banyak duplikasi) vs (b) buat component per sheet (scale buruk untuk 12+ sheet future). Solusi ketiga: author data sebagai `SheetManifest[]` typed constant, punya generic `buildRowsFromManifest(manifest, cells)` yang convert ke `FinancialRow[]` untuk `<FinancialTable>` tunggal.

**Root cause / insight**: UI yang data-dense dan repetitive paling baik dibangun dengan **schema + interpreter** pattern: author data, compiler/interpreter do the work. Lebih mudah di-review (diff kecil), lebih mudah ditest (synthetic data), dan lebih mudah diextensi (tambah sheet = tambah file data saja).

**Cara menerapkan di masa depan**:
- Setiap fitur yang render N+ variasi data yang "sama bentuk" → buat typed schema dulu, generic renderer kedua, spesifik data terakhir
- Schema harus punya optional fields untuk variasi yang hanya dipakai sebagian (misal `derivations?`, `commonSizeColumns?`)
- Test builder function dengan synthetic data, bukan real fixture — lebih cepat dan lebih deterministik
- File data per variasi boleh banyak dan panjang; itu normal untuk data-heavy app

**Proven at**: session-004 (2026-04-11, `src/data/manifests/` + `buildRowsFromManifest`)

---

### LESSON-018: Fixture-as-seed pattern — copy external test data into src tree for static bundling

**Kategori**: Framework | Workflow
**Sesi**: session-004
**Tanggal**: 2026-04-11

**Konteks**: Halaman production butuh data demo yang sama dengan test fixtures. Test fixtures ada di `__tests__/fixtures/*.json` (di luar `src/`). Next.js tidak bisa import JSON dari luar `src/` — akan dapat error "Module not found".

**Apa yang terjadi**: Ingin `loadCells('balance-sheet')` di Server Component yang run saat build time. Import langsung dari `../../../__tests__/fixtures/balance-sheet.json` ditolak Next.

**Solusi yang bekerja**: Script `scripts/copy-fixtures.cjs` yang copy file yang dibutuhkan dari `__tests__/fixtures/` ke `src/data/seed/fixtures/`. Tambah `npm run seed:sync` script, commit copies. Loader di `src/data/seed/loader.ts` import dari path local via static `import x from './fixtures/x.json'`, Next bundle mereka at compile time — zero runtime I/O.

**Cara menerapkan di masa depan**:
- Tambah sheet baru = 3 langkah: (1) add slug ke `SHEETS` di `copy-fixtures.cjs`, (2) run `npm run seed:sync`, (3) add `import` + `SheetSlug` union + `FIXTURES` record entry di `loader.ts`
- Jangan pakai runtime fetch/fs.readFile — killing SSG
- Fixtures committed boleh ~1-2MB total; kalau lebih, pertimbangkan lazy import per sheet
- Duplikasi fixtures (`__tests__/` dan `src/data/seed/`) OK — script sync menjaga konsistensi, dan ground truth adalah `__tests__/`

**Proven at**: session-004 (2026-04-11, seed loader + 6 sheets bundled)

---

## Session 005 — Phase 2B.6 (Systematization Pass)

### LESSON-019: Data in manifest beats code in pages — every sheet-specific knob should live in the manifest

**Kategori**: Workflow | Anti-pattern | Design
**Sesi**: session-005
**Tanggal**: 2026-04-11

**Konteks**: Session 004 shipped functional but had `const REVENUE_ROW = 6` hardcoded di `income-statement/page.tsx`. Audit found several similar magic numbers and sheet-specific imports spread across page files.

**Apa yang terjadi**: Ketika BS page butuh Total Assets row (27) dan IS page butuh Revenue row (6), awal implementasi punya hardcoded constants di page files. Saat refactor ke `<SheetPage>` helper, constants-ini tidak bisa di-template — harus dipass-kan entah dari mana.

**Solusi yang bekerja**: Setiap sheet-specific knob pindah ke `SheetManifest`:
- `anchorRow` — denominator row untuk margin/common-size
- `totalAssetsRow` — Balance Sheet's denominator row (already existed)
- `derive` → `derivations` (later Session 006) — sheet-specific derivation logic

Setelah ini, `SheetPage` component jadi fully generic — tidak perlu tahu sheet identitas-nya, semua di-drive dari `props.manifest`.

**Cara menerapkan di masa depan**:
- Kalau page file butuh hardcoded constant per sheet → **itu tanda constant harus pindah ke manifest**
- Kalau page file butuh import function sheet-specific → **itu tanda function harus di-abstract** (callback → declarative spec adalah next step kalau ada multiple kasus)
- Target mental model: page file cuma `<SheetPage manifest={X_MANIFEST} />`, zero sheet-specific logic di luar manifest
- Pertanyaan test: "Apakah file page ini bisa di-copy-paste untuk sheet baru dengan hanya ganti import manifest-nya?" — kalau tidak, ada kebocoran

**Proven at**: session-005 (2026-04-11, `anchorRow` + `SheetPage` helper)

---

### LESSON-020: Audit & systematize before replicating — kill patch patterns before they become 4x technical debt

**Kategori**: Workflow | Anti-pattern
**Sesi**: session-005
**Tanggal**: 2026-04-11

**Konteks**: Session 004 shipped 4 pages. Plan awal Session 005 adalah tambah 4 halaman lagi (Session 2B.5). Sebelum mulai, dilakukan architecture audit.

**Apa yang terjadi**: Audit menemukan 4 patch items: hardcoded constants, manual derive call per page, silent calc-engine bypass tanpa dokumentasi, dan boilerplate duplikasi. Kalau langsung lanjut 2B.5 tanpa fix, 4 halaman baru akan **menduplikasi 4x semua patch pattern**, menambah ~16x technical debt.

**Root cause / insight**: Ada 1 instance dari pattern = "ad-hoc code". Ada 2 instance = "candidate pattern, observe more". Ada 3+ instance = "pattern, extract". Tapi jangan tunggu sampai 3+ kalau kamu **sudah bisa melihat** pattern akan dijamak — kasus ini 2 halaman (BS + IS) dengan derive sheet-specific, tapi jelas akan ada 3-4 lagi di 2B.5. Itu sudah cukup untuk systematize upfront.

**Cara menerapkan di masa depan**:
- Sebelum replikasi implementasi (ship N more of the same thing), lakukan **patch audit 15 menit**: look for magic numbers, duplicate imports, boilerplate, silent shortcuts
- Kalau audit find > 2 patch items → schedule refactor-only session dulu, baru replikasi
- Refactor-only session harus **output bit-identical** dari before ↔ after — kalau ada behavior change, itu bukan refactor, itu feature change yang harus dipisah
- Pisah commit per patch untuk revertability
- `progress.md` + `plan.md` + audit commentary di chat adalah paper trail yang cukup — tidak perlu full design doc

**Proven at**: session-005 (2026-04-11, 4-patch pass before Session 2B.5)

---

## Session 006 — Phase 2B.6.1 (Declarative Derive Primitives)

### LESSON-021: Declarative specs beat callback functions for scaling — data composes, code accumulates

**Kategori**: Design | Workflow | TypeScript
**Sesi**: session-006
**Tanggal**: 2026-04-11

**Konteks**: Session 005 normalized the `derive` mechanism — manifest can declare `derive: (cells, manifest) => DerivedColumnMap`. BS + IS had 2 functions in `historical-derive.ts`. Session 2B.5 would add 3 more (cash-flow, noplat, growth-revenue), all near-identical copy-paste with minor variation.

**Apa yang terjadi**: Even after the callback migration (Session 005), adding a new sheet with derived columns still meant **writing a new TypeScript function**. That function mostly duplicated existing logic — read a row series, compute common-size or growth, return the result. Pattern was "function-per-sheet", which scales linearly with code size.

**Solusi yang bekerja**: Ganti callback form dengan **discriminated union spec** (`DerivationSpec: commonSize | marginVsAnchor | yoyGrowth`) yang di-interpret oleh satu function `applyDerivations(specs, manifest, cells)`. BS + IS manifests declare their derivation as **data**:
```ts
// BS
derivations: [
  { type: 'commonSize' },              // uses totalAssetsRow
  { type: 'yoyGrowth', safe: true },
]
// IS
derivations: [
  { type: 'marginVsAnchor' },          // uses anchorRow
  { type: 'yoyGrowth', safe: true },
]
```
Every primitive reuses existing helpers (`ratioOfBase`, `yoyChangeSafe`). Zero duplication. Adding sheet #3, #4, #5 with existing primitives = **zero new code**. Adding a sheet that needs a NEW primitive = +1 case in the interpreter, +1 variant in the union (e.g. for projection sheets later).

**Root cause / insight**: Callback functions are a halfway point between "code per sheet" and "data per sheet". The full data-driven form is strictly better when: (a) the variations are enumerable with a small primitive library, (b) all primitives can be implemented using shared helpers, and (c) scale matters. All 3 conditions held here.

**Cara menerapkan di masa depan**:
- Ketika refactor dari "function per X" ke "data per X", ask: "can I express every variation as a composition of N primitives?" — kalau ya (N ≤ 5 typically), refactor worth it
- Discriminated union `type: 'literal'` pattern is idiomatic TS — gives exhaustive switch + autocomplete + type narrowing
- Primitives HARUS reuse existing helpers, jangan re-implement `ratioOfBase` di dalam primitive baru
- Threshold for new primitive: "a sheet actually needs it" (YAGNI) — jangan tambah primitive speculative

**Proven at**: session-006 (2026-04-11, `DerivationSpec` union replaces callback form, `historical-derive.ts` deleted)

---

### LESSON-022: Kill the 2nd instance before it becomes the 6th — refactor signal is frequency × future replication

**Kategori**: Workflow | Anti-pattern
**Sesi**: session-006
**Tanggal**: 2026-04-11

**Konteks**: Session 006 eliminated `historical-derive.ts` entirely. The file only had 2 functions when it was deleted — just BS and IS derivations. Some people might say "2 is not enough instances to refactor" (rule of three).

**Apa yang terjadi**: The rule of three says "wait for 3 instances before extracting". Here we had 2 instances AND knew we were about to add 3 more in the next session. 2 + certain-future-3 = 5 instances, clearly worth the refactor. Waited an extra session (post-Session 2B.5) would have meant refactoring 5 functions at once and dealing with more surface area.

**Root cause / insight**: Rule of three is a good default **against** speculative abstraction for unknown future. But when future replication is **certain and imminent**, the rule flips: better to pay refactor cost once when the system is small than later when it's 2-3x bigger.

**Cara menerapkan di masa depan**:
- When you have N instances of a pattern and know with high confidence that M more will follow in the next session → refactor signal strength = N + 0.8 × M. If ≥ 3, refactor worth considering.
- Refactoring 2 instances when you know of 3+ more coming is cheaper than 5 instances later — smaller diffs, less context needed per file touched, less risk of regression across many sites
- Exception: if the future replication is uncertain (project might pivot), defer to rule of three
- Counter-exception: if refactor changes behavior (not pure refactor), wait longer — more instances give better signal on invariants
- Validation check: "did Session 006 actually save time vs doing the same refactor after Session 2B.5?" — yes, because `historical-derive.ts` was only 132 lines with 2 functions at deletion time; post-2B.5 it would have been ~260 lines with 5 functions

**Proven at**: session-006 (2026-04-11, declarative derive refactor before Session 2B.5)


---

## Session 007 — Phase 2B.5 (Four Remaining P1 Pages)

### LESSON-023: Cash-flow sheets skip `yoyGrowth` — line items cross zero

**Kategori**: Design | Excel | Anti-pattern
**Sesi**: session-007
**Tanggal**: 2026-04-11

**Konteks**: Saat authoring Cash Flow Statement manifest di Session 007 Phase 2B.5. Pertimbangan awal: tambahkan `derivations: [{type: 'yoyGrowth'}]` seperti Balance Sheet dan Income Statement karena "semua historical sheet butuh growth kolom".

**Apa yang terjadi**: Sebelum menulis manifest, inspect fixture data: EBITDA row swings positive year-over-year (normal), tapi Corporate Tax, Working Capital changes, Non-Operating CF, Net Cash Flow semua **routinely cross zero**. YoY growth formula `(current − prior) / prior` menjadi unstable saat prior ≈ 0 (IFERROR → 0 masks the problem tapi rendered "0%" di kolom bikin misleading), dan semantik growth pada flow item yang berubah tanda adalah tidak bermakna ("Cash Flow 2020 grew 800% from 2019" ketika 2019 = Rp 100k dan 2020 = Rp 900k adalah artifact, bukan insight).

**Root cause / insight**: **Flow statements** (sheets yang merekam **changes** atau **delta**) punya sifat fundamentally berbeda dari **stock sheets** (sheets yang merekam **position** atau **level**). Flow items can and routinely do cross zero — the meaningful metric is the absolute magnitude and sign, not the percentage change. YoY growth and common-size derivations were designed for stock sheets (BS) and rate-of-return sheets (IS margin) — applying them to flow sheets produces noise that degrades interpretability.

**Cara menerapkan di masa depan**:
1. Before adding `derivations` to a new manifest, ask: **is this a flow statement or a stock statement?**
2. Flow statements (CF variants, Changes in WC, Movements, Additions/Deletions schedules) → **no derivations**. Raw values only. Subtotals/totals get visual emphasis via `type: 'subtotal'` / `type: 'total'` instead.
3. Stock/position statements (BS, FR ratios, inventory levels) → `commonSize` is meaningful if there's a natural denominator.
4. Rate statements (IS, margin schedules) → `marginVsAnchor` against revenue/base.
5. Growth schedules (like Growth Revenue) → `yoyGrowth` is literally the purpose; use `growthColumns` for tooltip fidelity against pre-computed Excel growth cells.
6. Mixed sheets (e.g. Fixed Asset Schedule = roll-forward position): derivations typically not useful because year-to-year asset cost is often static by design; leave derivations off, rely on `type: 'subtotal'` for visual hierarchy.

**Anti-pattern**: Adding `yoyGrowth` to every sheet "just in case" produces columns full of 0%, NaN-masked-to-zero, or exploding percentages around sign flips. Derivation choice is a semantic decision, not a styling default.

**Proven at**: session-007 (2026-04-11), `src/data/manifests/cash-flow-statement.ts` and `src/data/manifests/fixed-asset.ts` both intentionally omit the `derivations` key. Cash-flow renders clean raw values at 2019-2021; rendering YoY growth would have shown explosive percentages on Working Capital and Non-Op lines.

---

### LESSON-024: `manifest.columns` map is fully year-agnostic — any column letter, any year count

**Kategori**: Framework | Testing
**Sesi**: session-007
**Tanggal**: 2026-04-11

**Konteks**: Growth Revenue sheet adalah sheet pertama di project yang (a) cover 4 tahun (2018-2021) dan (b) values start dari **column B**, bukan C. Sheet-sheet sebelumnya konsisten: BS/IS pakai 4 tahun C/D/E/F, CFS/FA/NOPLAT pakai 3 tahun C/D/E.

**Apa yang terjadi**: Saat author `growth-revenue.ts` manifest dengan `columns: { 2018: 'B', 2019: 'C', 2020: 'D', 2021: 'E' }`, pipeline existing (`buildRowsFromManifest` + `applyDerivations` + `yoyGrowth` primitive + `SheetPage`) handle tanpa modifikasi kode sama sekali. Verified:
- Values render benar (Penjualan 2019 = `52.109.888.424` matches IS!D6)
- YoY growth computed via primitive matches workbook's pre-computed cells H/I/J exactly
- Build produces `/analysis/growth-revenue` sebagai static route

**Root cause / insight**: Design invariant yang dipegang oleh pipeline dari Session 2B.6 onwards: **manifest.columns is the single source of truth for the year ↔ Excel column mapping**, dan semua kode downstream derive year axis dari `manifest.years` (untuk urutan) lalu lookup column letter via `manifest.columns[year]`. Tidak ada kode yang pernah assume "values start at column C" atau "sheets have 3 years" atau "growth skips column[0]". Algoritma `computeGrowthSeries` iterates `for (let i = 1; i < manifest.years.length; i++)` — length-generic. Algoritma `readRowSeries` iterates `for (const year of manifest.years)` and looks up `manifest.columns[year]` — column-letter-agnostic.

**Cara menerapkan di masa depan**:
1. Saat menambah manifest untuk sheet dengan year span atau column offset berbeda dari convention existing, **cukup deklarasikan `columns: Record<number, string>` dengan mapping yang akurat**. Zero code changes in `build.ts`, `types.ts`, `SheetPage.tsx`, or tests.
2. Asumsi yang bisa dipegang: (a) `manifest.years` urutan ascending, (b) length ≥ 2 untuk derivasi growth, (c) setiap year punya entry di `manifest.columns`. Tidak ada asumsi lain.
3. Ini **mem-validasi** desain LESSON-019 ("manifest is source of truth") dan LESSON-021 ("declarative spec > callback") — satu sheet dengan convention tidak biasa cukup di-absorb oleh pipeline tanpa patch.
4. Kalau suatu saat butuh derivation yang assume "column letter literal" (e.g. hardcoded `C` untuk base year), itu tanda desain perlu di-review — jangan hack di manifest, fix di primitive.
5. Test yang menyentuh year-column mapping (seperti `__tests__/lib/calculations/*.test.ts`) juga harus pakai `Record<number, string>` year→column map, bukan hardcode column letters — dan memang sudah begitu di test suite existing (lihat LESSON-013).

**Proven at**: session-007 (2026-04-11), `src/data/manifests/growth-revenue.ts` — first manifest ever to start from column B and cover 4 years. Pipeline handled it with zero modifications.

---

### LESSON-025: Tactical DRY helpers live inside the manifest file — never promote to `build.ts`

**Kategori**: Workflow | Design | Anti-pattern
**Sesi**: session-007
**Tanggal**: 2026-04-11

**Konteks**: Fixed Asset Schedule punya 6 asset categories × 9 sub-blocks (3 × 6 Acquisition + 3 × 6 Depreciation + 1 × 6 Net Value) = 54 near-identical `ManifestRow` rows. Menulis semuanya by hand = 54 object literals dengan pattern yang identik kecuali `excelRow` dan `label`.

**Apa yang terjadi**: Alternatif yang dipilih adalah tiny local helper function `categoryRows(startRow, labels)` di dalam `src/data/manifests/fixed-asset.ts` yang return `ManifestRow[]` dengan indent 1. Helper ini:
- **Tidak di-export** dari manifest file
- **Tidak ditambahkan** ke `build.ts`, `types.ts`, atau primitive library
- **Tidak di-generalize** lebih dari yang butuh Fixed Asset
- **Pure data function** — hanya shape `ManifestRow[]`, tidak read cells, tidak compute, tidak format

Hasilnya: manifest turun dari ~200 baris (hand-written) ke ~153 baris, self-contained, pattern tetap pure data.

**Root cause / insight**: LESSON-019 menyatakan "manifest is source of truth, zero sheet-specific code outside manifests". Tapi ada ambiguitas: apakah helper function di dalam manifest file adalah "code outside manifest"? Jawaban yang benar adalah **tidak** — file `src/data/manifests/fixed-asset.ts` **adalah** manifest Fixed Asset, dan helper scoped ke file itu adalah bagian dari manifest authoring, bukan framework code.

Rule definisinya: **framework code** adalah kode yang multiple manifests consume (via import dari `build.ts`/`types.ts`). **Manifest code** adalah kode yang satu manifest consume privately. Helper `categoryRows` adalah manifest code karena hanya Fixed Asset yang consume it.

**Cara menerapkan di masa depan**:
1. **DO**: Kalau satu manifest punya repeating pattern ≥ 6 instances, define local helper function inside the manifest file. Helper returns `ManifestRow[]`, tidak exported, tidak memoized, tidak generalized.
2. **DO**: Helper boleh pakai template literals untuk generate labels/formula descriptions jika pattern memang literal (e.g. `formula.values: \`=C${26+i} − C${54+i}\``).
3. **DON'T**: Jangan promote helper ke `build.ts` kecuali 2+ manifest benar-benar perlu helper yang sama. Premature abstraction lebih mahal daripada duplication di tingkat file.
4. **DON'T**: Jangan extract helper ke file `manifest-helpers.ts` atau sejenisnya. Satu manifest file = satu unit, self-contained.
5. **DON'T**: Helper jangan punya side-effects, jangan read `CellMap`, jangan compute derivation. Itu tanggung jawab `build.ts` + primitive library.
6. **Test**: Smell test sebelum promote — "Apakah manifest kedua yang akan pakai helper ini sudah konkret?" Kalau tidak, keep local. Rule-of-three berlaku untuk abstraction, bukan rule-of-two.

**Anti-pattern**: Mengekstrak `categoryRows` ke `src/data/manifests/helpers.ts` "for reusability" ketika tidak ada manifest kedua yang akan pakai. Ini bikin file helper tumbuh jadi junk drawer, dan manifest file kehilangan self-containedness.

**Proven at**: session-007 (2026-04-11), `src/data/manifests/fixed-asset.ts` — 6-line local helper collapses 54 rows ke 9 calls, tetap scoped ke file, manifest tetap "data-only" dari perspektif build pipeline.

---

## Session 008 + 008.5 + 008.6 + 009 — DLOM/DLOC + Hardening + Phase 3 Design

### LESSON-026: Cross-sheet formula divergence — sheets yang look similar bisa beda formula

**Kategori**: Excel | Anti-pattern
**Sesi**: session-008
**Tanggal**: 2026-04-12

**Konteks**: DLOM dan DLOC keduanya scoring questionnaires dengan struktur similar (factors × options × scores → percentage range). Asumsi natural: formula range pasti identik (jenisPerusahaan + kepemilikan → range matrix).

**Apa yang terjadi**: Saat implement `computeDlocPercentage`, fixture inspection mengungkapkan bahwa DLOC range hanya depend pada `jenisPerusahaan`, BUKAN `kepemilikan`. Excel formula `DLOC(PFC)!B22 = IF(A20=1, " 30% - 70%", " 20% - 35%")` hanya mereferensikan A20 (jenisPerusahaan code), bukan A21 (kepemilikan code yang juga di-compute tapi unused untuk range determination).

DLOM berbeda: `DLOM!C32 = IF(B30+B31=6,"30%-50%",IF(B30+B31=8,"20%-40%",IF(B30+B31=7,"10%-30%","0%-20%")))` — pakai SUM dari jenisCode + kepemilikanCode untuk lookup 4-matrix combinations.

**Root cause / insight**: Workbook author bisa choose berbeda formula untuk sheet yang structurally similar. Tanpa membaca formula real, kita akan implement DLOC dengan API yang accept kepemilikan parameter — yang kemudian unused — dan tests akan pass dengan happy path tapi semantic-nya wrong (kepemilikan affecting result yang seharusnya tidak).

**Cara menerapkan di masa depan**:
1. Saat implement calc function untuk sheet baru, **SELALU baca formula fixture** (`f` field di cell JSON) dari cell output, bukan hanya value
2. Trace dependency chain: formula references → upstream cells → understand semantic
3. Jangan asumsi sheet B = sheet A pattern, terutama untuk sheets yang structurally similar tapi domain berbeda
4. Function signature reflect real semantic. Kalau parameter unused, **HAPUS** dari signature (jangan accept-and-ignore — itu API lying)
5. Document deviation di JSDoc: "Note: DLOC formula intentionally does not use kepemilikan, unlike DLOM. See B22 IF formula reference."

**Anti-pattern yang dihindari**: API symmetry untuk symmetry's sake. DLOC function tidak perlu accept kepemilikan hanya supaya signature matches DLOM — itu false symmetry yang misleading.

**Proven at**: session-008 (2026-04-12). `src/lib/calculations/dloc.ts` `computeDlocPercentage` signature tidak include kepemilikan, dengan JSDoc comment yang explicit.

---

### LESSON-027: React Compiler `react-hooks/exhaustive-deps` flags local bindings derived from module constants

**Kategori**: Framework | Workflow
**Sesi**: session-008
**Tanggal**: 2026-04-12

**Konteks**: Page component dengan `const maxScore = DLOM_FACTORS.length` (where `DLOM_FACTORS` adalah module-level frozen const), dipakai di `useMemo([scores, totalScore, jenisPerusahaan, current.kepemilikan])` callback.

**Apa yang terjadi**: ESLint `react-hooks/exhaustive-deps` melaporkan: "React Hook useMemo has a missing dependency: 'maxScore'." Padahal value `maxScore` adalah pure derivation dari module const yang tidak akan pernah berubah saat component runtime.

**Root cause / insight**: ESLint rule conservative — ia tidak attempt prove bahwa local binding adalah immutable. Setiap variable yang appears di dependency-tracking hook dan tidak listed di deps array akan di-flag, regardless of provenance.

**Solusi yang work**: Add `maxScore` ke dep array secara explicit:
```ts
const result = useMemo(() => { /* uses maxScore */ }, [scores, totalScore, maxScore, jenisPerusahaan, current.kepemilikan])
```

`maxScore` reference stable across renders (closure captures same module value), jadi adding to deps tidak mempengaruhi memoization correctness — purely a lint compliance fix.

**Alternatif yang TIDAK bekerja**: Hoist `const DLOM_MAX_SCORE = DLOM_FACTORS.length` ke module scope dan gunakan langsung di useMemo (skip local binding) — masih flagged karena local var `const maxScore = DLOM_MAX_SCORE` di dalam component still triggers the rule.

**Cara menerapkan di masa depan**:
1. Saat React Compiler complain tentang missing dep yang derived dari const, **add to deps** — explicit listing satisfies rule dan tidak break correctness
2. Jangan disable rule via comment — itu noise
3. Jangan inline const di every useMemo (DRY violation)
4. Kalau lint warning persistent setelah hoist, accept eksplisit dep entry sebagai pattern

**Proven at**: session-008 (2026-04-12). `dlom/page.tsx` dan `dloc/page.tsx` use this pattern.

---

### LESSON-028: Always implement Zustand persist `migrate` saat bump version — silent data loss otherwise

**Kategori**: Framework | Anti-pattern
**Sesi**: session-008.5
**Tanggal**: 2026-04-12

**Konteks**: Session 008 added DLOM/DLOC slices ke Zustand store. Saya bump persist key `STORE_KEY` dari `"kka-penilaian-saham:v1"` ke `"kka-penilaian-saham:v2"` untuk avoid hydrating old shape. Tidak menambahkan `migrate` function.

**Apa yang terjadi**: Self-audit Session 008.5 mengidentifikasi bahwa users dengan `home` data tersimpan di v1 localStorage akan **kehilangan data mereka** saat browser pertama load v2 deploy. Zustand persist gagal find key v2, fallback ke initial state `{home: null, dlom: null, dloc: null}`. User HOME form jadi blank, tanpa warning.

**Root cause / insight**: Zustand persist `name` field adalah localStorage key. Bumping name = changing the storage location. Tanpa `migrate` function, persist tidak tahu cara map old shape → new shape, dan default ke initial state. Ini silent failure mode — tidak ada error, tidak ada warning, hanya data loss.

**Solusi yang benar**: Use `version` field + `migrate` function instead of changing `name`:
```ts
persist(
  (set) => ({...}),
  {
    name: STORE_KEY,           // unchanged across versions
    version: 2,                // bump this when schema changes
    migrate: (persistedState, fromVersion) => {
      if (fromVersion === 1 && /* type guard */) {
        // v1 → v2: carry forward home, init new slices null
        return { ...persistedState, dlom: null, dloc: null }
      }
      return persistedState
    },
    // ... other config
  }
)
```

**Cara menerapkan di masa depan**:
1. Ada perubahan persisted state shape? **WAJIB** add/bump `version` field + supply `migrate`
2. Jangan change `name` field untuk version bumping — itu loses old data
3. Export `migrate` sebagai named function untuk testability isolated dari persist middleware
4. Test migration explicitly: write unit test untuk `migrate(v1State, 1) → v2State`
5. Type guard di migrate function — `persistedState: unknown` perlu narrowing sebelum spread
6. Future versions pass through unchanged — `if (fromVersion === N) { migrate } else return persistedState`

**Proven at**: session-008.5 (2026-04-12). `src/lib/store/useKkaStore.ts` exports `migratePersistedState`, 4 unit tests cover v1→v2 + edge cases (null, garbage, future versions).

---

### LESSON-029: App harus company-agnostic dari hari satu — workbook prototype hanya 1 case study

**Kategori**: Design | Workflow | Anti-pattern
**Sesi**: session-008.5
**Tanggal**: 2026-04-12

**Konteks**: User repeatedly menanyakan "apakah ini system development?" dan menambahkan reminder eksplisit: "PT Raja Voltama Electric yang ada di excel adalah contoh studi kasus saja, sebab kedepannya aplikasi yang kita hasilkan akan digunakan untuk memproses dan menilai perusahaan lain."

**Apa yang terjadi**: Audit menemukan 9 manifests di `src/data/manifests/*.ts` masih hardcode `title: "Balance Sheet — PT Raja Voltama Elektrik"` dan disclaimer `"Data demo workbook PT Raja Voltama Elektrik..."`. Manifest title adalah display string yang user lihat — kalau hardcoded ke 1 company name, app secara fundamental tidak bisa dipakai untuk perusahaan lain.

Lebih buruk: setelah Patch 3 strip company name dari manifests, saya tambah `<CompanyContextHeader>` yang baca `home.namaPerusahaan` dari Zustand dan render "Penilaian Saham — {namaPerusahaan}" di top of every financial page. Tapi 9 financial pages **masih** read data dari seed fixture (PT Raja Voltama). Konsekuensi: user isi HOME dengan "PT Acme", header jadi "Penilaian Saham — PT Acme", tabel di bawah masih PT Raja Voltama. **Misleading UX** yang lebih buruk dari sebelum saya kerjakan Patch 3.

**Root cause / insight**: Company-agnostic adalah architectural principle yang harus dipertimbangkan di **setiap layer**, bukan hanya sebagian. Tiga layer yang harus consistent:
1. **Data source layer**: where does the data come from? (seed fixture vs user store)
2. **Display layer**: what does the UI show? (manifest titles, headers, disclaimers)
3. **Mode awareness**: does the UI honestly reflect data source state?

Stripping hardcoded names dari layer 2 SAJA tidak cukup kalau layer 1 masih seed (showing PT Raja Voltama data) dan layer 3 lying (displaying user's company name). Semua 3 layers harus aligned.

**Cara menerapkan di masa depan**:
1. **Manifests, components, types adalah pure abstractions**. Tidak boleh ada hardcoded company-specific identifier (nama perusahaan, NPWP, year-specific numbers, dll.)
2. **Headers / disclaimers / metadata yang menampilkan company info HARUS mode-aware**. Pattern: `<DataSourceHeader mode="seed" />` saat data dari fixture, `mode="live"` saat data dari user store. Mode menentukan apa yang ditampilkan — tidak boleh lying.
3. **Saat mengubah satu layer, audit semua 3 layers sekaligus**. Jangan strip nama dari title tanpa juga consider apakah header masih honest, dan apakah data source consistent dengan claim.
4. **Demo data adalah opt-in eksplisit, bukan silent default**. User harus tahu kalau yang dia lihat adalah demo, bukan data mereka. Banner warning mandatory untuk seed-mode pages.
5. **Single switching point**: arsitektur seharusnya punya 1 tempat untuk flip seed→live (e.g., `<DataSourceHeader mode={isLive ? 'live' : 'seed'} />` di SheetPage). Phase 3 transition hanya butuh 1 line change.
6. **Test workbook prototype adalah scaffolding**, bukan hardcoded reference. Treat it sebagai "case study #1" — production app harus jalan untuk case #2, #3, ...#1000 tanpa code changes.

**Anti-pattern yang dihindari**:
- Manifest constants dengan company-specific values
- Hardcoded company names di display strings
- Trusting layer-2 fix tanpa audit layer-1 dan layer-3
- Silent demo mode (user tidak tahu kalau yang dia lihat adalah demo)
- Multiple mode switching points (toggle scattered di banyak komponen)

**Proven at**: session-008.5 + 008.6 (2026-04-12). 9 manifests stripped, `<DataSourceHeader>` mode-aware introduced, warning banner explicit untuk seed mode.

---

### LESSON-030: Backward-compatible additions > breaking refactor

**Kategori**: Workflow | Design
**Sesi**: session-009 (Phase 3 design)
**Tanggal**: 2026-04-12

**Konteks**: Phase 3 design brainstorm — aplikasi perlu support live data mode (user input replacing seed fixtures) tanpa breaking 9 existing financial pages, 133 existing tests, atau established build pipeline.

**Insight**: Daripada refactor `build.ts`, `applyDerivations`, dan derivation primitives untuk accept new "DataSource" abstraction, **synthesize** existing CellMap interface dari live data via parallel adapter (`buildLiveCellMap(manifest, liveData, years)`). Pipeline downstream **tidak berubah sama sekali** — masih consume `CellMap = ReadonlyMap<string, FixtureCell>`.

Single adapter point = single point of truth untuk seed↔live transition. Live mode purely additive: new files di `src/data/live/`, existing core untouched.

**Cara menerapkan di masa depan**:
1. Saat add new capability ke stable pipeline, **cari adapter point** instead of refactoring core
2. Synthesize "fake" data shape yang core sudah tahu cara consume, daripada teach core a new shape
3. Keep core APIs immutable across major feature additions — core stability = test stability = confidence
4. **Cost-benefit**: synthesize adapter adalah 1 file (~50-100 lines). Refactor core adalah 5+ files + 50+ test updates + risk of regression. 10× cheaper untuk adapter.
5. Pattern works untuk: data sources (seed↔live), output formats (HTML↔PDF↔xlsx), input shapes (form↔upload↔API), dll.

**Trade-off accepted**: Adapter overhead per request (synthesize CellMap dari store data on every render). Bounded compute, well within performance budget.

**Anti-pattern dihindari**:
- "While we're refactoring anyway, let's also..." — scope creep yang risks core stability
- Breaking changes untuk theoretical future flexibility
- Modifying tested core when an adapter would suffice

**Proven at**: session-009 design (2026-04-12). Will be implemented in session-010 onwards.

---

### LESSON-031: Auto-detect mode dari domain state > explicit toggles atau props

**Kategori**: Design | Workflow
**Sesi**: session-009 (Phase 3 design)
**Tanggal**: 2026-04-12

**Konteks**: Phase 3 design — apakah seed↔live mode harus controlled via UI toggle, URL param, page-level prop, atau auto-detect dari store state?

**Insight**: Domain state sering kali sudah mengencode the answer. Untuk KKA, `home === null` adalah natural sentinel: jika user belum isi HOME form, mereka belum mulai penilaian → pasti masih demo viewing. Jika `home !== null`, mereka aktif menilai → live mode (data may be sparse but they've started).

Tidak perlu mode flag, toggle button, atau URL parameter — single source of truth = `home` slice.

**Cara menerapkan di masa depan**:
1. Sebelum add mode toggle / flag / prop, ask: "apakah domain state sudah mengencode the answer?"
2. Sentinel pattern: gunakan `null` (atau sentinel value lain) di domain state sebagai "user belum mulai" indicator
3. Auto-detect lebih sederhana untuk user (zero cognitive load) dan untuk developer (zero state synchronization)
4. Escape hatch: jika rare case butuh override (e.g. "lihat demo lagi setelah saya mulai"), provide reset action yang mengubah domain state — bukan parallel mode flag
5. Sentinel + reset > toggle. User mental model lebih simpel.

**Trade-off accepted**: Tidak ada per-page mode override. Kalau user perlu lihat 1 page seed sambil sisanya live, harus reset. Acceptable untuk Penilai DJP workflow (rare requirement).

**Proven at**: session-009 design (2026-04-12). Will be implemented in session-010 via `<DataSourceHeader mode={home === null ? 'seed' : 'live'} />`.

---

### LESSON-032: Lazy compute via `useMemo` per page > global reactive graph untuk moderate compute

**Kategori**: Performance | Design
**Sesi**: session-009 (Phase 3 design)
**Tanggal**: 2026-04-12

**Konteks**: Phase 3 design — bagaimana handle cross-sheet dependencies (BS+IS → CFS, NOPLAT, FR; NOPLAT → FCF; FA → FCF)? Reactive recompute pada setiap input change, atau lazy compute saat user navigate ke page?

**Insight**: Untuk app dengan moderate compute (~3000 cells × 9 sheets = 27000 cells eager), lazy compute via `useMemo` per page **9× lebih efficient**. User hanya pay compute cost untuk pages yang mereka visit, bukan untuk semua pages on every input.

Pattern:
```tsx
const liveData = useMemo(() => {
  if (!home || !bs || !is) return null
  return computeCashFlowStatement(toCashFlowInput(bs, is))
}, [home, bs, is])
```

React's existing hook system handles "what to recompute when" tanpa explicit dependency graph. Zustand selectors trigger re-render hanya saat relevant slices berubah. `useMemo` memoize compute hingga inputs berubah.

**Cara menerapkan di masa depan**:
1. Reactive global graph adalah over-engineering untuk most apps. Coba lazy + memo dulu.
2. Performance budget: kalau target adalah <100ms per page navigation dan compute fits, lazy = simpler + faster overall
3. Empty state handling: jika upstream incomplete, render `<EmptyState>` instead of compute on null inputs
4. Selectors granular per slice — avoid subscribe ke seluruh store untuk satu component
5. Memoize expensive operations dengan stable inputs. Avoid memoize cheap operations (overhead > benefit)

**Anti-pattern dihindari**:
- Global recompute graph untuk app yang fits in single tab (no SSR streaming, no infinite scroll)
- Subscribing component ke entire store (causes re-render storms)
- Eager compute pada sheets yang user mungkin tidak pernah visit

**Trade-off accepted**: First navigation ke each downstream page mungkin spend ~10-50ms compute. Acceptable untuk client-side DJP tool dengan typical session lifecycle <30 menit.

**Proven at**: session-009 design (2026-04-12). Will be implemented across session-011 + 012.

---

### LESSON-033: Declarative `computedFrom[]` beats structural indent-based derivation for irregular accounting hierarchies

**Kategori**: Design | Anti-pattern
**Sesi**: session-010
**Tanggal**: 2026-04-12

**Konteks**: Session 010 input form butuh menampilkan subtotal/total row sebagai read-only computed cells (Total Current Assets, TOTAL ASSETS, dll). Pertanyaan: bagaimana compute hierarchy-nya? Tiga kandidat:

1. **Section-based running-buffer** — subtotal = sum of leaves since last section boundary (header/separator)
2. **Indent-based parent-child** — parent aggregates all children at indent > current
3. **Declarative** — each subtotal row declares `computedFrom: number[]` explicitly

**Apa yang terjadi**: Awalnya coba approach 1 dan 2. Keduanya gagal di pola BS `row 25 Total Non-Current Assets = row 22 (subtotal Fixed Assets Net) + row 24 (leaf Intangibles)` — aggregates **a subtotal plus a sibling leaf** at the same indent level. Section-based produces `sum(24) = 24` (hanya leaf buffer since last subtotal). Indent-based juga tidak membedakan row 22 (subtotal) vs row 25 (subtotal) di same indent level 0 — mana yang "children" siapa?

Menambah exceptions untuk row 25, 27, 41, 48, 49, 51 (6 dari 9 subtotal/total di BS) akan bikin helper rusak penuh — lebih banyak override daripada default rule.

**Root cause / insight**: Real-world accounting hierarchies **tidak konsisten**. Excel author campuran:
- Pure-leaf subtotals (Total Current Assets = sum 7 leaves)
- Subtotal-of-subtotals (TOTAL ASSETS = Total Current + Total Non-Current)
- **Mixed** (Total Non-Current = subtotal Fixed Assets Net + leaf Intangibles; Shareholders Equity = leaf Paid Up + leaf Addition + subtotal Retained Earnings Ending)

Tidak ada single structural rule yang cover semua tanpa exception list. Satu-satunya representation yang jujur adalah **eksplisit dependency graph per row**.

Declarative `computedFrom: [22, 24]` adalah 8 karakter lebih banyak dari "implicit rule" tapi **zero ambiguity**, **self-documenting** ("row 25 depends on rows 22 and 24 — now you know"), dan **single source of truth** yang sama structure seperti Excel formula itu sendiri (`=C22+C24`).

Untuk implement: single forward pass, setiap row lookup referenced rows dari `values[ref] ?? out[ref]` (leaf dulu, fallback ke prior computed). Subtotal-of-subtotals bekerja selama manifest natural top-down ordering (yang memang convention Excel).

**Cara menerapkan di masa depan**:
1. **Kalau hierarchy berpotensi irregular**, jangan coba derive structure dari layout. Declare edges sebagai data.
2. **Single forward pass dengan fall-through** (leaf value || prior computed) cukup untuk chain dependencies tanpa recursion
3. **Accounting sign conventions** (negatif untuk AccumDep, etc.) fall out natural dari plain sum — tidak butuh sign-flip logic per row
4. Kalau field baru seperti `computedFrom` dibuat di manifest type, ada threshold YAGNI: only add new manifest fields when at least 2 real sheets benefit. BS alone justified `computedFrom` (9 subtotal rows); IS dan FA akan pakai same field di Session 011–012.
5. **Kalau rule ambiguous, deklarasikan eksplisit**. Implicit rules yang butuh 6+ exceptions di 9 row sample size **bukan rule** — itu accidental complexity masquerading as simplicity.

**Anti-pattern avoided**: Elegant-looking structural derivation yang butuh exception list. Kalau ada rule + >20% exceptions, rule-nya salah.

**Proven at**: session-010 (2026-04-12). `src/lib/calculations/derive-computed-rows.ts` + 8 TDD tests + `src/data/manifests/balance-sheet.ts` 9 `computedFrom` declarations.

---

### LESSON-034: Gate local-state seed via hydration-aware child mount — elegant `useState(initial)` without setState-in-effect

**Kategori**: Framework | Anti-pattern | React Compiler
**Sesi**: session-010
**Tanggal**: 2026-04-12

**Konteks**: `/input/balance-sheet` perlu seed `localValues` dari `store.balanceSheet.rows` **sekali saat mount**, debounce subsequent writes back to store. Tricky dengan Zustand persist: during SSR dan before `onRehydrateStorage` fires, `store.balanceSheet` adalah initial state (null), bukan user's persisted data.

First attempt:
```ts
const [localValues, setLocalValues] = useState(balanceSheet?.rows ?? {})
useEffect(() => {
  if (hasHydrated && balanceSheet?.rows) {
    setLocalValues(balanceSheet.rows)  // ❌ setState-in-effect
  }
}, [hasHydrated, balanceSheet])
```

Lint rejected: `react-hooks/set-state-in-effect` (LESSON-016). React Compiler considers setState-in-effect as cascading re-render hurting performance.

**Apa yang terjadi**: Mencoba alternative approaches:
1. Key-based remount (`<Grid key={hasHydrated} />`) — works but feels hacky
2. Direct subscription (pass `balanceSheet` down) — then debounce would fight with store updates
3. `useSyncExternalStore` — complex, orthogonal
4. **Child-component extraction behind hydration gate** — parent gates on `hasHydrated`, child mounts only after hydration and uses `useState(initialValues)` which runs **exactly once**

**Root cause / insight**: `useState(initializer)` fires **once at mount**. Kalau component **belum mounted** sampai `hasHydrated`, initializer **akan lihat hydrated store state**. Parent:

```tsx
function Page() {
  const home = useKkaStore(s => s.home)
  const hasHydrated = useKkaStore(s => s._hasHydrated)
  if (!hasHydrated) return <LoadingPlaceholder />   // gate
  if (!home) return <EmptyState />                   // gate
  return <Editor tahunTransaksi={home.tahunTransaksi} />  // child mounts AFTER hydration
}

function Editor({ tahunTransaksi }) {
  // Safe: parent guaranteed hydration before mounting us.
  const initial = useKkaStore.getState().balanceSheet?.rows ?? {}
  const [localValues, setLocalValues] = useState(initial)
  // ... debounced writes back to store ...
}
```

Key realization: **hydration gate != loading state**. The parent page file is really two components — a gate + the actual feature. Extracting the feature into a separate component makes the mount timing do the seeding for free, zero effect sync, zero lint violations. `useKkaStore.getState()` bypasses subscription (we don't want subsequent store updates to overwrite local state — those come from our own debounced writes).

**Cara menerapkan di masa depan**:
1. **Kalau butuh seed local state dari persisted store**, extract the feature behind a parent hydration gate
2. Parent gates on `hasHydrated` (+ any domain invariants like `home !== null`), returns early
3. Child uses `useState(initial)` dengan `useKkaStore.getState()` sekali — **non-subscribed read**
4. Debounced writes flow **one way**: local state → store. Never flow back (local state IS the source of truth while the page is mounted)
5. This pattern scales to any form page with persisted state: `/input/income-statement`, `/input/fixed-asset`, future WACC/DCF forms
6. **Anti-pattern**: menyembunyikan setState-in-effect dengan eslint-disable. Aturan ada alasan — ikuti dengan cara yang cleaner, jangan bypass.

**Alternative considered**: inline everything di satu component + use `useRef` untuk track "already seeded" flag + manual sync in effect. Works, tapi adds state you don't actually have semantically. Child mount gate is zero extra state.

**Proven at**: session-010 (2026-04-12). `src/app/input/balance-sheet/page.tsx` — parent `InputBalanceSheetPage` gates on hydration + HOME, child `BalanceSheetEditor` does the real work. Lint clean, zero effect sync needed.

---

## Session 011 — Phase 3 IS Input + Downstream Wave

### LESSON-035: Trust fixture formulas over your own past manifest labels — re-verify before live migration

**Kategori**: Excel | Workflow | Anti-pattern
**Sesi**: session-011
**Tanggal**: 2026-04-12

**Konteks**: Saat menambah `computedFrom` declarations ke manifest yang sudah ada, khususnya manifest yang ditulis beberapa sesi sebelumnya dan tidak di-audit ulang terhadap fixture asli.

**Apa yang terjadi**: IS manifest (ditulis di Session 004) mendeklare row 28 "Other Incomes/(Charges)" sebagai leaf (`indent: 1`, no type) dan row 30 "Non-Operating Income (net)" sebagai `type: 'subtotal'`. Saat Task 2 Session 011 inspect fixture formula untuk menulis `computedFrom` declarations, ternyata fixture formula `D28 = =+D26+D27` membuktikan row 28 adalah computed subtotal (Net Interest = Interest Income + Interest Expense), bukan leaf. Dan row 30 punya `formula: None` — artinya leaf, bukan subtotal. Label dan type di manifest sudah **salah sejak Session 004** tapi tidak pernah ketahuan karena seed mode renders fixture values directly (label styling cosmetic saja, bukan fungsional).

**Root cause / insight**: Session 004 authored manifest rows berdasarkan *label* di workbook dan *structural position* (row 30 terlihat "setelah" sub-items jadi diasumsikan subtotal). Tidak ada step eksplisit "verify every row's formula cell before declaring leaf vs subtotal type". Seed mode yang renders fixture values bypasses the type declaration entirely, sehingga error tidak pernah visible di UI.

**Cara menerapkan di masa depan**:
1. **Sebelum menambah `computedFrom`** ke manifest yang sudah ada, SELALU inspect fixture formula column (`formula` field) untuk **setiap row** di manifest. Jangan percaya label/type yang ditulis di sesi sebelumnya tanpa cross-check.
2. Pattern verification: `python3 -c "cells = ...; for r in rows: print(f'row {r} f={cells[f\"D{r}\"].get(\"formula\")}')"` — takes 30 seconds, prevents wrong live-mode behavior.
3. **Red flag**: manifest row yang punya `type: 'subtotal'` tapi fixture cell punya `formula: None` (leaf). Atau sebaliknya: manifest leaf yang punya fixture formula.
4. Ini berbeda dari LESSON-010 ("Excel column labels bisa misleading") — LESSON-010 tentang workbook header misleading. LESSON-035 tentang **our own manifest label/type** yang misleading karena di-authored tanpa formula-level verification.
5. **Live mode amplifies the error**: seed mode renders fixture values regardless of manifest type declaration. Live mode trusts manifest type to decide "editable vs computed". Wrong type = user can't edit a row they should, or row stays blank when it should auto-compute.

**Proven at**: session-011 (2026-04-12). IS manifest rows 28 and 30 had swapped type/label for 7 sessions (004→011). Caught during Task 2 fixture inspection when `computedFrom: [26, -27, 28]` on row 30 produced wrong PBT values. Fixed by re-reading fixture formulas for every IS row before authoring `computedFrom`.

---

## Session 013 — WACC + Discount Rate + Growth Rate

### LESSON-036: WACC and DISCOUNT RATE are intentionally different sheets with different inputs — don't assume parameter symmetry

**Kategori**: Excel | Anti-pattern
**Sesi**: session-013
**Tanggal**: 2026-04-12

**Konteks**: Saat mengimplementasikan dua sheet yang keduanya compute WACC — satu via comparable companies approach, satu via CAPM.

**Apa yang terjadi**: WACC sheet dan DISCOUNT RATE sheet keduanya menghasilkan "WACC" sebagai output, tapi menggunakan input parameters yang **sengaja berbeda**: Risk Free (2.70% vs 6.48%), ERP (7.62% vs 7.38%), tax rate (0% vs 22%). Ini bukan bug workbook — ini dua pendekatan analisis yang legitimate dengan asumsi berbeda. CAPM WACC (11.46%) dipakai DCF, bukan WACC sheet (10.31% hardcoded).

**Root cause / insight**: Penilai pajak sering menggunakan multiple valuation approaches sebagai cross-check. WACC sheet menghitung dari comparable companies (market-based), DISCOUNT RATE sheet dari CAPM (model-based). Parameter beda karena sumber data beda (SUN yield vs CAPM risk-free, peer D/E vs industry DER).

**Cara menerapkan di masa depan**:
1. Jangan assume bahwa sheet dengan output serupa punya input parameters identical.
2. Saat implement sheet baru yang "mirip" sheet lain, **SELALU inspect fixture formulas cell-by-cell** — jangan copy-paste logic dari sheet mirip.
3. WACC E22 = 0.1031 adalah **manual override** ("Menurut WP"), bukan computed. App harus support override via `waccOverride: number | null`.
4. IS!B33 (tax rate di WACC Hamada equation) = 0 (cell kosong). Jangan assume tax rate = 22% tanpa verifikasi fixture.

**Proven at**: session-013 (2026-04-12). Ditemukan saat inspeksi fixture — awalnya ingin share params antara WACC dan DR, tapi fixture menunjukkan values berbeda.

### LESSON-037: ROUNDUP vs ROUND — Excel rounding functions berbeda dan berpengaruh pada precision matching

**Kategori**: Excel | Testing
**Sesi**: session-013 + session-014
**Tanggal**: 2026-04-12

**Konteks**: Saat compute projected values yang mengandung rounding di formula Excel.

**Apa yang terjadi**: KEY DRIVERS Sales Volume pakai `ROUND(prev*(1+inc), -2)` (round to nearest 100) sementara Sales Price pakai `ROUNDUP(prev*(1+inc), -3)` (round UP to nearest 1000). PROY LR COGS pakai `ROUNDUP(ratio*revenue, 3)` (round up to 3 decimal places). JavaScript `Math.round()` ≠ `Math.ceil()` — harus match Excel function yang benar.

**Root cause / insight**: Excel punya 3 rounding functions (ROUND, ROUNDUP, ROUNDDOWN) yang masing-masing punya JavaScript equivalent berbeda: `Math.round(v / 10^n) * 10^n` untuk ROUND, `Math.ceil(v / 10^n) * 10^n` untuk ROUNDUP. Salah pilih = precision mismatch di test.

**Cara menerapkan di masa depan**:
1. Saat implement formula yang mengandung rounding, **selalu cek teks formula di fixture** untuk determine ROUND vs ROUNDUP vs ROUNDDOWN.
2. Pattern: `ROUND(x, -N)` → `Math.round(x / 10^N) * 10^N`, `ROUNDUP(x, -N)` → `Math.ceil(x / 10^N) * 10^N`.
3. Untuk negative-precision rounding (ROUNDUP pada angka negatif), `Math.ceil` harus jadi `Math.floor` (round away from zero).
4. Test precision harus disesuaikan: kalau formula pakai ROUNDUP, test values mungkin hanya akurat ke 3 decimal.

**Proven at**: session-013/014 (2026-04-12). computeSalesVolumes (ROUND) dan computeSalesPrices (ROUNDUP) keduanya match fixture, roundUp3 helper di PROY LR COGS also matches.

### LESSON-038: Projection pages (PROY) lebih cocok custom page daripada manifest+SheetPage — structure terlalu berbeda

**Kategori**: Design | Workflow
**Sesi**: session-014
**Tanggal**: 2026-04-12

**Konteks**: Saat membangun PROY FA dan PROY LR pages.

**Apa yang terjadi**: Manifest+SheetPage system designed untuk standard financial tables (N-year historical data, uniform row structure, derivation columns). PROY pages punya structure yang berbeda: mixed historical+projected columns, 3-section × 6-category nested layout (PROY FA), margin rows interleaved (PROY LR), dan non-standard column counts. Memaksa ke manifest system membutuhkan lebih banyak override dan workaround daripada custom page.

**Root cause / insight**: Manifest system optimal untuk read-only display of homogeneous tabular data. Projection pages are fundamentally different: they mix input context (historical column C) with computed output (projected D-F), have non-standard column layouts, and often need custom section headers and visual hierarchy. Custom pages with direct `useMemo` computation are simpler and more maintainable.

**Cara menerapkan di masa depan**:
1. **Manifest+SheetPage**: historical sheets (BS, IS, CFS, FA) dan analysis sheets (FR, FCF, NOPLAT, GR, ROIC) yang punya uniform N-year column structure.
2. **Custom page**: projection sheets (PROY FA, PROY LR, PROY BS, dll), valuation forms (WACC, DR, DLOM, DLOC), input forms (KEY DRIVERS), dan any page dengan mixed column layouts.
3. **Heuristic**: jika page butuh `generateLiveColumns()` override DAN custom section headers DAN non-uniform row structure → custom page. Jangan force manifest.
4. Ini bukan kegagalan manifest system — itu system yang tepat untuk scope-nya. PROY pages di luar scope itu.

**Proven at**: session-014 (2026-04-12). PROY FA dan PROY LR keduanya dibangun sebagai custom pages — fungsional, tested, dan lebih sederhana dari manifest approach.

---

### LESSON-039: PROY NOPLAT historical vs projected columns use DIFFERENT source sheets AND different tax rates

**Kategori**: Excel | Anti-pattern
**Sesi**: session-015
**Tanggal**: 2026-04-12

**Konteks**: Saat mengimplementasikan PROY NOPLAT compute adapter. Historical column references Income Statement, projected columns reference PROY LR.

**Apa yang terjadi**: PROY NOPLAT historical column (C) menggunakan `='INCOME STATEMENT'!F{row}` dan `IS!$B$33` sebagai tax rate. Projected columns (D-F) menggunakan `='PROY LR'!{col}{row}` dan `PROY LR!$B$37`. IS!$B$33 = empty (0) sedangkan PROY LR!$B$37 = 0.22. Awalnya satu compute function dipakai untuk semua tahun dengan satu tax rate, menyebabkan historical NOPLAT salah.

**Root cause / insight**: Excel cross-sheet references per COLUMN bisa berbeda — historical column references different sheets than projected columns. Tax rate cell reference juga berbeda ($B$33 vs $B$37). Harus split historical dan projected processing.

**Cara menerapkan di masa depan**:
1. Saat implement PROY adapter yang punya historical + projected columns, SELALU trace formula per column, bukan hanya per row.
2. Jangan asumsikan satu parameter (tax rate, growth rate) berlaku untuk semua columns — historical bisa pakai sumber berbeda.
3. Pattern: pisahkan historical seeding (dari IS/BS/FA) dan projected computation (dari PROY LR/BS/FA) di function body.

**Proven at**: session-015 (2026-04-12)

### LESSON-040: Never reuse fixture values from one test file in another — always extract from primary fixture JSON

**Kategori**: Testing | Anti-pattern
**Sesi**: session-015
**Tanggal**: 2026-04-12

**Konteks**: Saat menulis PROY NOPLAT test, PROY LR row values untuk tahun 2023/2024 di-copy dari PROY LR test file.

**Apa yang terjadi**: PROY LR test file verified D column (2022) values terhadap fixture, tapi E/F (2023/2024) values di test file BUKAN dari fixture — mereka dari computed expectations. Saat di-copy ke PROY NOPLAT test, divergence ini menyebabkan test failures (~67M difference untuk NOPLAT year 2).

**Root cause / insight**: Test files contain a MIX of fixture-extracted values dan computed expectations. Copying values from test A to test B risks propagating non-fixture values. Always go to the PRIMARY source: `__tests__/fixtures/{sheet}.json`.

**Cara menerapkan di masa depan**:
1. Untuk test yang butuh cross-sheet values, SELALU extract dari fixture JSON langsung.
2. Gunakan Python one-liner `json.load + cells[addr]` untuk extract exact values — jangan copy dari test file lain.
3. Red flag: jika test value punya 15+ decimal digits, itu mungkin fixture-exact. Tapi jika berbeda di digit ke-8+, kemungkinan itu computed, bukan fixture.

**Proven at**: session-015 (2026-04-12)

### LESSON-041: System development audit — page-level wiring is where case-specific values hide

**Kategori**: Workflow | Anti-pattern
**Sesi**: session-015
**Tanggal**: 2026-04-12

**Konteks**: Setelah membangun 4 PROY compute adapters (semua company-agnostic via typed interfaces), 3x audit menemukan hardcoded values di page-level wiring.

**Apa yang terjadi**: Compute adapters 100% parameterized dan company-agnostic. Tapi page files yang CALL adapters berisi: (1) `IS_GROWTH_DEFAULTS` — growth rate 23% dari Raja Voltama, (2) `histTaxRate: 0` — karena prototype IS B33 kosong, (3) `stEnding: 0, ltEnding: 0` — karena prototype tidak punya pinjaman, (4) manifest header "PT RAJA VOLTAMA ELEKTRIK".

**Root cause / insight**: Adapters are easy to audit for company-agnostic (typed interfaces force it). Pages are harder — they wire store data to adapter parameters, and lazy shortcuts (hardcode instead of compute) are invisible until audited. The "last mile" of wiring is where patching hides.

**Cara menerapkan di masa depan**:
1. Setiap kali menulis page yang calls compute adapter, verify: **every** parameter value comes from user store or computed from user store. Zero literals except structural constants (row numbers, section labels).
2. Checklist per page: (a) no `const DEFAULTS = { ... }` with financial values, (b) no `someParam: 0` with "prototype" comment, (c) growth rates computed via `computeAvgGrowth()`, (d) tax rates computed from `abs(tax/PBT)`.
3. Run company-agnostic audit after each session with pages: `grep -rn '0\.\d{5,}' src/app/ src/data/live/`

**Proven at**: session-015 (2026-04-12)

### LESSON-042: Centralize projection year count — scattered magic number 3 in pages couples them to one projection horizon

**Kategori**: Design | Workflow
**Sesi**: session-015
**Tanggal**: 2026-04-12

**Konteks**: 5 projection pages all hardcoded `[T, T+1, T+2]` for projection years, while KeyDriversForm collects 7 years of data.

**Apa yang terjadi**: Changing projection horizon from 3 years to 5 years would require editing 5 page files. Compute adapters already accept `projYears` as a parameter, but pages hardcoded the array construction.

**Root cause / insight**: The compute layer was designed for flexibility (parameterized years), but the page layer coupled to a specific count. The fix: `PROJECTION_YEAR_COUNT` constant in `year-helpers.ts` + `computeProjectionYears(tahunTransaksi)` function — change once, all pages follow.

**Cara menerapkan di masa depan**:
1. Setiap kali ada magic number yang dipakai di >2 files, extract ke named constant di shared module.
2. Khusus projection: `computeProjectionYears()` adalah single entry point. Jangan construct array manual.
3. Saat menambah page baru yang butuh projection years, import dari `year-helpers.ts`, bukan copy-paste array construction.

**Proven at**: session-015 (2026-04-12)

---

## Session 016 — DCF + AAM + EEM + BORROWING CAP (First Share Value Output)

### LESSON-043: buildDiscountRateInput — centralize store→input mapping to prevent debtRate-class bugs

**Kategori**: Anti-pattern | Workflow
**Sesi**: session-016
**Tanggal**: 2026-04-12

**Konteks**: Saat multiple pages memanggil pure function yang sama dengan data dari Zustand store.

**Apa yang terjadi**: 3 valuation pages copy-paste 10 baris mapping `DiscountRateState → DiscountRateInput`. Semua 3 salah menghitung `debtRate` — pakai rata-rata mentah (`9.41`) alih-alih `computeDebtRateFromBanks()` yang konversi ke desimal (`0.094`). Bug 100× pada cost of debt.

**Root cause / insight**: Copy-paste store→input mapping = guaranteed divergence. Adapter function yang centralize mapping = satu tempat untuk semua transformasi = zero divergence risk.

**Cara menerapkan di masa depan**:
1. Setiap kali pure function di-consume oleh >1 page, buat `buildXxxInput(storeState)` adapter.
2. Adapter hidup di file yang sama dengan pure function (co-located).
3. Red flag: copy-paste mapping >5 baris antar files → STOP, extract adapter.

**Proven at**: session-016 (2026-04-12, `buildDiscountRateInput` di `discount-rate.ts`)

### LESSON-044: Prompt fixture analysis vs real fixture — SELALU verify projected columns independently

**Kategori**: Excel | Testing
**Sesi**: session-016
**Tanggal**: 2026-04-12

**Konteks**: Prompt menganalisa DCF fixture dan memberikan projected values untuk test. D-column benar, E/F salah besar.

**Apa yang terjadi**: Prompt assumed E12/F12 ~1-2B, fixture sebenarnya E12=-637B, F12=-9.8T. Projections compound aggressively. Test dengan wrong values gagal karena terminal value guard salah trigger.

**Root cause / insight**: Financial projections bisa exponentially diverge. Jangan extrapolate E/F dari D pattern. Selalu read actual fixture JSON.

**Cara menerapkan di masa depan**: Untuk DCF/valuation tests — extract ALL projected years dari fixture JSON via python script, jangan trust prompt analysis.

**Proven at**: session-016 (2026-04-12, DCF test rewritten with actual fixture values)

### LESSON-045: Gordon Growth Model allows g > r when FCF is negative — don't over-guard

**Kategori**: Excel | Anti-pattern
**Sesi**: session-016
**Tanggal**: 2026-04-12

**Konteks**: DCF terminal value `TV = FCF × (1+g) / (r-g)`. Standard finance: g must be < r.

**Apa yang terjadi**: Fixture has g=13.75% > r=11.46% with valid positive TV (~489T). FCF year 3 = -9.8T (negative). Negative × positive / negative = positive. Guard `g >= r` wrongly throws.

**Root cause / insight**: g > r guard assumes positive FCF. Dengan negative FCF, double-negative produces valid result. Excel tidak guard — just computes. Only guard against exact equality (division by zero).

**Cara menerapkan di masa depan**: Guard `wacc === growthRate` only. Let math work for g > r. Match Excel behavior exactly.

**Proven at**: session-016 (2026-04-12, guard relaxed from `>=` to `===`)

### LESSON-046: Centralize store→input builders in upstream-helpers — one builder per calc consumer

**Kategori**: Anti-pattern | Workflow
**Sesi**: session-017
**Tanggal**: 2026-04-13

**Konteks**: Saat >2 pages memanggil pure calc function yang sama dengan data dari Zustand store.

**Apa yang terjadi**: Session 017 shipped 4 new pages (CFI, Simulasi Potensi, Dashboard, refactored DCF) yang semuanya membutuhkan `computeAam()`, `computeDcf()`, `computeEem()`. Masing-masing copy-paste 15-20 parameter mapping dari store → input interface. Code review menemukan: (1) EEM hardcode `faAdjustment: 0` (C2 bug — ignores user input), (2) Simulasi Potensi hardcode Resistensi WP `'Moderat'` (C1 bug — wrong for all companies). Kedua bug terjadi KARENA copy-paste mapping.

**Root cause / insight**: `buildDiscountRateInput()` dari LESSON-043 adalah pattern yang benar tapi hanya diterapkan untuk 1 function. Seharusnya SETIAP calc function yang di-consume oleh >1 page mendapat builder sendiri. Pattern: `buildXxxInput(storeParams): XxxInput` sebagai pure function di `upstream-helpers.ts`.

**Cara menerapkan di masa depan**:
1. Setiap kali menambah page baru yang memanggil calc function, cek apakah builder sudah ada di `upstream-helpers.ts`
2. Jika belum, buat builder DULU sebelum menulis page
3. Red flag: copy-paste >5 baris parameter mapping antar files → STOP, extract builder
4. Saat menambah field baru ke input interface (e.g. `faAdjustment`), update builder — semua consumers otomatis benar

**Proven at**: session-017 (2026-04-13, 7 builders extracted: `buildAamInput`, `buildDcfInput`, `buildEemInput`, `buildBorrowingCapInput`, `computeHistoricalUpstream`, `deriveDlomRiskCategory`, `deriveDlocRiskCategory`)

### LESSON-047: Audit for hardcoded values after every multi-page session

**Kategori**: Workflow | Anti-pattern
**Sesi**: session-017
**Tanggal**: 2026-04-13

**Konteks**: Setelah session yang menambah 3+ pages yang memanggil calc functions yang sama.

**Apa yang terjadi**: Session 017 shipped 6 tasks, semua tests green, build clean, lint clean. User bertanya "apakah ini system development atau patching?" Code review menemukan 2 CRITICAL bugs dan 5 HIGH duplication issues yang lolos karena: (1) tests verify calc correctness, bukan page wiring correctness, (2) lint/typecheck tidak catch semantic issues seperti hardcoded values.

**Root cause / insight**: Automated gates (tests, lint, typecheck) catch syntactic issues. Semantic issues (hardcoded company-specific values, parameter divergence across consumers) memerlukan manual audit. Multi-page sessions amplify this risk karena copy-paste is the fastest way to ship.

**Cara menerapkan di masa depan**: Sebelum claim "session complete", run checklist:
1. `grep -r "= 0," src/app/` — cek setiap hardcoded 0 apakah seharusnya dari store
2. `grep -r "PERCENT_DEFAULT\|'Moderat'\|'Rendah'\|'Tinggi'" src/app/` — cek hardcoded strings
3. Untuk setiap calc function yang dipanggil di >1 page: diff parameter list — harus identik (or use shared builder)

**Proven at**: session-017 (2026-04-13, C1 + C2 bugs caught and fixed post-ship)

### LESSON-048: PPh progressive tax — bracket WIDTH not cumulative limit

**Kategori**: Excel | Testing
**Sesi**: session-017
**Tanggal**: 2026-04-13

**Konteks**: Saat implement PPh Pasal 17 progressive tax computation.

**Apa yang terjadi**: Prompt menyediakan PPh brackets sebagai cumulative limits (60M, 250M, 500M, 5B). Excel fixture menggunakan bracket WIDTHs (60M, 190M, 250M, 4.5B). Perbedaan:
- Cumulative limit: 5% on first 60M, 15% on 60M-250M, etc.
- Bracket width: 5% × 60M, 15% × 190M, 25% × 250M, 30% × 4.5B
Same math, different representation. Using widths matches Excel formula pattern exactly.

**Root cause / insight**: Excel C/D columns in SIMULASI POTENSI track "remaining taxable" and "bracket width" — the waterfall pattern. Implementing with widths produces cleaner code: `Math.min(remaining, width)` per bracket, no cumulative subtraction needed.

**Cara menerapkan di masa depan**: Saat implement progressive tax or tiered pricing, use bracket WIDTH array, not cumulative limits. Width-based waterfall = simpler loop, matches Excel pattern. Verify by checking SUM of all bracket widths covers the total range.

**Proven at**: session-017 (2026-04-13, 17 fixture-matched tests passing)

---

## Session 018 — Export .xlsx + HOME Revisi + Dynamic BS + Catalog Expansion

### LESSON-049: ExcelJS round-trip preserves formulas — safe for template-based export

**Kategori**: Excel | Workflow
**Sesi**: session-018
**Tanggal**: 2026-04-13

**Konteks**: Saat building template-based Excel export yang harus preserve 3,084 formulas.

**Apa yang terjadi**: Tested ExcelJS round-trip (load .xlsx → modify cells → writeBuffer → reload). IS C8 formula `SUM(C6:C7)` survived intact with correct result. BS formula cells also preserved. This validates the template clone approach.

**Root cause / insight**: ExcelJS stores formulas as string properties in the cell XML model. Load/save cycle reads and writes these strings without recalculating — formulas are preserved as-is. This is actually desirable: we inject values into input cells and formulas compute from those values when opened in Excel.

**Cara menerapkan di masa depan**: For any Excel export that needs formulas: use template-based approach (clone → inject → save). Don't try to recreate formulas programmatically. Always verify with round-trip test before building the full export.

**Proven at**: session-018 (2026-04-13, 14 export integration tests including formula preservation)

### LESSON-050: Cell positions in Excel prompts are guesses — always verify with ExcelJS

**Kategori**: Excel | Workflow | Anti-pattern
**Sesi**: session-018
**Tanggal**: 2026-04-13

**Konteks**: Session 018 prompt listed HOME cell positions (B4=namaPerusahaan, B5=npwp, B6=jenisPerusahaan, etc.).

**Apa yang terjadi**: Actual Excel verification revealed: npwp NOT in Excel at all, jenisPerusahaan at B5 (not B6), jumlahSahamBeredar at B6 (not B7), objekPenilaian at B12 (not B10). 4 out of 8 positions were wrong. Also discovered KEY DRIVERS D20/D23/D24 are formulas (not input cells), and DR bank rates at K6-L10 (not standard column positions).

**Root cause / insight**: Prompts are written from memory/assumption. Excel files have complex layouts with merged cells, hidden rows, non-obvious column offsets. Only programmatic verification (ExcelJS `getCell().value`) gives ground truth.

**Cara menerapkan di masa depan**: NEVER trust cell positions in prompts. Always run ExcelJS scan of the actual sheet before writing cell mappings. Use the pattern: `for (let r = 1; r <= 50; r++) { console.log(r, ws.getCell('A'+r).value, ws.getCell('B'+r).value) }`.

**Proven at**: session-018 (2026-04-13, HOME mapping corrected from 4 wrong positions)

### LESSON-051: Extended catalog accounts need separate export detail sheet

**Kategori**: Excel | Design | Workflow
**Sesi**: session-018
**Tanggal**: 2026-04-13

**Konteks**: Expanding BS catalog from 21 to 84 accounts. New accounts (excelRow 100-319) don't have cells in the original Excel template.

**Apa yang terjadi**: User required ALL individual account values to be exportable and editable in Excel — not just subtotals. Since new catalog accounts can't be injected into the fixed-layout template without breaking formula references, added a separate "RINCIAN NERACA" worksheet to the exported Excel. This sheet lists all user accounts grouped by section with SUM formula subtotals.

**Root cause / insight**: Template-based export is safe for ORIGINAL accounts (excelRow < 60) — they map to fixed cells. Extended accounts need a parallel export path that doesn't touch the template's formula structure. The "detail sheet" pattern is non-destructive: main sheet formulas intact, detail sheet fully editable.

**Cara menerapkan di masa depan**: When expanding any financial sheet's account catalog beyond the original template, always add a corresponding "RINCIAN" detail sheet to the export. Pattern: group accounts by section → write labels + values → add SUM subtotals → section header styling. Apply this for IS and FA when their catalogs expand.

**Proven at**: session-018 (2026-04-13, export test verifies detail sheet contains accounts with correct values)

### LESSON-052: Sentinel pre-computation for downstream backward compatibility

**Kategori**: Workflow | Anti-pattern | Design
**Sesi**: session-019
**Tanggal**: 2026-04-14

**Konteks**: Converting IS from static manifest to catalog-driven dynamic editor. 20+ downstream files reference specific IS row numbers (6=Revenue, 7=COGS, 8=GP, 18=EBITDA, 32=PBT, 35=NP).

**Apa yang terjadi**: Making Revenue a dynamic section with multiple accounts means row 6 becomes a subtotal computed from extended rows (100, 101, ...). Downstream pages read `incomeStatement.rows[6]` directly from the store — they'd get undefined since subtotals aren't stored. The static IS manifest's `computedFrom: [12, 13]` for OpEx total (row 15) also can't see extended accounts, producing incorrect totals.

**Root cause / insight**: The store `rows` only contains leaf data. Computed values are generated on-the-fly per-page via `deriveComputedRows`. When the IS goes dynamic, the static manifest becomes incomplete — it doesn't know about extended accounts. Two options: (A) update 20+ downstream files to use the dynamic manifest, (B) pre-compute sentinel values at original row positions at persist time. Option B is 10× cheaper.

**Cara menerapkan di masa depan**: When converting a static manifest to catalog-driven, if >5 downstream consumers reference specific row numbers, use sentinel pre-computation: the editor computes ALL section subtotals + higher-level computed values at persist time and stores them at the original row positions. Downstream reads unchanged. Also update the 3-4 downstream compute files that call `deriveComputedRows(STATIC_MANIFEST, ...)` to read IS values directly.

**Proven at**: session-019 (2026-04-14, 837 tests pass, 4 downstream compute files updated, 20+ page consumers unchanged)

### LESSON-053: Generalize ManifestRow.section to string for multi-sheet catalogs

**Kategori**: TypeScript | Design
**Sesi**: session-019
**Tanggal**: 2026-04-13

**Konteks**: `ManifestRow.section` was typed as `BsSection` (BS-specific union type). Adding FA and IS catalogs requires each sheet's own section type.

**Apa yang terjadi**: Changed `ManifestRow.section` from `import(...).BsSection` to `string`. Added generic `CatalogAccount` interface in `types.ts` that BS, FA, and IS catalog types all conform to. RowInputGrid now uses `CatalogAccount` and `string` instead of BS-specific types.

**Root cause / insight**: The first implementation of a feature (BS catalog) naturally uses tight types. When the pattern expands to 2+ consumers, the shared infrastructure needs generic types. The cost of generalization is low (3 type widening changes + 3 casts in BS editor) vs the alternative (separate RowInputGrid per sheet).

**Cara menerapkan di masa depan**: When a shared component (RowInputGrid, ManifestRow, etc.) is used by the first sheet-specific feature, use the specific type. When the second sheet needs it, generalize to `string`/generic interface. Don't pre-generalize before the second consumer exists (YAGNI), but don't resist generalizing when it arrives.

**Proven at**: session-019 (2026-04-13, BS/FA/IS all use the same RowInputGrid with generic CatalogAccount)

### LESSON-054: RowInputGrid renders row.label not row.buttonLabel — match BS pattern

**Kategori**: Anti-pattern | Design
**Sesi**: session-019
**Tanggal**: 2026-04-13

**Konteks**: FA manifest builder set add-button `label: ''` and text in `buttonLabel`. Button was invisible in the UI.

**Apa yang terjadi**: `ManifestRow` type has both `label` and `buttonLabel` fields. RowInputGrid's add-button rendering uses `{row.label}` for the button text. The `buttonLabel` field exists in the type but is never read by the grid. The FA builder followed the type definition rather than the rendering implementation, producing an invisible button.

**Root cause / insight**: Type definitions describe SHAPE, not BEHAVIOR. The presence of `buttonLabel` in `ManifestRow` doesn't mean any renderer uses it. Always check the rendering code (RowInputGrid add-button branch) to know which field is displayed.

**Cara menerapkan di masa depan**: When creating a new manifest builder that produces add-button rows, look at how the BS manifest builder creates the same row type. Copy the exact field assignments — don't invent based on type definitions alone. Also consider removing `buttonLabel` from ManifestRow if it's truly unused.

**Proven at**: session-019 (2026-04-13, fixed within minutes after user reported invisible button)

### LESSON-055: Excel uses plain addition for IS — expenses stored negative, formulas SUM

**Kategori**: Excel | Anti-pattern
**Sesi**: session-020
**Tanggal**: 2026-04-14

**Konteks**: Dynamic IS manifest computedFrom convention vs Excel convention.

**Apa yang terjadi**: `buildDynamicIsManifest` used signed `computedFrom: [6, -7]` for Gross Profit (Revenue minus COGS). This assumed users enter expenses as POSITIVE and the formula subtracts. But the Excel prototipe stores COGS as NEGATIVE (-33B), and Gross Profit formula is `=SUM(D6:D7)` — plain addition. When user entered COGS with minus sign (matching Excel), the double-negation caused Gross Profit = Revenue + COGS instead of Revenue - COGS.

**Root cause / insight**: The Excel prototipe uses a CONSISTENT convention: revenue positive, expenses negative, ALL formulas use plain SUM or +. There is NO explicit subtraction in any IS formula. The signed `computedFrom` was an over-engineering that assumed a convention the Excel doesn't use.

**Cara menerapkan di masa depan**: Before writing computedFrom for any manifest, ALWAYS check the actual Excel fixture formula (`formula` field in cell JSON). If Excel uses `=SUM()` or `=+D8+D15`, use plain addition computedFrom. Only use signed refs when Excel explicitly subtracts (like FA Net Value `=+C26-C54`). Verify with: `python3 -c "import json; ..."` to print formula field.

**Proven at**: session-020 (2026-04-14). Fixture verification: IS row 8 formula `=SUM(D6:D7)`, row 18 `=D8+D15`, row 22 `=+D18+D21`, row 35 `=+D32+D33` — all plain addition.

### LESSON-056: Sentinel pre-computation needed for ALL dynamic catalog sheets (BS + FA + IS)

**Kategori**: Workflow | Anti-pattern
**Sesi**: session-020
**Tanggal**: 2026-04-14

**Konteks**: Dynamic editors with offset-based row keys must map to legacy positions for downstream compat.

**Apa yang terjadi**: Session 019 added sentinel pre-computation to IS editor but NOT to FA or BS. FA editor stored data at FA_OFFSET keys (2008, 4008, 5008) while all 12+ downstream consumers expected legacy positions (17, 36, 45). Result: EVERY FA-dependent computation silently produced zeros. BS had a subtler issue: extended accounts (excelRow 100+) weren't included in static manifest's computedFrom, so subtotals were wrong.

**Root cause / insight**: When introducing a new storage convention (offset keys) for a dynamic editor, you MUST also add a mapping layer at persist time. The pattern: (1) compute all derived values using the dynamic manifest, (2) store sentinels at canonical positions, (3) for original accounts map offset keys to legacy keys. Without this, downstream consumers — which were written for the old convention — silently break.

**Cara menerapkan di masa depan**: Every time a new dynamic catalog editor is created: (a) add sentinel pre-computation in schedulePersist + handleSave, (b) define SENTINEL_ROWS constant in catalog file, (c) filter sentinels out in localRows initialization. Apply the merge-order fix: `{ ...recomputed, ...storeRows }` so sentinel values take priority.

**Proven at**: session-020 (2026-04-14). FA `computeFaSentinels()` + BS sentinel + 10 downstream merge fixes.

### LESSON-057: Downstream merge order: `{ ...recomputed, ...storeRows }` not `{ ...storeRows, ...recomputed }`

**Kategori**: Anti-pattern
**Sesi**: session-020
**Tanggal**: 2026-04-14

**Konteks**: When downstream consumers call `deriveComputedRows(STATIC_MANIFEST, storeRows)` and then merge results.

**Apa yang terjadi**: Code pattern `allBs = { ...bsRows, ...bsComp }` means re-derived subtotals OVERWRITE any pre-computed sentinel values in the store. Since static manifest's computedFrom only references original accounts, the re-derived subtotals miss extended catalog accounts. The sentinel (correct total including extended) gets overwritten by the wrong value.

**Root cause / insight**: Spread operator merge order determines which value wins. Store sentinels are more accurate (include ALL accounts from dynamic manifest). Re-derived values from static manifest are less accurate (only original accounts). Store must win.

**Cara menerapkan di masa depan**: Any code that does `const all = { ...leafRows, ...computedRows }` where leafRows might contain sentinels must flip to `{ ...computedRows, ...leafRows }`. Search pattern: `grep -rn "\.\.\.\(balanceSheet\|fixedAsset\|incomeStatement\).*\.\.\." src/` to find merge sites.

**Proven at**: session-020 (2026-04-14). 10 files updated across upstream-helpers, projection-pipeline, CFS, and 6 page-level callers.

---

## Session 021 — UX Fixes + Auto-Save + AAM Per-Row Adjustments

### LESSON-058: BS sentinel must include FA cross-ref values at persist time

**Kategori**: Framework | Anti-pattern
**Sesi**: session-021
**Tanggal**: 2026-04-14

**Konteks**: When DynamicBsEditor computes sentinels for downstream (TOTAL ASSETS, etc.) at persist time.

**Apa yang terjadi**: BS sentinel pre-computation in `schedulePersist` and `handleSave` used `localRows` only — excluding FA cross-reference values (rows 20/21). This caused TOTAL ASSETS to be too low (missing FA Net), inflating all Financial Ratios that use Total Assets as denominator (Debt+Equity > 100%).

**Root cause / insight**: Cross-reference values are computed from a different store slice (fixedAsset) and only merged for display (via `crossRefValues` useMemo), not for persistence. Sentinel computation at persist time must include ALL sources of truth, not just local editable rows.

**Cara menerapkan di masa depan**: Any editor that has cross-reference values from other store slices MUST include those cross-refs when computing sentinels. Use `useKkaStore.getState()` inside the timeout callback to read latest cross-ref data (avoids stale closure). Add useEffect to re-persist when cross-ref source changes.

**Proven at**: session-021 (2026-04-14). `computeBsCrossRefValues` extracted, `schedulePersist` + `handleSave` + useEffect all updated.

---

### LESSON-059: Distinguish computed sentinels from fixed leaf rows (IS Depreciation/Tax)

**Kategori**: Anti-pattern | Framework
**Sesi**: session-021
**Tanggal**: 2026-04-14

**Konteks**: When DynamicIsEditor initializes `localRows` from store, filtering out sentinel rows.

**Apa yang terjadi**: `IS_SENTINEL_ROWS` included rows 21 (Depreciation) and 33 (Tax), which are user-editable fixed leaf rows, not computed sentinels. The editor's `localRows` initializer filtered them out on remount, causing user-entered Depreciation and Tax values to disappear.

**Root cause / insight**: The sentinel constant conflated two different concepts: (a) truly computed rows (subtotals derived from `computedFrom`) and (b) fixed leaf rows that happen to live in the sentinel range. Both are needed for downstream backward compat, but only (a) should be filtered out during editor initialization.

**Cara menerapkan di masa depan**: Create separate constants: `IS_SENTINEL_ROWS` (all rows for downstream) and `IS_COMPUTED_SENTINEL_ROWS` (only computed rows, excluding fixed leaves). Use the computed-only constant for editor initializer filters.

**Proven at**: session-021 (2026-04-14). `IS_COMPUTED_SENTINEL_ROWS` added to `income-statement-catalog.ts`.

---

### LESSON-060: sr-only inputs need positioned parent to prevent scroll jump

**Kategori**: Design | Framework
**Sesi**: session-021
**Tanggal**: 2026-04-14

**Konteks**: Any component using sr-only (visually hidden) radio/checkbox inputs with label click behavior.

**Apa yang terjadi**: DLOM QuestionnaireForm labels didn't have `position: relative`. The sr-only input (`position: absolute`) resolved to a distant ancestor. When browser focused the input after label click + React re-render, scroll-to-focus jumped to wrong position. Factors 1-5 (near top) were fine; factors 6-10 (below fold) caused visible scroll jump.

**Root cause / insight**: Browser's native scroll-to-focus behavior uses the element's bounding box in the layout. Without a positioned parent on the label, the sr-only input's position context is wrong, causing scroll to a distant position.

**Cara menerapkan di masa depan**: Always add `relative` class to any parent element containing an sr-only (absolute-positioned) input. One-line fix prevents scroll jump.

**Proven at**: session-021 (2026-04-14). Single `relative` class added to label in QuestionnaireForm.tsx.

---

### LESSON-061: Replace scalar adjustments with per-row Record for extensibility

**Kategori**: Design | Workflow
**Sesi**: session-021
**Tanggal**: 2026-04-14

**Konteks**: When a computation takes user adjustments that might apply to multiple rows.

**Apa yang terjadi**: AAM originally had `faAdjustment: number` — a single scalar adjusting only Fixed Asset Net. User needed per-row adjustments for every BS line item. Migrating from scalar to `Record<number, number>` required updating store, computation, UI, and 6 downstream consumers.

**Root cause / insight**: Starting with a scalar "shortcut" creates technical debt. `Record<number, number>` is trivially simple, handles 0 adjustments (empty object = no adjustment), handles 1 adjustment (same as scalar), and handles N adjustments. Zero additional complexity for the general case.

**Cara menerapkan di masa depan**: When building adjustment/override features, default to `Record<key, value>` from the start. Caller pre-adjusts values (C+D) before passing to pure computation function. Computation receives E-column values directly — cleaner interface, no adjustment logic in the pure function.

**Proven at**: session-021 (2026-04-14). `aamAdjustments: Record<number, number>` replaces `faAdjustment: number`. Store v13→v14.

---

## Session 022 — 2026-04-15

### LESSON-062: Shared-parameter calc modules MUST share sign convention

**Kategori**: Anti-pattern | Design | Testing

**Sesi**: session-022
**Tanggal**: 2026-04-15

**Konteks**: When two or more pure calculation modules accept the same parameter name (e.g. `dlomPercent`, `dlocPercent`, `taxRate`) and are called from the same UI layer / store.

**Apa yang terjadi**: `computeAam` takes `dlomPercent` as POSITIVE (e.g. 0.30) and negates internally (`equityValue * -dlomPercent`). `computeSimulasiPotensi` originally took `dlomPercent` as NEGATIVE (e.g. -0.30) and added directly. Both received `home.dlomPercent` from the same store (positive). Result: AAM subtracted correctly, Simulasi Potensi **added** DLOM to equity instead of subtracting — producing Market Value of Equity 52.9B instead of correct 8.5B. JSDoc on the interface said "negative", but no lint/type check enforces that, and tests passed negatives consistently, so the bug was silent for months.

**Root cause / insight**: JSDoc conventions are documentation, not enforcement. When two modules share a parameter name, the type system cannot distinguish `positive dlomPercent` from `negative dlomPercent` — both are `number`. The only safe invariant is **uniform sign convention across the module family**. Whichever convention wins, all modules in the family must follow it. Mixing conventions guarantees a caller-side sign mismatch will eventually slip through.

**Cara menerapkan di masa depan**:
1. Before adding a new calc module that shares parameters with an existing one, **audit the existing module's sign convention** and match it. Don't rely on JSDoc to remember later.
2. **Preferred convention**: caller passes positive decimal, calc function negates internally. Reasons: (a) store holds positive values (user-friendly), (b) JSX/UI displays positive values naturally, (c) negation is trivially one `-` character, (d) the JSDoc/code location of the negation is where sign correctness is audited.
3. Write a **cross-module integration test** when two modules share a store-sourced parameter: pass the same store value to both, assert that both modules produce the same sign on the corresponding output field (e.g. `dlomAmount` in both AAM and Simulasi Potensi should be negative).
4. When an assertion like "the function expects a negative input" lives only in JSDoc, treat it as a code smell. Either add a runtime guard (`if (input < 0) throw`), or change the function to normalize internally.

**Proven at**: session-022 (2026-04-15). `simulasi-potensi.ts` refactored to match `aam-valuation.ts` convention. 21 tests flipped to positive inputs. Downstream page `simulasi-potensi/page.tsx` needed zero changes since it was already (buggily) passing positive store values.

---

### LESSON-063: Audit grep all consumers before removing a field from a pure-calc result

**Kategori**: Workflow | Anti-pattern

**Sesi**: session-022
**Tanggal**: 2026-04-15

**Konteks**: When a user asks to remove a computed value from the UI ("hilangkan baris X") but the underlying field is defined in a pure calc result interface.

**Apa yang terjadi**: User asked to remove the "Nilai Akhir (AAM)" row from AAM page. The row displayed `AamResult.finalValue`. The naïve scope was a single JSX edit. But `aamResult.finalValue` was also consumed in `dashboard/page.tsx:111` for AAM `perShare` computation. Removing the field from `AamResult` without updating dashboard would have produced a TypeScript error, or worse, if we left the field in the result, it would have dangling usage with misleading semantics ("final value" that no longer exists in UI).

**Root cause / insight**: Pure-calc result fields are **API surface** — any module that imports the module can destructure any field. User-facing UI decisions should propagate to the pure calc only after auditing all consumers. Conversely, leaving a field in the result that's not rendered anywhere is a smell ("dangling public API").

**Cara menerapkan di masa depan**: Before removing a field from a pure-calc `*Result` interface:
1. Grep the entire `src/` tree for `\.fieldName` and `fieldName:`. Typical command:
   ```bash
   grep -rn "\.finalValue\|finalValue:" src/ __tests__/
   ```
2. For each hit, decide: (a) the consumer becomes broken → update it; (b) the consumer is test-only → update to new contract; (c) the consumer is needed → keep the field and only remove the UI row.
3. "System development bukan patching" (user's phrase) = option (a) or (b). Option (c) is patching. User explicitly asked for deep removal → chose (a)/(b).
4. A semantic removal needs a **behavior replacement** at each consumer site, not just field deletion. In this session: dashboard's AAM per-share was repointed from `finalValue / shares` to `marketValuePortion / (shares × proporsiSaham)` — semantically the new best equivalent for "AAM per-share value".
5. Add a test guard: `expect('removedField' in result).toBe(false)` — prevents regression from future merge reintroducing the field.

**Proven at**: session-022 (2026-04-15). `finalValue` removed from `AamResult`, `paidUpCapitalDeduction` removed from `AamInput`. All 4 consumer sites updated (2 source files + 1 test file + 1 UI file). Added `'finalValue' in result).toBe(false)` guard test.

---

## Session 023 — 2026-04-15

### LESSON-064: `useSyncExternalStore` SSR-safe mounted gate replaces React Compiler-incompatible `useState+useEffect`

**Kategori**: Framework | Anti-pattern

**Sesi**: session-023
**Tanggal**: 2026-04-15

**Konteks**: Client-only widgets that need to defer rendering until after hydration to avoid SSR/CSR mismatch (theme toggles, browser-API features, localStorage-derived UI). The canonical `next-themes`-style `mounted` flag pattern.

**Apa yang terjadi**: Built `<ThemeToggle>` with the documented `next-themes` pattern: `const [mounted, setMounted] = useState(false); useEffect(() => setMounted(true), [])`. Lint failed with `react-hooks/set-state-in-effect` rule (React Compiler discipline — same family as LESSON-016). The rule has no per-instance escape; effect bodies that just call setState are forbidden architecturally.

**Root cause / insight**: React Compiler's `set-state-in-effect` rule treats effect-driven `setState` as a smell because it usually indicates state that should be derived during render or state that depends on props/key. The "mounted" use case is the exception, but the rule has no carve-out. The idiomatic React 18+ alternative is `useSyncExternalStore` with a no-op subscribe and split server/client snapshots.

**Cara menerapkan di masa depan**: For ANY "am I mounted on the client?" gate, use this pattern instead of `useState+useEffect`:
```ts
const subscribe = () => () => {}                  // never re-subscribes, never emits
const getClientSnapshot = () => true              // client always sees true
const getServerSnapshot = () => false             // SSR always sees false

function useMounted(): boolean {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)
}
```
- Module-level `subscribe` / `getClientSnapshot` / `getServerSnapshot` (NOT inline in the hook) — React requires stable references for `useSyncExternalStore` correctness
- Returns `false` on server, `true` on client after first render — exactly the same semantics as the `useState+useEffect` pattern
- Zero setState-in-effect → React Compiler clean
- Use the returned bool to gate any UI that would otherwise hydration-mismatch (icon shape, label text, theme-derived class)

**Proven at**: session-023 (2026-04-15). `src/components/layout/ThemeToggle.tsx` — `useMounted()` wraps the entire toggle's mount-aware rendering. Lint clean, hydration safe.

---

### LESSON-065: Tailwind v4 CSS-var single-file design overhaul — `globals.css` is the only switching point

**Kategori**: Tailwind | Design | Workflow

**Sesi**: session-023
**Tanggal**: 2026-04-15

**Konteks**: When the project needs a complete visual identity change (palette, typography, dark mode) without touching individual components.

**Apa yang terjadi**: Switched the KKA project from a navy-and-muted-gold light-only palette to a pure B&W palette with light + dark variants. Total components touched outside `globals.css`: **3** (layout.tsx for fonts/provider, Sidebar.tsx + MobileShell.tsx for theme toggle slot). The other ~50+ component files using `text-ink`, `bg-canvas`, `border-grid`, `text-accent`, etc. **automatically adapted** with zero edits.

**Root cause / insight**: Tailwind v4's `@theme inline` block binds utility classes to CSS custom properties via a single layer of indirection:
```css
:root { --canvas: #fafdff; --ink: #0a0a0c; ... }
.dark { --canvas: #000004; --ink: #fafdff; ... }
@theme inline {
  --color-canvas: var(--canvas);    /* Tailwind utility bg-canvas reads this */
  --color-ink: var(--ink);          /* text-ink reads this */
  ...
}
```
When a component uses `class="bg-canvas text-ink"`, Tailwind generates CSS that resolves through `var(--color-canvas)` → `var(--canvas)` → `#fafdff` (light) or `#000004` (dark). Changing `:root` and `.dark` rewrites resolves at runtime via CSS cascade — no rebuild, no per-component change.

**Cara menerapkan di masa depan**:
1. **Discipline**: every color, font, radius, spacing token in the project should be declared as CSS var in `globals.css`. Components reference utility classes that resolve to tokens — never hardcode `#hex` colors in component files.
2. **Dark mode pattern**: declare `:root` (light) + `.dark` (dark) blocks with the **same variable names** but different values. Wrap app with `next-themes` `ThemeProvider attribute="class"` so the `.dark` class flips on `<html>`.
3. **Redesign workflow**: when changing visual identity, edit `globals.css` ONLY. Run dev server, click through pages — every component should adapt. If a component looks unchanged, that means it has hardcoded colors → grep + fix.
4. **Audit before redesign**: `grep -r "text-blue\|text-red\|bg-#" src/components/` to find any leaked hardcoded colors that won't adapt to the var swap.

**Proven at**: session-023 (2026-04-15). Total `globals.css` rewrite + 3 component touches → entire 34-page app re-themed end-to-end. Live deploy verified with both light and dark modes serving correctly via `color-scheme: light | dark` per `<html>` class state.

---

## Session 024 — 2026-04-15

### LESSON-066: Audit-first methodology for opaque export formats — generate static analyzer before coding fixes

**Kategori**: Workflow | Excel | Anti-pattern

**Sesi**: session-024
**Tanggal**: 2026-04-15

**Konteks**: When asked to "fix" or "improve" an export format whose current state is opaque (binary file, large template, multi-sheet workbook). Common failure mode: jumping to implementation without understanding the actual gap.

**Apa yang terjadi**: User requested comprehensive review/improvement of the .xlsx export to ensure all website pages correspond to Excel sheets with formulas. Initial impulse was to start coding new sheet generation. Instead, scoped Phase 0 = AUDIT: wrote `scripts/audit-export.py` that enumerates template sheets, cross-references with `nav-tree.ts`, counts formulas/values per sheet, and produces a markdown punch list.

**Root cause / insight**: The audit revealed: (a) all 29 website nav pages were ALREADY mapped to existing template sheets, (b) 3,084 formulas were ALREADY preserved, (c) only 5 visibility mismatches needed fixing (Phase A, low-risk, ~10 lines), (d) extended-catalog overflow was the real complex gap (Phase B, deferred to Session 025). Without the audit, we would have rewritten the export from scratch — wasted 6+ hours on already-working code.

**Cara menerapkan di masa depan**:
1. **For ANY export-format work**: write a static analyzer FIRST as a separate script (`scripts/audit-*.py` or `.ts`). Output should be a markdown report enumerable by section.
2. **Audit dimensions for export work**: (a) target item count vs source item count, (b) per-target visibility/state, (c) per-target value/formula coverage, (d) cross-reference integrity, (e) "junk" items not in source.
3. **Commit the audit script** — re-runnable when source changes (new website page, new template version). Prevents regression to "blind implementation" anti-pattern.
4. **Score the audit**: convert findings into 4 phases by complexity (Phase A = quick fix, Phase B = design needed, Phase C = manual verification, Phase D = future work). Implement Phase A in the same session (proves audit value), defer B/C/D with concrete next-session plans.
5. **Counter-indicator**: if the audit finds ZERO gaps, you've validated the current state is correct — that itself is valuable. The audit is never wasted.

**Proven at**: session-024 (2026-04-15). `scripts/audit-export.py` ran in 2 seconds, produced complete punch list. Phase A (5 visibility fixes) shipped same session. Phase B (extended catalog) properly scoped for Session 025 with informed approach decision (E3 over A based on audit's "244 cross-sheet refs across 23 sheets" finding).

---

## Session 025 — 2026-04-15

### LESSON-067: Synthetic-row write + subtotal append > row insertion + auto-shift for Excel modifications with cross-sheet refs

**Kategori**: Excel | Anti-pattern | Design

**Sesi**: session-025
**Tanggal**: 2026-04-15

**Konteks**: When an Excel template needs to grow (more leaf rows in a section) and downstream cross-sheet formulas reference cells in the original template by absolute coordinate.

**Apa yang terjadi**: User asked for extended catalog accounts (BS rows beyond template baseline) to flow into all subtotals + downstream formulas. Initial instinct: insert rows + auto-shift dependent formulas (Approach A). Audit revealed: 244 cross-sheet formulas across 23 sheets reference BS cells, mixing `SUM(D8:D14)` (auto-extends in Excel native) with `+D38+D39` and `'BS'!D27` (do NOT auto-extend; some don't shift even within ExcelJS row insertion). Approach A would silently break ~30-50 formulas.

**Root cause / insight**: ExcelJS `worksheet.spliceRows(at, 0, [...])` does row insertion but its formula-shift behavior is incomplete:
- WITHIN-sheet formulas: usually shifted correctly for SUM ranges, NOT shifted for explicit `+D38+D39` style
- CROSS-sheet formulas: NOT shifted (the formula text in OTHER sheets pointing to this sheet retains old row numbers)
- Result: dozens of silently-broken formulas after a single row insert. Validation requires manual inspection of every dependent formula × every insertion point.

The safer approach (E3): use synthetic row numbers ALREADY pre-allocated in the catalog (e.g., excelRow 100-139 for section X). Write extended account values directly to those rows in the main sheet (no row shift, no formula breakage). For each section with extended accounts, APPEND `+SUM(<col>{start}:<col>{end})` to the section's subtotal cell formula — only modification is one APPEND per section per year column.

**Cara menerapkan di masa depan**:
1. **Default to Approach E3** for any Excel template modification where downstream cross-sheet refs exist. Insert-and-shift only when (a) there are <5 cross-sheet refs, (b) all use SUM(range) style, (c) you can validate every reference manually post-insert.
2. **Pre-allocate synthetic row ranges in the catalog** — design pattern that enables E3. Each section gets a dedicated extended-row range (100-139, 140-159, 200-219, etc.) declared at catalog-design time.
3. **Subtotal append handling**: read existing cell value, detect shape (formula object `{formula}`, raw string `=...`, hardcoded number, empty), append `+SUM(...)` per shape. Always write back as `{ formula: '...' }` ExcelJS object.
4. **Defensive for shared subtotal rows**: when 2+ sections feed the same subtotal cell (e.g., BS row 25 = Total Non-Current Assets sums fixed_assets + intangible + other_non_current), append once per section that has extended accounts. Each appends its own SUM term.
5. **Idempotency**: if section has no extended accounts, do nothing — `SUM(empty_range)` = 0 = benign no-op even if accidentally appended.

**Proven at**: session-025 (2026-04-15). `src/lib/export/export-xlsx.ts` `injectExtendedBsAccounts` + `extendBsSectionSubtotals`. 7 tests cover happy + edge cases. 846/846 total tests pass; 244 cross-sheet refs across 23 sheets all preserved untouched.

---

### LESSON-068: Catalog design with pre-allocated synthetic excelRow ranges per section enables append-only export modifications

**Kategori**: Design | Excel | Workflow

**Sesi**: session-025
**Tanggal**: 2026-04-15

**Konteks**: When designing a dynamic catalog system that maps user-added accounts to Excel cells, with the constraint that the underlying Excel template has formula dependencies that cannot easily be restructured.

**Apa yang terjadi**: BS catalog (Session 019) pre-allocated `excelRow` ranges per section: original accounts get template row numbers (8-14, 31-34, 38-39, 43-47), extended accounts get synthetic numbers (100-139 for current_assets, 140-159 for intangible, 160-199 for other_non_current, 200-219 for current_liabilities, 220-239 for non_current_liabilities, 300-319 for equity). Session 025 leveraged this design to inject extended accounts directly to those synthetic rows in the main BS sheet — the synthetic range is empty in the template (no collision) and far enough from original rows (8-49) to avoid any accidental overlap.

**Root cause / insight**: Pre-allocation of row ranges turns a "we need to create new rows" problem (insertion + shift) into a "we have empty space waiting for values" problem (write + extend subtotal). The catalog acts as a contract: "section X gets rows {start}-{end}, never more". Even if the catalog grows in future, as long as new entries stay within the allocated range, the export logic never changes.

**Cara menerapkan di masa depan**:
1. **For any catalog-driven export**: at catalog design time, allocate per-section `excelRow` ranges with generous slack (40-100 slot ranges).
2. **Document the allocation**: in catalog source file, leave comment `// Section X: rows {start}-{end} reserved for extended accounts (max N additional)`.
3. **Validate at catalog level**: lint or runtime assertion that every catalog entry's `excelRow` falls within either its section's original-row set or extended-row range.
4. **Match in template**: ensure the underlying Excel template has no formulas/values in the synthetic range — leave it as a dedicated "extended zone".
5. **Consequence**: future catalog growth (adding more accounts within range) requires ZERO export-code changes. Only adding NEW sections or exceeding range capacity needs export updates.

**Proven at**: session-025 (2026-04-15). 6 BS sections each with 20-40 reserved synthetic rows; current catalog uses 7-13 per section, leaving 50-90% headroom. Same pattern observed in IS catalog (rows 100-539) and FA catalog (rows 100-113), enabling Session 026 to follow same E3 approach without surprises.

---

### LESSON-069: When superseded, DELETE the old code path entirely — don't leave dead exports/tests "for compat"

**Kategori**: Workflow | Anti-pattern

**Sesi**: session-025
**Tanggal**: 2026-04-15

**Konteks**: When introducing a better implementation of an existing feature, with tests covering the old behavior.

**Apa yang terjadi**: Initially considered keeping `addBsDetailSheet()` exported "in case external consumers need it" while removing it from the main export pipeline. Reflexively cautious. After confirming zero callers in production code, deleted: function (110+ lines), 3 obsolete tests, RINCIAN visibility entry, 2 unused imports. Net effect: cleaner codebase, no dead code, easier mental model for next maintainer.

**Root cause / insight**: "Keep for compat" without actual compat consumers is dead code that compounds. Each session that touches the file requires re-reading the dead code to confirm it's still safe. Tests for dead code add CI time + false alarm potential. Imports for dead code create unnecessary module dependencies. Branch protection (commit history) IS the compat layer — if anyone genuinely needs the old behavior, recover from git.

**Cara menerapkan di masa depan**:
1. **Hard deletion when superseded**: when a new implementation replaces an old one entirely (new feature covers all old use cases), DELETE old code in the same commit/PR.
2. **Citable recovery point**: in the deletion commit message, name the SHA before deletion (e.g., "addBsDetailSheet deleted; recover from git history at 97863cd or earlier"). Audit trail without keeping live code.
3. **Remove ALL traces**: function, exports, tests, imports, references in comments. Run grep before commit: `grep -r "deletedFunctionName" src/ __tests__/` should return zero.
4. **Counter-indicator**: keep old code only if (a) public API used by external consumers (npm package, plugin system), or (b) intentionally side-by-side for A/B comparison with planned removal date.
5. **Test deletion is mandatory**: if old behavior tests stay green against new implementation, that's not "compat tested" — that's the new implementation accidentally supporting old API surface, masking design clarity.

**Proven at**: session-025 (2026-04-15). `addBsDetailSheet` + 3 RINCIAN tests + visibility set entry + 2 imports all deleted. Net file diff: +289 / −221 lines (+68 net for new feature even after −110 deletion). Clean code base, no dead branches.

---
