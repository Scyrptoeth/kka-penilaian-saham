# Session 011 — IS Input + First Downstream Wave

## Objective

Deliver Income Statement input form + wire 4 downstream sheets (CFS, FR, NOPLAT, Growth Revenue) ke live mode. Setelah sesi ini, user bisa: isi HOME → isi BS → isi IS → lihat 6 downstream sheets auto-compute dari data mereka.

---

## Cumulative State (entering Session 011)

```
Pages:     12 prerendered (HOME + 9 financial + DLOM + DLOC + /input/balance-sheet)
Tests:     169 / 169 passing (23 files)
Build:     ✅ 17 routes, 12 static pages
Store:     v3 with home/dlom/dloc/balanceSheet/incomeStatement/fixedAsset slices
Lessons:   34 (LESSON-033: declarative computedFrom, LESSON-034: hydration gate pattern)
Live:      BS end-to-end working (input → display → mode auto-switch)
Framework: ManifestEditor extraction planned as Task 0 (committed to plan.md)
```

---

## Execution Plan

### Task 0: Extract `<ManifestEditor>` dari BalanceSheetEditor (WAJIB sebelum Task 1)

**Why**: `BalanceSheetEditor` di `/input/balance-sheet/page.tsx` punya inline pattern (hydration gate, useState seed, debounced persist, useMemo deriveComputedRows) yang akan berulang 3× tanpa abstraksi. Extract ke generic component SEBELUM menambah IS page.

**File baru**: `src/components/forms/ManifestEditor.tsx` — `'use client'`

```ts
interface ManifestEditorProps {
  manifest: SheetManifest
  sliceSelector: (state: KkaState) => { rows: Record<number, YearKeyedSeries> } | null
  sliceSetter: (state: KkaState) => (data: { rows: Record<number, YearKeyedSeries> }) => void
  yearCount: 3 | 4
}
```

**Pattern yang di-extract** (dari `BalanceSheetEditor` child component):
1. `useState(useKkaStore.getState().slice?.rows ?? {})` — one-time non-subscribed seed (LESSON-034)
2. `useMemo(() => computeHistoricalYears(tahunTransaksi, yearCount), [tahunTransaksi])` — dynamic years
3. `useMemo(() => deriveComputedRows(manifest.rows, localValues, years), [...])` — computed rows
4. `useRef` + debounced 500ms persist ke store via `sliceSetter`
5. `handleChange(excelRow, year, value)` callback
6. Render: title + description + `<RowInputGrid>`

**Refactor** `/input/balance-sheet/page.tsx`:
```tsx
export default function InputBalanceSheetPage() {
  // ... hydration gate + home guard (unchanged)
  return (
    <ManifestEditor
      manifest={BALANCE_SHEET_MANIFEST}
      sliceSelector={(s) => s.balanceSheet}
      sliceSetter={(s) => s.setBalanceSheet}
      yearCount={4}
    />
  )
}
```

**Parent page** (`InputBalanceSheetPage`) tetap handles:
- Hydration gate (`!hasHydrated → loading`)
- Home guard (`!home → empty state + link ke HOME`)
- Passes `tahunTransaksi` implicitly via store (ManifestEditor reads home.tahunTransaksi internally)

**Acceptance criteria Task 0**:
- `/input/balance-sheet` HARUS berperilaku 100% identik sebelum dan sesudah refactor
- Zero regression: `npm test 2>&1 | tail -15` still 169 passing
- System development invariant: menambah 4th input page = ~15 lines wrapper + manifest

**Commit**: `refactor: extract ManifestEditor generic component from BalanceSheetEditor`

### Task 1: Extend `deriveComputedRows` untuk Signed References (~20 min)

**Problem**: IS subtotals involve SUBTRACTION (Gross Profit = Revenue − COGS), tapi `deriveComputedRows` saat ini hanya menjumlahkan (SUM). BS tidak punya masalah ini karena semua subtotals di BS memang penjumlahan.

**Solution**: Extend `computedFrom` syntax — negative excelRow = subtract.

```ts
// Current: computedFrom: [8, 10, 12] → sum rows 8+10+12
// Extended: computedFrom: [6, -7] → row 6 MINUS row 7
// Encoding: sign of the number = operation sign
```

