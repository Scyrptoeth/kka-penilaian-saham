# Session 037 — Average Columns across Input + Analysis Tables

**Date**: 2026-04-18
**Scope**: Add "Average / Rata-Rata" column/sub-column across 6 pages:
Input BS, Input IS, Input FA (Common Size + Growth YoY sub-column each),
and Analysis FR (flat column), NOPLAT (Growth YoY sub-column), Growth
Revenue (Growth YoY sub-column). Skip when < 2 historical years.
**Branch**: `feat/session-037-average-columns` → fast-forward into `main`
(acd1c4a). Branch deleted locally post-merge.

## Goals (from plan laid out during execution — no plan.md file this session)
- [x] T1 — computeAverage helper with leading-zero-skip semantics + TDD (8+ cases)
- [x] T2 — i18n key `table.average` (EN "Average" / ID "Rata-Rata")
- [x] T3 — RowInputGrid: avg sub-column in Common Size + Growth YoY groups
- [x] T4 — Wire showAverage through DynamicBsEditor + DynamicIsEditor + DynamicFaEditor
- [x] T5 — FinancialTable: three mode flags (showValueAverage / showCommonSizeAverage / showGrowthAverage)
- [x] T6 — SheetManifest.showAverage opt-in; enable in FR/NOPLAT/GR manifests
- [x] T7 — Full gate verification (tests + build + typecheck + lint + audit + phase-c + cascade)
- [x] T8 — Merge + push + live verify

## Delivered

### Helper + i18n foundation (21f7f17)
- `src/lib/calculations/derivation-helpers.ts`:
  - `computeAverage(values: readonly (number | null | undefined)[]): number | null`
    — leading null/zero skip, middle/trailing null → 0, all-empty → null.
  - `averageSeries(series: YearKeyedSeries | undefined, years: readonly number[])`
    wrapper for year-keyed input.
- 12 new TDD cases (9 for `computeAverage` covering user's 3 plain-
  language examples verbatim + 6 edge cases, 3 for `averageSeries`).
- `src/lib/i18n/translations.ts`: `table.average` key added.

### Input side (1c48ab3)
- `RowInputGrid.tsx`: two new props `showCommonSizeAverage` +
  `showGrowthAverage`; renders extra sub-column inside each group when
  flag + year count ≥ 2. Heavier left border + font-semibold to
  distinguish from per-year sub-cells.
- `DynamicBsEditor.tsx` / `DynamicIsEditor.tsx` / `DynamicFaEditor.tsx`:
  pass both flags gated on `years.length >= 2`.

### Analysis side (acd1c4a)
- `FinancialTable.tsx`: three independent flags
  — `showValueAverage` (flat column after value years, for FR case
  without column groups)
  — `showCommonSizeAverage` (sub-column in CS group)
  — `showGrowthAverage` (sub-column in YoY group).
  Per-row `valueKind` respected in flat mode so ratio rows (Current
  Ratio 0.38) and percent rows (GPM 38.8%) render their Avg in native
  unit.
- `types.ts` (`FinancialTableProps` + `SheetManifest.showAverage`) +
  `SheetPage.tsx` propagation.
- Opt-in manifests: `financial-ratio.ts` (`showAverage: { values: true }`),
  `noplat.ts` + `growth-revenue.ts` (`showAverage: { growth: true }`).

## Verification

```
Tests:     1213 / 1214 passing + 1 skipped  (was 1201; +12 new cases)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Build:     ✅ 39 static pages
Audit:     ✅ zero i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 green (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 200 via /akses
```

## Stats
- Commits: 3 (21f7f17, 1c48ab3, acd1c4a)
- Files changed: 15
- Lines: +339 / −7
- New helpers: 2 (computeAverage, averageSeries)
- New i18n keys: 1 (table.average)
- New TDD cases: 12
- Zero regressions

## Deviations from Plan
- No explicit `plan.md` / `design.md` was written — scope was clear from
  user prompt + image walkthrough, and all tasks were mechanical
  extensions of the existing twin-table pipeline. Iterative TDD sufficed.
- Three-flag approach for `FinancialTable` added beyond the original
  RowInputGrid two-flag plan — needed for FR which has no column groups
  (`showValueAverage` = flat column after year values).

## Deferred
- None — scope fully delivered.

## Lessons Extracted
- [LESSON-105](../lessons-learned.md#lesson-105-parallel-extension-of-rowinputgrid--financialtable-via-shared-derivation-helper):
  Parallel extension of RowInputGrid + FinancialTable via shared
  derivation helper (promoted).

## Files & Components Added/Modified

```
src/lib/calculations/derivation-helpers.ts            [+53 NEW helpers]
src/lib/i18n/translations.ts                          [+1 key]
src/components/forms/RowInputGrid.tsx                 [+74, MODIFIED]
src/components/forms/DynamicBsEditor.tsx              [+2, MODIFIED]
src/components/forms/DynamicIsEditor.tsx              [+2, MODIFIED]
src/components/forms/DynamicFaEditor.tsx              [+2, MODIFIED]
src/components/financial/FinancialTable.tsx           [+111, MODIFIED]
src/components/financial/SheetPage.tsx                [+3, MODIFIED]
src/components/financial/types.ts                     [+16, MODIFIED]
src/data/manifests/types.ts                           [+14, MODIFIED]
src/data/manifests/financial-ratio.ts                 [+1 showAverage]
src/data/manifests/noplat.ts                          [+1 showAverage]
src/data/manifests/growth-revenue.ts                  [+1 showAverage]
__tests__/lib/calculations/derivation-helpers.test.ts [+65, MODIFIED]
```

## Next Session Recommendation

User-facing work was complete. Session 038 continued with a distinct
feature (Interest Bearing Debt dedicated page) — see
`history/session-038-ibd-field.md`.
