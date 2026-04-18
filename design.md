# Session 051 — Design

## Scope (4 user-spec points)

1. **Proy BS growth auto read-only + strict-average algorithm for sparse accounts.**
   Assets (kecuali Fixed Asset) + Liabilitas leaves must render growth sub-row
   with value sourced from INPUT BS "Average Growth YoY" per account. Current
   bug: sparse-historical accounts (manual-entry with 1–2 real data years like
   "Setara Kas" and "Hutang PPh Pasal 21/2021") produce misleadingly high
   growth (231.9% / 68.4%) because a single trailing YoY observation passes
   through leading-zero-skip as the "average". Fix must be system-dev
   generalized so any sparse account (catalog or custom) shows "—" and
   projects flat (× 1.0).
2. **Equity no-growth + auto-fill editable per-cell independent.**
   Section `shareholders_equity` accounts have NO meaningful growth semantic.
   Projection cells default to historical last-year value, editable per-cell
   with per-cell independence (edit 2022 does NOT cascade to 2023/2024).
3. **KD Additional Capex auto read-only — fix root cause at Proy FA seed.**
   KD currently shows 0 for all capex cells because `computeProyFixedAssetsLive`
   seeds ACQ_ADDITIONS projection from `acqAddHist[histYear]` which defaults
   to 0 when user didn't entry Additions for `histYear`. Growth % is computed
   correctly from earlier YoY pairs, but 0 × (1+g) = 0 stalls forever.
   Fix: seed from last non-null historical value when `histYear` entry is
   undefined/null. Respect explicit 0 (user intent).
4. **System-wide integration.** Downstream (Proy LR, Proy CFS, KD, export)
   adjusts automatically. Phase C whitelist updated if needed.

## Chosen Approach

### Fix 1: Unified `averageYoYStrict` helper

New helper in `src/lib/calculations/derivation-helpers.ts`:

```ts
export function averageYoYStrict(
  series: YearKeyedSeries | undefined,
  historicalYears: readonly number[],
): number | null
```

Rules:
1. Iterate consecutive-year pairs in `historicalYears`.
2. A pair is a "real observation" when BOTH values are defined (`!= null`)
   AND prev is non-zero AND prev isFinite.
3. If fewer than 2 real observations → return `null`.
4. Else → arithmetic mean of the real YoY values.

**Single source of truth** consumed by:
- `computeProyBsLive` (Task 4): when null → growth = 0 → flat projection.
- `DynamicBsEditor` Input BS Average Growth YoY column (Task 5): when null → "—".

Both paths consume the SAME function → displayed value always equals
projection multiplier. LESSON-139 principle (driver-display sync) applied
to INPUT BS ↔ Proy BS pairing.

### Fix 2: Equity auto-fill editable per-cell (Tasks 3+4+6)

**Store** (`balanceSheet` slice): add `equityProjectionOverrides: Record<excelRow, YearKeyedSeries>`.
Root-level setter: `setEquityProjectionOverride(excelRow, year, value | null)`.
`null` value → delete override (revert to default).

**Migration v20 → v21**: initialize `equityProjectionOverrides = {}` when
upgrading existing balance-sheet state.

**Compute** (`computeProyBsLive`): for each account with
`section === 'shareholders_equity'`, skip growth-based projection.
```ts
const override = equityOverrides[row]?.[projYear]
out[projYear] = override ?? histYearValue
```

**Page** (`/projection/balance-sheet/page.tsx`): for equity leaves render
`<NumericInput>` editable cells with debounced 500ms onChange → setter.
No growth sub-row rendered for these accounts. Non-equity rows unchanged.

### Fix 3: Proy FA Additions seed fallback (Task 7)

Modify `computeProyFixedAssetsLive`:
```ts
const acqAddAtHistRaw = acqAddHist[histYear]
const acqAddAtHist = acqAddAtHistRaw != null
  ? acqAddAtHistRaw  // respect explicit 0
  : (lastNonNullHistorical(acqAddHist, historicalYears) ?? 0)
```

Same for DEP_ADDITIONS. Helper `lastNonNullHistorical(series, years)` walks
historicalYears from end to start, returns first `series[y] != null` value.

Impact: KD Additional Capex auto-populates because `computeProyFixedAssetsLive`
now returns non-zero ACQ_ADDITIONS projections when user has historical
Additions data but skipped entry for `histYear`.

## What's Out of Scope

- Rewriting Proy LR `computeAvgGrowth` usage (Session 049 handled).
- Changing Proy FA roll-forward beyond seed fallback.
- KD form edit affordance (stays auto-read-only — user confirmed Q3).
- Multi-case management, cloud sync, audit trail (explicitly dropped).

## Non-Negotiables Honored

- **System-dev over prototype** (memory feedback): null-on-sparse is a
  generalized rule, not a Setara-Kas-specific patch.
- **LESSON-108** (account-driven aggregation): equity skip via section
  check, not hardcoded row numbers.
- **LESSON-141** (merge-at-persist): equity editable uses debounced
  persist, not setState-in-effect.
- **LESSON-139** (driver-display sync): INPUT BS avg = Proy BS multiplier
  via shared helper.
- **React Compiler compliance**: no setState-in-effect patterns introduced.
