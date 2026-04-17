/**
 * React hook for accessing translations.
 * Reads language from root Zustand store (v15+).
 * Returns { t, language } where t(key) returns the translated string.
 */

import { useKkaStore } from '@/lib/store/useKkaStore'
import { createT, type Lang, type TranslationKey } from './translations'

export function useT(): { t: (key: TranslationKey) => string; language: Lang } {
  const language = useKkaStore(s => s.language)
  return { t: createT(language), language }
}
