#!/usr/bin/env node
/**
 * Parses id-user.xlsx and writes data/nip-whitelist.json.
 * Runs as a prebuild step. The JSON is gitignored (generated artifact).
 */
const path = require('node:path')
const fs = require('node:fs')
const ExcelJS = require('exceljs')

const ROOT = path.resolve(__dirname, '..')
const XLSX_PATH = path.join(ROOT, 'id-user.xlsx')
const OUT_DIR = path.join(ROOT, 'data')
const OUT_PATH = path.join(OUT_DIR, 'nip-whitelist.json')

async function main() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`[nip-whitelist] id-user.xlsx not found at ${XLSX_PATH}`)
    process.exit(1)
  }

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(XLSX_PATH)

  const sheet = wb.getWorksheet('02. Edit') ?? wb.worksheets[0]
  if (!sheet) {
    console.error('[nip-whitelist] no worksheet found')
    process.exit(1)
  }

  const nips = new Set()
  const lastRow = sheet.actualRowCount || sheet.rowCount
  for (let r = 2; r <= lastRow; r++) {
    const raw = sheet.getRow(r).getCell(1).value
    if (raw === null || raw === undefined || raw === '') continue
    let text
    if (typeof raw === 'object' && raw !== null && 'text' in raw) {
      text = String(raw.text)
    } else if (typeof raw === 'object' && raw !== null && 'result' in raw) {
      text = String(raw.result)
    } else {
      text = String(raw)
    }
    const nip = text.trim()
    if (/^\d+$/.test(nip)) nips.add(nip)
  }

  if (nips.size === 0) {
    console.error('[nip-whitelist] zero NIPs parsed — refusing to write empty whitelist')
    process.exit(1)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const payload = { count: nips.size, nips: Array.from(nips).sort() }
  fs.writeFileSync(OUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  console.log(`[nip-whitelist] wrote ${nips.size} NIPs to ${path.relative(ROOT, OUT_PATH)}`)
}

main().catch((err) => {
  console.error('[nip-whitelist] failed:', err)
  process.exit(1)
})
