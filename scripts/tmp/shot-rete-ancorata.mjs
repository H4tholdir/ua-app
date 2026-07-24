// Screenshot del mockup 2026-07-25-rete-ancorata-colonne.html — solo mockup statico, nessun
// server toccato. Genera gli screenshot di conferma visiva per Francesco (5 larghezze x 2 temi
// + confronto prima/dopo a 1366).
import { chromium } from 'playwright'
import path from 'node:path'

const ROOT = path.resolve('.')
const MOCKUP = path.join(ROOT, 'docs/design/mockups/2026-07-25-rete-ancorata-colonne.html')
const OUT = path.join(ROOT, 'docs/design/mockups/screenshots')

const widths = [390, 768, 1024, 1180, 1366]

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('file://' + MOCKUP)

for (const w of widths) {
  await page.setViewportSize({ width: w, height: 1500 })
  await page.waitForTimeout(150)
  await page.screenshot({ path: path.join(OUT, `2026-07-25-rete-ancorata-${w}-light.png`), fullPage: true })
}

await page.click('.toggle')
await page.waitForTimeout(150)
for (const w of widths) {
  await page.setViewportSize({ width: w, height: 1500 })
  await page.waitForTimeout(150)
  await page.screenshot({ path: path.join(OUT, `2026-07-25-rete-ancorata-${w}-dark.png`), fullPage: true })
}

await page.click('.toggle') // back to light
await page.setViewportSize({ width: 1366, height: 1700 })
await page.waitForTimeout(150)
const confrontoLight = await page.$('.confronto')
await confrontoLight.screenshot({ path: path.join(OUT, '2026-07-25-rete-ancorata-CONFRONTO-1366-light.png') })

await page.click('.toggle') // dark
await page.waitForTimeout(150)
const confrontoDark = await page.$('.confronto')
await confrontoDark.screenshot({ path: path.join(OUT, '2026-07-25-rete-ancorata-CONFRONTO-1366-dark.png') })

await page.click('.toggle') // back to light for readout check
await page.setViewportSize({ width: 1366, height: 1000 })
await page.waitForTimeout(150)
console.log('readout-viva @1366:', await page.textContent('#readout-viva'))
console.log('readout-dopo @1366:', await page.textContent('#readout-dopo'))
for (const w of [390, 768, 1024, 1180]) {
  await page.setViewportSize({ width: w, height: 1000 })
  await page.waitForTimeout(150)
  console.log(`readout-viva @${w}:`, await page.textContent('#readout-viva'))
}

await browser.close()
console.log('done')
