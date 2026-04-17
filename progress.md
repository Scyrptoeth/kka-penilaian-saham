# Progress — KKA Penilaian Saham

> Latest state after Session 030 Phase 1 (2026-04-17)

## Verification Results
```
Tests:     953 / 953 passing (66 files; was 935 at Session 029, +18)
Build:     ✅ 34 static pages, compiled in ~4s
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 4/4 integrity gates green (`npm run verify:phase-c`)
Live:      https://penilaian-bisnis.vercel.app — /akses HTTP 200, / → 307 redirect
Store:     v15 (unchanged — no schema change)
```

## Session 030 Status — Phase 1 Complete, Phase 2 Queued

**Scope of full Session 030 refactor** (as committed in design.md + plan.md):
Pivot export pipeline from template-based injection to state-driven
`SheetBuilder` registry with dependency-graph cascade. 29 visible nav
sheets + cross-sheet formula preservation + Phase C rewrite.

**Delivered this session (T1+T2 only)**:
- Foundation layer: `SheetBuilder` interface, `UpstreamSlice` union, `isPopulated()` resolver, `clearSheetCompletely()` utility, `SHEET_BUILDERS` registry, `runSheetBuilders()` orchestrator, formula reactivity probe
- Runtime-inert: empty registry means zero user-facing behavior change. Safe to merge mid-refactor.

**Deferred to Session 031+**:
- T3: BS + IS + FA builders with store-sourced labels (primary user complaint fix)
- T4: AAM + SIMULASI POTENSI (AAM) builders with dynamic sections
- T5: 8 remaining input builders (HOME, KD, AP, DLOM, DLOC, WACC, DR, Borrowing Cap)
- T6: 7 computed analysis builders (CFS, FR, FCF, NOPLAT, ROIC, Growth Revenue, Growth Rate)
- T7: 9 projection/valuation/dashboard builders
- T8: Legacy pipeline cleanup + cross-sheet formula sanitizer
- T9: Phase C rewrite — website-state parity pivot
- T10: Full gate + merge

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity (Session 023): Montserrat + JetBrains Mono, B&W palette light + dark mode via `next-themes`
- Store v15 with chained migration v1→v15 (15 versions)
- Comprehensive i18n (Session 027): 500+ keys, `useT()` hook, EN default / ID alternate, root-level `language`
- Triple-layer i18n enforcement (Session 029): `audit-i18n.mjs` + `local/no-hardcoded-ui-strings` ESLint rule + `pretest` chain
- Phase C end-to-end verification (Session 029): template formula-preservation across 29 visible sheets @ 1e-6 tolerance
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- Universal auto-save: all editors debounced 500ms, HomeForm onBlur + beforeunload
- PageEmptyState universal across all sections
- Unified DLOM/DLOC sign convention across calc family (Session 022)
- Export pipeline (Sessions 018-028): template-based .xlsx export with 3,084 formulas preserved + website-nav 1:1 visibility + BS/IS/FA extended-catalog native injection + sanitizer pipeline
- AAM dynamic interoperability (Session 027): section-based `AamInput`, dynamic from `balanceSheet.accounts`, IBD classification, EKUITAS section
- **State-driven export foundation (Session 030 T1+T2)**: `SheetBuilder` + `runSheetBuilders` + `clearSheetCompletely` infrastructure ready for Session 031 migration

### Pages (34 total)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis** (live-only + PageEmptyState): Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM (dynamic accounts + EKUITAS), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 030 Phase 1 (2026-04-17) — State-Driven Export Foundation
- T1: `SheetBuilder` types + `isPopulated` resolver + `clearSheetCompletely` utility (12 tests)
- T2: `SHEET_BUILDERS` registry + `runSheetBuilders` orchestrator + formula reactivity probe (6 tests)
- 3 commits on feature branch, fast-forwarded to main
- User-approved wrap at T1+T2 milestone; T3-T10 deferred to Session 031+
- 3 lessons extracted (LESSON-085/086 promoted; LESSON-087 session-specific)

#### Session 029 (2026-04-17) — i18n Audit + Phase C Verification
- T1-T4: audit-i18n.mjs TypeScript-AST walker + accept-list + CLI
- T5-T6: 55 hardcoded strings migrated to `useT()` across 22 files + 12 compound keys with `{placeholder}` interpolation
- T7: ESLint `local/no-hardcoded-ui-strings` rule
- T8: `audit:i18n` + `verify:phase-c` npm scripts; `pretest` chain
- T9-T13: Phase C integration test — 4 assertions for full pipeline formula preservation
- T14-T15: All gates green on first run
- T17: Merged + deployed + live verified

#### Session 028 (2026-04-17) — IS + FA Extended Catalog Native Injection
- T0: Domain rename housekeeping
- T1: IS extended injection (Approach δ — sentinel formula replacement)
- T2: FA extended injection (Approach η — 7-band mirror + mirrored SUM)
- 35 new tests (878 → 913)

## Next Session Priorities

### Session 031 — Core Builders (T3 + T4)
1. **T3: BS/IS/FA builders** — wrap existing `injectGridCells` + extended injectors + add `writeLabelsFromStore(sheet, state)` override for col B. Register in `SHEET_BUILDERS`. Adjust legacy pipeline to skip migrated sheets. Direct fix for user's primary complaint.
2. **T4: AAM + SIMULASI POTENSI (AAM) builders** — dynamic section layout from `balanceSheet.accounts`. Second-priority user complaint.
3. **Cascade test** for all-null state → migrated sheets blank.
4. Merge to main.

### Session 032+ — Cascade Completion (T5-T10)
5. T5: 8 remaining input builders
6. T6: 7 computed analysis builders (CFS, FR, FCF, NOPLAT, ROIC, Growth Revenue, Growth Rate)
7. T7: 9 projection/valuation/dashboard builders
8. T8: Legacy pipeline cleanup + cross-sheet sanitizer
9. T9: Phase C rewrite — website-state parity
10. T10: Full gate + merge + live verify

### Deferred beyond Session 030 refactor
- Upload parser (.xlsx → store) — reverse of export
- ESLint rule enhancement — `uiPropNames` array config
- RESUME page — side-by-side DCF/AAM/EEM summary
- Dashboard polish — projected FCF chart, more KPIs
- Multi-case management (multiple companies in one localStorage)
- Cloud sync / multi-device
- Audit trail / change history

## Latest Session
- [Session 030 Phase 1](history/session-030-foundation-sheet-builders.md) (2026-04-17): State-driven export foundation T1+T2, 18 new tests, 3 lessons, wrapped at milestone with T3-T10 deferred
- [Session 029](history/session-029-i18n-audit-phase-c.md) (2026-04-17): i18n audit + 55-string migration + ESLint rule + Phase C integration test
- [Session 028](history/session-028-extended-is-fa-injection.md) (2026-04-17): IS + FA extended catalog native injection
