// FIX-H — G6 (gancetto sfalsato dal filo) + G9-cornice (filo di bordo V1)
// Fonte requisiti: .superpowers/sdd/fixH-brief.md · verbale
// docs/design/decisions/2026-07-24-qa-device-meta-ondata.md §G6/§G9 · mockup ratificato
// docs/design/mockups/2026-07-25-rete-cornice-bordi.html (variante V1 «filo di bordo»).
// Stesso pattern testuale di css-sync.test.ts/parete-fluida.test.ts: il CSS è verificato come
// testo — jsdom non fa layout, quindi niente getComputedStyle reale. La RELAZIONE del passo
// (G6) è verificata risolvendo a mano in JS la formula `clamp(40px, 10.2cqw, 50px)` dichiarata
// nel foglio (letta col MEDESIMO regex del test esistente, non ridigitata a mano) a 3 larghezze
// di CONTENT-BOX della shell — non il viewport — che replicano i 3 viewport obbligatori
// (390/768/1280): shell max-width 480/720/1120 (righe ~518,529,530) meno il padding orizzontale
// della shell stessa (20px per lato) = 440/680/1080. Verifica finale d'ondata (26/07, difetto A9):
// qui era citato il padding `8px 20px 40px`, valore che QUESTA STESSA ondata ha già cambiato in
// `8px 20px 0` (i 40px del fondo sono passati dentro `.ds-parete`, v. parete-fino-in-fondo.test.ts).
// La derivazione non ne risente — conta solo il 20px orizzontale, invariato — ma il numero citato
// non esisteva più: si nomina solo ciò che serve davvero. Nessun valore di questo
// file ripete "44" come verità del fix (compare solo come riferimento al vecchio letterale
// rotto, per dimostrare il contrasto — mai in un `.toBe`/assert di correttezza).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = css.replace(/\s+/g, ' ')
// Verifica finale d'ondata (26/07, difetto A4a) — copia SENZA commenti, per la sola guardia
// negativa in fondo. Isolare un blocco con `[^}]*\}` su un testo che contiene ancora i commenti
// significa fidarsi che nessun commento dentro le graffe contenga una `}`: se ne compare una (un
// esempio di regola citato nella prosa, uno snippet), il blocco isolato si tronca lì e
// un'asserzione NEGATIVA passa a vuoto su tutto ciò che segue — cioè smette di essere una guardia
// proprio mentre continua a dire di esserlo. I commenti li toglie il parser CSS del browser: qui
// si fa lo stesso, così la guardia non dipende più dall'igiene dei commenti.
const nudo = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ')

/** Risolve `clamp(40px, 10.2cqw, 50px)` per una data larghezza di container in px. */
function resolvePasso(containerWidthPx: number): number {
  const cqw = 0.102 * containerWidthPx
  return Math.min(50, Math.max(40, cqw))
}

// content-box della shell alle 3 soglie obbligatorie (v. commento di testa per la derivazione)
const CONTENUTO_SHELL_PER_VIEWPORT = { mobile: 440, tablet: 680, desktop: 1080 } as const

