// DS v3 §1.6 — la trappola del focus: il `Tab` resta DENTRO il pannello, e alla chiusura il
// focus torna dove il chiamante ha detto.
//
// ── Il difetto che questo modulo esiste per togliere di mezzo (D85, 30/07/2026) ────────────
// Tutti gli overlay di casa dichiarano `aria-modal="true"`, che a un lettore di schermo
// significa alla lettera «quello che c'è dietro non esiste». Nessuno lo manteneva: in tutto
// `src/components/ds/` non esisteva UNA SOLA gestione del `Tab` — nessuna trappola, nessun
// `inert`, nessun `aria-hidden` sulla pagina dietro. Il velo copriva già i clic, l'attributo
// copriva già i lettori di schermo: mancava la tastiera.
// E il conto non lo pagava solo l'accessibilità, lo pagava la CORRETTEZZA. La via dell'`Escape`
// dei quattro strati nuovi (allegato §1.5) poggia su un punto solo — «il pannello che contiene
// il focus è quello in cima». Col `Tab` si usciva dal pannello, si atterrava su
// `src/components/layout/SkipToContent.tsx:12` (raggiungibile, globale, z-index 9999), e da lì
// l'`Escape` risaliva a `window`, dove vivono NOVE ascoltatori, e chiudeva lo strato SBAGLIATO:
// l'inverso esatto del difetto che quella via esiste per chiudere.
//
// ── Perché un modulo, e non una regola scritta nella spec ──────────────────────────────────
// Stessa forma e stessa ragione di `blocca-scorrimento.ts` ieri: «il pannello che contiene il
// focus è quello in cima» era un'invariante che nessuna macchina di questo repo può verificare.
// Scritta qui una volta, diventa vera PER COSTRUZIONE, e chi la usa la chiama e basta.
//
// ── Scartata, e non si riapre: `inert` sulla pagina dietro (D85) ───────────────────────────
// È quello che fa il browser da sé coi dialoghi nativi, ma per spegnere «tutto tranne me» uno
// strato deve scegliere QUALI figli del corpo risparmiare — e il contenitore degli avvisi è
// appeso lì anche lui (`Avviso.tsx:99`, portale su `document.body`). Spegnere tutto spegne il
// cartellino che dice «Foto eliminata». Per la stessa ragione l'ascoltatore di questo modulo sta
// sul PANNELLO e non su `document`: una trappola globale terrebbe il `Tab` lontano anche
// dall'avviso, che vive SOPRA il velo (z-index 1100) e porta i propri comandi
// (`Avviso.tsx:203-204`). Sul pannello, invece, due strati aperti insieme non si contendono
// niente: il `keydown` arriva solo a quello che contiene il focus.
//
// ── Il contratto, in quattro righe ─────────────────────────────────────────────────────────
//  1. Il pannello deve portare `tabIndex={-1}`, o non c'è dove posare il focus all'apertura
//     (è già quel che §5.39, §5.41 e §5.42 prescrivono, ed è quel che `Sheet` fa da sempre).
//  2. L'elenco degli elementi raggiungibili si rilegge AD OGNI `Tab`, mai una volta sola:
//     il contenuto di un pannello può arrivare da una fetch dopo l'apertura.
//  3. Il rilascio è IDEMPOTENTE, come quello di `blocca-scorrimento.ts`: chiamarlo due volte
//     vale come chiamarlo una — un secondo ritorno del focus strapperebbe il cursore a chi lo
//     ha nel frattempo.
//  4. L'àncora del ritorno è DICHIARATA dal chiamante (C-12), non catturata qui.
//
// ── L'àncora, e il ripiego che NON è per tutti ─────────────────────────────────────────────
// 🛑 Chi apre uno strato il cui apritore può SMONTARSI passa `ancora`, punto. Il caso vero:
// `FoglioConferma` (§5.42) lo apre una voce di menù che sta smontando — `document.activeElement`
// catturato in quell'istante è un nodo staccato dall'albero, richiamarci `focus()` non fa
// niente, il focus finisce sul `body`, e da lì (regola di §1.5) l'`Escape` è morto proprio sulla
// superficie distruttiva.
// Il ripiego su `document.activeElement` esiste per UNA ragione sola, ed è di perimetro: `Sheet`
// ha molti chiamanti in tutta l'app, e rendere l'àncora obbligatoria costringerebbe OGNUNO a
// passarla. Col ripiego, `Sheet` e `DialogConferma` migrano a comportamento invariato su
// quell'asse. ⚠️ Non è la strada buona: è la strada che tiene fermo l'esistente.
//
// ── Che cosa questo modulo NON fa, dichiarato ──────────────────────────────────────────────
//  - Non spegne la pagina dietro (v. sopra). I clic li ferma il velo, i lettori di schermo li
//    ferma `aria-modal="true"`.
//  - Non recupera un focus già uscito per vie diverse dal `Tab` (un clic su un avviso, che sta
//    sopra il velo apposta): l'ascoltatore vive sul pannello, quindi vede solo ciò che accade
//    quando il focus è già dentro.
//  - Non guarda la visibilità CALCOLATA. Filtra l'attributo `hidden`, non un `display:none` che
//    arriva da un foglio di stile: jsdom non fa layout, quindi un filtro del genere si
//    comporterebbe in un modo nelle prove e in un altro nel browser. Una lacuna dichiarata vale
//    più di un filtro che mente. Nessuna superficie di `src/components/ds/` nasconde con il CSS
//    un elemento raggiungibile dentro un pannello aperto.
//  - Non onora i `tabIndex` POSITIVI: l'ordine è quello del DOM. Un `tabindex="2"` dentro un
//    overlay del design system non esiste, e riprodurne le regole vorrebbe dire riscrivere
//    l'algoritmo del browser per un caso che nessuno usa.

