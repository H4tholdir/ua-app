# Handoff — l'ondata (a) è in produzione, si parte con la (b) (28/07/2026)

> 🛑 **DOCUMENTO SUPERATO la sera del 28/07 — vai a `docs/roadmap/2026-07-28-ondata-b-piano-handoff.md`.**
> Resta qui come storia, ma **contiene una premessa falsificata e una richiesta di panel decaduta** (§3,
> quinta eredità: il catalogo colori **è chiuso**, D3). Le eredità ①-④ e le trappole del §6 restano valide;
> il perimetro dell'ondata è stato **ristretto al solo wizard** (D1) e ampliato con l'anagrafica lato wizard
> (D4/D5). Le decisioni vere sono in `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`.

**Per:** la sessione successiva, contesto pulito.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**. Il resto solo se serve.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **BP-1** prima di fermarsi.

---

## 0. In una riga

**L'ondata (a) è chiusa e in produzione.** Denti e colore non sono più testo dentro il lavoro: sono
righe vere in `lavori_denti`. **Ora tocca all'ondata (b): le schermate.**

🛑 **La (b) non comincia scrivendo codice.** È tutta interfaccia, quindi l'ordine è: ragionamento sul
disegno → **mockup HTML da far approvare a Francesco** (§0B) → piano → codice → **gate estetico L2
obbligatorio** (FASE 9b). Chi apre un file `.tsx` come primo gesto sta sbagliando ondata.

---

## 1. Cosa c'è già in casa (e non va rifatto)

Dall'ondata (a), **in produzione**:
- `lavori_denti` — una riga per dente, con `fdi` (52 codici FDI strutturali), ruolo, scala, codice e
  le tre zone del ceramista. `provenienza`: `prescritto` (nasce col lavoro) o `eseguito` (toccato in
  laboratorio).
- `colori_dentali` — **48 codici** in catalogo. ⚠️ La tendina della scheda ne offre **19**.
- Due RPC atomiche: creazione lavoro+denti in una transazione sola, e sostituzione integrale dei
  denti con **precondizione di concorrenza** (`atteso_updated_at` → 409). **Provato che scatta.**
- `PUT /api/lavori/[id]/denti` con **422 che dice quale dente**.
- La denormalizzazione `lavori.denti_coinvolti` resta scritta dalle RPC: **serve alla Dichiarazione
  di Conformità** finché non arriva l'ondata (c). Non toglierla.

---

## 2. Cosa deve fare l'ondata (b)

Spec di riferimento: `docs/superpowers/specs/2026-07-27-wizard-nuovo-lavoro-design.md`
(23 decisioni W1-W23, verbale in `docs/design/decisions/2026-07-27-wizard-nuovo-lavoro-brainstorming.md`).

**Wizard adattivo** — la tabella dei 38 tipi: il tipo di lavoro decide **se** una domanda compare, e
quando compare **si può saltare** (due leve distinte, W2 ≠ W17) · **odontogramma rifatto in v3** con
le illustrazioni di Francesco e le sagome ricavate dall'immagine (W15; la catena che le genera è in
`scripts/design/`) · **colore per singolo dente** · cassetta saltabile.

---

## 3. 📌 Le quattro eredità dell'ondata (a) — e la quinta che vuole un panel

Trovate **eseguendo**, non ipotizzate (dettaglio: `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md`
§5-quinquies):

1. **La tendina offre 19 codici su 48.** Un `2M2` che arriva dal colore di caso rende la casella
   **vuota a schermo** pur essendo il dato intatto. E da oggi quella tendina non è solo la vetrina
   del colore di caso: ne è anche **la penna**.
2. **Il default di caso non è correggibile alla creazione**, solo dalla scheda.
3. **Le tre zone del ceramista non hanno destinazione senza un dente selezionato.** Oggi il form si
   ferma e lo dice — ma è un limite dichiarato, non una soluzione. ⚠️ **Quel messaggio è arrivato
   davvero all'utente solo dal 28/07** (v. §5).
4. **Il wizard scrive il nome dentro il cognome** — è la metà rimasta della tappa 1 «nome e cognome
   paziente», e finché non si chiude **la targa della cassetta non migliora**.

