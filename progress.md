# Progress — KKA Penilaian Saham

> Latest state after Session 021 (2026-04-14)

## Verification Results
```
Tests:     838 / 838 passing (57 files)
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Live:      https://kka-penilaian-saham.vercel.app (HTTP 200)
Store:     v14
```

## Delivered (cumulative)

### Infrastructure
- Next 16 + React 19 + TS strict + Tailwind v4 + Zustand 5 + RHF 7 + Zod 4 + ExcelJS 4 + Recharts 3
- Design system: IBM Plex Sans/Mono, navy+gold palette, 4px radius, tabular-nums
- Store v14 with chained migration v1→v14 (14 versions, fully backward-compatible)
- Generic `CatalogAccount` interface + `ManifestRow.section: string` for multi-sheet catalogs
- Sentinel pre-computation pattern standardized across BS, IS, FA editors
- IS sign convention: expenses negative, formulas plain addition (matching Excel)
- **Universal auto-save**: all editors debounced 500ms, no SIMPAN buttons, HomeForm onBlur + beforeunload
- **PageEmptyState**: universal empty state component across all sections (INPUT DATA, ANALISIS, PROYEKSI, PENILAIAN, RINGKASAN)

### Pages (34 total)
- **Input**: HOME (auto-save onBlur), Balance Sheet (dynamic 84-account), Income Statement (dynamic 41-account), Fixed Asset (dynamic 20-account), Key Drivers (auto-integrated with IS), **Acc Payables** (ST/LT Bank Loan Schedules)
- **Historical**: BS, IS, Cash Flow, Fixed Asset (HIDDEN from sidebar)
- **Analysis**: Financial Ratio (18/18), FCF, NOPLAT, Growth Revenue, ROIC, Growth Rate, **Cash Flow Statement** — ALL live-only with PageEmptyState
- **Projection**: Proy L/R, Proy FA, Proy BS, Proy NOPLAT, Proy CFS
- **Valuation**: DLOM (scroll fix applied), DLOC (PFC), WACC, Discount Rate, Borrowing Cap, DCF, **AAM** (per-row Penyesuaian editable), EEM, CFI, Simulasi Potensi
- **Dashboard**: 4 Recharts charts

### Session 021 Deliverables (2 commits)
- **BS sentinel cross-ref fix (CRITICAL)**: FA cross-ref values included in sentinel computation → Financial Ratios now correct
- **IS Depreciation/Tax data loss fix**: IS_COMPUTED_SENTINEL_ROWS excludes fixed leaf rows 21/33
- **DLOM scroll jump fix**: `relative` class on QuestionnaireForm labels
- **FormulaTooltip removed**: deleted from entire website
- **Auto-save everywhere**: 7 editors converted, SIMPAN buttons removed, "Otomatis tersimpan" indicator
- **PageEmptyState universal**: 18 pages across all sections
- **ANALISIS — Cash Flow Statement**: new page with live-only + PageEmptyState
- **INPUT DATA — Acc Payables**: Bank Loan Schedules input (ST/LT)
- **AAM per-row Penyesuaian**: editable D column for every BS row, E=C+D, store v14
- **BS year button labels**: standardized to match FA/IS convention

## Next Session Priorities

1. **Upload parser** (.xlsx → store) — reuses cell-mapping registry from Session 018
2. **RESUME page** — final summary comparing DCF/AAM/EEM results side by side
3. **Bilingual toggle** incremental rollout to ANALISIS + other pages
4. **Export IS/FA RINCIAN detail sheets** (apply LESSON-051 pattern)
5. **Dashboard polish** — projected FCF chart, more KPIs

## Latest Session
- [Session 021](history/session-021-ux-fixes-auto-save-aam-adjustments.md) (2026-04-14): UX fixes + auto-save + PageEmptyState + AAM per-row adjustments
