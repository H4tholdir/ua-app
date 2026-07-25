// Nomi lunghi — variante 6 «la combinata». Misure browser REALI su :3020.
//
// PERCHÉ NON SI INIETTA IL TESTO NEL NODO VIVO (trappola a verbale, 26/07): il rilevatore di
// `Cassetta.tsx` gira su ResizeObserver, e il RO non riscatta quando la scatola resta cappata da
// `max-height` — un nome di 3 righe iniettato dopo uno di 2 lascia `is-troncato` fermo al valore
// precedente (falso positivo misurato nel round precedente su «DI SANTI CATERINA»: righe 2/2 ma
// classe ancora accesa). Dalla variante 6 in poi c'è un secondo motivo, più grave: la scala dei
// gradini si costruisce dalla PROP `lavoro.dentista`, non dal testo che si trova nel DOM — un
// testo iniettato a mano verrebbe misurato con la scala del nome originale e riscritto dal primo
// re-render di React.
//
// METODO: per ogni misura si crea un CLONE del nodo `.ds-cassetta-dent` reale dentro lo stesso
// `.ds-cassetta-cont` (che è `position: relative`, v. ds-v3.css), in `position:absolute` +
// `visibility:hidden`. Il clone eredita ESATTAMENTE la stessa cascata e la stessa larghezza
// risolta del nodo vivo (verificato a ogni giro: `larghezzaClone === larghezzaViva`, altrimenti
// la misura è dichiarata non valida) ma non è governato da React né osservato dal RO: nessuno
// stato sporco fra un nome e l'altro, nessuna lotta col re-render. È l'equivalente della «pagina
// pulita per ogni nome» chiesta dal verbale, al costo di un nodo temporaneo.
//
// Lo script gira IDENTICO prima e dopo l'implementazione: se le classi `is-corpo-95`/`is-corpo-9`
// non esistono ancora nel foglio (build «prima»), il gradino si applica con un font-size inline e
// il modo usato viene dichiarato nell'output. Il valore RISOLTO (`getComputedStyle`) è sempre
// letto e riportato: è quello che conta, non il testo del CSS (lezione del round precedente — una
// regola più specifica può scartare in silenzio quello che si scrive su una regola base).
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:3020'
const EMAIL = process.env.E2E_TITOLARE_EMAIL ?? 'e2e-titolare@ua-test.local'
const PASSWORD = process.env.E2E_TITOLARE_PASSWORD ?? 'TestE2E!2026'
const ETICHETTA = process.env.ETICHETTA ?? 'prima'

// I 4 nomi VERI (tabella clienti, lab «Filippo Opromolla» — gli stessi del round precedente) +
// i 3 nomi «di prova» del mockup, quelli che servono a far scattare l'accorciamento.
// `accorciato` è l'esito ATTESO di `accorciaNomeStudio` (src/lib/domain/nome-studio.ts): qui è
// scritto a mano perché lo script è .mjs e non importa il modulo TS — la funzione è presidiata
// dai suoi test unitari, questo campo serve solo a dare al browser il testo da misurare.
const NOMI = [
  { nome: 'STUDI MEDICI DI SANTI GIUSEPPE', accorciato: 'DI SANTI GIUSEPPE', vero: true },
  { nome: 'DI SANTI CATERINA', accorciato: null, vero: true },
  { nome: 'BARALE S.A.S.', accorciato: null, vero: true },
  { nome: 'C.O.M. s.r.l. uninominale', accorciato: null, vero: true },
  { nome: 'CENTRO ODONTOIATRICO SANTA MARIA', accorciato: 'SANTA MARIA', vero: false },
  { nome: 'POLIAMBULATORIO ODONTOIATRICO SAN RAFFAELE', accorciato: 'SAN RAFFAELE', vero: false },
  { nome: 'STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO', accorciato: 'GIANCARLO POLIAMBULATORIO', vero: false },
]

