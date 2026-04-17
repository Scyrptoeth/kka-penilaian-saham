# Session 033 Design — T6: 7 Computed Analysis Builders

**Date**: 2026-04-17
**Branch**: `feat/session-033-computed-builders`

## Problem Statement

Sessions 030-032 delivered the state-driven export foundation and
migrated 13 of 29 nav sheets (BS, IS, FA, AAM, SIMULASI POTENSI (AAM),
HOME, KEY DRIVERS, ACC PAYABLES, DLOM, DLOC(PFC), WACC, DISCOUNT RATE,
BORROWING CAP) into the `SHEET_BUILDERS` registry. The remaining 16
sheets still run through the template-based legacy pipeline, which means
computed analysis sheets (CASH FLOW STATEMENT, FCF, NOPLAT, FINANCIAL
RATIO, ROIC, GROWTH REVENUE, GROWTH RATE) still leak prototipe PT Raja
Voltama data when the user has populated their own upstream but hasn't
actually "computed" these sheets via the website.

Session 033 targets the **7 computed analysis sheets** — derived outputs
from BS / IS / FA / AP that have no user-input dimension. Each builder
composes the existing `computeXxxLiveRows` calculator (from
`src/data/live/`) with `deriveComputedRows` (for subtotals/totals via
manifest `computedFrom`) and writes the result into the template cells.

## Chosen Approach

**Pattern**: mirror Session 031/032 shape. Each builder file exports a
`SheetBuilder` object. `build()` computes the sheet's data in memory,
then writes all row × year cells via a new shared helper
`writeComputedRowsToSheet(ws, manifest, allRows, histYears)`.

**No cross-sheet scalar writes needed** — verified via audit of
`STANDALONE_SCALARS` in `cell-mapping.ts`: zero entries target any of
the 7 T6 sheets. (LESSON-091 audit gate passed.)

**Historical year computation**: `computeHistoricalYears(
state.home.tahunTransaksi, 3 | 4)` from `src/lib/calculations/year-helpers.ts`.
CFS + FCF + NOPLAT + ROIC + GROWTH REVENUE + GROWTH RATE use 3 years;
FINANCIAL RATIO uses 4 years (matches BS/IS historical column span).

**Shared helper T2 — `writeComputedRowsToSheet`**: extract the common
"iterate `manifest.rows × manifest.columns`, write each
`allRows[excelRow][year]` to cell `<col><row>`" pattern into a single
tested helper. All 7 builders use it. Avoids 7× duplication while
preserving per-builder customization (upstream selection, compute
orchestration, year count).

### Builder-per-sheet table

| # | Sheet name            | Upstream                                     | Compute Source                                  | Years |
|---|-----------------------|----------------------------------------------|-------------------------------------------------|-------|
| 1 | `NOPLAT`              | `['incomeStatement']`                        | `computeNoplatLiveRows`                         | 3     |
| 2 | `CASH FLOW STATEMENT` | `['balanceSheet','incomeStatement']`         | `computeCashFlowLiveRows` (+optional FA, AP)    | 3     |
| 3 | `FCF`                 | `['balanceSheet','incomeStatement','fixedAsset']` | Chain: NOPLAT + FA + CFS → `computeFcfLiveRows` | 3     |
| 4 | `ROIC`                | `['balanceSheet','incomeStatement','fixedAsset']` | Chain: NOPLAT + CFS + FA + FCF → `computeRoicLiveRows` | 3     |
| 5 | `GROWTH REVENUE`      | `['incomeStatement']`                        | `computeGrowthRevenueLive`                      | 4 (BS/IS) |
| 6 | `GROWTH RATE`         | `['balanceSheet','incomeStatement','fixedAsset']` | Chain: NOPLAT + FA + CFS + FCF + ROIC → `computeGrowthRateLive` | 3     |
| 7 | `FINANCIAL RATIO`     | `['balanceSheet','incomeStatement']`         | `computeFinancialRatioLive` (+optional CFS)     | 4     |

## Key Technical Decisions

