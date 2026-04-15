# Design — Session 023: B&W Redesign (Creddo-inspired)

## Problem statement
Project KKA saat ini pakai navy + muted gold accent dengan Inter/IBM Plex font. User ingin identitas visual yang lebih tegas & profesional ala https://creddo.netlify.app — pure black & white dengan dual mode (light + dark), Montserrat untuk UI, JetBrains Mono untuk financial numbers.

## Chosen approach: CSS-var-driven token switch via `next-themes`

**Single switching point**: `src/app/globals.css` mengontrol semua warna via CSS custom properties. Komponen tetap menggunakan utility classes existing (`text-ink`, `bg-canvas`, `border-grid`, dll.) — tidak ada perubahan komponen-by-komponen. `@theme inline` di Tailwind v4 mem-bind utility ke CSS vars, jadi `text-ink` di `.dark` otomatis pakai dark-mode value.

**Token strategy** — minimal 13 design tokens, 2 sets (light + dark):

### Light mode (`:root`)
| Token | Value | Role |
|---|---|---|
| `--canvas` | `#fafdff` | Base background (Creddo near-white) |
| `--canvas-raised` | `#ffffff` | Cards, sidebar, surfaces |
| `--ink` | `#0a0a0c` | Primary text (near-black) |
| `--ink-soft` | `rgba(10,10,12,0.85)` | Secondary text |
| `--ink-muted` | `rgba(10,10,12,0.55)` | Tertiary, captions |
| `--accent` | `#0a0a0c` | Same as ink — emphasis via weight/scale, not hue (B&W discipline) |
| `--accent-soft` | `rgba(10,10,12,0.05)` | Active sidebar bg, subtle highlight |
| `--positive` | `#064E3B` | Dark emerald (subtle semantic, accessibility) |
| `--positive-soft` | `rgba(6,78,59,0.08)` | |
| `--negative` | `#8B0000` | Dark red (subtle semantic) |
| `--negative-soft` | `rgba(139,0,0,0.08)` | |
| `--grid` | `rgba(10,10,12,0.08)` | Borders |
| `--grid-strong` | `rgba(10,10,12,0.16)` | Total/divider lines |
| `--focus` | `#0a0a0c` | Focus ring |

### Dark mode (`.dark`)
| Token | Value |
|---|---|
| `--canvas` | `#000004` |
| `--canvas-raised` | `#0a0a0c` |
| `--ink` | `#fafdff` |
| `--ink-soft` | `rgba(248,252,255,0.85)` |
| `--ink-muted` | `rgba(248,252,255,0.55)` |
| `--accent` | `#fafdff` |
| `--accent-soft` | `rgba(248,252,255,0.06)` |
| `--positive` | `#34d399` (lighter emerald for dark contrast) |
| `--positive-soft` | `rgba(52,211,153,0.10)` |
| `--negative` | `#f87171` (lighter red for dark contrast) |
| `--negative-soft` | `rgba(248,113,113,0.10)` |
| `--grid` | `rgba(248,252,255,0.08)` |
| `--grid-strong` | `rgba(248,252,255,0.18)` |
| `--focus` | `#fafdff` |

### Typography
- **Sans (UI)**: Montserrat (`next/font/google`, weights 400/500/600/700)
- **Mono (numbers)**: JetBrains Mono (`next/font/google`, weights 400/500/600)
- Both `display: 'swap'`. Variable names preserved (`--font-sans`, `--font-mono`).
- Letter-spacing tightened to `-0.01em` body, `-0.02em` headings.

## Theme switching
- **Library**: `next-themes` (compatible Next 16 + React 19)
- **Attribute**: `class` on `<html>` (SSR-safe via inline IIFE, no FOUC)
- **Storage**: `localStorage.theme` (default key)
- **Default**: `light`
- **System detection**: disabled (`enableSystem={false}`) — explicit user choice
- **UI**: `<ThemeToggle>` button in sidebar footer above Export — sun/moon icon with `aria-label`

## Out of scope
- Visual regression screenshots
- Bilingual toggle, upload parser, RESUME page (queued from earlier sessions)
- Restyle beyond what CSS-var swap accomplishes

## Risks & mitigations
- **SSR flash**: handled by `next-themes` inline script + `suppressHydrationWarning` on `<html>`
- **39 `text-accent` occurrences**: now neutral (= ink) — emphasis carried by `font-semibold`/`text-lg` already in place
- **Reduced-motion + focus rules**: explicitly preserved in new globals.css
