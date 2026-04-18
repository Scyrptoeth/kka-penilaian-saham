# Progress — KKA Penilaian Saham

> Latest state after Session 051 — Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback (2026-04-19)

## Verification Results
```
Tests:     1382 / 1382 passing + 1 skipped  (111 files; +24 net since Session 050)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app (HTTP 200 after auth redirect)
Store:     v21 (bumped in Session 051 — equityProjectionOverrides)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — Session 051 merged fast-forward + pushed; Vercel production deploy live (`3329837`)
```

## Session 051 (2026-04-19) — Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback

### User-requested 3-point spec + system-wide integration

1. **Proy BS growth auto read-only + strict algorithm for sparse accounts.**
   Sparse-historical accounts (manual entry with 1–2 real data years like
   Setara Kas, Hutang PPh Pasal 21/2021) previously extrapolated from a
   single trailing YoY observation (231.9% / 68.4%). Fix applies strict rule:
   need ≥ 2 real YoY observations; else null → "—" + flat projection.
2. **Equity auto-fill editable per-cell independent.** Shareholders' equity
   section no longer projects via growth. Each projection cell defaults to
   historical last-year value + editable per-cell. Edit at year Y does NOT
   cascade to Y+1 / Y-1 — stored via new `equityProjectionOverrides` slice.
3. **KD Additional Capex blank fix at root cause.** Proy FA Additions seed
   fell back to 0 when user didn't entry the histYear cell → multiplicative
   0 × (1+g) stalled forever → KD Additional Capex shows 0. Fix: fallback
   seed = last non-zero historical value when histYear entry is undefined.
   Respects explicit 0 (user intent).

### Delivered (commit `3329837`)

**New helper** — `src/lib/calculations/derivation-helpers.ts`:
- `averageYoYStrict(series, historicalYears): number | null` — strict-≥2-real-YoY algorithm
- 10 TDD cases + Setara Kas real-world case

**Store v20 → v21** — `src/lib/store/useKkaStore.ts`:
- `BalanceSheetInputState.equityProjectionOverrides: Record<excelRow, YearKeyedSeries>`
- Setter `setEquityProjectionOverride(row, year, value | null)` — null clears override
- Migration initializes `{}` on existing balanceSheet (idempotent)

**Compute refactor** — `src/data/live/compute-proy-bs-live.ts`:
- `averageYoYStrict` replaces `computeAvgGrowth` for non-equity leaves
- Section === 'equity' accounts: skip growth, default histYear value, apply overrides
- New optional input `equityOverrides`

**INPUT BS avg column** — `DynamicBsEditor.tsx` + `RowInputGrid.tsx`:
- `growthAverageResolver?` prop injects strict semantic into avg cell render
- Single source of truth: displayed avg = projection multiplier (LESSON-139)

**Proy BS page** — `src/app/projection/balance-sheet/page.tsx`:
- Equity leaves → editable `<NumericInput>` per projection year, no growth row
- Non-equity leaves → read-only value + strict growth row (null → "—")

**Proy FA seed fallback** — `src/data/live/compute-proy-fixed-assets-live.ts`:
- `lastNonZeroHistorical` helper walks years backward for fallback seed
- Applied to ACQ_ADDITIONS + DEP_ADDITIONS
- Explicit 0 at histYear respected (user intent distinguished from missing)

### Lessons extracted (3)
- **LESSON-143** [PROMOTED]: `averageYoYStrict` — projection growth requires ≥ 2 real YoY observations or null/flat fallback; single source of truth across INPUT display + Proy compute (LESSON-139 driver-display sync generalized)
- **LESSON-144** [PROMOTED]: Multiplicative roll-forward projection seed MUST fall back to last non-zero historical when histYear entry is undefined; distinguishes "user typed 0" from "user left blank" via `!= null` check
- **LESSON-145** [local]: Resolver prop pattern for derivation columns — decouple presentational grid from avg computation semantics; caller injects strict vs loose via `(row) => result` function

## Latest Sessions
- [Session 051](history/session-051-proy-bs-strict-growth-equity-capex-seed.md) (2026-04-19): Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback — 10 tasks, 14 files (1 new + 13 modified), +882/−203 LOC, +24 net tests, 3 lessons (2 promoted). Merged to main.
- [Session 050](history/session-050-kd-auto-readonly.md) (2026-04-19): Key Drivers Auto Read-Only — 8 tasks, 9 files (2 new + 7 modified), +667/−434 LOC, +14 net tests, 2 lessons (1 promoted). Merged to main.
- [Session 049](history/session-049-proy-lr-opex-common-size.md) (2026-04-19): Proy. P&L OpEx Merge + Common-Size Projection Drivers — 1 task (refactor), 9 files, +768/−361 LOC, +16 net tests, 2 lessons (1 promoted).
- [Session 048](history/session-048-per-row-dividers-fr-dcf.md) (2026-04-19): Per-Row Dividers FR + DCF — 1 task, 2 files, +10/−10 LOC (net 0 — pure style), 0 new tests, 1 lesson (local).

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v21 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v21 with chained migration v1→v21
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 051 strict avg-growth (`averageYoYStrict`)**: sparse-historical accounts no longer extrapolate from single observation; single source of truth for INPUT BS Avg column AND Proy BS projection multiplier (LESSON-143 + LESSON-139)
- **Session 051 Proy FA Additions seed fallback**: `lastNonZeroHistorical` helper prevents stalled-at-zero projection when user leaves histYear Additions cell blank. Fixes KD Additional Capex display (LESSON-144)
- Session 050 Key Drivers auto read-only (merge-at-persist useMemo, React Compiler compliant)
- Session 046 sentinel coverage + Session 047 Net Value clamp + sticky floor

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84, **strict avg growth**) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers (auto read-only from IS + Proy FA 7-yr) · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: **Proy. BS (Session 051 — strict growth, equity editable per-cell)** · Proy. P&L · Proy. FA · Proy. NOPLAT · Proy. CFS (all 3-year scope)
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 052+ Backlog

1. **User visual QA on Session 051** — verify at:
   (a) `/input/balance-sheet` Average Growth YoY column shows "—" for sparse manual-entry accounts (Setara Kas, Hutang PPh Pasal 21/2021);
   (b) `/projection/balance-sheet` — those accounts stay flat across 2022-2024, growth column = "—";
   (c) Equity section: no growth row, cells editable, edit 2022 does NOT cascade to 2023/2024;
   (d) `/input/key-drivers` Additional Capex section populates with non-zero projected values (Proy FA seed fallback).
2. **Upload parser (.xlsx → store)** — highest-priority backlog. Reverse of export. Needs architecture discussion: null-on-upload force re-confirm (IBD/WC scope slices) vs trust-mode preserving uploaded structure. AP dynamic schedule shape adapter required.
3. **Dashboard projected FCF chart** — leverages Session 045-047 Proy FA + Session 049 uniform Proy LR compute + Session 050 KD auto-capex + Session 051 Proy BS strict growth.
