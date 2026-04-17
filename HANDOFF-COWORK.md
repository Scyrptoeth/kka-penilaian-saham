# KKA Penilaian Saham — Handoff Document CLI → Cowork

> **Tanggal**: 2026-04-13 (setelah Session 017)
> **Tujuan**: Menyamakan pemahaman antara Claude Code CLI (paling update) dan Cowork
> **Repo**: https://github.com/Scyrptoeth/kka-penilaian-saham
> **Live**: https://penilaian-bisnis.vercel.app

---

## 1. Apa Proyek Ini

**KKA Penilaian Saham** = website Next.js yang mengkonversi Kertas Kerja Analisis Penilaian Bisnis/Saham dari Excel workbook (`kka-penilaian-saham.xlsx`) ke aplikasi web interaktif untuk Fungsional Penilai DJP (Direktorat Jenderal Pajak).

**PT Raja Voltama Elektrik** yang ada di Excel adalah **contoh studi kasus saja**. Aplikasi ini dibangun secara **system development** — semua kalkulasi derive dari data user, bukan hardcoded dari prototype. Perusahaan mana pun bisa diproses.

**Privacy-first**: Zero network calls untuk data user. Semua client-side. LocalStorage untuk persistence. Tidak ada login, tidak ada server storage.

**Milestone Session 016**: Pertama kali menghasilkan **nilai per saham** lewat 3 metode valuasi (DCF, AAM, EEM).

**Milestone Session 017**: **SIMULASI POTENSI PPh** — output utama untuk Penilai DJP. PPh Pasal 17 progresif, method selector (DCF/AAM/EEM), Dashboard Recharts. **System hardening** — semua shared logic diextract ke centralized builders, zero copy-paste antar pages.

---

## 2. Tech Stack

| Layer | Teknologi | Versi |
|---|---|---|
| Framework | Next.js (App Router) | 16 |
| UI | React + TypeScript strict | 19 |
| Styling | Tailwind CSS (v4, CSS-first `@theme`) | 4 |
| State | Zustand + persist middleware | 5 |
| Forms | react-hook-form + Zod | 7 + 4 |
| Charts | Recharts | 3 |
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

## 3. Current State (After Session 017)

### Verification
```
Tests:     715 / 715 passing (49 files)
Build:     32 static pages, zero errors
Typecheck: tsc --noEmit clean
Lint:      zero warnings
Store:     v8 (13 slices/fields)
```

### 32 Live Pages

| Grup | Halaman |
|---|---|
| **Input Master** | HOME (form input master, 8 field termasuk nilaiNominalPerSaham) |
| **Input Data** | Balance Sheet, Income Statement, Fixed Asset, Key Drivers |
| **Historis** | Balance Sheet, Income Statement, Cash Flow, Fixed Asset |
| **Analisis** | Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate |
| **Proyeksi** | Proy. L/R, Proy. Fixed Asset, Proy. Balance Sheet, Proy. NOPLAT, Proy. Cash Flow |
| **Penilaian** | DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, AAM, EEM, **CFI**, **Simulasi Potensi** |
| **Ringkasan** | **Dashboard** (4 Recharts charts) |

### Belum Dibangun
- **RESUME** (ringkasan perbandingan DCF/AAM/EEM side-by-side)
- **Export .xlsx** (ExcelJS sudah installed, `lib/export/` kosong)
- **File upload** (.xlsx → live data, eliminasi manual data entry)

---

## 4. Arsitektur — Bagaimana Data Mengalir

### 4.1 Dua Mode: Seed (Demo) vs Live

```
User buka app pertama kali → home === null → SEED MODE (demo Raja Voltama)
User isi HOME form → home !== null → auto-detect → LIVE MODE (data user)
```

Switching otomatis, zero toggle. Sentinel pattern: `home === null` = demo.

### 4.2 Pipeline Data (Live Mode) — UPDATED Session 017

