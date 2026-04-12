# KKA Penilaian Saham — Handoff Document CLI → Cowork

> **Tanggal**: 2026-04-12 (setelah Session 015)
> **Tujuan**: Menyamakan pemahaman antara Claude Code CLI (paling update) dan Cowork
> **Repo**: https://github.com/Scyrptoeth/kka-penilaian-saham
> **Live**: https://kka-penilaian-saham.vercel.app

---

## 1. Apa Proyek Ini

**KKA Penilaian Saham** = website Next.js yang mengkonversi Kertas Kerja Analisis Penilaian Bisnis/Saham dari Excel workbook (`kka-penilaian-saham.xlsx`) ke aplikasi web interaktif untuk Fungsional Penilai DJP (Direktorat Jenderal Pajak).

**PT Raja Voltama Elektrik** yang ada di Excel adalah **contoh studi kasus saja**. Aplikasi ini dibangun secara **system development** — semua kalkulasi derive dari data user, bukan hardcoded dari prototype. Perusahaan mana pun bisa diproses.

**Privacy-first**: Zero network calls untuk data user. Semua client-side. LocalStorage untuk persistence. Tidak ada login, tidak ada server storage.

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| Framework | Next.js (App Router) | 16 |
| UI | React + TypeScript strict | 19 |
| Styling | Tailwind CSS (v4, CSS-first `@theme`) | 4 |
| State | Zustand + persist middleware | 5 |
| Forms | react-hook-form + Zod | 7 + 4 |
| Charts | Recharts (ready, belum dipakai) | 3 |
| Export | ExcelJS (ready, belum dipakai) | 4 |
| Testing | Vitest + Testing Library | 3 |
| Deploy | Vercel | Auto-deploy on push to main |

### Stack Gotchas (KRITIS — baca sebelum coding)

- **Next.js 16 bukan yang ada di training data**. `params`/`searchParams` = `Promise<>`. `middleware.ts` di-rename jadi `proxy.ts`. Baca `node_modules/next/dist/docs/` dulu.
- **Tailwind v4**: Tidak ada `tailwind.config.ts`. Konfigurasi via `@theme inline {}` di `globals.css`.
- **React Compiler**: `watch()` incompatible → pakai `useWatch()`. `setState-in-effect` ditolak → pakai derived state pattern.
- **Zod 4 + RHF**: `.default()` bikin type mismatch → set defaults di `defaultValues` RHF.
- **Turbopack root**: set `turbopack.root: path.resolve(__dirname)` di `next.config.ts` karena multi-lockfile.

---

## 3. Current State (After Session 015)

### Verification
```
Tests:     641 / 641 passing (42 files)
Build:     27 static pages, zero errors
Typecheck: tsc --noEmit clean
Lint:      zero warnings
Store:     v6 (10 slices)
```

### 24 Live Pages

| Grup | Halaman |
|---|---|
| **Input Master** | HOME (form input master, 7 field) |
| **Input Data** | Balance Sheet, Income Statement, Fixed Asset, Key Drivers |
| **Historis** | Balance Sheet, Income Statement, Cash Flow, Fixed Asset |
| **Analisis** | Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate |
| **Proyeksi** | Proy. L/R, Proy. Fixed Asset, Proy. Balance Sheet, Proy. NOPLAT, Proy. Cash Flow |
| **Penilaian** | DLOM, DLOC (PFC), WACC, Discount Rate |

### WIP (belum dibangun)
- **DCF** (Discounted Cash Flow) — next session priority
- **AAM** (Adjusted Asset Method)
- **EEM** (Excess Earning Method)
- **Dashboard** (Recharts visualization)
- **Export .xlsx** (ExcelJS sudah installed, `lib/export/` kosong)

---

## 4. Arsitektur — Bagaimana Data Mengalir

### 4.1 Dua Mode: Seed (Demo) vs Live

```
User buka app pertama kali → home === null → SEED MODE (demo Raja Voltama)
User isi HOME form → home !== null → auto-detect → LIVE MODE (data user)
```

Switching otomatis, zero toggle. Sentinel pattern: `home === null` = demo.

### 4.2 Pipeline Data (Live Mode)

