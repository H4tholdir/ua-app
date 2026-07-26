// Il muro arriva fino in fondo ANCHE NELLA HOME — collaudo PWA installata, 26/07/2026.
//
// PERCHÉ ESISTE QUESTA GUARDIA, VISTO CHE CE N'ERA GIÀ UNA.
// `parete-fino-in-fondo.test.ts` presidia l'interno del muro e un livello sopra (la shell), e
// legge SOLO `src/app/ds-v3.css`. Non poteva prendere questo difetto per due motivi strutturali:
//   1. la regola colpevole vive in un blocco `<style>` dentro `HomeV3.tsx` — un file che quella
//      guardia non apre nemmeno;
//   2. «il muro arriva fino in fondo» non è una proprietà del muro: è una proprietà dell'INTERA
//      catena di antenati fino al bordo della finestra. Una guardia che dimostra una premessa
//      sbagliata è peggio di nessuna guardia, perché dà la sensazione della copertura.
//
// IL DIFETTO (misurato sul banco riproducendo il percorso di Francesco: icona → home → linguetta
// → parete → fondo scroll, 375×755 dpr 3.25). `/cassette` è UN indirizzo e TRE superfici:
//   1. rotta standalone `(app)/cassette/page.tsx` .................. muro a filo, 0 px ✅
//   2. stanza «parete» del pager (il pager fa `pushState('/cassette')`:
//      l'indirizzo cambia, il documento resta la HOME) ............. mancavano 19,4 px ❌
//   3. forma «solo parete» (`HomeV3.tsx`, preferenza utente) ....... stessi px + 24px per lato ❌
// CAUSA: `.ua-home { padding: clamp(12px, 2.6cqh, 24px) 24px }` — il respiro verticale vale anche
// in fondo e la stanza parete ci sta dentro. Quadro chiuso all'aritmetica: 19,63px dichiarati
// contro 19,38px di buco misurato, ed `elementFromPoint` risponde `.ua-home` a 1 e 8px dal bordo.
//
// PERCHÉ IL RIMEDIO HA QUESTA FORMA (panel advisor 26/07, 3 prospettive concordi):
//  · «azzerare il padding quando la parete è attiva» è SCARTATO: `.corpo` è `container-type: size`
//    e su di lui risolvono tutti i `cqh` della stanza pile — cambiarlo ricalcolerebbe gap, padding
//    e corpo dei numeri ALLA SOGLIA 0.6 dell'IntersectionObserver, cioè a metà swipe.
//  · il margine negativo va su `.ua-stanze` CON un padding compensativo su `.corpo`, perché sotto
//    768px `.corpo` è `overflow-y: auto` (HomeV3.tsx) e quindi i bordi che clippano sono DUE, non
//    uno. La compensazione tiene il content box di `.corpo` IDENTICO a prima: la scala fluida
//    delle pile non si muove di un centesimo.
//  · il token è in `svh` e non in `cqh`: una custom property che contiene `cqh` si RI-RISOLVE su
//    ogni elemento che la legge (su `.ua-stanze` darebbe 18,61 invece di 19,63 — un pixel di
//    scarto silenzioso). Oggi il `cqh` di `.ua-home` ricade già sul viewport piccolo perché non ha
//    container antenato, quindi lo scambio è un no-op numerico e immunizza il valore per il futuro.
//  · lo schema è lo STESSO già ratificato per l'asse orizzontale (`.ua-home.is-stanze` azzera,
//    `.ua-stanza` restituisce, `[data-stanza="parete"]` non prende) — ruotato di 90°.
//
// 🛑 QUESTA GUARDIA È UN LINT DEL SORGENTE, non una misura. La verità geometrica si controlla in
// un motore di layout (`scripts/tmp/repro-striscia-home.mjs` e il collaudo su device); qui si
// presidia che le dichiarazioni che PRODUCONO quella geometria restino al loro posto e che
// nessuno reintroduca un inset inferiore letterale lungo la catena.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const home = readFileSync(join(process.cwd(), 'src/components/features/home/HomeV3.tsx'), 'utf8')
const dsv3 = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')

/** Il CSS del blocco `<style>` di HomeV3 (dove vive la regola che ha causato il difetto). */
const cssHome = (() => {
  const i = home.indexOf('<style>{`')
  expect(i, 'blocco <style> di HomeV3.tsx non trovato').toBeGreaterThan(-1)
  return home.slice(i, home.indexOf('`}</style>', i))
})()

/** Il corpo della regola `<selettore> { … }` nel CSS dato, commenti rimossi. */
function regola(css: string, selettore: string): string {
  const senzaCommenti = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const re = new RegExp(`(^|[\\s,}])${selettore.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`, 'm')
  const m = senzaCommenti.match(re)
  expect(m, `regola \`${selettore}\` non trovata`).not.toBeNull()
  const i = senzaCommenti.indexOf('{', m!.index!)
  return senzaCommenti.slice(i + 1, senzaCommenti.indexOf('}', i))
}

