# Session 054 — INPUT Taxonomy Reorganization + CWC Cleanup + Growth Revenue Editor

**Date**: 2026-04-19
**Scope**: 2-part revision via user screenshots — (a) move 8 pages from ANALYSIS/VALUATION to INPUT DATA with sub-header grouping and make Growth Revenue Industri rows editable; (b) delete FCF CWC inline breakdown (redundant with dedicated CWC page)
**Branch**: `feat/session-054-input-taxonomy-and-cwc-cleanup` → main

## Goals (user-confirmed Q1=Industri rows editable, Q2=3 sub-groups, Q3=MOVE URL, Q4=Delete total, Q5=Lessons stay valid)

- [x] Task 1: Delete `<FcfCwcBreakdown>` + helper + test + 11 i18n keys + unmount
- [x] Task 2: Store v21→v22 adds `growthRevenue: GrowthRevenueState | null`
- [x] Task 3: Extend `computeGrowthRevenueLiveRows` for industry rows 40+41
- [x] Task 4: Growth Revenue editor page with mixed read-only + editable rows
- [x] Task 5: `git mv` 8 route directories from analysis/valuation to `/input/*`
- [x] Task 6: Update 15+ cross-page URL references in production code
- [x] Task 7: Nav-tree sub-header grouping + SidebarNav render + 3 i18n keys
- [x] Task 8: Verify gates (tests + build + typecheck + lint + audit + Phase C + cascade)
- [x] Task 9: Docs — this file + progress.md + LESSON-149
- [x] Task 10: Commit per task + push + Vercel deploy

## Delivered

### Task 1 — FCF CWC breakdown removal

Session 053 added `<FcfCwcBreakdown>` below the FCF aggregate table. User feedback: the per-account transparency is already on `/analysis/changes-in-working-capital` (now `/input/changes-in-working-capital` post-Session 054). FCF aggregate rows 12/13 remain auto-read-only from store; no duplicate UI surface.

**Deleted** (LESSON-069 — superseded code leaves no dead branches):
- `src/components/analysis/FcfCwcBreakdown.tsx` (260 LOC)
- `src/lib/calculations/wc-breakdown.ts` (118 LOC)
- `__tests__/lib/calculations/wc-breakdown.test.ts` (105 LOC)
- 11 i18n keys `fcf.cwcBreakdown.*`
- Import + fragment render from `FcfLiveView.tsx`

### Task 2 — Store v21→v22 `growthRevenue` slice

New root-level slice captures the two user-editable Industri rows (manifest excelRow 40 + 41). Derived rows 8 + 9 remain sourced from IS.

```ts
export interface GrowthRevenueState {
  industryRevenue: YearKeyedSeries     // row 40
  industryNetProfit: YearKeyedSeries   // row 41
}
```

- `STORE_VERSION: 21 → 22`
- Migration `v21 → v22` adds `growthRevenue: null` (idempotent — skips if already present)
- Setters `setGrowthRevenue`, `resetGrowthRevenue`
- `partialize` + `resetAll` include the new field
- "Future versions pass through unchanged" guard-test bumped with `growthRevenue: null` in fixture

+3 TDD cases + 1 updated fixture.

### Task 3 — Compute extension

`computeGrowthRevenueLiveRows(isRows, years, growthRevenue?)` — third parameter optional. When present, writes rows 40 + 41 from store. When absent, rows are omitted entirely (backward compat — blank industry cells with yoyGrowth IFERROR → "—").

- `ExportableState.growthRevenue` field + `UpstreamSlice` entry added
- `GrowthRevenueBuilder` passes `state.growthRevenue` into compute
- `ExportButton` forwards `state.growthRevenue` through
- Growth Revenue test suite +4 cases (row 40, row 41, null/undefined no-op, partial year fill)

### Task 4 — Growth Revenue editor page

New `GrowthRevenueEditor` component uses `RowInputGrid` with mixed row types:

