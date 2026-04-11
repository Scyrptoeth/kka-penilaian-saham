# Session 003 — Harden Calc Engine (Phase 2A.5)

**Date**: 2026-04-11
**Scope**: Architectural hardening of 6 Phase 2A calc modules — introduce YearKeyedSeries, Zod validation layer, explicit-sign adapter layer, end-to-end integration test
**Branch**: `feat/phase2a5-harden-calc` → `main` (fast-forward merged)

## Goals (dari plan.md awal sesi)

10-task plan motivated by 3 rough edges surfaced after Session 002:

- [x] Task 1 — `YearKeyedSeries` type + helpers (yearsOf, assertSameYears, emptySeriesLike, mapSeries, seriesFromArray, seriesToArray) + 15 edge-case helper tests
- [x] Task 2 — Refactor `fixed-asset.ts` + test to YearKeyedSeries
- [x] Task 3 — Refactor `noplat.ts` + test
- [x] Task 4 — Refactor `fcf.ts` + test
- [x] Task 5 — Refactor `cash-flow.ts` + test
- [x] Task 6 — Refactor `ratios.ts` + test
- [x] Task 7 — Refactor `growth-revenue.ts` + test
- [x] Task 8 — Zod validation layer at `src/lib/validation/`
- [x] Task 9 — Adapter layer at `src/lib/adapters/`
- [x] Task 10 — Integration test + full verify + merge + push

## Delivered

### Layer 1 — YearKeyedSeries as Primary Data Shape

New type `YearKeyedSeries = Record<number, number>` in `src/types/financial.ts`.

Six helpers in `src/lib/calculations/helpers.ts`:
- `yearsOf(series)` — ascending year list
- `assertSameYears(label, primary, other)` — throws on mismatch with readable message
- `emptySeriesLike(template)` — fresh zeros preserving year set
- `mapSeries(series, fn)` — value-mapping, year-preserving
- `seriesFromArray(years, values)` / `seriesToArray(series)` — interop with positional arrays

All 6 Phase 2A calc modules refactored to take and return `YearKeyedSeries`. Every module now derives its year axis from a single anchor input and validates that all other inputs share that exact year set. A caller that mis-maps years across sheets no longer gets silently wrong results; it gets a clear `RangeError` at the boundary.

### Layer 2 — Zod Validation (`src/lib/validation/`)

**schemas.ts**:
- `finiteNumber` — rejects NaN, Infinity via `.refine(Number.isFinite)`
- `yearKeyedSeriesSchema` — base schema via `z.record(z.string(), finiteNumber).transform()`; validates year keys are integers in [1900, 2200]; rejects empty records
- One input schema per calc module (FixedAsset, Noplat, Fcf, CashFlow, Ratios, GrowthRevenue)
- `requireSameYears` helper used in `.superRefine` for cross-field year-set validation

**index.ts**:
- `ValidationError` class wrapping `z.core.$ZodIssue[]` with a flattened human-readable message derived from issue paths
- Six `validated*` wrapper functions: `validatedFixedAssetSchedule`, `validatedNoplat`, `validatedFcf`, `validatedCashFlowStatement`, `validatedFinancialRatios`, `validatedGrowthRevenue`
- Each wrapper runs the schema's `safeParse`, throws `ValidationError` on failure, else delegates to the pure calc function

Validation is purely **additive**: calc functions keep their runtime guards; the Zod layer sits at the boundary between store/UI and the pure engine.

### Layer 3 — Adapter Layer (`src/lib/adapters/`)

One file per module that needs sign handling. Each adapter JSDocs cite the originating Excel formula.

**noplat-adapter.ts** — `toNoplatInput(raw)`:
- Flips signs of interest expense, interest income, non-operating income (each stored on IS with native sign, NOPLAT sheet pulls via `*-1`)
- Flips sign of corporate tax (IS stores negative; NOPLAT displays positive deduction)

**fcf-adapter.ts** — `toFcfInput(raw)`:
- Negates positive depreciation (from Fixed Asset `totals.depreciationAdditions`)
- Negates positive capex (from Fixed Asset `totals.acquisitionAdditions`)
- Working capital deltas pass through unchanged

**cash-flow-adapter.ts** — `toCashFlowInput(raw)`:
- Only capex needs flipping; everything else is already signed correctly at source
- Centralization benefit: future auditors have one file to check for sign conventions instead of 11 callsites

**index.ts** — barrel re-exporting all three adapters

### Integration Test

`__tests__/integration/calc-pipeline.test.ts` proves the full Session 2B-bound flow works end-to-end **before** any UI wiring:

```
raw fixture data → adapter → Zod validator → pure calc → assert against canonical fixture @ 12 decimals
```

Three tests:
1. NOPLAT pipeline (raw IS → `toNoplatInput` → `validatedNoplat` → assert NOPLAT row 19)
2. FCF pipeline (two-stage: NOPLAT first, then FCF with raw FA + WC deltas → `validatedFcf` → assert FCF row 20)
3. NaN rejection (raw data with NaN → `validatedNoplat` throws `ValidationError` BEFORE calc runs)