```
User Input (Zustand Store v8)
    ↓
Historical Data (BS/IS/FA rows × 4 tahun)
    ↓ computeAvgGrowth() → growth rates
    ↓ deriveComputedRows() → subtotals/totals
    ↓
┌───────────────────────────────────────────────────────────────┐
│ computeHistoricalUpstream()  [NEW S017 — single call]        │
│   NOPLAT → CFS → FCF → ROIC → Growth Rate                   │
│   Replaces ~25 lines copy-pasted in 5 files                  │
└───────────────────────────────────────────────────────────────┘
    ↓
Analysis Pages (FR 18/18, FCF, NOPLAT, GR, ROIC, CFS)
    ↓
KEY DRIVERS (financial/operational/BS/capex assumptions)
    ↓
┌───────────────────────────────────────────────────────────────┐
│ computeFullProjectionPipeline()  [NEW S017 — single call]    │
│   PROY FA → PROY LR → PROY NOPLAT → PROY BS → PROY AP      │
│   → PROY CFS                                                 │
│   Replaces ~90 lines duplicated in DCF + PROY CFS           │
└───────────────────────────────────────────────────────────────┘
    ↓
┌────────────────────┬────────────────────┬────────────────────┐
│ DCF                │ AAM                │ EEM                │
│ buildDcfInput()    │ buildAamInput()    │ buildEemInput()    │
│ computeDcf()       │ computeAam()       │ computeEem()       │
│ → projected FCF    │ → adjusted BS      │ → historical FCF   │
│ → terminal value   │ → NAV formula      │ → Borrowing Cap    │
│ → WACC discount    │ → DLOM/DLOC        │ → excess earning   │
└────────┬───────────┴────────┬───────────┴────────┬───────────┘
         │                    │                    │
         └───── computeShareValue() → per share ───┘
                              ↓
┌───────────────────────────────────────────────────────────────┐
│ computeSimulasiPotensi()  [NEW S017]                         │
│   Equity → DLOM → DLOC → Market Value → PPh Pasal 17        │
│   Method selector: user picks DCF / AAM / EEM basis          │
│   Progressive tax: 5 brackets (5%, 15%, 25%, 30%, 35%)       │
│   Output: Total Potensi PPh Kurang Bayar                     │
└───────────────────────────────────────────────────────────────┘
```

### 4.3 Layer Architecture

```
src/
├── app/                          # Next.js pages (32 routes)
│   ├── page.tsx                  # HOME (server component + client form)
│   ├── input/                    # 4 data entry pages
│   ├── historical/               # 4 historical view pages
│   ├── analysis/                 # 6 analysis pages
│   ├── projection/               # 5 projection pages
│   ├── valuation/                # 10 valuation pages (+2 in Session 017)
│   └── dashboard/                # [NEW S017] Dashboard with 4 Recharts charts
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
│   ├── calculations/             # 17 pure calc modules (+3 in Session 017)
│   │   ├── projection-pipeline.ts   # [NEW S017] Full 6-step projection chain
│   │   ├── upstream-helpers.ts      # [NEW S017] 7 shared builders (buildAamInput, etc.)
│   │   ├── cfi.ts                   # [NEW S017] Cash Flow to Investor
│   │   ├── simulasi-potensi.ts      # [NEW S017] PPh Pasal 17 progressive tax
│   │   ├── share-value.ts           # [S016] Shared equity→perShare tail
│   │   ├── borrowing-cap.ts         # [S016] CALK borrowing + weighted return
│   │   ├── dcf.ts                   # [S016] DCF + Gordon Growth terminal
│   │   ├── aam-valuation.ts         # [S016] Adjusted Asset Method
│   │   ├── eem-valuation.ts         # [S016] Excess Earnings Method
│   │   ├── discount-rate.ts         # buildDiscountRateInput() + CAPM
│   │   ├── helpers.ts               # roundUp, computeAvgGrowth, YKS helpers
│   │   └── ...                      # balance-sheet, income-statement, wacc, etc.
│   │
│   ├── store/                    # Zustand store (v8, persist + migrate chain)
│   ├── schemas/                  # Zod schemas (home.ts)
│   ├── adapters/                 # Sign-flip adapters (fcf, cash-flow, noplat)
│   └── validation/               # Zod validation wrappers
│
└── types/                        # Shared TypeScript types (financial.ts)
```

### 4.4 Key Design Patterns

