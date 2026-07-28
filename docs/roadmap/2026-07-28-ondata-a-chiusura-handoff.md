# Handoff — Ondata (a): resta il collaudo nel browser, poi il merge (28/07/2026)

**Per:** la sessione successiva, contesto pulito.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**. Il resto solo se serve.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **mockup PRIMA del codice** (§0B) · **BP-1** prima di fermarsi.

---

## 0. In una riga

**L'ondata (a) è FINITA come codice: 13 task su 13 + 5 code + una revisione indipendente con 5
correzioni.** Ramo `ondata-a-denti-colore`, **72 commit avanti a `main`, mai mergiato.**
**Resta: FASE 9 (collaudo nel browser) → merge → deploy → BP-1 finale.**
🛑 **Il merge lo autorizza Francesco:** *«non andiamo in produzione finché non lo dico io»*.

**Stato verificato dall'orchestratore, non riferito:** `tsc` 0 · `eslint` 0 · `next build` ok ·
**vitest 3622 passati / 19 saltati** · **DB alla baseline: 294 lavori, 0 righe in `lavori_denti`** ·
albero di lavoro pulito.

---

## 1. 🛑 LA COSA CHE DEVI SAPERE PRIMA DI TUTTO

**Le migration sono GIÀ APPLICATE sul database vivo** — lo stesso progetto Supabase che serve
l'applicazione online (`iagibumwjstnveqpjbwq`). Verificato: `lavori_denti` esiste, `colori_dentali` ha
i suoi 48 codici, e `dichiarazioni_conformita.colore_dente` **non esiste più** (un `DROP COLUMN`
irreversibile).

Quindi **«niente in produzione» è vero per il CODICE e falso per lo SCHEMA.** Oggi non rompe nulla —
verificato su `main`: nessun codice scrive quella colonna. Ma se il ramo non venisse mai mergiato, un
`git revert` **non riporterebbe indietro lo schema**. Il rischio sul dato resta basso (`CLAUDE.md` §8:
dati di prova, si ripuliscono alla consegna). **Va saputo, non scoperto dopo.**

---

## 2. Cosa resta da fare, in ordine

### FASE 9 — collaudo nel browser (l'unica cosa che manca davvero)
**3 viewport obbligatori: 390px · 768px · 1280px. Sempre light + dark.**
⚠️ **Nessun gate estetico L2 in questa ondata:** non cambia un pixel, **di proposito**. Serve nella (b).

**Con che cosa si fa** (⚠️ **`/gstack qa` NON esiste più**, v. §6): la skill **`webapp-testing`**,
oppure `preview_start` + gli strumenti `mcp__plugin_playwright_*` direttamente.
✅ **`.claude/launch.json` c'è ed è a posto** (verificato il 28/07): configurazione **`ua-dev`**,
`npm run dev`, porta **3000**. Quindi `preview_start` con `{name: "ua-dev"}` parte senza preparativi.
⚠️ **Il server di sviluppo non è mai stato avviato nella sessione del 28/07:** tutto è stato provato
con `vitest`, `tsc`, `next build` e SQL. **`next build` compila, non dimostra che l'app giri** — e
quel giorno sono state cestinate 53 cartelle sotto `.claude/`. **Il primo `preview_start` è anche la
verifica che la rimozione di gstack non abbia toccato niente di vivo.**

**Cosa guardare, in ordine di rischio:**
1. **Il modulo «Nuovo lavoro»** — si crea un lavoro con elemento e colore; il colore arriva davvero?
   Poi si riapre la scheda e **si ritrova**? È il ciclo che l'ondata esiste per chiudere.
2. **Il colore digitato male** — scrivere `A3,5` (virgola, tastiera italiana) e verificare che compaia
   l'avviso nuovo (§3) **e che il lavoro si crei lo stesso**.
3. **La scheda del lavoro** — si cambia un dente, si salva, **si ricarica**: il dato è ancora lì?
   Si azzera il colore, si ricarica: **è sparito davvero?** (era il difetto della coda del 12-bis).
4. **Il rifacimento** — si rifà un lavoro con denti e colore: il nuovo **eredita** entrambi?
   (era il difetto G1, il più grave della revisione).
5. **Due salvataggi di fila** dalla stessa scheda: il secondo **non** deve prendere un errore di
   conflitto con un utente solo collegato.

