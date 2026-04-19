# Session 014 — KEY DRIVERS + PROY FA + PROY LR (Projection Chain Start)

> **Context**: Baca `progress.md` dan `lessons-learned.md` untuk latest state.
> Session 013 delivered: WACC + Discount Rate + Growth Rate. 525 tests, store v5.
>
> **Roadmap**:
> - **Session 014 (ini)**: KEY DRIVERS + PROY FA + PROY LR — projection chain foundation
> - **Session 015**: PROY BS + PROY NOPLAT + PROY CFS + PROY ACC PAYABLES — projection complete
> - **Session 016**: DCF + AAM + EEM — first share value output!
>
> **Execution order kritis**: KEY DRIVERS → PROY FA → PROY LR
> (PROY LR butuh PROY FA depreciation di row 22. PROY FA independent dari PROY LR.)

---

## Pre-read Wajib

Sebelum mulai coding, baca dan pahami fixture-fixture ini:
```bash
python3 -c "import json; [print(k,':',len(json.load(open(f'__tests__/fixtures/{k}.json'))['cells']),'cells') for k in ['key-drivers','proy-fixed-assets','proy-lr']]"
```
- `key-drivers.json`: 141 cells, hidden sheet, 7 projection years (2022-2028)
- `proy-fixed-assets.json`: 260 cells, 3 sections × 6 categories, 4 columns
- `proy-lr.json`: 132 cells, mirrors IS structure, 4 columns (1 historical + 3 projected)

Juga baca: `__tests__/fixtures/fixed-asset.json` column I (rows I17-I22 dan I45-I50) — growth rates yang dipakai PROY FA.

---

## Task 1: KEY DRIVERS Input Form + Store Slice

**Goal**: User input asumsi-asumsi untuk proyeksi keuangan. Ini adalah hidden sheet di Excel yang menjadi sumber data bagi semua PROY sheets.

**PENTING**: KEY DRIVERS bukan ManifestEditor dan bukan manifest-driven page. Ini custom form dengan struktur unik — ada grid per-year input (7 kolom tahun), ada section headers, ada computed rows.

### Struktur dari Fixture (sudah di-verify Cowork)

**Section 1 — Financial Drivers** (rows 7-11):
| Row | Label | Type | Default Value |
|-----|-------|------|---------------|
| 8 | Interest Rate (Short Term Loan) | user input | 14% |
| 9 | Interest Rate (Long Term Loan) | user input | 12% |
| 10 | Bank Deposit Rate | user input | 9% |
| 11 | Corporate Tax Rate | user input | 22% |

Single-column values (tidak per-year).

**Section 2 — Operational Drivers** (rows 13-24):
| Row | Label | Type | Notes |
|-----|-------|------|-------|
| 14 | Sales Vol. (unit) | per-year input | D14=1091700 (year 1 manual), E14+=computed via `ROUND(D*(1+increment), -2)` |
| 15 | Sales Vol. Increment | per-year input | E15-J15 = 5%, 10%, 10%, 10%, 10%, 10% |
| 17 | Sales Price (IDR/unit) | per-year input | D17=111000 (year 1 manual), E17+=computed via `ROUNDUP(D*(1+increment), -3)` |
| 18 | Sales Price Increment | per-year input | E18-J18 = all 5% |
| 20 | COGS (% of revenue) | per-year input | Seeded from IS!K7 = -0.5528. All years same. **NEGATIF di Excel.** |
| 23 | Selling expense (% of revenue) | per-year input | Seeded from IS!K12 = -0.2139. **NEGATIF.** |
| 24 | G&A expense (inflation) | per-year input | Seeded from IS!K13 = -0.1177. **NEGATIF.** |

**SIGN CONVENTION WARNING**: Di Excel, COGS dan expense ratios di KEY DRIVERS disimpan sebagai **negatif** (e.g., -0.5528). PROY LR formula: `Revenue * (-0.5528)` menghasilkan COGS negatif secara natural. Tapi untuk UX, user TIDAK BOLEH input angka negatif — kita perlu decide:
- Opsi A: Simpan sebagai positif di store, negate saat compute PROY LR
- Opsi B: Simpan sebagai negatif (mirip Excel), display sebagai positif di form
- **Rekomendasi**: Opsi A — konsisten dengan user-positive convention (LESSON dari Session 011, Sign Convention). Semua ratios di store = positif. Negation terjadi di compute adapter PROY LR.

