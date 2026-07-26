# FIX-C — Report: 3 fix comportamentali dal collaudo device (QA T15, verbale 2026-07-24, fix-list punti 1, 2, 8)

**Worktree:** `redesign-parete-home` · **Base:** `607264a` (FIX-B) · **Verbale:** `docs/design/decisions/2026-07-24-qa-device-meta-ondata.md`

## Metodo di verifica

Stesso harness temporaneo del FIX-A/FIX-B: pagine `src/app/qa-fixc-harness/{page.tsx,scheda/[id]/page.tsx}`
(mock data, `StanzePager` VERO + `PareteClient` VERA nel primo, un finto «scheda lavoro» col
back button REALE (`tornaIndietro`, stesso import di `SchedaLavoroV3.tsx`) nel secondo),
esposte pubblicamente per la sessione con una riga temporanea in `PUBLIC_ROUTES`
(`src/middleware.ts`). Server Next reale (non jsdom) sulla porta 3029, avviato **dal filesystem
di QUESTO worktree** (nota di processo sotto). Browser reale via CDP (Claude Browser pane),
mai screenshot-only: le asserzioni sono su `document.activeElement`, `location.pathname`,
attributi `inert`/`aria-hidden`/`aria-selected` letti via `javascript_tool`, più un audio-spy
temporaneo (override di `window.AudioContext` per contare `decodeAudioData`/`start()`).
**Harness, riga di middleware e `.next` (rigenerato) sono stati rimossi (via `trash`, mai `rm`
ricorsivo) prima del commit.**

**Nota di processo:** il tool `preview_start` con `name` risolve `.claude/launch.json` in una
directory diversa da questo worktree (verificato: il processo lanciato aveva `cwd` sul repo
padre `ua-app`, non sul worktree — vedeva quindi codice SENZA queste modifiche e senza le
pagine harness, dando 404/redirect fantasma). Aggirato avviando `npm run dev -- -p 3029`
direttamente col tool Bash da questo worktree e agganciando il Browser pane con
`preview_start({ url })`. Annotato per chi ripete l'indagine in futuro in questo worktree.

---

## Fix 1 — Suoni assenti nel drag (fix-list punto 1)

**CAUSA TROVATA (ipotesi (a) confermata):** `initSuoni()` (`src/design-system/v3/sound.ts`)
registra l'unlock dell'`AudioContext` una tantum al primo `touchend`/`click` del documento
(policy iOS, §9). Prima di questo fix, **l'UNICA chiamata a `initSuoni()` in tutto il repo**
viveva in `src/app/ds-v3-catalogo/page.tsx` — il catalogo demo, mai raggiunto navigando l'app
vera (grep confermato: `grep -rn initSuoni src/` → un solo risultato prima del fix). Risultato:
su ogni superficie reale `sbloccato` restava `false` per sempre, `ctx` non veniva mai creato e
`suona()` usciva subito (`if (!suoniAttivi() || !sbloccato || !ctx) return`) — non solo
stacco/riaggancio, ma **ogni suono v3** (tap incluso: `TastoTondo`, `TastoPiu`, `CardLavoro`,
…) restava muto fuori dal catalogo. Il verbale segnala solo stacco/riaggancio perché è quello
che Francesco ascoltava attivamente durante il collaudo del drag — la causa è più ampia, ma il
contratto di questo fix scope-ta all'home/cassette (dove vive il drag).

**Fix (minimo):** `initSuoni()` chiamato in un `useEffect(() => { initSuoni() }, [])` al mount
di `PareteClient.tsx` — la superficie con la parete VERA (incluso `useDragRiordino`, unico
chiamante di `suona('stacco'|'riaggancio')`), montata in TUTTI i percorsi home/pannello:
pannello del pager, forma «solo parete» della home, `/cassette` standalone. `initSuoni()` è
idempotente (`initFatto`) — chiamarla ripetutamente da più mount non fa nulla di più della
prima volta; non riproduce nulla da sola, solo registra listener (mai autoplay).

