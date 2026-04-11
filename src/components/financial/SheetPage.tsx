import { loadCells } from '@/data/seed/loader'
import { buildRowsFromManifest } from '@/data/manifests/build'
import type { SheetManifest } from '@/data/manifests/types'
import { FinancialTable } from './FinancialTable'

/**
 * <SheetPage> — the universal seed-mode renderer for any sheet manifest.
 *
 * Runs on the server (no `'use client'`) and encapsulates the four lines
 * that every Historis/Analisis page would otherwise duplicate:
 *
 *   1. loadCells(manifest.slug) — pull the extracted fixture
 *   2. buildRowsFromManifest — turn the manifest into FinancialRow[],
 *      auto-invoking manifest.derive if present
 *   3. <FinancialTable> — render with the manifest's title, years,
 *      disclaimer, and column-group flags
 *
 * Column-group visibility is inferred from the manifest: when a manifest
 * declares `commonSizeColumns` OR its `derive` produces common-size data,
 * we show the common-size column group. Same for growth. Pages can
 * override via the explicit props.
 */
interface SheetPageProps {
  manifest: SheetManifest
  /** Override: force common-size column group on/off. */
  showCommonSize?: boolean
  /** Override: force growth column group on/off. */
  showGrowth?: boolean
}

export function SheetPage({
  manifest,
  showCommonSize,
  showGrowth,
}: SheetPageProps) {
  const cells = loadCells(manifest.slug)
  const rows = buildRowsFromManifest(manifest, cells)

  // Heuristic: show common-size/growth columns when either the manifest
  // declares matching Excel column letters (cells-based) or a row carries
  // a derived series for that group. Caller can still override.
  const autoShowCommonSize =
    manifest.commonSizeColumns !== undefined ||
    rows.some((r) => r.commonSize !== undefined)
  const autoShowGrowth =
    manifest.growthColumns !== undefined ||
    rows.some((r) => r.growth !== undefined)

  return (
    <div className="mx-auto max-w-[1400px]">
      <FinancialTable
        title={manifest.title}
        years={manifest.years}
        rows={rows}
        showCommonSize={showCommonSize ?? autoShowCommonSize}
        showGrowth={showGrowth ?? autoShowGrowth}
        disclaimer={manifest.disclaimer}
      />
    </div>
  )
}
