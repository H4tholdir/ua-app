// DS v3 — la storia degli overlay: UNA sola entry di history per l'INTERA pila di overlay
// aperti (`Sheet`, `DialogConferma`), più una pila LIFO di chi la sta usando.
//
// ── Il problema che questo modulo esiste per risolvere (review finale whole-branch, C2) ────
// Prima, ogni overlay si arrangiava da solo: `Sheet` pushava la propria entry `{uaSheet:true}`
// e la consumava a un `popstate`, con un ref booleano cieco. `DialogConferma` non pushava
// niente. Quando `CassettaSheet` monta un dialog distruttivo SOPRA lo sheet (tenendolo aperto,
// con la guardia `onChiudi={() => { if (!dialogAperto) onChiudi() }}`), il back del telefono
// consumava l'UNICA entry esistente: `onChiudi` partiva, la guardia lo bloccava — niente si
// chiudeva, ma l'entry era sparita. Il back successivo consumava allora l'entry di CHI STA
// SOTTO (il pager della home, `StanzePager`): le pile tornavano in vista mentre sheet e dialog
// — due portali su `document.body`, fuori dalla stanza appena resa `inert` — restavano dipinti
// sopra e interattivi. La direttiva permanente («back = pagina precedente, OVUNQUE») rotta in
// pieno.
//
// ── Perché UNA entry per la pila, e non una per overlay ────────────────────────────────────
// L'alternativa ovvia (ogni overlay pusha la SUA entry e discrimina leggendo
// `window.history.state`) non regge il momento della chiusura: `history.back()` è ASINCRONA —
// lo stato che il browser espone non cambia finché la traversal non è avvenuta. Quando sheet e
// dialog si chiudono nello STESSO commit (è quello che fa una conferma distruttiva riuscita:
// «Segna come libera» chiude il dialog e lo sheet insieme), la seconda cleanup a girare legge
// uno stato ormai stantio, non si riconosce in cima, e rinuncia: la sua entry resta appesa e
// l'utente si ritrova con un back «morto» da spendere. Sequenza dipendente dall'ordine delle
// cleanup, per giunta.
// Con una entry sola il problema non si pone: l'entry si consuma quando la pila si SVUOTA,
// una volta, da chiunque sia l'ultimo a uscire, in qualunque ordine escano. E finché sotto
// resta anche un solo overlay aperto, l'entry resta a proteggerlo — nessun push/pop di
// servizio a ogni apertura di dialog.
//
// ── Le tre regole ──────────────────────────────────────────────────────────────────────────
// 1. Si entra: se nessuna entry nostra è in vita, la si spinge (marcata `uaSheet`/`uaDialog`,
//    senza url — la pagina non cambia). Altrimenti ci si limita a impilarsi.
// 2. Back del telefono: si chiude SOLO il più alto della pila; se sotto resta qualcuno, la sua
//    protezione va ricostruita subito (ri-push).
// 3. Si esce (chiusura esplicita o smontaggio): se sotto resta qualcuno l'entry NON si tocca;
//    se la pila si svuota, la si disfa con `history.back()` — ma solo se l'entry in cima è
//    ancora davvero la nostra (v. `nostraEntryInCima`).

type Marca = 'uaSheet' | 'uaDialog'

type Voce = {
  token: number
  marca: Marca
  /** Chiusura dell'overlay. Deve leggere il callback PIÙ RECENTE del chiamante (i consumatori
   *  passano una closure stabile che rilegge un ref), non quello catturato all'apertura. */
  chiudi: () => void
}

const pila: Voce[] = []
/** La marca dell'entry che abbiamo in vita adesso (`null` = nessuna entry nostra). */
let marcaEntry: Marca | null = null
let prossimoToken = 0
let listenerRegistrato = false

function spingiEntry(marca: Marca): void {
  // Senza url (secondo argomento `''`, nessun terzo): la pagina non cambia, cambia solo la
  // profondità della history — è ciò che permette a `StanzePager.alPopState` di distinguere
  // «è stata consumata un'entry di overlay» (pathname invariato) da «è stata consumata la mia»
  // (pathname tornato indietro). V. il commento sulla guardia lì.
  window.history.pushState({ [marca]: true }, '')
  marcaEntry = marca
}

/** L'entry in cima alla history è ancora quella che abbiamo spinto noi? Falso quando un
 *  consumatore ha navigato (`router.push`) mentre l'overlay restava aperto: lì un
 *  `history.back()` disferebbe la SUA navigazione, non la nostra entry (che è ormai sepolta). */
function nostraEntryInCima(): boolean {
  if (!marcaEntry) return false
  const stato = window.history.state as Record<string, unknown> | null
  return stato?.[marcaEntry] === true
}

function alPop(): void {
  if (!marcaEntry || pila.length === 0) return
  // NIENTE controllo su `window.history.state` qui, ed è deliberato: dopo una traversal vera
  // lo stato corrente è quello dell'entry PRECEDENTE, quindi un controllo «la mia è ancora in
  // cima» direbbe sempre «no» — non discrimina nulla di utile in questo verso. Chi discrimina
  // è la POSIZIONE nella pila: a un back reagisce solo il più alto, gli altri restano dove
  // sono. (Il caso «il consumatore ha navigato e il back consuma la SUA entry» resta come da
  // sempre: l'overlay si chiude — ma in quello scenario il cambio di rotta smonta comunque
  // l'albero che lo contiene.)
  const voce = pila[pila.length - 1]
  pila.pop()
  marcaEntry = null
  // Ri-push PRIMA di chiudere: `popstate` è un evento discreto, quindi React flusha
  // sincronamente il `setState` di `chiudi()` e con esso la cleanup del componente, che
  // richiama `esciOverlay` — deciderebbe sulla base di una pila già mutata sotto i piedi.
  if (pila.length > 0) spingiEntry(pila[pila.length - 1].marca)
  voce.chiudi()
}

/** Apre la protezione per un overlay. Torna il token da restituire a `esciOverlay`. */
export function entraOverlay(marca: Marca, chiudi: () => void): number {
  const token = ++prossimoToken
  pila.push({ token, marca, chiudi })
  if (!listenerRegistrato) {
    // Un solo listener per l'applicazione, non uno per overlay: è la pila a decidere chi
    // reagisce. Non si toglie mai — è inerte a pila vuota (`alPop` esce subito) e toglierlo
    // introdurrebbe una finestra in cui un `popstate` in volo non troverebbe nessuno.
    window.addEventListener('popstate', alPop)
    listenerRegistrato = true
  }
  if (!marcaEntry) spingiEntry(marca)
  return token
}

/** Chiusura esplicita o smontaggio dell'overlay. Idempotente: un token già consumato da un
 *  back (`alPop`) non è più nella pila e non fa nulla. */
export function esciOverlay(token: number): void {
  const indice = pila.findIndex((voce) => voce.token === token)
  if (indice < 0) return
  pila.splice(indice, 1)
  // Sotto resta qualcuno: l'entry continua a proteggere lui, non si tocca.
  if (pila.length > 0) return
  if (marcaEntry && nostraEntryInCima()) {
    marcaEntry = null
    window.history.back()
    return
  }
  // L'entry non è più in cima (un consumatore ha navigato sopra di essa): si rinuncia a
  // disfarla. Resta appesa in history — innocua: un back futuro la attraversa in silenzio,
  // nessun componente è più lì ad ascoltarla. Limite noto e invariato rispetto a prima.
  marcaEntry = null
}
