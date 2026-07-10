// scripts/screenshot-mockups.mjs
// Screenshot dei mockup HTML statici (file://) a 390 e 768 px.
// Uso: node scripts/screenshot-mockups.mjs docs/design/mockups/<file>.html
import { chromium } from '@playwright/test'
import { resolve, basename } from 'node:path'
import { mkdirSync } from 'node:fs'

const file = process.argv[2]
if (!file) { console.error('Uso: node scripts/screenshot-mockups.mjs <mockup.html>'); process.exit(1) }

const outDir = 'docs/design/mockups/screenshots'
mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
for (const width of [390, 768]) {
  const page = await browser.newPage({ viewport: { width, height: 900 } })
  await page.goto(`file://${resolve(file)}`)
  await page.waitForTimeout(300)
  const nome = basename(file, '.html')
  await page.screenshot({ path: `${outDir}/${nome}-${width}.png`, fullPage: true })
  await page.close()
}
await browser.close()
console.log('Screenshot salvati in', outDir)