describe('Home — il muro arriva fino in fondo anche nella stanza parete (26/07/2026)', () => {
  it('il respiro verticale del frame vive in UN token, e in `svh` — mai `cqh`', () => {
    const r = regola(cssHome, '.ua-home')
    expect(r, 'il token `--ua-pad-v` deve essere dichiarato su `.ua-home`').toMatch(/--ua-pad-v\s*:/)
    const token = r.match(/--ua-pad-v\s*:\s*([^;]+);/)![1]
    expect(token, 'il token deve usare `svh`: con `cqh` si ri-risolve su ogni lettore e sfasa di 1px')
      .toMatch(/svh/)
    expect(token, 'il token NON deve contenere `cqh`').not.toMatch(/cqh/)
    expect(r.match(/[^-]padding:\s*([^;]+);/)![1], 'il padding del frame deve leggere il token, non un numero')
      .toMatch(/var\(--ua-pad-v\)/)
  })

  it('nella forma pager il frame non tiene più il respiro in fondo, e lo restituisce a `.corpo`', () => {
    expect(regola(cssHome, '.ua-home.is-stanze'), '`.ua-home.is-stanze` deve azzerare il padding in fondo')
      .toMatch(/padding-bottom:\s*0\s*;/)
    expect(regola(cssHome, '.ua-home.is-stanze .corpo'), '`.corpo` deve riprendere il respiro come padding')
      .toMatch(/padding-bottom:\s*var\(--ua-pad-v\)\s*;/)
  })

  it('il margine negativo sta su `.ua-stanze` e annulla ESATTAMENTE il padding di `.corpo`', () => {
    // Sotto 768px `.corpo` è `overflow-y: auto`: se il margine non fosse compensato da un padding
    // dello stesso identico valore, resterebbe uno scroll verticale spurio sul frame della home.
    expect(regola(cssHome, '.ua-home.is-stanze .ua-stanze'))
      .toMatch(/margin-bottom:\s*calc\(\s*-1\s*\*\s*var\(--ua-pad-v\)\s*\)\s*;/)
  })

  it('la stanza PILE riprende il respiro — altrimenti il TastoPiù finisce a filo della barra gesture', () => {
    // Il piede ha come unico stacco `env(safe-area-inset-bottom)`, che sul device di Francesco
    // MISURA 0 (PWA installata, 26/07): senza questo padding il bottone fisico toccherebbe la
    // barra dei gesti di Android. Riaprirebbe il fix T15/1a.
    expect(regola(dsv3, '.ua-stanza[data-stanza="pile"]'))
      .toMatch(/padding-bottom:\s*var\(--ua-pad-v\)\s*;/)
  })

  it('la forma «solo parete» azzera il frame su TUTTI i lati, come la rotta standalone', () => {
    // Quella forma non ha `is-stanze`, quindi non prende nessuna delle regole sopra: senza una
    // sua regola resterebbe con i 19,6px sotto E 24px di inset per lato che `/cassette` non paga.
    expect(regola(cssHome, '.ua-home.is-parete-sola')).toMatch(/padding:\s*0\s*;/)
    // Non basta che la stringa compaia: deve comparire NEL RAMO GIUSTO. Qui non c'è un harness di
    // render per HomeV3 (tutte le guardie della home sono lint del sorgente), quindi si presidia
    // l'espressione: la classe deve essere legata a `vista.stanza === 'parete'`, non appesa altrove.
    const className = home.match(/className=\{`ua-home ua-home-mobile\$\{([\s\S]*?)`\}>/)?.[1]
    expect(className, 'espressione della className di `.ua-home` non trovata').toBeDefined()
    expect(className!.replace(/\s+/g, ' '), 'la forma «solo parete» deve essere l’unica a prendere `is-parete-sola`')
      .toMatch(/vista\.stanza === 'parete' \? ' is-parete-sola'/)
    expect(className!, 'la forma pager deve continuare a prendere `is-stanze`').toMatch(/is-stanze/)
  })

  it('nessun inset inferiore LETTERALE lungo la catena fino al muro', () => {
    // È il modo in cui il difetto è entrato: un numero in fondo a uno shorthand, su un antenato
    // che nessuno stava guardando. L'unico inset inferiore ammesso lungo la catena è la coppia
    // sanzionata sopra, espressa col token.
    const catena: Array<[string, string]> = [
      ['.ua-home.is-stanze', cssHome],
      ['.ua-home.is-stanze .corpo', cssHome],
      ['.ua-home.is-stanze .ua-stanze', cssHome],
      ['.ua-stanza[data-stanza="parete"]', dsv3],
      ['.ua-stanza-parete-scroll', dsv3],
    ]
    for (const [sel, css] of catena) {
      const r = regola(css, sel)
      const inset = r.match(/(?:padding|margin)-bottom:\s*([^;]+);/)?.[1]
      if (inset && !/^0$/.test(inset.trim())) {
        expect(inset, `\`${sel}\` porta un inset inferiore letterale: deve venire dal token`)
          .toMatch(/var\(--ua-pad-v\)/)
      }
    }
  })

  it('il respiro d’ombra G2a resta DENTRO lo scroller delle pile, non si confonde col token', () => {
    // Trappola per chi verrà dopo: i 36px sono il respiro dell'ombra dell'ultima pila e devono
    // stare dentro `.ua-stanza-pile-scroll` (fix R2/R3 + G2a). Il token del frame sta invece FUORI
    // dallo scroller, su `.ua-stanza[data-stanza="pile"]`. Scambiarli di posto riapre G2a.
    expect(regola(dsv3, '.ua-stanza-pile-scroll'), 'i 36px d’ombra devono restare nello scroller')
      .toMatch(/36px/)
    expect(regola(dsv3, '.ua-stanza[data-stanza="pile"]'), 'il padding del frame non è il respiro d’ombra')
      .not.toMatch(/36px/)
  })
})