| Pattern | Penjelasan |
|---|---|
| **Manifest-driven rendering** | Historical/analysis pages defined by `SheetManifest` → `buildRowsFromManifest()` → `<SheetPage>`. Tambah sheet = tulis manifest, zero code change. |
| **Custom page for projections + valuations** | Mixed column layouts → custom `'use client'` page with `useMemo`. (LESSON-038) |
| **Declarative computedFrom** | Subtotals declared: `{ computedFrom: [6, -7] }` → `deriveComputedRows()`. Signed refs for subtract. (LESSON-033) |
| **Adapter layer** | Sign flips centralized: raw → adapter (negate per Excel) → pure calc. (LESSON-011) |
| **YearKeyedSeries** | `Record<number, number>` — year as key, not index. (LESSON-012) |
| **Hydration gate** | Parent gates `hasHydrated` + `home !== null`, child mounts after → `useState(initializer)` safe. (LESSON-034) |
| **Lazy useMemo per page** | Compute on navigation, not globally. Selectors trigger re-render per slice. (LESSON-032) |
| **Centralized builders** | [NEW S017] `buildAamInput()`, `buildDcfInput()`, `buildEemInput()`, `buildBorrowingCapInput()` — ONE place per mapping. JANGAN copy-paste parameter. (LESSON-046) |
| **`computeHistoricalUpstream()`** | [NEW S017] Single call replaces ~25 lines duplicated in 5 files. Returns allNoplat, allCfs, allFcf, allFa, roicRows, growthRate. |
| **`computeFullProjectionPipeline()`** | [NEW S017] Single call replaces ~90 lines in DCF + PROY CFS. Returns all 6 PROY outputs + computed BS. |
| **`computeShareValue()`** | Shared equity→DLOM→DLOC→ROUNDUP→perShare for DCF + EEM. AAM tidak pakai (format berbeda). |
| **Risk category derivation** | [NEW S017] `deriveDlomRiskCategory()` / `deriveDlocRiskCategory()` — percentage→category. Jangan hardcode risk labels. |

---

## 5. Store Shape (v8) — UPDATED Session 017

```typescript
interface KkaState {
  home: HomeInputs | null                    // 8 fields (incl. nilaiNominalPerSaham)
  dlom: DlomState | null                     // 10-factor questionnaire
  dloc: DlocState | null                     // 5-factor questionnaire
  balanceSheet: { rows: Record<number, YearKeyedSeries> } | null
  incomeStatement: { rows: Record<number, YearKeyedSeries> } | null
  fixedAsset: { rows: Record<number, YearKeyedSeries> } | null
  accPayables: { rows: Record<number, YearKeyedSeries> } | null
  wacc: WaccState | null                     // comparable companies + params
  discountRate: DiscountRateState | null      // CAPM params + bank rates
  keyDrivers: KeyDriversState | null         // financial/operational/BS/capex
  borrowingCapInput: BorrowingCapInputState | null  // [S016] CALK values
  faAdjustment: number                       // [NEW S017] AAM fixed asset adjustment, default 0
  nilaiPengalihanDilaporkan: number           // [NEW S017] SIMULASI POTENSI reported value, default 0
}

// HomeInputs now includes:
interface HomeInputs {
  namaPerusahaan: string
  npwp: string
  jenisPerusahaan: 'tertutup' | 'terbuka'
  jumlahSahamBeredar: number
  jumlahSahamYangDinilai: number
  tahunTransaksi: number
  objekPenilaian: 'saham' | 'bisnis'
  nilaiNominalPerSaham: number  // [NEW S017] Par value per share, default Rp 1
  dlomPercent: number           // auto-computed from DLOM questionnaire
  dlocPercent: number           // auto-computed from DLOC questionnaire
}
```

Migration chain: v1→v2→v3→v4→v5→v6→v7→**v8**. Function `migratePersistedState` exported dan tested.

**v7→v8 migration** adds:
- `nilaiNominalPerSaham: 1` to existing `home` object (backward compatible)
- `faAdjustment: 0` as top-level field
- `nilaiPengalihanDilaporkan: 0` as top-level field

---

## 6. Session 017 — Apa yang Baru (DETAIL)

### 6.1 Refactor: `computeFullProjectionPipeline()`

**Masalah**: Pipeline proyeksi ~90 baris di-copy-paste di DCF page dan PROY CFS page.

**Solusi**: Extract ke `src/lib/calculations/projection-pipeline.ts` — pure function yang menerima store slices dan return semua 6 PROY outputs + computed BS. Kedua pages sekarang call 1 line.

### 6.2 Store v7→v8: `nilaiNominalPerSaham` + `faAdjustment` + `nilaiPengalihanDilaporkan`

**Masalah**: AAM `paidUpCapitalDeduction` asumsikan par value Rp 1 (hardcoded). FA adjustment = 0 (hardcoded). Simulasi Potensi butuh store field untuk reported value.

**Solusi**: Bundled 3 field baru dalam 1 store migration. `paidUpCapitalDeduction = jumlahSahamBeredar × nilaiNominalPerSaham` — benar untuk semua perusahaan.

