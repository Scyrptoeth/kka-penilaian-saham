# Progress — KKA Penilaian Saham

## Index

| # | Session | Topic | Status | History |
|---|---|---|---|---|
| 001 | 2026-04-11 | Scaffold + Foundation (Phase 1) | ✅ Shipped | [session-001](history/session-001-scaffold-foundation.md) |
| 002 | 2026-04-11 | Phase 2A — 6 calc engines | ✅ Shipped | [session-002](history/session-002-phase2-calc-engines.md) |
| 003 | 2026-04-11 | Phase 2A.5 — Harden calc engine (YearKeyedSeries + Zod + adapters) | ✅ Shipped | [session-003](history/session-003-harden-calc-engine.md) |
| 004 | — | Phase 2B — UI layer (FinancialTable + historical/analysis pages) | 📋 Planned | — |

## Current State Snapshot (latest)

- **Branch**: `main` (synced with `origin/main`)
- **Tests**: 90 / 90 passing across 13 files
- **Build**: ✅ clean, zero errors, zero warnings
- **Lint**: ✅ clean
- **Typecheck**: ✅ `tsc --noEmit` exit 0
- **Live**: https://kka-penilaian-saham.vercel.app (HTTP 200)
- **Pipeline proven end-to-end**: `raw data → adapter → Zod validator → pure calc → result` (integration test green)

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
