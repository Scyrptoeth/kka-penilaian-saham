# Progress — KKA Penilaian Saham

> Latest state after Session 054 — INPUT Taxonomy Reorganization + CWC Cleanup + Growth Revenue Editor (2026-04-19)

## Verification Results
```
Tests:     1393 / 1393 passing + 1 skipped  (111 files — 0 net change vs Session 053: +3 migration + +4 GR industry = +7; -7 wc-breakdown removed)
Build:     ✅ 42 static pages (unchanged — 8 routes moved in place)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      pending Task 10 push + Vercel auto-deploy
Store:     v22 (bumped — growthRevenue slice)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    feat/session-054-input-taxonomy-and-cwc-cleanup (pending merge)
```

## Session 054 (2026-04-19) — INPUT Taxonomy Reorganization + CWC Cleanup + Growth Revenue Editor

### User-requested 2-point revision

1. **Move 8 nav items to INPUT DATA with sub-header grouping.** User screenshots (`pindah-bagian.png`) flagged that Growth Revenue + Changes in Working Capital (from ANALYSIS) + DLOM + DLOC (PFC) + WACC + Discount Rate + Borrowing Cap + Interest Bearing Debt (from VALUATION) are input-nature or used-downstream, so they belong under INPUT DATA. Three sub-headers split INPUT DATA into Laporan Keuangan (4) + Drivers & Scope (3) + Asumsi Penilaian (6) = 13 items total. URL paths moved (Q3=B).
2. **Delete FCF CWC inline breakdown.** User screenshot (`hilangkan-cwc.png`) flagged the `<FcfCwcBreakdown>` section added in Session 053 as redundant with the dedicated CWC page. FCF aggregate rows 12/13 remain auto-read-only; the per-account transparency now lives only on `/input/changes-in-working-capital`.

### User-accepted recommendations

- **Q1**: Growth Revenue `Penjualan (Industri)` + `Pendapatan Bersih (Industri)` rows become editable via new `growthRevenue` store slice. Derived `Penjualan` + `Laba Bersih` rows stay read-only from IS.
- **Q2**: Split INPUT DATA visually with sub-headers. Order per user: Laporan Keuangan (AP, BS, FA, IS) → Drivers & Scope (CWC, Growth Revenue, KD) → Asumsi Penilaian (BC, DLOM, DLOC, DR, IBD, WACC).
- **Q3**: `git mv` the 8 route directories — URL path moves too (not just sidebar grouping).
- **Q4**: Delete total (LESSON-069) — `FcfCwcBreakdown.tsx` + `wc-breakdown.ts` + test + 11 i18n keys.
- **Q5**: LESSON-147 + LESSON-148 (from Session 053) remain valid and promoted — they concern AP Beg pattern + audit methodology, not CWC breakdown UI. Not marked superseded.

### Delivered (7 task commits on feat branch)

**Task 1** — FCF CWC breakdown removal (commit `058eee9`)
- Deleted `src/components/analysis/FcfCwcBreakdown.tsx` (260 LOC)
- Deleted `src/lib/calculations/wc-breakdown.ts` (118 LOC)
- Deleted `__tests__/lib/calculations/wc-breakdown.test.ts` (105 LOC)
- Removed 11 i18n keys `fcf.cwcBreakdown.*`
- `FcfLiveView.tsx` unmount + unused import removed

**Task 2** — Store v21→v22 `growthRevenue` slice (commit `5fcded6`)
- New `GrowthRevenueState` type: `{ industryRevenue: YearKeyedSeries; industryNetProfit: YearKeyedSeries }`
- `STORE_VERSION: 21 → 22`; migration v21→v22 adds `growthRevenue: null` (idempotent)
- Setters `setGrowthRevenue`, `resetGrowthRevenue`; `partialize` + `resetAll` include the field
- "Future versions pass through unchanged" fixture bumped
- +3 TDD migration cases

**Task 3** — Compute extension (commit `04ed5c2`)
- `computeGrowthRevenueLiveRows(isRows, years, growthRevenue?)` — rows 40 + 41 written from store when present, omitted when absent (backward compat)
- `ExportableState.growthRevenue` + `UpstreamSlice` union entry
- `GrowthRevenueBuilder` + `ExportButton` wire slice through
- +4 TDD cases (row 40, row 41, null/undefined no-op, partial year fill)

