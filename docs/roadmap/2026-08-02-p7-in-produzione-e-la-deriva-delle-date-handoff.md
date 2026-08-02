# Handoff — P7 in produzione, e la deriva delle date che nessuno aveva mai controllato

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`45e89a62`**, albero **pulito**, ✅ **0 da pubblicare** — tutto è in produzione.
**Riferimento misurato ADESSO** (i tre comandi, eseguiti in chiusura): `tsc` **0** · `vitest` **4382 passate | 19 saltate** (375 file | 3 saltati) · `next build` **uscita 0**.

> 📅 **QUESTO È IL PRIMO DOCUMENTO CON LA DATA VERA.** Si chiama `2026-08-02` perché oggi **è** il 2 agosto, `provato:` `date` → `Sun Aug 2 18:24 CEST 2026` e tre server indipendenti che dicono lo stesso istante. **Ordinandolo per nome finisce PRIMA dei file `2026-08-03-*` e `2026-08-04-*`, ed è corretto così:** quelli sono datati avanti di due giorni (v. §2 ⑥ e `CLAUDE.md` §0F). **Non è un errore da "correggere" rinominandolo.**

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① 🔴 **La frase falsa al dentista è ancora viva — TERZO handoff di fila**

`provato:` `grep -c "per contratto" src/components/features/pdf/DpaTemplate.tsx` → **1**.

🛑 **E stavolta pesa di più, non di meno.** Non è stata dimenticata: è stata **messa sul tavolo come opzione all'inizio della sessione**, il suo costo è stato **rimisurato** (`provato:` nessuno dei **17** controlli di `tests/unit/dpa-pdf-content.test.ts` la blocca → è un cambio di testo; **ma** decidere *cosa* scriverci è una scelta normativa su un documento che esce verso terzi → panel §0C e numero proprio: **mezza giornata, non mezz'ora**), e poi la sessione è andata su P7 e non ci è più tornata.
🔑 **Il difetto è che un documento che UÀ PRODUCE OGGI afferma un contratto che non esiste** (D140: UÀ non è nemmeno un soggetto giuridico). Con D145 è **FASE 1** e non aspetta più P19.

### ② 🟠 **P7 è chiusa solo IN PARTE — dichiarato ovunque, ma va ripetuto**

**T4** («la cancellazione di un laboratorio funziona ancora con `emesso_da` valorizzato») **NON È ESEGUIBILE**, perché la cancellazione è rotta per conto suo (**P28**). `provato:` né la roadmap né la spec dicono ✅ — la voce è ancora **🔴** e la testa della spec dice **«ESEGUITA IN PARTE»**.
🔑 **Sta qui e non in §1 perché un'ondata "fatta" con una prova su cinque non eseguita è esattamente la cosa che, riletta fra due settimane, diventa "fatta" e basta.**

### ③ 🔴 **La spec P19-a non è ancora stata riletta da Francesco** — invariata dall'handoff precedente

`provato:` **0** marchi di rilettura nel file. Era già la voce ③ di ieri. **È FASE 2**, quindi non blocca niente, ma il conto sale: la spec è **scritta e non approvata** da due giornate.
⚠️ **Distinguerla da D149:** la spec di **P7** è passata al piano **senza** rilettura *per scelta esplicita di Francesco*. Quella di **P19-a** invece **aspetta una risposta che non è mai arrivata**. Due cose diverse, e il verbale le tiene diverse.

### ④ 🟠 **L'archivio dei documenti resta datato male — per decisione, non per dimenticanza**

**D155** ha fermato la deriva **da qui in avanti**; i ~40 file già scritti **non** sono stati rinominati (costo: centinaia di citazioni interne, e non è FASE 1). **Chi legge il passato deve convertire:** `2026-08-03-*` = scritto l'**1 agosto** · `2026-08-04-*` = scritto il **2 agosto**. Tabella in `CLAUDE.md` §0F.

### ⑤ 🟠 **Le tre cose di Francesco: invariate**

🔴 **P24** il piano Vercel vieta l'uso commerciale · 🔴 **P20** il piano Supabase gratuito non ha copie ripristinabili · 🔴 **D140** UÀ non esiste come soggetto giuridico. **Nessuna delle tre è codice, nessuna delle tre è stata toccata.**

