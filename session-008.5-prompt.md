# Session 008.5 — Mini-Hardening (Store Migration + Score Helper Extraction)

## Objective

Fix 2 rough edges yang ditemukan di self-audit Session 008. Ini bukan feature session — ini hardening session seperti Session 002→2A.5. Target: ~25 menit, zero breaking changes, tests tetap green, deploy ulang.

**Why now, not later**: Bug #1 adalah data loss aktif di production. Setiap user yang sudah isi HOME form kehilangan data saat key v2 terdeploy. Bug #2 akan compound jika ada questionnaire ke-3 (BORROWING CAP atau kuisioner kualifikasi pemasaran sudah terlihat di Excel sheet list). Per LESSON-015 + LESSON-022, hardening sekarang lebih murah dari debugging nanti.

---

## Patch 1 — Store v1→v2 Migrate Function (🔴 Critical, ~10 menit)

### Problem

`useKkaStore.ts` persist key di-bump dari `kka-penilaian-saham:v1` ke `:v2` karena tambah `dlom`/`dloc` slices. Tapi **tidak ada `migrate` function**. Konsekuensi: Zustand persist middleware tidak menemukan key v2 di localStorage → fallback ke initial state `{home: null, dlom: null, dloc: null}` → **user kehilangan HOME data yang sudah diisi**.

### Fix

Tambah `version` + `migrate` ke Zustand persist config di `src/lib/store/useKkaStore.ts`:

```ts
persist(
  (set) => ({...}),
  {
    name: STORE_KEY,
    version: 2,
    storage: createJSONStorage(() => localStorage),
    partialize: (state) => ({ home: state.home, dlom: state.dlom, dloc: state.dloc }),
    migrate: (persistedState: unknown, fromVersion: number) => {
      // v1 → v2: carry home forward, initialize dlom/dloc as null
      if (fromVersion === 1 && typeof persistedState === 'object' && persistedState !== null) {
        return { ...persistedState, dlom: null, dloc: null }
      }
      return persistedState
    },
    onRehydrateStorage: () => (state) => {
      state?._setHasHydrated(true)
    },
  }
)
```

**Key points:**
- `version: 2` memberitahu Zustand persist bahwa ini schema v2
- `migrate` function menerima state lama + versi lama, return state yang sudah di-migrate
- v1 state hanya punya `{ home }` — kita preserve itu, tambah `dlom: null, dloc: null`
- Jika `fromVersion` bukan 1, return as-is (future-proof untuk v3+)

### Test

Tambah test di `__tests__/lib/store/store-migration.test.ts`:

```ts
import { describe, expect, it } from 'vitest'

describe('store migration v1 → v2', () => {
  it('preserves home data and initializes dlom/dloc as null', () => {
    // Simulate the migrate function logic
    const v1State = { home: { namaPerusahaan: 'PT Test', /* ... */ } }
    const fromVersion = 1
    
    // Apply migration logic
    const migrated = fromVersion === 1 && typeof v1State === 'object' && v1State !== null
      ? { ...v1State, dlom: null, dloc: null }
      : v1State
    
    expect(migrated.home).toEqual(v1State.home)
    expect(migrated.dlom).toBeNull()
    expect(migrated.dloc).toBeNull()
  })
})
```

Atau jika mau lebih robust: extract `migrate` sebagai named export agar bisa di-test secara isolated.

### Verification

- Existing tests tetap pass (no breaking change ke runtime behavior)
- Build clean
- Manual smoke test: buka devtools → Application → LocalStorage → pastikan key `kka-penilaian-saham:v2` ada setelah reload, dan data home preserved

---

## Patch 2 — Extract `computeQuestionnaireScores` Helper (🟡 Code Quality, ~15 menit)

### Problem

Score-from-answers reduction logic muncul 4× di 2 file:
1. `dlom/page.tsx` — `useMemo` untuk display
2. `dlom/page.tsx` — `handleAnswerChange` callback untuk persistence
3. `dloc/page.tsx` — `useMemo` untuk display
4. `dloc/page.tsx` — `handleAnswerChange` callback untuk persistence

Logika identik: iterate factors, lookup selected option by label, sum scores. Hanya `FACTORS` constant yang berbeda.

### Fix

Buat `src/lib/calculations/questionnaire-helpers.ts`:

```ts
import type { QuestionnaireFactor } from '@/types/questionnaire'

/**
 * Compute scores from questionnaire answers.
 * Pure function — no React, no store, no I/O.
 *
 * @param factors - Factor definitions with options and scores
 * @param answers - Map of factor number → selected option label
 * @returns Per-factor scores and total
 */
export function computeQuestionnaireScores(
  factors: readonly QuestionnaireFactor[],
  answers: Record<number, string>,
): { scores: Record<number, number>; totalScore: number } {
  const scores: Record<number, number> = {}
  for (const factor of factors) {
    const selectedLabel = answers[factor.number]
    if (selectedLabel === undefined) continue
    const option = factor.options.find((o) => o.label === selectedLabel)
    if (option) scores[factor.number] = option.score
  }
  const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0)
  return { scores, totalScore }
}
```

