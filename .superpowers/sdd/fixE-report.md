# FIX-E — D3 (dots) + D2 (pila tagliata) + D5a (parete compressa) + D5b/D8 (refresh embedded + back) + D4 (bump linguetta) — report

**Riferimento:** verbale QA `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`, sezione
«Ri-collaudo device #1», punti D2, D3, D4, D5, D8. Brief: `.superpowers/sdd/fixE-brief.md`.

---

## E1 — D3: eliminazione dei dot indicatori di pagina (decisione ratificata)

### Conferma della causa / del contesto

Confermato in codice: `ProgressDotsStanze`/`idTabStanza` (`src/components/ds/ProgressDots.tsx`)
erano un secondo componente, distinto dal `ProgressDots` del wizard, montato da `StanzePager.tsx`
(`<div className="ua-stanze-dots"><ProgressDotsStanze .../></div>`) con stile scoped in
`ds-v3.css` (`.ua-stanze-dots`, più lo `<style>` inline `.ds-dot-stanza:focus-visible` dentro il
componente stesso). Erano un `role="tablist"` vero con due `role="tab"`, roving tabindex e un
handler `onKeyDown` per le frecce ←→ — cioè l'unico percorso da tastiera verso la stanza Parete
che non passasse dallo swipe.

### Cosa è stato implementato

- **`src/components/ds/ProgressDots.tsx`** — rimossi `ProgressDotsStanze`, `idTabStanza` e la
  costante `HIT_AREA` (usata solo lì). Resta solo `ProgressDots` (wizard, invariato) e le
  costanti condivise (`DIAMETRO`/`LARGHEZZA_ATTIVO`/`GAP`).
- **`src/components/features/home/StanzePager.tsx`**:
  - rimosso l'import di `ProgressDotsStanze`/`idTabStanza` e il blocco `<div className="ua-stanze-dots">…</div>`;
  - rimossi `role="tabpanel"`/`aria-labelledby`/`id` dai due pannelli (senza tab non ha senso un
    `aria-labelledby` che punta a un tab inesistente — sarebbe un riferimento a vuoto, un difetto
    a sé); i pannelli restano identificabili da `data-stanza` (invariato, usato anche dal CSS
    di E3 e dai test);
  - rimossi `ID_PANNELLI`/`ETICHETTE` (servivano solo ai dot) e l'`indice` derivato (serviva solo
    alla prop `attiva` dei dot);
  - **semplificato `vaiA`**: perso il parametro `origine: 'tap' | 'freccia'` (il ramo `'freccia'`
    era SOLO per le frecce dei dot, ora morte) e il ramo «tap sulla stanza già attiva» (quel
    caso nasceva SOLO dal tap su un dot che rappresentava la stanza corrente — con i due soli
    chiamanti rimasti, la linguetta e il tasto «‹ Indietro», la destinazione è SEMPRE la stanza
    opposta a quella attiva, quindi il caso è strutturalmente impossibile ora). `vaiA` oggi
    prende solo `(destinazione, opts?: { giaRegistrato? })` e applica sempre lo stesso
    comportamento di focus (guardia touch inclusa, invariata).
- **`src/app/ds-v3.css`** — rimossa la regola `.ua-stanze-dots { margin-top: 4px; display: flex; justify-content: center; }`.

### Il percorso da tastiera dopo la rimozione dei dot (richiesto esplicitamente dal brief)

Verificato cosa resta raggiungibile da tastiera senza reintrodurre un indicatore visivo:

- **pile → parete**: la linguetta «Le cassette» (`LinguettaCassette.tsx`) è un `motion.button`,
  cioè un `<button>` HTML vero — Tab la raggiunge nell'ordine naturale del documento, Invio/Spazio
  la attivano come qualunque bottone nativo. **Nessun codice dedicato in più è stato scritto per
  renderla operabile da tastiera** — a differenza dei dot, che avevano bisogno di roving
  tabindex + un `onKeyDown` scritto a mano.
- **parete → pile**: il tasto «‹ Indietro» dell'header della parete (`PareteClient.tsx`), già un
  `<button>` reale nel chrome di pagina che rende sempre.
- Testato in `tests/unit/stanze-pager.test.tsx`, describe «percorso da tastiera dopo la rimozione
  dei dot (D3)»: `linguetta.focus()` + `{Enter}` → `pushState('/cassette')` + parete non più
  inert; dentro il pannello parete, `indietro.focus()` + `{Enter}` → torna alle pile.

### LIMITE NOTO — da dichiarare esplicitamente, non un "tutto risolto"