```
User Input (Zustand Store)
    ↓
Historical Data (BS/IS/FA rows × 4 tahun)
    ↓ computeAvgGrowth() → growth rates
    ↓ deriveComputedRows() → subtotals/totals
    ↓
Analysis Pages (FR, FCF, NOPLAT, GR, ROIC, CFS)
    ↓ sign-flip via adapter layer
    ↓
KEY DRIVERS (financial/operational/BS/capex assumptions)
    ↓
Projection Chain:
    PROY FA → PROY LR → PROY BS → PROY NOPLAT → PROY CFS
                   ↓           ↓           ↓            ↓
                   └─── semua feed ke ──→ DCF/AAM/EEM (Session 016)
```

### 4.3 Layer Architecture

```
src/
├── app/                          # Next.js pages (24 routes)
│   ├── page.tsx                  # HOME (server component + client form)
│   ├── input/                    # 4 data entry pages
│   ├── historical/               # 4 historical view pages
│   ├── analysis/                 # 6 analysis pages
│   ├── projection/               # 5 projection pages
│   └── valuation/                # 4 valuation pages
│
├── components/
│   ├── financial/                # FinancialTable, FormulaTooltip, DataSourceHeader, format.ts
│   ├── forms/                    # HomeForm, ManifestEditor, KeyDriversForm, WaccForm, etc.
│   ├── layout/                   # Shell, Sidebar, MobileShell, nav-tree.ts
│   └── ui/                       # Button, Input, Select, Field (design primitives)
│
├── data/
│   ├── manifests/                # 9 SheetManifest definitions (row layout, derivations)
│   ├── seed/                     # Demo fixture loader + fixture JSONs
│   └── live/                     # 15 compute adapters (live mode wiring)
│
├── lib/
│   ├── calculations/             # 19 pure calc modules (TDD, fixture-grounded)
│   ├── store/                    # Zustand store (v6, 10 slices, persist + migrate)
│   ├── schemas/                  # Zod schemas (home.ts)
│   ├── adapters/                 # Sign-flip adapters (fcf, cash-flow, noplat)
│   └── validation/               # Zod validation wrappers
│
└── types/                        # Shared TypeScript types (financial.ts)
```

### 4.4 Key Design Patterns

| Pattern | Penjelasan |
|---|---|
| **Manifest-driven rendering** | Historical/analysis pages defined by `SheetManifest` data → `buildRowsFromManifest()` → `<SheetPage>`. Tambah sheet baru = tulis manifest, zero code change di build system. |
| **Custom page for projections** | PROY pages punya mixed column layouts → custom `'use client'` page with `useMemo`. Bukan manifest. (LESSON-038) |
| **Declarative computedFrom** | Subtotals/totals declared di manifest: `{ computedFrom: [6, -7] }` → auto-computed by `deriveComputedRows()`. Signed refs support subtraction. (LESSON-033) |
| **Adapter layer** | Sign flips centralized: raw data (positive) → adapter (negate per Excel formula) → pure calc. One sign flip per value, one place per flip. (LESSON-011) |
| **YearKeyedSeries** | `Record<number, number>` — year as key, not array index. Zero positional confusion, sparse-year safe. (LESSON-012) |
| **Hydration gate** | Form pages: parent gates `hasHydrated` + `home !== null`, child mounts after gate → `useState(initializer)` seeds from hydrated store. (LESSON-034) |
| **Lazy useMemo per page** | Projection pages compute on navigation, not globally. React selectors trigger re-render only when relevant slice changes. (LESSON-032) |

---

## 5. Store Shape (v6)

```typescript
interface KkaState {
  home: HomeInputs | null                    // 7 field master input
  dlom: DlomState | null                     // 10-factor questionnaire
  dloc: DlocState | null                     // 5-factor questionnaire
  balanceSheet: { rows: Record<number, YearKeyedSeries> } | null
  incomeStatement: { rows: Record<number, YearKeyedSeries> } | null
  fixedAsset: { rows: Record<number, YearKeyedSeries> } | null
  accPayables: { rows: Record<number, YearKeyedSeries> } | null
  wacc: WaccState | null                     // comparable companies + params
  discountRate: DiscountRateState | null      // CAPM params + bank rates
  keyDrivers: KeyDriversState | null         // financial/operational/BS/capex
}
```

Migration chain: v1→v2→v3→v4→v5→v6. Setiap bump menambah slices baru, `null` default. Function `migratePersistedState` exported dan tested.

---

## 6. Excel Dependency Map

