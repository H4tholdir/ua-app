// DS v3 §1.6 (D85) — le prove della trappola del focus.
//
// ── Le FORME D'INPUT, enumerate PRIMA delle asserzioni (R-P4) ──────────────────────────────
// Il piano ne chiede sei; la settima è arrivata dal panel di revisione del brief. Ognuna porta
// il suo caso, o il suo «non coperta, perché».
//   1. pannello SENZA nessun elemento raggiungibile ......... coperta — «pannello vuoto»
//   2. UN SOLO elemento raggiungibile ....................... coperta — «un solo elemento»
//   3. elementi che compaiono DOPO l'apertura (fetch) ....... coperta — «contenuto che arriva dopo»
//   4. elemento DISABILITATO in mezzo alla sequenza ......... coperta — «disabilitato in mezzo»
//   5. tabIndex NEGATIVO su un elemento interno ............. coperta — «tabIndex negativo»
//   6. il pannello stesso, che porta tabIndex={-1} .......... coperta — «il focus parte dal pannello»
//   7. àncora STACCATA dall'albero al rilascio (C-12) ....... coperta — «àncora staccata»
// 🛑 NON coperte, e il perché:
//   - `hidden` per CSS (`display:none` da foglio di stile): jsdom non fa layout e non risolve le
//     regole esterne, quindi una prova qui direbbe solo che il selettore non guarda il CSS. Il
//     modulo dichiara la stessa lacuna nel proprio commento di testa: filtra l'attributo
//     `hidden`, non la visibilità calcolata.
//   - `tabIndex` POSITIVO (2, 3, …): il modulo dichiara di ignorarlo e di seguire l'ordine del
//     DOM. Provarlo qui inciderebbe come «giusto» un ordine che il browser vero fa diverso.
//   - iframe e shadow DOM: nessuna superficie del design system ne monta.

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import userEvent from '@testing-library/user-event'

import { trappolaFocus } from '@/components/ds/trappola-focus'

/** Un elemento raggiungibile FUORI dal pannello: è il posto dove il focus finisce se scappa. */
let fuori: HTMLAnchorElement
let rilasci: Array<() => void>

function montaPannello(contenuto: string): HTMLElement {
  const pannello = document.createElement('div')
  pannello.setAttribute('role', 'dialog')
  pannello.setAttribute('aria-modal', 'true')
  pannello.tabIndex = -1
  pannello.innerHTML = contenuto
  document.body.appendChild(pannello)
  return pannello
}

function montaApritore(etichetta = 'Apri'): HTMLButtonElement {
  const apritore = document.createElement('button')
  apritore.textContent = etichetta
  document.body.appendChild(apritore)
  return apritore
}

/** Registra il rilascio perché l'`afterEach` lo chiami anche se la prova fallisce a metà. */
function apri(pannello: HTMLElement, opzioni?: Parameters<typeof trappolaFocus>[1]): () => void {
  const rilascia = trappolaFocus(pannello, opzioni)
  rilasci.push(rilascia)
  return rilascia
}

function raggiungibiliDi(pannello: HTMLElement): HTMLElement[] {
  return Array.from(pannello.querySelectorAll<HTMLElement>('button, a[href], input, [tabindex="0"]'))
}

beforeEach(() => {
  document.body.innerHTML = ''
  rilasci = []
  // Il gemello di `SkipToContent.tsx:12`: raggiungibile, globale, fuori da ogni pannello. È
  // esattamente dove il focus atterrava prima di questo modulo.
  fuori = document.createElement('a')
  fuori.href = '#main-content'
  fuori.textContent = 'Vai al contenuto'
  document.body.appendChild(fuori)
})

afterEach(() => {
  rilasci.forEach((rilascia) => rilascia())
  document.body.innerHTML = ''
})

describe('trappola-focus — il Tab resta dentro il pannello (§1.6, D85)', () => {
  it('Tab premuto tante volte quanti sono gli elementi raggiungibili PIÙ UNO → il focus è tornato al primo, e non è MAI uscito dal pannello', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello(`
      <button>Uno</button>
      <a href="#due">Due</a>
      <input aria-label="Tre" />
    `)
    const raggiungibili = raggiungibiliDi(pannello)
    expect(raggiungibili).toHaveLength(3)

    apri(pannello)
    expect(document.activeElement).toBe(pannello)

    // N + 1 pressioni: la prima porta al primo elemento, le altre N chiudono il giro.
    for (let i = 0; i < raggiungibili.length + 1; i += 1) {
      await utente.tab()
      expect(pannello.contains(document.activeElement)).toBe(true)
      expect(document.activeElement).not.toBe(fuori)
    }
    expect(document.activeElement).toBe(raggiungibili[0])
  })

  it('Shift+Tab dal PRIMO elemento → va all\'ULTIMO, non fuori', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello(`
      <button>Uno</button>
      <button>Due</button>
      <button>Tre</button>
    `)
    const raggiungibili = raggiungibiliDi(pannello)
    apri(pannello)

    raggiungibili[0].focus()
    await utente.tab({ shift: true })

    expect(document.activeElement).toBe(raggiungibili[2])
  })

  it('Tab dall\'ULTIMO elemento → torna al PRIMO (avvolge in avanti)', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello(`
      <button>Uno</button>
      <button>Due</button>
    `)
    const raggiungibili = raggiungibiliDi(pannello)
    apri(pannello)

    raggiungibili[1].focus()
    await utente.tab()

    expect(document.activeElement).toBe(raggiungibili[0])
  })

  it('🔴 il caso che DEVE fallire senza il modulo: lo stesso pannello, senza trappola, lascia uscire il focus', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello('<button>Uno</button>')
    const uno = raggiungibiliDi(pannello)[0]

    // Nessuna `apri()`: è il comportamento di ieri, quello che il modulo esiste per chiudere.
    uno.focus()
    await utente.tab()

    expect(pannello.contains(document.activeElement)).toBe(false)
  })
})

