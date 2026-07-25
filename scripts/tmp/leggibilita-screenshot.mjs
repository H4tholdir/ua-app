import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
const qui = path.dirname(fileURLToPath(import.meta.url))
const radice = path.resolve(qui, '../..')
const out = path.join(radice, 'docs/design/mockups/screenshots')
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })).newPage()
await p.goto('file://' + path.join(radice, 'docs/design/mockups/2026-07-26-leggibilita-colori-v23.html'), { waitUntil: 'networkidle' })
await p.waitForTimeout(900)
const g = await p.evaluate(() => ({ n: (window.__misure||[]).length, ink: getComputedStyle(document.querySelector('.tema')).getPropertyValue('--gold-ink').trim() }))
if (!g.n || !g.ink) { console.log('❌ guardia: mockup non renderizzato', g); await b.close(); process.exit(1) }
console.log('guardia ok —', g.n, 'misure,', 'gold-ink', g.ink)
await p.screenshot({ path: path.join(out, '2026-07-26-leggibilita-00-intero.png'), fullPage: true })
const sez = [['01-kpi','sez-kpi'],['02-psur','sez-psur'],['03-ambra','sez-ambra'],['04-oro','sez-oro']]
for (const [nome, id] of sez) {
  const el = await p.$('#' + id)
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(250)
  await el.screenshot({ path: path.join(out, `2026-07-26-leggibilita-${nome}.png`) })
  console.log('  ↳', nome)
}
for (const [nome, sel] of [['05-rampa-oro','#rampa-oro'],['06-token','.tokentab']]) {
  const el = await p.$(sel); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(200)
  await el.screenshot({ path: path.join(out, `2026-07-26-leggibilita-${nome}.png`) }); console.log('  ↳', nome)
}
await b.close()