`LinguettaCassette` è **transitoria**: compare, resta ~5s (`MS_IN_VISTA`) e poi si RITIRA (esce
dall'albero, non `display:none`); e smette di comparire per sempre dopo 3 accessi riusciti
(`ACCESSI_APPRESA`, persistito in `localStorage`). Questo significa che il percorso da tastiera
verso la parete che questo fix garantisce **esiste SOLO mentre la linguetta è in vista** — non è
un accesso permanente. Dopo il timeout dei 5s o dopo il terzo accesso (linguetta "appresa"), un
utente da sola tastiera che non ha ancora scoperto lo swipe non ha più, in questo momento, un
modo di raggiungere la stanza Parete dal lato pile del pager (resta comunque raggiungibile da
`/cassette` standalone o dalla preferenza «parete»/`?stanza=parete`).

Questo NON è stato lasciato a sorpresa: il brief E1 stesso pone la domanda («garantisci un
percorso da tastiera equivalente... se l'unico percorso resta la linguetta, assicurati che sia
focusabile e attivabile da tastiera») e la accetta come soluzione valida per QUESTO fix — la
policy della linguetta (soglia/durata) è esplicitamente FUORI SCOPE (attende una decisione di
Francesco, v. §D4 sotto). Non ho quindi trattato la scomparsa della linguetta come un difetto da
correggere qui: l'ho documentata come limite noto, nei commenti di `ProgressDots.tsx` e
`StanzePager.tsx` e qui nel report, con una proposta di soluzione pulita per quando la policy sarà
decisa (un controllo dedicato, sempre presente nel DOM, visivamente nascosto — NON un secondo
indicatore visivo).

### Evidenza TDD

**RED** — `npx vitest run tests/unit/ProgressDots.test.tsx` (nuovo test, prima del fix):
```
✗ ProgressDots.tsx non esporta più ProgressDotsStanze né idTabStanza
  + Received: [Function ProgressDotsStanze]
 Test Files  1 failed | Tests  1 failed | 10 passed (11)
```
**GREEN** — dopo la rimozione da `ProgressDots.tsx`: `Test Files 1 passed | Tests 11 passed`.

Per `stanze-pager.test.tsx` (riscrittura estesa, non un singolo RED/GREEN isolabile): il file
dopo l'edit di `StanzePager.tsx` (fatto insieme, dato che i due si toccano) dava **39 test falliti
su 73** (tutti quelli che cliccavano `getAllByRole('tab')`, asserivano `aria-selected`, o
montavano `ProgressDotsStanze` direttamente) — quello è stato il RED per l'intera riscrittura.
Dopo aver sostituito i trigger (dot → linguetta/back-button/swipe) e rimosso i test ormai privi di
oggetto (frecce, «tap su stanza già attiva»): **64 test verdi** (comando:
`npx vitest run tests/unit/stanze-pager.test.tsx`).

---

## E2 — D2: pila «Appena arrivati» tagliata

### Conferma della causa

Confermata in `src/components/features/home/HomeV3.tsx`: `.ua-home .pile { justify-content: center }`
centra il blocco delle pile nello spazio residuo di `.corpo`. Misura QA (390×640):
`.ua-stanza-pile-scroll` box 377px vs `scrollHeight` 446px → 69px di sforo. `center` puro centra
anche l'ECCESSO (metà sopra, metà sotto), spingendo la 4ª pila sotto la piega — esattamente dove
prima cominciavano i dot.

### Cosa è stato implementato

In `src/components/features/home/HomeV3.tsx`, `.ua-home .pile`:
```css
justify-content: center; justify-content: safe center;
```
Due dichiarazioni, non una sostituzione secca: `safe center` centra quando il contenuto ci sta e
degrada ad ancoraggio in alto (`start`) quando sfora — l'eccesso cade nel fondo scrollabile di
`.ua-stanza-pile-scroll` (invariato, scrolla già) invece che sopra il bordo visibile. La `center`
dichiarata PRIMA resta come fallback: un motore che non riconoscesse il valore `safe center`
scarta SOLO quella seconda dichiarazione (valore non valido → CSS la ignora), la prima resta
l'ultima valida — il comportamento di oggi non regredisce mai, a prescindere dal supporto reale.
Il supporto per `safe`/`unsafe` su flexbox è diffuso da tempo sui target del collaudo (Chrome
Android, Safari iOS correnti) — non verificabile da qui con certezza assoluta, da confermare in
FASE 9 (QA browser reale); il commento nel codice lo segnala esplicitamente invece di affermarlo
come fatto certo.

### Calcolo documentato (non un test di layout — jsdom non fa layout)

In `tests/unit/home-fluida.test.tsx`: la rimozione dei dot (E1) libera il budget verticale che
occupavano — margin-top di `.ua-stanze-dots` (4px) + l'intera hit-area del tablist (44px, touch
target di legge) = **48px**, restituiti a `.ua-stanza-pile-scroll`. Applicato ai numeri della
misura QA: overflow prima 69px (446−377) → overflow dopo 21px (446−(377+48)). Riduce lo sforo,
NON lo azzera — la taratura fine del clamp resta demandata (già a ledger, non richiesta da
questo fix): il criterio di accettazione è che l'eccesso resti SEMPRE raggiungibile via lo
scroll di sicurezza invariato, mai nascosto dal centraggio — garantito da `safe center`.

### Evidenza TDD

