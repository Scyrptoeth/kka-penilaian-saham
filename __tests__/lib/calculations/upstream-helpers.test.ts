import { describe, expect, it } from 'vitest'
import { buildCfiInput } from '@/lib/calculations/upstream-helpers'
import type { HistoricalUpstreamResult } from '@/lib/calculations/upstream-helpers'

function makeUpstream(): HistoricalUpstreamResult {
  // Minimal shape — only `allFcf[20]` is read by buildCfiInput
  return {
    allNoplat: {},
    allCfs: {},
    allFcf: {
      20: { 2019: 100, 2020: 200, 2021: 300 },
    },
    allFa: {},
    faComp: null,
    roicRows: {},
    growthRate: 0,
  }
}

describe('buildCfiInput', () => {
  it('reads historicalFcf from upstream.allFcf[20] per histYears3', () => {
    const result = buildCfiInput({
      upstream: makeUpstream(),
      histYears3: [2019, 2020, 2021],
      projYears: [2022, 2023, 2024],
      dcfProjectedFcf: [400, 500, 600],
      proyLrRows: { 34: { 2022: 40, 2023: 50, 2024: 60 } },
      incomeStatementRows: { 30: { 2019: 10, 2020: 20, 2021: 30 } },
    })

    expect(result.historicalFcf).toEqual({ 2019: 100, 2020: 200, 2021: 300 })
  })

  it('mirrors dcfProjectedFcf positionally into projYears keyed series', () => {
    const result = buildCfiInput({
      upstream: makeUpstream(),
      histYears3: [2019, 2020, 2021],
      projYears: [2022, 2023, 2024],
      dcfProjectedFcf: [400, 500, 600],
      proyLrRows: {},
      incomeStatementRows: {},
    })

    expect(result.projectedFcf).toEqual({ 2022: 400, 2023: 500, 2024: 600 })
  })

  it('reads historicalNonOpCf from IS row 30 per histYears3', () => {
    const result = buildCfiInput({
      upstream: makeUpstream(),
      histYears3: [2019, 2020, 2021],
      projYears: [2022, 2023, 2024],
      dcfProjectedFcf: [0, 0, 0],
      proyLrRows: {},
      incomeStatementRows: { 30: { 2019: 11, 2020: 22, 2021: 33 } },
    })

    expect(result.historicalNonOpCf).toEqual({ 2019: 11, 2020: 22, 2021: 33 })
  })

  it('reads projectedNonOpCf from proyLrRows[34] per projYears', () => {
    const result = buildCfiInput({
      upstream: makeUpstream(),
      histYears3: [2019, 2020, 2021],
      projYears: [2022, 2023, 2024],
      dcfProjectedFcf: [0, 0, 0],
      proyLrRows: { 34: { 2022: 77, 2023: 88, 2024: 99 } },
      incomeStatementRows: {},
    })

    expect(result.projectedNonOpCf).toEqual({ 2022: 77, 2023: 88, 2024: 99 })
  })

  it('defaults missing rows / years to zero', () => {
    const result = buildCfiInput({
      upstream: {
        allNoplat: {}, allCfs: {}, allFcf: {}, allFa: {},
        faComp: null, roicRows: {}, growthRate: 0,
      },
      histYears3: [2019, 2020, 2021],
      projYears: [2022, 2023, 2024],
      dcfProjectedFcf: [],
      proyLrRows: {},
      incomeStatementRows: {},
    })

    expect(result.historicalFcf).toEqual({ 2019: 0, 2020: 0, 2021: 0 })
    expect(result.projectedFcf).toEqual({ 2022: 0, 2023: 0, 2024: 0 })
    expect(result.historicalNonOpCf).toEqual({ 2019: 0, 2020: 0, 2021: 0 })
    expect(result.projectedNonOpCf).toEqual({ 2022: 0, 2023: 0, 2024: 0 })
  })
})
