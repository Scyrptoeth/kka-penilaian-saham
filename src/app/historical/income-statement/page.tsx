import type { Metadata } from 'next'
import { FinancialTable } from '@/components/financial/FinancialTable'
import { loadCells } from '@/data/seed/loader'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'
import { buildRowsFromManifest } from '@/data/manifests/build'

export const metadata: Metadata = {
  title: 'Income Statement — KKA Penilaian Saham',
}

export default function IncomeStatementPage() {
  const cells = loadCells('income-statement')
  const rows = buildRowsFromManifest(INCOME_STATEMENT_MANIFEST, cells)

  return (
    <div className="mx-auto max-w-[1400px]">
      <FinancialTable
        title={INCOME_STATEMENT_MANIFEST.title}
        years={INCOME_STATEMENT_MANIFEST.years}
        rows={rows}
        showCommonSize
        showGrowth
        disclaimer={INCOME_STATEMENT_MANIFEST.disclaimer}
      />
    </div>
  )
}
