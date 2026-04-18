# Session 048 — Per-Row Dividers Financial Ratio + DCF

**Date**: 2026-04-19
**Scope**: User reported difficulty tracking label → value across rows on `/analysis/financial-ratio` and `/valuation/dcf` breakdown groups. No row dividers meant eye wandering. Referenced existing DCF DISCOUNTING section as the correct style pattern to mirror.
**Branch**: `feat/session-048-row-dividers-fr-dcf` (1 feature commit, merged fast-forward to main + pushed, Vercel production deploy triggered).

## Goals (1 task, 2 pages)

- [x] Financial Ratio — per-row `border-b border-grid` on every data row (17 ratios across 4 sections)
- [x] DCF — per-row `border-b border-grid` on 6 breakdown row groups:
  1. FCF (historical) headline
  2. FCF (historical) breakdown — NOPLAT, Dep, ΔCA, ΔCL, CapEx
  3. FCF (projected) headline — per year
  4. FCF (projected) breakdown — per year × 5 components
  5. PV of FCF breakdown — per projected year
  6. Equity → Share Value breakdown — EV, IBD, Surplus, Idle

## Delivered (commit `b7d787e`)

### `src/components/financial/FinancialTable.tsx`

Added `border-b border-grid` to the base `<tr>` className in TableRow data branch. Normal/subtotal/total rows all carry the bottom border; separator/header rows have their own returns so unaffected.

Before:
```tsx
<tr className={cn('group transition-colors hover:bg-accent-soft/40', ...)}>
```

After:
```tsx
<tr className={cn('group border-b border-grid transition-colors hover:bg-accent-soft/40', ...)}>
```

Single-line edit propagates to ALL consumers of FinancialTable (Financial Ratio, NOPLAT, ROIC, Growth Revenue, FCF, etc.).

### `src/app/valuation/dcf/page.tsx`

6 `<tr>` tags upgraded from bare to `className="border-b border-grid"`:

- Historical FCF headline row (line 145)
- Historical FCF breakdown rows (line 150 in the `fcfBreakdown(null).map(...)` loop)
- Projected FCF headline row (line 159, inside Fragment per-year loop)
- Projected FCF breakdown rows (line 164 in nested `fcfBreakdown(i).map(...)` loop)
- PV of FCF breakdown rows (line 191 in `r.pvFcf.map(...)` loop)
- 4 Equity → Share Value breakdown rows (lines 220, 224, 228, 232)

Existing group separators `<tr><td colSpan={2} className="border-b-2 border-grid-strong" /></tr>` unchanged — thicker borders for between-group separation, thinner for within-group row separation. Visual hierarchy preserved.

## Verification

```
Tests:     1328 / 1328 passing + 1 skipped  (no new tests — pure style change)
Build:     ✅ 42 static pages
Typecheck: ✅ tsc --noEmit clean
Lint:      ✅ zero warnings
Audit:     ✅ 0 i18n violations
Phase C:   ✅ 5/5 gates green
Cascade:   ✅ 3/3 (29/29 MIGRATED_SHEETS)
```

## Stats

- Commits on feature branch: 1
- Files touched: 2 (FinancialTable + DCF page)
- LOC: +10 / −10 (net 0 — pure className modifications)
- Test cases added: 0 (style-only change)
- Store version: unchanged (v20)
- i18n keys: zero new strings

## Deviations from Plan

None — single-task session, executed as designed.

## Deferred

None from this session.

## Lessons Extracted

- [LESSON-138](../lessons-learned.md#lesson-138): `border-b border-grid` per data row for high-density financial tables [local]

## Files Added/Modified

```
src/components/financial/FinancialTable.tsx    [MODIFIED — +border-b border-grid on tr base class]
src/app/valuation/dcf/page.tsx                 [MODIFIED — +border-b border-grid on 6 tr elements]
```

## Next Session Recommendation

1. **Upload parser (.xlsx → store)** — highest-priority backlog item
2. **Dashboard projected FCF chart** — leverages Session 045-047 Proy FA improvements
3. **Multi-case management / Cloud sync** — long-tail backlog (requires architecture discussion on privacy-first vs multi-device)
