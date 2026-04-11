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

## Threshold untuk Promote ke `/start-kka-penilaian-saham`

Lesson berikut sudah di-promote ke section 8 "Tech Stack Gotchas" di
`~/.claude/skills/start-kka-penilaian-saham/SKILL.md` karena relevan
untuk 3+ sesi ke depan:

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

Semua 10 lesson dari session-001 di-promote karena mereka semua adalah
stack-level gotchas yang akan berulang di sesi-sesi calculation module
berikutnya.