### D1. Registry order — computed analysis after all inputs

These builders consume BS/IS/FA/AP upstream data. Registered AFTER
input builders (Session 031/032 block) but BEFORE valuation chain
(AAM/SIMULASI). Final order:

```ts
// Financial statements (Session 031)
BalanceSheetBuilder, IncomeStatementBuilder, FixedAssetBuilder,
// Input master + supporting inputs (Session 032)
HomeBuilder, KeyDriversBuilder, AccPayablesBuilder,
// Questionnaires (Session 032)
DlomBuilder, DlocBuilder,
// Valuation parameters (Session 032)
WaccBuilder, DiscountRateBuilder, BorrowingCapBuilder,
// Computed analysis (Session 033)
NoplatBuilder, CashFlowStatementBuilder, FcfBuilder,
RoicBuilder, GrowthRevenueBuilder, GrowthRateBuilder,
FinancialRatioBuilder,
// AAM chain (Session 031)
AamBuilder, SimulasiPotensiBuilder,
```

### D2. Null-safe upstream chaining

Each compute-live function accepts nullable optional inputs. Builder
gate pattern: require MANDATORY upstream (enforced by orchestrator's
`isPopulated` check via `upstream` array) but allow OPTIONAL upstream
to fall through to the compute-live function's own null handling.

Example: `CashFlowStatementBuilder` mandates `['balanceSheet', 'incomeStatement']`
(without these, CFS is meaningless). `fixedAsset` + `accPayables` are
optional (compute-live returns zero capex / zero financing rows when
null).

### D3. Write values, not formulas

T6 sheets are derived outputs — user cannot edit them via website.
Writing static computed values is semantically correct and eliminates
template-formula complexity (no cross-sheet ref chain to maintain).

**Trade-off accepted**: opening exported file in Excel, user cannot
"tweak one upstream cell and see downstream auto-update" on these 7
sheets — they show static numbers. This matches website behavior
(these sheets are read-only in the website too). Live reactivity for
user-editable sheets (BS/IS/FA etc.) is preserved via their respective
template formulas.

### D4. Historical year count derivation

`state.home.tahunTransaksi` provides the latest year. Compute years:
```ts
import { computeHistoricalYears } from '@/lib/calculations/year-helpers'
const histYears3 = computeHistoricalYears(state.home.tahunTransaksi, 3)
const histYears4 = computeHistoricalYears(state.home.tahunTransaksi, 4)
```

Builder must guard: if `state.home === null`, fall through to
`clearSheetCompletely` via orchestrator (null-upstream path).

### D5. Cascade integration test extension

`__tests__/integration/export-cascade.test.ts` MIGRATED_SHEETS array
extends 13 → 20. Declarative pattern means test assertions unchanged
(LESSON-093 — Session 032 pattern proven).

## What is OUT OF SCOPE

- ❌ T7 (9 projection/valuation/dashboard builders — PROY×5, DCF, EEM, CFI, Dashboard) — deferred to Session 034
- ❌ T8 (legacy `exportToXlsx` body cleanup + `stripCrossSheetRefsToBlankSheets`) — Session 035
- ❌ T9 (Phase C rewrite to website-state parity) — Session 035
- ❌ T10 (V2 promotion as primary) — Session 036
- ❌ Cross-sheet formula preservation on T6 sheets — values-not-formulas chosen per D3
- ❌ Upload parser, RESUME page, Dashboard polish — unrelated backlog

## Verification Strategy

- **Per-builder**: unit tests loading real template, asserting cell
  values match expected compute output (RED → GREEN → REFACTOR)
- **Shared helper**: 5 TDD tests for `writeComputedRowsToSheet`
  covering iteration, null skipping, column letter lookup, idempotency,
  missing-row tolerance
- **Orchestrator**: cascade integration test extended 13 → 20 sheets
- **Pipeline**: Session 029 Phase C test unchanged (still 4/4 gates)
- **Build/lint/typecheck/audit**: full gate before merge
- **Live**: post-merge HTTP check on penilaian-bisnis.vercel.app
