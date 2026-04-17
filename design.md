# Design — Session 028: IS + FA Extended Catalog Native Injection

## Problem

Session 025 shipped BS extended catalog native injection (Approach E3). IS and
FA extended catalogs were deferred because of different underlying
architectures. Task 1 (IS) has sentinel-overlap (sentinels pre-aggregate
extended rows). Task 2 (FA) has 7-block mirror (single leaf account appears
across 7 sub-blocks on sheet). Same BS pattern does not transplant directly.

Domain alias renamed from `kka-penilaian-saham.vercel.app` to
`penilaian-bisnis.vercel.app`. Docs + 2 skill files have stale references.

## Approach

### T0 — Domain rename housekeeping

Global search-and-replace. Preserve historical session files verbatim — they
are immutable records. Update only live, forward-looking documentation:
`progress.md`, two skill `SKILL.md` files, and `HANDOFF-COWORK.md` if
relevant. Historical session-*.md files: leave as-is (record of past truth).

### T1 — IS Extended Catalog Native Injection (Approach δ)

**Core insight**: IS sentinel rows 6/7/15/30 are already-aggregated totals.
The export pipeline writes pre-computed sentinel numbers to these cells.
Appending `+SUM(...)` to derived rows (the BS pattern) would double-count.

**Approach δ — Sentinel Formula Replacement**

Per-section rule:
- sections with uniform sign (revenue / cost / operating_expense /
  non_operating): REPLACE sentinel cell hardcoded number with
  `=SUM(col{start}:col{end})` live formula.
- section net_interest (mixed sign via `interestType`): KEEP sentinels D26/D27
  as hardcoded — simple SUM range cannot express mixed-sign aggregation. Still
  write extended rows 500-519 for breakdown visibility.

Derived formulas (D8 Gross Profit, D18 EBITDA, D22 EBIT, D32 PBT, D35 Net
Profit) stay UNCHANGED — they resolve correctly regardless of whether D6 is a
number or a SUM formula.

Section injection map:

```
IS_SECTION_INJECT = [
  { section: 'revenue',           extendedRowStart: 100, extendedRowEnd: 119, sentinelRow: 6,  replaceWithSum: true  },
  { section: 'cost',              extendedRowStart: 200, extendedRowEnd: 219, sentinelRow: 7,  replaceWithSum: true  },
  { section: 'operating_expense', extendedRowStart: 300, extendedRowEnd: 319, sentinelRow: 15, replaceWithSum: true  },
  { section: 'non_operating',     extendedRowStart: 400, extendedRowEnd: 419, sentinelRow: 30, replaceWithSum: true  },
  { section: 'net_interest',      extendedRowStart: 500, extendedRowEnd: 519, sentinelRow: null, replaceWithSum: false },
]
```

Two helpers mirror the BS pattern:
- `injectExtendedIsAccounts(workbook, state)` — writes label + year values for
  accounts with excelRow ≥ 100 to synthetic rows on INCOME STATEMENT sheet.
- `replaceIsSectionSentinels(workbook, state)` — for sections with
  `replaceWithSum=true` AND user has ≥1 extended account in that section,
  overwrites D<sentinelRow> cell value with `{ formula: 'SUM(col{s}:col{e})' }`
  per year column.

Both functions safe to call unconditionally (no-op when no extended accounts).

**Why Approach δ over γ (append)**: prevents double-count by construction.
Also gives full Excel reactivity — user edits D105 in Excel, D6 recomputes,
D8 recomputes, cascade continues across downstream sheets that reference D6.

