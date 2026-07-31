# Handoff — l'ondata (b) è in produzione. Da dove si riparte

**Per:** la sessione nuova, a contesto pulito. **Data:** 2 agosto 2026.
**Stato del ramo:** `ondata-b-schermate` **mergiata** su `main` (fast-forward, 118 commit) e **pubblicata**.
`main` = `bdb9df23`. CI verde, Vercel `success`, https://uachelab.com **verificato dal vivo**.
**Non c'è niente da riprendere a metà:** nessun file non salvato, nessun task del piano dell'album aperto.

---

## 0. 🔴 LA COSA CHE NON È STATA FATTA, e va detta per prima

**Nessuno dei quattro strati sopra la foto anima l'USCITA.** Visore, tendina, conferma e foglio della
categoria **spariscono di taglio**: entrano con la loro molla, escono di colpo.

🛑 **E non è una svista di ieri: era scritto tre volte** che si decidesse **insieme, al gate estetico L2 di
T13** — «*una decisione d'ondata che non si prende per un componente solo*». **Il gate L2 è stato fatto** (§4
di T13) **e questa decisione NON è stata portata a Francesco.** L'ho mancata io.

**Il fatto tecnico, per chi la riprende:** l'uscita richiede `AnimatePresence` attorno al componente, e in
`src/` esiste **solo** in `Sheet`, `DialogConferma`, `RigaFase`, `Avviso` — nessuno dei quattro strati nuovi
lo monta (`provato:` grep su `src/components/ds/{VisoreFoto,TendinaMenu,FoglioConferma,FoglioCategoria,CartaAlbum}.tsx`
→ zero occorrenze). ⚠️ **Attenzione al legame con il difetto chiuso oggi:** gli strati ora si montano
**sempre** e si pilotano con `aperto` (v. §2); `AnimatePresence` va messo **rispettando quel montaggio**, o si
riapre il difetto del visore che si richiudeva da solo.

➡️ **Prima cosa della prossima sessione: portare la domanda a Francesco.** È una decisione d'ondata, non un
dettaglio di un componente.

---

## 1. Che cosa è successo oggi, in breve

| | |
|---|---|
| **D91 → D97** | La **prescrizione** è la settima categoria della foto. Nome «Prescrizione», emoji 🩺, **quinta** nell'ordine — 🛑 **non in testa** (D92, rettifica di Francesco: la prima del primo gruppo è la foto grande della carta). La spaiata della griglia è «Altro», **riga di chiusura a tutta larghezza** (D95, variante A2 sul mockup). Migration nuova, spia riallineata, `FrameFatto` torna a `'prescrizione'` (D97) |
| **D98** | L'album resta **solo sulla scheda**: la pagina di modifica tiene la sua galleria fino alla propria ondata |
| **T12** | I due bottoni della scheda che non aprivano niente ora aprono; eliminazione dal ⋯ con la conferma di §5.42 |
| **T13** | FASE 7 · **la guardia degli overlay ha girato per la prima volta da T6, ed è verde** (col quarto braccio nuovo) · FASE 9 su 390/768/1280 × chiaro e scuro · gate estetico L2 |
| **TOK-1 · CLI-1** | Chiusi **prima del merge**, come D53 prescriveva |
| **Produzione** | Il caricamento foto su uachelab.com era **rotto dal 30/07** (rispondeva 500). Adesso risponde **201**: provato con una foto vera, non dedotto |
| **Velo** | Alzato a **.99 in tema chiaro** su decisione di Francesco (in scuro resta .94) |

Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **novantotto** decisioni in
ventinove tornate. La prossima è **D99**.

---

## 2. 🔑 Le quattro lezioni di oggi — valgono per il codice futuro, non solo per l'album

**① Gli overlay v3 si montano SEMPRE e si pilotano con `aperto`. Mai dentro una condizione.**
Montarli come `{foto && <VisoreFoto…>}` lega il loro **ciclo di vita** all'apertura. In sviluppo React monta
ogni componente due volte, e la sequenza diventa `entraOverlay → pushState` · `esciOverlay → history.back()` ·
`entraOverlay → pushState`: il `popstate` del `back` è **asincrono**, arriva dopo, e `storia-overlay.ts:101`
lo legge come un «indietro» dell'utente. **L'overlay si apre e si richiude da solo.** Gli strati rendono
`null` da sé quando sono chiusi (`VisoreFoto.tsx:142`): montarli sempre non costa niente.

**② jsdom non esegue la traversal di `history.back()`. Quindi certe prove vanno spostate di bersaglio.**
La prova ovvia — «il dialogo resta aperto» — **restava verde sul difetto vivo**, anche avvolgendo il render in
`StrictMode`. La rete che morde guarda un altro fatto osservabile: **quanti ingressi nella storia degli
overlay** produce un'apertura (uno). Tolta la correzione, si accende: 2 invece di 1. **Misurato.**

**③ Un commento che afferma una protezione inesistente è peggio del silenzio.**
`FoglioCategoria` diceva che «i due righi tengono in piedi il text-zoom 200 %»: vero solo per le etichette
**con uno spazio** dentro. «Radiografia» è una parola sola. Quel commento ha fatto credere per **tre task** che
la prova di §13.3 fosse superata, e la griglia sfondava il foglio **già con sei categorie**. ⚠️ E la misura sul
componente vero ha poi corretto **anche il commento nuovo**: regge `overflowWrap:'anywhere'`, **non**
`minmax(0,1fr)` (che da solo lascia fuori 9px a 768 e 54 a 390).

