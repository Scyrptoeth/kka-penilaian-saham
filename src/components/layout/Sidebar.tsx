import { SidebarNav } from './SidebarNav'
import { SidebarHeader } from './SidebarHeader'

/**
 * Desktop static sidebar — used on `lg+` only. The mobile drawer
 * (<MobileShell>) reuses the same <SidebarNav> and <SidebarHeader>
 * pieces inside its sliding panel.
 */
export function Sidebar() {
  return (
    <aside
      className="hidden w-64 shrink-0 border-r border-grid bg-canvas-raised lg:flex lg:flex-col"
      aria-label="Navigasi sheet (desktop)"
    >
      <SidebarHeader />
      <div className="flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
    </aside>
  )
}
