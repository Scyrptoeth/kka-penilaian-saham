# Progress — KKA Penilaian Saham

> Latest state after Session 034 — T7 PROY/Valuation/Dashboard Builders (2026-04-17)
> **🎉 STATE-DRIVEN EXPORT MIGRATION COMPLETE** — 29/29 visible nav sheets owned by registry.

## Verification Results
```
Tests:     1183 / 1183 passing (99 files; was 1125 at Session 033, +58)
Build:     ✅ 39 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 integrity gates green (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app — HTTP 307 (root → /akses, expected)
Store:     v15 (unchanged — no schema change)
Registry:  29 / 29 WEBSITE_NAV_SHEETS migrated
```

## Session 034 Status — 9 PROY/Valuation/Dashboard Builders Shipped

**Scope delivered this session** (T7 of Session 030 10-task roadmap):
- **`buildCfiInput` extracted** to `upstream-helpers.ts` + CFI page refactored
  (LESSON-046 enforcement). `buildDashboardInput` intentionally NOT extracted
  (YAGNI — Dashboard builder has distinct data shape from page).
- **9 new SheetBuilders migrated into `SHEET_BUILDERS` registry**:
  - `ProyLrBuilder` (upstream `['home','balanceSheet','incomeStatement','fixedAsset','keyDrivers']`) — composes `computeFullProjectionPipeline`
  - `ProyFaBuilder` — full acquisition/depreciation/net-value 7-band output
  - `ProyBsBuilder` — iterate-over-output pattern (resilient to compute-live changes)
  - `ProyNoplatBuilder` — tax-split breakdown
  - `ProyCfsBuilder` — full cash-flow span
  - `DcfBuilder` (+ discountRate in upstream) — FCF + discounting + terminal value + equity summary; **rows 34-42 left as template formulas** (live cross-sheet refs preserved)
  - `EemBuilder` — narrower upstream (NO keyDrivers — historical-only). Composes AAM + BorrowingCap + EEM chain.
  - `CfiBuilder` — 6-year span (B/C/D hist + E/F/G proj), composes DCF projected FCF + non-op CF
  - `DashboardBuilder` — minimal upstream, 4-block summary (2 hist + 1 placeholder + 1 proj); graceful degradation if KD/FA missing
- **Cascade integration test extended 20 → 29 sheets** (LESSON-093 proven
  again) + scan range widened to catch Dashboard's sparse content
- **58 new tests** (1125 → 1183)
- **4 lessons extracted** (LESSON-095/096/097/098)

**Registry grew** 20 → 29 builders. Legacy pipeline auto-skips ALL 29
WEBSITE_NAV_SHEETS via the reactive `MIGRATED_SHEET_NAMES` proxy. This
closes state-driven export Phase 2 entirely. Sessions 035+ are cleanup.

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v15 with chained migration v1→v15
- Comprehensive i18n: 500+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- Phase C end-to-end verification: template formula-preservation across 29 sheets
- Generic `CatalogAccount` + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition
- Universal auto-save: 500ms debounce; no SIMPAN buttons
- PageEmptyState universal across sections
- Unified DLOM/DLOC sign convention in calc family
- Export pipeline: template-based .xlsx, 3,084 formulas preserved,
  BS/IS/FA extended-catalog native injection, sanitizer pipeline (zero
  Excel repair dialogs)
- AAM dynamic interoperability: section-based `AamInput`, IBD classification
- **State-driven export migration COMPLETE (Session 030-034)**:
  - Session 030 foundation (SheetBuilder types + clearSheetCompletely)
  - Session 031 5 core builders (BS/IS/FA/AAM/SIMULASI)
  - Session 032 8 input builders (HOME/KD/AP/DLOM/DLOC/WACC/DR/BC)
  - Session 033 7 computed analysis builders
  - **Session 034 9 PROY/valuation/dashboard builders → 29/29 coverage**
- `buildCfiInput` centralized (LESSON-046)

### Pages (39 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 034 (2026-04-17) — T7 PROY/Valuation/Dashboard Builders
- T1: Design + plan + branch (self-authorized per user blanket OK)
- T2: `buildCfiInput` extraction + CFI page refactor (5 helper tests)
- T3-T9: 9 builders with per-builder TDD (53 builder tests)
- T10: Cascade 20→29, scan widening, full verification gate, merge + push
- 11 commits on feature branch, all green gates
- 4 lessons extracted (LESSON-095/096/097/098)
- **Outcome**: 29 of 29 visible nav sheets are state-driven. Legacy pipeline skip-guards ALL nav sheets.

#### Session 033 (2026-04-17) — T6 Computed Analysis Builders
- 7 SheetBuilders (NOPLAT/CFS/FCF/ROIC/GrowthRev/GrowthRate/FR)
- Shared `writeComputedRowsToSheet` helper
- Cascade 13→20, +59 tests, 1 lesson (LESSON-094)

#### Session 032 (2026-04-17) — T5 Input Builders + IS!B33 Fix
- 8 SheetBuilders + IS!B33 regression fix + AccPayables 20-session gap closed
- Cascade 5→13, +67 tests, 3 lessons

## Next Session Priorities

### Session 035 — T8-T10 Legacy Cleanup + V2 Promotion

1. **T8 Legacy cleanup**: prune `exportToXlsx` body — all 29 WEBSITE_NAV_SHEETS are registry-owned, so the scalar/array/grid/dynamic-rows injectors can be removed wholesale (or restricted to hidden/helper sheets only). Add `stripCrossSheetRefsToBlankSheets` for any remaining dead formulas referencing sheets that might be cleared.
2. **T9 Phase C rewrite**: reconstruct website-state parity test using PT Raja Voltama fixtures as `ExportableState`. Assert exported workbook matches fixture across all 29 sheets (not just template formula-preservation like today's Phase C).
3. **T10 V2 promotion**: promote `exportToXlsxV2` as the primary entry-point; retire V1 branches.

### Session 036+ — Backlog

- **AAM extended-account native injection** (excelRow ≥ 100) — deferred since Session 031
- **AccPayables extended catalog** (excelRow ≥ 100)
- **Upload parser** (.xlsx → store) — reverse of export; reuse cell-mapping + extended injection
- **ESLint rule enhancement** — `uiPropNames` config for project-specific UI-text props
- **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
- **Dashboard polish** — projected FCF chart, more KPIs
- **Multi-case management** (multiple companies in one localStorage)
- **Cloud sync / multi-device**
- **Audit trail / change history**

## Latest Sessions
- [Session 034](history/session-034-proy-valuation-dashboard-builders.md) (2026-04-17): T7 PROY/Valuation/Dashboard — 9 SheetBuilders, cascade 20→29 FULL COVERAGE, `buildCfiInput` extraction, 58 new tests, 4 lessons
- [Session 033](history/session-033-computed-builders.md) (2026-04-17): T6 Computed Analysis — 7 SheetBuilders, `writeComputedRowsToSheet` helper, cascade 13→20, 59 new tests, 1 lesson
- [Session 032](history/session-032-input-builders.md) (2026-04-17): T5 Input Builders — 8 SheetBuilders, IS!B33 regression fix, 67 new tests, 3 lessons
- [Session 031](history/session-031-core-builders.md) (2026-04-17): Core Builders T3+T4 — 5 SheetBuilders, label override pattern, 46 new tests, 3 lessons