### 6.3 AAM Page: FA Adjustment Input

AAM page sekarang punya input field untuk penyesuaian aset tetap (misal: appraisal tanah vs book value). Tersimpan di store, reactive via `useMemo`. Dipakai juga oleh Simulasi Potensi dan Dashboard.

### 6.4 CFI Page — Cash Flow to Investor

| Row | Label | Historis | Proyeksi |
|---|---|---|---|
| 7 | Free Cash Flow | FCF row 20 | DCF projected FCF |
| 8 | Non-Operational CF | IS row 30 | PROY LR row 34 |
| 9 | **CFI** | **= R7 + R8** | **= R7 + R8** |

Pure calc module `computeCfi()` — merge hist+proj, compute per year. 4 tests. Tabel visual membedakan kolom historis vs proyeksi.

### 6.5 SIMULASI POTENSI — Output Utama untuk Penilai DJP

**Ini halaman terpenting** — menghitung potensi PPh kurang bayar dari pengalihan saham.

**Features**:
- **Method selector**: dropdown DCF / AAM / EEM — user pilih basis equity value
- **DLOM + DLOC chain**: Equity → DLOM discount → DLOC discount → Market Value
- **Resistensi WP**: derived otomatis dari DLOM/DLOC risk category (BUKAN hardcoded)
- **PPh Pasal 17 progresif**: 5 bracket (5%/60M, 15%/190M, 25%/250M, 30%/4.5B, 35%/∞)
- **Comparison table**: menampilkan equity value dari ketiga metode

**Calc module**: `computeSimulasiPotensi()` — 17 tests termasuk fixture match + edge cases.

**PPh bracket implementation**: Menggunakan bracket WIDTH (bukan cumulative limit). Waterfall pattern: `remaining -= Math.min(remaining, width)` per bracket.

### 6.6 Dashboard — 4 Recharts Charts

| # | Chart | Tipe | Data |
|---|---|---|---|
| 1 | Revenue & Net Income | BarChart | Historical IS + projected PROY LR |
| 2 | Komposisi Neraca | BarChart | BS Total Assets/Liabilities/Equity |
| 3 | Perbandingan Nilai Per Saham | BarChart | DCF vs AAM vs EEM per-share |
| 4 | Free Cash Flow | LineChart | Historical FCF row 20 |

Responsive 2-column grid. Compact IDR axis formatting (T/M/Jt/Rb). Design-system aligned colors.

### 6.7 System Hardening — POST-DELIVERY AUDIT

User bertanya: "Apakah semua pengembangan system development, bukan patching?"

**Code review menemukan 2 CRITICAL + 5 HIGH issues:**

| Severity | Issue | Fix |
|---|---|---|
| **CRITICAL** | Resistensi WP hardcoded `'Moderat'` — salah untuk semua perusahaan | `deriveDlomRiskCategory()` + `deriveDlocRiskCategory()` |
| **CRITICAL** | EEM hardcode `faAdjustment: 0` — ignores user input | Read from store |
| HIGH | Historical upstream chain duplicated in 5 files | `computeHistoricalUpstream()` |
| HIGH | `computeDcf()` 15-param call duplicated in 4 files | `buildDcfInput()` |
| HIGH | `computeAam()` 20-param call duplicated in 4 files | `buildAamInput()` |
| HIGH | `BORROWING_PERCENT_DEFAULT` in 4 files | Centralized in `upstream-helpers.ts` |
| HIGH | Dashboard computes historical chain twice | Reuse upstream result |

**Semua diperbaiki** dalam commit `fix: system hardening — eliminate patching, centralize shared logic`.

---

## 7. Shared Builders — WAJIB PAKAI (LESSON-046)

File: `src/lib/calculations/upstream-helpers.ts`

**Ini file terpenting untuk memahami bagaimana pages consume calc functions.**

| Builder | Input | Output | Dipakai oleh |
|---|---|---|---|
| `computeHistoricalUpstream()` | BS/IS/FA rows + allBs + years | allNoplat, allCfs, allFcf, allFa, roicRows, growthRate | DCF, CFI, Simulasi, Dashboard |
| `buildAamInput()` | allBs + lastYear + home + faAdjustment | `AamInput` (20 params) | AAM, EEM, Simulasi, Dashboard |
| `buildDcfInput()` | upstream + pipeline outputs + wacc + growthRate | `DcfInput` (15 params) | DCF, CFI, Simulasi, Dashboard |
| `buildEemInput()` | aamResult + upstream + allBs + rates | `EemInput` | EEM, Simulasi, Dashboard |
| `buildBorrowingCapInput()` | allBs + bcInput + dr | `BorrowingCapInput` | EEM, Simulasi, Dashboard |
| `deriveDlomRiskCategory()` | dlomPercent | Risk category string | Simulasi Potensi |
| `deriveDlocRiskCategory()` | dlocPercent | Risk category string | Simulasi Potensi |
| `BORROWING_PERCENT_DEFAULT` | — | 0.7 | EEM, BC, Simulasi, Dashboard |

