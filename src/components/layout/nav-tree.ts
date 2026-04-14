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
      { label: 'Fixed Asset', href: '/input/fixed-asset' },
      { label: 'Balance Sheet', href: '/input/balance-sheet' },
      { label: 'Income Statement', href: '/input/income-statement' },
      { label: 'Key Drivers', href: '/input/key-drivers' },
      { label: 'Acc Payables', href: '/input/acc-payables' },
    ],
  },
  // Historis section hidden — users work directly with INPUT DATA + ANALISIS.
  // Pages still exist at /historical/* for backward compat but are not in nav.
  {
    label: 'Analisis',
    items: [
      { label: 'Financial Ratio', href: '/analysis/financial-ratio' },
      { label: 'FCF', href: '/analysis/fcf' },
      { label: 'NOPLAT', href: '/analysis/noplat' },
      { label: 'Growth Revenue', href: '/analysis/growth-revenue' },
      { label: 'ROIC', href: '/analysis/roic' },
      { label: 'Growth Rate', href: '/analysis/growth-rate' },
      { label: 'Cash Flow Statement', href: '/analysis/cash-flow-statement' },
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
      { label: 'Borrowing Cap', href: '/valuation/borrowing-cap' },
      { label: 'DCF', href: '/valuation/dcf' },
      { label: 'AAM', href: '/valuation/aam' },
      { label: 'EEM', href: '/valuation/eem' },
      { label: 'CFI', href: '/valuation/cfi' },
      { label: 'Simulasi Potensi', href: '/valuation/simulasi-potensi' },
    ],
  },
  {
    label: 'Ringkasan',
    items: [{ label: 'Dashboard', href: '/dashboard' }],
  },
]