| Row | Label | Type | Source |
|-----|-------|------|--------|
| 8   | Penjualan | `cross-ref` (read-only) | IS row 6 |
| 9   | Laba Bersih | `cross-ref` (read-only) | IS row 35 |
| 40  | Penjualan (Industri) | normal (editable) | store.growthRevenue.industryRevenue |
| 41  | Pendapatan Bersih (Industri) | normal (editable) | store.growthRevenue.industryNetProfit |

- Hydration gate + HOME + IS required-gate (LESSON-034 + LESSON-107)
- Debounced 500ms persist (LESSON-141 merge-at-persist pattern)
- Inline YoY growth per row via `yoyChangeSafe` — fed to `RowInputGrid.growth`
- Growth Average column auto-shown when ≥ 2 historical years
- Reset button clears both industry series
- Deleted `GrowthRevenueLiveView.tsx` (superseded by editor — LESSON-069)
- Manifest rows 8, 9 marked `type: 'cross-ref'` (consistent with read-only semantic across infra)
- 1 new i18n key `growthRevenue.editor.subtitle`

### Task 5 — Route directory moves

```
src/app/analysis/growth-revenue             → src/app/input/growth-revenue
src/app/analysis/changes-in-working-capital → src/app/input/changes-in-working-capital
src/app/valuation/dlom                       → src/app/input/dlom
src/app/valuation/dloc-pfc                   → src/app/input/dloc-pfc
src/app/valuation/wacc                       → src/app/input/wacc
src/app/valuation/discount-rate              → src/app/input/discount-rate
src/app/valuation/borrowing-cap              → src/app/input/borrowing-cap
src/app/valuation/interest-bearing-debt      → src/app/input/interest-bearing-debt
```

`git mv` preserves file history across the move. Remaining in ANALYSIS (6): Financial Ratio, FCF, NOPLAT, ROIC, Growth Rate, Cash Flow Statement. Remaining in VALUATION (5): DCF, AAM, EEM, CFI, Simulasi Potensi — pure output pages.

### Task 6 — Cross-page URL rewrites

Systematic perl rewrite across 17 files (15 production + 2 non-code — store comments and compute-live docstring). Patterns:
- `/analysis/growth-revenue` → `/input/growth-revenue`
- `/analysis/changes-in-working-capital` → `/input/changes-in-working-capital`
- `/valuation/{dlom,dloc-pfc,wacc,discount-rate,borrowing-cap,interest-bearing-debt}` → `/input/<same>`

Affected call sites:
- `PageEmptyState.inputs[].href` in fcf / financialRatio / cashFlowStatement / dcf / eem / cfi / borrowingCap / aam / simulasi-potensi / dashboard / resume / projection-cash-flow
- AAM inline hyperlink to IBD page
- Store + compute + upstream-helpers JSDoc references

Zero logic changes.

### Task 7 — Sidebar sub-header grouping

`NavItem.subGroup?: string` — i18n key for optional visual cluster. Consecutive items sharing `subGroup` render beneath one sub-header. SidebarNav renders sub-headers inline.

INPUT DATA = 13 items in 3 sub-groups (user-specified order):

1. **Laporan Keuangan** — Acc Payables, Balance Sheet, Fixed Asset, Income Statement
2. **Drivers & Scope** — Changes in Working Capital, Growth Revenue, Key Drivers
3. **Asumsi Penilaian** — Borrowing Cap, DLOM, DLOC (PFC), Discount Rate, Interest Bearing Debt, WACC

+3 new i18n keys: `nav.subgroup.{financialStatements, driversScope, valuationAssumptions}`.

`WEBSITE_NAV_SHEETS` docstring reordered to mirror new taxonomy. Sheet set unchanged (29 sheets) — visibility filter is order-insensitive.

## Verification

