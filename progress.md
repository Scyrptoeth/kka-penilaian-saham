# Progress — KKA Penilaian Saham

> Latest state after Session 049 — Proy. P&L OpEx Merge + Common-Size Projection Drivers (2026-04-19)

## Verification Results
```
Tests:     1344 / 1344 passing + 1 skipped  (109 files; +16 net since Session 048)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app (HTTP 200)
Store:     v20 (unchanged)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — Session 049 merged fast-forward + pushed; Vercel production deploy live
```

## Session 049 (2026-04-19) — Proy. P&L OpEx Merge + Common-Size Drivers

### User-requested 4-point spec
1. Add 6 growth/common-size info sub-rows under Revenue / COGS / Interest Income / Interest Expense / Other Income / Non-Op Income.
2. Drop Selling/Others OpEx + General & Admin from Proy. P&L; retain Total OpEx sourced read-only from INPUT DATA>IS "Total Operating Expenses (excl. Depreciation)".
3. Add growth info sub-row under Total OpEx.
4. Propagate integrated system adjustments.

### Delivered (commit `2c32f09`)

**Compute refactor** — `compute-proy-lr-live.ts`:
- New `ProyLrInput` with uniform `commonSize: { cogs, totalOpEx, interestIncome, interestExpense, nonOpIncome }`. Drop `interestIncomeGrowth`, `interestExpenseGrowth`, `nonOpIncomeGrowth`, `isLastYear.sellingOpex`, `isLastYear.gaOpex`, `roundUp3` helper.
- Projection: Revenue[t] unchanged. COGS/II/IE/NOI/TotalOpEx all = Revenue[t] × `commonSize.<key>` (uniform pattern).
- Historical column row 17 = `isLastYear.totalOpEx` (NEW — previously blank).
- Rows 15 + 16 dropped from output map.

**Display refactor** — `projection/income-statement/page.tsx`:
- Discriminated-union ROW_DEFS. 6 new sub-rows (italic muted indent, percent kind, projection-years-only; historical column renders "—").
- Row 33 Other Income — no sub-row (= II + IE, hybrid semantic).

**Consumer updates** — `projection-pipeline.ts` + `projection/noplat/page.tsx` both get shared helper `avgCommonSizeFor(row) = computeAverage(histYears4.map(y => ratioOfBase(isRows[row][y], isRows[6][y])))`.

**Export** — `ProyLrBuilder`: managedRows drops 15 + 16; pre-write clear cells `C15:F15` + `C16:F16` to 0 (LESSON-140) — prevents template residue from PT Raja Voltama prototipe leaking into user exports.

**i18n** — 6 new keys (EN + ID): `proy.revenueGrowth`, `proy.cogsCommonSize`, `proy.totalOpExCommonSize`, `proy.interestIncomeCommonSize`, `proy.interestExpenseCommonSize`, `proy.nonOpIncomeCommonSize`.

**Key Drivers store** — per user Q2=B: `cogsRatio` / `sellingExpenseRatio` / `gaExpenseRatio` retained as dead fields. Zero migration, zero breaking change for existing localStorage. Technical-debt flag: KD UI still shows inputs that don't drive compute.

### Lessons extracted (2)
- **LESSON-139** [PROMOTED]: Driver-display sync — sub-row labels MUST render the same value that drives compute. Sub-row in projection table makes an implicit promise "this number IS what I used"; breaking the promise silently misleads any user cross-checking the projection.
- **LESSON-140** [local]: Pre-write clear dropped-row cells in template export when managedRows shrinks — otherwise template residue from old prototipe values leaks into user exports.

## Latest Sessions
- [Session 049](history/session-049-proy-lr-opex-common-size.md) (2026-04-19): Proy. P&L OpEx Merge + Common-Size Projection Drivers — 1 task (refactor), 9 files, +768/−361 LOC, +16 net tests, 2 lessons (1 promoted). Merged to main.
- [Session 048](history/session-048-per-row-dividers-fr-dcf.md) (2026-04-19): Per-Row Dividers FR + DCF — 1 task, 2 files, +10/−10 LOC (net 0 — pure style), 0 new tests, 1 lesson (local).
- [Session 047](history/session-047-proy-fa-net-value-clamp.md) (2026-04-19): Proy FA Net Value Clamp + Sticky Floor — 1 task, 2 files, +81/−5 LOC, +3 tests, 1 lesson (promoted).
- [Session 046](history/session-046-proy-fa-alignment-rollforward-fix.md) (2026-04-19): Proy FA Alignment + Roll-forward Seed Fix + Asset Disposal Stopping Rule — 3 concerns, 4 files, +296/−190 LOC, +2 net tests, 5 lessons (3 promoted).

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v20 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v20 with chained migration v1→v20
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 049 Proy LR compute**: uniform `Revenue × avg common size` projection pattern for all non-Revenue leaves (COGS/II/IE/NOI/TotalOpEx); replaces heterogeneous (cogsRatio KD + 3× YoY growth) model
- **Session 049 driver transparency**: 6 sub-rows expose the exact driver used by compute (LESSON-139)
- Session 046 sentinel coverage + Session 046 compute defense in depth + Session 046 roll-forward termination + Session 047 Net Value clamp + sticky floor
- `useAutoFlipPosition` hook (Session 044)
- Per-row `border-b border-grid` dividers in FinancialTable + DCF breakdown (Session 048)

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: **Proy. P&L (Session 049 — Total OpEx sourced from IS sentinel, uniform common-size drivers, 6 driver-transparent sub-rows)** · Proy. FA · Proy. BS · Proy. NOPLAT · Proy. CFS
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 050+ Backlog

1. **User visual QA on Session 049** — verify at `/projection/income-statement` with real user data: (a) Selling + G&A rows gone, (b) Total OpEx populated at historical column (2021 or whatever user's lastHistYear is), (c) 6 sub-rows render at projection years with sensible driver values, (d) compute numbers match `displayed_driver × Revenue` for each row.
2. **Upload parser (.xlsx → store)** — highest-priority backlog item. Reverse of export. Requires IBD scope adapter + AP schedule shape adapter. Architecture discussion: null-on-upload force re-confirm vs trust mode preserving uploaded structure.
3. **Dashboard projected FCF chart** — leverages Session 045 roll-forward + Session 047 clamp + Session 043 data-builder + Session 049 uniform Proy LR compute.
4. **Re-evaluate Key Drivers UI post-Session-049** — `cogsRatio` / `sellingExpenseRatio` / `gaExpenseRatio` fields now have zero compute effect on Proy LR. UX debt: user can edit them but nothing happens. Options: (a) hide from KD form, (b) add deprecation note, (c) remove from UI but keep in store for backward compat. Requires user input on desired UX.
5. **Multi-case management** (multiple companies in one localStorage) — UI to switch between cases.
6. **Cloud sync / multi-device** — requires Phase 4 architecture discussion on privacy-first tension.
7. **Audit trail / change history**.

Note on Phase C + cascade: Session 049 passes 5/5 Phase C + 3/3 cascade without needing new KNOWN_DIVERGENT_CELLS entries. Proy LR rows 10/17/29/31/34 will have different projected values in the exported workbook compared to the historical PT Raja Voltama fixture (different driver pattern), but those sheets fall under the "computed + projected sheets coverage invariant" gate per LESSON-100 — strict cell parity is only enforced for the 13 input + setting sheets.
