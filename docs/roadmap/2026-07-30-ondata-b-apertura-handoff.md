# Handoff — la consegna zero è in produzione, il cancello dell'ondata (b) è APERTO

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi
**il piano `docs/roadmap/2026-07-29-ondata-b-piano-v2.md`, e la sua §0 per prima**. Il resto solo se serve.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **R-P1/R-P2/R-P6** · **R-E1/R-E2** ·
**«il numero si dà subito»** (§0A-bis) · **BP-1**.

> 🛑 **Sostituisce `docs/roadmap/2026-07-30-ondata-b-consegna-zero-handoff.md`**, il cui §1 («la prima
> cosa da fare è la consegna zero») è **assolto**. Quello resta come storia.

---

## 0. In una riga

**La consegna zero è in produzione** (merge `ed286b0f`, 42 commit, CI+CD verdi, `uachelab.com` verificato):
il **GATE del piano v2 §0 è superato** e **T1 può aprire il ramo dell'ondata (b)**. Database toccato
**solo in lettura**, baseline riverificata: **294 · 0 · 916 · 48**.

---

## 1. Cosa c'è ora in produzione, e cosa NON c'è

| | cosa fa davvero | ⚠️ il limite, che va detto |
|---|---|---|
| **Z3** `deb923a1` | il generatore del prossimo codice guarda **la stessa popolazione che l'indice arbitrerà**: `.ilike`, regex `/i`, `trim()`, e **niente `deleted_at`** sulla sola query dei pazienti | **È PREVENTIVA, non ripara nulla di rotto oggi:** sondato, `pz_non_maiuscolo 0`, `con_spazi 0`, `cancellati 0` |
| **Z2** `beb36862` | le due rotte normalizzano in scrittura: `trim()`, e **casella svuotata → `null`**. 🛑 **La maiuscola NON si tocca** (identificativo di legge, Art. 10(5) + All. XIII p.4) | **Chiude due porte su QUATTRO:** `scripts/seed-arturo-pepe.ts:334` e `supabase/seed.sql:73` scrivono col service client, saltando le rotte |
| **Z1** `e211cd94` + `21bab021` + `bf009e2d` | `23505` → **409 di dominio** (`motivo: 'codice_gia_in_uso'`), `crea-lavoro.ts` distingue «occupato» da «guasto», il wizard smette di dire «Riprova» — che era **un anello chiuso** (`pz` non si ricalcola mai) | 🔑 **NASCE INERTE, e si scrive così:** nessun indice unico sul codice esiste ancora (è **T5**), quindi il ramo 409 **non può accendersi**. **MAI** «verificato in produzione» |

**G9 rispettato leggendo SOLO `error.code`, mai `error.message`**, e il `23505` si attribuisce **dal lato
nostro** (era il codice in gioco in quella richiesta?), non interrogando il database.

---

## 2. 🛑 Cosa resta a §9 del piano v2 — l'elenco vero, aggiornato

| # | voce | stato al 30/07 |
|---|---|---|
| **P2** | zero duplicati, la migration non aborta | 🔴 **DA RIESEGUIRE IMMEDIATAMENTE PRIMA DI T5** — decade col tempo, e il giorno prima non basta |
| **P3** | la proiezione stretta non rompe il chiamante | ✅ **CHIUSA 30/07** — v. §2-bis |
| **P6-forma** | si esprime in PostgREST o serve una RPC? | ✅ **CHIUSA 30/07: PostgREST, niente RPC** — v. §2-bis |
| 🆕 **B2 vs T6** 🔴 | **due documenti ratificati si contraddicono** | 🔴 **NUOVO BLOCCANTE, uscito dalle sonde** — v. §2-ter |
| **decisione** 🔴 | **quando nasce la cassetta creata dal wizard** (bloccante B-2 + I-6) | 🔴 **APERTA — è di Francesco.** Consigliata **(a)**: il wizard porta *l'intenzione*, l'effetto avviene alla creazione del lavoro. Altrimenti chi abbandona dopo il passo 7 lascia **una cassetta vuota sulla parete**, dopo aver letto «nel gestionale non resta niente» |
| **decisione** 🔴 | **la stringa della briciola** | 🔴 **APERTA — è di Francesco.** `labelTipo()` produce «Anti- russamento» e ~15 etichette su 38 non ci stanno intere; **troncare è vietato** (D22) |
| **gate** | mockup di **denti** e **colore**, da riverificare in larghezza (D14) | 🟡 aperti, bloccano T19/T20 |
| **da chiarire** | la guardia **B7** («zero occorrenze») copre anche commenti e `docs/`? | 🟡 se sì i file passano da **17 a 21**+ — prima di T13 |
| **libero** | il tetto delle foto (D27) | 🟢 da misurare su un device vero dentro T17. **Non blocca** |

