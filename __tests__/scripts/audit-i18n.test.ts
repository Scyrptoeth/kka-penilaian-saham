import { describe, it, expect } from 'vitest'
// @ts-expect-error: .mjs module, no .d.ts
import { auditSource } from '../../scripts/audit-i18n.mjs'

interface Finding {
  filePath: string
  line: number
  col: number
  text: string
  kind: 'jsx-text' | 'jsx-attribute'
  attrName?: string
}

const DEFAULT_ACCEPT_LIST = {
  exactTokens: new Set<string>(['NPWP', 'CIF', 'NIP', 'IDR', 'USD', 'EN', 'ID']),
  patterns: [] as RegExp[],
}

describe('auditSource — JSX text detection', () => {
  it('flags hardcoded alphabetic JSX text', () => {
    const source = `
export function Foo() {
  return <button>Submit Form</button>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(1)
    expect(findings[0].kind).toBe('jsx-text')
    expect(findings[0].text).toBe('Submit Form')
  })

  it('ignores JSX text that contains only whitespace', () => {
    const source = `
export function Foo() {
  return (
    <div>
      <span>{name}</span>
    </div>
  )
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(0)
  })

  it('ignores JSX text that matches accept-list tokens', () => {
    const source = `
export function Foo() {
  return <span>NPWP</span>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(0)
  })

  it('ignores JSX text containing only symbols/numbers', () => {
    const source = `
export function Foo() {
  return <><span>→</span><span>2026</span><span>•</span></>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(0)
  })
})

describe('auditSource — JSX attribute detection', () => {
  it('flags hardcoded aria-label', () => {
    const source = `
export function Foo() {
  return <button aria-label="Close dialog"><X /></button>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(1)
    expect(findings[0].kind).toBe('jsx-attribute')
    expect(findings[0].attrName).toBe('aria-label')
    expect(findings[0].text).toBe('Close dialog')
  })

  it('flags hardcoded title, placeholder, alt, label', () => {
    const source = `
export function Foo() {
  return (
    <div>
      <input placeholder="Enter amount" />
      <span title="Tooltip text">?</span>
      <img alt="Company logo" />
      <Field label="Amount" />
    </div>
  )
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    const attrs = findings.map(f => f.attrName).sort()
    expect(attrs).toEqual(['alt', 'label', 'placeholder', 'title'])
  })

  it('ignores className, id, data-*, href, src', () => {
    const source = `
export function Foo() {
  return (
    <a className="text-ink" id="my-id" data-testid="foo" href="/home">link</a>
  )
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    // Only 'link' JSX text should be flagged, no attributes
    expect(findings).toHaveLength(1)
    expect(findings[0].kind).toBe('jsx-text')
    expect(findings[0].text).toBe('link')
  })

  it('ignores expression-wrapped attribute values (likely useT() or variable)', () => {
    const source = `
export function Foo() {
  return <button aria-label={t('close')}>X</button>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(0)
  })
})

describe('auditSource — i18n-ignore pragma', () => {
  it('ignores flagged strings on lines preceded by // i18n-ignore', () => {
    const source = `
export function Foo() {
  // i18n-ignore
  return <span>Raw debug</span>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(0)
  })
})

describe('auditSource — reports line and column', () => {
  it('reports 1-based line number and 0-based column', () => {
    const source = `import { useT } from '@/lib/i18n/useT'
export function Foo() {
  return <button>Submit</button>
}
`
    const findings = auditSource(source, 'test.tsx', { acceptList: DEFAULT_ACCEPT_LIST }) as Finding[]
    expect(findings).toHaveLength(1)
    expect(findings[0].line).toBeGreaterThan(0)
    expect(findings[0].col).toBeGreaterThanOrEqual(0)
  })
})
