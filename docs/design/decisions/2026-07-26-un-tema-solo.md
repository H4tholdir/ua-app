# Un tema solo — decisioni di Francesco del 26/07/2026

**Spec attuativa:** `docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md`
**Assorbe:** voce **A5** del backlog tecnico
**Stato:** ratificate · tappa 1 in produzione (`03ec7595`)

---

## Le decisioni, nell'ordine in cui sono state prese

| # | Decisione | Contesto |
|---|---|---|
| D1 | **La barra di stato si fonde con l'app** — `#F4F0E7` in chiaro, `#171411` in scuro | Scelta fra: fondersi · restare rossa come firma · seguire la testata di ogni pagina. Motivazione: coerenza col fondo unificato del 26/07; il rosso era l'unica cosa rimasta fuori |
| D2 | **La pagina offline si allinea al fondo unificato**, versione scura inclusa | Aveva un terzo colore orfano (`#DDD8D3`) e **nessuna variante scura**. Scelta fra: allineare · lasciarla grigia · allineare solo il fondo e rimandare lo scuro |
| D3 | **Rollout in due tempi** per la barra | Scelta fra: due tempi · tutto insieme. Motivazione: è l'unico modo di sapere **chi comanda** quella barra, dato che la documentazione della piattaforma non lo dice |
| D4 | **Un tema solo:** l'app segue il telefono; per bloccarlo, **un'unica opzione in Impostazioni** | 🎯 **Decisione che ha ridefinito il lavoro.** Non richiesta da me: proposta da Francesco a metà sessione, dopo aver visto che il tema dell'app poteva divergere da quello del telefono. Toglie una regola invece di aggiungerne una |
| D5 | **Tutti gli altri punti di accesso al tema si bonificano e spariscono**, login compreso | Erano **sei** (testata · scheda lavoro · pannello profilo · login · amministrazione · catalogo DS), più i toast che seguivano il telefono per conto proprio |
| D6 | **Nessuna eccezione:** `blocked` e `billing`, oggi a tema fisso, passano sotto la regola unica | Scelta fra: nessuna eccezione · lasciarle fisse. ⚠️ Sono **UI nuova**: due superfici prendono una resa mai esistita → workflow §0B + gate estetico L2 |
| D7 | **L'area amministrazione rientra nella bonifica** | La sua memoria separata (`ua-admin-theme`) sparisce |

**Dove va l'opzione:** in **Impostazioni**, con tre scelte — *Automatico* (predefinita) · *Sempre chiaro* · *Sempre scuro*. Scartato il pannello del profilo: è dove si cerca il proprio account, non le preferenze dell'app.

### D8 — Che forma ha il selettore (26/07, dopo i mockup)

Mockup: `docs/design/mockups/2026-07-26-tema-impostazioni.html` · catture 390 light+dark in
`docs/design/mockups/screenshots/`. Tre varianti presentate: **A** righe col pallino (come «La tua
home», già in quella pagina) · **B** tre pulsanti affiancati · **C** righe con l'anteprima del colore.

**Francesco preferisce la forma B**, ma ha posto la domanda giusta: *«poiché la pagina è in v2.3 e
noi dovremmo migrare tutto a v3, dobbiamo continuare in modalità v2.3?»*.

**Il fatto che ha deciso la scelta:** la forma B **esiste già pronta in v3** — `ChipScelta`
(`src/components/ds/ChipScelta.tsx`, §5.31 della spec v3: stato, spunta **accanto** al colore perché
il colore da solo non basta mai, `vibra('selection')`). In v2.3 andrebbe **ricostruita a mano**, e
quel pezzo verrebbe **buttato** il giorno in cui `/impostazioni` passa a v3. Migrare `/impostazioni`
adesso non è un ritocco: **829 righe** fra pagina e componenti, più **tre sottopagine** (abbonamento,
PEC, profilo), su una superficie che tocca **dati fiscali e PEC**.

