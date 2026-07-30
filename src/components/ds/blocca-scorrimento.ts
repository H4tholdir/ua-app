// DS v3 — il blocco dello scorrimento del corpo: UN SOLO contatore per tutta l'applicazione.
//
// ── Il difetto che questo modulo esiste per togliere di mezzo (D84, 30/07/2026) ────────────
// Prima, ogni pannello che doveva bloccare lo scorrimento se lo bloccava per conto suo, tenendo
// il valore precedente del corpo in un ref PRIVATO (`Sheet.tsx`, versione precedente a questo
// modulo). Quel ref difende dalla propria rientranza — riaprirsi mentre la propria uscita gioca
// ancora — ma NON da un secondo bloccante. Con due pannelli sovrapposti:
//   1. il primo si apre, cattura il valore vero del corpo, e scrive «hidden»;
//   2. il secondo si apre e cattura... «hidden», cioè il valore che ha appena scritto il primo;
//   3. si chiudono entrambi nello stesso commit;
//   4. React esegue le pulizie in ORDINE DI SETUP, non LIFO (misurato su React 19.2, v. il
//      commento in `Sheet.tsx` sull'effect-sentinella): prima ripristina il primo — valore vero —
//      e SUBITO DOPO il secondo ci riscrive sopra «hidden»;
//   5. la pagina resta bloccata sotto le dita, per sempre, e non si ripara senza chiuderla.
//
// ── Perché un contatore, e non «uno solo blocca alla volta» ────────────────────────────────
// L'alternativa era una regola scritta nella spec: «gli strati alti non toccano mai lo
// scorrimento, blocca solo il più basso». Funziona finché qualcuno la rispetta, e non è
// esprimibile in TypeScript né controllabile da nessuna guardia del repo: un'invariante che
// nessuna macchina può verificare e il cui guasto è il peggiore dell'applicazione. Il contatore
// la rende vera per costruzione: chiunque può bloccare, in qualunque ordine, senza sapere chi
// altro c'è.
//
// ── Il contratto, in tre righe ─────────────────────────────────────────────────────────────
//  1. Il valore precedente del corpo si cattura SOLO al primo blocco e si ripristina SOLO
//     all'ultimo sblocco. Fra i due, il corpo appartiene al modulo.
//  2. La `sblocca()` restituita è IDEMPOTENTE: chiamarla due volte vale come chiamarla una. Non
//     è un vezzo — `Sheet` sblocca in differita (`onExitComplete`) e ha anche un ramo immediato,
//     quindi la stessa funzione può arrivare due volte; una seconda decrementazione sbloccherebbe
//     uno strato ancora aperto. Il contatore non può quindi scendere sotto zero: ogni blocco
//     porta esattamente uno sblocco effettivo.
//  3. La larghezza della barra di scorrimento si compensa con `paddingRight` al primo blocco:
//     senza, nell'istante in cui la barra sparisce la pagina salta di lato su desktop (difetto
//     già pagato in collaudo, v. `Sheet.tsx`).
//
// Chi blocca chiama e basta; non deve sapere se è il primo, l'ultimo o quello in mezzo.

type ValoriCorpo = { overflow: string; paddingRight: string }

/** Quanti bloccanti sono in vita adesso. Zero = il corpo è di nuovo di chi lo aveva prima. */
let bloccanti = 0
/** Il valore del corpo com'era PRIMA del primo blocco. Valorizzato solo mentre `bloccanti > 0`. */
let precedente: ValoriCorpo | null = null

/**
 * Blocca lo scorrimento del corpo e torna la funzione che lo rilascia.
 *
 * La funzione restituita è idempotente: chiamarla più volte rilascia UNA sola volta. Il
 * ripristino avviene solo quando l'ultimo bloccante rilascia — mai prima, qualunque sia l'ordine
 * in cui i rilasci arrivano (in ordine di apertura, all'inverso, o mescolati).
 */
export function bloccaScorrimento(): () => void {
  bloccanti += 1

  if (bloccanti === 1) {
    precedente = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
    }
    // Compensazione della barra di scorrimento: la finestra la include nella sua larghezza, il
    // contenuto no. Si legge PRIMA di scrivere «hidden» — dopo, la barra non c'è già più e la
    // differenza sarebbe zero.
    const larghezzaBarra = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (larghezzaBarra > 0) {
      document.body.style.paddingRight = `${larghezzaBarra}px`
    }
  }

  let rilasciato = false
  return function sblocca(): void {
    if (rilasciato) return
    rilasciato = true
    bloccanti -= 1
    if (bloccanti > 0) return
    if (!precedente) return
    document.body.style.overflow = precedente.overflow
    document.body.style.paddingRight = precedente.paddingRight
    precedente = null
  }
}
