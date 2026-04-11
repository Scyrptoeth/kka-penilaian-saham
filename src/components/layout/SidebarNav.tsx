'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_TREE, type NavItem } from './nav-tree'
import { cn } from '@/lib/utils/cn'

interface SidebarNavProps {
  /** Optional handler invoked after a link is activated (used to close the drawer). */
  onNavigate?: () => void
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col px-3 py-4" aria-label="Navigasi sheet">
      {NAV_TREE.map((group) => (
        <div key={group.label} className="mb-5 last:mb-0">
          <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            {group.label}
          </p>
          <ul>
            {group.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(pathname, item.href)}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem
  active: boolean
  onNavigate?: () => void
}) {
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'relative block rounded-sm py-1.5 pl-3 pr-2 text-[13px] transition-colors',
          active
            ? 'bg-accent-soft/70 font-semibold text-ink'
            : 'text-ink-soft hover:bg-grid hover:text-ink',
          item.wip && !active && 'text-ink-muted',
        )}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent"
          />
        )}
        <span className="inline-flex items-center gap-2">
          {item.label}
          {item.wip && (
            <span className="rounded-sm border border-grid-strong bg-canvas px-1 py-0 text-[9px] font-medium uppercase tracking-[0.1em] text-ink-muted">
              WIP
            </span>
          )}
        </span>
      </Link>
    </li>
  )
}

function isActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(href + '/')
}