```
HOME (master input)
  ├── BALANCE SHEET (4 tahun historis)
  │     ├── CASH FLOW STATEMENT
  │     ├── FINANCIAL RATIO
  │     ├── ROIC
  │     └── GROWTH RATE
  ├── INCOME STATEMENT (4 tahun historis)
  │     ├── CASH FLOW STATEMENT
  │     ├── FINANCIAL RATIO
  │     ├── NOPLAT → FCF
  │     └── GROWTH REVENUE
  ├── FIXED ASSET → FCF, PROY FIXED ASSETS
  ├── KEY DRIVERS → PROY LR
  │
  ├── PROY LR → PROY BS, PROY NOPLAT, PROY CFS
  ├── PROY BS → PROY CFS
  ├── PROY FA → PROY LR (depreciation), PROY BS, PROY CFS
  ├── PROY ACC PAYABLES (hidden) → PROY CFS
  ├── PROY NOPLAT → (future: DCF)
  │
  ├── WACC / DISCOUNT RATE → DCF, EEM
  ├── DLOM → HOME (summary discount)
  └── DLOC → HOME (summary discount)
```

---

## 7. Compute Adapters (src/data/live/)

15 adapters, semua **100% parameterized** (zero hardcoded company values):

| Adapter | Input | Output |
|---|---|---|
| `compute-cash-flow-live.ts` | BS + IS + FA + AP leaves | CFS leaf rows |
| `compute-fcf-live.ts` | NOPLAT + FA + CFS | FCF leaf rows |
| `compute-financial-ratio-live.ts` | BS + IS + CFS + FCF | 18 ratios |
| `compute-growth-rate-live.ts` | ROIC + FA + BS | Growth rate per year |
| `compute-growth-revenue-live.ts` | IS rows | Revenue + NI growth |
| `compute-noplat-live.ts` | IS leaves | NOPLAT leaf rows (effective tax rate) |
| `compute-roic-live.ts` | FCF + BS | ROIC per year |
| `compute-proy-fixed-assets-live.ts` | FA historical | 6-category projected FA |
| `compute-proy-lr-live.ts` | KEY DRIVERS + IS + PROY FA | Projected P&L |
| `compute-proy-bs-live.ts` | BS avg growth + PROY FA + PROY LR | Projected BS |
| `compute-proy-noplat-live.ts` | PROY LR + IS (hist) | Projected NOPLAT |
| `compute-proy-acc-payables-live.ts` | BS loan balances | Loan schedule |
| `compute-proy-cfs-live.ts` | PROY LR + BS + FA + AP | Projected CFS |
| `build-cell-map.ts` | Zustand store slices | CellMap for manifest pipeline |

---

## 8. Session History (15 sessions)

| # | Tanggal | Scope | Key Delivery |
|---|---|---|---|
| 001 | 2026-04-11 | Scaffold + Foundation | Next 16 + TS + Tailwind v4 + Zustand + 34 fixtures |
| 002 | 2026-04-11 | Calc Engines | 6 pure calc modules, 47 tests |
| 003 | 2026-04-11 | Hardening | YearKeyedSeries + Zod validation + adapter layer |
| 004 | 2026-04-11 | UI Tables | FinancialTable + FormulaTooltip + 4 pages |
| 005 | 2026-04-11 | Systematization | SheetPage 11-line pattern |
| 006 | 2026-04-11 | Declarative Derive | DerivationSpec[] replaces callback functions |
| 007 | 2026-04-11/12 | 4 Remaining Pages | CF, FA, NOPLAT, Growth — pure manifest |
| 008 | 2026-04-11/12 | ROIC + DLOM/DLOC | First interactive forms, company-agnostic refactor |
| 009 | 2026-04-12 | Phase 3 Design | 6 architectural decisions, zero code |
| 010 | 2026-04-12 | DataSource + BS Pilot | Live mode foundation, store v2→v3 |
| 011 | 2026-04-12 | IS Input + 3 Downstream | ManifestEditor generic, signed computedFrom |
| 012 | 2026-04-12 | FA + CFS/FCF/ROIC Live | All 9 analysis pages live-mode capable |
| 013 | 2026-04-12 | WACC + DR + Growth Rate | Valuation foundation, store v4→v5 |
| 014 | 2026-04-12 | KEY DRIVERS + PROY FA/LR | Projection chain start, store v5→v6 |
| **015** | **2026-04-12** | **PROY Chain Complete** | **4 PROY sheets + 3-round company-agnostic audit** |

---

## 9. Lessons Learned — Promoted (selalu relevan)

