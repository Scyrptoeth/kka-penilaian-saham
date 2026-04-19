# Session 013 — WACC + Discount Rate + Growth Rate (Valuation Foundation)

> **Context**: Baca `HANDOFF-COWORK-3c552009.md` di root repo dan `lessons-learned.md` untuk full context.
> Session 012 berhasil: 476 tests, 9/9 analysis pages live, FR 18/18, store v4. Sekarang mulai phase valuation.
>
> **Roadmap revisi** (hasil analisa Cowork terhadap fixture DCF):
> - **Session 013 (ini)**: WACC + Discount Rate + Growth Rate — foundation, self-contained
> - **Session 014**: KEY DRIVERS + PROY LR + PROY FA — projection chain start
> - **Session 015**: PROY BS + PROY NOPLAT + PROY CFS — projection chain complete
> - **Session 016**: DCF + AAM + EEM — first share value output!
>
> DCF membutuhkan PROY sheets (PROY NOPLAT, PROY FIXED ASSETS, PROY CFS) untuk kolom proyeksi. Ini bukan bisa di-skip — fixture DCF referensi `'PROY NOPLAT'!D19`, `'PROY FIXED ASSETS'!D51`, `'PROY CASH FLOW STATEMENT'!D8`, dll. Share value output realistis di Session 016.

---

## Scope & Deliverables

3 task berurutan. Commit setelah setiap task.

---

### Task 1: WACC Input Form + Computation

**Goal**: User input data comparable companies + cost parameters → WACC auto-compute.

**PENTING — WACC bukan ManifestEditor page.** Ini custom form seperti DLOM/DLOC, tapi dengan tabel dinamis (comparable companies). Inspect `__tests__/fixtures/wacc.json` untuk memahami structure lengkap.

**Struktur WACC dari fixture** (sudah di-inspect Cowork):

**Section A — Market Parameters (user input, single values):**
- Row 4: Equity Risk Premium = 7.62%
- Row 5: Rating Based Default Spread = 2.26%
- Row 6: Risk Free (SUN) = 2.70%

**Section B — Comparable Companies Table (user input, dynamic rows):**
- Rows 11-13: 3 perusahaan pembanding, masing-masing:
  - Nama perusahaan (text)
  - BL (Beta Levered) — user input number
  - Market Cap — user input number (IDR)
  - Debt — user input number (IDR)
  - BU (Beta Unlevered) — **computed**: `BL / (1 + ((1-t) * (Debt/MarketCap)))`
    - `t` = tax rate dari IS (lihat formula: `'INCOME STATEMENT'!$B$33`)
- Row 14: Rata-rata — **computed**: average BL, sum MarketCap, sum Debt, average BU
- Row 15: Relevered Beta — **computed**: `avg_BU * (1 + ((1-t) * (sum_Debt/sum_MarketCap)))`

**Section C — Capital Structure + WACC:**
- Row 19 Hutang: Nilai = BS row 35+40 (short+long term debt). Bobot = `sum_Debt / (sum_Debt + sum_MarketCap)` dari comparable. Biaya Modal = `avg_interest * (1-t)`. WACC komponen = Bobot * Biaya Modal.
- Row 20 Ekuitas: Nilai = BS row 49 (total equity). Bobot = `1 - bobot_hutang`. Biaya Modal = `Rf + (BL_relevered * ERP) - RBDS`. WACC komponen = Bobot * Biaya Modal.
- Row 22: WACC final (CATATAN: di fixture = 0.1031, TAPI ada label "Menurut Wajib Pajak" — ini tampaknya hardcoded/manual override dari WP, BUKAN computed. Investigasi lebih lanjut.)

**Section D — Bank Interest Rates (user input, reference):**
- Rows 27-29: 3 jenis bank (Persero, Swasta, Umum) — user input interest rate per bank
- Row 30: Rata-rata — **computed**: average of rates

**Steps**:
1. Inspect fixture `wacc.json` secara detail — verifikasi analisa Cowork di atas, terutama:
   - Apakah E22 (WACC final) benar-benar hardcoded atau ada formula hidden?
   - Tax rate reference: `'INCOME STATEMENT'!$B$33` — cari row IS mana yang punya effective tax rate di kolom B.
   - BS references: row 35, 38, 40, 49 — mapping ke manifest rows yang sudah ada.
2. Desain Zustand slice baru: `wacc: WaccState | null`. Definisi WaccState harus mencakup:
   - `marketParams`: { equityRiskPremium, ratingBasedDefaultSpread, riskFree }
   - `comparableCompanies`: Array<{ name, betaLevered, marketCap, debt }>
   - `bankRates`: Array<{ name, rate }> (atau 3 fixed slots)
   - `waccOverride?`: number | null (jika E22 memang manual override)
3. Bump store version v4→v5 dengan chain migration (LESSON-028).
4. Buat custom form component: `src/components/forms/WaccForm.tsx`
   - RHF atau controlled state (pilih yang konsisten dengan existing forms)
   - Comparable companies sebagai dynamic table (add/remove row)
   - Computed fields (BU, rata-rata, relevered beta, WACC) auto-update
   - Display computed WACC prominently
