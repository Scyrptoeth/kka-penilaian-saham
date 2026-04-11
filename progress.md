# Progress — KKA Penilaian Saham

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
