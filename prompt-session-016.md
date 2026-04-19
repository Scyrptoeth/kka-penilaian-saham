# Session 016 — DCF + AAM + EEM + BORROWING CAP (First Share Value Output!)

## Context

Session 015 completed the **entire projection chain** (PROY FA → LR → BS → NOPLAT → CFS). Company-agnostic audit passed 3 rounds — zero hardcoded prototype values. All upstream data is ready.

**This session's milestone**: For the first time, the app will produce an **actual share value** — the culmination of 15 sessions of development.

**CRITICAL LESSONS to apply:**
- **LESSON-038**: Valuation pages use **custom page pattern** (not manifest+SheetPage). DCF/AAM/EEM have mixed columns (historical + projected + single-column results).
- **LESSON-011**: Sign convention — store positive, negate in adapters. Watch for `*-1` patterns in fixture formulas.
- **LESSON-029**: Company-agnostic — ALL inputs must come from store. Zero hardcoded prototype values.
- **LESSON-037**: ROUNDUP for final rounding (e.g. `ROUNDUP(value, -3)` for rounding to nearest thousand).
- **LESSON-039**: Mixed-source columns — DCF col C = historical data, cols D-F = projected data from different sources.
- **LESSON-042**: Centralize projection year count — use `PROJECTION_YEAR_COUNT` constant.

---

## Dependency Chain (execution order)

```
1. BORROWING CAP (new sheet — simple, needed by EEM)
2. DCF (needs: PROY NOPLAT + PROY CFS + PROY FA + DISCOUNT RATE + GROWTH RATE + HOME)
3. AAM (needs: BS historical + FIXED ASSET + DLOM/DLOC + HOME)
4. EEM (needs: NOPLAT hist + CFS hist + FA hist + BORROWING CAP + DISCOUNT RATE + DLOM/DLOC + HOME)
5. Nav updates + verify gauntlet
```

AAM and EEM are independent of each other and of DCF — they could be parallel. But BORROWING CAP must come first (EEM needs it).

---

## Task 1: BORROWING CAP (Rate of Return on Net Tangible Assets)

**Fixture**: `__tests__/fixtures/borrowing-cap.json` (45 cells, max_row=47, visible=True)
**Used by**: EEM only — `BORROWING CAP!F14` = weighted average rate of return on tangible assets.
**Pattern**: Custom page (small, single-column). Or potentially hidden — EEM is the only consumer.

### Structure:

**Section 1 — Borrowing Capacity (rows 3-8):**
```
Row 5: Piutang         D=333625997484 (literal?), F=BS!F10+BS!F11 (AR+OtherRec)
Row 6: Persediaan      D=425521174257 (literal?), F=BS!F12 (Inventory)
Row 7: Aktiva Tetap    D=BS!F22 (Fixed Assets Net), E=0.7 (borrowing %), F=D7*E7
Row 8: Jumlah          D=SUM(D5:D7), F=SUM(F5:F7)
```
Note: D5 and D6 appear to be literal values from an external source (CALK=Catatan Atas Laporan Keuangan). These are NOT computable from other sheets — they'll need user input or defaults.

**Section 2 — Weighted Average Rate (rows 10-14):**
```
Row 12: Hutang    D=DISCOUNT RATE!G7 (cost of debt), E=F8/D8 (weight), F=E12*D12
Row 13: Ekuitas   D=DISCOUNT RATE!G8 (cost of equity), E=1-E12, F=E13*D13
Row 14: Total     F=F12+F13  ← THIS IS THE OUTPUT EEM NEEDS
```

**Implementation approach:**
- Create `src/lib/calculations/borrowing-cap.ts` — pure calc function
- Input: BS historical last year (F10, F11, F12, F22), Discount Rate result (G7=costDebtAfterTax, G8=costEquity), external CALK values (D5, D6 — need defaults or user input)
- Output: `{ borrowingCapacity: number, weightDebt: number, weightEquity: number, waccTangible: number }`
- The CALK values (D5, D6) are external data not derivable from other sheets. **Recommendation**: treat as optional user inputs with reasonable defaults (e.g., same as BS values or zero). Flag this for CLI to investigate — the fixture might have more context.