**Verifica (browser reale, harness):**
1. Prima di qualunque gesto: `window.AudioContext` patchata con uno spy (`decodeCalls`,
   `startCalls`, `resumeCalls`). Nessun gesto ancora fatto.
2. Un click qualunque sulla pagina (tab «Le pile», neutro) → entro 300ms:
   **`decodeCalls: 7`** — tutti e 7 i file `FILES` di `sound.ts` fetchati e decodificati
   (`decodeAudioData`), inclusi `stacco.wav`/`riaggancio.wav`. Prima del fix questo numero
   sarebbe stato 0 per sempre in questo harness (nessun `initSuoni()` raggiungibile).
3. Un drag reale (pointerdown+move+up dispatchati su una cassetta libera nel pannello parete,
   entrato via dot-tap): **`startCalls` passa da 0 a ≥1** — `suona()` arriva davvero a
   `src.start()` (non esce più su `!sbloccato`). Non sono riuscito a far contare in modo
   affidabile ENTRAMBE le chiamate (stacco + riaggancio) nello stesso gesto sintetico: i
   `PointerEvent` sintetici dispatchati via `dispatchEvent` non attraversano la pipeline di
   pointer capture reale del browser allo stesso modo di un gesto fisico, e `Cassetta.tsx` ha
   una soglia di 300ms (`SOGLIA_LONG_PRESS_MS`) + un ramo mouse/pen a soglia 8px che il mio
   script non ha rispettato con precisione — limite dello strumento di test, non del codice:
   `suona('stacco')` e `suona('riaggancio')` condividono la STESSA funzione/stesso gate
   (`sbloccato`/`ctx`/`buffers`), quindi la prova che una delle due arriva a `src.start()`
   copre il meccanismo per entrambe.
4. Regressione: `npx vitest run tests/unit/parete-client.test.tsx` — 3 nuove asserzioni sul
   cablaggio (`initSuoni` chiamato al mount, con parete vuota, dentro il pannello del pager) +
   tutti i 39 test esistenti del file, verdi.

**File:** `src/components/features/cassette/PareteClient.tsx`, `tests/unit/parete-client.test.tsx`

**Limiti dichiarati:** non ho potuto ASCOLTARE il suono (headless) — la prova è sul cablaggio
(decode+start reali in un browser reale). Il ri-collaudo device di Francesco resta l'unica
conferma uditiva. La causa più ampia (tap silenzioso ovunque fuori dal catalogo) non è
risolta per le superfici FUORI da home/cassette (fuori perimetro di questo fix) — segnalata,
non affrontata qui.

---

## Fix 2 — Focus ricerca mai da mobile (direttiva nuova, fix-list punto 2)

**Indagine — dove va il focus oggi:** cercato ogni `autoFocus`/`.focus()` sulla superficie
cassette (`PareteClient.tsx`, `/cassette/page.tsx`, `CassettaSheet.tsx`, `HomeV3.tsx`): **nessun
codice porta il focus sulla barra di ricerca**, né oggi né prima di questo fix. L'unico
meccanismo di focus automatico all'ingresso nella stanza parete è `StanzePager.tsx`
(`focusDaPortare` + `querySelector(FOCUSABILI)?.focus()`), e il suo bersaglio — verificato in
browser reale, harness, sia via tap sul dot sia via `ArrowRight`+`Invio` — è il tasto **«‹
Indietro»** (il primo elemento focusabile del pannello, l'header viene prima della pillola di
ricerca nel DOM), MAI l'input. Verificato anche lo SWIPE (scroll simulato + attesa
IntersectionObserver): il focus resta su `<body>`, invariato — coerente col commento del file
(«il focus NON si sposta» sullo swipe, per design).

