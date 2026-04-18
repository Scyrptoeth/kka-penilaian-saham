# Progress — KKA Penilaian Saham

> Latest state after Session 039 — Changes in Working Capital required-gate + DCF inline breakdown (2026-04-18)
> Session 039 shipped on feature branch `feat/wc-scope-page-and-dcf-breakdown`; merge to main pending user review.

## Verification Results
```
Tests:     1222 / 1223 passing + 1 skipped  (102 files)
Build:     ✅ 41 static pages, compiled cleanly (new: /analysis/changes-in-working-capital)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 307 → /akses 200
Store:     v18 (v17→v18 adds root-level changesInWorkingCapital: { excludedCA, excludedCL } | null)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Session 039 (2026-04-18) — Changes in Working Capital required-gate + DCF inline breakdown

### Task 1 — Store v17→v18
Root-level slice `changesInWorkingCapital: { excludedCurrentAssets:
number[]; excludedCurrentLiabilities: number[] } | null`. Setters:
`toggleExcludeCurrentAsset`, `toggleExcludeCurrentLiability`,
`confirmWcScope` (null→empty-exclusion object), `resetWcScope`.
Chain migration preserves existing state; +3 TDD cases.

### Task 2 — CFS compute account-driven rewrite
`computeCashFlowLiveRows` sheds hardcoded `BS_CA_ROWS=[10,11,12,14]`
and `BS_CL_ROWS=[31,32,33,34]`. Now iterates user's
`balanceSheet.accounts` filtered by section minus exclusions list
from store. Fixed the user-reported bug: ΔCA/ΔCL rows showed "-" for
every user with extended-catalog or custom accounts. Cash rows 8/9 no
longer hardcoded-excluded — user decides via WC scope page. Shared
helper `resolveWcRows` exported. +6 TDD cases. 12 callers migrated.

### Task 3 — PROY CFS compute account-driven mirror
Same rewrite applied to `computeProyCfsLive`. Additionally repaired
pre-existing Session 036 bug where PROY CFS read PROY BS *template*
rows 13/15/17/19 while `computeProyBsLive` outputs *user* excelRow
keys (broken for PT Raja-equivalent users all along). Cash Ending
now reads PROY BS rows 8+9 (user standard) rather than template rows
9+11. 15/15 PROY CFS tests pass.

### Task 4 — Pipeline threading
`computeFullProjectionPipeline` + `computeHistoricalUpstream` accept
optional `changesInWorkingCapital` + `balanceSheetAccounts`. 14
consumer files updated; 8 sheet-builders + 5 pages + 1 upstream
helper.

### Task 5 — `/analysis/changes-in-working-capital` page
New required-gate page mirroring IBD layout. Two sections (Current
Assets + Current Liabilities), each listing user's BS accounts with
trash icon to exclude from Operating WC scope. Collapsible
"Dikecualikan" section per section with restore icon. Sticky
"Konfirmasi Cakupan" / "Perbarui Cakupan" button at bottom transitions
store slice from null → object. Trivia block bilingual EN/ID
(intro + 4 negative-CA + 4 negative-CL + positive lists CA 3 + CL 3),
light + dark mode compliant. ~55 new i18n keys.

### Task 6 — Sidebar nav
"Changes in Working Capital" / "Perubahan Modal Kerja" inserted in
ANALYSIS group immediately above "Cash Flow Statement" — WC scope is
a prerequisite for correct CFS ΔWC.

### Task 7 — Required-gate 9 consumer pages
PageEmptyState gate on: CFS, FCF, Financial Ratio, DCF, EEM, CFI,
Simulasi Potensi, Dashboard, Proy CFS. All render PageEmptyState
when `changesInWorkingCapital === null`, with an input entry pointing
to the WC scope page. Consistent with IBD gating (Session 038).

### Task 8 — Export pipeline
`UpstreamSlice` union + `ExportableState` extended with
`'changesInWorkingCapital'`. `isPopulated` special-cases non-null
check. 9 sheet-builder upstream arrays extended. 8 metadata test
assertions updated. Phase C 5/5 preserved.

### Task 9 — DCF inline breakdown
`/valuation/dcf/page.tsx` exposes `dcfInput` alongside `dcfResult` in
data memo. Three sections get permanent inline breakdown rows (style
`pl-12`, `text-ink-muted`, `text-sm`, monospace, no formulas shown):
1. FCF per year (4 × 5 components): NOPLAT + Dep + ΔCA + ΔCL − CapEx
2. Total PV of FCF (3 rows): PV of FCF per projected year
3. Equity Value (100%) (4 rows BEFORE headline): EV − IBD + Surplus
   Cash + Idle Non-Op Asset

Zero new calc logic — pure UI addition. +10 i18n keys.

### Lessons extracted (3)
- **LESSON-108** (promoted): Account-driven aggregation replaces
  hardcoded row lists — system correctness > prototipe fidelity.
  Core architectural principle for dynamic-catalog compute.
- **LESSON-109** (local): React Fragment inside Array.map() needs
  explicit `<Fragment key={...}>` — short fragment `<>` can't accept
  key prop.
- **LESSON-110** (promoted): Export shared row-filter helper
  (`resolveWcRows`) when historical + projection compute must share
  semantic. Prevents silent divergence.

### User preference saved to memory
`/memory/feedback_system_over_prototype.md` — explicit durable
preference: "prioritize system calculation correctness over 100%
value-match with Excel prototipe workbook". Reinforces LESSON-029.

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
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 (v18) + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v18 with chained migration v1→v18
- Comprehensive i18n: ~530+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned, Phase C state-parity
- Shared `computeCommonSize` + `computeGrowthYoY` + `computeAverage` + `averageSeries` helpers for derivation columns
- Generic `CatalogAccount` + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition
- Universal auto-save: 500ms debounce; no SIMPAN buttons
- PageEmptyState universal (now also gates on `interestBearingDebt` + `changesInWorkingCapital`)
- **Account-driven WC aggregation** (Session 039) — CFS + PROY CFS iterate `balanceSheet.accounts` filtered by section minus user exclusions; replaces hardcoded row lists (LESSON-108). Exported `resolveWcRows` helper shared historical + projection (LESSON-110).
- AAM section-based input, IBD classification (display split only; value from dedicated page)
- Export pipeline: template-based .xlsx, 3,084 formulas preserved, BS/IS/FA extended-catalog native injection, sanitizer pipeline (zero Excel repair dialogs)

### Pages (41 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers (dynamic Additional Capex per FA account) · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18 + Average) · FCF · NOPLAT (+ Average in YoY) · Growth Revenue (+ Average in YoY) · ROIC · Growth Rate · **Changes in Working Capital (NEW — required gate)** · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA (dynamic, NV-only proj) · Proy. BS (Full Simple Growth) · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF (with inline breakdown rows) · AAM (with cross-ref note) · EEM · CFI · Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 039 (2026-04-18) — Changes in Working Capital required-gate + DCF inline breakdown
- Store v17→v18 + root-level `changesInWorkingCapital` slice
- New page `/analysis/changes-in-working-capital` + bilingual trivia
- `computeCashFlowLiveRows` + `computeProyCfsLive` rewritten account-driven (drops hardcoded BS_CA_ROWS / BS_CL_ROWS)
- 9 consumer pages required-gated via PageEmptyState
- DCF page inline breakdown: FCF components + PV per year + Equity Value (100%) derivation
- 53 files changed, +1482 / −228 (branch `feat/wc-scope-page-and-dcf-breakdown`, 9 commits, merge-to-main pending)
- 3 lessons (LESSON-108, LESSON-109, LESSON-110)

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

### Session 040 — Merge + Extended-Account Support for PROY Sheets + KD Export

1. **Merge `feat/wc-scope-page-and-dcf-breakdown` to main** — after user
   reviews Vercel preview. Then delete feature branch.
2. **Proy BS extended injection** — extended (excelRow ≥ 100) + custom
   (≥ 1000) BS accounts currently silently skipped at export. Mirror
   Session 025 BS extended pattern (native row injection + subtotal
   append).
3. **Proy FA extended injection** — same pattern, mirror Session 028
   FA 7-band slot allocation.
4. **KEY DRIVERS dynamic `additionalCapexByAccount` injection** — build
   dedicated injector in KeyDriversBuilder (cell-mapping entries were
   removed in Session 036 T8).
5. **Sign convention reconciliation** — 21 whitelisted KD
   cogsRatio/sellingExpenseRatio/gaExpenseRatio cells (deferred from
   Session 035).
6. **Optional cleanup**: drop `isIbdAccount()` classifier from AAM CL/NCL
   display split (now that IBD is user-input, CL/NCL split has no
   calc effect — only visual subtotals).
7. **LESSON-108 grep audit** — scan other compute modules for hardcoded
   row-number lists (`const *_ROWS = [\d, \d, \d]` pattern). Any
   remaining latent bugs for dynamic-catalog users. Candidates:
   `computeNoplatLiveRows`, `computeFcfLiveRows`, FR ratios, ROIC.
8. **RESUME page** — final side-by-side summary of AAM / DCF / EEM
   per share.

### Session 040+ Backlog

- **AAM extended-account native injection** (excelRow ≥ 100) —
  deferred since Session 031
- **AccPayables extended catalog** — 4th input sheet pattern completion
- **Upload parser** (.xlsx → store) — reverse of export
- **Multi-case management** (multiple companies in one localStorage)
- **Dashboard polish** — projected FCF chart with new NV model
- **Cloud sync / multi-device**

## Latest Sessions
- [Session 039](history/session-039-wc-scope-and-dcf-breakdown.md) (2026-04-18): Changes in Working Capital required-gate + DCF inline breakdown — store v17→v18, new page + trivia, account-driven CFS/PROY CFS, 9 consumer gates, DCF breakdown rows, 53 files, 3 lessons
- [Session 038](history/session-038-ibd-field.md) (2026-04-18): Interest Bearing Debt dedicated page — store v16→v17, new page + trivia, 6 consumer gates, AAM cross-ref note, 3 input-builders refactored, 51 files, 2 lessons
- [Session 037](history/session-037-average-columns.md) (2026-04-18): Average columns — computeAverage + averageSeries helpers, 3 Input editors + 3 Analysis manifests, leading-zero-skip semantics, 15 files, 1 lesson
- [Session 036](history/session-036-dynamic-projection.md) (2026-04-18): Dynamic Account Interoperability — Proy BS Full Simple Growth, Proy FA per-account NV growth, Input FA CS+Growth, KD Additional Capex dynamic, store v15→v16, row translation export, 2 lessons
- [Session 035](history/session-035-legacy-cleanup-v2-promotion.md) (2026-04-18): T8-T10 Closure — V1 body pruned, Phase C state-parity rewrite, 4 lessons
- [Session 034](history/session-034-proy-valuation-dashboard-builders.md) (2026-04-17): T7 PROY/Valuation/Dashboard — 9 SheetBuilders, cascade 20→29, 4 lessons