**Decision needed**: Should BORROWING CAP have its own visible page, or just a compute function used by EEM?

→ **Recommendation**: Make it a visible page under Penilaian group. It shows useful info (borrowing capacity breakdown) and is referenced in the Excel workbook. ~60 line custom page.

---

## Task 2: DCF (Discounted Cash Flow)

**Fixture**: `__tests__/fixtures/dcf.json` (107 cells, max_row=47, visible=True)
**Pattern**: Custom page. Mixed columns: C = historical (last year), D-F = 3 projection years. Then single-column summary (C25-C42).

### Structure:

**Part 1 — FCF computation (rows 7-20), per year C-F:**
```
Row  7: NOPLAT
  C: =NOPLAT!E19 (historical last year)
  D-F: ='PROY NOPLAT'!D19, E19, F19

Row  8: Add: Depreciation
  C: ='FIXED ASSET'!E51 (historical)
  D-F: ='PROY FIXED ASSETS'!D51, E51, F51

Row  9: Gross Cash Flow = C7+C8 (per year)

Row 12: Changes in CA
  C: ='CASH FLOW STATEMENT'!E8 (historical CFS)
  D-F: ='PROY CASH FLOW STATEMENT'!D8, E8, F8

Row 13: Changes in CL
  C: ='CASH FLOW STATEMENT'!E9
  D-F: ='PROY CASH FLOW STATEMENT'!D9, E9, F9

Row 14: Total WC = SUM(D12:D13)
Row 16: CapEx
  C: ='FIXED ASSET'!E23*-1
  D-F: ='PROY FIXED ASSETS'!D23*-1, E23*-1, F23*-1

Row 18: Gross Investment = D14+D16
Row 20: Free Cash Flow = D9+D18
```

**Part 2 — Discounting (rows 22-25), per year D-F:**
```
Row 22: Period (n)
  D: =YEARFRAC($C$6,$D$6) → 1
  E: =D22+1 → 2
  F: =E22+1 → 3

Row 23: Discount Factor
  B: ='DISCOUNT RATE'!H10 (WACC rate — constant)
  D-F: =1/((1+$B$23)^D22)

Row 24: PV of FCF = D20*D23 (per year)
Row 25: Total PV FCF = SUM(D24:F24) (single value in C)
```

**Part 3 — Terminal Value + Enterprise Value (single column C):**
```
Row 26: Growth Rate = 'GROWTH RATE'!C14
Row 27: Terminal Value = F20 * ((1+B26) / (B23-B26))  ← perpetuity growth model
Row 28: PV of Terminal = C27 * F23  ← discounted by last year's DF
Row 29: Enterprise Value = C25 + C28
```

**Part 4 — Equity Value adjustments (single column C):**
```
Row 30: Interest Bearing Debt = ('BALANCE SHEET'!F31 + 'BALANCE SHEET'!F38) * -1
Row 31: Surplus Asset Cash = ROIC!D10 * -1
Row 32: Idle Non Operating Asset = ROIC!D9 * -1
Row 33: Equity Value (100%) = SUM(C29:C32)
Row 34: DLOM = B34 (from EEM!C35 which = HOME!B15*-1) → use home.dlomPercent * -1
        C34 = C33 * B34
Row 35: Equity Less DLOM = C33 + C34
Row 36: DLOC/PFC = B36 = 0 (DCF uses 0 for DLOC in this prototype, but formula = C35*B36)
        Note: B36 appears to be 0 — may depend on valuation context
Row 37: Market Value 100% = C35 + C36
Row 38: Percentage = HOME!B8 (proporsiSaham)
Row 39: Market Value X% = C37 * B38
Row 40: Rounded = ROUNDUP(C39, -3)
Row 41: Jumlah Lembar = EEM!D44 = HOME!B7 (jumlahSahamBeredar)
Row 42: Per Share = C39 / C41
```

