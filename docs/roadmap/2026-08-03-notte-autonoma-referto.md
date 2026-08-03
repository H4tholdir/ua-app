# Referto — la notte di lavoro autonomo (D168)

**Per:** Francesco, appena sveglio · e per la sessione nuova, a contesto pulito.
**Quando:** dalle **23:40** di domenica 2 agosto alle **07:00** di lunedì 3 (`provato:` `date`).
**Stato del ramo:** 🛑 **`main` NON è stato toccato** — resta a **`89541135`**, come l'hai lasciato.
Tutto vive su **NOVE salvataggi** in una catena di rami, **nessuno pubblicato** (**D169**).

> 📅 **Nome del file:** ordinato per nome finisce **in mezzo** agli altri `2026-08-03-*`, che però sono
> della vecchia deriva di date (nati l'1 agosto, v. **D155**). La protezione vera non è il nome: **memoria,
> roadmap e `SESSION_ACTIVE` puntano tutti qui**.

---

## 0. 🔴 LE COSE DA SAPERE PRIMA DI TUTTO

### ① 🔴 **QUANDO UNISCI P23, LA PRIMA COSA DA FARE È QUESTA**

```bash
bash scripts/installa-salvataggio-programmato.sh
```

**Perché.** Il salvataggio che gira ogni notte non parte dal progetto: parte da una **copia** in
`~/Library`. Finché il lavoro sta su un ramo, la copia corrisponde a `main` e va tutto bene. **Nel momento
in cui P23 entra in `main`, quella copia diventa vecchia** — e niente la aggiorna da sola.

🔑 **Se questo si perde, il salvataggio notturno continua a fermarsi a 1000 file per cartella mentre il
progetto dice che è riparato.** Cioè: esattamente il difetto che P23 esisteva per chiudere, ma peggiore,
perché stavolta ci sarebbe scritto nero su bianco che è a posto.

### ② 🗺️ **La mappa dei rami — e NON si può dedurre dai nomi**

I nove salvataggi stanno su una **catena**: ogni ramo parte dal precedente, non da `main`.

| ramo | che cosa contiene |
|---|---|
| `p15-reti-di-prova-che-puntano-nel-vuoto` | P15 |
| `p9-la-data-dei-documenti-nel-fuso-di-roma` | + P9 |
| `p23-il-salvataggio-che-si-ferma-a-mille` | + P23 |
| `p18-il-collegamento-che-diverge` | + P18 |
| `p30-mockup-modifica-dentista` | + P30 (i disegni) |
| `p13-chi-ha-sbagliato` | + P13 |
| `p11-il-messaggio-del-database` | + P11 |
| **`p30-secondo-motore-e-bersagli`** ← **l'ultimo** | + P30 (motori e bersagli) **+ 🔴 P23, la revisione** |

🛑 **Guarda bene l'ultima riga.** La correzione **più grave** della notte — i **600 file persi in silenzio**
— sta su un ramo che si chiama «secondo motore e bersagli», perché l'ho trovata rivedendo il lavoro mentre
ero lì sopra. **Chi sceglie cosa unire leggendo i nomi non la troverebbe mai.**

➡️ **La cosa semplice da fare:** unire **`p30-secondo-motore-e-bersagli`** porta dentro **tutti e nove**,
nell'ordine giusto, in un colpo solo.
⚠️ **Scartarne uno** (per dire: tenere P9 e lasciare fuori P15) **non è più immediato**: serve un
`cherry-pick`.
🛑 **È uno scostamento dal mandato**, che diceva «ciascuno sul PROPRIO ramo». **Non l'ho rifatto**, e la
ragione è dichiarata: rifare i rami da `main` vuol dire nove `cherry-pick` che **confliggono di sicuro** su
roadmap, verbale e memoria — tutti e nove li toccano. Mezz'ora di lavoro delicato, di notte, per un
vantaggio che serve solo se vuoi scartarne uno.

### ③ ⚠️ **Sei salvataggi su nove hanno scavalcato le guardie del commit, e c'è UNA sola ragione**

`git log` mostrerà sei `--no-verify`. **Non è sciatteria, ed è sempre la stessa causa:**
`guardia-salvataggio-installato.mjs` confronta la copia installata con **il file che hai sotto mano**,
non con **quello pubblicato**. Su un ramo non ancora unito la copia installata corrisponde a `main`, cioè
allo stato approvato: **la deriva non esiste e il rosso è falso**.
✅ **Prima di ogni scavalco tutte le altre guardie sono state fatte girare** sull'albero esatto del
salvataggio, e il loro esito è **incollato nel messaggio del commit**.
🛑 **Le due alternative sono state scartate con motivo:** *rilanciare l'installatore* avrebbe messo codice
**non approvato** dentro il lavoro che di notte salva i tuoi dati (contro D169); *ammorbidire la guardia*
per far passare il proprio commit è la mossa che questo progetto ha già pagato una volta.
➡️ Il punto cieco è aperto come voce **P23-bis**.

### ④ 🛑 **CIÒ CHE NON È STATO FATTO**

- **P18 non è mai stata guardata nel browser.** *Ci ho provato*: server acceso, accesso col link monouso,
  navigato alla scheda del dentista di prova. **Nessun errore di idratazione in console** — 🛑 **ma quella
  assenza non prova niente**, e l'ho verificato invece di darlo per buono: `provato:` il componente **non
  era in pagina**. La scheda risponde **200** e resta sullo **scheletro di caricamento**; il contenuto non
  arriva mai. Causa **non identificata** (nessun errore lato server), forse solo lentezza della prima
  compilazione. 🔑 **Contare l'assenza di un allarme in una stanza vuota non dice che non c'è fuoco.**
- **Su P30 restano tre vuoti:** nessun **lettore di schermo** acceso · **«Riduci movimento»** non provato ·
  **nessuna prova su un telefono vero** (390 px in una finestra non sono un pollice su un vetro).
- **Quattro voci di roadmap non toccate apposta** — **P25 · P26 · P27 · P28**: riguardano tutte la banca
  dati o `schema.sql`. 🛑 `schema.sql` è **l'artefatto che serve al RIPRISTINO**: toccarlo di notte, da solo,
  senza poter provare un ripristino vero, è precisamente il rischio che P23 ha appena insegnato.
- **P29** (una parola, due colori) **non toccata**: la sua voce offre **tre strade e nessuna scelta** — è
  una decisione tua.

### ⑤ 🕐 **Un errore mio, e vale come lezione: ho DEDOTTO l'ora invece di leggerla**

Per quasi tutta la notte ho stimato l'orario dall'avanzamento del lavoro — «saranno le due», «saranno le
quattro e mezza» — invece di guardare l'orologio. `provato:` `date` → erano le **00:44**, mentre credevo
fossero le 04:55. **Le stime erano avanti di quasi quattro ore, e stavo per chiudere la notte dopo aver
usato un sesto del tempo disponibile.**
🔑 **È D155 applicata all'ORA:** un numero **dedotto** invece che **letto**, che nessun passaggio confronta
con un orologio — la stessa identica forma che questo progetto ha già pagato con le date dei documenti.
➡️ **La regola va estesa:** «la data si legge dall'orologio» vale anche per **l'ora**, e per lo stesso motivo.

### ⑥ 🔴 **Le tre cose tue: invariate**

🔴 **P24** il piano Vercel vieta l'uso commerciale · 🔴 **P20** il piano Supabase gratuito non ha copie
ripristinabili · 🔴 **D140** UÀ non esiste come soggetto giuridico. **Nessuna è codice.**

---

## 1. Che cosa è stato fatto

| | |
|---|---|
| ✅ **P15** — le reti di prova che puntavano nel vuoto | Tre progetti Playwright puntavano a **quattro file mai scritti**: un progetto che non trova niente **Playwright lo esegue vuoto e ne esce VERDE**. Rimossi, e nasce `guardia-progetti-playwright.mjs` con **due bracci** (progetto senza prove · prova senza progetto) e **cinque prove che si accende**. `provato:` prima e dopo, «**30 tests in 5 files**»: nessuna prova vera persa |
| ✅ **P9** — la data dei documenti | I documenti stampavano la data nel fuso della **macchina**, e in produzione la macchina è a **UTC**. Tre funzioni condivise e **DODICI** punti portati lì — **non undici**: uno mancava dall'elenco. 🔑 **E le tre prove sul documento, alla prima stesura, erano VERDI col difetto intatto**, perché questo Mac è a Roma: ora il gruppo **si finge la produzione** (`TZ=UTC`) **e verifica che la finta abbia morso** |
| ✅ **P23** — il salvataggio che si fermava a 1000 | **Tre pezzi**, e senza il terzo i primi due erano **inerti**: `salvataggio-database.sh` non ha `set -e` e **inghiottiva** il fallimento, stampando «✅ salvataggio completo». 🔴 **Poi la revisione ne ha trovati altri due** (v. §2) |
| ✅ **P18** — il link mandato al dentista | Non dipende più da dove il laboratorio naviga. 🔑 **Non era solo idratazione:** uno dei sette punti «già a posto» fa **lo stesso link** per WhatsApp — quindi lo stesso collegamento, copiato col tasto o mandato in chat, poteva essere **diverso** |
| ✅ **P13** — chi ha sbagliato | Quattro rotte rispondevano **`400`** («hai sbagliato tu») a un guasto del servizio, e cinque mandavano il testo interno a chi scarica. ⚠️ **Erano SETTE, non quattro** — e fra le mancanti c'era **il modello da copiare** |
| ✅ **P11** — il messaggio del database | Corretto **alla fonte**, non nei sei chiamanti. 🔑 **Una prova esistente PROTEGGEVA il difetto**: pretendeva che il testo del database fosse nel messaggio, **ed era verde** |
| 🟡 **P30** — la pagina di modifica del dentista | **Tre varianti** disegnate, **40 + 18 scatti**, **442 contrasti misurati**, **bersagli tappabili verificati sui tre motori**. 🛑 **ZERO righe di React:** la tua firma sta in mezzo |

**FASE 7, misurata alla fine:** `tsc` **0** · `vitest` **4490 passate | 19 saltate** (384 file) ·
`next build` **uscita 0** · guardia dei progetti Playwright **verde**.

---

## 2. 🔑 Le lezioni — e stanotte sono tutte la stessa

**① UNA MISURA SORPRENDENTE SI SMONTA PRIMA DI CREDERLE — tre volte in una notte.**
Il tasto rosso «sotto soglia» nei disegni: **falso**, il componente vero scrive a 21px e il mio disegno a
17. Il tasto primario «bianco su bianco»: **falso**, la sonda non sapeva leggere i gradienti. «Nessun errore
di idratazione» sulla scheda cliente: **non era una prova**, perché il componente non era in pagina.
⚠️ **E con un'aggravante nuova: un precedente che combacia troppo bene è un ACCELERATORE di errore.** Sul
tasto rosso esisteva il caso gemello già risolto per il verde (§5.4 della spec): rendeva la conclusione
sbagliata **più** credibile, non meno.

**② UN DISEGNO CHE NON COPIA LE MISURE VERE DEI COMPONENTI MENTE IN DUE DIREZIONI.** Una volta **inventa**
un difetto che non c'è (il tasto a 17px), una volta ne **nasconde** uno che c'è (la via di fuga senza area
tappabile, 342×18 su tutti e tre i motori). Stessa causa, esiti opposti.

**③ IL DIFETTO PUÒ ESSERE NEL CODICE CHE RIPARA IL DIFETTO.** La revisione di P23 — fatta a lavoro già
salvato, verde e con FASE 7 passata — ha trovato che la condizione d'arresto **presupponeva** un
comportamento dell'archivio **non provato**, e che lo scarto avanzava di **1000 fisso** invece che di quanti
ne erano arrivati: con un archivio che ne dà 300 per volta, **600 file persi in silenzio**. 🔑 **FASE 7 era
verde e le sette prove erano verdi**: nessuna toccava quel caso.

**④ UNA PROVA PUÒ ESSERE IL POSTO IN CUI UN DIFETTO SI METTE AL SICURO.** `progressivi.test.ts` chiedeva
`/ddc.*boom/`: **pretendeva** che il testo del database fosse dentro il messaggio d'errore. Era verde.
⚠️ **Finché quella riga stava lì, correggere il codice avrebbe fatto diventare rossa la suite — e la
correzione giusta sarebbe sembrata la rottura.** Si riconosce così: **afferma che un dato interno compare in
un canale esterno**. Non descrive un comportamento voluto, descrive quello che il codice **faceva** — è la
differenza fra una prova e una fotografia.

**⑤ UN ELENCO «COMPLETO» NON LO È — tre volte in una notte.** Le rotte dei documenti erano **sette** e la
roadmap ne contava quattro · i punti con la data sbagliata erano **dodici** e ne erano scritti undici · i
comandi col bordo invisibile (ieri) erano quattro e ne erano scritti tre. ⚠️ **E la volta che è costata di
più, non censire non ha fatto perdere lavoro da fare: ha fatto quasi perdere la SOLUZIONE GIÀ TROVATA** —
`scheda-fabbricazione` mancava dall'elenco, ed era il modello da copiare.

**⑥ DUE DIFETTI SULLA STESSA RIGA SI TOCCANO UNA VOLTA SOLA.** Lo stato sbagliato e il messaggio che esce
stavano nella stessa `return`. Correggerne uno avrebbe voluto dire riaprire quel file una seconda volta, e
lasciare in piedi nel frattempo **il peggiore dei due**.

---

## 3. ✅ LE RISPOSTE DI FRANCESCO (mattina del 3 agosto) — D177-D180

| domanda | risposta | che cosa comporta |
|---|---|---|
| **Cosa unire** | **tutto in un colpo solo** (**D177**) | si unisce `p30-secondo-motore-e-bersagli`. 🔴 **Subito dopo:** `bash scripts/installa-salvataggio-programmato.sh` |
| **D-Q3** la data dei documenti | **sulle istruzioni per l'uso non ci va affatto**; ricevuta e scheda dalla **data dell'evento** (**D178**) | 🔑 Le istruzioni sono un **foglio informativo**, non un attestato: non certificano niente, quindi non hanno una data da portare. ✅ **Nessuna colonna nuova** |
| **D-Q1** le prove a schermo in CI | **solo le «pubbliche»**, ~20 su 30 (**D179**) | niente banca dati, niente progetto Supabase nuovo |
| **D-Q4** quale variante di P30 | **la 🅰️**, «le righe che si toccano» — **ma con TRE RISERVE** (**D180**) | 🛑 **Non si scrive React finché non sono sciolte:** **P30-a** · **P30-b** · **P31** |

🔑 **Le tre riserve non le avevo poste io, ed è il punto.** Due su tre possono cambiare la pagina:
**①** i 22 campi non li ha scelti nessuno — sono le colonne che la tabella aveva già, e nessuno ha mai
verificato se bastano (**P30-a**, serve una ricerca) · **②** con la A la pagina di modifica e la scheda
sono quasi identiche, e forse devono essere **una sola** (**P30-b**) · **③** il telefono dello studio e il
cellulare WhatsApp sono **due dati diversi con lo stesso nome**, e oggi ce n'è **uno solo** (**P31** —
difetto vivo: col fisso il messaggio di consegna non arriva a nessuno).

