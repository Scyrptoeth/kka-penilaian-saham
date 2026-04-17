'use client'

import { useT } from '@/lib/i18n/useT'
import { Placeholder } from '@/components/layout/Placeholder'

export default function ProjectionPlaceholder() {
  const { t } = useT()
  return (
    <Placeholder
      area={t('placeholder.projection.area')}
      title={t('placeholder.projection.title')}
      description={t('placeholder.projection.description')}
    />
  )
}
