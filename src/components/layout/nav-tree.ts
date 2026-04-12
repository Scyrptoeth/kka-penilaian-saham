/**
 * Sidebar navigation tree. Shared between desktop sidebar and mobile drawer.
 * Pure data, no React — safe to import in both server and client components.
 */

export interface NavItem {
  label: string
  href: string
  /** Optional: marks placeholder routes that are not yet implemented. */
  wip?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_TREE: NavGroup[] = [
  {
    label: 'Input Master',
    items: [{ label: 'HOME', href: '/' }],
  },
  {
    label: 'Input Data',
    items: [
      { label: 'Balance Sheet', href: '/input/balance-sheet' },
      { label: 'Income Statement', href: '/input/income-statement' },
      { label: 'Fixed Asset', href: '/input/fixed-asset' },
      { label: 'Key Drivers', href: '/input/key-drivers' },
    ],
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
      { label: 'Growth Revenue', href: '/analysis/growth-revenue' },
      { label: 'ROIC', href: '/analysis/roic' },
      { label: 'Growth Rate', href: '/analysis/growth-rate' },
    ],
  },
  {
    label: 'Proyeksi',
    items: [
      { label: 'Proy. L/R', href: '/projection/income-statement' },
      { label: 'Proy. Fixed Asset', href: '/projection/fixed-asset' },
      { label: 'Proy. Balance Sheet', href: '/projection/balance-sheet' },
      { label: 'Proy. NOPLAT', href: '/projection/noplat' },
      { label: 'Proy. Cash Flow', href: '/projection/cash-flow' },
    ],
  },
  {
    label: 'Penilaian',
    items: [
      { label: 'DLOM', href: '/valuation/dlom' },
      { label: 'DLOC (PFC)', href: '/valuation/dloc-pfc' },
      { label: 'WACC', href: '/valuation/wacc' },
      { label: 'Discount Rate', href: '/valuation/discount-rate' },
      { label: 'DCF', href: '/valuation/dcf', wip: true },
      { label: 'AAM', href: '/valuation/aam', wip: true },
      { label: 'EEM', href: '/valuation/eem', wip: true },
    ],
  },
  {
    label: 'Ringkasan',
    items: [{ label: 'Dashboard', href: '/dashboard', wip: true }],
  },
]
