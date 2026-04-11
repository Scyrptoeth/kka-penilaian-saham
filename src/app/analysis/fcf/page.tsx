import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { FCF_MANIFEST } from '@/data/manifests/fcf'

export const metadata: Metadata = {
  title: 'Free Cash Flow — KKA Penilaian Saham',
}

export default function FcfPage() {
  return <SheetPage manifest={FCF_MANIFEST} />
}
