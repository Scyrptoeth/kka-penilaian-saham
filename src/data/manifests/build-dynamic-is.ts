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
): ManifestRow[] {
  return accounts
    .filter((a) => a.section === section)
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
): number[] {
  return accounts.filter((a) => a.section === section).map((a) => a.excelRow)
}

function buildRows(
  accounts: readonly IsAccountEntry[],
  t: ReturnType<typeof getIsStrings>,
  language: 'en' | 'id',
): ManifestRow[] {
  const revRows = sectionExcelRows(accounts, 'revenue')
  const costRows = sectionExcelRows(accounts, 'cost')
  const opexRows = sectionExcelRows(accounts, 'operating_expense')
  const iiRows = sectionExcelRows(accounts, 'interest_income')
  const ieRows = sectionExcelRows(accounts, 'interest_expense')
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

  // Gross Profit = Revenue + COGS (COGS entered negative by user — plain SUM per Excel)
  rows.push({
    excelRow: IS_SENTINEL.GROSS_PROFIT,
    label: t.grossProfit,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.REVENUE, IS_SENTINEL.COGS],
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

  // EBITDA = Gross Profit + Total OpEx (OpEx entered negative — plain addition per Excel)
  rows.push({
    excelRow: IS_SENTINEL.EBITDA,
    label: t.ebitda,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.GROSS_PROFIT, IS_SENTINEL.TOTAL_OPEX],
  })

  // Depreciation — read-only mirror of FA "B. Depreciation → Total Additions"
  // (FA row 51). Sign negated at the boundary by `computeDepreciationFromFa`
  // so the IS-side value lands as an EXPENSE per LESSON-055. `cross-ref` type
  // makes RowInputGrid render it as a non-editable formatted cell (Session 041
  // Task 1).
  rows.push({
    excelRow: IS_SENTINEL.DEPRECIATION,
    label: t.depreciation,
    indent: 1,
    type: 'cross-ref',
  })

  // EBIT = EBITDA + Depreciation (Depreciation entered negative — plain addition per Excel)
  rows.push({
    excelRow: IS_SENTINEL.EBIT,
    label: t.ebit,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.EBITDA, IS_SENTINEL.DEPRECIATION],
  })

  rows.push({ label: '', type: 'separator' })

  // ═══════════════════════════════════════════════════════════════════════
  // NET INTEREST — two distinct sections, each with its own +Add dropdown.
  // Session 041 Task 3: split from the legacy single net_interest section.
  // Each +Add now offers a section-appropriate PSAK 71 / IFRS 9 / IAS 23
  // catalog, eliminating the previous misclassification trap where income
  // accounts ended up under the EXPENSE label.
  // ═══════════════════════════════════════════════════════════════════════
  rows.push({ label: t.netInterest, type: 'header' })

  // Interest Income section (own +Add)
  rows.push({ label: t.interestIncome, type: 'header', indent: 0 })
  rows.push(...sectionLeaves(accounts, 'interest_income', language))
  rows.push({ label: t.addButtonLabels.interest_income, type: 'add-button', section: 'interest_income' })
  rows.push({
    excelRow: IS_SENTINEL.INTEREST_INCOME,
    label: t.totalInterestIncome,
    type: 'subtotal',
    computedFrom: iiRows,
  })

  // Interest Expense section (own +Add)
  rows.push({ label: t.interestExpense, type: 'header', indent: 0 })
  rows.push(...sectionLeaves(accounts, 'interest_expense', language))
  rows.push({ label: t.addButtonLabels.interest_expense, type: 'add-button', section: 'interest_expense' })
  rows.push({
    excelRow: IS_SENTINEL.INTEREST_EXPENSE,
    label: t.totalInterestExpense,
    type: 'subtotal',
    computedFrom: ieRows,
  })

  // Net Interest = Interest Income + Interest Expense (IE entered negative — plain addition per Excel)
  rows.push({
    excelRow: IS_SENTINEL.NET_INTEREST,
    label: t.netInterest,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.INTEREST_INCOME, IS_SENTINEL.INTEREST_EXPENSE],
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

  // Session 041 Task 4 — Fiscal Correction (signed user-editable leaf) +
  // TAXABLE PROFIT (= PBT + Koreksi). Synthetic excelRows 600/601 keep this
  // additive entirely above the existing Tax (33) / NPAT (35) chain so
  // downstream NOPLAT/KEY DRIVERS row-number references stay backward
  // compatible (Q3 — Tax remains historical user input, NPAT formula
  // unchanged).
  rows.push({
    excelRow: IS_SENTINEL.KOREKSI_FISKAL,
    label: t.koreksiFiskal,
    indent: 1,
  })

  rows.push({
    excelRow: IS_SENTINEL.TAXABLE_PROFIT,
    label: t.taxableProfit,
    type: 'subtotal',
    computedFrom: [IS_SENTINEL.PBT, IS_SENTINEL.KOREKSI_FISKAL],
  })

  // Tax — fixed leaf row
  rows.push({
    excelRow: IS_SENTINEL.TAX,
    label: t.corporateTax,
    indent: 1,
  })

  // Net Profit = PBT + Tax (Tax entered negative — plain addition per Excel).
  // Intentionally NOT TAXABLE_PROFIT + Tax: NPAT = book net profit; Tax row
  // already reflects the actual cash-tax paid for the historical period
  // (Q3 design decision).
  rows.push({
    excelRow: IS_SENTINEL.NET_PROFIT,
    label: t.netProfitAfterTax,
    type: 'total',
    computedFrom: [IS_SENTINEL.PBT, IS_SENTINEL.TAX],
  })

  return rows
}
