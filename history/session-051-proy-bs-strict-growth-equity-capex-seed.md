# Session 051 — Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback

**Date**: 2026-04-19
**Scope**: Three integrated fixes for PROJECTION → Proy. Balance Sheet
and its upstream/downstream touch points. (1) sparse-historical accounts
now produce null Average Growth YoY instead of extrapolating from a
single observation; (2) shareholders' equity projects flat with
per-cell editable overrides; (3) Proy Fixed Assets Additions seed falls
back to last non-zero historical year, fixing KD Additional Capex
display blank.
**Branch**: `feat/session-051-strict-growth-equity-capex-seed` (1 feature
commit `3329837` merged fast-forward to main + pushed — Vercel production
deploy live).

## Goals (from plan.md)

- [x] Task 1 — design.md + plan.md + feature branch
- [x] Task 2 — `averageYoYStrict` helper + 10 TDD cases
- [x] Task 3 — Store v20 → v21 with `equityProjectionOverrides` + migration
- [x] Task 4 — Refactor `computeProyBsLive` (strict growth + equity skip + overrides)
- [x] Task 5 — `DynamicBsEditor` Average Growth YoY column uses strict resolver
- [x] Task 6 — Proy BS page: equity editable per-cell, no growth row
- [x] Task 7 — `computeProyFixedAssetsLive` seed fallback for ACQ/DEP Additions
- [x] Task 8 — Downstream tests + Phase C green
- [x] Task 9 — Full gate verification (typecheck/lint/audit/test/build/phase-c)
- [x] Task 10 — Commit + merge + push + deploy + wrap-up

## Delivered (commit `3329837`)

### Strict average-growth helper — `src/lib/calculations/derivation-helpers.ts`

```ts
export function averageYoYStrict(
  series: YearKeyedSeries | undefined,
  historicalYears: readonly number[],
): number | null
```

Rules:
1. Iterate consecutive-year pairs in `historicalYears`.
2. Real observation = prev AND curr both `!= null` AND prev ≠ 0 AND `isFinite(prev)`.
3. If < 2 real observations → null.
4. Else → mean of real YoY ratios.

Consumed by BOTH INPUT BS Average Growth YoY column AND Proy BS
projection multiplier — single source of truth. LESSON-139
driver-display sync applied across INPUT ↔ projection pairing.

### Store v20 → v21 — `balanceSheet.equityProjectionOverrides`

New field: `Record<excelRow, YearKeyedSeries>`.
Setter: `setEquityProjectionOverride(row, year, value | null)` —
`null` clears the entry, triggers empty-row cleanup.
Migration v20 → v21: initialize `{}` on existing balanceSheet (idempotent).

### `computeProyBsLive` refactor — `src/data/live/compute-proy-bs-live.ts`

- Uses `averageYoYStrict` (null → 0 for projection — flat fallback).
- Skip growth projection for `section === 'equity'` accounts. Default
  value = historical last-year value; override `equityOverrides[row][year]`
  replaces default per-cell.
- New optional input field: `equityOverrides?: Record<number, YearKeyedSeries>`.
- Subtotals unchanged — still derive via `deriveComputedRows`.

### `DynamicBsEditor` Average column via resolver prop

`RowInputGrid` gained `growthAverageResolver?: (excelRow) => number | null`
prop. When provided, it REPLACES the default `averageSeries(growth[row], growthYears)`.
`DynamicBsEditor` injects `(row) => averageYoYStrict(allValues[row], years)`
so INPUT BS Avg column uses the SAME helper as Proy BS compute.

### Proy BS page — equity editable, no growth row

`/projection/balance-sheet/page.tsx` branches render on `account.section`:
- Equity leaf: editable `<NumericInput>` per projection year, no growth row.
- Non-equity leaf: growth row (unchanged layout), but growth value sourced
  from `averageYoYStrict` — null renders "—".

Persistence: NumericInput `onCommit` → `setEquityProjectionOverride`.
Treat user-typed `0` as "clear override" (null sentinel) — cell reverts
to historical default. React Compiler-compliant (no setState-in-effect).

### Proy FA seed fallback — `src/data/live/compute-proy-fixed-assets-live.ts`

New private helper `lastNonZeroHistorical(series, years)` — walks years
from end backwards, returns first non-null non-zero value or null.

Seed logic:
```ts
const acqAddAtHistRaw = acqAddHist[histYear]
const acqAddAtHist =
  acqAddAtHistRaw != null
    ? acqAddAtHistRaw                                        // respect explicit 0
    : lastNonZeroHistorical(acqAddHist, historicalYears) ?? 0  // fallback
```

