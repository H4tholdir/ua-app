// Scatti di non-regressione: la parete della fixture E2E DOPO la variante 6 (i nomi della
// fixture non attraversano nessun gradino — la resa dev'essere identica a prima, e le misure
// in nomi-lunghi-v6-prima.json / -dopo.json lo dimostrano nei numeri; questi sono l'occhio).
import { chromium } from 'playwright'
const BASE = 'http://localhost:3020'
const b = await chromium.launch()
for (const [tema, nome] of [['light', 'chiaro'], ['dark', 'scuro']]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, colorScheme: tema })
  const p = await ctx.newPage()
  await p.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await p.fill('input[type=email], [name=email]', 'e2e-titolare@ua-test.local')
  await p.fill('input[type=password], [name=password]', 'TestE2E!2026')
  await p.click('button[type=submit]')
  await p.waitForURL(/\/dashboard/, { timeout: 30000 })
  await p.goto(`${BASE}/cassette`, { waitUntil: 'networkidle' })
  await p.waitForSelector('.ds-cassetta', { timeout: 20000 })
  await p.evaluate(() => document.fonts.ready)
  await p.waitForTimeout(800)
  await p.screenshot({ path: `docs/design/screenshots/2026-07-26-nomi-lunghi-variante6/cassette-390-${nome}.png` })
  console.log('✓', nome)
  await ctx.close()
}
await b.close()
