// Variante 6 — la scala VIVA: il componente React reale, nella app reale, in un browser reale.
//
// PROBLEMA: i 4 nomi veri vivono nel laboratorio di Francesco, non nella fixture E2E, e la scala
// dei gradini si costruisce dalla PROP `lavoro.dentista` — iniettare il testo nel DOM misura la
// scala del nome sbagliato e viene comunque riscritto al primo re-render. Quindi il testo non si
// tocca: si stringe la SCATOLA. Il nome della fixture è «Studio Bianchi», che ha in testa una
// parola di categoria («studio») ed è quindi accorciabile in «Bianchi»: restringendo la colonna
// si attraversano, uno dopo l'altro, TUTTI i punti della regola —
//   nome intero a corpo pieno → gradini 9,5 e 9px → nome accorciato → sfumatura di oggi
// e, allargando di nuovo, la RISALITA (che nessun test unitario può provare: dipende dal
// ResizeObserver di un browser vero).
//
// Verifica anche le due trappole di questa implementazione:
//  · nessun ciclo infinito ResizeObserver ⇄ gradino (lo stato dev'essere STABILE fra due
//    campionamenti a distanza, e la console senza errori di loop del RO);
//  · il nome completo resta sempre leggibile (aria-label del bottone + title sul testo).
import { chromium } from 'playwright'
import fs from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:3020'
const EMAIL = process.env.E2E_TITOLARE_EMAIL ?? 'e2e-titolare@ua-test.local'
const PASSWORD = process.env.E2E_TITOLARE_PASSWORD ?? 'TestE2E!2026'
const LARGHEZZE = [null, 60, 44, 34, 26, 20, 16, null]

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
const erroriConsole = []
page.on('console', (m) => { if (m.type() === 'error') erroriConsole.push(m.text()) })
page.on('pageerror', (e) => erroriConsole.push(`pageerror: ${e.message}`))

await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.fill('input[type=email], [name=email]', EMAIL)
await page.fill('input[type=password], [name=password]', PASSWORD)
await page.click('button[type=submit]')
await page.waitForURL(/\/dashboard/, { timeout: 30000 })
await page.goto(`${BASE}/cassette`, { waitUntil: 'networkidle' })
await page.waitForSelector('.ds-cassetta-dent', { timeout: 20000 })
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(600)

const leggi = () => page.evaluate(() => {
  const d = document.querySelector('.ds-cassetta-dent')
  if (!d) return null
  const cs = getComputedStyle(d)
  const lh = parseFloat(cs.lineHeight)
  return {
    testo: (d.textContent ?? '').trim(),
    classi: d.className,
    fontSize: cs.fontSize,
    maxHeight: cs.maxHeight,
    larghezza: +d.getBoundingClientRect().width.toFixed(2),
    righe: `${Math.round(d.scrollHeight / lh)}/${Math.round(d.clientHeight / lh)}`,
    mask: cs.maskImage === 'none' ? 'nessuna' : 'sfumatura',
    clip: cs.clipPath,
    title: d.getAttribute('title'),
    ariaLabel: d.closest('button')?.getAttribute('aria-label') ?? null,
  }
})

const righe = []
for (const larghezza of LARGHEZZE) {
  await page.evaluate((l) => {
    document.getElementById('stretta')?.remove()
    if (l === null) return
    const s = document.createElement('style')
    s.id = 'stretta'
    s.textContent = `[data-ds="v3"] .ds-cassetta-dent { width: ${l}px !important; }`
    document.head.appendChild(s)
  }, larghezza)
  await page.waitForTimeout(500)
  const a = await leggi()
  await page.waitForTimeout(600)
  const b = await leggi() // stesso stato a distanza: se differisce, la macchina non si è fermata
  righe.push({ larghezza: larghezza ?? 'naturale', ...a, stabile: JSON.stringify(a) === JSON.stringify(b) })
}

fs.writeFileSync('scripts/tmp/nomi-lunghi-v6-scala-viva.json', JSON.stringify({ righe, erroriConsole }, null, 2))

console.log('larghezza  testo reso        classi                                   font   righe  sfumatura  stabile  title')
for (const r of righe) {
  console.log(
    `${String(r.larghezza).padEnd(10)} ${(`«${r.testo}»`).padEnd(17)} ${r.classi.replace('ds-cassetta-dent', '').trim().padEnd(40)} ` +
    `${r.fontSize.padEnd(6)} ${r.righe.padEnd(6)} ${r.mask.padEnd(10)} ${(r.stabile ? 'sì' : 'NO').padEnd(8)} ${r.title ?? '—'}`
  )
}
console.log('\naria-label del bottone (deve contenere SEMPRE il nome di database):', righe.at(-1)?.ariaLabel)
console.log('errori in console:', erroriConsole.length ? erroriConsole : 'nessuno')
console.log('tutti gli stati stabili:', righe.every((r) => r.stabile) ? '✅' : '❌ la macchina non si ferma')

await browser.close()