**Perubahan di `deriveComputedRows`** (3-line change):
```ts
// BEFORE:
const val = leafValues[ref]?.[year] ?? computedSoFar[ref]?.[year] ?? 0
total += val

// AFTER:
const absRef = Math.abs(ref)
const sign = ref > 0 ? 1 : -1
const val = leafValues[absRef]?.[year] ?? computedSoFar[absRef]?.[year] ?? 0
total += val * sign
```

> **PENTING**: `ref === 0` edge case — skip atau treat as no-op. Tapi excelRow 0 tidak exist di manifests, jadi ini tidak akan terjadi. Defensive: `sign = ref >= 0 ? 1 : -1` (treats 0 as positive, fine).

**Test**: Tambah test cases di `__tests__/data/live/derive-computed-rows.test.ts`:
- Signed subtraction: `computedFrom: [1, -2]` → row 1 value minus row 2 value
- Mixed: `computedFrom: [1, -2, 3]` → row 1 - row 2 + row 3
- Chained: subtotal uses computedFrom with signed refs, total uses subtotal
- Backward compatible: BS tests still pass (all positive refs)

**Commit**: `feat: support signed computedFrom refs for subtraction in IS subtotals`

### Task 2: IS `computedFrom` Declarations + Input Page (~30 min)

**File**: `src/data/manifests/income-statement.ts`

Tambah `computedFrom` ke setiap subtotal/total row di IS manifest. Convention: user inputs ALL values as NATURAL sign (COGS positive, Tax positive), `computedFrom` sign handles the formula.

**Sign convention for IS user input** (KRITIS):
- Revenue (row 6): positive (pendapatan)
- COGS (row 7): **positive** (biaya, user ketik angka positif)
- Operating expenses (rows 12, 13): **positive** (biaya)
- Depreciation (row 21): **positive** (biaya)
- Interest Income (row 26): **positive** (pendapatan)
- Interest Expense (row 27): **positive** (biaya, user ketik angka positif)
- Other Income/Charges (row 28): **signed by user** (positif = income, negatif = charge)
- Corporate Tax (row 33): **positive** (biaya)

**computedFrom declarations**:

```ts
// Row 8: Gross Profit = Revenue - COGS
{ excelRow: 8, label: 'Gross Profit', type: 'subtotal', computedFrom: [6, -7] }

// Row 15: Total Operating Expenses = sum of opex items
// VERIFIKASI: baca IS manifest — cek apakah row 12 dan 13 adalah SATU-SATUNYA
// opex leaf items. Jika ada rows lain (misal row 14), tambahkan ke computedFrom.
{ excelRow: 15, label: 'Total Operating Expenses (ex-Depreciation)', type: 'subtotal', computedFrom: [12, 13] }

// Row 18: EBITDA = Gross Profit - Total OpEx
{ excelRow: 18, label: 'EBITDA', type: 'subtotal', computedFrom: [8, -15] }

// Row 22: EBIT = EBITDA - Depreciation
{ excelRow: 22, label: 'EBIT', type: 'subtotal', computedFrom: [18, -21] }

// Row 30: Non-Operating Income (net) = Interest Income - Interest Expense + Other
{ excelRow: 30, label: 'Non-Operating Income (net)', type: 'subtotal', computedFrom: [26, -27, 28] }

// Row 32: Profit Before Tax = EBIT + Non-Operating Income
{ excelRow: 32, label: 'Profit Before Tax', type: 'subtotal', computedFrom: [22, 30] }

// Row 35: Net Profit After Tax = PBT - Corporate Tax
{ excelRow: 35, label: 'NET PROFIT AFTER TAX', type: 'total', computedFrom: [32, -33] }
```

> **KRITIS — VERIFIKASI TERHADAP FIXTURE**:
> Setelah menambah computedFrom, verify dengan seed data bahwa computed values match fixture values.
> Caranya: tulis test yang:
> 1. Loads IS seed fixture values untuk leaf rows
> 2. Runs deriveComputedRows dengan IS manifest + leaf values
> 3. Asserts computed subtotals match fixture subtotal values
>
> Ini menangkap sign errors sebelum user pernah melihatnya.
> Contoh: fixture Gross Profit 2019 = Revenue 2019 - COGS 2019.
> Jika sign salah, computed ≠ fixture → test fails.

**Input page**: `src/app/input/income-statement/page.tsx` — ~15 lines, reuse ManifestEditor:

