# Session 033 — T6: 7 Computed Analysis Builders

**Date**: 2026-04-17
**Scope**: Session 030 Phase 2 T6 — migrate 7 computed analysis sheets
(NOPLAT, CASH FLOW STATEMENT, FCF, ROIC, GROWTH REVENUE, GROWTH RATE,
FINANCIAL RATIO) into state-driven `SHEET_BUILDERS` registry. Primary
deliverable: when user's upstream BS/IS/FA doesn't match PT Raja Voltama
prototipe, these derived sheets compute from user data instead of leaking
template values.
**Branch**: `feat/session-033-computed-builders` → fast-forwarded into `main` (529716d)

## Goals (from Session 033 plan.md)
- [x] T1: Brainstorm + design.md (self-authorized, user blanket OK)
- [x] T2: `writeComputedRowsToSheet` shared helper (5 TDD tests)
- [x] T3: NoplatBuilder (8 tests)
- [x] T4: CashFlowStatementBuilder (10 tests)
- [x] T5: FcfBuilder (8 tests)
- [x] T6: RoicBuilder (6 tests)
- [x] T7: GrowthRevenueBuilder (6 tests)
- [x] T8: GrowthRateBuilder (8 tests)
- [x] T9: FinancialRatioBuilder (8 tests)
- [x] T10: Cascade test 13→20 + full verification + merge + Mode B

## Delivered

### T2 — Shared helper `writeComputedRowsToSheet` (commit 687d953)
- **`src/lib/export/sheet-builders/computed-writer.ts`** [NEW]: iterates
  `manifest.rows × histYears`, writes `allRows[excelRow][year]` to cell
  `<col><excelRow>`. Skips rows without `excelRow` (headers, separators,
  add-buttons). Skips null/undefined year entries. Used by 5 of 7
  builders (GrowthRateBuilder + SimulasiPotensiBuilder-style custom
  writes use direct cells because sheets lack SheetManifest).
- 5 TDD tests cover iteration, null skipping, idempotency, header
  skipping, missing-row tolerance.

### T3 — NoplatBuilder (commit 16e796d)
- **`sheet-builders/noplat.ts`** [NEW]: upstream=`['home', 'incomeStatement']`.
  Composes `computeNoplatLiveRows + deriveComputedRows(NOPLAT_MANIFEST) +
  writeComputedRowsToSheet`. Writes leaves (rows 7/8/9/10/13-16) + computed
  subtotals (rows 11/17/19 via computedFrom).
- 8 tests.

### T4 — CashFlowStatementBuilder (commit 30f12dc)
- **`sheet-builders/cash-flow-statement.ts`** [NEW]: upstream=
  `['home', 'balanceSheet', 'incomeStatement']`. FA + AP optional per
  compute-cash-flow-live design. Uses BS 4-year span (year-1 CL delta
  needs prior-year BS) + CFS 3-year span.
- 10 tests cover EBITDA/Tax/CapEx/NewLoan, FA-optional, AP-optional,
  subtotal chain.

### T5 — FcfBuilder (commit b1620c1)
- **`sheet-builders/fcf.ts`** [NEW]: upstream=
  `['home', 'balanceSheet', 'incomeStatement', 'fixedAsset']`. Composes
  NOPLAT + FA computed + CFS + FCF chain.
- Fixture bug caught during RED (test providing FA rows 23/51 directly
  without leaves 17-22/45-50 — `deriveComputedRows` recomputes from
  leaves, ignoring pre-aggregated values). Fixed test fixture (LESSON-094
  candidate).
- 8 tests.

### T6 — RoicBuilder (commit 375a33d)
- **`sheet-builders/roic.ts`** [NEW]: upstream=same as FCF. Runs full
  chain (NOPLAT → FA → CFS → FCF) + BS computed subtotals, then calls
  `computeRoicLiveRows` which handles cross-year refs (row 13 = prior
  row 12) internally. No deriveComputedRows on ROIC itself.
- ROIC uses B/C/D columns (offset from CFS/FCF/NOPLAT C/D/E); helper
  reads `manifest.columns` so offset is transparent.
- 6 tests.

### T7 — GrowthRevenueBuilder (commit 8dbf234)
- **`sheet-builders/growth-revenue.ts`** [NEW]: simplest builder.
  upstream=`['home', 'incomeStatement']`. Projects IS row 6 (Revenue)
  and row 35 (NPAT) onto GR rows 8/9 across 4 historical years.
- Rows 40/41 (industry benchmarks) left untouched — user-editable,
  no compute-live output.
- 6 tests.

### T8 — GrowthRateBuilder (commit 1a086d1)
- **`sheet-builders/growth-rate.ts`** [NEW]: custom builder — GROWTH RATE
  has no SheetManifest (2-year layout, columns B/C). Direct cell writes
  following SimulasiPotensiBuilder pattern.
- upstream=`['home', 'balanceSheet', 'incomeStatement', 'fixedAsset']`.
  Full upstream chain BS comp + NOPLAT + FA comp + CFS + FCF + ROIC
  then calls computeGrowthRateLive for 2-year output.
- Writes rows 6/7/8/9/10/12/14 at B/C + row 15 Average at B15 only.
- 8 tests.

### T9 — FinancialRatioBuilder (commit f3cc7c6)
- **`sheet-builders/financial-ratio.ts`** [NEW]: 18 ratios via
  `computeFinancialRatioLiveRows`. BS + IS mandatory (14/18 ratios).
  FA + AP optional — when FA present, FCF chain runs for row 27;
  when AP present, CFS chain populates rows 26/28/30.
