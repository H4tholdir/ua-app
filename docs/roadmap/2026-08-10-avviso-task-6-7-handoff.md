# Handoff — 10/08/2026 notte: il promemoria SI VEDE (scheda e home), il panel ha risposto, e la ratifica che sblocca il Task 8 non è ancora arrivata

**Per:** Francesco, e per la sessione che riprende.
**Quando:** 10 agosto 2026, **01:55** (`provato:` `date`, in un comando **separato**).
**Stato:** ramo **`intervento-post-consegna`**, albero **pulito**. 🔑 **`main` NON è stato toccato** ed è `7427a680`.
⚠️ Il conteggio dei salvataggi **non si ricopia da qui**: `git rev-list --count main..HEAD` (alla scrittura: **278**).
📬 **PR #1 resta IN BOZZA**: serve a far girare la CI, non al merge.

📌 **MISURATO IN CHIUSURA** (`npm run verify:full`, uscita **da variabile e SENZA pipe**): **`VERIFY_EXIT=0`** ·
**5980 passate | 128 saltate su 469 file** (459 passati, 10 saltati) · `tsc` 0 · build ok · sei guardie verdi.
📈 Apertura di ieri sera: `5902 | 119 su 465` → **+78 prove, +4 file** in una sessione notturna.
🔴 Le saltate sono le prove d'integrazione: `verify:full` **non carica `.env.local`**. Per lanciarle a mano:
`set -a && . ./.env.local; set +a && npx vitest run` · ⚠️ `verify:full` oltre due minuti: **timeout 600000 ms**.

⚖️ **DUE decisioni nuove: D352 · D353** (353 in centocinquantadue tornate) — e **UNA PROPOSTA UNANIME DI PANEL
IN ATTESA DI RATIFICA** (prenderà **D354**). 🗄️ **Zero migration: pavimento invariato `20260809133546`.**

---

## 0. 🔴 CIÒ CHE NON È STATO FATTO

