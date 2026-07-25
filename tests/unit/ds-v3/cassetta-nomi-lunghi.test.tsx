// Nomi lunghi sulla parete — variante 6 «la combinata», la MACCHINA A STATI dentro Cassetta.tsx
// (mockup ratificato `docs/design/mockups/2026-07-26-nomi-lunghi-cassetta.html` §6, verbale
// `docs/design/decisions/2026-07-26-nomi-lunghi-variante6.md`).
//
// jsdom non impagina: `scrollHeight`/`clientHeight` valgono 0 e nessun testo va mai a capo da
// solo. Qui l'impaginazione è quindi un ORACOLO ESPLICITO — la tabella `RIGHE_MISURATE` non è
// inventata: sono le righe MISURATE in Chromium reale sulla parete a 390px (dent 71,33px,
// `scripts/tmp/nomi-lunghi-v6-misure.mjs`, esito salvato in `nomi-lunghi-v6-*.json`, DPR
// 1/2,75/3 concordi). Il test dimostra una cosa sola, ma la dimostra per davvero: DATA quella
// impaginazione, il componente sceglie il gradino giusto e accende la sfumatura solo quando la
// scala è finita. La fedeltà tipografica (quante righe occupa un nome) la prova il browser, non
// questo file.
import { describe, expect, it, afterEach, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Cassetta } from '@/components/ds/Cassetta'

// ————— l'oracolo: righe occupate dal testo, misurate in browser a 390px (dent 71,33px) —————
// chiave: `${testo}@${corpoPx}`
const RIGHE_MISURATE = new Map<string, number>([
  ['STUDI MEDICI DI SANTI GIUSEPPE@10', 3],
  ['STUDI MEDICI DI SANTI GIUSEPPE@9.5', 3],
  ['STUDI MEDICI DI SANTI GIUSEPPE@9', 2],
  ['DI SANTI GIUSEPPE@10', 2],
  ['DI SANTI CATERINA@10', 2],
  ['BARALE S.A.S.@10', 1],
  ['C.O.M. s.r.l. uninominale@10', 2],
  ['CENTRO ODONTOIATRICO SANTA MARIA@10', 4],
  ['CENTRO ODONTOIATRICO SANTA MARIA@9.5', 4],
  ['CENTRO ODONTOIATRICO SANTA MARIA@9', 3],
  ['SANTA MARIA@10', 1],
  ['SANTA MARIA@9.5', 1],
  ['SANTA MARIA@9', 1],
  ['STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO@10', 5],
  ['STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO@9.5', 5],
  ['STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO@9', 5],
  ['GIANCARLO POLIAMBULATORIO@10', 3],
  ['GIANCARLO POLIAMBULATORIO@9.5', 3],
  ['GIANCARLO POLIAMBULATORIO@9', 3],
  ['Bianchi@10', 1],
])

// Override dell'oracolo, vivo solo dentro un test: serve a chi simula il PASSAGGIO dalle
// metriche del font di ripiego a quelle del font vero (I3) — la stessa stringa allo stesso
// corpo occupa un numero di righe DIVERSO prima e dopo il caricamento. Stessa chiave
// `${testo}@${corpo}`, precedenza sulla tabella misurata. Svuotato in `afterEach`.
const righeOverride = new Map<string, number>()

function corpoDi(el: Element): number {
  if (el.classList.contains('is-corpo-9')) return 9
  if (el.classList.contains('is-corpo-95')) return 9.5
  return 10
}
function righeDi(el: Element): number {
  const chiave = `${(el.textContent ?? '').trim()}@${corpoDi(el)}`
  const righe = righeOverride.get(chiave) ?? RIGHE_MISURATE.get(chiave)
  if (righe === undefined) throw new Error(`oracolo mancante per «${chiave}» — misurarlo in browser prima di usarlo qui`)
  return righe
}
const èDent = (el: Element) => el.classList?.contains('ds-cassetta-dent')

const originaleGetComputedStyle = window.getComputedStyle
let descrittoriOriginali: { scroll?: PropertyDescriptor; client?: PropertyDescriptor } = {}

