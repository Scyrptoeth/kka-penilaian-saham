# Progress — KKA Penilaian Saham

> Latest state after Session 046 — Proy FA Alignment + Roll-forward Seed Fix + Asset Disposal Stopping Rule (2026-04-19)

## Verification Results
```
Tests:     1325 / 1325 passing + 1 skipped  (109 files; +2 net since Session 045)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app
Store:     v20 (unchanged this session)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    feat/session-046-proy-fa-alignment-rollforward-fix (3 feature + 1 docs commits, awaiting user visual QA before merge to main)
```

## Session 046 (2026-04-19) — 2 bugs + 1 mid-session rule

### Task 1 — Visual alignment (commit `86a032c`)
- Root cause: 7 separate `<table>` per Proy FA kategori → CSS `table-auto` → per-table column widths → year columns misalign when cell content varies (long IDR values vs "–").
- Fix: 3 unified tables (Acq Cost / Depreciation / Net Value) with `table-fixed` + shared `<colgroup>` (40% label + 60/N% per year). Acq + Dep contain 3 sub-section header rows ("Beginning / Additions / Ending") as `<tr><td colSpan>` inside the same `<tbody>` → preserves semantic hierarchy WITHOUT breaking column alignment.

### Task 2 — Roll-forward seed fix (commit `9098fe0`, part 1)
- Root cause: `computeProyFixedAssetsLive` seeded `acqEndSeries[histYear] = acqEndHist[histYear] ?? 0`. But `DynamicFaEditor.computeFaSentinels` persisted only `FA_SENTINEL_ROWS` (7 subtotals) + legacy-mapped rows — per-account `ACQ_ENDING / DEP_ENDING / NET_VALUE` (manifest-computed via `computedFrom`) never reached the store → `acqEndHist[histYear] = undefined → 0` → first projected Beginning = 0 → undercount cascade in ALL projection years.
- Fix — Opsi 2C (defense in depth):
  - **Layer 1 compute self-heal**: `endAtHist = endHist[histYear] ?? (begHist + addHist)` — zero store changes, self-heals existing localStorage.
  - **Layer 2 sentinel persist**: `computeFaSentinels` Step 5 now writes per-account End + Net Value sentinels on every save. Downstream (NOPLAT / FCF / export / Phase C) now reads correct values directly from store.

### Task 3 — Asset disposal stopping rule (commit `9098fe0`, part 2) — mid-session user instruction
- Rule: `if Net[Y-1] ≤ 0 then Dep Add[Y] = 0` for that account (asset fully depreciated / disposed). Acq Additions continues normally per user spec. Termination boundary for roll-forward projection — prevents Net from drifting indefinitely negative when Dep growth > Acq growth.

### Lessons extracted (5 — 3 promoted)
- **LESSON-132** [PROMOTED]: Sentinel persistence must cover ALL manifest-computed rows downstream consumers read. Generalizes LESSON-056/058 from subtotals to per-account Ending/Net Value.
- **LESSON-133** [PROMOTED]: Compute-side self-healing fallback complements sentinel persist — Opsi 2C defense in depth pattern.
- **LESSON-134** [local]: Asset disposal stopping rule in roll-forward projections (halt Dep when Net ≤ 0).
- **LESSON-135** [PROMOTED]: Audit old test fixtures for realistic semantic coherence when adding state-dependent compute rules. Session 045 fixture had `Acq=0, Net=0` that triggered the new Session 046 stopping rule → fixture updated to `Acq=1000 flat` preserving test intent.
- **LESSON-136** [local]: Unified `<table>` + colSpan sub-section header rows + `table-fixed` colgroup pattern for multi-band financial displays.

## Latest Sessions
- [Session 046](history/session-046-proy-fa-alignment-rollforward-fix.md) (2026-04-19): Proy FA Alignment + Roll-forward Seed Fix + Asset Disposal Stopping Rule — 3 concerns, 4 files, +296/−190 LOC, +2 net tests, 5 lessons (3 promoted). Feature branch awaiting user visual QA before merge to main.
- [Session 045](history/session-045-proy-fa-rollforward-dividers-equity-label.md) (2026-04-19): Proy FA Roll-Forward + Dividers + Equity (100%) — 3 concerns (12 user points), 7 files, +331/-247 LOC, +1 net test, 3 lessons (1 promoted). Merged to main.
- [Session 044](history/session-044-dropdown-autoflip-toggle-polish.md) (2026-04-18): Dropdown Auto-Flip + ThemeToggle icon-on-thumb + Sidebar gap — 3 tasks, 6 files, +254/-37 LOC, +6 tests, 3 lessons (1 promoted).
- [Session 043](history/session-043-toggles-depreciation-aam-ibd-dashboard.md) (2026-04-18): Sidebar Toggles Redesign + Depreciation Bug + AAM IBD Auto-Negate + Dashboard Account-Driven — 4 tasks, 16 files, +1157/-139 LOC, +28 tests, 4 lessons (3 promoted).
- [Session 042](history/session-042-tax-export-aam-ext-ap-dynamic-resume.md) (2026-04-18): IS Tax Export (600/601) + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page.

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v20 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v20 with chained migration v1→v20
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 046 sentinel coverage**: DynamicFaEditor now persists per-account ACQ_ENDING / DEP_ENDING / NET_VALUE alongside the 7 subtotal sentinels — closes LESSON-058 generalization gap.
- **Session 046 compute defense in depth**: `computeProyFixedAssetsLive` self-heals when store lacks manifest-computed rows (derives End = Beg + Add at histYear).
- **Session 046 roll-forward termination**: Net Value ≤ 0 halts Dep Additions (asset disposal semantic).
- Session 045 Proy FA roll-forward model — proper accounting-identity-preserving projections (`computeProyFixedAssetsLive` + `computeFaAdditionsGrowths` helpers).
- `useAutoFlipPosition` hook (Session 044) — reusable floating-UI placement

### Pages (42 total prerendered)
- **Input**: HOME (auto-save onBlur, no SIMPAN button) · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio (thicker section dividers, Session 045) · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · **Proy. FA (Session 046: 3 unified tables with shared colgroup + roll-forward seed self-heal + Net≤0 stopping rule)** · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF (thicker breakdown separators, Session 045) · AAM (Equity Value (100%) label + IBD negative display) · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 047+ Backlog

1. **User visual QA + merge Session 046** — 3 fixes need validation on preview deploy:
   - Year columns sejajar across Acq / Dep / Net tables
   - Dep Inv. Tanaman Sawit End[2021] shows `1.662.516.698` (bukan "–")
   - Net Value positif jika End Acq > End Dep; stopping rule freezes Dep Additions once Net hits 0
   - Business II 1-hist-year: Acq End[2021..2024] = 4.633.090.390 flat (no Additions growth)
2. **Upload parser (.xlsx → store)** — highest-priority backlog item. Reverse of export. Requires IBD scope adapter + AP schedule shape adapter
3. **Dashboard polish** — projected FCF chart via new builder composition (Session 045 roll-forward + Session 046 Proy FA cascade fix; pair with `data-builder.ts` from Session 043)
4. **Multi-case management** (multiple companies in one localStorage)
5. **Cloud sync / multi-device**
6. **Audit trail / change history**

Note on Phase C + cascade: Session 046 compute changes pass Phase C 5/5 and cascade 3/3 unchanged. PROY FA is in coverage-invariant set (Session 035 LESSON-100) so projection value drift doesn't trip strict parity. If future work adds strict PROY parity, update `KNOWN_DIVERGENT_CELLS` per LESSON-112 pattern (grep fixtures for live formula refs first).
