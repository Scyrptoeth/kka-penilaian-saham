# Design — Session 036: Dynamic Account Interoperability
## Proy BS, Input FA CS/Growth, Proy FA, Key Drivers Additional Capex

**Session**: 036
**Date**: 2026-04-18
**Scope**: End-to-end dynamic-account propagation across projection & input layers.

---

## 1. Problem Statement

Dynamic account catalog (Session 019–020) made Input BS, IS, FA fully
dynamic — user adds catalog/manual accounts, editor renders them.
**Downstream projection layer (Proy BS, Proy FA) still uses hardcoded
row mappings from the PT Raja Voltama case study**, so user-added extended
or custom accounts never appear in projections. Input FA is also missing
the Common Size + Growth YoY columns that Input BS and Input IS already
have.

This session closes the gap — end-to-end per-account historical-growth
projection for BS and FA, with Input FA feature parity and Key Drivers
Additional Capex mirroring the dynamic FA catalog.

## 2. Scope

### In Scope (this session)

1. **Input FA — Common Size + Growth YoY columns** — feature parity with
   Input BS / Input IS. Denominator = Total Net Value (row 69).
2. **Proy BS — Full Simple Growth model** — every leaf account from
   `balanceSheet.accounts` projects via `value[N] = value[N-1] × (1 +
   computeAvgGrowth(series))`. Zero special-case handling.
3. **Proy FA — Dynamic accounts, Net Value projection** — all FA accounts
   from `fixedAsset.accounts` display read-only across 7 bands; only Net
   Value band projects via per-account Net Value avg YoY growth; Acq/Dep
   bands show "—" in projection years **display-wise** (computed
   internally via same NV growth rate for cascade preservation).
4. **Key Drivers — Additional Capex dynamic** — replace 4 hardcoded rows
   with FA catalog accounts; store slice `additionalCapexByAccount:
   Record<number, YearKeyedSeries>` (keyed by FA excelRow); store v15→v16
   migration.
5. **Export builders** — ProyBsBuilder + ProyFaBuilder updated to inject
   dynamic accounts (extended-row injection pattern, Session 025/028
   lineage).
6. **Downstream alignment** — PROY LR, PROY NOPLAT, CFS reconciled
   against new Proy BS/FA decoupling.
7. **Phase C** — `KNOWN_DIVERGENT_CELLS` expanded; state-parity still
   strict on input+setting sheets, coverage invariant on projection.

### Out of Scope

- AAM extended-account native injection (deferred to Session 037+)
- AccPayables extended catalog
- Upload parser (xlsx → store)
- RESUME page
- Dashboard polish (projected FCF chart — may show different magnitudes
  with new Net Value model; noted as Session 037 follow-up)
- Sign convention reconciliation for KD cogs/selling/ga ratios (21
  whitelisted cells — kept as-is)

## 3. Architectural Decisions

### Decision 1 — Proy BS uniform growth model

**User choice**: Full Simple Growth.

**Before**: `computeProyBsLive` had 12-row seed map + special-case
branches (Cash in Banks = 0, AR adjustments, FA cross-ref, Intangible
growth, Equity carry-forward, Current Profit += Proy LR Net Profit,
Bank Loan IFERROR).

**After**: iterate `balanceSheet.accounts`, project each leaf
uniformly `value[N] = value[N-1] × (1 + computeAvgGrowth(series))`.
Subtotals from `computedFrom`. Balance Control displayed as
TOTAL ASSETS − TOTAL L&E (may not reconcile; user accepts as diagnostic).

**Consequences**:
- Proy BS and Proy FA fully decoupled (no cross-ref).
- Proy LR Net Profit no longer cascades into Proy BS Current Profit.
- Balance Control row becomes diagnostic-only.
- Every account's growth rate is deterministic from its own historical
  data — transparent, easy to audit.

### Decision 2 — Proy FA display decoupling (Net Value only)

**User choice**: Project Net Value only (display).

