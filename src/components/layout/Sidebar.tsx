import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface NavItem {
  label: string
  href: string
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV: NavGroup[] = [
  {
    label: 'Input Master',
    items: [{ label: 'HOME', href: '/' }],
  },
  {
    label: 'Historis',
    items: [
      { label: 'Balance Sheet', href: '/historical/balance-sheet' },
      { label: 'Income Statement', href: '/historical/income-statement' },
      { label: 'Cash Flow', href: '/historical/cash-flow' },
      { label: 'Fixed Asset', href: '/historical/fixed-asset' },
    ],
  },
  {
    label: 'Analisis',
    items: [
      { label: 'Financial Ratio', href: '/analysis/financial-ratio' },
      { label: 'FCF', href: '/analysis/fcf' },
      { label: 'NOPLAT', href: '/analysis/noplat' },
      { label: 'ROIC', href: '/analysis/roic' },
      { label: 'DLOM', href: '/analysis/dlom' },
      { label: 'DLOC (PFC)', href: '/analysis/dloc-pfc' },
    ],
  },
  {
    label: 'Proyeksi',
    items: [
      { label: 'Proy. L/R', href: '/projection/income-statement' },
      { label: 'Proy. Balance Sheet', href: '/projection/balance-sheet' },
      { label: 'Proy. Cash Flow', href: '/projection/cash-flow' },
      { label: 'Proy. NOPLAT', href: '/projection/noplat' },
    ],
  },
  {
    label: 'Penilaian',
    items: [
      { label: 'WACC', href: '/valuation/wacc' },
      { label: 'DCF', href: '/valuation/dcf' },
      { label: 'AAM', href: '/valuation/aam' },
      { label: 'EEM', href: '/valuation/eem' },
    ],
  },
  {
    label: 'Ringkasan',
    items: [{ label: 'Dashboard', href: '/dashboard' }],
  },
]

export function Sidebar() {
  return (
    <aside
      className="w-64 shrink-0 border-r border-grid bg-canvas-raised overflow-y-auto"
      aria-label="Navigasi sheet"
    >
      <div className="sticky top-0 border-b border-grid bg-canvas-raised px-5 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
          KKA Penilaian Saham
        </p>
        <p className="mt-1 text-sm font-semibold text-ink">Direktorat Jenderal Pajak</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-accent-soft px-2 py-1 text-[10px] font-medium text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Privasi 100% lokal
        </div>
      </div>
      <nav className="px-3 py-4">
        {NAV.map((group) => (
          <div key={group.label} className="mb-5 last:mb-0">
            <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {group.label}
            </p>
            <ul>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'block rounded-sm px-2 py-1.5 text-sm text-ink-soft',
                      'hover:bg-grid hover:text-ink transition-colors'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