## Verification

```
Tests:     90 / 90 passing (13 files)   [was 47 at end of Session 002]
Build:     ✅ Compiled successfully in 1750ms
Typecheck: ✅ tsc --noEmit clean (exit 0)
Lint:      ✅ Zero warnings
```

## Stats

- Commits: 10 (1 foundation + 6 refactors + 1 validation + 1 adapters + 1 integration/wrap-up)
- Files changed: 22
- Lines: +2171 / −895
- Test cases added: +43 (47 → 90)
- New files: 4 validation/adapter modules + 4 test files
- New dependencies: 0 (zod 4.3.6 already installed from Phase 1)

## Deviations from Plan

None in major scope. Within-task deviations:
- Task 1 grew from "add types + helpers" to include 15 edge-case helper tests covering empty, single-year, sparse, length mismatch, mutation safety, round-trip. Worth the time — these are primitives everything else stands on.
- Task 9 (adapters) delivered 3 adapters via one bundled commit rather than 3 separate commits. Acceptable deviation — the 3 adapters are small, share the same JSDoc discipline, and are always deployed together.

## Deferred

- **BS/IS migration to YearKeyedSeries** — intentionally deferred. Phase 1 `balance-sheet.ts` and `income-statement.ts` still use `YearlySeries {y0..y3}`. They are already type-safe and don't have cross-sheet column-offset issues (BS and IS share identical D/E/F column layout). Migration is non-blocking tech debt for a future cleanup session.

## Lessons Extracted

- [LESSON-011](../lessons-learned.md#lesson-011): Pre-signed convention must live in adapter layer — retroactively added after 2A.5 implementation proved the pattern
- [LESSON-012](../lessons-learned.md#lesson-012): YearKeyedSeries beats positional arrays for cross-sheet financial data
- [LESSON-013](../lessons-learned.md#lesson-013): Cross-sheet column offset silent landmine — prevented by year-as-data
- [LESSON-014](../lessons-learned.md#lesson-014): Zod validation layer is additive, sits above pure calc — never inside
- [LESSON-015](../lessons-learned.md#lesson-015): Architectural harden-before-UI prevents debug graveyards in UI session

## Files & Components Added/Modified

```
src/types/financial.ts                              [MODIFIED — added YearKeyedSeries]
src/lib/calculations/helpers.ts                     [MODIFIED — 6 new helpers]
src/lib/calculations/fixed-asset.ts                 [REWRITTEN — YearKeyedSeries]
src/lib/calculations/noplat.ts                      [REWRITTEN]
src/lib/calculations/fcf.ts                         [REWRITTEN]
src/lib/calculations/cash-flow.ts                   [REWRITTEN]
src/lib/calculations/ratios.ts                      [REWRITTEN]
src/lib/calculations/growth-revenue.ts              [REWRITTEN]
src/lib/validation/schemas.ts                       [NEW]
src/lib/validation/index.ts                         [NEW]
src/lib/adapters/noplat-adapter.ts                  [NEW]
src/lib/adapters/fcf-adapter.ts                     [NEW]
src/lib/adapters/cash-flow-adapter.ts               [NEW]
src/lib/adapters/index.ts                           [NEW]
__tests__/lib/calculations/year-keyed-helpers.test.ts [NEW]
__tests__/lib/calculations/fixed-asset.test.ts      [REWRITTEN]
__tests__/lib/calculations/noplat.test.ts           [REWRITTEN]
__tests__/lib/calculations/fcf.test.ts              [REWRITTEN]
__tests__/lib/calculations/cash-flow.test.ts        [REWRITTEN]
__tests__/lib/calculations/ratios.test.ts           [REWRITTEN]
__tests__/lib/calculations/growth-revenue.test.ts   [REWRITTEN]
__tests__/lib/validation/validation.test.ts         [NEW]
__tests__/lib/adapters/adapters.test.ts             [NEW]
__tests__/integration/calc-pipeline.test.ts         [NEW]
design.md / plan.md / progress.md                   [MODIFIED]
```

## Next Session Recommendation

With the calc engine fully hardened, **Session 004 = Session 2B (UI layer)** can proceed without architectural concerns:

1. **`<FinancialTable>` reusable component** — sticky headers, tabular-nums, negative-in-red parens, optional common-size/growth columns, mobile horizontal scroll
2. **Zustand store reshape** — year-keyed data structures matching calc input shapes; store becomes the raw-data layer, adapters transform for each calc
3. **`/historical/*` pages** — `store → adapter → validator → calc → <FinancialTable>`, one page per sheet (BS, IS, CF, FA)
4. **`/analysis/*` pages** — Ratios, FCF, NOPLAT, Growth Revenue
5. **Sidebar navigation update** — active state, collapsible groups, mobile bottom nav
6. **Formula transparency tooltip** — non-negotiable #4 from project rules: hover a cell to see the originating Excel formula

The pipeline `raw → adapter → validator → calc` is now integration-tested, so UI development is pure wiring without algebra debugging.
