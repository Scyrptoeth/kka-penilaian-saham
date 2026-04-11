# Phase 3 Roadmap — Sessions 010-014

> **Status**: Master plan sebagai output Session 009 design brainstorm.
> Akan di-refine per session: Session 010 akan rewrite plan.md dengan
> Session 010-only task breakdown saat di-execute. Master plan ini
> tetap di history sebagai design reference.
>
> **Date**: 2026-04-12
> **Total scope**: 5 sessions × ~3 jam = ~15 jam pengembangan untuk Phase 3 lengkap.
> **Approved decisions**: design.md "Phase 3 — Live Data Mode" section, 6 keputusan arsitektural.

---

## Phase 3 Goal

Transform aplikasi dari **demo viewer** ke **tool penilaian aktif**. Setelah
Phase 3 selesai, Penilai DJP bisa:

1. Buka aplikasi
2. Isi HOME form dengan nama perusahaan + identitas kasus
3. Isi `/input/balance-sheet` + `/input/income-statement` + `/input/fixed-asset`
4. Lihat 6 derived sheets (CFS, FR, FCF, NOPLAT, Growth Revenue, ROIC) auto-compute
5. Isi `/valuation/wacc` dengan parameter CAPM
6. Lihat `/valuation/dcf`, `/valuation/aam`, `/valuation/eem` produce final share value
7. `/dashboard` menampilkan summary lengkap dengan DLOM discount + DLOC premium

Semua client-side. Privacy-first. Zero network calls untuk data user.

---

## Session 010 — DataSource Foundation + BS Pilot

**Estimated**: 3 jam, ~10 commits
**Scope**: Build the foundation for live data mode + BS as pilot end-to-end.

### Tasks

1. **Extend Zustand store** (~20 min)
   - Add `balanceSheet: BalanceSheetInputState | null` slice
   - Add `incomeStatement`, `fixedAsset` slices (null placeholders, populated in Session 011-012)
   - Bump persist version v2 → v3 dengan migrate function (preserve home/dlom/dloc, init new slices null)
   - Test: 5 new migration tests covering v2 → v3

2. **Live data adapter** (~30 min)
   - Create `src/data/live/types.ts` — `BalanceSheetInputState`, `IncomeStatementInputState`, `FixedAssetInputState`
   - Create `src/data/live/build-cell-map.ts` — `buildLiveCellMap(manifest, liveData, years): CellMap`
   - Create `src/lib/calculations/year-helpers.ts` — `computeHistoricalYears(tahunTransaksi, count)`
   - Test: ~8 unit tests covering adapter + year derivation edge cases

3. **Manifest extension** (~15 min)
   - Add `historicalYearCount?: 3 | 4` field ke `SheetManifest` type
   - Set di 9 existing manifests (BS/IS = 4, others = 3) — one-line addition each
   - Verify typecheck

4. **Refactor SheetPage to client + mode-aware** (~45 min)
   - Convert `SheetPage.tsx` ke `'use client'`
   - Read store via `useKkaStore` selectors
   - Mode detection: `isLive = home !== null && sheetData !== null`
   - Conditional cells loading (live or seed)
   - `<DataSourceHeader mode={isLive ? 'live' : 'seed'} />` derived from same condition
   - Test: existing 9 financial pages still render seed mode unchanged when home === null

5. **`<RowInputGrid>` reusable component** (~45 min)
   - Client component di `src/components/forms/RowInputGrid.tsx`
   - Props: `rows: ManifestRow[]`, `years: number[]`, `values: Record<number, YearKeyedSeries>`, `onChange`
   - Per row: label kiri + N input fields right (one per year)
   - `<input type="text" inputMode="numeric">` per cell, IBM Plex Mono, tabular-nums
   - Paste handler: strip Rp/dots/commas, parse parentheses sebagai negative
   - Tab navigation native HTML, left-to-right per row
   - Computed rows (subtotal/total) ditampilkan as read-only display, formula sama dengan calc engine
   - Auto-save debounced 500ms via callback prop
   - Test: 6-8 component tests (paste parsing, tab nav, computed rows)

6. **`/input/balance-sheet/page.tsx`** (~30 min)
   - Client component
   - Uses `<RowInputGrid>` dengan `BALANCE_SHEET_MANIFEST`
   - Wires `onChange` ke `setBalanceSheet` store action
   - Hydration guard dengan loading placeholder