### Key Implementation Notes:

1. **YEARFRAC**: `YEARFRAC(date1, date2)` computes fractional years. For cutoff dates exactly 1 year apart, this = 1.0. Implement as simple integer periods (1, 2, 3) unless dates differ.

2. **Terminal Value formula**: `FCF_last * (1+g) / (r-g)` where g = growth rate, r = WACC. This is the Gordon Growth Model. **Guard against g >= r** (would produce negative/infinite TV).

3. **DLOM in DCF**: Fixture shows `B34 = EEM!C35 = HOME!B15*-1`. This means DCF's DLOM comes from `home.dlomPercent * -1` (negative to apply as discount).

4. **DLOC in DCF**: `B36 = 0` in prototype. This may vary — need to check if it should come from `home.dlocPercent` or always 0 for DCF. **Investigate the Excel formula for B36** — if it's literally `0` (not a formula), the app should allow user override.

5. **Surplus Asset & Idle Asset**: `ROIC!D10` and `ROIC!D9` — these are from the ROIC sheet's column D (which is historical year 1 or 2). Need to check what ROIC row 9 and 10 represent.

6. **Interest Bearing Debt**: `BS!F31 + BS!F38` — these are Bank Loan-ST (row 31) and Bank Loan-LT (row 38) from the last historical year of Balance Sheet.

### Data Sources Summary:
```
From store directly:
- home.dlomPercent, home.dlocPercent, home.proporsiSaham, home.jumlahSahamBeredar
- discountRate → computeDiscountRate() → .wacc (H10)

Computed from PROY sheets (already have compute adapters):
- PROY NOPLAT rows → computeProyNoplatLive()
- PROY CFS rows → computeProyCfsLive()
- PROY FA rows → computeProyFixedAssetsLive()

From historical sheets (in store):
- NOPLAT!E19 → last year from historical NOPLAT computation
- CFS!E8, E9, E10 → last year historical CFS
- FA!E23, E51 → last year historical FA
- BS!F31, F38 → last year BS loan rows
- ROIC!D9, D10 → from ROIC computation

From growth rate computation:
- GROWTH RATE!C14 → computeGrowthRateLive() result
```

---

## Task 3: AAM (Adjusted Asset Method / Metode Penyesuaian Aset Bersih)

**Fixture**: `__tests__/fixtures/aam.json` (143 cells, max_row=75, visible=True)
**Pattern**: Custom page. 3 columns: C = historical (BS last year), D = adjustments, E = adjusted (C+D).

### Structure:

**Assets (rows 6-24):**
```
Row  9: Cash on Hands       C=BS!F8,   D=0,         E=C9+D9
Row 10: Cash in Banks       C=BS!F9,   D=0,         E=C10+D10
Row 11: Account Receivable  C=BS!F10,  D=0,         E=C11+D11
Row 12: Other Receivable    C=BS!F11,  D=0,         E=C12+D12
Row 13: Inventory           C=BS!F12,  D=0,         E=C13+D13
Row 14: Others              C=BS!F14,  D=0(input),  E=C14+D14
Row 16: Total Current       C=SUM,     E=SUM(E9:E14)

Row 19: FA Beginning        C=BS!F20   D=0,         E=C19+D19
Row 20: FA Net              C=BS!F22,  D=FA!H74(adjustment), E=C20+D20
Row 21: Non Current Assets  C=BS!F23,  D=0,         E=C21+D21
Row 22: Total Non Current   C=BS!F25,  E=SUM(E20:E21)
Row 23: Intangible Asset    C=BS!F24,  E=C23 (no adj)
Row 24: TOTAL ASSETS        C=C16+C22, E=E16+E22+E23
```

**Liabilities & Equity (rows 26-49):**
```
Row 28-31: Current Liabilities (BS rows F31-F34), D=0, E=C+D
Row 32: Total CL = SUM(E28:E31)
Row 35-36: Non Current Liabilities (BS rows F38-F39), E=C+D
Row 37: Total NCL = E35+E36
Row 40-46: Equity (BS rows F43-F49, with special handling for asset revaluation)
Row 46: Changes on Asset Revaluation = D20+D21 (adjustments sum)
Row 47: Total SE = E40+E45+E41+E46
Row 49: TOTAL L&E = E32+E37+E47
```

