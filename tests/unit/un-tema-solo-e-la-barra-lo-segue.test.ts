/**
 * GUARDIA — «Un tema solo, e la barra lo segue»
 *
 * Il nome dichiara LA RELAZIONE, non l'indirizzo (regola lasciata al progetto il
 * 26/07/2026). Spec: docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md
 *
 * REGOLA CHE GOVERNA TUTTE LE ASSERZIONI DI QUESTO FILE:
 * nessun colore scritto a mano, tranne il rosso della pillola «Riprova».
 * Un expect(theme_color).toBe('#F4F0E7') resterebbe VERDE con la barra sbagliata
 * al prossimo cambio di fondo — ed e' esattamente il modo in cui la voce A5 si e'
 * riaperta: il backlog aveva conservato una conclusione al posto di una relazione.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { COLORE_BARRA } from '@/design-system/colore-barra-sistema'

const RADICE = process.cwd()
const leggi = (percorso: string) => readFileSync(resolve(RADICE, percorso), 'utf-8')

// Il rosso d'azione: UNICO colore letterale ammesso in questo file. Serve a far
// fallire RUMOROSAMENTE una sostituzione a tappeto del rosso, che porterebbe via
// anche i colori che significano «azione» invece di «tema».
const ROSSO_AZIONE = '#D90012'

describe('Il fondo è uno solo — tutte le sue copie coincidono', () => {
  // La decisione del 26/07 sul fondo unico non aveva NESSUNA guardia: questo
  // blocco la protegge di sponda, ed e' il presupposto di tutto il resto.
  const dsV3 = leggi('src/app/ds-v3.css')
  const globals = leggi('src/app/globals.css')
  const tokensV2 = leggi('src/design-system/tokens.ts')

  const chiari = () => [
    dsV3.match(/--bg:\s*(#[0-9A-Fa-f]{6})/)?.[1],
    globals.match(/--bg:\s*(#[0-9A-Fa-f]{6})/)?.[1],
    tokensV2.match(/bg:\s*'(#[0-9A-Fa-f]{6})'/)?.[1],
  ]

  const scuri = () => [
    dsV3.match(/--bg:\s*(#[0-9A-Fa-f]{6})[\s\S]*?--bg:\s*(#[0-9A-Fa-f]{6})/)?.[2],
    globals.match(/--bg:\s*(#[0-9A-Fa-f]{6})[\s\S]*?--bg:\s*(#[0-9A-Fa-f]{6})/)?.[2],
  ]

  it('il fondo chiaro è lo stesso in ds-v3.css, globals.css e nei token v2.3', () => {
    for (const valore of chiari()) expect(valore?.toUpperCase()).toBe(COLORE_BARRA.light.toUpperCase())
  })

  it('il fondo scuro è lo stesso in ds-v3.css e globals.css', () => {
    for (const valore of scuri()) expect(valore?.toUpperCase()).toBe(COLORE_BARRA.dark.toUpperCase())
  })
})

describe('manifest.json — il colore di avvio è il fondo', () => {
  const manifest = JSON.parse(leggi('public/manifest.json'))

  // theme_color e background_color si vedono INSIEME, sullo stesso fotogramma
  // dello splash. Il manifest porta un valore solo e non e' sensibile al tema
  // (w3c/manifest#975 ancora aperta): si sceglie il chiaro, e la conseguenza —
  // splash chiaro anche per chi usa il tema scuro — e' accettata a verbale.
  it('theme_color e background_color valgono entrambi il fondo chiaro', () => {
    expect(manifest.theme_color.toUpperCase()).toBe(COLORE_BARRA.light.toUpperCase())
    expect(manifest.background_color.toUpperCase()).toBe(COLORE_BARRA.light.toUpperCase())
  })
})

describe('offline.html — la schermata del momento peggiore', () => {
  const offline = leggi('public/offline.html')

  const metaTema = () => offline.match(/<meta\s+name="theme-color"\s+content="(#[0-9A-Fa-f]{6})"/)?.[1]
  const bloccoScuro = () =>
    offline.match(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{([\s\S]*?)\n\s*\}\s*\n/)?.[1] ?? ''

  // Si estrae DAL TAG, mai per numero di riga: i numeri di riga invecchiano al
  // primo inserimento e la guardia comincerebbe a misurare un'altra cosa.
  it('il theme-color è il fondo chiaro, non più il rosso', () => {
    expect(metaTema()?.toUpperCase()).toBe(COLORE_BARRA.light.toUpperCase())
  })

  it('il fondo della pagina è il fondo chiaro dell_app', () => {
    const fondo = offline.match(/body\s*\{[\s\S]*?background:\s*(#[0-9A-Fa-f]{6})/)?.[1]
    expect(fondo?.toUpperCase()).toBe(COLORE_BARRA.light.toUpperCase())
  })

  it('esiste il blocco scuro, e porta il fondo scuro dell_app', () => {
    const scuro = bloccoScuro()
    expect(scuro.length).toBeGreaterThan(0)
    expect(scuro).toMatch(new RegExp(COLORE_BARRA.dark, 'i'))
  })

  it('anche il theme-color segue il tema scuro', () => {
    // Il meta viene riscritto dallo script della pagina quando il tema e' scuro:
    // senza, la barra resterebbe chiara sopra una pagina scura.
    expect(offline).toMatch(new RegExp(COLORE_BARRA.dark, 'i'))
  })

  // TRAPPOLA IN POSITIVO: la pillola «Riprova» e' un colore d'AZIONE, non di tema.
  // Se un giorno qualcuno cambiasse i rossi a tappeto, questo test lo urla.
  it('la pillola «Riprova» è ANCORA rossa — è un colore d_azione, non di tema', () => {
    expect(offline).toMatch(new RegExp(`\\.retry[\\s\\S]*?background:\\s*${ROSSO_AZIONE}`, 'i'))
  })

  it('non dichiara più un font che non carica', () => {
    // Dichiarava 'DM Sans' senza alcun <link> ne' @font-face: una dichiarazione
    // che afferma il falso, e l_app monta Plus Jakarta Sans.
    expect(offline).not.toContain("'DM Sans'")
  })
})

describe('Censimento — chi dichiara un colore di barra', () => {
  // Insieme CHIUSO. Un quarto posto fa fallire il test col nome del file, che e'
  // la lezione letterale del residuo background_color: «i tre posti dichiarati
  // erano tre di quattro» (decisione sul fondo unico del 26/07).
  //
  // NOTA: colore-barra-sistema.ts NON e' in elenco, e non e' una dimenticanza.
  // Quel modulo FORNISCE i due valori, non DICHIARA un colore di barra: non
  // contiene ne' un tag ne' una proprieta'. Che i valori dello script vengano da
  // li' e' presidiato altrove (colore-barra-sistema.test.ts, «non contiene colori
  // scritti a mano»).
  const ATTESI = [
    'public/manifest.json',
    'public/offline.html',
    'src/components/layout/ThemeInitializer.tsx',
  ]

  it('sono esattamente tre, e sono quelli previsti', () => {
    const trovati: string[] = []

    const senzaCommenti = (sorgente: string) =>
      sorgente
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .split('\n')
        .map(riga => riga.replace(/\/\/.*$/, ''))
        .join('\n')

    function scandaglia(cartella: string): void {
      for (const voce of readdirSync(cartella)) {
        if (voce === 'node_modules' || voce === '.next') continue
        const percorso = join(cartella, voce)
        if (statSync(percorso).isDirectory()) {
          scandaglia(percorso)
        } else if (/\.(ts|tsx|json|html)$/.test(voce)) {
          const testo = readFileSync(percorso, 'utf-8')
          const codice = /\.(ts|tsx)$/.test(voce) ? senzaCommenti(testo) : testo
          if (/theme_color|themeColor|name="theme-color"/.test(codice)) {
            trovati.push(relative(RADICE, percorso))
          }
        }
      }
    }

    scandaglia(resolve(RADICE, 'src'))
    scandaglia(resolve(RADICE, 'public'))

    expect(trovati.sort()).toEqual(ATTESI.sort())
  })
})