describe('parete — G6: il pattern del filo SEGUE --passo-maglia (non più fisso a 44)', () => {
  it('background-size della luce è var(--passo-maglia), non un letterale fisso', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete \{[^}]*background-size: var\(--passo-maglia\) var\(--passo-maglia\);/
    )
    // guardia negativa: il vecchio letterale rotto non deve ricomparire nella dichiarazione
    // REALE (isola il blocco `.ds-parete { ... }` per non inciampare nei commenti che citano
    // il vecchio valore come riferimento storico)
    const bloccoReale = norm.match(/\[data-ds="v3"\] \.ds-parete \{[^}]*\}/)
    expect(bloccoReale, 'blocco .ds-parete non trovato').toBeTruthy()
    expect(bloccoReale![0]).not.toMatch(/background-size: 44px 44px/)
  })

  it('background-position della luce ancora il filo a wire-center - wire-w/2, IDENTICO alla formula già in uso nel ramo dark (stessa quota, stesso linguaggio — v. riga dark sotto)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete \{[^}]*background-position: 0 calc\(var\(--wire-center\) - var\(--wire-w\) \/ 2\);/
    )
  })

  it('il pattern SVG non incorpora più un offset y fisso in unità-tile (era y=8.5, proporzionale a un passo di 44 — scalava MALE a passo ≠ 44): l\'offset ora vive nel background-position sopra, che è un px assoluto e non scala con background-size', () => {
    const img = norm.match(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-image: url\("([^"]+)"\)/)
    expect(img, 'background-image non trovato').toBeTruthy()
    const svg = decodeURIComponent(img![1])
    expect(svg).toContain("<pattern id='meshR3' width='44' height='44' patternUnits='userSpaceOnUse'>")
    expect(svg).not.toMatch(/<pattern[^>]*\by='8\.5'/)
  })

  it('l\'SVG dichiara un viewBox esplicito (0 0 44 44): senza, un <svg width/height> renderizzato in un background-size diverso dall\'intrinseco NON scala il contenuto (gotcha SVG-senza-viewBox) — resterebbe ancorato a 44 unità native dentro un riquadro più grande, lasciando una banda vuota/"a scacchi" a passo ≠44 anche se il PERIODO del tiling (background-size) è corretto. Col viewBox il rescaling uniforme è garantito dallo user-agent, non da un\'assunzione implicita', () => {
    const img = norm.match(/\[data-ds="v3"\] \.ds-parete \{[^}]*background-image: url\("([^"]+)"\)/)
    const svg = decodeURIComponent(img![1])
    expect(svg).toContain("<svg xmlns='http://www.w3.org/2000/svg' width='44' height='44' viewBox='0 0 44 44'>")
  })

  it('a 3 larghezze di content-box (390/768/1280 → shell 440/680/1080), --passo-maglia risolto CAMBIA davvero — un letterale fisso a 44 sarebbe rimasto costante e avrebbe divergito da questi valori: qui background-size lo segue per costruzione (var(), non calc separato)', () => {
    const mobile = resolvePasso(CONTENUTO_SHELL_PER_VIEWPORT.mobile)
    const tablet = resolvePasso(CONTENUTO_SHELL_PER_VIEWPORT.tablet)
    const desktop = resolvePasso(CONTENUTO_SHELL_PER_VIEWPORT.desktop)
    // il valore mobile risolto NON è 44 (44.88, il clamp reale) — un letterale 44px
    // sarebbe stato vicino ma comunque sbagliato anche qui
    expect(mobile).toBeCloseTo(44.88, 1)
    expect(mobile).not.toBe(44)
    // tablet e desktop clampano al tetto 50 — è il caso ESATTO misurato dal collaudo device
    // (25/07: "--track risolto a 220... anzi 250px ⇒ passo effettivo 50"), lo scarto rispetto
    // al vecchio letterale 44 è di 6px per riga, cumulativo riga dopo riga: lo screenshot.
    expect(tablet).toBe(50)
    expect(desktop).toBe(50)
    // la garanzia vera: qualunque sia il valore, background-size lo eredita per riferimento
    // (`var(--passo-maglia)`), quindi a QUALSIASI risoluzione i due combaciano per costruzione —
    // non serve un secondo calcolo duplicato da tenere sincronizzato a mano.
    expect(norm).toMatch(/background-size: var\(--passo-maglia\) var\(--passo-maglia\);/)
  })
})

describe('parete — G6: la relazione hook ≡ wire-center (mod passo) vale sui valori RISOLTI, a qualunque passo', () => {
  it('per n=0..3 righe, a passo risolto 40 / 44.88 / 50 (i 3 casi limite/misurati), il gancio cade SEMPRE su un filo vero — track = 5·passo garantisce n·track ≡ 0 (mod passo) per qualsiasi passo reale, non solo 44', () => {
    const wallPadTop = 24
    const hookAbove = 14
    const wireCenter = wallPadTop - hookAbove // 10 — non dipende dal passo (v. ds-v3.css)
    const EPS = 1e-9

    for (const passo of [40, resolvePasso(CONTENUTO_SHELL_PER_VIEWPORT.mobile), 50]) {
      const track = passo * 5
      for (let n = 0; n < 4; n++) {
        const hookN = wallPadTop - hookAbove + n * track
        const scarto = ((hookN - wireCenter) % passo + passo) % passo
        expect(scarto, `passo=${passo} n=${n}`).toBeLessThan(EPS)
      }
    }
  })

  it('il formula-testo che genera la garanzia (--track: calc(var(--passo-maglia) * 5)) resta accoppiato a --passo-maglia — se qualcuno lo ridichiara come letterale la garanzia sopra smette di generalizzare', () => {
    expect(norm).toMatch(/--track: calc\(var\(--passo-maglia\) \* 5\);/)
  })
})

