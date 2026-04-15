'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { MobileShell } from './MobileShell'
import { Footer } from './Footer'

const UNSHELLED_PATHS = new Set<string>(['/akses'])

/**
 * App shell — composes the desktop static sidebar and the mobile drawer
 * shell with the main content area. Some routes (e.g. /akses) render
 * full-bleed without sidebar chrome.
 */
export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (UNSHELLED_PATHS.has(pathname)) {
    return <>{children}</>
  }
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex h-full flex-1 flex-col min-w-0">
        <MobileShell />
        <main className="flex-1 overflow-y-auto overflow-x-auto">
          <div className="px-4 py-6 md:px-8 md:py-8">{children}</div>
          <Footer />
        </main>
      </div>
    </div>
  )
}
