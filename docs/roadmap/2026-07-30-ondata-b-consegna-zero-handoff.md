# Handoff — l'ondata (b) ha un piano validato: si parte dalla CONSEGNA ZERO

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi
**il piano `docs/roadmap/2026-07-29-ondata-b-piano-v2.md`, e la sua §0 per prima**. Il resto solo se serve.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **REGOLE DI PIANO R-P1/R-P2/R-P6** ·
**REGOLE DI ESECUZIONE R-E1/R-E2** · **«il numero si dà subito»** (§0A-bis) · **BP-1**.

> 🛑 **Sostituisce `docs/roadmap/2026-07-29-ondata-b-esecuzione-handoff.md`**, il cui §1 («fai fare il
> panel») è **assolto** e il cui §3 («cosa manca al piano») è **superato**. Quello resta come storia.

---

## 0. In una riga

**Il panel c'è stato: 29 rilievi, 6 bloccanti, 15 affermazioni del piano verificate false — e il piano è
stato riscritto.** Il piano v2 è validato e **si può eseguire**, ma **non si comincia dal ramo**: si comincia
da una **consegna che va in produzione da sola**. Zero righe di codice applicativo scritte finora; database
toccato **solo in lettura**, baseline riverificata a fine sessione: **294 lavori · 0 denti · 916 pazienti ·
48 colori**.

---

## 1. 🛑 LA PRIMA COSA DA FARE — la CONSEGNA ZERO (piano v2 §0)

**Non è il primo task dell'ondata: è una consegna separata, col suo `tsc`/`vitest`/`build`, la sua revisione
e il suo merge su `main`. Va in produzione PRIMA che il ramo dell'ondata esista.**

**Perché — e questo è il bloccante che riordina tutto (B-5):** 🔍 **non esiste uno staging.** Verificato a
mano, non dedotto: `deploy.yml` fa `npm ci` + deploy Vercel + controllo di salute e **nessuno step di
migration**; `ci.yml` ha come unica riga Supabase un **URL segnaposto**; `package.json` non ha comandi di
migration; **non esiste `supabase/config.toml`**, quindi nessun `supabase link`. **Le migration si applicano
a mano sull'unico progetto** (`iagibumwjstnveqpjbwq`). ➡️ **Dal minuto in cui l'indice unico esiste, vale
per la produzione** — che deve già saperlo gestire.

| # | cosa | file |
|---|---|---|
| **Z1** | **`23505` → `409` di dominio**, e il wizard offre l'azione che può funzionare (riusare il paziente, o rigenerare il codice) | `api/pazienti/route.ts:155-160` · `api/pazienti/[id]/route.ts:138-143` · `crea-lavoro.ts:233` · `WizardNuovoLavoro.tsx:382-384` |
| **Z2** | **`btrim` sul codice in scrittura** e **`'' → NULL`** (`VUOTO_VALE_NULL` contiene oggi **solo** `data_nascita` e `sesso`) | `api/pazienti/route.ts:110,139` · `api/pazienti/[id]/route.ts:43,51-58` |
| **Z3** | **`.like` → `.ilike`**, **`/^PZ-(\d+)$/` → `/i`**, e **via `.is('deleted_at', null)`** senza sostituirlo con `archiviato` | `dati-wizard.ts:47,128` · ⚠️ **leggere prima `tests/unit/dati-wizard.test.ts`** |

**Il modello è in casa, in 9 route** che gestiscono già `23505`: `api/ordini:124` · `api/cicli:118` ·
`api/magazzino:127` · `api/admin/labs:93` · `api/qualita/psur:203` · `api/stripe/webhook:48` ·
`api/fatture/batch:246` · `api/lavori/[id]/prove:97` · `api/auth/webauthn/register/verify:59`.
🔑 **`api/pazienti` è l'unica che scrive un codice unico e non ce l'ha.**
🛑 **G9 resta:** nessun nome di vincolo o di indice deve raggiungere il client.

---

## 2. Dove sta ogni cosa

| documento | cosa contiene |
|---|---|
| **`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`** | **IL PIANO.** Consegna zero + 23 task, registri R-P1/R-P2/R-P6 rifatti, e **§9 «cosa manca»** |
| **`docs/roadmap/2026-07-29-ondata-b-panel-validazione.md`** | **il verbale del panel** — i 29 rilievi, le 15 affermazioni false, le **quattro risposte normative** con le fonti. È il **perché** del piano |
| `docs/superpowers/specs/2026-07-28-wizard-ondata-b-schermate-design.md` | la **spec ratificata** (§15 **aggiornata** il 29/07) |
| `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` | il **verbale, D1-D34** in sette tornate |
| `docs/design/mockups/2026-07-28-wizard-*.html` | testata (**§5**), foto/cassetta (**§3**), avviso codice (**§2**), passo paziente. **98 screenshot** tracciati |
| `docs/roadmap/2026-07-29-ondata-b-esecuzione-handoff.md` · `…-28-…-piano-handoff.md` | **storia**, superati da questo |

