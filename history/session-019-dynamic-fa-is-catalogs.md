# Session 019 — Dynamic Fixed Asset + Income Statement (Catalog-Driven)

**Date**: 2026-04-13/14
**Scope**: Convert FA and IS input pages from static ManifestEditor to catalog-driven dynamic editors with bilingual labels, dynamic years, and add/remove account dropdowns. Standardize all INPUT DATA pages.
**Branch**: `feat/session-019-dynamic-fa` + `feat/session-019-dynamic-is` → merged to `main`

## Goals
- [x] Dynamic Fixed Asset input with 20-account PSAK/IFRS catalog
- [x] Dynamic Income Statement input with 41-account catalog across 5 sections
- [x] Bilingual language toggle for BS/FA/IS add-button labels
- [x] Font standardization (add-buttons 13px, no italic on cross-ref rows)
- [x] Store migrations v11→v12 (FA) and v12→v13 (IS)
- [x] Downstream backward compatibility for IS via sentinel pre-computation

## Delivered

### Dynamic Fixed Asset (6 commits)
- `FaCatalogAccount` + `FaAccountEntry` types
- 20 bilingual accounts (6 original + 14 extended, PSAK 16 / IAS 16)
- `buildDynamicFaManifest()`: 7-sub-block row mirroring via FA_OFFSET multipliers (0/2000/3000/4000/5000/6000/7000)
- Signed computedFrom: Net Value = Acq Ending − Dep Ending
- `DynamicFaEditor`: single dropdown, row mirroring add/remove, debounced persist
- `getFaStrings()` bilingual i18n
- Store v11→v12: expand FixedAssetInputState, default 6 original accounts

### Dynamic Income Statement (1 commit, largest)
- `IsCatalogAccount` + `IsAccountEntry` types with `interestType` for Net Interest
- 41 bilingual accounts across 5 sections: Revenue (9), Cost (8), OpEx (12), Non-Op (6), Net Interest (6)
- `buildDynamicIsManifest()`: 5-section manifest, signed computedFrom chain, Net Interest income/expense sub-groups, Depreciation + Tax as fixed leaves
- **Sentinel pre-computation**: DynamicIsEditor computes ALL 14 sentinel values at persist time and stores them at original row positions — 20+ downstream pages work unchanged
- 4 downstream compute files updated: removed IS `deriveComputedRows`, read sentinels directly
- `getIsStrings()` bilingual i18n with per-section add-button labels
- Store v12→v13: migrate IS leafs to extended rows + compute sentinel chain

### UI Standardization (3 fix commits)
- BS add-button labels → bilingual via `getBsStrings().addButtonLabels`
- FA add-button label → visible (was empty string rendering invisible button)
- Remove italic from cross-ref rows in RowInputGrid
- Add-button font 11px → 13px (match regular row labels)
- Generalize `ManifestRow.section` from `BsSection` to `string` + add `CatalogAccount` interface

## Verification
```
Tests:     837 / 837 passing (57 files)
Build:     ✅ 32 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
Store:     v13
```

## Stats
- Commits: 6
- Files changed: 41
- Lines: +3,466 / −422
- Test cases added: 63 (774→837)
- New test files: 4

## Lessons Extracted
- [LESSON-052](../lessons-learned.md#lesson-052): Sentinel pre-computation for downstream compat
- [LESSON-053](../lessons-learned.md#lesson-053): ManifestRow type generalization enables multi-sheet catalogs
- [LESSON-054](../lessons-learned.md#lesson-054): RowInputGrid renders row.label not row.buttonLabel

## Files Added
```
src/data/catalogs/fixed-asset-catalog.ts          [NEW]
src/data/catalogs/income-statement-catalog.ts      [NEW]
src/data/manifests/build-dynamic-fa.ts             [NEW]
src/data/manifests/build-dynamic-is.ts             [NEW]
src/lib/i18n/fixed-asset.ts                        [NEW]
src/lib/i18n/income-statement.ts                   [NEW]
src/components/forms/DynamicFaEditor.tsx            [NEW]
src/components/forms/DynamicIsEditor.tsx            [NEW]
__tests__/data/catalogs/fixed-asset-catalog.test.ts [NEW]
__tests__/data/catalogs/income-statement-catalog.test.ts [NEW]
__tests__/data/manifests/build-dynamic-fa.test.ts  [NEW]
__tests__/data/manifests/build-dynamic-is.test.ts  [NEW]
```

## Files Modified
```
src/data/manifests/types.ts                        [MODIFIED — CatalogAccount, section→string]
src/components/forms/RowInputGrid.tsx               [MODIFIED — generic types, font fix, no italic]
src/components/forms/DynamicBsEditor.tsx            [MODIFIED — cast to BsSection]
src/data/live/types.ts                             [MODIFIED — FA+IS state expanded]
src/lib/store/useKkaStore.ts                       [MODIFIED — v11→v13 migrations]
src/lib/i18n/balance-sheet.ts                      [MODIFIED — addButtonLabels record]
src/data/manifests/build-dynamic-bs.ts             [MODIFIED — bilingual add-button labels]
src/app/input/fixed-asset/page.tsx                 [MODIFIED — DynamicFaEditor]
src/app/input/income-statement/page.tsx            [MODIFIED — DynamicIsEditor]
src/data/live/compute-noplat-live.ts               [MODIFIED — read IS sentinels directly]
src/data/live/compute-cash-flow-live.ts            [MODIFIED — read IS sentinels directly]
src/data/live/compute-financial-ratio-live.ts      [MODIFIED — read IS sentinels directly]
src/data/live/compute-growth-revenue-live.ts       [MODIFIED — read IS sentinels directly]
6 test files                                       [MODIFIED — add IS sentinel computation]
```

## Next Session Recommendation
1. Upload parser (.xlsx → store) — reuses cell-mapping registry
2. RESUME page — final summary comparing DCF/AAM/EEM
3. SheetPage live mode integration for dynamic BS/FA/IS manifests
4. Dashboard polish — projected FCF chart, more KPIs