const PROFILI = [
  { nome: 'dpr1.00-390x844', width: 390, height: 844, dpr: 1, mobile: true },
  { nome: 'dpr2.75-390x844', width: 390, height: 844, dpr: 2.75, mobile: true },
  { nome: 'dpr3.00-393x873', width: 393, height: 873, dpr: 3, mobile: true },
  { nome: 'dpr2.00-1280x800', width: 1280, height: 800, dpr: 2, mobile: false },
]

const OUT = path.join(process.cwd(), `scripts/tmp/nomi-lunghi-v6-${ETICHETTA}.json`)
const risultati = {}
const browser = await chromium.launch()

for (const p of PROFILI) {
  const ctx = await browser.newContext({
    viewport: { width: p.width, height: p.height },
    deviceScaleFactor: p.dpr,
    isMobile: p.mobile,
    hasTouch: p.mobile,
  })
  const page = await ctx.newPage()
  const cssRotti = []
  page.on('response', (r) => { if (r.url().endsWith('.css') && r.status() >= 400) cssRotti.push(`${r.status()} ${r.url()}`) })

  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type=email], [name=email]', { timeout: 20000 })
  await page.fill('input[type=email], [name=email]', EMAIL)
  await page.fill('input[type=password], [name=password]', PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/, { timeout: 30000 })

  await page.goto(`${BASE}/cassette`, { waitUntil: 'networkidle' })
  await page.waitForSelector('.ds-cassetta-dent', { timeout: 20000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(600)

  // Stato REALE della fixture, senza toccare nulla: è la guardia di non-regressione
  // (i nomi della fixture E2E devono restare identici a com'erano prima della variante 6).
  const fixture = await page.evaluate(() => [...document.querySelectorAll('.ds-cassetta-dent')].map((d) => {
    const cs = getComputedStyle(d)
    const lh = parseFloat(cs.lineHeight)
    return {
      testo: (d.textContent ?? '').trim(),
      classi: d.className,
      fontSize: cs.fontSize,
      maxHeight: cs.maxHeight,
      lineHeight: cs.lineHeight,
      righeContenuto: Math.round(d.scrollHeight / lh),
      righeVisibili: Math.round(d.clientHeight / lh),
      titolo: d.getAttribute('title'),
      ariaLabelBottone: d.closest('button')?.getAttribute('aria-label') ?? null,
    }
  }))

  const misure = await page.evaluate(async (NOMI) => {
    const vivo = document.querySelector('.ds-cassetta-dent')
    const cont = vivo.parentElement
    const larghezzaViva = +vivo.getBoundingClientRect().width.toFixed(2)

    // Il foglio dichiara davvero i due gradini? (build «dopo») — altrimenti si ripiega
    // sull'inline e lo si dichiara.
    const classiDisponibili = (() => {
      const sonda = vivo.cloneNode(false)
      sonda.className = 'ds-cassetta-dent is-corpo-9'
      sonda.style.position = 'absolute'; sonda.style.visibility = 'hidden'
      cont.appendChild(sonda)
      const fs9 = getComputedStyle(sonda).fontSize
      sonda.remove()
      return fs9 === '9px'
    })()

    const misuraUno = async (testo, gradino) => {
      const clone = vivo.cloneNode(false)
      clone.className = 'ds-cassetta-dent'
      if (classiDisponibili && gradino.classe) clone.classList.add(gradino.classe)
      clone.style.position = 'absolute'
      clone.style.top = '0'; clone.style.left = '0'
      clone.style.visibility = 'hidden'
      clone.style.pointerEvents = 'none'
      if (!classiDisponibili && gradino.px !== 10) clone.style.fontSize = `${gradino.px}px`
      clone.textContent = testo
      cont.appendChild(clone)
      await new Promise((r) => requestAnimationFrame(r))
      const cs = getComputedStyle(clone)
      const lh = parseFloat(cs.lineHeight)
      const out = {
        gradino: gradino.nome,
        modo: classiDisponibili ? (gradino.classe ? `classe ${gradino.classe}` : 'regola base') : (gradino.px === 10 ? 'regola base' : `inline ${gradino.px}px`),
        fontSizeRisolto: cs.fontSize,
        lineHeightRisolto: cs.lineHeight,
        maxHeightRisolto: cs.maxHeight,
        larghezza: +clone.getBoundingClientRect().width.toFixed(2),
        scrollH: clone.scrollHeight,
        clientH: clone.clientHeight,
        righeContenuto: Math.round(clone.scrollHeight / lh),
        righeVisibili: Math.round(clone.clientHeight / lh),
        alturaRealeContenuto: +clone.scrollHeight.toFixed(2),
      }
      out.entra = out.righeContenuto <= out.righeVisibili
      out.buonaMisura = out.larghezza === larghezzaViva && out.righeVisibili === 2 || out.righeContenuto === 1
      clone.remove()
      return out
    }

    const GRADINI = [
      { nome: '10px', classe: null, px: 10 },
      { nome: '9.5px', classe: 'is-corpo-95', px: 9.5 },
      { nome: '9px', classe: 'is-corpo-9', px: 9 },
    ]

    const risultato = []
    for (const n of NOMI) {
      const passi = []
      for (const g of GRADINI) passi.push({ testo: n.nome, variante: 'intero', ...(await misuraUno(n.nome, g)) })
      if (n.accorciato) {
        for (const g of GRADINI) passi.push({ testo: n.accorciato, variante: 'accorciato', ...(await misuraUno(n.accorciato, g)) })
      }
      const scelto = passi.find((x) => x.entra) ?? passi[passi.length - 1]
      risultato.push({
        nome: n.nome, vero: n.vero, accorciato: n.accorciato, larghezzaViva,
        passi,
        esito: {
          testoReso: scelto.testo, variante: scelto.variante, gradino: scelto.gradino,
          righe: `${scelto.righeContenuto}/${scelto.righeVisibili}`,
          sfumatura: !scelto.entra,
        },
      })
    }
    return { larghezzaViva, classiDisponibili, risultato }
  }, NOMI)

  risultati[p.nome] = { cssRotti, fixture, ...misure }
  console.log(`✓ ${p.nome} (dent ${misure.larghezzaViva}px · gradini via ${misure.classiDisponibili ? 'CLASSI CSS' : 'inline (build prima)'})`)
  await ctx.close()
}

await browser.close()
fs.writeFileSync(OUT, JSON.stringify(risultati, null, 2))

console.log(`\n########## ${ETICHETTA.toUpperCase()} ##########`)
for (const [profilo, r] of Object.entries(risultati)) {
  console.log(`\n===== ${profilo} · dent ${r.larghezzaViva}px · css rotti: ${r.cssRotti.length ? r.cssRotti : 'nessuno'} =====`)
  console.log('--- fixture E2E (non-regressione) ---')
  for (const f of r.fixture) {
    console.log(`  «${f.testo}» classi="${f.classi}" font ${f.fontSize} maxH ${f.maxHeight} righe ${f.righeContenuto}/${f.righeVisibili} title=${f.titolo ?? '—'}`)
  }
  console.log('--- scala dei gradini (clone, cascata reale) ---')
  for (const n of r.risultato) {
    console.log(`  «${n.nome}»${n.vero ? '' : '  [nome di prova]'}`)
    for (const p of n.passi) {
      console.log(`      ${p.variante.padEnd(11)} ${p.gradino.padEnd(6)} [${p.modo}] font ${p.fontSizeRisolto} lh ${p.lineHeightRisolto} maxH ${p.maxHeightRisolto} larg ${p.larghezza} righe ${p.righeContenuto}/${p.righeVisibili} → ${p.entra ? 'ENTRA' : 'sfora'}`)
    }
    console.log(`      ⇒ esito: «${n.esito.testoReso}» a ${n.esito.gradino} (${n.esito.variante}), righe ${n.esito.righe}, sfumatura: ${n.esito.sfumatura ? 'SÌ' : 'no'}`)
  }
}