**④ Con foto finte non si dà un giudizio estetico.** Le prove usavano PNG 1×1 trasparenti: sembravano
funzionare, ma nascondevano il **caso peggiore** che §5.39 nomina — i controlli sopra una fotografia scura. Con
una foto vera si è visto in un colpo che i controlli reggono (faccia e anello propri) e che **il velo lasciava
leggere la scheda dietro**. Per giudicare una superficie che mostra fotografie, serve una fotografia.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **L'uscita dei quattro strati** (`AnimatePresence`) — decisione d'ondata **mai portata a Francesco**: v. §0 | `src/components/ds/*` |
| 🟠 **2** | **`scripts/guardia-navigazione-overlay.mjs` va lanciata A MANO** e non è agganciabile al commit: le serve una **build di produzione** (configurazione `ua-prod-3020` in `.claude/launch.json` della cartella padre) e la **fixture** di `E2E-CAS-002`, che va **rimessa com'era** subito dopo. Chi tocca gli overlay v3 la lancia | ricetta nell'intestazione dello script |
| 🟠 **3** | **La pagina `/lavori/[id]/modifica` ha ancora la galleria vecchia** (D98): niente carta album, niente visore. Entra nella **sua ondata** (spec §10: ~3.500 righe su 10 file) | `TabImmagini.tsx` |
| 🟡 **4** | **Tredici overlay** di `src/components/features/**` promettono `aria-modal` senza mantenerlo | censimento a verbale |
| 🟡 **5** | **`MenuVoce` col chevron sulla distruttiva** (F-6) · **R27** (i tipi generati non entrano nelle query: nessun `<Database>` sui quattro fabbricanti del client) · **FM-8** · **cinque Minori di T9-bis** (referto §6) | backlog |
| 🟢 **6** | Il **velo in tema scuro** ha lo stesso fenomeno del chiaro, in misura minore: il testo chiaro della scheda dietro la foto resta appena percepibile a `.94`. **Non toccato per scelta** — alzarlo schiaccerebbe la fotografia, e il valore è ratificato | `ds-v3.css`, `--velo-foto` |

---

## 4. Da dove ripartire, dopo la domanda del §0

**La roadmap è allineata e la fonte è quella** (`docs/roadmap/ROADMAP-UFFICIALE.md`). Le voci pronte:

- **voce 2** — *Avviso alla consegna su dente/colore mancanti*: avviso, **mai blocco** (una totale non ha
  elemento, un bite non ha colore). Oggi `precheck.ts` non li nomina e la DdC stampa il valore grezzo.
- **voce 3** — ⚠️ *Verificare se il colore compaia nella DdC*: sembra assente dal modello e dallo snapshot,
  mentre `ANALISI/17:119` lo elenca fra gli obbligatori. **Possibile lacuna normativa** → verifica prima,
  voce dopo.
- **voce 6** — *Le tinte del manufatto* (D42): ratificata **da fare dopo l'ondata (b)** — cioè adesso.
  Catalogo separato con voci che hanno un NOME; 🛑 niente esadecimale libero, niente scale nuove dentro
  `colori_dentali` (cinque chiavi esterne puntano lì).
- **voce 7** — *Gli allegati e la loro condivisione* (D67): ondata propria, tutta da progettare. È la
  destinazione di **D75** (durata dei collegamenti firmati) e **R20** (la public URL persistita).

🔑 **E l'ondata (c) del wizard eredita tre pulizie** già censite (§5-quinquies dell'handoff dell'ondata (a)).

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md`, sempre per primi.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa
  aggiornato. Una decisione che **cancella del lavoro** si scrive **per prima**.
- **§0B per l'UI:** mockup → screenshot → **approvazione** → codice. E le foto di prova **vere**, se la
  superficie mostra fotografie (§2 ④).
- **TDD**, e dopo il primo rosso **abbozzo inerte + conteggio `N su M`**.
- **R-E2:** un difetto fuori dal proprio mandato si **riferisce**, non si corregge di nascosto — e se lo si
  corregge su decisione di Francesco, **la riga che diceva «non corretto» va aggiornata** (successo oggi:
  il riquadro del verbale contraddiceva D96 due voci più sotto).
- **FASE 7 per intero, output incollato.** **Riferimento misurato il 02/08 ad albero pulito:** `vitest`
  **369 | 3** file e **4234 | 19** prove · `tsc` **0** · `next build` ok.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
  ⚠️ `git commit -- <percorso>` committa il contenuto **del disco** per quel percorso.
- 🛑 **Mai un git worktree in questo progetto.**

**Il banco di prova, e come entrarci** (direttiva di Francesco del 02/08: *«nel file env abbiamo i dati di
test, puoi usarli e devi usarli»*): l'utenza che funziona è il **titolare E2E** (`e2e-titolare@ua-test.local`,
password in `scripts/seed-e2e.ts`), dopo `npx tsx scripts/seed-e2e.ts` — idempotente. ⚠️ L'utenza `TEST_*` di
`.env.local` finiva sulla pagina dell'abbonamento perché la prova era scaduta: Francesco ha esteso i trial il
02/08, ma il titolare E2E resta la via sicura. ⚠️ **L'accesso ha un limite di tentativi ravvicinati:** dopo
qualche login di fila serve aspettare qualche minuto.