---

## 2-bis. ✅ P3 e P6-forma: le risposte, già pronte per T6

**Prove complete in `docs/roadmap/2026-07-29-ondata-b-piano-v2.md` §5.** In sintesi, per non riaprirle:

- **P3 — la proiezione stretta minima è `id, codice_paziente, cognome, nome`** (+ l'innesto di P6).
  Un solo chiamante di produzione, e **dichiara da sé cosa gli serve**:
  `type PazienteRiga = { id, codice_paziente }` (`crea-lavoro.ts:159`). **Dei 12 campi di oggi, 10 non
  hanno lettori.** Le 8 colonne tolte portano ognuna la sua destinazione (tre restano **filtri**, cinque
  non hanno alcun lettore). ✅ `cognomeEffettivo` ha entrambi gli ingredienti dentro la proiezione stretta.
- **P6-forma — SI ESPRIME IN PostgREST, niente RPC.** La forma è l'**innesto con `order` + `limit` per
  padre**, non l'aggregato:
  ```
  select=id,codice_paziente,cognome,nome,lavori(data_ingresso)
  &lavori.order=data_ingresso.desc&lavori.limit=1&lavori.deleted_at=is.null
  ```
  🔑 **Grafia per supabase-js 2.105.4: `referencedTable`** (non `foreignTable`, deprecata).
  🔑 **La colonna è `data_ingresso`**, mai `updated_at` (ogni correzione la alza: un lavoro vecchio
  corretto ieri risulterebbe il più recente). La spec `:221-222` lasciava aperte le due: **chiusa**.
  🛑 **L'innesto va lasciato SEMPLICE:** `!inner` restituisce `[]` — cancellerebbe i pazienti senza lavori.

> 🔑 **La lezione di P6, e vale per ogni sonda futura: la domanda del piano era posta sull'oggetto
> sbagliato, al punto da portare alla conclusione OPPOSTA.** Chiedeva se fosse esprimibile
> **l'aggregato**: non lo è (`PGRST123`, ed è un'impostazione del progetto, non un limite di versione).
> Chi avesse sondato solo quello avrebbe scritto «serve una RPC» — e sarebbe stato **falso**.
> ➡️ **Prima di sondare, controllare che l'oggetto della domanda sia la cosa che serve davvero.**
>
> 🔑 **E il precedente esisteva:** il piano diceva «in `src/` non c'è nessun precedente» — vero, ma nel
> **database** c'è la vista **`partitario_clienti`**, che fa esattamente quella forma
> (`max(f.data)` + `LEFT JOIN … deleted_at IS NULL` + `GROUP BY`). **È il motivo per cui R-P2 prescrive
> il catalogo vivo e non il grep sui file.**

## 2-ter. 🔴 IL BLOCCANTE NUOVO — due documenti ratificati si contraddicono su T6

**Va risolto PRIMA di scrivere T6, non dentro.**

- **T6 punto 2 del piano** vuole `cognomeEffettivo` **dentro la proiezione**.
- **La spec B2** (`2026-07-28-wizard-ondata-b-schermate-design.md:374`) pretende che le chiavi siano
  «**esattamente** `id, codice_paziente, cognome, nome, ultimoLavoro`», **con un test che fallisce se ne
  compare una sesta**.

**Due uscite:** **(a)** la rotta serve il cognome **già effettivo sotto la chiave `cognome`** → cinque
chiavi, **B2 regge intatta** *(è la più economica, ma cambia il significato di `cognome` nel contratto:
va scritto)*; **(b)** B2 si riscrive a sei.

⚠️ **E una metà che nessuno dei due documenti copre:** `cognomeEffettivo` sistema **come si mostra** il
cognome, **non su cosa si filtra**. Un paziente nato dal wizard ha `cognome = 'PZ-0042'`
(`crea-lavoro.ts:268`): con `cognome ilike '%…%'` **combacia** con `q='PZ'` e poi si mostra **vuoto** —
e la prova **B24** chiede il contrario. 🔑 **Terza variante, su 911 righe su 916:**
`nome_cognome = codice_paziente` con `cognome` e `nome` a `NULL` (provato). Una ricerca sul solo
`cognome` raggiunge **5 pazienti su 916**; una che tocchi `nome_cognome` ne restituirebbe **911 il cui
nome visibile È il codice**. ➡️ **T6 deve DICHIARARE su quali colonne filtra.**