**Task 4** — Growth Revenue editor (commit `f95fa7a`)
- `GrowthRevenueEditor.tsx` uses `RowInputGrid` with mixed row types — rows 8, 9 `type: 'cross-ref'` (read-only from computedValues), rows 40, 41 default (editable from values)
- Hydration gate + HOME + IS required-gate; debounced 500ms persist
- Inline YoY growth via `yoyChangeSafe`; Growth Average column when ≥ 2 years
- New i18n key `growthRevenue.editor.subtitle`
- Manifest rows 8, 9 marked `type: 'cross-ref'`
- `GrowthRevenueLiveView.tsx` deleted (superseded — LESSON-069)

**Task 5** — Route directory moves (commit `1f8adaa`)
- `git mv` 8 directories preserving file history
- `src/app/analysis/{growth-revenue,changes-in-working-capital}` → `/input/*`
- `src/app/valuation/{dlom,dloc-pfc,wacc,discount-rate,borrowing-cap,interest-bearing-debt}` → `/input/*`

**Task 6** — Cross-page URL rewrites (commit `4046aab`)
- 15 production files + 2 non-code files — single perl rewrite
- `PageEmptyState.inputs[].href` in 12 pages + AAM inline hyperlink updated
- Store comments + compute-live docstring + upstream-helpers docstring updated
- Zero logic changes

**Task 7** — Nav-tree sub-header grouping (commit `3d7f26d`)
- `NavItem.subGroup?: string` — i18n key for optional visual cluster
- `SidebarNav` renders sub-header inline before first item of each `subGroup`
- 3 new i18n keys `nav.subgroup.{financialStatements, driversScope, valuationAssumptions}`
- `WEBSITE_NAV_SHEETS` docstring reordered to mirror new taxonomy (sheet set unchanged)

### Lessons extracted (1 new)

- **LESSON-149** [PROMOTED]: Per-row editability in shared `RowInputGrid` / `SheetManifest` — rows with `type: 'cross-ref'` render read-only from `computedValues`; plain rows render editable against `values`. Mixing in a single table means **one manifest + two data layers**. Applies broadly to any comparison layout (company vs industry, actual vs budget, current vs prior).

### Cascade (naturally integrated)

- **Sidebar now 3-cluster INPUT DATA** — user-requested taxonomy active
- **Growth Revenue editable** — Industri rows accept numeric input, derived rows still mirror IS
- **FCF page simpler** — aggregate rows 12/13 only; per-account transparency lives at dedicated CWC page
- **Excel export unchanged** — `WEBSITE_NAV_SHEETS` set preserved, `GrowthRevenueBuilder` passes slice through naturally
- **Zero breaking changes for existing stored data** — v21 payloads migrate to v22 by adding `growthRevenue: null`

## Session 053 (2026-04-19) — AP Beginning Editable + FCF FA Gate + LESSON-057 Merge Fix + CWC Inline Breakdown

(Session 053 summary preserved below — unchanged. CWC breakdown UI removed in Session 054 but AP Beg editable + FCF FA required-gate + LESSON-057 merge fix remain active.)

### User-requested 3-point spec

1. **Acc Payables Beginning editable** (Q1=C). Previously Beg = read-only (sentinel roll-forward only). Fix: Beg is user-overrideable with roll-forward fallback — user input wins, blank reverts to fallback, explicit 0 respected. End = Beg + Add as before. Zero migration needed (shape unchanged; new fields are nullable overlay).
2. **FCF Depreciation + CapEx auto-read-only from FA** (Q2=A1). Previously showed "-" because LESSON-057 merge pattern missing in `FcfLiveView` → extended-catalog FA accounts silently dropped. Fix: (a) FA required-gate at FCF (redirect empty state if null), (b) `faAll = { ...faComputed, ...faRows }` so store sentinel (LESSON-132) wins over re-derived static-manifest subtotal.
3. **FCF CWC inline breakdown** (Q3=Z). New `<FcfCwcBreakdown>` section below FCF table. **REMOVED in Session 054** — user follow-up feedback.

### Lessons from Session 053 (both still valid + promoted)

