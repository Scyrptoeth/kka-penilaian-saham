# Progress — KKA Penilaian Saham

> Latest state after Session 032 — T5 Input Builders (2026-04-17)

## Verification Results
```
Tests:     1066 / 1066 passing (81 files; was 999 at Session 031, +67)
Build:     ✅ 34 static pages, compiled cleanly
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 integrity gates green (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app — /akses HTTP 200 (pending post-merge verify)
Store:     v15 (unchanged — no schema change)
```

## Session 032 Status — 8 Input Builders Shipped + IS!B33 Regression Fix

**Scope delivered this session** (T5 of Session 030 10-task roadmap):
- 8 new SheetBuilders migrated into `SHEET_BUILDERS` registry:
  - `HomeBuilder` (upstream `['home']`) — HOME scalars B4-B12
  - `KeyDriversBuilder` (upstream `['keyDrivers']`) — 9 scalars + 12 arrays
  - `AccPayablesBuilder` (upstream `['accPayables']`) — NEW slice wiring through pipeline
  - `DlomBuilder` (upstream `['home']`, conditional state.dlom logic) — C30+C31+F7..F25
  - `DlocBuilder` (upstream `['dloc']`) — B21 + E7..E15
  - `WaccBuilder` (upstream `['wacc']`) — WACC!B4..E22 + dynamic rows + **IS!B33 cross-sheet fix**
  - `DiscountRateBuilder` (upstream `['discountRate']`) — C2..C8 + bankRates K/L
  - `BorrowingCapBuilder` (upstream `['borrowingCapInput']`) — D5+D6
- **Session 031 regression fix** — `wacc.taxRate → IS!B33` restored via new
  `writeScalarsFromSlice('wacc')` helper (source-slice owns all writes pattern,
  LESSON-091)
- **Infrastructure**: extended `injectArrayCells` + `injectDynamicRows` with
  `skipSheets` param; call-site guards added for
  `injectDlomAnswers`/`injectDlocAnswers`/`injectDlomJenisPerusahaan`
- **New ExportableState field**: `accPayables: AccPayablesInputState | null` fills
  a 20-session wiring gap (LESSON-092)
- **Cascade integration test** extended 5 → 13 migrated sheets via declarative
  pattern (LESSON-093)
- **5 new exported helpers**: `writeScalarsForSheet`, `writeScalarsFromSlice`,
  `writeArraysForSheet`, `writeDynamicRowsForSheet`, `writeGridForSheet`
- 67 new tests (999 → 1066)

**Registry grew** 5 → 13 builders. Legacy pipeline auto-skips all 13 via the
reactive `MIGRATED_SHEET_NAMES` proxy.

**Deferred to Session 033+** (original Session 030 T6-T10):
- T6: 7 computed analysis builders (CashFlowStatement, FinancialRatio, FCF,
  NOPLAT, ROIC, GrowthRevenue, GrowthRate)
- T7: 9 projection/valuation/dashboard builders (PROY×5, DCF, EEM, CFI,
  Dashboard)
- T8: Legacy `exportToXlsx` body cleanup + `stripCrossSheetRefsToBlankSheets`
- T9: Phase C rewrite to website-state parity
- T10: `exportToXlsxV2` promotion as primary

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity (Session 023): Montserrat + JetBrains Mono, B&W palette light + dark mode via `next-themes`
- Store v15 with chained migration v1→v15 (15 versions)
- Comprehensive i18n (Session 027): 500+ keys, `useT()` hook, EN default / ID alternate, root-level `language`
- Triple-layer i18n enforcement (Session 029): `audit-i18n.mjs` + `local/no-hardcoded-ui-strings` ESLint rule + `pretest` chain
- Phase C end-to-end verification (Session 029): template formula-preservation across 29 visible sheets @ 1e-6 tolerance
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- Universal auto-save: all editors debounced 500ms, HomeForm onBlur + beforeunload
- PageEmptyState universal across all sections
- Unified DLOM/DLOC sign convention across calc family (Session 022)
- Export pipeline (Sessions 018-032): template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility + BS/IS/FA extended-catalog native injection + sanitizer pipeline
- AAM dynamic interoperability (Session 027): section-based `AamInput`, dynamic from `balanceSheet.accounts`, IBD classification, EKUITAS section
- State-driven export foundation (Session 030 Phase 1): `SheetBuilder` + `runSheetBuilders` + `clearSheetCompletely` + formula-reactivity probe — runtime-inert empty registry
- **State-driven export core (Session 031)**: 5 builders populated in registry (BS/IS/FA/AAM/SIMULASI POTENSI AAM), legacy pipeline skip-guards per-sheet, label override pattern (LESSON-090), circular-import-safe lazy registry (LESSON-088)
- **State-driven export T5 — input builders (Session 032)**: +8 builders (HOME/KeyDrivers/AccPayables/Dlom/Dloc/Wacc/DiscountRate/BorrowingCap). Session 031 IS!B33 regression fixed via source-slice-owns-writes (LESSON-091). 5 new exported builder-facing helpers. Registry grew 5 → 13.

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 032 (2026-04-17) — T5 Input Builders + IS!B33 Fix
- T1: Brainstorm + design.md (identified IS!B33 regression + AccPayables 20-session gap)
- T2: Infrastructure prep — skipSheets on injectArrays + injectDynamicRows, accPayables in ExportableState, ACC_PAYABLES_GRID mapping, 5 new builder-facing helpers
- T3-T9: 8 builders with per-builder TDD (60 builder-specific tests)
- T10: Cascade test 5 → 13 sheets (declarative), full verification gate, merge
- 9 commits on feature branch, all green gates
- 3 lessons extracted (all promoted to skill section 8/Tech Stack Gotchas)

