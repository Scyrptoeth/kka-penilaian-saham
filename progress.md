# Progress — KKA Penilaian Saham

> Latest state after Session 053 — AP Beginning Editable + FCF FA Required-Gate + LESSON-057 Merge Fix + FCF CWC Inline Breakdown (2026-04-19)

## Verification Results
```
Tests:     1393 / 1393 passing + 1 skipped  (112 files; +11 net since Session 052 — 7 wc-breakdown + 4 AP override)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings (React Compiler compliant)
Audit:     ✅ 0 i18n violations (`npm run audit:i18n`)
Phase C:   ✅ 5/5 gates green (`npm run verify:phase-c`)
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
Live:      https://penilaian-bisnis.vercel.app (HTTP 200 after auth redirect)
Store:     v21 (unchanged since Session 051 — equityProjectionOverrides)
Registry:  29 / 29 WEBSITE_NAV_SHEETS state-driven
Branch:    main — pending Session 053 merge
```

## Session 053 (2026-04-19) — AP Beginning Editable + FCF FA Gate + LESSON-057 Merge Fix + CWC Inline Breakdown

### User-requested 3-point spec

1. **Acc Payables Beginning editable** (Q1=C). Previously Beg = read-only (sentinel roll-forward only). Fix: Beg is user-overrideable with roll-forward fallback — user input wins, blank reverts to fallback, explicit 0 respected. End = Beg + Add as before. Zero migration needed (shape unchanged; new fields are nullable overlay).
2. **FCF Depreciation + CapEx auto-read-only from FA** (Q2=A1). Previously showed "-" because LESSON-057 merge pattern missing in `FcfLiveView` → extended-catalog FA accounts silently dropped. Fix: (a) FA required-gate at FCF (redirect empty state if null), (b) `faAll = { ...faComputed, ...faRows }` so store sentinel (LESSON-132) wins over re-derived static-manifest subtotal.
3. **FCF CWC inline breakdown** (Q3=Z). New `<FcfCwcBreakdown>` section below FCF table: per-account contribution per year (CA negative of delta; CL positive delta; year 1 CA absolute per Excel quirk), totals match FCF rows 12/13 exactly, excluded accounts in collapsible group, trivia panel, link to `/analysis/changes-in-working-capital` for scope edits. Pure transparency — no editor here (scope edits at dedicated page).

### Delivered

**Compute** — `src/data/catalogs/acc-payables-catalog.ts`:
- `computeApSentinels` — Beg now `userValue != null ? userValue : rollforwardFallback`
- 4 new TDD cases in `__tests__/data/catalogs/acc-payables-catalog.test.ts` (user override, mid-stream, explicit 0, backward compat)

**Form** — `src/app/input/acc-payables/page.tsx`:
- `RowEditable` extended with `placeholders?: YearKeyedSeries` prop (fallback hint when no user override)
- Beginning row migrated from `RowDisplay` → `RowEditable` with placeholders from sentinel
- `setAdditionCell` refactored to `setRowCell(row, year, raw)` — generic; clearing cell removes override

**Helper** — `src/lib/calculations/wc-breakdown.ts` NEW:
- `computeWcBreakdown(bsAccounts, bsRows, cfsYears, bsYears, excludedCA, excludedCL)` returning `{ caIncluded, clIncluded, caExcluded, clExcluded }` — per-account sign-aligned contribution
- 7 new TDD cases verifying sign convention + exclusion split + sum-equals-aggregate invariant (LESSON-139 applied to FCF CWC pairing)

**Component** — `src/components/analysis/FcfCwcBreakdown.tsx` NEW:
- Inline section rendered below FCF `<SheetPage>` table
- CA + CL per-account tables with totals matching aggregate rows 12/13
- Excluded accounts collapsible group (no trash action — read-only)
- Trivia panel (`wc.trivia.*` keys reused) + "Edit Scope" button linking to dedicated page

**Wrapper** — `src/components/analysis/FcfLiveView.tsx`:
- FA promoted to required-gate (`!fixedAsset`) alongside home/BS/IS/CWC
- `faAll = { ...faComputed, ...faRows }` LESSON-057 merge pattern applied
- Renders `<FcfCwcBreakdown>` below `<SheetPage>` when gated fields present

**i18n** — `src/lib/i18n/translations.ts`:
- 11 new `fcf.cwcBreakdown.*` keys (heading, subtitle, editScope, ca/cl headings + totals, includedCount with `{count}`, excludedLabel with `{count}`, empty, triviaFooter)

