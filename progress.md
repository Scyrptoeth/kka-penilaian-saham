# Progress — KKA Penilaian Saham

> Latest state after Session 033 — T6 Computed Analysis Builders (2026-04-17)

## Verification Results
```
Tests:     1125 / 1125 passing (89 files; was 1066 at Session 032, +59)
Build:     ✅ 34 static pages, compiled cleanly
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 integrity gates green (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app — pending Vercel deploy post-push (commit 529716d)
Store:     v15 (unchanged — no schema change)
```

## Session 033 Status — 7 Computed Analysis Builders Shipped

**Scope delivered this session** (T6 of Session 030 10-task roadmap):
- **Shared helper `writeComputedRowsToSheet`** extracted — iterates
  manifest.rows × histYears, writes allRows[excelRow][year] to cell
  `<col><row>`. Used by 6 of 7 builders.
- **7 new SheetBuilders migrated into `SHEET_BUILDERS` registry**:
  - `NoplatBuilder` (upstream `['home', 'incomeStatement']`) —
    computeNoplatLiveRows + deriveComputedRows → rows 7-19
  - `CashFlowStatementBuilder` (upstream `['home', 'balanceSheet',
    'incomeStatement']`) — FA+AP optional; 3-year CFS + 4-year BS
    for year-1 delta
  - `FcfBuilder` (upstream `['home', 'balanceSheet', 'incomeStatement',
    'fixedAsset']`) — full chain: NOPLAT → FA comp → CFS → FCF
  - `RoicBuilder` (same upstream as FCF) — adds BS comp; cross-year
    row 13 via computeRoicLiveRows
  - `GrowthRevenueBuilder` (upstream `['home', 'incomeStatement']`) —
    4-year span, B/C/D/E columns
  - `GrowthRateBuilder` (upstream same as FCF) — custom builder (no
    manifest), direct cell writes B/C + B15 Average
  - `FinancialRatioBuilder` (upstream `['home', 'balanceSheet',
    'incomeStatement']`) — 18 ratios; FA+AP optional for CFS/FCF chain
- **Cascade integration test extended 13 → 20 sheets** via declarative
  pattern (LESSON-093 proven again)
- **59 new tests** (1066 → 1125)
- **No cross-sheet scalar regressions** — audit-cleared before start
  (STANDALONE_SCALARS empty for target sheets)

**Registry grew** 13 → 20 builders. Legacy pipeline auto-skips all 20
via the reactive `MIGRATED_SHEET_NAMES` proxy.

**Deferred to Session 034+** (original Session 030 T7-T10):
- T7: 9 projection/valuation/dashboard builders (PROY×5, DCF, EEM,
  CFI, Dashboard)
- T8: Legacy `exportToXlsx` body cleanup +
  `stripCrossSheetRefsToBlankSheets`
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
- State-driven export core (Session 031): 5 builders (BS/IS/FA/AAM/SIMULASI POTENSI), legacy pipeline skip-guards per-sheet, label override pattern (LESSON-090), circular-import-safe lazy registry (LESSON-088)
- State-driven export T5 input builders (Session 032): +8 builders (HOME/KeyDrivers/AccPayables/Dlom/Dloc/Wacc/DiscountRate/BorrowingCap). Session 031 IS!B33 regression fixed via source-slice-owns-writes (LESSON-091). Registry grew 5 → 13.
- **State-driven export T6 computed analysis builders (Session 033)**: +7 builders (NOPLAT/CashFlowStatement/FCF/ROIC/GrowthRevenue/GrowthRate/FinancialRatio). Shared helper `writeComputedRowsToSheet` avoids duplication across 6 manifest-based builders; GrowthRateBuilder uses custom writes (no manifest, 2-year layout). Registry grew 13 → 20. No cross-sheet regression risks (audit cleared STANDALONE_SCALARS for these sheets).

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 033 (2026-04-17) — T6 Computed Analysis Builders
- T1: Brainstorm + design.md (self-authorized blanket execution)
- T2: writeComputedRowsToSheet shared helper (5 TDD tests)
- T3-T9: 7 builders with per-builder TDD (54 builder-specific tests)
- T10: Cascade test 13 → 20 (declarative), full verification gate, merge
- 10 commits on feature branch, all green gates
- 1 lesson extracted (LESSON-094, promoted to skill section 8)

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

## Next Session Priorities

### Session 034 — Projection/Valuation/Dashboard Builders (T7 original)

1. **ProyLrBuilder** — PROY LR depends on KEY DRIVERS + IS + PROY FA
2. **ProyFaBuilder** — PROY FIXED ASSETS depends on FA historical
3. **ProyBsBuilder** — PROY BALANCE SHEET depends on BS + KEY DRIVERS
4. **ProyNoplatBuilder** — PROY NOPLAT depends on PROY LR + historical
5. **ProyCfsBuilder** — PROY CASH FLOW STATEMENT depends on full chain
6. **DcfBuilder** — DCF depends on full upstream + PROY chain + WACC/DR
7. **EemBuilder** — EEM depends on AAM + upstream
8. **CfiBuilder** — CFI depends on IS + NOPLAT + DR
9. **DashboardBuilder** — 4 chart sources from various upstream

Each composes `compute<Xxx>(build<Xxx>Input(state))` from
`src/lib/calculations/` + `upstream-helpers.ts` (LESSON-046 pattern).
Template formulas cascade. **Cross-sheet scalar audit WAJIB** —
STANDALONE_SCALARS check before each builder, especially PROY sheets
which may target other sheets.

### Session 035 — Legacy Cleanup + Phase C Rewrite + V2 Promotion (T8-T10)

10. T8: Legacy `exportToXlsx` body cleanup + `stripCrossSheetRefsToBlankSheets`
11. T9: Phase C rewrite — construct `ExportableState` from PT Raja Voltama
    fixtures, assert website-state parity in the exported workbook
12. T10: Promote `exportToXlsxV2` as primary; delete V1 legacy branches

### Deferred beyond state-driven export migration

- Upload parser (.xlsx → store) — reverse of export, reuses cell-mapping + extended injection
- AAM extended-account (excelRow ≥ 100) native injection (deferred from Session 031)
- AccPayables extended-catalog (excelRow ≥ 100)
- ESLint rule enhancement — `uiPropNames` config for project-specific UI-text props
- RESUME page — final summary comparing DCF/AAM/EEM results side by side
- Dashboard polish — projected FCF chart, more KPIs
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device
- Audit trail / change history

## Latest Sessions
- [Session 033](history/session-033-computed-builders.md) (2026-04-17): T6 Computed Analysis Builders — 7 SheetBuilders shipped (NOPLAT/CashFlowStatement/FCF/ROIC/GrowthRevenue/GrowthRate/FinancialRatio), shared `writeComputedRowsToSheet` helper, cascade 13→20, 59 new tests, 1 lesson
- [Session 032](history/session-032-input-builders.md) (2026-04-17): T5 Input Builders — 8 SheetBuilders shipped (HOME/KeyDrivers/AccPayables/Dlom/Dloc/Wacc/DiscountRate/BorrowingCap), Session 031 IS!B33 regression fixed, 67 new tests, 3 lessons
- [Session 031](history/session-031-core-builders.md) (2026-04-17): Core Builders T3+T4 — 5 SheetBuilders shipped (BS/IS/FA/AAM/SIMULASI POTENSI), label override pattern, circular-import-safe lazy registry, 46 new tests
