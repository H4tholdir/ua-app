# Handoff — ondata (b): T6 è chiuso, tocca a T8

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi il piano
`docs/roadmap/2026-07-29-ondata-b-piano-v2.md`. **Il ledger operativo è `.superpowers/sdd/progress.md`:
i task che risultano completi lì SONO completi — non rieseguirli.**
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **R-P1/R-P2/R-P6** · **R-E1/R-E2** ·
**«il numero si dà subito»** (§0A-bis) · **BP-1**.

> 🛑 **Sostituisce `docs/roadmap/2026-07-29-ondata-b-fondamenta-handoff.md`**, che è rimasto vero sui
> fatti ma **falso su tre righe che contano**: dice «sei task», «si riparte da T6» e «45 decisioni».
> Quello resta come storia. ⚠️ **La guardia dei documenti non poteva vederlo:** controlla conteggi e
> riferimenti, non se un «si riparte da X» è ancora vero — quella è prosa, e la prosa invecchia in
> silenzio. È la stessa classe di stantio corretta **quattro volte** dentro questa sessione.

---

## 0. In una riga

**Ramo `ondata-b-schermate`, SETTE task chiusi e revisionati (T1 · T4 · T2 · T3 · T5 · T7 · T6), e
cinquanta decisioni a verbale (D46-D50 sono di oggi).** FASE 7 sul ramo, eseguita dal coordinatore:
**`tsc` 0 · `next build` 0 · `vitest` 3806 passati / 19 saltati** — ⚠️ ma **verde in 5 esecuzioni
intere su 8** (conteggio finale del 29/07), per un flake **preesistente e non nostro, con vittime che
RUOTANO** (§6). **Nulla è pubblicato su `origin`.**
Baseline database **294 · 0 · 916 · 48**, toccata solo in lettura.
🆕 **E T8 è già istruito:** la **lettura R-P2 degli otto siti è FATTA** e sta nel piano — **manca solo il
brief** (§5).

---

## 1. Che cosa esiste ora, e a che cosa serve

| pezzo | dove | a che cosa serve |
|---|---|---|
| **T4** il contratto dei passi | `src/lib/wizard/passi.ts` | il passo si identifica **per NOME, mai per indice** — una bozza sopravvive più di un rilascio, e riaperta per indice riaprirebbe **sul passo sbagliato coi dati giusti** |
| **T2** i 38 tipi parlanti | `src/lib/domain/tipi-lavoro.ts` | `prevedeDenti` · `prevedeColore: 'catalogo' \| 'libero' \| 'nessuno'` · `prevedeArcata` |
| **T3** la macchina | `src/lib/wizard/sequenza-passi.ts` | `sequenzaPassi(tipo)` e **`cosaSiPerde(precedente, successivo)` a due STATI** (D17) |
| **T5** il divieto | migration `20260729140000` | l'indice unico **in produzione**: `(laboratorio_id, lower(btrim(codice_paziente)))`, **senza filtro di stato** |
| **T7** il riconoscimento | `src/lib/domain/codice-paziente-unicita.ts` | `trovaOccupanteCodice` — **stessa portata dell'indice**: niente `cliente_id`, niente `limit`, niente stato. 🔴 **Non ha ancora nessun chiamante di produzione** (R14): lo prende **T15** |
| 🆕 **T6** la ricerca | `src/app/api/pazienti/route.ts` (solo il `GET`) + `src/lib/utils/escape-postgrest.ts` | `GET /api/pazienti?q=` — **forma unica** `id, codice_paziente, alias, ultimoLavoro` su entrambi i percorsi · filtro a **quattro** colonne · escape a **quattro** metacaratteri + guardia sul vuoto · tetto fuori dal ramo · `cliente_id` obbligatorio con `q` (**400**) |

---

## 2. 🔑 Le tre lezioni di oggi — valgono più dei task