---

## 3. 🔑 Le lezioni del 30/07 — valgono più dei tre task

> **Tutti e tre gli esecutori hanno smontato almeno un'affermazione del piano. Le peggiori erano di chi
> orchestrava, non di chi eseguiva.**

1. 🛑 **Un ritrovamento di un esecutore è una SEGNALAZIONE, non una prova.** La riga Z-P7 del piano
   nominava una porta che **non esiste** (`import-lavori-storici-v2.ts` scrive solo in `lavori`) e ne
   **mancava una vera** (`supabase/seed.sql:73`). Nata così: il ritrovamento fuori mandato di Z3 è stato
   **copiato nel piano senza aprire il file**. **R-E2 dice di riferire i ritrovamenti; non dice che chi li
   riceve possa promuoverli a fatto senza guardare.**
2. 🛑 **Le coordinate invecchiano dentro la stessa sessione.** Il brief di Z1 diceva
   `[id]/route.ts:138-143`, che **oggi è il ramo 422** — eseguirlo alla lettera avrebbe messo il 409 in un
   posto plausibile e sbagliato. Erano diventate stantie per i **commenti aggiunti da Z2, due ore prima**.
   ➡️ **In un brief, le righe si riverificano al momento di scriverlo, non si copiano dal piano.**
3. 🛑 **Un'asserzione su un fallimento deve NOMINARE il fallimento.** Quattro `rejects.toThrow()` **senza
   argomento** accettavano qualunque errore, compreso un `TypeError` del finto client: **verdi su una
   query mai partita**. Mai un `toThrow()` nudo, mai `expect(status).toBeGreaterThan(399)`.
4. 🛑 **Una prova può essere un non-evento, e lo si scopre solo misurando.** Z-P6 era marcata «il punto
   delicato»: falsa. `risolviNomePaziente` e `cognomeEffettivo` fanno **entrambe `(x ?? '').trim()`**,
   quindi `''` e `null` erano già indistinguibili. **Provato riportando le rotte a `HEAD~1`** e vedendo
   l'asserzione passare *prima* della modifica.
5. ✅ **La FASE 9 ha ripagato tutta la sua fatica** (**D37**): il testo ratificato occupava **tre righe**
   dove `Avviso.tsx:194` ne mostra **due** — spariva **l'istruzione**, a **tutte e tre** le larghezze
   (il contenitore satura a 480px). ⚠️ E la variante intermedia **sarebbe passata in prova e si sarebbe
   rotta sui dati veri**: reggeva con `PZ-0918`, cedeva con `PAZ/2026/0918`, il formato degli 911 pazienti.

---

## 4. Fatti già verificati — NON riscoprirli, e soprattutto non «ritrovarli»

| fatto | prova |
|---|---|
| ✅ **Su `pazienti` non esiste oggi NESSUN indice unico sul codice** — quattro indici, l'unico UNIQUE è la chiave primaria su `id` | `pg_indexes` + `pg_constraint`, 30/07 |
| ✅ **Nessun codice storico è sporco:** 0 con spazi · 0 minuscoli · 0 stringhe vuote. I 911 «fuori formato» sono `PAZ/2026/nnnn`, che il generatore ignora **correttamente** | conteggio su `pazienti`, 30/07 |
| ✅ **I writer di `codice_paziente` sono QUATTRO:** le due rotte (chiuse), `scripts/seed-arturo-pepe.ts:334`, `supabase/seed.sql:73` | censimento verificato due volte |
| ✅ **`error.message` di Postgres NON contiene i valori in conflitto** — quelli stanno in `details`, e **nessuna rotta rimanda `details`**. Escono **nomi** di vincoli, tabelle, colonne | provato su tabella temporanea |
| ✅ **Gli 11 vincoli unici globali** (non per-laboratorio) sono tutti su oggetti interni — segnalibri d'invito, identificativi Stripe, credenziali: **nessuno su un dato che un laboratorio digita** | `pg_constraint`, 30/07 |
| ✅ **`PazienteEditSheet` NON andava modificato:** rimbalza già `corpo.error` (`:55-69`), quindi il testo ratificato arriva a schermo con la sola modifica alla rotta | letto da Z1 |
| ✅ **L'elenco «9 route gestiscono già `23505`» è INCOMPLETO** (non falso): manca `api/cicli/[id]/route.ts:83`, decimo caso | letto da Z1 |
| 🐛 **Difetto vivo, riferito e non corretto:** «Salta» sulla riga «Nome o alias» non azzera il campo che ascolta la dettatura → il testo dettato diventa **il cognome del paziente in banca dati**. **Muore con D13**, ma finché non muore c'è | `PassoPaziente.tsx:147,149-152` |