🛑 **Le password non le digita l'assistente: per il collaudo dietro login entra Francesco.**
⚠️ **Alternativa già usata e ratificata il 28/07:** l'utente **sintetico** dell'E2E
(`scripts/seed-e2e.ts:201`, `e2e-titolare@ua-test.local`) — credenziale versionata nel repo, creata
dal seed per i test, **non di una persona**. Il Task 13 l'ha usata per due prove via HTTP vero.
**Se la si riusa, lo si dichiara.**

### Poi: merge → deploy → BP-1
`git checkout main && git merge ondata-a-denti-colore` → push → **attendere CI verde** → verificare
`uachelab.com`. Poi **BP-1**: `MEMORY.md` (voce 58 esiste già, va spostata da «sul ramo» a «in
produzione») e `ROADMAP-UFFICIALE.md` (voce 1, ondata (a) → completata **e deployata**).

---

## 3. 🔑 Le tre frasi nuove che l'utente legge — le uniche cose visibili di tutta l'ondata

> «**Non sono riuscita a salvare il colore. Lo aggiungi dalla scheda.**» (e le varianti con elementi
> e foto, con il pronome che **accorda**: «Lo/La/Li»)
> «**Le zone del colore si registrano sul dente: seleziona almeno un dente nell'odontogramma**»
> «**Qualcun altro ha modificato questo lavoro: ricarica la pagina**»

⚠️ **Sono state mostrate a Francesco il 28/07 e non ha chiesto modifiche** — ma non le ha nemmeno
approvate esplicitamente. Se al collaudo una suona storta a chi fa questo mestiere, **si cambia
adesso che costa una riga.**
⚠️ `src/components/ds/Avviso.tsx` taglia a **2 righe**: con tutti e tre gli accessori persi (88
caratteri) a 390px il testo **può troncarsi**. Difetto del componente, non della frase → ondata (b).

---

## 4. I due documenti che contano

| File | Cosa contiene |
|---|---|
| `docs/roadmap/2026-07-28-revisione-pre-merge-ondata-a.md` | **LA REVISIONE** — tabella dell'esito in testa, poi 3 gravi (chiusi), 6 medi, 6 minori, e **cosa resta aperto con la sua casa**. Ogni rilievo con `file:riga` |
| `docs/roadmap/2026-07-28-ondata-a-esecuzione-handoff.md` | **LA CRONACA** dei 13 task — §5-bis→§5-sexies, i 27 ritrovamenti. Serve se si deve capire **perché** una cosa è stata fatta così |

Piano: `docs/superpowers/plans/2026-07-27-wizard-ondata-a-dato-e-api.md` (contiene anche T11-bis, fatto,
e Task 12-bis con **la ragione di dominio in parole di Francesco**).
Evidenze di isolamento: `docs/superpowers/plans/evidenze/2026-07-27-ondata-a-isolamento.md`.

---

## 5. ⚠️ Trappole logistiche — tutte pagate, nessuna teorica

- 🛑 **MAI un git worktree** in questo progetto: porta un secondo `package-lock.json` e l'app risponde
  **404 su tutte le route**. Si fa `git checkout -b` nel repo principale. Vale **anche quando è una
  skill a proporlo**.
- ⚠️ **`.next` stantio dopo un cambio di ramo fa fallire `tsc` nel pre-commit** con `Cannot find
  module '.../route.js'`. Non è un difetto tuo: `/usr/bin/trash .next` e ricommitta.
- ⚠️ **La cancellazione ricorsiva definitiva è bloccata** fuori da `/private/tmp/claude-*`,
  `scripts/tmp/` e `node_modules`: si usa `/usr/bin/trash`. 🔑 Il blocco legge il testo dell'**intero
  comando**, quindi scatta anche se la sequenza vietata compare in un **messaggio di commit**.
- 🛑 **DUE ESECUTORI IN PARALLELO SULLO STESSO ALBERO: lezione pagata due volte il 28/07.**
  Committare «solo i propri file per percorso» **NON basta**: `lint-staged` mette da parte le
  modifiche non in stage e **riscrive l'indice** a fine corsa (~15 s), e in quella finestra un commit
  può **prendere i file di un altro** o **farsi sostituire i propri**. **Contromisura che funziona:**
  `git commit -F <file-messaggio> -- ':(literal)<percorso>'`, e **dopo il commit si verifica
  l'elenco dei file** (`git show --stat HEAD`), non solo lo stage prima.
- ⚠️ Il pre-commit gira `eslint --max-warnings=0` + DS compliance + guardia CSRF + guardia «Riduci
  movimento» (~5 s). `npx eslint src/` **prima**.
