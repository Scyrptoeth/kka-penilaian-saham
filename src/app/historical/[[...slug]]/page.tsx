'use client'

import { useT } from '@/lib/i18n/useT'
import { Placeholder } from '@/components/layout/Placeholder'

export default function HistoricalPlaceholder() {
  const { t } = useT()
  return (
    <Placeholder
      area={t('placeholder.historical.area')}
      title={t('placeholder.historical.title')}
      description={t('placeholder.historical.description')}
    />
  )
}
