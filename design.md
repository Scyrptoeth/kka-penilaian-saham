# Design — Session 027: AAM Dynamic Account Interoperability

## Problem
AAM page displays 14 hardcoded Excel prototype account names instead of user's actual BS accounts. Custom/manual accounts invisible. EKUITAS section missing.

## Approach: Section-Based Dynamic AAM (3-layer redesign)

### Layer 1 — Calc Engine
`AamInput`: 20 named fields → section-based totals (totalCurrentAssets, nonIbdCurrentLiabilities, interestBearingDebt, totalEquity, etc.)
`AamResult`: unchanged — downstream consumers unaffected.
NAV formula unchanged: `totalAssets - nonIbdCL - nonIbdNCL`

### Layer 2 — Builder
`buildAamInput`: iterate `balanceSheet.accounts`, classify IBD vs non-IBD, aggregate per section.
IBD = `short_term_debt` + `long_term_debt` catalog IDs only. Custom = non-IBD.

### Layer 3 — AAM Page UI
Dynamic from `balanceSheet.accounts` grouped by section. EKUITAS added.
Fixed Asset Net (row 22) = special hardcoded row. Labels from catalog or customLabel.

### Language Toggle
`<LanguageToggle>` in sidebar below ThemeToggle. Controls `balanceSheet.language`.

## Out of Scope
- Other downstream pages (EEM display, Dashboard detail)
- Export cell-mapping for dynamic AAM
- Global language system beyond sidebar toggle