```tsx
'use client'
import { ManifestEditor } from '@/components/forms/ManifestEditor'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
// ... hydration gate + home guard (same pattern as BS)

export default function InputIncomeStatementPage() {
  // hydration + home guards
  return (
    <ManifestEditor
      manifest={INCOME_STATEMENT_MANIFEST}
      sliceSelector={(s) => s.incomeStatement}
      sliceSetter={(s) => s.setIncomeStatement}
      yearCount={4}
    />
  )
}
```

**Nav update**: `src/components/layout/nav-tree.ts` — remove `wip: true` dari Income Statement di "Input Data" group.

**Commits**:
- `feat: add computedFrom declarations to Income Statement manifest`
- `feat: add /input/income-statement page via ManifestEditor`

### Task 3: Extend SheetPage untuk Downstream Live Mode (~30 min)

**Problem**: SheetPage saat ini hanya support live mode untuk sheets yang punya DIRECT store slices (BS/IS/FA via `getLiveRowsForSlug`). Downstream sheets (CFS, FR, NOPLAT, Growth Revenue) tidak punya store slices — mereka COMPUTE dari BS+IS data.

**Solution**: Tambah `liveRows` override prop ke SheetPage.

```ts
interface SheetPageProps {
  manifest: SheetManifest
  liveRows?: Record<number, YearKeyedSeries> | null  // NEW — downstream override
  showCommonSize?: boolean
  showGrowth?: boolean
}
```

**Logic update di SheetPage**:
```ts
// Existing: read from store for BS/IS/FA
const storeLiveRows = getLiveRowsForSlug(manifest.slug, slices)

// NEW: prefer prop override if provided
const effectiveLiveRows = props.liveRows !== undefined
  ? props.liveRows    // downstream page computed this
  : storeLiveRows     // direct store slice (BS/IS/FA)

const isLive = hasHydrated && home !== null && effectiveLiveRows !== null
```

**Behavior**:
- BS/IS/FA pages: pass no `liveRows` prop → SheetPage reads from store (unchanged)
- CFS/FR/NOPLAT/GR pages: pass computed `liveRows` prop → SheetPage uses it
- If `liveRows` is `null` → seed mode (upstream data not yet available)
- If `liveRows` is `undefined` → fall back to store reading (backward compat)

**Commit**: `refactor: add liveRows prop to SheetPage for downstream live compute`

### Task 4: NOPLAT Live Mode (~30 min)

**Complexity**: LOW — hanya butuh IS data.

**File**: `src/app/analysis/noplat/page.tsx` — convert to `'use client'`

**Approach**:
1. Read `home` dan `incomeStatement` dari store
2. Jika keduanya ada, compute NOPLAT live rows
3. Pass `liveRows` ke SheetPage

**Compute function** — buat di `src/data/live/compute-noplat-live.ts` (atau inline):

```ts
/**
 * Compute live NOPLAT rows from IS input data.
 * Maps IS excelRow values → NOPLAT excelRow positions.
 * Uses existing toNoplatInput + computeNoplat pipeline.
 */
export function computeNoplatLiveRows(
  isRows: Record<number, YearKeyedSeries>,
  years: number[],
): Record<number, YearKeyedSeries> {
  // 1. Extract IS values needed for NOPLAT
  //    IS excelRow 32 = PBT
  //    IS excelRow 27 = Interest Expense (positive = biaya)
  //    IS excelRow 26 = Interest Income (positive = pendapatan)
  //    IS excelRow 30 = Non-Operating Income (signed)
  //    IS excelRow 33 = Corporate Tax (positive = biaya)
  
  // 2. Adapt signs for NOPLAT adapter
  //    toNoplatInput expects "raw signed" values matching workbook convention.
  //    PENTING: User enters Interest Expense as POSITIVE, tapi workbook stores it
  //    as NEGATIVE. Adapter (toNoplatInput) does *-1 flip.
  //    
  //    Jadi: jika user enters Interest Expense = 500,000,000 (positive),
  //    kita perlu NEGATE dulu sebelum passing ke adapter (karena adapter expects
  //    "raw signed" = negative for expenses).
  //    
  //    OR — simpler: bypass adapter entirely, compute EBIT directly:
  //    EBIT = PBT + InterestExpense - InterestIncome + NonOpIncome  
  //    (where user enters IE as positive, II as positive)
  //    
  //    PILIH approach yang paling benar setelah membaca toNoplatInput adapter
  //    dan memahami sign convention-nya.

  // 3. Map NOPLAT calc output → NOPLAT manifest excelRow numbers
  //    BACA noplat.ts manifest: cari excelRow untuk setiap baris.
  //    Contoh mapping (VERIFIKASI terhadap actual manifest):
  //    { [NOPLAT_ROW_PBT]: pbtSeries, [NOPLAT_ROW_EBIT]: ebitSeries, ... }
  
  // 4. Return Record<excelRow, YearKeyedSeries>
}
```