- ⚠️ `.gitignore` ignora `*.png`: gli screenshot vanno aggiunti con `git add -f`.
- ⚠️ `../CLAUDE.md` e `../ANALISI/` stanno **fuori** dal repo git: non provare a committarli.
- 🔑 SQL diretto: `node scripts/tmp/sql.mjs "<query>"`. 🛑 **Vive solo su questo disco**
  (`scripts/tmp/` è ignorato): non sopravvive a un clone pulito. ⚠️ Mai stampare `.env.local`.
- 🛑 **Lasciare il database alla baseline** dopo ogni prova: **294 lavori, 0 righe in `lavori_denti`**.

---

## 6. 🧹 gstack è stato RIMOSSO (28/07, decisione di Francesco)

Cestinati: il corpo `ua-app/.agents/` (**1,1 GB**), le **53** scorciatoie sotto `.claude/skills/`
(censite: 53 su 53 puntavano a gstack), il symlink tracciato, le voci in `settings.local.json`,
`skills-lock.json` e `.gitignore`. **Le 11 skill di design di Francesco NON sono state toccate**,
verificate vive dopo.
🛑 **Nessun comando `/gstack:*` esiste più.** `CLAUDE.md` FASE 9 e `PROSSIMA-SESSIONE.md` sono corretti.
⚠️ **`docs/processes/WORKFLOW-STANDARD.md` NON è stato riscritto**: oltre quaranta `/gstack:*` lo
attraversano e sostituirli è **ridefinire il processo** — decisione di Francesco con panel. Ha un
**avviso in testa** che dice cosa non esiste più e cosa vale al suo posto.
🔑 **Per la revisione del codice, il metodo che ha funzionato il 28/07** (e che ha trovato 3 gravi):
**tre revisori a contesto fresco, mandati disgiunti, istruzione di non correggere nulla** — sicurezza
e isolamento · disaccordi fra superfici · **forza dei test misurata con abbozzi inerti**.

---

## 7. Dopo il merge — cosa aspetta, in ordine

**Ondata (b)** — wizard adattivo + odontogramma v3 + la metà rimasta di nome/cognome paziente.
📌 **Eredita quattro cose dall'ondata (a)** (dettaglio in `ROADMAP-UFFICIALE.md`, voce 1): la tendina
a **19 codici su 48** (un `2M2` idratato mostra la casella **vuota**, e quella tendina ora è anche la
**penna** del colore di caso) · il default di caso non correggibile alla creazione · le tre zone senza
destinazione senza un dente · **il catalogo non chiuso**, che è **un progetto e non un'estrazione**:
l'esito corretto è **asimmetrico** — sul PUT rifiutare non perde nulla, sul POST perderebbe **il
lavoro**. 🔑 **Serve il panel.**
**Ondata (c)** — Dichiarazione di Conformità + gancio nel precheck. Eredita tre pulizie.
**In coda a tutto** — l'ondata «accesso con passkey» (5 difetti censiti) · **un laboratorio può
diventare INCANCELLABILE** (sei tabelle senza `ON DELETE`, pre-esistente, **la prova del Task 13 è
fallita apposta lì**) · i **due progetti Playwright fantasma** · `genera_numero_lavoro()` con l'anno
UTC · il fuso non fissato nella suite di test.

🔴 **E quattro cose trovate correggendo il rifacimento, mai chiuse — una è normativa:**
`007_rpc_rifacimento.sql` **non è la funzione viva** (il testo insegna il modello sbagliato:
progressivo `MAX+1` = numeri duplicati, `GRANT` a `authenticated`) · **`incidenti_mdr` non viene MAI
scritto sul rifacimento** e la tabella è **vuota**: una non conformità non lascia traccia MDR ·
l'originale **non viene annullato** → rifacimenti illimitati che bruciano progressivi · route e
funzione **non concordano sugli stati** → 500 col messaggio del database.

---

## 8. 📌 Quello che questa giornata lascia

> **Un test che non può fallire non è una rete: è il disegno di una rete.**

Trovato **tre volte** in un giorno, e la terza è la più istruttiva: la guardia che proteggeva la
rilettura del colore cercava una riga dentro due file — e quella riga compariva **due volte per
file**, una nel codice e una **nel commento che spiegava perché era importante**. Il commento scritto
per proteggerla era ciò che disarmava il test che la proteggeva.

**Venti esecutori freschi, venti difetti reali** — uno in una regola scritta dall'orchestratore poche
ore prima, smentita da un repro. **Nessuno è arrivato all'utente.**
