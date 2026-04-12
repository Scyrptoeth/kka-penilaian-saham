# KKA Penilaian Saham — Handoff Document CLI → Cowork

> **Tanggal**: 2026-04-13 (setelah Session 016)
> **Tujuan**: Menyamakan pemahaman antara Claude Code CLI (paling update) dan Cowork
> **Repo**: https://github.com/Scyrptoeth/kka-penilaian-saham
> **Live**: https://kka-penilaian-saham.vercel.app

---

## 1. Apa Proyek Ini

**KKA Penilaian Saham** = website Next.js yang mengkonversi Kertas Kerja Analisis Penilaian Bisnis/Saham dari Excel workbook (`kka-penilaian-saham.xlsx`) ke aplikasi web interaktif untuk Fungsional Penilai DJP (Direktorat Jenderal Pajak).

**PT Raja Voltama Elektrik** yang ada di Excel adalah **contoh studi kasus saja**. Aplikasi ini dibangun secara **system development** — semua kalkulasi derive dari data user, bukan hardcoded dari prototype. Perusahaan mana pun bisa diproses.

**Privacy-first**: Zero network calls untuk data user. Semua client-side. LocalStorage untuk persistence. Tidak ada login, tidak ada server storage.

**Milestone Session 016**: Aplikasi sudah menghasilkan **nilai per saham** lewat 3 metode valuasi (DCF, AAM, EEM). Ini milestone pertama setelah 16 sesi pengembangan.

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

## 3. Current State (After Session 016)

### Verification
```
Tests:     691 / 691 passing (47 files)
Build:     30 static pages, zero errors
Typecheck: tsc --noEmit clean
Lint:      zero warnings
Store:     v7 (11 slices)
```

### 28 Live Pages

| Grup | Halaman |
|---|---|
| **Input Master** | HOME (form input master, 7 field) |
| **Input Data** | Balance Sheet, Income Statement, Fixed Asset, Key Drivers |
| **Historis** | Balance Sheet, Income Statement, Cash Flow, Fixed Asset |
| **Analisis** | Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate |
| **Proyeksi** | Proy. L/R, Proy. Fixed Asset, Proy. Balance Sheet, Proy. NOPLAT, Proy. Cash Flow |
| **Penilaian** | DLOM, DLOC (PFC), WACC, Discount Rate, **Borrowing Cap**, **DCF**, **AAM**, **EEM** |

### WIP (belum dibangun)
- **RESUME** (ringkasan perbandingan DCF/AAM/EEM)
- **CFI** (Cash Flow to Investor)
- **Dashboard** (Recharts visualization)
- **Export .xlsx** (ExcelJS sudah installed, `lib/export/` kosong)
- **nilaiNominalPerSaham** field di HOME (untuk AAM par-value deduction yang benar)

---

## 4. Arsitektur — Bagaimana Data Mengalir

### 4.1 Dua Mode: Seed (Demo) vs Live

```
User buka app pertama kali → home === null → SEED MODE (demo Raja Voltama)
User isi HOME form → home !== null → auto-detect → LIVE MODE (data user)
```

Switching otomatis, zero toggle. Sentinel pattern: `home === null` = demo.

### 4.2 Pipeline Data (Live Mode) — UPDATED Session 016

```
User Input (Zustand Store v7)
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
    ↓                                              ↓
    └─────────────────── semua feed ke ────────────┘
                          ↓
    ┌─────────────────────┼─────────────────────────┐
    │                     │                         │
  DCF                   AAM                       EEM
  (projected FCF        (adjusted BS              (historical FCF
   + terminal value      + NAV formula             + Borrowing Cap rate
   + WACC discount)      + DLOM/DLOC)              + excess earning)
    │                     │                         │
    └─── computeShareValue() ── DLOM → DLOC → ROUNDUP → per share ──┘
```

### 4.3 Layer Architecture

