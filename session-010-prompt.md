# Session 010 — DataSource Foundation + Balance Sheet Pilot

## Objective

Build the foundation for live data mode dan deliver Balance Sheet sebagai pilot end-to-end. Setelah sesi ini, user bisa: isi HOME form → isi `/input/balance-sheet` → lihat `/historical/balance-sheet` auto-switch ke live data.

Ini adalah session pertama dari Phase 3 roadmap (010-014). Arsitektur sudah di-design dan di-approve di Session 009 (`design.md` section "Phase 3 — Live Data Mode"). Sesi ini **execute, bukan design**.

---

## Cumulative State (entering Session 010)

```
Pages:     11 live (HOME + 9 financial + DLOM + DLOC)
Tests:     133 / 133 passing (19 files)
Build:     ✅ 17 routes, 11 static pages prerendered
Lessons:   32 (16 promoted to always-load)
Sessions:  001-009 all closed
Store:     v2 with home/dlom/dloc slices
Pipeline:  Seed fixtures → loadCells → buildRowsFromManifest → FinancialRow[] → FinancialTable
Mode:      DataSourceHeader mode="seed" on all 9 financial pages
```

---

## Open Questions — Finalized

4 open questions dari Session 009, sekarang dijawab:

1. **Default values di input forms**: **Empty**. Tidak pre-fill dari demo. Empty fields dengan placeholder hint. Alasan: pre-fill demo data akan membingungkan user — bisa mengira angka PT Raja Voltama adalah angka perusahaan mereka.

2. **Year span saat HOME belum diisi**: **Disable input pages dengan friendly message**. Tanpa `tahunTransaksi`, tidak bisa derive tahun historis. Message: "Lengkapi HOME form terlebih dahulu untuk mulai input data" + link ke HOME page.

3. **Multi-case management**: **Defer ke Phase 4**. Satu penilaian per browser session cukup untuk v1.

4. **WACC default values**: **Yes, hardcoded reasonable defaults, fully editable**. Relevant di Session 013, bukan sekarang. Noted for later.

---

## Execution Plan (dari plan.md + design.md, refined)

### Task 1: Extend Zustand Store (~20 min)

**File**: `src/lib/store/useKkaStore.ts`

- Tambah `balanceSheet: BalanceSheetInputState | null` slice ke `useKkaStore`
- Tambah placeholder slices: `incomeStatement: IncomeStatementInputState | null`, `fixedAsset: FixedAssetInputState | null` (null, populated di Session 011-012)
- Tambah actions: `setBalanceSheet`, `setIncomeStatement`, `setFixedAsset`, plus reset per-slice
- Import types dari `src/data/live/types.ts` (Task 2)

**Migration v2 → v3** (KRITIS — LESSON-028):
- Bump `STORE_VERSION` dari 2 ke 3
- Extend `migratePersistedState` function:
  - v1 → v2: existing logic (carry home, init dlom/dloc null) — JANGAN HAPUS
  - v2 → v3: carry forward home/dlom/dloc, init `balanceSheet: null, incomeStatement: null, fixedAsset: null`
  - Chain: jika fromVersion === 1, migrate ke v2 dulu, lalu v2 → v3

```ts
export function migratePersistedState(
  persistedState: unknown,
  fromVersion: number,
): unknown {
  let state = persistedState

  // v1 → v2: Session 008 added dlom/dloc slices
  if (fromVersion < 2 && state !== null && typeof state === 'object') {
    const v1 = state as { home?: unknown }
    state = { home: v1.home ?? null, dlom: null, dloc: null }
  }

  // v2 → v3: Session 010 added balanceSheet/incomeStatement/fixedAsset slices
  if (fromVersion < 3 && state !== null && typeof state === 'object') {
    state = { ...state, balanceSheet: null, incomeStatement: null, fixedAsset: null }
  }

  return state
}
```

