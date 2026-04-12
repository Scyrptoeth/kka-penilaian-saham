import type { Metadata } from 'next'
import { CashFlowLiveView } from '@/components/analysis/CashFlowLiveView'

export const metadata: Metadata = {
  title: 'Cash Flow Statement — KKA Penilaian Saham',
}

export default function CashFlowPage() {
  return <CashFlowLiveView />
}