- 8 tests cover GP margin, NP margin, row 27 fallback, full-chain row 26.

### T10 — Cascade + verification + merge (commit 529716d)
- `__tests__/integration/export-cascade.test.ts` — `MIGRATED_SHEETS`
  extended 13 → 20 via declarative pattern (LESSON-093).
- Full verification gate GREEN: 1125/1125 tests, typecheck, lint, audit,
  phase-c, build.
- Merge fast-forwarded to `main` at commit 529716d.

## Verification
```
Tests:     1125 / 1125 passing (89 files; 1066 → 1125 over Session 033, +59)
Build:     ✅ 34 static pages, zero errors
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ zero i18n violations
Phase C:   ✅ 4/4 integrity gates green
Store:     v15 (unchanged — no schema impact)
Live:      https://penilaian-bisnis.vercel.app — pending Vercel deploy post-push
```

## Stats
- Commits on feature branch: 10 (1 docs plan + 9 feat/test)
- Files changed: 20
- Lines: +2,179 / -283 (net +1,896)
- Test cases added: 59 (5 writer + 8 noplat + 10 CFS + 8 FCF + 6 ROIC +
  6 GrowthRev + 8 GrowthRate + 8 FR)
- New source files: 8 (1 shared helper + 7 builders)
- New test files: 8

## Deviations from Plan

### GrowthRateBuilder used custom writes (no SheetManifest)
Plan assumed all 7 sheets had manifests. GROWTH RATE lacks one (Session
014 chose custom page for 2-year layout). Builder adopted direct cell
writes following SimulasiPotensiBuilder pattern — no regression in
test shape or test count.

### FCF test fixture required fix mid-TDD
Plan didn't predict the FA subtotal re-derivation trap. First test
passed FA rows 23 and 51 directly (production store has these as
sentinels). But `deriveComputedRows(FIXED_ASSET_MANIFEST, ...)`
RECOMPUTES these from leaves — pre-aggregated inputs at subtotal rows
are ignored when the leaves are missing. Fixed fixture to provide
leaves summing to target totals. Promoted to LESSON-094.

## Deferred to Future Sessions

- T7 (9 projection/valuation/dashboard: PROY×5, DCF, EEM, CFI,
  Dashboard) — Session 034 target
- T8 (legacy `exportToXlsx` body cleanup +
  `stripCrossSheetRefsToBlankSheets`) — Session 035
- T9 (Phase C rewrite to website-state parity) — Session 035
- T10 (promote `exportToXlsxV2` to primary) — Session 036
- AAM extended-account native injection
- AccPayables extended catalog

## Lessons Extracted

- [LESSON-094](../lessons-learned.md#lesson-094): When a builder calls
  `deriveComputedRows(MANIFEST, values, years)`, test fixtures MUST
  provide the compute-chain leaves (rows referenced by `computedFrom`),
  not just the pre-aggregated subtotals. `deriveComputedRows` trusts
  `computedFrom` declarations and recomputes — it does NOT treat
  pre-aggregated values at subtotal rows as sentinels.

## Files & Components Added/Modified
```
design.md                                                           [REWRITTEN]
plan.md                                                             [REWRITTEN]
src/lib/export/sheet-builders/computed-writer.ts                    [NEW]
src/lib/export/sheet-builders/noplat.ts                             [NEW]
src/lib/export/sheet-builders/cash-flow-statement.ts                [NEW]
src/lib/export/sheet-builders/fcf.ts                                [NEW]
src/lib/export/sheet-builders/roic.ts                               [NEW]
src/lib/export/sheet-builders/growth-revenue.ts                     [NEW]
src/lib/export/sheet-builders/growth-rate.ts                        [NEW]
src/lib/export/sheet-builders/financial-ratio.ts                    [NEW]
src/lib/export/sheet-builders/registry.ts                           [MODIFIED — +7 builders]
__tests__/lib/export/sheet-builders/computed-writer.test.ts         [NEW]
__tests__/lib/export/sheet-builders/noplat.test.ts                  [NEW]
__tests__/lib/export/sheet-builders/cash-flow-statement.test.ts     [NEW]
__tests__/lib/export/sheet-builders/fcf.test.ts                     [NEW]
__tests__/lib/export/sheet-builders/roic.test.ts                    [NEW]
__tests__/lib/export/sheet-builders/growth-revenue.test.ts          [NEW]
__tests__/lib/export/sheet-builders/growth-rate.test.ts             [NEW]
__tests__/lib/export/sheet-builders/financial-ratio.test.ts         [NEW]
__tests__/integration/export-cascade.test.ts                        [EXTENDED 13→20]
```

## Next Session Recommendation (Session 034)

**T7 — 9 projection/valuation/dashboard builders**:
- PROY LR, PROY FA, PROY BS, PROY NOPLAT, PROY CFS
- DCF, EEM, CFI, Dashboard

Each composes `compute<Xxx>(build<Xxx>Input(state))` from
`src/lib/calculations/` — all builders already exist via `upstream-helpers.ts`
(LESSON-046 pattern). Template formulas cascade. Cross-sheet scalar
audit needed (LESSON-091) — PROY pages may target another sheet (e.g.
PROY LR!B14 cross-sheet scalars).

Estimated Session 034 budget: similar to Session 033 (~9 builders, ~50
new tests, ~2-3 hours). Single session feasible.

Remaining after Session 034: T8-T10 (legacy pipeline cleanup + Phase C
rewrite + V2 promotion). Session 035+ handles those.
