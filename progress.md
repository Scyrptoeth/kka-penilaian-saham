# Progress — KKA Penilaian Saham

> Latest state after Session 029 (2026-04-17)

## Verification Results
```
Tests:     935 / 935 passing (64 files)
Build:     ✅ 34 static pages, compiled in ~4s
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 integrity gates green (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app — /akses HTTP 200, / → 307 redirect
Store:     v15 (unchanged — no schema change this session)
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- **Visual identity (Session 023)**: Montserrat + JetBrains Mono fonts, B&W palette with light + dark mode via `next-themes`
- Store v15 with chained migration v1→v15 (15 versions, fully backward-compatible)
- **Comprehensive i18n system (Session 027)**: 500+ translation keys, `useT()` hook, `<LanguageToggle>` in sidebar, EN default / ID alternate, 50+ files migrated, root-level `language` field
- **Triple-layer i18n enforcement (Session 029)**: `scripts/audit-i18n.mjs` runnable, `eslint-rules/no-hardcoded-ui-strings.js` editor + CI rule, `pretest` chain — zero hardcoded UI strings can enter the codebase. `t()` now supports `{placeholder}` interpolation via optional `TVars` parameter.
- **Phase C end-to-end verification (Session 029)**: `__tests__/integration/phase-c-verification.test.ts` composes the full export pipeline (visibility + sanitize + table-strip + writeBuffer round-trip) and asserts every formula cell across 29 visible nav sheets is preserved at 1e-6 tolerance. `WEBSITE_NAV_SHEETS` now exported from `export-xlsx.ts` for external audits.
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- Universal auto-save: all editors debounced 500ms, no SIMPAN buttons, HomeForm onBlur + beforeunload
- PageEmptyState universal across all sections
- Unified DLOM/DLOC sign convention across calc family (Session 022)
- **Export pipeline (Sessions 018-028)**: template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility + BS/IS/FA extended-catalog native injection + sanitizer pipeline (3 corruption vectors eliminated)
- **AAM dynamic interoperability (Session 027)**: section-based `AamInput`, dynamic from `balanceSheet.accounts`, IBD classification, EKUITAS section, `resolveAccountLabel()`

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 029 (2026-04-17) — i18n Audit + Phase C Verification
- T1-T4: audit-i18n.mjs TypeScript-AST walker + accept-list + CLI with `--write-report`
- T5-T6: migrated 55 hardcoded UI strings across 22 files to `useT()`; added 12 new compound keys with `{placeholder}` interpolation
- T7: ESLint custom rule `local/no-hardcoded-ui-strings` (editor + `npm run lint` enforcement)
- T8: `audit:i18n` + `verify:phase-c` npm scripts; `pretest` chain appends audit check
- T9-T13: Phase C integration test — 4 assertions validating full export pipeline preserves every formula cell across 29 WEBSITE_NAV_SHEETS at 1e-6 tolerance
- T14: No root-cause fixes needed — Phase C passed on first run
- T15: Full gate green (tests 935, build 34 pages, lint + typecheck + audit + verify all clean)
- T17: Merged to main, deployed, live verified

#### Session 028 (2026-04-17) — IS + FA Extended Catalog Native Injection
- T0: Domain rename housekeeping
- T1: IS extended injection (Approach δ — sentinel formula replacement)
- T2: FA extended injection (Approach η — 7-band mirror + mirrored SUM)
- 35 new tests (878 → 913)

#### Session 027 (2026-04-16/17) — AAM Dynamic + Full i18n
- AAM section-based input, dynamic from `balanceSheet.accounts`
- Comprehensive i18n: 500+ translation keys, 50+ files, EN/ID toggle in sidebar
- Store v14→v15: root-level `language` field

## Next Session Priorities

### Session 030 — Upload Parser + Deferred Items
1. **Upload parser** (.xlsx → store) — reverse of export. Reuses cell-mapping registry + extended injection patterns. Can read extended rows from sheet and reconstruct catalog accounts.
2. **ESLint rule enhancement** — extend `i18n-accept-list.json` to support `uiPropNames` array so custom component props (`section="..."` on PageEmptyState) get caught on re-introduction.
3. **Phase C seed-data reconstruction** — construct ExportableState from PT Raja Voltama fixtures, validate end-to-end numerical parity beyond formula preservation.
4. **RESUME page** — final summary comparing DCF/AAM/EEM results side by side.
5. **Dashboard polish** — projected FCF chart, more KPIs.

### Other queued
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device
- Audit trail / change history

## Latest Session
- [Session 029](history/session-029-i18n-audit-phase-c.md) (2026-04-17): i18n audit + full 55-string migration + ESLint rule + Phase C integration test; 22 new tests (913→935), 6 commits on feature branch, 4 lessons extracted
- [Session 028](history/session-028-extended-is-fa-injection.md) (2026-04-17): IS + FA extended catalog native injection
- [Session 027](history/session-027-aam-dynamic-i18n.md) (2026-04-17): AAM dynamic + full i18n