**Display layer**: Net Value band (rows 63–69) shows projected values;
Acq Begin/Add/End + Dep Begin/Add/End show "—" in projection years.

**Compute layer**: All 7 bands projected internally via **per-account
Net Value growth rate**. Acq End and Dep End use same growth rate. This
preserves proyFaRows[51] (Dep Additions) for PROY LR cascade.

Rationale: Semantic honesty — user said "the display should show only
Net Value projection, because Net Value best reflects FA growth." This
respects display while keeping cascade robust.

### Decision 3 — Input FA CS/Growth denominator (row 69)

**User choice**: Total Net Value Fixed Assets (row 69).

Common Size column mirrors Input BS pattern — `value / totalNetValueFa`
for that year. Applied to all 7 bands of every account. Growth YoY
identical to Input BS formula: `yoyChangeSafe(currYear, prevYear)`.

### Decision 4 — Additional Capex dynamic (mirror Input FA)

**User choice**: Yes, mirror Input FA accounts.

New store slice:
```ts
keyDrivers.additionalCapexByAccount: Record<number, YearKeyedSeries>
// Key = FA excelRow (same as fixedAsset.rows keys)
// Value = YearKeyedSeries over PROJECTION_YEARS
```

Migration v15→v16: existing 4-row `additionalCapex.land / building /
equipment / others` dropped (no lossless map to FA accounts). Fresh
empty object. Old data discarded — acceptable because grep shows only
form + cell mapping reference; no compute path reads this today.

### Decision 5 — Cascade scope (Full)

**User choice**: Full propagation.

- ProyBsBuilder: extend template injection to accommodate extended &
  custom accounts (excelRow >= 100 or >= 1000).
- ProyFaBuilder: same pattern.
- Phase C: input+setting sheets still strict; projection sheets accept
  growth-based divergence from template cached values.

## 4. Data Flow (target state)

```
Input BS (dynamic accounts) ────────┐
  balanceSheet.accounts              │
  balanceSheet.rows (with sentinels) │
                                     ▼
                          computeProyBsLive
                                     │
                              Proy BS page ─────► ProyBsBuilder ──► Excel
                                     │
                                     └── Proy CFS (unchanged, still
                                         reads whatever Proy BS produces)

Input FA (dynamic accounts) ────────┐
  fixedAsset.accounts                │
  fixedAsset.rows (with sentinels)   │
                                     ▼
                     computeProyFixedAssetsLive (Net Value growth)
                                     │
                                     ├── Proy FA page (display: NV only)
                                     │
                                     └── Proy LR depreciation (row 51)
                                                │
                                                ▼
                                          Proy NOPLAT

Input FA ─────► Key Drivers Additional Capex (dynamic, per account)
```

## 5. TypeScript API Changes

### `computeProyBsLive` — new signature

```ts
export interface ProyBsInput {
  accounts: readonly BsAccountEntry[]
  bsRows: Record<number, YearKeyedSeries>  // full historical series, including sentinels
  historicalYears: readonly number[]
  manifestRows: readonly ManifestRow[]     // for subtotal computedFrom
}

export function computeProyBsLive(
  input: ProyBsInput,
  projYears: readonly number[],
): Record<number, YearKeyedSeries>  // keyed by excelRow
```

Old fields removed: `bsLastYear`, `bsAvgGrowth`, `proyFaRows`,
`proyLrNetProfit`, `arAdjustments`, `intangibleGrowth`. Old callers
must rewrite.

### `computeProyFixedAssetsLive` — new signature

```ts
export interface ProyFaInput {
  accounts: readonly FaAccountEntry[]
  faRows: Record<number, YearKeyedSeries>  // includes sentinels
  historicalYears: readonly number[]
}

export function computeProyFixedAssetsLive(
  input: ProyFaInput,
  projYears: readonly number[],
): Record<number, YearKeyedSeries>  // all 7 bands, internal; page filters display
```