```
src/
├── app/                          # Next.js pages (28 routes)
│   ├── page.tsx                  # HOME (server component + client form)
│   ├── input/                    # 4 data entry pages
│   ├── historical/               # 4 historical view pages
│   ├── analysis/                 # 6 analysis pages
│   ├── projection/               # 5 projection pages
│   └── valuation/                # 8 valuation pages (was 4, +4 in Session 016)
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
│   ├── calculations/             # 14 pure calc modules (was 9, +5 in Session 016)
│   │   ├── share-value.ts        # [NEW S016] Shared equity→DLOM→DLOC→ROUNDUP→perShare
│   │   ├── borrowing-cap.ts      # [NEW S016] CALK borrowing capacity + weighted avg return
│   │   ├── dcf.ts                # [NEW S016] DCF with Gordon Growth terminal value
│   │   ├── aam-valuation.ts      # [NEW S016] Adjusted Asset Method
│   │   ├── eem-valuation.ts      # [NEW S016] Excess Earnings Method
│   │   ├── discount-rate.ts      # [MOD S016] Added buildDiscountRateInput()
│   │   ├── helpers.ts            # [MOD S016] Added roundUp()
│   │   └── ...                   # balance-sheet, income-statement, wacc, etc.
│   │
│   ├── store/                    # Zustand store (v7, 11 slices, persist + migrate)
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
| **Custom page for projections + valuations** | PROY dan valuation pages punya mixed column layouts → custom `'use client'` page with `useMemo`. Bukan manifest. (LESSON-038) |
| **Declarative computedFrom** | Subtotals/totals declared di manifest: `{ computedFrom: [6, -7] }` → auto-computed by `deriveComputedRows()`. Signed refs support subtraction. (LESSON-033) |
| **Adapter layer** | Sign flips centralized: raw data (positive) → adapter (negate per Excel formula) → pure calc. One sign flip per value, one place per flip. (LESSON-011) |
| **YearKeyedSeries** | `Record<number, number>` — year as key, not array index. Zero positional confusion, sparse-year safe. (LESSON-012) |
| **Hydration gate** | Form pages: parent gates `hasHydrated` + `home !== null`, child mounts after gate → `useState(initializer)` seeds from hydrated store. (LESSON-034) |
| **Lazy useMemo per page** | Projection/valuation pages compute on navigation, not globally. React selectors trigger re-render only when relevant slice changes. (LESSON-032) |
| **buildDiscountRateInput()** | [NEW S016] Centralized store→DiscountRateInput mapping. Prevents debtRate-class bugs. All pages yang butuh DR harus pakai ini, JANGAN construct input manual. (LESSON-043) |
| **computeShareValue()** | [NEW S016] Shared equity→share value tail untuk DCF + EEM. AAM tidak pakai (format berbeda — no ROUNDUP/perShare). |

---

## 5. Store Shape (v7) — UPDATED Session 016

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
  borrowingCapInput: BorrowingCapInputState | null  // [NEW S016] CALK values
}
```

Migration chain: v1→v2→v3→v4→v5→v6→v7. Setiap bump menambah slices baru, `null` default. Function `migratePersistedState` exported dan tested.

**BorrowingCapInputState** (v7):
```typescript
interface BorrowingCapInputState {
  piutangCalk: number   // CALK Piutang — external data, user input
  persediaanCalk: number // CALK Persediaan — external data, user input
}
```

---

## 6. Session 016 — Apa yang Baru (DETAIL)

### 6.1 Lima Modul Kalkulasi Baru

