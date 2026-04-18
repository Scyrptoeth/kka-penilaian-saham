# Progress — KKA Penilaian Saham

> Latest state after Session 042 — IS Tax Adjustment Export + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page (2026-04-18)

## Verification Results
```
Tests:     1288 / 1288 passing + 1 skipped  (104 files; +27 net since Session 041)
Build:     ✅ 42 static pages (+1 for RESUME)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 29/29 MIGRATED_SHEETS
Live:      https://penilaian-bisnis.vercel.app
Store:     v20 (schema migration v19→v20 — accPayables schedule shape)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
```

## Session 042 (2026-04-18) — 5 coordinated backlog closures

### Task 1 — IS Tax Adjustment Export (rows 600/601)
- New `injectTaxAdjustmentRows(workbook, state)` writes synthetic rows 600/601 to INCOME STATEMENT sheet
- Row 600 (Koreksi Fiskal): static leaf value from store
- Row 601 (TAXABLE PROFIT): live Excel formula `=<col>32+<col>600` with cached pre-computed result
- Labels at B600/B601 honor state.incomeStatement.language (Fiscal Correction/TAXABLE PROFIT or ID)
- +5 TDD cases

### Task 2 — AAM Extended Injection (excelRow ≥ 100)
- New `injectAamExtendedAccounts` module with per-section synthetic row bands (CA 100-119, NCA 120-139, CL-IBD 140-159, CL-nonIBD 160-179, NCL-IBD 180-199, NCL-nonIBD 200-219, Equity 220-239)
- Per account: label B, static BS value C, adjustment D (from aamAdjustments), live formula `=C+D` at E
- IBD vs non-IBD routing driven by Session 041 exclusion sets — same source of truth as AAM display split (LESSON-119)
- Subtotal append pattern (+SUM) to rows 16/22/32/37/47 per Session 025 BS pattern
- Row 51 NAV subtracts non-IBD extended ranges; Row 52 IBD adds IBD extended ranges
- Formula cell column may differ from SUM range column (e.g. E52 formula with SUM over col C)
- +8 TDD cases

### Task 3 — LESSON-108 Grep Audit
- Scanned NOPLAT/FCF/FR/ROIC compute modules for hardcoded `const *_ROWS = [N, N]` patterns
- **Audit clean** — zero violations found. Session 039 + 041 refactors were thorough.
- Only remaining `_ROWS` patterns are legitimate exceptions:
  - `BS_CASH_ROWS = [8, 9]` in cash-flow-live — Cash Beginning/Ending is a specific line item, not aggregation (inline comment explains)
  - `DLOM_ANSWER_ROWS`/`DLOC_ANSWER_ROWS` — fixed questionnaire structure
- No refactor needed

### Task 4 — AccPayables Dynamic Catalog (4th dynamic catalog)
- Type refactor `AccPayablesInputState = { rows }` → `{ schedules, rows }`
- New `ApSchedule = { id, section, slotIndex, customLabel? }`
- 2 fixed sections: `st_bank_loans` + `lt_bank_loans`
- 3 bands per schedule: Beginning (computed), Addition (signed leaf), Ending (computed = Beg + Add)
- Repayment folded into signed Addition per LESSON-055 plain addition convention
- Default seeds 1 ST + 1 LT schedule
- Band layout: ST_BEG 9 + ext 100-139, ST_ADD 10 + 140-179, ST_END 12 + 180-219; LT_BEG 18 + 220-259, LT_ADD 19 + 260-299, LT_END 21 + 300-339
- Store v19→v20 migration: folds old rows 11+14 into 10 (ST Addition) and 20+23 into 19 (LT Addition); drops Interest Payable data (not consumed downstream)
- Page rewrite at `/input/acc-payables` with dynamic schedules editor (+Add/Rename/Remove per section)
- Deterministic schedule id `${section}_slot${N}` (react-hooks/purity compliant)
- AccPayablesBuilder iterates schedules; writes Beg static + Addition leaf + End live formula + custom labels at col B
- +14 TDD cases (9 catalog + 3 migration + 12 builder − 10 obsolete removed; net +14)

### Task 5 — RESUME Page (`/dashboard/resume`)
- Pure display page — composes `buildAamInput + buildDcfInput + buildEemInput + compute*` via useMemo
- Zero new calc; re-uses existing upstream-helpers
- 3-column × 3-row comparison table (AAM / DCF / EEM × Equity 100% / Equity Portion / Per-Share)
- 3 Metodologi cards with 1 bilingual paragraf each
- Rekomendasi Nilai section with min/midpoint/max range + PMK-79 professional judgment disclaimer
- Required-gates via PageEmptyState on all upstream inputs
- ~28 new i18n keys (resume.* prefix)

### Lessons extracted (2, both session-specific — not promoted)
- **LESSON-120** (local): AAM-style formula-cell vs SUM-range column decoupling — formula lives at E52 but references col C, append must address them separately
- **LESSON-121** (local): Dynamic-catalog sentinel pattern generalizes — AP Beg/End sentinels follow same persist-time pre-compute + formula-band export as FA/BS/IS sentinels

## Latest Sessions
- [Session 042](history/session-042-tax-export-aam-ext-ap-dynamic-resume.md) (2026-04-18): IS Tax Export (600/601) + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog (4th catalog) + RESUME Page — store v19→v20, 5 user tasks, ~25 files, +3383/-562 LOC, +27 tests, 2 lessons (local only). Merged to main
- [Session 041](history/session-041-is-revamp-bs-note-ibd-redesign.md) (2026-04-18): IS Revamp + BS Koreksi Fiskal note + IBD scope-page redesign + isIbdAccount cleanup
- [Session 040](history/session-040-extended-injection-sign-reconciliation.md) (2026-04-18): Extended Injection (Proy BS/FA/KD) + KD Sign Reconciliation
- [Session 039](history/session-039-wc-scope-and-dcf-breakdown.md) (2026-04-18): Changes in Working Capital required-gate + DCF inline breakdown
- [Session 038](history/session-038-ibd-field.md) (2026-04-18): Interest Bearing Debt dedicated page (numeric input — superseded by Session 041 scope-editor redesign)

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 (v20) + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v20 with chained migration v1→v20
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- Sentinel pre-computation across all 4 editors
- Account-driven WC aggregation with shared `resolveWcRows` helper
- AAM section-based input + IBD classification driven by user-curated exclusion sets
- IS Koreksi Fiskal + TAXABLE PROFIT synthetic rows 600/601 (now exported in Session 042)
- Export pipeline extended-account coverage: BS + IS + FA + PROY BS + PROY FA + KEY DRIVERS Additional Capex + AAM extended + AP schedules
- IBD scope-editor page; changesInWorkingCapital scope page

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · **Acc Payables (dynamic schedules — NEW in Session 042)**
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · **RESUME (NEW in Session 042)**

## Next Session Priorities

### Session 043+ Backlog

1. **Upload parser (.xlsx → store)** — reverse direction. Requires IBD scope adapter (Session 041 redesign) + AP schedule shape adapter (Session 042 v20) — needs discussion with user for (a) null-on-upload force re-confirm vs (b) trust mode preserving uploaded structure
2. **Dashboard polish** — projected FCF chart with Session 036 NV-growth model
3. **Multi-case management** (multiple companies in one localStorage)
4. **Cloud sync / multi-device**
5. **Audit trail / change history**
