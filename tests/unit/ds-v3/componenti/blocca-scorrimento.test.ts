import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { bloccaScorrimento } from '@/components/ds/blocca-scorrimento'

// ── Le sentinelle, e perché sono QUESTE ─────────────────────────────────────────────────────
// Il gate del 30/07/2026 ha bocciato una prova prescritta che metteva il corpo a
// `overflow:'hidden'` e pretendeva che valesse ancora `'hidden'` alla fine: `'hidden'` è
// ESATTAMENTE il valore che un bloccante scrive, quindi quella prova restava verde anche se il
// blocco non partiva mai. Qui il valore precedente è `'scroll'` — nessun bloccante lo scriverebbe
// mai — e la compensazione precedente è `'3px'`, che non è la larghezza simulata della barra
// (17px): confondere «ripristinato» con «compensato» diventa impossibile.
//
// Ogni caso asserisce ANCHE MENTRE È BLOCCATO, non solo dopo lo sblocco: è l'asserzione di mezzo
// che discrimina fra «il modulo fa il suo lavoro» e «il modulo non ha fatto niente e il corpo era
// già come volevo».
// ⚠️ Lo stato del contatore è di MODULO, condiviso da tutti i casi di questo file: ogni caso
// rilascia ciò che blocca, così parte da zero. Se un caso si ferma a metà (asserzione rossa prima
// del suo sblocco) il blocco resta appeso e i casi successivi diventano rossi a cascata — verso
// SICURO: una cascata produce rosso in più, mai un verde falso. Il primo rosso in ordine di file è
// quello vero; gli altri si rileggono dopo averlo riparato.
const OVERFLOW_PRIMA = 'scroll'
const PADDING_PRIMA = '3px'
// Browser con barra di scorrimento «classica» che riserva 17px di layout: `innerWidth` la
// include, `clientWidth` no (stessa simulazione del test di Sheet sulla compensazione).
const LARGHEZZA_FINESTRA = 1280
const LARGHEZZA_CONTENUTO = 1263
const COMPENSAZIONE = '17px'

describe('bloccaScorrimento — blocco del corpo a contatore (D84)', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: LARGHEZZA_FINESTRA })
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: LARGHEZZA_CONTENUTO,
    })
    document.body.style.overflow = OVERFLOW_PRIMA
    document.body.style.paddingRight = PADDING_PRIMA
  })

  afterEach(() => {
    delete (document.documentElement as unknown as { clientWidth?: number }).clientWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    document.body.style.overflow = ''
    document.body.style.paddingRight = ''
  })

  // ① blocco singolo
  it('un solo bloccante: il corpo è bloccato E compensato mentre dura, e allo sblocco torna ESATTAMENTE il valore di prima', () => {
    const sblocca = bloccaScorrimento()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(COMPENSAZIONE)

    sblocca()

    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  it('senza barra di scorrimento da compensare (finestra e contenuto larghi uguale) la compensazione NON si scrive: il valore precedente resta intatto anche durante il blocco', () => {
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      value: LARGHEZZA_FINESTRA,
    })

    const sblocca = bloccaScorrimento()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)

    sblocca()

    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  // ② due blocchi annidati
  it('due bloccanti annidati: lo sblocco del secondo NON ripristina niente finché il primo è ancora lì', () => {
    const sbloccaPrimo = bloccaScorrimento()
    const sbloccaSecondo = bloccaScorrimento()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(COMPENSAZIONE)

    sbloccaSecondo()

    // Il primo è ancora aperto: sotto le dita la pagina deve restare ferma.
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(COMPENSAZIONE)

    sbloccaPrimo()

    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  it('il secondo bloccante NON ri-cattura il valore scritto dal primo: il valore precedente è quello vero, non «hidden»', () => {
    const sbloccaPrimo = bloccaScorrimento()
    // Se il secondo catturasse ADESSO, catturerebbe 'hidden' (il valore del primo) e
    // 'ripristinerebbe' il corpo a 'hidden' per sempre — è il difetto D84 in una riga.
    const sbloccaSecondo = bloccaScorrimento()

    sbloccaPrimo()
    sbloccaSecondo()

    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  // ③ la sequenza che ha generato il task: sblocchi in ORDINE DI APERTURA, non LIFO
  it('la sequenza del difetto: due bloccanti, poi i due sblocchi in ORDINE DI APERTURA (non LIFO) → il corpo torna al valore originale', () => {
    const sbloccaPrimo = bloccaScorrimento()
    const sbloccaSecondo = bloccaScorrimento()

    expect(document.body.style.overflow).toBe('hidden')

    // È l'ordine che React usa per le pulizie (ordine di SETUP, non LIFO — misurato su React
    // 19.2, v. il commento sull'effect-sentinella in Sheet.tsx): prima il primo, poi il secondo.
    // ⚠️ Qui l'ordine è comunque solo il MOTIVO per cui questo è il caso realistico: il modulo
    // deve reggere qualunque ordine di rilascio, ed è quello che il caso prova. Col vecchio
    // ref-per-istanza qui il secondo «ripristinava» 'hidden' e la pagina restava bloccata per
    // sempre.
    sbloccaPrimo()
    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(COMPENSAZIONE)

    sbloccaSecondo()
    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  // ④ sblocca() chiamata due volte
  it('la stessa sblocca() chiamata DUE volte non fa scendere il contatore sotto il dovuto: uno strato ancora aperto resta bloccato', () => {
    const sbloccaPrimo = bloccaScorrimento()
    const sbloccaSecondo = bloccaScorrimento()

    sbloccaPrimo()
    // Il caso vero: `Sheet` sblocca in differita (`onExitComplete`) E ha un ramo immediato, la
    // stessa funzione può arrivare due volte. Se la seconda decrementasse di nuovo, il contatore
    // andrebbe a zero e sbloccherebbe uno strato ANCORA APERTO.
    sbloccaPrimo()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(COMPENSAZIONE)

    sbloccaSecondo()

    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  it('la seconda chiamata a sblocca() dell\'ULTIMO bloccante non ri-ripristina sopra un blocco nuovo', () => {
    const sblocca = bloccaScorrimento()
    sblocca()
    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)

    // Un pannello nuovo si apre DOPO. La sblocca stantia del precedente non deve poterlo
    // sbloccare (né riportare indietro il contatore).
    const sbloccaNuovo = bloccaScorrimento()
    expect(document.body.style.overflow).toBe('hidden')

    sblocca()

    expect(document.body.style.overflow).toBe('hidden')
    expect(document.body.style.paddingRight).toBe(COMPENSAZIONE)

    sbloccaNuovo()
    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })

  // ⑤ zero utenti / sblocco a contatore già a zero
  it('zero bloccanti: importare e non chiamare niente non tocca il corpo, e una sblocca già consumata non scrive nulla né lancia', () => {
    // Zero utenti alla partenza: nessuna scrittura di nessun tipo.
    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)

    const sblocca = bloccaScorrimento()
    sblocca()
    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)

    // Contatore già a zero: la terza chiamata non deve lanciare e non deve scrivere.
    // ⚠️ LIMITE DICHIARATO: «sblocco senza blocco» in senso letterale NON è raggiungibile da
    // questa firma (una `sblocca` si ottiene SOLO da una `blocca`), quindi il caso ⑤ del mandato
    // è coperto nella sola forma che il modulo permette davvero: sblocco in eccesso.
    expect(() => sblocca()).not.toThrow()

    expect(document.body.style.overflow).toBe(OVERFLOW_PRIMA)
    expect(document.body.style.paddingRight).toBe(PADDING_PRIMA)
  })
})