> **SIGN CONVENTION — KRITIS**:
> User input IS values: semua biaya sebagai POSITIVE (COGS, OpEx, Tax, Interest Expense).
> Tapi existing adapters (`toNoplatInput`, `toCashFlowInput`) expect "raw signed" values
> matching workbook convention (Interest Expense NEGATIVE, Tax NEGATIVE).
>
> Ada 2 approach:
> **A**: Negate user-positive costs before feeding to adapter → adapter does its *-1 flips → double negation cancels out for some fields. FRAGILE dan confusing.
> **B**: Bypass adapters. Compute directly from user input using the FORMULAS, not the calc functions. Simpler, explicit, no sign confusion.
>
> **Rekomendasi**: Approach B untuk Session 011. Compute directly:
> ```
> EBIT[y] = PBT[y] + InterestExpense[y] - InterestIncome[y] - NonOpIncome[y]
>   (dimana semua input dalam sign natural user)
> TaxOnEbit[y] = CorporateTax[y]  // simplified, matching workbook
> NOPLAT[y] = EBIT[y] - TaxOnEbit[y]
> ```
>
> Tapi VERIFIKASI dulu terhadap fixture:
> - Load IS seed fixture values (extract leaf row values)
> - Compute NOPLAT pakai formula di atas
> - Compare dengan NOPLAT seed fixture values
> - Jika match → formula benar. Jika tidak → adjust signs.
>
> Jika approach B terlalu risky (sign errors), fallback ke Approach A:
> convert user-positive signs ke workbook-signed, then use existing adapter+calc.

**Empty state**: Jika IS belum diisi → render pesan: "Lengkapi Income Statement terlebih dahulu untuk melihat NOPLAT" + link ke `/input/income-statement`.

**Test**: Integration test — IS seed fixture values → computeNoplatLiveRows → assert matches NOPLAT fixture values at 12-decimal precision.

**Commit**: `feat: wire NOPLAT page to live mode via IS data compute`

### Task 5: Growth Revenue Live Mode (~20 min)

**Complexity**: LOW — hanya butuh IS data (Revenue + Net Income).

**File**: `src/app/analysis/growth-revenue/page.tsx` — convert to `'use client'`

**Approach**:
1. Read `home` dan `incomeStatement` dari store
2. Map IS revenue (excelRow 6) dan IS net income (excelRow 35) ke Growth Revenue manifest excelRow numbers
3. Growth Revenue manifest sudah punya `derivations: [{ type: 'yoyGrowth' }]` — ini akan auto-compute growth columns dari base values
4. Pass liveRows ke SheetPage

**Compute function** (`src/data/live/compute-growth-revenue-live.ts` atau inline):

```ts
export function computeGrowthRevenueLiveRows(
  isRows: Record<number, YearKeyedSeries>,
  years: number[],
): Record<number, YearKeyedSeries> {
  // BACA growth-revenue.ts manifest untuk actual excelRow numbers
  // Map:
  //   GR manifest excelRow for "Penjualan/Revenue" → isRows[6]
  //   GR manifest excelRow for "Net Income" → isRows[35]
  //   (mungkin ada rows lain — VERIFIKASI terhadap manifest)
  //
  // yoyGrowth derivation handles the rest — buildRowsFromManifest
  // will auto-derive growth columns dari base values.
}
```

**Year span note**: Growth Revenue manifest punya `historicalYearCount: 4` (4 tahun, bukan 3). Ini berarti live mode butuh IS data untuk 4 tahun, yang tersedia karena IS input juga 4 tahun.

**Empty state**: "Lengkapi Income Statement terlebih dahulu"

**Commit**: `feat: wire Growth Revenue page to live mode via IS data`

### Task 6: Cash Flow Statement Live Mode (~45 min)

**Complexity**: MEDIUM — butuh BS + IS + year-over-year delta computation.

