# Session 015 — PROY FA Fix + PROY AP/BS/NOPLAT/CFS (Projection Chain Complete)

> **Context**: Baca `progress.md` dan `lessons-learned.md` untuk latest state.
> Session 014 delivered: KEY DRIVERS + PROY FA + PROY LR. 563 tests, store v6.
> Deviation dari S014: PROY FA precision tests hanya structural, belum exact fixture match.
>
> **Roadmap**:
> - **Session 015 (ini)**: Fix PROY FA precision + PROY AP/BS/NOPLAT/CFS — projection chain COMPLETE
> - **Session 016**: DCF + AAM + EEM — first share value output!
>
> **Execution order**: Fix FA → PROY AP → PROY BS → PROY NOPLAT → PROY CFS

---

## Task 0: PROY FA Exact Fixture Precision Tests

**Goal**: Tambahkan exact fixture match tests untuk PROY FA key rows, bukan hanya structural tests.

**Steps**:
1. Buat/update test file: `__tests__/data/live/compute-proy-fixed-assets-live.test.ts`
2. Load FA fixture sebagai "historical user input"
3. Compute projected values via `computeProyFixedAssetsLive`
4. Assert exact matches @ 12-decimal precision untuk:
   - Row 23 (Total Additions): D=`1423817993.311922`, E=`5422876576.922622`, F=`21233055569.6742`
   - Row 51 (Total Depreciation Additions): D=`267708942.36900568`, E=`643810255.1516942`, F=`1819074645.0107172`
   - Row 69 (Total Net Value): D=`592461358881.9375`, E=`597240425203.7106`, F=`616654406128.3787`
   - Row 32 (Total Acquisition Ending): D=`593454381423.31`, E=`598877258000.23`, F=`620110313569.91`
   - Row 60 (Total Depreciation Ending): D=`993022541.37`, E=`1636832796.52`, F=`3455907441.53`

**PENTING**: Fixture values harus dari `proy-fixed-assets.json` fixture langsung — load file dan extract exact values. Jangan hardcode rounded numbers.

**Jika ada precision mismatch**: Investigasi apakah growth rate computation (`AVERAGE(G:H)` di FA) menghasilkan sedikit floating-point drift. Jika ya, dokumenkan sebagai lesson learned dan terima tolerance `toBeCloseTo(val, 6)` minimum.

**Verification**: Tests pass. Semua key PROY FA rows match fixture.

**Commit**: `test: add exact fixture precision tests for PROY FA computed rows`

---

## Task 1: PROY ACC PAYABLES (Projected Loan Schedules)

**Goal**: Proyeksi skedul utang bank. **Semua nilai = 0 di prototype workbook.** Tapi structure harus tetap benar untuk CFS dependency.

### Struktur dari Fixture (sudah di-verify Cowork — 116 cells)

**Section A — Bank Loan SHORT TERM** (rows 8-15):
- Row 10: Beginning (= prior year Ending). C10 = `ACC PAYABLES!E9`
- Row 11: Addition (user input, all 0)
- Row 12: Repayment (user input, all 0)
- Row 13: Ending = `SUM(Beginning:Repayment)` — **computed**
- Row 15: Interest Payable = `Ending * interest_rate * -1`. Interest rate parsed from cell B15 label "interest rate 14%" via `RIGHT($B$15, 3)` (Excel hack!)

**Section B — Bank Loan LONG TERM** (rows 17-24):
- Same structure as ST but rows 19-22
- Row 18: interest rate (0.13 from ACC PAYABLES)
- Row 21: Repayment — **ini yang PROY CFS row 26 referensi** (`='PROY ACC PAYABLES'!D21`)
- Row 24: Interest Payable

**Years**: 7 projection years (C=2021 historical, D-J=2022-2028)

### Pendekatan

Karena semua nilai = 0 di prototype, ini YAGNI case. Dua opsi:
- **Opsi A (Minimal)**: Buat compute adapter yang returns all zeros, hardcode structure. No store slice, no input page. PROY CFS gets 0 for principal repayment.
- **Opsi B (Full)**: Buat input form + store slice untuk loan schedules. Overkill untuk prototype.

**Rekomendasi**: Opsi A. Buat minimal compute adapter + page. Jika di masa depan user butuh loan schedules, bisa extend. Ini hidden sheet dan semua zero — YAGNI.

