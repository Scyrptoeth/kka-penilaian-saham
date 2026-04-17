# Session 034 Design — T7: 9 Projection/Valuation/Dashboard Builders

**Date**: 2026-04-17
**Branch**: `feat/session-034-proy-valuation-dashboard-builders`

## Problem Statement

Sessions 030-033 migrated 20 of 29 WEBSITE_NAV_SHEETS into the state-driven
`SHEET_BUILDERS` registry. The remaining 9 sheets — 5 projection sheets,
3 valuation-chain sheets, 1 dashboard — are still owned by the legacy
template-based pipeline, meaning when a user's upstream deviates from the
PT Raja Voltama Elektrik prototipe, these derived sheets either leak
prototipe labels/structure or produce wrong template-formula results.

Session 034 completes T7: register builders for **PROY LR, PROY FIXED
ASSETS, PROY BALANCE SHEET, PROY NOPLAT, PROY CASH FLOW STATEMENT, DCF,
EEM, CFI, DASHBOARD**. After this session, all 29 WEBSITE_NAV_SHEETS are
state-driven. Sessions 035+ handle T8-T10 (legacy cleanup + Phase C
rewrite + V2 promotion).

## Chosen Approach

**Pattern**: mirror Sessions 031/032/033. Each builder is a `SheetBuilder`
object. Each `build()` composes pre-existing calc functions — no new
pure-calc code required:
- `computeFullProjectionPipeline` (shared pipeline, exists) returns all
  6 PROY rows (LR/FA/BS/NOPLAT/AP/CFS) from HOME + BS + IS + FA? + KeyDrivers.
- `computeHistoricalUpstream` (exists) returns NOPLAT/CFS/FCF/FA chain
  consumed by DCF/EEM/CFI/Dashboard.
- `buildDcfInput` / `buildEemInput` / `buildBorrowingCapInput` exist.
- `buildCfiInput` + `buildDashboardInput` **do NOT exist** — extract to
  `upstream-helpers.ts` in T2 (LESSON-046 enforcement).

**Fixture-driven cell discovery**: all 9 target sheets have ground-truth
fixtures in `__tests__/fixtures/*.json`. Rather than author separate
cell-layout constant files, the per-builder TDD phase reads fixtures to
determine cell addresses and validates builder output against fixture
values. Fixtures ARE the source of truth.

**No SheetManifest required for T7 sheets**: unlike Session 033 computed
analysis (NOPLAT/CFS/FCF/ROIC/FR — all had manifests), PROY sheets never
had manifests (LESSON-038: "PROY pages → custom page, not manifest").
DCF/EEM/CFI/Dashboard likewise custom. Builders write cells directly —
mirror `GrowthRateBuilder` pattern from Session 033.

## Key Technical Decisions

### D1. `buildCfiInput` + `buildDashboardInput` extraction (LESSON-046)

Extract into `upstream-helpers.ts`:
- `buildCfiInput(params): CfiInput` — composes `computeFullProjectionPipeline`
  result + `computeHistoricalUpstream` result + DR to produce 4 year-series
  needed by `computeCfi`.
- `buildDashboardInput(params): DashboardInput` — new type encapsulates
  all data the Dashboard builder writes to the template: revenue/net-income
  series, BS composition, DCF/AAM/EEM valuation summary, share value.

Refactor `src/app/valuation/cfi/page.tsx` + `src/app/dashboard/page.tsx`
to consume the new builders. Zero behavior change — identical output.
Tests validate via existing integration tests + new `upstream-helpers`
unit tests.

### D2. Registry order — T7 placement

New order (post-T7):

```ts
// Session 031 financial statements
BalanceSheetBuilder, IncomeStatementBuilder, FixedAssetBuilder,
// Session 032 inputs
HomeBuilder, KeyDriversBuilder, AccPayablesBuilder,
DlomBuilder, DlocBuilder,
WaccBuilder, DiscountRateBuilder, BorrowingCapBuilder,
// Session 033 computed analysis
NoplatBuilder, CashFlowStatementBuilder, FcfBuilder,
RoicBuilder, GrowthRevenueBuilder, GrowthRateBuilder,
FinancialRatioBuilder,
// Session 034 projections (new)
ProyLrBuilder, ProyFaBuilder, ProyBsBuilder,
ProyNoplatBuilder, ProyCfsBuilder,
// Session 034 valuation (new)
DcfBuilder, CfiBuilder, EemBuilder,
// Session 034 dashboard (new)
DashboardBuilder,
// Session 031 AAM chain — runs after all inputs + valuation
AamBuilder, SimulasiPotensiBuilder,
```

