import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { BALANCE_SHEET_MANIFEST } from '@/data/manifests/balance-sheet'

export const metadata: Metadata = {
  title: 'Balance Sheet — KKA Penilaian Saham',
}

export default function BalanceSheetPage() {
  return <SheetPage manifest={BALANCE_SHEET_MANIFEST} />
}