- Update `partialize` untuk persist semua 6 slices:
```ts
partialize: (state) => ({
  home: state.home,
  dlom: state.dlom,
  dloc: state.dloc,
  balanceSheet: state.balanceSheet,
  incomeStatement: state.incomeStatement,
  fixedAsset: state.fixedAsset,
}),
```

**State interface update**:
```ts
interface KkaState {
  // Existing slices
  home: HomeInputs | null
  dlom: DlomState | null
  dloc: DlocState | null
  // NEW: Phase 3 input data slices
  balanceSheet: BalanceSheetInputState | null
  incomeStatement: IncomeStatementInputState | null
  fixedAsset: FixedAssetInputState | null
  // Existing actions
  setHome: (home: HomeInputs) => void
  resetHome: () => void
  setDlom: (dlom: DlomState) => void
  setDloc: (dloc: DlocState) => void
  // NEW: Phase 3 actions
  setBalanceSheet: (bs: BalanceSheetInputState) => void
  setIncomeStatement: (is: IncomeStatementInputState) => void
  setFixedAsset: (fa: FixedAssetInputState) => void
  resetBalanceSheet: () => void
  resetIncomeStatement: () => void
  resetFixedAsset: () => void
  // Hydration
  _hasHydrated: boolean
  _setHasHydrated: (hydrated: boolean) => void
}
```

**Test**: Update `__tests__/lib/store/store-migration.test.ts`:
- Test v1→v3 migration: preserves home, initializes dlom/dloc/balanceSheet/incomeStatement/fixedAsset as null
- Test v2→v3 migration: preserves home/dlom/dloc, initializes 3 new slices as null
- Test v3→v3: no-op (future-proof)

### Task 2: Live Data Types + Adapter (~30 min)

**`src/data/live/types.ts`** — NEW file:
```ts
import type { YearKeyedSeries } from '@/types/financial'

/**
 * User-input state for Balance Sheet.
 * Keys = excelRow numbers from manifest, values = YearKeyedSeries.
 * Only editable rows stored — computed rows (subtotals/totals) derived at render time.
 */
export interface BalanceSheetInputState {
  rows: Record<number, YearKeyedSeries>  // excelRow → { year: value }
}

export interface IncomeStatementInputState {
  rows: Record<number, YearKeyedSeries>
}

export interface FixedAssetInputState {
  rows: Record<number, YearKeyedSeries>
}
```

**`src/data/live/build-cell-map.ts`** — NEW file, THE critical adapter:

> **PENTING**: Sebelum implement, baca `src/data/manifests/build.ts` function `readValues` (line ~33-46). Cara `readValues` membaca cells:
>
> ```ts
> function readValues(cells, manifest, excelRow) {
>   for (const year of manifest.years) {
>     const col = manifest.columns[year]   // e.g. "D"
>     const v = numOpt(cells, `${col}${excelRow}`)  // e.g. "D8"
>     if (v !== undefined) out[year] = v
>   }
> }
> ```
>
> Jadi `readValues` constructs cell address = `"${col}${excelRow}"` dimana `col` datang dari `manifest.columns[year]`.
>
> **Untuk live mode**, kita perlu memberi `buildRowsFromManifest` sebuah CellMap yang bisa di-lookup dengan address pattern ini. Ada 2 approach:
>
> **Approach A (Recommended)**: Generate synthetic column letters yang match `manifest.columns` pattern. Jika manifest punya `columns: { 2020: 'C', 2021: 'D', 2022: 'E', 2023: 'F' }`, maka live CellMap harus store data di alamat yang sama (`C8`, `D8`, dll). Ini artinya `buildLiveCellMap` perlu `manifest.columns` ATAU kita generate dynamic `columns` untuk live years.
>
> **Approach B**: Override `manifest.years` dan `manifest.columns` saat live mode, passing new columns object. Tapi ini butuh `buildRowsFromManifest` signature change.
>
> **Approach C (Simplest, recommended)**: Generate synthetic columns mapping untuk live years. Assign column letters A, B, C, D... to dynamic years. Buat `manifest`-like override object yang punya `years: liveYears` dan `columns: { [year]: syntheticCol }`. Pass ini ke `buildRowsFromManifest` instead of the seed manifest.
>
> Pilih approach yang paling clean setelah membaca `build.ts`. Kunci: `buildRowsFromManifest(manifest, cells)` HARUS bisa consume live CellMap TANPA modifikasi ke build.ts. Jika perlu extend signature, itu acceptable (e.g. passing `years` override).