---

## 3. Cosa manca al piano v2 — l'elenco, per non riscoprirlo

Sta in **§9 del piano v2**. **Nessuno di questi blocca la consegna zero.**

1. **Tre sonde:** **P2** da rieseguire **immediatamente prima di T5** (decade col tempo) · **P3**
   riformulata sulla proiezione sempre-stretta · **P6-forma** (l'aggregato è esprimibile in PostgREST, o
   serve una RPC? **In `src/` non esiste nessun precedente**).
2. 🔴 **Due decisioni di prodotto, che sono di Francesco:**
   - **quando nasce la cassetta creata dal wizard.** Oggi il lavoro nasce **in un punto solo, alla fine**,
     ma D30 dice «ci va dentro subito» e `POST /api/cassette` è una **scrittura vera** → chi abbandona dopo
     averla creata lascia **una cassetta vuota sulla parete**, dopo aver letto «nel gestionale non resta
     niente». **Consigliata (a):** il wizard porta **l'intenzione**, l'effetto avviene alla creazione.
   - **la stringa della briciola.** `labelTipo()` produce **«Anti- russamento»** e ~15 etichette su 38 non
     ci stanno intere; **troncare è vietato** (D22).
3. **Due gate di mockup:** denti e colore, da riverificare **in larghezza** (D14).
4. **Da chiarire prima di T13:** la guardia **B7** («zero occorrenze») copre anche i commenti e i `docs/`?
   Se sì i file passano da **17 a 21**+.
5. **Il tetto delle foto** (D27) resta libero: **da misurare su un device vero**, dentro T17. **Non blocca.**

---

## 4. 🔑 La lezione di questa giornata — vale più dei singoli rilievi

> **Il piano v1 non è stato fermato dai buchi che dichiarava. È stato fermato DOVE SI SENTIVA SICURO.**

Le quattro cose che dava per provate o acquisite erano **tutte e quattro difettose**:
- **la sonda P1** provava il duplicato **byte-identico**, cioè il caso banalmente rifiutato — mentre R-P1
  chiede **un valore che DEVE essere rifiutato**;
- **il censimento dei token** indicava **due regole CSS che non esistono** e l'oggetto sbagliato in
  `motion.ts`, mancando l'orfano vero;
- **la citazione-àncora del §4** (ripetuta in **spec e verbale**) puntava al `catch` sbagliato, e **quel file
  non era né fra i letti né fra i non letti**;
- **il drift `bite_splint`**, portato nei documenti per settimane e promosso a fatto, **non esisteva**.

🔑 **Un buco dichiarato si chiude. Una certezza sbagliata no, perché nessuno la riapre.**
➡️ **Nel brief di ogni esecutore va messo: «cercate soprattutto dove il piano sembra sicuro».** I sei
bloccanti sono usciti tutti da lì.

**E la seconda lezione, dalla riscrittura di D22:** *una stesura sostituita non si aggiorna, si riscrive* —
altrimenti restano in casa le istruzioni del modello appena scartato, **indistinguibili da quelle vive**.

---

## 5. Fatti già verificati — NON riscoprirli, e soprattutto non «ritrovarli»