**Section 3 — Balance Sheet Drivers** (rows 26-30):
| Row | Label | Type | Notes |
|-----|-------|------|-------|
| 28 | Acc. Receivable | per-year input | Days (e.g., 35) |
| 29 | Inventory | per-year input | Days (e.g., 50) |
| 30 | Account Payable | per-year input | Days (e.g., 90) |

**Section 4 — Additional Capex** (rows 32-37):
| Row | Label | Type | Notes |
|-----|-------|------|-------|
| 33 | Land | per-year input | IDR amount (prototype: all 0) |
| 34 | Building | per-year input | IDR amount (prototype: all 0) |
| 35 | Equipment | per-year input | IDR amount (prototype: all 1000) |
| 36 | Others | per-year input | IDR amount (prototype: all 500) |
| 37 | Total Additional Capex | **computed** | `SUM(33:36)` per year |

### Steps

1. **Inspect fixture** — verifikasi struktur di atas. Perhatikan:
   - Row 14/17: Year 1 (D column) is direct input, subsequent years computed from increment
   - IS references: `'INCOME STATEMENT'!K6` (revenue growth), `!K7` (COGS ratio), `!K12` (Selling), `!K13` (G&A)
   - IS column K = AVERAGE of historical growth rates (H:J). **Verify IS manifest column K values exist in fixture.**

2. **Desain Zustand slice**: `keyDrivers: KeyDriversState | null`
   ```typescript
   interface KeyDriversState {
     financialDrivers: {
       interestRateShortTerm: number  // 0.14
       interestRateLongTerm: number   // 0.12
       bankDepositRate: number        // 0.09
       corporateTaxRate: number       // 0.22
     }
     operationalDrivers: {
       // Year 1 base values
       salesVolumeBase: number        // 1091700
       salesPriceBase: number         // 111000
       // Per-year increments (index 0 = year 2, since year 1 is base)
       salesVolumeIncrements: number[]  // [0.05, 0.10, 0.10, ...]
       salesPriceIncrements: number[]   // [0.05, 0.05, 0.05, ...]
       // Ratios (stored POSITIVE — negate in compute adapters)
       cogsRatio: number              // 0.5528 (positive!)
       sellingExpenseRatio: number    // 0.2139 (positive!)
       gaExpenseRatio: number         // 0.1177 (positive!)
     }
     bsDrivers: {
       accReceivableDays: number[]    // [35, 35, ...] per projection year
       inventoryDays: number[]        // [50, 50, ...]
       accPayableDays: number[]       // [90, 90, ...]
     }
     additionalCapex: {
       // Per-year values for each category
       land: number[]                 // [0, 0, ...]
       building: number[]             // [0, 0, ...]
       equipment: number[]            // [1000, 1000, ...]
       others: number[]               // [500, 500, ...]
     }
   }
   ```
   Bump store v5→v6 dengan chain migration (LESSON-028).

3. **Buat form component**: `src/components/forms/KeyDriversForm.tsx`
   - Client component dengan tabbed/sectioned layout (4 sections)
   - Per-year grid input (7 kolom) untuk operational & BS drivers
   - Auto-compute: Sales Vol per year, Sales Price per year, Total Capex
   - Seed default values dari IS averages saat pertama kali diakses (COGS ratio, expense ratios, revenue growth)
   - Debounce persist ke store (500ms, sama dengan ManifestEditor)
   - Projection years computed dari `tahunTransaksi` (HOME)

4. **Buat page**: `src/app/input/key-drivers/page.tsx`
   - Hydration gate + HOME guard (pattern sama dengan BS/IS/FA input pages)
   - `<KeyDriversForm />`

5. **Nav-tree**: Tambah "Key Drivers" di group "Input Data" (karena ini input form).

6. **Seed sync**: Tambah key-drivers ke seed fixtures + loader.

7. **Tests**:
   - Store migration v5→v6 test
   - Computed sales volume/price per year match fixture
   - Total Additional Capex computed correctly

