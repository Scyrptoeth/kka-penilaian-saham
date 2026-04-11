# Plan — KKA Penilaian Saham (Session 2A.5: Harden Calc Engine)

Branch: `feat/phase2a5-harden-calc`
Target: Harden 6 Phase 2A calc modules with YearKeyedSeries, Zod validation boundary, and explicit-sign adapter layer. All existing tests must stay passing after each task.

## Tasks

### Task 1 — `YearKeyedSeries` type + helpers
- Add `YearKeyedSeries` to `src/types/financial.ts`
- Add helpers to `src/lib/calculations/helpers.ts`:
  - `yearsOf(series)` — sorted ascending year list
  - `assertSameYears(label, a, b)` — throws on mismatch
  - `emptySeriesLike(series)` — new series with same years, all zeros
  - `mapSeries(series, fn)` — value-mapping, preserves years
  - `fromArray(years, values)` / `toArray(series, years?)` — interop shims
- Unit tests for helpers (edge cases: empty, single-year, sparse years)
- **Verify**: `npm test` green (47 existing + new helper tests), no existing file broken

### Task 2 — Refactor `fixed-asset.ts`
- Change `FixedAssetCategoryInput` and `FixedAssetSchedule` to `YearKeyedSeries` throughout
- Input still carries a `years` hint — derive from any input series instead
- Rewrite test to build YearKeyedSeries from fixture
- **Verify**: fixed-asset tests all pass; commit `refactor(calc): fixed asset to YearKeyedSeries`

### Task 3 — Refactor `noplat.ts`
- `NoplatInput` fields → `YearKeyedSeries`
- `NoplatResult` fields → `YearKeyedSeries`
- Rewrite test
- **Verify**: noplat tests pass; commit

### Task 4 — Refactor `fcf.ts`
- Same pattern; pre-signed convention preserved (still documented in JSDoc)
- **Verify**: fcf tests pass; commit

### Task 5 — Refactor `cash-flow.ts`
- 11 input series all become `YearKeyedSeries`
- Year axis derived from `ebitda`, asserted same across all other inputs
- **Verify**: cash-flow tests pass; commit

### Task 6 — Refactor `ratios.ts`
- 18 input series + 18 output series → `YearKeyedSeries`
- **Verify**: ratios tests pass; commit

### Task 7 — Refactor `growth-revenue.ts`
- Input: `YearKeyedSeries` of N years
- Output: `YearKeyedSeries` of N−1 years (keyed by the *current* year of each YoY pair)
- **Verify**: growth-revenue tests pass; commit

### Task 8 — Zod validation layer
- `src/lib/validation/schemas.ts`:
  - `yearKeyedSeriesSchema` — base: record of number(year) → finite number, rejects NaN/Infinity, min 1 entry
  - One input schema per calc module (FixedAsset, Noplat, Fcf, CashFlow, Ratios, GrowthRevenue)
  - Cross-field refinement: all series within a single input must have identical year sets
- `src/lib/validation/index.ts`: thin `validated*` wrappers returning `z.infer<typeof ...>` and calling underlying calc functions
- Tests covering: NaN, Infinity, missing year, sparse arrays, mismatched year sets, single-year input
- **Verify**: validation tests pass; commit `feat(validation): zod boundary schemas`

### Task 9 — Adapter layer
- `src/lib/adapters/fcf-adapter.ts`:
  - `toFcfInput(noplatResult, fixedAssetSchedule, workingCapitalDeltas)` → `FcfInput`
  - Handles sign-flip of depreciation and capex with JSDoc
- `src/lib/adapters/cash-flow-adapter.ts`:
  - `toCashFlowInput(raw)` with explicit sign handling for tax, WC, capex, interest
- `src/lib/adapters/noplat-adapter.ts`:
  - `toNoplatInput(incomeStatement)` using labeled IS data
- Tests reading raw fixture shapes, passing through adapter, then calling calc, asserting vs fixture
- **Verify**: adapter tests pass; commit `feat(adapters): explicit sign convention layer`

### Task 10 — Integration test + wrap up
- `__tests__/integration/calc-pipeline.test.ts`: one end-to-end flow per adapter
  - `raw fixture data → zod validate → adapter → calc → assert against fixture at 12 decimals`
- Full verify: `npm test`, `npm run build`, `npm run lint`, `tsc --noEmit`
- Update `progress.md` with Session 2A.5 summary
- Merge `feat/phase2a5-harden-calc` → main (with user confirmation per git-workflow rules)
- Push
- **Verify**: ≥60 tests passing, all green; Vercel deploy succeeds

## Progress

- [ ] Task 1 — YearKeyedSeries type + helpers
- [ ] Task 2 — Refactor fixed-asset
- [ ] Task 3 — Refactor noplat
- [ ] Task 4 — Refactor fcf
- [ ] Task 5 — Refactor cash-flow
- [ ] Task 6 — Refactor ratios
- [ ] Task 7 — Refactor growth-revenue
- [ ] Task 8 — Zod validation layer
- [ ] Task 9 — Adapter layer
- [ ] Task 10 — Integration test + verify + merge
