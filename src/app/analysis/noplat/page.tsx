import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { NOPLAT_MANIFEST } from '@/data/manifests/noplat'

export const metadata: Metadata = {
  title: 'NOPLAT — KKA Penilaian Saham',
}

export default function NoplatPage() {
  return <SheetPage manifest={NOPLAT_MANIFEST} />
}
