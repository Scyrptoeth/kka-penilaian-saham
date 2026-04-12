# KKA Penilaian Saham — Handoff ke Cowork

> **Tujuan dokumen ini**: menyamakan pemahaman Cowork (Claude.ai Projects)
> dengan state terkini yang sudah di-develop via Claude Code CLI selama 12
> sesi pengembangan. Setelah Cowork membaca file ini, Cowork punya mental
> model yang sama dengan CLI untuk diskusi arsitektur, code review, dan
> planning di masa depan.
>
> **Tanggal handoff**: 2026-04-12 (updated after Session 012)
> **CLI state reference**: Session 012 closed (commit `8ce0770`), 14 static
> pages live di production, 476 passing tests, Phase 3 live data mode
> operational untuk **semua 9 financial analysis pages**. Full computation
> chain: IS → NOPLAT → CFS → FCF → ROIC. Financial Ratio 18/18.

---

## Daftar Isi

1. [Project Identity](#1-project-identity)
2. [Current State — Apa yang Sudah Live](#2-current-state)
3. [Architecture — Two-Mode Pipeline](#3-architecture)
4. [Phase 3 Live Data Mode — Key Innovation](#4-phase-3-live-data-mode)
5. [Session History Ringkas (001-012)](#5-session-history)
6. [Lessons Learned — 35 Canonical](#6-lessons-learned)
7. [Design System](#7-design-system)
8. [Non-Negotiables — 6 Prinsip Proyek](#8-non-negotiables)
9. [Excel Dependency Map](#9-excel-dependency-map)
10. [How to Add New Pages — Practical Patterns](#10-how-to-add-new-pages)
11. [Next Session Priorities (013+)](#11-next-session-priorities)
12. [File Structure Key Paths](#12-file-structure)
13. [Development Commands](#13-commands)

---

## 1. Project Identity

| Aspek | Detail |
|---|---|
| **Nama** | KKA Penilaian Saham (Kertas Kerja Analisis Penilaian Bisnis/Saham) |
| **Working Folder** | `/Users/persiapantubel/Desktop/claude/superpowers/kka-penilaian-saham` |
| **Source of Truth** | `kka-penilaian-saham.xlsx` (Excel workbook, committed ke repo) |
| **Repo** | https://github.com/Scyrptoeth/kka-penilaian-saham |
| **Live URL** | https://kka-penilaian-saham.vercel.app |
| **Vercel Project** | `scyrptoeths-projects/kka-penilaian-saham` |
| **Stack** | Next.js 16 + React 19 + TypeScript strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + Vitest 3 |
| **Target User** | Fungsional Penilai DJP (internal Direktorat Jenderal Pajak) |
| **Branding** | 100% privat — no login, no server storage, zero network calls for user data |
| **Persistence** | LocalStorage (Zustand persist middleware v4), auto-save |
| **Export** | Client-side .xlsx via ExcelJS (belum diimplementasikan — `lib/export/` kosong) |

**Konteks bisnis**: mengkonversi workbook Excel yang dipakai Fungsional Penilai
DJP untuk menilai saham/bisnis perusahaan menjadi aplikasi web interaktif.
Workbook prototype adalah `kka-penilaian-saham.xlsx` (case study PT Raja
Voltama Elektrik), tapi app harus company-agnostic — any company, any year.

---

## 2. Current State

### Verification (after Session 012)

```
Tests:     476 / 476 passing (31 files)
Build:     ✅ 20 routes, 14 static pages, zero errors
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Live:      ✅ 15 routes HTTP 200 di production
```

### Live Pages (15 total)

| Group | Pages | Mode |
|---|---|---|
| **Input Master** | HOME | Zustand-persisted form |
| **Input Data** | Balance Sheet, Income Statement, **Fixed Asset** | `<ManifestEditor>` — user enters leaf values, subtotals auto-compute |
| **Historis** | Balance Sheet, Income Statement | Auto-switch seed↔live via domain-state sentinel |
| | **Cash Flow** | **Live**: auto-compute dari BS+IS+FA+AP upstream |
| | Fixed Asset | Auto-switch seed↔live |
| **Analisis** | **Financial Ratio** | **Live: 18/18 ratios** fully computed from BS+IS+CFS+FCF |
| | **FCF** | **Live**: NOPLAT + FA + CFS upstream chain |
| | **NOPLAT** | Live: computed from IS via direct formulas |
| | **Growth Revenue** | Live: IS Revenue + Net Profit → yoyGrowth derivation |
| | **ROIC** | **Live**: FCF + BS invested capital, cross-year IC shift |
| **Penilaian** | DLOM, DLOC (PFC) | Interactive questionnaire forms |

Bold = baru di-wire ke live mode di Session 012. Semua 9 analysis pages sekarang live-mode capable.

### Two Operating Modes

1. **Seed mode** (default): renders prototype workbook data from `__tests__/fixtures/*.json` via seed loader. Warning banner "Mode Demo · Workbook Prototipe" visible. User hasn't filled HOME form.
2. **Live mode** (auto-detected): when `home !== null` AND relevant upstream slices exist in Zustand store. Pages auto-switch — no toggle needed (LESSON-031). User data shown with neutral header.

---

## 3. Architecture

### Core Pipeline (both modes share this)

```
[Data Source]  →  [CellMap]  →  buildRowsFromManifest(manifest, cells)  →  applyDerivations  →  [FinancialRow[]]  →  <FinancialTable>
```

- **Seed mode**: `loadCells(slug)` reads from bundled fixture JSON → real CellMap
- **Live mode**: `buildLiveCellMap(columns, rows, years)` synthesizes a CellMap from Zustand store data → same shape, zero changes to `buildRowsFromManifest` or `applyDerivations`

This "backward-compatible adapter" pattern (LESSON-030) is the core architectural insight: new data sources slot in by producing the same CellMap interface the pipeline already knows how to consume.

### Manifest-Driven Rendering

Every financial sheet has a **manifest** (`src/data/manifests/<sheet>.ts`) that declares:
- `rows: ManifestRow[]` — ordered list of rows with `excelRow`, `label`, `type`, `indent`, `formula`, `computedFrom`
- `columns: Record<number, string>` — year → Excel column letter
- `years: number[]` — historical year span
- `derivations?: DerivationSpec[]` — declarative column-group transforms (commonSize, marginVsAnchor, yoyGrowth)
- `historicalYearCount?: 3 | 4` — live-mode year span

**Page files are trivial** — 11 lines of boilerplate: import manifest, export metadata, render `<SheetPage manifest={X} />`. All sheet-specific knowledge lives in the manifest.

### Calculation Engine

9 pure modules in `src/lib/calculations/`, all TDD against Excel fixtures at 12-decimal precision:
- `balance-sheet.ts` — commonSize, growth
- `income-statement.ts` — yoyGrowth, margin
- `fixed-asset.ts` — schedule per 6 categories
- `noplat.ts` — EBIT chain + tax adjustments
- `fcf.ts` — gross cash flow, working capital, gross investment
- `cash-flow.ts` — CFO, CFI, CFbF, CFF, Net Cash Flow
- `ratios.ts` — 18 financial ratios in 4 sections
- `growth-revenue.ts` — YoY revenue + net income
- `helpers.ts` — shared primitives (ratioOfBase, yoyChange, etc.)

Adapter layer (`src/lib/adapters/`) handles sign-flip conventions between Excel's pre-signed storage and the calc engine's input expectations.

### Store (Zustand v4)

```typescript
interface KkaState {
  home: HomeInputs | null           // 7-field master form
  dlom: DlomState | null            // DLOM questionnaire answers
  dloc: DlocState | null            // DLOC questionnaire answers
  balanceSheet: { rows: Record<number, YearKeyedSeries> } | null
  incomeStatement: { rows: Record<number, YearKeyedSeries> } | null
  fixedAsset: { rows: Record<number, YearKeyedSeries> } | null
  accPayables: { rows: Record<number, YearKeyedSeries> } | null  // Session 012
  // + setters, resetters, _hasHydrated
}
```

Persisted to localStorage via `zustand/persist`. Chained migration v1 → v2 → v3 → v4 ensures no data loss on schema changes (LESSON-028).

---

## 4. Phase 3 Live Data Mode

Phase 3 (Sessions 010-014) transforms the app from "read-only Excel viewer" to "fully interactive company-agnostic valuation tool". Key architectural decisions made in Session 009:

### 4.1 Input Pages via `<ManifestEditor>`

Generic client component (`src/components/forms/ManifestEditor.tsx`) that:
1. Seeds `useState` once from persisted Zustand slice via `getState()` (LESSON-034)
2. Computes historical years from `tahunTransaksi` via `computeHistoricalYears`
3. Auto-computes subtotals via `deriveComputedRows` using manifest `computedFrom`
4. Debounces 500ms persist to store
5. Renders `<RowInputGrid>` — editable cells for leaves, read-only cells for subtotals

Each input page (`/input/balance-sheet`, `/input/income-statement`, `/input/fixed-asset`) is a ~60-line wrapper: hydration gate + HOME guard + `<ManifestEditor>`.

### 4.2 `computedFrom` — Declarative Subtotal Formulas

`ManifestRow.computedFrom?: readonly number[]` declares which rows to aggregate:
- Positive ref = add: `computedFrom: [8, 9, 10]` → sum rows 8+9+10
- **Negative ref = subtract** (Session 011): `computedFrom: [6, -7]` → row 6 minus row 7

This lets IS subtotals (Gross Profit = Revenue − COGS) work without asking users to enter expenses as negative numbers. `deriveComputedRows` in `src/lib/calculations/derive-computed-rows.ts` does a single forward pass resolving leaf values first, then prior computed results (subtotal-of-subtotals).

### 4.3 Downstream Live Wiring via `liveRows` Prop

Sheets that have direct store slices (BS, IS, FA) get live rows from the Zustand store automatically via `SheetPage`'s internal slug lookup.

Downstream sheets (NOPLAT, Growth Revenue, FR, etc.) **don't have their own store slices** — they compute from upstream. Each has a:

1. **Live compute adapter** (`src/data/live/compute-<sheet>-live.ts`) — maps upstream IS/BS values onto the downstream manifest's excelRow numbers
2. **Client wrapper component** (`src/components/analysis/<Sheet>LiveView.tsx`) — reads upstream slices, calls adapter in `useMemo`, passes result as `liveRows` prop to `<SheetPage>`

`liveRows` prop semantics:
- `undefined` → fall back to slug-based store lookup (BS/IS/FA pages)
- `null` → "upstream data missing" → pin to seed mode
- `Record<number, YearKeyedSeries>` → use as live data

### 4.4 Sign Convention: User-Positive Input

Critical design decision: **users enter all values as natural positive numbers** (COGS positive, Tax positive, Depreciation positive). The sign handling is encoded in:
- IS manifest `computedFrom` signs (`[6, -7]` = Revenue minus COGS)
- Downstream compute adapters (e.g., `computeNoplatLiveRows` negates Interest Income)

This differs from the Excel workbook which stores expenses as negative. Tests bridge the gap by flipping fixture expense signs before feeding to `deriveComputedRows` to simulate user input.

### 4.5 Mode Detection (LESSON-031)

Auto-detect from domain state — no explicit toggle:
- `home === null` → seed mode (user hasn't started)
- `home !== null && liveRows !== null` → live mode
- `home !== null && liveRows === null` → seed mode (upstream data missing)

Single sentinel: `home` being null is the "user hasn't started" marker.

---

## 5. Session History

| # | Date | Topic | Key Deliverables | Tests |
|---|---|---|---|---|
| 001 | 04-11 | Scaffold + Foundation | Next 16 + design system + HOME form + 7 calc functions | 21 |
| 002 | 04-11 | Phase 2A — 6 calc engines | FA/NOPLAT/FCF/CashFlow/Ratios/Growth | +26=47 |
| 003 | 04-11 | Phase 2A.5 — Hardening | YearKeyedSeries, Zod validation, adapter layer | +86=133 |
| 004 | 04-11 | Phase 2B P1 — UI tables | FinancialTable, SheetPage, manifests, 4 pages | 133 |
| 005 | 04-11 | Systematization 2B.6 | SheetPage helper, anchorRow/totalAssetsRow | 133 |
| 006 | 04-11 | Declarative derive 2B.6.1 | DerivationSpec primitives, delete historical-derive.ts | 133 |
| 007 | 04-11/12 | 4 remaining pages | CF/FA/NOPLAT/Growth Revenue — pure manifest authoring | 133 |
| 008 | 04-11/12 | ROIC + DLOM/DLOC forms | Interactive questionnaires, Zustand v2, company-agnostic | 133 |
| 009 | 04-12 | Phase 3 design brainstorm | 6 architectural decisions, zero code | 133 |
| 010 | 04-12 | DataSource foundation | Store v3, buildLiveCellMap, RowInputGrid, BS pilot | +36=169 |
| 011 | 04-12 | IS input + downstream | ManifestEditor, signed computedFrom, NOPLAT/GR/FR live | +114=283 |
| **012** | **04-12** | **FA + CFS/FCF/ROIC live** | **All 9 analysis pages live, FR 18/18, store v4** | **+193=476** |

### Session 012 Highlights (latest)

- **Fixed Asset `computedFrom`** — 23 computed rows via 3 manifest helpers (`endingCategoryRows`, `netValueCategoryRows`). Signed refs for Net Value = Acq − Dep.
- **AccPayables Zustand slice** — store v3→v4, dedicated page deferred (YAGNI: prototype all zeros)
- **Cash Flow Statement live** — full CFS from BS+IS+FA+AP. Key complexity: row 8 asymmetric formula (year 1 absolute level vs year 2+ delta). 60 fixture tests.
- **FCF live** — upstream chain: IS→NOPLAT→CFS→FCF. FA provides CapEx + Depreciation addback. 27 tests.
- **ROIC live** — cross-year IC shift (row 13 = prior year's Invested Capital). Year 1 ROIC omitted (no baseline). 21 tests.
- **Financial Ratio 18/18** — all 4 CF ratios now live (CFO/Sales, FCF/CFO, ST Debt Coverage, Capex Coverage). Footer note removed.

### Session 011 Highlights

- **`<ManifestEditor>`** extracted — generic input component, any sheet = ~15 lines wrapper
- **Signed `computedFrom`** — negative ref = subtract. IS subtotals work with user-positive input
- **3 downstream pages live**: NOPLAT, Growth Revenue, Financial Ratio (14/18 at that time)

---

## 6. Lessons Learned — 35 Canonical

35 lessons accumulated across 11 sessions. All stored in `lessons-learned.md` with full context. Here are the **28 promoted** lessons (relevant for 3+ future sessions), grouped by theme:

### Framework / Stack Gotchas
- **001**: Next.js 16 breaking changes — read `node_modules/next/dist/docs/` before using any API. `params`/`searchParams` are `Promise<>`.
- **002**: Tailwind v4 uses `@theme inline` in CSS, not `tailwind.config.ts`
- **003**: ExcelJS replaces SheetJS (2 high-severity vulns in SheetJS community)
- **004**: `useWatch({ control, name })` instead of `watch()` for React Compiler compat
- **005**: Zod 4 `.default()` breaks zodResolver typing — use `DEFAULTS` const instead
- **006**: `export *` from multiple modules fails if duplicate type names exist
- **007**: Vitest config must be excluded from Next.js `tsconfig.json`
- **008**: Multi-lockfile → set `turbopack.root: path.resolve(__dirname)` in `next.config.ts`
- **016**: React Compiler rejects `setState` in effects — derive state from props/equality

### Excel & Data Conventions
- **009**: openpyxl needs dual-pass: `data_only=True` for values, `data_only=False` for formulas
- **010**: Excel column labels can be misleading — test against formulas, not labels
- **011**: Pre-signed convention (`*-1` in formulas) must be isolated in adapter layer
- **012**: `YearKeyedSeries = Record<number, number>` > positional `number[]`
- **013**: Cross-sheet column offset landmine (BS col D=2019, CFS col D=2020)
- **026**: Structurally similar sheets can have different formulas (DLOM vs DLOC)
- **035**: Trust fixture formulas over your own past manifest labels — re-verify before adding `computedFrom`

### Architecture & Patterns
- **018**: Fixture-as-seed — copy `__tests__/fixtures/` to `src/data/seed/fixtures/` via `npm run seed:sync`
- **019**: Manifest owns all sheet-specific knobs — zero hardcoded values in page files
- **021**: Declarative `DerivationSpec[]` beats callback functions for scaling
- **023**: Cash-flow sheets skip `yoyGrowth` — line items cross zero
- **024**: `manifest.columns` map is fully year-agnostic — any column letter, any year count
- **025**: Tactical DRY helpers live inside the manifest file — never promote to `build.ts`
- **028**: Always implement Zustand persist `migrate` when bumping version
- **029**: App must be company-agnostic from day one — workbook is just one case study
- **030**: Backward-compatible additions > breaking refactor — synthesize adapter shapes
- **031**: Auto-detect mode from domain state > explicit toggles
- **032**: Lazy compute via `useMemo` per page > global reactive graph
- **033**: Declarative `computedFrom[]` beats structural indent-based derivation
- **034**: Gate local-state seed via hydration-aware child mount

---

## 7. Design System

**Character**: Authoritative institutional financial tool — Bloomberg Terminal meets Stripe Dashboard.

| Element | Spec |
|---|---|
| **Fonts** | IBM Plex Sans (UI) + IBM Plex Mono (all financial numbers) via `next/font/google` |
| **Canvas** | `#fafaf9` warm off-white |
| **Ink** | `#0a1628` deep navy |
| **Accent** | `#b8860b` muted gold (DJP-adjacent) |
| **Positive/Negative** | emerald-700 / red-700 |
| **Grid** | stone-200 / stone-300 |
| **Radius** | 4px sharp (not rounded-2xl) |
| **Numbers** | `tabular-nums`, monospace, right-aligned, negatives in parentheses |
| **Motion** | 150ms micro, 250ms nav, `transform` + `opacity` only, `prefers-reduced-motion` respected |

CSS variables exposed via `@theme inline` in `globals.css` → Tailwind utilities `bg-canvas`, `text-ink`, `border-grid`, etc.

**BLACKLIST**: Inter/Roboto, blue-purple gradient, centered card grid, `rounded-lg bg-blue-500` buttons, `outline: none` without replacement.

---

## 8. Non-Negotiables

1. **Kalkulasi identik dengan Excel** — setiap calc function TDD terhadap fixture ground truth @ 12-decimal precision
2. **Privacy-first** — zero network calls untuk user data, client-side only, localStorage persistence
3. **UX > Excel** — navigasi intuitif, input validation jelas, error messages informatif
4. **Formula transparency** — user bisa lihat formula Excel (tooltip). Belum fully implemented.
5. **Mobile-responsive** — financial tables horizontal scroll di mobile
6. **Export fidelity** — .xlsx export structurally mirip workbook. Belum diimplementasikan.

---

## 9. Excel Dependency Map

```
HOME (master input — tahunTransaksi, namaPerusahaan, etc.)
  │
  ├── BALANCE SHEET (4 tahun historis)
  │     ├── CASH FLOW STATEMENT (needs BS deltas + IS + ACC PAYABLES)
  │     ├── FINANCIAL RATIO (needs BS + IS + CFS + FCF)
  │     ├── ROIC (needs BS + NOPLAT)
  │     └── RESUME
  │
  ├── INCOME STATEMENT (4 tahun historis)
  │     ├── CASH FLOW STATEMENT
  │     ├── FINANCIAL RATIO
  │     ├── NOPLAT → FCF → ROIC
  │     ├── GROWTH REVENUE
  │     └── CFI
  │
  ├── FIXED ASSET → FCF, DCF, PROY FIXED ASSETS
  ├── NOPLAT → FCF → ROIC, CFI
  ├── WACC / DISCOUNT RATE → DCF, EEM
  ├── AAM → EEM
  ├── DLOC(PFC) → HOME (summary)
  └── DLOM → HOME (summary)
```

Hidden sheets yang harus di-include: `ACC PAYABLES` (CFS working capital), `KEY DRIVERS` (PROY LR), `PROY ACC PAYABLES`, `ADJUSTMENT TANAH`.

---

## 10. How to Add New Pages

### Pattern A: Read-Only Financial Page (seed mode only)

Cost: ~20 menit. Steps:
1. Inspect fixture: `python3 -c "..."` to read `__tests__/fixtures/<sheet>.json`
2. Create manifest: `src/data/manifests/<sheet>.ts` — rows, columns, years, derivations
3. Create page: `src/app/<section>/<sheet>/page.tsx` — 11 lines, import manifest + `<SheetPage>`
4. Add to nav: `src/components/layout/nav-tree.ts`
5. Add seed sync: update `scripts/copy-fixtures.cjs` + `src/data/seed/loader.ts`

### Pattern B: Input Page (live data mode)

Cost: ~30 menit. Steps:
1. Ensure manifest has `computedFrom` on all subtotal/total rows — **VERIFY EVERY ROW AGAINST FIXTURE FORMULAS** (LESSON-035)
2. Create page: `src/app/input/<sheet>/page.tsx` — ~60 lines:
   - Hydration gate (`!hasHydrated → loading`)
   - HOME guard (`!home → empty state + link`)
   - `<ManifestEditor manifest={X} sliceSelector={...} sliceSetter={...} yearCount={...} />`
3. Ensure Zustand store has a slice for the sheet (BS/IS/FA already exist in v3)
4. Remove `wip: true` from nav entry

### Pattern C: Downstream Live Page (computed from upstream)

Cost: ~30 min per page. Steps:
1. Create compute adapter: `src/data/live/compute-<sheet>-live.ts` — maps upstream IS/BS values onto downstream manifest rows
2. Write fixture test: load upstream leaves → compute → assert matches downstream fixture
3. Create view wrapper: `src/components/analysis/<Sheet>LiveView.tsx` — reads upstream slices, `useMemo` compute, passes `liveRows` to `<SheetPage>`
4. Update page: import wrapper, keep metadata export

Sign convention gotcha: user enters expenses positive, workbook stores them negative. Downstream adapters may need to negate values when mapping. **Always verify against fixture before shipping.**

---

## 11. Next Session Priorities

### Session 013 (next)

1. WACC input form (Rf, MRP, beta, tax rate, D/E components) — first fully custom form since DLOM/DLOC
2. Discount Rate computation from WACC
3. DCF valuation — terminal value + PV of projected cash flows
4. First **share value output** — the culmination of the entire tool
5. Estimated: ~14 tests, 2-3 new pages

### Session 014 (upcoming)

| Session | Focus | Outcome |
|---|---|---|
| 014 | AAM + EEM + Dashboard | **Full valuation chain complete** |

### Deferred to Phase 4+

- File upload parsing (.xlsx → live data)
- Multi-case management (multiple companies)
- Cloud sync / multi-device
- Audit trail / change history
- Export to .xlsx via ExcelJS
- Dark mode toggle
- Recharts dashboard expansion

---

## 12. File Structure

```
src/
├── app/
│   ├── layout.tsx                    # Root layout + IBM Plex fonts
│   ├── globals.css                   # CSS vars + @theme + reduced-motion
│   ├── page.tsx                      # HOME (server component)
│   ├── input/
│   │   ├── balance-sheet/page.tsx    # ManifestEditor wrapper
│   │   ├── income-statement/page.tsx # ManifestEditor wrapper (Session 011)
│   │   └── fixed-asset/page.tsx      # ManifestEditor wrapper (Session 012)
│   ├── historical/
│   │   ├── balance-sheet/page.tsx    # SheetPage (auto seed↔live)
│   │   ├── income-statement/page.tsx
│   │   ├── cash-flow/page.tsx        # CashFlowLiveView wrapper (Session 012)
│   │   └── fixed-asset/page.tsx
│   └── analysis/
│       ├── financial-ratio/page.tsx  # FinancialRatioLiveView wrapper
│       ├── noplat/page.tsx           # NoplatLiveView wrapper
│       ├── growth-revenue/page.tsx   # GrowthRevenueLiveView wrapper
│       ├── fcf/page.tsx              # FcfLiveView wrapper (Session 012)
│       └── roic/page.tsx             # RoicLiveView wrapper (Session 012)
├── components/
│   ├── forms/
│   │   ├── ManifestEditor.tsx        # Generic input editor (Session 011)
│   │   ├── RowInputGrid.tsx          # Editable grid for leaves + computed
│   │   ├── NumericInput.tsx          # Single financial number input
│   │   └── HomeForm.tsx              # RHF + Zustand HOME form
│   ├── financial/
│   │   ├── SheetPage.tsx             # Universal manifest renderer (client)
│   │   ├── FinancialTable.tsx        # Read-only table display (server)
│   │   ├── DataSourceHeader.tsx      # Mode-aware seed/live banner
│   │   └── FormulaTooltip.tsx        # Excel formula hover tooltip
│   ├── analysis/
│   │   ├── NoplatLiveView.tsx        # Downstream live wrapper (S011)
│   │   ├── GrowthRevenueLiveView.tsx # Downstream live wrapper (S011)
│   │   ├── FinancialRatioLiveView.tsx# 18/18 ratios (S011→S012)
│   │   ├── CashFlowLiveView.tsx      # BS+IS+FA+AP → CFS (S012)
│   │   ├── FcfLiveView.tsx           # NOPLAT+FA+CFS → FCF (S012)
│   │   └── RoicLiveView.tsx          # FCF+BS → ROIC (S012)
│   └── layout/
│       ├── Shell.tsx, Sidebar.tsx    # App chrome
│       └── nav-tree.ts              # Navigation data
├── data/
│   ├── manifests/                    # 9 SheetManifest declarations
│   │   ├── types.ts                  # SheetManifest, ManifestRow, DerivationSpec
│   │   ├── build.ts                  # buildRowsFromManifest, applyDerivations
│   │   ├── balance-sheet.ts
│   │   ├── income-statement.ts       # Updated S011: computedFrom + relabeled rows
│   │   ├── noplat.ts                 # Updated S011: computedFrom rows 11/17/19
│   │   └── ... (6 more)
│   ├── live/                         # Phase 3 live data adapters
│   │   ├── types.ts                  # BS/IS/FA/AP input state shapes
│   │   ├── build-cell-map.ts         # Synthesize CellMap from store data
│   │   ├── compute-noplat-live.ts    # IS → NOPLAT leaf rows (S011)
│   │   ├── compute-growth-revenue-live.ts  # IS → GR rows (S011)
│   │   ├── compute-financial-ratio-live.ts # BS+IS+CFS+FCF → 18 ratios (S011→S012)
│   │   ├── compute-cash-flow-live.ts # BS+IS+FA+AP → CFS rows (S012)
│   │   ├── compute-fcf-live.ts       # NOPLAT+FA+CFS → FCF rows (S012)
│   │   └── compute-roic-live.ts      # FCF+BS → ROIC rows (S012)
│   └── seed/
│       ├── loader.ts                 # Static fixture imports
│       └── fixtures/                 # Copied from __tests__/fixtures/
├── lib/
│   ├── calculations/
│   │   ├── helpers.ts                # YearlySeries, ratioOfBase, yoyChange, etc.
│   │   ├── derive-computed-rows.ts   # computedFrom resolver (signed refs, S011)
│   │   ├── year-helpers.ts           # computeHistoricalYears
│   │   └── ... (9 calc modules)
│   ├── adapters/                     # Sign-flip adapters for calc engine
│   ├── validation/                   # Zod schemas for calc input
│   ├── store/useKkaStore.ts          # Zustand v4 persist store
│   └── schemas/home.ts              # Zod schema for HomeInputs
└── types/
    ├── financial.ts                  # HomeInputs, YearKeyedSeries
    └── questionnaire.ts             # DLOM/DLOC types

__tests__/
├── fixtures/                         # 34 Excel-extracted JSON ground truth
├── helpers/fixture.ts                # num(), numOpt(), cell index builders
├── lib/calculations/                 # 9 calc module test files
├── data/
│   ├── manifests/
│   │   ├── income-statement-computed-from.test.ts  # IS sign verification (S011)
│   │   └── fixed-asset-computed-from.test.ts       # FA structural verification (S012)
│   └── live/
│       ├── compute-noplat-live.test.ts             # IS→NOPLAT e2e (S011)
│       ├── compute-growth-revenue-live.test.ts     # IS→GR e2e (S011)
│       ├── compute-financial-ratio-live.test.ts    # BS+IS+CFS+FCF→FR e2e (S012)
│       ├── compute-cash-flow-live.test.ts          # BS+IS+FA→CFS e2e (S012)
│       ├── compute-fcf-live.test.ts                # upstream→FCF e2e (S012)
│       └── compute-roic-live.test.ts               # upstream→ROIC e2e (S012)

history/                              # Immutable session history snapshots
├── session-001-scaffold-foundation.md
├── ...
└── session-012-fa-cfs-fcf-roic.md

design.md                            # Persistent architecture decisions
plan.md                              # Volatile per-session plan
progress.md                          # Latest state snapshot (cumulative)
lessons-learned.md                   # Append-only, 35 lessons
```

---

## 13. Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm test                 # Vitest single run (476 tests)
npm run test:watch       # Vitest watch mode
npm run typecheck        # tsc --noEmit
npm run lint             # ESLint (React Compiler enabled)
npm run seed:sync        # Copy fixtures to src/data/seed/fixtures/
npm run extract:fixtures # Python: regenerate __tests__/fixtures/*.json
```

### Test Pattern (for new calc modules)
```ts
import { describe, expect, it } from 'vitest'
import { computeX } from '@/lib/calculations/sheet-name'
import { sheetNameCells, num } from '../../helpers/fixture'

describe('computeX matches Excel fixture', () => {
  it('row N matches', () => {
    expect(computeX(input)).toBeCloseTo(num(cells, 'D8'), 12)
  })
})
```

### Conventional Commits
`feat:` `fix:` `refactor:` `chore:` `docs:` `test:` `perf:` `style:`

---

## Catatan Penutup untuk Cowork

1. **Jangan re-scaffold** yang sudah ada. Tambah halaman = manifest authoring + pattern A/B/C di atas.
2. **Jangan modify `build.ts` atau `applyDerivations`** untuk downstream live mode. Gunakan `liveRows` prop + compute adapter.
3. **Verifikasi terhadap fixture** sebelum ship computed values. Sign errors = user sees wrong numbers = audit tool loses credibility.
4. **`progress.md`** adalah single source of truth untuk latest state. `lessons-learned.md` untuk accumulated wisdom. `design.md` untuk architectural decisions. `history/session-*.md` untuk session snapshots.
5. **Zustand store version = 4**. Jangan bump tanpa chain migration. Jangan change `name` field.
6. **Komunikasi Bahasa Indonesia**, code/comments English.
