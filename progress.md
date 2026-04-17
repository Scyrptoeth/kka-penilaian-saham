# Progress — KKA Penilaian Saham

> Latest state after Session 031 — Core Builders (2026-04-17)

## Verification Results
```
Tests:     999 / 999 passing (73 files; was 953 at Session 030 Phase 1, +46)
Build:     ✅ 34 static pages, compiled cleanly
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 integrity gates green (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app — /akses HTTP 200
Store:     v15 (unchanged — no schema change)
```

## Session 031 Status — Core Builders Shipped, Cascade Continues

**Scope delivered this session** (T3 + T4 continuation of Session 030):
- 5 SheetBuilders migrated into `SHEET_BUILDERS` registry:
  - `BalanceSheetBuilder` + `IncomeStatementBuilder` + `FixedAssetBuilder`
    (T3 — primary user complaint: prototipe labels no longer leak)
  - `AamBuilder` + `SimulasiPotensiBuilder` (T4 — AAM chain state-driven)
- Shared `label-writer.ts` utility with `resolveLabel<C>` generic resolver
  plus per-sheet writers (`writeBsLabels`, `writeIsLabels`, `writeFaLabels`,
  `writeAamLabels`)
- Legacy `exportToXlsx` pipeline now skip-guards migrated sheets:
  `clearAllInputCells`, `injectScalarCells`, `injectGridCells` all take
  `skipSheets` param; per-sheet extended injectors wrapped with
  `if (!MIGRATED_SHEET_NAMES.has(...))` guards
- `runSheetBuilders(workbook, state)` orchestrator call inserted at
  correct pipeline position (after legacy extended injection, before
  `applySheetVisibility`)
- Cascade integration test — all-null state → 5 migrated sheets become
  blank shells; non-migrated sheets untouched
- Circular-import hazard resolved via lazy `getSheetBuilders()` function
  + `_testOverride` slot + `__setTestBuildersOverride` seam (LESSON-088/089)

**Deferred to Session 032+** (original Session 030 T5-T10):
- T5: 8 remaining input builders (HOME, KeyDrivers, AccPayables, DLOM,
  DLOC, WACC, DiscountRate, BorrowingCap)
- T6: 7 computed analysis builders (CashFlowStatement, FCF, NOPLAT,
  FinancialRatio, ROIC, GrowthRevenue, GrowthRate)
- T7: 9 projection/valuation/dashboard builders (PROY×5, DCF, EEM, CFI,
  Dashboard)
- T8: Legacy `exportToXlsx` body cleanup + cross-sheet formula sanitizer
  (`stripCrossSheetRefsToBlankSheets`)
- T9: Phase C rewrite to website-state parity (Session 029 Phase C stays
  intact as-is — verified untouched by Session 031)
- AAM extended-account (excelRow ≥ 100) native injection

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
- Export pipeline (Sessions 018-028): template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility + BS/IS/FA extended-catalog native injection + sanitizer pipeline
- AAM dynamic interoperability (Session 027): section-based `AamInput`, dynamic from `balanceSheet.accounts`, IBD classification, EKUITAS section
- State-driven export foundation (Session 030 Phase 1): `SheetBuilder` + `runSheetBuilders` + `clearSheetCompletely` + formula-reactivity probe — runtime-inert empty registry
- **State-driven export core (Session 031)**: 5 builders populated in registry (BS/IS/FA/AAM/SIMULASI POTENSI AAM), legacy pipeline skip-guards per-sheet, label override pattern (LESSON-090), circular-import-safe lazy registry (LESSON-088)

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 031 (2026-04-17) — Core Builders (T3 + T4)
- T1: Shared label-writer utility (`resolveLabel<C>` + `writeBs/Is/Fa/Aam` writers, 14 tests)
- T2: BalanceSheetBuilder (6 tests)
- T3: IncomeStatementBuilder (6 tests)
- T4: FixedAssetBuilder with 4-band label mirror (5 tests)
- T5: Register BS/IS/FA + legacy pipeline skip guards; circular-import fix via `getSheetBuilders()` lazy resolver (registry.test.ts updated)
- T6: AamBuilder with reverse BS_ROW_TO_AAM_D_ROW label lookup (7 tests)
- T7+T8: SimulasiPotensiBuilder + register AAM + Simulasi; `injectScalarCells` takes `skipSheets` (5 tests)
- T9: Cascade integration test — all-null state → 5 migrated sheets blank (3 tests)
- T10: Full verification gate + merge to main (416c803) + live verify + Mode B wrap
- 8 commits on feature branch, fast-forwarded to main
- 3 lessons extracted (all promoted to skill section 8/Tech Stack Gotchas)