**Verification**: Tests pass, build clean. KEY DRIVERS accessible dari store.

**Commit**: `feat: KEY DRIVERS projection assumptions input form + store v6`

---

## Task 2: PROY Fixed Assets (Projected FA from Historical + Growth Rates)

**Goal**: Proyeksi fixed asset schedule berdasarkan historical FA data + growth rates dari FA column I.

**PENTING**: PROY FA bukan input page — ini downstream computation (Pattern C). Tapi punya dependency unik: FA column I growth rates. Kolom I berisi `AVERAGE(G:H)` = average growth rate dari 2 tahun historis terakhir.

### Dependency Analysis (sudah di-verify Cowork)

PROY FA references:
1. `'FIXED ASSET'!E8:E13` — Beginning acquisition costs (last historical year)
2. `'FIXED ASSET'!E17:E22` — Historical additions (last historical year)
3. **`'FIXED ASSET'!$I17:$I22`** — Acquisition addition growth rates (average of G:H)
4. `'FIXED ASSET'!E36:E41` — Beginning depreciation
5. `'FIXED ASSET'!E45:E50` — Historical depreciation additions
6. **`'FIXED ASSET'!$I45:$I50`** — Depreciation addition growth rates (average of G:H)

**Column I values from fixture** (critical — most are 0 except):
- I21 (Office Inventory additions): `2.953475214778365` (295% growth!)
- I48 (Vehicle depreciation additions): `-0.23419965694620692`
- I49 (Office Inventory depreciation additions): `2.021988592940754`

**FA Column I** di Excel = `AVERAGE(G_row:H_row)` where G and H are per-year growth rates. These are themselves computed from the FA schedule (year-over-year change in additions/depreciation). In live mode, these growth rates MUST be computed from the FA store data (user-entered values), not hardcoded.

### Projection Formula Pattern

Per category (6 categories), per section (Acquisition, Depreciation):
```
Additions[year N] = Additions[year N-1] * (1 + growth_rate)
  - year 0 (col C) = historical last year = FIXED ASSET col E
  - growth_rate = AVERAGE of historical growth rates

Beginning[year N] = Ending[year N-1]
  - year 0 Beginning = historical FA col E values

Ending[year N] = Beginning[year N] + Additions[year N]

Net Value[year N] = Acquisition Ending[year N] - Depreciation Ending[year N]
```

### Steps

1. **Verifikasi FA fixture column I**: Pastikan growth rates dari column I match formula `AVERAGE(G:H)`. Cek juga FA fixture columns G dan H untuk konfirmasi.

2. **Growth rate computation**: Buat helper function di `src/lib/calculations/`
   ```typescript
   // Compute average historical growth rates from FA additions data
   // Similar to FA column I = AVERAGE(G:H)
   function computeFaGrowthRates(faRows: Record<number, YearKeyedSeries>): {
     acquisitionGrowth: Record<number, number>  // keyed by FA row (17-22)
     depreciationGrowth: Record<number, number> // keyed by FA row (45-50)
   }
   ```

3. **Buat compute adapter**: `src/data/live/compute-proy-fixed-assets-live.ts`
   - Input: FA store data (historical values)
   - Output: `Record<number, YearKeyedSeries>` keyed by PROY FA manifest row numbers
   - Projection years = `tahunTransaksi + 2` through `tahunTransaksi + 4` (3 projection years, DCF kolom D/E/F)
   - Column C (historical) = FA last year values
   - Columns D/E/F = projected using growth rates

4. **Buat manifest** (jika belum ada, atau update existing): `src/data/manifests/proy-fixed-assets.ts`
   - Mirrors FA structure: 3 sections × 6 categories + totals
   - 69 rows sesuai fixture
   - No derivations needed (semua computed di adapter)

5. **TDD**: `__tests__/data/live/compute-proy-fixed-assets-live.test.ts`
   - Load FA fixture as "user input"
   - Compute growth rates
   - Compute projected values
   - Assert key rows match PROY FA fixture @ 12-decimal precision:
     - Row 23 (Total Additions): D=1423817993.31, E=5422876576.92, F=21233055569.67
     - Row 51 (Total Depreciation): D=267708942.37, E=643810255.15, F=1819074645.01
     - Row 69 (Total Net Value): D=592461358881.94, E=597240425203.71, F=616654406128.38