**Why not Approach ε (write extended + keep sentinels)**: user editing in
Excel would create stale totals (extended cells don't propagate to sentinel).
Violates "automasi integrasi" constraint.

### T2 — FA Extended Catalog Native Injection (Approach η)

**Core insight**: one FA leaf account appears 7 times on sheet (once per
block). Extended accounts need synthetic positions across all 7 blocks. Of
the 7 blocks: 4 hold user-input values (Acq Beginning, Acq Additions, Dep
Beginning, Dep Additions) and 3 hold computed values (Acq Ending = Begin +
Add, Dep Ending = Begin + Add, Net Value = AcqEnd − DepEnd).

**Approach η — Band Layout + Mirrored SUM**

Allocate 7 contiguous bands on FIXED ASSET sheet:

```
FA_BAND = {
  ACQ_BEGIN:  { start: 100, end: 139, storeOffset: 0    },   // Block 1, user input
  ACQ_ADD:    { start: 140, end: 179, storeOffset: 2000 },   // Block 2, user input
  ACQ_END:    { start: 180, end: 219, computedFrom: ['ACQ_BEGIN','ACQ_ADD'], op: '+' },  // Block 3
  DEP_BEGIN:  { start: 220, end: 259, storeOffset: 4000 },   // Block 4, user input
  DEP_ADD:    { start: 260, end: 299, storeOffset: 5000 },   // Block 5, user input
  DEP_END:    { start: 300, end: 339, computedFrom: ['DEP_BEGIN','DEP_ADD'], op: '+' },  // Block 6
  NET_VALUE:  { start: 340, end: 379, computedFrom: ['ACQ_END','DEP_END'],   op: '-' },  // Block 7
}
```

Slot assignment: for extended account at index `i` within the filtered
array (`accounts.filter(a => a.excelRow >= 100)`), sheet row in band B is
`FA_BAND[B].start + i`. 40 slots per band accommodates well beyond any
realistic user account count.

Per-account writes (for slot `i`, year column `col`):
- Block 1 value = `state.fixedAsset.rows[acc.excelRow][year]`
- Block 2 value = `state.fixedAsset.rows[acc.excelRow + 2000][year]`
- Block 3 formula = `=+${col}${100+i}+${col}${140+i}`
- Block 4 value = `state.fixedAsset.rows[acc.excelRow + 4000][year]`
- Block 5 value = `state.fixedAsset.rows[acc.excelRow + 5000][year]`
- Block 6 formula = `=+${col}${220+i}+${col}${260+i}`
- Block 7 formula = `=+${col}${180+i}-${col}${300+i}`

Labels: write `acc.customLabel ?? catalog.labelEn ?? acc.catalogId` to col B
for ALL 7 bands (matches template which repeats labels across blocks).

Subtotal extension (mirror of BS `extendBsSectionSubtotals`):
- C14 (Acq Begin total)  → append `+SUM(C100:C139)`
- C23 (Acq Add total)    → append `+SUM(C140:C179)`
- C32 (Acq End total)    → append `+SUM(C180:C219)`
- C42 (Dep Begin total)  → append `+SUM(C220:C259)`
- C51 (Dep Add total)    → append `+SUM(C260:C299)`
- C60 (Dep End total)    → append `+SUM(C300:C339)`
- C69 (Net Value total)  → append `+SUM(C340:C379)`

Same append semantics as BS (handles 4 cell-value shapes: ExcelJS formula
object, raw string, hardcoded number, empty cell).

Two helpers:
- `injectExtendedFaAccounts(workbook, state)` — iterates filtered accounts,
  assigns slot index by order, writes label + value/formula per block per
  year column.
- `extendFaSectionSubtotals(workbook, state)` — appends `+SUM(band)` to each
  of 7 subtotals across all year columns. No-op if no extended accounts.

## Out of Scope

Deferred to Session 029+:
- i18n coverage audit (hardcoded strings scan)
- Phase C per-page numerical verification across 29 visible nav sheets
- Upload parser (.xlsx → store)
- RESUME page (DCF/AAM/EEM side-by-side)
- Dashboard polish

## Technical Decisions

1. **No row insertion** — preserves LESSON-067 invariant. Extended content
   lives in rows ≥ 100 on each sheet. 244 cross-sheet refs untouched.
2. **Idempotent by construction** — T1 sentinel replacement writes the same
   formula every export. T2 SUM append runs once per fresh-template export;
   since each export starts from a pristine template read, double-append is
   not a concern in the current pipeline.
3. **Label-in-every-band for FA** — matches template convention which
   repeats 6 category labels in each block (rows 8-13 "Land/Building/...",
   rows 17-22 "Land/Building/...", etc.). Extended accounts follow suit.
4. **Export pipeline position** — insert T1 helpers after existing BS
   injection, before sanitize pipeline steps. T2 helpers in same band.

## Success Criteria

- All existing 878 tests pass
- T1 adds ~12 tests, T2 adds ~13 tests → target suite size ≥ 903
- Build 34 static pages, typecheck clean, lint clean
- Live deploy `penilaian-bisnis.vercel.app/akses` HTTP 200
- Sample export opens in Excel with zero repair dialogs
- `BS_SECTION_INJECT` / `injectExtendedBsAccounts` / `extendBsSectionSubtotals`
  unchanged (regression guard)
