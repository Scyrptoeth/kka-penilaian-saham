# Session 001 — Scaffold & Foundation

**Date**: 2026-04-11
**Scope**: Full Phase 1 (Scope C) — scaffolding + types + HOME page + calculation engine TDD + deploy
**Branch**: main
**Duration**: ~1 session (single continuous)

## Goals (dari plan.md awal sesi)

10-task plan:

- [x] Task 1 — Setup working folder & place skill
- [x] Task 2 — create-next-app
- [x] Task 3 — Install extra deps
- [x] Task 4 — Folder structure + Vitest config + scripts
- [x] Task 5 — Design system (IBM Plex fonts + palette + Tailwind theme)
- [x] Task 6 — Python Excel extractor
- [x] Task 7 — Run extractor + types
- [x] Task 8 — HOME page + Zustand store + layout skeleton
- [x] Task 9 — Calculation engine TDD (balance-sheet + income-statement)
- [x] Task 10 — Verify & commit

Plus bonus tasks beyond initial plan:
- [x] GitHub push
- [x] Vercel production deploy
- [x] Unified skill `/start-kka-penilaian-saham` kristalisasi (menggabungkan /start-dev + project context + lessons)
- [x] Skill `/update-kka-penilaian-saham` (dokumen ini sendiri)
- [x] Project memory entry di `~/.claude/projects/.../memory/project_kka_penilaian_saham.md`

## Delivered

### Scaffolding & Dependencies
- Next.js 16.2.3 (App Router) + React 19.2.4 + TypeScript strict
- Tailwind v4 dengan `@tailwindcss/postcss` (CSS-first `@theme inline` — **no tailwind.config.ts**)
- Zustand 5 + persist middleware (localStorage)
- react-hook-form 7 + @hookform/resolvers + zod 4
- **ExcelJS 4** menggantikan SheetJS karena SheetJS npm ada 2 high-severity vulns (prototype pollution + ReDoS)
- Recharts 3 (ready, belum dipakai)
- Vitest 3 + @testing-library/react + @testing-library/jest-dom + jsdom
- Turbopack dev/build enabled

### Design System
- Fonts: `IBM Plex Sans` + `IBM Plex Mono` via `next/font/google` (weights 400/500/600/700 dan 400/500/600)
- Palette CSS vars di `src/app/globals.css`:
  - `--canvas: #fafaf9` (warm off-white)
  - `--ink: #0a1628` (deep navy)
  - `--accent: #b8860b` (muted gold, DJP-adjacent)
  - `--positive: #15803d` (emerald-700)
  - `--negative: #b91c1c` (red-700)
- Tailwind v4 `@theme inline` block meng-export CSS vars jadi utilities (`bg-canvas`, `text-ink`, `border-grid`)
- Sharp 4px border-radius konsisten (bukan rounded-2xl)
- `tabular-nums` default via `font-feature-settings: "tnum", "ss01"`
- `prefers-reduced-motion` respected
- Focus-visible 2px ring dengan offset

### Application Shell
- `src/components/layout/Shell.tsx` — flex sidebar + main
- `src/components/layout/Sidebar.tsx` — 6 nav groups (Input, Historis, Analisis, Proyeksi, Penilaian, Dashboard) + privacy badge
- `src/components/layout/Placeholder.tsx` — empty-state template untuk halaman belum terbangun

### HOME Page
- `src/app/page.tsx` (Server Component) wraps `HomeForm` (Client Component)
- `src/components/forms/HomeForm.tsx` — 7 field form:
  - Nama Perusahaan, NPWP, Jenis Perusahaan, Objek Penilaian
  - Jumlah Saham Beredar, Jumlah Saham yang Dinilai, Tahun Transaksi
- RHF + zodResolver, mode `'onBlur'`, aria-invalid, error display
- **`useWatch({ control, name })`** per field (bukan `watch()`) untuk compat dengan React Compiler
- Derived values live dihitung di render:
  - Proporsi Saham = jumlahDinilai / jumlahBeredar
  - Cut-off Date = 31 Des (tahunTransaksi - 1)
  - Akhir Periode Proyeksi Pertama = 31 Des (tahunTransaksi)
- Auto-save ke Zustand store saat submit, persist ke localStorage via Zustand middleware
- Hydration flag (`_hasHydrated`) untuk cegah SSR mismatch

### Placeholder Routes
- `/historical/[[...slug]]` — catch-all placeholder
- `/analysis/[[...slug]]` — catch-all placeholder
- `/projection/[[...slug]]` — catch-all placeholder
- `/valuation/[[...slug]]` — catch-all placeholder
- `/dashboard` — explicit dashboard placeholder