6. **LiveView wrapper**: `src/components/analysis/ProyFixedAssetsLiveView.tsx`
   - Reads FA store slice
   - Computes projected values via `useMemo`
   - Passes `liveRows` to `<SheetPage>`

7. **Page**: `src/app/projection/fixed-asset/page.tsx` (atau `proyeksi/` — pilih section name yang tepat)

8. **Nav-tree + seed sync**

**Verification**: PROY FA fixture values match. Key: row 51 (total depreciation additions) harus PERSIS match karena PROY LR row 22 pakai ini.

**Commit**: `feat: PROY Fixed Assets projected from historical FA + growth rates`

---

## Task 3: PROY LR (Projected Income Statement)

**Goal**: Proyeksi laba rugi berdasarkan KEY DRIVERS assumptions + IS historical + PROY FA depreciation.

### Dependency Analysis (sudah di-verify Cowork)

PROY LR references:
1. **KEY DRIVERS**: COGS ratio (D20), Selling ratio (D23), G&A ratio (D24), Tax rate (C11)
2. **IS historical**: Revenue (F6), Revenue growth (K6), COGS (F7), Operating expenses (F12-F13), Interest Income (F26 + K26 growth), Interest Expense (F27 + K27 growth), Non-Operating Income (F30 + K30 growth), Corporate Tax (F33)
3. **PROY FA**: Depreciation total (D51/E51/F51) — row 22 formula: `='PROY FIXED ASSETS'!D51*-1`
4. Years: references `'PROY BALANCE SHEET'!C5:F5` — tapi PROY BS belum dibangun. **Workaround**: compute years langsung dari `tahunTransaksi`.

### Formula Chain (simplified)

```
Revenue[proj] = Revenue[prev] * (1 + revenue_growth)    // revenue_growth = IS!K6
COGS[proj] = Revenue[proj] * COGS_ratio                 // from KEY DRIVERS, NEGATED
Gross Profit = Revenue + COGS
Selling[proj] = Revenue[proj] * selling_ratio            // from KEY DRIVERS, NEGATED
G&A[proj] = Revenue[proj] * ga_ratio                     // from KEY DRIVERS, NEGATED
OpEx = Selling + G&A
EBITDA = Gross Profit + OpEx
Depreciation = PROY FA total * -1                        // from Task 2
EBIT = EBITDA + Depreciation
Interest Income = prev * (1 + IS!K26 growth)
Interest Expense = prev * (1 + IS!K27 growth)
Other Income = Interest Income + Interest Expense
Non-Op Income = prev * (1 + IS!K30 growth)
Profit Before Tax = EBIT + Other Income + Non-Op Income
Tax = PBT * tax_rate * -1                                // tax_rate from KEY DRIVERS
Net Profit = PBT + Tax
```

### Sign Convention Analysis

**KRITIS**: KEY DRIVERS menyimpan ratios sebagai **negatif** di Excel:
- COGS ratio = -0.5528 → `Revenue * (-0.5528)` = COGS (negatif)
- Selling ratio = -0.2139 → `Revenue * (-0.2139)` = selling expense (negatif)
- G&A ratio = -0.1177 → same pattern

Jika di store kita simpan **positif** (Task 1 recommendation), maka:
- Compute adapter harus: `Revenue * ratio * -1` untuk COGS dan expenses
- Atau: `Revenue * -ratio`

### IS Column K Values (growth rates for PROY LR seeding)

Sudah di-verify Cowork dari fixture:
- K6 (Revenue growth): 0.2305
- K7 (COGS ratio): -0.5528
- K12 (Selling ratio): -0.2139
- K13 (G&A ratio): -0.1177
- K26 (Interest Income growth): 0.0014
- K27 (Interest Expense growth): -0.0003
- K30 (Non-Operating Income growth): 0

### Steps

1. **Buat compute adapter**: `src/data/live/compute-proy-lr-live.ts`
   - Input: KEY DRIVERS store, IS store, PROY FA computed values (passed as parameter)
   - Output: `Record<number, YearKeyedSeries>` mapped to PROY LR fixture row numbers
   - Handle column C (historical = IS last year) + columns D/E/F (projected)
   - **SIGN CONVENTION**: Negate ratios from KEY DRIVERS store (stored positive → apply as negative for costs)