**RED** — `npx vitest run tests/unit/home-fluida.test.tsx` (nuovo test, prima del fix):
```
✗ .ua-home .pile dichiara center come fallback E POI safe center (progressive enhancement)
 Test Files  1 failed | Tests  1 failed | 7 passed (8)
```
**GREEN** — dopo l'edit di `HomeV3.tsx`: `Test Files 1 passed | Tests 8 passed`.

---

## E3 — D5a: assetto della parete = pagina /cassette vera, subito dopo lo swipe

### Conferma della causa

Confermata in `src/app/ds-v3.css`: `.ua-stanza { padding: 0 24px 36px }` (regola base, pensata
per la stanza Pile) si applicava ANCHE alla stanza Parete dentro il pager — la parete eredita
GIÀ il proprio padding orizzontale da `.ds-parete-shell`/`.ds-parete`, quindi quello di
`.ua-stanza` era un secondo strato che la route standalone `/cassette` non paga (shell interna
misurata ≈302px contro ≈350px standalone, −48px). Confermato anche che
`.ua-stanza-parete-scroll` non aveva ricevuto il nascondi-scrollbar che il gemello
`.ua-stanza-pile-scroll` aveva già (fix 1c, FIX-B): scrollbar visibile SOLO sul lato parete del
pager.

### Cosa è stato implementato

In `src/app/ds-v3.css`:
1. `[data-ds="v3"] .ua-stanza[data-stanza="parete"] { padding-left: 0; padding-right: 0; }` —
   scoped al solo lato parete via l'attributo `data-stanza` (già scritto da `StanzePager.tsx` su
   ogni pannello, invariato): la stanza Pile non cambia larghezza di un pixel.
2. Stesso trattamento nascondi-scrollbar del gemello, aggiunto a `.ua-stanza-parete-scroll`:
   `scrollbar-width: none; -ms-overflow-style: none;` + `.ua-stanza-parete-scroll::-webkit-scrollbar { display: none; }`.
   Lo scroll resta funzionante (overflow-y: auto invariato), solo la barra sparisce.

### Evidenza TDD

**RED** — `npx vitest run tests/unit/ds-v3/parete-fluida.test.ts` (2 nuovi test, prima del fix):
```
✗ .ua-stanza-parete-scroll nasconde la propria scrollbar ...
✗ la stanza parete del pager azzera il padding orizzontale duplicato di .ua-stanza (D5a) ...
```
**GREEN** — dopo i due edit CSS: `Test Files 1 passed | Tests 20 passed`.

---

## E4 — D5b + D8: gate dei refresh in modalità embedded

### Conferma della causa

Confermata in `src/components/features/cassette/PareteClient.tsx`: `sospendiRefresh`
(`sospendiRefreshRef`) copriva SOLO il refresh silenzioso su focus/visibilitychange. Le altre
tre chiamate a `router.refresh()` — `dopoCambio()` (creazione/rinomina riuscita), `riordina()`
(▲▼ dello sheet) e `onRefresh` passato a `useDragRiordino` (drop del drag riuscito) — restavano
NON gated, annotate esplicitamente in un commento come «limitazione nota». Con l'indirizzo già
spinto a `/cassette` (pager), una qualunque di queste tre chiamate rifà il fetch della route VERA
e sostituisce il pager con la pagina standalone: è insieme il «si sistema da solo» di D5 e la
causa del back incoerente di D8 (lo smontaggio distrugge i listener `popstate`/`urlPushataRef`
del pager).

### Cosa è stato implementato

In `src/components/features/cassette/PareteClient.tsx`:
- Introdotta `rileggiParete()`, unico punto che chiama `router.refresh()`:
  ```ts
  function rileggiParete() {
    if (!sospendiRefreshRef.current) router.refresh()
  }
  ```
- L'effect di focus/visibilitychange, `dopoCambio()`, `riordina()` e il callback `onRefresh`
  passato a `useDragRiordino` chiamano tutti `rileggiParete()` invece di `router.refresh()`
  diretto.
- `sospendiRefresh` di default resta `false`: sulla route standalone `/cassette` (mai passato da
  `StanzaParete`) il comportamento è **invariato** — ogni `router.refresh()` gira come prima.

### Evidenza TDD

**RED** — `npx vitest run tests/unit/parete-client.test.tsx` (test esistente FLIPPATO — prima
asseriva l'opposto, cioè che `sospendiRefresh` NON gatasse queste chiamate — + 2 nuovi test,
prima del fix):
```
✗ con sospendiRefresh=true, una rinomina riuscita (dopoCambio) NON chiama router.refresh
  AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
✗ con sospendiRefresh=true, uno spostamento ▲▼ riuscito (riordina) NON chiama router.refresh
  AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
✗ con sospendiRefresh=true, un drop di drag riuscito NON chiama router.refresh (D8)
  AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
 Test Files 1 failed | Tests 3 failed | 38 passed (41)
```
**GREEN** — dopo l'introduzione di `rileggiParete()`: `Test Files 1 passed | Tests 41 passed`.