### Framework & Stack
| # | Lesson | Kapan berlaku |
|---|---|---|
| 001 | Next.js 16 breaking changes | Setiap pakai API Next.js |
| 002 | Tailwind v4 `@theme inline` | Setiap ubah design token |
| 004 | `useWatch()` bukan `watch()` | Setiap pakai RHF + React Compiler |
| 007 | Exclude vitest.config dari tsconfig | Setiap tambah Vitest config |
| 016 | Derived state, bukan setState-in-effect | Setiap conditional state dari props/path |

### Excel & Calculation
| # | Lesson | Kapan berlaku |
|---|---|---|
| 009 | openpyxl dual-pass | Setiap extract fixture baru |
| 010 | Label Excel bisa misleading | Setiap implement calc module baru |
| 011 | Sign flips di adapter layer saja | Setiap bikin calc/adapter baru |
| 012 | YearKeyedSeries > number[] | Setiap handle data keuangan |
| 013 | Cross-sheet column offset | Setiap cross-reference antar sheet |
| 035 | Trust fixture formulas, bukan manifest labels | Setiap live migration |
| 036 | WACC vs DR different inputs | Jangan asumsikan symmetry |
| 037 | ROUNDUP ≠ ROUND | Setiap projected value pakai rounding |
| 039 | NOPLAT hist vs proj different sources | Setiap sheet punya mixed-source columns |

### Architecture
| # | Lesson | Kapan berlaku |
|---|---|---|
| 019 | Manifest owns sheet-specific knobs | Setiap tambah sheet baru |
| 021 | Declarative DerivationSpec > callbacks | Setiap derive column baru |
| 023 | Flow sheets skip yoyGrowth | Setiap CF-variant sheet |
| 024 | manifest.columns fully year-agnostic | Setiap manifest baru |
| 028 | Always implement Zustand migrate | Setiap bump store version |
| 029 | App harus company-agnostic | SELALU — prinsip fundamental |
| 030 | Backward-compatible adapter > refactor | Setiap extend pipeline |
| 031 | Auto-detect mode dari domain state | Jangan buat toggle manual |
| 032 | Lazy useMemo per page | Projection/analysis pages |
| 033 | Declarative computedFrom[] | Input pages dengan subtotals |
| 034 | Hydration gate + child mount | Form pages dengan store seed |
| 038 | PROY pages → custom, bukan manifest | Projection pages |
| 041 | Page-level wiring hides case-specific values | Audit setiap page baru |
| 042 | Centralize projection year count | Jangan hardcode [T,T+1,T+2] |

---

## 10. Company-Agnostic Guarantee

Setelah 3 rounds audit di Session 015, **zero hardcoded values dari prototype** di production code path:

| Layer | Status |
|---|---|
| 15 compute adapters | 100% parameterized via typed interfaces |
| 24 page files | 100% data dari store/computed |
| 9 manifests | Generic labels, no company names |
| 19 calc modules | Pure functions, no hardcoded values |
| Form defaults | Indonesian industry standards (22% tax = UU HPP), user-editable |

**Yang di-compute dari data user**:
- Growth rates → `computeAvgGrowth(userIS[row])` — bukan hardcoded 23%
- Tax rates historis → `abs(tax/PBT)` — bukan hardcoded 0
- Tax rates proyeksi → KEY DRIVERS `corporateTaxRate` — user input
- Loan balances → BS store rows 31/38 — bukan hardcoded 0
- Projection years → `PROJECTION_YEAR_COUNT` — 1 constant, ubah sekali

---

## 11. Next Session Priority (016)

**Target: First Share Value Output!**

Semua upstream projection data sudah lengkap:

1. **DCF** — PROY NOPLAT + Discount Rate → present value → equity value per share
2. **AAM** — PROY BS adjusted assets → equity value
3. **EEM** — excess earnings approach → equity value
4. Reconciliation — weighted average → final share value

---

## 12. Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run test             # Vitest single run
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run extract:fixtures # Python: regenerate fixtures dari Excel
npm run seed:sync        # Copy fixtures ke src/data/seed/fixtures/
```

---

## 13. Konvensi

- **Komunikasi**: Bahasa Indonesia. **Code/comments**: English.
- **Commit**: Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`)
- **Testing**: TDD, fixture-grounded @ 3-12 decimal precision.
- **Sign convention**: Store positive, negate in adapters.
- **Financial display**: `font-mono tabular-nums`, negatives in parentheses, right-aligned.

---

*Di-generate oleh Claude Code CLI setelah Session 015 (2026-04-12). Detail per-session: `history/session-NNN-*.md`. Lessons lengkap: `lessons-learned.md`.*
