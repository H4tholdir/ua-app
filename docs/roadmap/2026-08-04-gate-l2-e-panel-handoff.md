# Handoff — il cancello saltato, due panel normativi, e un salvataggio che sembrava completo

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`744025be`**, albero **pulito**, **0 da pubblicare** — tutto è in produzione.
**Riferimento misurato ADESSO:** `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove · `next build` **uscita 0** · guardia dei documenti **verde** (8 documenti vivi).
⚠️ **Sulla data.** L'orologio della macchina dice **2 agosto**; i documenti seguono la serie del **4 agosto** (macchina **+2**). Questo handoff la tiene.

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① Oggi non è stata scritta **nessuna riga di codice applicativo**

`provato:` `git diff --stat 7d6ee54c..HEAD -- src/ supabase/` → **vuoto**. I file toccati sono **51 documenti, 2 script, 2 di memoria**.

🔑 **Perché sta per primo e non nella nota a margine:** questa giornata ha prodotto **cinque decisioni ratificate** (D134-D138) e **sei voci di roadmap nuove o rivalutate** (P7 · P17 · P18 · P19 · P20 · P21 · P22). Chi legge quell'elenco può credere che qualcosa sia stato **costruito**. Non è così: **si è deciso e misurato, non costruito**. Tutte e ventidue le voci P restano aperte.

### ② Il salvataggio del database **NON è programmato** — gira solo se qualcuno lo lancia a mano

`provato:` `crontab -l | grep -c salvataggio` → **0** · `ls ~/Library/LaunchAgents | grep -ci ua` → **0**.

Ho costruito e **provato** la rete di sicurezza (`scripts/salvataggio-database.sh`), ma **non l'ho automatizzata e non ho chiesto a Francesco se la volesse automatica**. Quindi oggi esiste **una** copia, di oggi, e domani sarà vecchia di un giorno. 🔑 **Una rete che dipende dal fatto che qualcuno si ricordi di tenderla non è una rete.**

### ③ Il **ripristino vero non è mai stato provato**, e restano 11 regole senza spiegazione

Il ripristino è stato provato in un **PostgreSQL nudo dentro un contenitore**, non su un progetto Supabase vero. Lì **11 regole di accesso su 115 non si sono applicate**. L'ipotesi — in un PostgreSQL nudo non esistono i ruoli `anon`/`authenticated` che quelle regole nominano — è **plausibile e NON VERIFICATA**. Va contata il giorno di un ripristino vero.

### ④ Due azioni che sono di Francesco e **nessuno ha fatto**

- 🔴 **Guardare quale piano Vercel è in uso.** Riserva aperta dal panel su D128, ripetuta dal panel su D136, **ancora aperta**. Serve perché la clausola che rende automatico il contratto sui dati di Vercel è riferita ai piani Enterprise e Pro.
- 🔴 **Guardare il piano Supabase nel pannello.** La Management API **non espone l'abbonamento** (`/billing/subscription` → «Cannot GET»); `plan:"free"` e `backups:[]` sono **coerenti fra loro** ma non sono una prova del piano.

### ⑤ 🔴 **Il database di produzione, in questo momento, non ha copie di sicurezza**

`provato:` `pitr_enabled:false`, **`backups:[]`**. D138 dice che il piano a pagamento si prende **prima della distribuzione**, quindi la sequenza è corretta — **ma va detto senza attenuanti che oggi l'unica rete è un file sul Mac di Francesco, fatto oggi**. Se il progetto si corrompesse stanotte, si tornerebbe a stamattina, e **solo se quel Mac è acceso e integro**.

### ⑥ Il gate estetico L2 **non ha corretto niente** — l'ha misurato

I due ❌ trovati sono stati **portati come decisione** (P16 → **D134**, deferita) e **aperti come voce** (§9 → **P17**). **Nessun difetto è stato riparato.** Chi legge «gate L2 fatto» non deve leggere «superficie a posto».
⚠️ **E gli scatti sono tutti `prima-*` senza un `dopo`**: lo script che li ha prodotti stava in `scripts/tmp/`, che è **ignorato da git** e **non sopravvive**. La ricetta per riscriverlo è in coda al referto del gate, §5.

### ⑦ Una citazione di seconda mano, dichiarata

**Cassazione 20945/2026** — il ritrovamento che ha cambiato il disegno dell'ondata — **non è stata letta sul PDF della Corte**: `italgiure.giustizia.it` risponde con un errore di certificato. È riscontrata **verbatim** su una pubblicazione giuridica indipendente e confermata da altre nove fonti, fra cui *Il Sole 24 Ore*. **Non è una lettura alla fonte primaria**, e in questo progetto la differenza si scrive.

### ⑧ Restano intatte, dall'handoff precedente

**D42** (`provato:` piano pronto, **zero** commit di codice) · il **§6-bis** della DdC mai percorso in produzione · **AUD-1 · AUD-2 · AUD-3 · AUD-4 · AUD-5** · il **round 2** dell'audit (**120 decisioni non verificate**) · **P9** (`provato:` **8** modelli PDF stampano date, **uno solo** dichiara il fuso — invariato) · **P10 · P11 · P12 · P15**.

---

## 1. Che cosa è successo

| | |
|---|---|
| ✅ **Il cancello saltato, percorso** | **FASE 9b** sulla superficie DPA della scheda cliente — la voce 🔴 1 dell'handoff precedente. **12 sezioni × 2 stati × 390·768·1280 × chiaro·scuro**, **45 file** di scatti e misure su disco. 🔑 **Porta il modello che mancava: come si applica una checklist v3 a una pagina legacy v2.3** — tre criteri **N/A con la ragione scritta**, gli altri nove a peso pieno. Referto: `docs/design/audit-ui-ux/LIVELLO-2-2026-08-04-dpa-scheda-cliente-ESITI.md`. ✅ **Chiude anche la §0 ⑦ precedente:** lo stato «con emissione» **non era mai stato guardato**; adesso lo è |
| ✅ **Panel su D128** | La voce 🔴 2. **Art. 28(9) letto ALLA FONTE**, e la nostra citazione era **imprecisa**: «**in forma scritta**», non «per iscritto» — ed è l'espressione su cui il **CAD art. 20** costruisce tutto. **Tre advisor a mandato disgiunto, tutti REGGE CON CONDIZIONI.** Referto: `docs/roadmap/2026-08-04-panel-d128-referto.md` |
| ✅ **Panel su D136** | **Tre advisor**, tutti REGGE CON CONDIZIONI, **ma D136 sbagliava il MOMENTO**. Referto: `docs/roadmap/2026-08-04-panel-d136-referto.md` |
| 🔴 **Il ritrovamento più pesante** | **Il database di produzione non ha copie di sicurezza** — e non c'entra col contratto. → **P20** |
| 🔴 **Il difetto contrattuale** | **UÀ non ha un contratto sulla protezione dei dati con i laboratori che la usano**, e il documento che quei laboratori consegnano ai dentisti **dice che ce l'ha** (`DpaTemplate.tsx:210`). Confermato da Francesco: «*no, oggi non firma niente*». → **P19** |
| ✍️ **Cinque decisioni** | **D134** il contrasto in scuro si deferisce, col prezzo scritto · **D135** la firma resta l'accettazione tracciata, ma il testo si corregge prima · **D136** UÀ si dà le proprie condizioni col contratto sui dati dentro · **D137** sì a tutte e tre (momento · secondo passaggio · messa in sicurezza prima) · **D138** niente migrazione sul VPS |
| 🛡️ **Una rete costruita e PROVATA** | `scripts/salvataggio-database.sh` + ~~scripts/salvataggio-archivio·ts~~ → 🔄 **sostituito il 04/08 da `scripts/salvataggio-archivio.mjs`** (D139): il vecchio importava `@supabase/supabase-js` e quindi girava **solo** dentro il progetto, mentre il salvataggio automatico deve girare da `~/Library`. Il nuovo non usa nessuna libreria, ed è `provato equivalente` confrontando le **impronte** dei 31 file scaricati, non il loro numero. **11 MB**, e il ripristino provato davvero |
| **Salvataggi** | `b9111b3e` · `5ce2a904` · `e4516dc6` · `7c4a36cb` · `9044bc83` · `09d5b4f5` · `d7024c30` · `4bce6b35` · `7185498f` · `9e0da8a9` · `a05f3cfa` · `744025be` — **tutti pubblicati** |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① UN SALVATAGGIO CHE SEMBRA COMPLETO E NON LO È.** È la lezione della giornata. Il salvataggio standard di Supabase copre **solo lo schema `public`**: ricaricandolo, **tutti** i numeri tornavano (295 lavori · 39 clienti · 2 contratti · 1588 righe di registro · 104 funzioni) **e nessuno poteva entrare**, perché lo schema degli utenti non c'era. E i **file** — contratti in PDF e **foto cliniche** — non erano copiati affatto.
🛑 **Trovato solo perché il salvataggio è stato RICARICATO DAVVERO**, in un database usa-e-getta. Guardando i file sarebbe passato: erano tre, pesavano 6 MB, i controlli erano verdi.
🔑 **Regola operativa:** *un salvataggio che non si ripristina non è un salvataggio: è un file.* E il ripristino si prova **contando le righe contro la sorgente**, non guardando se il comando finisce senza errori.

**② LA FONTE DI UN FATTO È LO STRATO IN CUI IL CODICE LO LEGGE — sbagliata una QUINTA volta, stavolta da un advisor.** Un advisor ha dato per bloccante che «*anche l'utente autenticato può scrivere sulla tabella*» citando i permessi (`relacl`). Vero — **ma quei permessi sono IDENTICI su tutte le tabelle del progetto**, `audit_log` compreso, ed è l'architettura standard di Supabase. **Il cancello non è il permesso: è il COMANDO della regola di riga.** 🔑 La conclusione non cambiava, **la motivazione sì** — e chi avesse «riparato i permessi» avrebbe rotto l'app senza chiudere il buco.

**③ Una decisione RATIFICATA può essere sbagliata, ed è per questo che il panel viene dopo.** D136 diceva «accettate **al momento dell'abbonamento**». Tre righe di codice l'hanno smentita: un laboratorio nasce in prova, e **in prova tutte le scritture passano**. Il panel non ha rifinito la decisione: **l'ha corretta**.

**④ Una deferizione senza il suo prezzo è una rimozione.** D134 defersice P16 — ma scrive **che cosa si è deciso di tenere**: due righe illeggibili in modo scuro, una delle quali è un impegno verso lo studio e l'altra porta il numero del contratto. Senza quella riga, fra tre mesi sembra che il problema non ci fosse.

**⑤ Il precedente di un fornitore vale solo dentro il suo ordinamento.** «Lo fanno Supabase, Vercel e Resend» regge per l'Art. 28(9), che è diritto europeo uniforme, e **non prova nulla** sull'art. 1341 del Codice civile: sono società non italiane, rette da legge non italiana, **dove quell'articolo non esiste**.

**⑥ Il rischio va spesso nella direzione OPPOSTA a quella attesa.** Sulla firma ci si aspettava «il dentista nega di aver firmato». Il rischio vero è il rovescio: l'art. 1341 colpisce **solo le clausole che proteggono chi scrive il contratto**, quindi in causa **UÀ resterebbe legata a ogni proprio dovere e priva di ogni propria difesa**.

**⑦ Migrare non RISOLVE un problema operativo: lo TRASFERISCE.** Il VPS non era il problema (Norimberga = UE, ed è gestito). Ma spostarsi non avrebbe dato le copie di sicurezza: **avrebbe dato la responsabilità di farle** — e su dati sanitari quella è una promessa contrattuale.

**⑧ Una checklist di un sistema nuovo su una pagina vecchia si applica con le esclusioni SCRITTE.** Tre criteri su dodici erano N/A: segnarli come difetti avrebbe portato il lettore successivo a «aggiustare» la pagina **violando** la regola di migrazione per route. **Un N/A senza la sua ragione accanto è un difetto travestito.**

**⑨ Una fonte che non si apre si dichiara.** Il PDF della Cassazione non si è aperto. Il riscontro su fonte indipendente **non è la stessa cosa** di una lettura alla fonte, e la differenza si scrive — anche quando la conclusione non cambia.

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Il database di produzione non ha copie di sicurezza.** Il piano a pagamento è **un acquisto di Francesco**. Nel frattempo il salvataggio sul Mac **non è programmato** | **P20** · §0 ② e ⑤ |
| 🔴 **2** | **UÀ non ha un contratto coi laboratori, e il documento dice che ce l'ha.** Assorbe la condizione **C1** e **blocca l'inizio dell'ondata 2** | **P19** · `DpaTemplate.tsx:210` |
| 🔴 **3** | **L1 · L2 · L3 prima della prima accettazione** (D137 c): copie · cancellazione vera · tracciamento degli accessi di UÀ | **P20 · P21 · P22** |
| 🔴 **4** | **P7 rivalutata da 🟢 a 🔴 — precondizione dell'ondata 2:** il registro che dovrà contenere la prova è **riscrivibile dalla parte che la prova deve vincolare**. La finestra per ripararlo **senza toccare prove vere** è adesso (`provato:` 2 righe, **0 firmate**) | **P7** |
| 🔴 **5** | **L'ondata 2 (la FIRMA a distanza)** — perimetro ormai deciso dai due panel: testo con occhio legale · momento al primo accesso · secondo passaggio con codice usa-e-getta · **tabella nuova** in sola aggiunta | roadmap **riga 10** · referti D128 e D136 |
| 🔴 **6** | **Lo scarico che fallisce porta il titolare su `{"error":"…"}`**, zero elementi interattivi | **P17** |
| 🔴 **7** | **P9** la data nel fuso sbagliato · **la DdC orfana non annullabile** · **il PATCH del lavoro senza cancello di stato** · **eseguire D42** | roadmap |
| 🟠 **8** | **P18** idratazione disallineata: fa divergere **il link mandato al dentista** · **P2** i PDF restano nell'archivio · **P10 · P11 · P12 · P15 · P16** | roadmap |
| 🟠 **9** | **Le due azioni di Francesco**: piano Vercel e piano Supabase, da guardare nel pannello | §0 ④ |
| 🟡 **10** | **Le 11 regole** non applicate nel ripristino di prova · **il ripristino vero mai fatto** | §0 ③ |
| 🟡 **11** | **AUD-1/2/3/4/5** · il **§6-bis** · il **round 2** dell'audit (120 decisioni non verificate) | roadmap |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** La **riga 10** resta la voce viva: la parte **(a)** e metà della **(b)** sono in produzione; resta la **(b) per intero — la firma**.

🛑 **Ma l'ondata 2 NON parte finché non si chiude P19**, perché la condizione C1 la precede e D137 (b) ha ratificato l'ordine: **le correzioni di testo prima di qualunque accettazione**.

**La prima cosa, e sono due in fila:**
① **Le copie di sicurezza** — è di Francesco, ed è l'unica cosa di tutta la giornata che protegge un rischio **che esiste adesso**.
② **La spec dell'ondata P19** — brainstorming (FASE 2) → validazione architetturale (FASE 3) → piano (FASE 4). ⚠️ **Dominio critico** (auth + migration + RLS): percorso **GRANDE** obbligatorio.

⚡ **Se si vuole una vittoria breve prima:** programmare il salvataggio (§0 ②) è mezz'ora e toglie una dipendenza dalla memoria di qualcuno.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/SESSION_ACTIVE.md` e la **testa** di `memory/MEMORY.md` (è grosso: si legge la testa, non tutto).
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa. Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centotrentotto** decisioni in **cinquanta** tornate. La prossima è **D139**.
- **La guardia dei documenti** (`node scripts/guardia-coerenza-documenti.mjs`) gira al pre-commit: se si accende, **il difetto è quasi sempre tuo**.
- **Regola Advisor:** ogni decisione significativa vuole il suo panel di 2-3 advisor **a mandato disgiunto**, con l'ordine esplicito di **demolire** la tesi. In questa giornata ha reso: **il momento sbagliato**, **la Cassazione**, **il non-riuso della tabella**, **le copie di sicurezza**.
- 🛑 **Gli advisor si RIVERIFICANO.** Uno ha sbagliato lo strato (§2 ②), uno ha dichiarato di non poter interrogare la banca dati. **Il panel è materiale di lavoro, non una fonte.**
- **FASE 7 per intero, output incollato.** I tre comandi sono tre. **Riferimento di oggi:** `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove · `next build` **0**.
- **Leggere il database dal terminale, in sola lettura:**
  `TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"')` →
  `POST https://api.supabase.com/v1/projects/iagibumwjstnveqpjbwq/database/query` con `{"query":"…","read_only":true}`. 🛑 **`read_only:true` sempre.**
- **Salvare il database:** `bash scripts/salvataggio-database.sh` → `~/Backup-UA-database/<data-e-ora>/`. **La procedura di ripristino è in coda allo script**, compreso il perché il caricamento dei dati vuole i controlli sospesi (`fatture` e `pagamenti` hanno vincoli **circolari** — misurato, non temuto).
- ⚠️ **Docker serve** al salvataggio (`supabase db dump` lo richiede) ed è **installato ma non parte da solo**: `open -a Docker`, poi ~6 secondi.
- ⚠️ **Il guard `rm`:** il progetto blocca ogni comando che contenga `rm` ricorsivo fuori dalle aree temporanee — **`docker rm` compreso**. Si usa `docker container remove --force`.
- **D103 — l'accesso al banco:** credenziali di `.env.local`, **link monouso** (`npx tsx scripts/tmp/link-accesso.ts <email> <percorso>`). ⚠️ `scripts/tmp/` è **ignorato da git**.
- ⚠️ **Non sondare la produzione con `curl` in ciclo:** dopo ~40 richieste Vercel accende la **sfida anti-bot** e tutto risponde **403**. Per il collaudo si usa il **browser**; per un giro lungo, **il locale**, che è **lo stesso commit** della produzione.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
