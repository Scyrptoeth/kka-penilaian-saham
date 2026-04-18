# Progress — KKA Penilaian Saham

> Latest state after Session 043 — Sidebar Toggles Redesign + Depreciation Bug Fix + AAM IBD Auto-Negate + Dashboard Account-Driven (2026-04-18)

## Verification Results
```
Tests:     1316 / 1316 passing + 1 skipped  (107 files; +28 net since Session 042)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 29/29 MIGRATED_SHEETS
Live:      https://penilaian-bisnis.vercel.app
Store:     v20 (unchanged this session)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    feat/session-043-toggles-depreciation-aam-ibd-dashboard (4 feature commits + 1 docs commit, unpushed at session close)
```

## Session 043 (2026-04-18) — 4 user-reported issues resolved

### Task 1 — Icon-dominant sidebar toggles
- **ThemeToggle** (56×28 pill switch): sun+moon icons, sliding thumb, `role=switch aria-checked`
- **LanguageToggle** (56×28 pill switch): inline SVG flags (UK Union Jack + Indonesia), "EN"/"ID" flanks, sliding flag thumb
- **LogoutButton** (pill): person-with-arrow-right SVG + "LOG OUT" / "KELUAR" text, inverse hover
- SidebarHeader now renders toggles side-by-side (compact control cluster)
- 6 new i18n aria-label keys (adaptive to 4 light/dark × EN/ID combos)

### Task 2 — Depreciation IS row 21 auto-populate bug
- **Root cause** (subtle): `deriveComputedRows` skips rows without `computedFrom`. Row 21 has `type: 'cross-ref'` without `computedFrom`, so its value never reached the output map despite being in the spread INPUT.
- **Fix**: DynamicIsEditor computedValues memo now merges `depCrossRef` into output (`{ ...depCrossRef, ...bare }`), and schedulePersist explicitly injects row 21 into persist sentinels.
- 4 TDD cases lock regression (BUG guard + FIX display + FIX chain + FIX persist).

### Task 3 — AAM IBD retained auto-negate Penyesuaian
- New pure helper `computeIbdAutoAdjustments` in `upstream-helpers.ts` — returns `Record<excelRow, -bsValue>` for CL/NCL rows NOT in exclusion sets.
- `buildAamInput` merges auto-map AFTER `userAdj` so auto wins for retained IBD rows.
- AAM page: retained IBD rows render as locked `<td>` (bilingual tooltip) instead of editable `AdjustmentCell`. Col D shows -C, col E shows 0.
- Equity section untouched — fully user-editable.
- 10 TDD cases covering helper + builder integration + NAV end-to-end.
- i18n key `aam.ibdRetainedLockTitle` bilingual.

### Task 4 — Dashboard account-driven (LESSON-108 audit extended to display)
- User-reported bug: KOMPOSISI NERACA chart all zeros despite BS filled.
- **3 stacked bugs identified**: stale hardcoded `allBs[26]/[40]/[48]` (correct are 27/41/49); even correct positions may be missing for users with extended catalogs; `proyLrRows[6]` was wrong by a completely different mechanism (PROY LR stores Revenue at row 8, LESSON-103 template row translation).
- **New module** `src/lib/dashboard/data-builder.ts` with 3 pure builders + `aggregateBsBySection`:
  - `buildBsCompositionSeries` uses account-driven aggregation as PRIMARY path (NEVER trusts magic rows)
  - `buildRevenueNetIncomeSeries` uses `IS_SENTINEL` + `PROY_LR_ROW` constants
  - `buildFcfSeries` uses `FCF_ROW.FREE_CASH_FLOW` constant
- **New semantic constants** exported from catalog/manifest modules:
  - `BS_SUBTOTAL` in `balance-sheet-catalog.ts` (TOTAL_ASSETS=27, TOTAL_LIABILITIES=41, TOTAL_EQUITY=49, etc.)
  - `PROY_LR_ROW` in `compute-proy-lr-live.ts` (REVENUE=8, NET_PROFIT=39, etc.)
  - `FCF_ROW` in `fcf.ts` (FREE_CASH_FLOW=20, etc.)
- Dashboard page reduced from 8 magic-number sites to thin builder composition.
- 14 TDD cases including extended-catalog regression scenario + constant-value locks.

### Lessons extracted (4)
- **LESSON-122** [PROMOTED]: deriveComputedRows drops cross-ref rows from output — merge cross-ref into display layer AND persist sentinels
- **LESSON-123** [PROMOTED]: Auto-adjustment map at builder boundary — business logic wins over user input for specific rows; UI locks cell
- **LESSON-124** [PROMOTED]: Semantic row constants + account-driven aggregation for display layer — extends LESSON-108 from compute to display
- **LESSON-125** [local]: `role="switch"` requires `aria-checked`, not `aria-pressed`

## Latest Sessions
- [Session 043](history/session-043-toggles-depreciation-aam-ibd-dashboard.md) (2026-04-18): Sidebar Toggles Redesign + Depreciation Bug + AAM IBD Auto-Negate + Dashboard Account-Driven — 4 tasks, 16 files, +1157/-139 LOC, +28 tests, 4 lessons (3 promoted). Feature branch `feat/session-043-*` (4 commits, not yet merged/pushed).
- [Session 042](history/session-042-tax-export-aam-ext-ap-dynamic-resume.md) (2026-04-18): IS Tax Export (600/601) + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page — store v19→v20
- [Session 041](history/session-041-is-revamp-bs-note-ibd-redesign.md) (2026-04-18): IS Revamp + BS Koreksi Fiskal note + IBD scope-page redesign
- [Session 040](history/session-040-extended-injection-sign-reconciliation.md) (2026-04-18): Extended Injection (Proy BS/FA/KD) + KD Sign Reconciliation
- [Session 039](history/session-039-wc-scope-and-dcf-breakdown.md) (2026-04-18): Changes in Working Capital required-gate + DCF inline breakdown

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
- **AAM retained IBD auto-negate at builder boundary (Session 043) — single source of truth for "not counted in NAV" contract**
- IS Koreksi Fiskal + TAXABLE PROFIT synthetic rows 600/601 (exported in Session 042)
- Export pipeline extended-account coverage: BS + IS + FA + PROY BS + PROY FA + KEY DRIVERS Additional Capex + AAM extended + AP schedules
- **Dashboard data-builder module (Session 043) — pure functions with TDD, account-driven + semantic constants pattern. Foundation for future chart additions.**
- IBD scope-editor page; changesInWorkingCapital scope page

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

### UI (Session 043 redesign)
- 3 sidebar toggles: ThemeToggle + LanguageToggle (pill-switch with flag thumb) + LogoutButton (pill with icon + inverse hover)
- All toggles use `role="switch" aria-checked` + bilingual adaptive aria-labels
- Icon-dominant design — text labels removed where icon is unambiguous

## Next Session Priorities

### Session 044+ Backlog

1. **User QA pass + merge feature branch** — before next dev work, user validates 4 Session 043 fixes visually + authorizes merge to main
2. **Upload parser (.xlsx → store)** — reverse direction. Requires IBD scope adapter (Session 041) + AP schedule shape adapter (Session 042 v20) — discuss with user: null-on-upload force re-confirm vs trust mode preserving uploaded structure
3. **Dashboard polish** — now easier post-Session 043 foundation. Add projected FCF chart composing a new builder (Session 036 NV-growth model). Possibly add WACC trend, Simulasi Potensi tax projection.
4. **Multi-case management** (multiple companies in one localStorage)
5. **Cloud sync / multi-device**
6. **Audit trail / change history**