**Valuation (rows 51-60):**
```
Row 51: Net Asset Value = E24-(E29+E30+E31)-E36
        (Total Assets minus AP, Tax, Others, Related Party — NOT total liabilities)
Row 52: Interest Bearing Debt = C28+C35 (BS Bank Loan ST + LT, ORIGINAL values not adjusted)
Row 53: Equity Value = E51-E52
Row 54: DLOM = D54 from row 68 (moderat = -0.3), E54 = E53*D54
Row 55: Equity Less DLOM = E53+E54
Row 56: DLOC = D56 = 'DLOC(PFC)'!E24 * -1, E56 = E55*D56
Row 57: Market Value 100% = E55+E56
Row 58: Percentage = HOME!B8
Row 59: Market Value X% = E57*D58
Row 60: = E59-600000000 ← HARDCODED subtraction! This is 600M = Paid Up Capital. 
        Need: E59 - home.modalDisetor or E59 - BS paid-up capital
```

**DLOM Reference Table (rows 67-72):**
```
Rows 67-69: DLOM ranges (40%, 30%, 20%)
Rows 70-72: DLOC ranges (70%, 50%, 30%)
```
→ These are static reference — rendering only, no computation needed.

### Key Implementation Notes:

1. **Adjustments column (D)**: In prototype, most adjustments = 0 except:
   - `D20 = FA!H74` (Fixed Asset adjustment from ADJUSTMENT TANAH sheet)
   - `D46 = D20+D21` (revaluation = sum of FA adjustments)
   
   For company-agnostic: adjustments should be **user-editable**. Default to 0 but allow override. This is the "Penyesuaian" (adjustment) column.

2. **Row 60**: `E59 - 600000000` — this 600M is the Paid Up Capital (BS!F43). Must NOT be hardcoded. Use `BS store row for Paid Up Capital` or `home` equivalent.

3. **FA!H74 (ADJUSTMENT TANAH)**: This references the ADJUSTMENT TANAH hidden sheet. Check if that fixture has computable values or if it's user input.

4. **Net Asset Value formula (row 51)**: Unique — it's NOT just Assets minus Liabilities. It excludes Bank Loans (interest-bearing debt) and only subtracts AP, Tax, Others, and Related Party. This is intentional: IBD is subtracted separately in row 52.

---

## Task 4: EEM (Excess Earning Method / Metode Kapitalisasi Kelebihan Pendapatan)

**Fixture**: `__tests__/fixtures/eem.json` (75 cells, max_row=52, visible=True)
**Pattern**: Custom page. Single main column D with parameters in B/C.

### Structure:

**Net Tangible Asset (row 7):**
```
Row 7: Nett Tangible Asset = AAM!E16 + AAM!E22 - (AAM!E29+E30+E31+E36) - AAM!E9
       → Adjusted Current Assets + Adjusted Non-Current Assets - (AP+Tax+Others+RelatedParty) - Cash
       This is the "working" tangible asset base (excludes cash, which is non-operating)
```

**Return on Tangible (rows 8-9):**
```
Row 8: Return rate = BORROWING CAP!F14 (weighted avg return, parameter in C8)
Row 9: Earning Return = D7 * C8
```

**FCF from historical (rows 12-25) — same structure as DCF Part 1 but HISTORICAL only:**
```
Row 12: NOPLAT = NOPLAT!E19 (historical last year)
Row 13: Depreciation = FIXED ASSET!E51
Row 14: Gross CF = D12+D13
Row 17: Changes CA = CFS!E8
Row 18: Changes CL = CFS!E9
Row 19: Total WC = CFS!E10
Row 21: CapEx = FA!E23*-1
Row 23: Gross Investment = D19+D21
Row 25: FCF = D14+D23
```