5. Buat page: `src/app/penilaian/wacc/page.tsx` (atau section yang sesuai nav structure)
6. Tambah ke nav-tree.
7. Tulis tests:
   - Unit test computed values (BU, relevered beta, WACC) terhadap fixture @ 12-decimal precision
   - Integration test: full form state → computed WACC matches fixture

**Verification**: Tests pass, build clean. WACC value accessible dari store untuk Task 2.

**Commit**: `feat: WACC input form with comparable companies + auto-computation`

---

### Task 2: Discount Rate (CAPM Analysis)

**Goal**: Separate CAPM computation menghasilkan WACC yang dipakai DCF. Ini sheet terpisah dari WACC.

**PENTING**: DISCOUNT RATE dan WACC adalah DUA sheet berbeda di Excel. Keduanya compute WACC, tapi:
- WACC sheet → referensi comparable companies approach, WACC E22 = 0.1031 ("Menurut WP")
- DISCOUNT RATE sheet → CAPM approach, H10 = 0.11463 → **ini yang dipakai DCF!**

**Struktur DISCOUNT RATE dari fixture** (sudah di-inspect Cowork):

**Left side — Inputs (user input):**
- Row 2: Tax Rate = 22% (C2)
- Row 3: Risk Free = 6.4795% (C3) — BEDA dari WACC Risk Free (2.70%)!
- Row 4: Beta = 1.09 (C4) — ini levered beta
- Row 5: ERP (Rating) = 7.38% (C5) — BEDA dari WACC ERP (7.62%)!
- Row 6: Country Default Spread = 2.07% (C6)
- Row 7: Debt Rate = 8.8% (C7) — computed dari bank rates: `ROUND(L11/100, 3)`
- Row 8: DER industry = 21.54% (C8)

**Right side — Computations (auto-computed):**
- H1: BU = `Beta / (1 + ((1-t) * DER))` = 0.9332
- H2: BL = `BU * (1 + ((1-t) * DER))` = 1.09 (round-trip verification)
- H3: Ke (Cost of Equity) = `Rf + (BL * ERP) - Country_Default_Spread` = 12.45%
- H4: Kd (Cost of Debt) = `Debt_Rate * (1-t)` = 6.86%
- F7: Weight Hutang = `DER / (1 + DER)` = 17.72%
- F8: Weight Ekuitas = `1 - Weight_Hutang` = 82.28%
- H7: WACC Hutang = `F7 * G7` = 1.22%
- H8: WACC Ekuitas = `F8 * G8` = 10.25%
- **H10: WACC = H7 + H8 = 11.463%** ← **ini yang DCF pakai sebagai discount rate**

**Bank reference rates** (K6-L11):
- 5 jenis bank + average → feeds into Debt Rate via C7 formula

**Steps**:
1. Inspect fixture `discount-rate.json` — verifikasi analisa di atas.
2. Desain Zustand slice: `discountRate: DiscountRateState | null`. Fields:
   - `taxRate`, `riskFree`, `beta`, `erp`, `countryDefaultSpread`, `derIndustry`
   - `bankRates`: Array<{ name, rate }> (5 jenis bank dari K6-L10)
   - Computed values (BU, BL, Ke, Kd, weights, WACC) TIDAK disimpan di store — compute on-the-fly
3. Bump store v5→v6 (chain migration, LESSON-028). ATAU — pertimbangkan: bisa combined dengan WACC di satu migration v4→v5 jika Task 1 & 2 dikerjakan sebelum commit store? Pilih pendekatan yang paling clean.
4. Buat computation module: `src/lib/calculations/discount-rate.ts` — pure functions:
   - `computeBetaUnlevered(beta, taxRate, der)`
   - `computeBetaLevered(bu, taxRate, der)`
   - `computeCostOfEquity(rf, bl, erp, countrySpread)`
   - `computeCostOfDebt(debtRate, taxRate)`
   - `computeDiscountRateWacc(ke, kd, der)` → returns { wacc, weightDebt, weightEquity, ... }
5. Tulis TDD tests dulu: `__tests__/lib/calculations/discount-rate.test.ts` — setiap function di-assert terhadap fixture values @ 12-decimal precision.
6. Buat form component: `src/components/forms/DiscountRateForm.tsx`
   - Input fields untuk semua parameters
   - Auto-computed display untuk BU, BL, Ke, Kd, WACC
   - Bank rates reference table
7. Buat page: `src/app/penilaian/discount-rate/page.tsx`
8. Tambah ke nav-tree.

**Cross-reference penting**: DISCOUNT RATE referensi IS tax rate (`'INCOME STATEMENT'!B33`). Pastikan mapping ini benar — cek IS manifest untuk row 33 dan kolom B.

**Verification**: Discount rate computation tests pass @ 12-decimal. Build clean. `WACC = 0.11463062037189403` match fixture H10.

**Commit**: `feat: Discount Rate CAPM computation + input form`

---

### Task 3: Growth Rate (Live Computation)

**Goal**: Growth Rate auto-compute dari ROIC + FA + BS data yang sudah live.

