# Session 034 — T7: 9 PROY/Valuation/Dashboard Builders (Full Cascade 20→29)

**Date**: 2026-04-17
**Scope**: Session 030 Phase 2 T7 — complete state-driven export migration.
Migrate the 9 remaining visible nav sheets (5 projection + 3 valuation + 1
dashboard) into `SHEET_BUILDERS` registry. Final outcome: all 29 visible
nav sheets now owned by state-driven builders.
**Branch**: `feat/session-034-proy-valuation-dashboard-builders` → fast-forwarded into `main` (c95b5ce)

## Goals (from Session 034 plan.md)

- [x] T1: Design + Plan + Branch
- [x] T2: Extract `buildCfiInput` to `upstream-helpers.ts` + refactor CFI page
- [x] T3: ProyLrBuilder
- [x] T4: ProyFaBuilder
- [x] T5: ProyBsBuilder
- [x] T6: ProyNoplatBuilder
- [x] T7: ProyCfsBuilder
- [x] T8: DcfBuilder
- [x] T9: EemBuilder + CfiBuilder
- [x] T10: DashboardBuilder + cascade 20→29 + full verify + merge + push

## Delivered

### T2 — `buildCfiInput` centralization (commit 40b68d4)
- `src/lib/calculations/upstream-helpers.ts`: new `BuildCfiParams` interface + `buildCfiInput` exported function. Composes `historicalFcf` (from `upstream.allFcf[20]`), `projectedFcf` (from DCF result, positional → projYears), `historicalNonOpCf` (IS row 30), `projectedNonOpCf` (PROY LR row 34).
- `src/app/valuation/cfi/page.tsx`: inline 15-line mapping replaced with single `buildCfiInput({...})` call. Same behavior, zero regression.
- **`buildDashboardInput` intentionally skipped** (YAGNI): Dashboard builder has different data shape from page (page renders charts, builder writes 4-block summary), and only 1 builder consumer. LESSON-046 threshold (>1 page consumer) not met.
- 5 new tests covering all 4 input fields + default-zero edge case.

### T3-T7 — Five PROY Builders (commits 89ed6ca, ea4daeb, 4311ccc, 0ada3e7, d0127cf)
- Each builder composes `computeFullProjectionPipeline` (exists from Session 014) which returns all 6 `proy<Xxx>Rows` in one call. Per-builder overhead = ~50 LOC + ~6 tests.
- **ProyLrBuilder** (89ed6ca): explicit `managedRows` constant listing 21 P&L rows written.
- **ProyFaBuilder** (ea4daeb): explicit `MANAGED_ROWS` = all acquisition/depreciation/net-value bands (49 rows).
- **ProyBsBuilder** (4311ccc): switched to `Object.keys(proyBsRows)` iteration pattern — resilient to future compute-live changes; fixture-driven tests validate correctness.
- **ProyNoplatBuilder** (0ada3e7): same iteration pattern, 7 tax-split rows.
- **ProyCfsBuilder** (d0127cf): same iteration pattern. Row 7 intentionally NOT written (separator row, not in compute output).
- All 5 PROY builders share upstream array `['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'keyDrivers']`.

### T8 — DcfBuilder (commit f2e14ff)
- Writes historical (col C) + 3 projection columns (D/E/F) across rows 7-9 (NOPLAT/Dep/GrossCF), 12-14 (CA/CL/TotalWC), 16 (CapEx), 18 (TotalInvest), 20 (FCF), 22 (Periods), 23 (WACC+DFs), 24 (PV FCF), 25 (TotalPV), 26 (GrowthRate), 27-29 (Terminal/PVTerminal/EV), 30-32 (IBD/Excess/Idle), 33 (EquityValue100).
- **Rows 34-42 intentionally untouched** — template cross-sheet formulas there reference HOME!B8, EEM!C35, etc. Preserving them keeps live-reactivity chain intact in Excel.
- 7 tests.

### T9 — EemBuilder + CfiBuilder (commits 7ec8f50, 63e9d9d)
- **EemBuilder**: upstream = `['home', 'balanceSheet', 'incomeStatement', 'fixedAsset', 'discountRate']` — **keyDrivers NOT required** because EEM uses historical FCF only (no projection). Independent of projection pipeline. Composes AAM result + BorrowingCap result + EEM calc. Writes rows 7-34 (same rows-34+-untouched pattern as DCF).
- **CfiBuilder**: 6-year span (B/C/D = histYears3, E/F/G = projYears). Writes rows 7 (FCF), 8 (Non-Op CF), 9 (CFI total). Consumes new `buildCfiInput` from T2.
- 5 + 4 = 9 tests.