**Aturan**: Setiap page baru yang consume calc function **WAJIB** pakai builder. JANGAN copy-paste parameter mapping. Bug yang ditemukan di Session 017 (debtRate 100×, hardcoded Resistensi WP) terjadi KARENA copy-paste.

---

## 8. Excel Dependency Map

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
  │     ├── GROWTH REVENUE
  │     └── CFI (Non-Op CF = IS row 30)
  ├── FIXED ASSET → FCF, PROY FIXED ASSETS, AAM (adjustment)
  ├── KEY DRIVERS → PROY LR
  │
  ├── PROY LR → PROY BS, PROY NOPLAT, PROY CFS, CFI (proj Non-Op)
  ├── PROY BS → PROY CFS
  ├── PROY FA → PROY LR, PROY BS, PROY CFS
  ├── PROY ACC PAYABLES (hidden) → PROY CFS
  ├── PROY NOPLAT → DCF (projected NOPLAT)
  │
  ├── WACC / DISCOUNT RATE → DCF (WACC=H10), EEM (capitalization rate)
  ├── GROWTH RATE → DCF (terminal value growth)
  ├── BORROWING CAP → EEM (return rate on tangible assets)
  ├── AAM → EEM (adjusted NTA components), SIMULASI POTENSI
  ├── DCF → CFI (projected FCF), SIMULASI POTENSI
  ├── EEM → SIMULASI POTENSI
  ├── DLOM → HOME summary → all valuation methods + SIMULASI POTENSI
  ├── DLOC → HOME summary → AAM + SIMULASI POTENSI (DCF/EEM use 0)
  └── SIMULASI POTENSI → PPh Pasal 17 progressive tax = FINAL OUTPUT