Il test del drop di drag riusa il pattern di `use-drag-riordino.test.ts` (pointerdown fermo
300ms → lift → pointermove oltre soglia → pointerup su `window`, con fake timer per il lift e
`act(async () => {})` per lasciar risolvere la POST) ma monta `PareteClient` VERO — il punto sotto
esame è il callback che PareteClient passa come `onRefresh`, non l'hook isolato (già presidiato
altrove).

### Test del criterio di accettazione D8 (livello pager)

Aggiunto in `tests/unit/stanze-pager.test.tsx` (riusa il pattern esistente di mock
history+popstate, come richiesto dal brief): `describe('StanzePager — D8: il pager resta
montato dopo un'azione con refresh gated; il back fisico torna alle pile')`. Simula
esattamente la sequenza «swipe → parete → riordino ▲▼ riuscito» (fetch mockato 200), verifica
`refresh` MAI chiamato e il pannello pile ancora nel DOM (il pager non è stato sostituito), poi
un `popstate` sintetico e verifica che le pile tornino attive senza un secondo `history.back()`.
Verde al primo giro (la logica era già corretta dopo il fix di `PareteClient.tsx` — nessun RED
separato necessario qui, il RED del gate è già in `parete-client.test.tsx` sopra).

---

## E5 — D4 (parte meccanica): bump chiave linguetta

### Conferma della causa

Confermata in `src/components/features/home/LinguettaCassette.tsx`: `KEY = 'ua_linguetta_v3'`,
soglia 3 (`ACCESSI_APPRESA`). Sui device usati nei collaudi il contatore era già a/oltre 3: la
linguetta non compare più su NESSUN device di prova, apprendimento vero o no — un difetto di
collaudo, non di logica (la logica soglia/apprendimento è corretta, solo il contatore era saturo
per un motivo estraneo alla policy).

### Cosa è stato implementato

`const KEY = 'ua_linguetta_v4'` in `LinguettaCassette.tsx`. NIENT'ALTRO: soglia (3), durata (5s)
e policy restano invariate, come richiesto dal brief (decisione di Francesco in arrivo,
esplicitamente fuori scope qui).

### Evidenza TDD

**RED** — `npx vitest run tests/unit/linguetta-cassette.test.tsx tests/unit/HomeV3.test.tsx`
(2 nuovi test + 2 assert esistenti aggiornati alla nuova chiave, prima del fix):
```
✗ D4 (bump chiave) — un vecchio contatore saturo sotto la chiave morta ua_linguetta_v3 NON impedisce più la comparsa
✗ D4 — la persistenza vive sotto la chiave ua_linguetta_v4 (non più v3)
  AssertionError: expected null to be '1'
 Test Files 2 failed | Tests 4 failed | 7 passed (11)
```
**GREEN** — dopo il bump della chiave: `Test Files 2 passed | Tests 11 passed`.

---

## File modificati

- `src/components/ds/ProgressDots.tsx` — rimossa la variante «stanze» (E1)
- `src/components/features/home/StanzePager.tsx` — dots rimossi, `vaiA` semplificata, commenti
  aggiornati (E1)
- `src/components/features/home/HomeV3.tsx` — `justify-content: safe center` (E2), commento
  aggiornato (E1)
- `src/components/features/home/LinguettaCassette.tsx` — bump chiave `ua_linguetta_v4` (E5)
- `src/components/features/cassette/PareteClient.tsx` — `rileggiParete()` gate esteso (E4)
- `src/app/ds-v3.css` — rimossa `.ua-stanze-dots` (E1); aggiunte `.ua-stanza[data-stanza="parete"]`
  e nascondi-scrollbar di `.ua-stanza-parete-scroll` (E3)
- `tests/unit/ProgressDots.test.tsx` — guardia assenza export (E1)
- `tests/unit/stanze-pager.test.tsx` — riscrittura estesa: dots rimossi ovunque, trigger
  sostituiti (linguetta/back-button/swipe), nuovo describe percorso da tastiera (E1), nuovo test
  D8 a livello pager (E4), chiave linguetta aggiornata (E5)
- `tests/unit/home-fluida.test.tsx` — guardia `safe center` + calcolo documentato (E2)
- `tests/unit/ds-v3/parete-fluida.test.ts` — guardie padding/scrollbar parete (E3)
- `tests/unit/parete-client.test.tsx` — test del gate refresh flippato + 2 nuovi (E4)
- `tests/unit/linguetta-cassette.test.tsx`, `tests/unit/HomeV3.test.tsx` — chiave aggiornata (E5)

## Gate finali (eseguiti dopo tutti i fix, output reale)

```
npx vitest run
 Test Files  316 passed | 3 skipped (319)
      Tests  2879 passed | 19 skipped (2898)
```
Stesso totale della baseline pre-fix (2879/19): non è un errore di conteggio — in
`stanze-pager.test.tsx` sono stati RIMOSSI 9 test più del numero di test AGGIUNTI in
quel file (i test dedicati a dot/frecce/tap-su-stanza-già-attiva non avevano più oggetto), mentre
gli altri file ne hanno aggiunti complessivamente 9 in più. Il pareggio è una coincidenza
aritmetica dei numeri, non l'assenza di modifiche: ogni punto del brief ha la propria evidenza
RED→GREEN documentata sopra.

