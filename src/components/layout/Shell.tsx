import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { MobileShell } from './MobileShell'

/**
 * App shell — composes the desktop static sidebar and the mobile drawer
 * shell with the main content area. Main stays on the server.
 */
export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col min-w-0">
        <MobileShell />
        <main className="flex-1 overflow-x-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
