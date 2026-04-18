# Progress — KKA Penilaian Saham

> Latest state after Session 040 — Extended Injection (Proy BS / Proy FA / KEY DRIVERS) + Sign Reconciliation (2026-04-18)
> Session 040 shipped on feature branch `feat/session-040-extended-proy-kd-injection`; merge to main pending user review (option b — langsung merge setelah local gates hijau).

## Verification Results
```
Tests:     1250 / 1251 passing + 1 skipped  (102 files)
Build:     ✅ 41 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — Session 039 deployed to production via Task #1 merge
Store:     v18 (no schema change in Session 040)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Session 040 (2026-04-18) — Extended Injection + Sign Reconciliation

### Task #1 — Merge Session 039 to main
Fast-forward merge `feat/wc-scope-page-and-dcf-breakdown` → main (56 files, +1976/-249). Pushed origin main → production deploy. Deleted feature branch local + remote. Created Session 040 branch.

### Task #2 — Proy BS Extended Injection
`ProyBsBuilder.build()` adds a second pass: iterate `state.balanceSheet.accounts` with `excelRow ≥ 100`, write label at col B + projected values (lastHistYear + 3 projYears) at cols C/D/E/F of synthetic rows (excelRow 100-399 extended, 1000+ custom). Subtotals untouched — already include extended via `deriveComputedRows(dynamicBsManifest.computedFrom)`. Appending `+SUM(range)` would double-count. +5 TDD cases.

### Task #3 — Proy FA Extended Injection
`ProyFaBuilder.build()` adds a 7-band slot-allocation pass (rows 100-379 at 40-slot bands mirroring Session 028 FA historical). Each extended/custom account with slot index `i` writes labels + values across all 7 bands at `bandStart + i`. All-static values (diverges from Session 028 FA which uses live formulas for computed bands) matching ProyFaBuilder baseline static-write convention. Subtotals untouched (same double-count argument). +7 TDD cases.

### Task #4 — KEY DRIVERS Dynamic additionalCapex Injection
New `injectAdditionalCapexByAccount` helper in `KeyDriversBuilder`. Closes the Session 036 T8 data-loss gap (dynamic field added but no injector). Per-account row at `33 + slotIndex`, label at col B via `resolveLabel`, projection-year values at cols D-J. Clear-before-write strategy cleans prototipe residue (Tanah/Bangunan/Peralatan/Lainnya at B33-B36) when user has <4 FA accounts. Edge case: skip entirely when `accounts.length === 0` (preserves template parity for fixture edge case — PT Raja Voltama has empty accounts + populated rows). Upstream stays `['keyDrivers']`; injector internally gates on home + fixedAsset + keyDrivers. +8 TDD cases.

### Task #5 — KD Ratio Sign Reconciliation
`reconcileRatioSigns` helper runs after `writeScalars + writeArrays`, negates D20/D23/D24 + E-J expansions via `value === 0 ? 0 : -Math.abs(value)`. Store stays POSITIVE (LESSON-011); export boundary flips to NEGATIVE matching template + live PROY LR formulas (`=D8*'KEY DRIVERS'!D23` etc.) so projected expenses evaluate with correct signs when user reopens exported file. Previous whitelist (21 entries) hid a FUNCTIONAL bug, not cosmetic gap — removed from KNOWN_DIVERGENT_CELLS. 2 pre-existing tests updated. +8 TDD cases.

### Lessons extracted (3)
- **LESSON-111** (promoted): Injection patterns don't transplant between LIVE-formula subtotals (append SUM) and STATIC-value subtotals (leaf-only). Arithmetic contract of destination cell decides the pattern.
- **LESSON-112** (promoted): Phase C whitelist can hide FUNCTIONAL bugs when template has live formulas referencing the whitelisted cell. Grep fixtures for live references before accepting a whitelist entry.
- **LESSON-113** (local): Per-account export injectors must explicitly decide `accounts.length === 0` behavior — clear-always vs preserve-template. Document the choice in an inline comment.

## Sessions 037–039 Recap

### Session 039 (2026-04-18) — Changes in Working Capital + DCF inline breakdown
Store v17→v18, new `/analysis/changes-in-working-capital` page, account-driven CFS/PROY CFS rewrite (drops hardcoded `BS_CA_ROWS`/`BS_CL_ROWS`), 9 consumer pages PageEmptyState-gated, DCF inline breakdown rows (FCF components + PV per year + Equity Value derivation). 53 files, 3 lessons (LESSON-108/109/110). **Merged to main in Session 040 Task #1.**

### Session 038 (2026-04-18) — Interest Bearing Debt dedicated page
Store v16→v17, `/valuation/interest-bearing-debt` required-gate page with always-visible bilingual trivia, 6 consumer pages PageEmptyState-gated, AAM cross-ref note with hyperlink, 3 input-builders refactored (IBD as explicit param, sign at boundary). 51 files, 2 lessons (LESSON-106/107).

### Session 037 (2026-04-18) — Average columns
`computeAverage` + `averageSeries` helpers in derivation-helpers, 3 Input editors (BS/IS/FA) + 3 Analysis manifests (FR/NOPLAT/GR) opt-in, leading-zero-skip semantics per user spec, hidden when year count < 2. 15 files, 1 lesson (LESSON-105).

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 (v18) + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v18 with chained migration v1→v18
- Comprehensive i18n: ~530+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned, Phase C state-parity
- Shared derivation helpers: `computeCommonSize` + `computeGrowthYoY` + `computeAverage` + `averageSeries`
- Generic `CatalogAccount` + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition
- Universal auto-save: 500ms debounce; no SIMPAN buttons
- PageEmptyState universal (gates on `interestBearingDebt` + `changesInWorkingCapital`)
- Account-driven WC aggregation (Session 039 LESSON-108) with shared `resolveWcRows` helper
- AAM section-based input, IBD classification (display split only; value from dedicated page)
- **Export pipeline extended-account coverage** (Session 040): BS / IS / FA historical + **PROY BS** + **PROY FA** + **KEY DRIVERS Additional Capex** now preserve user's extended-catalog and custom accounts end-to-end. Sign convention reconciled at export boundary for KD ratios (LESSON-011 adapter pattern applied).

### Pages (41 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers (dynamic Additional Capex per FA account, **export preserved**) · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18 + Average) · FCF · NOPLAT (+ Average in YoY) · Growth Revenue (+ Average in YoY) · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · **Proy. FA (dynamic + extended)** · **Proy. BS (Full Simple Growth + extended)** · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF (with inline breakdown rows) · AAM (with cross-ref note) · EEM · CFI · Simulasi Potensi
- **Dashboard**: 4 Recharts charts

## Next Session Priorities

### Session 041 — AAM Extended + LESSON-108 Audit

1. **Merge `feat/session-040-extended-proy-kd-injection` to main** — Task #6 wrap-up step; performed directly after local gates green per user option (b).
2. **AAM extended-account native injection** — mirror Session 031 AAM builder with extended row range, honoring per-row Penyesuaian (`aamAdjustments`). Currently only baseline accounts reach the AAM sheet; extended accounts ≥ 100 are silently skipped via `BS_ROW_TO_AAM_D_ROW` lookup miss.
3. **LESSON-108 grep audit** — scan `computeNoplatLiveRows`, `computeFcfLiveRows`, FR ratios, ROIC for remaining hardcoded row-number lists (`const *_ROWS = [N, N, N]` pattern). Any remaining latent bugs for dynamic-catalog users.
4. **AccPayables extended catalog** — complete the 4th dynamic catalog (BS/IS/FA done).
5. **Upload parser (.xlsx → store)** — reverse of export, reuses cell-mapping + needs `Math.abs` on KD ratios per Session 040 sign boundary (LESSON-112 implication).
6. **RESUME page** — final side-by-side summary of AAM / DCF / EEM per share.

### Session 041+ Backlog

- **Dashboard polish** — projected FCF chart with new NV-growth model from Session 036
- **Cleanup `isIbdAccount` classifier** from AAM CL/NCL display split (calc-inert after Session 038)
- **Multi-case management** (multiple companies in one localStorage)
- **Cloud sync / multi-device**

## Latest Sessions
- [Session 040](history/session-040-extended-injection-sign-reconciliation.md) (2026-04-18): Extended Injection (Proy BS/FA/KD) + KD Sign Reconciliation — 4 builder commits + Session 039 merge, 7 production files, 1228→1250 tests (+28), 3 lessons
- [Session 039](history/session-039-wc-scope-and-dcf-breakdown.md) (2026-04-18): Changes in Working Capital required-gate + DCF inline breakdown — store v17→v18, new page + trivia, account-driven CFS/PROY CFS, 9 consumer gates, DCF breakdown rows, 53 files, 3 lessons
- [Session 038](history/session-038-ibd-field.md) (2026-04-18): Interest Bearing Debt dedicated page — store v16→v17, new page + trivia, 6 consumer gates, AAM cross-ref note, 3 input-builders refactored, 51 files, 2 lessons
- [Session 037](history/session-037-average-columns.md) (2026-04-18): Average columns — computeAverage + averageSeries helpers, 3 Input editors + 3 Analysis manifests, leading-zero-skip semantics, 15 files, 1 lesson
- [Session 036](history/session-036-dynamic-projection.md) (2026-04-18): Dynamic Account Interoperability — Proy BS Full Simple Growth, Proy FA per-account NV growth, Input FA CS+Growth, KD Additional Capex dynamic, store v15→v16, row translation export, 2 lessons
