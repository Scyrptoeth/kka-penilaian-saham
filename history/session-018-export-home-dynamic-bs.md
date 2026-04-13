# Session 018 — Excel Export + HOME Revisi + Dynamic BS Input + Catalog Expansion

**Date**: 2026-04-13
**Scope**: 4 major deliverables in single conversation — Export .xlsx, HOME form revision, dynamic BS architecture, 84-account catalog
**Branch**: 4 feature branches → all merged to `main`

## Goals (from prompts 018/019/020)
- [x] Cell mapping registry for Excel ↔ store mapping
- [x] Template-based Excel export with formula preservation
- [x] Export button in sidebar (desktop + mobile)
- [x] HOME form: subjek pajak fields, conditional labels, reset buttons
- [x] PPh Badan flat 22% in Simulasi Potensi
- [x] Store v8→v9→v10 migrations
- [x] BS account catalog (bilingual EN/ID)
- [x] Dynamic BS manifest builder (section-based computedFrom)
- [x] DynamicBsEditor component (dropdown accounts, language toggle, dynamic years)
- [x] Expand catalog to 84 accounts (7 sections × ~12 avg)
- [x] Export "RINCIAN NERACA" detail sheet with all individual accounts

## Delivered

### Export .xlsx (Session 018 scope)
- Cell mapping registry: 12 store slices → verified Excel cell positions
- Template-based export: clone workbook, clear prototype, inject user data
- 3,084 formulas preserved through round-trip (verified)
- Dynamic arrays: WACC companies, DR bank rates (×100 transform)
- DLOM/DLOC answer labels + jenisPerusahaan string mapping
- ExportButton component in Sidebar + MobileShell, disabled in seed mode
- `downloadBlob()` + `buildExportFilename()` utilities

### HOME Form Revision (Session 019 scope)
- 4 new HomeInputs fields: namaSubjekPajak, npwpSubjekPajak, jenisSubjekPajak, jenisInformasiPeralihan
- Conditional labels: "Jumlah Saham Beredar" ↔ "Jumlah Modal Disetor 100%" (zero downstream impact)
- 2 reset buttons with confirmation dialogs (HOME only + full store)
- `resetAll()` store action
- nilaiNominalPerSaham: optional in UI, default Rp 1, required in schema
- PPh Badan: `TARIF_PPH_BADAN = 0.22` named constant, flat rate path in `computeSimulasiPotensi`
- Privacy notice condensed to 1 line

### Dynamic BS Input (Session 020 scope)
- `BsCatalogAccount` + `BsAccountEntry` types
- `buildDynamicBsManifest()`: generates SheetManifest from user accounts with dynamic computedFrom
- `DynamicBsEditor`: SectionDropdown per section, bilingual toggle, year +/- controls
- `deriveComputedRows` unchanged — manifest is the dynamic input
- Store v9→v10: BalanceSheetInputState extended with accounts, yearCount, language
- `historicalYearCount` type widened from `3|4` to `number`

### Catalog Expansion (84 accounts)
- 63 new accounts added across 7 sections (20+10+8+8+16+10+12)
- excelRow ranges: 100-119 (CA), 120-139 (FA), 140-159 (IA), 160-179 (ONC), 200-219 (CL), 220-239 (NCL), 300-319 (EQ)
- All bilingual (EN/ID) with PSAK-standard Indonesian terminology
- `isOriginalExcelRow()` helper for export filtering

### Export "RINCIAN NERACA" Detail Sheet
- `addBsDetailSheet()`: generates editable worksheet with all user BS accounts
- Section headers with background fill, account rows with IDR formatting
- SUM formula subtotals per section (editable — change value → subtotal auto-updates)
- Separate from main BS sheet (3,084 formulas untouched)

## Verification
```
Tests:     771 / 771 passing (53 files)
Build:     ✅ 32 static pages
Typecheck: ✅ clean
Lint:      ✅ clean
```

## Stats
- Commits: 4
- Files changed: 26
- Lines +3,242/-206
- Test cases added: 56 (715→771)
- Store version: v8→v10 (2 migrations)

## Deviations from Plan
- Sessions 018/019/020 executed in single conversation (originally planned as separate sessions)
- HOME cell positions in Excel differed from prompt's guesses — verified and corrected during brainstorm
- KEY DRIVERS COGS/selling/GA ratios are formulas in Excel (not user inputs) — handled by overwriting formulas during export
- Row 23 (Other Non-Current Assets) missing from original manifest — discovered and added to catalog

## Lessons Extracted
- [LESSON-049](../lessons-learned.md): ExcelJS formula preservation verified — round-trip safe
- [LESSON-050](../lessons-learned.md): Cell positions in Excel prompts are guesses — always verify with ExcelJS
- [LESSON-051](../lessons-learned.md): Extended catalog accounts need separate export sheet (RINCIAN NERACA)

## Files Added/Modified
```
src/lib/export/cell-mapping.ts                    [NEW]
src/lib/export/export-xlsx.ts                     [NEW]
src/lib/export/index.ts                           [NEW]
src/components/layout/ExportButton.tsx             [NEW]
src/data/catalogs/balance-sheet-catalog.ts         [NEW]
src/data/manifests/build-dynamic-bs.ts             [NEW]
src/components/forms/DynamicBsEditor.tsx            [NEW]
public/templates/kka-template.xlsx                 [NEW]
src/components/forms/HomeForm.tsx                   [REWRITTEN]
src/lib/calculations/simulasi-potensi.ts           [MODIFIED]
src/lib/store/useKkaStore.ts                       [MODIFIED]
src/types/financial.ts                             [MODIFIED]
src/lib/schemas/home.ts                            [MODIFIED]
src/data/live/types.ts                             [MODIFIED]
src/data/manifests/types.ts                        [MODIFIED]
src/app/input/balance-sheet/page.tsx               [MODIFIED]
src/app/valuation/simulasi-potensi/page.tsx        [MODIFIED]
src/components/layout/Sidebar.tsx                  [MODIFIED]
src/components/layout/MobileShell.tsx              [MODIFIED]
__tests__/lib/export/cell-mapping.test.ts          [NEW]
__tests__/lib/export/export-xlsx.test.ts           [NEW]
__tests__/data/catalogs/balance-sheet-catalog.test.ts [NEW]
__tests__/data/manifests/build-dynamic-bs.test.ts  [NEW]
__tests__/lib/calculations/simulasi-potensi.test.ts [MODIFIED]
__tests__/lib/store/store-migration.test.ts        [MODIFIED]
```

## Next Session Recommendation
1. Income Statement + Fixed Asset: apply same dynamic catalog pattern
2. Upload parser (.xlsx → store) — reuses cell-mapping registry
3. RESUME page — final summary comparing DCF/AAM/EEM
4. SheetPage live mode integration for dynamic BS manifest