#### Session 031 (2026-04-17) — Core Builders (T3 + T4)
- T1: Shared label-writer utility (`resolveLabel<C>` + `writeBs/Is/Fa/Aam` writers, 14 tests)
- T2: BalanceSheetBuilder (6 tests)
- T3: IncomeStatementBuilder (6 tests)
- T4: FixedAssetBuilder with 4-band label mirror (5 tests)
- T5: Register BS/IS/FA + legacy pipeline skip guards; circular-import fix via `getSheetBuilders()` lazy resolver
- T6: AamBuilder (7 tests)
- T7+T8: SimulasiPotensiBuilder + registry all 5 (5 tests)
- T9: Cascade integration test (3 tests)
- T10: Full verification gate + merge (416c803)
- 3 lessons extracted (all promoted)

#### Session 030 Phase 1 (2026-04-17) — State-Driven Export Foundation
- T1: `SheetBuilder` types + `isPopulated` resolver + `clearSheetCompletely` utility (12 tests)
- T2: `SHEET_BUILDERS` registry + `runSheetBuilders` orchestrator + formula reactivity probe (6 tests)
- Runtime-inert empty registry = safe to merge mid-refactor (LESSON-085)

## Next Session Priorities

### Session 033 — Computed Analysis Builders (T6 original)

1. **CashFlowStatementBuilder** — depends on BS + IS + FA + accPayables.
   Composes `computeCashFlowStatement(buildCashFlowInput(state))` from
   `src/lib/calculations/cash-flow.ts`. Writes leaf values; template
   formulas cascade.
2. **FcfBuilder** — depends on FA + NOPLAT outputs.
3. **NoplatBuilder** — depends on IS + historical tax rates.
4. **FinancialRatioBuilder** — depends on BS + IS + CFS.
5. **RoicBuilder** — depends on NOPLAT + BS.
6. **GrowthRevenueBuilder** — depends on IS.
7. **GrowthRateBuilder** — depends on ROIC + FA + BS.
8. Register all 7 in `SHEET_BUILDERS`. Legacy pipeline auto-skips.

### Session 034 — Projection/Valuation/Dashboard Builders (T7 original)

9. 5 PROY builders (PROY LR, PROY FA, PROY BS, PROY NOPLAT, PROY CFS)
10. 4 Valuation-computed builders (DCF, EEM, CFI, Dashboard)

### Session 035 — Legacy Cleanup + Phase C Rewrite + V2 Promotion (T8-T10)

11. T8: Legacy `exportToXlsx` body cleanup + `stripCrossSheetRefsToBlankSheets`
12. T9: Phase C rewrite — construct `ExportableState` from PT Raja Voltama
    fixtures, assert website-state parity in the exported workbook
13. T10: Promote `exportToXlsxV2` as primary; delete V1 legacy branches

### Deferred beyond state-driven export migration
- Upload parser (.xlsx → store) — reverse of export
- AAM extended-account (excelRow ≥ 100) native injection (deferred from Session 031)
- AccPayables extended-catalog (excelRow ≥ 100)
- ESLint rule enhancement — `uiPropNames` array config
- RESUME page — side-by-side DCF/AAM/EEM summary
- Dashboard polish — projected FCF chart, more KPIs
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device
- Audit trail / change history

## Latest Sessions
- [Session 032](history/session-032-input-builders.md) (2026-04-17): T5 Input Builders — 8 SheetBuilders shipped (HOME/KeyDrivers/AccPayables/Dlom/Dloc/Wacc/DiscountRate/BorrowingCap), Session 031 IS!B33 regression fixed, 67 new tests, 3 lessons
- [Session 031](history/session-031-core-builders.md) (2026-04-17): Core Builders T3+T4 — 5 SheetBuilders shipped (BS/IS/FA/AAM/SIMULASI POTENSI), label override pattern, circular-import-safe lazy registry, 46 new tests
- [Session 030 Phase 1](history/session-030-foundation-sheet-builders.md) (2026-04-17): State-driven export foundation T1+T2, 18 new tests, 3 lessons, wrapped at milestone with T3-T10 deferred
