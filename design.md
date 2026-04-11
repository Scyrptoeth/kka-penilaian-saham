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

---

# design.md — Phase 3: Live Data Mode (added 2026-04-12)

> **Status**: Architectural decisions approved, implementation pending Sessions 010-014.
> **Context**: After Sessions 008.5 + 008.6, semua 9 financial pages clearly marked
> sebagai "MODE DEMO · WORKBOOK PROTOTIPE" — aplikasi jujur tentang sumber data.
> Phase 3 adalah transisi dari demo viewer ke **tool penilaian aktif** dimana
> Penilai DJP memasukkan data perusahaan mereka sendiri.

## Problem

Aplikasi sekarang adalah demo viewer untuk workbook prototipe (PT Raja Voltama
Elektrik). 9 financial pages membaca data dari `src/data/seed/fixtures/*.json`
dan **mengabaikan total** apa yang user isi di HOME form. Konsekuensi:
- User tidak bisa menilai perusahaan apapun selain PT Raja Voltama
- Header HOME → form input bekerja, tapi tidak feed ke financial sheets
- Aplikasi tidak memiliki nilai tambah untuk user real

Phase 3 fixes this with a **live data mode** dimana:
- BS, IS, dan Fixed Asset jadi input forms yang user isi sendiri
- 6 downstream sheets (CFS, FR, FCF, NOPLAT, Growth Revenue, ROIC) auto-compute
  dari user input via existing pure calc engine
- WACC, DCF, AAM, EEM (valuation chain) consume the live data untuk produce
  final share-value valuation

## 6 Architectural Decisions (approved 2026-04-12)

### Decision 1 — DataSource: Synthesize CellMap from store, zero pipeline changes

**Approach**: Maintain existing `CellMap = ReadonlyMap<string, FixtureCell>`
interface. Add parallel function `buildLiveCellMap(manifest, liveData): CellMap`
yang **synthesize** CellMap-shape dari Zustand store data.

**Critical insight**: `build.ts`, `applyDerivations`, dan semua derivation
primitives **TIDAK PERNAH BERUBAH**. Mereka tetap consume CellMap. Live mode
hanya menambah satu adapter point: `live data → CellMap`, mirroring how seed
mode loads `JSON → CellMap` via `loadCells()`.

**Konkret**:
```ts
// New file: src/data/live/build-cell-map.ts
export function buildLiveCellMap(
  manifest: SheetManifest,
  liveData: { rows: Record<number, YearKeyedSeries> },
  years: number[]
): CellMap {
  const map = new Map<string, FixtureCell>()
  for (const [excelRowStr, series] of Object.entries(liveData.rows)) {
    const excelRow = Number(excelRowStr)
    for (const year of years) {
      const value = series[year] ?? 0
      // Synthetic addresses — never seen by user, internal handle only.
      // Live mode uses LIVE: prefix to keep it distinct from real Excel cells.
      const addr = `LIVE:${excelRow}:${year}`
      map.set(addr, { addr, row: excelRow, col: 0, value, data_type: 'n' })
    }
  }
  return map as ReadonlyMap<string, FixtureCell>
}
```

**Mode detection** di `SheetPage`:
```ts
const home = useKkaStore((s) => s.home)
const sheetData = useKkaStore((s) => s[manifest.slug] /* TBD */)
const isLive = home !== null && sheetData !== null
const cells = isLive
  ? buildLiveCellMap(manifest, sheetData, computeHistoricalYears(home.tahunTransaksi, manifest.historicalYearCount ?? 4))
  : loadCells(manifest.slug)
```

**Rationale**: Minimal architectural disruption. ZERO changes to `build.ts`,
`applyDerivations`, derivation primitives, atau existing 133 tests. New code
hanya di `src/data/live/`. Pattern proven works (we already use CellMap
synthesis untuk seed via JSON imports — live mode is symmetric).

**Trade-off accepted**: `SheetPage` becomes client component (was Server).
Acceptable karena Next.js prerenders client components when they don't depend
on request data, dan store reads happen client-side after hydration.

### Decision 2 — Input Forms: Separate `/input/*` routes, ManifestRow-driven

**Routes**:
```
/input/balance-sheet      ← form, 27 rows × 4 years = 108 fields
/input/income-statement   ← form, 35 rows × 4 years = 140 fields
/input/fixed-asset        ← form, category-based ~54 fields
```

Existing `/historical/*` and `/analysis/*` routes tetap ada — sekarang
**mode-aware** (read live data jika ada, fallback ke seed jika belum).

**Form generation pattern**:
```tsx
{manifest.rows
  .filter(row => row.excelRow !== undefined && row.type !== 'header' && row.type !== 'separator')
  .map(row => (
    <RowInputGroup
      key={row.excelRow}
      row={row}
      years={computedYears}
      computedTotal={row.type === 'subtotal' || row.type === 'total'}
    />
  ))
}
```