1. 🛑 **Una guardia scritta come LISTA NERA non difende niente.** La prova che proteggeva la proiezione
   elencava sei nomi di colonna da non vedere. `select('*')` **non ne contiene nessuno**: con la deriva
   realistica (`'*, nome_cognome, lavori(data_ingresso)'`) restavano **104 prove su 104 verdi**, mentre la
   rotta chiedeva al database ogni colonna della scheda paziente per 500 righe.
   ➡️ **Una guardia su una proiezione si scrive con un `toBe` sulla stringa esatta.** Un elenco di divieti
   non vede il jolly che li aggira tutti.
2. 🛑 **Una dichiarazione di completezza sbagliata è peggio del difetto che chiude.** Un commento diceva
   «TERZA istanza, il rilievo ne nominava due»: rieseguendo la stessa misura ne è uscita una **quarta**.
   Chi legge «chiusa alla terza» **smette di cercare**. ➡️ **Non si scrive quante ne restano: si scrive il
   METODO, e lo si rilancia.**
3. 🛑 **Un `N su M` senza la forma dell'abbozzo non è riproducibile, quindi non è una prova.** «27 su 34»
   contro «29 su 35» del revisore: **tutta la differenza stava nell'abbozzo**, che nessuno aveva scritto.
   ➡️ L'abbozzo va **incollato**, col comando. Ora sta in testa a
   `tests/unit/api-pazienti-get-ricerca.test.ts` (misura mia a file completo: **34 rosse su 40**, con le
   sei verdi elencate **accanto alla loro gemella positiva** — che è ciò che le distingue da prove vuote).

---

## 3. Le cinque decisioni nuove (D46-D50) — in una riga ciascuna

- **D46** la risposta di `GET /api/pazienti` ha **una forma sola** su entrambi i percorsi; `cliente_id`
  obbligatorio con `q`, ramo su **`q !== null`** (mai `if (q)`), **400** non 422.
- **D47** **emenda D44**: `nome_cognome` **rientra** nel filtro → **quattro** colonne.
- **D48** l'escape ha **quattro** metacaratteri (`*` si **rimuove**), una **guardia sul vuoto** dopo, e
  `pgrestQuote` **per ultimo**.
- **D49** `?q=` vuoto **con** lo studio → `200 { pazienti: [] }`, non l'elenco.
- **D50** oltre 64 caratteri → `200 { pazienti: [] }`: il tetto resta, **non tronca**.

---

## 4. 🔴 Che cosa NON è coperto — e chi lo eredita

| cosa | chi |
|---|---|
| **Il contratto FAIL-OPEN di `trovaOccupanteCodice`**: su errore risponde «libero». **Mai trattarlo come «sicuro scrivere»** — la rete vera è l'indice. E **oggi non ha chiamanti** (R14) | **T15** |
| **Il «primo codice libero»** da proporre quando quello proposto è occupato (D36 lo dà per necessario) | **T15** / generatore |
| **Il ritardo di 250 ms** sulla battitura (D46 punto 7): misurato **qui**, ma si applica **là** | **T15** |
| ✅ **L'innesto «ultimo lavoro» in due copie: RISOLTO e DICHIARATO.** Sono due **apposta** (portate diverse) e oggi decidono **identico in tutti e cinque i punti**; i due file **ora si nominano a vicenda** e dicono che chi tocca uno tocca l'altro | — |
| **La leva «si può saltare»** di `riparazione`/`ribasatura` (W17): **sede** su `tipi-lavoro.ts`, **consumo** in T21 — 🔴 **decisione di Francesco, non presa** | Francesco |
| **Un tipo scelto come TESTO LIBERO** cadrebbe nel ramo «id ignoto» → sequenza minima, **mai denti né colore**: difendibile ma **silenzioso** | **T21** |
| 🆕 **La terza forma di «nessun nome»: `nome = ''`** (R18) — 3 righe su 5, ed è il **codice** (`crea-lavoro.ts:270` scrive `nome: ''` fisso), non i dati | **T16** e **T15** |
| **`btrim` non toglie tabulazioni né spazi unicode**, `trim()` di JS sì | primo importatore |

