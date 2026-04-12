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
| 007 | 2026-04-11/12 | Phase 2B.5 — Four remaining P1 pages (CF/FA/NOPLAT/Growth) | ✅ Shipped | [session-007](history/session-007-phase2b5-remaining-pages.md) |
| 008 | 2026-04-11/12 | ROIC + DLOM/DLOC questionnaire forms (with 008.5 + 008.6 hardening) | ✅ Shipped | [session-008](history/session-008-roic-dlom-dloc-forms.md) |
| 009 | 2026-04-12 | Phase 3 design brainstorm — 6 architectural decisions for live data mode | ✅ Design complete | [session-009](history/session-009-phase-3-design-brainstorm.md) |
| 010 | 2026-04-12 | Phase 3 — DataSource foundation + Balance Sheet pilot (live data mode) | ✅ Shipped | [session-010](history/session-010-datasource-bs-pilot.md) |
| 011 | 2026-04-12 | Phase 3 — IS input + 3 downstream live migrations (NOPLAT / Growth Revenue / Financial Ratio) | ✅ Shipped | [session-011](history/session-011-is-input-downstream-wave.md) |
| 012 | 2026-04-12 | Phase 3 — FA input + CFS/FCF/ROIC live mode + FR 18/18 | ✅ Shipped | [session-012](history/session-012-fa-cfs-fcf-roic.md) |
| 013 | 2026-04-12 | Phase 3 — WACC + Discount Rate + Growth Rate (valuation foundation) | ✅ Shipped | [session-013](history/session-013-wacc-discount-rate-growth-rate.md) |
| 014 | 2026-04-12 | Phase 3 — KEY DRIVERS + PROY FA + PROY LR (projection chain start) | ✅ Shipped | [session-014](history/session-014-key-drivers-proy-fa-lr.md) |
| 015 | 2026-04-12 | Phase 3 — PROY BS + PROY NOPLAT + PROY ACC PAYABLES + PROY CFS (projection chain complete) | ✅ Shipped | [session-015](history/session-015-proy-chain-complete.md) |

## Current State Snapshot (latest)

- **Branch**: `main`
- **Tests**: **641 / 641** passing across 42 files (+78 vs Session 014)
- **Build**: ✅ clean, zero errors, zero warnings, **27 static pages** prerendered (+3 projection pages)
- **Lint**: ✅ zero warnings
- **Typecheck**: ✅ `tsc --noEmit` exit 0
- **Live**: https://kka-penilaian-saham.vercel.app
- **Store version**: v6 (unchanged from Session 014 — no new slices needed)
- **Architecture state after 015**: **Projection chain complete + fully company-agnostic.** All 4 remaining projection sheets shipped. Post-delivery: 3 rounds of system development audit eliminated all case-specific code. IS growth rates now computed from user data, tax rates derived from IS, loan balances from BS, projection years centralized. Zero hardcoded values from prototype in production code path. All upstream data ready for DCF/AAM/EEM in Session 016.
- **Company-agnostic verified**: 15 compute adapters (100% parameterized), 24 pages (100% from store/computed), 9 manifests (generic labels), 9 calc modules (pure functions). Form defaults = Indonesian industry standards, user-editable.
- **Live pages (24)**:
  - Input Master: HOME
  - Input Data: Balance Sheet · Income Statement · Fixed Asset · Key Drivers
  - Historis: Balance Sheet · Income Statement · Cash Flow · Fixed Asset
  - Analisis: Financial Ratio (18/18) · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate
  - Proyeksi: Proy. L/R · Proy. Fixed Asset · Proy. Balance Sheet · Proy. NOPLAT · Proy. Cash Flow
  - Penilaian: DLOM · DLOC (PFC) · WACC · Discount Rate

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

---

## Session 007 — 2026-04-11/12 (Phase 2B.5: Four Remaining P1 Pages)

### Motivation

Session 006 left 4 P1 sheets unimplemented but with a fully systematized pipeline ready to absorb them: Cash Flow Statement, Fixed Asset Schedule, NOPLAT, and Growth Revenue. Session 007 tests the hypothesis that these 4 sheets can be shipped as **pure manifest authoring** — zero new components, zero new helpers in `build.ts`, zero new tests.

### Delivered — 7 commits, 1 per atomic task + plan snapshot

**Commit 1 — `chore: sync noplat + growth-revenue fixtures and extend SheetSlug`** (`c741811`)
- `scripts/copy-fixtures.cjs`: +2 slugs (noplat, growth-revenue)
- `node scripts/copy-fixtures.cjs`: 8/8 copied
- `src/data/seed/loader.ts`: +2 imports + `SheetSlug` union + `FIXTURES` map
- `src/data/manifests/types.ts`: `SheetManifest.slug` union extended

**Commit 2 — `feat: add Cash Flow Statement page`** (`d8e1355`)
- `src/data/manifests/cash-flow-statement.ts` (178 lines) — 3-year C/D/E layout, no derivations (LESSON-023), typo corrections, formula descriptions per row
- `src/app/historical/cash-flow/page.tsx` — 11 lines

**Commit 3 — `feat: add Fixed Asset Schedule page`** (`6b8e66b`)
- `src/data/manifests/fixed-asset.ts` (153 lines) — A Acquisition + B Depreciation + C Net Value, local `categoryRows` helper (LESSON-025)
- `src/app/historical/fixed-asset/page.tsx` — 11 lines

