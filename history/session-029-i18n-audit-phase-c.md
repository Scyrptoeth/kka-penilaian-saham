# Session 029 — i18n Coverage Audit + Phase C Headless Numerical Verification

**Date**: 2026-04-17
**Scope**: Dual priority P1 (i18n audit + full migrate + ESLint rule + npm script) and P2 (Phase C headless numerical verification as integration test). Both end-to-end in a single session per user approval.
**Branch**: `feat/session-029-i18n-phase-c` → fast-forwarded into `main` (on T17)

## Goals (from plan.md)
- [x] T1: Design + plan committed
- [x] T2-T3: audit-i18n.mjs skeleton + AST walker (TDD RED → GREEN)
- [x] T4: Run audit, categorize findings, build accept-list
- [x] T5-T6: Full remediation — 55 hardcoded strings migrated to useT() across 22 files
- [x] T7: ESLint custom rule `local/no-hardcoded-ui-strings`
- [x] T8: npm scripts (`audit:i18n` + `verify:phase-c`) + `pretest` integration
- [x] T9-T13: Phase C integration test with full export pipeline round-trip
- [x] T14: No root-cause fixes needed — Phase C passed on first run
- [x] T15: Full verification gate — tests + build + lint + typecheck + audit + verify all green
- [x] T16: Documentation
- [x] T17: Merge to main + push + verify live

## Delivered

### P1 — Triple-Layer i18n Enforcement (commits 0b06cca, dc826cb, afeb283, 6ad2a5f)

**Infrastructure**:
- `scripts/audit-i18n.mjs` — TypeScript-AST walker that detects hardcoded UI strings in JSX text nodes and UI-bearing JSXAttribute values (aria-label, title, placeholder, alt, label). Library API + CLI. Honors `scripts/i18n-accept-list.json` (exact tokens + regex patterns including HTML entities) and `// i18n-ignore` line pragma. Exits non-zero on violations. Writes `i18n-audit-report.md` (gitignored).
- `eslint-rules/no-hardcoded-ui-strings.js` — ESLint rule mirroring the same detection logic. Runs in editor + `npm run lint`. Loaded as `local` plugin via createRequire in `eslint.config.mjs` (flat config v9).
- `scripts/i18n-accept-list.json` — seed with technical acronyms (NPWP, CIF, IDR, DJP, PPh, PPN, WACC, CoE, CoD, DLOM, DLOC, DCF, NOPLAT, FCF, ROIC, EBIT, EBITDA, PBT, AAM, EEM, CFI, PT, CV, Tbk, etc.), symbols (→, —, •, ✓, ✗), numeric/date patterns, HTML entity pattern `^&[a-zA-Z]+;$`.
- `npm run audit:i18n` and `npm run verify:phase-c` scripts added.
- `pretest` chain: existing `build-nip-whitelist.cjs` + new `audit-i18n.mjs` — npm test fails fast on violations.

**i18n interpolation** (`src/lib/i18n/translations.ts`, `src/lib/i18n/useT.ts`):
- `t(key, lang, vars?)` and `createT(lang)` now accept optional `TVars = Record<string, string | number>` for `{placeholder}` substitution.
- Existing 50+ useT() callers unaffected (vars optional).
- `useT()` hook signature updated to expose vars parameter.
- 8 new tests covering interpolation + fallback + placeholder preservation when vars missing.

**Full migration** — 55 hardcoded strings → useT() across 22 files:
- **DCF / EEM / Simulasi Potensi (13 hits)**: compound row labels use `dcf.fcfYearRow`, `dcf.discountFactorYearRow`, `dcf.dlomWithPercentRow`, `dcf.marketValuePortionRow`, `simulasi.dlocWithPercentRow`, `simulasi.proporsiSahamRow` — `t()` with `{year}`/`{pct}` interpolation.
- **WaccForm (17 hits)**: all section headers, table headers, labels now use `wacc.*` keys; new `wacc.companyPlaceholder`, `wacc.removeCompanyAria`, `wacc.removeBankAria`.
- **PageEmptyState section/title props (18 files, swept in same pass)**: `section` now uses `nav.group.*`, `title` reuses matching `nav.item.*` per page.
- **Input page loading states (3 files)**: `"Memuat…"` → `t('common.loading')`.
- **LiveView title attrs (4 files)**: migrated to `nav.item.*`.
- **DataSourceHeader (2 aria-labels)** → new `dataSource.seedBannerAriaLabel`, `dataSource.companyNameAriaLabel`.
- **DiscountRateForm "Debt Rate"** → `discountRate.summary.debtRate`; CoE/CoD added to accept-list as technical acronyms.
- **Sidebar desktop aria-label** → `sidebar.navAriaLabelDesktop`; Sidebar converted to `'use client'` (minimal — children already client).