### ⑥ Restano intatte, dagli handoff precedenti

Il **ripristino vero mai provato** e le **11 regole su 115** senza spiegazione · **D42** · il **§6-bis** della DdC · **AUD-1…AUD-5** · il **round 2** dell'audit (120 decisioni non verificate) · **P9 · P10 · P11 · P12 · P15 · P16 · P17 · P18**.

---

## 1. Che cosa è successo

| | |
|---|---|
| 🔨 **LA FASE 1 È INIZIATA, ed è la prima volta in tre giornate che si scrive codice dell'applicazione** | Francesco ha scelto **P7** (**D146**) fra tre partenze presentate col **costo reale ricalcolato**. `provato:` `git diff` su `src/` e `supabase/` — non è più vuoto |
| ✅ **P7 in produzione** | `main` **`45e89a62`**, CI **7m27s** verde, rilascio **2m47s** riuscito, `uachelab.com/login` → **200**. `provato:` il codice **pubblicato** porta il cambiamento (`git show origin/main:…generate-dpa.ts` → 2 occorrenze di `emesso_da`; la rotta passa `context.userId`) — verificato **oltre** l'esito del rilascio |
| 🛡️ **I tre pezzi** | ① la regola di riga passa a **sola lettura** (modello `sdi_receipts`) · ② la tabella entra nel registro delle modifiche, **da 10 sorvegliate a 11** · ③ colonna **`emesso_da`**, riempita da un **terzo parametro obbligatorio** di `generateDpa` |
| 🔬 **Le prove, sul database VIVO** | **T1** rifiuto ✅ *col controllo positivo* (regola vecchia: **2 righe** toccate; regola nuova: **0**) · **T2** traccia ✅ (`audit_log` 0→1, `new_data` con **23** chiavi) · **T3** il «chi» ✅ **sul dato vero** (emissione autorizzata, `DPA-2026-0003`) · **T5** la chiave esterna morde ✅ (23503 incollato) · **T4** 🔴 **non eseguibile** |
| 🔴 **QUATTRO voci nuove di roadmap, tutte da ritrovamenti FUORI mandato (R-E2)** | **P25** il registro delle modifiche **non sa dire chi** (`provato:` **1.587 righe su 1.588** senza attore) · **P26** la DdC **ha già** la colonna «chi ha premuto» e **non la riempie mai** (5 righe, **0**) · **P27** `schema.sql` mostra **1 automatismo su 11** ed è diventato **non eseguibile da zero** · **P28** un laboratorio che ha emesso un contratto **non si può più cancellare** |
| 📅 **La deriva delle date, chiusa** | **D155**. `provato:` tre server indipendenti + `sntp` (+0,09 s) → **l'orologio era giusto, i documenti sbagliati di 2 giorni**. Regola in `CLAUDE.md` **§0F** |
| ✍️ **Dieci decisioni** | **D146** si parte da P7 · **D147** cancello + traccia · **D148** la traccia dice anche *chi* · **D149** la spec va al piano senza rilettura · **D150** esecutori freschi · **D151** la migration la applica Claude · **D152** T3 con emissione vera · **D153** P28 in roadmap, non qui · **D154** si unisce e si pubblica · **D155** la data si legge dall'orologio |
| **Salvataggi** | 11 sul ramo + 3 su `main` — **tutti pubblicati** |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① UNA STRANEZZA TRAMANDATA TRE VOLTE SMETTE DI SEMBRARE UN DIFETTO.** «*L'orologio del Mac dice 2 agosto, i documenti seguono il 4 agosto*» stava **scritto in ogni handoff**, ed era diventata una **regola da rispettare** invece che un errore da chiudere. Ci sono passato sopra anch'io, scrivendola nella spec come convenzione. **Francesco l'ha smontata in tre parole** — «*ma se oggi è il 2 agosto*» — e la verifica è costata **dieci secondi**. 🔑 **Ciò che è scritto in tutti i documenti non è per questo verificato: è solo copiato.**

**② UN CONTROLLO CHE NON PUÒ MAI PASSARE INSEGNA A IGNORARE I CONTROLLI.** Il piano chiedeva `grep -c "BEGIN;\|COMMIT;" <migration>` → atteso **0**, ma l'intestazione **obbligatoria** contiene proprio quelle parole: dava **1**, sempre, per chiunque. Trovato **due volte in modo indipendente** (esecutore e revisore).