**Commit 4 — `feat: add NOPLAT page`** (`0ed612c`)
- `src/data/manifests/noplat.ts` (146 lines) — EBIT chain + Tax block + NOPLAT total, `yoyGrowth` derivation, no `growthColumns` (workbook has no pre-computed growth)
- `src/app/analysis/noplat/page.tsx` — 11 lines

**Commit 5 — `feat: add Growth Revenue page`** (`0529e89`)
- `src/data/manifests/growth-revenue.ts` (75 lines) — **first 4-year manifest** starting from **column B** (LESSON-024), `yoyGrowth` derivation + `growthColumns: H/I/J` for tooltip fidelity
- `src/app/analysis/growth-revenue/page.tsx` — 11 lines

**Commit 6 — `chore: activate 4 new pages in navigation`** (`f547c62`)
- `src/components/layout/nav-tree.ts`: removed `wip: true` from Cash Flow, Fixed Asset, NOPLAT, Growth Revenue. All other `wip` entries (ROIC, DLOM, DLOC, projections, valuations, dashboard) preserved.

**Commit 7 — `docs: session 007 plan snapshot for wrap-up`** (`fb40612`)
- `plan.md` rewritten end-of-session with pre-flight fixture analysis, per-sheet derivation decisions, final verification evidence.

### Verification Results

```
Tests:     107 / 107 passing (15 files) — zero new tests (builder/primitives untouched)
Build:     ✅ 13 routes, 8 static financial pages (up from 4), zero errors
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Smoke:     ✅ All 4 new pages return HTTP 200 with real numeric data:
           - Cash Flow: EBITDA 6.048.346.987 → 7.493.446.732 (C5→E5)
           - Fixed Asset: Acquisition Costs + TOTAL NET FIXED ASSETS markers
           - NOPLAT: PBT 5.874.471.249 (C7), NOPLAT 4.405.853.437 → 5.720.109.965 (C19→E19)
           - Growth Revenue: Penjualan 52.109.888.424, 59.340.130.084 (C8, D8)
Vercel:    ✅ Production deploy d6dhb2apt Ready in 25s → kka-penilaian-saham.vercel.app (HTTP 200)
```

### Session 007 Stats

- Commits: 7 atomic (6 planned + 1 bonus plan.md snapshot)
- Files added: 9 (4 manifests + 4 pages + 2 fixture JSONs)
- Files modified: 4 (copy-fixtures.cjs, loader.ts, types.ts, nav-tree.ts) + plan.md
- Net delta: +2487 / −95 lines (most bulk from growth-revenue.json fixture)
- New `build.ts` functions: 0
- New primitives in `types.ts`: 0
- New tests: 0 — existing 107 tests continue to cover the pipeline end-to-end

### Architecture After 2B.5

System now renders **8 financial sheets** via the same pipeline:

```
 ┌────────────────────────────────────────────────────────────────┐
 │  kka-penilaian-saham.xlsx  (single source of truth)            │
 └──────────────────────┬─────────────────────────────────────────┘
                        │  scripts/extract-fixtures.py (openpyxl dual-pass)
                        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  __tests__/fixtures/*.json  (34 sheets, 12-decimal ground truth) │
 └──────────────────────┬─────────────────────────────────────────┘
                        │  scripts/copy-fixtures.cjs (seed:sync)
                        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  src/data/seed/fixtures/*.json  (8 bundled by Next at build time) │
 └──────────────────────┬─────────────────────────────────────────┘
                        │  src/data/seed/loader.ts (CellMap cache)
                        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  src/data/manifests/*.ts  (8 manifests = pure data)             │
 │  ├─ columns (Record<year, Excel col letter>)                    │
 │  ├─ derivations (DerivationSpec[] — optional)                   │
 │  ├─ rows (ManifestRow[] — Excel rows + labels + formula desc)   │
 │  └─ disclaimer                                                  │
 └──────────────────────┬─────────────────────────────────────────┘
                        │  src/data/manifests/build.ts
                        │    ├─ applyDerivations(specs, manifest, cells)
                        │    ├─ buildRowsFromManifest(manifest, cells)
                        │    └─ buildOne (per row: values + derived + formula)
                        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  FinancialRow[] (rendered data)                                 │
 └──────────────────────┬─────────────────────────────────────────┘
                        │  src/components/financial/SheetPage.tsx (Server Component)
                        ▼
 ┌────────────────────────────────────────────────────────────────┐
 │  <FinancialTable> + <FormulaTooltip>                            │
 │  → static prerender → HTML                                      │
 └────────────────────────────────────────────────────────────────┘
```

Every box except the top (Python extraction) and bottom (static HTML) is validated by the 107 tests. The 8 live pages are the empirical proof that the flow works end-to-end with real workbook data.

### Next Session — 008 Priorities

**Proposed scope: ROIC page + DLOM questionnaire form**

1. **`/analysis/roic`** — last remaining pure-manifest P2 analysis sheet. Pure warm-up (≤30 min authoring). Uses NOPLAT + Invested Capital. Ship as seed-mode initially, wire through calc engine in Phase 3.

2. **`/analysis/dlom`** — Discount for Lack of Marketability 12-factor weighted questionnaire. **First form UI in months** — exercises input-form component (client component), Zod schema, live weighted-sum output, accessible form primitives. This is the natural on-ramp to input-mode work without also introducing projection complexity.

### Deferred (rolls over from Session 006, reprioritized)

