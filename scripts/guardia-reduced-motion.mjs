// Guardia «Riduci movimento» — il difetto D1/D2 del 26/07 non è visibile a jsdom, e questo
// script è la rete che lo prende.
//
// COSA È SUCCESSO (perché questo file esiste): con «Riduci movimento» acceso, la linguetta «LE
// CASSETTE» restava fuori dallo schermo per sempre (misurata a `left: 393.99` su un telefono da
// 390 — unica via di accesso alla parete) e la striscia della home restava 13px più in basso e al
// 96%. Causa comune: la preferenza dell'utente non è nota nell'istante in cui l'elemento nasce
// (il server non può conoscerla, e la prima resa del client deve coincidere con l'HTML del
// server), quindi l'elemento nasceva coi valori del movimento pieno; poi la coreografia, a
// preferenza accesa, TOGLIEVA le chiavi di spostamento dal bersaglio — e Motion muove solo ciò
// che sta nel bersaglio, quindi quelle chiavi restavano congelate dov'erano.
// La suite unitaria non poteva vederlo: dipende dal momento del mount rispetto all'idratazione e
// da un HTML di server che in jsdom non esiste. Serviva un render VERO.
//
// COSA FA: costruisce con esbuild una paginetta che usa React, Motion e il codice VERO di questo
// repo (`ingressoStriscia` di StrisciaStato.tsx, `useReducedMotion` di design-system/motion.ts,
// i token di v3/motion.ts), la serve su una porta dedicata e la guida con Playwright in
// `prefers-reduced-motion: reduce`. Riproduce la sequenza vera della pagina: HTML di server
// (`renderToString`, cieco alla preferenza) → idratazione → misura frame per frame. Poi ripete a
// preferenza SPENTA, perché una «coreografia sempre istantanea» sarebbe un modo altrettanto
// sbagliato di superare il controllo: la molla ratificata deve essere ancora lì.
//
// USO:  node scripts/guardia-reduced-motion.mjs      (esce 0 se tutto a posto, 1 se no)
// Non serve il server dell'app: questa guardia si ospita da sola. Misurata il 28/07/2026: **4,6 s**
// in tutto, browser compreso — per questo dal 28/07 gira a ogni commit (`.husky/pre-commit`).
//
// ⚠️ DIPENDENZE NON DICHIARATE, ed è voluto (28/07/2026). Questo script importa `playwright` ed
// `esbuild`, che NON sono in `package.json`: arrivano di rimbalzo da `@playwright/test` (E2E) e da
// `vite`/`tsx` (test unitari). Dichiararle esplicitamente è stato PROVATO e RIFIUTATO: `npm i -D`
// alza `playwright` a 1.62 mentre `@playwright/test` resta a 1.60, e quella coppia disallineata
// rompe le prove nel browser — un rischio più grande di quello che chiudeva. Se un giorno una di
// quelle due sorgenti sparisse, questa guardia lo dice a chiare lettere invece di crollare con una
// pila di errori: v. i due blocchi `catch` qui sotto.
//
// ⚠️ LIMITE DICHIARATO — il braccio della STRISCIA dà per scontato l'involucro
// `MotionConfig reducedMotion="user"` che oggi vive alla RADICE dell'app (layout.tsx →
// ConfigMovimento.tsx): la pagina qui sotto se lo monta da sé, quindi resta verde anche se
// qualcuno togliesse o restringesse quell'involucro nell'app vera. Chi lo sposta deve
// ricontrollare a mano questa assunzione. Che l'involucro esista e sia alla radice lo presidia
// una guardia diversa, strutturale: `tests/unit/ds-v3/motion-css.test.ts`. Il braccio della
// LINGUETTA invece non dipende dall'involucro e vede il difetto per conto suo (verificato:
// ripristinando la coreografia vecchia, questa guardia diventa rossa).
import { createServer } from 'node:http'
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { chromium } from 'playwright'
import * as esbuild from 'esbuild'

const RADICE = process.cwd()
const PORTA = Number(process.env.PORTA ?? 8936)
const LAVORO = mkdtempSync(path.join(tmpdir(), 'guardia-rm-'))