```

---

## 9. Calc Modules (17 total)

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
| `key-drivers.ts` | Sales vol/price computation | 16 tests |
| `derive-computed-rows.ts` | computedFrom[] forward pass | TDD |
| `share-value.ts` | [S016] Shared equity→perShare | 5 tests |
| `borrowing-cap.ts` | [S016] CALK borrowing + weighted return | 6 tests |
| `dcf.ts` | [S016] DCF + Gordon Growth terminal | 13 tests |
| `aam-valuation.ts` | [S016] Adjusted Asset Method | 15 tests |
| `eem-valuation.ts` | [S016] Excess Earnings Method | 10 tests |
| **`cfi.ts`** | **[S017] Cash Flow to Investor** | **4 tests** |
| **`simulasi-potensi.ts`** | **[S017] PPh Pasal 17 + Resistensi WP** | **17 tests** |
| **`projection-pipeline.ts`** | **[S017] Full 6-step PROY chain** | (structural) |
| **`upstream-helpers.ts`** | **[S017] 7 shared builders** | (consumed by pages) |

---

## 10. Session History (17 sessions)

| # | Tanggal | Scope | Key Delivery |
|---|---|---|---|
| 001 | 2026-04-11 | Scaffold + Foundation | Next 16 + TS + Tailwind v4 + Zustand + 34 fixtures |
| 002 | 2026-04-11 | Calc Engines | 6 pure calc modules, 47 tests |
| 003 | 2026-04-11 | Hardening | YearKeyedSeries + Zod validation + adapter layer |
| 004 | 2026-04-11 | UI Tables | FinancialTable + FormulaTooltip + 4 pages |
| 005 | 2026-04-11 | Systematization | SheetPage 11-line pattern |
| 006 | 2026-04-11 | Declarative Derive | DerivationSpec[] replaces callbacks |
| 007 | 2026-04-11/12 | 4 Remaining Pages | CF, FA, NOPLAT, Growth — pure manifest |
| 008 | 2026-04-11/12 | ROIC + DLOM/DLOC | First interactive forms, company-agnostic refactor |
| 009 | 2026-04-12 | Phase 3 Design | 6 architectural decisions, zero code |
| 010 | 2026-04-12 | DataSource + BS Pilot | Live mode foundation, store v2→v3 |
| 011 | 2026-04-12 | IS Input + 3 Downstream | ManifestEditor generic, signed computedFrom |
| 012 | 2026-04-12 | FA + CFS/FCF/ROIC Live | All 9 analysis pages live-mode capable |
| 013 | 2026-04-12 | WACC + DR + Growth Rate | Valuation foundation, store v4→v5 |
| 014 | 2026-04-12 | KEY DRIVERS + PROY FA/LR | Projection chain start, store v5→v6 |
| 015 | 2026-04-12 | PROY Chain Complete | 4 PROY sheets + 3-round company-agnostic audit |
| 016 | 2026-04-12/13 | DCF + AAM + EEM | First share value! Store v6→v7. 5 calc, 4 pages |
| **017** | **2026-04-13** | **CFI + Simulasi Potensi + Dashboard + System Hardening** | **Store v7→v8. 4 new calc modules, 3 new pages, Dashboard. 7 shared builders extracted. 2 CRITICAL bugs fixed. +24 tests** |

---

## 11. Lessons Learned — Promoted (selalu relevan)

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
| 039 | NOPLAT hist vs proj different sources | Mixed-source columns |
| 044 | Verify fixture E/F columns independently | Jangan trust prompt analysis |
| 045 | Gordon Growth allows g > r when FCF negative | Guard hanya g === r |
| **048** | **[S017] PPh bracket WIDTH bukan cumulative limit** | **Progressive tax / tiered pricing** |

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
| 043 | buildDiscountRateInput() — centralize store→input | WAJIB pakai saat consume DR |
| **046** | **[S017] Centralize ALL builders di upstream-helpers.ts** | **WAJIB pakai builder. JANGAN copy-paste parameter mapping.** |
| **047** | **[S017] Audit hardcoded values setelah multi-page session** | **grep "= 0," + diff parameter list antar pages** |

---

## 12. Company-Agnostic Status (UPDATED S017)

| Layer | Status | Catatan |
|---|---|---|
| 20+ compute adapters | 100% parameterized | via typed interfaces |
| 32 page files | 100% data dari store/computed | zero hardcoded company values |
| 9 manifests | Generic labels | no company names |
| 17 calc modules | Pure functions | all fixture-grounded TDD |
| 7 shared builders | Centralized mappings | zero copy-paste risk |
| Form defaults | Indonesian industry standards | user-editable |

**Resolved since Session 016**:
- `paidUpCapitalDeduction` = `jumlahSahamBeredar × nilaiNominalPerSaham` — benar untuk semua par value
- `faAdjustment` = user input (dari store), bukan hardcoded 0
- Resistensi WP = derived dari actual DLOM/DLOC percentages, bukan hardcoded 'Moderat'
- `BORROWING_PERCENT_DEFAULT` centralized — 1 constant, 4 consumers

**Remaining Known Limitations**:
- `BORROWING_PERCENT_DEFAULT` (0.7) belum user-editable — named constant tapi fixed
- DLOM/DLOC risk category thresholds hardcoded berdasarkan Excel mapping — adequate untuk 3-level system

---

## 13. Next Session Priorities (018)

1. **RESUME page** — ringkasan perbandingan DCF/AAM/EEM share values side-by-side
2. **Export ke .xlsx** via ExcelJS (`lib/export/` masih kosong)
3. **File upload parsing** (.xlsx → live data) — eliminasi manual data entry
4. **Polish Dashboard** — add projected FCF to FCF chart, more KPIs

---

## 14. Commands

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

## 15. Catatan untuk Cowork

1. **Jangan re-scaffold** — 32 pages sudah live, semua bekerja. Kalau mau tambah page baru, ikuti pattern yang ada.
2. **WAJIB pakai shared builders** dari `upstream-helpers.ts` — ini lesson paling penting dari Session 017. Copy-paste parameter mapping = guaranteed bugs.
3. **Test dulu, code kemudian** — setiap calc module punya fixture-grounded test. TDD: RED → GREEN → REFACTOR.
4. **Baca fixture JSON** sebelum implement calc baru — jangan asumsikan formula dari label. `__tests__/fixtures/*.json` berisi both computed values DAN raw formulas.
5. **Store migration wajib** setiap bump version — chain function `migratePersistedState`, tested.
6. **Company-agnostic** adalah prinsip fundamental — zero hardcoded company values di production path.
