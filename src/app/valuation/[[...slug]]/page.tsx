'use client'

import { useT } from '@/lib/i18n/useT'
import { Placeholder } from '@/components/layout/Placeholder'

export default function ValuationPlaceholder() {
  const { t } = useT()
  return (
    <Placeholder
      area={t('placeholder.valuation.area')}
      title={t('placeholder.valuation.title')}
      description={t('placeholder.valuation.description')}
    />
  )
}