**Excess Earning + Capitalization (rows 27-29):**
```
Row 27: Excess Earning = D25 - D9 (FCF minus normal return on tangible assets)
Row 28: Capitalization Rate = DISCOUNT RATE!H10 (same WACC as DCF, parameter in C28)
Row 29: Capitalized Excess = D27 / C28 (goodwill proxy)
```

**Enterprise Value → Share Value (rows 31-45):**
```
Row 31: Enterprise Value = D7 + D29 (tangible assets + capitalized excess)
Row 32: Interest Bearing Debt = (BS!F31 + BS!F38) * -1
Row 33: Non Operating Asset = BS!F8 (Cash on Hands — considered non-operating)
Row 34: Equity Value 100% = D31+D32+D33
Row 35: DLOM = C35 = HOME!B15*-1 (dlomPercent negated), D35 = D34*C35
Row 36: Equity Less DLOM = D34+D35
Row 37: DLOC = C37 = 0 (same as DCF — zero in prototype)
Row 38: Market Value 100% = D36+D37
Row 39: Percentage = HOME!B8
Row 40: Market Value X% = D38*C39
Row 41: Exchange rate = 0 (from AAM!B62) — not used if domestic
Row 42: In IDR = D40*D41 (when D41=1, this = D40)
Row 43: Rounded = ROUNDUP(D42, -3)
Row 44: Jumlah Lembar = HOME!B7
Row 45: Per Share = D42/D44
```

### Key Notes:
1. **EEM uses HISTORICAL data only** for FCF (last year). Unlike DCF which uses projected FCF.
2. **BORROWING CAP** rate needed for "normal return" on tangible assets.
3. **Exchange rate (row 41)**: In prototype = 1. For company-agnostic: should be 1 for IDR, or allow user input if foreign currency.

---

## Task 5: Nav Updates + Verify Gauntlet

1. **Nav tree**: Add DCF, AAM, EEM under Penilaian group. Optionally add BORROWING CAP.
2. **Run full gauntlet**:
   ```bash
   npx vitest run 2>&1 | tail -5
   npx tsc --noEmit 2>&1 | tail -5
   npm run build 2>&1 | tail -25
   npx eslint . 2>&1 | tail -5
   ```
3. **Update progress.md** with Session 016 entry
4. **Commit**: `feat: DCF + AAM + EEM + BORROWING CAP — first share value output (Session 016)`

---

## Shared Pattern: Equity Value → Share Value

DCF, AAM, and EEM all share the same "equity value to share value" tail:
```
Equity Value (100%)
  - DLOM (home.dlomPercent * -1 applied as multiplier)
  = Equity Less DLOM
  - DLOC (home.dlocPercent * -1 or 0, context-dependent)
  = Market Value 100%
  × proporsiSaham (home.proporsiSaham)
  = Market Value X%
  ROUNDUP(..., -3) → Rounded
  / jumlahSahamBeredar → Per Share Value
```

**DRY opportunity**: Extract a shared `computeShareValue()` function:
```typescript
interface ShareValueInput {
  equityValue100: number
  dlomPercent: number      // from home.dlomPercent (positive, e.g. 0.4)
  dlocPercent: number      // from home.dlocPercent (positive, e.g. 0.54) — or 0 if not applicable
  applyDloc: boolean       // DCF/EEM may set this to false
  proporsiSaham: number    // from home
  jumlahSahamBeredar: number
}

interface ShareValueResult {
  dlomDiscount: number
  equityLessDlom: number
  dlocDiscount: number
  marketValue100: number
  marketValuePortion: number
  rounded: number
  perShare: number
}
```

This avoids duplicating the DLOM/DLOC/rounding logic across 3 valuation pages.

---

## Data Sources — Where Everything Comes From