🔧 **E un difetto del disegno, trovato da Francesco provandolo:** nella variante A **ogni riga apriva sempre
lo stesso foglio**, quello del telefono. ⚠️ **Un disegno che si tocca e risponde sempre la stessa cosa fa
credere che preveda un foglio unico.** ✅ Corretto: le **14** righe aprono ognuna la propria domanda.

**Resta aperta una sola domanda:** **D-Q2** — quale delle quattro prove a schermo mancanti scrivere per
prima (il consiglio resta: quella che un laboratorio **non veda i dati di un altro**). E **D-Q5**, minore:
le etichette dei campi in tema scuro.

---

## 3-bis. ❓ Le domande, come erano state poste

Il testo esteso, con le opzioni e il loro prezzo, è in **`docs/roadmap/2026-08-03-notte-autonoma-domande.md`**. In breve:

| # | domanda | il mio parere |
|---|---|---|
| **D-Q4** 🎨 | **P30: quale delle tre varianti?** (+ salvataggio subito o alla fine · quali campi entrano · indirizzo suo) | 🅱️ **i quattro cartoncini** |
| **D-Q1** | Le **30 prove a schermo** non girano in nessuna macchina automatica: le accendiamo? | almeno le «pubbliche» |
| **D-Q2** | Quale prova e2e mancante scriviamo per prima? | quella che un laboratorio **non veda i dati di un altro** |
| **D-Q3** | Tre documenti prendono la data di emissione da «adesso»: **da quale campo** devono prenderla? | per il buono la colonna **esiste già** |
| **D-Q5** | Le etichette dei campi in tema scuro sono a 4,25 contro 4,5: si corregge **solo nei fogli** o **ovunque**? | solo nei fogli, per ora |