describe('parete — G9-cornice: filo di bordo V1 «a filo dei bordi» (ratifica mockup 2026-07-25-rete-cornice-bordi.html)', () => {
  it('.ds-parete disegna un filo verticale a SINISTRA (::before) e a DESTRA (::after), 2px dal bordo, stesso linguaggio del filo verticale del pattern (gradiente marrone→bianco→marrone, wire-w, radius 1.5px, ombra leggera) — VERBATIM dalla variante .v1 del mockup, ECCETTO top/bottom: il mockup usava top:0/bottom:0 sotto `overflow:hidden` per tagliare il filo agli angoli arrotondati; qui (review FIX-H) il filo è invece INSET verticalmente di 18px — lo stesso raggio di border-radius di `.ds-parete` (riga ~649) — così il tratto dritto non attraversa MAI la curva dell\'angolo, senza bisogno di clippare l\'intero muro (che taglierebbe gancetti/ombre delle cassette, v. guardia sotto)', () => {
    expect(norm).toMatch(
      /\[data-ds="v3"\] \.ds-parete::before, \[data-ds="v3"\] \.ds-parete::after \{ content: ''; position: absolute; top: 18px; bottom: 18px; width: var\(--wire-w\); border-radius: 1\.5px; background: linear-gradient\(90deg, #5A4E38, #FFFFFD 50%, #5A4E38\); box-shadow: 0 0 2px rgba\(42, 34, 20, \.42\); pointer-events: none; \}/
    )
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete::before \{ left: 2px; \}/)
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-parete::after \{ right: 2px; \}/)
  })

  it('dark: stesso pseudo-elemento MA flat (rgba bianco trasparente, nessuna ombra — legge v3 dark=flat)', () => {
    expect(norm).toMatch(
      /\[data-theme="dark"\] \[data-ds="v3"\] \.ds-parete::before, \[data-theme="dark"\] \[data-ds="v3"\] \.ds-parete::after \{ background: rgba\(255, 255, 255, \.13\); box-shadow: none; \}/
    )
  })

  // Review FIX-H (24/07-25/07): `overflow: hidden` su `.ds-parete` (copiato da `.muro` del
  // mockup per clippare SOLO i due fili agli angoli) tagliava anche l'hardware vero delle
  // cassette che sporge oltre il bordo del tile — il gancetto `.ds-gancetto` (ds-v3.css ~375,
  // `top: calc(-1*var(--hook-above,14px) - 6px)`, 20px sopra il tile) con margine di sicurezza
  // misurato di soli 2px nel caso peggiore (shell padding-top clamp(22px,3.8cqw,28px) − 20px),
  // e la coda dell'ombra di riposo delle cassette in fondo (0 10px 18px -8px, ~20px verso il
  // basso, contro un padding minimo di 18px). Il commento di guardia già in ds-v3.css ~460
  // («Task 9 (D1)... un overflow:hidden lì taglierebbe il gancetto che sporge sopra il bordo»,
  // scritto per `.ds-cassetta`) descrive esattamente questo stesso pericolo, qui riapplicato per
  // errore un livello più in alto su `.ds-parete`. Fix: l'overflow è sparito, la clippatura degli
  // angoli è ora demandata all'inset verticale dei soli due fili (guardia sopra) — il fondo
  // muro resta comunque arrotondato da solo (`border-radius` clippa il proprio
  // background/bordo indipendentemente da `overflow`, v. rapporto fixH per la verifica).
  it('.ds-parete NON deve dichiarare overflow: hidden (regressione review FIX-H — tagliava gancetti/ombre, stesso pericolo del monito ds-v3.css ~460 su .ds-cassetta-cont)', () => {
    // su `nudo` (senza commenti), non su `norm`: v. la nota in testa al file, difetto A4a
    const bloccoBase = nudo.match(/\[data-ds="v3"\] \.ds-parete \{[^}]*\}/)
    expect(bloccoBase, 'blocco .ds-parete non trovato').toBeTruthy()
    expect(bloccoBase![0]).not.toMatch(/overflow: hidden/)
    // e il blocco isolato deve arrivare DAVVERO in fondo alla regola, non fermarsi a metà: se
    // domani si tronca, questa asserzione cade prima che quella negativa qui sopra passi a vuoto
    expect(bloccoBase![0], 'il blocco isolato di .ds-parete non arriva fino a background-color: ' +
      'si è troncato prima, quindi la guardia negativa qui sopra non sta più guardando tutto')
      .toMatch(/background-color: var\(--bg\);/)
  })

  it('la cornice è dichiarata sulla regola BASE .ds-parete (non scoped a .ds-parete-shell): vale sia sulla route /cassette standalone sia nel pannello embedded della home, che montano entrambe la stessa .ds-parete (PareteClient condivisa)', () => {
    expect(norm).not.toMatch(/\.ds-parete-shell \.ds-parete::before/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DECISIONE DI FRANCESCO, 26/07/2026 (gate estetico L2 §4.1) — «Avvicino le righe».
// Dal TABLET IN SU lo spazio riservato a ogni fila del muro scende da 5 a 4 maglie; sul
// TELEFONO resta 5. Il 5× nasceva da un tile che cresceva col contenuto (misurato 158px): l'H2
// di quest'ondata ha fissato la sagoma a `--altezza-cassetta` (height E min-height), quindi
// quel vincolo non esiste più — a 1280 il quinto passo spezzava il muro in strisce staccate.
//
// QUESTE GUARDIE NON RIDIGITANO NESSUN NUMERO DEL FOGLIO: moltiplicatori, passo, altezza della
// cassetta e zona del gancio si LEGGONO da `ds-v3.css`. Le uniche costanti scritte qui sono le
// larghezze di container MISURATE sulla build vera servita da :3020 il 26/07/2026 (banco
// `scripts/tmp/decisioni-bench.mjs`), che il foglio non può conoscere.
describe('parete — «avvicino le righe» dal tablet in su (decisione Francesco 26/07/2026)', () => {
  /** Il moltiplicatore di `--track` dichiarato in un blocco di regola, letto dal foglio. */
  function moltiplicatore(blocco: string, dove: string): number {
    const m = blocco.match(/--track: calc\(var\(--passo-maglia\) \* ([\d.]+)\)/)
    expect(m, `nessuna dichiarazione di --track in ${dove}`).toBeTruthy()
    return Number(m![1])
  }

  const bloccoBase = nudo.match(/\[data-ds="v3"\] \.ds-parete \{[^}]*\}/)?.[0] ?? ''
  const mediaTablet = nudo.match(/@media \(min-width: (\d+)px\) \{ \[data-ds="v3"\] \.ds-parete \{([^}]*)\} \}/)

  // altezza della cassetta: `--altezza-cassetta: calc(var(--altezza-fascia) + 60px)` con
  // `--altezza-fascia: 78px` — risolta qui leggendo entrambe, mai il 138 scritto a mano
  const fascia = Number(nudo.match(/--altezza-fascia: (\d+(?:\.\d+)?)px/)![1])
  const piu = Number(nudo.match(/--altezza-cassetta: calc\(var\(--altezza-fascia\) \+ (\d+(?:\.\d+)?)px\)/)![1])
  const ALTEZZA_CASSETTA = fascia + piu
  // zona riservata al gancio della fila sotto: `--hook-above` + la sovrapposizione linguetta
  // dichiarata in `.ds-gancetto { top: calc(-1 * var(--hook-above, 14px) - 6px) }`
  const hookAbove = Number(nudo.match(/--hook-above: (\d+(?:\.\d+)?)px/)![1])
  const sovrapposizione = Number(
    nudo.match(/\.ds-gancetto \{[^}]*top: calc\(-1 \* var\(--hook-above, \d+px\) - (\d+(?:\.\d+)?)px\)/)![1]
  )
  const ZONA_GANCIO = hookAbove + sovrapposizione

  // Container REALI (content-box della shell) misurati sulla build vera, 26/07/2026. Le due
  // superfici hanno container DIVERSI alla stessa larghezza di finestra: è il fatto che decide
  // la forma della soglia (v. la guardia sulla media query più sotto).
  const CASI = [
    { dove: '/cassette @390', finestra: 390, container: 350 },
    { dove: 'home/parete @390', finestra: 390, container: 350 },
    { dove: '/cassette @768', finestra: 768, container: 680 },
    { dove: 'home/parete @768', finestra: 768, container: 440 },
    { dove: '/cassette @1280', finestra: 1280, container: 1080 },
  ]

  it('la soglia è dichiarata, ed è una MEDIA query sul viewport', () => {
    expect(mediaTablet, 'nessuna @media che ridichiara --track su .ds-parete').toBeTruthy()
    expect(Number(mediaTablet![1]), 'la soglia deve essere il tablet dei 3 viewport obbligatori').toBe(768)
  })

  it('NON è una container query: le due pareti hanno container diversi alla stessa finestra (680 contro 440 a 768) e devono cambiare passo INSIEME', () => {
    expect(nudo).not.toMatch(/@container[^{]*\{[^{]*\.ds-parete \{[^}]*--track/)
  })

  it('entrambi i moltiplicatori restano INTERI: è tutto ciò da cui dipende la congruenza gancio↔filo (n·track ≡ 0 mod passo-maglia)', () => {
    const mFono = moltiplicatore(bloccoBase, 'la regola base .ds-parete')
    const mTablet = moltiplicatore(mediaTablet![2], 'la @media del tablet')
    expect(Number.isInteger(mFono), `il moltiplicatore del telefono (${mFono}) non è intero: il gancio non cade più su un filo`).toBe(true)
    expect(Number.isInteger(mTablet), `il moltiplicatore da tablet in su (${mTablet}) non è intero: il gancio non cade più su un filo`).toBe(true)
  })

  it('dal tablet in su le righe sono DAVVERO più vicine di quelle del telefono', () => {
    expect(moltiplicatore(mediaTablet![2], 'la @media del tablet'))
      .toBeLessThan(moltiplicatore(bloccoBase, 'la regola base .ds-parete'))
  })

  it('a nessun viewport il gancio della fila sotto viene schiacciato: oltre la zona del gancio resta sempre almeno altrettanta maglia visibile', () => {
    const mFono = moltiplicatore(bloccoBase, 'la regola base .ds-parete')
    const mTablet = moltiplicatore(mediaTablet![2], 'la @media del tablet')
    const soglia = Number(mediaTablet![1])
    for (const c of CASI) {
      const passo = resolvePasso(c.container)
      const track = (c.finestra >= soglia ? mTablet : mFono) * passo
      const libera = track - ALTEZZA_CASSETTA - ZONA_GANCIO
      expect(
        libera,
        `${c.dove}: oltre la zona del gancio (${ZONA_GANCIO}px) resterebbero ${libera.toFixed(2)}px ` +
          `di maglia — i gancetti della fila sotto sfiorano il fondo della cassetta sopra e la ` +
          `sensazione di «appeso» sparisce (è il difetto che il 5× era andato a correggere)`
      ).toBeGreaterThan(ZONA_GANCIO)
    }
  })

  it('sul TELEFONO non cambia nulla: stesso spazio fra le file di prima della decisione (42px di maglia libera, il valore che il gate ha misurato e ratificato)', () => {
    const mFono = moltiplicatore(bloccoBase, 'la regola base .ds-parete')
    const passo = resolvePasso(350) // container reale a 390, misurato
    expect(mFono * passo - ALTEZZA_CASSETTA - ZONA_GANCIO).toBe(42)
  })
})