// La striscia è la superficie SSR (nasce nell'HTML del server, col suo spostamento d'ingresso
// già scritto dentro); la linguetta è la superficie che nasce solo lato client, dopo
// l'idratazione. Sono i due casi diversi del problema: servono tutt'e due.
const ENTRY = `
import React from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server.browser'
import { motion, MotionConfig } from 'motion/react'
import { molla, istantaneo } from '${path.join(RADICE, 'src/design-system/v3/motion')}'
import { useReducedMotion } from '${path.join(RADICE, 'src/design-system/motion')}'
import { ingressoStriscia } from '${path.join(RADICE, 'src/components/ds/StrisciaStato')}'

function Striscia() {
  const reduced = useReducedMotion()
  const { initial, animate } = ingressoStriscia('urgenza', reduced)
  return <motion.div role="status" initial={initial} animate={animate}
    style={{ height: 52, background: '#F7D9DB', borderRadius: 18, boxSizing: 'border-box' }} />
}

function Linguetta() {
  const reduced = useReducedMotion()
  return <motion.button type="button" className="ds-linguetta" aria-label="Le cassette"
    initial={reduced ? { opacity: 0 } : { x: '110%' }}
    animate={reduced ? { x: 0, opacity: 1 } : { x: 0 }}
    transition={reduced ? { ...molla.smooth, x: istantaneo } : molla.smooth}
    style={{ position: 'fixed', right: 0, bottom: 84, width: 44, height: 139, background: '#D90012', border: 0 }} />
}

const conConfig = (nodo) => <MotionConfig reducedMotion="user">{nodo}</MotionConfig>
const contenitore = document.getElementById('striscia')
contenitore.innerHTML = renderToString(conConfig(<Striscia />))
hydrateRoot(contenitore, conConfig(<Striscia />))
createRoot(document.getElementById('linguetta')).render(conConfig(<Linguetta />))
`

writeFileSync(path.join(LAVORO, 'entry.jsx'), ENTRY)
// `next/link` è l'unica dipendenza Next di StrisciaStato.tsx, e qui non si misura un link: uno
// stub basta. Scritto PRIMA della build, altrimenti esbuild non risolve l'alias.
writeFileSync(path.join(LAVORO, 'link.js'), 'import React from "react"\nexport default (p) => React.createElement("a", p)\n')
try {
  await esbuild.build({
    entryPoints: [path.join(LAVORO, 'entry.jsx')],
    bundle: true, format: 'iife', jsx: 'automatic',
    outfile: path.join(LAVORO, 'bundle.js'),
    define: { 'process.env.NODE_ENV': '"development"' }, // dev: React segnala i mismatch d'idratazione
    alias: { '@': path.join(RADICE, 'src'), 'next/link': path.join(LAVORO, 'link.js') },
    // L'entry vive in una cartella temporanea, fuori dal repo: senza questo, `react` & co. non si
    // risolvono (esbuild cerca a partire da chi importa, non dalla radice del progetto).
    nodePaths: [path.join(RADICE, 'node_modules')],
    absWorkingDir: RADICE,
    logLevel: 'warning',
  })
} catch (e) {
  console.error('❌ GUARDIA REDUCED-MOTION NON ESEGUITA — la paginetta di prova non si costruisce:', String(e).slice(0, 240))
  console.error('   Se manca `esbuild`: arriva di rimbalzo da vite/tsx, quindi controlla `npm ci`.')
  process.exit(1)
}

const bundle = readFileSync(path.join(LAVORO, 'bundle.js'), 'utf8')
const PAGINA = `<!doctype html><html lang="it"><head><meta charset="utf-8">
<style>*{box-sizing:border-box;margin:0;padding:0}body{padding:24px;overflow-x:hidden}#sopra{height:100px}</style>
<script>
window.__campioni = []
const t0 = performance.now()
;(function passo(){
  const s = document.querySelector('#striscia [role="status"]')
  const l = document.querySelector('.ds-linguetta')
  if (s) window.__campioni.push({
    t: +(performance.now() - t0).toFixed(0),
    strisciaTop: +s.getBoundingClientRect().top.toFixed(2),
    linguettaLeft: l ? +l.getBoundingClientRect().left.toFixed(2) : null,
  })
  if (performance.now() - t0 < 1500) requestAnimationFrame(passo)
})()
</script></head><body><div id="sopra"></div><div id="striscia"></div><div id="linguetta"></div>
<script src="/bundle.js"></script></body></html>`

const server = createServer((req, res) => {
  const js = req.url.startsWith('/bundle.js')
  res.writeHead(200, { 'content-type': js ? 'text/javascript' : 'text/html; charset=utf-8' })
  res.end(js ? bundle : PAGINA)
}).listen(PORTA)