- **LESSON-147** [PROMOTED]: Derived-with-fallback-override pattern — user input wins, roll-forward derivation fills blanks, explicit 0 respected (`value != null` vs `=== 0` distinction). AP Beg pattern active.
- **LESSON-148** [PROMOTED]: Audit ALL downstream wrappers for LESSON-057 store-sentinel merge pattern when consuming extended-catalog subtotals — bug invisible with static-only fixtures (Phase C + fixture tests don't cover extended accounts). `FcfLiveView` FA merge fix active.

## Latest Sessions
- [Session 054](history/session-054-input-taxonomy-cwc-cleanup-gr-editor.md) (2026-04-19): INPUT Taxonomy Reorganization + CWC Cleanup + Growth Revenue Editor — 10 tasks, 39 files (+1 new + 4 deleted + 8 moved + 26 modified), net +493/-677 LOC (mostly dead-code deletions), +7 net tests, 1 lesson (LESSON-149 promoted).
- [Session 053](history/session-053-ap-beg-editable-fcf-gate-cwc-breakdown.md) (2026-04-19): AP Beginning Editable + FCF FA Gate + LESSON-057 Merge Fix + CWC Inline Breakdown — 3 tasks, 8 files (2 new + 6 changed), +11 net tests, 2 lessons (both promoted). CWC breakdown UI later removed in Session 054.
- [Session 052](history/session-052-revert-fa-seed-fallback-kd-capex-polish.md) (2026-04-19): Revert FA Seed Fallback + KD Additional Capex Visual Polish — 1 lesson (LESSON-146 promoted, LESSON-144 superseded).
- [Session 051](history/session-051-proy-bs-strict-growth-equity-capex-seed.md) (2026-04-19): Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback — 3 lessons (2 promoted).
- [Session 050](history/session-050-kd-auto-readonly.md) (2026-04-19): Key Drivers Auto Read-Only — 2 lessons (1 promoted).

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v22 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v22 with chained migration v1→v22
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 054 INPUT taxonomy** — 13-item INPUT DATA with 3 visual sub-headers (Laporan Keuangan · Drivers & Scope · Asumsi Penilaian). 8 routes relocated via `git mv`. `NavItem.subGroup?: string` pattern extensible to other groups if future need arises.
- **Session 054 Growth Revenue editor** — first editor page that mixes derived (cross-ref) + editable rows in a single `RowInputGrid` table. LESSON-149 pattern reusable for any comparison layout.

### Pages (42 total prerendered)
- **Input Master**: HOME
- **Input Data — Laporan Keuangan**: Acc Payables · Balance Sheet · Fixed Asset · Income Statement
- **Input Data — Drivers & Scope**: Changes in Working Capital · Growth Revenue (NEW: editable Industri rows) · Key Drivers
- **Input Data — Asumsi Penilaian**: Borrowing Cap · DLOM · DLOC (PFC) · Discount Rate · Interest Bearing Debt · WACC
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF (CWC breakdown section removed) · NOPLAT · ROIC · Growth Rate · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS (all 3-year scope)
- **Valuation**: DCF · AAM · EEM · CFI · Simulasi Potensi (pure output pages)
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 055+ Backlog

1. **User visual QA on Session 054** — verify at:
   (a) Sidebar: 3 sub-headers visible in INPUT DATA, items alphabetized correctly, active state on newly-moved pages works;
   (b) `/input/growth-revenue` — rows 8/9 read-only (muted style), rows 40/41 editable with debounced persist, YoY growth column populates across all 4 rows;
   (c) Each moved page loads correctly at new URL, cross-page "required-gate" links navigate to correct new location;
   (d) `/analysis/fcf` no longer shows CWC per-account breakdown section (only aggregate rows 12/13).
2. **Combined QA (Sessions 051+052+053+054)** — verify cross-session interaction after 4 rapid revisions.
3. **Upload parser (.xlsx → store)** — still highest-priority backlog. Needs architecture: null-on-upload force re-confirm (IBD/WC scope) vs trust-mode; adapter for each dynamic-catalog shape + new `growthRevenue` slice.
4. **Dashboard projected FCF chart** — leverages Sessions 045-054 projection + FCF stack.
5. **Extended-catalog smoke test fixture** (LESSON-148 follow-up) — ≥1 extended account per dynamic catalog (BS/IS/FA/AP), assert Phase C + downstream merge invariants.
