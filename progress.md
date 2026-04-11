# Progress — KKA Penilaian Saham

## Index

| # | Session | Topic | Status | History |
|---|---|---|---|---|
| 001 | 2026-04-11 | Scaffold + Foundation (Phase 1) | ✅ Shipped | [session-001](history/session-001-scaffold-foundation.md) |
| 002 | 2026-04-11 | Phase 2A — 6 calc engines | ✅ Shipped | [session-002](history/session-002-phase2-calc-engines.md) |
| 003 | 2026-04-11 | Phase 2A.5 — Harden calc engine (YearKeyedSeries + Zod + adapters) | ✅ Shipped | [session-003](history/session-003-harden-calc-engine.md) |
| 004 | 2026-04-11 | Phase 2B P1 — UI financial tables + navigation | ✅ Shipped | inline |
| 005 | 2026-04-11 | Phase 2B.6 — Systematization pass (refactor-only) | ✅ Shipped | inline |
| 006 | 2026-04-11 | Phase 2B.6.1 — Declarative derive primitives | ✅ Shipped | inline |

## Current State Snapshot (latest)

- **Branch**: `main` (synced with `origin/main`)
- **Tests**: 107 / 107 passing across 15 files
- **Build**: ✅ clean, zero errors, zero warnings, 4 new P1 pages prerendered as static
- **Lint**: ✅ clean
- **Typecheck**: ✅ `tsc --noEmit` exit 0
- **Live**: https://kka-penilaian-saham.vercel.app (HTTP 200)
- **Pipeline proven end-to-end**: `seed fixture → adapter → Zod validator → calc engine → manifest builder → <FinancialTable>` — all 4 P1 pages render real workbook data with formula tooltips.

## Session 1 — 2026-04-11 (Scope C: Full Phase 1)

### Delivered

**Scaffolding**
- Next.js 16.2.3 (App Router) + React 19.2 + TypeScript strict
- Tailwind v4 with `@theme` CSS-first configuration
- Zustand 5 + persist middleware (localStorage)
- react-hook-form 7 + zod 4 for type-safe forms
- ExcelJS 4 for future .xlsx export (zero known vulnerabilities — replaces SheetJS which has high-severity vulns)
- Vitest 3 + Testing Library + jsdom for TDD
- ESLint + React Compiler enabled, zero warnings
- Recharts 3 ready for dashboard

**Design system**
- IBM Plex Sans + IBM Plex Mono via `next/font/google`
- Custom palette: warm off-white canvas, deep navy ink, muted gold accent, emerald/red semantic
- CSS variables exposed via Tailwind `@theme inline`
- Sharp 4px radius (not rounded-2xl), tabular-nums on financial contexts
- `prefers-reduced-motion` respected
- Focus-visible rings, no `outline: none`
- Privacy badge in sidebar

**Excel ground truth pipeline**
- Python `scripts/extract-fixtures.py` using openpyxl 3.1.5
- Dual-pass extraction: computed values + raw formulas preserved
- Produced 34 sheet fixtures (30 visible + 4 required hidden): `ACC PAYABLES`, `KEY DRIVERS`, `PROY ACC PAYABLES`, `ADJUSTMENT TANAH`
- Irrelevant hidden sheets correctly skipped (e.g. `DAFTAR EMITEN 2023`, `KUISIONER`, `PASAR KESEBANDINGAN`, etc.)
- Fixtures committed to `__tests__/fixtures/` — idempotent, re-runnable

**Application skeleton**
- Shell + Sidebar layout with 6 navigation groups (Input, Historis, Analisis, Proyeksi, Penilaian, Dashboard)
- Routes: `/`, `/historical/[[...slug]]`, `/analysis/[[...slug]]`, `/projection/[[...slug]]`, `/valuation/[[...slug]]`, `/dashboard` — placeholders for unimplemented sheets
- **HOME page** (input master): server-component page + client-component form
  - RHF + zodResolver validation, error display, aria-invalid
  - Auto-sync to Zustand store on submit; hydration flag prevents SSR mismatch
  - Derived values computed live from `useWatch`: proporsi saham, cut-off date, akhir periode proyeksi — mirrors Excel HOME!B8/B10/B11 formulas
  - `useWatch` instead of `watch()` to satisfy React Compiler memoization

