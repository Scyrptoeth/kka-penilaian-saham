# Session 012 — FA Input + CFS/FCF/ROIC Live Mode

> **Context**: Baca `HANDOFF-COWORK.md` di root repo dan `lessons-learned.md` untuk full context proyek.
> Session ini melanjutkan Phase 3 live data mode. Session 011 berhasil men-deliver IS input + 3 downstream live pages (NOPLAT, Growth Revenue, Financial Ratio). Sekarang giliran Fixed Asset input + Cash Flow Statement + FCF + ROIC.

---

## Scope & Deliverables

5 task berurutan (selesaikan satu per satu, commit setelah setiap task):

### Task 1: Fixed Asset `computedFrom` + `/input/fixed-asset`

**Goal**: User bisa input data Fixed Asset via ManifestEditor, subtotals auto-compute.

**Steps**:
1. Inspect fixture `__tests__/fixtures/fixed-asset.json` — identifikasi mana rows yang leaf (user input) dan mana yang computed (subtotal/total). **PENTING**: Verifikasi setiap row terhadap formula di fixture, jangan percaya label (LESSON-035).
2. Tambahkan `computedFrom` ke semua subtotal/total rows di `src/data/manifests/fixed-asset.ts`. Gunakan signed refs jika ada subtraction (contoh: `[6, -7]` seperti IS).
3. Pastikan Zustand store sudah punya slice `fixedAsset` (sudah ada di v3 per handoff).
4. Buat `/input/fixed-asset/page.tsx` mengikuti Pattern B:
   - Hydration gate (`!hasHydrated → loading`)
   - HOME guard (`!home → empty state + link`)
   - `<ManifestEditor manifest={fixedAssetManifest} sliceSelector={...} sliceSetter={...} yearCount={...} />`
5. Update nav-tree: hapus `wip: true` dari Fixed Asset input entry.
6. Tulis test: `__tests__/data/manifests/fixed-asset-computed-from.test.ts` — load fixture leaf values, run `deriveComputedRows`, assert subtotals match fixture.

**Verification**: `npm test -- --reporter=verbose 2>&1 | tail -30` harus pass. Build zero errors.

**Commit**: `feat: add fixed-asset computedFrom + input page via ManifestEditor`

---

### Task 2: Acc Payables Minimal Input Surface

**Goal**: Menyediakan data Acc Payables yang dibutuhkan CFS untuk working capital computation.

**Steps**:
1. Inspect `__tests__/fixtures/acc-payables.json` — pahami struktur: rows apa saja, tahun berapa, mana yang leaf vs computed.
2. Tentukan pendekatan terbaik — 2 opsi:
   - **Opsi A (Dedicated input page)**: Buat manifest + `/input/acc-payables/page.tsx` via ManifestEditor. Tambah slice `accPayables` ke Zustand store (bump version jika perlu, chain migration).
   - **Opsi B (Embedded dalam BS input)**: Jika Acc Payables hanya 2-3 rows yang bisa di-derive dari BS, embed di BS input page.
   - Pilih opsi yang paling sesuai setelah inspeksi fixture. Utamakan kesederhanaan (YAGNI). Jika butuh store migration, pastikan chain migration v3 → v4 (LESSON-028).
3. Jika dedicated page: tambah ke nav-tree (group "Input Data", mungkin dengan label "Hutang Usaha").
4. Tulis test untuk computed rows jika ada.

**Verification**: Test pass, build clean. Data Acc Payables bisa diakses dari store untuk Task 3.

**Commit**: `feat: add acc-payables input surface for CFS dependency`

---

### Task 3: Cash Flow Statement Live Mode

**Goal**: CFS auto-compute dari BS + IS + Acc Payables saat user sudah input semua upstream data.

**Steps**:
1. Inspect `__tests__/fixtures/cash-flow-statement.json` — pahami setiap row: sumber datanya dari sheet mana, formula-nya apa.
2. Perhatikan **cross-sheet column offset** (LESSON-013): BS col D bisa = 2019, tapi CFS col D = 2020. Verifikasi year alignment.
3. CFS membutuhkan:
   - IS data (net income, depreciation, tax, dll)
   - BS deltas (year-over-year changes in current assets/liabilities)
   - Acc Payables (working capital)
4. Buat compute adapter: `src/data/live/compute-cash-flow-live.ts` — maps BS/IS/AccPayables store data → CFS manifest row numbers.
   - **Sign convention**: User enters expenses positive. CFS bisa punya banyak sign-flip. **Verifikasi setiap row terhadap fixture** sebelum commit.