### `DynamicFaEditor` — CS/Growth integration

Add `commonSizeData` + `growthData` useMemo hooks, pass to
`RowInputGrid` — identical pattern to `DynamicBsEditor` lines 159–190.
Denominator = `allValues[69]` (Total Net Value Fixed Assets) per-year.

### Key Drivers store slice

```ts
interface KeyDriversSlice {
  // ... existing fields preserved
  additionalCapexByAccount: Record<number, YearKeyedSeries>
  // OLD (removed): additionalCapex: { land, building, equipment, others }
}
```

## 6. Test Strategy

### Unit tests (TDD)
- `computeProyBsLive` — uniform growth per-account, totals via
  computedFrom, multiple-year projection
- `computeProyFixedAssetsLive` — Net Value projection per-account,
  Acq/Dep cascade preserved, totals
- `DynamicFaEditor` CS/Growth — render test with denominator math
- Store v15→v16 migration — old → new schema, empty default, existing
  keyDrivers fields preserved

### Integration tests
- Proy BS page renders dynamic accounts from `balanceSheet.accounts`
- Proy FA page renders dynamic accounts × 7 bands (display-mode)
- Cascade chain: PROY LR depreciation still non-zero with new FA logic
- Phase C: `verify:phase-c` green with whitelist expansion
- Cascade integration: 29/29 MIGRATED_SHEETS still green

### Gate: existing tests must stay green
Current tests referencing removed `ProyBsInput`/`ProyFaInput` fields
will break — they need rewrite. Document expected test delta in plan.

## 7. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Proy BS totals don't reconcile (balance control ≠ 0) | HIGH | Accepted — user acknowledged; row becomes diagnostic |
| Proy LR Net Profit cascade broken | MEDIUM | Preserve PROY LR compute chain independent of Proy BS — PROY LR still feeds PROY NOPLAT |
| Export builders produce invalid Excel (row alignment) | MEDIUM | Follow Session 025/028 extended injection pattern exactly |
| Scope underestimated → context crash mid-session | MEDIUM | Phase plan: MVP (Input FA CS/Growth + Proy BS + Proy FA) first, Additional Capex + Export builders deferred to 036.5 if needed |
| Dashboard projected FCF chart produces unexpected values | LOW | Note as Session 037 follow-up; chart consumes Proy FA Net Value which remains coherent |

## 8. Session Budget

**Realistic total**: ~6–8 hours of work.
**Critical path** (must land in this session):
- Input FA CS/Growth columns (smallest, low risk) — 30min
- computeProyBsLive rewrite + TDD — 60min
- Proy BS page rewrite — 30min
- computeProyFixedAssetsLive rewrite + TDD — 60min
- Proy FA page rewrite — 30min
- Full verification gate + commit — 30min

**Can defer to Session 036.5** if context fills:
- Additional Capex dynamic (touches store migration + KD form — isolated)
- Export builder updates (ProyBsBuilder + ProyFaBuilder)
- Phase C whitelist reconciliation for projection sheets

**Cut line**: land plan Tasks 1–6 (MVP) in this session. Tasks 7–10 can
slide to 036.5 if user context budget constrains. User approves branch
strategy before execution.

## 9. Superpowers Compliance

- Phase 1 BRAINSTORM: this doc.
- Phase 2 PLAN: `plan.md` with discrete tasks (2–15 min each; some
  tasks will be larger due to scope — explicitly flagged).
- Phase 3 IMPLEMENT: strict RED → GREEN → REFACTOR.
- Phase 4 VERIFY: build + typecheck + lint + tests + audit + Phase C +
  cascade.
- Phase 5 DEBUG: if any gate red, root-cause before fix.

## 10. Rollback Plan

Feature branch strategy permits either:
1. Revert entire branch — main unchanged, Session 036 retried fresh.
2. Cherry-pick completed tasks (e.g., Input FA CS/Growth if done and
   standalone) into a smaller PR; defer rest to 036.5.
