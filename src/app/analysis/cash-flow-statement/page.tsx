'use client'

import { CashFlowLiveView } from '@/components/analysis/CashFlowLiveView'

/**
 * ANALISIS — Cash Flow Statement page.
 * Derives CFS from BS + IS + FA + AP (live-only, no seed fallback).
 */
export default function AnalysisCashFlowStatementPage() {
  return <CashFlowLiveView />
}