---

## 5. 🔴 Otto voci aperte, tutte FUORI perimetro — in fondo alla ROADMAP

La grossa: **76 punti delle rotte API rimandano `error.message` del database al client**, contro G9.
⚠️ **Misurato bene, per non allarmare a vuoto:** escono **nomi** di tabelle, vincoli e colonne — la
*planimetria* —, **non i dati di altri laboratori**. E le pagine chiedono l'autenticazione, quindi il
pubblico è **chi ha già un accesso**. Resta da sistemare, **e la cura ha due metà: la bonifica E la
guardia.** 🔑 **Prima la guardia, poi la pulizia**, così l'elenco lo dà lei e non un `grep` a mano.
🛑 **Il precedente che spiega perché insistere:** `scripts/guardia-navigazione-overlay.mjs` era dichiarato
come rete di protezione e **per settimane non era agganciato a nulla** (scoperto il 28/07). Una regola che
nessuno controlla, dopo qualche mese, **è un desiderio**.

Le altre sette (avviso tagliato a 2 righe · `router.push` come «indietro» **con un test che asserisce il
comportamento sbagliato** · `req.json()` senza `try/catch` sul PATCH · tre `toThrow()` larghi ·
normalizzazione duplicata in tre file · query pazienti senza `limit`/`order` · `<label>` non agganciata)
stanno in fondo a `docs/roadmap/ROADMAP-UFFICIALE.md`, con peso e prova.

---

## 6. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su tutte le route): `git checkout -b`.
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit → `/usr/bin/trash .next`.
⚠️ I **backtick nel messaggio di commit vengono eseguiti dalla shell** → messaggi lunghi con `-F` da file.
⚠️ `.gitignore` ignora `*.png` → `git add -f`.
🔑 **Mockup nel browser:** `file://` è bloccato per Playwright → `python3 -m http.server 8899` dentro
`docs/design/mockups/`, poi `127.0.0.1`.
🔑 **`fileURLToPath`, mai `new URL(...).pathname`**: il percorso del disco contiene uno spazio.
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — 🛑 **non è nel repo**, vive solo su questo disco.
🔑 **Le sonde girano su tabella temporanea o transazione annullata**, MAI su una migration registrata.
🛑 **Lasciare il database alla baseline** e riverificarla: **294 · 0 · 916 · 48**.
🆕 **La tabella dei colori si chiama `colori_dentali`**, non `colori_catalogo`.
🆕 **`scripts/guardia-navigazione-overlay.mjs` È MANUALE** — chi tocca gli overlay v3 la lancia a mano (T23).
🆕 **`ANALISI/` vive FUORI dal repo git.**

## 6-bis. La guardia di coerenza — corretta il 30/07

`scripts/guardia-coerenza-documenti.mjs` (pre-commit, ~0,03 s). 🔧 **Corretto un difetto vero:** la
dichiarazione `ARCHIVI_SOLO_TESTA` **si annullava da sola al primo collegamento** — un documento vivo che
nominava `memory/MEMORY.md` tirava dentro l'archivio **intero** e faceva bocciare quattro voci storiche
che *raccontano* una rimozione. Ora gli archivi non entrano mai nella catena.
✅ **Provata rompendola apposta, due prove, entrambe si accendono.**
**Se ti blocca: non aggirarla.** Nei casi visti finora aveva ragione lei.
🛑 **Controlla la COERENZA, non la VERITÀ.**

---

## 7. Lo stato del repo

- **`main` allineato con `origin/main`**, albero pulito, tutto pubblicato.
- **Il ramo `consegna-zero-pazienti` è stato assorbito** in `main` con fast-forward: si può cancellare.
- **Nessun ramo aperto:** il ramo dell'ondata (b) lo crea **T1**, nel repo principale.
- **37 decisioni in otto tornate** nel verbale (`D35` · `D36` · **`D37`**, che corregge D36).