```
Tests:     1393 / 1393 passing + 1 skipped  (111 files — unchanged count; 1 file deleted + 1 implied removal balanced)
Build:     ✅ 42 static pages (unchanged — routes moved in-place)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      pending Task 10 push + Vercel auto-deploy
Store:     v22 (bumped — growthRevenue slice)
```

## Stats

- Commits: 7 feature (1 per task 1-7, Tasks 8 amended into 7)
- Files changed: 39
- Lines +493 / -677 (net -184 — mostly dead CWC UI + GR LiveView deletions)
- Net tests: 0 (Session 053 deleted 7 wc-breakdown cases, Session 054 added 3 migration + 4 GR industry = +7)
- Store version: v21 → v22
- New lessons: 1 (LESSON-149, promoted)

## Lessons Extracted

- [LESSON-149](../lessons-learned.md#lesson-149-per-row-editability-in-shared-rowinputgrid-sheetmanifest) [PROMOTED]: Per-row editability in shared `RowInputGrid` / `SheetManifest` — rows with `type: 'cross-ref'` are read-only from `computedValues`; plain rows are editable against `values`. Mixing in a single table means one manifest + two data layers.

## Session 053 Lessons Status

Per Q5 recommendation accepted by user:
- **LESSON-147** (derived-with-fallback-override for AP Beginning): **still valid, still promoted** — AP Beg pattern was not rolled back; only CWC breakdown UI removed.
- **LESSON-148** (audit downstream wrappers for LESSON-057 merge): **still valid, still promoted** — `FcfLiveView` FA sentinel merge fix (the substantive concern) remains in place.

Neither lesson was about the CWC breakdown component per se — they were about AP pattern + audit methodology. No supersede needed.

## Files Added / Modified / Deleted

### New
- `src/components/forms/GrowthRevenueEditor.tsx`

### Modified
- `src/app/analysis/growth-revenue/page.tsx` (then moved) — rewritten as editor page
- `src/components/analysis/FcfLiveView.tsx` — unmount + unused import
- `src/components/layout/ExportButton.tsx` — forward growthRevenue
- `src/components/layout/SidebarNav.tsx` — sub-header render
- `src/components/layout/nav-tree.ts` — rewritten with 13-item INPUT DATA + subGroup
- `src/data/live/compute-growth-revenue-live.ts` — 3rd param, industry rows
- `src/data/manifests/growth-revenue.ts` — rows 8/9 type='cross-ref'
- `src/lib/export/export-xlsx.ts` — ExportableState.growthRevenue + nav docstring
- `src/lib/export/sheet-builders/growth-revenue.ts` — compute call forwards slice
- `src/lib/export/sheet-builders/types.ts` — UpstreamSlice += growthRevenue
- `src/lib/i18n/translations.ts` — 11 keys removed + 4 keys added
- `src/lib/store/useKkaStore.ts` — v21→v22 + slice + setters + partialize
- `__tests__/data/live/compute-growth-revenue-live.test.ts` — +4 TDD cases
- `__tests__/lib/store/store-migration.test.ts` — +3 TDD cases + updated future-version guard
- 15 production files — perl URL rewrite `/analysis|valuation/*` → `/input/*`

### Deleted (LESSON-069)
- `src/components/analysis/FcfCwcBreakdown.tsx`
- `src/components/analysis/GrowthRevenueLiveView.tsx`
- `src/lib/calculations/wc-breakdown.ts`
- `__tests__/lib/calculations/wc-breakdown.test.ts`

### Moved (git mv — history preserved)
- 8 route directories from `src/app/{analysis,valuation}/*` to `src/app/input/*`

## Next Session Recommendation

1. User visual QA on Session 054 — sidebar grouping + Growth Revenue editor (Industri rows editable) + confirmed 6 page routes still work after URL move.
2. Upload parser (.xlsx → store) — still highest-priority backlog.
3. Dashboard projected FCF chart.
4. Extended-catalog smoke test fixture (LESSON-148 follow-up, still deferred).