### Zustand Store
- `src/lib/store/useKkaStore.ts` — store dengan `persist` + `createJSONStorage(() => localStorage)`
- Key: `kka-penilaian-saham:v1`
- `partialize` hanya simpan `home` (bukan flag hidratasi)
- Pure helper functions: `computeProporsiSaham`, `computeCutOffDate`, `computeAkhirPeriodeProyeksiPertama`

### Zod Schema
- `src/lib/schemas/home.ts` — `homeInputsSchema` dengan `.refine()` untuk cross-field validation (saham dinilai ≤ saham beredar)
- **Tidak pakai `.default()`** pada fields — menyebabkan TypeScript error di zodResolver (input type optional vs output type required)

### UI Primitives
- `src/components/ui/Button.tsx` — variant primary/ghost, uppercase tracking, sharp radius
- `src/components/ui/Input.tsx` — forwardRef, mono variant, aria-invalid styling
- `src/components/ui/Select.tsx` — forwardRef, aria-invalid styling
- `src/components/ui/Field.tsx` — label + hint + error wrapper dengan htmlFor association

### Python Excel Extractor
- `scripts/extract-fixtures.py` — openpyxl 3.1.5 dual-pass
- **Dual-pass pattern**: `data_only=True` untuk values, `data_only=False` untuk formulas, iterate parallel via `zip()`
- Output: 34 JSON files di `__tests__/fixtures/` (30 visible + 4 required hidden)
- Hidden required whitelist: `ACC PAYABLES`, `KEY DRIVERS`, `PROY ACC PAYABLES`, `ADJUSTMENT TANAH`
- Slug rule: `BALANCE SHEET` → `balance-sheet`, `DLOC(PFC)` → `dloc-pfc`
- Idempotent, re-runnable via `npm run extract:fixtures`

### TypeScript Types
- `src/types/financial.ts`:
  - `HomeInputs`, `HomeDerived`
  - `FourYearSeries`, `YearLabels`
  - `CommonSizeResult`, `HorizontalResult`, `MarginSet`
  - `JenisPerusahaan`, `ObjekPenilaian` union types
- `src/types/index.ts` barrel export

### Calculation Engine (TDD, pure functions)
- `src/lib/calculations/helpers.ts`:
  - `YearlySeries` (shared interface, single source of truth)
  - `ratioOfBase(value, base)` — IFERROR semantics (base=0 → 0)
  - `yoyChange(current, previous)` — throws on zero
  - `yoyChangeSafe(current, previous)` — IFERROR → 0
  - `average(values)` — throws on empty
  - `sumRange(values)`
- `src/lib/calculations/balance-sheet.ts`:
  - `commonSizeBalanceSheet(line, totalAssets)` — mirrors Excel `H..K = D..F / D..F$27`
  - `growthBalanceSheet(line)` — mirrors `N..Q = IFERROR((cur-prev)/prev, 0)`
- `src/lib/calculations/income-statement.ts`:
  - `yoyGrowthIncomeStatement(line)` — mirrors Revenue row YoY
  - `marginRatio(line, revenue)` — gross/operating/net margin
- `src/lib/calculations/index.ts` barrel (hoist shared types ke helpers.ts untuk avoid re-export conflict)

### Tests
- 21 tests passing, 3 files:
  - `__tests__/lib/calculations/helpers.test.ts` — 10 tests (primitives + edge cases)
  - `__tests__/lib/calculations/balance-sheet.test.ts` — 4 tests (fixture-based)
  - `__tests__/lib/calculations/income-statement.test.ts` — 7 tests (revenue YoY + margins)
- Precision: `toBeCloseTo(expected, 12)` — 12 decimal digits vs Excel computed values
- Test helper `__tests__/helpers/fixture.ts` — `num(cellsIndex, 'B4')` pattern

### Config Files
- `vitest.config.ts` — jsdom env, `@` alias, setup file
- `vitest.setup.ts` — `@testing-library/jest-dom/vitest` matchers
- `next.config.ts` — `turbopack.root: path.resolve(__dirname)` untuk silence multi-lockfile warning
- `tsconfig.json` — exclude `vitest.config.ts`, `vitest.setup.ts`, `__tests__` (hindari rolldown vs rollup Vite type conflict di Next build)
- `package.json` scripts: `test`, `test:watch`, `test:ui`, `typecheck`, `extract:fixtures`

### Session Persistence
- `design.md` — architecture decisions
- `plan.md` — 10-task session plan
- `progress.md` — delivered state
- **`history/session-001-scaffold-foundation.md`** (this file)
- **`lessons-learned.md`** (10 initial lessons)

