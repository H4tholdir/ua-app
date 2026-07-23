# FIX-A — Report: lo swipe porta alla pagina /cassette vera (QA device T15, addendum 24/07)

**Worktree:** `redesign-parete-home` · **Base:** `581afae` · **Verbale:** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md` (addendum in fondo)

## Implementato

### 1. `PareteClient.tsx` — il prop `contesto` è morto
Il chrome di pagina (header con «‹ Indietro», titolo «Le cassette», «☰ Tutto il resto», ricerca)
rende **SEMPRE**, ovunque il componente sia montato: `/cassette` standalone, il pannello destro
del pager, la forma «solo parete» della home. La vecchia D2 (`contesto='pagina'|'stanza'`, header
spento in stanza) è superata — rimossa, nessun ramo morto lasciato.

Due prop nuove:
- **`onIndietro?: () => void`** — override del back dell'header. Assente → comportamento
  invariato (`tornaIndietro`, push su `/dashboard` senza storia). Passato dal pannello del pager
  → torna alle pile invece di lasciare la home.
- **`sospendiRefresh?: boolean`** — v. §3 sotto (difetto trovato in verifica, non nel piano
  originale).

### 2. `StanzePager.tsx` — pannello = pagina vera + URL sync + popstate
- `StanzaParete` monta `<PareteClient onIndietro={...} sospendiRefresh={...}>` invece del vecchio
  `contesto="stanza"`: stesso mount differito (Task 12/ARCH R3), stesso `attivo` gating, ORA con
  chrome di pagina completo.
- `sincronizzaUrlStanza(nuova)`: al transito pile→parete generato dal pager (swipe/dot/linguetta)
  → `window.history.pushState({}, '', '/cassette')` UNA volta (`urlPushataRef`); al transito
  inverso → `window.history.back()`. Il deep-link (`?stanza=parete`) e la preferenza `due_stanze`
  che apre già sulla parete NON pushano nulla — non sono un cambio generato dal pager.
- Listener `popstate`: se l'utente preme il back del telefono mentre guarda il pannello,
  riporta il pager sulle pile (stato React + scrollTo) senza reload — la traversal la fa il
  browser da sé, il listener sincronizza solo lo stato locale.
- `onIndietro` del pannello → `vaiA('pile', 'tap')`: stessa via di `sincronizzaUrlStanza`, stesso
  focus/scroll delle altre transizioni pile↔parete — un solo posto per tutti i ritorni.
- Nuovo prop `onStanzaChange` → comunica ad `HomeV3` quale stanza è visibile (per il piede).

### 3. `HomeV3.tsx` — piede sparisce sul lato cassette; forma «solo parete» invariata nell'architettura
- Stato `stanzaAttiva` (sincronizzato da `onStanzaChange`): il piede (`TastoPiù`) si rende SOLO
  quando `stanzaAttiva === 'pile'`, fuori da `.corpo` come già dal Task 14 (nessuna regressione
  sull'anti-shrink di quel task).
- Forma «solo parete» (preferenza `homePref='parete'`): **scelta minima ratificabile** — monta la
  `PareteClient` VERA (stesso componente del pannello, niente `onIndietro`: qui non c'è un pager a
  cui tornare, il back di default è corretto) e **niente `{piede}`**: la pagina /cassette che
  questa forma rispecchia non ha un tasto «nuovo lavoro» — prima (Task 12/D2) il piede c'era, ora
  no, per coerenza con l'assetto reale. **Deviazione dal percorso "redirect a /cassette"** che
  avevo scelto in un primo momento e poi scartato: `HomeDesktop` (fratello di `HomeV3`, montato
  SEMPRE da `dashboard/page.tsx`) ignora la preferenza «solo parete» — è mobile-only, spenta via
  CSS a ≥1024px. Un `redirect()` server-side avrebbe spento anche `HomeDesktop` per chi guarda da
  desktop, dove quella preferenza non ha alcun senso di applicarsi. Annotato per ratifica.

### 4. Difetto trovato in verifica browser reale (non previsto dal piano) — `sospendiRefresh`
Riprodotto con un server Next.js VERO (non jsdom): dopo il `pushState('/cassette')`, Next.js
intercetta la chiamata (monkey-patch documentato in `app-router.js`) e aggiorna il proprio
`canonicalUrl` a `/cassette` — è il meccanismo "shallow" citato dal verbale, funziona come
previsto per l'URL. MA: qualunque `router.refresh()` chiamato DOPO, mentre l'albero React montato
è ancora quello di `/dashboard` (pager, pile, piede), rifà il fetch della ROTTA VERA `/cassette`
sul server e ne sostituisce silenziosamente il contenuto al pannello — nessun gesto dell'utente,
solo un tab-switch (evento `focus`) basta a innescarlo. `PareteClient` ha proprio un refresh così
(§5.5 Freschezza, ARCH R2): al ritorno in primo piano rilegge la parete.

**Fix:** nuovo stato `urlDivergente` in `StanzePager` (specchio reattivo di `urlPushataRef`,
aggiornato negli stessi 3 punti) → prop `sospendiRefresh` → `PareteClient` sospende **SOLO** il
refresh silenzioso (focus/visibilitychange). Le altre chiamate a `router.refresh()` di
`PareteClient` (`dopoCambio` dopo crea/rinomina, `riordina` dopo ▲▼) **restano invariate**: seguono
un'azione esplicita dell'utente, e l'indirizzo mostra già `/cassette` — l'esito è la pagina
/cassette vera con il risultato dell'azione (il pager "si perde" per chi interagisce con lo sheet
mentre guarda il pannello, ma resta coerente, non a sorpresa). **Limitazione nota, non risolta
qui**: risolverla per bene servirebbe un endpoint GET dedicato per rileggere la parete senza
`router.refresh()` — fuori perimetro di questo fix, da valutare con Francesco/panel advisor se
la frequenza reale lo giustifica.

## Scelte su back / popstate / forma «solo parete» (per ratifica)

1. **Back in pannello → `vaiA('pile','tap')`** (non un booleano/nuova prop ad-hoc): riusa scroll +
   focus + URL-sync già scritti per swipe/dot, zero duplicazione.
2. **`history.back()` invece di una seconda `pushState`/`replaceState`** per il ritorno alle pile:
   tiene la history pulita (un solo back del telefono torna alle pile per DAVVERO, non serve
   premerlo due volte).
3. **Forma «solo parete»: PareteClient inline, niente redirect.** Deviazione motivata al punto 3.
4. **`sospendiRefresh` gate SOLO il refresh silenzioso**, non le azioni esplicite. Vedi punto 4 —
   limitazione nota da ratificare o da programmare come follow-up.

## TDD

Vitest sui file toccati, in ordine RED→GREEN per ogni blocco nuovo (header sempre presente,
`onIndietro`, URL sync via History API mockata, popstate, `sospendiRefresh`, piede
condizionale). I test preesistenti che asserivano «niente chrome di pagina in stanza» (Task
12/D2) sono stati **adattati**, non cancellati — ogni `describe` toccato porta un commento che
dichiara quale decisione precedente supera.

## Verifiche eseguite (output reale)

- `npx vitest run` sui file toccati: verde prima di allargare.
- `npx vitest run` suite intera: **2853 passati, 19 skip, 0 falliti** (era 2846/19/0 prima —
  +7 test nuovi, nessuna regressione altrove).
- `npx tsc --noEmit`: **0 errori**.
- `npx next build`: **verde**, `/cassette` e `/dashboard` presenti nella route list, nessuna
  route residua dell'harness temporaneo.

## Verifica visiva reale (browser, non jsdom)

**Perimetro d'auth (nota per chi rilegge):** né `/dashboard` né `/cassette` sono raggiungibili
senza credenziali reali — `.env.test` non contiene valori validi in questo worktree (stesso
limite già documentato in `.superpowers/sdd/task-11-report.md`). Ho costruito un harness
TEMPORANEO fuori dal perimetro auth (`src/app/qa-fixa-harness/page.tsx`, reso pubblico per la
sessione via una riga in `middleware.ts`) che monta `HomeV3` con dati mock — stesso pattern già
usato da `/ds-v3-catalogo`. Verificato con un vero server Next.js dev (porta 3011, non jsdom):
questo è ciò che ha permesso di scoprire il difetto `sospendiRefresh` (invisibile a jsdom, che non
intercetta `history.pushState` come fa il router reale). **Harness, riga di middleware e le due
`launch.json` toccate (worktree + padre) sono stati rimossi/ripristinati prima del commit** — non
fanno parte della consegna.

Sequenza verificata (viewport touch 390×844, Playwright):
1. Stanza pile: TastoPiù + «Nuovo lavoro» visibili, 2 dot, linguetta «Le cassette».
2. Tap sulla tab «La parete» (swipe reale verificato anche via drag nel Browser pane) →
   pannello con header completo (‹, «Le cassette», ☰), ricerca, griglia cassette, **niente
   TastoPiù**; `location.href` → `http://localhost:3011/cassette`, **nessun reload** (marker JS
   sopravvissuto), screenshot `02-pannello-cassette-390x844.png`.
