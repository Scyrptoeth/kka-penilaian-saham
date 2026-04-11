import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { INCOME_STATEMENT_MANIFEST } from '@/data/manifests/income-statement'

export const metadata: Metadata = {
  title: 'Income Statement — KKA Penilaian Saham',
}

export default function IncomeStatementPage() {
  return <SheetPage manifest={INCOME_STATEMENT_MANIFEST} />
}
