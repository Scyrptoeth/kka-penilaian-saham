import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { ROIC_MANIFEST } from '@/data/manifests/roic'

export const metadata: Metadata = {
  title: 'ROIC — KKA Penilaian Saham',
}

export default function RoicPage() {
  return <SheetPage manifest={ROIC_MANIFEST} />
}
