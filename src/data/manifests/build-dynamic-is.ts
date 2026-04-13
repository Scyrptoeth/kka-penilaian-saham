/**
 * Dynamic Income Statement manifest builder — generates SheetManifest from
 * user-selected accounts across 5 sections.
 *
 * Section subtotals occupy "sentinel" row positions that downstream pages
 * already reference (6, 7, 15, 26, 27, 28, 30). This ensures zero
 * downstream code changes — the DynamicIsEditor pre-computes these
 * sentinels at persist time.
 *
 * Fixed leaf rows: Depreciation (21) and Tax (33) are not part of any
 * section — they remain standalone editable rows.
 *
 * IS structure:
 *   Revenue → Subtotal (6)
 *   COGS → Subtotal (7)
 *   Gross Profit (8) = Revenue − COGS
 *   OpEx → Subtotal (15)
 *   EBITDA (18) = Gross Profit − OpEx
 *   Depreciation (21, fixed leaf)
 *   EBIT (22) = EBITDA − Depreciation
 *   Interest Income → Subtotal (26)
 *   Interest Expense → Subtotal (27)
 *   Net Interest (28) = II − IE
 *   Non-Operating → Subtotal (30)
 *   PBT (32) = EBIT + Net Interest + Non-Op
 *   Tax (33, fixed leaf)
 *   Net Profit (35) = PBT − Tax
 */

import type { ManifestRow, SheetManifest } from './types'
import type { IsAccountEntry } from '@/data/catalogs/income-statement-catalog'
import { IS_SENTINEL, getCatalogAccount } from '@/data/catalogs/income-statement-catalog'
import { getIsStrings } from '@/lib/i18n/income-statement'

