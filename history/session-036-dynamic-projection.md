# Session 036 — Dynamic Account Interoperability

**Date**: 2026-04-18
**Scope**: End-to-end dynamic-account propagation across projection + input layers.
**Branch**: `feat/session-036-dynamic-projection` → fast-forwarded into `main` (7614149)

## Goals

- [x] T1: Scaffold + branch + design commit
- [x] T2: Input FA Common Size + Growth YoY columns (feature parity with BS/IS)
- [x] T3: computeProyBsLive rewrite (Full Simple Growth)
- [x] T4: Proy BS page rewrite
- [x] T5: computeProyFixedAssetsLive rewrite (per-account Net Value growth)
- [x] T6: Proy FA page rewrite
- [x] T7: Store v15→v16 migration (additionalCapex → additionalCapexByAccount)
- [x] T8: Key Drivers Additional Capex dynamic section
- [x] T9: ProyBs/ProyFa builder row translation for template fit
- [x] T10: Full gate verify + merge + deploy

## Delivered

### T2 — Input FA CS/Growth Columns (commit 37c030d)

Extract `computeCommonSize` + `computeGrowthYoY` helpers into
`src/lib/calculations/derivation-helpers.ts`. DynamicFaEditor now passes
`commonSize` (denominator = row 69 Total Net Value) + `growth` props to
RowInputGrid matching DynamicBsEditor behavior. DynamicBsEditor
refactored to use same helpers (30 LOC duplication eliminated).

10 TDD cases cover denominator-missing, zero-year, header-skip, yoy
edge cases, custom-denominator-row.

### T3+T4 — Proy BS Full Simple Growth (commit 0130aa1)

`computeProyBsLive` rewritten with new signature
`{ accounts, bsRows, historicalYears, manifestRows }`. Every leaf
projects `value[N] = prev × (1 + computeAvgGrowth(series))`. Subtotals
derive via `deriveComputedRows` from dynamic BS manifest's
`computedFrom`. Balance Control (row 63) is diagnostic-only.

Decoupling: no FA cross-ref, no Proy LR Net Profit cascade, no
special-case Cash in Banks / AR adj / IFERROR / equity carry-forward.

Page rewrite: dynamic per-account rendering with Growth sub-row
(historical YoY for col 1, avg growth for proj cols).

`projection-pipeline.ts` updated to build dynamic BS manifest +
pass accounts directly.

### T5+T6 — Proy FA Per-Account Net Value Growth (commit 163db43)

`computeProyFixedAssetsLive` rewritten with new signature
`{ accounts, faRows, historicalYears }`. Each FA account's 7 bands
(Acq Begin/Add/End, Dep Begin/Add/End, Net Value) project using that
account's avg YoY growth computed from NET VALUE band. Subtotals at
rows 14/23/32/42/51/60/69 sum per-account leaves.

Page: all 7 bands read-only per account. Historical year shows all
values; projection years show NET VALUE only (Acq/Dep display "—" but
values computed internally for PROY LR cascade preservation).

4 caller sites updated: projection-pipeline + 3 pages.

### T7+T8 — Store Migration + Dynamic KD Additional Capex (commit a3f49cb)

Store v15 → v16 migration drops old 4-row `additionalCapex` shape
(land/building/equipment/others as number[]). New
`additionalCapexByAccount: Record<number, YearKeyedSeries>` keyed by
FA excelRow. Old data lossy on migration — no lossless FA catalog
mapping. Grep confirmed no compute path read the old field.

KeyDriversForm Additional Capex section rewritten to iterate
`fixedAsset.accounts` (passed via new `faAccounts` + `faAccountLanguage`
props from KeyDriversPage). Per-account × per-year numeric input
binding to `additionalCapexByAccount[excelRow][year]`. Empty state
when no FA accounts present.

Cell-mapping: 4 static `additionalCapex.*` → KEY DRIVERS D33-36 entries
deleted. Dynamic KEY DRIVERS injection deferred to Session 037.

3 new v15→v16 migration TDD cases.

### T9 — Proy Builder Template Row Translation (commit 7614149)

Compute layer emits output keyed by Input BS rows (8/10/16/27/35/49/51)
and FA offset keys (2000/3000/4000/5000/6000/7000 plus base). Template
sheets use different row numbers. Translation maps added:

- `ProyBsBuilder`: `INPUT_BS_TO_PROY_BS_TEMPLATE` (25 entries)
- `ProyFaBuilder`: `FA_OFFSET_TO_TEMPLATE_DELTA` per-offset delta
  (0/9/18/28/37/46/55) + `isOriginalFaRow` guard

Subtotal rows (14/23/32/42/51/60/69) write directly without translation.
Extended + custom accounts silently skipped — dedicated extended
injection pattern deferred to Session 037.

## Verification

```
Tests:     1201 / 1202 passing + 1 skipped (new v15→v16 + derivation
           helpers + Proy BS + Proy FA; deprecated KD capex test skipped)
Build:     ✅ 39 static pages, zero errors, zero warnings
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ zero i18n violations
Phase C:   ✅ 5/5 gates green (state parity for 13 input+setting sheets,
           coverage invariant for 16 computed+projected sheets)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 200
Store:     v16 (v15→v16 migration added)
```

## Stats