**File**: `src/app/historical/cash-flow/page.tsx` — convert to `'use client'`

**CFS characteristics**:
- 3-year span (historicalYearCount: 3)
- Values are COMPUTED from BS and IS (not direct input)
- Some CFS values = delta between consecutive years of BS items
- Uses `toCashFlowInput` adapter + `computeCashFlowStatement` calc function

**Two approaches**:

**Approach A (Use existing calc pipeline)**: Wire BS+IS store data through `toCashFlowInput` → `computeCashFlowStatement`, map output → CFS manifest excelRows.

Challenge: adapter expects "raw signed" values from workbook convention, but store has user-positive convention.

**Approach B (Direct computation)**: Compute CFS values directly from BS+IS data using the formulas in the Excel workbook. Skip adapter/calc entirely.

> **Rekomendasi**: Coba Approach A dulu — leverage existing tested calc function.
> Jika sign convention mapping terlalu fragile, switch ke Approach B.
>
> Untuk Approach A, kunci-nya adalah memahami `toCashFlowInput`:
> ```
> toCashFlowInput(raw: RawCashFlowData) → CashFlowInput
> ```
> `RawCashFlowData` expects:
> - ebitda: IS row 18 values
> - corporateTaxRawSigned: IS row 33 values AS WORKBOOK STORES THEM (negative)
> - deltaCurrentAssets: BS current assets delta between years
> - deltaCurrentLiabilities: BS current liabilities delta between years
> - capex: from Fixed Assets (NOT AVAILABLE until Session 012)
> - cashFlowFromNonOperations: IS row 30
> - equity/loan/interest fields: from ACC PAYABLES sheet (NOT AVAILABLE)
>
> Problem: CFS needs capex (from FA) dan acc payables data yang belum tersedia.
> Session 011 hanya punya BS dan IS.

**Realitas CFS dependencies**:
- EBITDA → dari IS ✅
- Corporate Tax → dari IS ✅  
- ΔCurrent Assets → dari BS (delta year-over-year) ✅
- ΔCurrent Liabilities → dari BS (delta year-over-year) ✅
- Capex → dari Fixed Asset ❌ (Session 012)
- Non-Operating → dari IS ✅
- Equity/Loan/Interest → dari ACC PAYABLES ❌ (hidden sheet, belum tersedia)

**Decision point untuk kamu (CLI)**:
1. **Ship CFS with partial data**: Isi fields yang tersedia (EBITDA, tax, working capital, non-op), zero untuk capex/equity/loan. CFS will show CFO correctly but CFI/CFF will be zero. Tambah note "CapEx tersedia setelah input Fixed Asset".
2. **Defer CFS entirely to Session 012**: Skip CFS di Session 011, wire it saat FA juga ready.
3. **Ship CFS partial with clear warning**: Show computed CFO section, show "Data belum lengkap" badge pada CFI/CFF sections.

Pilih yang paling pragmatic setelah baca CFS manifest structure dan CFS calc function. Jika partial CFS memberikan value (user bisa lihat CFO), ship it. Jika partial CFS misleading, defer.

### Task 7: Financial Ratio Live Mode (~45 min)

**Complexity**: HIGH — butuh BS + IS + possibly CFS output.

**FR dependencies** (`computeFinancialRatios` input):
- From IS: revenue, grossProfit, ebitda, ebit, interestExpense, netProfit ✅
- From BS: cash, AR, currentAssets, totalAssets, loans, liabilities, equity ✅
- From CFS: cashFlowFromOperations ⚠️ (computed in Task 6, maybe partial)
- From FCF: capex, freeCashFlow ❌ (Session 012)

**Approach**: Compute FR with available data:
- **Profitability ratios (6)**: BS + IS only → fully computable ✅
- **Liquidity ratios (3)**: BS only → fully computable ✅
- **Leverage ratios (5)**: BS + IS → fully computable ✅
- **Cash Flow ratios (4)**: need CFS/FCF → partially computable ⚠️

**For Cash Flow ratios**: Pass 0 untuk unavailable FCF/capex fields. `computeFinancialRatios` handles zero-division by returning 0 (matching IFERROR). Cash flow ratio values will show as 0.0.

