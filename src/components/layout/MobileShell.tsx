'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { SidebarHeader } from './SidebarHeader'
import { SidebarNav } from './SidebarNav'
import { ExportButton } from './ExportButton'
import { ThemeToggle } from './ThemeToggle'
import { cn } from '@/lib/utils/cn'

/**
 * Mobile drawer + top bar with hamburger toggle. Rendered alongside the
 * desktop sidebar in <Shell>; this component is `hidden` on `lg+`.
 *
 * Behaviours:
 *   - hamburger button opens the drawer
 *   - drawer slides from the left and traps scroll (body overflow hidden)
 *   - Escape key closes the drawer
 *   - clicking the scrim closes the drawer
 *   - navigating to a new route auto-closes the drawer (via usePathname effect)
 */
export function MobileShell() {
  const pathname = usePathname()
  // Store the pathname at which the drawer was opened. Deriving `open` from
  // this means a route change automatically closes the drawer without a
  // setState-in-effect pattern (incompatible with React Compiler).
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const open = openedAt !== null && openedAt === pathname

  const openDrawer = useCallback(() => setOpenedAt(pathname), [pathname])
  const close = useCallback(() => setOpenedAt(null), [])

  // Body scroll lock while drawer is open
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenedAt(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-grid bg-canvas-raised px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Buka menu navigasi"
          aria-expanded={open}
          className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-grid text-ink transition-colors hover:bg-grid focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
        >
          <HamburgerIcon />
        </button>
        <div className="flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            KKA Penilaian Saham
          </p>
          <p className="text-[13px] font-semibold text-ink">
            Direktorat Jenderal Pajak
          </p>
        </div>
      </header>

      {/* Scrim */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          'fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Drawer */}
      <aside
        aria-label="Navigasi sheet"
        aria-hidden={!open}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-grid bg-canvas-raised shadow-[8px_0_32px_-8px_rgba(10,22,40,0.18)] transition-transform lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between">
          <SidebarHeader />
          <button
            type="button"
            onClick={close}
            aria-label="Tutup menu"
            className="mr-3 mt-4 inline-flex h-8 w-8 items-center justify-center rounded-sm text-ink-muted transition-colors hover:bg-grid hover:text-ink focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav onNavigate={close} />
        </div>
        <div className="border-t border-grid">
          <ThemeToggle />
        </div>
        <div className="border-t border-grid">
          <ExportButton />
        </div>
      </aside>
    </>
  )
}

function HamburgerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="2" y1="5" x2="16" y2="5" />
      <line x1="2" y1="9" x2="16" y2="9" />
      <line x1="2" y1="13" x2="16" y2="13" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
  )
}
