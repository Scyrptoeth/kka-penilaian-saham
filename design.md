# Design — KKA Penilaian Saham (Session 2A.5: Harden Calc Engine)

## Problem

Phase 2A delivered 6 pure calculation modules validated against Excel at 12-decimal precision. Architectural review identified three rough edges that would become landmines in Session 2B (UI layer):

1. **Column offset** — BS/IS use cols D/E/F for 2019–2021, while CFS/FCF use C/D/E for the same years. Current `number[]` representation forces UI callers to know these conventions; a single off-by-one mapping silently corrupts all downstream ratios.
2. **No boundary validation** — Calc functions trust callers to provide clean numeric input. `NaN`, `Infinity`, sparse arrays, or length mismatches produce opaque runtime errors instead of actionable validation failures.
3. **Implicit sign convention** — `computeFcf` and `computeCashFlowStatement` accept pre-negated depreciation and capex, mirroring the source workbook's `='FIXED ASSET'!*-1` pattern. Future developers (human or AI) have no compile-time signal that negation is required before the call.

## Approach

Introduce three narrow system layers around the existing pure calc engine:

1. **Year-keyed series** — Replace `readonly number[]` in all 6 Phase 2A modules with `YearKeyedSeries = Record<number, number>`. Years become data, not axes. Caller code reads `series[2020]` and cannot confuse year ordering or column offsets. BS/IS keep `YearlySeries {y0..y3}` for now since they are already type-safe and share the same column layout; migration of Phase 1 modules is deferred as a separate cleanup.

2. **Zod validation layer** — New `src/lib/validation/` module wraps each calc function with a Zod schema at the boundary between the UI/store and the pure calc engine. Rejects `NaN`, `Infinity`, mismatched year sets, or empty inputs with readable error messages. Validation runs once at the boundary; calc functions remain pure and unannotated.

3. **Adapter layer** — New `src/lib/adapters/` module converts raw financial data into properly signed calc inputs. Each adapter has JSDoc explaining *why* each sign flip exists (e.g., "FCF subtracts depreciation because the Excel source pre-negates via `*-1`"). Adapters are the single place that touches sign conventions.

## Key Decisions

1. **YearKeyedSeries = `Record<number, number>`** — plain object keyed by 4-digit year. No wrapping class. TypeScript-friendly, JSON-serializable, easy to iterate. Helper `yearsOf(series)` returns sorted ascending.
2. **Single canonical year set per call** — every function derives its year axis from the first required input, then asserts that all other inputs have the identical year set via `assertSameYears`. No silent intersection/union. A clean error if caller mixes data from different periods.
3. **BS/IS untouched** — they already use explicit `{y0..y3}` names which give the same guarantees as year-keying within their 4-year domain. Migrating them is a separate cleanup, not required for this session's goals.
4. **`growth-revenue.ts` shape change** — input is `YearKeyedSeries` of N years, output is `YearKeyedSeries` of N−1 years (growth rates keyed by the *current* year of the YoY pair). Skipped-year input still produces meaningful growth sequences.
5. **Validation is additive, not a replacement** — calc functions keep their existing runtime guards (length assertions, zero-divide). Zod layer adds *boundary* guarantees on top. Users can still call a calc function directly with well-formed data.
6. **Adapters are typed and narrow** — one adapter per module, each accepting a plain-data input shape (raw from store) and returning the calc function's input shape. No "universal adapter" generic.
7. **Tests are rewritten, not ported** — new tests read fixtures into YearKeyedSeries directly via a small `seriesFromRow` helper. Old `number[]` style helpers stay in the fixture file for BS/IS compatibility.

## Success Criteria

- 6 Phase 2A modules refactored to `YearKeyedSeries` inputs/outputs
- 5 validation schemas in `src/lib/validation/` + passing tests for NaN/Infinity/length-mismatch/empty edge cases
- 3 adapter functions in `src/lib/adapters/` (FCF, CashFlow, NOPLAT) + passing tests asserting sign-flip behavior against Excel fixtures
- At least one end-to-end integration test: raw data → validate → adapt → calc → assertion against fixture
- `npm test -- --run` — ≥60 tests passing, zero failures
- `npm run build 2>&1 | tail -25` — clean
- `npm run lint` + `npx tsc --noEmit` — clean
- Merged to main and pushed

## Out of Scope

- BS/IS migration to YearKeyedSeries
- UI layer (Session 2B)
- New calc modules (Session 2B+)
- Store-side Zod schemas for `HomeInputs` (already exists from Phase 1)
- Performance tuning
- Observability / logging