**Steps**:
1. Buat compute adapter: `src/data/live/compute-proy-acc-payables-live.ts` — returns Record with all 0 values mapped to fixture row numbers. Jika `accPayables` store slice punya data, use it; otherwise all zeros.
2. Buat page: `src/app/projection/acc-payables/page.tsx` (seed mode only is fine)
3. Nav-tree + seed sync
4. Minimal test: computed values = 0 for all rows (matches prototype fixture)

**Commit**: `feat: PROY ACC PAYABLES minimal projection (all zeros prototype)`

---

## Task 2: PROY Balance Sheet (Projected BS — COMPLEX)

**Goal**: Proyeksi neraca berdasarkan historical BS growth rates + PROY FA + PROY LR data.

### ⚠️ WARNINGS — Temuan Kritis dari Fixture Inspection

**1. #DIV/0! ERRORS**: Rows 50-52 (Other Non-Current Liabilities) dan row 62 (Total L&E) have `#DIV/0!` di kolom E dan F. Ini karena C50=0 dan formula `(D50-C50)/C50` divide by zero. **Handle dengan safe division: if denominator=0, return 0.**

**2. MANUAL ADJUSTMENTS (Row 64)**: Label "copas number only atu-atu" — hardcoded values:
- D64 = `-39411326238.20`
- E64 = `-94754819494.02`
- F64 = `-92891524708.56`

Ini dipakai di AR formula: `Account Receivable[proj] = AR[prev] * (1 + growth) - adjustment[row64]`. Tanpa adjustment ini, AR projection akan sangat berbeda dari fixture. **Untuk live mode: set adjustment = 0** (user enters their own AR). Untuk seed mode: fixture values sudah termasuk adjustment.

**3. BS COLUMN Q** (average growth rates): Sudah tersedia di BS fixture. Key values:
| BS Row | Item | Q value |
|--------|------|---------|
| Q8 | Cash on Hands | -0.0119 |
| Q9 | Cash in Banks | 4.9082 (!) |
| Q10 | Account Receivable | 0.5167 |
| Q12 | Inventory | 0.2718 |
| Q14 | Others (Current) | -0.1387 |
| Q31 | Bank Loan ST | -0.3333 |
| Q32 | Account Payables | -0.2016 |
| Q33 | Tax Payable | 0.2124 |
| Q34 | Others (CL) | -0.1568 |

### Struktur (236 cells, rows 1-65)