**③ IL NUMERO GIUSTO NEL MOMENTO SBAGLIATO MANDA A CACCIA DI UN DIFETTO CHE NON C'È.** Il piano chiedeva **54** errori di compilazione **prima** di allargare la firma: a quel punto sono **2**. I 54 arrivano **dopo** l'abbozzo inerte. Un esecutore che conta 2 aspettandosene 54 conclude di aver sbagliato tutto.

**④ IL PRECEDENTE IN CASA ERA UNA TRAPPOLA — DUE VOLTE.** La colonna «chi ha premuto» della DdC esiste da mesi coi tipi giusti, il commento giusto, e **zero valori** (P26): è la ragione per cui qui il parametro nasce **obbligatorio**, così il rumore lo fa il compilatore. E l'ordine dei `DELETE`, dato per sicuro, era sbagliato su un'altra colonna (P28). 🔑 **Cercare il precedente serve a smontare l'idea, non a confermarla.**

**⑤ UNA PROVA SU UN CASO NON È UNA PROVA SUL COMPORTAMENTO.** L'assunzione **A7** della spec dichiarava sicuro l'ordine delle cancellazioni **avendolo provato solo su `utenti`** (155 vs 163), mai su `clienti` (130). È **esattamente lì** che si nascondeva P28. **L'ordine si prova su TUTTE le chiavi esterne entranti**, non su quella che si ha in mente.

**⑥ UNA DATA DI DOCUMENTO USATA PER MISURARE IL TEMPO SBAGLIA SEMPRE NELLA DIREZIONE CHE RASSICURA.** La revisione finale ha scritto «*gira in produzione **dal 04/08**, senza incidenti*»: erano **due ore e mezza**, in un intervallo in cui **nessun laboratorio vero ha usato l'app**. Non è robustezza dimostrata, è **assenza di occasioni di rompersi**.

**⑦ UN NOME DI LAVORO SCRITTO AL PASSATO SI LEGGE COME UN ESITO.** Il riepilogo del rilascio mostrava «*CI fallita — deploy saltato*» con un trattino accanto. Non era un fallimento: era il **nome** della guardia che scatta *se* la CI fallisce, e il trattino vuol dire **saltato**.

**⑧ PUBBLICARE ERA PIÙ SICURO CHE ASPETTARE, ed è controintuitivo.** La metà rischiosa era **già viva** (migration applicata alle 15:22); il merge consegnava **solo TypeScript e documenti**. Lo **scarto** era il danno vero: il codice pubblicato scriveva `emesso_da` **NULL** a ogni emissione — cioè fabbricava **le righe mute di P26**. **Ogni ora di attesa era una riga muta in più.**

**⑨ IL MANDATO «CERCA DOVE IL PIANO SBAGLIA» PAGA, E SI MISURA.** Esecutori e revisori freschi (D150) hanno trovato **cinque difetti del piano** — tutti corretti **nel piano**, non aggirati. Più il sesto, trovato da Francesco.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **La frase falsa al dentista** — `DpaTemplate.tsx:210`, 1 occorrenza viva, **terzo handoff**. FASE 1. Costo vero: **mezza giornata** (panel + numero di decisione), non mezz'ora | §0 ① |
| 🔴 **2** | **La FASE 1 prosegue:** **P17** (lo scarico che fallisce → pagina di codice) · **P16 · P18 · P9 · P13 · P11** · la DdC orfana · il buono che non si rigenera · **P6 · P8 · P14 · P4 · P15 · P5 · P23** | roadmap, FASE 1 ② e ③ |
| 🟠 **3** | **P28** — un laboratorio che ha emesso un contratto **non si può cancellare**. FASE 2, accanto a **P21**. ⚠️ Non è la voce del 28/07 (quella: sei tabelle mai toccate; questa: **ordine sbagliato**) | roadmap · **D153** |
| 🟠 **4** | **P27** — `schema.sql` mostra 1 automatismo su 11 e **non è più eseguibile da zero** | roadmap |
| 🟠 **5** | **P25 · P26** — il registro non sa dire *chi* (1.587/1.588) · la DdC ha la colonna e non la riempie | roadmap |
| 🟠 **6** | **La spec P19-a aspetta la rilettura**, poi il piano. FASE 2 | §0 ③ |
| 🟠 **7** | **Le tre cose di Francesco:** **P24 · P20 · D140** | §0 ⑤ |
| 🟡 **8** | **M4** — `expect(riga.firmato_da).toBeUndefined()` è un'asserzione debole (verde per qualunque implementazione ragionevole). Rilievo minore accettato, non un difetto | `tests/unit/dpa-registro.test.ts:468` |
| 🟡 **9** | **P2 · P10 · P12 · P22** · il **ripristino vero** · **AUD-1…5** · il **round 2** dell'audit | roadmap |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`, e la prima cosa che si legge è la sezione ordinatrice.**