beforeEach(() => {
  // line-height 1.16 (regola base) × corpo del gradino — la stessa aritmetica del foglio.
  window.getComputedStyle = ((el: Element, pseudo?: string | null) => {
    if (el instanceof Element && èDent(el)) {
      return { lineHeight: `${1.16 * corpoDi(el)}px`, fontSize: `${corpoDi(el)}px` } as CSSStyleDeclaration
    }
    return originaleGetComputedStyle(el as Element, pseudo)
  }) as typeof window.getComputedStyle

  descrittoriOriginali = {
    scroll: Object.getOwnPropertyDescriptor(Element.prototype, 'scrollHeight'),
    client: Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight'),
  }
  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get(this: Element) {
      if (!èDent(this)) return 0
      return Math.round(righeDi(this) * 1.16 * corpoDi(this))
    },
  })
  Object.defineProperty(Element.prototype, 'clientHeight', {
    configurable: true,
    get(this: Element) {
      // il budget è 2 righe esatte a QUALUNQUE corpo: `max-height: calc(2 * 1.16em)` è in em,
      // quindi segue il font-size del gradino (verificato in browser: 23,2 / 22,04 / 20,88px).
      if (!èDent(this)) return 0
      return Math.round(Math.min(righeDi(this), 2) * 1.16 * corpoDi(this))
    },
  })
})

afterEach(() => {
  window.getComputedStyle = originaleGetComputedStyle
  if (descrittoriOriginali.scroll) Object.defineProperty(Element.prototype, 'scrollHeight', descrittoriOriginali.scroll)
  if (descrittoriOriginali.client) Object.defineProperty(Element.prototype, 'clientHeight', descrittoriOriginali.client)
  righeOverride.clear()
})

const base = { numero: '144', descrizione: 'corona zirconia', tipoDispositivo: 'protesi_fissa', paziente: 'PZ-0144', pazienteAlias: 'Mario Rossi' }
function renderizza(dentista: string) {
  render(<Cassetta id="c1" nome="C12" colore="rossa" lavoro={{ ...base, dentista }} stato="normale" onTap={() => {}} />)
  const btn = screen.getByRole('button')
  const dent = btn.querySelector('.ds-cassetta-dent') as HTMLElement
  return { btn, dent }
}

describe('variante 6 — 1. il nome che ci sta in 2 righe non si tocca (comportamento di oggi, invariato)', () => {
  it('«DI SANTI CATERINA» (2 righe piene): corpo pieno, nessuna sfumatura, testo intero', () => {
    const { dent } = renderizza('DI SANTI CATERINA')
    expect(dent.textContent).toBe('DI SANTI CATERINA')
    expect(dent.className).toBe('ds-cassetta-dent is-due-righe')
    expect(dent.getAttribute('title')).toBeNull()
  })

  it('«BARALE S.A.S.» (1 riga): nessuna classe, nessuna sfumatura', () => {
    const { dent } = renderizza('BARALE S.A.S.')
    expect(dent.textContent).toBe('BARALE S.A.S.')
    expect(dent.className).toBe('ds-cassetta-dent')
  })

  it('«C.O.M. s.r.l. uninominale» (2 righe piene): intero, corpo pieno', () => {
    const { dent } = renderizza('C.O.M. s.r.l. uninominale')
    expect(dent.textContent).toBe('C.O.M. s.r.l. uninominale')
    expect(dent.classList.contains('is-corpo-95')).toBe(false)
    expect(dent.classList.contains('is-corpo-9')).toBe(false)
    expect(dent.classList.contains('is-troncato')).toBe(false)
  })
})

describe('variante 6 — 2. non ci sta: prima si scende di corpo, e ci si ferma al primo che entra', () => {
  it('«STUDI MEDICI DI SANTI GIUSEPPE»: resta INTERO, scende fino a 9px (3 righe a 10 e 9,5 — misurato), niente sfumatura', () => {
    const { dent, btn } = renderizza('STUDI MEDICI DI SANTI GIUSEPPE')
    expect(dent.textContent).toBe('STUDI MEDICI DI SANTI GIUSEPPE')
    expect(dent.classList.contains('is-corpo-9')).toBe(true)
    expect(dent.classList.contains('is-corpo-95')).toBe(false)
    expect(dent.classList.contains('is-troncato')).toBe(false)
    expect(dent.classList.contains('is-due-righe')).toBe(true)
    // il nome a database non si tocca MAI: resta per intero nell'etichetta letta dagli screen reader
    expect(btn.getAttribute('aria-label')).toContain('STUDI MEDICI DI SANTI GIUSEPPE')
  })

  it('non si scende MAI sotto 9px: nessun gradino inferiore esiste', () => {
    const { dent } = renderizza('STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO')
    // 5 righe a ogni corpo, 3 anche da accorciato: qui la scala finisce e si ferma a 9px
    expect(corpoDi(dent)).toBe(9)
  })
})