| Modul | Input | Output | Tests |
|---|---|---|---|
| `share-value.ts` | equityValue, DLOM%, DLOC%, proporsi, jumlahSaham | dlomDiscount, equityLessDlom, dlocDiscount, mv100, mvPortion, rounded, perShare | 5 |
| `borrowing-cap.ts` | CALK values, BS receivables/inventory/FA, DR kd/ke | borrowingCap per asset, weights, waccTangible | 6 |
| `aam-valuation.ts` | BS last-year (all rows), faAdjustment, DLOM/DLOC%, proporsi | adjusted BS, NAV, equity, DLOM, DLOC, marketValue, finalValue | 15 |
| `dcf.ts` | historical + projected NOPLAT/CFS/FA, WACC, growthRate, IBD, excessCash | FCF per year, discountFactors, pvFcf, terminalValue, enterpriseValue, equityValue100 | 13 |
| `eem-valuation.ts` | AAM adjusted data, BC rate, historical NOPLAT/CFS/FA, WACC | netTangibleAsset, earningReturn, fcf, excessEarning, capitalizedExcess, equityValue100 | 10 |

### 6.2 Empat Halaman Baru

**`/valuation/borrowing-cap`** — Rate of Return on Net Tangible Assets
- Input CALK (piutangCalk, persediaanCalk) — external data dari Catatan Atas Laporan Keuangan
- 70% borrowing percentage for fixed assets (named constant `BORROWING_PERCENT_DEFAULT`)
- Output: weighted average return rate yang dipakai EEM

**`/valuation/dcf`** — Discounted Cash Flow
- Full upstream chain: historical → PROY FA → PROY LR → PROY NOPLAT → PROY BS → PROY AP → PROY CFS → DCF
- Gordon Growth terminal value: `FCF_last × (1+g) / (WACC-g)` — allows g > r when FCF negative (LESSON-045)
- Equity → Share: via shared `computeShareValue()` with DLOM from home, DLOC = 0

**`/valuation/aam`** — Adjusted Asset Method
- 3-column layout: Historical (C), Adjustments (D), Adjusted (E)
- NAV formula khusus: Total Assets - (AP + Tax + Others) - Related Party NCL — bukan total liabilities
- IBD (Interest Bearing Debt) dari HISTORICAL values (C column), bukan adjusted
- DLOM dan DLOC dari `home.dlomPercent` / `home.dlocPercent`
- Tidak ada ROUNDUP / perShare — format sesuai Excel
- `paidUpCapitalDeduction` = jumlahSahamBeredar (assumes par value Rp 1 — TODO)

**`/valuation/eem`** — Excess Earnings Method
- Uses HISTORICAL FCF only (bukan projected — beda dari DCF)
- Net Tangible Asset dari AAM adjusted values
- Normal return = NTA × Borrowing Cap rate
- Excess Earning = FCF - Normal Return → capitalize by WACC → goodwill proxy
- Enterprise = NTA + capitalized excess → equity via share value tail

### 6.3 System Hardening (post-delivery audit)

Bug ditemukan dan diperbaiki di sesi yang sama:

1. **debtRate 100× bug** — 3 pages pakai raw average bank rate (`9.41`) alih-alih `computeDebtRateFromBanks()` yang konversi ke desimal (`0.094`). Fix: extract `buildDiscountRateInput()` shared helper.
2. **idleAsset hardcoded 0** → sekarang computed dari ROIC rows.
3. **borrowingPercent magic 0.7** → named constant `BORROWING_PERCENT_DEFAULT`.
4. **Dead field `fixedAssetBeginning`** → removed dari AamInput.

---

## 7. Excel Dependency Map — UPDATED Session 016

```
HOME (master input)
  ├── BALANCE SHEET (4 tahun historis)
  │     ├── CASH FLOW STATEMENT
  │     ├── FINANCIAL RATIO
  │     ├── ROIC → Growth Rate
  │     ├── AAM (adjusted BS)
  │     └── DCF / EEM (IBD = BS!F31 + F38)
  ├── INCOME STATEMENT (4 tahun historis)
  │     ├── CASH FLOW STATEMENT
  │     ├── FINANCIAL RATIO
  │     ├── NOPLAT → FCF → EEM (historical FCF)
  │     └── GROWTH REVENUE
  ├── FIXED ASSET → FCF, PROY FIXED ASSETS, AAM (adjustment)
  ├── KEY DRIVERS → PROY LR
  │
  ├── PROY LR → PROY BS, PROY NOPLAT, PROY CFS
  ├── PROY BS → PROY CFS
  ├── PROY FA → PROY LR, PROY BS, PROY CFS
  ├── PROY ACC PAYABLES (hidden) → PROY CFS
  ├── PROY NOPLAT → DCF (projected NOPLAT)
  │
  ├── WACC / DISCOUNT RATE → DCF (WACC=H10), EEM (capitalization rate)
  ├── GROWTH RATE → DCF (terminal value growth)
  ├── BORROWING CAP → EEM (return rate on tangible assets)
  ├── AAM → EEM (adjusted NTA components)
  ├── DLOM → HOME summary → DCF/AAM/EEM
  └── DLOC → HOME summary → AAM (DCF/EEM use 0)
```