describe('trappola-focus — le forme d\'input (R-P4)', () => {
  it('pannello vuoto: nessun elemento raggiungibile → il Tab non esce, il focus resta sul pannello', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello('<p>Solo testo</p>')
    apri(pannello)

    await utente.tab()
    expect(document.activeElement).toBe(pannello)

    await utente.tab({ shift: true })
    expect(document.activeElement).toBe(pannello)
  })

  it('un solo elemento raggiungibile: il Tab ci gira sopra, avanti e indietro', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello('<button>Solo</button>')
    const solo = raggiungibiliDi(pannello)[0]
    apri(pannello)

    await utente.tab()
    expect(document.activeElement).toBe(solo)

    await utente.tab()
    expect(document.activeElement).toBe(solo)

    await utente.tab({ shift: true })
    expect(document.activeElement).toBe(solo)
  })

  it('contenuto che arriva DOPO l\'apertura (fetch): il nuovo elemento entra nel giro, senza riaprire la trappola', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello('<button>Uno</button>')
    apri(pannello)

    const tardivo = document.createElement('button')
    tardivo.textContent = 'Arrivato dopo'
    pannello.appendChild(tardivo)

    const primo = pannello.querySelector('button') as HTMLElement
    primo.focus()
    await utente.tab()
    expect(document.activeElement).toBe(tardivo)

    // E dall'ultimo (che ora è il tardivo) si avvolge sul primo: la lista è stata riletta.
    await utente.tab()
    expect(document.activeElement).toBe(primo)
  })

  it('un elemento DISABILITATO in mezzo alla sequenza viene saltato, e non diventa mai il bordo', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello(`
      <button>Uno</button>
      <button disabled>Spento</button>
      <button>Tre</button>
    `)
    const bottoni = Array.from(pannello.querySelectorAll('button')) as HTMLElement[]
    apri(pannello)

    bottoni[0].focus()
    await utente.tab()
    expect(document.activeElement).toBe(bottoni[2])

    // Il bordo in avanti è «Tre», non «Spento»: da lì si avvolge su «Uno».
    await utente.tab()
    expect(document.activeElement).toBe(bottoni[0])
  })

  it('un elemento con tabIndex NEGATIVO resta fuori dal giro (è raggiungibile col codice, non col Tab)', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello(`
      <button>Uno</button>
      <div tabindex="-1" data-testid="saltato">Non nel giro</div>
      <button>Tre</button>
    `)
    const bottoni = Array.from(pannello.querySelectorAll('button')) as HTMLElement[]
    apri(pannello)

    bottoni[0].focus()
    await utente.tab()
    expect(document.activeElement).toBe(bottoni[1])

    await utente.tab()
    expect(document.activeElement).toBe(bottoni[0])
  })

  it('il focus parte dal PANNELLO (tabIndex={-1}): Tab → primo elemento, Shift+Tab → ultimo', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello(`
      <button>Uno</button>
      <button>Due</button>
    `)
    const bottoni = Array.from(pannello.querySelectorAll('button')) as HTMLElement[]
    apri(pannello)
    expect(document.activeElement).toBe(pannello)

    await utente.tab()
    expect(document.activeElement).toBe(bottoni[0])

    pannello.focus()
    await utente.tab({ shift: true })
    expect(document.activeElement).toBe(bottoni[1])
  })

  it('un elemento con l\'attributo `hidden` non entra nel giro, nemmeno come BORDO', async () => {
    const utente = userEvent.setup()
    // Il nascosto sta IN FONDO apposta: se il modulo lo contasse, il bordo sarebbe lui e il
    // `focus()` su un elemento nascosto non attecchisce — il focus finirebbe sul `body`, fuori.
    const pannello = montaPannello(`
      <button>Uno</button>
      <button>Due</button>
      <button hidden>Nascosto</button>
    `)
    const bottoni = Array.from(pannello.querySelectorAll('button')) as HTMLElement[]
    apri(pannello)

    bottoni[1].focus()
    await utente.tab()
    expect(document.activeElement).toBe(bottoni[0])
    expect(pannello.contains(document.activeElement)).toBe(true)
  })
})