describe('variante 6 — 3. a 9px ancora non ci sta: si tolgono le parole di categoria in testa', () => {
  it('«CENTRO ODONTOIATRICO SANTA MARIA» → si legge «SANTA MARIA», a corpo PIENO (la scala riparte da 10px)', () => {
    const { dent } = renderizza('CENTRO ODONTOIATRICO SANTA MARIA')
    expect(dent.textContent).toBe('SANTA MARIA')
    expect(corpoDi(dent)).toBe(10)
    expect(dent.classList.contains('is-troncato')).toBe(false)
  })

  it('il nome completo resta raggiungibile: aria-label del bottone e title sul testo', () => {
    const { dent, btn } = renderizza('CENTRO ODONTOIATRICO SANTA MARIA')
    expect(btn.getAttribute('aria-label')).toContain('CENTRO ODONTOIATRICO SANTA MARIA')
    expect(dent.getAttribute('title')).toBe('CENTRO ODONTOIATRICO SANTA MARIA')
  })
})

describe('variante 6 — 4. nemmeno così: resta la sfumatura di oggi, ultima spiaggia', () => {
  it('«STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO»: accorciato, a 9px, e SFUMATO', () => {
    const { dent, btn } = renderizza('STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO')
    expect(dent.textContent).toBe('GIANCARLO POLIAMBULATORIO')
    expect(dent.classList.contains('is-corpo-9')).toBe(true)
    expect(dent.classList.contains('is-troncato')).toBe(true)
    expect(dent.getAttribute('title')).toBe('STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO')
    expect(btn.getAttribute('aria-label')).toContain('STUDIO DENTISTICO GIANCARLO POLIAMBULATORIO')
  })
})

describe('variante 6 — la scala riparte da capo quando cambia il nome (mai un gradino ereditato)', () => {
  it('da un nome che scende a 9px a uno che sta a corpo pieno: il secondo torna a 10px', () => {
    const { rerender } = render(
      <Cassetta id="c1" nome="C12" colore="rossa" stato="normale" onTap={() => {}}
        lavoro={{ ...base, dentista: 'STUDI MEDICI DI SANTI GIUSEPPE' }} />
    )
    const dent = () => screen.getByRole('button').querySelector('.ds-cassetta-dent') as HTMLElement
    expect(corpoDi(dent())).toBe(9)
    rerender(
      <Cassetta id="c1" nome="C12" colore="rossa" stato="normale" onTap={() => {}}
        lavoro={{ ...base, dentista: 'DI SANTI CATERINA' }} />
    )
    expect(dent().textContent).toBe('DI SANTI CATERINA')
    expect(corpoDi(dent())).toBe(10)
  })
})

// ————————————————————————— il foglio di stile —————————————————————————
describe('ds-v3.css — i due gradini di corpo del clinico', () => {
  const css = readFileSync(join(process.cwd(), 'src/app/ds-v3.css'), 'utf8')
  const norm = css.replace(/\s+/g, ' ')

  it('la regola base resta a 10px: il gradino è un’ECCEZIONE, non il caso comune', () => {
    const base = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent \{[^}]*\}/)
    expect(base![0]).toMatch(/font-size: 10px; line-height: 1\.16;/)
  })

  it('i due gradini valgono 9,5px e 9px — e non esiste un terzo gradino sotto i 9px', () => {
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-cassetta-dent\.is-corpo-95 \{ font-size: 9\.5px; \}/)
    expect(norm).toMatch(/\[data-ds="v3"\] \.ds-cassetta-dent\.is-corpo-9 \{ font-size: 9px; \}/)
    const corpi = [...norm.matchAll(/\.ds-cassetta-dent\.is-corpo-[\w-]+ \{ font-size: ([\d.]+)px; \}/g)].map((m) => Number(m[1]))
    expect(corpi.sort()).toEqual([9, 9.5])
  })

  it('il budget resta 2 righe esatte a ogni gradino, perché max-height è in em (segue il corpo) e line-height è un numero puro', () => {
    const base = norm.match(/\[data-ds="v3"\] \.ds-cassetta-dent \{[^}]*\}/)
    expect(base![0]).toMatch(/max-height: calc\(2 \* 1\.16em\);/)
    for (const px of [10, 9.5, 9]) {
      expect(Math.round((2 * 1.16 * px) / (1.16 * px))).toBe(2)
    }
    // valori RISOLTI misurati in Chromium reale (nomi-lunghi-v6-*.json): 23,2 / 22,04 / 20,88px
    expect([10, 9.5, 9].map((px) => +(2 * 1.16 * px).toFixed(2))).toEqual([23.2, 22.04, 20.88])
  })

  it('i gradini toccano SOLO il corpo: nessuno ridichiara clip-path, mask-image o max-height (che azzererebbe in silenzio il lavoro di H2d)', () => {
    for (const classe of ['is-corpo-95', 'is-corpo-9']) {
      const blocco = norm.match(new RegExp(`\\[data-ds="v3"\\] \\.ds-cassetta-dent\\.${classe} \\{[^}]*\\}`))
      expect(blocco, `blocco .${classe} non trovato`).toBeTruthy()
      expect(blocco![0]).not.toMatch(/clip-path|mask-image|max-height|line-height/)
    }
  })
})