```
npx tsc --noEmit
(0 errori)

npx next build
(completata, tutte le route generate, nessun errore — solo il warning preesistente su
turbopack.root, non introdotto da questo fix)
```

## Self-review — cosa ho controllato e corretto prima di chiudere

1. **Grep di conferma** per riferimenti pendenti agli `id` rimossi dai pannelli
   (`ua-stanza-pile`/`ua-stanza-parete` come valore di `id=`/selettore CSS/`href="#…"`): nessuno
   trovato fuori dai commenti — nessuna scorciatoia (skip-link, deep-link, CSS con `#id`) dipendeva
   da quegli id.
2. **Claim sul supporto browser di `safe center`**: la prima stesura affermava «Safari dalla
   16.4» come fatto verificato — non potendolo confermare con certezza da qui, il commento è
   stato ammorbidito (il doppio-dichiarazione rende comunque innocuo un mancato supporto; la
   riverifica reale resta compito della FASE 9/QA browser).
3. **Comment cleanup**: rimossi/aggiornati riferimenti stantii a "dot"/"freccia" in commenti che
   descrivevano comportamento CORRENTE (non storico) in `StanzePager.tsx` e `HomeV3.tsx` — i
   commenti storici che narrano l'indagine di bug passati (es. T15.8) sono stati lasciati intatti
   perché restano un resoconto fedele di cosa è successo allora.
4. **YAGNI**: la rimozione del parametro `origine`/ramo `giaAttiva` in `vaiA` non era
   esplicitamente richiesta dal brief in quei termini, ma era la conseguenza diretta e onesta
   della richiesta di rimuovere "handler dedicati" ai dot — verificato che i due soli chiamanti
   rimasti (linguetta, back button) rendessero il ramo rimosso irraggiungibile, non solo
   inutilizzato nei test attuali.

## Concerns / limiti che solo il ri-collaudo su device può provare

