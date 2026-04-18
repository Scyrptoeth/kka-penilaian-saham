# Progress — KKA Penilaian Saham

> Latest state after Session 041 — IS Revamp + BS Koreksi Note + IBD Scope-Page Redesign (2026-04-18)
> Session 041 fully merged to main + pushed (commit `f680d7b`); Vercel production deploy triggered.

## Verification Results
```
Tests:     1261 / 1261 passing + 1 skipped  (103 files; +11 net since Session 040)
Build:     ✅ 41 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — Session 041 deployed to production via fast-forward merge
Store:     v19 (schema migration v18→v19 — 3 coordinated changes)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Session 041 (2026-04-18) — IS Revamp + BS Koreksi Note + IBD Scope-Page Redesign

### Task 1 — Depreciation IS read-only mirror dari FA Total Additions
- New helper `computeDepreciationFromFa(faRows)` di `src/lib/calculations/derive-depreciation.ts` reads FA row 51 (TOTAL_DEP_ADDITIONS), negates per LESSON-055
- DynamicIsEditor injects FA cross-ref via persist-time `useKkaStore.getState()` + render-time `useMemo` + useEffect re-persist on FA change (mirror LESSON-058 BS-from-FA pattern)
- buildDynamicIsManifest row 21 marked `type: 'cross-ref'` → RowInputGrid renders read-only
- IS_FIXED_LEAF_ROWS drops 21; only TAX (33) remains user-editable fixed leaf
- 6 TDD cases

### Task 2 — Trivia Koreksi Fiskal di BS page
- `KoreksiFiskalNote` aside di bawah Reset buttons di `DynamicBsEditor.tsx`. Mirror AAM cross-ref styling (`border-l-2 border-accent`)
- 4 i18n keys bilingual EN/ID (heading, intro, positive, negative cases)
- Markdown-bold parser (`**phrase**`) keeps i18n strings declarative — no `dangerouslySetInnerHTML` (LESSON-117)

### Task 3 — Split net_interest → interest_income + interest_expense
- Catalog refactor: `IsSection` drops `'net_interest'`, adds two new sections. Drops `interestType` discriminator. PSAK-aligned defaults: 6 income (rows 500-519, PSAK 71/IFRS 9) + 7 expense (rows 520-539, IAS 23 borrowing costs)
- Each section gets its own +Add dropdown — eliminates misclassification trap where income accounts ended up under EXPENSE
- IS_SECTION_INJECT (export): both new sections now use SUM-formula sentinel replacement (single-sign). LESSON-077 mixed-sign exception removed
- Migration v18→v19: relocate via legacy `interestType` field

### Task 4 — Koreksi Fiskal + TAXABLE PROFIT antara PBT-Tax
- New synthetic sentinel rows: `KOREKSI_FISKAL = 600` (signed user-editable leaf), `TAXABLE_PROFIT = 601` (computed `[PBT, KOREKSI_FISKAL]`)
- Manifest order: PBT (32) → Koreksi (600) → TAXABLE PROFIT (601) → Tax (33) → NPAT (35)
- Tax + NPAT formulas UNCHANGED — backward compat for KEY DRIVERS / NOPLAT / downstream (LESSON-116)
- 2 i18n strings added to IsStrings interface

### Task 5 — IBD page redesign mirror CWC + isIbdAccount cleanup
- Store schema v18→v19: `interestBearingDebt: number | null` → `{excludedCurrentLiabilities, excludedNonCurrentLiabilities} | null`. Migration drops legacy numeric → null
- Page rewrite `/valuation/interest-bearing-debt`: lists all CL+NCL accounts read-only with trash icon to mark NOT-IBD. Live IBD total preview. Mirror UX of `/analysis/changes-in-working-capital`
- New helper `computeInterestBearingDebt(input)` derives total from BS data minus exclusion set
- 6 consumer pages (AAM/DCF/EEM/CFI/Simulasi/Dashboard) + 3 sheet-builders (DCF/EEM/CFI) use the helper
- **`isIbdAccount` classifier removed** (LESSON-074 closed). AAM CL/NCL display split now driven by same exclusion sets — single source of truth (LESSON-119)

### Lessons extracted (6, 5 promoted)
- **LESSON-114** (promoted): Section split refactor must touch every reference atomically
- **LESSON-115** (promoted): Cross-sheet read-only sentinel pattern generalizes BS-from-FA → IS-from-FA
- **LESSON-116** (promoted): Synthetic sentinel rows ≥ 600 preserve downstream backward compatibility
- **LESSON-117** (local): Markdown-bold parser for trivia strings — declarative + safe
- **LESSON-118** (promoted): Store schema migration must also update Phase C fixture helpers
- **LESSON-119** (promoted): User-curated exclusion list is single source of truth for compute AND display

## Sessions 038–040 Recap

### Session 040 (2026-04-18) — Extended injection PROY BS/FA + KEY DRIVERS additionalCapex
Per-account injectors for Proy BS extended rows + Proy FA 7-band slot allocation + KEY DRIVERS Additional Capex per FA account. KD ratio sign reconciliation at export boundary (21 whitelist entries removed). 4 commits, +28 tests, 3 lessons (111/112/113).

### Session 039 (2026-04-18) — Changes in Working Capital required-gate + DCF inline breakdown
Store v17→v18, new `/analysis/changes-in-working-capital` page, account-driven CFS/PROY CFS rewrite, 9 consumer gates. DCF inline breakdown rows. 53 files, 3 lessons (108/109/110).

### Session 038 (2026-04-18) — Interest Bearing Debt dedicated page (Session 038 schema deprecated by Session 041 redesign)
Store v16→v17, original numeric-input IBD page with always-visible trivia, 6 consumer gates, AAM cross-ref note + hyperlink. **NOTE: Session 041 replaced the numeric-input page with a CWC-style scope editor; trivia content and required-gate semantics preserved.**

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 (v19) + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v19 with chained migration v1→v19 (last 3 steps coordinate Session 041 schema changes)
- Comprehensive i18n: ~545+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned, Phase C state-parity
- Shared derivation helpers: `computeCommonSize` + `computeGrowthYoY` + `computeAverage` + `averageSeries`
- Generic `CatalogAccount` + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition
- Universal auto-save: 500ms debounce; no SIMPAN buttons
- PageEmptyState universal (gates on `interestBearingDebt` + `changesInWorkingCapital`, both now scope-object based)
- Account-driven WC aggregation (Session 039 LESSON-108) with shared `resolveWcRows` helper
- AAM section-based input + IBD classification driven by user-curated exclusion sets (Session 041 LESSON-119)
- **IS Depreciation cross-ref from FA** (Session 041 Task 1) — read-only mirror; persist + useEffect chain mirrors BS LESSON-058
- **IS Koreksi Fiskal + TAXABLE PROFIT** (Session 041 Task 4) — synthetic rows 600/601 inserted between PBT and Tax; downstream NPAT formula UNCHANGED
- **Export pipeline extended-account coverage** (Session 040): BS / IS / FA historical + PROY BS + PROY FA + KEY DRIVERS Additional Capex
- **IBD scope-editor page** (Session 041 Task 5) — mirror CWC scope page UX; `isIbdAccount` classifier removed (LESSON-074 closed)

### Pages (41 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84, with Koreksi Fiskal tax-impact note) · Income Statement (dynamic, **Depreciation read-only from FA**, **interest income/expense split**, **Koreksi Fiskal + TAXABLE PROFIT**) · Fixed Asset (dynamic 20) · Key Drivers (dynamic Additional Capex per FA account, export preserved) · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18 + Average) · FCF · NOPLAT (+ Average in YoY) · Growth Revenue (+ Average in YoY) · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA (dynamic + extended) · Proy. BS (Full Simple Growth + extended) · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · **Interest Bearing Debt (CWC-style scope editor)** · DCF (with inline breakdown rows) · AAM (with cross-ref note + IBD scope-driven CL/NCL split) · EEM · CFI · Simulasi Potensi
- **Dashboard**: 4 Recharts charts

## Next Session Priorities

### Session 042 — Excel Export of Tax Adjustment + AAM Extended + Audit

1. **Excel export of Koreksi Fiskal (600) + TAXABLE PROFIT (601) to extended IS rows** — Session 041 added them at synthetic rows in the website but export pipeline does not yet write them to the IS sheet. Mirror Session 028 IS_SECTION_INJECT pattern with a new `tax_adjustment` section that writes labels + values at the END of the IS template (rows 600-601 area, matching synthetic excelRow).
2. **AAM extended-account native injection** (excelRow ≥ 100) — mirror Session 031 AAM builder, honoring per-row Penyesuaian (`aamAdjustments`).
3. **LESSON-108 grep audit** — scan `computeNoplatLiveRows`, `computeFcfLiveRows`, FR ratios, ROIC for hardcoded `const *_ROWS = [N, N, N]` patterns.
4. **AccPayables extended catalog** — complete the 4th dynamic catalog (BS/IS/FA done; AP last).
5. **Upload parser (.xlsx → store)** — reverse direction. IBD scope reconstruction now requires either (a) leave null on upload and force user re-confirm, or (b) trust mode that preserves uploaded numeric IBD as virtual exclusion entry. Discuss with user before starting.
6. **RESUME page** — final side-by-side AAM/DCF/EEM per-share summary.

### Session 042+ Backlog

- **Dashboard polish** — projected FCF chart with Session 036 NV-growth model
- **Multi-case management** (multiple companies in one localStorage)
- **Cloud sync / multi-device**

## Latest Sessions
- [Session 041](history/session-041-is-revamp-bs-note-ibd-redesign.md) (2026-04-18): IS Revamp + BS Koreksi Fiskal note + IBD scope-page redesign + isIbdAccount cleanup — store v18→v19, 5 user tasks, 27 files, +1296/-360 LOC, +11 tests, 6 lessons (5 promoted). Merged to main commit `f680d7b`, deployed to production
- [Session 040](history/session-040-extended-injection-sign-reconciliation.md) (2026-04-18): Extended Injection (Proy BS/FA/KD) + KD Sign Reconciliation — 4 builder commits + Session 039 merge, 7 production files, 1228→1250 tests (+28), 3 lessons
- [Session 039](history/session-039-wc-scope-and-dcf-breakdown.md) (2026-04-18): Changes in Working Capital required-gate + DCF inline breakdown — store v17→v18, new page + trivia, account-driven CFS/PROY CFS, 9 consumer gates, DCF breakdown rows, 53 files, 3 lessons
- [Session 038](history/session-038-ibd-field.md) (2026-04-18): Interest Bearing Debt dedicated page (numeric input — superseded by Session 041 scope-editor redesign)
- [Session 037](history/session-037-average-columns.md) (2026-04-18): Average columns — computeAverage + averageSeries helpers, 3 Input editors + 3 Analysis manifests
