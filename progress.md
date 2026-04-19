# Progress — KKA Penilaian Saham

> Latest state after Session 055 — Cluster AB (Invested Capital + Cash Balance + Cash Account scope editors + ROIC rename + Growth Rate NFA single source + CWC multi-year) — 2026-04-19

## Verification Results
```
Tests:     1420 / 1420 passing + 1 skipped  (114 files — net +27 vs Session 054: +8 invested-capital + +8 cash-balance + +7 cash-account + +5 migration + fixture updates)
Build:     ✅ 45 static pages (+3 new: /input/invested-capital, /input/cash-balance, /input/cash-account)
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app HTTP 307 (root redirect — server responsive)
Store:     v23 (bumped — investedCapital + cashBalance + cashAccount slices)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main (Session 055 merged as 4c85d45)
```

## Session 055 (2026-04-19) — Cluster AB: Invested Capital + Cash Balance + Cash Account + ROIC + Growth Rate + CWC

Execution: 18 tracked tasks across 7 feature commits. Parallel agents for reconnaissance (5 × Explore), compute helpers (3 × general-purpose), page editors (3 × general-purpose), consumer rewires (2 × general-purpose). Main thread handled foundation (rename, store migration), critical integration (ROIC rewire, fixture update), verification, git ops.

### User-requested 7-point revision (split into 2 sessions)

Cluster AB delivered in Session 055:
1. **Rename**: "Non Operating Fixed Assets" → "Other Non-Operating Assets" globally
2. **Invested Capital page**: 3 sections (Other Non-Op / Excess Cash / Marketable) × dropdown-add with cross-row mutex + BS + FA source pool + 3 trivia blocks
3. **Growth Rate NFA fix**: Both "Net FA at End" and "Net FA at Beginning" now source from FA row 69 (single source of truth — Q5-B). Plus LESSON-057 merge order fix for dynamic extended-catalog FA accounts.
4. **CWC multi-year display**: matrix year-column layout + Avg column + 1 aggregate trash
5. **Cash Balance + Cash Account**: 2 new scope editors for CFS cash-row sources

Cluster C deferred to Session 056:
6. Financing scope editor

### Key architectural decisions (from Q1-Q8 user answers)

- Cash Balance: 1 unified list + year-shift derive (Q2=A)
- Invested Capital pool: BS + FA detail per-item (Q3=B)
- CWC: matrix + 1 trash aggregate + Avg (Q4=AAA)
- Growth Rate NFA: single source of truth via FA row 69 (Q5=B)
- Gate minimal: IC→ROIC+GR, CB/CA→CFS, no cascade (Q6=A)
- Sidebar: Drivers & Scope alphabetical (Q7=A)
- Migration: single v22→v23 bump + independent Cash Account pool (Q8=A)

### Lessons extracted (3 new — 2 promoted)

- **LESSON-150** [PROMOTED]: Cross-sheet scope editor triple-wiring pattern — view + compute-helper + builder must be updated atomically for new user-curated scope slices. Phase C fixture reconstructs legacy values via curated scope.
- **LESSON-151** [PROMOTED]: Parallel agent delegation scales — Session 055 ran ~11 parallel agent tasks across the session without conflicts by disjoint file ownership + specific briefs.
- **LESSON-152** [local]: `git add -A` + untracked session screenshots is foot-gun — stage explicit paths (reinforces LESSON-081).

## Latest Sessions
- [Session 055](history/session-055-invested-capital-cash-scope-nfa-cwc.md) (2026-04-19): Cluster AB — Invested Capital + Cash Balance + Cash Account + ROIC rename + Growth Rate NFA single source + CWC multi-year. 18 tasks, ~30 new tests, 3 new LESSONs (2 promoted). Store v22→v23.
- [Session 054](history/session-054-input-taxonomy-cwc-cleanup-gr-editor.md) (2026-04-19): INPUT taxonomy reorganization + CWC cleanup + GR editor. Store v21→v22. LESSON-149 promoted.
- [Session 053](history/session-053-ap-beg-editable-fcf-gate-cwc-breakdown.md) (2026-04-19): AP Beginning editable + FCF FA Gate + LESSON-057 merge fix + CWC inline breakdown (later removed). 2 lessons promoted.
- [Session 052](history/session-052-revert-fa-seed-fallback-kd-capex-polish.md) (2026-04-19): Revert FA Seed Fallback + KD Additional Capex Visual Polish. LESSON-146 promoted.

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v23 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v23 with chained migration v1→v23
- Comprehensive i18n: ~665+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 055 scope editor pattern** — 3 new scope editors follow IBD local-draft + confirm pattern. Invested Capital uses novel 3-section dropdown-add with cross-row mutex (different from IBD's flat trash-icon).
- **Session 055 LESSON-108 compliance** — removed ALL hardcoded BS row references in ROIC compute (was `-BS[8]`) and CFS compute (was `BS_CASH_ROWS = [8, 9]`). System fully scope-driven.

### Pages (45 total prerendered)
- **Input Master**: HOME
- **Input Data — Laporan Keuangan**: Acc Payables · Balance Sheet · Fixed Asset · Income Statement
- **Input Data — Drivers & Scope**: **Cash Account (NEW)** · **Cash Balance (NEW)** · Changes in Working Capital · Growth Revenue · **Invested Capital (NEW)** · Key Drivers
- **Input Data — Asumsi Penilaian**: Borrowing Cap · DLOM · DLOC (PFC) · Discount Rate · Interest Bearing Debt · WACC
- **Analysis**: Financial Ratio · FCF · NOPLAT · ROIC (now gated on investedCapital) · Growth Rate (now gated on investedCapital + NFA from FA single source) · Cash Flow Statement (now gated on cashBalance + cashAccount)
- **Projection**: Proy. L/R · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 056 Plan

1. **User visual QA Cluster AB** — verify:
   - (a) Sidebar: 6-item Drivers & Scope alphabetical, 3 new items accessible
   - (b) `/input/invested-capital`: 3 sections with dropdown-add, cross-row mutex working, BS + FA options listed, trivia displays 3 bilingual blocks
   - (c) `/input/cash-balance`: single section + pre-history Beginning input, trivia displays
   - (d) `/input/cash-account`: Bank + OnHand sections, cross-list mutex, soft warning when account not in Cash Balance
   - (e) `/analysis/roic`: gated on investedCapital null, unlocks after confirmation, ROIC values recompute correctly
   - (f) `/analysis/growth-rate`: gated on investedCapital + FA, Net FA End no longer shows "-", Beginning matches prior year End
   - (g) `/input/changes-in-working-capital`: matrix year-column display with Avg column, 1 aggregate trash per row
   - (h) `/analysis/cash-flow-statement`: gated on cashBalance + cashAccount, Cash rows 32/33/35/36 populate from curated scope
2. **Session 056 — Cluster C Financing** (main deliverable):
   - `/input/financing` scope editor — pool = BS equity + IS interest_income + IS interest_expense + IS non_operating
   - Clarify with user: 1 unified list OR 5 lists per CFS row
   - `computeFinancing` helper
   - CFS rewire: replace remaining hardcoded `isLeaves[26]`, `isLeaves[27]`, `apRows[10/19/20]` with financing-scope reads
3. **Upload parser architecture** (carryover from Session 054)
4. **Dashboard projected FCF chart** (backlog)
5. **Extended-catalog smoke test fixture** (LESSON-148 backlog)
