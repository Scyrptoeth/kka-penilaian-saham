# Progress — KKA Penilaian Saham

> Latest state after Session 045 — Proy FA Roll-Forward + Dividers + Equity (100%) Label (2026-04-19)

## Verification Results
```
Tests:     1323 / 1323 passing + 1 skipped  (109 files; +1 net since Session 044)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 29/29 MIGRATED_SHEETS
Live:      https://penilaian-bisnis.vercel.app
Store:     v20 (unchanged this session)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — Session 045 merged (fast-forward) + pushed; Vercel prod deploy triggered
```

## Session 045 (2026-04-19) — 3 user-reported items

### Task 1 — AAM Equity Value (100%) + IBD negative display
- `aam.equityValue` i18n updated to "Equity Value (100%)" / "Nilai Ekuitas (100%)"
- AAM page IBD row now renders `formatIdr(-r.interestBearingDebt)` with `text-negative` class — symmetric with DLOM/DLOC subtractive rows. Formula unchanged (mathematically identical to `NAV - IBD`).

### Task 2 — Thicker section dividers in FR + DCF
- `FinancialTable.tsx` header rows: `border-t` → `border-t-2` (affects all SheetPage consumers including Financial Ratio)
- DCF page breakdown group separators: `border-b border-grid` → `border-b-2 border-grid-strong` (4 occurrences across historical FCF, projected FCF, PV FCF breakdown)

### Tasks 3-12 — Proy FA roll-forward model
- Rewrote `computeProyFixedAssetsLive` with proper accounting roll-forward:
  - `Acq Add[Y+1] = Acq Add[Y] × (1 + acqAddGrowth)` — growth from historical Acq Additions YoY
  - `Acq Beg[Y+1] = Acq End[Y]` — roll-forward identity
  - `Acq End[Y] = Acq Beg[Y] + Acq Add[Y]` — derived sum
  - Dep bands mirror Acq with their own `depAddGrowth`
  - `Net Value[Y] = Acq End[Y] - Dep End[Y]` — derived
- New exported `computeFaAdditionsGrowths(accounts, faRows) → { acqAdd, depAdd }` helper
- Proy FA page: growth sub-row moved from Net Value band (derived, wrong) to Acq Additions + Dep Additions bands (inputs, correct). All 7 bands now display projected values.
- 9 TDD cases (rewrote 8 + added 1 helper test)
- 1-historical-year → carry-forward (growth=0 default)

### Lessons extracted (3)
- **LESSON-129** [PROMOTED]: Roll-forward projection model with per-band Additions growth — preserves Beginning+Additions=Ending identity. Generalizes to any multi-band flow/stock schedule (Fixed Asset, Working Capital, Debt Maturity, Inventory).
- **LESSON-130** [local]: Display subtractive rows with negative sign + text-negative class for visual consistency in valuation chains
- **LESSON-131** [local]: When styling "thicker divider" spans multiple pages, inspect both shared FinancialTable AND custom page tables (DCF, AAM, EEM) — separate styling infrastructure

## Latest Sessions
- [Session 045](history/session-045-proy-fa-rollforward-dividers-equity-label.md) (2026-04-19): Proy FA Roll-Forward + Dividers + Equity (100%) — 3 concerns (12 user points), 7 files, +331/-247 LOC, +1 net test, 3 lessons (1 promoted). Merged to main, Vercel prod deploy live.
- [Session 044](history/session-044-dropdown-autoflip-toggle-polish.md) (2026-04-18): Dropdown Auto-Flip + ThemeToggle icon-on-thumb + Sidebar gap — 3 tasks, 6 files, +254/-37 LOC, +6 tests, 3 lessons (1 promoted).
- [Session 043](history/session-043-toggles-depreciation-aam-ibd-dashboard.md) (2026-04-18): Sidebar Toggles Redesign + Depreciation Bug + AAM IBD Auto-Negate + Dashboard Account-Driven — 4 tasks, 16 files, +1157/-139 LOC, +28 tests, 4 lessons (3 promoted).
- [Session 042](history/session-042-tax-export-aam-ext-ap-dynamic-resume.md) (2026-04-18): IS Tax Export (600/601) + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page
- [Session 041](history/session-041-is-revamp-bs-note-ibd-redesign.md) (2026-04-18): IS Revamp + BS Koreksi Fiskal note + IBD scope-page redesign

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
- **Session 045 Proy FA roll-forward model** — proper accounting-identity-preserving projections (`computeProyFixedAssetsLive` + `computeFaAdditionsGrowths` helpers); per-band Additions growth replaces Session 036 NV-growth shortcut.
- `useAutoFlipPosition` hook (Session 044) — reusable floating-UI placement

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables (dynamic schedules) · all +Tambah Akun dropdowns auto-flip
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (thicker section dividers, Session 045) · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · **Proy. FA (roll-forward: Acq Add + Dep Add Growth sub-rows, all bands show projected values)** · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · **DCF (thicker breakdown separators, Session 045)** · **AAM (Equity Value (100%) label + IBD negative display)** · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 046+ Backlog

1. **User QA + merge confirmation** — 3 fixes need visual validation (AAM label + IBD negative; FR/DCF thicker dividers; Proy FA growth under Additions)
2. **Upload parser (.xlsx → store)** — highest-priority backlog item. Reverse of export. Requires IBD scope adapter + AP schedule shape adapter
3. **Dashboard polish** — projected FCF chart via new builder composition (Session 036 NV-growth model now gone — use Session 045 roll-forward model for projection chart data)
4. **Multi-case management** (multiple companies in one localStorage)
5. **Cloud sync / multi-device**
6. **Audit trail / change history**

Note on Phase C + cascade: PROY FA projection values may diverge from PT Raja Voltama fixture in future sessions that assert cell-by-cell parity. Current Phase C stays green because PROY sheets live in coverage-invariant set (Session 035 LESSON-100). If future work adds strict PROY parity, update KNOWN_DIVERGENT_CELLS per LESSON-112 pattern (grep fixtures for live formula refs first).