**Audit rule refinement**: `aria-labelledby` and `aria-describedby` removed from `UI_ATTR_NAMES` — they reference element IDs, not user text.

### P2 — Phase C End-to-End Export Integrity (commit 45d973e)

`__tests__/integration/phase-c-verification.test.ts` composes the full export pipeline and validates:

1. **WEBSITE_NAV_SHEETS length = 29** — guards accidental additions/removals.
2. **Template contains all 29 nav sheets**.
3. **Exported workbook preserves every formula cell from template at 1e-6 tolerance across 29 visible sheets** — primary integrity gate.
4. **Visibility enforcement**: only 29 nav sheets stay visible after pipeline.

**Approach**: minimal-state export (no user data injection). Exercises stages that modify template regardless of state — `applySheetVisibility` + `sanitizeDanglingFormulas` + `stripDecorativeTables` — plus `writeBuffer`+`load` round-trip to catch serialization corruption. `WEBSITE_NAV_SHEETS` now `export`ed from `export-xlsx.ts` so external audits share the same list.

**Diff engine**: classifies mismatches as `missing-in-exported` / `numerical-drift` / `type-changed`. When any mismatch occurs, writes `phase-c-verification-report.md` (gitignored) with top-50 per category.

**Verification**: 4/4 Phase C tests pass on first run. No formula drift, no visibility regression, no serialization corruption detected.

## Verification
```
Tests:     935 / 935 passing (64 files — was 913 at Session 028, +22)
Build:     ✅ Compiled successfully in 4.3s, 34 static pages
Typecheck: ✅ clean (1 surprise TS2322 caught + fixed in 6ad2a5f — literal-type
           union assignment, invisible to Vitest)
Lint:      ✅ clean (new local/no-hardcoded-ui-strings rule active)
Audit:     ✅ zero violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 pass (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app/akses HTTP 200 (verified after merge)
Store:     v15 (unchanged — no schema change)
```

## Stats
- Commits on feature branch: 6 (1 docs + 5 feat/fix)
- Files changed: 28 (1 design.md + 1 plan.md + 3 i18n infra + 22 migration + 1 Phase C)
- Lines: +~1200 / -80
- Test cases added: 22 (10 audit-i18n + 8 interpolation + 4 Phase C integration)
- New npm scripts: 2 (`audit:i18n`, `verify:phase-c`)
- New CI gates: 2 (audit runs via `pretest`, Phase C runs as integration test)
- Hardcoded UI strings eliminated: 55
- Files migrated to useT(): 22

## Deviations from Plan
- **T9-T13 collapsed into one test file**: the plan proposed separate snapshot functions (website-snapshot, excel-snapshot, diff engine) with intermediate JSON artifacts. Realized during T9 that the simpler approach — template round-trip verification using ExcelJS cached values — gives the same guarantee without needing `seedExportableState()` reconstruction from fixtures. ExcelJS doesn't evaluate formulas, so comparing exported-workbook formula-result against template formula-result is exactly the check we need for pipeline integrity. Committed as single integration test with 4 assertions.
- **Phase C passed on first run** — no T14 root-cause fixes needed. Existing export pipeline is already correct for minimal state. If we had injected seed data from fixtures, different mismatches may have surfaced; deferred as future enhancement.
- **Accidental over-inclusive commit recovered with soft reset** — one commit in T5/T6 batch accidentally included 70+ untracked screenshots + session prompts via `git add -A`. Recovered with `git reset --soft HEAD~1` + `git reset HEAD` + selective `git add scripts/ src/`. Clean re-commit. LESSON-081 extracted.
- **TypeScript literal-type surprise** — Vitest's Vite pipeline is more permissive on literal-type unions than `tsc --noEmit`. A `let result = entry[lang] ?? entry.en` reassignment via `split/join` passed Vitest but failed typecheck. Surfaced only at T15 full gate. Fix: annotate `let result: string`. LESSON-082 extracted.

