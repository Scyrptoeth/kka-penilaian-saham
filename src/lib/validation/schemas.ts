/**
 * Zod validation schemas for the calc-engine boundary.
 *
 * These schemas run at the seam between the UI / Zustand store and the pure
 * calculation functions. They reject NaN, Infinity, non-numeric years, empty
 * inputs, and cross-field year-set mismatches before any calculation runs.
 *
 * The pure calc functions keep their own runtime guards (`assertSameYears`,
 * etc.), but validation here returns user-readable Zod errors via
 * `.safeParse()` rather than raw `RangeError`s.
 */

import { z } from 'zod'

/** A finite non-NaN number. Matches any IEEE-754 double in ℝ (not ±∞, not NaN). */
export const finiteNumber = z
  .number()
  .refine((v) => Number.isFinite(v), {
    message: 'must be a finite number (NaN/Infinity rejected)',
  })

/**
 * A YearKeyedSeries: Record<number, number> where every key parses as an
 * integer year (4 digits) and every value is a finite number.
 *
 * We accept both `Record<number, ...>` (preferred) and string-keyed records
 * since JS object keys are always strings in practice.
 */
export const yearKeyedSeriesSchema = z
  .record(z.string(), finiteNumber)
  .transform((raw, ctx) => {
    const out: Record<number, number> = {}
    for (const [k, v] of Object.entries(raw)) {
      const year = Number(k)
      if (!Number.isInteger(year) || year < 1900 || year > 2200) {
        ctx.addIssue({
          code: 'custom',
          message: `invalid year key "${k}" — expected integer 1900..2200`,
        })
        return z.NEVER
      }
      out[year] = v as number
    }
    return out
  })
  .refine((s) => Object.keys(s).length > 0, {
    message: 'year-keyed series must have at least one year',
  })

/**
 * Asserts that every series field on `value` has the same year set as the
 * anchor field. Used in `.superRefine` on each module's input schema.
 */
function requireSameYears<T extends Record<string, Record<number, number>>>(
  value: T,
  anchorField: keyof T,
  ctx: z.RefinementCtx,
): void {
  const anchor = value[anchorField]
  const anchorYears = Object.keys(anchor).map(Number).sort((a, b) => a - b)
  for (const [field, series] of Object.entries(value)) {
    if (field === anchorField) continue
    if (series == null) continue
    const ys = Object.keys(series as Record<number, number>)
      .map(Number)
      .sort((a, b) => a - b)
    if (
      ys.length !== anchorYears.length ||
      ys.some((y, i) => y !== anchorYears[i])
    ) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `year set mismatch vs ${String(anchorField)} — got [${ys.join(',')}] expected [${anchorYears.join(',')}]`,
      })
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Per-module input schemas
// ──────────────────────────────────────────────────────────────────────────

export const fixedAssetInputSchema = z.object({
  categories: z
    .array(
      z
        .object({
          name: z.string().min(1),
          acquisitionBeginning: yearKeyedSeriesSchema,
          acquisitionAdditions: yearKeyedSeriesSchema,
          acquisitionDisposals: yearKeyedSeriesSchema.optional(),
          depreciationBeginning: yearKeyedSeriesSchema,
          depreciationAdditions: yearKeyedSeriesSchema,
          depreciationDisposals: yearKeyedSeriesSchema.optional(),
        })
        .superRefine((cat, ctx) => {
          const anchor = cat.acquisitionBeginning
          const anchorYears = Object.keys(anchor)
            .map(Number)
            .sort((a, b) => a - b)
          const fields: (keyof typeof cat)[] = [
            'acquisitionAdditions',
            'acquisitionDisposals',
            'depreciationBeginning',
            'depreciationAdditions',
            'depreciationDisposals',
          ]
          for (const f of fields) {
            const s = cat[f] as Record<number, number> | undefined
            if (!s) continue
            const ys = Object.keys(s).map(Number).sort((a, b) => a - b)
            if (
              ys.length !== anchorYears.length ||
              ys.some((y, i) => y !== anchorYears[i])
            ) {
              ctx.addIssue({
                code: 'custom',
                path: [f],
                message: `year set mismatch vs acquisitionBeginning`,
              })
            }
          }
        }),
    )
    .min(1, { message: 'at least one category required' }),
})

