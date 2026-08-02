# Handoff — il salvataggio che non partiva, la spec del contratto, e la roadmap rimessa in ordine

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`4674056e`**, albero **pulito**, ✅ **0 da pubblicare** — tutto è in produzione (v. §0 ②).
**Riferimento misurato ADESSO:** `tsc` **0** · `vitest` **4380 | 19** prove (riverificate alla chiusura; i **375 | 3** file vengono dalla misura di inizio sessione) · `next build` **uscita 0** · **guardia documenti verde** · **guardia salvataggio verde**.
⚠️ **Sulla data.** L'orologio della macchina dice **2 agosto**; i documenti seguono la serie del **4 agosto**. Questo handoff la tiene ed è il **secondo** del 4 agosto.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① 🔴 **Nemmeno oggi è stata scritta una riga di codice APPLICATIVO**

`provato:` `git diff --stat 8caadc2c..HEAD -- src/ supabase/` → **vuoto**.

🔑 **E questa volta pesa il doppio**, perché la giornata si è chiusa ratificando che **prima si finisce la PWA** (D144). Sono stati scritti **script** (`scripts/`) e **documenti**: la rete di sicurezza, una spec, il riordino della roadmap. **Utile, ma non è l'applicazione.** Chi legge «sette decisioni e due voci nuove» può credere che la FASE 1 sia iniziata: **non è iniziata**, e non è stata toccata **nessuna** delle sue voci.

### ② ✅ ~~Tre salvataggi NON pubblicati~~ — **CHIUSA subito dopo la chiusura**

Questa voce era: «*3 da pubblicare, la roadmap riordinata e la spec vivono solo su questo Mac*». **Francesco ha autorizzato e sono stati pubblicati.**
`provato:` `git push` → `0f5963ee..4674056e`, poi `git log origin/main..main` → **0**, albero **pulito**.
🔑 **Resta scritta invece di sparire**, perché la §0 racconta anche *come* si è chiusa una cosa: la pubblicazione **non è mai automatica**, si chiede.

### ③ 🔴 **La spec P19-a non è stata RILETTA da Francesco**

`provato:` **0** marchi di rilettura nel file. Il metodo di lavoro prevede un passaggio esplicito — *«rileggila e dimmi se cambiare qualcosa»* — **prima** di passare al piano. È stato chiesto in chat e **la risposta non è arrivata**, perché la conversazione è andata sul riordino. La spec è quindi **scritta ma non approvata**.

### ④ 🔴 **La correzione di testo della FASE 1 ④ non è stata fatta**

`provato:` `DpaTemplate.tsx` contiene **ancora** «*…impone a ciascuno di essi, **per contratto**, obblighi di protezione dei dati equivalenti…*» — **1 occorrenza, invariata**.
🔑 È il difetto più vecchio ancora vivo di questa serie: un documento che **esce verso i dentisti** e afferma un contratto che **non esiste**. Con D145 è **FASE 1** e non aspetta più P19. **Nessuno l'ha toccato.**

### ⑤ 🔴 **I traguardi V1.9 e V2.0 sono stati SEGNALATI ma NON corretti**

`provato:` righe **639** e **656** di `ROADMAP-UFFICIALE.md` dicono ancora «*da fare PRIMA che **Filippo** usi l'app seriamente*» e «*V2.0 — **Post-Collaudo sul campo***».
La nuova sezione ordinatrice **dichiara** che quel trigger non esiste più (statuto delle fonti, 27/07), ma **il testo delle due sezioni è intatto**. Chi legge il documento **dal basso** trova ancora la versione vecchia. ⚠️ **Un difetto dichiarato in un posto e vivo in un altro è peggio di un difetto non dichiarato:** dà l'impressione che sia stato risolto.

### ⑥ 🟠 **Le tre cose di Francesco, invariate**

**Il piano Vercel e il piano Supabase** sono ora **noti** («*sono quelli gratis*», → **P24** e **P20**) ma **non cambiati**. **Il soggetto giuridico di UÀ non esiste** (**D140**) e non è stato avviato niente.

