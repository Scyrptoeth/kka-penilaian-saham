# Progress — KKA Penilaian Saham

> Latest state after Session 044 — Dropdown Auto-Flip + Toggle Polish (2026-04-18)

## Verification Results
```
Tests:     1322 / 1322 passing + 1 skipped  (109 files; +6 net since Session 043)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 29/29 MIGRATED_SHEETS
Live:      https://penilaian-bisnis.vercel.app
Store:     v20 (unchanged this session)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — Session 044 merged (fast-forward) + pushed; Vercel prod deploy triggered
```

## Session 044 (2026-04-18) — 3 user-reported UI polish items

### Task 1 & 2 — Dropdown auto-flip for BS + IS +Tambah Akun
- New hook `useAutoFlipPosition` in `src/lib/hooks/useAutoFlipPosition.ts` — `useSyncExternalStore + rAF` pattern (LESSON-126 promoted, LESSON-016 compliant)
- Extracted `AddAccountRow` component from RowInputGrid main `.map()` loop (LESSON-127) — hosts the triggerRef
- `InlineDropdown` takes `triggerRef` + applies conditional `top-full mt-1` vs `bottom-full mb-1` placement
- Propagates for free to BS / IS / FA editors (all delegate to RowInputGrid)
- 4 TDD cases: ample-space, near-bottom-flip, limited-above, null-ref SSR default

### Task 3a — ThemeToggle active icon inside thumb
- Root cause: Session 043 thumb covered the track-side active icon in CSS stacking order
- Fix: active icon now renders INSIDE the thumb (symmetric with LanguageToggle flag-in-thumb pattern)
- Inactive icon remains on track at `opacity-60` as muted indicator
- 2 TDD cases using `vi.mock('next-themes')` for deterministic jsdom control (LESSON-128)

### Task 3b — Sidebar toggle gap
- `SidebarHeader.tsx`: `gap-2` (8px) → `gap-4` (16px). Trivial CSS change

### Lessons extracted (3)
- **LESSON-126** [PROMOTED]: `useSyncExternalStore + rAF` is the React Compiler-compliant alternative to `useLayoutEffect + setState` for DOM-measurement-driven state. Generalizes for any floating-UI / measurement hook.
- **LESSON-127** [local]: `useRef` inside `.map()` is invalid — extract component with stable `key` when per-iteration refs are needed
- **LESSON-128** [local]: Mock `useTheme` directly in jsdom tests — `next-themes` `forcedTheme` prop doesn't propagate `resolvedTheme` reliably

## Latest Sessions
- [Session 044](history/session-044-dropdown-autoflip-toggle-polish.md) (2026-04-18): Dropdown Auto-Flip + ThemeToggle icon-on-thumb + Sidebar gap — 3 tasks, 6 files, +254/-37 LOC, +6 tests, 3 lessons (1 promoted). Merged to main, Vercel prod deploy live.
- [Session 043](history/session-043-toggles-depreciation-aam-ibd-dashboard.md) (2026-04-18): Sidebar Toggles Redesign + Depreciation Bug + AAM IBD Auto-Negate + Dashboard Account-Driven — 4 tasks, 16 files, +1157/-139 LOC, +28 tests, 4 lessons (3 promoted).
- [Session 042](history/session-042-tax-export-aam-ext-ap-dynamic-resume.md) (2026-04-18): IS Tax Export (600/601) + AAM Extended Injection + LESSON-108 Audit + AP Dynamic Catalog + RESUME Page — store v19→v20
- [Session 041](history/session-041-is-revamp-bs-note-ibd-redesign.md) (2026-04-18): IS Revamp + BS Koreksi Fiskal note + IBD scope-page redesign
- [Session 040](history/session-040-extended-injection-sign-reconciliation.md) (2026-04-18): Extended Injection (Proy BS/FA/KD) + KD Sign Reconciliation

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
- AAM retained IBD auto-negate at builder boundary (Session 043)
- IS Koreksi Fiskal + TAXABLE PROFIT synthetic rows 600/601 (exported in Session 042)
- Export pipeline extended-account coverage: BS + IS + FA + PROY BS + PROY FA + KEY DRIVERS Additional Capex + AAM extended + AP schedules
- Dashboard data-builder module (Session 043) — pure functions with TDD, account-driven + semantic constants pattern
- IBD scope-editor page; changesInWorkingCapital scope page
- **Session 044**: `useAutoFlipPosition` hook in `src/lib/hooks/` (first entry) — reusable floating-UI placement decision via `useSyncExternalStore + rAF`, compliant with React Compiler `set-state-in-effect` rule.

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables (dynamic schedules) · **all +Tambah Akun dropdowns now auto-flip above trigger when space below is insufficient (Session 044)**
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. L/R · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

### UI (Session 044 refinements on Session 043 redesign)
- 3 sidebar toggles: ThemeToggle (active icon INSIDE thumb — Session 044 fix) + LanguageToggle (pill-switch with flag thumb) + LogoutButton (pill with icon + inverse hover)
- All toggles use `role="switch" aria-checked` + bilingual adaptive aria-labels
- Icon-dominant design; theme + language toggles now 16px apart (was 8px)
- Auto-flipping dropdowns on all dynamic-catalog input pages

## Next Session Priorities

### Session 045+ Backlog

1. **Upload parser (.xlsx → store)** — reverse of export; requires IBD scope adapter (Session 041) + AP schedule shape adapter (Session 042 v20); discuss: null-on-upload force re-confirm vs trust mode preserving uploaded structure
2. **Dashboard polish** — projected FCF chart via new builder composition (Session 036 NV-growth model); possibly WACC trend + Simulasi Potensi tax projection
3. **Auto-flip hook generalization** — the `useAutoFlipPosition` hook can be reused for future floating UI (tooltips, date-pickers, autocomplete menus) to avoid re-deriving placement logic per component
4. **Multi-case management** (multiple companies in one localStorage)
5. **Cloud sync / multi-device**
6. **Audit trail / change history**
