# Handoff — il registro delle emissioni: otto task, otto difetti di piano, e un cancello saltato

**Per:** la sessione nuova, a contesto pulito.
**Stato del ramo:** `main` = **`af81961b`**, albero **pulito**, **0 commit da pubblicare** — **tutto è in
produzione**. Il ramo `dpa-registro` è stato unito con `35172e70` (merge non-fast-forward, **41 commit**).
**Riferimento misurato ADESSO, su `main`:** `tsc` **0** · `vitest` **375 | 3** file e **4380 | 19** prove ·
`next build` **uscita 0** · guardia dei documenti **verde**.
⚠️ **Sulla data.** L'orologio della macchina dice **2 agosto**; i documenti seguono la serie del **4 agosto**
(macchina **+2**). Questo handoff la tiene, e ha **corretto tre timbri** che avevo messo col giorno della
macchina (v. §0 ④).

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO, e va detto per primo

### ① Ho pubblicato **saltando un cancello che le istruzioni dichiarano obbligatorio**

Le REGOLE ZERO di `ua-app/CLAUDE.md` §0C dicono, testualmente: «*MAI mergere una superficie UI
nuova/modificata senza il **GATE ESTETICO L2 (FASE 9b)**; ogni piano `writing-plans` di un'ondata con UI
**DEVE** includerlo come step finale*».

`provato:` `grep -c "9b\|GATE ESTETICO\|gate estetico"` sul piano → **1 hit, ed è un frammento di
impronta** (`9bed6991…`), non la fase. **Il piano non ha mai previsto la FASE 9b.**
`provato:` `ls docs/design/screenshots/ | grep 2026-08` → **nessuna cartella**.
`provato:` `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` **esiste e non è stata percorsa**.

🔑 **Sono due mancanze in fila, e la seconda è mia.** Il piano ha omesso la fase — è il **nono difetto di
piano** dell'ondata, l'unico che **nessun esecutore e nessun revisore ha visto**, perché tutti guardavano il
proprio task e la fase finale non era di nessuno. E io **non l'ho notato prima di unire e pubblicare**.

**Che cosa è stato fatto davvero, per non gonfiarlo:** la **FASE 9** (non la 9b) sì, e misurata — tasto
**44 × 164 px** a 390/768/1280, frase **2 righe** a 390 e **1** sugli altri, **nessuno scorrimento
orizzontale**, `download` effettivamente tolto, contrasti misurati in chiaro (**4,84** e **7,90**) e in
scuro (**2,24** e **4,45** → voce **P16**). **Manca il giro delle 12 sezioni della checklist** e mancano
**gli scatti su disco**.

➡️ **Non è un guasto che spedisce** — la superficie è un blocco di tre elementi in una pagina legacy v2.3 —
**ma è una regola disattesa, e il modo giusto di chiuderla è percorrerla, non dichiararla superflua.**

### ② Gli scatti del collaudo **non sono su disco**

`docs/design/screenshots/` non ha nessuna cartella di questa ondata. Le misure ci sono e sono più forti di
un'immagine (sono numeri, non impressioni), **ma il deposito previsto dal workflow è vuoto** e la sessione
nuova non ha un «prima» da confrontare.

### ③ Il panel normativo su **D128** non è stato fatto — e adesso **blocca**

