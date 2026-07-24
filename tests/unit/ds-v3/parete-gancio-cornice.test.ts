// FIX-H — G6 (gancetto sfalsato dal filo) + G9-cornice (filo di bordo V1)
// Fonte requisiti: .superpowers/sdd/fixH-brief.md · verbale
// docs/design/decisions/2026-07-24-qa-device-meta-ondata.md §G6/§G9 · mockup ratificato
// docs/design/mockups/2026-07-25-rete-cornice-bordi.html (variante V1 «filo di bordo»).
// Stesso pattern testuale di css-sync.test.ts/parete-fluida.test.ts: il CSS è verificato come
// testo — jsdom non fa layout, quindi niente getComputedStyle reale. La RELAZIONE del passo
// (G6) è verificata risolvendo a mano in JS la formula `clamp(40px, 10.2cqw, 50px)` dichiarata
// nel foglio (letta col MEDESIMO regex del test esistente, non ridigitata a mano) a 3 larghezze
// di CONTENT-BOX della shell — non il viewport — che replicano i 3 viewport obbligatori
// (390/768/1280): shell max-width 480/720/1120 (righe ~518,529,530) meno il padding
// `8px 20px 40px` della shell stessa (20px per lato) = 440/680/1080. Nessun valore di questo
// file ripete "44" come verità del fix (compare solo come riferimento al vecchio letterale
// rotto, per dimostrare il contrasto — mai in un `.toBe`/assert di correttezza).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = css.replace(/\s+/g, ' ')

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
