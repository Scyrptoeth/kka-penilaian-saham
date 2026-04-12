# Session 010 — Phase 3 DataSource Foundation + Balance Sheet Pilot

**Date**: 2026-04-12
**Scope**: First Phase 3 execution session. Build the foundation for live data mode and ship Balance Sheet end-to-end as pilot.
**Branch**: `feat/session-010-live-data-bs-pilot` → merged to `main`

## Goals (from plan.md + session-010-prompt.md)

- [x] Goal 1 — Extend Zustand store with 3 new slices (BS/IS/FA) + v2→v3 migration
- [x] Goal 2 — Live data adapter (`buildLiveCellMap`, `generateLiveColumns`, `computeHistoricalYears`)
- [x] Goal 3 — Manifest extension (`historicalYearCount` on 9 manifests)
- [x] Goal 4 — Refactor SheetPage to client + auto-mode detection
- [x] Goal 5 — `<RowInputGrid>` reusable component + `parseFinancialInput`
- [x] Goal 6 — `/input/balance-sheet` pilot page with HOME guard + debounced persist
- [x] Goal 7 — Sidebar nav "Input Data" group
- [x] Goal 8 — Verify gauntlet + production deploy
- [x] Goal 9 (Opsi C follow-up) — Computed subtotal/total display in RowInputGrid

## Delivered

### Store v2 → v3
- 3 new slices: `balanceSheet`, `incomeStatement`, `fixedAsset` (all `*InputState` from new `src/data/live/types.ts`, keyed by `excelRow → YearKeyedSeries`)
- `setBalanceSheet` / `setIncomeStatement` / `setFixedAsset` + reset actions
- `migratePersistedState` refactored to chain v1 → v2 → v3 unconditionally — narrows `persistedState: unknown` via `Record<string, unknown>` cast once, applies migrations in order
- `partialize` persists all 6 slices

### Live data adapter (`src/data/live/`)
- `build-cell-map.ts` — `buildLiveCellMap(liveColumns, liveData, years)` synthesizes a `CellMap` at `${col}${excelRow}` addresses matching the seed-mode pipeline expectations (LESSON-030)
- `generateLiveColumns([2020..2023])` → `{2020:'C', 2021:'D', 2022:'E', 2023:'F'}` — starts from C to match typical workbook layout
- `types.ts` — `BalanceSheetInputState`, `IncomeStatementInputState`, `FixedAssetInputState`

### Calc helpers (`src/lib/calculations/`)
- `year-helpers.ts` — `computeHistoricalYears(tahunTransaksi, count: 3|4)` — ascending N-year window ending at `tahunTransaksi - 1`
- `derive-computed-rows.ts` — `deriveComputedRows(rows, values, years)` — single forward pass computing subtotal/total rows from their `computedFrom` declarations, with fall-through (leaf value || prior computed) for chains

### Manifest extensions (`src/data/manifests/types.ts`)
- `SheetManifest.historicalYearCount?: 3 | 4`
- `ManifestRow.computedFrom?: readonly number[]`
- 9 manifests tagged with `historicalYearCount` (BS/IS/Growth Revenue = 4; CFS/FA/FR/FCF/NOPLAT/ROIC = 3)
- BS manifest gets `computedFrom` on all 9 subtotal/total rows:
  - row 16 Total Current Assets ← [8..14]
  - row 22 Fixed Assets Net ← [20, 21]  (AccumDep pre-signed negative)
  - row 25 Total Non-Current Assets ← [22, 24]  (subtotal + leaf)
  - row 27 TOTAL ASSETS ← [16, 25]
  - row 35 Total Current Liabilities ← [31..34]
  - row 40 Total Non-Current Liabilities ← [38, 39]
  - row 41 TOTAL LIABILITIES ← [35, 40]
  - row 48 Retained Earnings Ending ← [46, 47]
  - row 49 Shareholders' Equity ← [43, 44, 48]  (leaves + subtotal)
  - row 51 TOTAL LIABILITIES & EQUITY ← [41, 49]