/**
 * Gli elementi che il `Tab` può raggiungere, nell'ordine del DOM. Si rilegge ad ogni pressione:
 * il contenuto di un pannello può cambiare mentre è aperto (una fetch che atterra, una riga che
 * compare) e una lista congelata all'apertura lascerebbe fuori dal giro tutto ciò che arriva
 * dopo.
 */
const SELETTORE_RAGGIUNGIBILI = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

function raggiungibiliDentro(pannello: HTMLElement): HTMLElement[] {
  const candidati = Array.from(pannello.querySelectorAll<HTMLElement>(SELETTORE_RAGGIUNGIBILI))
  return candidati.filter((elemento) => {
    if (elemento.tabIndex < 0) return false
    if ('disabled' in elemento && (elemento as HTMLElement & { disabled?: boolean }).disabled) return false
    if (elemento.hasAttribute('hidden') || elemento.closest('[hidden]')) return false
    return true
  })
}

/**
 * Trattiene il `Tab` dentro `pannello` e torna la funzione che lo rilascia.
 *
 * All'apertura porta il focus su `focusIniziale`, o sul pannello stesso se non è dichiarato —
 * mai sul primo elemento per conto proprio: su un foglio di scelta il focus sulla prima
 * pastiglia suggerirebbe una scelta che l'utente non ha fatto (§5.41).
 *
 * Al rilascio restituisce il focus all'àncora, se è ancora nell'albero. La funzione restituita è
 * idempotente: chiamarla più volte restituisce il focus UNA sola volta.
 *
 * @param pannello il pannello dell'overlay. Deve portare `tabIndex={-1}`.
 * @param opzioni.ancora dove torna il focus alla chiusura. Va dichiarata da chi apre uno strato
 *   il cui apritore può smontarsi (C-12). Assente o `null` → ripiego su `document.activeElement`
 *   al montaggio, che è il comportamento storico di `Sheet` — v. il commento di testa.
 * @param opzioni.focusIniziale dove va il focus all'apertura. Assente → il pannello.
 */
export function trappolaFocus(
  pannello: HTMLElement,
  opzioni?: { ancora?: HTMLElement | null; focusIniziale?: HTMLElement | null }
): () => void {
  // Si cattura PRIMA di spostare il focus, o il ripiego catturerebbe il pannello stesso.
  const attivoAllApertura = document.activeElement
  const ancora =
    opzioni?.ancora ?? (attivoAllApertura instanceof HTMLElement ? attivoAllApertura : null)

  function alTasto(evento: KeyboardEvent): void {
    if (evento.key !== 'Tab') return

    const raggiungibili = raggiungibiliDentro(pannello)

    // Pannello senza niente da raggiungere: il `Tab` non ha dove andare DENTRO, e fuori non deve
    // andare. Il focus resta sul pannello, che per contratto porta `tabIndex={-1}`.
    if (raggiungibili.length === 0) {
      evento.preventDefault()
      pannello.focus()
      return
    }

    const attivo = document.activeElement
    // -1 vale sia per «il focus è sul pannello» (il caso all'apertura) sia per «è su un elemento
    // interno fuori dal giro» (`tabIndex` negativo, ricevuto dal codice): in entrambi i casi il
    // bordo è il capo della sequenza, dalla parte in cui si sta andando.
    const indice = attivo instanceof HTMLElement ? raggiungibili.indexOf(attivo) : -1

    if (evento.shiftKey) {
      if (indice <= 0) {
        evento.preventDefault()
        raggiungibili[raggiungibili.length - 1].focus()
      }
      return
    }

    if (indice === -1 || indice === raggiungibili.length - 1) {
      evento.preventDefault()
      raggiungibili[0].focus()
    }
    // Fra un bordo e l'altro non si tocca niente: il giro interno lo fa il browser, con le sue
    // regole — che sono più ricche di qualunque riscrittura fatta qui.
  }

  pannello.addEventListener('keydown', alTasto)

  const bersaglio = opzioni?.focusIniziale ?? pannello
  bersaglio.focus()

  let rilasciato = false
  return function rilascia(): void {
    if (rilasciato) return
    rilasciato = true
    pannello.removeEventListener('keydown', alTasto)
    // Un'àncora staccata dall'albero non riceve il focus: `focus()` su un nodo fuori dal
    // documento non fa niente e lascerebbe credere che il focus sia tornato a posto.
    if (ancora && document.contains(ancora)) {
      ancora.focus()
    }
  }
}