- Commits: 6 (1 docs + 5 feature/refactor)
- Files changed: 26
- Lines: +1994 / -1684 (net +310)
- New test files: 1 (derivation-helpers.test.ts — 10 cases)
- Rewritten test files: 3 (proy-bs-live, proy-fixed-assets-live, proy-bs + proy-fa builders)
- New source functions: 2 (computeCommonSize, computeGrowthYoY)
- Rewritten source functions: 2 (computeProyBsLive, computeProyFixedAssetsLive)
- Net test delta: -11 (consolidated old per-category tests; +21 new case, -32 old)
- Store migration: v15 → v16

## Deviations from Plan

- T2 extracted shared `computeCommonSize`/`computeGrowthYoY` helpers
  instead of inlining in DynamicFaEditor — refactored DynamicBsEditor
  too, killing 30 LOC duplication. Net benefit > single-use path.
- T9 scope narrowed: row-translation maps instead of full extended
  injection pattern. Extended + custom accounts silently skipped until
  Session 037 (mirror Session 025/028 BS/IS/FA pattern for PROY).
- KD Additional Capex export deferred with `it.skip`'d test; dynamic
  injection is Session 037 scope.

## Deferred to Future Sessions

- **Proy BS extended injection**: extended/custom accounts (excelRow
  >= 100) don't have template slots; silently skipped today. Mirror
  Session 025 BS extended injection pattern for Proy BS.
- **Proy FA extended injection**: extended/custom accounts silently
  skipped. Mirror Session 028 FA extended injection pattern.
- **KEY DRIVERS dynamic additionalCapex injection**: skipped in
  export (cell-mapping entries removed). Build dynamic injector.
- **Dashboard projected FCF chart**: may show different magnitudes
  with new Net Value projection model; visually verify + adjust scale
  if needed.
- **Existing Proy BS/FA/CFS/NOPLAT tests may have assumptions about
  old compute behavior**: verified main-branch tests pass; a deeper
  audit for semantic correctness (do projections still make sense
  financially?) is a separate exercise.

## Lessons Extracted

- [LESSON-103](../lessons-learned.md#lesson-103): Template row
  translation is a narrow layer between compute output and export
  template when compute conventions diverge from template conventions.
- [LESSON-104](../lessons-learned.md#lesson-104): When a calc module
  signature changes fundamentally, check ALL callers — tests + pages +
  pipelines — before declaring the rewrite GREEN.

## Files & Components Added/Modified

```
design.md                                                       [REWRITTEN]
plan.md                                                         [REWRITTEN]
src/lib/calculations/derivation-helpers.ts                      [NEW]
src/components/forms/DynamicFaEditor.tsx                        [CS/Growth integration]
src/components/forms/DynamicBsEditor.tsx                        [refactored to helpers]
src/data/live/compute-proy-bs-live.ts                           [REWRITTEN]
src/data/live/compute-proy-fixed-assets-live.ts                 [REWRITTEN]
src/app/projection/balance-sheet/page.tsx                       [REWRITTEN]
src/app/projection/fixed-asset/page.tsx                         [REWRITTEN]
src/app/projection/income-statement/page.tsx                    [caller update]
src/app/projection/noplat/page.tsx                              [caller update]
src/lib/calculations/projection-pipeline.ts                     [BS + FA caller update]
src/lib/store/useKkaStore.ts                                    [KD slice + v15→v16 migration]
src/components/forms/KeyDriversForm.tsx                         [Additional Capex rewrite]
src/app/input/key-drivers/page.tsx                              [faAccounts props wiring]
src/lib/i18n/translations.ts                                    [emptyState key]
src/lib/export/cell-mapping.ts                                  [removed 4 obsolete entries]
src/lib/export/sheet-builders/proy-bs.ts                        [row translation]
src/lib/export/sheet-builders/proy-fa.ts                        [offset → template delta]
__tests__/lib/calculations/derivation-helpers.test.ts           [NEW — 10 cases]
__tests__/data/live/compute-proy-bs-live.test.ts                [REWRITTEN — 10 cases]
__tests__/data/live/compute-proy-fixed-assets-live.test.ts      [REWRITTEN — 8 cases]
__tests__/lib/store/store-migration.test.ts                     [+3 cases]
__tests__/lib/export/sheet-builders/proy-bs.test.ts             [migrated to template rows]
__tests__/lib/export/sheet-builders/proy-fa.test.ts             [migrated to template rows]
__tests__/lib/export/sheet-builders/key-drivers.test.ts         [additionalCapex removed]
```

## Next Session Recommendation (Session 037)

1. **Proy BS + Proy FA extended injection** — mirror Session 025 BS /
   Session 028 FA pattern for PROY sheets so extended (100+) and custom
   (1000+) accounts also land in exported workbook.
2. **KEY DRIVERS additional capex dynamic injection** — build dedicated
   injector in KeyDriversBuilder for `additionalCapexByAccount` map.
3. **Sign convention reconciliation** — deferred from Session 035,
   still relevant (21 whitelisted KEY DRIVERS cells).
4. **Dashboard polish** — projected FCF chart may need axis/scale
   adjustment with new Net Value model.
5. **RESUME page** — final summary comparing DCF/AAM/EEM results
   side by side.