3. Evento `focus` sintetico (simula tab-switch) mentre sul pannello → **contenuto intatto**,
   URL invariato (prova diretta del fix `sospendiRefresh`).
4. Tap su «‹ Indietro» nel pannello → `history.back()` → torna a `/qa-fixa-harness` (equivalente
   di `/dashboard`), pile view intatta, screenshot `03-back-a-pile-390x844.png`.
5. Ripetuto lo swipe, poi **back del browser reale** (`page.goBack()`, non un evento sintetico) →
   stesso esito: torna alle pile, nessun reload.
6. Dark mode: pannello cassette verificato anche con `data-theme="dark"`,
   screenshot `04-pannello-cassette-dark-390x844.png`.

Screenshot in `docs/design/screenshots/2026-07-24-fixwave/` (gitignored, serve `git add -f`):
`01-pile-390x844.png`, `02-pannello-cassette-390x844.png`, `03-back-a-pile-390x844.png`,
`04-pannello-cassette-dark-390x844.png`.

**NON verificato empiricamente in questa sessione — resta un dubbio reale, non solo formale:** la
catena «tap cassetta → scheda lavoro (`/lavori/[id]`, VERA route auth-gated) → back del telefono →
torna a `/cassette` VERA» richiede login reale, irraggiungibile con l'harness (che non ha una
scheda lavoro dietro auth). **Non è lo stesso meccanismo del passo 5 sopra** — lì il pannello del
pager resta MONTATO e il mio listener `popstate` gestisce la traversal (uscita dall'entry
`/cassette`, verso `/dashboard`). La catena scheda-lavoro è la traversal OPPOSTA: `router.push
('/lavori/id')` SMONTA `StanzePager` (si naviga a una route diversa), poi il back del telefono
traversa VERSO l'entry `/cassette` che avevamo spinto — un'entry che porta con sé il
FlightRouterState di `/dashboard` (copiato lì da `copyNextJsInternalHistoryState` al momento del
push). È incerto se Next, in quel momento, rimonti il pager all'indirizzo `/cassette` (perché
segue l'albero copiato) oppure la pagina standalone vera che il verbale presuppone (perché il
server, interrogato per quell'URL, risponde comunque con `cassette/page.tsx`). Nessuno dei due
possibili esiti è stato osservato: **è la domanda discriminante per il ri-collaudo device di
Francesco** — «il back dalla scheda lavoro atterra sulla pagina /cassette standalone vera, o
rimonta il pager?» — non solo una ripetizione dei passi già verificati sopra.