**Calculation engine (TDD, verified against Excel)**
- `src/lib/calculations/helpers.ts` — primitives: `ratioOfBase`, `yoyChange`, `yoyChangeSafe`, `average`, `sumRange`
- `src/lib/calculations/balance-sheet.ts` — `commonSizeBalanceSheet`, `growthBalanceSheet`
- `src/lib/calculations/income-statement.ts` — `yoyGrowthIncomeStatement`, `marginRatio`
- 21 tests total, all passing at **12 decimal digit precision** against extracted Excel ground truth:
  - Balance Sheet row 8 (Cash on Hands) common size matches `H8..K8` exactly
  - Balance Sheet row 8 growth matches `N8..Q8` exactly
  - Income Statement row 6 (Revenue) YoY matches both `H6..K6` and `M6..P6`
  - Gross / Operating / Net margin ratios for row 8 / 22 / 35 match Excel outputs
  - Helper primitives covered with edge cases (divide-by-zero, IFERROR semantics, empty array)

### Verification Results

```
Tests:     21 / 21 passing (3 files)
Build:     ✅ Compiled successfully, zero TypeScript errors
Lint:      ✅ Zero warnings
Typecheck: ✅ tsc --noEmit clean
```

### Session Stats

- Routes: 6 (1 static + 5 dynamic placeholders)
- Calculation functions: 7 pure functions
- Test cases: 21 (12-digit float precision against Excel)
- Fixture files: 34 sheets × ~30KB avg = ~1MB of ground truth
- Dependencies: 0 high-severity vulnerabilities

### Next Session — Priority Order

1. **Historical Balance Sheet table** — render 4-year historical data with common-size + growth columns, all computed via calculation engine, styled with sticky header + tabular-nums
2. **Historical Income Statement table** — same pattern, leverage `marginRatio` for gross/operating/net columns
3. **Cash Flow Statement** (`CASH FLOW STATEMENT` sheet) — dependencies: Balance Sheet + Income Statement + ACC PAYABLES (hidden)
4. **Financial Ratio** sheet — leverage existing calculations + new ratio helpers
5. **NOPLAT / FCF / ROIC** — builds toward valuation chain

### Deferred (not in scope this session)

- Projection sheets (PROY LR, PROY BS, PROY CF, PROY NOPLAT) — requires KEY DRIVERS sheet
- WACC / Discount Rate — CAPM model with beta, Ke, Kd
- DCF / AAM / EEM valuation methods
- DLOM / DLOC kuisioner forms
- Dashboard charts with Recharts
- Export to .xlsx via ExcelJS
- Dark mode toggle
- Vercel deploy (handled separately post-session)

### Architectural Decisions

- **Fixtures as ground truth** — any future calculation module follows same TDD pattern: read fixture cell values, compute via pure function, assert match. Re-run `npm run extract:fixtures` if workbook updates.
- **Server components by default** — HomeForm is the only `'use client'` so far (needed for RHF + Zustand). Sidebar, Shell, pages stay on server.
- **Zustand partialize** — persist only `home` key, not hydration flag, to keep localStorage clean.
- **Optional catch-all routes** `[[...slug]]` — one placeholder page per section covers all unimplemented sheets under that section.

---

## Session 2A — 2026-04-11 (Phase 2: Calc Engines)

### Delivered

**6 new calculation modules** (all pure functions, TDD against Excel fixtures at 12-decimal precision):

- `src/lib/calculations/fixed-asset.ts` — `computeFixedAssetSchedule`: per-category beginning/additions/disposals/ending + depreciation + net value across 6 asset categories (Land, Building, Equipment & Laboratory, Vehicle & Heavy Equipment, Office Inventory, Electrical Installation). Totals exposed for downstream FCF/CashFlow consumption.
- `src/lib/calculations/noplat.ts` — `computeNoplat`: EBIT = PBT + InterestExp + InterestInc + NonOpInc; TotalTaxOnEBIT = sum of 4 tax components; NOPLAT = EBIT − TotalTax.
- `src/lib/calculations/fcf.ts` — `computeFcf`: GrossCashFlow, TotalWorkingCapitalChange, GrossInvestment, FreeCashFlow. Uses Excel's pre-signed input convention (depreciation and capex arrive negated).
- `src/lib/calculations/cash-flow.ts` — `computeCashFlowStatement`: 11 input series → WorkingCapitalChange, CFO, CFI, CFbF, CFF, NetCashFlow.
- `src/lib/calculations/ratios.ts` — `computeFinancialRatios`: 18 ratios across 4 sections (Profitability 6, Liquidity 3, Leverage 5, Cash Flow Indicator 4).
- `src/lib/calculations/growth-revenue.ts` — `computeGrowthRevenue`: YoY for sales + net income with IFERROR-safe zero-previous handling.

**Barrel updated**: `src/lib/calculations/index.ts` re-exports all 9 modules cleanly (no type collisions).