### DLOM/DLOC Divergence Antar Metode

| | DCF | AAM | EEM |
|---|---|---|---|
| **DLOM** | `home.dlomPercent` | `home.dlomPercent` | `home.dlomPercent` |
| **DLOC** | 0 (per fixture) | `home.dlocPercent` | 0 (per fixture) |

Fixture Excel punya DLOM yang berbeda antar metode (AAM=30%, DCF/EEM=40%), tapi untuk company-agnostic semua pakai `home.dlomPercent` dari questionnaire. DCF dan EEM tidak apply DLOC (B36/C37 = 0 literal di fixture).

---

## 8. Compute Adapters + Calc Modules

### 15 Compute Adapters (src/data/live/)

| Adapter | Input | Output |
|---|---|---|
| `compute-cash-flow-live.ts` | BS + IS + FA + AP leaves | CFS leaf rows |
| `compute-fcf-live.ts` | NOPLAT + FA + CFS | FCF leaf rows |
| `compute-financial-ratio-live.ts` | BS + IS + CFS + FCF | 18 ratios |
| `compute-growth-rate-live.ts` | ROIC + FA + BS | Growth rate per year |
| `compute-growth-revenue-live.ts` | IS rows | Revenue + NI growth |
| `compute-noplat-live.ts` | IS leaves | NOPLAT leaf rows |
| `compute-roic-live.ts` | FCF + BS | ROIC per year |
| `compute-proy-fixed-assets-live.ts` | FA historical | 6-category projected FA |
| `compute-proy-lr-live.ts` | KEY DRIVERS + IS + PROY FA | Projected P&L |
| `compute-proy-bs-live.ts` | BS avg growth + PROY FA + PROY LR | Projected BS |
| `compute-proy-noplat-live.ts` | PROY LR + IS (hist) | Projected NOPLAT |
| `compute-proy-acc-payables-live.ts` | BS loan balances | Loan schedule |
| `compute-proy-cfs-live.ts` | PROY LR + BS + FA + AP | Projected CFS |
| `build-cell-map.ts` | Zustand store slices | CellMap for manifest pipeline |

### 14 Pure Calc Modules (src/lib/calculations/)

| Module | Fungsi | Tests |
|---|---|---|
| `balance-sheet.ts` | Common size + growth BS | TDD |
| `income-statement.ts` | Margin + growth IS | TDD |
| `cash-flow-statement.ts` | CFS dari BS+IS | TDD |
| `fixed-asset.ts` | FA schedule | TDD |
| `noplat.ts` | NOPLAT dari IS | TDD |
| `fcf.ts` | Free cash flow | TDD |
| `financial-ratios.ts` | 18 financial ratios | TDD |
| `wacc.ts` | WACC comparable companies | TDD |
| `discount-rate.ts` | CAPM BU/BL/Ke/Kd/WACC + `buildDiscountRateInput()` | TDD |
| **`share-value.ts`** | [S016] Shared equity→DLOM→DLOC→perShare | 5 tests |
| **`borrowing-cap.ts`** | [S016] CALK borrowing + weighted return | 6 tests |
| **`dcf.ts`** | [S016] DCF + Gordon Growth terminal value | 13 tests |
| **`aam-valuation.ts`** | [S016] Adjusted Asset Method | 15 tests |
| **`eem-valuation.ts`** | [S016] Excess Earnings Method | 10 tests |