> **Decision**: Apakah lebih baik menampilkan "0.00" untuk cash flow ratios,
> atau menampilkan "N/A"?
>
> Rekomendasi: Tampilkan 0.00 (consistent dengan seed mode behavior when values are zero),
> TAPI tambahkan small note di bawah tabel: "Rasio Cash Flow akan ter-update setelah
> data Fixed Asset diisi (untuk CapEx dan FCF)".
>
> CLI pilih yang paling pragmatic.

**Mapping challenge**: FR calc output (`FinancialRatios`) has named fields. FR manifest has excelRow numbers. Perlu mapping:
- FR excelRow for "Gross Profit Margin" → result.grossProfitMargin
- FR excelRow for "Current Ratio" → result.currentRatio
- etc.

Baca FR manifest (`src/data/manifests/financial-ratio.ts`) untuk actual excelRow mapping.

**Sign convention for FR**: 
- BS values: user enters as NATURAL (assets positive, liabilities positive, equity positive)
- IS values: user enters as NATURAL (revenue positive, costs positive)
- FR calc function expects values in specific sign convention
- VERIFIKASI: load BS+IS seed fixture leaf values → compute FR → compare with FR fixture

**Empty state**: "Lengkapi Balance Sheet dan Income Statement terlebih dahulu"

**Commit**: `feat: wire Financial Ratio page to live mode with partial cash flow data`

### Task 8: Nav Update + Verify Gauntlet (~20 min)

**Nav**: Activate IS entry in "Input Data" group (remove `wip: true`).

**Automated verification**:
```bash
npm test 2>&1 | tail -15          # 169 + new tests passing
npm run build 2>&1 | tail -25     # all routes clean
npx tsc --noEmit 2>&1 | tail -5   # zero errors
npm run lint 2>&1 | tail -5       # zero warnings
```

**Manual smoke tests** (browser — lakukan apa yang bisa, curl sisanya):
1. Fresh browser → all 9 financial pages show seed mode ("MODE DEMO") ✅
2. Isi HOME (tahunTransaksi=2024) → isi BS → isi IS → navigate to:
   - `/historical/income-statement` → live mode, subtotals computed correctly
   - `/analysis/noplat` → live mode, NOPLAT computed from IS data
   - `/analysis/growth-revenue` → live mode, growth rates computed
   - `/analysis/financial-ratio` → live mode, 14 ratios computed, 4 cash flow ratios = 0
   - `/historical/cash-flow` → partial or deferred (per Task 6 decision)
3. Refresh browser → data persistent ✅
4. Clear localStorage → seed mode restored ✅

**Deploy**: `git push origin main` → verify production.

### Task 9: Wrap-Up (~15 min)

- Update `progress.md` dengan Session 011 entry
- Extract lesson candidates jika ada
- Commit: `docs: session 011 wrap-up`

---

## Commit Strategy

```
refactor: extract ManifestEditor generic component from BalanceSheetEditor
feat: support signed computedFrom refs for IS subtraction
feat: add computedFrom declarations to Income Statement manifest
feat: add /input/income-statement page via ManifestEditor
refactor: add liveRows prop to SheetPage for downstream compute
feat: wire NOPLAT page to live mode
feat: wire Growth Revenue page to live mode
feat: wire Cash Flow Statement to live mode (partial/full)
feat: wire Financial Ratio to live mode
docs: session 011 wrap-up
```

~10 commits. Setiap commit harus build clean.

---

## Architecture Decisions Summary

### Decision: Signed `computedFrom` for IS
IS subtotals need subtraction (Gross Profit = Revenue - COGS). Extend existing `computedFrom` syntax: negative excelRow number = subtract. Minimal change (3 lines in deriveComputedRows), backward compatible (BS uses all positive refs).

### Decision: `liveRows` prop override di SheetPage
Downstream pages compute their own live data from store slices, then pass as `liveRows` prop to SheetPage. SheetPage stays generic — doesn't know about calc functions. Each page wrapper is self-contained with explicit dependencies via `useMemo`.

### Decision: Direct computation vs existing calc pipeline for downstream
Two valid approaches exist. For each downstream sheet, CLI evaluates which is cleaner:
- **Existing pipeline**: toXxxInput adapter → computeXxx → map output to manifest rows
- **Direct computation**: formulas applied to store data directly, skip adapter

The choice depends on sign convention complexity per sheet. Rekomendasi: try existing pipeline first, fallback to direct if sign mapping is fragile.

