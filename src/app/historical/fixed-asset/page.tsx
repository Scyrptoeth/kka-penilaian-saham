import type { Metadata } from 'next'
import { SheetPage } from '@/components/financial/SheetPage'
import { FIXED_ASSET_MANIFEST } from '@/data/manifests/fixed-asset'

export const metadata: Metadata = {
  title: 'Fixed Asset Schedule — KKA Penilaian Saham',
}

export default function FixedAssetPage() {
  return <SheetPage manifest={FIXED_ASSET_MANIFEST} />
}