7. **Sidebar nav update** (~10 min)
   - Add new "Input Data" group above "Historis"
   - Entry: "Balance Sheet" → `/input/balance-sheet`
   - Other input entries marked `wip: true` (added in Sessions 011-012)

8. **Manual smoke test + verify gauntlet** (~15 min)
   - Build, test, lint, typecheck all green
   - Manual: fresh browser → seed mode di /historical/balance-sheet → header "Mode Demo"
   - Manual: fill HOME form → fill /input/balance-sheet → navigate /historical/balance-sheet → header switches to "live" + table shows live data
   - Production deploy + verify

### Acceptance Criteria
- `npm test`: 133 + ~18-20 new tests passing
- `/historical/balance-sheet` works in BOTH modes (seed when no home, live when filled)
- DataSourceHeader auto-switches mode based on store state
- `/input/balance-sheet` form works: type → debounced save → store updated
- Existing 8 other financial pages still seed-mode (unchanged)
- Production deploy verified live on Vercel

### Deliverables
- 1 new store slice + migration v2→v3
- 3 new lib files (live/types, live/build-cell-map, calculations/year-helpers)
- 1 new component (`<RowInputGrid>`)
- 1 new page (`/input/balance-sheet`)
- 1 modified component (`<SheetPage>`)
- Manifest type extension + 9 manifest field additions
- ~20 new tests
- Updated nav-tree

---

## Session 011 — IS Input + First Downstream Wave

**Estimated**: 3 jam, ~8 commits
**Scope**: Mirror BS pattern untuk Income Statement + wire 4 downstream sheets ke live mode.

### Tasks

1. **`/input/income-statement/page.tsx`** (~30 min)
   - Pattern identik dengan BS: `<RowInputGrid>` + `INCOME_STATEMENT_MANIFEST`
   - Wires ke `setIncomeStatement` store action
   - Subtotal rows (Revenue, Gross Profit, EBITDA, EBIT, NOPAT, Net Profit) computed read-only

2. **Migrate Cash Flow Statement page ke live mode** (~30 min)
   - `src/app/historical/cash-flow/page.tsx`: client component
   - `useMemo` compute CFS dari BS+IS via existing `computeCashFlowStatement` + `toCashFlowInput` adapter
   - Empty state: "Lengkapi BS dan IS dulu untuk melihat Cash Flow"
   - Test: integration test untuk full flow BS+IS → CFS live

3. **Migrate Financial Ratio page ke live mode** (~30 min)
   - Wire ke existing ratio helpers
   - Dependencies: BS + IS
   - Same pattern: useMemo + adapter + empty state

4. **Migrate NOPLAT page ke live mode** (~30 min)
   - Wire ke `computeNoplat` + `toNoplatInput` adapter (already exist)
   - Dependencies: IS only (NOPLAT only needs Profit Before Tax + Interest Inc/Exp + Non-Op + Tax Provision)

5. **Migrate Growth Revenue page ke live mode** (~30 min)
   - Wire ke yoyGrowth derivation
   - Dependencies: IS only
   - 4-year span (special — first sheet to use historicalYearCount=4 in live mode after BS/IS)

6. **Verify gauntlet + smoke test** (~30 min)
   - 5 financial pages live mode capable
   - Filling BS+IS → 4 downstream pages auto-update
   - Production deploy

### Acceptance Criteria
- 5 pages live: BS, IS, CFS, FR, NOPLAT, Growth Revenue (4 derived from BS+IS)
- Each page has empty state when upstream incomplete
- 133 + new tests still passing
- Production smoke test verified

### Deliverables
- 1 new input page (`/input/income-statement`)
- 4 modified pages (CFS, FR, NOPLAT, Growth Revenue → live mode)
- ~10 new tests (integration coverage of BS+IS → derived chain)

---

## Session 012 — Remaining Downstream + Fixed Asset

**Estimated**: 3 jam, ~8 commits
**Scope**: Complete the 9 financial pages live-mode capability, add Fixed Asset input.

### Tasks

