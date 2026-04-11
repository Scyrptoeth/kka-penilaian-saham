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

LESSON-014, 015, 017, 020, 022 **TIDAK** di-promote — workflow/architecture
insights yang general ke project lain tapi terlalu luas untuk section 8
(yang fokus KKA-specific gotchas). Tersimpan di lessons-learned saja.

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