**Minori a verbale, per la review finale del ramo:** `SEQUENZA_CANONICA` non congelata a runtime · il
conteggio `23/47` di R-P4 in T4 è a mano · la tabella §2.3 di T3 è 2 righe + una regola inline · l'ordine
di ritorno di `cosaSiPerde` è per causa · `NomeDatoPerso`/`NomePasso` divergono su singolare-plurale ·
in T2 i `typeof … === 'boolean'` sono quasi vacui · 🆕 **`ultimoLavoro` (T6) e `dataUltimoLavoro` (T7)
sono lo stesso valore con due nomi** · 🆕 in `escape-postgrest.test.ts` la seconda asserzione dell'ordine
invertito **calcola l'atteso chiamando l'implementazione** (ridondante, non vuota).

---

## 5. Da dove si riparte

➡️ **T8 — codice NON iniziato, ma la LETTURA R-P2 È FATTA.** Il primo passo della prossima sessione è
**scrivere il brief**, non rileggere: tutto ciò che serve è già nel piano (§3 registro letture, §5 **P12**,
§6 **T8** coi sei fatti). **Rileggere gli otto file sarebbe rifare un lavoro già pagato.**

`DELETE /api/lavori/[id]/immagini/[imgId]`: soft su `deleted_at`, **tre** `.eq()` sulla `delete()` stessa
più `.select()` per contare le righe toccate, finestra `stato != 'consegnato'` con **409** e bottone
**disabilitato con la spiegazione visibile**, mai nascosto. 🛑 **Vietato per iscritto:** rendere pubblico il
bucket per far funzionare le anteprime.

**🔑 I sei fatti della lettura, in una riga ciascuno — il dettaglio con le prove è in §6/T8:**
1. **Le otto coordinate sono ESATTE**, verificate sito per sito. Per una volta il piano non porta stantio.
2. 🔴 **Solo DUE degli otto raggiungono un utente** (scheda `:30` e modifica `:51`); i 3-8 sono **payload
   morto**, con le ricerche incollate. ➡️ **Il filtro va messo anche lì — è igiene — ma le PROVE si
   spendono sui due.** Trattarli di pari gravità è il modo di sbagliare i due che contano.
3. ✅ **Nessuna migration**: `deleted_at`, la RLS che lo filtra e l'indice parziale **esistono già** — 🛑 ma
   gli otto usano `getServiceClient()` e **scavalcano la RLS**. È l'intera ragione d'essere di T8.
4. **Il file `[imgId]/route.ts` ESISTE GIÀ** (82 righe, solo `PATCH`): T8 **aggiunge un handler**.
5. La «mutazione fratella» è **due query con conteggi diversi** (guardia **3** `.eq()`, `update()` **2**).
6. 🔴 **Due buchi che T8 apre:** la guardia del `PATCH` **non filtra `deleted_at`**, e `:77` rimanda
   l'errore **grezzo** al client (G9).

⚠️ **B19 chiede una asserzione per sito su tutti e otto** — ma **pesata** secondo il punto 2.
⚠️ **Il brief va scritto con lo stesso trattamento di quello di T6**, e col divieto esplicito di copiare i
due difetti del punto 6.

🛑 **Una cosa da NON «correggere»:** la grafia del filtro sugli innesti dettata dal piano
(`.is('lavori_immagini.deleted_at', null)`) **è giusta** — un rilievo la dava per sbagliata a favore
dell'alias, ragionando da un precedente sulla riga adiacente. **Provata: entrambe funzionano, entrambe
mordono** (piano §5, **P12**). Il rilievo è scritto lì apposta, perché il ragionamento è convincente e
qualcuno lo rifarà.

Poi **Blocco 4** (T9 · T10), **Blocco 5** (T11 · T12 · T13), **Blocco 6** (T14-T21), **Blocco 7** (T22 ·
T23 col **gate estetico L2**).