## Dubbi per ratifica

1. **La catena back-da-scheda-lavoro NON è verificata empiricamente** (v. sezione sopra) — è la
   domanda discriminante del prossimo collaudo device, non un dettaglio a margine: se il back da
   `/lavori/[id]` rimonta il pager invece della pagina standalone, il comportamento "corretto e
   voluto" descritto dal verbale non è quello che succede davvero.
2. **`sospendiRefresh` non copre `dopoCambio`/`riordina`** (§4): se Francesco crea/rinomina/riordina
   una cassetta MENTRE guarda il pannello del pager, il pager "collassa" nella pagina /cassette
   vera (coerente, non rotto, ma non più il pannello). Frequenza d'uso probabilmente bassa
   (creare una cassetta dal pannello embedded vs dalla pagina diretta), ma è un cambiamento di
   esperienza reale da mostrargli.
3. **Forma «solo parete»: niente più piede.** Prima (Task 12/D2) il TastoPiù c'era anche lì; ora
   no, per coerenza con `/cassette` — ma è un cambiamento visibile per chi ha già quella
   preferenza impostata.

## Nota minore — console dell'harness (non riguarda file toccati da questo fix)

Durante la verifica browser, l'harness temporaneo mostrava un badge dev "2 Issues": uno script-tag
warning e un hydration mismatch nell'albero di `LinguettaCassette` (portale `document.body`,
wrapper `data-ds="v3"`). `LinguettaCassette.tsx` non è fra i file toccati da questo fix e porta già
un commento dedicato alla SSR-safety di quel wrapper (nota "QA T15" preesistente). Non ho
approfondito oltre: è quasi certamente un artefatto dell'harness (route atipica, senza il layout
server normale di `/dashboard`) più che un difetto del componente — ma non l'ho escluso con
certezza, e lo segnalo qui invece di darlo per scontato in silenzio.