| fatto | prova |
|---|---|
| ✅ **Il drift `bite_splint` NON ESISTE** — la CHECK a database lo contiene, la migration era già applicata. La nota falsa è stata **rimossa** dal codice | catalogo vivo, `lavori_tipo_dispositivo_check` |
| ✅ **L'indice unico DEVE essere normalizzato** (D34-bis). Senza, `pz-0042` e ` PZ-0042` **passano** — provato; con `lower(btrim(...))` sono **tutti rifiutati** e il controllo positivo fra due laboratori **regge** | sonda P1-bis, output nel verbale §5-bis |
| ✅ **`lower` non è una scelta di gusto:** è la normalizzazione **già presente su quella colonna** | `domain/nome-paziente-scrittura.ts:86-89` |
| ✅ **La chiave di `localStorage` NON si rinomina** — i test la leggono dalla costante, quindi rinominarla renderebbe **verdi a vuoto** tutte le verifiche di pulizia | `persistenza.ts:26` |
| ✅ **Il cognome dei pazienti del wizard È il codice** — la ricerca per cognome **non li troverebbe mai** senza `cognomeEffettivo` server-side | `nome-paziente-scrittura.ts:68` |
| ✅ **`lavori_immagini.url` è morto** (bucket privato, `getPublicUrl` persistito): la maniglia vera è **`storage_path`**, e le foto si vedono solo perché una pagina le **rifirma** al render | contratto scritto in `FotoStrip.tsx:4-7` |
| ✅ **Il soft-delete delle immagini sarebbe un colpo a vuoto:** **otto** letture innestano `lavori_immagini(*)` senza escludere le righe cancellate | elenco completo nel piano v2, T8 |
| ✅ **`schema.sql` è uno snapshot fermo:** mancano `nome`, `cognome`, `archiviato` su `pazienti` | vengono da `002_fase2_schema.sql:112-118` |
| ✅ **`pazienti` ha DUE colonne di sparizione che non concordano:** `archiviato` (3 letture, l'unica scritta) e `deleted_at` (1 lettura, **vestigiale**) — e i **tre indici esistenti** filtrano `deleted_at` | censimento nel verbale §5-quater |
| ✅ **`CONCURRENTLY` non serve** — zero occorrenze in tutto `supabase/`, e a 916 righe la finestra di blocco è trascurabile | verificato, non assunto |
| ✅ **66 test nei quattro file:** 11 si rompono di sicuro, 23 a rischio, 32 indipendenti, **35 con dati di prova che non compilano più** ⚠️ Vitest transpila **senza** controllo dei tipi: quei 35 **girano lo stesso** | conteggio nel verbale §8 |
| ✅ **La base normativa della conservazione è Art. 10(5) + All. XIII p.4**, non l'Art. 10(8) (i cui oggetti sono riservati ai dispositivi «diversi dai su misura») | MDR consolidato 01/01/2026 |
| ✅ **Il confine «fino alla consegna» ha una base di legge**: Art. 52(8) + Art. 2(28) — **l'immissione sul mercato È la consegna** | nessuna contraddizione con la direttiva del 27/07 |
| 🐛 **Difetto vivo, riferito e non corretto:** «Salta» sulla riga «Nome o alias» non azzera il campo che ascolta la dettatura → il testo dettato finisce in una riga **chiusa e invisibile** e diventa **il cognome del paziente in banca dati**. **Muore con D13**, ma finché non muore c'è | `PassoPaziente.tsx:147,149-152` |

---

## 6. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su tutte le route): si fa `git checkout -b`.
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit → `/usr/bin/trash .next`.
⚠️ I **backtick nel messaggio di commit vengono eseguiti dalla shell** → messaggi lunghi con `-F` da file.
⚠️ `.gitignore` ignora `*.png` → `git add -f`. **Pagato di nuovo il 29/07:** sei screenshot erano su disco e
non salvati.
⚠️ La cancellazione ricorsiva è bloccata fuori dalle cartelle temporanee, **e il blocco legge l'intero
comando** (scatta anche dentro un messaggio di commit).
🔑 **Mockup nel browser:** `file://` è bloccato per Playwright → `python3 -m http.server 8899` dentro
`docs/design/mockups/`, poi `127.0.0.1`.
🔑 **`fileURLToPath`, mai `new URL(...).pathname`**: il percorso del disco contiene uno spazio.
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — 🛑 **non è nel repo**, vive solo su questo disco.
🔑 **Le sonde girano su tabella temporanea o transazione annullata**, MAI su una migration registrata.
🛑 **Lasciare il database alla baseline** e riverificarla: **294 · 0 · 916 · 48**.
🆕 **`scripts/guardia-navigazione-overlay.mjs` È MANUALE** — chi tocca gli overlay v3 la lancia a mano. È
un task esplicito del piano v2 (T23), perché nessun piano l'aveva mai messa.
🆕 **`ANALISI/` vive FUORI dal repo git:** le correzioni normative del 29/07 a `ANALISI/17` stanno **solo su
questo disco**. Il contenuto è comunque nel verbale del panel, che è versionato.

---

## 6-bis. La guardia di coerenza — gira da sola nel pre-commit

`scripts/guardia-coerenza-documenti.mjs` (~0,03 s). Controlla: conteggio di decisioni dichiarato = reale ·
numerazione senza buchi · nessun documento vivo che rimanda a un file inesistente · nessuna «voce» fantasma ·
**punto di ripresa vero**. Con `--staged` **avvisa** se un salvataggio tocca un verbale o una spec **senza
toccare la memoria**.
**Se ti blocca: non aggirarla.** Nei casi visti finora aveva ragione lei.
**Se citi un file che non esiste ancora**, dichiaralo sulla stessa riga: `(nuovo)`, `da creare` o 🆕.
🛑 **Controlla la COERENZA, non la VERITÀ:** cosa è stato deciso e mai scritto non lo sa nessun programma.

---

## 7. Lo stato del repo

- **31 commit su `main` locale non pubblicati** (contati: `git rev-list --count origin/main..main`), di cui
  **11 di questa sessione**. Solo documenti, mockup, screenshot, memoria — **più una correzione di commento**
  in `src/lib/domain/tipi-lavoro.ts` e una in `supabase/schema.sql`.
- **Nessuna riga di logica applicativa toccata.** Albero di lavoro **pulito**.
- **Nessun ramo aperto:** il ramo dell'ondata (b) lo crea **T1**, nel repo principale, **dopo** che la
  consegna zero è in produzione.
- **98 screenshot `ob-` tracciati** (= quelli su disco: i sei mancanti sono stati recuperati).