```ts
import type { CellMap, FixtureCell } from '@/data/seed/loader'
import type { SheetManifest } from '@/data/manifests/types'
import type { YearKeyedSeries } from '@/types/financial'

/**
 * Synthesize a CellMap from live user data, compatible with existing
 * buildRowsFromManifest() pipeline.
 *
 * Creates cell entries at addresses that match the column layout expected
 * by readValues() in build.ts: address = `${colLetter}${excelRow}`.
 *
 * @param liveColumns - Column letter mapping for live years (e.g. { 2020: 'C', 2021: 'D' })
 * @param liveData - User input: excelRow → year → value
 * @param years - Ordered array of historical years
 */
export function buildLiveCellMap(
  liveColumns: Record<number, string>,
  liveData: Record<number, YearKeyedSeries>,
  years: number[],
): CellMap {
  const map = new Map<string, FixtureCell>()

  for (const [excelRowStr, series] of Object.entries(liveData)) {
    const excelRow = Number(excelRowStr)
    for (const year of years) {
      const col = liveColumns[year]
      if (!col) continue
      const value = series[year] ?? 0
      const addr = `${col}${excelRow}`
      map.set(addr, {
        addr,
        row: excelRow,
        col: col.charCodeAt(0) - 64, // A=1, B=2, ...
        value,
        data_type: 'n',
      })
    }
  }

  return map as CellMap
}

/**
 * Generate synthetic column mapping for live mode years.
 * Assigns sequential Excel column letters starting from C (matching typical workbook layout).
 *
 * computeHistoricalYears(2024, 4) → [2020, 2021, 2022, 2023]
 * generateLiveColumns([2020, 2021, 2022, 2023]) → { 2020: 'C', 2021: 'D', 2022: 'E', 2023: 'F' }
 */
export function generateLiveColumns(years: number[]): Record<number, string> {
  const startCol = 'C'.charCodeAt(0) // Start from column C (A=label, B=sometimes skipped)
  const result: Record<number, string> = {}
  for (let i = 0; i < years.length; i++) {
    result[years[i]] = String.fromCharCode(startCol + i)
  }
  return result
}
```

> **CATATAN**: Approach di atas adalah guidance arsitektural. CLI HARUS membaca `build.ts` (terutama `readValues`, `buildRowsFromManifest`, dan `buildOne` functions) untuk memahami exact cell address pattern yang di-expect, kemudian adapt implementasi `buildLiveCellMap` agar CellMap output-nya compatible. Jangan copy-paste blind.

**`src/lib/calculations/year-helpers.ts`** — NEW file:
```ts
/**
 * Derive historical years from tahunTransaksi + count.
 * Last historical year = tahunTransaksi - 1.
 *
 * @example computeHistoricalYears(2022, 4) → [2018, 2019, 2020, 2021]
 * @example computeHistoricalYears(2022, 3) → [2019, 2020, 2021]
 * @example computeHistoricalYears(2025, 4) → [2021, 2022, 2023, 2024]
 */
export function computeHistoricalYears(
  tahunTransaksi: number,
  count: 3 | 4,
): number[] {
  const lastYear = tahunTransaksi - 1
  return Array.from({ length: count }, (_, i) => lastYear - count + 1 + i)
}
```

**Tests untuk Task 2** — `__tests__/data/live/build-cell-map.test.ts`:
- `buildLiveCellMap` creates correct cell addresses (e.g. `C8`, `D8`)
- `buildLiveCellMap` returns CellMap compatible with `numOpt(cells, addr)`
- `generateLiveColumns` returns correct letter mapping
- Empty liveData → empty CellMap
- Missing year in series → defaults to 0