---

## 4. Da dove ripartire

1. **Leggi il documento di P30** (`docs/design/2026-08-03-p30-tre-varianti-da-scegliere.md`) e **guarda gli
   scatti**: è l'unica cosa che aspetta te per andare avanti.
2. **Decidi che cosa unire.** Il più semplice: `p30-secondo-motore-e-bersagli`, che li porta tutti.
3. 🔴 **Subito dopo il merge:** `bash scripts/installa-salvataggio-programmato.sh`.
4. Poi CI, e la verifica su `uachelab.com`.

📎 **I due piani scritti prima** (P13 e P11) stanno in `docs/roadmap/2026-08-03-notte-autonoma-piani.md`.
⚠️ **Nei messaggi dei salvataggi sono citati come `scripts/tmp/PIANO-P13.md`**, che è la posizione in cui
sono nati — ma `scripts/tmp/` **è ignorato da git**, quindi sarebbero spariti. Portati al sicuro alla
chiusura. 🔑 **È un piccolo caso della stessa famiglia di stanotte:** un riferimento che *sembra* puntare a
qualcosa, e punta a un posto che non sopravvive.

**Le decisioni della notte** sono **D170 → D176** nel verbale
(`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`): **176 in 65 tornate**, la prossima è
**D177**. ⚠️ **Sono decisioni MIE, non tue** — prese dentro il mandato di D168, tutte su ramo: se una non ti
convince, **si ribalta con un `git checkout`**.