Rationale: no cross-sheet scalar dependencies between T7 builders, but
ordering matches logical data flow — projections before DCF (DCF consumes
PROY), DCF before CFI (CFI consumes DCF projectedFcf), AAM/SIMULASI last
as always.

### D3. Write values, not formulas (Session 033 D3 carry-over)

T7 sheets are derived outputs. User cannot edit them. Writing static
computed values eliminates template-formula-chain complexity. Trade-off:
user opening .xlsx in Excel sees static numbers on these sheets; they do
NOT recompute when user tweaks an upstream cell in Excel. This matches
website semantics.

### D4. Cross-sheet scalar audit — PASSED

`grep -n "sheetName.*'PROY\|'DCF'\|'EEM'\|'CFI'\|'DASHBOARD'" src/lib/export/*.ts`
returns **zero matches**. No `STANDALONE_SCALARS` entries target T7
sheets. No cross-sheet writes from other builders into T7 sheets. No
LESSON-091 hazard.

### D5. Dashboard scope — data cells only

Excel DASHBOARD sheet contains data tables + chart references. ExcelJS
does not reliably round-trip chart XML / image parts. Dashboard builder
writes **data cells only** — chart objects left untouched. Charts in the
exported file reference whatever cells the template chart objects already
point to; if those cells are populated with current values, charts
render with current data on Excel open.

### D6. Cascade integration test — declarative growth 20 → 29

`__tests__/integration/export-cascade.test.ts` `MIGRATED_SHEETS` array
grows 20 → 29 sheets. Per LESSON-093, assertions unchanged — test works
by data-table extension.

### D7. Fixture-based TDD precision

Per-builder test shape:
```ts
import fixture from '../../../fixtures/proy-lr.json'
const fixtureCell = (addr: string) =>
  fixture.cells.find(c => c.addr === addr)?.value ?? null
// After Builder.build(wb, state):
expect(ws.getCell('C8').value).toBeCloseTo(fixtureCell('C8') as number, 0)
```

Precision: integer-close (tolerance 0) for IDR values — fixture stores
computed float; compute pipeline reproduces same float. Percent values
use 6-decimal `toBeCloseTo`.

## What is OUT OF SCOPE

- ❌ T8 (legacy `exportToXlsx` body cleanup + `stripCrossSheetRefsToBlankSheets`) — Session 035
- ❌ T9 (Phase C rewrite to website-state parity) — Session 035
- ❌ T10 (`exportToXlsxV2` promotion as primary) — Session 036
- ❌ Dashboard chart object modification (ExcelJS limitation)
- ❌ PROY ACC PAYABLES builder — sheet is hidden from website nav, stays in legacy pipeline (already hidden via applySheetVisibility)
- ❌ RESUME sheet — hidden, not in WEBSITE_NAV_SHEETS
- ❌ Upload parser, dark-mode polish, multi-case management — unrelated backlog

## Verification Strategy

- **Per-builder**: unit tests that (a) metadata check, (b) null-upstream
  no-op, (c) populated-upstream matches fixture values at several cells
- **Shared helper refactor (T2)**: ensure existing CFI/Dashboard pages
  still work after extraction — browser smoke via build + prerender
  verification + unit tests on new `buildCfiInput`/`buildDashboardInput`
- **Cascade integration**: 20 → 29 MIGRATED_SHEETS grow, same assertions
- **Pipeline**: Session 029 Phase C test unchanged — still 4/4 gates
- **Build/lint/typecheck/audit**: full gate before merge
- **Post-merge**: HTTP 307 probe on penilaian-bisnis.vercel.app

## Expected Impact

**Tests**: 1125 → ~1200 (+75 estimated: 9 builders × 6-8 tests + T2 helper tests + cascade extension)
**Registry**: 20 → 29 builders (full cascade coverage)
**Legacy pipeline**: now skip-guards all 29 WEBSITE_NAV_SHEETS via reactive `MIGRATED_SHEET_NAMES`
**State-driven migration completion**: Sessions 030-034 close Phase 2 entirely; T8-T10 are cleanup, not migration