**Tests** — `__tests__/lib/calculations/year-helpers.test.ts`:
- `computeHistoricalYears(2022, 4)` → `[2018, 2019, 2020, 2021]`
- `computeHistoricalYears(2022, 3)` → `[2019, 2020, 2021]`
- `computeHistoricalYears(2025, 4)` → `[2021, 2022, 2023, 2024]`
- `computeHistoricalYears(2019, 3)` → `[2016, 2017, 2018]`
- Return type is `number[]` with correct length

### Task 3: Manifest Extension (~15 min)

Tambah `historicalYearCount?: 3 | 4` ke `SheetManifest` type di `src/data/manifests/types.ts` (line ~121-173).

Set di 9 existing manifests:
- `historicalYearCount: 4` → `balance-sheet.ts`, `income-statement.ts`
- `historicalYearCount: 3` → `cash-flow-statement.ts`, `fixed-asset.ts`, `financial-ratio.ts`, `fcf.ts`, `noplat.ts`, `growth-revenue.ts`, `roic.ts`

Satu baris per manifest file. Typecheck setelah semua diset: `npx tsc --noEmit 2>&1 | tail -5`

### Task 4: Refactor SheetPage ke Client + Mode-Aware (~45 min)

**File**: `src/components/financial/SheetPage.tsx`

Convert ke `'use client'`. Ini adalah perubahan paling critical di session ini.

**Current state** (Server Component, lines 32-72):
```ts
export function SheetPage({ manifest, showCommonSize, showGrowth }: SheetPageProps) {
  const cells = loadCells(manifest.slug)                    // static seed data
  const rows = buildRowsFromManifest(manifest, cells)       // build from seed
  // ... auto-infer column visibility ...
  return (
    <>
      <DataSourceHeader mode="seed" />                       // always seed
      <FinancialTable manifest={manifest} rows={rows} years={manifest.years} />
    </>
  )
}
```

**Target state** (Client Component, mode-aware):
```ts
'use client'

import { useMemo } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { buildLiveCellMap, generateLiveColumns } from '@/data/live/build-cell-map'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import { loadCells } from '@/data/seed/loader'
import { buildRowsFromManifest } from '@/data/manifests/build'
// ... other imports

function SheetPage({ manifest, showCommonSize, showGrowth }: SheetPageProps) {
  const home = useKkaStore((s) => s.home)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const incomeStatement = useKkaStore((s) => s.incomeStatement)
  const fixedAsset = useKkaStore((s) => s.fixedAsset)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)

  // Loading state while Zustand rehydrates from localStorage
  if (!hasHydrated) return <LoadingPlaceholder />

  // Mode detection per design.md Decision #1 + #6 + LESSON-031
  const liveData = getLiveDataForManifest(manifest.slug, { balanceSheet, incomeStatement, fixedAsset })
  const isLive = home !== null && liveData !== null

  // Dynamic years for live mode, static for seed mode
  const years = isLive
    ? computeHistoricalYears(home.tahunTransaksi, manifest.historicalYearCount ?? 4)
    : manifest.years

  // Build CellMap from appropriate source
  const cells = useMemo(() => {
    if (isLive) {
      const liveColumns = generateLiveColumns(years)
      return buildLiveCellMap(liveColumns, liveData.rows, years)
    }
    return loadCells(manifest.slug)
  }, [isLive, liveData, years, manifest.slug])

  // Build rows — IMPORTANT: need to pass years + columns override for live mode
  // so readValues uses correct column mapping
  const rows = useMemo(() => {
    if (isLive) {
      const liveColumns = generateLiveColumns(years)
      // Create a manifest override with live years + columns for buildRowsFromManifest
      const liveManifest = {
        ...manifest,
        years,
        columns: liveColumns,
        // Clear seed-specific column mappings that don't apply in live mode
        commonSizeColumns: undefined,
        growthColumns: undefined,
      }
      return buildRowsFromManifest(liveManifest, cells)
    }
    return buildRowsFromManifest(manifest, cells)
  }, [isLive, manifest, cells, years])

  // Auto-infer column visibility (same as before)
  const autoShowCommonSize = ...
  const autoShowGrowth = ...

  return (
    <>
      <DataSourceHeader mode={isLive ? 'live' : 'seed'} />
      <FinancialTable
        manifest={{ ...manifest, years }}  // override years for live mode header
        rows={rows}
        years={years}
        showCommonSize={showCommonSize ?? autoShowCommonSize}
        showGrowth={showGrowth ?? autoShowGrowth}
      />
    </>
  )
}
```

