// Verifica a PIXEL RESI del mockup 2026-07-26-leggibilita-colori-v23.html.
// Il mockup calcola da solo i propri contrasti componendo gli sfondi degli antenati.
// Questo script controlla che quel calcolo coincida con cio' che il browser DISEGNA davvero:
//   1. rende il testo trasparente,
//   2. fotografa la pagina,
//   3. legge il pixel al centro di ogni elemento misurato = fondo composto VERO,
//   4. lo confronta col fondo calcolato dal mockup.
// Se i due coincidono, i numeri stampati nel mockup sono misure, non stime.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const qui = path.dirname(fileURLToPath(import.meta.url))
const radice = path.resolve(qui, '../..')
const mockup = 'file://' + path.join(radice, 'docs/design/mockups/2026-07-26-leggibilita-colori-v23.html')

const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1440, height: 1200 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.goto(mockup, { waitUntil: 'networkidle' })
await p.waitForTimeout(600)

// ── guardia: il foglio di stile e' DAVVERO applicato? ──
const guardia = await p.evaluate(() => {
  const t = document.querySelector('.tema')
  return {
    bgToken: getComputedStyle(t).getPropertyValue('--bg').trim(),
    goldInk: getComputedStyle(t).getPropertyValue('--gold-ink').trim(),
    kpiBg: getComputedStyle(document.querySelector('.kpi')).backgroundColor,
    nMisure: (window.__misure || []).length,
    font: getComputedStyle(document.querySelector('.kpi-num')).fontFamily,
  }
})
console.log('GUARDIA:', JSON.stringify(guardia))
if (!guardia.bgToken || !guardia.goldInk || guardia.kpiBg === 'rgba(0, 0, 0, 0)' || !guardia.nMisure) {
  console.log('❌ stili non applicati o misure assenti — non fidarsi di nulla qui sotto')
  await b.close(); process.exit(1)
}
console.log('✅ token presenti, superfici opache, ' + guardia.nMisure + ' misure esposte\n')

const misure = await p.evaluate(() => window.__misure)

// ── rettangoli degli elementi misurati, in coordinate di pagina ──
// Non basta il pixel centrale: l'etichetta «CONSIGLIATO» e' alta 15px e sta a cavallo
// del bordo della scheda, quindi il suo centro cade sulla giuntura fra due fondi diversi.
// Si prende il colore PIU' FREQUENTE dentro il rettangolo: e' il fondo dominante, e non
// dipende da dove capita un singolo punto.
const punti = await p.evaluate(() => {
  const out = []
  document.querySelectorAll('[data-cr]').forEach(el => {
    const r = el.getBoundingClientRect()
    out.push({
      x0: Math.round(r.left + scrollX), y0: Math.round(r.top + scrollY),
      x1: Math.round(r.right + scrollX), y1: Math.round(r.bottom + scrollY),
    })
  })
  return out
})

// ── il testo sparisce: resta solo il fondo composto ──
await p.addStyleTag({ content: '[data-cr]{color:transparent !important}' })
await p.waitForTimeout(250)
const buf = await p.screenshot({ fullPage: true })
const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const pixel = (x, y) => { const i = (info.width * y + x) * info.channels; return [data[i], data[i + 1], data[i + 2]] }
const dominante = (r) => {                       // colore piu' frequente nel rettangolo
  const conta = new Map()
  for (let y = Math.max(0, r.y0); y < Math.min(info.height, r.y1); y++)
    for (let x = Math.max(0, r.x0); x < Math.min(info.width, r.x1); x++) {
      const c = pixel(x, y), k = (c[0] << 16) | (c[1] << 8) | c[2]
      conta.set(k, (conta.get(k) || 0) + 1)
    }
  let best = 0, n = -1
  for (const [k, v] of conta) if (v > n) { n = v; best = k }
  return [(best >> 16) & 255, (best >> 8) & 255, best & 255]
}

const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lum = (r) => 0.2126 * lin(r[0]) + 0.7152 * lin(r[1]) + 0.0722 * lin(r[2])
const CR = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }

// Tolleranza. Il calcolo del mockup somma gli sfondi degli antenati: non sa nulla delle
// OMBRE. L'etichetta «CONSIGLIATO» della scheda non scelta cade dentro l'ombra portata
// della scheda precedente, che scurisce il fondo di ~3/255 — il pixel misura un contrasto
// leggermente PEGGIORE del calcolato. E' l'unico punto dove i due divergono, la differenza
// vale meno di 0.07 e non sposta nessun verdetto (1,53 e 1,59 sono entrambi disastrosi).
const TOLL = 0.10
let peggiore = 0, fuori = 0, quasi = 0
console.log('sez / lato / tema'.padEnd(46) + 'etichetta'.padEnd(34) + 'calcolato  a pixel   Δ')
for (let i = 0; i < misure.length; i++) {
  const m = misure[i]
  const reso = dominante(punti[i])
  const rPixel = CR(m.fg, reso)
  const d = Math.abs(rPixel - m.r)
  peggiore = Math.max(peggiore, d)
  if (d > TOLL) fuori++
  else if (d > 0.01) quasi++
  // il verdetto (passa / passa solo come testo grande / non passa) deve coincidere
  const verdetto = (v) => v >= 4.5 ? 'AA' : v >= m.soglia ? 'soglia' : 'no'
  const stessoVerdetto = verdetto(m.r) === verdetto(rPixel)
  if (!stessoVerdetto) { fuori++; console.log('  ⚠ VERDETTO DIVERSO', JSON.stringify(m), 'pixel:', reso) }
  const cap = `${m.sezione.replace('sez-', '')} / ${m.lato.split('—')[0].trim()} / ${m.tema}`
  console.log('  ' + cap.padEnd(44) + m.et.slice(0, 32).padEnd(34) +
    m.r.toFixed(2).padStart(7) + rPixel.toFixed(2).padStart(10) + d.toFixed(3).padStart(9) +
    (d > 0.01 ? '  (ombra vicina)' : ''))
}
console.log(`\n${misure.length} misure · scostamento massimo calcolo↔pixel ${peggiore.toFixed(3)}`)
console.log(`  entro 0.01: ${misure.length - quasi - fuori} · entro ${TOLL} (ombre): ${quasi} · oltre: ${fuori}`)
console.log(fuori === 0
  ? '✅ ogni numero stampato nel mockup coincide col pixel disegnato, e nessun verdetto cambia.\n   I numeri sono misure, non stime.'
  : '❌ il mockup stampa numeri che non corrispondono a cio\' che disegna.')

await b.close()
