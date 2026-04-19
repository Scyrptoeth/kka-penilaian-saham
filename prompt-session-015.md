# Session 015 — PROY BS + PROY NOPLAT + PROY ACC PAYABLES + PROY CFS

## Context

Session 014 shipped KEY DRIVERS + PROY FA + PROY LR. This session completes the **remaining 4 projection sheets** to finish the projection chain. After this, all upstream data is ready for DCF/AAM/EEM valuation.

**CRITICAL LESSONS to apply this session:**
- **LESSON-038**: PROY pages use **custom page pattern** (not manifest+SheetPage). Each page has its own ROW_DEFS, compute adapter, and custom rendering. See `src/app/projection/income-statement/page.tsx` and `src/app/projection/fixed-asset/page.tsx` as reference.
- **LESSON-037**: Excel uses ROUND/ROUNDUP for projected values. Match Excel rounding exactly.
- **LESSON-011**: Sign convention — store positive, negate in adapters. PROY LR stores expenses positive; downstream adapters negate when needed.
- **LESSON-035**: Trust fixture formulas over labels. ALWAYS verify formulas from fixture JSON before coding.

**Dependency chain (execution order matters):**
```
PROY BS depends on:  KEY DRIVERS (BS growth rates) + PROY LR (net profit) + PROY FA (fixed asset values) + Balance Sheet (historical seed year)
PROY NOPLAT depends on:  PROY LR only (D7=D36, D8=D31*-1, D9=D29*-1, D10=D34*-1, D13=D37*-1, tax rate from B37)
PROY ACC PAYABLES depends on:  Very simple — prototype has all zeros (no loans). But structure matters for PROY CFS.
PROY CFS depends on:  PROY LR + PROY BS + PROY FA + PROY ACC PAYABLES
```

## Task 1: PROY BS (Projected Balance Sheet)

**Fixture**: `__tests__/fixtures/proy-balance-sheet.json` (236 cells, max_row=80)
**Pattern**: Custom page (LESSON-038), NOT manifest-based.

### Structure from fixture formulas:

**Column layout**: C = last historical year (seed from BS), D-F = 3 projection years.

**ASSETS section:**
- Row 5: Year headers (D=C5+1)
- Row 9: Cash on Hands = `C9*(1+C10)` — previous year value × (1+growth rate)
- Row 10: Cash Growth = `(D9-C9)/C9`
- Row 11: Cash in Banks = literal 0 (prototype)
- Row 12: Cash in Banks Growth = `(D11-C11)/C11`
- Row 13: Account Receivable = `C13*(1+C14)-D64` — growth adjusted MINUS row 64 (copas number)
- Row 14: AR Growth = `(D13-C13)/C13`
- Row 15: Other Receivable = `C15*(1+C16)`
- Row 16: Other Receivable Growth
- Row 17: Inventory = `C17*(1+C18)`
- Row 18: Inventory Growth
- Row 19: Others = `C19*(1+C20)`
- Row 20: Others Growth
- **Row 21: Total Current Assets = D9+D11+D13+D15+D17+D19**

**Non Current Assets:**
- Row 25: Beginning = `'PROY FIXED ASSETS'!D32` (total ending from PROY FA)
- Row 26: Accumulated Depreciations = `'PROY FIXED ASSETS'!D60*-1`
- Row 27: Accum Dep Growth = `(D26-C26)/C26`
- **Row 28: Fixed Assets Net = D25+D26**
- Row 29: Other Non Current = `C29` (carry forward)
- Row 30: Intangible Assets = `C30*(1+'BALANCE SHEET'!$Q$24)` — uses BS historical growth
- **Row 31: Total Non Current = D28+D29+D30**
- **Row 33: TOTAL ASSETS = D21+D31**

**LIABILITIES section:**
- Row 37: Bank Loan-ST = `C37*(1+C38)`
- Row 38: Growth
- Row 39: Account Payables = `C39*(1+C40)`
- Row 40: Growth
- Row 41: Tax Payable = `C41*(1+C42)`
- Row 42: Growth
- Row 43: Others = `C43*(1+C44)`
- Row 44: Growth
- **Row 45: Total Current Liabilities = SUM(D37:D43)** — note: SUM range includes growth rows which are 0 or small
- Row 48: Bank Loan-LT = `IFERROR(C48*(1+C49),0)`
- Row 49: Growth = `IFERROR((D48-C48)/C48,0)`
- Row 50: Other Non Current Liabilities = `C50*(1+C51)`
- Row 51: Growth
- **Row 52: Total Non Current Liabilities = D48+D50**

