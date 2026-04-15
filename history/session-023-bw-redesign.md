# Session 023 — B&W Redesign (Creddo-Inspired)

**Date**: 2026-04-15
**Scope**: Visual identity overhaul — pure black & white palette with light + dark mode, Montserrat + JetBrains Mono fonts, `next-themes` toggle. Replaces the navy-and-muted-gold design from Sessions 001-022.
**Branch**: `feat/session-023-bw-redesign` → fast-forwarded into `main` (c8a7d1d).

## Goals
- [x] Replace IBM Plex / Inter fonts with Montserrat + JetBrains Mono via `next/font/google`
- [x] Rewrite `globals.css` design tokens for B&W with light + dark variants
- [x] Add `next-themes` provider with `class` attribute (Tailwind v4 `.dark` selector)
- [x] Theme toggle UI in sidebar footer + mobile drawer
- [x] React Compiler compliant (no setState-in-effect)
- [x] Live deploy verified

## Delivered

### Visual identity (single switching point: `globals.css`)
- `:root` light tokens: canvas `#fafdff` (Creddo near-white), ink `#0a0a0c` (near-black), accent = ink (B&W discipline — emphasis via weight/scale, not hue), opacity-based hierarchy 100/85/55/8/16% for grids and text variants
- `.dark` tokens: canvas `#000004` (Creddo near-black), ink `#fafdff`, lighter semantic colors `#34d399` (positive) and `#f87171` (negative) for dark contrast
- `@theme inline` rebinding — all utility classes (`text-ink`, `bg-canvas`, `border-grid`, etc.) auto-adapt without per-component changes
- `color-scheme: light/dark` per mode for native browser controls
- Letter-spacing tightened to `-0.01em` body, `-0.02em` headings (Creddo character)
- Preserved focus-visible ring + `prefers-reduced-motion` rules

### Typography
- `Inter` → **Montserrat** (UI/heading, weights 400/500/600/700)
- `IBM_Plex_Mono` → **JetBrains Mono** (financial numbers, weights 400/500/600)
- `next/font/google` with `display: swap` → zero FOIT, anonymized URL hashes for privacy

### Theme switching mechanism
- Library: `next-themes` v0.4 (Next 16 + React 19 compatible, 0 vulnerabilities)
- `<ThemeProvider>` wrapper: `attribute="class"`, `defaultTheme="light"`, `enableSystem={false}`, `disableTransitionOnChange`
- `<html suppressHydrationWarning>` — required by `next-themes` inline IIFE that prevents FOUC
- `localStorage.theme` persistence (next-themes default)

### `<ThemeToggle>` component
- Sun/moon icon button in sidebar footer + mobile drawer
- Dynamic label ("Mode Terang" / "Mode Gelap"), `aria-label` lengkap
- **`useSyncExternalStore` mounted gate** — React Compiler compliant (no setState-in-effect, satisfies `react-hooks/set-state-in-effect` lint rule). Pattern: `subscribe → () => () => {}`, `getClientSnapshot → true`, `getServerSnapshot → false`

### Pipeline deploy
- Local gates: 838 tests + build 34 pages + typecheck + lint → all green
- Branch fast-forwarded to main, push origin/main → Vercel auto-deploy
- Polling: `age: 0` + `x-vercel-cache: PRERENDER` ditemukan attempt 1 (~30 detik post-push)
- Font preload assets in production HTML → 2 anonymized woff2 confirmed (Montserrat + JetBrains Mono)

## Verification
```
Tests:     838 / 838 passing
Build:     ✅ 34 static pages
Typecheck: ✅ clean
Lint:      ✅ clean (React Compiler compliant)
Live:      https://kka-penilaian-saham.vercel.app HTTP 200
```

## Stats
- Commits: 1 (c8a7d1d)
- Files changed: 10
- Lines +313 / −627 (net −314 — major: replaced verbose design.md sections + fonts swap)
- New components: ThemeProvider, ThemeToggle
- New deps: next-themes

## Deviations from Plan
- Initial ThemeToggle used `useState` + `useEffect` mounted pattern — caught by lint as `react-hooks/set-state-in-effect` (LESSON-016 reinforcement). Refactored to `useSyncExternalStore` SSR-safe mounted gate (new LESSON-064).

## Lessons Extracted
- [LESSON-064](../lessons-learned.md#lesson-064): `useSyncExternalStore` SSR-safe mounted gate replaces React Compiler-incompatible `useState+useEffect` pattern
- [LESSON-065](../lessons-learned.md#lesson-065): Tailwind v4 CSS-var single-file design overhaul — change `globals.css` only, all components auto-adapt

## Files Changed
```
design.md                                                     [REWRITTEN — Phase 3 docs]
plan.md                                                       [REWRITTEN]
package.json                                                  [+next-themes]
package-lock.json                                             [updated]
src/app/layout.tsx                                            [Inter→Montserrat, Plex→JetBrains, +ThemeProvider, +suppressHydrationWarning]
src/app/globals.css                                           [REWRITTEN — :root + .dark + @theme inline]
src/components/layout/ThemeProvider.tsx                       [NEW]
src/components/layout/ThemeToggle.tsx                         [NEW]
src/components/layout/Sidebar.tsx                             [+ThemeToggle slot]
src/components/layout/MobileShell.tsx                         [+ThemeToggle slot]
```

## Next Session Recommendation
Pre-locked Phase B (Session 024) — export coverage. B&W redesign opens path for advanced UX work later (e.g., per-page contrast tuning) but no immediate follow-up needed.