🚧 **Restano dietro gate, e non li sblocca il codice:** i **mockup di denti e colore** (T19/T20, da
riverificare in larghezza, D14) · la **portata della guardia B7** (T13: «zero occorrenze» copre anche
commenti e `docs/`? se sì i file passano da **17 a 21**).

🔴 **E una cosa aspetta Francesco, fuori dall'ondata:** **TOK-1** — `GET /api/clienti` manda al browser il
`portale_token` di ogni dentista, che **da solo, senza PIN**, apre dichiarazione di conformità e buono di
lavorazione (roadmap, sezione del panel D46-D48).

---

## 6. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su tutte le route): `git checkout -b`.
🛑 **Mai `git add -A`** finché un esecutore è vivo: `git commit -F <messaggio> -- <percorsi>`.
⚠️ **`vitest` non è deterministico su questo repo, e va detto invece che nascosto.** Oggi la suite intera
è verde in **5 esecuzioni intere su 8** (conteggio finale del 29/07; le ultime **tre di fila** verdi).
🔑 **E le tre rosse NON sono lo stesso test: la vittima RUOTA** — una
volta `tests/unit/PassoTipo.test.tsx:165` (23,6 s), una volta
`tests/unit/lavoro-form-messaggio-errore.test.tsx` (8,9 s), una non attribuita. **Sempre un solo test per
esecuzione, e sempre con una durata anomala.**
**Non è una regressione, e la prova è tripla ogni volta:** nessuno dei due file **è mai stato toccato sul
ramo** (`git log b4b09d52..HEAD -- <file>` → vuoto), entrambi passano **in isolamento tre volte su tre**,
e la diagnosi già in casa (`.superpowers/sdd/diagnosi-flake-vitest.md:235`) descrive **esattamente questo**:
una fragilità da tempo di parete sotto contesa multi-worker, su un insieme di file «**variabili tra i 9
run, mai lo stesso set**».
➡️ **La regola pratica:** un solo test rosso con durata anomala, in un file che non hai toccato → **isolalo
prima di indagare**. Se in isolamento è verde, è il flake. **Non è un permesso per ignorare un rosso**: la
stessa firma su un file che **hai** toccato è un difetto tuo finché non provi il contrario.
⚠️ **Gli agenti in background cadono** (in questa sessione: 2 su 6, uno **dopo** aver salvato senza
lasciare rapporto). ➡️ **Un commit senza rapporto non è un lavoro verificato:** si rieseguono FASE 7 e le
mutazioni, e si scrive solo ciò che si è misurato.
⚠️ `.next` stantio dopo un cambio di ramo fa fallire `tsc` → `/usr/bin/trash .next`.
⚠️ I **backtick nel messaggio di commit vengono eseguiti dalla shell** → `-F` da file.
⚠️ `.gitignore` ignora `*.png` → `git add -f`. E ignora **`scripts/tmp/`**: una sonda che deve durare va
**incollata in un documento** (P11 nel piano è l'esempio).
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — 🛑 **non è nel repo**, vive solo su questo disco.
🔑 **Il server MCP di Supabase NON è autenticato** in questa sessione.
🛑 **Mai stampare righe di `pazienti`**: sono dati Art. 9 — solo conteggi.
🛑 **Lasciare il database alla baseline** e riverificarla: **294 · 0 · 916 · 48**. La tabella dei colori è
**`colori_dentali`**, non `colori`.
⚠️ **`ANALISI/` vive FUORI dal repo git.**
⚠️ **Date:** i documenti datati «30 luglio» stanno su commit **del 29** — dichiarato, **nessuna rinomina**.

---

## 7. Lo stato del repo

- Ramo **`ondata-b-schermate`**, aperto da `b4b09d52` su `main`. **Niente pubblicato su `origin`**:
  il push su `main` innesca il deploy, e **non è stato chiesto**.
- **`main` è allineato con `origin/main`.**
- **50 decisioni in dieci tornate** nel verbale. Guardia di coerenza **verde**.
