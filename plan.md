# Plan — KKA Penilaian Saham (Session 1: Scope C)

Target: scaffolding + types + HOME page + calculation engine (balance-sheet + income-statement) dengan TDD, terverifikasi terhadap Excel ground truth.

## Tasks

### Task 1 — Setup working folder & place skill ✅
- Backup `kka-penilaian-saham.xlsx` ke `/tmp/kka-staging/`
- Install SKILL.md ke `/Users/persiapantubel/Desktop/claude/superpowers/.claude/skills/start-kka-penilaian-saham/SKILL.md`
- Bersihkan working folder untuk create-next-app
- **Verify**: skill terbaca di lokasi baru, working folder kosong

### Task 2 — create-next-app ✅
- `npx create-next-app@latest kka-penilaian-saham --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --use-npm --turbopack`
- Restore xlsx ke project folder
- **Verify**: `ls` shows Next.js structure + xlsx

### Task 3 — Install extra deps ✅
- Runtime: zustand, react-hook-form, @hookform/resolvers, zod, exceljs, recharts, clsx, tailwind-merge
- Dev: vitest, @vitejs/plugin-react, @testing-library/react, @testing-library/jest-dom, @testing-library/user-event, jsdom, @types/node
- **Verify**: `npm audit` zero high vulnerabilities

### Task 4 — Folder structure + Vitest config + scripts
- Create: `src/app/{historical,analysis,projection,valuation,dashboard}`, `src/components/{ui,tables,forms,charts,layout}`, `src/lib/{calculations,store,export,utils}`, `src/hooks`, `src/types`, `__tests__/{fixtures,lib/calculations}`, `scripts/`
- Create `vitest.config.ts` (jsdom, path alias `@`, setup file)
- Create `vitest.setup.ts` (jest-dom matchers)
- Add scripts to `package.json`: `test`, `test:ui`, `extract:fixtures`
- Create `src/lib/utils/cn.ts` (clsx + tailwind-merge helper)
- **Verify**: `npm test -- --run` runs (even with zero tests), Vitest starts without errors

### Task 5 — Design system
- `src/app/layout.tsx`: IBM Plex Sans + IBM Plex Mono via `next/font/google`
- `src/app/globals.css`: CSS variables palette + reduced-motion respect + base typography + tabular-nums on financial contexts
- `tailwind.config.ts` (or `@theme` in Next 15 Tailwind v4): extend colors from CSS vars, fonts `sans: var(--font-sans)`, `mono: var(--font-mono)`, custom radii
- **Verify**: build succeeds, fonts visible in layout

### Task 6 — Python Excel extractor
- `scripts/extract-fixtures.py`: iterates semua visible + 4 hidden sheets, dumps setiap cell (addr, value, formula, number_format, data_type) ke JSON
- Output: `__tests__/fixtures/{sheet-slug}.json` (one file per sheet) + `__tests__/fixtures/_index.json` (sheet metadata)
- Slug rule: lowercase, spaces + parens → `-`, e.g. `BALANCE SHEET` → `balance-sheet`, `DLOC(PFC)` → `dloc-pfc`
- **Verify**: script runs, produces N files, can be re-run idempotently

### Task 7 — Run extractor + define types
- Execute `python3 scripts/extract-fixtures.py`
- Inspect fixture output untuk HOME, BALANCE SHEET, INCOME STATEMENT
- Create `src/types/financial.ts`:
  - `HomeInputs` (company metadata, NPWP, shares, cutoff date, share proportion, business type, DLOM/DLOC summary)
  - `BalanceSheetRow`, `BalanceSheetData` (4 years historis)
  - `IncomeStatementRow`, `IncomeStatementData`
  - `PeriodLabel`, `Currency` helpers
- Export barrel `src/types/index.ts`
- **Verify**: `tsc --noEmit` clean

### Task 8 — HOME page + Zustand store + layout skeleton
- `src/lib/store/useKkaStore.ts`: Zustand store with `persist` middleware, state shape `{ home: HomeInputs, balanceSheet: ..., incomeStatement: ... }`, action `setHome(partial)`
- `src/lib/schemas/home.ts`: Zod schema matching HomeInputs
- `src/components/layout/Sidebar.tsx`: sidebar nav dengan sheet groups (Input, Historis, Analisis, Proyeksi, Penilaian, Dashboard)
- `src/components/layout/Shell.tsx`: app shell wrapping sidebar + main
- `src/components/forms/HomeForm.tsx` (`'use client'`): RHF + zodResolver, inputs, syncs to Zustand
- `src/app/layout.tsx`: use Shell
- `src/app/page.tsx` (Server Component): HomeForm inside
- Empty-state pages for other route groups
- **Verify**: build succeeds, dev server renders HOME, form submissions persist (visual check)

### Task 9 — Calculation engine TDD
- **balance-sheet.ts**:
  - RED: write test `common-size calculation matches Excel fixture` — fails because function doesn't exist yet
  - GREEN: implement `computeCommonSize(data)` — each row / total assets
  - RED: test `growth rate year-over-year matches fixture`
  - GREEN: implement `computeGrowth(data)`
  - REFACTOR: extract shared helpers into `lib/calculations/helpers.ts`
- **income-statement.ts**:
  - RED: test `common-size vs revenue matches fixture`
  - GREEN: implement `computeCommonSizeIS(data)`
  - RED: test `horizontal analysis (YoY delta %) matches fixture`
  - GREEN: implement `computeHorizontal(data)`
  - RED: test `margin ratios (gross/operating/net) match fixture`
  - GREEN: implement `computeMargins(data)`
  - REFACTOR
- Each calculation function: pure, deterministic, zero side effects
- **Verify**: `npm test -- --run` shows all tests green, zero warnings

### Task 10 — Verify & commit
- `npm run build 2>&1 | tail -25` — zero errors
- `npm test -- --run 2>&1 | tail -25` — all green
- `npm run lint 2>&1 | tail -20` — clean
- `npx tsc --noEmit 2>&1 | tail -20` — clean
- Write `progress.md` with session summary + next steps
- Git: `git checkout -b feat/scaffold-and-foundation` → stage all → commit `feat: scaffold project + HOME page + calculation engine (balance sheet + income statement) with TDD fixtures`
- **Verify**: git log shows clean commit

## Progress
- [x] Task 1 — Setup folder & place skill
- [x] Task 2 — create-next-app
- [x] Task 3 — Install deps
- [x] Task 4 — Folder structure + Vitest config
- [x] Task 5 — Design system
- [x] Task 6 — Python Excel extractor
- [x] Task 7 — Run extractor + types
- [x] Task 8 — HOME page + store + layout
- [x] Task 9 — Calculation engine TDD
- [x] Task 10 — Verify & commit