**Conclusione onesta:** il sintomo letterale del verbale («la tastiera sale») **non è
riprodotto da nessun percorso di codice individuato**. La direttiva del punto 2 è esplicitamente
segnata come «NUOVA» nel verbale (non un difetto osservato IN QUESTO codice) — quindi il fix è
**preventivo**: applica la regola a QUALUNQUE focus automatico nel pannello, presente o futuro,
non solo a un bersaglio che oggi non esiste.

**Fix:** nuovo guard `puntatoreTattile()` (`window.matchMedia('(pointer: coarse)')` — segnale
sull'INPUT, non sulla larghezza schermo: un mouse ha sempre un puntatore fine, un dito è sempre
grossolano, indipendentemente da quanto è largo lo schermo che lo ospita) applicato a ENTRAMBI i
punti di `.focus()` in `StanzePager.tsx` (l'effect differito su `[attiva]` e il ramo «già attiva»
dentro `vaiA`). Su desktop (pointer fine) il comportamento resta invariato — chi naviga da
tastiera (dot con frecce/Invio) entra ancora nel pannello.

**Verifica:** `npx vitest run tests/unit/stanze-pager.test.tsx` — 2 nuovi test che mockano
`matchMedia('(pointer: coarse)') → true` (stesso pattern del mock `prefers-reduced-motion` già
nel file): tap sul dot e freccia+Invio, in entrambi il pannello si apre (`inert` tolto) ma il
focus NON entra (resta dov'era). Il test preesistente per il ramo desktop (mock di default →
`matches:false`) resta verde invariato, confermando che il ramo fine-pointer non regredisce.

**File:** `src/components/features/home/StanzePager.tsx`, `tests/unit/stanze-pager.test.tsx`

**Limite dichiarato:** questo fix soddisfa la LETTERA e lo SPIRITO della direttiva (nessun focus
automatico nel pannello su dito, oggi o in futuro) ma NON risolve un bug attivo, perché non ne ho
trovato uno. Se il device di Francesco continua a mostrare la tastiera che sale entrando nella
stanza cassette, la causa vive altrove (fuori dal codice sotto il perimetro di questo fix — es.
comportamento nativo del browser Android su un long-press/tap che il codice non controlla) e
serve un nuovo giro di collaudo device con la causa isolata su schermo (screen recording o
`document.activeElement` letto dal device stesso).

---

## Fix 3 — Back dalla scheda lavoro torna alla home invece che alle cassette (fix-list punto 8)

**CAUSA TROVATA (confermata in browser reale, non solo per lettura di codice):** il FIX-A
(URL sync shallow verso `/cassette` via `pushState`) risolve solo METÀ della catena. Sequenza
dove si rompe, riprodotta nell'harness:

1. Utente sulla home, swipe/dot verso la parete → `StanzePager` chiama
   `window.history.pushState({}, '', '/cassette')` (shallow, invariato) — l'indirizzo cambia,
   l'albero React resta lo stesso (nessun fetch).
2. Tap su una cassetta con lavoro → `PareteClient` chiama `router.push('/lavori/[id]')` — una
   navigazione VERA (non shallow). Next.js tiene l'albero di `/dashboard` (con questo pager) nella
   propria cache client per un eventuale ritorno rapido, invece di distruggerlo.
3. Nella scheda del lavoro, «‹ Indietro» chiama `tornaIndietro(router)` → `router.back()`
   (`window.history.length > 1`, quindi mai il fallback `/dashboard`).
4. **Qui la catena si rompe:** Next RIPRISTINA l'albero cachato di `/dashboard` invece di rifare
   il fetch di `/cassette` — e quell'albero porta lo stato del **PRIMISSIMO montaggio**:
   `useState(stanzaIniziale)` in `StanzePager.tsx` riparte dal prop server-side calcolato al
   PRIMO caricamento di `/dashboard` (quasi sempre `'pile'`), perché l'avanzamento a `'parete'`
   fatto dal dot/swipe al passo 1 era SOLO `setAttiva` in memoria — mai scritto in un posto che
   il router-cache di Next legga alla restore.