### ① 🟠 LA RATIFICA DI D354 NON È ARRIVATA — e BLOCCA il Task 8
La domanda di Francesco («il secondo promemoria non dovrebbe spegnere il primo?») è andata a **panel a tre
nella notte**: unanimi. **Il secondo NON spegne il primo, ma UN solo atto chiude TUTTE le righe aperte del
lavoro, e il dentista vede l'UNIONE delle voci corrette.** Referto: `docs/roadmap/2026-08-10-panel-due-avvisi-referto.md`.
🛑 **Il Task 8 (portale) dipende dall'esito:** con la ratifica mostra l'unione e la dichiarazione **ultima**;
senza, mostra una card per avviso (D346 com'era). **Non si dispaccia il Task 8 prima della risposta.**
E con la ratifica nasce **un compito nuovo**: la rotta di chiusura passa da `.eq('id', avvisoId)` a «tutte
le aperte del lavoro» (`route.ts:330`), con le sue prove.

### ② 🔴 I TASK 8 · 9 · 10 NON SONO FATTI, censiti col codice
`provato:` `grep -c avvis "src/app/portale/[token]/page.tsx"` → **0** · `Comunicazioni` in
`clienti/[id]/page.tsx` → **0** · il giro completo sul banco vero non esiste.
📌 Il **Task 9 è PRONTO da dispacciare** (non dipende da D354): ⚖️ **D352 è ratificata** — l'archivio lo
vedono `titolare` · `tecnico` · `front_desk`, gli stessi tre di D342 ma **per una strada diversa** (qui non
c'è niente da chiudere: il cancello discende da chi è nel perimetro del titolare, non dal permesso di agire).
`archivioCliente` esiste (`src/lib/avvisi/queries.ts`) e aspetta solo la sua superficie — **senza cancello
di ruolo**: applicarglielo (D352) è parte del Task 9.

### ③ 🔴 IL GATE ESTETICO L2 RESTA DOVUTO PRIMA DEL MERGE — e ora porta anche le FASI 9 dei Task 6 e 7
Invariato da ieri: il gate (D245) sta nel **Task 10**. 🆕 **Accorpate anche le prove a schermo dei Task 6 e
7** (proposta degli esecutori, accolta): per vedere il promemoria serve una riga `avvisi_dentista` aperta,
e l'`INSERT` è revocato a `service_role` — la fixture nasce solo dalla riemissione vera del giro del Task 10.
📌 Al gate va portato anche **M-T6-1**: senza `paziente_nome_snapshot` il foglio stampa «*Hai rifatto la
dichiarazione di —*» (prescritto dal mandato del Task 6; lo decide Francesco).

### ④ 🟠 LA CI DEL RAMO HA UN ROSSO RESIDUO NON DIAGNOSTICATO A FONDO
I due run di stanotte (22:35Z · 22:38Z) sono **rossi**. Due cause distinte:
- ✅ **Una è CHIUSA STANOTTE, con la prova dal vivo:** la prova della nota di credito confrontava la data
  scritta dalla RPC (**giorno civile di Roma, deliberato**) con `CURRENT_DATE` (**UTC di sessione**) —
  arrossiva **da sola ogni notte fra le 22:00Z e mezzanotte**. `provato:` run delle 20:34Z verde (fuori
  finestra), riprodotta rossa in locale alle 01:38, corretta, verde 10/10 **dentro la stessa finestra**
  (`97536cdd`). 🔑 È la lezione di D311 — due orologi, due giorni — nelle prove.
- 🟠 **L'altra è APERTA:** `avvisi-dentista-schema.rpc.test.ts` «(p7) l'UPDATE è concesso SOLO sulle quattro
  colonne» è morta a **5007 ms** (timeout 5000) in **uno solo** dei due run — i due run giravano **in
  parallelo sullo stesso banco di prova** (partiti a 80 secondi l'uno dall'altro: i miei due push
  ravvicinati). Ipotesi: contesa, non difetto. **NON VERIFICATO** — il push di chiusura fa partire un run
  **solo**: va guardato. Se rosso anche solo, la sonda p7 ha un problema suo.
📌 **Il gruppo `pg` della prova delle colonne (Task 6) ha girato in CI per la prima volta**: non compare
fra i falliti di nessuno dei due run.

### ⑤ 🟡 ERRORI MIEI DELLA SESSIONE, tutti già corretti ma da sapere
1. **Ho ricopiato in MEMORY.md un'affermazione del revisore senza verificarla** («la decisione va presa
   prima del Task 7»): falsa — il perimetro del 7 era **già deciso** da D342, piano riga 416. Corretta
   riscrivendo la riga al suo posto (`02b29520`).
2. **La terza risposta di Francesco («va bene così» sui tocchi) è rimasta 90 minuti senza numero** —
   violazione di §0A-bis, presa dal censimento di chiusura. Ora è ⚖️ **D353** (centocinquantaduesima
   tornata), col ritardo dichiarato nel verbale.
3. **Nel mandato del Task 6 ho chiesto un cancello dentro un componente client**: impossibile
   (`server-only`), e l'esecutore l'ha provato con la build. 🔑 `tsc` non lo vede: **solo `next build`**.
4. **Il primo giro di prove del Task 6 sorvegliava che il cancello esistesse, non che guardasse dal verso
   giusto**: invertendolo, 22 prove su 22 restavano verdi. Trovato dal revisore, chiuso in tre giri.

### ⑥ 🛑 LO STRUMENTO SDD RISCRIVE `.superpowers/sdd/.gitignore` A OGNI `review-package` — COLPEVOLE MISURATO
`provato:` **tre volte in una sessione**: file intatto prima del comando, `*` subito dopo. Lo strumento
rimette fuori da git la mappa di recupero e tutti i resoconti. Il file si difende da solo (D313 gli ha
scritto dentro l'avvertimento) e la modifica **si vede in `git status`**. ➡️ **Dopo OGNI `review-package`
(e `task-brief`): `git status` su quel file, e `git checkout --` se serve.**

### ⑦ 🟡 INVARIATI dalle sessioni precedenti
Il moncone `classe_iia` (riga **35**, panel obbligatorio) · le due riserve normative (handoff 09/08 §0⑧ —
la ① è stata **confermata fondata** dal panel di stanotte: il fondamento è Art. 5(1)(d)+5(2), non Art. 19)
· le righe **34 · 36 · 37 · 38 · 41 · 42 · 44 · 45 · 46 · 47 · 48 · 49 · 50 · 51** · `CRON_SECRET` ·
`contiene_sostanze_o_tessuti` cablato a `false`.

---

## 1. Che cosa è successo

| Cosa | Esito |
|---|---|
| ✅ **Task 6** (il montaggio) | approvato dopo **3 giri di correzione**: `queries.ts` + `ruoli.ts` + la scheda + la pagina · il cancello D342 ora si prova **per inversione** (10 rosse su 22) · le colonne legate allo schema vivo, **in CI** |
| ✅ **Task 7** (la striscia) | approvato **al primo giro**: due cancelli provati separatamente · la falla vera stava nell'**anteprima admin** (`'titolare'` cablato), chiusa per costruzione |
| ⚖️ **D352** | l'archivio del dentista: `titolare` · `tecnico` · `front_desk` («*tutti gli elementi di un laboratorio*») |
| ⚖️ **D353** | la disparità dei tocchi resta, **D334 non si tocca** («*va bene così*») |
| 🔬 **Panel a tre, unanime** | «due rettifiche → un atto che chiude tutto, unione delle voci» — **aspetta ratifica (D354)** |
| ✅ **Fix notturno CI** | la prova che arrossiva da sola ogni notte: due orologi, due giorni (`97536cdd`) |
| 🔬 **Misure** | `5902|119` → **`5980|128`** su 469 file · `VERIFY_EXIT=0` · zero migration |

## 2. 🔑 Le lezioni — valgono per il codice futuro

1. 🛑 **UNA PROVA CHE SORVEGLIA L'ESISTENZA DI UN CANCELLO NON SORVEGLIA IL SUO VERSO.** L'inversione lasciava
   verdi 22 prove su 22 — a vedere il promemoria sarebbero rimasti **solo gli esclusi**. ➡️ La spia giusta
   guarda **se il banco è stato interrogato**, non il valore di ritorno: per «escluso» e per «non c'è
   niente» il ritorno è **identico**.
2. 🛑 **`tsc` NON VEDE `server-only`: solo `next build`.** Terzo caso in cui i tre comandi della FASE 7 non
   si sostituiscono a vicenda. Un import di rotta dentro una pagina compila e poi brucia in build.
3. 🛑 **UN'AFFERMAZIONE DI UN REVISORE SI VERIFICA PRIMA DI RICOPIARLA IN UN DOCUMENTO VIVO.** «Va deciso
   prima del Task 7» era falso, e stava per diventare il punto di ripresa della memoria.
4. 🛑 **OGNI «OGGI» IN UNA PROVA DEVE USARE L'OROLOGIO DEL CODICE CHE PROVA.** La RPC scrive il giorno di
   Roma di proposito; la prova confrontava con l'UTC di sessione → rossa da sola, ogni notte, due ore.
5. 🔑 **LA TRAPPOLA VERA PUÒ STARE IN UN CHIAMANTE CABLATO.** Il ripiego `?? tecnico` era irraggiungibile;
   il pericolo era l'anteprima admin che si finge `'titolare'`. **Si censiscono i chiamanti, non le chiavi.**
6. 🔑 **UN NUMERO NON SI RISERVA A UNA RATIFICA FUTURA.** Un «riservato: D353» con D354 già assegnata
   sarebbe un buco se la ratifica non arrivasse — il numero si dà **alla** decisione, non alla speranza.
7. 🛑 **DOPO OGNI `review-package`: `git status` su `.superpowers/sdd/.gitignore`.** Tre volte su tre.

## 3. Che cosa resta aperto, in ordine

1. 🔴 **La ratifica di D354** (§0①) — sblocca il Task 8 e il compito nuovo sulla rotta.
2. 🔴 **Il Task 9** — pronto: D352 ratificata, `archivioCliente` esiste, `clienti/[id]/page.tsx` **mai
   letto** (il primo passo del task è aprirlo). L'archivio è un **archivio, non un allarme** (D337).
3. 🔴 **Il Task 10** — il giro sul banco vero + FASE 9 dei Task 6·7·8·9 + **gate L2** + M-T6-1.
4. 🟠 **Il run CI post-chiusura** (§0④): se p7 è rossa anche in un run solitario, ha un problema suo.
5. 🟠 **I rilievi minori a ledger**: M-T6-1/4/5/6 · M-T7-1…6 (`.superpowers/sdd/progress.md`) — li
   triaged la revisione finale di ramo.
6. 🟠 **Le righe 52-55 della coda** (52 e 53 di ieri; **54** anteprima admin · **55** trigger di audit).
7. 🟡 **Il contro-argomento sull'ordine della striscia** (ledger, Task 7): il promemoria non ha una pila
   sotto — se non nomina lui, tace. Da pesare al gate.

## 4. Da dove ripartire

1. **Questo handoff, §0** — poi la ratifica di D354 (referto: `2026-08-10-panel-due-avvisi-referto.md`).
2. Il **piano**: `docs/superpowers/plans/2026-08-09-avviso-al-dentista.md` — Task 9 (senza D354) o Task 8
   (con D354 ratificata). ⚠️ Lo snippet del Task 7 nel piano portava **due errori** (`.numero` → è
   `numero_lavoro`; `.id` dell'avviso usato come id del lavoro): se altri task hanno copiato snippet,
   **si verifica il campo sul tipo prima di usarlo**.
3. Il **ledger**: `.superpowers/sdd/progress.md` (sezione «L'AVVISO AL DENTISTA»).
4. Le **revisioni**: `.superpowers/sdd/avviso-dentista-task-{6,7}-{report,brief}.md`.
5. Il **verbale**, tornate 151-152 (D352 · D353, e la nota sul numero del panel).

## 5. Il minimo per non sbagliare

- 🛑 **`date` in comando SEPARATO** · migration con l'orologio UNIVERSALE `date -u "+%Y%m%d%H%M%S"` (D311).
  **Pavimento: `20260809133546`.**
- 🛑 **`verify:full` da variabile e SENZA pipe**, timeout **600000 ms** · **non carica `.env.local`** (128
  saltate in locale = prove d'integrazione; in CI girano — ⚠️ ma la CI **non ha** `SUPABASE_SERVICE_ROLE_KEY`,
  solo `SUPABASE_DB_URL`: una prova che vuole il client di servizio si salta **anche là**, e lo deve dire).
- ✅ **Il push di un ramo si esegue e funziona** (`ua-app/.claude/settings.json`, versionato) — **agli
  esecutori viene rifiutato**: lo lancia l'orchestratore.
- ⚖️ **D318**: `git status` PRIMA · `git add <percorsi>`, MAI `-A` · messaggi lunghi con `-F <file>`.
- 🛑 **Worktree VIETATI** · i ruoli sono **CINQUE** (il CHECK vivo, non `schema.sql`) · l'elenco per
  l'avviso vive in **`src/lib/avvisi/ruoli.ts`** (la rotta ri-esporta per compatibilità).
- 🛑 **Il file di migration NON è la prova: la verità è il catalogo vivo**
  (`node scripts/psql.mjs -c "SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='…';"`).
- 🛑 **Dopo ogni `review-package`: `git status` su `.superpowers/sdd/.gitignore`** (§0⑥).
- ⚖️ **D103**: l'accesso al banco → `npx tsx scripts/link-accesso.ts` · ⚖️ **D284**: le migration si
  applicano da soli (`npx supabase db push --linked --yes`), poi **FASE 6b**.