### T10 — DashboardBuilder + cascade final + full verify (commit c95b5ce)
- **DashboardBuilder**: minimal upstream `['home', 'balanceSheet', 'incomeStatement']`. 4 year-blocks at rows 58-62 × (G/H, L/M, P/Q, U/V):
  - Block 1 (G/H): lastHistYear-1 — Net Profit / Ekuitas / DER / NPM
  - Block 2 (L/M): '?' placeholder — all zeros
  - Block 3 (P/Q): lastHistYear — 4 metrics
  - Block 4 (U/V): projYears[0] — populated only when keyDrivers+fixedAsset present; otherwise zeros (graceful degradation)
- **Cascade extended 20 → 29 MIGRATED_SHEETS** — declarative pattern proven again (LESSON-093).
- **Cascade sanity-scan widened** to scan cols A-V × rows 1-65 so DASHBOARD template content (clustered at rows 58-62 × cols G-V) is detectable. Previously scanned only A-E × 1-25.
- 6 tests.

## Verification

```
Tests:     1183 / 1183 passing (99 files; 1125 → 1183 over Session 034, +58)
Build:     ✅ 39 static pages, zero errors, zero warnings
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ zero i18n violations
Phase C:   ✅ 4/4 integrity gates green
Store:     v15 (unchanged — no schema impact)
Live:      https://penilaian-bisnis.vercel.app — HTTP 307 (root redirects /akses, expected)
Registry:  29 / 29 WEBSITE_NAV_SHEETS migrated (FULL CASCADE COVERAGE)
```

## Stats
- Commits on feature branch: 11 (1 docs + 1 refactor + 9 builder/test commits)
- Files changed: 19 new + 5 modified
- Lines: +~2100 / -~60 (net +2040)
- Test cases added: 58 (5 CFI helper + 9 + 7 + 6 + 5 + 4 + 7 + 5 + 4 + 6 builder tests)
- New source files: 10 (9 builders + 1 infra addition to upstream-helpers)
- New test files: 10
- Registry entries: 20 → 29 (+9)
- Page refactors: 1 (CFI page consumes `buildCfiInput`)

## Deviations from Plan

### `buildDashboardInput` NOT extracted
Original plan (session opener) suggested extracting both CFI + Dashboard input
builders to `upstream-helpers.ts`. Investigation revealed Dashboard builder
has fundamentally different data shape than the Dashboard page (page renders
chart arrays; builder writes 4-block summary cells). LESSON-046's threshold
(>1 consumer) not met. Scope trimmed to CFI-only extraction.

### PROY builder authoring pattern evolution
ProyLrBuilder (T3) used explicit `managedRows` constant per Session 033
ProyLr-like template. Midway (T5+), switched to iterating
`Object.keys(proyXxxRows)` for resilience against future compute-live row
additions. Both patterns coexist in the codebase; consistency not enforced.

### Cascade sanity-scan widened
DASHBOARD template has content clustered at rows 58-62 × cols G-V —
outside the narrow "top-left 25×5" scan range in the original cascade
sanity-check. Widened scan to A-V × 1-65 rather than whitelist DASHBOARD
from the scan (explicit whitelist would be fragile).

### EemBuilder upstream narrowed
Plan assumed `keyDrivers` needed for all valuation builders. EEM actually
uses historical FCF only — projection pipeline unnecessary. Upstream
narrowed to `['home', 'balanceSheet', 'incomeStatement', 'fixedAsset',
'discountRate']`. EEM now correctly lights up when user has historical
data but hasn't entered KEY DRIVERS yet.

### Early fixture test errors caught + fixed
- **T4 ProyFa**: initial test asserted `net = acq + dep` but depreciation
  stored negative, correct math is `net = acq - dep`. Sign convention
  mismatch caught by TDD RED phase, fixed.
- **T7 ProyCfs**: initial test seeded row 7 as overwritable, but compute
  doesn't populate row 7 (separator). Seeded rows aligned with actual
  compute output.
- **T10 cascade**: DASHBOARD content outside A-E × 1-25 scan window.
  Fixed by widening scan.

## Deferred to Future Sessions

- **T8 legacy cleanup** (Session 035): prune legacy `exportToXlsx` body
  now that ALL 29 WEBSITE_NAV_SHEETS are registry-owned. Add
  `stripCrossSheetRefsToBlankSheets` for any remaining dead formulas.
- **T9 Phase C rewrite** (Session 035): reconstruct website-state parity
  test using PT Raja Voltama fixtures as `ExportableState`, assert
  exported workbook matches fixture across all 29 sheets.