---

## 9. Session History (16 sessions)

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
| 015 | 2026-04-12 | PROY Chain Complete | 4 PROY sheets + 3-round company-agnostic audit |
| **016** | **2026-04-12/13** | **DCF + AAM + EEM** | **First share value output! Store v6→v7. 5 calc modules, 4 pages, 49 tests. System hardening: debtRate bug + buildDiscountRateInput()** |

---

## 10. Lessons Learned — Promoted (selalu relevan)

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
| **044** | **[S016] Verify fixture E/F columns independently** | **Jangan trust prompt analysis — baca fixture JSON langsung** |
| **045** | **[S016] Gordon Growth allows g > r when FCF negative** | **Jangan over-guard terminal value. Guard hanya g === r (div/0)** |

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
| 032 | Lazy useMemo per page | Projection/analysis/valuation pages |
| 033 | Declarative computedFrom[] | Input pages dengan subtotals |
| 034 | Hydration gate + child mount | Form pages dengan store seed |
| 038 | PROY/valuation pages → custom, bukan manifest | Projection + valuation pages |
| 041 | Page-level wiring hides case-specific values | Audit setiap page baru |
| 042 | Centralize projection year count | Jangan hardcode [T,T+1,T+2] |
| **043** | **[S016] buildDiscountRateInput() — centralize store→input** | **WAJIB pakai saat consume Discount Rate. Jangan construct manual — sudah proven bug.** |

---

## 11. Company-Agnostic Status

| Layer | Status | Catatan |
|---|---|---|
| 20 compute adapters | 100% parameterized | via typed interfaces |
| 28 page files | 100% data dari store/computed | zero hardcoded company values |
| 9 manifests | Generic labels | no company names |
| 14 calc modules | Pure functions | all fixture-grounded TDD |
| Form defaults | Indonesian industry standards | user-editable |

**Known Limitation** (TODO):
- `paidUpCapitalDeduction` di AAM/EEM = `jumlahSahamBeredar` (assumes par value Rp 1). Untuk perusahaan dengan par value berbeda, butuh field `nilaiNominalPerSaham` di HomeInputs.
- `faAdjustment` = 0 (default). Butuh input UI di AAM page untuk user-editable.
- `BORROWING_PERCENT_DEFAULT` = 0.7 (70%). Named constant, tapi belum user-editable.

**Yang sudah di-compute dari data user**:
- Growth rates → `computeAvgGrowth(userIS[row])` — bukan hardcoded
- Tax rates historis → `abs(tax/PBT)` — bukan hardcoded
- Tax rates proyeksi → KEY DRIVERS `corporateTaxRate` — user input
- Loan balances → BS store rows 31/38 — bukan hardcoded
- Projection years → `PROJECTION_YEAR_COUNT` — 1 constant, ubah sekali
- Discount Rate → `buildDiscountRateInput()` → `computeDiscountRate()` — centralized
- DLOM/DLOC → dari questionnaire form → `home.dlomPercent` / `home.dlocPercent`
- Excess cash / idle asset → dari ROIC computation

---

## 12. Next Session Priorities (017)

1. **`nilaiNominalPerSaham`** di HomeInputs + form + store v7→v8 → AAM paidUpCapitalDeduction yang benar
2. **RESUME / CFI pages** — ringkasan perbandingan DCF/AAM/EEM share values
3. **`computeFullProjectionPipeline()`** — extract DCF upstream chain (~90 baris) ke shared function
4. **FA Adjustment user input** di AAM page
5. Dashboard (Recharts) — nice to have

---

## 13. Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run test             # Vitest single run
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run extract:fixtures # Python: regenerate fixtures dari Excel
npm run seed:sync        # Copy fixtures ke src/data/seed/fixtures/
```
