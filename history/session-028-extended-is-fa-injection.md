# Session 028 — IS + FA Extended Catalog Native Injection

**Date**: 2026-04-17
**Scope**: (1) T0 — Domain rename `kka-penilaian-saham.vercel.app` → `penilaian-bisnis.vercel.app` in live docs + 2 skill files. (2) T1 — Extend IS catalog accounts (excelRow ≥ 100) flow natively into INCOME STATEMENT sheet with sentinel formula replacement (Approach δ). (3) T2 — Extend FA catalog accounts mirror across FIXED ASSET sheet's 7 blocks via band layout (Approach η) with mirrored SUM subtotal append.
**Branch**: `feat/session-028-extended-is-fa` → fast-forwarded into `main` (361c6d7)

## Goals (from plan.md)
- [x] T0: Domain rename housekeeping (chore)
- [x] T1: IS extended catalog — Approach δ sentinel formula replacement
- [x] T2: FA extended catalog — Approach η 7-band layout + mirrored SUM
- [x] Verification gate: tests + build + typecheck + lint
- [x] Push feat branch → fast-forward main → verify live

## Delivered

### T0 — Domain rename housekeeping (commit 0cf6f21)
- `HANDOFF-COWORK.md` line 6 updated
- `~/.claude/skills/start-kka-penilaian-saham/SKILL.md` 4 occurrences replaced (identity row, identity table, curated status, trigger description)
- `~/.claude/skills/update-kka-penilaian-saham/SKILL.md` 2 occurrences replaced (curl verifier, sample report)
- Historical session files (`history/session-001..026-*.md`) PRESERVED VERBATIM as immutable records

### T1 — IS Extended Catalog Native Injection (commit 28c623b)
- **`IS_SECTION_INJECT`** map: 5 sections × `{extendedRowStart, extendedRowEnd, sentinelRow}` with per-section `replaceWithSum` semantics
  - revenue (100-119) → sentinel D6
  - cost (200-219) → sentinel D7
  - operating_expense (300-319) → sentinel D15
  - non_operating (400-419) → sentinel D30
  - net_interest (500-519) → **sentinelRow: null** (mixed-sign via `interestType`, cannot simple-SUM)
- **`injectExtendedIsAccounts(workbook, state)`** — writes label (col B) + year values (C/D/E/F) for IS accounts with excelRow ≥ 100 to synthetic rows
- **`replaceIsSectionSentinels(workbook, state)`** — for sections with ≥1 extended account AND sentinelRow != null, overwrites the sentinel cell across year columns with `=SUM(col{start}:col{end})` live formula
- **Derived row formulas unchanged** — D8 Gross Profit `=SUM(D6:D7)`, D18 EBITDA `=D8+D15`, D22 EBIT, D32 PBT, D35 Net Profit all continue to work because they reference sentinel cells (now live SUM formulas that evaluate to same totals)
- **Net interest D26/D27 stay hardcoded** — mixed income/expense via interestType requires DynamicIsEditor sentinel pre-computation
- 15 new tests: 5 for injectExtendedIsAccounts + 10 for replaceIsSectionSentinels

### T2 — FA Extended Catalog Native Injection (commit 361c6d7)
- **`FaBandKey`** union type + **`FaBandMap`** interface
- **`FA_BAND`** — 7-band layout with 40 slots each:
  - ACQ_BEGIN (100-139), ACQ_ADD (140-179), ACQ_END (180-219, computed `+`)
  - DEP_BEGIN (220-259), DEP_ADD (260-299), DEP_END (300-339, computed `+`)
  - NET_VALUE (340-379, computed `-`)
- **`FA_BAND_SUBTOTAL_ROW`** — band key → subtotal row mapping (14/23/32/42/51/60/69)
- **`injectExtendedFaAccounts(workbook, state)`** — iterates extended accounts (excelRow ≥ 100), assigns slot index preserving array order, writes to all 7 bands per slot:
  - Input bands (ACQ_BEGIN/ACQ_ADD/DEP_BEGIN/DEP_ADD): read `rows[base + storeOffset]`
  - Computed bands (ACQ_END/DEP_END/NET_VALUE): per-year-column formula `=+<col>N1±<col>N2` referencing operand-band slot rows
  - Labels written to col B in all 7 bands (matches template convention of repeating category labels across blocks)
