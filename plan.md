# Session 023 Plan — B&W Redesign

> Branch: `feat/session-023-bw-redesign`
> Pre-locked design decisions in `design.md`

## Tasks
- [ ] **T1** — Setup branch + install `next-themes`
- [ ] **T2** — Swap fonts in `layout.tsx` (Inter→Montserrat, IBM_Plex_Mono→JetBrains_Mono)
- [ ] **T3** — Rewrite `globals.css`: `:root` light + `.dark` tokens + `@theme inline` rebind + preserve focus/reduced-motion
- [ ] **T4** — `<ThemeProvider>` client wrapper for `next-themes`
- [ ] **T5** — `<ThemeToggle>` icon button (sun/moon, accessible)
- [ ] **T6** — Wire `<ThemeProvider>` into `layout.tsx` + add `<ThemeToggle>` to `Sidebar.tsx` + `MobileShell.tsx`
- [ ] **T7** — Spot-check static build for token propagation (no broken layout)
- [ ] **T8** — Full gate (838 tests + build + typecheck + lint) → merge to main → push → verify live HTTP 200 fresh deploy