1. **`/input/fixed-asset/page.tsx`** (~60 min — most complex input)
   - Category-based form (6 asset categories × Beginning/Additions/Ending × 3 sub-blocks A/B/C = ~54 fields)
   - Reuse `<RowInputGrid>` dengan grouped sections
   - Subtotals auto-computed per sub-block
   - Net Value section auto-computed (Acquisition Ending − Depreciation Ending)

2. **Migrate FCF page ke live mode** (~30 min)
   - Wire ke `computeFcf` + `toFcfInput` adapter (already exist)
   - Dependencies: NOPLAT + Fixed Asset (depreciation + capex via additions/ending)
   - Pre-signed convention (LESSON-011) handled by adapter

3. **Migrate ROIC page ke live mode** (~30 min)
   - Wire ke existing ROIC calc
   - Dependencies: NOPLAT + BS (Total Assets, Excess Cash)
   - 2020-2021 only (no 2019 — needs prior year capital baseline)

4. **All 9 financial pages live mode complete** — verification

5. **Verify gauntlet + smoke test** (~30 min)

### Acceptance Criteria
- All 9 financial pages support live mode
- All 3 input pages (BS, IS, FA) work
- Filling all 3 inputs → all 9 pages display live user data
- Production deploy verified

### Deliverables
- 1 new input page (`/input/fixed-asset`)
- 2 modified pages (FCF, ROIC → live mode)
- ~8 new tests

---

## Session 013 — WACC + DCF (First Valuation)

**Estimated**: 3 jam, ~6 commits
**Scope**: First valuation output. WACC parameters → DCF model → Enterprise Value + Equity Value.

### Tasks

1. **WACC calc engine** (~45 min)
   - `src/lib/calculations/wacc.ts`:
     - CAPM model: `Ke = Rf + β × (Rm − Rf)`
     - WACC = `(E/V × Ke) + (D/V × Kd × (1−T))`
     - Inputs: Beta, Risk-free Rate, Market Premium, Tax Rate, Equity %, Debt %
   - 6+ unit tests against fixture (`__tests__/fixtures/wacc.json` or `discount-rate.json` already exists)

2. **WACC input form** (~30 min)
   - `/valuation/wacc/page.tsx`: 6-input form
   - Live-display computed Ke + WACC
   - Auto-save ke `wacc` store slice

3. **DCF calc engine** (~45 min)
   - `src/lib/calculations/dcf.ts`:
     - Project FCF over 5 years (or use historical FCF + growth assumption)
     - Discount each year by `(1 + WACC)^t`
     - Terminal value via Gordon Growth: `TV = FCF_n × (1+g) / (WACC − g)`
     - Sum present values → Enterprise Value
     - Equity Value = EV − Net Debt
   - 8+ unit tests against fixture (`__tests__/fixtures/dcf.json`)

4. **DCF page** (~30 min)
   - `/valuation/dcf/page.tsx`: read FCF live + WACC live → display projection table + final values
   - Empty states untuk dependencies missing

5. **Verify + deploy**

### Acceptance Criteria
- WACC computed correctly (matches Excel discount-rate fixture)
- DCF computed correctly (matches Excel dcf fixture)
- First **share value output** displayed di production
- 14+ new tests

### Deliverables
- 2 new calc modules (wacc.ts, dcf.ts)
- 2 new pages (`/valuation/wacc`, `/valuation/dcf`)
- New store slices (wacc, possibly dcf for projections)

---

## Session 014 — AAM + EEM + Final Summary

**Estimated**: 3 jam, ~7 commits
**Scope**: Complete the valuation chain. End-to-end share valuation in production.

### Tasks

1. **AAM calc engine + page** (~60 min)
   - Adjusted Asset Method: BS adjustments untuk fair value (revalue land, buildings, etc.)
   - `src/lib/calculations/aam.ts`
   - `/valuation/aam/page.tsx`: form untuk adjustments + display adjusted equity value
   - Tests against `__tests__/fixtures/aam.json`

2. **EEM calc engine + page** (~60 min)
   - Excess Earning Method: AAM + WACC + average earnings
   - `src/lib/calculations/eem.ts`
   - `/valuation/eem/page.tsx`
   - Tests against `__tests__/fixtures/eem.json`