Same logic for DEP_ADDITIONS. Distinguishes "user typed 0" (respect
intent) from "user left blank" (fallback). Fixes root cause of KD
Additional Capex display blank — Proy FA ACQ_ADDITIONS band now
populates when user has Additions data in earlier years but left
histYear cell empty.

## Verification

```
Tests:     1382 / 1382 passing + 1 skipped  (111 files; +24 net since Session 050)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      HTTP 307 after auth-gate redirect — penilaian-bisnis.vercel.app
```

## Stats

- Commits on feature branch: 1
- Files touched: 14 (1 new test + 13 modified)
- LOC: +882 / −203
- Test cases: 1358 → 1382 (+24 net)
  - `average-yoy-strict.test.ts` (NEW): +10
  - `store-migration.test.ts`: +3 (v20→v21 cases)
  - `compute-proy-bs-live.test.ts`: +7 (sparse + equity + override)
  - `compute-proy-fixed-assets-live.test.ts`: +4 (seed fallback cases)
- Store version: v20 → v21 (1 migration step)
- Build routes: 42 static pages (unchanged)

## Deviations from Plan

- `RowInputGrid.NumericInput` was a private component. Task 6 required
  exporting it for reuse in Proy BS page equity cells. Single-line
  change (`export function NumericInput`), no behavioral impact.
- `BalanceSheetInputState.equityProjectionOverrides` made **required**
  (not optional) to force compile-time enforcement across all
  BS-input constructors. One caller in `DynamicBsEditor.tsx:112` needed
  update to spread `prevEquityOverrides` from store at persist time —
  preserves user overrides across every leaf-data save cycle.

## Deferred

None from this session. All 10 planned tasks completed.

## Lessons Extracted

- [LESSON-143](../lessons-learned.md#lesson-143): `averageYoYStrict`
  requires ≥ 2 real YoY observations — generalizes sparse-historical
  handling across any projection driver that consumes a YearKeyedSeries
  [PROMOTED]
- [LESSON-144](../lessons-learned.md#lesson-144): Multiplicative
  roll-forward projection needs seed fallback when histYear entry is
  undefined — fall back to last non-null historical, respect explicit
  zero via `!= null` check [PROMOTED]
- [LESSON-145](../lessons-learned.md#lesson-145): Resolver prop pattern
  for derivation columns — pass `xxxAverageResolver?: (row) => number | null`
  to decouple the presentational grid from avg semantics; caller
  injects strict vs loose averaging [local]

## Files Added/Modified

```
src/lib/calculations/derivation-helpers.ts          [MODIFIED — +averageYoYStrict helper]
src/data/live/compute-proy-bs-live.ts               [REWRITTEN — strict + equity skip + overrides]
src/data/live/compute-proy-fixed-assets-live.ts     [MODIFIED — lastNonZeroHistorical seed fallback]
src/data/live/types.ts                              [MODIFIED — +equityProjectionOverrides field]
src/lib/store/useKkaStore.ts                        [MODIFIED — v20→v21 migration + setter]
src/app/projection/balance-sheet/page.tsx           [REWRITTEN — branch render on section]
src/components/forms/DynamicBsEditor.tsx            [MODIFIED — strict avg resolver + preserve overrides on persist]
src/components/forms/RowInputGrid.tsx               [MODIFIED — growthAverageResolver prop + export NumericInput]
__tests__/lib/calculations/average-yoy-strict.test.ts  [NEW — 10 TDD cases]
__tests__/data/live/compute-proy-bs-live.test.ts       [MODIFIED — +7 cases]
__tests__/data/live/compute-proy-fixed-assets-live.test.ts [MODIFIED — +4 cases]
__tests__/lib/store/store-migration.test.ts            [MODIFIED — +3 cases]
design.md                                            [REWRITTEN — Session 051 design]
plan.md                                              [REWRITTEN — Session 051 10 tasks]
```

## Next Session Recommendation

1. **User visual QA** — verify at:
   (a) `/input/balance-sheet` — Average Growth YoY column shows "—" for
   Setara Kas + Hutang PPh Pasal 21/2021 (sparse accounts).
   (b) `/projection/balance-sheet` — Setara Kas + Hutang PPh Pasal 21/2021
   growth = "—" AND values stay flat across 2022-2024. Equity section
   cells editable, no growth row. Edit 2022 → 2023/2024 unaffected.
   (c) `/input/key-drivers` — Additional Capex section populates with
   non-zero projected values from Proy FA Additions band (7 years).
2. **Upload parser (.xlsx → store)** — highest-priority backlog item.
3. **Dashboard projected FCF chart** — leverages Proy FA Session 045-047 +
   Proy LR Session 049 + Proy BS Session 051.
