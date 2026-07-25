// Verifica finale wave H (verbale `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`,
// APPEND 26/07, difetto 1a) — «il tasto nuovo lavoro non è più centrato».
//
// ROOT CAUSE PROVATA (parser del browser, non ipotesi): il blocco `<style>` di `HomeV3.tsx`
// conteneva, DENTRO un commento CSS, la sequenza `--piede-*/--piede-ingombro`. Quel `*/`
// chiude il commento in anticipo: il testo residuo viene letto come selettore fino alla prima
// `{`, e INGHIOTTE la regola `.ua-home .foot` che segue. Misurato dando lo stesso testo al
// parser del browser: 7 regole valide con il commento com'era (regola `.foot` ASSENTE dal
// CSSOM) contro 8 con il solo `*/` neutralizzato (regola PRESENTE). Effetto a schermo:
// `.foot` computava `display:block`/`align-items:normal` invece di `flex`/`center`, e il
// TastoPiù cadeva 114,3px a sinistra del centro del viewport.
//
// PERCHÉ I TEST ESISTENTI NON L'HANNO PRESO (la lezione che questo file incarna): le guardie
// di `home-fluida.test.tsx` & co. fanno `toMatch` sul SORGENTE GREZZO. Una regola inghiottita
// da un commento rotto è ancora perfettamente presente nel testo sorgente — quindi ogni
// guardia testuale la trova e passa, mentre il browser l'ha buttata via. L'unico modo di
// vedere il difetto è SIMULARE LA RIMOZIONE DEI COMMENTI come fa un parser CSS (primo `*/`
// che chiude, nessun annidamento) e cercare le regole in ciò che RESTA.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const srcHome = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')

/** Il blocco `<style>{`…`}</style>` di HomeV3, testo grezzo. */
function bloccoStile(sorgente: string): string {
  const dopo = sorgente.split('<style>{`')[1]
  expect(dopo, 'blocco <style> di HomeV3 non trovato').toBeDefined()
  return dopo.split('`}</style>')[0]
}

/**
 * Rimuove i commenti CSS con la semantica REALE del parser: `/*` apre, il PRIMO `* /`
 * successivo chiude, i commenti NON si annidano. È esattamente il punto in cui un `* /`
 * scritto per sbaglio dentro la prosa fa saltare tutto ciò che segue.
 */
function senzaCommenti(css: string): string {
  let fuori = ''
  let i = 0
  while (i < css.length) {
    const apre = css.indexOf('/*', i)
    if (apre === -1) { fuori += css.slice(i); break }
    fuori += css.slice(i, apre)
    const chiude = css.indexOf('*/', apre + 2)
    if (chiude === -1) break // commento mai chiuso: da lì in poi il parser ignora tutto
    i = chiude + 2
  }
  return fuori
}

/** I selettori che aprono davvero una regola nel CSS ripulito dai commenti. */
function selettoriVivi(cssRipulito: string): string[] {
  const selettori: string[] = []
  const re = /([^{}]+)\{[^{}]*\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cssRipulito)) !== null) {
    selettori.push(m[1].replace(/\s+/g, ' ').trim())
  }
  return selettori
}

/** Le dichiarazioni della prima regola il cui selettore è esattamente `selettore`. */
function dichiarazioniDi(cssRipulito: string, selettore: string): string | null {
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(cssRipulito)) !== null) {
    if (m[1].replace(/\s+/g, ' ').trim() === selettore) return m[2].replace(/\s+/g, ' ').trim()
  }
  return null
}

describe('HomeV3 — il blocco <style> deve sopravvivere al parser CSS (difetto 1a, 26/07)', () => {
  const ripulito = senzaCommenti(bloccoStile(srcHome))

  it('nessun commento del blocco si chiude in anticipo dentro la prosa', () => {
    // Invariante diretta sulla causa: dentro un commento non può comparire una sequenza
    // che lo chiuda prima della sua fine voluta. Si controlla contando: ogni `/*` deve
    // avere il proprio `*/` e i due conteggi devono coincidere — se un `*/` di troppo
    // vive nella prosa, i `*/` superano i `/*`.
    const blocco = bloccoStile(srcHome)
    const aperture = blocco.match(/\/\*/g)?.length ?? 0
    const chiusure = blocco.match(/\*\//g)?.length ?? 0
    expect(chiusure, `commenti sbilanciati: ${aperture} aperture, ${chiusure} chiusure — ` +
      'un `*/` scritto nella prosa di un commento chiude il commento in anticipo e ' +
      'inghiotte la regola CSS che segue').toBe(aperture)
  })

  it('la regola `.ua-home .foot` esiste ancora dopo la rimozione dei commenti', () => {
    expect(selettoriVivi(ripulito)).toContain('.ua-home .foot')
  })

  it('il piede resta una colonna centrata — il TastoPiù al centro del viewport', () => {
    const d = dichiarazioniDi(ripulito, '.ua-home .foot')
    expect(d, 'regola `.ua-home .foot` inghiottita dal parser').not.toBeNull()
    expect(d).toMatch(/display: *flex/)
    expect(d).toMatch(/flex-direction: *column/)
    expect(d).toMatch(/align-items: *center/)
    // il respiro sotto (safe-area) viveva nella stessa regola: se la regola muore, muore anche
    expect(d).toMatch(/padding-bottom: *env\(safe-area-inset-bottom\)/)
  })

  it('tutte le regole portanti della home sopravvivono, non solo il piede', () => {
    const vivi = selettoriVivi(ripulito)
    for (const atteso of ['.ua-home', '.ua-home .corpo', '.ua-home .pile', '.ua-home .striscia-slot']) {
      expect(vivi, `regola \`${atteso}\` persa dal parser`).toContain(atteso)
    }
  })
})
