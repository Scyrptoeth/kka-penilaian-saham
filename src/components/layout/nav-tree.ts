/**
 * Sidebar navigation tree. Shared between desktop sidebar and mobile drawer.
 * Pure data, no React — safe to import in both server and client components.
 *
 * Labels are translation keys (e.g. 'nav.item.home') — resolve at render
 * time via t() in SidebarNav (client component).
 */

export interface NavItem {
  /** Translation key — resolve via t() at render time. */
  label: string
  href: string
  /** Optional: marks placeholder routes that are not yet implemented. */
  wip?: boolean
}

export interface NavGroup {
  /** Translation key — resolve via t() at render time. */
  label: string
  items: NavItem[]
}

export const NAV_TREE: NavGroup[] = [
  {
    label: 'nav.group.inputMaster',
    items: [{ label: 'nav.item.home', href: '/' }],
  },
  {
    label: 'nav.group.inputData',
    items: [
      { label: 'nav.item.fixedAsset', href: '/input/fixed-asset' },
      { label: 'nav.item.balanceSheet', href: '/input/balance-sheet' },
      { label: 'nav.item.incomeStatement', href: '/input/income-statement' },
      { label: 'nav.item.keyDrivers', href: '/input/key-drivers' },
      { label: 'nav.item.accPayables', href: '/input/acc-payables' },
    ],
  },
  // Historis section hidden — users work directly with INPUT DATA + ANALISIS.
  // Pages still exist at /historical/* for backward compat but are not in nav.
  {
    label: 'nav.group.analysis',
    items: [
      { label: 'nav.item.financialRatio', href: '/analysis/financial-ratio' },
      { label: 'nav.item.fcf', href: '/analysis/fcf' },
      { label: 'nav.item.noplat', href: '/analysis/noplat' },
      { label: 'nav.item.growthRevenue', href: '/analysis/growth-revenue' },
      { label: 'nav.item.roic', href: '/analysis/roic' },
      { label: 'nav.item.growthRate', href: '/analysis/growth-rate' },
      { label: 'nav.item.changesInWorkingCapital', href: '/analysis/changes-in-working-capital' },
      { label: 'nav.item.cashFlowStatement', href: '/analysis/cash-flow-statement' },
    ],
  },
  {
    label: 'nav.group.projection',
    items: [
      { label: 'nav.item.proyLR', href: '/projection/income-statement' },
      { label: 'nav.item.proyFixedAsset', href: '/projection/fixed-asset' },
      { label: 'nav.item.proyBalanceSheet', href: '/projection/balance-sheet' },
      { label: 'nav.item.proyNoplat', href: '/projection/noplat' },
      { label: 'nav.item.proyCashFlow', href: '/projection/cash-flow' },
    ],
  },
  {
    label: 'nav.group.valuation',
    items: [
      { label: 'nav.item.dlom', href: '/valuation/dlom' },
      { label: 'nav.item.dlocPfc', href: '/valuation/dloc-pfc' },
      { label: 'nav.item.wacc', href: '/valuation/wacc' },
      { label: 'nav.item.discountRate', href: '/valuation/discount-rate' },
      { label: 'nav.item.borrowingCap', href: '/valuation/borrowing-cap' },
      { label: 'nav.item.interestBearingDebt', href: '/valuation/interest-bearing-debt' },
      { label: 'nav.item.dcf', href: '/valuation/dcf' },
      { label: 'nav.item.aam', href: '/valuation/aam' },
      { label: 'nav.item.eem', href: '/valuation/eem' },
      { label: 'nav.item.cfi', href: '/valuation/cfi' },
      { label: 'nav.item.simulasiPotensi', href: '/valuation/simulasi-potensi' },
    ],
  },
  {
    label: 'nav.group.summary',
    items: [
      { label: 'nav.item.dashboard', href: '/dashboard' },
      { label: 'nav.item.resume', href: '/dashboard/resume' },
    ],
  },
]
