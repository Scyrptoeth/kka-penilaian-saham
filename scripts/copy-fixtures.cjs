#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Copies selected Excel ground-truth fixtures from __tests__/fixtures/
 * into src/data/seed/fixtures/ so that Next.js can bundle them as part
 * of the app build (Next cannot import JSON from outside the src tree).
 *
 * Run via: npm run seed:sync
 * Commit the resulting JSON files — they are the seed data for the
 * read-only demo pages in Session 2B P1.
 */
const fs = require('node:fs')
const path = require('node:path')

const SHEETS = [
  'balance-sheet',
  'income-statement',
  'fcf',
  'financial-ratio',
  'cash-flow-statement',
  'fixed-asset',
]

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, '__tests__', 'fixtures')
const DEST = path.join(ROOT, 'src', 'data', 'seed', 'fixtures')

fs.mkdirSync(DEST, { recursive: true })

let copied = 0
for (const slug of SHEETS) {
  const from = path.join(SRC, `${slug}.json`)
  const to = path.join(DEST, `${slug}.json`)
  if (!fs.existsSync(from)) {
    console.error(`[seed:sync] missing fixture: ${from}`)
    process.exitCode = 1
    continue
  }
  fs.copyFileSync(from, to)
  copied++
}
console.log(`[seed:sync] copied ${copied}/${SHEETS.length} fixtures → ${path.relative(ROOT, DEST)}`)