**Assets:**
- Current Assets (rows 8-21): Cash, Cash in Banks, AR, Other Receivable, Inventory, Others
  - Each item: projected value + growth rate row below it
  - Formula: `Value[proj] = Value[prev] * (1 + growth_rate)`
  - AR exception: `- D64` adjustment (see warning #2)
  - Total Current Assets (row 21) = sum of individual items
- Non-Current Assets (rows 23-31): from PROY FIXED ASSETS
  - Row 25 (Beginning/FA Total Acquisition): `='PROY FIXED ASSETS'!D32`
  - Row 26 (Acc Depreciation): `='PROY FIXED ASSETS'!D60*-1`
  - Row 28 (FA Net): `D25 + D26`
  - Row 29 (Other NCA): carried forward from BS
  - Row 30 (Intangible): grows by BS!Q24 growth rate
  - Row 31 (Total NCA): `D28 + D29 + D30`
- Total Assets (row 33) = Current + Non-Current

**Liabilities:**
- Current Liabilities (rows 36-45): Bank Loan ST, AP, Tax Payable, Others
  - Each grows by BS column Q growth rate
  - Total CL (row 45) = sum
- Non-Current Liabilities (rows 47-52): Bank Loan LT, Other NCL
  - ⚠️ #DIV/0! errors — use IFERROR/safe division
  - Total NCL (row 52) = sum

**Equity (rows 54-60):**
- Paid Up Capital (row 55): constant (carried forward)
- Surplus (row 57): constant (carried forward)
- Current Profit (row 58): cumulative: `prev + PROY LR net profit`
  - Formula: `=C58+'PROY LR'!D39` — accumulates net profit each year
- Retained Earnings Ending (row 59) = Surplus + Current Profit
- Total Equity (row 60) = Paid Up Capital + Retained Earnings
- Total L&E (row 62) = CL + NCL + Equity
- Balance Control (row 63) = Assets - L&E (should be ≈0 but isn't due to manual model)

### Dependencies

- **BS store**: historical values + column Q growth rates
- **PROY FA**: rows 32, 60 (acquisition total, depreciation total) — from Task 2 Session 014
- **PROY LR**: row 39 (net profit) — from Task 3 Session 014
- **BS column Q**: must be computable from BS store data (AVERAGE of historical growth columns N:P, which are themselves computed from year-over-year changes)

### Steps

1. **Compute BS growth rates**: Buat helper function yang compute column Q values dari BS store data — sama seperti FA column I computation (AVERAGE of historical growth rates).

2. **Buat compute adapter**: `src/data/live/compute-proy-balance-sheet-live.ts`
   - Input: BS store, PROY FA computed values, PROY LR computed values
   - Output: `Record<number, YearKeyedSeries>`
   - Handle safe division for #DIV/0! (return 0 when denominator = 0)
   - For live mode: skip row 64 adjustments (set to 0)
   - For seed mode: fixture values include adjustments

3. **TDD**: `__tests__/data/live/compute-proy-balance-sheet-live.test.ts`
   - Focus on rows WITHOUT manual adjustments:
     - Row 21 (Total Current Assets) — note: will differ from fixture due to missing row 64 adjustments
     - Row 28 (FA Net): should match (comes from PROY FA)
     - Row 31 (Total NCA): should match
     - Row 45 (Total CL): should match
     - Row 60 (Total Equity): should match (involves PROY LR net profit accumulation)
   - **Accept tolerance** for rows affected by row 64 adjustments — document WHY
   - Test safe division: ensure no errors when input values = 0

4. **Page**: `src/app/projection/balance-sheet/page.tsx`
5. **Nav-tree + seed sync**

**Commit**: `feat: PROY BS projected balance sheet from BS growth rates + PROY FA/LR`

---

## Task 3: PROY NOPLAT (Projected NOPLAT — Straightforward)

**Goal**: Proyeksi NOPLAT dari PROY LR data. Struktur identik dengan historical NOPLAT.

### Struktur (63 cells, rows 1-19)

Sangat straightforward — semua data dari PROY LR:
| Row | Label | Source |
|-----|-------|--------|
| 7 | Profit Before Tax | `PROY LR!D36` |
| 8 | Add: Interest Expenses | `PROY LR!D31 * -1` |
| 9 | Less: Interest Income | `PROY LR!D29 * -1` |
| 10 | Non Operating Income | `PROY LR!D34 * -1` |
| 11 | EBIT | `SUM(7:10)` |
| 13 | Tax Provision | `PROY LR!D37 * -1` |
| 14 | Tax Shield on Interest Exp | `PROY LR!$B$37 * PROY LR!D31 * -1` |
| 15 | Tax on Interest Income | `PROY LR!$B$37 * PROY LR!D29 * -1` |
| 16 | Tax on Non-Op Income | `PROY LR!$B$37 * PROY LR!D34 * -1` |
| 17 | Total Taxes on EBIT | `SUM(13:16)` |
| **19** | **NOPLAT** | `EBIT - Total Taxes` |

**SIGN CONVENTION**: Interest Expense di PROY LR = negatif (e.g., -19478161.53). PROY NOPLAT row 8 = `PROY LR!D31 * -1` = +19478161.53 (add back). Interest Income di PROY LR = positif (105347465.88). PROY NOPLAT row 9 = `PROY LR!D29 * -1` = -105347465.88 (subtract).

**Column C** = historical NOPLAT dari IS (same as existing NOPLAT page). Columns D-F = projected.

**Key output**: Row 19 (NOPLAT) = D:`6565565531.75`, E:`7833389201.02`, F:`8837646482.41` — **ini yang DCF butuh!**

### Steps

1. Buat compute adapter: `src/data/live/compute-proy-noplat-live.ts`
   - Input: PROY LR computed values (passed as parameter, sudah di-compute di upstream chain)
   - Output: mapped ke PROY NOPLAT fixture row numbers
   - PROY LR `$B$37` = tax rate (0.22 dari KEY DRIVERS)

2. **TDD**: `__tests__/data/live/compute-proy-noplat-live.test.ts`
   - Assert row 19 (NOPLAT) matches fixture @ 12-decimal precision
   - Assert row 11 (EBIT) matches
   - Assert row 17 (Total Taxes) matches

3. **Page + nav-tree**: `src/app/projection/noplat/page.tsx`

**Commit**: `feat: PROY NOPLAT projected from PROY LR data`

---

## Task 4: PROY Cash Flow Statement (Projected CFS — Final Link)

**Goal**: Proyeksi cash flow dari PROY LR + PROY BS + PROY FA + PROY AP. Ini sheet terakhir sebelum DCF bisa di-compute.

### Struktur (111 cells, rows 1-36)

| Row | Label | Source |
|-----|-------|--------|
| 5 | EBITDA | `PROY LR!D19` |
| 6 | Corporate Tax | `PROY LR!D37` (negatif) |
| **8** | **Current Assets Changes** | `(PROY BS CA[year] - PROY BS CA[prev]) * -1` — **COMPLEX formula** |
| **9** | **Current Liabilities Changes** | `PROY BS!D45 - PROY BS!C45` |
| 10 | Working Capital | `row 8 + row 9` |
| 11 | CFO | `SUM(5:9)` |
| 13 | Non-Operating Income | `PROY LR!D34` |
| 17 | CapEx | `PROY FA!D23 * -1` |
| 19 | CF before Financing | `CFO + Non-Op + CapEx` |
| 22-26 | Financing items | Equity injection, New Loan, Interest Exp/Inc, Principal (from PROY AP) |
| 28 | CF from Financing | `SUM(22:26)` |
| 30 | Net Cash Flow | `CFO + Non-Op + CapEx + CFF` |
| 32 | Cash Beginning | Prior year ending |
| 33 | Cash Ending | `PROY BS!(D9 + D11)` (Cash on Hands + Cash in Banks) |

### Row 8 Formula Detail (KRITIS — sudah di-verify Cowork)

```
Row 8 = ((PROY BS D13 + D15 + D17 + D19) - (PROY BS C13 + C15 + C17 + C19)) * -1
```

Ini = delta Current Assets (AR + Other Receivable + Inventory + Others) antar tahun, di-negate. **PENTING**: PROY BS row 13 (AR) di fixture sudah includes row 64 adjustment. Karena live mode kita skip row 64, nilai row 8 akan berbeda dari fixture di live mode. Accept this — document as known deviation.

### Row 9 Formula

```
Row 9 = PROY BS D45 - PROY BS C45
```

Delta Total Current Liabilities antar tahun. Straightforward.

### Steps

1. Buat compute adapter: `src/data/live/compute-proy-cash-flow-live.ts`
   - Input: PROY LR, PROY BS, PROY FA, PROY AP computed values
   - Output: mapped ke PROY CFS fixture row numbers
   - Column C = historical CFS values (dari existing CFS fixture/store)

2. **TDD**: `__tests__/data/live/compute-proy-cash-flow-live.test.ts`
   - Focus on rows NOT affected by PROY BS row 64 adjustments:
     - Row 5 (EBITDA): should match exactly (from PROY LR)
     - Row 6 (Tax): should match exactly
     - Row 17 (CapEx): should match exactly (from PROY FA)
     - Row 28 (CFF): should match exactly
   - Rows 8, 10, 11, 19, 30 will have known deviation due to missing PROY BS adjustments — document tolerance

3. **Page + nav-tree**: `src/app/projection/cash-flow/page.tsx`

**Commit**: `feat: PROY CFS projected cash flow completing projection chain`

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
- Projection chain status: **COMPLETE**
  - KEY DRIVERS ✅ → PROY FA ✅ → PROY LR ✅ → PROY AP ✅ → PROY BS ✅ → PROY NOPLAT ✅ → PROY CFS ✅
- **Session 016 ready**: DCF now has all upstream dependencies
  - PROY NOPLAT row 19 ✅ (DCF row 7)
  - PROY FA row 23/51 ✅ (DCF rows 8, 16)
  - PROY CFS rows 8/9 ✅ (DCF rows 12, 13)
  - DISCOUNT RATE H10 ✅ (DCF row 23)
  - GROWTH RATE average ✅ (DCF row 26)
- Pages baru
- Session 015 summary

Update `lessons-learned.md`:
- #DIV/0! handling pattern (safe division in projection sheets)
- Manual adjustments in Excel workbook (row 64 "copas") — known deviation in live mode
- PROY AP all-zeros YAGNI pattern

---

## Non-Negotiables (reminder)

- **TDD**: Setiap compute adapter di-test. Exact precision where possible, documented tolerance where manual adjustments prevent exact match.
- **LESSON-035**: Trust fixture formulas.
- **LESSON-013**: Column offset awareness — PROY CFS column C = last historical year.
- **LESSON-028**: JANGAN bump store version sesi ini — tidak ada slice baru.
- **Safe division**: Setiap division operation harus handle denominator = 0 → return 0.
- **PROY BS row 64**: Acknowledged deviation. Live mode skips manual adjustments. Seed mode shows fixture values correctly.

## Estimasi

- ~5 tasks (incl. Task 0 fix)
- ~30-40 tests baru
- 4 new projection pages
- 0 store migrations
- PROY chain selesai → Session 016 siap untuk DCF!