- **`safe center` (E2)**: il supporto CSS reale su Safari iOS e Chrome Android dei device di
  collaudo non è stato verificato in questo ambiente (jsdom non fa layout). La doppia
  dichiarazione rende il fallback sicuro anche in caso di mancato supporto, ma il comportamento
  VISIVO (dove esattamente cade la 4ª pila a 390×640 con l'apparecchio vero) va confermato in
  FASE 9.
- **Percorso da tastiera transitorio (E1)**: come dichiarato sopra, il percorso da tastiera verso
  la parete esiste solo mentre la linguetta è in vista (~5s, o mai più dopo 3 accessi). Non è un
  difetto di QUESTO fix (il brief lo accetta esplicitamente), ma è un limite reale dell'accesso da
  tastiera che solo una decisione futura sulla policy della linguetta (fuori scope qui) può
  chiudere.
- **D8 a livello E2E reale**: il test D8 aggiunto è un test unitario/jsdom che simula history e
  popstate con mock — riproduce fedelmente la logica, ma non sostituisce una verifica su device
  reale del back fisico/gesto del browser dopo un drag vero (con animazioni, timing reale, e il
  comportamento REALE del router-cache di Next), che resta compito del QA browser (FASE 9).
- **Taratura fine del clamp (E2)**: esplicitamente fuori scope per questo fix (già a ledger) — lo
  sforo residuo (21px calcolati) resta, gestito dallo scroll di sicurezza, non da un fit perfetto.

---

## Fix di review su E4 — riflesso ottimistico di crea/rinomina/riordino ▲▼ in embedded (Important)

**Riferimento:** review del lavoro FIX-E sopra. Il gate E4 (D5b/D8) copre TUTTI i `router.refresh()`
del percorso parete dietro `sospendiRefresh` (`rileggiParete()` in `PareteClient.tsx`), corretto per
tenere il pager montato e la catena `popstate` intatta. Ma tre percorsi di mutazione non avevano MAI
avuto uno stato ottimistico locale — creazione, rinomina/colore, ▲▼ — e in embedded, dove il refresh
è gated, restavano silenziosamente stantii sullo schermo finché non arrivava il prossimo caricamento
VERO della route (drag escluso: quello aveva già l'ottimistico `ordineIds` da prima).

### Cosa è cambiato, per percorso

- **Creazione** (`NuovaCassettaSheet.onCreata`) — il corpo 201 della RPC (`{cassetta:{id,nome,
  colore,posizione}}`) ora si legge (`res.json()`, difensivo come il resto del file) e si passa a
  `onCreata`, che prima non riceveva alcun dato. `PareteClient` lo raccoglie in `dopoCreata`: una
  guardia sui campi (stringhe non vuote) aggiunge la cassetta a uno stato locale `extra` SOLO se il
  corpo è valido — un corpo malformato non riflette nulla piuttosto che montare una `Cassetta` con
  prop `undefined`.
- **Rinomina/colore** (`CassettaSheet.onCambiata`) — `salvaNome`/`scegliColore`, su PATCH riuscita
  (200), ora passano `{id, nome}` o `{id, colore}`: il valore GIÀ SOTTOMESSO, non una rilettura dal
  server (la route non lo restituisce comunque). `PareteClient` li applica in `dopoCambio` a una
  mappa `overrides` (patch per id, merge non sostituzione — una rinomina e una ricolorazione in
  sequenza sulla stessa cassetta non si perdono a vicenda). Le altre quattro azioni dello sheet
  (sposta-lavoro, segna-libera, butta-via, assegna-lavoro) continuano a chiamare `onCambiata()`
  SENZA patch — restano fuori scope di questo fix (v. «Limiti» sotto).
- **▲▼** (`riordina` in `PareteClient`) — l'ordine si imposta OTTIMISTICAMENTE (`setOrdineManuale`)
  PRIMA di attendere la POST, mirror esatto del contratto già in vigore per il drag
  (`useDragRiordino`: lì `ordineIds` si imposta al lift, qui al click ▲▼). POST fallita → rollback
  immediato (`setOrdineManuale(null)`); riuscita → resta finché non arriva un `parete` vero dal
  server (stessa condizione di reset di `extra`/`overrides`, sotto).

### L'architettura: `pareteVista`, un solo posto che compone l'overlay

`parete` resta un prop server, mai mutato. Un nuovo derivato, `pareteVista` (`useMemo`), applica in
ordine: patch di `overrides` sulle cassette esistenti → append di `extra` → riordino secondo
`ordineManuale` (le cassette non elencate in esso, es. una `extra` creata dopo un ▲▼, restano in
coda — non spariscono mai). OGNI calcolo a valle (ricerca `accesi`/`visibili`, `prossimoNome`,
`libere`, `cassettaAperta`/`postoAperta`, `dragAbilitato`, il `parete` passato a `useDragRiordino`,
`perId`) lavora su `pareteVista`, mai sul prop nudo — così ▲▼ e ricerca non hanno due fonti d'ordine
che potrebbero disaccordarsi (una revisione del piano iniziale, che teneva `▲▼` come uno shadow
separato SOPRA `visibili` in `cassetteRender`: bypassava il filtro di ricerca e nascondeva le
`extra` finché `ordineManuale` restava valorizzato — corretto piegando il riordino DENTRO
`pareteVista` invece che accanto).

Reset: quando l'IDENTITÀ del prop `parete` cambia (`pareteBase !== parete`, pattern verbatim di
`pareteRif` in `useDragRiordino`) — cioè quando arriva un dato VERO dal server (standalone dopo il
refresh; embedded al prossimo caricamento reale della route) — `extra`/`overrides`/`ordineManuale`
si azzerano tutti insieme, in render-phase. Il server vince SEMPRE: l'overlay non combatte mai un
dato fresco, sparisce da solo appena ne arriva uno.

### TDD — RED poi GREEN

RED (le tre guardie di successo fallivano, le due guardie di fallimento passavano già a vuoto —
nessuna regressione, solo il comportamento CORRETTO era assente):

```
$ npx vitest run tests/unit/parete-client.test.tsx
 × creazione riuscita in embedded: la nuova cassetta appare SUBITO, senza un vero refresh
 × rinomina riuscita in embedded: il nome nuovo appare SUBITO sul muro, senza un vero refresh
 × ▲▼ riuscito in embedded: il muro si sposta SUBITO, senza un vero refresh
 Tests  3 failed | 44 passed (47)
```

GREEN, dopo l'implementazione (overlay `pareteVista` + `dopoCreata`/`dopoCambio` estesi +
`riordina` ottimistico):

```
$ npx vitest run tests/unit/parete-client.test.tsx
 Test Files  1 passed (1)
      Tests  47 passed (47)

$ npx vitest run tests/unit/parete-client.test.tsx tests/unit/cassetta-sheet.test.tsx \
    tests/unit/nuova-cassetta-sheet.test.tsx tests/unit/stanze-pager.test.tsx
 Test Files  4 passed (4)
      Tests  150 passed (150)
```

Gate finali (tutti e tre, output reale):

```
$ npx tsc --noEmit
(0 errori)

$ npx vitest run
 Test Files  316 passed | 3 skipped (319)
      Tests  2885 passed | 19 skipped (2904)

$ npx next build
(completata, tutte le route generate, nessun errore)
```

### Convivenza con il refresh standalone

`rileggiParete()` (gated) resta invariato e gira ESATTAMENTE come prima in ogni percorso — l'overlay
non lo sostituisce, si limita ad aggiungersi. In standalone (`sospendiRefresh` di default `false`)
il refresh reale arriva subito dopo l'aggiornamento ottimistico: la finestra in cui l'overlay è
l'unica fonte è impercettibile (un render), e quando il nuovo `parete` arriva dal server la
condizione `pareteBase !== parete` lo intercetta e azzera l'overlay — il dato server vince, senza
un flicker percettibile (l'overlay aveva comunque già anticipato lo stesso valore, salvo il caso
raro di scrittura concorrente da un altro dispositivo). Nessuna guardia esistente su questo
comportamento si è rotta (i test di `describe('PareteClient — un'azione RIUSCITA chiude lo sheet …')`
restano verdi senza modifiche).

