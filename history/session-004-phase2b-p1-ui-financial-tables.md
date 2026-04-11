# Session 004 — Phase 2B P1: UI Financial Tables + Navigation

**Date**: 2026-04-11
**Scope**: Ship the UI layer for the hardened calc engine — reusable `<FinancialTable>`, formula tooltips, responsive hamburger shell, and 4 representative pages (BS, IS, Financial Ratio, FCF) rendering real workbook data end-to-end.
**Branch**: `feat/phase2b-ui-financial-tables` → merged to `main` (merge commit `fd9320a`)

## Goals (from plan.md)
- [x] Seed loader foundation (fixture → src tree bundling)
- [x] Manifest type + `buildRowsFromManifest` utility
- [x] `<FinancialTable>` reusable Server Component + `<FormulaTooltip>` client island
- [x] Responsive Shell with hamburger drawer (mobile) + fixed sidebar (desktop)
- [x] `/historical/balance-sheet` page
- [x] `/historical/income-statement` page
- [x] `/analysis/financial-ratio` page
- [x] `/analysis/fcf` page
- [x] Full verification gate (build/test/typecheck/lint)
- [x] Ship to main + Vercel deploy verification

## Delivered

### Foundation — seed + manifest layer
- `src/data/seed/loader.ts` — `loadCells(slug)` with `num`/`numOpt`/`formulaOf`/`textOf` helpers. Static JSON imports from `src/data/seed/fixtures/` so Next bundles at build time, zero runtime I/O.
- `scripts/copy-fixtures.cjs` — copies 6 required fixtures from `__tests__/fixtures/` into `src/data/seed/fixtures/`. New npm script `seed:sync`. Committed copies (~1MB).
- `src/data/manifests/types.ts` — `SheetManifest` + `ManifestRow` schema with optional derive column-group metadata (commonSize/growth via Excel column letters).
- `src/data/manifests/build.ts` — `buildRowsFromManifest(manifest, cells, derived?)` pure function. Auto-pulls Excel formula strings from fixture cells for the tooltip layer.
- `src/data/manifests/historical-derive.ts` — `deriveBalanceSheetColumns` + `deriveIncomeStatementColumns` bridging Phase 1 `YearlySeries` calc functions (`commonSizeBalanceSheet`, `growthBalanceSheet`, margin) into year-keyed shapes.

### Components — reusable table + tooltip
- `src/components/financial/types.ts` — `FinancialRow` + `FinancialTableProps` + `FormulaMeta` interfaces. Shared between server builder and client tooltip island.
- `src/components/financial/format.ts` — pure `formatIdr` (id-ID thousand separators with accounting parens for negatives), `formatPercent` (1-decimal), `isNegative`.
- `src/components/financial/FinancialTable.tsx` — Server Component with sticky first column + sticky header, tabular-nums right-aligned numbers, negative-in-red parentheses, `subtotal`/`total`/`header`/`separator` row types, optional commonSize/growth column groups.
- `src/components/financial/FormulaTooltip.tsx` — `'use client'` island. Hover-and-focus popover showing authored description + raw Excel formula auto-pulled from fixture. Accessible (aria-describedby, keyboard-focusable trigger button).

### Layout — responsive shell
- `src/components/layout/nav-tree.ts` — pure data `NAV_TREE: NavGroup[]` shared between desktop + mobile. WIP badge for unimplemented routes.
- `src/components/layout/SidebarNav.tsx` — `'use client'` wrapper rendering `NAV_TREE` with active-link highlighting via `usePathname`, optional `onNavigate` callback for closing drawer on navigation.
- `src/components/layout/SidebarHeader.tsx` — extracted brand header for reuse between desktop sidebar and mobile drawer.
- `src/components/layout/MobileShell.tsx` — `'use client'` component with hamburger top-bar + slide-in drawer + scrim + body scroll lock + Escape key. Drawer open state derived from `openedAt === pathname` so route change auto-closes without setState-in-effect (React Compiler compatible — see LESSON-016).
- `src/components/layout/Sidebar.tsx` — desktop static sidebar, rendered only on `lg+` via `hidden lg:flex`.
- `src/components/layout/Shell.tsx` — composes desktop sidebar + mobile shell + main content. Server component.

