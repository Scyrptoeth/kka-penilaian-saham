'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * Wraps `next-themes` provider with project-specific defaults:
 *   - `class` attribute on <html> for Tailwind v4 `.dark` selector
 *   - `light` default (Creddo-like, explicit user choice)
 *   - System detection disabled — user picks intentionally via toggle
 *   - Transition disabled on theme change to prevent jarring flash
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