> **PENTING**: Code di atas adalah **guidance arsitektural**. CLI HARUS:
> 1. Baca `SheetPage.tsx` current implementation
> 2. Baca `build.ts` — khususnya `readValues` dan `buildRowsFromManifest` signature
> 3. Baca `FinancialTable.tsx` — khususnya bagaimana `years` prop dipakai
> 4. Adapt implementation sesuai actual function signatures dan props
> 5. Jangan copy-paste blind dari prompt

**Helper function `getLiveDataForManifest`** — bisa inline atau extract:
```ts
function getLiveDataForManifest(
  slug: SheetManifest['slug'],
  store: { balanceSheet: BalanceSheetInputState | null; incomeStatement: IncomeStatementInputState | null; fixedAsset: FixedAssetInputState | null },
): { rows: Record<number, YearKeyedSeries> } | null {
  switch (slug) {
    case 'balance-sheet': return store.balanceSheet
    case 'income-statement': return store.incomeStatement
    case 'fixed-asset': return store.fixedAsset
    // Downstream sheets (CFS, FR, FCF, NOPLAT, Growth, ROIC) — Session 011-012
    default: return null
  }
}
```

**Critical test**: Semua 9 existing financial pages HARUS tetap bekerja di seed mode (`home === null`). Zero regression. Verify by:
1. `npm test 2>&1 | tail -15` — 133 existing tests still green
2. `npm run build 2>&1 | tail -25` — all routes build clean
3. Browser: navigate to `/historical/balance-sheet` with empty localStorage → "MODE DEMO" banner visible, numbers match seed fixtures exactly

**Catatan tentang Server → Client conversion**:
- `'use client'` directive di top of file
- `loadCells()` — ini saat ini import static JSON di module scope. Verify ini tetap work di client component. Jika tidak (karena JSON imports mungkin tree-shaken differently), mungkin perlu adjust import strategy. Tapi biasanya Next.js client components bisa import JSON fine.
- `FinancialTable` — cek apakah ini Server Component. Jika ya, dan SheetPage is client, ini tetap ok (client component bisa render server components sebagai children). Tapi jika FinancialTable imports something server-only, perlu adjust.

### Task 5: `<RowInputGrid>` Reusable Component (~45 min)

**File**: `src/components/forms/RowInputGrid.tsx` — `'use client'`

```ts
interface RowInputGridProps {
  /** Filtered manifest rows (only editable — exclude header/separator/subtotal/total) */
  rows: ManifestRow[]
  /** Year columns to render */
  years: number[]
  /** Current values: excelRow → year → value */
  values: Record<number, YearKeyedSeries>
  /** Called on any cell change */
  onChange: (excelRow: number, year: number, value: number) => void
  /** Computed rows for display-only (subtotals/totals): excelRow → year → computed value */
  computedRows?: Record<number, YearKeyedSeries>
}
```

