# Handoff — Ondata «Redesign parete/home» CHIUSA, ramo pronto. 🛑 Merge a parola di Francesco

**Per:** sessione nuova a contesto pulito.
**Prassi che ha retto:** BP-0 → `superpowers:subagent-driven-development`, un subagent fresco per
task, review a due stadi. **⚠️ Direttive permanenti:** «Come parlare con Francesco»
(`../CLAUDE.md` §7 / `ua-app/CLAUDE.md` §0D) · rm-guard · **Regola Advisor** (panel prima di ogni
decisione significativa — usata due volte oggi, ha cambiato l'esito entrambe le volte) · mockup
PRIMA del codice.

---

## Stato in una riga

Il ramo `worktree-redesign-parete-home` è a **`ca913236`**, 175 commit, **suite 3283 verdi / 19
skip · tsc 0 · build ok** (ri-verificati dal controller, non ripresi da un report). Tutti i task
del piano sono chiusi, review e gate compresi. **Manca solo il merge, che è a parola di Francesco.**

- **Worktree:** `.claude/worktrees/redesign-parete-home` — NON ricrearlo.
- **Banco di collaudo:** build di produzione su **:3020** dal worktree, IP `ipconfig getifaddr en0`
  (oggi 192.168.7.6). Login `e2e-titolare@ua-test.local` / `TestE2E!2026`.
  ⚠️ **Ogni `next build` invalida i chunk del server acceso**: dopo aver ricompilato RIAVVIALO, e
  poi lancia **`node scripts/guardia-stili-collaudo.mjs`** — senza quel controllo ogni misura è
  falsa e la pagina sembra comunque giusta (ci è successo due volte).
  ⚠️ Il comando col `setsid` scritto nei ledger vecchi **non funziona su macOS**: `setsid` non
  esiste. Usa `nohup … &` e **verifica sempre** con
  `curl -o /dev/null -w "%{http_code}" http://127.0.0.1:3020/`.
- **Backlog dell'ondata (TRACCIATO, sopravvive al merge):**
  `docs/roadmap/2026-07-26-backlog-ondata-parete-home.md` — 30 voci rimandate col costo del rinvio,
  le 4 raccomandazioni aperte del gate estetico, e le riserve delle cinque review.

---

## Cosa è stato fatto il 26/07 (tutto verificato, non riferito)

**T16 — la striscia della home.** Logica nuova (allarmi di livello 1 che non si nascondono più a
vicenda, silenzio quando non c'è niente da dire, racconto di ciò che UÀ ha fatto da solo) e forma
nuova (card F2, coreografia V1, racconto azzurro con la stellina tappabile su tutta la card, dedup
in `localStorage` misurato prima del disegno per non far lampeggiare niente).

**T17 — chiusura.** Strumentazione diagnostica dei suoni rimossa · `scripts/tmp/` de-tracciato e
messo in `.gitignore` (7 banchi di misura erano finiti committati) · la guardia degli stili
promossa a `scripts/guardia-stili-collaudo.mjs` · **review whole-branch in 5 aree** · **triage dei
69 rilievi minori → 0 bloccanti** · **review delta** dei 19 commit di fix (che nessuno aveva ancora
letto) · **QA browser** 390/768/1280 × light/dark con 134 catture committate · **gate estetico L2:
PASS, 0 ❌**.

### I quattro difetti gravi trovati, e perché nessuno di loro era visibile dalla suite verde

1. **La linguetta «LE CASSETTE» compariva su desktop.** Esce da un `createPortal` su
   `document.body`, quindi sfuggiva a `.ua-home-mobile{display:none}`, e il clic faceva
   `pushState('/cassette')` lasciando l'indirizzo fuori sincrono con la pagina visibile.
2. **Il tasto indietro lasciava sheet e dialogo distruttivo dipinti sopra un'altra stanza.**
   Risolto con `src/components/ds/storia-overlay.ts`: **una** entry di history per tutta la pila di
   overlay. ⚠️ La forma «una entry per overlay» era stata provata e **scartata con prova**: con due
   overlay che si chiudono nello stesso commit lascia un'entry orfana, cioè una pressione morta.
3. **Con «Riduci movimento» attivo la linguetta restava fuori schermo per sempre**, ed è l'unica via
   tattile alle cassette nella forma «solo pile». **Regola nuova che vale ovunque: sotto reduced
   motion cambia la TRANSIZIONE, mai il TARGET** — Motion muove solo ciò che sta nel target, quindi
   una chiave tolta congela dov'era. Fix all'hook: **40 consumatori** coperti, non due componenti
   rattoppati.
4. **Chiudere un overlay e navigare nello stesso gesto faceva mangiare la navigazione** dal
   `history.back()` automatico: il tasto principale «Completa i dati del lavoro» si comportava come
   un annulla. **10 punti** corretti; da oggi si usa `useNavigaDaOverlay`, mai `router.push` nudo da
   dentro un overlay — **regola permanente in `ua-app/CLAUDE.md` §9**.

**Tutti e quattro sono stati trovati col browser, non dai test.** È la lezione operativa della
sessione: jsdom non fa layout, non ha una history asincrona e non conosce le preferenze di sistema.

---

## Le decisioni di Francesco del 26/07 — non ridiscuterle

1. **Nomi paziente nel wizard: ondata separata, DOPO il merge.** Motivo suo: non far ricrescere un
   ramo che è a un passo dal traguardo. Le sei proposte sono pronte in
   `docs/design/mockups/2026-07-26-nomi-paziente.html`, la scelta della variante è ancora da fare.
2. **La striscia nomina il primo allarme acceso e conta gli altri**, e il trial negli ultimi 3
   giorni parla per primo. Questa **supera** la forma ratificata il 24/07 («N scadenze oggi — Vedi
   ›» → `/lavori`): quella CTA riportava alla home da cui si era partiti, perché `/lavori` senza
   `?pila=` valida fa `redirect('/dashboard')`. Verbale emendato in
   `docs/design/decisions/2026-07-24-striscia-home.md`, supersessione anche in testa al Task 16 del
   piano.
3. **Il numero del lavoro non si taglia mai**: cede la frase di spiegazione, mai il numero né il
   conteggio.
4. **«Allunga la pancia della cassetta, non toccare la finestrella col dentino.»** Fascia 72→78,
   tile 132→138 scritto come `calc(var(--altezza-fascia) + 60px)` così la finestra non può muoversi
   per costruzione. Targhe: da 21,75 / 19,56 / 16,89 a **21,75 / 21,75 / 21,75**.
5. **«Salva il nome» e «Salva il colore» RESTANO** — eccezione al dizionario a verbale in
   `docs/design/decisions/2026-07-26-salva-nome-colore.md`. ⚠️ **Non «correggerle»**: è già
   successo una volta oggi che un brief automatico le rimettesse in discussione.
6. **Righe del muro avvicinate da 768px in su** (−250px su una parete da 24 cassette). Sul telefono
   restano com'erano: lì avvicinarle schiaccia i gancetti, misurato.

---

## Il prossimo lavoro, in ordine

### 1. 🛑 Il merge (FASE 10) — solo quando lo dice Francesco
`git checkout main && git merge worktree-redesign-parete-home` → push → attendere CI verde →
verificare `uachelab.com`. Sul ramo NON c'è nessuna migration, quindi niente FASE 6b.
⚠️ Su `main` non pushati: `8b8dd40`+`2b069f0` (rm-guard) — partono col prossimo deploy.

### 2. La prova della PWA installata
Francesco ha deciso il 26/07 di farla **dopo, in produzione**, installando l'app da icona: serve a
chiudere la questione della barra gesture, che **non è un difetto dell'app** (in scheda di browser
quell'area appartiene al browser).

### 3. Nome e cognome del paziente nel wizard — percorso BP-2 pieno
Oggi l'app non sa quale parola sia il cognome, e non per distrazione: le due strade di scrittura
compongono `nome_cognome` in **ordine opposto** (il wizard manda `cognome: alias`; il trigger del DB
fa `upper(cognome) || ' ' || upper(nome)`). Serve la scelta di Francesco fra le sei proposte, poi
brainstorm → validazione architetturale → piano → TDD. Probabilmente senza migration: le colonne
`nome`/`cognome` esistono già su `pazienti`.

### 4. Una cosa che aspetta una sua decisione di forma
A 1280px la striscia vive nel rail laterale, che ha 178px utili contro i ~208 che servirebbero:
il soggetto resta a zero e si legge «! e un'altra Conferma ›». **È preesistente** (misurato identico
prima e dopo le modifiche di oggi), quindi non blocca il merge, ma su desktop la striscia lì non
dice niente di utile.

---

## Parcheggiati (non toccare senza Francesco)

Parete centrata su tablet/desktop (richiesta vera, mai fatta) · priorità paziente/clinico nella
fascia · drag scattoso iPad → filone «iOS fluidità» · rilievo delle card sulle pagine v2.3 col
fondo unico · `PAROLE_CATEGORIA_STUDIO` asimmetrica (`clinico`/`clinici`/`policlinica` mancano):
**è la stessa classe di decisione su cui si è già pronunciato** — non aggiungere niente da soli.

---

## Vincoli tecnici accumulati (non ripetere gli errori)

Tutti quelli degli handoff precedenti — jsdom non fa layout → serve un harness vero · `.ds-parete`
mai `overflow:hidden` · sheet history `uaSheet` · **il checkout PADRE è su `main`: ogni misura va
fatta NEL WORKTREE** · Playwright-WebKit ≠ Safari reale · **misure, non ipotesi** · `is-troncato` si
misura PRE-PAINT · un `*/` nella prosa di un commento CSS inghiotte la regola che segue · una regola
più specifica che ridichiara uno shorthand scarta l'intero valore in silenzio · in `ds-v3.css` i
commenti stanno FUORI dalle graffe · le affermazioni di contrasto scritte nei commenti **scadono**
quando cambia una superficie — **PIÙ i cinque nuovi del 26/07**:

1. **`.gitignore:58` ignora `*.png`**: `git add -A` salta gli screenshot **in silenzio**. Serve
   `git add -f` **e** una verifica con `git show --stat`. È ricapitato **tre volte** oggi, una
   sotto un messaggio di commit che annunciava le foto. `git check-ignore` sulla CARTELLA non dice
   nulla sui file dentro.
2. **Sotto `prefers-reduced-motion` si cambia la transizione, mai il target.** Una chiave tolta dal
   target congela l'elemento dov'era: è così che la linguetta restava fuori schermo.
3. **Mai `router.push` da dentro un overlay v3** (o da un handler che ne chiude uno nello stesso
   gesto): quegli overlay tengono una entry di history che è un doppione della pagina.
   `useNavigaDaOverlay`, sempre. Rete: `scripts/guardia-navigazione-overlay.mjs`.
4. **Un componente che fa `createPortal` su `document.body` sfugge a ogni regola di
   mostra/nascondi del suo contenitore.** Va spento anche per conto suo.
5. **Due fratelli montati insieme che scrivono lo stesso stato client corrono per ordine di
   montaggio.** La home mobile e quella desktop convivono nella stessa pagina: la decisione va presa
   in fase di render (uno snapshot), non dentro un effect.

**Nota su un falso allarme:** una volta `npx vitest run` ha riportato 313 file falliti **senza
stampare nessun errore**, e due giri successivi a sorgenti identici sono stati verdi. È esaurimento
di risorse dopo una raffica di istanze di Chromium. Se ricapita, **rilancia prima di crederci.**