### Lessons extracted (2)

- **LESSON-147** [PROMOTED]: Derived-with-fallback-override pattern — user input wins, roll-forward derivation fills blanks, explicit 0 respected (`value != null` vs `=== 0` distinction). Generalizes LESSON-146 to cases where derivation IS a legitimate default (not fabrication).
- **LESSON-148** [PROMOTED]: Audit ALL downstream wrappers for LESSON-057 store-sentinel merge pattern when consuming extended-catalog subtotals — bug is invisible with static-only catalog data (fixture tests + Phase C don't cover extended accounts). Grep pattern: `deriveComputedRows\(.+,.+\)(?!.*\{[^}]*\.\.\.)`.

### Cascade (integrated naturally)

- **FCF Depreciation + CapEx** now auto-populate from FA store sentinels — Task 2.1 + 2.2 addressed
- **Proy FA / other downstream consumers** already use correct merge pattern (LESSON-148 audit only found FcfLiveView); no other wrappers needed fix
- **Dedicated `/analysis/changes-in-working-capital`** unchanged — remains source of truth for scope edits
- **Store slices** unchanged (AP v20 schema preserves) — no migration needed

## Session 052 (2026-04-19) — Revert FA Seed Fallback + KD Additional Capex Visual Polish

### User-requested 2-point spec

1. **Proy FA Additions displayed values diverge from INPUT FA Additions at shared anchor year (2021).**
   Root cause identified: LESSON-144 `lastNonZeroHistorical` seed fallback from Session 051 fabricated
   histYear anchor values from pre-histYear data (2018-2020) when user hadn't entered at histYear.
   This violated INPUT-is-source-of-truth. User chose **(B)**: revert total. Seed becomes strict
   `historicalSeries[histYear] ?? 0`. Projection 2022-2024 stalls at 0 when histYear = 0/empty —
   user fixes by entering histYear data (correct workflow), not by system fabrication.
2. **KD Additional Capex visual polish (3 issues + 1).**
   - Italic removed → normal font
   - Thousand separator added via `IDR.format` (id-ID locale: `8935657067` → `8.935.657.067`)
   - Year header aligned with values (both right-aligned on full `<td>` width)
   - `<input readonly>` box → plain `<td>` text (mirrors Total row styling, consistent auto-readonly look with Proy FA)

### Delivered (commit pending)

**Compute** — `src/data/live/compute-proy-fixed-assets-live.ts`:
- Deleted `lastNonZeroHistorical` helper (18 LOC)
- Simplified `acqAddAtHist = acqAddHist[histYear] ?? 0` + same for Dep
- Docstring updated: "Session 052: strict INPUT-as-source-of-truth"

**Tests** — `__tests__/data/live/compute-proy-fixed-assets-live.test.ts`:
- Rewrote `Session 051 Additions seed fallback` block as `Session 052 Additions seed is strict`
- 4 TDD cases: undefined → 0 + 0 projection, explicit 0 → 0 + 0 projection, non-zero → propagates with growth, Dep symmetric

**UI** — `src/components/forms/KeyDriversForm.tsx`:
- Additional Capex section data rows: replaced `<input readOnly>` (8 attrs + class with italic + border) with plain `<td>` (3 attrs: `title`, `aria-readonly`, class with `text-right font-mono tabular-nums text-ink`)
- Value rendered via `IDR.format(Math.round(series[y] ?? 0))` — consistent with Total row

**Lessons**:
- LESSON-144 marked SUPERSEDED
- LESSON-146 (PROMOTED) — INPUT at histYear is strict source of truth — no fabricated seed fallback

### Cascade (as per user "Keempat" directive)

System naturally cascades through data flow — no additional code changes needed:
- **KD Additional Capex**: auto-populate from Proy FA Acq Additions band — now 0 everywhere until user enters 2021 data (same behavior pre-Session 051)
- **Proy CFS CapEx outflow**: 0 in projection (flows from Proy FA Additions via compute chain)
- **Proy BS Fixed Assets**: flat across projection (same source)
- **DCF Free Cash Flow**: no CapEx deduction term in projection (flows from same)
- **User action required post-deploy**: enter 2021 FA Additions data at `/input/fixed-asset` to get meaningful projections

## Session 051 (2026-04-19) — Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback

### User-requested 3-point spec + system-wide integration

1. **Proy BS growth auto read-only + strict algorithm for sparse accounts.**
   Sparse-historical accounts (manual entry with 1–2 real data years like
   Setara Kas, Hutang PPh Pasal 21/2021) previously extrapolated from a
   single trailing YoY observation (231.9% / 68.4%). Fix applies strict rule:
   need ≥ 2 real YoY observations; else null → "—" + flat projection.
2. **Equity auto-fill editable per-cell independent.** Shareholders' equity
   section no longer projects via growth. Each projection cell defaults to
   historical last-year value + editable per-cell. Edit at year Y does NOT
   cascade to Y+1 / Y-1 — stored via new `equityProjectionOverrides` slice.
3. **KD Additional Capex blank fix at root cause.** Proy FA Additions seed
   fell back to 0 when user didn't entry the histYear cell → multiplicative
   0 × (1+g) stalled forever → KD Additional Capex shows 0. Fix: fallback
   seed = last non-zero historical value when histYear entry is undefined.
   Respects explicit 0 (user intent).

### Delivered (commit `3329837`)

**New helper** — `src/lib/calculations/derivation-helpers.ts`:
- `averageYoYStrict(series, historicalYears): number | null` — strict-≥2-real-YoY algorithm
- 10 TDD cases + Setara Kas real-world case

**Store v20 → v21** — `src/lib/store/useKkaStore.ts`:
- `BalanceSheetInputState.equityProjectionOverrides: Record<excelRow, YearKeyedSeries>`
- Setter `setEquityProjectionOverride(row, year, value | null)` — null clears override
- Migration initializes `{}` on existing balanceSheet (idempotent)

**Compute refactor** — `src/data/live/compute-proy-bs-live.ts`:
- `averageYoYStrict` replaces `computeAvgGrowth` for non-equity leaves
- Section === 'equity' accounts: skip growth, default histYear value, apply overrides
- New optional input `equityOverrides`

**INPUT BS avg column** — `DynamicBsEditor.tsx` + `RowInputGrid.tsx`:
- `growthAverageResolver?` prop injects strict semantic into avg cell render
- Single source of truth: displayed avg = projection multiplier (LESSON-139)

**Proy BS page** — `src/app/projection/balance-sheet/page.tsx`:
- Equity leaves → editable `<NumericInput>` per projection year, no growth row
- Non-equity leaves → read-only value + strict growth row (null → "—")

**Proy FA seed fallback** — `src/data/live/compute-proy-fixed-assets-live.ts`:
- `lastNonZeroHistorical` helper walks years backward for fallback seed
- Applied to ACQ_ADDITIONS + DEP_ADDITIONS
- Explicit 0 at histYear respected (user intent distinguished from missing)

### Lessons extracted (3)
- **LESSON-143** [PROMOTED]: `averageYoYStrict` — projection growth requires ≥ 2 real YoY observations or null/flat fallback; single source of truth across INPUT display + Proy compute (LESSON-139 driver-display sync generalized)
- **LESSON-144** [PROMOTED]: Multiplicative roll-forward projection seed MUST fall back to last non-zero historical when histYear entry is undefined; distinguishes "user typed 0" from "user left blank" via `!= null` check
- **LESSON-145** [local]: Resolver prop pattern for derivation columns — decouple presentational grid from avg computation semantics; caller injects strict vs loose via `(row) => result` function

## Latest Sessions
- [Session 053](history/session-053-ap-beg-editable-fcf-gate-cwc-breakdown.md) (2026-04-19): AP Beginning Editable + FCF FA Gate + LESSON-057 Merge Fix + CWC Inline Breakdown — 3 tasks, 8 files modified (2 new + 6 changed), +11 net tests, 2 lessons (both promoted).
- [Session 052](history/session-052-revert-fa-seed-fallback-kd-capex-polish.md) (2026-04-19): Revert FA Seed Fallback + KD Additional Capex Visual Polish — 2 tasks, 4 files modified (1 compute + 1 test + 1 form + docs), −18 net LOC compute, 0 net test count (4 rewritten in-place), 1 lesson (LESSON-146 promoted, LESSON-144 superseded).
- [Session 051](history/session-051-proy-bs-strict-growth-equity-capex-seed.md) (2026-04-19): Proy BS Strict Growth + Equity Editable + Proy FA Seed Fallback — 10 tasks, 14 files (1 new + 13 modified), +882/−203 LOC, +24 net tests, 3 lessons (2 promoted). Merged to main.
- [Session 050](history/session-050-kd-auto-readonly.md) (2026-04-19): Key Drivers Auto Read-Only — 8 tasks, 9 files (2 new + 7 modified), +667/−434 LOC, +14 net tests, 2 lessons (1 promoted). Merged to main.
- [Session 049](history/session-049-proy-lr-opex-common-size.md) (2026-04-19): Proy. P&L OpEx Merge + Common-Size Projection Drivers — 1 task (refactor), 9 files, +768/−361 LOC, +16 net tests, 2 lessons (1 promoted).

## Delivered (cumulative highlights)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand v21 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3 + next-themes 0.4
- Visual identity: Montserrat + JetBrains Mono, B&W palette light + dark mode
- Store v21 with chained migration v1→v21
- Comprehensive i18n: ~600+ keys, `useT()` hook
- Triple-layer i18n enforcement: `audit-i18n.mjs` + ESLint rule + `pretest`
- State-driven export (Sessions 030–035) — 29/29 registry, V1 pruned
- Shared derivation helpers + generic `CatalogAccount` + 4 dynamic catalogs (BS/IS/FA/AP)
- **Session 051 strict avg-growth (`averageYoYStrict`)**: sparse-historical accounts no longer extrapolate from single observation; single source of truth for INPUT BS Avg column AND Proy BS projection multiplier (LESSON-143 + LESSON-139)
- **Session 052 Proy FA Additions seed strict**: Reverts Session 051 fabricated fallback. `seed = historicalSeries[histYear] ?? 0`. INPUT at histYear is strict source of truth — no fabricated fallback from pre-histYear years. Projection stalls at 0 when histYear blank (cure: user enters histYear data). Cascade: KD Additional Capex = 0, Proy CFS CapEx = 0, Proy BS FA flat until user entry. LESSON-146 PROMOTED (supersedes LESSON-144)
- Session 050 Key Drivers auto read-only (merge-at-persist useMemo, React Compiler compliant)
- Session 046 sentinel coverage + Session 047 Net Value clamp + sticky floor

### Pages (42 total prerendered)
- **Input**: HOME · Balance Sheet (dynamic 84, **strict avg growth**) · Income Statement (dynamic 48) · Fixed Asset (dynamic 20) · Key Drivers (auto read-only from IS + Proy FA 7-yr) · Acc Payables (dynamic schedules)
- **Historical** (hidden from sidebar): BS, IS, Cash Flow, Fixed Asset
- **Analysis**: Financial Ratio · FCF · NOPLAT · Growth Revenue · ROIC · Growth Rate · Changes in Working Capital · Cash Flow Statement
- **Projection**: **Proy. BS (Session 051 — strict growth, equity editable per-cell)** · Proy. P&L · Proy. FA · Proy. NOPLAT · Proy. CFS (all 3-year scope)
- **Valuation**: DLOM · DLOC (PFC) · WACC · Discount Rate · Borrowing Cap · Interest Bearing Debt · DCF · AAM · EEM · CFI · Simulasi Potensi
- **Summary**: Dashboard · RESUME

## Next Session Priorities

### Session 054+ Backlog

1. **User visual QA on Session 053** — verify at:
   (a) `/input/acc-payables` — Beginning row editable for both ST + LT schedules; placeholder shows roll-forward fallback when no user value; typing a value overrides; clearing reverts to fallback;
   (b) `/analysis/fcf` — entering FA data causes Depreciation + CapEx rows to populate (no more "-"); FA required-gate fires if user visits FCF without FA data;
   (c) `/analysis/fcf` — Rincian CWC section below aggregate shows per-account contribution matching aggregate totals; trivia panel renders; "Edit Scope" link navigates to dedicated CWC page.
2. **Combined QA (Sessions 051+052+053)** — verify cross-session interaction: BS strict growth, FA seed strict, KD Additional Capex polish, AP Beginning editable, FCF CWC breakdown all render correctly together.
3. **Upload parser (.xlsx → store)** — highest-priority backlog. Reverse of export. Needs architecture discussion: null-on-upload force re-confirm (IBD/WC scope slices) vs trust-mode preserving uploaded structure. AP dynamic schedule shape adapter required (now Beginning is user-input field too, not just Addition).
4. **Dashboard projected FCF chart** — leverages Sessions 045-053 projection + FCF stack.
5. **Extended-catalog smoke test** (LESSON-148 follow-up) — add a fixture with ≥1 extended account per dynamic catalog (BS/IS/FA/AP) and assert Phase C + downstream merge invariants hold.