describe('trappola-focus — l\'àncora del ritorno (C-12)', () => {
  it('l\'àncora DICHIARATA dal chiamante riceve il focus al rilascio, anche se non era l\'elemento attivo all\'apertura', () => {
    const apritoreVero = montaApritore('Chi ha aperto')
    const altro = montaApritore('Chi aveva il focus')
    const pannello = montaPannello('<button>Uno</button>')

    altro.focus()
    const rilascia = apri(pannello, { ancora: apritoreVero })
    expect(document.activeElement).toBe(pannello)

    rilascia()
    expect(document.activeElement).toBe(apritoreVero)
  })

  it('senza àncora si ricade su `document.activeElement` catturato al montaggio — cioè il comportamento che `Sheet` ha oggi', () => {
    const apritore = montaApritore()
    const pannello = montaPannello('<button>Uno</button>')

    apritore.focus()
    const rilascia = apri(pannello)
    expect(document.activeElement).toBe(pannello)

    rilascia()
    expect(document.activeElement).toBe(apritore)
  })

  it('àncora `null` esplicita: vale come «non dichiarata», si ricade sul ripiego', () => {
    const apritore = montaApritore()
    const pannello = montaPannello('<button>Uno</button>')

    apritore.focus()
    const rilascia = apri(pannello, { ancora: null })
    expect(document.activeElement).toBe(pannello)

    rilascia()
    expect(document.activeElement).toBe(apritore)
  })

  it('àncora STACCATA dall\'albero al momento del rilascio: non lancia, non finge di aver restituito il focus, e libera comunque il Tab', async () => {
    const utente = userEvent.setup()
    const apritore = montaApritore()
    const pannello = montaPannello('<button>Uno</button>')
    const uno = raggiungibiliDi(pannello)[0]

    const rilascia = apri(pannello, { ancora: apritore })
    expect(document.activeElement).toBe(pannello)
    apritore.remove()

    expect(() => rilascia()).not.toThrow()
    expect(document.activeElement).not.toBe(apritore)

    // Un'àncora morta non deve lasciare la trappola armata su un pannello che sta uscendo.
    uno.focus()
    await utente.tab()
    expect(pannello.contains(document.activeElement)).toBe(false)
  })

  it('`focusIniziale` porta il focus su un elemento interno dichiarato, invece che sul pannello (è la prop che userà `FoglioConferma`, §5.42)', () => {
    const pannello = montaPannello(`
      <button>Distruttiva</button>
      <button>Sicura</button>
    `)
    const sicura = Array.from(pannello.querySelectorAll('button'))[1] as HTMLElement

    apri(pannello, { focusIniziale: sicura })

    expect(document.activeElement).toBe(sicura)
  })
})

describe('trappola-focus — il rilascio (contratto del modulo)', () => {
  it('il rilascio è IDEMPOTENTE: chiamarlo due volte non ripete il ritorno del focus', () => {
    const apritore = montaApritore()
    const altrove = montaApritore('Altrove')
    const pannello = montaPannello('<button>Uno</button>')

    apritore.focus()
    const rilascia = apri(pannello)
    expect(document.activeElement).toBe(pannello)

    rilascia()
    expect(document.activeElement).toBe(apritore)

    altrove.focus()
    rilascia()
    expect(document.activeElement).toBe(altrove)
  })

  it('dopo il rilascio il Tab NON è più trattenuto: l\'ascoltatore se n\'è andato col pannello', async () => {
    const utente = userEvent.setup()
    const pannello = montaPannello('<button>Uno</button>')
    const uno = raggiungibiliDi(pannello)[0]

    const rilascia = apri(pannello)

    // Prima del rilascio il Tab è trattenuto: senza questa riga la prova qui sotto passerebbe
    // anche con una trappola che non ha mai funzionato.
    uno.focus()
    await utente.tab()
    expect(document.activeElement).toBe(uno)

    rilascia()

    uno.focus()
    await utente.tab()
    expect(pannello.contains(document.activeElement)).toBe(false)
  })

  it('DUE pannelli aperti insieme (il caso `CassettaSheet`: un dialog sopra uno sheet): il Tab dentro quello in cima non scende MAI in quello sotto', async () => {
    const utente = userEvent.setup()
    const sotto = montaPannello(`
      <button>Sheet uno</button>
      <button>Sheet due</button>
    `)
    const sopra = montaPannello(`
      <button>Dialog sicura</button>
      <button>Dialog distruttiva</button>
    `)
    const bottoniSopra = Array.from(sopra.querySelectorAll('button')) as HTMLElement[]

    apri(sotto)
    apri(sopra)
    expect(document.activeElement).toBe(sopra)

    // N + 1 pressioni con N = 2: la prima entra nel giro, le altre due lo chiudono.
    for (let i = 0; i < bottoniSopra.length + 1; i += 1) {
      await utente.tab()
      expect(sopra.contains(document.activeElement)).toBe(true)
      expect(sotto.contains(document.activeElement)).toBe(false)
    }
    expect(document.activeElement).toBe(bottoniSopra[0])
  })
})