**Fixture helpers extended**: 7 new cell-indexed fixture loaders (fixed-asset, noplat, fcf, cash-flow-statement, financial-ratio, growth-revenue, acc-payables). New `numOpt` helper returns undefined for missing/non-numeric cells.

### Verification Results

```
Tests:     47 / 47 passing (9 files)
Build:     ✅ Compiled successfully in 2.0s, zero errors
Lint:      ✅ Zero warnings
Typecheck: ✅ tsc --noEmit clean (exit 0)
```

Test deltas per module:
- fixed-asset: 6 tests
- noplat: 3 tests
- fcf: 4 tests
- cash-flow: 5 tests
- ratios: 5 tests
- growth-revenue: 3 tests
- Total Phase 2A: 26 new tests (21 → 47)

### Architectural Decisions (Phase 2A)

- **Pre-signed convention** — Modules that mirror Excel sheets (FCF, Cash Flow) accept inputs already signed as the source cells show them, rather than applying sign-flip logic inside the function. Preserves fidelity with workbook outputs and keeps arithmetic transparent.
- **Variable year length** — FA/NOPLAT/FCF/CashFlow/Ratios/Growth all use `readonly number[]` per series instead of the 4-year `YearlySeries` interface, because these sheets use 3 historical years (2019/2020/2021) while BS/IS use 4. Length is derived from input arrays.
- **Column offset handling** — Tests document that BS/IS use cols D/E/F for 2019–2021 while CFS/FCF use C/D/E for the same years. Callers bridge the offset; functions stay index-agnostic.
- **Zero-division guards** — All ratio helpers (`ratioOfBase`, local `safeRatio`, `absRatioSafe`) return 0 on zero denominator, mirroring the IFERROR(...,0) pattern used throughout the workbook.
- **Minimal type re-export** — Session 1 lesson preserved: barrel uses `export *` but modules avoid duplicate type names (no `YearlySeries` re-exports from FA/NOPLAT/etc — they use `number[]` instead).

### Session 2A Stats

- Calculation modules: +6 (total 9)
- Pure functions: +6 major + ~6 internal helpers
- Test cases: +26 (total 47)
- Files changed: 18 (6 impl + 6 tests + 1 barrel + 1 fixture helper + design.md + plan.md + progress.md + package-lock untouched)
- Commits: 6 feature commits + this wrap-up
- Dependencies: unchanged (no new runtime deps)

### Next Session — Session 2B Priorities

