'use client'

import { useT } from '@/lib/i18n/useT'
import { Placeholder } from '@/components/layout/Placeholder'

export default function AnalysisPlaceholder() {
  const { t } = useT()
  return (
    <Placeholder
      area={t('placeholder.analysis.area')}
      title={t('placeholder.analysis.title')}
      description={t('placeholder.analysis.description')}
    />
  )
}