### Decision: Partial live data for sheets missing upstream
When upstream data is incomplete (e.g., FR needs FCF but FA not yet input), provide zeros for missing fields. Calc functions handle zero-division gracefully (return 0, matching IFERROR). Add informational note to UI about what's missing.

---

## Constraints Reminder

### Dari Session 010
- **LESSON-028**: Chain migration v1→v2→v3 — jangan break. Session 011 TIDAK bump store version (no new slices, IS/FA slices already exist from v3).
- **LESSON-029**: Company-agnostic — zero hardcoded company names.
- **LESSON-030**: build.ts dan applyDerivations TIDAK BOLEH berubah.
- **LESSON-031**: Auto-detect mode dari domain state.
- **LESSON-032**: Lazy compute via useMemo per page.
- **LESSON-033**: Declarative computedFrom beats structural derivation.
- **LESSON-034**: Gate local-state seed via hydration-aware child mount.

### Architecture Non-Negotiables
- SheetPage stays generic — no sheet-specific logic inside
- ManifestEditor stays generic — no sheet-specific logic inside
- Each downstream page wrapper is self-contained with explicit useMemo dependencies
- Existing 169 tests MUST stay green (zero regression tolerance)

### Token Efficiency
- Command output → `| tail -N`
- Dedicated tools > Bash
- Jangan baca file yang sama 2×
- Grep dengan pattern spesifik sebelum Read

---

## Anti-Pattern Watchlist

1. **JANGAN** copy-paste BalanceSheetEditor pattern ke IS — extract ManifestEditor DULU (Task 0)
2. **JANGAN** modify build.ts atau applyDerivations — downstream live mode hanya di page wrappers
3. **JANGAN** assume sign conventions — VERIFY terhadap seed fixture values sebelum ship
4. **JANGAN** bump store version — IS/FA slices sudah ada dari v3, Session 011 hanya mengisi data
5. **JANGAN** buat global reactive graph — setiap downstream page useMemo sendiri
6. **JANGAN** ship computed values yang belum di-verify terhadap fixture — off-by-sign = user melihat angka salah

---

## Success Criteria (end of Session 011)

```
✅ ManifestEditor extracted, BS page refactored (zero regression)
✅ deriveComputedRows supports signed computedFrom (backward compatible)
✅ IS manifest has computedFrom declarations, verified against fixture
✅ /input/income-statement page live via ManifestEditor (~15 lines)
✅ SheetPage accepts liveRows prop for downstream override
✅ NOPLAT page live mode — computed from IS, verified against fixture
✅ Growth Revenue page live mode — computed from IS + yoyGrowth derivation
✅ Cash Flow Statement — live mode (full or partial, per CLI decision)
✅ Financial Ratio — live mode with available data, FCF ratios = 0 with note
✅ IS nav entry active in sidebar
✅ 169 + ~10-15 new tests all passing
✅ Build, typecheck, lint all clean
✅ Production deploy verified
✅ progress.md updated with Session 011 entry
```

---

## Key Files to Read BEFORE Implementation

CLI HARUS baca file-file ini sebelum mulai coding:

1. `src/app/input/balance-sheet/page.tsx` — extraction source untuk ManifestEditor
2. `src/components/financial/SheetPage.tsx` — understand current mode detection, add liveRows prop
3. `src/data/live/derive-computed-rows.ts` — extend for signed refs
4. `src/data/manifests/income-statement.ts` — add computedFrom
5. `src/data/manifests/noplat.ts` — understand excelRow mapping for live compute
6. `src/data/manifests/growth-revenue.ts` — understand excelRow mapping
7. `src/data/manifests/cash-flow-statement.ts` — understand excelRow mapping + complexity
8. `src/data/manifests/financial-ratio.ts` — understand excelRow mapping
9. `src/lib/calculations/noplat.ts` + `src/lib/adapters/noplat-adapter.ts` — sign conventions
10. `src/lib/calculations/cash-flow.ts` + `src/lib/adapters/cash-flow-adapter.ts` — sign conventions
11. `src/lib/calculations/ratios.ts` — input requirements
12. `src/lib/calculations/growth-revenue.ts` — input requirements

Baca fixture JSON juga untuk verification:
- `src/data/seed/fixtures/income-statement.json` — leaf vs computed values
- `src/data/seed/fixtures/noplat.json` — expected output values
- `src/data/seed/fixtures/growth-revenue.json`
- `src/data/seed/fixtures/financial-ratio.json`