### Pages — 4 Tier P1 pages
| Route | Source sheet | Rows | Derived columns |
|---|---|---|---|
| `/historical/balance-sheet` | BALANCE SHEET (35 rows) | ASSETS + L&E sections | commonSize vs Total Assets + YoY growth |
| `/historical/income-statement` | INCOME STATEMENT (20 rows) | Revenue → Net Profit | margin vs Revenue + YoY growth |
| `/analysis/financial-ratio` | FINANCIAL RATIO (18 rows) | 4 sections | — (values are pre-computed ratios with per-row `valueKind` percent/ratio) |
| `/analysis/fcf` | FCF (10 rows) | 3 years pre-signed | — |

Every page is a Server Component that runs `loadCells` + manifest build + calc engine at build time. All 4 pages prerender as static routes.

## Verification
```
Tests:     107 / 107 passing (15 files, +17 new)
Build:     ✅ 9 routes, 4 P1 pages prerendered static
Lint:      ✅ zero warnings
Typecheck: ✅ tsc --noEmit clean
Smoke:     ✅ live BS 2018 Cash = 14.216.370.131 matches fixture exactly
```

## Stats
- Commits: 9 feature + 1 merge commit
- New files: 20
- Lines added: ~2000
- Test cases added: +17 (90 → 107)
- Dependencies: 0 new runtime deps

## Deviations from Plan
- Added `valueKind` per-row prop to `FinancialTable` mid-session (Task 7) because Financial Ratios need mixed formatting (some rows percent, some ratio, some currency). Not in original plan; necessary for FR page to render correctly without a second component.
- Added `formatRatio` helper in `format.ts` alongside `formatIdr` and `formatPercent`.

## Deferred
- `/historical/cash-flow`, `/historical/fixed-asset`, `/analysis/noplat`, `/analysis/growth-revenue` — pattern proven with 4 P1 pages, 4 remaining deferred to Session 2B.5.
- Input forms for user to replace seed data — Session 2C / 3.
- Per-section accent colors (blue/teal/amber) — uniform navy+gold kept for P1.
- Collapsible sidebar groups — all expanded in P1.
- Recharts visualization, dark mode, Excel export — unchanged from prior deferral list.

## Lessons Extracted
- [LESSON-016](../lessons-learned.md#lesson-016): React Compiler `react-hooks/set-state-in-effect` — derive state from props/path instead of effect + setState on path change
- [LESSON-017](../lessons-learned.md#lesson-017): Manifest-driven rendering — separate row layout data from render code for scaling
- [LESSON-018](../lessons-learned.md#lesson-018): Fixture-as-seed via `scripts/copy-fixtures.cjs` — Next can't import JSON outside src, copy at build time

## Files & Components Added/Modified
```
scripts/copy-fixtures.cjs                           [NEW]
package.json                                        [MODIFIED — added seed:sync script]
src/data/seed/loader.ts                             [NEW]
src/data/seed/fixtures/*.json                       [NEW — 6 sheets]
src/data/manifests/types.ts                         [NEW]
src/data/manifests/build.ts                         [NEW]
src/data/manifests/historical-derive.ts             [NEW]
src/data/manifests/balance-sheet.ts                 [NEW]
src/data/manifests/income-statement.ts              [NEW]
src/data/manifests/financial-ratio.ts               [NEW]
src/data/manifests/fcf.ts                           [NEW]
src/components/financial/types.ts                   [NEW]
src/components/financial/format.ts                  [NEW]
src/components/financial/FinancialTable.tsx         [NEW]
src/components/financial/FormulaTooltip.tsx         [NEW]
src/components/layout/nav-tree.ts                   [NEW]
src/components/layout/SidebarHeader.tsx             [NEW]
src/components/layout/SidebarNav.tsx                [NEW]
src/components/layout/MobileShell.tsx               [NEW]
src/components/layout/Sidebar.tsx                   [MODIFIED]
src/components/layout/Shell.tsx                     [MODIFIED]
src/app/historical/balance-sheet/page.tsx           [NEW]
src/app/historical/income-statement/page.tsx        [NEW]
src/app/analysis/financial-ratio/page.tsx           [NEW]
src/app/analysis/fcf/page.tsx                       [NEW]
__tests__/components/financial-table.test.tsx       [NEW — 13 tests]
__tests__/data/manifest-build.test.ts               [NEW — 4 tests]
```

## Next Session Recommendation
Based on the delivered foundation, the cleanest next steps are:
1. Systematize architecture gaps audit found (→ shipped as Session 005)
2. Complete 4 remaining pages via manifest-authoring only (→ Session 2B.5)
3. Introduce user input forms + DataSource abstraction (→ Session 3)