**UI requirements** (design system — LESSON-029 company-agnostic, design.md Decision #2):

1. **Layout**: Per row: label kiri (IBM Plex Sans, indent sesuai `row.indent` 0/1/2) + N input fields kanan (satu per tahun)

2. **Input cells**:
   - `<input type="text" inputMode="numeric">`
   - IBM Plex Mono, `tabular-nums`, right-aligned
   - Placeholder hint: `"0"` (per Open Question #1 — empty, not pre-filled)
   - Tab navigation: native HTML tab order, left-to-right per row, top-to-bottom

3. **Paste handler** (critical per design.md Decision #2):
   ```ts
   function parseFinancialInput(raw: string): number {
     let cleaned = raw.trim()
     // Handle accounting parentheses: (1,234) → -1234
     const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')')
     if (isNegative) cleaned = cleaned.slice(1, -1)
     // Strip "Rp", spaces, dots (thousand separator)
     cleaned = cleaned.replace(/Rp/gi, '').replace(/\s/g, '').replace(/\./g, '')
     // Parse comma as decimal separator (Indonesian format)
     cleaned = cleaned.replace(/,/g, '.')
     const num = Number(cleaned)
     if (!Number.isFinite(num)) return 0
     return isNegative ? -num : num
   }
   ```
   Test cases yang HARUS pass:
   - `"1.234.567"` → `1234567`
   - `"Rp 14.216.370.131"` → `14216370131`
   - `"-3.182.342.447"` → `-3182342447`
   - `"(750.000)"` → `-750000`
   - `"1234567,89"` → `1234567.89`
   - `""` → `0`
   - `"abc"` → `0`

4. **Computed rows** (subtotal/total): rendered sebagai display-only text, NOT editable, visual distinct (font-semibold, border-top for total, bg slightly different)

5. **Validation**: warn border (orange ring) jika input non-numeric setelah strip. Empty = 0 (default).

6. **Display formatting**: Saat field loses focus (onBlur), format angka dengan thousand separator (titik) untuk readability. Saat focus (onFocus), show raw number untuk editing. Pattern:
   ```ts
   // Displayed: "14.216.370.131"
   // Editing: "14216370131"
   ```

7. **Mobile**: horizontal scroll wrapper (`overflow-x-auto`)

8. **Styling**: Navy color palette (design system), gold accent for active field, 4px border-radius (sharp per design system)

### Task 6: `/input/balance-sheet/page.tsx` (~30 min)

**File**: `src/app/input/balance-sheet/page.tsx` — `'use client'`

```ts
'use client'

import { useMemo, useCallback, useState, useRef } from 'react'
import { useKkaStore } from '@/lib/store/useKkaStore'
import { RowInputGrid } from '@/components/forms/RowInputGrid'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
import type { YearKeyedSeries } from '@/types/financial'

export default function InputBalanceSheetPage() {
  const home = useKkaStore((s) => s.home)
  const hasHydrated = useKkaStore((s) => s._hasHydrated)
  const balanceSheet = useKkaStore((s) => s.balanceSheet)
  const setBalanceSheet = useKkaStore((s) => s.setBalanceSheet)

  if (!hasHydrated) return <LoadingPlaceholder />

  // Guard: HOME must be filled first (Open Question #2)
  if (!home) {
    return <EmptyState
      message="Lengkapi HOME form terlebih dahulu untuk mulai input data."
      linkTo="/"
      linkLabel="Ke HOME Form"
    />
  }

  const years = computeHistoricalYears(home.tahunTransaksi, 4) // BS always 4 years

  // Filter manifest rows to editable only
  const editableRows = useMemo(() =>
    BALANCE_SHEET_MANIFEST.rows.filter(r =>
      r.excelRow !== undefined &&
      r.type !== 'header' && r.type !== 'separator' &&
      r.type !== 'subtotal' && r.type !== 'total'
    ),
    []
  )

  // All manifest rows for display (including subtotals/totals for computed display)
  const allDisplayRows = useMemo(() =>
    BALANCE_SHEET_MANIFEST.rows.filter(r =>
      r.type !== 'header' && r.type !== 'separator'
    ),
    []
  )

  // Local state + debounced persist
  const [localValues, setLocalValues] = useState<Record<number, YearKeyedSeries>>(
    balanceSheet?.rows ?? {}
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  const handleChange = useCallback((excelRow: number, year: number, value: number) => {
    setLocalValues(prev => {
      const next = {
        ...prev,
        [excelRow]: { ...(prev[excelRow] ?? {}), [year]: value }
      }

      // Debounced persist to store
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setBalanceSheet({ rows: next })
      }, 500)

      return next
    })
  }, [setBalanceSheet])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Input Data — Balance Sheet</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Masukkan data neraca untuk {years.length} tahun historis
          ({years[0]}–{years[years.length - 1]}).
          Data akan otomatis tersimpan.
        </p>
      </div>
      <RowInputGrid
        rows={editableRows}
        years={years}
        values={localValues}
        onChange={handleChange}
      />
    </div>
  )
}
```

> **Catatan**: Kode di atas adalah **panduan arsitektural**, bukan copy-paste literal. CLI harus adapt sesuai actual types, conventions, dan color tokens di codebase. Cek:
> - Color tokens yang ada (mungkin `text-ink`, `text-ink-muted` atau class names lain)
> - `<EmptyState>` component — mungkin belum ada, buat yang simple
> - `<LoadingPlaceholder>` — mungkin sudah ada dari hydration guards di DLOM/DLOC pages, reuse

### Task 7: Sidebar Nav Update (~10 min)

**File**: `src/components/layout/nav-tree.ts`

Current structure (dari codebase):
```ts
export const NAV_TREE: NavGroup[] = [
  { label: 'Input Master', items: [{ label: 'HOME', href: '/' }] },
  { label: 'Historis', items: [...] },
  { label: 'Analisis', items: [...] },
  { label: 'Proyeksi', items: [...] },
  { label: 'Penilaian', items: [...] },
  { label: 'Ringkasan', items: [...] },
]
```

Tambah group baru **"Input Data"** di antara "Input Master" dan "Historis":
```ts
{
  label: 'Input Data',
  items: [
    { label: 'Balance Sheet', href: '/input/balance-sheet' },
    { label: 'Income Statement', href: '/input/income-statement', wip: true },
    { label: 'Fixed Asset', href: '/input/fixed-asset', wip: true },
  ],
},
```

### Task 8: Verify Gauntlet (~15 min)

```bash
npm test 2>&1 | tail -15          # 133 + ~20 new tests passing
npm run build 2>&1 | tail -25     # new routes: /input/balance-sheet + existing
npx tsc --noEmit 2>&1 | tail -5   # clean
npm run lint 2>&1 | tail -5       # zero warnings
```

**Manual smoke tests** (kritis — DO NOT SKIP):
1. Fresh browser (no localStorage) → `/historical/balance-sheet` → "MODE DEMO" header + seed data visible ✅
2. Isi HOME form (nama perusahaan apa saja, tahunTransaksi = 2024) → pergi ke `/input/balance-sheet` → form muncul dengan empty fields, years = 2020-2023 ✅
3. Isi beberapa baris BS (e.g. row Cash = 1000000 di 2023) → navigate ke `/historical/balance-sheet` → header berubah ke live mode + tabel menampilkan data yang diisi ✅
4. Refresh browser → data persistent (localStorage) → BS input masih ada ✅
5. Clear localStorage (devtools) → kembali ke seed mode → "MODE DEMO" header kembali ✅
6. Tanpa HOME form diisi → `/input/balance-sheet` → friendly message "Lengkapi HOME form..." ✅

Deploy ke Vercel + verify live: `git push origin main` → auto-deploy → verify production.

---

## Commit Strategy

```
chore: extend store with BS/IS/FA slices + v2→v3 migration
feat: add live data types and buildLiveCellMap adapter
feat: add computeHistoricalYears helper
chore: add historicalYearCount to manifest type + 9 manifests
refactor: convert SheetPage to client component with mode detection
feat: add RowInputGrid reusable form component
feat: add /input/balance-sheet page
chore: add Input Data nav group with BS entry
```

Satu commit per task. Setiap commit harus build clean sebelum lanjut ke task berikutnya.

---

## Constraints Reminder (WAJIB dipatuhi)

### Framework & Stack
- **LESSON-001**: Next.js 16 breaking changes — baca docs di `node_modules/next/dist/docs/` jika encounter unexpected behavior
- **LESSON-002**: Tailwind v4 — `@theme inline`, bukan config file. Cek existing CSS tokens sebelum invent new ones
- **LESSON-004**: `useWatch` bukan `form.watch()` — jika pakai react-hook-form
- **LESSON-016**: Derive state, don't setState in effect — computed rows di RowInputGrid harus derived

### Architecture & Design (dari Phase 3 Design Session 009)
- **LESSON-028**: Always implement Zustand persist `migrate` function saat bump version — tanpa ini user data hilang silently. Chain migrations: v1→v2→v3, jangan skip.
- **LESSON-029**: App harus company-agnostic dari hari satu — JANGAN hardcode nama perusahaan apapun. Input forms harus generic. `<DataSourceHeader>` adalah single switching point.
- **LESSON-030**: Backward-compatible additions > breaking refactor — `buildLiveCellMap` adalah additive adapter, `build.ts` dan `applyDerivations` TIDAK BOLEH berubah.
- **LESSON-031**: Auto-detect mode dari domain state > explicit toggles — `home === null` → seed mode, `home !== null && liveData !== null` → live mode. Satu sumber kebenaran.
- **LESSON-032**: Lazy compute via `useMemo` per page > global reactive graph — tiap page compute sendiri dari store state. Jangan build dependency graph global.

### Non-Negotiables
- **#1**: Kalkulasi identik Excel — live mode output harus match seed mode output untuk input data yang sama (test ini di Session 011+ saat downstream wired)
- **#2**: Privacy-first — semua client-side, zero server storage, zero network calls untuk data user

### Design System
- IBM Plex Sans (body) + IBM Plex Mono (numbers in tables/inputs)
- Navy+gold palette — gunakan existing CSS custom properties/Tailwind tokens
- Sharp 4px border-radius (`rounded`)
- `tabular-nums` font feature untuk angka
- Number formatting: titik ribuan (Indonesian), parentheses untuk negatif di display, red color untuk negatif

### Token Efficiency
- Command output SELALU pipe ke `| tail -N`
- Dedicated tools (Read, Edit, Grep, Glob) lebih hemat dari Bash
- Jangan baca file yang sama 2x — catat info penting dari read pertama
- `Grep` dengan pattern spesifik lebih hemat dari `Read` seluruh file

---

## Anti-Pattern Watchlist

1. **JANGAN** modify `build.ts` atau `applyDerivations` — live mode adalah ADDITIVE adapter
2. **JANGAN** pre-fill input fields dengan demo data — Open Question #1: empty with placeholder
3. **JANGAN** forget migration function saat bump store version — LESSON-028
4. **JANGAN** hardcode company name — LESSON-029
5. **JANGAN** compute downstream sheets in Session 010 — BS pilot only, downstream di Session 011-012
6. **JANGAN** buat global reactive computation graph — LESSON-032, lazy per page cukup
7. **JANGAN** break existing 133 tests — zero regression tolerance

---

## Success Criteria (end of Session 010)

```
✅ Store v3 with 6 persisted slices (home, dlom, dloc, balanceSheet, incomeStatement, fixedAsset)
✅ Migration v1→v3 and v2→v3 tested and working
✅ buildLiveCellMap adapter creates CellMap compatible with buildRowsFromManifest
✅ computeHistoricalYears helper tested with edge cases
✅ 9 manifests have historicalYearCount field
✅ SheetPage is client component, auto-detects seed vs live mode
✅ RowInputGrid reusable component with paste handler + tab nav + format display
✅ /input/balance-sheet page live with empty-state guard
✅ "Input Data" nav group visible in sidebar
✅ All 9 existing financial pages still work in seed mode (zero regression)
✅ 133 + ~20 new tests all passing
✅ Build, typecheck, lint all clean
✅ Production deploy verified
```