D128 (la firma è un'accettazione tracciata) poggia sull'Art. 28(9) GDPR — «*per iscritto, anche in formato
elettronico*» — **citato a memoria, mai letto alla fonte**. Finché l'ondata 1 non firmava niente non
mordeva. 🛑 **Adesso l'ondata 2 è la prossima cosa da fare, e questo è il suo primo passo.**

### ④ Tre timbri di data erano sbagliati, e li ho corretti in chiusura

Avevo scritto «in produzione dal **02/08**» — che è il giorno della **macchina**, non della serie dei
documenti (**04/08**). Corretto in `ROADMAP-UFFICIALE.md`, `MEMORY.md`, `SESSION_ACTIVE.md`.
🔑 **Piccolo, ma è la stessa famiglia di tutto il resto della giornata:** ho preso il dato dallo strato più
comodo invece che da quello giusto.

### ⑤ Una decisione dell'ondata resta **APERTA**, e non è stata portata a Francesco come domanda

**Il soft-delete della riga orfana precede la riemissione** (`src/lib/pdf/generate-dpa.ts`, ramo «il PDF
conservato non si trova più»). Se qualcosa fallisce **dopo** l'archiviazione, il registro vivo resta **senza
nessun DPA** per quel dentista; e se la riga archiviata era `firmato`, `firmato_da`/`firmato_at` restano
nella riga morta e ogni lettura successiva vede «**da firmare**» dove esiste un accordo **firmato**.
Il Task 6 ha ristretto l'**innesco** (solo un file **davvero** assente), **non l'esito**. → roadmap **P10**,
sede naturale **ondata 2**.

**E una seconda, sui permessi:** `admin_sistema` è nell'allowlist della rotta ma non ci arriva, **e la
premessa che lo dava per «irraggiungibile per progetto» era falsa** (il vincolo **permette** un
`admin_sistema` con laboratorio). Va deciso: o deve poter scaricare — e allora serve un modo di dirgli **di
quale** laboratorio — o il nome va tolto. → **P12**.

### ⑥ Restano intatte, dall'handoff precedente

**D42** (piano `docs/superpowers/plans/2026-08-03-tinte-manufatto.md` pronto, `provato:` **zero** commit di
codice) · il **§6-bis** della DdC mai percorso in produzione · **AUD-1 · AUD-3 · AUD-4 · AUD-5** · il
**round 2** dell'audit (**120 decisioni non provate** — non «a posto»: **non verificate**).

### ⑦ Che cosa NON è verificabile da qui

Lo **stato «con emissione» della scheda cliente non è stato guardato nel browser**: il collaudo l'ha creato
in produzione **dopo** la FASE 9, e non ci sono tornato. La riga «Ultima emissione» è provata **dal codice e
dalle prove**, non dall'occhio.

---

## 1. Che cosa è successo

| | |
|---|---|
| 🚀 **IN PRODUZIONE** | Merge `35172e70`, **41 commit**, autorizzato da Francesco. Il contratto GDPR ai dentisti non si «genera al volo»: si **EMETTE** — conservato nell'archivio privato, numerato con un progressivo vero, con la sua riga di registro e le sue due impronte — e si **riusa** se nulla è cambiato |
| 🏆 **COLLAUDO PASSATO** | `provato: IN PRODUZIONE` — due scarichi **in sequenza**: stesso file, stesso `DPA-2026-0001`, **byte identici** (riuso, nessun numero bruciato). Due richieste **IN PARALLELO** su uno studio mai emesso: **UNA sola riga**, `DPA-2026-0002`, byte identici. Registro: **2 righe, 2 dentisti, contatore a 2** |
| 🔑 **La corsa era provata solo contro mock** | Ed è **il difetto che il panel aveva trovato**: prima della correzione dell'indice, quelle due richieste davano **due contratti identici con due numeri bruciati, in silenzio**. Nessun errore, nessun rumore |
| 🧱 **Migration applicata al database vero** | Colonne **7/7**, indici `dpa_*` **2/2**, vincoli **3/3**, trigger **1/1**. **Tre sonde, ognuna rifiutata dal vincolo GIUSTO** (`23514` coerenza · `23505` numero · `23505` **deduplicazione**). Ledger delle migration rimesso in pari, **92 → 93** |
| ✍️ **D132** | L'indice anti-doppione **esclude gli stati morti** (`revocato`, `scaduto`), o un contratto revocato farebbe da **tappo** alla riemissione per sempre. 🛑 **Non era una riga sola:** predicato dell'indice, filtro del guard e filtro della rilettura sono **la stessa cosa** — cambiarne uno dava il difetto **opposto**, consegnare un contratto revocato come corrente |
| ✍️ **D133** | `VERSIONE_MODELLO_DPA` **porta dentro l'impronta del testo** (`dpa-v2+8d98dbee`), così **cambia da sola**. La guardia rendeva **visibile** un cambio ma non **impediva** di dimenticare il numero — e a versione ferma l'indice **non avrebbe riemesso**. Lezione di **D120** applicata **togliendo il gesto**, non aggiungendo un'altra promessa |
| 🔴 **Un guasto di produzione corretto per strada** | `DpaTemplate` stampava la data **nel fuso della macchina**, e in produzione la macchina gira a **UTC**: un contratto emesso alle **00:30 di Roma** stampava **il giorno prima**. `provato:` `2026-03-10T23:30:00Z` → «10 marzo» a UTC, «11 marzo» a Roma. ⚠️ **Lo stesso difetto vive in altri DIECI punti, in sette modelli PDF, DdC compresa** → **P9** |
| 🔎 **Otto task, otto difetti di piano** | Uno per task. I più cari: l'indice non poteva **mai** scattare in una corsa · l'archivio risponde **400** e il «404» è **una stringa nel corpo** · nessuna prova legava l'impronta dei **dati** alla sua provenienza (scambiandola con quella del PDF, **7 prove su 7** restavano verdi) |
| 📋 **Sedici voci riferite** | **P1-P16** in roadmap, **nessuna corretta di sfuggita** (R-E2) |
| **Salvataggi** | `35172e70` (merge) · `bcb1cf42` · `af81961b` — **tutti pubblicati** |

---

## 2. 🔑 Le lezioni — valgono per il codice futuro

**① LA FONTE DI UN FATTO È LO STRATO IN CUI IL CODICE LO LEGGE.** È la lezione della giornata, ed è stata
sbagliata **quattro volte**, sempre allo stesso modo:
- il panel ha letto **`supabase/schema.sql`** invece di **`pg_proc`** — e ha dichiarato «bloccante» un
  difetto che **non esisteva**, tre righe dopo aver declassato un'altra prova **per quello stesso motivo**;
- io ho letto il **corpo HTTP** con `curl` e ho concluso sull'**oggetto JavaScript** — ma in mezzo c'è un
  client che butta via il campo su cui avevo basato tutto;
- io ho letto un **vincolo al rovescio** (`ruolo = 'admin_sistema' OR laboratorio_id IS NOT NULL` **permette**
  un admin con laboratorio: non lo **obbliga** a starne senza);
- io ho sondato l'**`etag`** della pagina per sapere se il rilascio fosse arrivato: quello che cambiava era
  la **pagina di sfida anti-bot**, accesa **dal mio stesso sondaggio**.
🛑 **Regola operativa:** per un oggetto di banca dati la fonte è `pg_proc`/`pg_trigger`/`pg_constraint`/
`pg_indexes`; per un errore di libreria è **l'oggetto che il codice riceve**, non la risposta di rete; per
un rilascio è **chi lo decide** (`gh run list`), non la pagina servita.

**② Un conteggio di mutanti misura l'insieme che hai scelto, non la copertura.** Tre revisioni hanno
riscritto mutanti **diversi** da quelli dichiarati: al Task 4 ne sono sfuggiti **6 su 14**, al Task 5 **6 su
12**, al Task 6 la rete ha retto **24 su 30**. «17 su 17» era vero **nel suo perimetro** e falso come
affermazione generale.

**③ Un `it.each` SEMBRA coprire quattro casi.** Al Task 7, **tre casi su quattro non erano uccisi da
niente**. Una forma che elenca non è una forma che prova.

**④ Si asserisce il TESTO, non la chiamata.** `expect(spia).toHaveBeenCalled()` restava **verde** su tre
rami solo-log, perché il blocco che solleva chiama `console.error` **da sé**.

**⑤ Una prova che finisce con `ROLLBACK` dopo la `SELECT` non si vede.** Editor SQL e API restituiscono
**solo l'ultimo risultato**: si sarebbe letto «*No rows returned*» esattamente dove il piano prometteva la
tabella della prova. `provato:` `SELECT 1; SELECT 2;` → `[{"secondo":2}]`.

**⑥ 🛑 MAI `git add -A` — e oggi questa regola ha retto davvero.** Un **mutante di un revisore in volo**
(`assertLabOperativo(context,'GET')` → `'POST'`) era nell'albero mentre un esecutore committava. Elencando i
file non è entrato. Con `-A` oggi avremmo in produzione un controllo di stato che guarda `'POST'` su una
rotta `GET`. **Non è igiene: è ciò che ha retto.**

**⑦ Il rilascio sono DUE fasi, ~11 minuti.** Controlli automatici **8m34s**, **poi** il rilascio **~2m20s**.
La nota «~5 minuti dal push» degli handoff precedenti è **ottimista**. E **il service worker serve pagine in
cache anche in produzione**: dopo un rilascio va tolta la registrazione e svuotate le cache, o si guarda il
codice vecchio credendolo nuovo.

**⑧ Una fase che non è di nessun task non la fa nessuno.** La FASE 9b è saltata perché **il piano non
l'aveva**, e ogni esecutore guardava il proprio mandato. **Le fasi di fine ondata vanno messe nel piano come
task, o non esistono.**

---

## 3. Che cosa resta aperto — in ordine di importanza

| # | cosa | dove |
|---|---|---|
| 🔴 **1** | **Il GATE ESTETICO L2 (FASE 9b) sulla superficie pubblicata** — 12 sezioni × 390/768/1280 × chiaro/scuro, scatti su disco | §0 ① · `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` |
| 🔴 **2** | **Il panel normativo su D128** (Art. 28(9) letto **alla fonte**) — **primo passo dell'ondata 2** | spec DPA §11 |
| 🔴 **3** | **Ondata 2: la FIRMA a distanza** — invio email + WhatsApp, pagina di firma a gettone, documento firmato che torna e si conserva (**D127-D131**) | roadmap **riga 10**, parte (b) |
| 🔴 **4** | **La data nel fuso sbagliato in DIECI punti, sette modelli PDF, DdC compresa** | **P9** |
| 🔴 **5** | **La DdC ORFANA non è annullabile** dopo un fallimento parziale della consegna | roadmap, «I documenti che escono dal laboratorio» riga 12 |
| 🔴 **6** | **Il PATCH del lavoro non ha alcun cancello di stato** (`paziente_id` scrivibile dopo l'emissione della DdC) | riga 13 · `src/app/api/lavori/[id]/route.ts` |
| 🔴 **7** | **Eseguire D42** — piano pronto, **zero righe** | `docs/superpowers/plans/2026-08-03-tinte-manufatto.md` |
| 🟠 **8** | **Cancellare un laboratorio lascia i suoi PDF nell'archivio** — e da oggi lì dentro ci sono **contratti veri** | **P2** |
| 🟠 **9** | **La decisione aperta sul soft-delete** (§0 ⑤) e **i permessi di `admin_sistema`** (§0 ⑤) | **P10** · **P12** |
| 🟠 **10** | **`progressivi.ts` perde il messaggio del database per TUTTI i documenti** — 7 chiamate in 5 file | **P11** |
| 🟠 **11** | **Tre progetti Playwright puntano a spec inesistenti**, e la CI non li esegue | **P15** |
| 🟠 **12** | **In scuro la promessa di conservazione non si legge** (2,24 : 1) | **P16** |
| 🟠 **13** | **AUD-1 · AUD-3 · AUD-4 · AUD-5** · il **buono di consegna** che non si rigenera · la **DdC che cita `Art. 2(1)(3)`** | roadmap |
| 🟡 **14** | **`schema.sql` REGREDIREBBE `apply_updated_at_trigger`** se rigiocato · nessuna guardia confronta fotografia e catalogo | **P1** · **P5** |
| 🟡 **15** | **Il §6-bis della DdC** non provato in produzione · il **round 2 dell'audit** (120 decisioni non provate) | referti |

---

## 4. Da dove ripartire

**La fonte è `docs/roadmap/ROADMAP-UFFICIALE.md`.** La **riga 10** è la voce viva: la parte **(a)** e
**metà della (b)** sono **in produzione e collaudate**; resta la **(b) per intero — la firma**.

**La prima cosa, e sono due in fila:** ① chiudere il **GATE ESTETICO L2** sulla superficie già pubblicata
(§0 ①), perché è una regola disattesa e va percorsa, non dichiarata superflua; ② il **panel normativo su
D128**, che è il cancello d'ingresso dell'ondata 2.

⚡ **Se si vuole una vittoria breve prima:** la voce **P16** — il contrasto della frase in modo scuro — è un
token, e quella riga porta una **promessa contrattuale** verso lo studio dentistico.

---

## 5. Come si lavora qui — il minimo per non sbagliare

- **BP-0:** `memory/MEMORY.md` e `memory/SESSION_ACTIVE.md` per primi. ⚠️ `MEMORY.md` è grosso: si legge **la
  testa**, non tutto.
- **§0A-bis:** una scelta di Francesco = **una riga nel verbale, nello stesso turno**, col conteggio in testa.
  Verbale: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **centotrentatré** decisioni in
  **quarantacinque** tornate. La prossima è **D134**.
- **La guardia dei documenti** (`node scripts/guardia-coerenza-documenti.mjs`) gira al pre-commit: se si
  accende, **il difetto è quasi sempre tuo**. ⚠️ **Un percorso citato dev'essere vero**: per nominarne uno che
  non esiste o è stato tolto servono le parole che la guardia riconosce (`rimosso`, `non esiste più`,
  `da creare`, `🆕`), oppure non si scrive il nome del file.
- **R-E1 / R-E2:** un compito alla volta a un esecutore fresco, **col mandato esplicito di cercare dove il
  piano sbaglia**; un difetto fuori mandato si **riferisce**. In questa ondata ha reso **otto difetti su otto
  task**.
- **FASE 7 per intero, output incollato.** I tre comandi sono tre. **Riferimento di oggi:** `tsc` 0 ·
  `vitest` **375 | 3** file e **4380 | 19** prove · `next build` 0.
- **FASE 6b:** dopo ogni migration, `supabase gen types` + `tsc`. **Il CI non applica le migrazioni** — ma la
  Management API sì, con `read_only:false`: **si può**, e per questo il motivo per fermarsi è che **scrivere
  su un ambiente vero è una decisione di Francesco**, non «non si può».
- **Leggere il database dal terminale, in sola lettura:**
  `TOKEN=$(grep '^SUPABASE_ACCESS_TOKEN=' .env.local | cut -d= -f2- | tr -d '"')` →
  `POST https://api.supabase.com/v1/projects/iagibumwjstnveqpjbwq/database/query` con
  `{"query":"…","read_only":true}`. 🛑 **`read_only:true` sempre.**
- **D103 — l'accesso al banco:** credenziali di `.env.local`, **link monouso**
  (`npx tsx scripts/tmp/link-accesso.ts <email> <percorso>`). ⚠️ `scripts/tmp/` è **ignorato da git**.
  ⚠️ **Il service worker serve pagine in cache**: per vedere il codice nuovo si passa dalla **lista** e si
  clicca il collegamento, oppure si tolgono registrazione e cache.
- ⚠️ **Non sondare la produzione con `curl` in ciclo:** dopo ~40 richieste Vercel accende la **sfida
  anti-bot** e tutto risponde **403**. Per il collaudo si usa il **browser**, con la sessione vera.
- **Salvataggio:** 🛑 mai `git add -A`; `git commit -F <file-messaggio>` col messaggio **fuori dal repo**.
- 🛑 **Mai un git worktree in questo progetto.**