// Review finale whole-branch, I3 — la ri-misura «a font caricati» esiste per UN caso solo:
// caricamento a freddo, Plus Jakarta Sans non ancora in cache, la prima misura fatta con le
// metriche del font di ripiego. Ed era morta esattamente lì. La prenotazione di
// `document.fonts.ready` viveva DENTRO l'effetto di misura, con una bandierina «una volta
// sola» alzata al momento della prenotazione: ma la misura stessa fa scendere la scala, la
// discesa è un `setScalino` dentro un layout effect (flush sincrono), il flush rilancia
// l'effetto, e la sua pulizia spegne il `vivo` che la `.then` già prenotata controlla. Quando
// i font arrivavano davvero, la `.then` trovava `vivo === false` e non faceva nulla — mentre
// la bandierina, ormai alzata, impediva al secondo giro di riprenotarsi. Il nome restava
// rimpicciolito (o senza le parole di categoria) per tutta la sessione, pur entrando benissimo
// a corpo pieno col font vero.
describe('variante 6 — I3: la ri-misura a font caricati sopravvive alla discesa che l\'ha innescata', () => {
  let descrittoreFonts: PropertyDescriptor | undefined

  /** Installa un `document.fonts.ready` che si risolve QUANDO decide il test — è il momento
   *  «il font vero è arrivato», l'unico istante in cui la ri-misura ha senso. */
  function fontsPilotati(): { arrivati: () => Promise<void> } {
    let sblocca: () => void = () => {}
    const pronti = new Promise<void>((res) => {
      sblocca = res
    })
    descrittoreFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready: pronti } })
    return {
      arrivati: async () => {
        await act(async () => {
          sblocca()
          await pronti
        })
      },
    }
  }

  afterEach(() => {
    if (descrittoreFonts) Object.defineProperty(document, 'fonts', descrittoreFonts)
    else Reflect.deleteProperty(document, 'fonts')
    descrittoreFonts = undefined
  })

  const dentDelDom = () => screen.getByRole('button').querySelector('.ds-cassetta-dent') as HTMLElement

  it('col font vero il nome torna al corpo pieno, dopo essere sceso di un gradino sulle metriche del ripiego', async () => {
    // Ripiego: «DI SANTI CATERINA» a 10px occupa 3 righe (sfora le 2 di budget) e ne occupa 2 a
    // 9,5. Col font vero ci sta in 2 righe già a 10px — la discesa non serviva.
    righeOverride.set('DI SANTI CATERINA@10', 3)
    righeOverride.set('DI SANTI CATERINA@9.5', 2)
    const fonts = fontsPilotati()

    const { dent } = renderizza('DI SANTI CATERINA')
    expect(dent.className).toContain('is-corpo-95')

    righeOverride.set('DI SANTI CATERINA@10', 2)
    await fonts.arrivati()

    expect(dentDelDom().className).not.toContain('is-corpo-95')
    expect(dentDelDom().textContent).toBe('DI SANTI CATERINA')
  })

  it('se col font vero il nome sfora ANCORA, la scala riscende: la ri-misura riparte da capo, non impone il corpo pieno', async () => {
    righeOverride.set('CENTRO ODONTOIATRICO SANTA MARIA@10', 4)
    righeOverride.set('CENTRO ODONTOIATRICO SANTA MARIA@9.5', 4)
    righeOverride.set('CENTRO ODONTOIATRICO SANTA MARIA@9', 3)
    const fonts = fontsPilotati()

    renderizza('CENTRO ODONTOIATRICO SANTA MARIA')
    // Metriche del ripiego: la scala col nome intero non basta, si passa al nome senza le
    // parole di categoria («SANTA MARIA»).
    expect(dentDelDom().textContent).toBe('SANTA MARIA')

    await fonts.arrivati()
    // Col font vero le righe non cambiano: l'esito deve restare lo stesso, senza oscillare.
    expect(dentDelDom().textContent).toBe('SANTA MARIA')
  })
})
