/**
 * ESLint rule: no-hardcoded-ui-strings
 *
 * Mirrors scripts/audit-i18n.mjs detection logic but runs in the ESLint
 * pipeline so violations surface at lint time (editor + `npm run lint`).
 *
 * Detects:
 *   - JSX text nodes with alphabetic content
 *   - JSXAttribute string-literal values on UI-bearing props
 *     (aria-label, title, placeholder, alt, label)
 *
 * Excludes:
 *   - Values wrapped in JSXExpressionContainer (likely useT() or variable)
 *   - aria-labelledby / aria-describedby (ID references)
 *   - Accept-list tokens (scripts/i18n-accept-list.json)
 *   - Lines preceded by `// i18n-ignore`
 *   - Non-alphabetic text (numbers, symbols, punctuation)
 */

const fs = require('node:fs')
const path = require('node:path')

const UI_ATTR_NAMES = new Set([
  'aria-label',
  'title',
  'placeholder',
  'alt',
  'label',
])

// Resolve accept-list once at module load.
function loadAcceptList() {
  const candidatePaths = [
    path.resolve(process.cwd(), 'scripts', 'i18n-accept-list.json'),
  ]
  for (const p of candidatePaths) {
    try {
      const raw = JSON.parse(fs.readFileSync(p, 'utf8'))
      return {
        exactTokens: new Set(raw.exactTokens || []),
        patterns: (raw.patterns || []).map((s) => new RegExp(s)),
      }
    } catch {
      // fall through
    }
  }
  return { exactTokens: new Set(), patterns: [] }
}

const ACCEPT = loadAcceptList()

function isFlaggable(text) {
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  if (ACCEPT.exactTokens.has(trimmed)) return false
  for (const pat of ACCEPT.patterns) {
    if (pat.test(trimmed)) return false
  }
  if (!/[A-Za-z]/.test(trimmed)) return false
  if (/^[A-Za-z]$/.test(trimmed)) return false
  return true
}

// Find leading comment on the line directly above the given line.
function hasIgnorePragmaAbove(sourceCode, node) {
  const comments = sourceCode.getCommentsBefore(node)
  for (const c of comments) {
    if (c.value.trim().startsWith('i18n-ignore')) return true
  }
  return false
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded user-facing strings; use useT() instead.',
    },
    schema: [],
    messages: {
      jsxText: 'Hardcoded user-facing text "{{text}}". Route through useT() + translations.ts.',
      jsxAttr: 'Hardcoded user-facing attribute {{attr}}="{{text}}". Route through useT().',
    },
  },
  create(context) {
    const sourceCode = context.getSourceCode
      ? context.getSourceCode()
      : context.sourceCode
    return {
      JSXText(node) {
        const text = node.value
        if (!isFlaggable(text)) return
        if (hasIgnorePragmaAbove(sourceCode, node)) return
        context.report({
          node,
          messageId: 'jsxText',
          data: { text: text.trim().slice(0, 60) },
        })
      },
      JSXAttribute(node) {
        if (!node.name || node.name.type !== 'JSXIdentifier') return
        const attrName = node.name.name
        if (!UI_ATTR_NAMES.has(attrName)) return
        if (!node.value) return
        if (node.value.type !== 'Literal') return
        const text = typeof node.value.value === 'string' ? node.value.value : ''
        if (!isFlaggable(text)) return
        if (hasIgnorePragmaAbove(sourceCode, node)) return
        context.report({
          node: node.value,
          messageId: 'jsxAttr',
          data: { attr: attrName, text: text.slice(0, 60) },
        })
      },
    }
  },
}
