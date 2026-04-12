import type { Metadata } from 'next'
import { FcfLiveView } from '@/components/analysis/FcfLiveView'

export const metadata: Metadata = {
  title: 'Free Cash Flow — KKA Penilaian Saham',
}

export default function FcfPage() {
  return <FcfLiveView />
}
