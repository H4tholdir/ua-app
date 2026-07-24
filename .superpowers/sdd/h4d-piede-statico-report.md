# H4d — Piede statico (abrogazione del capitolo H4c)

**Ratifica:** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`, APPEND 26/07 (verifica
secondo giro fix, build 1303d1f), punto 1 — commit del verbale `5957b24`.

Parole di Francesco: «l'animazione "divisa" in due step non mi piace per nulla… non possiamo fare
in modo che non ci siano animazioni? il blocco resta tutto fermo nella home, quando swippo si
entra direttamente nella zona delle cassette, punto». E: «resta anche una piccola fascia del
blocco panna in basso» (sulla pagina/stanza cassette).

## Approccio scelto: DENTRO il pannello (non un'alternativa)

Il piede (`TastoPiu`, wrappato in `<div className="foot">`) è stato spostato da fratello del
pager (fuori da `.corpo`, in `HomeV3.tsx`) a un nuovo prop `piedePile` reso da `StanzePager`
DENTRO `.ua-stanza[data-stanza="pile"]`, come FRATELLO di `.ua-stanza-pile-scroll` (non figlio):

```
.ua-stanza[data-stanza="pile"]        (flex column, altezza definita dallo stretch del genitore)
  .ua-stanza-pile-scroll              (flex:1, overflow-y:auto — rete di sicurezza verticale)
  {piedePile}                         (il piede, NUOVO qui — flex naturale, si posiziona in fondo)