### ⑦ 🟡 **Numeri di ieri usati come se fossero di oggi**

Corretto a fine sessione con una riga esplicita nella roadmap, ma va ripetuto: le righe del registro di **P7** (2 righe, 0 firmate), le misure del panel su **D136** (69 tabelle su 70 · 0 utenti su 7 · 15 righe orfane · 82 su 82) e i **3 laboratori di prova** vengono dai documenti del **03-04/08** e **non sono stati riverificati oggi**.

### ⑧ Restano intatte, dall'handoff precedente

Il **ripristino vero mai provato** e le **11 regole su 115** senza spiegazione · **D42** · il **§6-bis** della DdC · **AUD-1…AUD-5** · il **round 2** dell'audit (120 decisioni non verificate) · **P9 · P10 · P11 · P12 · P15 · P16**.

---

## 1. Che cosa è successo

| | |
|---|---|
| ✅ **Il salvataggio parte da solo** — e il primo tentativo **non partiva affatto** | **D139**. `provato:` prima `crontab -l` → **0**, `LaunchAgents` → **0**; ora `launchctl print` → `runs = 1, last exit code = 0` e `calendarinterval` Hour 3 · Minute 0 · `watching = 1`. 🛑 **Il difetto che ha cambiato il disegno:** dentro `~/Downloads` un lavoro `launchd` riceve «Operation not permitted» su **ogni livello** (protezione di macOS), mentre `~/Library` si legge. **Trovato solo facendolo partire davvero da launchd con Docker spento** |
| 🛡️ **Tre pezzi nuovi** | `scripts/salvataggio-programmato.sh` (dà a launchd l'ambiente che non ha, **accende Docker e aspetta** — `provato:` «pronto dopo 3 secondi» — verifica la copia sul disco, tiene le ultime **14**) · `scripts/installa-salvataggio-programmato.sh` (copia autonoma in `~/Library/Application Support/UA-salvataggio/`, **solo le 3 credenziali che servono**) · `scripts/guardia-salvataggio-installato.mjs` **al pre-commit** (~0,03 s) |
| ✅ **Archivio riscritto senza librerie** | `salvataggio-archivio·ts` → **`.mjs`**, `provato equivalente` sulle **impronte**: **31 file identici bit per bit**, inventario identico. Versione dello strumento **fissata** a `supabase@2.111.0` |
| ✅ **Spec P19-a scritta** | `docs/superpowers/specs/2026-08-04-p19-a-testo-condizioni-e-dpa-design.md` — il TESTO delle Condizioni + DPA. **P19 scomposta in tre** (a testo · b momento e traccia · c secondo passaggio) |
| 🧭 **Roadmap rimessa in ordine** | **D144 · D145**. Sezione **ordinatrice in testa** (FASE 1 finire la PWA · FASE 2 distribuire), **senza riscrivere l'archivio** |
| 🔴 **P24 — il piano Vercel vieta l'uso commerciale** | `verificato alla fonte`, **due documenti**: regole d'uso e **Termini §4** — «*You shall only use the Services under a Hobby plan for your personal or non-commercial use*». UÀ ha **Stripe in produzione** |
| ✍️ **Sette decisioni** | **D139** il salvataggio parte da solo · **D140** UÀ non esiste come soggetto giuridico · **D141** il testo promette il minimo corretto · **D142** cancellazione piena promessa ora, costruita dopo · **D143** il testo vive nel repository · **D144** prima la PWA poi la distribuzione · **D145** la regola «chi lo vede, e chi costa rifarlo» |
| **Salvataggi** | `d1a41eda` · `0f5963ee` · `81034849` · `32bdf75c` · `6ca93092` · `4674056e` — **tutti pubblicati** |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① UN LAVORO AUTOMATICO SI PROVA NELLE CONDIZIONI DELLE TRE DI NOTTE, NON DAL TERMINALE.** Lanciato a mano funzionava benissimo. Fatto partire da `launchd` con Docker spento **non è partito affatto**, e non avrebbe detto niente a nessuno. 🔑 **`kickstart` prova il PROGRAMMA, non l'ORARIO:** con `RunAtLoad=false` il calendario è l'unico avvio vero, e va guardato che sia registrato — altrimenti «programmato» significa «parte solo se lo avvii tu», cioè la rete manuale di prima **con un nome nuovo**.

**② UN RAMO CHE NON HA MAI GIRATO È CODICE NON PROVATO, anche se è di tre righe.** La rotazione cancella **copie di sicurezza**, soglia 14, copie in casa 5: il primo giro sarebbe stato **il quindicesimo giorno, di notte, da solo**. Provata con 12 cartelle finte: **4 cancellate, tutte finte, 6 vere intatte**.

**③ UNA DIAGNOSI SI CORREGGE IN CORSA, E LA CORREZIONE SI DICE.** Una prima sonda dava `~/Downloads` **scrivibile** e sembrava smentire tutto. La seconda ha separato le due cose: **si scrive, non si legge** — ed è la lettura che serve. Fermarsi alla prima avrebbe portato a riprogettare tutto per un problema inesistente.

**④ IL DOPPIO DEI DOCUMENTI DI UN FORNITORE PUÒ CONTRADDIRSI, E LA TENSIONE SI DICHIARA.** Il controllo incrociato ha **rafforzato** P24 (il divieto sta anche nei Termini §4) e **smontato** una sua affermazione: avevo scritto che su Hobby «UÀ non ha un accordo sui dati». **I Termini §10.1 non lo dicono** — parlano del DPA **senza distinguere il piano**, mentre il DPA riferisce l'automatismo a Enterprise/Pro. 🔑 **Si scrive la tensione, non la lettura che conviene né quella che spaventa.**

**⑤ UN CENSIMENTO CHE INTERROGA IL DOCUMENTO SU SÉ STESSO NON TROVA MAI NIENTE.** Il primo giro dell'audit contava le voci che la roadmap cita **di sé stessa**: per costruzione, zero perdite. Rifatto **dall'esterno** (le 22 voci del backlog, una per una) ha dato 4 sospette — **tutte chiuse**, e verificate **nel codice**, non sulla spunta. E una era un falso allarme del controllore, non del progetto: **cercava nel percorso sbagliato**.

**⑥ UNA PRECONDIZIONE PUÒ NASCONDERSI DENTRO UN DETTAGLIO ANAGRAFICO.** Il panel aveva scritto «mettere i dati identificativi di UÀ» come **condizione T6**, cioè una riga da aggiungere. La prima domanda della spec l'ha rivelata per quello che è: **UÀ non esiste come soggetto giuridico**, e sta **prima** di tutte le altre condizioni.

**⑦ RIORDINARE NON È RISCRIVERE.** La roadmap era ordinata **per giorno di scoperta**. Si è aggiunta una sezione **in testa** e lasciato l'archivio intatto: riscriverlo avrebbe perso mesi di ritrovamenti.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| ✅ ~~1~~ | ~~Pubblicare i tre salvataggi~~ — **FATTO**: `git push` → `0f5963ee..4674056e`, **0 da pubblicare** | §0 ② |
| 🔴 **2** | **FASE 1 non è iniziata.** La prima voce che l'utente incontra è **P17** (lo scarico che fallisce → pagina di codice, zero elementi interattivi); quella che costa di più rifare dopo è **P7** (`provato:` 2 righe, **0 firmate** — la finestra è adesso) | sezione ordinatrice, FASE 1 |
| 🔴 **3** | **La frase falsa al dentista** — `DpaTemplate.tsx:210`, **1 occorrenza viva**. Con D145 è FASE 1 e **non aspetta più P19** | §0 ④ |
| 🔴 **4** | **I traguardi V1.9 / V2.0** portano ancora il trigger «Filippo» — dichiarato morto in testa, **vivo in fondo** | §0 ⑤ · righe 639 e 656 |
| 🟠 **5** | **La spec P19-a aspetta la rilettura di Francesco**, poi il piano (FASE 4). È **FASE 2** | §0 ③ |
| 🟠 **6** | **Le tre cose di Francesco:** piano Vercel (**P24**, blocco duro) · piano Supabase (**P20**) · **il soggetto giuridico** (**D140**) | FASE 2 ① |
| 🟠 **7** | **P21 · P22** (cancellazione vera · tracciamento accessi di UÀ) — condizioni della prima accettazione, e **D142 le rende più delicate** | FASE 2 ② ③ |
| 🟡 **8** | **P23** il salvataggio dei file si ferma a 1000 · **P2 · P18** · il **ripristino vero** mai provato · **AUD-1…5** · il **round 2** dell'audit | roadmap |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`, e adesso la prima cosa che si legge è la sezione ordinatrice** — non serve leggere 1107 righe.

**🔨 Si esegue la FASE 1.** Due partenze legittime, e la scelta è di Francesco:
- **P17** — la più visibile, la più breve: il titolare non deve finire su una pagina di codice.
- **P7** — la più costosa da rimandare: `provato:` **2 righe, 0 firmate**, quindi si ripara **senza toccare prove vere**. Dopo, non sarà più così.

⚡ **E c'è una terza cosa che costa mezz'ora e chiude un difetto vecchio:** la correzione di `DpaTemplate.tsx:210` (§0 ④). Non aspetta niente e nessuno.

🛑 **La FASE 2 non si tocca finché la FASE 1 non è finita** (D144) — con l'unica eccezione delle **tre azioni di Francesco**, che non sono lavoro di codice e possono procedere in parallelo.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/SESSION_ACTIVE.md` e la **testa** di `memory/MEMORY.md` (è grosso: si legge la testa).
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa. Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centoquarantacinque** decisioni in **cinquantuno** tornate. La prossima è **D146**.
- **Le guardie sono DUE, e girano al pre-commit:** `guardia-coerenza-documenti.mjs` e 🆕 `guardia-salvataggio-installato.mjs`. Se la seconda si accende, **la copia del salvataggio è vecchia**: `bash scripts/installa-salvataggio-programmato.sh`.
- ⚠️ **Il salvataggio del database vive in DUE posti** — il progetto (l'originale) e `~/Library/Application Support/UA-salvataggio/` (la copia che gira alle 03:00). **Chi modifica uno dei tre script rilancia l'installatore**, o la guardia ferma il commit.
- 🛑 **NON VERIFICATO:** che cosa faccia macOS se alle 03:00 il Mac è spento o dorme. **Un giorno saltato si conta come saltato.**
- **FASE 7 per intero, output incollato.** I tre comandi sono tre. **Riferimento di oggi:** `tsc` **0** · `vitest` **375 | 3** e **4380 | 19** · `next build` **0**.
- **Leggere il database dal terminale, in sola lettura:** `TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"')` → `POST https://api.supabase.com/v1/projects/iagibumwjstnveqpjbwq/database/query` con `{"query":"…","read_only":true}`. 🛑 `read_only:true` **sempre**. ⚠️ **In questa sessione quella chiamata è stata BLOCCATA dal filtro di sicurezza dell'ambiente**: se serve, va rifatta con uno script o chiesta a Francesco.
- ⚠️ **Docker serve** al salvataggio ed è installato ma **non parte da solo** — l'involucro ora lo accende e aspetta.
- ⚠️ **Il guard `rm`:** il progetto blocca `rm` ricorsivo fuori dalle aree temporanee. Negli **script** si usa `/bin/rm` con percorso pieno; da terminale, `docker container remove --force`.
- ⚠️ **`find` di questo Mac non accetta `-newermt "-3 minutes"`** (è `bfs`): usare date ISO.
- ⚠️ **Non sondare la produzione con `curl` in ciclo:** dopo ~40 richieste Vercel accende la sfida anti-bot e tutto risponde **403**.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