- **T10 V2 promotion** (Session 036): promote `exportToXlsxV2` as
  primary entry-point; delete V1 branches.
- **AAM extended-account native injection** (excelRow ≥ 100): deferred since Session 031.
- **AccPayables extended catalog**.
- **Upload parser** — reverse of export; reuse cell-mapping + extended injection.
- **RESUME page**; **Dashboard polish** (projected FCF chart, more KPIs).

## Lessons Extracted

- [LESSON-095](../lessons-learned.md#lesson-095): Fixture-driven TDD for
  export builders — per-sheet JSON fixtures provide ground truth for
  cell-layout discovery without upfront manifest authoring. Applies when
  sheets lack SheetManifest (PROY/DCF/EEM/CFI/Dashboard).
- [LESSON-096](../lessons-learned.md#lesson-096): Preserve template
  post-equity formulas in valuation builders — DCF rows 34-42 and EEM
  rows 35-45 depend on cross-sheet references to HOME/DLOM/EEM; writing
  values there breaks the Excel live chain.
- [LESSON-097](../lessons-learned.md#lesson-097): Narrow upstream to
  actual data dependencies — EemBuilder doesn't need keyDrivers because
  EEM uses historical only. Over-declaring upstream gates the builder
  unnecessarily (users who haven't entered KD but have BS/IS/FA/DR would
  see a blank sheet).
- [LESSON-098](../lessons-learned.md#lesson-098): Cascade sanity-scan
  must accommodate sparse sheet content — DASHBOARD template puts content
  at rows 58-62 × G-V; narrow top-left scan reports false-empty.
  Widen or whitelist based on sheet characteristics.

## Files & Components Added/Modified

```
design.md                                                        [REWRITTEN]
plan.md                                                          [REWRITTEN]
progress.md                                                      [UPDATED]
src/lib/calculations/upstream-helpers.ts                         [MODIFIED — +buildCfiInput]
src/app/valuation/cfi/page.tsx                                   [MODIFIED — consumes buildCfiInput]
src/lib/export/sheet-builders/proy-lr.ts                         [NEW]
src/lib/export/sheet-builders/proy-fa.ts                         [NEW]
src/lib/export/sheet-builders/proy-bs.ts                         [NEW]
src/lib/export/sheet-builders/proy-noplat.ts                     [NEW]
src/lib/export/sheet-builders/proy-cfs.ts                        [NEW]
src/lib/export/sheet-builders/dcf.ts                             [NEW]
src/lib/export/sheet-builders/eem.ts                             [NEW]
src/lib/export/sheet-builders/cfi.ts                             [NEW]
src/lib/export/sheet-builders/dashboard.ts                       [NEW]
src/lib/export/sheet-builders/registry.ts                        [MODIFIED — +9 builders]
__tests__/lib/calculations/upstream-helpers.test.ts              [NEW]
__tests__/lib/export/sheet-builders/proy-lr.test.ts              [NEW]
__tests__/lib/export/sheet-builders/proy-fa.test.ts              [NEW]
__tests__/lib/export/sheet-builders/proy-bs.test.ts              [NEW]
__tests__/lib/export/sheet-builders/proy-noplat.test.ts          [NEW]
__tests__/lib/export/sheet-builders/proy-cfs.test.ts             [NEW]
__tests__/lib/export/sheet-builders/dcf.test.ts                  [NEW]
__tests__/lib/export/sheet-builders/eem.test.ts                  [NEW]
__tests__/lib/export/sheet-builders/cfi.test.ts                  [NEW]
__tests__/lib/export/sheet-builders/dashboard.test.ts            [NEW]
__tests__/integration/export-cascade.test.ts                     [EXTENDED 20→29 + widened scan]
```

## Next Session Recommendation (Session 035)

State-driven migration is **complete** — Sessions 030-034 close Phase 2.
Session 035+ is cleanup:

- T8: prune legacy `exportToXlsx` body (all 29 WEBSITE_NAV_SHEETS are now
  registry-owned; the legacy per-sheet scalar/array/grid injection paths
  can be removed wholesale or reduced to support only hidden/helper sheets)
- T9: rewrite Phase C verification to assert exported workbook matches a
  constructed `ExportableState` (using PT Raja Voltama fixtures as the
  golden input) across all 29 sheets
- T10: promote `exportToXlsxV2` as primary entry-point; retire `exportToXlsx` V1

Session 036+ can then tackle the long-deferred backlog: AAM/AccPayables
extended-catalog native injection, upload parser, Dashboard polish, RESUME
page, multi-case management.