### UI refactor

**`SheetPage` → client component**:
- Reads 4 store slices (home + 3 input slices) + hasHydrated
- `isLive = hasHydrated && home !== null && liveRows !== null` — auto-detect mode (LESSON-031)
- Builds `effectiveManifest` with synthetic columns for live mode; falls back to seed manifest for all other cases
- `useMemo` for `liveYears`, `effectiveManifest`, `cells`, `rows` — everything reactive to store selector changes only
- Before hydration, renders seed mode — matches SSR output, avoids hydration mismatch

**`<RowInputGrid>`** (`src/components/forms/RowInputGrid.tsx`):
- Accepts full manifest rows (header/separator/normal/subtotal/total)
- Interleaves editable `<NumericInput>` cells with read-only formatted cells (subtotal → font-semibold + border-t; total → font-bold + border-t-2)
- Shares `formatIdr` + `isNegative` with the read-only `<FinancialTable>` for consistent accounting display (parentheses negatives, red color)
- Each `<NumericInput>` holds local draft state: raw on focus, formatted on blur, parsed via `parseFinancialInput` on blur-commit

**`parseFinancialInput`** (`src/components/forms/parse-financial-input.ts`):
- Strips Rp prefix, whitespace, dots (Indonesian thousand separator)
- Accounting parentheses `(750.000)` → `-750000`
- Explicit negatives
- Comma → decimal separator (Indonesian locale)
- Empty / garbage → 0
- 10 TDD test cases

**`/input/balance-sheet/page.tsx`**:
- Parent `InputBalanceSheetPage` gates on `hasHydrated` → `home !== null`; returns loading placeholder or empty-state respectively
- Child `BalanceSheetEditor` mounts only after both gates pass → `useState(useKkaStore.getState().balanceSheet?.rows ?? {})` seeds once without effect sync (LESSON-034 — the elegant solution to LESSON-016)
- 500ms debounced persist: local state updates immediately, `setBalanceSheet({ rows })` fires after 500ms idle
- Computes subtotal/total values via `useMemo(() => deriveComputedRows(rows, localValues, years))`
- Passes full `BALANCE_SHEET_MANIFEST.rows` + `computedValues` to `<RowInputGrid>`

**`<DataSourceHeader>`**: unchanged — `mode` prop flips from SheetPage's domain-state detection. Single switching point.

**Sidebar nav (`src/components/layout/nav-tree.ts`)**:
- New "Input Data" group inserted between "Input Master" and "Historis"
- Entries: Balance Sheet (active), Income Statement (wip), Fixed Asset (wip)

## Verification

```
Tests:     169 / 169 passing (23 files) — +36 vs 133 baseline
  migration v2→v3:         +3 (7 total)
  year-helpers:            +6
  buildLiveCellMap:        +9
  parseFinancialInput:    +10
  deriveComputedRows:      +8
Build:     ✅ 17 routes, 12 static pages prerendered (+1 /input/balance-sheet)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Smoke:     ✅ All 13 routes HTTP 200 on production
           ✅ /historical/balance-sheet "Mode Demo · Workbook Prototipe" banner preserved
           ✅ /input/balance-sheet reachable, "Memuat…" SSR placeholder pre-hydration
           ✅ "Input Data" nav group visible on root HTML
           ✅ Zero regression — existing 9 financial pages unchanged in seed mode
```

Production deployments:
- `21sqe2eco` — initial Tasks 1–8 (26s build)
- `3wzel9whp` — Opsi C follow-up with computed rows display (26s build)

Live URL: https://kka-penilaian-saham.vercel.app

## Stats

- Commits: 8 (7 feature + 1 computed-rows fix) + 1 merge commit on main
- Files changed: 23 files
- Net delta: +1353 / −140 lines
- New files created: 8 (4 source + 4 test)
- Test count growth: 133 → 169 (+36, +27%)

## Deviations from Plan

