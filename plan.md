# Plan — Session 2B P1: UI Financial Tables + Navigation

Branch: `feat/phase2b-ui-financial-tables`
Target: 4 historical/analysis pages rendered end-to-end with `<FinancialTable>` + formula tooltip + responsive sidebar. All 90 existing tests stay green. Push to `main` → Vercel deploy.

## Tasks

### Task 1 — Seed loader foundation
- Add `scripts/copy-fixtures.cjs` that copies `__tests__/fixtures/{balance-sheet,income-statement,fcf,financial-ratio,cash-flow-statement,fixed-asset}.json` → `src/data/seed/fixtures/`
- Add npm script `seed:sync` and run once; commit copied JSON
- `src/data/seed/loader.ts`: `loadCells(slug)` returning `CellMap`, plus `num`, `numOpt`, `formulaOf`, `textOf` helpers
- `src/types/financial.ts` extensions: none yet — stay with `YearKeyedSeries`
- **Verify**: `npm run typecheck` clean after adding loader; no new test yet

### Task 2 — Manifest type + builder utility
- `src/data/manifests/types.ts`: `ManifestRow`, `SheetManifest` types
- `src/data/manifests/build.ts`: `buildRowsFromManifest(manifest, cells, derivedFns?)` → `FinancialRow[]`
  - Pulls values from cells via `manifest.columns[year] + row.excelRow`
  - Attaches `formula.values` (description + per-year Excel formula from fixture)
  - Attaches commonSize/growth when manifest declares those column groups
  - Unit test: `__tests__/components/manifest-build.test.ts` — fixture-free synthetic cells, assert structure
- **Verify**: new test green, all existing 90 still green

### Task 3 — `<FinancialTable>` + `<FormulaTooltip>`
- `src/components/financial/FinancialTable.tsx` — Server Component shell, static table markup
- `src/components/financial/FormulaTooltip.tsx` — `'use client'` island, hover + focus, accessible popover
- `src/components/financial/format.ts` — pure `formatIdr`, `formatPercent`, `isNegative` helpers
- Component test `__tests__/components/financial-table.test.tsx`:
  - Renders headers for years
  - Negative numbers wrapped in parens and coloured negative
  - Indent classes applied
  - subtotal/total type classes applied
- **Verify**: all tests green, zero lint warnings

### Task 4 — Responsive Shell + Sidebar drawer
- Convert `src/components/layout/Sidebar.tsx` into pure nav list (still server-safe)
- Add `src/components/layout/SidebarDrawer.tsx` — `'use client'` wrapper with `useState` open flag + body scroll lock
- Add `src/components/layout/TopBar.tsx` — hamburger button + page title, visible `<lg`
- Update `src/components/layout/Shell.tsx` to compose: static sidebar on `lg+`, drawer + top bar `<lg`
- Active link state: `usePathname` in client TopBar; highlight active link via pathname comparison in client wrapper (or pass current path from RSC via prop — simpler)
- **Verify**: dev server renders shell, navigate works on both widths

### Task 5 — Balance Sheet manifest + page
- Author `src/data/manifests/balance-sheet.ts` with ~35 rows mirroring fixture BS
- `src/app/historical/balance-sheet/page.tsx` — Server Component using loader + manifest + `commonSizeBalanceSheet` + `growthBalanceSheet`
- Supplies Total Assets line for common-size denominator
- **Verify**: dev page renders 4-year BS with common-size and growth columns, tooltips show on derived rows

### Task 6 — Income Statement manifest + page
- `src/data/manifests/income-statement.ts` with ~20 rows
- `src/app/historical/income-statement/page.tsx` using `yoyGrowthIncomeStatement` + `marginRatio` derivations
- **Verify**: renders 4-year IS

### Task 7 — Financial Ratio manifest + page
- `src/data/manifests/financial-ratio.ts` — 4 sections (Profitability, Liquidity, Leverage, Cash Flow) × 18 ratios, section headers
- `src/app/analysis/financial-ratio/page.tsx` — read ratio outputs directly from fixture cells (no recompute; pure render of already-verified values). Tooltips cite formula per ratio row.
- **Verify**: renders sectioned ratio table

### Task 8 — FCF manifest + page
- `src/data/manifests/fcf.ts` — 10 rows (NOPLAT, Depreciation, Gross CF, WC changes, Capex, FCF)
- `src/app/analysis/fcf/page.tsx` — read fixture cells directly, show 3-year values
- **Verify**: renders 3-year FCF page

### Task 9 — Full verification gate
- `npm run build 2>&1 | tail -25` — zero errors
- `npm test` — ≥ 90 (existing) + new component tests all green
- `npm run lint` — zero warnings
- `npx tsc --noEmit` — exit 0
- Manual dev server smoke: click through all 4 new pages
- **Verify**: all gates green

### Task 10 — Ship: merge, push, deploy, verify live
- Update `progress.md` with Session 004 summary
- `git checkout main && git pull && git merge feat/phase2b-ui-financial-tables --no-ff -m "feat(ui): phase 2b p1 — financial tables + navigation"`
- `git push origin main` → triggers Vercel production deploy
- Poll `https://kka-penilaian-saham.vercel.app` + `/historical/balance-sheet` until HTTP 200
- Delete feature branch locally
- **Verify**: live site renders new pages, tooltips work, mobile responsive

## Progress

- [ ] Task 1 — Seed loader foundation
- [ ] Task 2 — Manifest type + builder utility
- [ ] Task 3 — FinancialTable + FormulaTooltip
- [ ] Task 4 — Responsive Shell + Sidebar drawer
- [ ] Task 5 — Balance Sheet manifest + page
- [ ] Task 6 — Income Statement manifest + page
- [ ] Task 7 — Financial Ratio manifest + page
- [ ] Task 8 — FCF manifest + page
- [ ] Task 9 — Full verification gate
- [ ] Task 10 — Ship to main + Vercel deploy verification