### Minor incluso nello stesso dispatch

`tests/unit/stanze-pager.test.tsx` (~riga 137) — il commento sopra il reset di `localStorage`
citava ancora `ua_linguetta_v3` e «swipe/dot» mentre la chiave è `ua_linguetta_v4` (D4) e i dot sono
rimossi (D3) da tempo. Corretto per riferirsi alla chiave vera e all'unico trigger esplicito
rimasto (la linguetta).

### Limiti (scelta deliberata, non dimenticanza)

- **Quattro azioni di `CassettaSheet` restano senza riflesso ottimistico**: sposta-lavoro,
  segna-libera, butta-via, assegna-lavoro. Chiamano `onCambiata()` senza patch — in embedded
  restano stantie fino al prossimo caricamento vero, ESATTAMENTE come denunciato dal finding
  originale (che elencava solo creazione/rinomina-colore/▲▼). Non sono state estese perché
  toccano l'assegnazione di un lavoro fra cassette DIVERSE (o la sua rimozione), un dominio più
  ampio di una singola patch locale — richiederebbe una decisione di design a sé (quali due/tre
  cassette aggiornare, come trattare `posizione`), fuori scope di questo dispatch.
- **`ordineDrag` (il drop del drag, non toccato da questo fix) resta persistente in embedded oltre
  il drop riuscito** finché non arriva un `parete` vero — una ricerca avviata subito dopo un drop
  vedrebbe l'intera parete invece del solo filtro (stesso tipo di scavalcamento che il piano
  iniziale rischiava di introdurre per il ▲▼, qui però preesistente al di fuori di questo fix, non
  introdotto da esso). Segnalato, non risolto: fuori dai tre percorsi del finding.

---

## Chiusura del gap dichiarato sopra — riflesso ottimistico anche per assegna/sposta/segna-libera/butta-via

**Riferimento:** il limite dichiarato nella sezione precedente («Quattro azioni di `CassettaSheet`
restano senza riflesso ottimistico») — dispatch dedicato a chiuderlo, riusando LO STESSO
meccanismo (`pareteVista`, overlay in `PareteClient.tsx`), non un secondo sistema parallelo.

### Il meccanismo generalizzato: da `patch` singolo a `EffettoCassetta[]`

Il fix precedente passava a `onCambiata` un singolo oggetto `{id, nome?, colore?}` — bastava per
rinomina/colore, che toccano sempre UNA cassetta con UN campo. Le quattro azioni mancanti non ci
stavano dentro: sposta-lavoro tocca DUE cassette in un solo successo (la sorgente che si libera, la
destinazione che si occupa). `CassettaSheet.tsx` esporta ora un tipo `EffettoCassetta` (discriminato
su `tipo`) e `onCambiata` accetta un ARRAY:

```ts
export type EffettoCassetta =
  | { tipo: 'patch'; id: string; nome?: string; colore?: string }
  | { tipo: 'occupa'; id: string; lavoro: NonNullable<CassettaParete['lavoro']> }
  | { tipo: 'libera'; id: string }
  | { tipo: 'rimuovi'; id: string }
```

`PareteClient.dopoCambio(effetti?: EffettoCassetta[])` applica ogni elemento allo STESSO
`overrides` di prima (`patch`/`occupa`/`libera` sono tutti un merge sull'override esistente — una
rinomina e un'occupazione in sequenza sulla stessa cassetta non si perdono a vicenda), più un nuovo
Set `rimosse` per `rimuovi` (l'unico effetto che non modifica una cassetta viva ma la fa sparire dal
muro — `pareteVista` ora filtra `rimosse` DOPO aver applicato i patch, sia sulle cassette del prop
sia su quelle `extra`). Nessun secondo overlay: stesso `pareteVista`, stesso reset in render-phase
quando l'identità del prop `parete` cambia (righe già presidiate dai test FIX-E precedenti, verdi
senza modifiche).

### Cosa cambia, per azione

- **assegna-lavoro** (`CassettaSheet.assegnaLavoro`, sottovista «Metti un lavoro») — POST riuscita
  → `onCambiata([{tipo:'occupa', id: cassetta.id, lavoro: {...}}])`. Il `lavoro` si costruisce dal
  contratto di `GET /api/cassette/lavori-liberi` (`LavoroLibero`: id/numero/dentista/pazienteAlias/
  urgenza) — **RESIDUO dichiarato, non un dato inventato**: `LavoroLibero` non porta `paziente`
  (nome pieno, fallback quando manca l'alias)/`tipoDispositivo`/`descrizione` (usati da
  `Cassetta.tsx` per la miniatura granulare). Si riflette SOLO ciò che si ha: `paziente` cade sul
  fallback `'—'` (identico a quanto la targa farebbe comunque con un dato assente),
  `tipoDispositivo`/`descrizione` restano `null` → `miniaturaPerLavoro` degrada da sé alla
  miniatura `'generica'` (mai un crash, mai un valore fabbricato). Il refresh (standalone) o il
  prossimo caricamento vero (embedded) sostituiscono questo riflesso parziale col dato pieno.