**EQUITY section:**
- Row 55: Paid Up Capital = `C55` (carry forward)
- Row 57: Surplus = `C57` (carry forward)
- Row 58: Current Profit = `C58+'PROY LR'!D39` — accumulated: prev + new net profit
- **Row 59: Retained Earnings = D57+D58**
- **Row 60: Shareholders' Equity = D55+D59**
- **Row 62: TOTAL L&E = D45+D52+D60**
- Row 63: Balance Control = `D33-D62` (should be ~0 but isn't in prototype — this is expected)

**IMPORTANT**: Row 64 "copas number only atu-atu" has literal values (not formulas) — these are manual adjustments. Need to handle this as an input or constant.

**Implementation approach:**
1. Create `src/data/live/compute-proy-bs-live.ts`
   - Input: BS historical (last year as seed), KEY DRIVERS BS growth rates, PROY FA values, PROY LR net profit
   - Output: `Record<number, YearKeyedSeries>` keyed by fixture row numbers
   - Growth pattern: `value[year] = value[year-1] * (1 + growthRate[year-1])` then compute growth rate = `(new-old)/old`
2. Create `src/app/projection/balance-sheet/page.tsx` — custom page with 3 sections (Assets, Liabilities, Equity)
3. Test: at minimum structural tests (totals = sum of components, Assets = L+E check). Exact fixture precision tests if growth rates from KEY DRIVERS available.

### Growth rates source

PROY BS growth rates (rows 10,12,14,16,18,20,38,40,42,44,49,51) come from **KEY DRIVERS** store. Check how `keyDrivers` slice stores BS-related growth assumptions. The KEY DRIVERS form in Session 014 captures 7-year projection assumptions including BS growth rates.

Read `src/lib/store/useKkaStore.ts` to see the `KeyDriversState` shape, and `src/components/forms/KeyDriversForm.tsx` to understand which fields map to which BS rows.

---

## Task 2: PROY NOPLAT (Projected NOPLAT)

**Fixture**: `__tests__/fixtures/proy-noplat.json` (63 cells, max_row=19)
**Pattern**: Custom page, very simple — only 19 rows, all from PROY LR.

### Structure (all formulas reference PROY LR):

```
Row  7: Profit Before Tax       = 'PROY LR'!D36
Row  8: Add: Interest Expenses  = 'PROY LR'!D31 * -1
Row  9: Less: Interest Income   = 'PROY LR'!D29 * -1
Row 10: Non Operating Income    = 'PROY LR'!D34 * -1
Row 11: EBIT                    = SUM(D7:D10)

Row 13: Tax Provision           = 'PROY LR'!D37 * -1
Row 14: Tax Shield Interest Exp = 'PROY LR'!$B$37 * 'PROY LR'!D31 * -1
Row 15: Tax on Interest Income  = 'PROY LR'!$B$37 * 'PROY LR'!D29 * -1
Row 16: Tax on Non Op Income    = 'PROY LR'!$B$37 * 'PROY LR'!D34 * -1
Row 17: Total Taxes on EBIT     = SUM(D13:D16)

Row 19: NOPLAT                  = D11 - D17
```

**Key detail**: `'PROY LR'!$B$37` is the effective tax rate (constant across years). This is already in the store as part of KEY DRIVERS or computable from PROY LR output.

**Implementation:**
1. `src/data/live/compute-proy-noplat-live.ts` — takes PROY LR output rows, extracts needed values, computes EBIT and adjusted taxes.
2. `src/app/projection/noplat/page.tsx` — custom page, ~100 lines
3. Tests: fixture-grounded (PROY LR values → expected NOPLAT values)

---

## Task 3: PROY ACC PAYABLES (Projected Account Payables / Bank Loan Schedule)

**Fixture**: `__tests__/fixtures/proy-acc-payables.json` (116 cells, hidden sheet)
**Pattern**: Custom page (or hidden — may not need a visible page, but PROY CFS references it)

### Structure:

**Short-Term Bank Loan (rows 8-15):**
```
Row 10: Beginning     = C13 (prev year ending)
Row 11: Addition      = 0 (manual input / literal)
Row 12: Repayment     = 0 (manual input / literal)
Row 13: Ending        = SUM(D10:D12)
Row 15: Interest      = D13 * (RIGHT($B$15,3)) * -1  [interest rate from label "14%"]
```

**Long-Term Bank Loan (rows 17-24):**
```
Row 18: Principal     = 0.13 (interest rate, literal)
Row 19: Beginning     = C22 (prev year ending)
Row 20: Addition      = 0
Row 21: Repayment     = 0
Row 22: Ending        = SUM(D19:D21)
Row 24: Interest      = 0 (computed similarly)
```

**NOTE**: In the prototype, ALL loan values are 0 (no debt). The structure still matters because PROY CFS references Row 21 (Repayment) for principal repayment.

**Implementation approach:**
- Since prototype has all zeros: implement the computation structure but seed with zeros
- This is a **hidden sheet** — no visible page needed, but the compute function is needed for PROY CFS
- Create `src/data/live/compute-proy-acc-payables-live.ts`
- Minimal tests: structural (ending = beg + add + repay), interest computation

---

## Task 4: PROY CFS (Projected Cash Flow Statement)

**Fixture**: `__tests__/fixtures/proy-cash-flow-statement.json` (111 cells, max_row=51)
**Pattern**: Custom page. Most complex of the 4.

### Structure (all formulas reference upstream PROY sheets):

**Cash Flow from Operations:**
```
Row  5: EBITDA             = 'PROY LR'!D19
Row  6: Corporate Tax      = 'PROY LR'!D37  [NEGATIVE — stored as negative in LR]
Row  8: Changes in CA      = -(('PROY BS'!D13+'PROY BS'!D15+'PROY BS'!D17+'PROY BS'!D19)
                              -('PROY BS'!C13+'PROY BS'!C15+'PROY BS'!C17+'PROY BS'!C19))
                              [Full formula: delta of (AR+OtherRec+Inv+Others) current vs prior]
Row  9: Changes in CL      = 'PROY BS'!D45 - 'PROY BS'!C45
Row 10: Working Capital     = D8+D9
Row 11: CFO                 = SUM(D5:D9)  [or D5+D6+D10]
```

**Cash Flow from Non-Operations:**
```
Row 13: CF Non-Op           = 'PROY LR'!D34  [Non-operating income]
```

**Cash Flow from Investment:**
```
Row 17: CFI (CapEx)         = 'PROY FIXED ASSETS'!D23 * -1
```

**Cash Flow before Financing:**
```
Row 19: CF before Fin       = D11 + D13 + D17
```

**Financing:**
```
Row 22: Equity Injection    = 0
Row 23: New Loan            = 0
Row 24: Interest Expense    = 'PROY LR'!D31  [NEGATIVE in LR]
Row 25: Interest Income     = 'PROY LR'!D29
Row 26: Principal Repayment = 'PROY ACC PAYABLES'!D21
Row 28: CF from Financing   = SUM(D22:D26)
```

**Net Cash Flow:**
```
Row 30: Net Cash Flow       = D11 + D13 + D17 + D28
Row 32: Cash Beginning      = C33  [prev year ending]
Row 33: Cash Ending         = 'PROY BS'!D9 + 'PROY BS'!D11  [Cash on Hand + Cash in Banks]
Row 35: Cash Ending in Bank = 'PROY BS'!D11
Row 36: Cash Ending in Cash = 'PROY BS'!D9
```

**IMPORTANT sign conventions:**
- PROY LR stores tax (row 37) as positive number, but CFS row 6 uses it as negative → negate
- PROY LR interest expense (row 31) is positive in store → CFS row 24 should be negative
- CapEx from PROY FA is positive → CFS row 17 negates it

**Implementation:**
1. `src/data/live/compute-proy-cfs-live.ts` — takes PROY LR, PROY BS, PROY FA, PROY AP outputs
2. `src/app/projection/cash-flow/page.tsx` — custom page with 4 sections
3. Tests: structural (CFO = EBITDA+Tax+WC, Net CF = CFO+NonOp+CFI+CFF), fixture-grounded where possible

---

## Task 5: Verify Gauntlet + Nav Updates

After all 4 sheets are implemented:

1. **Nav tree**: Add entries for PROY BS, PROY NOPLAT, PROY CFS under Proyeksi group. PROY ACC PAYABLES is hidden — no nav entry needed.
2. **Run full gauntlet**:
   ```bash
   npx vitest run 2>&1 | tail -5
   npx tsc --noEmit 2>&1 | tail -5
   npm run build 2>&1 | tail -25
   npx eslint . 2>&1 | tail -5
   ```
3. **Update progress.md** with Session 015 entry
4. **Commit**: `feat: PROY BS + PROY NOPLAT + PROY ACC PAYABLES + PROY CFS (Session 015)`

---

## Execution Order

**Sequential** (each depends on prior):
1. PROY BS — needs KEY DRIVERS + PROY LR + PROY FA + historical BS
2. PROY NOPLAT — needs PROY LR only (can technically be parallel with BS, but simpler sequential)
3. PROY ACC PAYABLES — needs nothing new (all zeros in prototype)
4. PROY CFS — needs ALL above (PROY LR + PROY BS + PROY FA + PROY AP)
5. Nav updates + verify gauntlet

## Reference Files (read these first)

- `src/app/projection/income-statement/page.tsx` — custom page pattern reference
- `src/data/live/compute-proy-lr-live.ts` — compute adapter pattern reference
- `src/data/live/compute-proy-fixed-assets-live.ts` — another adapter reference
- `__tests__/data/live/compute-proy-lr-live.test.ts` — test pattern reference
- `src/lib/store/useKkaStore.ts` — current store shape (v6)
- `src/components/forms/KeyDriversForm.tsx` — KEY DRIVERS field mapping
- Fixture files: `proy-balance-sheet.json`, `proy-noplat.json`, `proy-acc-payables.json`, `proy-cash-flow-statement.json`

## Non-Negotiables (always)

- TDD: write tests BEFORE implementation for each compute adapter
- Sign convention: user-positive storage, negate in adapters
- Fixture-grounded: every computed value must be verified against Excel fixture
- Custom page pattern (LESSON-038) for all PROY pages
- `npm run build` must pass with zero errors at the end
- Typecheck clean, lint clean
