# Design — Session 040: Merge + Extended Injection (Proy BS/FA/KD) + Sign Reconciliation

**Session**: 040
**Date**: 2026-04-18
**Scope**: Close multi-session deferral backlog: merge Session 039 to main, ship extended-account injection for PROY BS / PROY FA / KEY DRIVERS Additional Capex, reconcile KD ratio sign convention at export boundary to eliminate 21-entry Phase C whitelist.

---

## 1. Problem Statement

After Session 036 migrated BS/FA/KD to dynamic account catalogs, three export gaps remained:

- **PROY BALANCE SHEET**: `ProyBsBuilder` silently skipped accounts with `excelRow ≥ 100` (extended catalog) or `≥ 1000` (custom). Only the 25 baseline rows in `INPUT_BS_TO_PROY_BS_TEMPLATE` reached the exported Excel file.
- **PROY FIXED ASSETS**: `ProyFaBuilder` similarly dropped extended/custom accounts despite `computeProyFixedAssetsLive` emitting values for them.
- **KEY DRIVERS Additional Capex**: Session 036 T8 removed the old 4-row cell-mapping entries (D33-D36 for land/building/equipment/lainnya) but never built a dynamic injector. User input into `additionalCapexByAccount` was stored but never written to export.

Separately, Session 035's Phase C carried 21 known-divergent KD cells (D20/E20/.../J20 — same for rows 23/24) hiding a sign-convention gap: store keeps ratios positive per LESSON-011, but live PROY LR template formulas expect negative so `=D8*'KEY DRIVERS'!D23` yields negative selling expense per LESSON-055 IS convention. Whitelist hid a functional bug visible only when the user reopened the exported workbook in Excel.

## 2. Scope

### In Scope

1. **Merge `feat/wc-scope-page-and-dcf-breakdown` to main** (Session 039 deferred merge).
2. **Proy BS extended injection** — inject leaves at synthetic excelRows (100+, 1000+) for visibility; subtotals stay untouched (already include extended via `deriveComputedRows(dynamicManifest)`).
3. **Proy FA extended injection** — 7-band slot layout mirror of Session 028 FA historical, with all-static writes (no live formulas) matching ProyFaBuilder baseline convention.
4. **KEY DRIVERS dynamic additionalCapexByAccount injection** — per-FA-account row starting at row 33, clear-before-write residue cleanup, gating on home + fixedAsset + keyDrivers.
5. **KD ratio sign reconciliation** — negate cogsRatio / sellingExpenseRatio / gaExpenseRatio at export boundary via `reconcileRatioSigns` helper in KeyDriversBuilder. Remove 21 KNOWN_DIVERGENT_CELLS entries.

### Out of Scope

- AAM extended-account native injection (excelRow ≥ 100) — deferred.
- AccPayables extended catalog — deferred.
- Upload parser (reverse of export) — deferred.
- RESUME page — deferred.
- LESSON-108 grep audit of remaining compute modules — deferred (low-severity, no user-reported bug).
- Cleanup of `isIbdAccount` classifier from AAM CL/NCL display split — deferred (calc-inert after Session 038).

## 3. Key Architectural Decisions

### Decision 1 — PROY BS/FA extended injection = leaf-only, no subtotal formula append

Session 025 BS pattern = "synthetic-row write + `+SUM(extendedRange)` append to subtotal formula". That works because BS template has LIVE Excel formulas at subtotals. **PROY BS/FA write STATIC computed values** from pipeline (`computeProyBsLive` / `computeProyFixedAssetsLive`), and those static values already include extended account contributions via `deriveComputedRows + dynamicManifest.computedFrom` (Proy BS) or direct per-band summation across all `accounts` (Proy FA). Appending `+SUM(range)` to a static cell would double-count.

Therefore: **leaf-only injection + zero subtotal modification**. Documented as builder-internal comment.

### Decision 2 — PROY FA all-static (diverges from Session 028 FA historical)

Session 028 FA uses LIVE formulas for computed bands (ACQ_END, DEP_END, NET_VALUE): `=+<col>{rowA}+<col>{rowB}`. PROY FA baseline writes STATIC values across ALL 7 bands (no live formulas anywhere). For consistency, PROY FA extended injection also writes STATIC — user edits in Excel won't recompute, matching existing PROY FA contract.

### Decision 3 — KD capex injector gates on upstream but doesn't force it

KeyDriversBuilder.upstream stays `['keyDrivers']` (narrow per LESSON-097). The capex injector internally checks `state.home && state.fixedAsset && state.keyDrivers` and returns early if any is absent. This keeps KD export working when the user has filled only KD scalars but not FA yet — injector is additive.

Edge case handled: when `fixedAsset.accounts.length === 0` (e.g. PT Raja Voltama fixture has empty accounts array but populated rows), the injector is a no-op to preserve template parity for Phase C and to avoid surprising mid-population users with a blanked Additional Capex section. Once user adds ≥1 account, the injector takes over.

### Decision 4 — KD sign reconciliation via export-boundary adapter (LESSON-011 pattern)

Store convention stays positive. Export boundary negates via `reconcileRatioSigns` helper. This is the LESSON-011 "sign at the boundary, not in store" pattern applied consistently. Zero stays zero (no `-0`) via explicit `value === 0 ? 0 : -Math.abs(value)` for byte-level determinism.

## 4. Exit Criteria

- Session 039 merged to `main`, feature branch deleted.
- 29/29 visible nav sheets still state-driven (ProyBs, ProyFa, KeyDrivers builders remain in registry).
- Phase C 5/5 green — including state parity on KEY DRIVERS with D20/E20/.../J20 no longer whitelisted for rows 20, 23, 24.
- Full test suite green (target: 1250+ passing).
- Build + typecheck + lint + audit all clean.
- Session 040 delivered on feature branch `feat/session-040-extended-proy-kd-injection` — merged directly to main after local gates green per user preference (b).