### Skill Infrastructure
- `/Users/persiapantubel/.claude/skills/start-kka-penilaian-saham/SKILL.md` — 454 lines, unified loader
- `/Users/persiapantubel/.claude/skills/update-kka-penilaian-saham/SKILL.md` — context loader + evaluator + lesson tracker (this skill)
- Sync copy di `/Users/persiapantubel/Desktop/claude/superpowers/.claude/skills/start-kka-penilaian-saham/SKILL.md`
- Memory entry `project_kka_penilaian_saham.md` + MEMORY.md index update

### Deployment
- GitHub push ke `github.com/Scyrptoeth/kka-penilaian-saham` (main branch)
- Vercel production: `https://kka-penilaian-saham.vercel.app`
- Deploy time: 29s build + 44s total
- Vercel scope: `scyrptoeths-projects`
- Smoke test pass: HOME, /dashboard, /historical/* semua 200 OK

## Verification

```
Tests:     21 / 21 passing (3 files)
Build:     ✅ Compiled 3.6s (Turbopack)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ eslint zero warnings (React Compiler enabled)
npm audit: ✅ 0 high/critical vulnerabilities
Deploy:    ✅ https://kka-penilaian-saham.vercel.app (HTTP 200)
```

## Stats

- Commits di repo: 4 (initial Next, feat scaffold, merge README, upcoming wrap-up)
- Files created this session: 40+ (incl. fixtures, tests, source, config, docs)
- Fixture files: 34 JSON (30 visible + 4 hidden sheets)
- Test cases: 21
- Routes: 6 (1 static HOME + 5 placeholder including catch-alls)
- Lines of code (src + __tests__): ~1,500
- Python script: 1 (extract-fixtures.py, ~150 lines)

## Deviations from Plan

1. **Tailwind config file**: Plan menyebut `tailwind.config.ts` tapi Tailwind v4 menggunakan CSS-first `@theme` directive. Tidak ada file config terpisah — ini pattern resmi Tailwind v4, bukan deviation negatif.

2. **xlsx → ExcelJS**: Plan menyebut SheetJS (`xlsx`). Diganti ke ExcelJS karena `npm audit` menunjukkan 2 high-severity vulns pada SheetJS npm. Keputusan security-first.

3. **Skill location**: Plan menyebut project-scoped `.claude/skills/` di `superpowers/` folder. Akhirnya **dua lokasi disync**: global `~/.claude/skills/` (primary) dan project-scoped (legacy for compat). Memory entry di-add.

4. **Unified skill kristalisasi**: Task tambahan di luar plan awal — user request setelah Task 10 selesai. Dibuat unified skill yang merge `/start-dev` + project context.

5. **Update skill**: Task tambahan lebih lanjut — user request `/update-kka-penilaian-saham`. Skill + initial history + initial lessons-learned dibuat.

## Deferred (to future sessions)

### Calculation modules (deferred karena plan eksplisit "jangan implementasi semua")
- `cash-flow.ts`
- `ratios.ts` (Financial Ratio)
- `fcf.ts`
- `noplat.ts`
- `roic.ts`
- `wacc.ts`
- `dcf.ts`
- `aam.ts`
- `eem.ts`

### Non-calculation features
- Historical Balance Sheet **table component** + page rendering
- Historical Income Statement **table component** + page rendering
- Cash Flow Statement rendering
- Financial Ratio rendering
- Dashboard with Recharts
- Export ke .xlsx via ExcelJS (`lib/export/` masih kosong)
- Formula transparency UI (tooltip/popover show Excel formula)
- Dark mode toggle
- Mobile-responsive testing untuk financial tables
- DLOM / DLOC kuisioner forms
- Proyeksi sheets (PROY LR, PROY BS, PROY CF, PROY NOPLAT)
- Valuation methods rendering (WACC, DCF, AAM, EEM, Borrowing Capacity, DDM)

## Lessons Extracted

Total 10 lessons dari sesi ini. Detail di [lessons-learned.md](../lessons-learned.md):

- LESSON-001: Next.js 16 bukan Next.js dari training data — selalu cek docs di node_modules
- LESSON-002: Tailwind v4 menggunakan `@theme inline` di CSS, bukan tailwind.config.ts
- LESSON-003: SheetJS npm community version punya 2 high-severity vulns — gunakan ExcelJS
- LESSON-004: React Hook Form `watch()` incompatible dengan React Compiler — pakai `useWatch`
- LESSON-005: Zod 4 `.default()` pada field bikin TypeScript error dengan zodResolver
- LESSON-006: `export *` dari multiple modules gagal type-check kalau ada duplicate type name
- LESSON-007: Vitest config harus di-exclude dari Next.js tsconfig untuk hindari Vite version conflict
- LESSON-008: Multi-lockfile di home dir butuh `turbopack.root` eksplisit di next.config.ts
- LESSON-009: openpyxl butuh dual-pass untuk extract values + formulas secara bersamaan
- LESSON-010: Excel column labels bisa misleading (contoh INCOME STATEMENT "COMMON SIZE" yang isinya YoY growth) — test terhadap formula, bukan label

## Files & Components Added/Modified

```
## New source files
src/app/layout.tsx                                    [MODIFIED — IBM Plex + Shell]
src/app/globals.css                                   [MODIFIED — palette + @theme]
src/app/page.tsx                                      [MODIFIED — HomeForm wrapper]
src/app/historical/[[...slug]]/page.tsx               [NEW — placeholder]
src/app/analysis/[[...slug]]/page.tsx                 [NEW — placeholder]
src/app/projection/[[...slug]]/page.tsx               [NEW — placeholder]
src/app/valuation/[[...slug]]/page.tsx                [NEW — placeholder]
src/app/dashboard/page.tsx                            [NEW — placeholder]
src/components/forms/HomeForm.tsx                     [NEW — RHF + Zustand + useWatch]
src/components/layout/Shell.tsx                       [NEW]
src/components/layout/Sidebar.tsx                     [NEW]
src/components/layout/Placeholder.tsx                 [NEW]
src/components/ui/Button.tsx                          [NEW]
src/components/ui/Field.tsx                           [NEW]
src/components/ui/Input.tsx                           [NEW]
src/components/ui/Select.tsx                          [NEW]
src/lib/calculations/helpers.ts                       [NEW — primitives + YearlySeries]
src/lib/calculations/balance-sheet.ts                 [NEW]
src/lib/calculations/income-statement.ts              [NEW]
src/lib/calculations/index.ts                         [NEW — barrel]
src/lib/schemas/home.ts                               [NEW]
src/lib/store/useKkaStore.ts                         [NEW]
src/lib/utils/cn.ts                                   [NEW]
src/types/financial.ts                                [NEW]
src/types/index.ts                                    [NEW — barrel]

## Config
next.config.ts                                        [MODIFIED — turbopack.root]
tsconfig.json                                         [MODIFIED — exclude vitest + __tests__]
package.json                                          [MODIFIED — new scripts + deps]
vitest.config.ts                                      [NEW]
vitest.setup.ts                                       [NEW]

## Scripts
scripts/extract-fixtures.py                           [NEW — Python openpyxl dual-pass]

## Fixtures (34 files)
__tests__/fixtures/_index.json                        [NEW]
__tests__/fixtures/home.json                          [NEW]
__tests__/fixtures/balance-sheet.json                 [NEW]
__tests__/fixtures/income-statement.json              [NEW]
... (30+ more sheet fixtures)

## Tests
__tests__/helpers/fixture.ts                          [NEW — test helper]
__tests__/lib/calculations/helpers.test.ts            [NEW]
__tests__/lib/calculations/balance-sheet.test.ts      [NEW]
__tests__/lib/calculations/income-statement.test.ts   [NEW]

## Docs
design.md                                             [NEW]
plan.md                                               [NEW — updated throughout]
progress.md                                           [NEW]
history/session-001-scaffold-foundation.md            [NEW — this file]
lessons-learned.md                                    [NEW]
```

## Next Session Recommendation

Berdasarkan dependency chain Excel dan fondasi yang sudah ada:

1. **Historical Balance Sheet table** (`/historical/balance-sheet`)
   - Server Component page
   - `components/tables/BalanceSheetTable.tsx` — Client Component yang baca Zustand home + render
   - Leverage `commonSizeBalanceSheet` + `growthBalanceSheet` yang sudah ada
   - Sticky headers, `tabular-nums`, negative dalam parentheses, right-aligned
   - Mobile: wrap `overflow-x-auto`
   - Data input: perlu form untuk input 4-year historical data (belum ada) — atau bisa start dengan loading dari fixture untuk demo
2. **Historical Income Statement table** — pattern sama + `marginRatio` untuk kolom margin
3. **Cash Flow Statement** — butuh BS + IS + `ACC PAYABLES` hidden (fixture sudah ada)
4. **Financial Ratio** sheet — tambah `ratios.ts` helper + tests
5. **NOPLAT → FCF → ROIC** — valuation foundation chain
6. **Formula transparency UI** — tooltip/popover component reusable yang show Excel formula
7. **Input form untuk historical data** — 4-year data entry untuk BS + IS + CF + FA (pre-requisite untuk semua table rendering)

**Gating question untuk awal sesi 2**: User mau data input dulu (form untuk 4-year historical data) atau table rendering dari fixture dulu (demo mode)?
