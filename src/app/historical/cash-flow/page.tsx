import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { CASH_FLOW_STATEMENT_MANIFEST } from '@/data/manifests/cash-flow-statement'

export const metadata: Metadata = {
  title: 'Cash Flow Statement — KKA Penilaian Saham',
}

export default function CashFlowPage() {
  return <SheetPage manifest={CASH_FLOW_STATEMENT_MANIFEST} />
}
