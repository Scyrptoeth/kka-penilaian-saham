# Progress — KKA Penilaian Saham

> Latest state after Session 038 — Interest Bearing Debt dedicated page (2026-04-18)
> Session 037 (Average columns) + Session 038 (IBD field + required gating) shipped.

## Verification Results
```
Tests:     1215 / 1216 passing + 1 skipped  (102 files; +14 new vs Session 036 end)
Build:     ✅ 40 static pages, compiled cleanly (new: /valuation/interest-bearing-debt)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 200 (via /akses)
Store:     v17 (v16→v17 adds root-level interestBearingDebt: number | null)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Sessions 037–038 Status — Average Columns + IBD Dedicated Page COMPLETE

### Session 037 (2026-04-18) — Average / Rata-Rata columns
Ship "Average" sub-column / column across 6 pages with uniform
leading-zero-skip semantics:
- **Input BS / Input IS / Input FA**: extra sub-column in Common Size
  group + Growth YoY group.
- **Analysis → Rasio Keuangan**: flat column after year values
  (per-row `valueKind` honored).
- **Analysis → NOPLAT / Growth Revenue**: sub-column in Pertumbuhan
  YoY group.
- Hidden when `historicalYearCount === 1`.
- Formula per user spec: skip leading null/zero entries; middle/trailing
  null counted as 0.
- New helpers `computeAverage` + `averageSeries` in
  `src/lib/calculations/derivation-helpers.ts` (+12 TDD cases).
- +1 i18n key `table.average`. +1 lesson (LESSON-105, promoted).

### Session 038 (2026-04-18) — Interest Bearing Debt dedicated page
Extract IBD into a standalone required valuation input:
- New page `/valuation/interest-bearing-debt` with numeric input +
  always-visible bilingual trivia (2 intro + 6 IBD components + 4
  Non-IBD components).
- Store v16→v17: root-level `interestBearingDebt: number | null`
  (+2 migration TDD cases).
- AAM page: IBD row now displays from store (read-only); bilingual
  cross-reference note with inline `<Link>` below TOTAL LIABILITIES &
  EQUITY.
- 6 consumer pages (AAM/DCF/EEM/CFI/Simulasi/Dashboard):
  PageEmptyState gate when IBD is null.
- Classifier-based `interestBearingDebtHistorical` removed from
  `buildAamInput`; `buildDcfInput`/`buildEemInput` drop `BS!F31+F38`
  shortcut. All three accept explicit `interestBearingDebt: number`
  param; builders reconcile sign at the boundary.
- Export pipeline: `ExportableState` + `UpstreamSlice` extended;
  DCF/EEM/CFI builders gate on non-null IBD.
- Sidebar nav: "Interest Bearing Debt" / "Utang Berbunga" inserted
  between Borrowing Cap and DCF.
- ~30 new i18n keys (nav + page + trivia + AAM note).
- +2 lessons (LESSON-106 + LESSON-107, both promoted).

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 (v17) + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v17 with chained migration v1→v17
- Comprehensive i18n: ~530+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned, Phase C state-parity
- Shared `computeCommonSize` + `computeGrowthYoY` + `computeAverage` + `averageSeries` helpers for derivation columns
- Generic `CatalogAccount` + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition
- Universal auto-save: 500ms debounce; no SIMPAN buttons
- PageEmptyState universal (now also gates on `interestBearingDebt`)
- AAM section-based input, IBD classification (display split only; value from dedicated page)
- Export pipeline: template-based .xlsx, 3,084 formulas preserved, BS/IS/FA extended-catalog native injection, sanitizer pipeline (zero Excel repair dialogs)

### Pages (40 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers (dynamic Additional Capex per FA account) · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18 + Average) · FCF · NOPLAT (+ Average in YoY) · Growth Revenue (+ Average in YoY) · ROIC · Growth Rate · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA (dynamic, NV-only proj) · Proy. BS (Full Simple Growth) · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · **Interest Bearing Debt (NEW)** · DCF · AAM (with cross-ref note) · EEM · CFI · Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 038 (2026-04-18) — IBD dedicated page + required gating
- Store v16→v17 + root-level slice + setter
- New page + bilingual trivia (2 intro + 6 IBD + 4 Non-IBD)
- 6 consumer pages PageEmptyState gated
- AAM cross-ref note with hyperlink
- 3 input-builders refactored (IBD as explicit param, sign at boundary)
- 3 sheet-builders upstream extended
- 51 files changed, +560 / −72
- 2 lessons (LESSON-106, LESSON-107)

#### Session 037 (2026-04-18) — Average columns across 6 pages
- `computeAverage` + `averageSeries` helpers in derivation-helpers
- 3 dynamic editors (BS/IS/FA) + 3 analysis manifests (FR/NOPLAT/GR) opt-in
- Uniform leading-zero-skip semantics per user spec
- Hidden when year count < 2
- 15 files changed, +339 / −7
- 1 lesson (LESSON-105)

#### Session 036 (2026-04-18) — Dynamic Account Interoperability
- Proy BS Full Simple Growth + Proy FA per-account NV growth
- Input FA Common Size + Growth YoY feature parity
- Store v15→v16 + dynamic KD Additional Capex per FA account
- Row translation for Proy BS/FA export builders
- 2 lessons (LESSON-103, LESSON-104)

## Next Session Priorities

### Session 039 — Extended-Account Support for PROY Sheets + KD Export

1. **Proy BS extended injection** — extended (excelRow ≥ 100) + custom
   (≥ 1000) BS accounts currently silently skipped at export. Mirror
   Session 025 BS extended pattern (native row injection + subtotal
   append).
2. **Proy FA extended injection** — same pattern, mirror Session 028
   FA 7-band slot allocation.
3. **KEY DRIVERS dynamic `additionalCapexByAccount` injection** — build
   dedicated injector in KeyDriversBuilder (cell-mapping entries were
   removed in Session 036 T8).
4. **Sign convention reconciliation** — 21 whitelisted KD
   cogsRatio/sellingExpenseRatio/gaExpenseRatio cells (deferred from
   Session 035).
5. **Optional cleanup**: drop `isIbdAccount()` classifier from AAM CL/NCL
   display split (now that IBD is user-input, CL/NCL split has no
   calc effect — only visual subtotals).
6. **RESUME page** — final side-by-side summary of AAM / DCF / EEM
   per share.

### Session 039+ Backlog

- **AAM extended-account native injection** (excelRow ≥ 100) —
  deferred since Session 031
- **AccPayables extended catalog** — 4th input sheet pattern completion
- **Upload parser** (.xlsx → store) — reverse of export
- **Multi-case management** (multiple companies in one localStorage)
- **Dashboard polish** — projected FCF chart with new NV model
- **Cloud sync / multi-device**

## Latest Sessions
- [Session 038](history/session-038-ibd-field.md) (2026-04-18): Interest Bearing Debt dedicated page — store v16→v17, new page + trivia, 6 consumer gates, AAM cross-ref note, 3 input-builders refactored, 51 files, 2 lessons
- [Session 037](history/session-037-average-columns.md) (2026-04-18): Average columns — computeAverage + averageSeries helpers, 3 Input editors + 3 Analysis manifests, leading-zero-skip semantics, 15 files, 1 lesson
- [Session 036](history/session-036-dynamic-projection.md) (2026-04-18): Dynamic Account Interoperability — Proy BS Full Simple Growth, Proy FA per-account NV growth, Input FA CS+Growth, KD Additional Capex dynamic, store v15→v16, row translation export, 2 lessons
- [Session 035](history/session-035-legacy-cleanup-v2-promotion.md) (2026-04-18): T8-T10 Closure — V1 body pruned, Phase C state-parity rewrite, 4 lessons
- [Session 034](history/session-034-proy-valuation-dashboard-builders.md) (2026-04-17): T7 PROY/Valuation/Dashboard — 9 SheetBuilders, cascade 20→29, 4 lessons