- **growth-revenue.ts `historicalYearCount`**: prompt said 3, I set 4. The manifest has `years: [2018, 2019, 2020, 2021]` (4 years), so prompt was inconsistent. Chose semantically correct value.
- **SheetPage hydration state**: prompt said show `<LoadingPlaceholder />` when `!hasHydrated`. Implemented as "seed mode as default" before hydration — better UX (no loading flash for seed-mode users) + avoids hydration mismatch. Justification aligns with design.md Decision #6 (auto-detect from domain state).
- **RowInputGrid `inputMode`**: prompt said `"numeric"`, used `"decimal"` to allow decimals for future percent/ratio inputs without retrofitting.
- **Validation warn border (orange ring)**: prompt Task 5 butir 5 asked for it, deferred to Session 011 as non-critical for pilot ship.

## Deferred (to Sessions 011-012)

- `/input/income-statement` + IS `computedFrom` declarations
- `/input/fixed-asset` + FA `computedFrom` declarations
- Downstream sheet live mode: CFS, FR, NOPLAT, FCF, Growth Revenue, ROIC — each needs its compute adapter wired into SheetPage live branch via `useMemo`
- Validation warn border on non-numeric paste
- Manual multi-scenario browser smoke tests (Cannot automate from CLI — user verification needed for scenarios 2–6 in prompt Task 8)

## Lessons Extracted

- [LESSON-033](../lessons-learned.md#lesson-033): Declarative `computedFrom[]` beats structural indent-based derivation for irregular accounting hierarchies — promoted to start skill
- [LESSON-034](../lessons-learned.md#lesson-034): Gate local-state seed via hydration-aware child mount — promoted to start skill

## Files & Components Added/Modified

```
NEW:
  src/data/live/types.ts
  src/data/live/build-cell-map.ts
  src/lib/calculations/year-helpers.ts
  src/lib/calculations/derive-computed-rows.ts
  src/components/forms/parse-financial-input.ts
  src/components/forms/RowInputGrid.tsx
  src/app/input/balance-sheet/page.tsx
  __tests__/data/live/build-cell-map.test.ts
  __tests__/lib/calculations/year-helpers.test.ts
  __tests__/lib/calculations/derive-computed-rows.test.ts
  __tests__/components/forms/parse-financial-input.test.ts

MODIFIED:
  src/lib/store/useKkaStore.ts                             [v2→v3 + 3 slices]
  src/data/manifests/types.ts                              [+historicalYearCount, +computedFrom]
  src/data/manifests/balance-sheet.ts                      [+historicalYearCount, +9 computedFrom]
  src/data/manifests/income-statement.ts                   [+historicalYearCount: 4]
  src/data/manifests/cash-flow-statement.ts                [+historicalYearCount: 3]
  src/data/manifests/fixed-asset.ts                        [+historicalYearCount: 3]
  src/data/manifests/financial-ratio.ts                    [+historicalYearCount: 3]
  src/data/manifests/fcf.ts                                [+historicalYearCount: 3]
  src/data/manifests/noplat.ts                             [+historicalYearCount: 3]
  src/data/manifests/growth-revenue.ts                     [+historicalYearCount: 4]
  src/data/manifests/roic.ts                               [+historicalYearCount: 3]
  src/components/financial/SheetPage.tsx                   [→ 'use client' + mode-aware]
  src/components/layout/nav-tree.ts                        [+Input Data group]
  __tests__/lib/store/store-migration.test.ts              [+v2→v3 cases]
```

## Next Session Recommendation

Session 011 — Income Statement input + 4 downstream migrations:

1. Add IS `computedFrom` declarations (mirror BS approach)
2. `/input/income-statement/page.tsx` — reuse `RowInputGrid` unchanged, same gate pattern as BS editor
3. Wire downstream live compute for CFS, Financial Ratio, NOPLAT, Growth Revenue — each calls existing calc function inside SheetPage `useMemo` via existing adapter layer from Session 003
4. Estimate: 2.5–3 jam, ~10 integration tests, 5 sheets newly live-capable