**🔨 Si prosegue la FASE 1.** Due partenze legittime, e la scelta è di Francesco:
- ⚡ **La correzione di `DpaTemplate.tsx:210`** — la più vecchia ancora viva, e la più imbarazzante: un documento che esce verso i dentisti afferma un contratto che non esiste. **Mezza giornata**, perché il testo nuovo vuole un panel e il suo numero di decisione.
- **P17** — la più visibile per il titolare: lo scarico che fallisce lo porta su una pagina di codice, senza un tasto. ⚠️ **Trascina §0B per intero** (mockup → scatti → approvazione → React) **più la FASE 9b**: è una pagina **in produzione**.

🛑 **La FASE 2 non si tocca finché la FASE 1 non è finita** (D144), con l'unica eccezione delle **tre azioni di Francesco**, che non sono codice.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/SESSION_ACTIVE.md` e la **testa** di `memory/MEMORY.md` (è grosso: si legge la testa).
- 📅 🆕 **`CLAUDE.md` §0F — LA DATA SI LEGGE DALL'OROLOGIO.** Prima di dare un nome a un documento si esegue `date`. **Mai** dedurla dal documento precedente: è così che è nata una deriva di **due giorni** su ~40 file.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa. Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centocinquantacinque** decisioni in **cinquantacinque** tornate. La prossima è **D156**.
- **Le guardie sono DUE, al pre-commit:** `guardia-coerenza-documenti.mjs` e `guardia-salvataggio-installato.mjs`. ⚠️ La prima **si accende su un documento che cita un file non ancora creato**: per i file che il piano *creerà*, si marca la riga con **🆕** (è la sua via d'uscita prevista).
- ⚠️ **Il salvataggio del database vive in DUE posti** — il progetto e `~/Library/Application Support/UA-salvataggio/`. Chi tocca i suoi script **rilancia l'installatore**, o la guardia ferma il commit.
- **FASE 7 per intero, output incollato.** I tre comandi sono tre. **Riferimento di oggi:** `tsc` **0** · `vitest` **4382 | 19** (375 file) · `next build` **0**.
- **Leggere il database dal terminale:** `SUPABASE_ACCESS_TOKEN` da `.env.local` → `POST https://api.supabase.com/v1/projects/iagibumwjstnveqpjbwq/database/query` con `{"query":"…","read_only":true}`. 🛑 **`read_only:true` SEMPRE.** ✅ **In questa sessione ha funzionato** (l'handoff precedente la dava bloccata dal filtro dell'ambiente): si fa da uno **script `.mjs`**, non da un `node -e` con apostrofi italiani dentro.
- 🛑 **Scrivere sul database è una decisione di Francesco**, e il motivo **non** è la mancanza della password (`.env.local` ce l'ha). Un motivo falso è un motivo che il prossimo esecutore scavalca.
- ⚠️ **Le prove distruttive vanno in `BEGIN … ROLLBACK`, e prima si verifica che il ROLLBACK annulli davvero** con una prova innocua. La Management API non è `psql`.
- ⚠️ **Non sondare la produzione con `curl` in ciclo:** dopo ~40 richieste Vercel accende la sfida anti-bot e tutto risponde **403**.
- ⚠️ **`find` di questo Mac è `bfs`** e non accetta `-newermt` relativo: date ISO.
- ⚠️ **Il guard `rm`:** negli script `/bin/rm` con percorso pieno.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
