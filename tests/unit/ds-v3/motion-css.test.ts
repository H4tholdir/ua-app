// Verifica finale d'ondata (26/07, difetto A7) — I TEMPI DELLE ANIMAZIONI STANNO IN UN POSTO SOLO.
//
// CAUSA: `ds-v3.css` conteneva l'unica `transition:` del foglio, sul gancetto della cassetta, con
// la curva scritta a mano — `200ms cubic-bezier(0.25, 0.1, 0.25, 1)`, identica byte per byte a
// `cssEase.generico` di `src/design-system/v3/motion.ts`. Il commento accanto lo diceva pure, ma
// dirlo non è tenerlo: cambiare il token in motion.ts avrebbe lasciato quella curva al valore
// vecchio, in silenzio, e nessuno sarebbe andato a controllare un foglio con una sola transizione.
// È esattamente la «REGOLA MOTION — ASSOLUTA» del progetto (CLAUDE.md §4: mai duration/easing
// inventate, sempre da token) applicata al confine CSS↔TS, dove finora non era presidiata.
//
// FIX: il foglio pubblica `--ease-generico` su `[data-ds="v3"]` e la transizione la referenzia.
// Questa guardia confronta la STRINGA della variabile CSS con la STRINGA del token TS: se i due
// divergono, è rossa qui, prima del browser.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cssEase } from '@/design-system/v3/motion'

const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const nudo = css.replace(/\/\*[\s\S]*?\*\//g, '')

describe('ds-v3.css ↔ v3/motion.ts — le curve non si ricopiano a mano', () => {
  it('--ease-generico è ESATTAMENTE cssEase.generico, non una copia che gli somiglia', () => {
    const dichiarazioni = [...nudo.matchAll(/--ease-generico: *([^;]+);/g)].map((m) => norm(m[1]))
    expect(dichiarazioni.length,
      '`--ease-generico` deve essere dichiarata una volta sola in ds-v3.css, trovate ' +
      `${dichiarazioni.length}`).toBe(1)
    expect(dichiarazioni[0]).toBe(norm(cssEase.generico))
  })

  it('la transizione del gancetto passa dalla variabile, non da un letterale', () => {
    const blocco = nudo.match(/\[data-ds="v3"\] \.ds-gancetto \{[^}]*\}/)
    expect(blocco, 'blocco .ds-gancetto non trovato').toBeTruthy()
    expect(blocco![0]).toMatch(/transition: transform var\(--ease-generico\);/)
  })

  it('nessuna `transition` del foglio scrive a mano una curva o una durata', () => {
    // Il perimetro è tutto il foglio, non solo il gancetto: la lezione vale per la PROSSIMA
    // transizione che qualcuno aggiungerà qui, non solo per quella che c'era.
    // UNICA esenzione, e dichiarata: i blocchi `@media (prefers-reduced-motion: reduce)`. Lì il
    // `transition-duration: 0.15s !important` non è una curva di design da tenere in sincronia col
    // token — è la clamp di accessibilità che ACCORCIA tutto quanto, per definizione slegata dai
    // tempi scelti per le coreografie. Si toglie il blocco intero (graffe annidate incluse) prima
    // di guardare, invece di allentare il criterio per tutti.
    const senzaReducedMotion = (() => {
      let testo = nudo
      for (;;) {
        const inizio = testo.indexOf('@media (prefers-reduced-motion: reduce)')
        if (inizio === -1) return testo
        let i = testo.indexOf('{', inizio)
        let livello = 0
        for (; i < testo.length; i++) {
          if (testo[i] === '{') livello++
          else if (testo[i] === '}' && --livello === 0) break
        }
        testo = testo.slice(0, inizio) + testo.slice(i + 1)
      }
    })()
    const transizioni = [...senzaReducedMotion.matchAll(/(?:^|[;{}]\s*)transition(?:-timing-function|-duration)?: *([^;}]+)/g)]
      .map((m) => norm(m[1]))
      .filter((v) => v !== 'none')
    for (const v of transizioni) {
      expect(v, `\`transition: ${v}\` scrive a mano tempi/curva: i valori vanno da ` +
        '`cssEase` (v3/motion.ts), pubblicati come custom property e referenziati con var()')
        .not.toMatch(/cubic-bezier|\d+m?s\b/)
    }
  })
})

describe('ds-v3.css — reduced-motion: il gancetto si dissolve, non si sposta (difetto A7)', () => {
  it('esiste una regola reduced-motion che neutralizza il transform dello staccato', () => {
    expect(norm(nudo)).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{ \[data-ds="v3"\] \.ds-gancetto\.is-staccato \{ transform: translateX\(-50%\); \} \}/
    )
  })

  it('quella regola sta DOPO la regola che deve neutralizzare, o non vincerebbe mai', () => {
    // Stessa specificità (0,3,0): a parità, decide l'ordine di sorgente. Messa insieme alle altre
    // regole reduced-motion in cima al foglio non farebbe assolutamente nulla — è il motivo per
    // cui vive staccata dal blocco globale, subito sotto `.is-staccato`.
    const staccato = nudo.indexOf('[data-ds="v3"] .ds-gancetto.is-staccato {')
    const neutralizza = nudo.search(/@media \(prefers-reduced-motion: reduce\) \{\s*\[data-ds="v3"\] \.ds-gancetto\.is-staccato/)
    expect(staccato, 'regola .ds-gancetto.is-staccato non trovata').toBeGreaterThan(-1)
    expect(neutralizza, 'regola reduced-motion del gancetto non trovata').toBeGreaterThan(-1)
    expect(neutralizza,
      'la regola reduced-motion del gancetto sta PRIMA di quella che deve neutralizzare: a parità ' +
      'di specificità vince l\'ultima scritta, quindi così non fa nulla').toBeGreaterThan(staccato)
  })
})