**RATIFICATO: variante A adesso** — righe col pallino, **più una frase di stato** che dichiara cosa
sta seguendo in questo momento (il pezzo buono della B). Zero componenti nuovi, niente da buttare.
**Quando arriverà l'ondata v3 di `/impostazioni`, la stessa scelta diventa B con `ChipScelta`** — la
forma che Francesco preferisce, ottenuta gratis invece che pagata due volte.

📌 Conferma la regola di convivenza DS v3 §14: **si migra per route, mai per componente.**

### D6-bis — L'approvazione di `blocked` e `billing` è CONDIZIONATA (26/07, sera)

Le due rese mai esistite — la sospensione in chiaro, l'abbonamento in scuro — sono state mostrate a
Francesco prima del codice (§0B): catture in
`docs/design/mockups/screenshots/2026-07-26-{blocked,billing}-390-{chiaro,scuro}-{OGGI,NUOVO}.png`.
La sospensione è la pagina vera; l'abbonamento è il suo markup vero sul foglio di stile vero, perché
`/billing` esige una sessione con un laboratorio scaduto.

**Francesco non ha approvato: ha posto una condizione.** Parole sue:

> «queste pagine, nel passaggio al v3 verranno revisionate nuovamente e potremmo correggere tutto
> ciò che c'è da correggere […]? se la risposta è sì, lascia pure come è, se la risposta è no,
> allora dobbiamo rivederle per forza»

**La condizione è verificata, non supposta:** entrambe stanno nell'ondata **F2 «accessi»** del
calendario di migrazione v3 (`docs/roadmap/ROADMAP-UFFICIALE.md`, ratificato da Francesco il
20/07/2026), insieme ad auth e `/onboarding`, con **percorso Grande** e QA dedicato. E il 26/07
stesso lui aveva già deferito alle ondate proprietarie «bottone oro e i difetti di leggibilità»:
il bottone oro è proprio quello di `/billing`.

🛑 **Che cosa significa per chi arriva dopo.** L'approvazione **non dice che queste due schermate
vanno bene**: dice che il loro giudizio estetico è **rimandato a F2**. Se un giorno F2 venisse
tolta dal calendario, o `blocked`/`billing` ne uscissero, **questa approvazione decade** e le due
rese vanno riviste prima. È la stessa lezione che ha riaperto la voce A5: un archivio che conserva
una **conclusione** al posto di una **relazione** invecchia in silenzio.

---

## Decise dall'implementatore, con motivazione

- **`/ds-v3-catalogo` tiene il suo interruttore.** Serve a confrontare i componenti nei due temi ed è una pagina che l'utente non incontra mai. Eccezione **dichiarata**, presidiata dalla guardia come voce nominata — non un buco.
- **I toast passano sotto la regola unica.** `sonner.tsx:3` importa `useTheme` da `next-themes`, di cui non esiste alcun provider montato: seguivano il telefono, mai la preferenza. È una riga.

---

## Conseguenze accettate, dichiarate prima che si vedessero

1. **Splash chiaro anche in tema scuro.** Il manifest porta **un solo** colore, non sensibile alla preferenza (`w3c/manifest#975` ancora aperta). Si sceglie il chiaro perché `background_color` è già `#F4F0E7` e i due si vedono **insieme**, sullo stesso fotogramma. 🛑 Mai un terzo tono di compromesso: sarebbe `#DDD8D3` da capo.
2. **La tappa 2 non è annullabile in giornata:** il valore del manifest è cotto nel pacchetto installato e torna indietro solo quando Android lo rigenera.
3. **Chi aveva bloccato un tema si ritrova in «Automatico»**, perché il vecchio interruttore non offriva quella scelta: nessuno l'aveva mai potuta esprimere.
4. **Non è un lavoro di accessibilità.** Verificato: `#F4F0E7` → icone scure, 18,5:1; `#171411` → icone chiare, 18,3:1; il rosso attuale era già leggibile a 5,30:1. È coerenza visiva, e va motivata come tale.
5. **Non chiude la barra dei gesti in basso** (bug Chromium 40759522, non nostro) **né iOS**.