5. Tulis fixture test: `__tests__/data/live/compute-cash-flow-live.test.ts` — load BS+IS+AccPayables fixtures sebagai "user input" (flip signs where needed to simulate positive input), compute, assert matches CFS fixture values.
6. Buat view wrapper: `src/components/analysis/CashFlowLiveView.tsx` — reads BS/IS/AccPayables slices, `useMemo` compute, passes `liveRows` to `<SheetPage>`.
7. Update `src/app/historical/cash-flow/page.tsx` — import CashFlowLiveView, gunakan pola yang sama dengan NOPLAT/GR/FR pages.
8. Financial Ratio: sekarang 4 CF ratios yang sebelumnya = 0 bisa dihitung. Update `compute-financial-ratio-live.ts` untuk include CF data. Tulis test tambahan.

**Verification**: CFS fixture test pass. FR sekarang 18/18 ratios live. Build clean.

**Commit**: `feat: CFS live mode + FR CF ratios now computed`

---

### Task 4: FCF Live Mode

**Goal**: FCF (Free Cash Flow) auto-compute dari NOPLAT + FA data.

**Steps**:
1. Inspect `__tests__/fixtures/fcf.json` — pahami setiap row dan sumber datanya.
2. FCF membutuhkan:
   - NOPLAT data (sudah bisa compute dari IS)
   - Fixed Asset data (dari store setelah Task 1)
   - Mungkin BS data untuk invested capital items
3. Buat compute adapter: `src/data/live/compute-fcf-live.ts`
4. Tulis fixture test: `__tests__/data/live/compute-fcf-live.test.ts`
5. Buat view wrapper: `src/components/analysis/FcfLiveView.tsx`
6. Update `src/app/analysis/fcf/page.tsx`

**Verification**: FCF fixture test pass. Build clean.

**Commit**: `feat: FCF live mode from NOPLAT + FA data`

---

### Task 5: ROIC Live Mode

**Goal**: ROIC (Return on Invested Capital) auto-compute dari NOPLAT + BS invested capital.

**Steps**:
1. Inspect `__tests__/fixtures/roic.json` — pahami formula: ROIC = NOPLAT / Invested Capital.
2. ROIC membutuhkan:
   - NOPLAT (sudah bisa compute dari IS)
   - Invested Capital dari BS (Total Equity + Interest-Bearing Debt - Non-Operating Assets, atau sesuai formula Excel)
3. Buat compute adapter: `src/data/live/compute-roic-live.ts`
4. Tulis fixture test: `__tests__/data/live/compute-roic-live.test.ts`
5. Buat view wrapper: `src/components/analysis/RoicLiveView.tsx`
6. Update `src/app/analysis/roic/page.tsx`

**Verification**: ROIC fixture test pass. Build clean.

**Commit**: `feat: ROIC live mode from NOPLAT + BS invested capital`

---

## Final Verification (setelah semua 5 task selesai)

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
npm run build 2>&1 | tail -25
npm run typecheck 2>&1 | tail -10
npm run lint 2>&1 | tail -10
```

Semua harus pass. Update `progress.md` dengan:
- Total tests baru
- Pages yang sekarang live mode
- Remaining seed-only pages
- Session 012 summary

## Non-Negotiables (reminder)

- **TDD**: Tulis failing test dulu, baru implementasi. Setiap compute adapter HARUS di-test terhadap Excel fixture @ 12-decimal precision.
- **LESSON-035**: Trust fixture formulas, bukan label. Verifikasi setiap `computedFrom` row terhadap fixture.
- **LESSON-013**: Cross-sheet column offset — CFS year alignment bisa beda dari BS/IS.
- **LESSON-011**: Sign convention isolated di adapter layer, bukan di manifest atau UI.
- **LESSON-028**: Store migration harus chained jika bump version.
- **LESSON-030**: Backward-compatible adapter pattern — jangan break existing CellMap pipeline.
- **LESSON-031**: Auto-detect mode dari domain state. Tidak ada toggle manual.

## Catatan

- Jika satu task ternyata lebih kompleks dari perkiraan (misal CFS punya banyak edge case), STOP dan commit progress yang sudah ada. Lanjutkan di task berikutnya atau sesi berikutnya.
- Setelah 2x gagal di masalah yang sama, mundur ke fundamental: baca ulang fixture, cek asumsi, coba pendekatan berbeda.
- Estimasi: ~3 jam, ~15-20 tests baru, 4+ pages tambahan ke live mode.
- Simpan `progress.md` dan update `lessons-learned.md` jika ada lesson baru.