**Osservato in browser reale (harness, prima del fix):** dopo «‹ Indietro» dalla scheda,
`location.pathname === '/cassette'` (corretto — il FIX-A questo lo fa) MA
`[data-stanza="pile"]` risultava **non-inert** (attivo) e `[data-stanza="parete"]` **inert**
(nascosto) — cioè la home con le PILE, esattamente il difetto del verbale, con l'indirizzo che
mentiva («dice /cassette, mostra la home»).

**Fix:** `stanzaEffettiva(stanzaIniziale)` — se `window.location.pathname === '/cassette'` **nel
momento in cui l'istanza nasce** (mount vero O remount da router-cache: indistinguibili per
`useState`, ed è esattamente il punto — l'indirizzo, che la storia del browser porta con sé
attraverso qualunque tipo di remount, batte un prop che può essere stantio), la parete è la
stanza giusta a prescindere dal prop. Applicato a: l'inizializzatore di `attiva`
(`useState(() => stanzaEffettiva(stanzaIniziale))`), il valore iniziale di `urlPushataRef`
(altrimenti un successivo «torna alle pile» pusherebbe un'entry fantasma invece di
`history.back()`), il valore iniziale di `urlDivergente`/`sospendiRefresh` (altrimenti il primo
refresh silenzioso dopo il remount romperebbe di nuovo il pannello) e l'effect di
posizionamento iniziale del viewport (altrimenti stato e scroll andrebbero fuori sincrono).
`StanzePager` non monta MAI sulla vera pagina standalone `/cassette` (quella non usa questo
pager), quindi il controllo su `pathname === '/cassette'` non intercetta mai un caso che non è
suo.

**Verificato in browser reale, DOPO il fix, stessa catena:** «‹ Indietro» dalla scheda →
`location.pathname === '/cassette'` E `[data-stanza="parete"]` non-inert /
`[data-stanza="pile"]` inert / dot «La parete» selezionato — la home mostra le cassette, non le
pile. Verificato anche il passo successivo: da questo stato ricostituito, tap su «Le pile»
chiama `history.back()` (mai una `pushState` duplicata) e torna correttamente all'indirizzo di
partenza dell'harness — la sincronizzazione URL resta coerente anche dopo un remount.

**Regressione:** `npx vitest run tests/unit/stanze-pager.test.tsx` — 73 test totali verdi
(69 preesistenti + 4 nuovi per questo scenario: attiva sulla parete al remount con URL già
`/cassette`, viewport posizionato coerentemente, back-alle-pile fa `history.back()` non
`pushState`, nessuna regressione quando l'indirizzo NON è `/cassette`).

**File:** `src/components/features/home/StanzePager.tsx`, `tests/unit/stanze-pager.test.tsx`

**Limite dichiarato:** verificato a livello di history/URL con un harness che sostituisce
`/lavori/[id]` (protetto da login, irraggiungibile senza credenziali) con una scheda-lavoro
fittizia che usa lo STESSO `tornaIndietro` reale importato da produzione — il meccanismo sotto
test (comportamento del router-cache di Next su una navigazione vera dopo un URL
shallow-relabeled) è generico e non dipende dal path esatto, ma la catena END-TO-END con il
`/lavori/[id]` VERO (autenticato, con `SchedaLavoroV3.tsx` vera) non è stata verificata in
questa sessione. Ri-collaudo device di Francesco raccomandato per chiudere il cerchio.

---

## Verifica complessiva

```
npx vitest run        → 316 file, 2865 test passati (19 skip pre-esistenti), 0 falliti
npx tsc --noEmit       → 0 errori
npx next build         → build di produzione completata, 0 errori
```

Harness (`src/app/qa-fixc-harness/**`), riga temporanea in `PUBLIC_ROUTES`
(`src/middleware.ts`) e `.next` rigenerato: rimossi via `trash` prima del commit — non
committati.