~~🔑 **La quinta, che NON si decide da soli: il catalogo non è chiuso.**~~
🛑 **CHIUSA il 28/07/2026 da Francesco — decisione D3, verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md`.** Il catalogo **è chiuso**: due
liste VITA, si sceglie da quelle, «un colore che il sistema non riconosce» **non esiste**. L'errore
possibile è **umano** (colore valido ma sbagliato rispetto alla prescrizione) e si intercetta al
confronto pre-consegna (W22), non con la validazione.
⚠️ Il panel era stato fatto lo stesso, e ha **falsificato entrambe le gambe** della premessa qui
sopra: sul POST un rifiuto alla porta **non perde il lavoro** (torna prima della scrittura, non
brucia il progressivo); sul PUT rifiutare **non è gratis** (oggi il rifiuto è nel client e blocca
l'**intero** salvataggio della scheda). Non riproporre né la premessa né la sua «asimmetria».
🔴 **Resta un difetto vero, che non è una regola:** la tendina della scheda offre **19 codici su 48**
(`TabClinica.tsx:8-14`) — lista scritta a mano, scollata dal catalogo. È il caso `2M2`: un colore che
il sistema **conosce** e che quella tendina non offre, con la casella **vuota a schermo**. Fuori dal
perimetro scelto (D1: solo wizard) → coda.

🟡 **Aperto, da decidere sui mockup a inizio ondata:** cosa mostrare al posto di «passo 2 di 3», dato
che i passi variano col tipo (`ProgressDots` presuppone un numero fisso).

---

## 4. Le tre frasi che l'utente legge oggi

> «Non sono riuscita a salvare il colore. Lo aggiungi dalla scheda.»
> «Le zone del colore si registrano sul dente: seleziona almeno un dente nell'odontogramma»
> «Qualcun altro ha modificato questo lavoro: ricarica la pagina»

**Tutte e tre sono state viste a schermo** (28/07). Se rifacendo le schermate una suona storta a chi
fa questo mestiere, **si cambia lì**: è il momento giusto.

---

## 5. ⚠️ Cinque cose che la (b) trova sul tavolo

**Due le ha introdotte la correzione del 28/07** (referto §4.0-ter), ed erano il prezzo consapevole
per far arrivare i messaggi all'utente:
- l'avviso d'errore è `position: absolute` e **copre in parte** «colore corpo» e «colore incisale»
  mentre è visibile (verificato: il coprente è l'avviso, non la fascia di sotto);
- **contrasto sotto lo standard** per un testo di 13 px: **4,06 in chiaro, 3,76 in scuro** contro
  4,5 richiesti — misurato componendo il fondo semitrasparente sopra quello di pagina. **Il colore
  viene dai token: si sistema lì, con la spec v3 in mano.**

**Due sono preesistenti** (verificato col diff: il ramo non tocca quei file):
- **disallineamento di idratazione** su `LinguettaCassette` dentro `StanzePager` — il pannello di
  sviluppo di Next lo segnala su ogni caricamento della home;
- a **1280×800**, in cima alla pagina, la **fascia appiccicata in fondo** copre due campi colore
  finché non si scorre di 300 px.

**Una è di lingua:** il messaggio che arriva dal server è minuscolo e tecnico («le zone del colore
richiedono scala e codice»): dice cos'è rotto, non cosa fare. Ora che si vede, va riscritto.

---

## 6. 🛠️ Come si lavora qui — le trappole già pagate

- 🛑 **MAI un git worktree**: porta un secondo `package-lock.json` e l'app risponde **404 su tutte le
  route**. Si fa `git checkout -b` nel repo principale. Vale **anche quando è una skill a proporlo**.
- ⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit**: `/usr/bin/trash .next`.
- ⚠️ La cancellazione ricorsiva definitiva è bloccata fuori da `/private/tmp/claude-*`, `scripts/tmp/`
  e `node_modules`: si usa `/usr/bin/trash`. 🔑 Il blocco legge **l'intero comando**, quindi scatta
  anche se la sequenza vietata compare in un **messaggio di commit**.
- 🛑 **Due esecutori in parallelo sullo stesso albero:** `git commit -F <file> -- ':(literal)<percorso>'`,
  **e dopo il commit si verifica l'elenco dei file** (`git show --stat HEAD`).
- ⚠️ Il pre-commit gira `eslint --max-warnings=0` + DS compliance + guardia CSRF + guardia «Riduci
  movimento» (~5 s). `npx eslint src/` **prima**.
- ⚠️ `.gitignore` ignora `*.png`: gli screenshot vanno aggiunti con `git add -f`.
- 🔑 SQL diretto: `node scripts/tmp/sql.mjs "<query>"`. 🛑 **Vive solo su questo disco.**
- 🔑 **Collaudo nel browser:** `preview_start {name: "ua-dev"}` (porta 3000). Login con l'utente
  **sintetico** dell'E2E `e2e-titolare@ua-test.local` (credenziale versionata in
  `scripts/seed-e2e.ts:201`, **non di una persona**) — **e lo si dichiara**. Funziona: provato.
- 🛑 **Lasciare il database alla baseline** dopo ogni prova. Il 28/07 era: **294 lavori · 0 righe in
  `lavori_denti` · 916 pazienti · 48 colori**.

---

## 7. 📌 Quello che l'ondata (a) lascia come metodo

> **Un test che non può fallire non è una rete: è il disegno di una rete.**

Trovato **quattro volte in due giorni**. L'ultima è la più istruttiva e non veniva da un test: era
una **condizione di interfaccia irraggiungibile** — un messaggio d'errore mostrato solo «a form
pulito», quando il form è sporco per definizione dopo un errore. Nessuno se ne era accorto perché
la frase era stata **letta come testo** e mai **guardata a schermo**.

> **Il testo giusto dentro un canale che non si apre è indistinguibile dal testo mai scritto.**

E il corollario operativo, pagato due volte il 28/07: **una prova negativa vuole il suo controllo
positivo.** «Non compare l'errore sbagliato» non dice nulla finché non si è visto comparire quello
giusto.