**Struktur GROWTH RATE dari fixture** (sudah di-inspect Cowork):

| Row | Label | Formula | Source |
|-----|-------|---------|--------|
| B4/C4 | Years (2020/2021) | `=ROIC!C5` / `=ROIC!D5` | ROIC sheet years |
| 6 | Net Fixed Assets End of Year | `='FIXED ASSET'!D69` / `E69` | FA manifest — cari row 69 |
| 7 | Net Current Asset End of Year | `='BALANCE SHEET'!E16` / `F16` | BS manifest — row 16 |
| 8 | Less: Net FA Beginning of Year | `='BALANCE SHEET'!D22*-1` / `E22*-1` | BS manifest — row 22, negated |
| 9 | Less: Net CA Beginning of Year | `='BALANCE SHEET'!D16*-1` / `E16*-1` | BS manifest — row 16 prior year, negated |
| 10 | Total Net Investment | `=SUM(B6:B9)` | Sum of above |
| 12 | Total IC Beginning of Year | `=ROIC!B12` / `C12` | ROIC manifest — row 12 |
| 14 | Growth Rate | `=B10/B12` | Net Investment / IC |
| 15 | Average | `=AVERAGE(B14:C14)` | Average of growth rates |

**Pendekatan**: Ini Pattern C (downstream live page) — compute dari upstream store data.

**Steps**:
1. Tentukan apakah Growth Rate perlu manifest baru atau custom page:
   - Kalau strukturnya sederhana (2 kolom tahun, 10 rows) → bisa custom component tanpa manifest
   - Kalau mau konsisten dengan pattern → buat manifest + compute adapter
   - **Rekomendasi**: custom component lebih tepat karena structure sangat berbeda dari financial tables (hanya 2 kolom data, bukan 4 tahun)
2. Buat computation: `src/lib/calculations/growth-rate.ts` — pure function:
   - Input: FA rows (net fixed assets), BS rows (net current assets), ROIC rows (invested capital)
   - Output: growth rates per year + average
3. Tulis TDD: `__tests__/lib/calculations/growth-rate.test.ts` — against fixture values.
4. Buat live adapter: `src/data/live/compute-growth-rate-live.ts`
   - Maps BS + FA + ROIC upstream data → growth rate rows
   - Perhatikan: FA row 69, BS row 16, BS row 22, ROIC row 12 — semua harus di-map ke store data
5. Buat view component: `src/components/analysis/GrowthRateLiveView.tsx`
6. Buat page: `src/app/analysis/growth-rate/page.tsx`
7. Tambah ke nav-tree. Seed sync jika belum.

**PENTING**: Growth Rate references ROIC, yang references FCF, yang references CFS. Pastikan seluruh upstream chain resolves correctly di live mode. Test dengan scenario: user fills HOME + BS + IS + FA → NOPLAT → CFS → FCF → ROIC → Growth Rate harus auto-compute.

**Verification**: Growth rate tests pass. `Average = 0.18654692078374596` matches fixture B15. Build clean.

**Commit**: `feat: Growth Rate live computation from ROIC + FA + BS`

---

## Final Verification

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
npm run build 2>&1 | tail -25
npm run typecheck 2>&1 | tail -10
npm run lint 2>&1 | tail -10
```

Update `progress.md` dengan:
- Total tests baru
- Pages baru (WACC, Discount Rate, Growth Rate)
- Store version baru
- Revised roadmap: Session 014 = projection chain start, Session 015 = projection complete, Session 016 = DCF + AAM + EEM (first share value!)
- Session 013 summary

Update `lessons-learned.md` jika ada lesson baru.

---

## Non-Negotiables (reminder)

- **TDD**: Setiap computation function di-test terhadap fixture @ 12-decimal precision SEBELUM build UI.
- **LESSON-035**: Verifikasi setiap row terhadap fixture formulas — jangan trust labels.
- **LESSON-028**: Store migration HARUS chained (v4→v5 atau v4→v5→v6).
- **LESSON-011**: Sign convention isolated di adapter/computation layer.
- **LESSON-029**: Company-agnostic — WACC comparable companies harus dynamic (tidak hardcode 3 perusahaan).
- **Cross-reference**: DISCOUNT RATE punya input values BERBEDA dari WACC (Risk Free, ERP berbeda). Ini disengaja — dua pendekatan berbeda. Jangan assume same values.

## Catatan

- WACC sheet E22 = 0.1031 kemungkinan manual override ("Menurut Wajib Pajak"). Investigasi apakah ini hardcoded atau ada formula. Jika hardcoded, pertimbangkan field `waccOverride` di store.
- DISCOUNT RATE C7 (Debt Rate) computed dari bank reference rates (`ROUND(L11/100, 3)`). Bank rates di K-L kolom perlu di-include.
- Growth Rate hanya punya 2 kolom data (2 tahun terakhir), bukan 4 tahun seperti financial tables. UI mungkin perlu layout berbeda.
- Jika satu task lebih kompleks dari perkiraan, STOP dan commit progress. Lanjutkan di task berikutnya.
- Estimasi: ~30-40 tests baru, 3 pages, 1-2 store migration.