Subtotal/total rows **TIDAK editable** — auto-computed display only menggunakan
formula yang sama dengan calc engine. Header/separator rows skipped.

**Per cell**: `<input type="text" inputMode="numeric">`, IBM Plex Mono,
tabular-nums, right-aligned. Tab navigation native HTML.

**Paste handler** (critical for Penilai DJP workflow):
```ts
function parseUserInput(raw: string): number {
  // Strip "Rp", spaces, dots (thousand sep), parse comma as decimal
  const cleaned = raw.replace(/Rp/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.')
  const num = Number(cleaned)
  return Number.isFinite(num) ? num : 0
}
```

Test cases yang harus pass:
- `"1.234.567"` → `1234567`
- `"Rp 14.216.370.131"` → `14216370131`
- `"-3.182.342.447"` → `-3182342447`
- `"(750.000)"` → `-750000`  (akuntansi convention)
- `"1234567,89"` → `1234567.89`  (Indonesian decimal)

**Auto-save**: debounced 500ms ke Zustand store. Visual feedback: field border
flash green saat saved.

**Validation**:
- Numeric only (warn on non-numeric, don't block)
- Empty field defaults to 0
- Negative values allowed (some line items legitimately negative)
- Cross-row consistency: soft warnings only (e.g. "Total Assets ≠ Sum of items"
  → yellow indicator, not error)

**Sidebar layout** (Phase 3):
```
Input Master
  HOME

Input Data           ← NEW group
  Balance Sheet
  Income Statement
  Fixed Asset

Historis             ← existing, now mode-aware
  Balance Sheet
  Income Statement
  Cash Flow
  Fixed Asset

Analisis             ← existing, now mode-aware
  Financial Ratio
  FCF
  NOPLAT
  Growth Revenue
  ROIC

Penilaian            ← existing
  DLOM
  DLOC (PFC)
  WACC               ← Session 013
  DCF                ← Session 013
  AAM                ← Session 014
  EEM                ← Session 014

Ringkasan
  Dashboard          ← Session 014
```

**Rationale**: Separation of concerns. Input form dan output table butuh layout
yang sangat berbeda (vertical input list vs tabular display). Penilai DJP
workflow natural: input dulu, lalu review hasil. State complexity lebih rendah
karena tidak perlu toggle mode di komponen yang sama.

### Decision 3 — Year Span: `historicalYearCount` field di manifest, runtime derive

**Manifest extension**:
```ts
interface SheetManifest {
  // ... existing fields (years, columns kept for seed mode backward compat)
  historicalYearCount?: 3 | 4  // BS/IS = 4, others = 3
}
```

**New helper** di `src/lib/calculations/helpers.ts`:
```ts
/**
 * Compute historical year span from transaction year and required count.
 * Last historical year = tahunTransaksi - 1.
 *
 *   computeHistoricalYears(2024, 4)  → [2020, 2021, 2022, 2023]
 *   computeHistoricalYears(2024, 3)  → [2021, 2022, 2023]
 */
export function computeHistoricalYears(
  tahunTransaksi: number,
  count: 3 | 4
): number[] {
  const lastYear = tahunTransaksi - 1
  return Array.from({ length: count }, (_, i) => lastYear - count + 1 + i)
}
```

**SheetPage usage** (live mode only):
```ts
const years = isLive
  ? computeHistoricalYears(home.tahunTransaksi, manifest.historicalYearCount ?? 4)
  : manifest.years  // seed mode: hardcoded years 2018-2021
```

**Seed mode unchanged** — `manifest.years` dan `manifest.columns` tetap dipakai
karena fixture JSON memang locked ke years 2018-2021. Live mode purely runtime.

**Rationale**: Backward compatible. Field `historicalYearCount: 3 | 4` adalah
satu-satunya new metadata yang perlu ditambah ke 9 existing manifests (one-line
addition each).

### Decision 4 — Cross-Sheet Dependencies: Lazy compute via `useMemo` per page

**Pattern**:
```tsx
// src/app/historical/cash-flow/page.tsx (after migration)
'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { SheetPage } from '@/components/financial/SheetPage'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'
import { computeCashFlowStatement } from '@/lib/calculations/cash-flow'
import { toCashFlowInput } from '@/lib/adapters/cash-flow-adapter'

export default function CashFlowPage() {
  const home = useKkaStore((s) => s.home)
  const bs = useKkaStore((s) => s.balanceSheet)
  const is = useKkaStore((s) => s.incomeStatement)

  const liveData = useMemo(() => {
    if (!home || !bs || !is) return null
    const years = computeHistoricalYears(home.tahunTransaksi, 3)
    const input = toCashFlowInput(bs, is, years)  // adapter handles sign-flip
    return computeCashFlowStatement(input)
  }, [home, bs, is])

  if (!liveData && (bs || is)) {
    return <EmptyState message="Lengkapi BS dan IS dulu untuk melihat Cash Flow" />
  }

  return <SheetPage manifest={CASH_FLOW_STATEMENT_MANIFEST} liveData={liveData} />
}
```

**Decisions encoded**:
- Subscribe via Zustand selectors → only re-render when relevant slices change
- `useMemo` with explicit deps → recompute only on input change
- Pure calc functions (existing) → no rewrite, just wire
- Empty state when upstream incomplete → user-friendly fallback
- 9 sheets × ~3000 cells = lazy ~3000 cells per page visit (vs 27000 eager)

**Performance target**: < 50ms compute per downstream page navigation. Existing
calc functions are simple loops over `YearKeyedSeries` — well within target.

**No global recompute on input change** — only the visible page re-renders.
React's `useMemo` + Zustand's selector subscription handle "what to recompute
when" without explicit dependency graph maintenance.

### Decision 5 — Migration Plan: Incremental, BS pilot first

5 sessions (~3 jam each), pure additive — no breaking changes ke existing code:

**Session 010** — DataSource foundation + BS pilot
**Session 011** — IS input + first downstream wave (CFS, FR, NOPLAT, Growth Revenue)
**Session 012** — Remaining downstream + Fixed Asset (FCF, ROIC)
**Session 013** — WACC + DCF (first valuation page)
**Session 014** — AAM + EEM + Final Summary Dashboard

Detail per session di `plan.md`. Acceptance criteria per session:
- All existing tests still passing (currently 133)
- New tests added per new module (target: +5-10 tests per session)
- `<DataSourceHeader>` flips dari "seed" ke "live" otomatis saat user input data
- Build, lint, typecheck tetap clean
- Production deploy verified live setelah setiap session

### Decision 6 — Mode Toggle: Auto-switch + "Reset & Lihat Demo" escape hatch

**Default behavior**:
- `home === null` → seed mode di semua financial pages
- `home !== null` → live mode (data may be empty initially per sheet, show empty states gracefully)

**No URL routing complexity** — single source of truth: store state.

**Reset path** (escape hatch untuk demo viewing):
- Sidebar footer button "Reset & Lihat Demo" (small, secondary style)
- On click: open confirmation modal dengan warning prominent
- On confirm: clear all store slices (`home`, `dlom`, `dloc`, `balanceSheet`,
  `incomeStatement`, `fixedAsset`, etc.) → fresh state → seed mode restored
- Warning text: "Ini akan menghapus semua data input Anda dan menampilkan
  workbook prototipe. Yakin?"

**HOME page first visit**: prominent CTA explaining state — "Selamat datang di
KKA Penilaian Saham. Halaman ini saat ini menampilkan data prototipe (PT Raja
Voltama Elektrik). Mulai isi form di bawah untuk menilai perusahaan Anda
sendiri."

**Rationale**: Single source of truth mental model. User tidak perlu remember
"saya dalam mode apa". Reset path tetap available untuk demo viewing tanpa
permanent data loss (warning explicit). Penilai DJP workflow: lihat demo dulu
(familiar dengan format) → mulai penilaian → setelah selesai, jika perlu
compare dengan demo, reset (jarang).

## Out of Scope (Phase 3 deferred ke Phase 4+)

- File upload parsing (.xlsx → live data) — Penilai DJP prefer manual input
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device — non-negotiable #2 (privacy-first, no server storage)
- Real-time collaboration
- Audit trail / change history
- Export ke .xlsx via ExcelJS — Phase 4 nice-to-have

## Verification Gates per Session

Setiap session di Phase 3 (010-014) WAJIB hijau di gauntlet ini sebelum push:
```bash
npm test 2>&1 | tail -15          # all tests passing
npm run build 2>&1 | tail -25     # clean, all routes static or client-prerendered
npx tsc --noEmit 2>&1 | tail -5   # zero errors
npm run lint 2>&1 | tail -5       # zero warnings
```

Plus production smoke after deploy:
- `<DataSourceHeader>` switches mode correctly based on store state
- Filling input form → auto-save → navigate ke output page → see live data
- Reset button clears store → mode reverts ke seed

## Lesson Candidates dari Phase 3 Design

- **LESSON-030** (kandidat, **promote**): Backward-compatible additions > breaking refactor. Phase 3 adds live mode tanpa mengubah `build.ts`/`applyDerivations`/derivation primitives. Synthesize CellMap dari live data adalah single adapter point. Pattern: when adding a new capability to a stable pipeline, prefer adding parallel adapter over modifying core.
- **LESSON-031** (kandidat, **promote**): Auto-detect mode dari domain state lebih simpel daripada explicit prop atau toggle. `home === null` adalah natural sentinel untuk "user belum mulai penilaian". Avoid creating mode flags or toggles when domain state already encodes the answer.
- **LESSON-032** (kandidat, **promote**): Lazy compute via `useMemo` per page lebih scalable dari global reactive graph untuk app dengan moderate compute. ~3000 cells × 9 sheets eager = wasted compute pada sheets yang user tidak lihat. Lazy = 9× efficiency improvement, zero infrastructure cost.

