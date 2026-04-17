# Session 029 Plan — i18n Audit + Phase C Headless Numerical Verification

## Branch
`feat/session-029-i18n-phase-c` from main

## Sequence (T1–T17)

### Infrastructure Phase (P1 foundation)

- [ ] **T1** — Write design.md + plan.md; commit docs-first
  - Files: `design.md`, `plan.md`
  - Verify: `git log -1` shows commit; branch exists

- [ ] **T2** — Scaffold audit-i18n TDD (RED)
  - New: `scripts/audit-i18n.mjs` (empty default export + CLI entry)
  - New: `__tests__/scripts/audit-i18n.test.ts` with 5 fixture TSX strings (one hardcoded JSX text, one accept-listed, one aria-label hardcoded, one via useT, one complex mixed)
  - Verify: test runs, all test cases FAIL (RED confirmed)

- [ ] **T3** — Implement AST walker (GREEN)
  - TypeScript compiler API walker: JSXText, JSXAttribute (specific prop names), string literal in known UI-bearing call positions
  - Accept-list lookup from `scripts/i18n-accept-list.json`
  - `// i18n-ignore` line pragma parsing
  - Output JSON `{filePath, line, col, text, kind}[]`
  - Verify: T2 tests pass (GREEN)

- [ ] **T4** — Run audit, categorize, build accept-list
  - Run `node scripts/audit-i18n.mjs` against `src/` (write to stdout for inspection)
  - Categorize findings: (a) true violations needing migration, (b) accept-list additions, (c) pragma-worthy edge cases
  - Update `scripts/i18n-accept-list.json` with (b)
  - Expected: 20-30 actionable hits based on recon (6 JSX text + 16 attribute)
  - Verify: re-run audit → only true violations remain

### Migration Phase (P1 execution)

- [ ] **T5** — Migrate JSX text violations (batch 1)
  - Files: `src/components/forms/WaccForm.tsx`, `src/app/valuation/dcf/page.tsx` (6 hits)
  - Add keys to `src/lib/i18n/translations.ts` under appropriate section
  - Wire `useT()` in each component
  - Verify: audit re-run shows those files resolved; existing tests still pass

- [ ] **T6** — Migrate attribute violations (batch 2)
  - Files: 15 components with hardcoded `aria-label`/`title`/`placeholder`/`alt`
  - Pattern per file: add `const t = useT()`, replace literal with `t('key')`
  - Verify: audit clean on those files; existing tests pass

### Lint Gate Phase (P1 enforcement)

- [ ] **T7** — ESLint custom rule `local/no-hardcoded-ui-strings`
  - New: `eslint-rules/no-hardcoded-ui-strings.js` (CommonJS for ESLint plugin compat)
  - Update: `eslint.config.mjs` to load rule as local plugin
  - Rule mirrors audit-i18n logic but uses ESLint's built-in AST visitor
  - Verify: inject a test hardcoded string → `npm run lint` catches it → remove → clean

- [ ] **T8** — npm script wiring
  - Add to `package.json` scripts: `"audit:i18n": "node scripts/audit-i18n.mjs"`, `"verify:phase-c": "node scripts/verify-phase-c.mjs"`
  - Chain: `pretest` runs `audit:i18n` alongside existing whitelist builder
  - Verify: `npm run audit:i18n` exit code 0; `npm test` invokes pretest chain

### Phase C Infrastructure (P2 foundation)

- [ ] **T9** — verify-phase-c.mjs skeleton + fixture seed
  - New: `scripts/verify-phase-c.mjs`
  - New: `__tests__/integration/phase-c-verification.test.ts` (wrapping comparator lib)
  - Import seed fixtures via `src/data/seed/loader.ts`
  - Build `seedStore()` helper that synthesizes Zustand-compatible state shape from seed
  - Verify: seed invocation succeeds; HOME-like metadata present in synthesized state