let browser
try {
  browser = await chromium.launch()
} catch (e) {
  server.close()
  console.error('❌ GUARDIA REDUCED-MOTION NON ESEGUITA — il browser di prova non parte:', String(e).slice(0, 240))
  console.error('   Rimedio più probabile: npx playwright install chromium')
  process.exit(1)
}
const guasti = []
const nota = []

for (const rm of ['reduce', 'no-preference']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: rm })
  const page = await ctx.newPage()
  const erroriReact = []
  page.on('console', (m) => { if (m.type() === 'error') erroriReact.push(m.text()) })
  page.on('pageerror', (e) => erroriReact.push(String(e.message)))
  await page.goto(`http://localhost:${PORTA}/`, { waitUntil: 'load' })
  await page.waitForTimeout(1800)
  const campioni = await page.evaluate(() => window.__campioni)
  const ultimo = campioni[campioni.length - 1]
  // Riposo: la posizione di arrivo è la stessa nei due modi (nessun transform residuo).
  const riposoTop = 124
  const riposoLeft = 346

  if (Math.abs(ultimo.strisciaTop - riposoTop) > 0.5)
    guasti.push(`[${rm}] la striscia non arriva a riposo: top ${ultimo.strisciaTop} invece di ${riposoTop} — è il difetto D2 (congelata a metà ingresso)`)
  if (Math.abs(ultimo.linguettaLeft - riposoLeft) > 0.5)
    guasti.push(`[${rm}] la linguetta non arriva a riposo: left ${ultimo.linguettaLeft} invece di ${riposoLeft} — è il difetto D1 (fuori schermo, irraggiungibile)`)

  const conLinguetta = campioni.filter((c) => c.linguettaLeft !== null)
  // I primi frame mostrano l'HTML del server, già dipinto col suo spostamento d'ingresso, PRIMA
  // che il client abbia idratato: quella non è animazione, è la posizione di partenza. Ciò che
  // distingue «si è spostata» da «è comparsa al suo posto» sono i valori INTERMEDI fra partenza e
  // riposo: con la dissolvenza non ce n'è nessuno, il salto è unico.
  const partenzaTop = campioni[0].strisciaTop
  const intermedi = campioni.filter((c) => c.strisciaTop > riposoTop + 0.5 && c.strisciaTop < partenzaTop - 0.5).length
  const linguettaMossa = conLinguetta.filter((c) => Math.abs(c.linguettaLeft - riposoLeft) > 0.5).length

  if (rm === 'reduce') {
    if (intermedi > 0) guasti.push(`[reduce] la striscia attraversa ${intermedi} posizioni intermedie fra ${partenzaTop} e ${riposoTop}: sotto «Riduci movimento» deve comparire al suo posto, non percorrere lo spazio`)
    if (linguettaMossa > 0) guasti.push(`[reduce] la linguetta sta fuori posto per ${linguettaMossa} frame: sotto «Riduci movimento» deve comparire già al suo posto (difetto D1: restava fuori schermo)`)
    if (erroriReact.length) guasti.push(`[reduce] React protesta durante l'idratazione (probabile mismatch): ${erroriReact[0].slice(0, 160)}`)
    nota.push(`reduce → striscia: nessuna posizione intermedia (${partenzaTop} → ${riposoTop} in un salto solo); linguetta ferma a ${riposoLeft} per tutti i ${conLinguetta.length} frame in cui esiste`)
  } else {
    // A preferenza SPENTA la molla ratificata deve essere ancora lì: se anche qui tutto arrivasse
    // istantaneo, qualcuno avrebbe spento l'animazione per tutti — un altro modo di rompere il DS.
    if (intermedi < 3) guasti.push('[no-preference] la striscia non anima più: a preferenza spenta la molla ratificata dev\'essere ancora lì')
    if (linguettaMossa < 1) guasti.push('[no-preference] la linguetta non scivola più: la coreografia ratificata è sparita')
    nota.push(`no-preference → striscia in movimento per ${intermedi} frame, linguetta per ${linguettaMossa}: molla intatta`)
  }
  await ctx.close()
}

await browser.close()
server.close()

nota.forEach((n) => console.log('   ', n))
if (guasti.length) {
  console.error('❌ GUARDIA REDUCED-MOTION ROSSA')
  guasti.forEach((g) => console.error('   -', g))
  process.exit(1)
}
console.log('✅ reduced-motion: niente si sposta a preferenza accesa, tutto arriva a riposo, la molla resta a preferenza spenta')
