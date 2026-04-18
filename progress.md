# Progress — KKA Penilaian Saham

> Latest state after Session 036 — Dynamic Account Interoperability (2026-04-18)
> Per-account historical-growth projections for Proy BS + Proy FA, Input FA feature parity, Key Drivers Additional Capex dynamic.

## Verification Results
```
Tests:     1201 / 1202 passing + 1 skipped (102 files; was 1213 at Session 035)
Build:     ✅ 39 static pages, compiled cleanly
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant; local/no-hardcoded-ui-strings active)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app — HTTP 200
Store:     v16 (v15→v16 migration for additionalCapex → additionalCapexByAccount)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Session 036 Status — Dynamic Account Interoperability COMPLETE

**Scope delivered this session**:

- **T2 Input FA feature parity** — Common Size (denominator = row 69 Net Value Total) + Growth YoY columns, mirroring Input BS / IS. Shared `computeCommonSize` + `computeGrowthYoY` helpers extracted.
- **T3+T4 Proy BS Full Simple Growth** — every BS account projects uniformly via `value[N] = prev × (1 + computeAvgGrowth(series))`. Decoupled from PROY FA / PROY LR. Subtotals via dynamic BS manifest computedFrom. Page rewrite with per-account Growth sub-row.
- **T5+T6 Proy FA per-account Net Value growth** — all 7 bands project using account's avg NV YoY growth. Display shows NV only in proj years (Acq/Dep "—"); internal computation preserved for PROY LR depreciation cascade.
- **T7+T8 Store v15→v16 + Dynamic KD Additional Capex** — old 4-row `additionalCapex` replaced with `additionalCapexByAccount: Record<number, YearKeyedSeries>`. KeyDriversForm Additional Capex section iterates `fixedAsset.accounts`.
- **T9 Builder row translation** — ProyBsBuilder + ProyFaBuilder translate compute-output keys to Proy BS/FA template rows. Extended accounts silently skipped (Session 037 scope).

**Commits**: 6 (1 docs + 5 feat/refactor) merged to main via fast-forward (7614149). Pushed.

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 (v16) + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v16 with chained migration v1→v16 (Session 036 adds v15→v16 for additionalCapexByAccount)
- Comprehensive i18n: 500+ keys, `useT()` hook, root-level `language`
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030-035) — 29/29 registry, V1 pruned, Phase C state-parity
- Shared `computeCommonSize` + `computeGrowthYoY` helpers for dynamic editor derivation columns
- Generic `CatalogAccount` + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition
- Universal auto-save: 500ms debounce; no SIMPAN buttons
- PageEmptyState universal
- AAM section-based input, IBD classification
- Export pipeline: template-based .xlsx, 3,084 formulas preserved, BS/IS/FA extended-catalog native injection, sanitizer pipeline (zero Excel repair dialogs)

### Pages (39 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 41) · Fixed Asset (dynamic 20 — **NEW CS + Growth YoY columns**) · Key Drivers (**NEW dynamic Additional Capex per FA account**) · Acc Payables
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, Cash Flow Statement
- **Projection**: **Proy. L/R · Proy. FA (dynamic accounts × 7 bands, NV-only proj display) · Proy. BS (dynamic accounts, Full Simple Growth) · Proy. NOPLAT · Proy. CFS**
- **Valuation**: DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Recent Sessions Deliverables

#### Session 036 (2026-04-18) — Dynamic Account Interoperability
- T2: Input FA Common Size + Growth YoY columns + shared helpers (10 TDD, DRY refactor)
- T3+T4: computeProyBsLive Full Simple Growth (10 TDD, dynamic page)
- T5+T6: computeProyFixedAssetsLive per-account NV growth (8 TDD, dynamic page)
- T7+T8: Store v15→v16 + KD Additional Capex dynamic (3 migration TDD)
- T9: Builder row translation (proy-bs + proy-fa template fit)
- T10: Full gate + merge + deploy
- 6 commits, all green gates
- 2 lessons extracted (LESSON-103 template translation, LESSON-104 grep-all-callers)
- **Outcome**: end-to-end dynamic account support from Input → Projection → Export (for original accounts). Phase 3 dynamic vision finally complete.

#### Session 035 (2026-04-18) — T8-T10 State-Driven Export Closure
- exportToXlsx body pruned 90 LOC → 20 LOC
- 5 dead internal functions deleted
- Phase C rewritten as state-parity by sheet class
- 4 lessons (LESSON-099/100/101/102)

#### Session 034 (2026-04-17) — T7 PROY/Valuation/Dashboard
- 9 SheetBuilders shipped → cascade 20→29 FULL COVERAGE
- `buildCfiInput` extraction
- 4 lessons (LESSON-095/096/097/098)

## Next Session Priorities

### Session 037 — Complete Extended Account Support + Sign Convention

1. **Proy BS extended injection** — extended (excelRow ≥ 100) + custom (≥ 1000) BS accounts currently silently skipped at export. Mirror Session 025 BS extended pattern (native row injection + subtotal append).
2. **Proy FA extended injection** — same for FA, mirror Session 028 FA pattern (7-band mirror with slot allocation).
3. **KEY DRIVERS dynamic additionalCapex injection** — build dedicated injector in KeyDriversBuilder for the Record-keyed map.
4. **Sign convention reconciliation** — KD cogsRatio/sellingExpenseRatio/gaExpenseRatio 21 whitelisted cells (deferred from Session 035).
5. **Dashboard polish** — projected FCF chart with new NV model.
6. **RESUME page** — final summary comparing DCF/AAM/EEM.

### Session 037+ Backlog

- **AAM extended-account native injection** (excelRow ≥ 100) — deferred since Session 031
- **AccPayables extended catalog** — 4th input sheet pattern completion
- **Upload parser** (.xlsx → store) — reverse of export
- **Multi-case management** (multiple companies in one localStorage)
- **Cloud sync / multi-device**
- **Audit trail / change history**

## Latest Sessions
- [Session 036](history/session-036-dynamic-projection.md) (2026-04-18): Dynamic Account Interoperability — Proy BS Full Simple Growth, Proy FA per-account NV growth, Input FA CS+Growth columns, KD Additional Capex dynamic, store v15→v16, row translation export, 2 lessons
- [Session 035](history/session-035-legacy-cleanup-v2-promotion.md) (2026-04-18): T8-T10 Closure — V1 body pruned, Phase C state-parity rewrite, 5 dead functions deleted, 2 new pipeline helpers, 4 lessons
- [Session 034](history/session-034-proy-valuation-dashboard-builders.md) (2026-04-17): T7 PROY/Valuation/Dashboard — 9 SheetBuilders, cascade 20→29 FULL COVERAGE, `buildCfiInput` extraction, 58 new tests, 4 lessons
- [Session 033](history/session-033-computed-builders.md) (2026-04-17): T6 Computed Analysis — 7 SheetBuilders, `writeComputedRowsToSheet` helper, cascade 13→20, 59 new tests, 1 lesson
