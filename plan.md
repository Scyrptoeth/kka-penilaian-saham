# Session 028 Plan — IS + FA Extended Catalog Native Injection

## Branch

`feat/session-028-extended-is-fa` from main

## Task Breakdown

### T0 — Domain rename housekeeping (1 commit)

- [ ] T0.1: Grep `kka-penilaian-saham.vercel.app` across repo + 2 skills
- [ ] T0.2: Replace with `penilaian-bisnis.vercel.app` in LIVE docs only
  (progress.md, skill SKILL.md files, HANDOFF-COWORK.md). Preserve session
  history files verbatim (immutable records).
- [ ] T0.3: Commit `chore(docs): rename live URL to penilaian-bisnis.vercel.app`

### T1 — IS Extended Catalog Native Injection (2 commits)

#### T1.1 — RED: injectExtendedIsAccounts tests

- [ ] Test: writes extended-account label into col B at synthetic row
- [ ] Test: writes extended-account values into year columns at synthetic row
- [ ] Test: skips accounts with excelRow < 100 (original positions)
- [ ] Test: handles state with no IS accounts → no modification
- [ ] Test: fallback label priority (customLabel > catalog.labelEn > catalogId)

#### T1.2 — GREEN: implement injectExtendedIsAccounts

- [ ] Add `IS_SECTION_INJECT` const + `IsSectionInjectMap` interface
- [ ] Implement `injectExtendedIsAccounts` mirroring BS pattern
- [ ] Run T1.1 tests → green
- [ ] Wire into export pipeline after `injectExtendedBsAccounts`

#### T1.3 — RED: replaceIsSectionSentinels tests

- [ ] Test: replaces D6 with `=SUM(D100:D119)` when revenue has extended
- [ ] Test: replaces D7 with `=SUM(D200:D219)` when cost has extended
- [ ] Test: replaces D15 with `=SUM(D300:D319)` when opex has extended
- [ ] Test: replaces D30 with `=SUM(D400:D419)` when non_operating has extended
- [ ] Test: skips net_interest section (sentinelRow null)
- [ ] Test: leaves sentinel untouched when no extended in that section
- [ ] Test: applies to all year columns

#### T1.4 — GREEN: implement replaceIsSectionSentinels

- [ ] Implement function reading `IS_SECTION_INJECT`
- [ ] Wire into pipeline after `injectExtendedIsAccounts`
- [ ] Full test suite green
- [ ] Commit `feat(export): inject extended IS accounts + replace sentinels with SUM formulas`

### T2 — FA Extended Catalog Native Injection (2 commits)

#### T2.1 — Infrastructure + RED tests for injectExtendedFaAccounts

- [ ] Add `FA_BAND` const + `FaBandKey` type in export-xlsx.ts
- [ ] Test: Block 1 Acq Begin writes label + value at correct synthetic row
- [ ] Test: Block 2 Acq Add reads `rows[base+2000]`
- [ ] Test: Block 3 Acq End writes formula `=+${col}${100+i}+${col}${140+i}`
- [ ] Test: Block 4 Dep Begin reads `rows[base+4000]`
- [ ] Test: Block 5 Dep Add reads `rows[base+5000]`
- [ ] Test: Block 6 Dep End writes formula `=+${col}${220+i}+${col}${260+i}`
- [ ] Test: Block 7 Net Value writes formula `=+${col}${180+i}-${col}${300+i}`
- [ ] Test: slot index preserves accounts array insertion order
- [ ] Test: multiple extended accounts assigned sequential slots
- [ ] Test: empty state → no modifications
- [ ] Test: labels written to col B in all 7 bands
- [ ] Test: accounts with excelRow < 100 skipped (original positions)

#### T2.2 — GREEN: implement injectExtendedFaAccounts

- [ ] Implement per design.md: iterate filtered accounts, assign slot, write 7 bands
- [ ] Run T2.1 tests → green
- [ ] Wire into pipeline

#### T2.3 — RED: extendFaSectionSubtotals tests

- [ ] Test: appends `+SUM(C100:C139)` to C14 formula
- [ ] Test: appends `+SUM(C140:C179)` to C23 formula
- [ ] Test: appends `+SUM(C180:C219)` to C32 formula
- [ ] Test: appends `+SUM(C220:C259)` to C42 formula
- [ ] Test: appends `+SUM(C260:C299)` to C51 formula
- [ ] Test: appends `+SUM(C300:C339)` to C60 formula
- [ ] Test: appends `+SUM(C340:C379)` to C69 formula
- [ ] Test: applies to all year columns
- [ ] Test: empty state → no modifications

#### T2.4 — GREEN: implement extendFaSectionSubtotals

- [ ] Implement mirror of BS subtotal-append pattern for 7 FA bands
- [ ] Wire into pipeline after `injectExtendedFaAccounts`
- [ ] Full test suite green
- [ ] Commit `feat(export): inject extended FA accounts across 7 blocks with subtotal SUM append`

### Verification Gate

- [ ] `npm run build 2>&1 | tail -20`
- [ ] `npm test 2>&1 | tail -20` → 878+ passing
- [ ] `npm run typecheck 2>&1 | tail -10`
- [ ] `npm run lint 2>&1 | tail -15`

### Ship

- [ ] Push `feat/session-028-extended-is-fa`
- [ ] Verify Vercel preview deploy
- [ ] Fast-forward to main, push
- [ ] Verify `penilaian-bisnis.vercel.app/akses` HTTP 200
- [ ] Invoke `/update-kka-penilaian-saham` Mode B for session wrap-up