3. **Final Summary Dashboard** (~45 min)
   - `/dashboard/page.tsx`: aggregate DCF + AAM + EEM → average → apply DLOM discount → apply DLOC premium → final share value
   - Recharts visualization (bar chart of 3 methods, gauge for final value)
   - Store integration: read all valuation slices

4. **Verify + deploy + comprehensive end-to-end test**

### Acceptance Criteria
- Full valuation chain works: HOME → BS/IS/FA inputs → derived sheets → WACC → DCF + AAM + EEM → DLOM/DLOC adjustments → final share value
- Dashboard displays summary correctly
- Production deploy verified end-to-end with realistic test case
- App is fully functional company-agnostic tool

### Deliverables
- 2 new calc modules (aam.ts, eem.ts)
- 3 new pages (`/valuation/aam`, `/valuation/eem`, `/dashboard`)
- Recharts integration (first chart in app)
- ~15 new tests

---

## Summary Table

| Session | Focus | New Pages | New Calc Modules | Estimated Tests |
|---|---|---|---|---|
| **010** | DataSource + BS pilot | 1 (BS input) + SheetPage refactor | 0 (uses existing) | ~20 |
| **011** | IS + first downstream | 1 (IS input) + 4 migrated | 0 | ~10 |
| **012** | FA + remaining downstream | 1 (FA input) + 2 migrated | 0 | ~8 |
| **013** | WACC + DCF | 2 (wacc, dcf) | 2 | ~14 |
| **014** | AAM + EEM + Dashboard | 3 (aam, eem, dashboard) | 2 | ~15 |
| **TOTAL** | Phase 3 complete | **8 new + 6 migrated** | **4 new** | **~67 new** |

**Cumulative test count after Phase 3**: 133 (current) + ~67 = **~200 tests**
**Cumulative live pages after Phase 3**: 11 (current) + 8 = **19 financial + valuation pages**

---

## Critical Constraints (carry-over from Sessions 001-008.6)

- **Privacy-first** (Non-negotiable #2): all computation client-side, no network calls untuk user data
- **Calc identik dengan Excel** (Non-negotiable #1): every new calc module TDD against fixture @ 12-decimal precision
- **Manifest is source of truth** (LESSON-019): no sheet-specific code outside manifests, including Phase 3 input forms (forms generated from manifest rows)
- **Pre-signed convention** (LESSON-011): adapters handle sign-flips, pure calc never sign-flips
- **DataSource header mode** (Session 008.6): single switching point at `<DataSourceHeader>` derives mode from `home === null` sentinel
- **Lazy compute** (Decision 4): each downstream page uses `useMemo` from store state, no global reactive graph
- **Backward compat** (Decision 1): zero changes to `build.ts` / `applyDerivations` / derivation primitives — live mode synthesizes CellMap

---

## Lesson Candidates (already drafted, will be promoted at wrap-up of each session)

- **LESSON-030**: Backward-compatible additions > breaking refactor (synthesize CellMap pattern)
- **LESSON-031**: Auto-detect mode dari domain state lebih simpel daripada toggles
- **LESSON-032**: Lazy compute via useMemo per page > global reactive graph

Plus future lessons yang akan emerge per session (input form patterns, paste handler edge cases, dependency resolution gotchas, dll.).

---

## Open Questions for User (to revisit before Session 010)

1. **Default values di input forms**: Empty (user types from scratch) atau pre-filled dari demo (user edits)?
   - **Recommended**: Empty. User selalu ingin input fresh data, tidak rewrite atas demo.

2. **Year span saat HOME `tahunTransaksi` belum diisi**: Default ke current year? Atau disable input pages until HOME filled?
   - **Recommended**: Disable input pages dengan friendly message "Lengkapi HOME form dulu (terutama Tahun Transaksi)".

3. **Multi-case management**: Apakah Phase 3 perlu support multiple companies dalam satu localStorage? Atau selalu 1 case at a time?
   - **Recommended**: 1 case at a time for Phase 3. Multi-case adalah Phase 4 feature.

4. **WACC parameters: hardcode default values atau biarkan user input semua?**
   - **Recommended**: Hardcode reasonable defaults (e.g. Indonesian risk-free rate ~7%, market premium ~6%, tax rate 22%) tapi tetap fully editable.

Pertanyaan ini akan di-finalize saat Session 010 brainstorm di awal.
