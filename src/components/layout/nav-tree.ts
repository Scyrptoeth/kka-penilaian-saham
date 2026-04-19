/**
 * Sidebar navigation tree. Shared between desktop sidebar and mobile drawer.
 * Pure data, no React — safe to import in both server and client components.
 *
 * Labels are translation keys (e.g. 'nav.item.home') — resolve at render
 * time via t() in SidebarNav (client component).
 *
 * Session 054: INPUT DATA group gained 8 items from ANALYSIS + VALUATION
 * (Growth Revenue, CWC, DLOM, DLOC (PFC), WACC, Discount Rate, Borrowing
 * Cap, Interest Bearing Debt). The group now splits visually into three
 * sub-headers via `subGroup` — render logic groups consecutive items with
 * the same `subGroup` under one sub-header.
 */

export interface NavItem {
  /** Translation key — resolve via t() at render time. */
  label: string
  href: string
  /** Optional: marks placeholder routes that are not yet implemented. */
  wip?: boolean
  /**
   * Session 054 — optional visual sub-header key. Consecutive items
   * sharing the same `subGroup` value render beneath one sub-header
   * (using the i18n translation of the key). Items without `subGroup`
   * render flat at the top of the group.
   */
  subGroup?: string
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
      // Sub-group 1: Laporan Keuangan (historical source data)
      { label: 'nav.item.accPayables', href: '/input/acc-payables', subGroup: 'nav.subgroup.financialStatements' },
      { label: 'nav.item.balanceSheet', href: '/input/balance-sheet', subGroup: 'nav.subgroup.financialStatements' },
      { label: 'nav.item.fixedAsset', href: '/input/fixed-asset', subGroup: 'nav.subgroup.financialStatements' },
      { label: 'nav.item.incomeStatement', href: '/input/income-statement', subGroup: 'nav.subgroup.financialStatements' },

      // Sub-group 2: Drivers & Scope (projection drivers + account-scope editors)
      { label: 'nav.item.cashAccount', href: '/input/cash-account', subGroup: 'nav.subgroup.driversScope' },
      { label: 'nav.item.cashBalance', href: '/input/cash-balance', subGroup: 'nav.subgroup.driversScope' },
      { label: 'nav.item.changesInWorkingCapital', href: '/input/changes-in-working-capital', subGroup: 'nav.subgroup.driversScope' },
      { label: 'nav.item.growthRevenue', href: '/input/growth-revenue', subGroup: 'nav.subgroup.driversScope' },
      { label: 'nav.item.investedCapital', href: '/input/invested-capital', subGroup: 'nav.subgroup.driversScope' },
      { label: 'nav.item.keyDrivers', href: '/input/key-drivers', subGroup: 'nav.subgroup.driversScope' },

      // Sub-group 3: Asumsi Penilaian (valuation assumptions)
      { label: 'nav.item.borrowingCap', href: '/input/borrowing-cap', subGroup: 'nav.subgroup.valuationAssumptions' },
      { label: 'nav.item.dlom', href: '/input/dlom', subGroup: 'nav.subgroup.valuationAssumptions' },
      { label: 'nav.item.dlocPfc', href: '/input/dloc-pfc', subGroup: 'nav.subgroup.valuationAssumptions' },
      { label: 'nav.item.discountRate', href: '/input/discount-rate', subGroup: 'nav.subgroup.valuationAssumptions' },
      { label: 'nav.item.interestBearingDebt', href: '/input/interest-bearing-debt', subGroup: 'nav.subgroup.valuationAssumptions' },
      { label: 'nav.item.wacc', href: '/input/wacc', subGroup: 'nav.subgroup.valuationAssumptions' },
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
      { label: 'nav.item.roic', href: '/analysis/roic' },
      { label: 'nav.item.growthRate', href: '/analysis/growth-rate' },
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