2. **Buat manifest**: `src/data/manifests/proy-lr.ts`
   - Rows matching fixture structure (rows 8-40)
   - Include margin rows (12, 20, 26, 40) as derivations or computed in adapter

3. **TDD**: `__tests__/data/live/compute-proy-lr-live.test.ts`
   - Load IS fixture + KEY DRIVERS fixture + PROY FA computed values
   - Compute PROY LR
   - Assert key rows @ 12-decimal precision:
     - Row 8 (Revenue): D=75106435974.34, E=92415015333.48, F=113712426216.11
     - Row 10 (COGS): D=-41517664017.67 (note: negatif)
     - Row 11 (Gross Profit): D=33588771956.67
     - Row 19 (EBITDA): D=8685100649.74
     - Row 25 (EBIT): D=8417391707.38
     - Row 39 (Net Profit): D=6632543589.15

4. **LiveView wrapper**: `src/components/analysis/ProyLrLiveView.tsx`
   - Reads IS store + KEY DRIVERS store + FA store
   - Computes PROY FA → then PROY LR (chain)
   - Passes `liveRows` to `<SheetPage>`

5. **Page**: `src/app/projection/income-statement/page.tsx` (parallel naming dengan historical)

6. **Nav-tree + seed sync**

**Penting**: PROY LR column C values = historical IS last year. Ini BUKAN dari KEY DRIVERS. Pastikan adapter maps IS store data ke PROY LR column C correctly.

**Verification**: PROY LR Net Profit row 39 matches fixture. Revenue chain correct. Depreciation from PROY FA correct.

**Commit**: `feat: PROY LR projected income statement from KEY DRIVERS + IS + PROY FA`

---

## Final Verification

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
npm run build 2>&1 | tail -25
npm run typecheck 2>&1 | tail -10
npm run lint 2>&1 | tail -10
```

Update `progress.md`:
- Total tests baru
- Pages baru (Key Drivers, Proy Fixed Assets, Proy Income Statement)
- Store version (v6)
- Projection chain progress: KEY DRIVERS ✅ → PROY FA ✅ → PROY LR ✅
- Remaining: PROY BS, PROY NOPLAT, PROY CFS, PROY AP (Session 015) → DCF + AAM + EEM (Session 016)
- Session 014 summary

Update `lessons-learned.md` jika ada lesson baru.

---

## Non-Negotiables (reminder)

- **TDD**: Setiap compute adapter di-test terhadap fixture @ 12-decimal precision.
- **LESSON-035**: Trust fixture formulas, bukan labels atau asumsi.
- **LESSON-011**: Sign convention di adapter layer. Store = positif, negate di compute.
- **LESSON-028**: Store migration v5→v6 HARUS chained.
- **LESSON-013**: Column offset bisa berbeda antar sheets. PROY FA col C = tahun terakhir historis, bukan tahun pertama.
- **LESSON-029**: Company-agnostic. Projection years computed dari `tahunTransaksi`, bukan hardcode 2022-2024.
- **PROY FA row 51** = total depreciation additions. Ini dipakai PROY LR row 22. Jika PROY FA salah, PROY LR ikut salah. **Verify row 51 first before proceeding to Task 3.**

## Catatan

- KEY DRIVERS punya 7 kolom proyeksi (2022-2028) tapi DCF hanya pakai 3 tahun (2022-2024). Tetap implementasi 7 kolom supaya future-proof, tapi test fokus ke 3 tahun pertama.
- FA column I growth rates: I21 (Office Inventory) = 2.95 (295% growth!), I49 = 2.02 (202% growth). Ini bukan bug — Office Inventory memang tumbuh sangat cepat di fixture. Jangan "fix" angka yang tampak aneh — trust fixture.
- PROY LR years harusnya dari PROY BS (belum ada). Workaround: compute langsung dari `tahunTransaksi`. Session 015 bisa wire ke PROY BS years jika perlu.
- Estimasi: ~40-50 tests baru, 3 pages, 1 store migration.
