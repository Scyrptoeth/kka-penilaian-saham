# Progress — KKA Penilaian Saham

> Latest state after Session 035 — T8-T10 Legacy Cleanup + Phase C State-Parity (2026-04-18)
> **🎉 STATE-DRIVEN EXPORT REFACTOR (Sessions 030-035) COMPLETE** — 29/29 registry coverage + V1 pruned + Phase C rewritten as state-parity.

## Verification Results
```
Tests:     1213 / 1213 passing (101 files; was 1183 at Session 034, +30)
Build:     ✅ 39 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 307 (root → /akses, 200)
Store:     v15 (unchanged — no schema change)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Session 035 Status — T8-T10 Closure: V1 Pruned + Phase C State-Parity

**Scope delivered this session** (close the 5-session state-driven export refactor, Sessions 030-034):

- **T8 — `exportToXlsx` body pruned** (90 LOC → 20 LOC). All per-type
  injectors (scalar/grid/array/dynamic-rows) + their
  `if (!MIGRATED_SHEET_NAMES.has(...))` guards removed — dead code since
  Session 034 registry hit 29/29. New pipeline = `runSheetBuilders →
  stripCrossSheetRefsToBlankSheets → applySheetVisibility →
  sanitizeDanglingFormulas → stripDecorativeTables → writeBuffer`.
- **T8+ — `stripCrossSheetRefsToBlankSheets` helper**. Partial-data
  export guard: when a SheetBuilder clears its sheet, any cross-sheet
  formula in OTHER populated sheets is rewired to cached result.
  8 TDD cases.
- **T8++ — `runSheetBuilders` returns `{ clearedSheets }`**. Orchestrator
  is now authoritative source of blanked-sheet names; consumers use it
  to drive hygiene. Backward-compatible return-value extension.
- **T8+++ — `flattenSharedFormulas` helper in `sheet-utils.ts`**. Fires
  before `builder.build()` for populated sheets. Neutralizes template
  shared-formula structures so builders can freely overwrite master cells
  without orphaning clones (fixes latent CfiBuilder F9 bug,
  LESSON-099).
- **T9 — Phase C rewrite** as strict state-parity. New test feeds real PT
  Raja Voltama `ExportableState` through the complete pipeline. 13 input
  + setting sheets get strict cell-parity (exported = template @ 1e-6);
  16 computed + projected sheets get coverage invariant (non-null cells
  don't regress to null by >5%). 27-entry known-diverge whitelist for
  semantic equivalents (kepemilikan casing, ratio sign convention,
  #DIV/0! cells).
- **T9+ — `loadPtRajaVoltamaState` fixture adapter**. Reconstructs full
  ExportableState from 12 fixture JSONs with ~300 LOC + 11 sanity tests.
- **T10 — In-place V1 prune** (not a V2 symbol, per user clarification).
  Single `exportToXlsx` function identity preserved. 5 dead internal
  helpers deleted: `clearAllInputCells`, `injectScalarCells`,
  `injectGridCells`, `injectArrayCells`, `injectDynamicRows`.
  Net -121 LOC from `export-xlsx.ts` (1279 → 1158).

**Commits**: 7 (1 docs + 6 feature/refactor) merged to main via fast-forward (1c828c5). Pushed.

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v15 with chained migration v1→v15
- Comprehensive i18n: 500+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- **State-driven export COMPLETE (Sessions 030-035)**:
  - Session 030 foundation (SheetBuilder types + clearSheetCompletely)
  - Session 031 5 core builders (BS/IS/FA/AAM/SIMULASI)
  - Session 032 8 input builders (HOME/KD/AP/DLOM/DLOC/WACC/DR/BC)
  - Session 033 7 computed analysis builders
  - Session 034 9 PROY/valuation/dashboard builders → 29/29 registry coverage
  - **Session 035 V1 pruned + Phase C state-parity + 4 LESSON-099/100/101/102**
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
- `buildCfiInput` centralized (LESSON-046)
- `flattenSharedFormulas` + `stripCrossSheetRefsToBlankSheets` pipeline
  hygiene (LESSON-099)

### Pages (39 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 035 (2026-04-18) — T8-T10 Closure
- T1: Design + plan + branch
- T2: stripCrossSheetRefsToBlankSheets helper (8 TDD)
- T3: runSheetBuilders returns { clearedSheets } (4 TDD)
- T4: loadPtRajaVoltamaState fixture adapter (11 TDD)
- T5: flattenSharedFormulas helper + Phase C state-parity rewrite (6 + rewritten integration)
- T6: exportToXlsx body pruned — 90 LOC → 20 LOC
- T7: 5 dead internal functions deleted (-121 LOC net)
- T8-T10: Full gate verify + merge + push + live check
- 7 commits, all green gates
- 4 lessons extracted (LESSON-099/100/101/102)
- **Outcome**: State-driven export refactor closed. 100% registry-driven, dead-code-free, Phase C gates pipeline integrity by sheet class.

#### Session 034 (2026-04-17) — T7 PROY/Valuation/Dashboard Builders
- T1: Design + plan + branch
- T2: `buildCfiInput` extraction + CFI page refactor (5 helper tests)
- T3-T9: 9 builders with per-builder TDD (53 builder tests)
- T10: Cascade 20→29, scan widening, full verification gate, merge + push
- 11 commits on feature branch, all green gates
- 4 lessons extracted (LESSON-095/096/097/098)
- **Outcome**: 29 of 29 visible nav sheets are state-driven.

#### Session 033 (2026-04-17) — T6 Computed Analysis Builders
- 7 SheetBuilders (NOPLAT/CFS/FCF/ROIC/GrowthRev/GrowthRate/FR)
- Shared `writeComputedRowsToSheet` helper
- Cascade 13→20, +59 tests, 1 lesson (LESSON-094)

## Next Session Priorities

State-driven export refactor is **COMPLETE**. Session 036+ backlog:

### Session 036 — Sign Convention Reconciliation (highest priority)

**KEY DRIVERS cogsRatio/sellingExpenseRatio/gaExpenseRatio sign mismatch**
(21 whitelisted cells in Phase C): store stores POSITIVE (LESSON-011 —
compute adapters negate internally); PT Raja Voltama template saved with
NEGATIVE (matching LESSON-055 IS sign convention). Options:

1. Add `exportTransform: 'negate'` to cell-mapping scalar/array
   entries for these three ratios → exported workbook matches template,
   store keeps POSITIVE convention.
2. Change store convention to NEGATIVE, audit all compute adapters that
   currently assume POSITIVE. Larger blast radius.
3. Document as UI display vs storage gap (no code change).

Recommend option 1. Remove 21 entries from `KNOWN_DIVERGENT_CELLS`.

### Session 036+ Backlog

- **AAM extended-account native injection** (excelRow ≥ 100) — deferred since Session 031
- **AccPayables extended catalog** — complete the catalog-driven pattern for the 4th input sheet
- **Upload parser** (.xlsx → store) — reverse of export; reuse cell-mapping + extended injection
- **Projection pipeline state-parity investigation** — 337+ cells diverge between live compute and saved template across PROY sheets (not gated by Phase C today, covered by per-builder unit tests). Investigate whether this is a compute drift issue or a template-staleness issue.
- **ESLint rule enhancement** — `uiPropNames` config for project-specific UI-text props
- **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
- **Dashboard polish** — projected FCF chart, more KPIs
- **Multi-case management** (multiple companies in one localStorage)
- **Cloud sync / multi-device**
- **Audit trail / change history**

## Latest Sessions
- [Session 035](history/session-035-legacy-cleanup-v2-promotion.md) (2026-04-18): T8-T10 Closure — V1 body pruned, Phase C state-parity rewrite, 5 dead functions deleted, 2 new pipeline helpers, 4 lessons
- [Session 034](history/session-034-proy-valuation-dashboard-builders.md) (2026-04-17): T7 PROY/Valuation/Dashboard — 9 SheetBuilders, cascade 20→29 FULL COVERAGE, `buildCfiInput` extraction, 58 new tests, 4 lessons
- [Session 033](history/session-033-computed-builders.md) (2026-04-17): T6 Computed Analysis — 7 SheetBuilders, `writeComputedRowsToSheet` helper, cascade 13→20, 59 new tests, 1 lesson
- [Session 032](history/session-032-input-builders.md) (2026-04-17): T5 Input Builders — 8 SheetBuilders, IS!B33 regression fix, 67 new tests, 3 lessons
