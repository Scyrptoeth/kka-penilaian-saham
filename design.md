# Design — Session 025: Extended Catalog Native Injection (Approach E3)

## Problem statement
Dynamic catalogs (BS 76+, IS 43+, FA 22+ accounts) emit `excelRow >= 100` for extended accounts. Current export skips them in main BS/IS/FA sheets — they only appear in RINCIAN detail sheet, NOT flowing into subtotals/totals/cross-sheet refs.

User requirement: extended accounts must contribute to ALL formulas (subtotals, totals, downstream cross-sheet derivatives) so the exported workbook is self-consistent and editable.

## Approaches considered

### Approach A — Insert rows + auto-shift formulas
- Splice rows into BS at section position
- Shift all dependent formulas (244 cross-sheet refs across 23 sheets)
- **Rejected**: ExcelJS does not reliably shift cross-sheet refs. Custom formula parser/rewriter = high silent-bug risk on 244 formulas, many using explicit `+D38+D39` style that doesn't auto-extend even within-sheet.

### Approach E3 — Native synthetic rows + extended SUM term (CHOSEN)
- Catalog already uses synthetic `excelRow >= 100` for extended accounts (e.g., BS current_assets 100-139, intangible 140-159, etc.)
- Write extended account label + values directly to those synthetic rows in the main sheet (already empty in template — no collision)
- For each section with ≥1 extended account, append `+SUM(<col>{start}:<col>{end})` term to the section subtotal formula
- Existing template formulas, original-row leaves, and 244 cross-sheet refs ALL remain unchanged
- Drop RINCIAN NERACA sheet (data now native in main BS)
- Hide gap rows between original leaves and extended zone (rows 17-99 in BS) for visual cleanliness

**Why E3 wins**:
- ZERO row shifts → ZERO cross-sheet ref updates → ZERO silent breakage risk
- Only NEW writes: extended account labels/values + ONE formula append per section (per year col)
- Existing tests stay green (visibility, original injection, formula preservation)
- Reversible: if extended accounts removed, section subtotal append is benign (`SUM(empty)` = 0)

## Section → row range map (BS)
Derived from `src/data/catalogs/balance-sheet-catalog.ts`:

| Section | Original Leaves | Extended Range | Subtotal Row |
|---|---|---|---|
| current_assets | 8-14 | 100-139 | 16 |
| intangible_assets | 24 | 140-159 | 25 (Total Non Current) |
| other_non_current_assets | 23 | 160-199 | 25 (same) |
| current_liabilities | 31-34 | 200-219 | 35 |
| non_current_liabilities | 38-39 | 220-239 | 40 |
| equity | 43-44, 46-47 | 300-319 | 49 |

Notes:
- `fixed_assets` section: skipped — comes from FA store via cross-sheet ref `'FIXED ASSET'!C32`, not from user accounts
- intangible+other_non_current both feed row 25 (Total Non Current = D22+D23+D24); for extended, append BOTH ranges to row 25

## IS (similar pattern, deferred design until BS done)
| Section | Extended Range | Subtotal/Aggregation Row |
|---|---|---|
| revenue | 100-139 | TBD (need template inspection) |
| cost | 200-239 | TBD |
| operating_expense | 300-339 | TBD |
| non_operating | 400-439 | TBD |
| net_interest | 500-539 | TBD |

## FA (DEFERRED to Session 026)
FA has 7 sub-block mirror pattern (Acquisition Beginning/Additions/Disposals/Ending + AccDep Beginning/Additions/Ending). Extended FA accounts at row 100+ need to replicate across all 7 sub-blocks at correct offsets (2000/3000/4000/5000/6000/7000). Complex — own session.

## Out of scope (this session)
- FA extended account injection (Session 026)
- Per-page numerical verification (Session 027)
- Removing RINCIAN sheet code entirely (kept exported for backwards compat with other potential consumers, just not invoked)

## Risks & mitigations
- **Catalog adds new section beyond defined ranges**: defensive code — log warning, skip injection, original behavior preserved
- **User has account with `excelRow` outside both original and extended zone**: same defensive skip
- **Section subtotal cell already custom-modified by template owner**: append-only logic preserves original; if formula wraps in unexpected way, append still works (e.g., `=SUM(D8:D14)` becomes `=SUM(D8:D14)+SUM(D100:D139)`)
