# Progress — KKA Penilaian Saham

> Latest state after Session 048 — Per-Row Dividers Financial Ratio + DCF (2026-04-19)

## Verification Results
```
Tests:     1328 / 1328 passing + 1 skipped  (109 files; +3 net since Session 046)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app
Store:     v20 (unchanged)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — Session 047 + 048 merged (fast-forward) + pushed; Vercel prod deploys triggered
```

## Session 048 (2026-04-19) — Per-Row Dividers FR + DCF

### User-reported issue
"Pengguna mengalami kesulitan untuk membaca item atau nama akun dan nilai atau valuenya" di ANALYSIS → Financial Ratio dan VALUATION → DCF breakdown groups. Referensi style: existing DCF DISCOUNTING section yang sudah pakai `border-b border-grid` per row.

### Fix (commit `b7d787e`)
- **FinancialTable.tsx**: tambah `border-b border-grid` ke base `<tr>` className di TableRow data branch. Propagates ke semua SheetPage consumers (FR, NOPLAT, ROIC, Growth Revenue, FCF, dst).
- **DCF page.tsx**: 6 `<tr>` di breakdown groups sekarang pakai `border-b border-grid` — historical FCF headline + breakdown, projected FCF headline + breakdown per year, PV of FCF breakdown, Equity → Share Value breakdown (EV, IBD, Surplus, Idle).
- Group separators tebal (`border-b-2 border-grid-strong`) tetap unchanged — visual hierarchy row-level vs group-level tetap jelas.

### Lessons extracted (1)
- **LESSON-138** [local]: `border-b border-grid` per data row for high-density financial tables — threshold >30 cells / inline indented breakdown rows always need it.

## Session 047 (2026-04-19) — Proy FA Net Value Clamp + Sticky Floor Rule

### User-reported issue
4 akun FA (Tanaman Sawit, Bangunan Mess/Barak, Lapangan, Alat Berat, dst.) show Net Value negatif di projection years post-Session-046. Session 046 LESSON-134 halt Dep Add when prev Net ≤ 0, TAPI: (a) tidak clamp Net itself (year pertama raw negative tetap tampil negatif); (b) Acq Add bisa terus grow sementara Dep frozen → raw Net swing back positive, which contradicts "asset disposed" semantic.

### Fix (commit `698f917`)
Di `computeProyFixedAssetsLive` per-account projection loop:
```ts
const rawNet = thisAcqEnd - thisDepEnd
const thisNet = assetDone ? 0 : Math.max(0, rawNet)
```
- Sticky branch (`assetDone`): once prev Net ≤ 0, force 0 forever. Prevents revival.
- Clamp branch: `Math.max(0, rawNet)` for first year Net would be negative.
- Historical year NOT clamped (Opsi A per user) — `netAtHist` preserves user's ground truth.

### Lessons extracted (1)
- **LESSON-137** [PROMOTED]: Domain-clamp + sticky floor pattern for projection outputs that violate semantic rules. Generalizes to any multi-band roll-forward with semantic floor (FA Net, Debt principal, Inventory balance, Retained Earnings in loss scenarios).

## Latest Sessions
- [Session 048](history/session-048-per-row-dividers-fr-dcf.md) (2026-04-19): Per-Row Dividers FR + DCF — 1 task, 2 files, +10/−10 LOC (net 0 — pure style), 0 new tests, 1 lesson (local). Merged to main.
- [Session 047](history/session-047-proy-fa-net-value-clamp.md) (2026-04-19): Proy FA Net Value Clamp + Sticky Floor — 1 task, 2 files, +81/−5 LOC, +3 tests, 1 lesson (promoted). Merged to main.
- [Session 046](history/session-046-proy-fa-alignment-rollforward-fix.md) (2026-04-19): Proy FA Alignment + Roll-forward Seed Fix + Asset Disposal Stopping Rule — 3 concerns, 4 files, +296/−190 LOC, +2 net tests, 5 lessons (3 promoted). Merged to main.
- [Session 045](history/session-045-proy-fa-rollforward-dividers-equity-label.md) (2026-04-19): Proy FA Roll-Forward + Dividers + Equity (100%) — 3 concerns (12 user points), 7 files, +331/-247 LOC, +1 net test, 3 lessons (1 promoted). Merged to main.
- [Session 044](history/session-044-dropdown-autoflip-toggle-polish.md) (2026-04-18): Dropdown Auto-Flip + ThemeToggle icon-on-thumb + Sidebar gap — 3 tasks, 6 files, +254/-37 LOC, +6 tests, 3 lessons (1 promoted).

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v20 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v20 with chained migration v1→v20
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 046 sentinel coverage**: DynamicFaEditor persists per-account ACQ_ENDING / DEP_ENDING / NET_VALUE alongside 7 subtotal sentinels (LESSON-132)
- **Session 046 compute defense in depth**: `computeProyFixedAssetsLive` self-heals when store lacks manifest-computed rows (LESSON-133)
- **Session 046 roll-forward termination (LESSON-134)**: Net Value ≤ 0 halts Dep Additions
- **Session 047 Net Value clamp + sticky floor (LESSON-137)**: Net < 0 clamps to 0 AND stays 0 forever even if Acq grows post-disposal
- Session 045 Proy FA roll-forward model — proper accounting-identity-preserving projections
- `useAutoFlipPosition` hook (Session 044)
- **Session 048 readability**: FinancialTable + DCF breakdown rows now have `border-b border-grid` per row (LESSON-138)

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: **Financial Ratio (per-row dividers, Session 048)** · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · **Proy. FA (Session 046 unified tables + seed self-heal + stopping rule; Session 047 clamp + sticky)** · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · **DCF (Session 045 thicker group separators + Session 048 per-row dividers in breakdown groups)** · AAM (Equity Value (100%) label + IBD negative display) · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 049+ Backlog

1. **Upload parser (.xlsx → store)** — highest-priority backlog item. Reverse of export. Requires IBD scope adapter + AP schedule shape adapter. Architecture discussion: null-on-upload force re-confirm vs trust mode preserving uploaded structure
2. **Dashboard projected FCF chart** — composition via Session 045 roll-forward + Session 047 clamp + Session 043 data-builder
3. **Multi-case management** (multiple companies in one localStorage) — UI to switch between cases
4. **Cloud sync / multi-device** — requires Phase 4 architecture discussion on privacy-first tension (4 options: server DB + login, E2E encrypted, user-managed cloud integration, P2P WebRTC)
5. **Audit trail / change history**

Note on Phase C + cascade: Sessions 046+047+048 pass Phase C 5/5 and cascade 3/3. PROY FA projection drift preserved in coverage-invariant set (Session 035 LESSON-100). Session 048 is pure style, zero compute impact.