- **Phase 3 (blocking for all projections)**: KEY DRIVERS input form (COGS ratio, expense ratios, tax rate) — unlocks PROY L/R → PROY BS → PROY CF → PROY NOPLAT chain.
- **Phase 3 (incremental hardening)**: `toRatiosInput` adapter + FR calc-engine wiring, FCF migration to pipeline mode via `toFcfInput` (adapter already exists), DataSource abstraction.
- **Phase 4 (valuation)**: WACC (CAPM with Beta/Ke/Kd) → DCF (FCFF), AAM + EEM, DLOC (PFC) form, Recharts dashboard, ExcelJS export, dark mode toggle.

---

## Session 008 — 2026-04-11/12 (ROIC + DLOM/DLOC + Hardening)

Triple-deliverable session with 2 self-audit hardening passes:
- **Phase A (008 main)**: ROIC manifest page (#9 financial), DLOM 10-factor questionnaire form, DLOC 5-factor questionnaire form, shared `<QuestionnaireForm>` component, store extension (dlom + dloc slices), 16 new TDD tests
- **Phase B (008.5)**: Self-audit caught 3 rough edges → fixed in 3 atomic patches:
  1. Zustand persist v1→v2 migrate function (data preservation bug, exported `migratePersistedState` for testability, 4 unit tests)
  2. `computeQuestionnaireScores` helper extraction (eliminated 4 inline reduces, 6 unit tests)
  3. Stripped "PT Raja Voltama Elektrik" from 9 manifest titles + disclaimers (company-agnostic principle), introduced `<CompanyContextHeader>` client island
- **Phase C (008.6)**: Self-audit caught misleading UX bug introduced by Phase B Patch 3 → fixed via mode-aware `<DataSourceHeader>` (replaced CompanyContextHeader). Single switching point untuk Phase 3 transition.

### Verification Results

```
Tests:     133 / 133 passing (19 files) — 107 prior + 16 calc + 4 migration + 6 helpers
Build:     ✅ 17 routes total, 11 static pages prerendered
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Smoke:     ✅ All 11 routes HTTP 200 on production
           ✅ ROIC numeric 18.026.516.004 = Total Invested Capital 2019 (matches roic.json B12)
           ✅ DataSourceHeader renders "Mode Demo · Workbook Prototipe" warning
           ✅ Zero "PT Raja Voltama" leak di 6 sample production routes
```

### Session 008 Stats

- Commits: 11 (7 main + 3 hardening 008.5 + 1 critical fix 008.6)
- New files: 13 (manifests, calc, types, components, tests)
- Files modified: ~15 (store, types, all 9 manifests, SheetPage, nav-tree, copy-fixtures, loader)
- Net delta: +2200 / −300 lines
- New tests: 26 (16 calc + 4 migration + 6 helpers)
- 3 in-flight scope expansions (Patch 3 company-agnostic, 008.6 critical fix) — both validated by self-audit + user principle reminders
- 1 deferred decision: KONFIRMASI text field per DLOC factor

### Architecture After Session 008

System sekarang **honest tentang data source**. Aplikasi bisa di-pakai untuk:
- HOME form: any company (saved company-agnostic)
- DLOM form: any case (interactive scoring, persists ke store, sync ke home.dlomPercent)
- DLOC form: any case (5-factor scoring, persists, sync ke home.dlocPercent)
- 9 financial pages: **clearly demo data** (warning banner explicit)

Setelah 008.6, single switching point `<DataSourceHeader mode="seed" />` di SheetPage adalah satu-satunya tempat yang perlu diubah saat Phase 3 live mode landed.

### Next — Session 009 Phase 3 Design (already executed)

---

## Session 009 — 2026-04-12 (Phase 3 Design Brainstorm)

Pure design session (zero code execution). Output committed sebagai design reference untuk Phase 3 implementation phase.

### 6 Architectural Decisions Approved

1. **DataSource**: Synthesize CellMap from store via `buildLiveCellMap` adapter — zero changes ke build.ts/applyDerivations/derivation primitives
2. **Input Forms**: Separate `/input/*` routes (BS, IS, FA), generated dari ManifestRow[], computed totals read-only, smart paste handler, debounced auto-save
3. **Year Span**: `historicalYearCount` field di manifest + `computeHistoricalYears(tahunTransaksi, count)` runtime helper. Backward compatible.
4. **Cross-Sheet Deps**: Lazy compute via `useMemo` per page (no global graph). 9× efficiency vs eager.
5. **Migration**: 5 sessions (010-014), incremental, BS pilot first, downstream auto-follow, pure additive
6. **Mode Toggle**: Auto-detect (`home === null` sentinel) + sidebar "Reset & Lihat Demo" escape hatch

### Files Updated

- **`design.md`**: Appended ~470 lines "Phase 3 — Live Data Mode" section dengan all 6 decisions + rationale + concrete code patterns
- **`plan.md`**: Rewritten as "Phase 3 Roadmap (Sessions 010-014)" dengan task breakdown, acceptance criteria, deliverables per session

### Session 009 Stats

- Commits: 1 (`f035c06 docs: phase 3 design + sessions 010-014 roadmap`)
- Files modified: 2 (design.md, plan.md)
- Net delta: +681 / −113 lines
- New code: 0 (pure design)
- New tests: 0
- Lesson candidates extracted: 3 (LESSON-030, 031, 032)

### Phase 3 Implementation Roadmap

| Session | Focus | Tests | Outcome |
|---|---|---|---|
| **010** | DataSource foundation + BS pilot | ~20 | Foundation, BS live mode capable |
| **011** | IS input + 4 downstream migrations | ~10 | 5 pages live (BS, IS, CFS, FR, NOPLAT, Growth Revenue) |
| **012** | FA input + remaining downstream | ~8 | All 9 financial pages live mode |
| **013** | WACC + DCF | ~14 | First **share value output** |
| **014** | AAM + EEM + Dashboard | ~15 | **Full valuation chain complete** |
| **Cumulative** | | **+67** | **19 live pages, ~200 tests, fully company-agnostic end-to-end tool** |

### Next Session — 010 (DataSource Foundation + BS Pilot)

Per plan.md task breakdown:
1. Extend Zustand store (balanceSheet/incomeStatement/fixedAsset slices, v2→v3 migration)
2. Live data adapter (`buildLiveCellMap`, types, year helpers)
3. Manifest extension (`historicalYearCount` field)
4. Refactor `SheetPage` to client + mode-aware
5. `<RowInputGrid>` reusable component (paste handler, tab nav)
6. `/input/balance-sheet/page.tsx` form pilot
7. Sidebar nav update ("Input Data" group)
8. Verify gauntlet + production deploy

Estimated: 3 jam, ~10 commits, ~20 new tests.

### Deferred (unchanged from prior sessions)

- Multi-case management (multiple companies in one localStorage) — Phase 4
- File upload parsing (.xlsx → live data) — Phase 4 (Penilai DJP prefer manual input)
- Cloud sync / multi-device — non-negotiable #2 (privacy-first)
- Audit trail / change history — Phase 4
- Recharts dashboard — Session 014
- Export ke .xlsx via ExcelJS — Phase 4

---

## Session 010 — 2026-04-12 (Phase 3 — DataSource Foundation + BS Pilot)

First Phase 3 execution session. Built the end-to-end foundation for live data mode and delivered Balance Sheet as pilot. User can now fill HOME form → input BS data → see `/historical/balance-sheet` auto-flip from demo mode to live mode with their own numbers.

### Delivered

**Store extension (v2 → v3)**
- 3 new Zustand slices: `balanceSheet`, `incomeStatement`, `fixedAsset` (all `BalanceSheetInputState` / etc. from new `src/data/live/types.ts`, keyed by `excelRow → YearKeyedSeries`)
- `setBalanceSheet` / `setIncomeStatement` / `setFixedAsset` + `resetBalanceSheet` / etc. actions
- `migratePersistedState` extended to chain v1 → v2 → v3 unconditionally; narrows `persistedState: unknown` via `Record<string, unknown>` cast once at entry, then applies migrations in order (cleaner than original nested branches)
- `partialize` updated to persist all 6 slices

**Live data adapter layer (new `src/data/live/`)**
- `build-cell-map.ts` — `buildLiveCellMap(liveColumns, liveData, years)` synthesizes a `CellMap` at addresses matching `${col}${excelRow}`, so the existing `buildRowsFromManifest` pipeline consumes it unchanged (LESSON-030)
- `generateLiveColumns([2020..2023])` → `{ 2020: 'C', 2021: 'D', 2022: 'E', 2023: 'F' }` — synthetic column letters starting from C
- `src/lib/calculations/year-helpers.ts` — `computeHistoricalYears(tahunTransaksi, count)` derives ascending N-year window ending at `tahunTransaksi - 1`
- `src/lib/calculations/derive-computed-rows.ts` — `deriveComputedRows(rows, values, years)` computes subtotal/total rows from their `computedFrom` references via single forward pass, with fall-through to prior computed results for subtotal-of-subtotals chains

**Manifest extension**
- `SheetManifest.historicalYearCount?: 3 | 4` — declares live-mode year span per sheet
- `ManifestRow.computedFrom?: readonly number[]` — declares subtotal/total aggregation dependencies as pure data
- 9 manifests tagged with `historicalYearCount`; BS manifest gets `computedFrom` on all 9 subtotal/total rows (IS/FA will follow in Sessions 011–012)

**UI layer refactor**
- `SheetPage` converted to client component with auto-mode detection: seed mode before hydration, live mode after hydration when `home !== null && liveRows !== null`. Live path synthesizes a manifest override with synthetic columns and passes through `buildRowsFromManifest` unchanged.
- `RowInputGrid` — reusable data-entry grid accepting full manifest rows; interleaves editable `<NumericInput>` cells for normal rows with read-only formatted cells for subtotal/total rows, staying visually aligned with the read-only `<FinancialTable>`
- `parseFinancialInput` — handles Indonesian paste surface: dots as thousand sep, commas as decimals, Rp prefix, accounting parentheses, explicit negatives, whitespace (10 TDD cases)
- `/input/balance-sheet/page.tsx` — pilot input route with hydration gate → HOME form guard → `<BalanceSheetEditor>` child component. Child seeds local state via `useState(initialValues)` once at mount (LESSON-016 — avoid setState-in-effect by gating the mount behind `hasHydrated`). Debounced 500ms persist to store. `useMemo` computes subtotal/total values reactively from `localValues` via `deriveComputedRows`.
- `<DataSourceHeader>` flips `mode` prop based on SheetPage's domain-state detection — single switching point (LESSON-029)
- Sidebar nav — new "Input Data" group between "Input Master" and "Historis"; BS entry active, IS/FA as `wip: true` placeholders

### Verification Results

```
Tests:     169 / 169 passing (23 files) — +36 vs Session 009 baseline
  migration v2→v3:         +3 tests (7 total)
  year-helpers:            +6 tests (new file)
  buildLiveCellMap:        +9 tests (new file)
  parseFinancialInput:    +10 tests (new file)
  deriveComputedRows:      +8 tests (new file)
Build:     ✅ 17 routes, 12 static pages prerendered (+1 /input/balance-sheet)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Smoke:     ✅ All 13 routes HTTP 200 on production
           ✅ /historical/balance-sheet seed-mode banner still renders
           ✅ /input/balance-sheet new route reachable
           ✅ Input Data nav group visible on root HTML
           ✅ Zero regression — existing 9 financial pages unchanged in seed mode
```

### Session 010 Stats

- Commits: 8 (7 feature + 1 Opsi C follow-up for computed rows display)
- New files: 8 (4 source + 4 test)
- Files modified: ~15 (store, types, 9 manifests + build.ts types, SheetPage, nav-tree, BS manifest)
- Net delta: +1353 / −140 lines
- New tests: 36 (across 5 new test files)
- Deployments: 2 production (`21sqe2eco` initial, `3wzel9whp` follow-up fix)
- Live URL unchanged: https://kka-penilaian-saham.vercel.app

### Architecture After Session 010

**Live data mode is operational for Balance Sheet end-to-end.** User flow:

1. User opens `/` (HOME form) — fills `namaPerusahaan`, `tahunTransaksi=2024`, etc. → saved to `store.home`
2. Navigates to `/input/balance-sheet` — sees empty 4-year grid (2020–2023 derived from `tahunTransaksi-1..-4`)
3. Types values → 500ms debounced write to `store.balanceSheet.rows`
4. Navigates to `/historical/balance-sheet` — `SheetPage` detects `home !== null && liveRows !== null`, flips to live mode, synthesizes CellMap from `store.balanceSheet.rows`, renders same manifest through unchanged `buildRowsFromManifest` pipeline. `<DataSourceHeader>` shows `mode="live"` neutral header. Column derivations (common-size, growth) computed from user values via existing `applyDerivations`.
5. Refresh browser → localStorage persist restores all slices via v3 migrate function (idempotent).

Session 011–012 follow-ups will add the same flow for Income Statement + Fixed Asset, then wire downstream pages (CFS, FR, NOPLAT, FCF, Growth Revenue, ROIC) via lazy `useMemo` compute per page (LESSON-032).

**Lessons extracted**: LESSON-033, LESSON-034 (both promoted to start skill section 8).

### Deferred / Punted to Sessions 011-012

- Income Statement input page (`/input/income-statement`) + IS `computedFrom` declarations
- Fixed Asset input page (`/input/fixed-asset`) + FA `computedFrom` declarations
- Downstream sheet live mode: CFS, FR, NOPLAT, FCF, Growth Revenue, ROIC — each needs its compute adapter wired into the SheetPage live branch
- Validation warn border (orange ring on non-numeric paste) — not critical for pilot, can ship later when there's user feedback on confusion

### Next Session — 011 (IS input + 4 downstream migrations)

Per `plan.md` Session 011 roadmap:
1. Add IS `computedFrom` declarations (mirrors BS approach)
2. `/input/income-statement/page.tsx` — reuse RowInputGrid unchanged
3. Wire downstream live compute for CFS, Financial Ratio, NOPLAT, Growth Revenue — each calls existing calc function from `src/lib/calculations/*` inside SheetPage `useMemo`
4. Estimated: 2.5–3 jam, ~10 tests (mostly integration), 5 pages newly live-capable

---

## Session 011 — 2026-04-12 (Phase 3 — IS Input + First Downstream Wave)

Second Phase 3 execution session. Built IS input page on top of the
`<ManifestEditor>` framework extracted at Task 0, extended the
computedFrom primitive to support subtraction, and wired three
downstream analysis pages (NOPLAT, Growth Revenue, Financial Ratio)
to live mode. CFS intentionally deferred to Session 012 per early
decision — partial CFS with missing capex / acc-payables data would
mislead DJP auditors, so the page stays in seed mode until Session
012 ships Fixed Asset + Acc Payables input.

### Delivered

**Generic editor framework**
- `src/components/forms/ManifestEditor.tsx` — client component that owns the hydration-seed + debounced-persist + computed-row pattern previously inlined in `BalanceSheetEditor`. Any input sheet now costs ~15 lines (parent gate + `<ManifestEditor manifest={X} sliceSelector={...} sliceSetter={...} yearCount={...} />`).
- `/input/balance-sheet/page.tsx` refactored to the new shape — zero behavior change, still seeds correctly after hydration via `useState` lazy initializer (LESSON-034).

**Signed computedFrom for subtraction**
- `deriveComputedRows` now treats negative `excelRow` in `computedFrom` as "subtract this row's series", keeping BS (all-positive refs) byte-identical. Unlocks IS subtotals that involve real subtraction (Gross Profit, EBIT, Net Profit) without asking users to enter expenses as negative numbers.
- 4 new unit tests cover signed subtraction, mixed signs, chained signed-ref subtotals, and explicit backward-compatibility regression.

**IS manifest + input page**
- `computedFrom` declarations added to every IS subtotal/total with fixture-grounded verification at 6-decimal precision across all four historical years:
  - row 8 Gross Profit = `[6, -7]`
  - row 15 Total OpEx = `[12, 13]`
  - row 18 EBITDA = `[8, -15]`
  - row 22 EBIT = `[18, -21]`
  - row 28 Net Interest = `[26, -27]` (relabeled from "Other Incomes" — fixture formula was actually `=C26+C27`, not an independent leaf)
  - row 30 Other Non-Op = leaf (was incorrectly labeled as subtotal)
  - row 32 Profit Before Tax = `[22, 28, 30]`
  - row 35 Net Profit After Tax = `[32, -33]`
- `/input/income-statement/page.tsx` — 15-line thin wrapper over `<ManifestEditor>`; nav entry activated (wip flag removed).

**`liveRows` prop on SheetPage**
- New optional `liveRows` prop lets downstream page wrappers hand SheetPage their own computed rows, taking precedence over the slug-based store lookup. `null` = "upstream missing, stay seed mode"; `undefined` = legacy store lookup for BS/IS/FA pages that don't need override.

**Three downstream pages live**
- **NOPLAT** (`/analysis/noplat`): new `src/data/live/compute-noplat-live.ts` projects IS store values onto NOPLAT manifest leaves (rows 7–10 EBIT chain, row 13 tax provision, rows 14–16 tax shields pinned to 0 matching prototype workbook). NOPLAT manifest gained `computedFrom` on rows 11 (EBIT), 17 (Total Taxes), 19 (NOPLAT) so existing `deriveComputedRows` pipeline fills subtotals. Direct formula approach (Approach B from plan) — no adapter/calc-engine chain, avoiding sign conversion fragility. 24 integration tests verify IS leaves → NOPLAT pipeline matches workbook fixture at 6-decimal precision for 8 rows × 3 years.
- **Growth Revenue** (`/analysis/growth-revenue`): new `compute-growth-revenue-live.ts` projects IS row 6 (Revenue) and IS row 35 (Net Profit After Tax, computed via IS manifest) onto GR rows 8 and 9. Existing `yoyGrowth` declarative derivation on the GR manifest fills the growth column group. 8 fixture tests pin the IS→GR mapping across all four years.
- **Financial Ratio** (`/analysis/financial-ratio`): new `compute-financial-ratio-live.ts` computes 14 of 18 ratios directly (profitability 6, liquidity 3, leverage 5) from BS + IS via readBs/readIs helpers that resolve leaves + subtotals through `deriveComputedRows`. 4 Cash Flow Indicator ratios pinned to 0 until Session 012 ships upstream data. `<FinancialRatioLiveView>` renders a contextual footer note in live mode explaining the zeros so users don't misread them as "no cash generation". 54 integration tests: 14 BS/IS ratios × 3 years + 4 zero placeholders × 3 years.

**SheetPage refactor**
- `SheetPage` accepts `liveRows` prop override that fully replaces the slug-based store lookup when defined. Keeps SheetPage generic — no sheet-specific calc knowledge inside. Downstream page wrappers (`NoplatLiveView`, `GrowthRevenueLiveView`, `FinancialRatioLiveView`) stay self-contained with explicit `useMemo` dependencies.

### Verification Results

```
Tests:     283 / 283 passing (27 files) — +114 vs Session 010 baseline
  deriveComputedRows (signed refs):        +4 tests (12 total)
  IS manifest fixture verification:        +24 tests
  computeNoplatLiveRows end-to-end:        +24 tests
  computeGrowthRevenueLiveRows:            +8 tests
  computeFinancialRatioLiveRows:           +54 tests
Build:     ✅ 20 routes, 13 static pages prerendered (+1 /input/income-statement)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
```

### Session 011 Stats

- Commits: 8 feature + 1 wrap-up
- New files: 11 (4 source + 4 test + 3 live-view wrappers)
- Files modified: 10 (IS manifest, NOPLAT manifest, SheetPage, nav-tree, BS input page, 3 analysis pages, deriveComputedRows, RowInputGrid untouched)
- New tests: 114
- Deploy: 1 production (Vercel auto-deploy on push to main)

### Architecture After Session 011

**Live data mode operational end-to-end for BS + IS + 3 downstream analysis sheets.** Full user flow now works:

1. Fill HOME form (tahunTransaksi, namaPerusahaan, etc.)
2. `/input/balance-sheet` — enter BS leaves, subtotals auto-compute via `deriveComputedRows`
3. `/input/income-statement` — enter IS leaves (all costs positive), subtotals auto-compute via signed computedFrom
4. `/historical/balance-sheet` and `/historical/income-statement` — auto-flip to live mode, show user data with common-size / growth derivations
5. `/analysis/noplat`, `/analysis/growth-revenue`, `/analysis/financial-ratio` — auto-flip to live mode, compute from upstream slices via lazy `useMemo`
6. Refresh browser → all data persisted via Zustand v3 migrate, no data loss

Zero regression on seed mode — when upstream slices are empty (user hasn't filled input), downstream pages fall back to prototype workbook data rendering.

**Lessons extracted**: no canonical lessons this session. All new patterns reuse LESSON-030 (backward-compatible additions via adapter synthesis), LESSON-031 (auto-detect mode from domain state), LESSON-032 (lazy useMemo per page), LESSON-033 (declarative computedFrom), LESSON-034 (hydration-gate child mount). Session 011 proved these five lessons compose correctly at scale — 3 downstream page wrappers all land in <30 lines each with zero touches to framework code.

### Deferred / Punted to Sessions 012+

- **Cash Flow Statement live mode** — needs CapEx from Fixed Asset + equity/loan/interest from Acc Payables (hidden sheet). Shipping partial would mislead DJP auditors (CFI/CFF always zero is indistinguishable from genuine zero cash activity). Session 012 will ship it alongside Fixed Asset input and Acc Payables foundation.
- **Fixed Asset input page** — Session 012 primary goal.
- **FCF live mode** — Session 012, depends on FA.
- **ROIC live mode** — Session 012, depends on NOPLAT + FA.
- **Validation warn border** on non-numeric input — deferred from Task 5 of Session 010, still deferred pending user feedback.

### Next Session — 012 (FA input + CFS/FCF/ROIC downstream)

1. Add FA `computedFrom` declarations + `/input/fixed-asset` page via `<ManifestEditor>` (~15 lines per LESSON-034)
2. Seed an ACC PAYABLES minimal input surface (hidden-sheet dependency for CFS)
3. Wire CFS live mode (Approach A with existing `toCashFlowInput` + `computeCashFlowStatement`, or Approach B direct formulas — evaluate per sign-convention fragility)
4. Wire FCF live mode
5. Wire ROIC live mode
6. Estimated: 2.5–3 jam, ~15 tests, 3 more pages newly live-capable

---

## Session 012 — 2026-04-12 (Phase 3 — FA Input + CFS/FCF/ROIC Live Mode)

Third Phase 3 execution session. Completed the entire historical analysis
live-mode stack: all 9 financial pages now auto-switch to live mode when
upstream data is present. Financial Ratio reached 18/18 ratios fully computed.

### Delivered

**Task 1 — Fixed Asset `computedFrom` + input page**
- 23 computed rows added to FA manifest via 3 new helpers: `endingCategoryRows` (Beginning + Additions per category), `netValueCategoryRows` (Ending Acq − Ending Dep with signed refs), plus `computedFrom` on all subtotal/total rows
- `/input/fixed-asset/page.tsx` — 60 lines (parent gate + ManifestEditor, yearCount=3)
- Nav-tree `wip: true` removed for Fixed Asset input
- 84 structural tests verify full 3-section roll-forward computation (synthetic data — FA fixture has all-None values)

**Task 2 — AccPayables Zustand slice (minimal)**
- `accPayables: AccPayablesInputState | null` added to store
- Zustand v3→v4 chained migration
- Dedicated input page deferred (YAGNI: prototype ACC PAYABLES values all zero, CFS defaults financing to 0 when null)
- 8 migration tests updated for v4 chain

**Task 3 — Cash Flow Statement live mode**
- `compute-cash-flow-live.ts` — maps BS+IS+FA+AP upstream data to 15 CFS leaf/pseudo-leaf rows
- Key complexity: CFS row 8 (Current Assets) has asymmetric formula — year 1 uses absolute level × -1, year 2+ uses delta × -1 (LESSON-013 cross-sheet offset fully handled)
- IS expenses sign-flipped from user-positive to workbook-negative in adapter
- CFS manifest gained `computedFrom` on 5 subtotal rows (10, 11, 19, 28, 30)
- `CashFlowLiveView.tsx` — BS+IS required, FA+AP optional (CapEx/financing default 0)
- 60 fixture-grounded tests: 20 rows × 3 years, all match workbook values
- Financial Ratio updated: 3 CF ratios (CFO/Sales, ST Debt Coverage, Capex Coverage) now live from CFS data

**Task 4 — FCF live mode**
- `compute-fcf-live.ts` — maps NOPLAT + FA + CFS upstream into 6 FCF leaf rows
- FCF manifest gained `computedFrom` on 3 subtotal rows (9, 18, 20)
- `FcfLiveView.tsx` — full upstream chain: IS → NOPLAT → CFS → FCF
- 27 fixture-grounded tests
- Financial Ratio row 27 (FCF/CFO) now live — **18/18 ratios fully computed**

**Task 5 — ROIC live mode**
- `compute-roic-live.ts` — maps FCF + BS invested capital into all ROIC rows
- Cross-year IC shift: row 13 (Beginning of Year IC) = prior year's row 12
- Year 1 rows 13/15 omitted (no prior-year baseline) — matches workbook behavior
- `RoicLiveView.tsx` — full upstream chain: IS → NOPLAT → CFS → FCF → ROIC + BS
- 21 fixture-grounded tests (including 2 undefined assertions for year-1 gaps)

### Verification Results

```
Tests:     476 / 476 passing (31 files) — +193 vs Session 011
Build:     ✅ 14 static pages prerendered (+1 /input/fixed-asset)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Live:      ✅ 15/15 routes HTTP 200
```

### Session 012 Stats

- Commits: 5 feature
- New files: 10 (5 adapters/views + 4 tests + 1 page)
- Files modified: 14
- New tests: 193
- Deploy: 1 production (Vercel auto-deploy on push to main)

### Key Decisions

1. **AccPayables store-only (no page)**: YAGNI — prototype AP has all zeros, CFS financing defaults to 0. Page can be added later.
2. **CFS Approach B (direct formulas)**: No adapter chain. CFS adapter maps upstream data directly to manifest rows, same as NOPLAT/GR/FR approach. Simpler than routing through `toCashFlowInput` + `computeCashFlowStatement`.
3. **FCF/ROIC accept pre-computed upstream**: Adapters receive already-processed NOPLAT/FA/CFS rows. View wrappers orchestrate the computation chain.
4. **ROIC all-in-adapter (no computedFrom)**: Row 13 (prior-year shift) and row 15 (ROIC ratio) require cross-year references that `computedFrom` can't express.
5. **safeDiv(0, x) = 0**: Added numerator=0 guard to avoid IEEE -0 from `0 / negative`.

### Deferred

- ACC PAYABLES input page — when user needs actual financing data input
- Validation warn border on non-numeric input — pending user feedback
- WACC + DCF (Session 013)
- AAM + EEM + Dashboard (Session 014)

### Next Session — 013 (WACC + DCF)

Per plan.md Phase 3 roadmap:
1. WACC input form (Rf, MRP, beta, tax rate, D/E components) — first fully custom form since DLOM/DLOC
2. Discount Rate computation from WACC
3. DCF valuation — terminal value + PV of projected cash flows
4. First **share value output** — the culmination of the entire tool
5. Estimated: ~14 tests, 2-3 new pages

## Session 013 — 2026-04-12 (Phase 3 — WACC + Discount Rate + Growth Rate)

Valuation foundation session. Three new pages, three new computation
modules, store v4→v5. Revised roadmap: DCF requires projection sheets
(PROY NOPLAT, PROY FA, PROY CFS) so DCF deferred to Session 016.

### Delivered

**Task 1 — WACC Input Form + Computation**
- `src/lib/calculations/wacc.ts` — `computeBetaUnlevered`, `computeRelleveredBeta`, `computeWacc` (full pipeline)
- `src/components/forms/WaccForm.tsx` — custom form with dynamic comparable companies table, market params, bank rates, computed display, WACC override ("Menurut WP")
- `src/app/valuation/wacc/page.tsx` — hydration-gated page
- Store v4→v5: `wacc: WaccState | null`, `discountRate: DiscountRateState | null` (both slices in one migration)
- 19 fixture-grounded tests at 12-decimal precision
- **Key finding**: WACC E22 = 0.1031 is hardcoded ("Menurut Wajib Pajak"), not computed. IS!B33 (tax rate for Hamada) = 0 (empty cell in workbook). Form allows user override.

**Task 2 — Discount Rate (CAPM) Computation**
- `src/lib/calculations/discount-rate.ts` — `computeBetaUnleveredCAPM`, `computeBetaLeveredCAPM`, `computeCostOfEquity`, `computeCostOfDebt`, `computeDebtRateFromBanks`, `computeDiscountRate`
- `src/components/forms/DiscountRateForm.tsx` — CAPM params input, bank rates, computed BU/BL/Ke/Kd/weights/WACC display
- `src/app/valuation/discount-rate/page.tsx` — hydration-gated page
- 15 fixture-grounded tests at 12-decimal precision
- **Key finding**: DISCOUNT RATE has DIFFERENT inputs from WACC (Rf=6.48% vs 2.70%, ERP=7.38% vs 7.62%). Two separate approaches intentionally. CAPM WACC (H10 = 0.11463062) is the one DCF will use.

**Task 3 — Growth Rate Live Computation**
- `src/lib/calculations/growth-rate.ts` — pure `computeGrowthRate` function
- `src/data/live/compute-growth-rate-live.ts` — maps BS + FA + ROIC upstream → Growth Rate with enriched input breakdown
- `src/app/analysis/growth-rate/page.tsx` — custom 2-column page (not manifest-based), full upstream chain: IS → NOPLAT → CFS → FCF → ROIC → Growth Rate
- 15 fixture-grounded tests (7 unit + 8 integration)
- **Key finding**: Growth Rate only has 2 years (last 2 of ROIC's 3 years), needs prior-year cross-references from BS and ROIC.

### Verification Results

```
Tests:     525 / 525 passing (35 files) — +49 vs Session 012
Build:     ✅ 17 static pages prerendered (+3)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
```

### Session 013 Stats

- Commits: 3 feature + 1 docs
- New files: 10 (3 calc modules + 2 form components + 3 pages + 2 test files)
- Files modified: 3 (store, nav-tree, migration tests)
- New tests: 49
- Store version: v4→v5

### Key Decisions

1. **Single store migration v4→v5** for both WACC and Discount Rate slices (vs separate v4→v5→v6).
2. **WACC and Discount Rate are independent pages** — different inputs, different approaches, both produce WACC but CAPM version is what DCF uses.
3. **Growth Rate is custom page** (not manifest-based) — only 2 columns, cross-sheet dependencies, doesn't fit manifest pattern.
4. **Growth Rate requires full upstream chain** (IS → NOPLAT → CFS → FCF → ROIC → Growth Rate) computed via useMemo.
5. **WACC override stored in state** — `waccOverride: number | null` allows "Menurut WP" value.

### Deferred

- ACC PAYABLES input page — still deferred (prototype zeros)
- DCF valuation — requires PROY sheets (Session 016)
- Seed mode for WACC/DR/GR pages — these are form/computed pages, seed mode not meaningful
- WACC/DR cross-linking to IS tax rate — currently user inputs manually

### Revised Roadmap

| Session | Focus | Outcome |
|---|---|---|
| ~~013~~ (this) | WACC + Discount Rate + Growth Rate | ✅ Valuation foundation |
| **014** (next) | KEY DRIVERS + PROY LR + PROY FA | Projection chain start |
| **015** | PROY BS + PROY NOPLAT + PROY CFS | Projection chain complete |
| **016** | DCF + AAM + EEM | **First share value output!** |

### Next Session — 014 (KEY DRIVERS + Projections Start)

1. KEY DRIVERS hidden sheet — extract key ratios from IS for projection
2. PROY LR (Projected Income Statement) — project revenue + expenses using key drivers
3. PROY FA (Projected Fixed Assets) — project asset schedule forward
4. Estimated: ~15-20 tests, 2-3 new pages, 1-2 new calc modules