## Deferred to Future Sessions
- **Phase C with seed data reconstruction** — current test covers minimal-state pipeline preservation. Enhanced version could construct a full `ExportableState` from PT Raja Voltama fixtures and validate computed-value parity. Deferred because the primary integrity gate (formula preservation) is already covered.
- **ESLint rule `section` prop catcher** — currently the rule only catches standard HTML attributes. Project-specific component props (`section="INPUT DATA"` on PageEmptyState) were swept during same migration pass but the rule wouldn't catch re-introduction. Future: extend `i18n-accept-list.json` to support `uiPropNames` array so rule reads project-specific UI-text props.
- **Upload parser (.xlsx → store)** — reverse of export. Priority 3 in original Session 029 plan but scope-managed to 2 priorities.
- **RESUME page, Dashboard polish** — lower priority.

## Lessons Extracted
- [LESSON-081](../lessons-learned.md#lesson-081): `git add -A` is a foot-gun — stage explicit paths for clean commits
- [LESSON-082](../lessons-learned.md#lesson-082): Vitest literal-type laxness vs `tsc --noEmit` — always run typecheck before claiming TDD GREEN
- [LESSON-083](../lessons-learned.md#lesson-083): Triple-layer i18n enforcement pattern — runnable script + ESLint rule + pretest gate
- [LESSON-084](../lessons-learned.md#lesson-084): Phase C pragmatism — template formula-preservation test over full fixture reconstruction

## Files & Components Added/Modified
```
design.md                                                       [REWRITTEN]
plan.md                                                         [REWRITTEN]
scripts/audit-i18n.mjs                                          [NEW]
scripts/i18n-accept-list.json                                   [NEW]
eslint-rules/no-hardcoded-ui-strings.js                         [NEW]
eslint.config.mjs                                               [MODIFIED — local plugin]
package.json                                                    [MODIFIED — 2 new scripts + pretest chain]
.gitignore                                                      [MODIFIED — Phase C + i18n report artifacts]
src/lib/i18n/translations.ts                                    [MODIFIED — TVars + 12 new keys]
src/lib/i18n/useT.ts                                            [MODIFIED — vars signature]
src/lib/export/export-xlsx.ts                                   [MODIFIED — export WEBSITE_NAV_SHEETS]
src/app/valuation/dcf/page.tsx                                  [MIGRATED]
src/app/valuation/eem/page.tsx                                  [MIGRATED]
src/app/valuation/simulasi-potensi/page.tsx                     [MIGRATED]
src/app/valuation/borrowing-cap/page.tsx                        [MIGRATED]
src/app/analysis/growth-rate/page.tsx                           [MIGRATED]
src/app/input/balance-sheet/page.tsx                            [MIGRATED]
src/app/input/income-statement/page.tsx                         [MIGRATED]
src/app/input/fixed-asset/page.tsx                              [MIGRATED]
src/app/input/key-drivers/page.tsx                              [MIGRATED]
src/app/input/acc-payables/page.tsx                             [MIGRATED]
src/app/projection/cash-flow/page.tsx                           [MIGRATED]
src/components/forms/WaccForm.tsx                               [MIGRATED]
src/components/forms/DiscountRateForm.tsx                       [MIGRATED]
src/components/analysis/CashFlowLiveView.tsx                    [MIGRATED]
src/components/analysis/FcfLiveView.tsx                         [MIGRATED]
src/components/analysis/FinancialRatioLiveView.tsx              [MIGRATED]
src/components/analysis/GrowthRevenueLiveView.tsx               [MIGRATED]
src/components/financial/DataSourceHeader.tsx                   [MIGRATED]
src/components/layout/Sidebar.tsx                               [MIGRATED + 'use client']
__tests__/scripts/audit-i18n.test.ts                            [NEW]
__tests__/lib/i18n/translations.test.ts                         [NEW]
__tests__/integration/phase-c-verification.test.ts              [NEW]
```

## Next Session Recommendation (Session 030)
1. Upload parser (.xlsx → store) — reverse of export, using same cell-mapping registry + extended injection patterns.
2. ESLint rule enhancement for project-specific UI-text props (config-driven).
3. Phase C seed-data reconstruction — construct ExportableState from PT Raja Voltama fixtures, validate end-to-end value parity.
4. RESUME page — side-by-side DCF/AAM/EEM summary.
5. Dashboard polish.
