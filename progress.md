# Progress — KKA Penilaian Saham

> Latest state after Session 050 — Key Drivers Auto Read-Only (2026-04-19)

## Verification Results
```
Tests:     1358 / 1358 passing + 1 skipped  (110 files; +14 net since Session 049)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app (HTTP 200 after auth redirect)
Store:     v20 (unchanged since Session 042)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — Session 050 merged fast-forward + pushed; Vercel production deploy live (`788fb42`)
```

## Session 050 (2026-04-19) — Key Drivers Auto Read-Only

### User-requested 2-point spec
1. Cost & Expense Ratios (COGS / Selling / G&A) → auto-populated read-only from INPUT DATA → Income Statement avg common size. Selling = G&A = ½ × avg Total OpEx common size.
2. Additional Capex section → auto-populated read-only from PROJECTION → Proy. Fixed Asset ADDITIONS band, extended internally to 7 projection years.

### Delivered (commit `788fb42`)

**New pure helper** — `src/lib/calculations/kd-auto-values.ts` (~125 LOC):
- `buildKdAutoValues({ isRows, isHistYears, faAccounts, faRows, faHistYears, projYears })` → `{ cogsRatio, sellingExpenseRatio, gaExpenseRatio, additionalCapexByAccount }`
- Ratios via `averageSeries` leading-zero-skip semantics (Session 037)
- Additional Capex via existing `computeProyFixedAssetsLive` — roll-forward (Session 045) + stopping (LESSON-134) + clamp (LESSON-137) inherited
- Signs stored POSITIVE; export boundary negates via `reconcileRatioSigns` (LESSON-112 preserved)

**Year helper extension** — `src/lib/calculations/year-helpers.ts`:
- `computeProjectionYears(tahunTransaksi, count?)` — default `PROJECTION_YEAR_COUNT = 3` preserved; KD passes `count = 7`
- `PROJECTION_YEAR_COUNT` constant untouched — Proy FA page + Proy LR/BS/NOPLAT/CFS continue at 3-year scope (LESSON-098 discipline)

**Page wiring** — `src/app/input/key-drivers/page.tsx`:
- `kdAuto = useMemo(() => buildKdAutoValues(...))` — reads IS yearCount + FA yearCount independently
- `isAutoRatios` retained for corporate tax rate seed (Financial Drivers section, different derivation base)

**Form refactor** — `src/components/forms/KeyDriversForm.tsx`:
- New `kdAuto?: KdAutoValues | null` prop
- Display reads `kdAuto ?? state.X` inline — auto wins when present
- **Persist via merge-at-save-time `useMemo`** (LESSON-141 NEW PROMOTED) — React Compiler rejects `useEffect + setState` mirror pattern (LESSON-016)
- Cost & Expense Ratios inputs + Additional Capex cells: `readOnly` + `aria-readonly="true"` + italic muted styling + bilingual tooltip
- Bilingual notes above both auto-populated sections

**i18n** — 4 new keys (EN + ID):
- `keyDrivers.autoNote.costRatios`, `keyDrivers.autoNote.additionalCapex`, `keyDrivers.readonly.tooltip.costRatios`, `keyDrivers.readonly.tooltip.capex`

### Lessons extracted (2)
- **LESSON-141** [PROMOTED]: Mirror upstream → store at persist time via `useMemo`, not via `useEffect + setState`. React Compiler setState-in-effect escape hatch — generalizes LESSON-016 from "derive state from props" to the specific case where local state + upstream both contribute to the payload the parent needs.
- **LESSON-142** [local]: Per-slice `yearCount` demands per-slice histYears in multi-slice calc helpers. IS defaults 4 historical years, FA defaults 3; single `histYears` param silently miscomputes at least one. Fixtures should use different year sets per slice to catch.

## Latest Sessions
- [Session 050](history/session-050-kd-auto-readonly.md) (2026-04-19): Key Drivers Auto Read-Only — 8 tasks, 9 files (2 new + 7 modified), +667/−434 LOC, +14 net tests, 2 lessons (1 promoted). Merged to main.
- [Session 049](history/session-049-proy-lr-opex-common-size.md) (2026-04-19): Proy. P&L OpEx Merge + Common-Size Projection Drivers — 1 task (refactor), 9 files, +768/−361 LOC, +16 net tests, 2 lessons (1 promoted).
- [Session 048](history/session-048-per-row-dividers-fr-dcf.md) (2026-04-19): Per-Row Dividers FR + DCF — 1 task, 2 files, +10/−10 LOC (net 0 — pure style), 0 new tests, 1 lesson (local).
- [Session 047](history/session-047-proy-fa-net-value-clamp.md) (2026-04-19): Proy FA Net Value Clamp + Sticky Floor — 1 task, 2 files, +81/−5 LOC, +3 tests, 1 lesson (promoted).

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v20 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v20 with chained migration v1→v20
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 050 Key Drivers auto read-only**: new `buildKdAutoValues` helper centralizes IS-avg-common-size + Proy-FA-7-year-projection derivation. KD Cost & Expense Ratios + Additional Capex now mirror upstream via merge-at-persist useMemo — React Compiler compliant, zero setState-in-effect (LESSON-141)
- Session 046 sentinel coverage + Session 046 compute defense in depth + Session 046 roll-forward termination + Session 047 Net Value clamp + sticky floor
- `useAutoFlipPosition` hook (Session 044)
- Per-row `border-b border-grid` dividers in FinancialTable + DCF breakdown (Session 048)

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · **Key Drivers (Session 050 — Cost & Expense Ratios auto read-only from IS avg common size, Additional Capex auto read-only from Proy FA 7-yr)** · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: Proy. P&L · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS (all 3-year scope)
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 051+ Backlog

1. **User visual QA on Session 050** — verify at `/input/key-drivers`:
   (a) COGS / Selling / G&A fields show percentage values read-only italic muted;
   (b) Selling = G&A exactly (both = ½ × avg Total OpEx common size);
   (c) Hover tooltip "Auto-populated from Income Statement — read only" renders;
   (d) Additional Capex cells populate across 2022–2028 with Session 045 roll-forward values;
   (e) Edit to IS Revenue → KD COGS ratio updates after 500ms debounce;
   (f) Edit to FA Acq Additions → KD Additional Capex updates likewise.
2. **Upload parser (.xlsx → store)** — highest-priority backlog item. Reverse of export. Needs architecture discussion: null-on-upload force re-confirm (IBD/WC scope slices) vs trust-mode preserving uploaded structure. AP dynamic schedule shape adapter required.
3. **Dashboard projected FCF chart** — leverages Session 045-047 Proy FA + Session 049 uniform Proy LR compute + Session 050 KD auto-capex.
4. **Multi-case management** (multiple companies in one localStorage) — UI to switch between cases.
5. **Cloud sync / multi-device** — requires Phase 4 architecture discussion on privacy-first tension.
6. **Audit trail / change history**.
