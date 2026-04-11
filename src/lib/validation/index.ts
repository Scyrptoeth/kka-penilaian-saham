/**
 * Validated wrappers for the calc engine.
 *
 * Each wrapper runs a Zod schema against the raw input, then delegates to
 * the pure calculation function. On validation failure it throws a
 * `ValidationError` with a human-readable message derived from the Zod issue
 * tree — callers don't have to decode Zod's raw error shape.
 *
 * Pure calc functions remain untouched; this layer is purely additive.
 */

import { z } from 'zod'
import {
  computeFixedAssetSchedule,
  type FixedAssetInput,
  type FixedAssetSchedule,
} from '../calculations/fixed-asset'
import {
  computeNoplat,
  type NoplatInput,
  type NoplatResult,
} from '../calculations/noplat'
import {
  computeFcf,
  type FcfInput,
  type FcfResult,
} from '../calculations/fcf'
import {
  computeCashFlowStatement,
  type CashFlowInput,
  type CashFlowResult,
} from '../calculations/cash-flow'
import {
  computeFinancialRatios,
  type RatiosInput,
  type FinancialRatios,
} from '../calculations/ratios'
import {
  computeGrowthRevenue,
  type GrowthRevenueInput,
  type GrowthRevenueResult,
} from '../calculations/growth-revenue'
import {
  cashFlowInputSchema,
  fcfInputSchema,
  fixedAssetInputSchema,
  growthRevenueInputSchema,
  noplatInputSchema,
  ratiosInputSchema,
} from './schemas'

export class ValidationError extends Error {
  readonly issues: z.core.$ZodIssue[]
  constructor(label: string, issues: z.core.$ZodIssue[]) {
    const summary = issues
      .map((i) => `${(i.path || []).join('.') || '<root>'}: ${i.message}`)
      .join('; ')
    super(`${label} validation failed: ${summary}`)
    this.name = 'ValidationError'
    this.issues = issues
  }
}

function runSchema<T>(label: string, schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input)
  if (!result.success) {
    throw new ValidationError(label, result.error.issues)
  }
  return result.data
}

export function validatedFixedAssetSchedule(
  input: unknown,
): FixedAssetSchedule {
  const parsed = runSchema(
    'fixed-asset',
    fixedAssetInputSchema,
    input,
  ) as FixedAssetInput
  return computeFixedAssetSchedule(parsed)
}

export function validatedNoplat(input: unknown): NoplatResult {
  const parsed = runSchema('noplat', noplatInputSchema, input) as NoplatInput
  return computeNoplat(parsed)
}

export function validatedFcf(input: unknown): FcfResult {
  const parsed = runSchema('fcf', fcfInputSchema, input) as FcfInput
  return computeFcf(parsed)
}

export function validatedCashFlowStatement(input: unknown): CashFlowResult {
  const parsed = runSchema(
    'cash-flow',
    cashFlowInputSchema,
    input,
  ) as CashFlowInput
  return computeCashFlowStatement(parsed)
}

export function validatedFinancialRatios(input: unknown): FinancialRatios {
  const parsed = runSchema('ratios', ratiosInputSchema, input) as RatiosInput
  return computeFinancialRatios(parsed)
}

export function validatedGrowthRevenue(
  input: unknown,
): GrowthRevenueResult {
  const parsed = runSchema(
    'growth-revenue',
    growthRevenueInputSchema,
    input,
  ) as GrowthRevenueInput
  return computeGrowthRevenue(parsed)
}

export * from './schemas'
