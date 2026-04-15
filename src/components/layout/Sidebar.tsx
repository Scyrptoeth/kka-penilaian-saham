import { SidebarNav } from './SidebarNav'
import { SidebarHeader } from './SidebarHeader'
import { ExportButton } from './ExportButton'

/**
 * Desktop static sidebar — used on `lg+` only. The mobile drawer
 * (<MobileShell>) reuses the same <SidebarNav> and <SidebarHeader>
 * pieces inside its sliding panel.
 *
 * Theme toggle lives inside <SidebarHeader> (Session 026 redesign) —
 * sejajar dengan privacy badge sebagai pill stack.
 */
export function Sidebar() {
  return (
    <aside
      className="hidden h-full w-64 shrink-0 border-r border-grid bg-canvas-raised lg:flex lg:flex-col"
      aria-label="Navigasi sheet (desktop)"
    >
      <SidebarHeader />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <div className="border-t border-grid">
        <ExportButton />
      </div>
    </aside>
  )
}