export function buildDynamicIsManifest(
  accounts: readonly IsAccountEntry[],
  language: 'en' | 'id',
  yearCount: number,
  tahunTransaksi: number,
): SheetManifest {
  const t = getIsStrings(language)
  const years = Array.from({ length: yearCount }, (_, i) => tahunTransaksi - yearCount + i)

  const colLetters = 'CDEFGHIJKLMNOP'
  const columns: Record<number, string> = {}
  for (let i = 0; i < years.length; i++) {
    columns[years[i]] = colLetters[i]
  }

  const rows = buildRows(accounts, t, language)

  return {
    title: t.pageTitle,
    slug: 'income-statement',
    years,
    columns,
    rows,
    anchorRow: IS_SENTINEL.REVENUE,
    historicalYearCount: yearCount,
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getLabel(entry: IsAccountEntry, language: 'en' | 'id'): string {
  if (entry.customLabel) return entry.customLabel
  const cat = getCatalogAccount(entry.catalogId)
  if (!cat) return entry.catalogId
  return language === 'en' ? cat.labelEn : cat.labelId
}

function sectionLeaves(
  accounts: readonly IsAccountEntry[],
  section: string,
  language: 'en' | 'id',
  interestType?: 'income' | 'expense',
): ManifestRow[] {
  return accounts
    .filter((a) => {
      if (a.section !== section) return false
      if (interestType && a.interestType !== interestType) return false
      return true
    })
    .map((a) => ({
      excelRow: a.excelRow,
      label: getLabel(a, language),
      indent: 1 as const,
      type: 'normal' as const,
      catalogId: a.catalogId,
    }))
}

function sectionExcelRows(
  accounts: readonly IsAccountEntry[],
  section: string,
  interestType?: 'income' | 'expense',
): number[] {
  return accounts
    .filter((a) => {
      if (a.section !== section) return false
      if (interestType && a.interestType !== interestType) return false
      return true
    })
    .map((a) => a.excelRow)
}

function buildRows(
  accounts: readonly IsAccountEntry[],
  t: ReturnType<typeof getIsStrings>,
  language: 'en' | 'id',
): ManifestRow[] {
  const revRows = sectionExcelRows(accounts, 'revenue')
  const costRows = sectionExcelRows(accounts, 'cost')
  const opexRows = sectionExcelRows(accounts, 'operating_expense')
  const iiRows = sectionExcelRows(accounts, 'net_interest', 'income')
  const ieRows = sectionExcelRows(accounts, 'net_interest', 'expense')
  const nonOpRows = sectionExcelRows(accounts, 'non_operating')

  const rows: ManifestRow[] = []

  // ═══════════════════════════════════════════════════════════════════════
  // REVENUE & COST
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.revenueAndCost, type: 'header' })

  // Revenue section
  rows.push(...sectionLeaves(accounts, 'revenue', language))
  rows.push({ label: t.addButtonLabels.revenue, type: 'add-button', section: 'revenue' })
  rows.push({
    excelRow: IS_SENTINEL.REVENUE,
    label: t.totalRevenue,
    type: 'subtotal',
    computedFrom: revRows,
  })

  rows.push({ label: '', type: 'separator' })

  // Cost section
  rows.push(...sectionLeaves(accounts, 'cost', language))
  rows.push({ label: t.addButtonLabels.cost, type: 'add-button', section: 'cost' })
  rows.push({
    excelRow: IS_SENTINEL.COGS,
    label: t.totalCost,
    type: 'subtotal',
    computedFrom: costRows,
  })

  rows.push({ label: '', type: 'separator' })

  // Gross Profit = Revenue − COGS
  rows.push({
    excelRow: IS_SENTINEL.GROSS_PROFIT,
    label: t.grossProfit,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.REVENUE, -IS_SENTINEL.COGS],
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // OPERATING EXPENSES
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.operatingExpenses, type: 'header' })
  rows.push(...sectionLeaves(accounts, 'operating_expense', language))
  rows.push({ label: t.addButtonLabels.operating_expense, type: 'add-button', section: 'operating_expense' })
  rows.push({
    excelRow: IS_SENTINEL.TOTAL_OPEX,
    label: t.totalOperatingExpenses,
    type: 'subtotal',
    computedFrom: opexRows,
  })

  rows.push({ label: '', type: 'separator' })

  // EBITDA = Gross Profit − Total OpEx
  rows.push({
    excelRow: IS_SENTINEL.EBITDA,
    label: t.ebitda,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.GROSS_PROFIT, -IS_SENTINEL.TOTAL_OPEX],
  })

  // Depreciation — fixed leaf row (not part of any section)
  rows.push({
    excelRow: IS_SENTINEL.DEPRECIATION,
    label: t.depreciation,
    indent: 1,
  })

  // EBIT = EBITDA − Depreciation
  rows.push({
    excelRow: IS_SENTINEL.EBIT,
    label: t.ebit,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.EBITDA, -IS_SENTINEL.DEPRECIATION],
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // NET INTEREST (two sub-groups: income + expense)
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.netInterest, type: 'header' })

  // Interest Income sub-group
  rows.push({ label: t.interestIncome, type: 'header', indent: 0 })
  rows.push(...sectionLeaves(accounts, 'net_interest', language, 'income'))
  rows.push({
    excelRow: IS_SENTINEL.INTEREST_INCOME,
    label: t.totalInterestIncome,
    type: 'subtotal',
    computedFrom: iiRows,
  })

  // Interest Expense sub-group
  rows.push({ label: t.interestExpense, type: 'header', indent: 0 })
  rows.push(...sectionLeaves(accounts, 'net_interest', language, 'expense'))
  rows.push({
    excelRow: IS_SENTINEL.INTEREST_EXPENSE,
    label: t.totalInterestExpense,
    type: 'subtotal',
    computedFrom: ieRows,
  })

  // Add-button for Net Interest (single button, shown between the two sub-groups)
  rows.push({ label: t.addButtonLabels.net_interest, type: 'add-button', section: 'net_interest' })

  // Net Interest = Interest Income − Interest Expense
  rows.push({
    excelRow: IS_SENTINEL.NET_INTEREST,
    label: t.netInterest,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.INTEREST_INCOME, -IS_SENTINEL.INTEREST_EXPENSE],
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // NON-OPERATING
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.nonOperating, type: 'header' })
  rows.push(...sectionLeaves(accounts, 'non_operating', language))
  rows.push({ label: t.addButtonLabels.non_operating, type: 'add-button', section: 'non_operating' })
  rows.push({
    excelRow: IS_SENTINEL.NON_OPERATING,
    label: t.totalNonOperating,
    type: 'subtotal',
    computedFrom: nonOpRows,
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // PBT → TAX → NET PROFIT
  // ═══════════════════════════════════════════════════════════════════════

  // PBT = EBIT + Net Interest + Non-Op
  rows.push({
    excelRow: IS_SENTINEL.PBT,
    label: t.profitBeforeTax,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.EBIT, IS_SENTINEL.NET_INTEREST, IS_SENTINEL.NON_OPERATING],
  })

  // Tax — fixed leaf row
  rows.push({
    excelRow: IS_SENTINEL.TAX,
    label: t.corporateTax,
    indent: 1,
  })

  // Net Profit = PBT − Tax
  rows.push({
    excelRow: IS_SENTINEL.NET_PROFIT,
    label: t.netProfitAfterTax,
    type: 'total',
    computedFrom: [IS_SENTINEL.PBT, -IS_SENTINEL.TAX],
  })

  return rows
}