1. **`<FinancialTable>` reusable component** — sticky headers, right-aligned monospace numbers, negative in red parens, alternating rows, mobile horizontal scroll, optional common-size/growth columns
2. **`/historical/balance-sheet`** — Server Component reading BS data + `commonSizeBalanceSheet` + `growthBalanceSheet`
3. **`/historical/income-statement`** — YoY growth + margin rows
4. **`/historical/cash-flow`** — uses `computeCashFlowStatement`
5. **`/historical/fixed-asset`** — uses `computeFixedAssetSchedule`
6. **`/analysis/{ratios,fcf,noplat,growth}`** — each uses corresponding calc module
7. **Sidebar navigation update** — active state, collapsible groups, mobile bottom nav
8. **Formula transparency tooltip** — hover cell to see Excel source formula (non-negotiable #4 from project rules)

### Deferred (unchanged from Session 1)

- Projection sheets (PROY LR, PROY BS, PROY CF, PROY NOPLAT) — requires KEY DRIVERS form
- WACC / Discount Rate
- DCF / AAM / EEM valuation methods
- DLOM / DLOC questionnaire forms
- Dashboard charts (Recharts)
- Export to .xlsx via ExcelJS
- Dark mode toggle

---

## Session 2A.5 — 2026-04-11 (Harden Calc Engine)

### Delivered

**Three new system layers around the pure calc engine**, addressing architectural review of Session 2A:

1. **YearKeyedSeries type** — `Record<number, number>` in `src/types/financial.ts` plus helpers in `src/lib/calculations/helpers.ts` (`yearsOf`, `assertSameYears`, `emptySeriesLike`, `mapSeries`, `seriesFromArray`, `seriesToArray`). All 6 Phase 2A modules refactored to use it as input/output, eliminating the silent column-offset bug that would corrupt cross-sheet merges.

2. **Zod validation layer** at `src/lib/validation/`:
   - `schemas.ts` — base `yearKeyedSeriesSchema` + one input schema per calc module (FixedAsset, Noplat, Fcf, CashFlow, Ratios, GrowthRevenue) with cross-field year-set refinement.
   - `index.ts` — `validated*` wrapper functions that throw `ValidationError` with human-readable messages derived from Zod issue paths.
   - Rejects `NaN`, `Infinity`, empty series, invalid year keys (non-integer / out of 1900..2200), and mismatched year sets before any calc runs.

3. **Adapter layer** at `src/lib/adapters/`:
   - `noplat-adapter.ts` — `toNoplatInput(raw)` centralizes the `*-1` sign flips the NOPLAT sheet performs when pulling interest income/expense, non-operating income, and corporate tax from the Income Statement.
   - `fcf-adapter.ts` — `toFcfInput(raw)` negates positive depreciation and positive capex to match FCF sheet formulas (`FIXED ASSET!*-1`).
   - `cash-flow-adapter.ts` — `toCashFlowInput(raw)` negates positive capex and passes everything else through. Every sign decision is documented in JSDoc with the originating Excel formula.

**End-to-end integration test** at `__tests__/integration/calc-pipeline.test.ts`:
`raw Excel data → adapter → Zod validator → pure calc → assert against canonical fixture values` — proves the full UI-bound flow works before any UI wiring begins.

### Verification Results

```
Tests:     90 / 90 passing (13 files)    (was 47 after Phase 2A)
Build:     ✅ Compiled successfully in 1750ms
Lint:      ✅ Zero warnings
Typecheck: ✅ tsc --noEmit clean (exit 0)
```

Test deltas:
- year-keyed helpers: +15 tests
- fixed-asset refactor: +1 (year-set guard)
- noplat refactor: +1
- fcf refactor: +1
- cash-flow refactor: +1
- ratios refactor: +1
- growth-revenue refactor: +2 (year-set + min-years)
- validation layer: +15
- adapter layer: +3 (integration via adapter)
- integration pipeline: +3
- **Total Session 2A.5: +43 tests (47 → 90)**

### Architectural Decisions (Session 2A.5)

- **Year is data, not axis** — `YearKeyedSeries = Record<number, number>` replaces positional `number[]` in all 6 Phase 2A modules. UI callers can no longer silently shift years by one column when crossing sheet boundaries (BS/IS use D/E/F, CFS/FCF use C/D/E for identical 2019–2021 data).
- **Validation is additive** — Pure calc functions keep their runtime `assertSameYears` guards. Zod layer sits *above* them at the boundary between UI/store and calc, producing user-readable errors via `ValidationError`. Callers can still invoke the raw calc function when they already have validated data.
- **Sign conventions live in one place** — Every `*-1` in application code lives in `src/lib/adapters/`, commented with the source Excel formula. Pure calc functions never apply signs themselves; the UI never applies signs. If the workbook changes convention, there is exactly one file to update per module.
- **BS/IS deferred intentionally** — Phase 1 `balance-sheet.ts` / `income-statement.ts` still use `YearlySeries {y0..y3}`. They are already type-safe and don't have cross-sheet column-offset issues (BS and IS share the same column layout). Migration to `YearKeyedSeries` is listed as tech debt, not blocking for Session 2B.

### Session 2A.5 Stats

- Modules refactored: 6
- New layers: 2 (validation + adapters)
- New test files: 4 (year-keyed-helpers, validation, adapters, integration pipeline)
- Test cases: +43 (47 → 90)
- Files changed: 22 (6 calc + 6 calc tests + 2 validation files + 1 validation test + 4 adapter files + 1 adapter test + 1 integration test + helpers + types + design + plan + progress)
- Commits: 10 (1 foundation + 6 refactors + 1 validation + 1 adapters + 1 integration/wrap-up)

### Next Session — Session 2B Priorities (updated)

With the calc engine now hardened, UI layer can trust validated year-keyed data:

1. **`<FinancialTable>` reusable component** — sticky headers, monospace numerics, negative-in-red parens
2. **Zustand store reshape** — year-keyed data structures matching calc input shapes, hydrated from initial fixture or user input
3. **`/historical/*` pages** — each page: `store → adapter → validator → calc → <FinancialTable>`
4. **`/analysis/*` pages** — ratios, FCF, NOPLAT, growth
5. **Sidebar navigation update** — active state + mobile bottom nav
6. **Formula transparency tooltip** — hover to see source Excel formula

### Deferred (unchanged)

- Projection sheets (PROY LR, PROY BS, PROY CF, PROY NOPLAT) — requires KEY DRIVERS form
- WACC / Discount Rate
- DCF / AAM / EEM valuation methods
- DLOM / DLOC questionnaire forms
- Dashboard charts (Recharts)
- Export to .xlsx via ExcelJS
- Dark mode toggle
- BS/IS migration to YearKeyedSeries (tech debt, non-blocking)

---

## Session 004 — 2026-04-11 (Phase 2B P1: UI Financial Tables + Navigation)

### Delivered

**Foundation (Tasks 1-4)**
- **Seed loader** at `src/data/seed/` — `loadCells(slug)` + helpers (`num`, `numOpt`, `formulaOf`, `textOf`). Fixtures synced from `__tests__/fixtures/` via `scripts/copy-fixtures.cjs` (+ `npm run seed:sync` script). 6 sheets bundled statically into the src tree so Next.js can import them at build time with zero runtime I/O.
- **Manifest layer** at `src/data/manifests/` — `types.ts`, `build.ts`, plus `historical-derive.ts`. `buildRowsFromManifest(manifest, cells, derived?)` turns a typed row descriptor into `FinancialRow[]`, auto-pulling raw Excel formulas from fixture cells and attaching derived common-size/growth column maps from the calc engine.
- **`<FinancialTable>`** Server Component at `src/components/financial/` — sticky first column + sticky header, IDR formatting with parenthesised negatives, tabular-nums, alternating rows, subtotal/total/header/separator row types, optional common-size + growth column groups, per-row `valueKind` ('idr' | 'percent' | 'ratio') for financial ratios. `<FormulaTooltip>` client island shows description + raw Excel formula on hover/focus with accessible popover.
- **Responsive Shell** — `<Sidebar>` (desktop, fixed 256px on `lg+`) + `<MobileShell>` (client drawer + hamburger top-bar `<lg`). Drawer open state derived from `(openedAt === pathname)` so route change auto-closes without setState-in-effect (React Compiler compatible). Shared `NAV_TREE` pure-data module, `<SidebarNav>` client wrapper with active-link highlighting via `usePathname`, WIP badges on unimplemented routes.

**Pages (Tasks 5-8)** — 4 Tier P1 pages, all Server Components statically prerendered:

| Route | Source sheet | Rows | Highlights |
|---|---|---|---|
| `/historical/balance-sheet` | BALANCE SHEET | ~35 | 4-year values + derived common-size (via `commonSizeBalanceSheet`) + derived growth (via `growthBalanceSheet`). Formula tooltip on every derived cell citing raw Excel formula (`=D8/D$27` etc.) |
| `/historical/income-statement` | INCOME STATEMENT | ~20 | 4-year values + margin (via calc engine, description-only tooltip since workbook mislabels) + YoY growth (raw Excel from cols H/I/J) |
| `/analysis/financial-ratio` | FINANCIAL RATIO | 18 | 4 grouped sections (Profitability, Liquidity, Leverage, Cash Flow). Per-row percent vs ratio formatting |
| `/analysis/fcf` | FCF | 10 | 3-year pre-signed schedule (NOPLAT → Depr → Gross CF → ΔWC → Capex → Gross Investment → Free Cash Flow) |

**Components & tests**
- 13 new component tests for `<FinancialTable>`: format helpers (IDR/percent/ratio, negatives in parens), negative-in-red rendering, header/subtotal/total row types, common-size & growth column groups, missing-value fallback
- 4 new manifest-builder tests covering value series extraction, auto-pulled Excel formulas, derived column attachment, graceful missing-cell handling
- Total: **+17 new tests (90 → 107)**, 0 existing tests broken

### Verification Results

```
Tests:     107 / 107 passing (15 files)
Build:     ✅ Compiled successfully in 1.9s, 9 routes total, 4 new P1 pages as static
Lint:      ✅ Zero warnings (React Compiler rule-compliant)
Typecheck: ✅ tsc --noEmit clean (exit 0)
Smoke:     ✅ All 4 P1 pages HTTP 200 with correct content (e.g. BS 2018 Cash on Hands = 14.216.370.131 matches fixture exactly)
```

### Session 004 Stats

- New files: 20
  - 1 seed loader module
  - 3 manifest modules (types, build, historical-derive)
  - 4 sheet manifests (BS, IS, FR, FCF)
  - 4 Server Component pages
  - 5 layout components (Shell updated, Sidebar, SidebarHeader, SidebarNav, MobileShell, nav-tree)
  - 3 financial component modules (FinancialTable, FormulaTooltip, format)
- Lines added: ~2000
- Commits: 8 feature commits (1 per task)
- Dependencies: 0 new runtime deps — everything built with existing stack
- Files removed: 0

### Architectural Decisions (Session 004)

- **Seed via static JSON import** — Fixtures live in `src/data/seed/fixtures/` so Next.js bundles them at compile time. No runtime file I/O, no API routes, no dynamic data fetching. Pages are fully prerenderable as static.
- **Manifests as typed data, not JSX** — Each sheet's row layout is a `SheetManifest` constant, not hand-written TSX. Reduces duplication across pages and makes adding new sheets an incremental manifest-authoring task rather than component work.
- **Formula tooltip: description + raw Excel** — The authored `formula.*.description` in the manifest gives semantics; the raw Excel formula is auto-pulled from the fixture cell to keep the tooltip verifiable against the source workbook without double-maintenance.
- **Derived state over setState-in-effect** — Mobile drawer open state is derived from `(openedAt === pathname)` rather than `useEffect(setOpen(false), [pathname])`. React Compiler compliant, no stale state.
- **`valueKind` per row** — Single `<FinancialTable>` handles both currency (BS/IS) and ratio (FR) pages via a per-row format switch, avoiding a second component.
- **BS/IS margin computed independently of IS sheet layout** — The Income Statement workbook mislabels its YoY growth column as "COMMON SIZE" (formulas show growth, header says margin). We computed actual margins from the calc engine and render them as our own common-size column group, with description-only tooltip since the workbook has no corresponding cells.
- **Skipped rows as a design decision** — Margin percentage rows (R9/R19/R23/R36 on IS) are not rendered because our derived common-size column already shows them. The workbook blow-up is avoided.

### Next Session — 2B.5 Priorities

Quality over quantity principle held: 4 P1 pages shipped with full formula tooltip + mobile responsive + test coverage. Remaining 4 historical/analysis pages follow the same pattern and can be landed in a shorter follow-up session:

1. `/historical/cash-flow` — Cash Flow Statement manifest + page. Note CFS/FCF column offset (C/D/E for 2019-2021 vs BS/IS D/E/F).
2. `/historical/fixed-asset` — FA schedule with 6 asset categories.
3. `/analysis/noplat` — NOPLAT breakdown using `toNoplatInput` adapter + `computeNoplat`.
4. `/analysis/growth-revenue` — Growth schedule + optional Recharts sparkline.

### Deferred (unchanged from Session 2A.5)

- Input forms (user replaces seed data with their own) — Session 2C
- Projection sheets (PROY LR, PROY BS, PROY CF, PROY NOPLAT) — requires KEY DRIVERS form
- WACC / Discount Rate, DCF / AAM / EEM valuation methods
- DLOM / DLOC questionnaire forms
- Dashboard charts (Recharts)
- Export to .xlsx via ExcelJS
- Dark mode toggle
- Per-section accent colors (blue/teal/amber)
- Collapsible sidebar groups

---

## Session 005 — 2026-04-11 (Phase 2B.6: Systematization Pass)

### Motivation

Post-Session-004 audit identified 4 patch-mode items that would become multiplied technical debt if Session 2B.5 duplicated the same patterns for 4 more pages. Session 2B.6 is a **refactor-only** pass that normalises every pattern before scaling.

### Delivered — 4 patches, 1 commit per patch

**Patch 1 — `anchorRow` di manifest** (`2f11766`)
- `SheetManifest.anchorRow?: number` field added
- `INCOME_STATEMENT_MANIFEST.anchorRow = 6` (revenue row)
- `deriveIncomeStatementColumns` reads `manifest.anchorRow` instead of taking a parameter
- Hardcoded `const REVENUE_ROW = 6` removed from page file
- **Result**: sheet-specific constants no longer hide in page files

**Patch 2 — `derive` callback di manifest** (`7c977cd`)
- `SheetManifest.derive?: ManifestDeriveFn` callback field
- `buildRowsFromManifest` auto-invokes `manifest.derive?.(cells, manifest)` when no override passed
- BS + IS manifests assign their `derive*Columns` functions directly
- BS + IS pages no longer import or call derive helpers — the builder does it
- **Result**: every page shares the identical pattern, no sheet-specific function imports

**Patch 3 — seed-mode convention documented on FR + FCF** (`626db58`)
- JSDoc blocks added to `FINANCIAL_RATIO_MANIFEST` and `FCF_MANIFEST`
- Explicitly flags that seed-mode renders pre-computed fixture values by design
- Phase 3+ migration path spelled out: wire through existing `toFcfInput` adapter + `validatedFcf`, create `toRatiosInput` adapter as future task
- **Result**: Phase 3 author will not silently bypass the hardened pipeline

**Patch 4 — `<SheetPage>` helper + all pages simplified** (`8e7f9be`)
- New `src/components/financial/SheetPage.tsx` Server Component
- Encapsulates `loadCells` + `buildRowsFromManifest` + `<FinancialTable>` + column-group auto-inference
- All 4 P1 pages shrunk to 11 lines each (~70% line reduction)
- Adding a new sheet = author manifest + 11-line page file, zero boilerplate
- **Result**: page files are fully derivable from the manifest

**Bonus — `chore: gitignore .claude/`** (`2fbdcf0`) — prevents Claude Code scratch state (session lock file) from being committed accidentally.

### Verification Results

```
Tests:     107 / 107 passing (15 files) — identical to before refactor
Build:     ✅ Compiled successfully, zero errors, 9 routes, 4 P1 pages static
Lint:      ✅ Zero warnings
Typecheck: ✅ tsc --noEmit clean
Smoke:     ✅ All 4 P1 pages serve identical content as pre-refactor (Cash on Hands 14.216.370.131, NET PROFIT, Current Ratio, FREE CASH FLOW markers all present)
```

### Session 005 Stats

- Commits: 5 (4 patches + 1 gitignore fix)
- New files: 1 (`src/components/financial/SheetPage.tsx`)
- Files modified: 12
- Net delta: +74 lines (mostly Patch 3 JSDoc + SheetPage helper) — but every FUTURE page only needs ~11 lines
- Visual output: **identical** before ↔ after (verified by curl diff on all 4 pages)
- No test changes needed — refactor preserves all existing contracts

### Architecture After 2B.6

Every sheet now follows this single pattern:

```ts
// src/data/manifests/<sheet>.ts
export const X_MANIFEST: SheetManifest = {
  title, slug, years, columns,
  commonSizeColumns?, growthColumns?,   // when cells hold derived values
  anchorRow?, totalAssetsRow?,          // derivation anchors
  derive?: fn,                          // sheet-specific calc engine bridge
  rows: [...],
  disclaimer?: '...',
}
```

```ts
// src/app/<section>/<sheet>/page.tsx — ALWAYS 11 lines
import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { X_MANIFEST } from '@/data/manifests/x'

export const metadata: Metadata = { title: '...' }
export default function XPage() {
  return <SheetPage manifest={X_MANIFEST} />
}
```

No per-page logic. No derive function imports. No hardcoded row numbers. No per-sheet specialization anywhere outside the manifest.

### Session 2B.5 Unblocked

With 2B.6 shipped, adding the remaining 4 P1-deferred pages (cash-flow, fixed-asset, noplat, growth-revenue) becomes pure manifest-authoring work + an optional `derive` callback per sheet. Estimated scope: ~4 commits (1 per page), ~400 lines of manifest data, 0 new component logic, 0 new patterns.

### Deferred (unchanged)

- Input forms replacing seed data (Session 3+)
- `toRatiosInput` adapter + FR calc-engine wiring (Session 3+)
- FCF migration to pipeline mode via `toFcfInput` (Session 3+, adapter already exists)
- Projection sheets, WACC/DCF/AAM/EEM, DLOM/DLOC, Recharts, Excel export, dark mode

---

## Session 006 — 2026-04-11 (Phase 2B.6.1: Declarative Derive Primitives)

### Motivation

Session 2B.6 left one real patch-mode gap: `historical-derive.ts` with 2 hand-written sheet-specific derive functions. Session 2B.5 would have added 3 more such functions (cash-flow, noplat, growth-revenue) nearly-identical to the existing pair. This sesi replaces the callback form with a declarative `DerivationSpec[]` array interpreted by generic primitives in `build.ts`, eliminating the pattern before it scales.

Refactor-only. Output verified bit-identical on all 4 P1 pages.

### Delivered — 4 commits

**Commit 1 — `DerivationSpec` + `applyDerivations` engine** (`c8961e2`)
- Discriminated union `DerivationSpec`: `commonSize`, `marginVsAnchor`, `yoyGrowth`
- `applyDerivations(specs, manifest, cells)` pure function
- Helper primitives `readRowSeries`, `computeRatioSeries`, `computeGrowthSeries`
- All primitives reuse `ratioOfBase` / `yoyChangeSafe` / `yoyChange` from the calc engine — zero duplication
- `buildRowsFromManifest` prefers `manifest.derivations`, falls back to legacy `derive` callback for backward compatibility

**Commit 2 — Balance Sheet migrated** (`e78f63e`)
- `derive: deriveBalanceSheetColumns` → `derivations: [{ type: 'commonSize' }, { type: 'yoyGrowth', safe: true }]`
- `commonSize` uses `manifest.totalAssetsRow: 27` (declared above)
- Import of `historical-derive` removed from BS manifest
- Verified BS 2018 Cash = `14.216.370.131`, common-size 2019 = `29,9%`, growth 2019 = `(45,8%)` — bit-identical

**Commit 3 — Income Statement migrated** (`41cfd94`)
- `derive: deriveIncomeStatementColumns` → `derivations: [{ type: 'marginVsAnchor' }, { type: 'yoyGrowth', safe: true }]`
- `marginVsAnchor` uses `manifest.anchorRow: 6` (Revenue)
- Verified Gross Profit Margin 2019 = `36,2%`, EBITDA Margin 2019 = `11,6%` — matches FR fixture exactly

**Commit 4 — Delete `historical-derive.ts` + cleanup types** (`5d2f964`)
- `src/data/manifests/historical-derive.ts` deleted (132 lines)
- `SheetManifest.derive` field removed
- `ManifestDeriveFn` type removed
- Unused `CellMap` import dropped from `types.ts`
- Stale JSDoc mentioning legacy callback pattern updated to reference declarative form

### Verification Results

```
Tests:     107 / 107 passing (15 files) — unchanged
Build:     ✅ 9 routes, 4 P1 pages static, zero errors
Lint:      ✅ zero warnings
Typecheck: ✅ tsc --noEmit clean
Smoke:     ✅ all 4 live pages HTTP 200 with identical output
           ✅ BS 2018 Cash = 14.216.370.131 (raw)
           ✅ BS common-size 2019 Cash = 29,9% (matches H8 formula = D8/D$27)
           ✅ BS growth 2019 Cash = (45,8%) (matches N8 formula = IFERROR((D8-C8)/C8,0))
           ✅ IS Gross Profit Margin 2019 = 36,2% (matches FR D6)
           ✅ IS EBITDA Margin 2019 = 11,6% (matches FR D7)
```

### Session 006 Stats

- Commits: 4 (clean, atomic, per-patch)
- Files deleted: 1 (`historical-derive.ts`, 132 lines)
- Files modified: 4 (`build.ts`, `types.ts`, 2 manifests)
- Net delta: +225 / -159 lines (new engine > old callback implementations by ~66 lines — one-time cost, future sheets add 0)
- Visual output: **bit-identical** before ↔ after across all 4 pages

### Architecture After 2B.6.1

**Before**: `derive: deriveBalanceSheetColumns` (where `deriveBalanceSheetColumns` is a 40-line function in a separate file, specific to BS)

**After**:
```ts
derivations: [
  { type: 'commonSize' },           // data, not code
  { type: 'yoyGrowth', safe: true },
]
```

The `DerivationSpec` library lives in one place (`build.ts`). Sheets compose primitives; they never write new derive logic.

### Impact on Session 2B.5 — now pure data authoring

Adding the remaining 4 P1-deferred pages (cash-flow, fixed-asset, noplat, growth-revenue) is now:

```ts
// Example: Cash Flow Statement — 3 years, growth-only
export const CASH_FLOW_MANIFEST: SheetManifest = {
  title: 'Cash Flow Statement',
  slug: 'cash-flow-statement',
  years: [2019, 2020, 2021],
  columns: { 2019: 'C', 2020: 'D', 2021: 'E' },
  derivations: [{ type: 'yoyGrowth', safe: true }],
  rows: [ /* manifest rows */ ],
}
```

Zero new TypeScript functions. Zero new imports. Zero new files in `src/data/manifests/` beyond the new manifest file + its page (which is already 11 lines identical to the existing ones).

### Growth of the primitive library (only when a real sheet needs it — YAGNI)

Current `DerivationSpec` has 3 variants. Add more only when a new sheet cannot be expressed with them:
- **NOPLAT** — probably needs `yoyGrowth` only, unless it wants NOPLAT / Revenue margin → `marginVsAnchor`. No new primitive needed.
- **Growth Revenue** — by definition `yoyGrowth`. No new primitive needed.
- **Fixed Asset** — may not need derivation at all (raw schedule). If it does, pattern is `yoyGrowth`.
- **Cash Flow Statement** — `yoyGrowth` only.

Reasonably, all 4 Session 2B.5 sheets fit the existing 3-primitive library. If Session 3 (projections) needs something like "growth vs fixed base year" or "year-over-year delta in absolute units", add a new spec type then.

### Deferred (unchanged from 2B.6)

- Input forms replacing seed data (Session 3+)
- `toRatiosInput` adapter + FR calc-engine wiring (Session 3+)
- FCF migration to pipeline mode via `toFcfInput` (Session 3+, adapter already exists)
- DataSource abstraction (Session 3+, defer until user-input requirement concrete)
- Projection sheets, WACC/DCF/AAM/EEM, DLOM/DLOC, Recharts, Excel export, dark mode