### From Zustand Store (direct read):
| Field | Store Path | Used By |
|---|---|---|
| WACC rate | `discountRate` → `computeDiscountRate().wacc` | DCF, EEM |
| DLOM % | `home.dlomPercent` | DCF, AAM, EEM |
| DLOC % | `home.dlocPercent` | AAM (and DCF/EEM if applicable) |
| Proporsi Saham | `home` → derive `proporsiSaham` | All 3 |
| Jumlah Saham | `home.jumlahSahamBeredar` | All 3 |
| BS historical rows | `balanceSheet.rows` | AAM, DCF, EEM |
| IS historical rows | `incomeStatement.rows` | (via NOPLAT/CFS) |
| FA historical rows | `fixedAsset.rows` | AAM, DCF, EEM |

### Computed (existing adapters):
| Adapter | Output Needed By |
|---|---|
| `computeNoplatLive()` | EEM (historical NOPLAT), DCF (historical col C) |
| `computeCashFlowLive()` | EEM (historical CFS), DCF (historical col C) |
| `computeProyNoplatLive()` | DCF (projected cols D-F) |
| `computeProyCfsLive()` | DCF (projected cols D-F) |
| `computeProyFixedAssetsLive()` | DCF (projected depreciation + capex) |
| `computeGrowthRateLive()` | DCF (terminal value growth rate) |
| `computeRoicLive()` | DCF (surplus asset, idle asset) |

### New computations needed:
| New Function | Input | Output |
|---|---|---|
| `computeBorrowingCap()` | BS + DR | waccTangible rate |
| `computeDcf()` | PROY NOPLAT/CFS/FA + hist + DR + GR + HOME | Enterprise → share value |
| `computeAam()` | BS hist + FA adj + DLOM/DLOC + HOME | Net asset → share value |
| `computeEem()` | NOPLAT/CFS/FA hist + BC + DR + DLOM + HOME | Excess earning → share value |
| `computeShareValue()` | Equity100% + HOME discounts | Rounded share value (shared) |

---

## Files to Create

```
src/lib/calculations/borrowing-cap.ts              [NEW] — pure calc
src/lib/calculations/dcf.ts                         [NEW] — pure calc
src/lib/calculations/aam-valuation.ts               [NEW] — pure calc
src/lib/calculations/eem-valuation.ts               [NEW] — pure calc
src/lib/calculations/share-value.ts                 [NEW] — shared equity→share helper

src/app/valuation/dcf/page.tsx                      [NEW] — custom page
src/app/valuation/aam/page.tsx                      [NEW] — custom page
src/app/valuation/eem/page.tsx                      [NEW] — custom page
src/app/valuation/borrowing-cap/page.tsx            [NEW] — custom page (small)

__tests__/lib/calculations/borrowing-cap.test.ts    [NEW]
__tests__/lib/calculations/dcf.test.ts              [NEW]
__tests__/lib/calculations/aam-valuation.test.ts    [NEW]
__tests__/lib/calculations/eem-valuation.test.ts    [NEW]
__tests__/lib/calculations/share-value.test.ts      [NEW]

src/components/layout/nav-tree.ts                   [MODIFIED] — add 4 nav entries
```

## Reference Files (read these first)

- `src/app/projection/income-statement/page.tsx` — custom page pattern reference
- `src/data/live/compute-proy-noplat-live.ts` — downstream compute pattern
- `src/lib/calculations/discount-rate.ts` — existing calc that produces WACC (H10)
- `src/lib/calculations/questionnaire-helpers.ts` — DLOM/DLOC scoring
- `src/lib/store/useKkaStore.ts` — store shape v6, DiscountRateState, home.dlomPercent/dlocPercent
- `src/types/financial.ts` — HomeInputs with dlomPercent/dlocPercent
- Fixture files: `dcf.json`, `aam.json`, `eem.json`, `borrowing-cap.json`

## Non-Negotiables

- TDD: write fixture-grounded tests for EVERY calc module before implementation
- Sign convention: store positive, negate in adapters per Excel formula
- Company-agnostic: ZERO hardcoded values from prototype (audit every literal)
- Guard against division by zero (especially DCF terminal value when g >= r)
- `ROUNDUP(value, -3)` for final share value rounding
- Build must pass with zero errors
- Typecheck + lint clean