```

Verificate le tre implicazioni segnalate nel brief prima di implementare:

- **(a) Ancoraggio verticale** — `.ua-stanza` eredita un'altezza DEFINITA (stretch di
  `.ua-stanze-viewport`, che a sua volta discende da `.ua-home` `min-height:100dvh` via `.corpo`
  `flex:1`), esattamente come accadeva prima per `.corpo` (padre diretto del vecchio piede
  fratello). Mettendo il piede come fratello di `.ua-stanza-pile-scroll` (flex:1) invece che
  come suo figlio, la struttura è IDENTICA a "prima" solo un livello più in profondità: il piede
  non entra mai nello scroll interno di sicurezza, resta ancorato in fondo al pannello. Nessuna
  regressione — verificato dal vivo (v. sotto) e via `getBoundingClientRect`.
- **(b) scroll-snap/larghezze** — non toccati: `.ua-stanza` non cambia `flex:0 0 100%` né
  `scroll-snap-align`, si aggiunge solo un figlio in più al suo interno.
- **(c) inert/aria-hidden** — `StanzePager` già mette `inert`/`aria-hidden` su `.ua-stanza`
  intera; verificato che `@testing-library/dom` (`isInaccessible`, il motore dietro
  `getByRole`) cammina gli ANTENATI cercando `aria-hidden`/`display:none`/`hidden`, quindi un
  discendente eredita l'invisibilità dell'ancestor senza bisogno di un proprio
  `aria-hidden`/`inert` — il piede stesso non dichiara più nulla di suo (semplificazione: un
  solo posto lo decide, non due). L'attributo HTML `inert` reale (bloccca focus/click nei
  browser) cascade ai discendenti per specifica, quindi anche l'interattività è coperta.

Nessuna strada alternativa è stata necessaria: l'approccio "dentro il pannello" soddisfa la
ratifica senza compromessi.

## Cosa è stato rimosso

- **`src/components/features/home/piede-swipe.ts`** — ELIMINATO. Conteneva
  `progressoDaScroll`, `mappaPiedeSwipe`, `bersaglioRilascio`, `bersaglioStanza`,
  `piedeSenzaIngombro`, `piedeIngombro`: tutte funzioni pure esistite SOLO per la coreografia
  C2, senza altri chiamanti nel repo (verificato via grep). Nessun residuo da "ridurre" —
  rimozione totale.
- **`src/components/features/home/HomeV3.tsx`** — rimossi: `progressoSwipe` (motion value),
  `piedeRef`, `rilasciandoRef`, `controlliRilascioRef`, `scorrendoRef`, l'effect che scriveva le
  tre custom property CSS + `--piede-ingombro` + classe `.is-vuoto` via ref, `riconcilia`
  (`useCallback`), l'effect di riconciliazione su `stanzaAttiva`, `onProgressoSwipe`/
  `onPresaSwipe`/`onRilascioSwipe`/`onScrollAssestato` (le 4 funzioni handler), l'effect di
  cleanup della molla orfana. Rimosso anche lo STATO `stanzaAttiva` stesso (`useState` +
  `setStanzaAttiva`/`onStanzaChange` passato a `StanzePager`): serviva SOLO a pilotare
  `inert`/`aria-hidden` del vecchio piede-fratello — ora quella semantica arriva per eredità
  dalla stanza ospite, quindi HomeV3 non ha più bisogno di tenerne una copia. Import puliti:
  `useCallback`, `useMotionValue`, `animate` (motion/react), `molla`/`useReducedMotion`
  (v3/motion), `StanzaHome` (type), le 5 funzioni da `piede-swipe.ts`.
- **`src/components/features/home/StanzePager.tsx`** — rimossi: i listener
  `scroll`/`touchstart`/`touchend`/`touchcancel`/`scrollend` sul viewport (esistevano solo per
  calcolare/inoltrare il progress alla coreografia), i 4 ref di callback
  (`onProgressoSwipeRef`/`onPresaSwipeRef`/`onRilascioSwipeRef`/`onScrollAssestatoRef`) e il
  loro effect di sync, le 4 prop `onProgressoSwipe`/`onPresaSwipe`/`onRilascioSwipe`/
  `onScrollAssestato` (incluso JSDoc). AGGIUNTO: prop `piedePile?: ReactNode`, reso come
  fratello di `.ua-stanza-pile-scroll` nel ramo `pile` del render. Import
  `progressoDaScroll` rimosso. **Invariati** (predatano H4c, non toccati): `onStanzaChange`,
  `footer` (prop già morta prima di H4c), l'IntersectionObserver a soglia 0.6, `vaiA`, l'URL
  sync (`sincronizzaUrlStanza`/`popstate`), `stanzaEffettiva`, il focus management, `ridotto`
  (`useReducedMotion`, usato da `vaiA` per lo scrollTo — non dalla coreografia).
- **CSS inline in `HomeV3.tsx`** (`.ua-home .foot`) — rimossi tutti i `calc(* var(--piede-*))`,
  le regole `.ds-tastopiu { transform/opacity: var(--piede-tondo-*) }`, `.foot > div >
  span:last-child { opacity: var(--piede-etichetta-opacita) }`, `.foot.is-vuoto { display:none
  }`. Sostituiti con un blocco statico (`margin-top`/`display`/`gap`/`padding-bottom` fissi,
  nessuna `var()`).
- **`ds-v3.css`**: NESSUNA modifica necessaria — l'ancoraggio funziona per costruzione (v.
  sopra), nessuna nuova regola richiesta.

## Test rimossi (con motivazione)

- **`tests/unit/piede-swipe.test.ts`** (intero file, 34 test) — testava SOLO le funzioni pure di
  `piede-swipe.ts`, eliminato. Abrogazione ratificata (verbale 26/07, commit `5957b24`): codice
  morto testato è codice morto, nessun comportamento superstite da proteggere.
- **`tests/unit/home-piede-swipe.test.tsx`** (intero file, 39 test) — testava il guscio React
  della coreografia C2 in `HomeV3.tsx` (custom property, molla al rilascio, riconciliazione,
  collasso ingombro): tutto il meccanismo sotto test è stato rimosso dal codice, quindi il file
  intero è diventato codice morto testato.
- **`tests/unit/stanze-pager.test.tsx`**, describe `«onProgressoSwipe/onPresaSwipe/
  onRilascioSwipe (capitolo H4c)»` (4 test) — presidiava i listener scroll/touch di
  `StanzePager` che esistevano solo per alimentare la coreografia, entrambi rimossi insieme.

**Nessun test-zombie lasciato**: verificato con grep che nessun riferimento a
`piedeRef|progressoSwipe|mappaPiedeSwipe|piede-swipe|onProgressoSwipe|onPresaSwipe|
onRilascioSwipe|onScrollAssestato|piedeIngombro|piedeSenzaIngombro|bersaglioRilascio|
bersaglioStanza` sopravvive nel codice o nei test (solo commenti storici che citano il file
rimosso per contesto).

## Test aggiunti

Nuovo describe in `stanze-pager.test.tsx`, `«HomeV3 — piede statico nel pager (verbale 26/07,
abroga H4c)»` (6 test): il piede è discendente DOM di `[data-stanza="pile"]` mai di
`[data-stanza="parete"]` (un solo `.foot` nel documento); nessuna custom property/stile inline
sul nodo (né da un ref né altrimenti), nessuna classe `.is-vuoto`; un tick di scroll nativo
simulato non scrive più nulla sul piede (nessun listener residuo); il tap sul piede porta a
`/lavori/nuovo` (invariato); le forme non-pager (`'pile'`, `'parete'`) restano come da spec
preesistente (piede fuori da ogni stanza / assente).

I test preesistenti che proteggono comportamenti SOPRAVVISSUTI (esistenza/sparizione del piede
per stanza, forme non-pager, `onStanzaChange` del pager) sono rimasti INVARIATI — non serviva
adattarli: il contratto osservabile (conteggio bottoni via `getByRole`, presenza `[data-stanza]`)
non è cambiato.

## Suite e delta

Baseline pre-modifica: **3137 passed / 19 skipped** (325 file, 322 passed + 3 skipped).
Dopo la modifica: **3066 passed / 19 skipped** (323 file, 320 passed + 3 skipped).

Delta: **-71 test, -2 file**. Motivato al 100%: 34 (piede-swipe.test.ts) + 39
(home-piede-swipe.test.tsx) + 4 (describe onProgressoSwipe/onPresaSwipe/onRilascioSwipe in
stanze-pager.test.tsx) = 77 rimossi, − 6 aggiunti = 71 netti. Nessun test rimasto rosso, nessun
test saltato in più rispetto alla baseline (19 skipped invariato).

`npx tsc --noEmit`: 0 errori.

## Evidenza live (:3042, build dev del worktree)

Swipe orizzontale (mobile 375×812, gesto simulato via scroll deltaX su un browser reale, non
jsdom): il piede scivola via CON la home (nessuna dissolvenza/scala separata — è la conseguenza
diretta di essere un discendente del pannello che scorre), si arriva sulla pagina «Le cassette»
SENZA alcuna fascia panna in basso (screenshot), tornando indietro il piede è semplicemente lì,
fermo, senza animazione di ricomparsa. Verificato via JS nel browser reale:

```
{"footExists":true,"footStyleAttr":null,"footInsidePile":true,"footInsideParete":false,"footCountTotal":1}
```

— un solo nodo `.foot` nel documento, nessuno stile inline (nessuna custom property residua),
dentro la stanza Pile, mai dentro la Parete. Tap sul tasto → navigazione reale a
`/lavori/nuovo` confermata (comportamento pre-esistente di `TastoPiu.tsx`, non toccato).

## Dubbi/limiti

- Nessuno strutturale. L'unico avvertimento operativo: il click sintetico del tool di
  automazione browser (CDP mouse event) non ha attivato l'`onClick` del `motion.button` di
  `TastoPiu` in questo ambiente (probabile mismatch col riconoscimento gesture di Motion in
  questo harness) — un `el.click()` via JS lo conferma invece regolarmente. Non è un difetto
  introdotto da questa ondata (TastoPiu.tsx non è stato toccato) e non impatta l'uso reale
  (tap fisico/mouse reale sul device).