Lalu refactor kedua pages:
- Hapus inline reduce logic dari `useMemo` dan `handleAnswerChange`
- Ganti dengan `computeQuestionnaireScores(DLOM_FACTORS, answers)` / `computeQuestionnaireScores(DLOC_FACTORS, answers)`
- 4 reduce loops → 2 function calls (useMemo tetap perlu panggil helper, tapi persistence callback bisa langsung pakai hasil dari useMemo — jangan compute ulang)

### Optimization opportunity

Jika `handleAnswerChange` saat ini compute scores lagi padahal `useMemo` sudah punya hasilnya, pertimbangkan pattern ini:

```ts
// Di page component:
const { scores, totalScore } = useMemo(
  () => computeQuestionnaireScores(FACTORS, answers),
  [answers]
)

// handleAnswerChange cukup update answers — effect/derived logic 
// yang persist score ke store bisa pakai scores dari useMemo
```

Tapi hati-hati dengan LESSON-016 (derive state, don't setState in effect). Jika persistence dipakai via `useEffect` watching `scores`, itu mungkin trigger React Compiler warning. Lebih aman: compute di `handleAnswerChange` via helper call (bukan duplikasi inline logic):

```ts
const handleAnswerChange = (factorNum: number, label: string) => {
  const nextAnswers = { ...answers, [factorNum]: label }
  setAnswers(nextAnswers)
  const { totalScore } = computeQuestionnaireScores(FACTORS, nextAnswers)
  // persist to store...
}
```

Ini tetap 2 calls ke helper (1 di useMemo, 1 di handler), tapi ZERO inline duplication. Helper logic terpusat di 1 file.

### Test

Tidak perlu test baru untuk helper karena existing fixture-anchored tests sudah cover scoring correctness. Tapi jika mau, tambah 1-2 unit test di `__tests__/lib/calculations/questionnaire-helpers.test.ts`:

```ts
import { computeQuestionnaireScores } from '@/lib/calculations/questionnaire-helpers'
import { DLOM_FACTORS } from '@/data/questionnaires/dlom-factors'

describe('computeQuestionnaireScores', () => {
  it('returns correct scores for full DLOM demo answers', () => {
    const demoAnswers: Record<number, string> = {
      1: 'Tidak Ada', 2: 'Skala Besar', 3: 'Tidak Ada',
      4: 'Dibawah', 5: 'Ya, Menurun', 6: 'Diatas',
      7: 'Dibawah', 8: 'Lebih Kecil', 9: 'Menurun', 10: 'Tidak',
    }
    const { scores, totalScore } = computeQuestionnaireScores(DLOM_FACTORS, demoAnswers)
    expect(totalScore).toBe(10) // all factors score 1
    expect(Object.keys(scores)).toHaveLength(10)
  })

  it('handles partial answers gracefully', () => {
    const partial = { 1: 'Ada' } // only factor 1 answered
    const { scores, totalScore } = computeQuestionnaireScores(DLOM_FACTORS, partial)
    expect(totalScore).toBe(0) // "Ada" = score 0
    expect(Object.keys(scores)).toHaveLength(1)
  })
})
```

### Barrel update

Export `computeQuestionnaireScores` dari `src/lib/calculations/index.ts` barrel jika sudah ada barrel, atau langsung import dari file.

---

## Verification Gauntlet

```bash
npm test 2>&1 | tail -15          # all tests passing (existing + new migration/helper tests)
npm run build 2>&1 | tail -25     # clean, same routes as Session 008
npx tsc --noEmit 2>&1 | tail -5   # clean
npm run lint 2>&1 | tail -5       # zero warnings
```

**Manual smoke test** (penting untuk Patch 1):
1. Buka devtools → Application → LocalStorage
2. Jika ada entry `kka-penilaian-saham:v1`, verify setelah reload bahwa data ter-migrate ke v2 key dengan home intact
3. Jika fresh browser, verify store initializes correctly dengan dlom/dloc null

---

## Commit Strategy

```
fix: add store v1→v2 migration to preserve user HOME data
refactor: extract computeQuestionnaireScores helper, deduplicate 4 inline reduces
```

Dua commit terpisah — fix commit pertama (highest priority), refactor commit kedua.

Setelah kedua commit: `git push origin main` → Vercel auto-deploy → verify live.

---

## Kandidat Lesson (untuk wrap-up)

- **LESSON-026** (kandidat): "Always implement Zustand persist `migrate` function saat bump version — tanpa ini, user data hilang silently."
- **LESSON-027** (kandidat): "Extract shared pure helper saat pattern muncul 2× di 2 files — terutama jika ada sinyal kuat untuk instance ke-3."

---

## Post-Hardening: Ready for Session 009

Setelah 008.5 selesai, state proyek:
- 11 pages live (HOME + 8 financial + DLOM + DLOC)
- Store migration safe
- Score computation terpusat
- Ready untuk **Session 009: KEY DRIVERS input form** → unlock projection sheets chain