- **sposta-lavoro** (`CassettaSheet.spostaLavoroIn`) — POST riuscita → un array a DUE elementi:
  `{tipo:'libera', id: cassetta.id}` (la sorgente, quella aperta nello sheet) e
  `{tipo:'occupa', id: destinazione.id, lavoro: cassetta.lavoro}` (la destinazione riceve il
  `lavoro` PIENO che la sorgente aveva già in `parete` — nessun residuo qui, a differenza di
  assegna-lavoro: il contratto della parete porta sempre tutti i campi).
- **segna-libera** (`CassettaSheet.segnaComeLibera`) — POST (body `null`) riuscita →
  `onCambiata([{tipo:'libera', id: cassetta.id}])`. Nessun residuo: liberare non richiede dati in
  più, solo azzerare `lavoro`.
- **butta-via** (`CassettaSheet.buttaVia`) — DELETE riuscita (SOLO su cassetta libera, invariato) →
  `onCambiata([{tipo:'rimuovi', id: cassetta.id}])`. `PareteClient` la toglie da `pareteVista` via
  `rimosse`: con quella l'unica cassetta della parete, il muro passa allo stato vuoto ds (`Vuoto`,
  «La tua parete è vuota») — verificato dal test dedicato.

Le due azioni già coperte dal fix precedente (rinomina/colore) sono state riscritte nello stesso
formato ad array (`onCambiata([{tipo:'patch', ...}])`) per uniformità — comportamento invariato,
i test esistenti (che verificano solo `toHaveBeenCalledTimes(1)`, mai la forma dell'argomento) sono
rimasti verdi senza modifiche.

### TDD — RED poi GREEN

RED (le quattro guardie di successo fallivano — le guardie di fallimento/409 passavano già,
perché "non cambiare nulla" era vero anche prima del fix; sono guardie di non-regressione, non un
sintomo nuovo):

```
$ npx vitest run tests/unit/parete-client.test.tsx -t "gap disclosure"
 × assegna-lavoro riuscita in embedded: la cassetta libera mostra SUBITO il lavoro assegnato, senza un vero refresh
 × sposta-lavoro riuscita in embedded: la sorgente torna libera e la destinazione mostra il lavoro, SUBITO, senza un vero refresh
 × segna-libera riuscita in embedded: la cassetta torna libera SUBITO sul muro, senza un vero refresh
 × butta-via riuscita in embedded: la cassetta sparisce SUBITO dal muro, senza un vero refresh
 Tests  4 failed | 4 passed | 47 skipped (55)
```

GREEN, dopo l'implementazione (`EffettoCassetta[]` in `CassettaSheet.tsx` + `overrides` con
`lavoro` + `rimosse` in `PareteClient.tsx`):

```
$ npx vitest run tests/unit/parete-client.test.tsx
 Test Files  1 passed (1)
      Tests  55 passed (55)

$ npx vitest run tests/unit/parete-client.test.tsx tests/unit/cassetta-sheet.test.tsx \
    tests/unit/nuova-cassetta-sheet.test.tsx tests/unit/stanze-pager.test.tsx
 Test Files  4 passed (4)
      Tests  158 passed (158)
```

Gate finali (tutti e tre, output reale):

```
$ npx tsc --noEmit
(0 errori)

$ npx vitest run
 Test Files  316 passed | 3 skipped (319)
      Tests  2893 passed | 19 skipped (2912)

$ npx next build
(completata, tutte le route generate, nessun errore)
```

2893/2912 contro la baseline 2885/2904 di prima di questo dispatch: +8 test, tutti nuovi (le 4
guardie di successo + le 4 guardie di fallimento/409, una per azione), zero rimossi, zero rotti.

### Limiti (residui dichiarati, non dimenticanze)

- **assegna-lavoro riflette dati parziali** (v. sopra): `paziente` sul fallback `'—'` quando manca
  l'alias, miniatura sempre `'generica'` (mai quella granulare/macro) finché non arriva un
  caricamento vero. Causa strutturale: il contratto di `GET /api/cassette/lavori-liberi` è più
  povero di `CassettaParete['lavoro']` — allargarlo (aggiungere `paziente`/`tipoDispositivo`/
  `descrizione` alla route) risolverebbe la radice ma è un cambio di contratto API, fuori scope
  di un fix sul solo client.
- **`ordineDrag` persistente in embedded oltre il drop** (limite già dichiarato nella sezione FIX-E
  precedente): invariato da questo dispatch, non toccato.
- **Nessuna combinazione multi-azione testata** (es. sposta-lavoro subito seguito da segna-libera
  sulla stessa cassetta destinazione, entrambe prima di un refresh vero): l'architettura del merge
  su `overrides` la supporta (ogni effetto fa merge sull'override esistente, mai sostituzione), ma
  non c'è un test dedicato a una sequenza di due azioni in embedded — lo stesso principio già vale
  per rinomina+colore in sequenza dal fix precedente, dove nessun test dedicato esisteva neppure
  lì.