- [ ] **T10** — Website snapshot via calc pipeline
  - Function `takeWebsiteSnapshot(state): Snapshot`
  - Invoke `computeHistoricalUpstream`, `computeFcfFromState`, `computeNoplatFromState`, `deriveComputedRows`, projection helpers for all 29 nav sheets
  - Extract values keyed by `{sheet, excelRow, yearColumn}` — match export addressing
  - Verify: snapshot JSON has entries for each WEBSITE_NAV_SHEETS entry; sample values non-zero

- [ ] **T11** — Excel snapshot via export + ExcelJS read-back
  - Function `takeExcelSnapshot(state): Snapshot`
  - Invoke existing `exportToXlsx(state)` → buffer
  - `new ExcelJS.Workbook().xlsx.load(buffer)` → iterate `WEBSITE_NAV_SHEETS` sheets
  - For each cell: read `cell.value`; if formula object, read `cell.result`; unwrap richText
  - Verify: snapshot JSON populated; keys match website-snapshot key shape

- [ ] **T12** — Diff engine + report writer
  - Function `compareSnapshots(a, b, tolerance): DiffResult`
  - Join keys (union, report asymmetric keys as critical)
  - For each shared key: `abs(a.val - b.val) > tolerance` → mismatch
  - Write `phase-c-verification-report.md` (generated artifact, gitignored — keep raw snapshots gitignored too)
  - CLI exit code non-zero on any mismatch
  - Verify: run end-to-end; report generated; exit code check

- [ ] **T13** — Integration test phase-c-verification
  - Test calls `runPhaseCComparison()` as library export
  - Asserts `result.mismatches.length === 0`
  - Verify: test RED first (likely some mismatch surfaces — real bug or snapshot shape mismatch); diagnose

### Remediation Phase (P2 execution)

- [ ] **T14** — Root-cause-fix mismatches
  - Triage each mismatch: website bug, export bug, snapshot shape bug
  - Fix at source; add regression unit test
  - Re-run comparator
  - Iterate until zero mismatches
  - Verify: verify:phase-c exit 0; new unit tests green

### Verification Gate (all)

- [ ] **T15** — Full verification gate
  - Run: `npm run audit:i18n && npm run lint && npm test && npm run typecheck && npm run build && npm run verify:phase-c`
  - All must pass
  - Verify: zero warnings/errors everywhere; build 34+ pages; tests all pass

### Documentation (Mode B equivalents)

- [ ] **T16** — Session 029 documentation
  - Update: `progress.md` (snapshot new state)
  - New: `history/session-029-i18n-audit-phase-c.md`
  - Append: `lessons-learned.md` (LESSON-081, 082, ... as discovered)
  - Update: `~/.claude/skills/start-kka-penilaian-saham/SKILL.md` section 2 + 8 (promote lessons)
  - Update: `~/.claude/skills/update-kka-penilaian-saham/SKILL.md` if relevant
  - Commit: `docs: session 029 wrap-up — i18n audit + Phase C headless verification + N lessons`

- [ ] **T17** — Merge + deploy
  - `git checkout main && git pull`
  - `git checkout feat/session-029-i18n-phase-c && git rebase main`
  - `git checkout main && git merge feat/session-029-i18n-phase-c`
  - `git push origin main`
  - `curl -s -o /dev/null -w "%{http_code}" https://penilaian-bisnis.vercel.app/akses` → 200

---

## Success Criteria (repeated for visibility)

1. `npm run audit:i18n` → 0 violations
2. `npm run lint` → 0 errors (new rule active)
3. `npm test` → 913+ passing
4. `npm run verify:phase-c` → 0 mismatches
5. `npm run typecheck` → clean
6. `npm run build` → clean, 34+ pages
7. Live `curl` → HTTP 200
8. All docs committed; lessons promoted to skills
9. PR merged to main, deployed

## Estimates

- T1–T4 (audit infrastructure): ~60 min
- T5–T6 (migration): ~45 min
- T7–T8 (lint rule + wiring): ~30 min
- T9–T13 (Phase C infrastructure): ~90 min
- T14 (root-cause fixes): unknown, budget 60 min, auto-split if balloons
- T15–T17 (gate + docs + merge): ~45 min

Total estimated: ~5 hours of work-equivalent.
