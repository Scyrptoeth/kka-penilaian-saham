// scripts/audit-i18n.mjs
//
// i18n coverage audit — detects hardcoded user-facing strings in src/
// that should flow through useT() / translations.ts.
//
// Library:
//   auditSource(source, filePath, { acceptList }) => Finding[]
//   loadAcceptList(path) => { exactTokens: Set<string>, patterns: RegExp[] }
//
// CLI:
//   node scripts/audit-i18n.mjs [--write-report]
//   exits non-zero if violations remain after accept-list filtering.
//
// Detection scope:
//   - JSX text nodes containing at least one alphabetic character
//   - JSXAttribute string-literal values on UI-bearing props:
//       aria-label, aria-labelledby, aria-describedby,
//       title, placeholder, alt, label
//
// Skipped by design:
//   - className, id, data-*, style, href, src, key, ref, role, type
//   - Attribute values wrapped in JSXExpressionContainer (`{t(...)}`)
//   - Pure-numeric / pure-punctuation / single-char strings
//   - Accept-list exact tokens or patterns
//   - Lines preceded by `// i18n-ignore`

import ts from 'typescript'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, '..')

// Attributes whose string values are user-facing text.
// `aria-labelledby` and `aria-describedby` are deliberately excluded — they
// reference element IDs, not user text.
const UI_ATTR_NAMES = new Set([
  'aria-label',
  'title',
  'placeholder',
  'alt',
  'label',
])

/**
 * @typedef {Object} Finding
 * @property {string} filePath
 * @property {number} line     - 1-based
 * @property {number} col      - 0-based
 * @property {string} text
 * @property {'jsx-text'|'jsx-attribute'} kind
 * @property {string=} attrName
 */

/**
 * Returns true if the text is worth flagging as a hardcoded UI string.
 * Rejects: pure whitespace, pure-numeric, pure-symbol, single alphabetic char,
 * explicit accept-list tokens and patterns.
 */
function isFlaggable(text, acceptList) {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  if (acceptList.exactTokens.has(trimmed)) return false
  for (const pat of acceptList.patterns) {
    if (pat.test(trimmed)) return false
  }
  // Must contain at least one alphabetic ASCII char.
  if (!/[A-Za-z]/.test(trimmed)) return false
  // Single alphabetic char (like "X" for close icon) — skip.
  if (/^[A-Za-z]$/.test(trimmed)) return false
  return true
}

/**
 * Determine if the line containing `pos` in `source` is preceded by an
 * `// i18n-ignore` comment within the current file. The pragma applies to
 * the *next non-blank, non-comment* line.
 */
function hasIgnorePragma(source, pos) {
  const beforePos = source.slice(0, pos)
  const prevLines = beforePos.split('\n')
  // Walk backwards skipping blank lines.
  for (let i = prevLines.length - 2; i >= 0; i--) {
    const line = prevLines[i].trim()
    if (line === '') continue
    return line.startsWith('// i18n-ignore')
  }
  return false
}

function getLineAndCol(source, pos) {
  const before = source.slice(0, pos)
  const lines = before.split('\n')
  return { line: lines.length, col: lines[lines.length - 1].length }
}

