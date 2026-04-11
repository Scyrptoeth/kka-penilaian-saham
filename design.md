# design.md — Session 2B P1: UI Financial Tables + Navigation

Branch: `feat/phase2b-ui-financial-tables`
Target: 4 representative pages rendered end-to-end from seed → adapter → validator → calc → `<FinancialTable>` with formula tooltip. Deferred 4 pages land in Session 2B.5.

## Problem

The calc engine was hardened in Sessions 2A + 2A.5, but no page renders anything — Zustand only holds `home`. Phase 2B builds the UI layer so a user can open the live website and see fully-rendered financial sheets with verifiable formulas.

## Chosen Approach

1. **Data source**: fixture-as-seed from the reference workbook `kka-penilaian-saham.xlsx`. Fixtures already exist under `__tests__/fixtures/*.json` (34 sheets). Session 2B copies the relevant ones into `src/data/seed/fixtures/` at build time and provides a typed loader that reshapes them into `YearKeyedSeries`. A small disclaimer ("Data demo workbook PT Raja Voltama Elektrik") is shown per page.
2. **Row mapping**: full TypeScript manifests, English labels (matches workbook). One manifest file per sheet under `src/data/manifests/`. Each entry points to an Excel row and declares its `indent`, `type`, and optional human-readable `formula` description. Cell values and raw Excel formulas are pulled live from the fixture index.
3. **Formula tooltip**: Level C hybrid — description authored in manifest + raw Excel formula auto-pulled from fixture cell. Shown on hover AND keyboard-focus for a11y. Rendered only on derived / subtotal / total rows.
4. **Mobile**: hamburger drawer pattern. Single `<Sidebar>` component, fixed on `lg+`, slide-in drawer `<lg`, toggled from a top bar hamburger button. Tailwind-only, no framework.
5. **Pages**: 4 in this session — Balance Sheet, Income Statement, Financial Ratio, FCF. Cover both layout "shapes": 4-year historical with common-size/growth (BS/IS) and 3-year sectioned tables (Ratios/FCF).

## Architecture

### Per-page render flow (Server Component default)
```
src/app/historical/balance-sheet/page.tsx  (Server)
  │
  ├─ loadCells('balance-sheet')            ← src/data/seed/loader.ts
  ├─ buildRowsFromManifest(manifest, cells)
  │    ├─ for each data row: pull num(cells, col+row) per year
  │    ├─ for derived rows: call commonSizeBalanceSheet / growthBalanceSheet
  │    └─ attach formula tooltip metadata from manifest + raw fixture formula
  └─ <FinancialTable title=… years=[2018,2019,2020,2021] rows=rows
                     showCommonSize showGrowth disclaimer=… />
```

Only `<FormulaTooltip>` and `<SidebarDrawer>` are client components. Everything else stays on the server for best bundle size.

### Key types

```ts
// src/data/seed/loader.ts
export interface FixtureCell {
  addr: string
  row: number
  col: number
  value: number | string | boolean | null
  formula?: string
}
export type CellMap = Map<string, FixtureCell>
export function loadCells(slug: SheetSlug): CellMap
export function num(cells: CellMap, addr: string): number
export function numOpt(cells: CellMap, addr: string): number | undefined
export function formulaOf(cells: CellMap, addr: string): string | undefined
```

```ts
// src/data/manifests/types.ts
export interface ManifestRow {
  excelRow: number
  label: string
  indent?: 0 | 1 | 2
  type?: 'normal' | 'subtotal' | 'total' | 'header' | 'separator'
  formula?: {
    values?: string       // description for input rows (usually omitted)
    commonSize?: string
    growth?: string
  }
  /** Optional pointer to which cells supply common-size/growth data.
   *  If omitted and row has derived columns, columns are auto-computed from the calc engine. */
  derived?: 'commonSize' | 'growth' | 'both'
}

export interface SheetManifest {
  title: string
  slug: 'balance-sheet' | 'income-statement' | 'financial-ratio' | 'fcf'
  years: number[]
  // col letter per year for each column group
  columns: Record<number, string>          // values cols (e.g. 2018:'C', 2019:'D', ...)
  commonSizeColumns?: Record<number, string>
  growthColumns?: Record<number, string>
  totalAssetsRow?: number                   // anchor for common-size denominator
  rows: ManifestRow[]
}
```

```ts
// src/components/financial/FinancialTable.tsx
export interface FinancialRow {
  label: string
  values: YearKeyedSeries
  indent?: 0 | 1 | 2
  type?: 'normal' | 'subtotal' | 'total' | 'header' | 'separator'
  commonSize?: YearKeyedSeries
  growth?: YearKeyedSeries
  formula?: {
    values?: { description: string; excelByYear?: Record<number, string> }
    commonSize?: { description: string; excelByYear?: Record<number, string> }
    growth?: { description: string; excelByYear?: Record<number, string> }
  }
}

export interface FinancialTableProps {
  title: string
  years: number[]            // main-value columns
  rows: FinancialRow[]
  showCommonSize?: boolean   // add common-size columns for years[1..]
  showGrowth?: boolean       // add growth columns for years[1..]
  currency?: string          // default 'IDR'
  disclaimer?: string
}
```

## Visual rules (taste-ui + design-system compliant)

- **Sticky first column** (label) + sticky header row
- **Numbers**: `font-mono tabular-nums`, right-aligned. IDR via `Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })`.
- **Negatives**: `(1.234.567)` in `text-negative` red.
- **Percentages**: `maximumFractionDigits: 1` with `%` suffix.
- **Indent**: `pl-2` / `pl-6` / `pl-10` for levels 0/1/2.
- `subtotal`: `font-semibold border-t border-grid-strong`
- `total`: `font-bold border-t-2 border-ink bg-canvas-raised`
- `header`: `uppercase tracking-wider text-[11px] bg-grid text-ink-soft`
- `separator`: thin gap row
- Alternating row tint, subtle
- Hover: `hover:bg-accent-soft/50`
- Focus-visible rings on tooltip triggers

## Mobile behavior

- Container: `overflow-x-auto` wrap around `<table>`
- First column: `sticky left-0 bg-inherit` + right shadow border
- `<lg`: sidebar hidden; top bar shows hamburger + page title; drawer slides from left when tapped
- `lg+`: sidebar fixed 256px left; top bar hidden

## Out of scope (deferred)

- Pages: `/historical/cash-flow`, `/historical/fixed-asset`, `/analysis/noplat`, `/analysis/growth` → Session 2B.5
- Input forms (user replaces seed data) → Session 2C
- Per-section accent colors — uniform navy+gold in P1
- Collapsible sidebar groups — all expanded in P1
- Recharts visualisation
- Dark mode
- Excel export

## Verification gates

1. `npm run build 2>&1 | tail -25` → zero errors
2. `npm test` → all prior 90 tests + new ones green
3. `npm run lint` → zero warnings
4. `npx tsc --noEmit` → exit 0
5. Manual: navigate sidebar to 4 P1 pages, data renders
6. Manual: hover cell → tooltip with description + raw Excel formula
7. Manual: mobile width 375px → first column sticky, hamburger works
8. Live: push `main` → Vercel auto-deploy → verify `https://kka-penilaian-saham.vercel.app` returns 200 with new pages