- **`extendFaSectionSubtotals(workbook, state)`** — appends `+SUM(<col>{band.start}:<col>{band.end})` to each of 7 subtotals across all year columns (C/D/E for FA, 3 years). Handles 4 cell-value shapes (ExcelJS formula object, raw string, number, empty) — mirrors BS pattern from Session 025
- Full Excel reactivity: user edits C100 (slot-0 Acq Begin) in Excel → C180 auto-recomputes (slot-0 Acq End) → C340 (slot-0 Net Value) → C14/C32/C69 subtotals
- 20 new tests: 4 for input bands, 3 for formula bands, 4 for slot assignment + labels, 8 for subtotal append, 1 empty-state

## Verification
```
Tests:     913 / 913 passing (61 files; 878 → 893 → 913)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant)
Live:      https://penilaian-bisnis.vercel.app/akses HTTP 200
Store:     v15 (unchanged — no schema change)
```

## Stats
- Commits: 4 (1 docs + 1 chore + 2 feat)
- Files changed: 5
- Lines: +1068 / -70 (net +998)
- Test cases added: 35 (15 IS + 20 FA)
- New exports: 4 (`injectExtendedIsAccounts`, `replaceIsSectionSentinels`, `injectExtendedFaAccounts`, `extendFaSectionSubtotals`)

## Deviations from Plan
- Plan initially proposed Approach γ (append SUM to derived formulas) based on direct BS transplant. Reconnaissance revealed IS sentinels pre-aggregate extended rows → γ would double-count. Switched to Approach δ (sentinel formula replacement) mid-brainstorm. User approved correction.
- TypeScript self-reference error (`FaBandMap` → `typeof FA_BAND` → `FaBandMap`) surfaced in typecheck after tests passed. Fixed by extracting explicit `FaBandKey` union type. Build passed after fix.

## Deferred to Session 029+
- i18n coverage audit (hardcoded strings scan)
- Phase C per-page numerical verification across 29 visible nav sheets
- Upload parser (.xlsx → store)
- RESUME page (DCF/AAM/EEM side-by-side summary)
- Dashboard polish (projected FCF chart)

## Lessons Extracted
- [LESSON-077](../lessons-learned.md#lesson-077): Sentinel overlap invalidates BS-style append pattern — check sheet architecture before transplanting export helpers (Approach δ vs γ)
- [LESSON-078](../lessons-learned.md#lesson-078): Band layout + mirrored SUM for multi-block sheets — one leaf × N-block mirror requires parallel bands with slot-index allocation
- [LESSON-079](../lessons-learned.md#lesson-079): TypeScript self-reference in typed-const + satisfies pattern — extract explicit key union
- [LESSON-080](../lessons-learned.md#lesson-080): Domain rename housekeeping — session history is immutable, update forward-looking docs only

## Files & Components Added/Modified
```
HANDOFF-COWORK.md                                   [MODIFIED]
design.md                                           [REWRITTEN — Session 028 scope]
plan.md                                             [REWRITTEN — T0/T1/T2 breakdown]
src/lib/export/export-xlsx.ts                       [MODIFIED +341 LOC]
  + IS_SECTION_INJECT const + IsSectionInjectMap interface
  + injectExtendedIsAccounts function
  + replaceIsSectionSentinels function
  + FaBandKey union + FaBandMap interface + FA_BAND/FA_BAND_SUBTOTAL_ROW/FA_BAND_ORDER consts
  + injectExtendedFaAccounts function
  + extendFaSectionSubtotals function
  + 2 new export pipeline steps (5b IS, 5c FA)
__tests__/lib/export/export-xlsx.test.ts            [MODIFIED +464 LOC]
  + 2 imports from export-xlsx
  + 2 simulateExport pipeline calls
  + 15 IS tests (describe "extended IS catalog native injection")
  + 20 FA tests (describe "extended FA catalog native injection")
~/.claude/skills/start-kka-penilaian-saham/SKILL.md [MODIFIED — T0 URL rename]
~/.claude/skills/update-kka-penilaian-saham/SKILL.md[MODIFIED — T0 URL rename]
```

## Next Session Recommendation (Session 029)

Per progress.md deferred queue:
1. **i18n coverage audit** — grep hardcoded strings across `src/` post-Session 027 rollout. Target: zero hardcoded EN/ID strings outside translations.ts.
2. **Phase C per-page numerical verification** — generate sample .xlsx export, manually cross-check 29 visible nav sheets against website-rendered values. This is the last major quality gate for export feature.
3. **Upload parser** (.xlsx → store) — reverse of export. Reuses cell-mapping registry + extended injection patterns.
4. **RESUME page** — final summary page showing DCF/AAM/EEM valuation results side by side.
5. **Dashboard polish** — projected FCF chart, additional KPIs.
