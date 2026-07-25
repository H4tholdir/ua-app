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
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

const srcHome = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')

/**
 * TUTTI i blocchi `<style>{`…`}</style>` di un sorgente, testo grezzo.
 * Cinque componenti ne portano più d'uno (Campo, CardLavoro — 3 a testa —, TileScelta,
 * CatalogoTipiSheet, PassoPaziente — 2): fermarsi al primo lascerebbe scoperti proprio i file più
 * densi di CSS inline, che sono anche quelli dove il difetto ha più occasioni di capitare.
 */
function blocchiStile(sorgente: string): string[] {
  const pezzi = sorgente.split('<style>{`').slice(1)
  expect(pezzi.length, 'nessun blocco <style> trovato nel sorgente').toBeGreaterThan(0)
  return pezzi.map((p) => p.split('`}</style>')[0])
}

/** Il primo blocco `<style>{`…`}</style>` di un sorgente. */
function bloccoStile(sorgente: string): string {
  return blocchiStile(sorgente)[0]
}

/** Tutti i sorgenti sotto `src/` che portano un blocco `<style>{`…`}</style>`. */
function sorgentiConStile(): string[] {
  const trovati: string[] = []
  const gira = (dir: string) => {
    for (const voce of readdirSync(dir)) {
      const percorso = join(dir, voce)
      if (statSync(percorso).isDirectory()) { gira(percorso); continue }
      if (!/\.(tsx|ts)$/.test(voce)) continue
      if (readFileSync(percorso, 'utf8').includes('<style>{`')) trovati.push(percorso)
    }
  }
  gira(join(process.cwd(), 'src'))
  return trovati.sort()
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

// ⚠️ Verifica finale d'ondata (26/07, difetto A4b) — QUESTO FILE ERA CABLATO SU UN FILE SOLO.
// Le tre funzioni qui sopra (`senzaCommenti`, `selettoriVivi`, `dichiarazioniDi`) sono già
// generiche: solo la lettura del sorgente era fissata a `HomeV3.tsx`. Ma il difetto che questo
// file esiste per incarnare — un `*/` scritto nella prosa di un commento, che chiude il commento
// in anticipo e INGHIOTTE la regola seguente — non ha niente di specifico della home: vive
// identico in ognuno dei sorgenti che portano un blocco `<style>{`…`}</style>`, e ce ne sono una
// trentina, `Cassetta.tsx` compreso — il componente che questa ondata ha riscritto di più.
// Ovunque succeda, il sorgente resta perfetto a leggerlo, quindi ogni guardia testuale `toMatch`
// su di esso passa serena mentre il browser ha buttato via la regola. Qui si passa a tappeto
// l'invariante più diretta sulla causa: dentro un blocco `<style>` i `/*` e i `*/` devono
// bilanciarsi. Il file non va elencato a mano: si scoprono da sé, così un componente nuovo è
// coperto dal giorno in cui nasce.
describe('ogni blocco <style> del progetto deve sopravvivere al parser CSS (difetto 1a, generalizzato)', () => {
  const sorgenti = sorgentiConStile()

  it('la scoperta dei sorgenti funziona ancora (se cade a zero, è il parser di questa guardia a essere rotto)', () => {
    expect(sorgenti.length).toBeGreaterThan(1)
    // i due che questa ondata ha toccato di più devono esserci per forza
    const relativi = sorgenti.map((f) => relative(process.cwd(), f))
    expect(relativi).toContain('src/components/features/home/HomeV3.tsx')
    expect(relativi).toContain('src/components/ds/Cassetta.tsx')
  })

  // un caso per BLOCCO, non per file: cinque componenti ne portano più d'uno (v. `blocchiStile`),
  // e un `*/` di troppo nel secondo blocco è invisibile a chi guarda solo il primo
  it.each(
    sorgentiConStile().flatMap((f) => {
      const relativo = relative(process.cwd(), f)
      return blocchiStile(readFileSync(f, 'utf8')).map((_, i) => [relativo, i] as const)
    }),
  )('%s (blocco #%i) — nessun commento del blocco <style> si chiude in anticipo dentro la prosa',
    (relativo, indice) => {
      const blocco = blocchiStile(readFileSync(join(process.cwd(), relativo), 'utf8'))[indice]
      const aperture = blocco.match(/\/\*/g)?.length ?? 0
      const chiusure = blocco.match(/\*\//g)?.length ?? 0
      expect(chiusure, `${relativo}, blocco <style> #${indice}: commenti sbilanciati — ` +
        `${aperture} aperture, ${chiusure} chiusure. Un \`*/\` scritto nella prosa di un commento ` +
        'lo chiude in anticipo: il testo che segue viene letto come selettore fino alla prima `{` ' +
        'e INGHIOTTE la regola dopo. Nel sorgente si continua a vedere tutto, quindi nessuna ' +
        'guardia `toMatch` se ne accorge.')
        .toBe(aperture)
    },
  )

  it('i file con PIÙ blocchi <style> sono coperti tutti, non solo il primo', () => {
    // guardia della guardia: se un domani `blocchiStile` tornasse a fermarsi al primo blocco,
    // i casi qui sopra scenderebbero in silenzio da «uno per blocco» a «uno per file»
    const conPiuBlocchi = sorgentiConStile()
      .map((f) => ({ f: relative(process.cwd(), f), n: blocchiStile(readFileSync(f, 'utf8')).length }))
      .filter((x) => x.n > 1)
    expect(conPiuBlocchi.length,
      'nessun sorgente con più di un blocco <style>: o il progetto è cambiato, o `blocchiStile` ' +
      'ha smesso di trovarli tutti — in entrambi i casi va guardato, non ignorato')
      .toBeGreaterThan(0)
  })
})