export const noplatInputSchema = z
  .object({
    profitBeforeTax: yearKeyedSeriesSchema,
    interestExpense: yearKeyedSeriesSchema,
    interestIncome: yearKeyedSeriesSchema,
    nonOperatingIncome: yearKeyedSeriesSchema,
    taxProvision: yearKeyedSeriesSchema,
    taxShieldInterestExpense: yearKeyedSeriesSchema.optional(),
    taxOnInterestIncome: yearKeyedSeriesSchema.optional(),
    taxOnNonOperatingIncome: yearKeyedSeriesSchema.optional(),
  })
  .superRefine((v, ctx) => requireSameYears(v, 'profitBeforeTax', ctx))

export const fcfInputSchema = z
  .object({
    noplat: yearKeyedSeriesSchema,
    depreciationAddback: yearKeyedSeriesSchema,
    deltaCurrentAssets: yearKeyedSeriesSchema,
    deltaCurrentLiabilities: yearKeyedSeriesSchema,
    capex: yearKeyedSeriesSchema,
  })
  .superRefine((v, ctx) => requireSameYears(v, 'noplat', ctx))

export const cashFlowInputSchema = z
  .object({
    ebitda: yearKeyedSeriesSchema,
    corporateTax: yearKeyedSeriesSchema,
    deltaCurrentAssets: yearKeyedSeriesSchema,
    deltaCurrentLiabilities: yearKeyedSeriesSchema,
    cashFlowFromNonOperations: yearKeyedSeriesSchema,
    capex: yearKeyedSeriesSchema,
    equityInjection: yearKeyedSeriesSchema,
    newLoan: yearKeyedSeriesSchema,
    interestPayment: yearKeyedSeriesSchema,
    interestIncome: yearKeyedSeriesSchema,
    principalRepayment: yearKeyedSeriesSchema,
  })
  .superRefine((v, ctx) => requireSameYears(v, 'ebitda', ctx))

export const ratiosInputSchema = z
  .object({
    revenue: yearKeyedSeriesSchema,
    grossProfit: yearKeyedSeriesSchema,
    ebitda: yearKeyedSeriesSchema,
    ebit: yearKeyedSeriesSchema,
    interestExpense: yearKeyedSeriesSchema,
    netProfit: yearKeyedSeriesSchema,
    cashOnHand: yearKeyedSeriesSchema,
    cashInBank: yearKeyedSeriesSchema,
    accountsReceivable: yearKeyedSeriesSchema,
    currentAssets: yearKeyedSeriesSchema,
    totalAssets: yearKeyedSeriesSchema,
    bankLoanShortTerm: yearKeyedSeriesSchema,
    currentLiabilities: yearKeyedSeriesSchema,
    bankLoanLongTerm: yearKeyedSeriesSchema,
    nonCurrentLiabilities: yearKeyedSeriesSchema,
    shareholdersEquity: yearKeyedSeriesSchema,
    cashFlowFromOperations: yearKeyedSeriesSchema,
    capex: yearKeyedSeriesSchema,
    freeCashFlow: yearKeyedSeriesSchema,
  })
  .superRefine((v, ctx) => requireSameYears(v, 'revenue', ctx))

export const growthRevenueInputSchema = z
  .object({
    sales: yearKeyedSeriesSchema,
    netIncome: yearKeyedSeriesSchema,
  })
  .superRefine((v, ctx) => {
    const salesYears = Object.keys(v.sales).map(Number).sort((a, b) => a - b)
    if (salesYears.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['sales'],
        message: 'need at least 2 years of data to compute growth',
      })
    }
    requireSameYears(v, 'sales', ctx)
  })

export type ValidatedFixedAssetInput = z.infer<typeof fixedAssetInputSchema>
export type ValidatedNoplatInput = z.infer<typeof noplatInputSchema>
export type ValidatedFcfInput = z.infer<typeof fcfInputSchema>
export type ValidatedCashFlowInput = z.infer<typeof cashFlowInputSchema>
export type ValidatedRatiosInput = z.infer<typeof ratiosInputSchema>
export type ValidatedGrowthRevenueInput = z.infer<
  typeof growthRevenueInputSchema
>