#### Session 030 Phase 1 (2026-04-17) — State-Driven Export Foundation
- T1: `SheetBuilder` types + `isPopulated` resolver + `clearSheetCompletely` utility (12 tests)
- T2: `SHEET_BUILDERS` registry + `runSheetBuilders` orchestrator + formula reactivity probe (6 tests)
- Runtime-inert empty registry = safe to merge mid-refactor (LESSON-085)

#### Session 029 (2026-04-17) — i18n Audit + Phase C Verification
- audit-i18n.mjs TypeScript-AST walker + accept-list + CLI
- 55 hardcoded strings migrated to `useT()` across 22 files + 12 compound keys with `{placeholder}` interpolation
- ESLint `local/no-hardcoded-ui-strings` rule + pretest chain
- Phase C integration test — 4 assertions for full pipeline formula preservation

## Next Session Priorities

### Session 032 — Input-driven Builders (T5 original)

1. **HomeBuilder** — reads state.home, writes HOME sheet cells for
   namaPerusahaan, NPWP, tahunTransaksi, jumlahSaham, jenisPerusahaan.
2. **KeyDriversBuilder** — composes existing `injectScalarCells` +
   `injectArrayCells` filtered to KEY DRIVERS sheet.
3. **AccPayablesBuilder** — hidden sheet; reuses cell mapping.
4. **DlomBuilder** / **DlocBuilder** — wrap existing `injectDlomAnswers`
   / `injectDlocAnswers` + `injectDlomJenisPerusahaan`.
5. **WaccBuilder** / **DiscountRateBuilder** — wrap existing scalar +
   dynamic-rows injectors.
6. **BorrowingCapBuilder** — wrap scalar injector.
7. Register all 8 in `SHEET_BUILDERS`. Legacy pipeline auto-skips them
   because `MIGRATED_SHEET_NAMES` is reactive.

### Session 033 — Computed Analysis Builders (T6 original)

8. **CashFlowStatementBuilder** / **FcfBuilder** / **NoplatBuilder** /
   **FinancialRatioBuilder** / **RoicBuilder** / **GrowthRevenueBuilder** /
   **GrowthRateBuilder** — each composes `computeXxx(buildXxxInput(state))`
   from `src/lib/calculations/` and writes leaf-value cells. Template
   formulas that reference populated cells continue to evaluate.

### Session 034+ — Projection/Valuation/Dashboard + Legacy Cleanup

9. 9 projection/valuation/dashboard builders (PROY×5 + DCF + EEM + CFI + Dashboard)
10. T8: Legacy `exportToXlsx` body cleanup + `stripCrossSheetRefsToBlankSheets`
11. T9: Phase C rewrite to website-state parity
12. T10: Full gate + merge + live verify

### Deferred beyond state-driven export migration
- Upload parser (.xlsx → store) — reverse of export
- AAM extended-account (excelRow ≥ 100) native injection
- ESLint rule enhancement — `uiPropNames` array config
- RESUME page — side-by-side DCF/AAM/EEM summary
- Dashboard polish — projected FCF chart, more KPIs
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device
- Audit trail / change history

## Latest Sessions
- [Session 031](history/session-031-core-builders.md) (2026-04-17): Core Builders T3+T4 — 5 SheetBuilders shipped (BS/IS/FA/AAM/SIMULASI POTENSI), label override pattern, circular-import-safe lazy registry, 46 new tests
- [Session 030 Phase 1](history/session-030-foundation-sheet-builders.md) (2026-04-17): State-driven export foundation T1+T2, 18 new tests, 3 lessons, wrapped at milestone with T3-T10 deferred
- [Session 029](history/session-029-i18n-audit-phase-c.md) (2026-04-17): i18n audit + 55-string migration + ESLint rule + Phase C integration test