export function auditSource(source, filePath, options = {}) {
  const acceptList = options.acceptList || {
    exactTokens: new Set(),
    patterns: [],
  }

  const sf = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )

  const findings = []

  function visit(node) {
    // JSX text — only flag if contains alphabetic content.
    if (ts.isJsxText(node)) {
      const raw = node.getText(sf)
      if (isFlaggable(raw, acceptList)) {
        if (!hasIgnorePragma(source, node.getStart(sf))) {
          const loc = getLineAndCol(source, node.getStart(sf))
          findings.push({
            filePath,
            line: loc.line,
            col: loc.col,
            text: raw.trim(),
            kind: 'jsx-text',
          })
        }
      }
    }

    // JSX attribute — only flag string-literal values on UI-bearing props.
    if (ts.isJsxAttribute(node) && node.initializer) {
      const attrName = node.name.getText(sf)
      if (UI_ATTR_NAMES.has(attrName) && ts.isStringLiteral(node.initializer)) {
        const text = node.initializer.text
        if (isFlaggable(text, acceptList)) {
          if (!hasIgnorePragma(source, node.getStart(sf))) {
            const loc = getLineAndCol(source, node.initializer.getStart(sf))
            findings.push({
              filePath,
              line: loc.line,
              col: loc.col,
              text,
              kind: 'jsx-attribute',
              attrName,
            })
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sf)
  return findings
}

export function loadAcceptList(path) {
  const raw = JSON.parse(readFileSync(path, 'utf8'))
  return {
    exactTokens: new Set(raw.exactTokens || []),
    patterns: (raw.patterns || []).map((p) => new RegExp(p)),
  }
}

function walkSrc(rootDir, acc = []) {
  for (const entry of readdirSync(rootDir)) {
    const full = join(rootDir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      walkSrc(full, acc)
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      acc.push(full)
    }
  }
  return acc
}

function groupByFile(findings) {
  const out = new Map()
  for (const f of findings) {
    if (!out.has(f.filePath)) out.set(f.filePath, [])
    out.get(f.filePath).push(f)
  }
  return out
}

function formatReport(findings) {
  if (findings.length === 0) {
    return '# i18n Audit Report\n\n✅ Zero violations.\n'
  }
  const byFile = groupByFile(findings)
  const lines = [
    '# i18n Audit Report',
    '',
    `Found **${findings.length}** hardcoded UI strings across **${byFile.size}** files.`,
    '',
    '| File | Line | Kind | Attribute | Text |',
    '|------|-----:|------|-----------|------|',
  ]
  for (const [file, group] of byFile) {
    for (const f of group) {
      const relPath = relative(REPO_ROOT, file)
      const escaped = f.text.replace(/\|/g, '\\|').slice(0, 80)
      lines.push(
        `| \`${relPath}\` | ${f.line} | ${f.kind} | ${f.attrName || ''} | ${escaped} |`,
      )
    }
  }
  lines.push('')
  lines.push('## Remediation')
  lines.push('')
  lines.push('For each violation:')
  lines.push('')
  lines.push('1. Add key to `src/lib/i18n/translations.ts` (both `en` and `id` maps).')
  lines.push('2. Replace literal with `useT()` call: `t(\'section.key\')`.')
  lines.push('3. If the string is genuinely NOT user-facing (debug log, CSS class), add to `scripts/i18n-accept-list.json` or mark line with `// i18n-ignore`.')
  lines.push('')
  return lines.join('\n')
}

// CLI entry
const isCli = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCli) {
  const srcDir = join(REPO_ROOT, 'src')
  const acceptListPath = join(REPO_ROOT, 'scripts', 'i18n-accept-list.json')
  let acceptList
  try {
    acceptList = loadAcceptList(acceptListPath)
  } catch {
    acceptList = { exactTokens: new Set(), patterns: [] }
  }
  const files = walkSrc(srcDir)
  const allFindings = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    allFindings.push(...auditSource(src, f, { acceptList }))
  }
  const report = formatReport(allFindings)
  const writeReport = process.argv.includes('--write-report')
  if (writeReport) {
    writeFileSync(join(REPO_ROOT, 'i18n-audit-report.md'), report)
  }
  if (allFindings.length > 0) {
    // Emit compact summary to stderr for CI.
    const byFile = groupByFile(allFindings)
    console.error(`i18n audit: ${allFindings.length} violations in ${byFile.size} files.`)
    for (const [file, group] of byFile) {
      console.error(`  ${relative(REPO_ROOT, file)}: ${group.length}`)
    }
    process.exit(1)
  }
  console.log('i18n audit: ✅ zero violations')
  process.exit(0)
}
