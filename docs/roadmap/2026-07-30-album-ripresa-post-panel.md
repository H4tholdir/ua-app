# Handoff — l'album delle foto: si riparte dalle correzioni del panel

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**.
🛑 **SOSTITUISCE `docs/roadmap/2026-07-30-album-foto-esecuzione-handoff.md`**, che descrive lo stato *prima*
dell'esecuzione ed è **superato**: due delle sue tre trappole sono state chiuse, e il suo §4 punto 1 è stato
deciso (D80).
**Documenti operativi:** il piano `docs/superpowers/plans/2026-07-30-album-foto-scheda-lavoro.md` (**14 task**:
13 + T9-bis) · la proposta del gate `docs/superpowers/specs/allegati/2026-07-30-ds-v3-sezioni-album.md` ·
🔴 **il verbale del panel `docs/roadmap/2026-07-30-panel-gate-sezioni-album.md`, che è la lista di lavoro di
chi riprende**. Spec ratificata: `docs/superpowers/specs/2026-07-30-album-foto-scheda-lavoro-design.md`.
Verbale decisioni: `docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` — **ottantaquattro**.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **§0B mockup prima del codice** · **R-P1/R-P2/R-P6** · **R-E1/R-E2** ·
**«il numero si dà subito»** (§0A-bis) · **BP-1**.

---

## 0. In una riga

**Blocchi A e B chiusi (T1-T4), il difetto di fondo dello scorrimento riparato (T5-bis), il gate T5 scritto
ma NON ratificato: il panel di tre l'ha fermato con sette bloccanti.**
➡️ **Si riparte applicando le correzioni del panel dentro il documento del gate**, poi la ratifica, **poi**
T6 → T9-bis con un esecutore fresco per task (R-E1).

---

## 1. Che cosa è fatto, e cosa c'è ora che prima non c'era

| task | esito | commit |
|---|---|---|
| **T1** | `lavori_immagini.categoria` è una colonna **vincolata** (`CHECK` sui sei di D72, `NOT NULL` **senza ripiego**); `tipo` **eliminata** | `9961964f` |
| **T2** | **unica fonte** dei sei valori + la **spia** che confronta gli insiemi in **entrambe** le direzioni | `cf976a96` |
| **T3** | POST e PATCH **pretendono e validano** la categoria (**422**, non 500); chiuse **R26** e **R28**; nasce la **prima** prova della rotta POST | `b925a866` |
| **T4** | la cancellazione è **vera**: file prima, riga dopo, **traccia** di D63 (mai l'immagine). Fail-closed sul file, fail-soft **dichiarato** sulla traccia | `912096a8` · `bc6ccd1f` · `cdb96f6a` · `246d09db` · `b094718d` |
| **T5** | le **cinque** §5.x scritte **prima** dei componenti, 773 righe, **zero codice** | `8822fa05` · `8cdd7fc4` · `430d86e6` |
| **T5-bis** | 🆕 **il blocco dello scorrimento diventa a contatore** (`src/components/ds/blocca-scorrimento.ts`); `Sheet` e `NuovoOrdineSheet` migrati | `c268b54b` · `47e77069` · `daeb0efc` · `636c10b4` |

🔑 **Riferimenti misurati alla chiusura:** `npx tsc --noEmit` → **uscita 0** · `npx vitest run` →
**3936 passati | 19 saltati** su 362 file. Banca dati: `lavori_immagini` **3 righe**, traccia **0**.

---

## 2. 🔴 I due ritrovamenti strutturali — si leggono PRIMA di riprendere

1. **`tsc` NON protegge le query di questo repo (R27).** I quattro fabbricanti del client Supabase
   (`src/lib/supabase/{server-service,server-user,browser-anon,middleware-client}.ts`) creano il client
   **senza il generico `<Database>`**: `provato:` una colonna **inventata** dentro un `.insert()` lascia
   `tsc` a **uscita 0**. ➡️ **La FASE 6b rigenera i tipi ma non li fa valere.** Chi tocca uno scrittore
   **si porta la sua prova** — T1 l'ha chiusa con due `INSERT` in transazione annullata, uno che deve
   **essere rifiutato**. **Voce di roadmap propria: 147 file, decide Francesco.**
2. **Un solo database, ed è quello di produzione (R29).** ➡️ **Il caricamento foto su uachelab.com è
   ROTTO adesso** (D81): la migration ha tolto `tipo`, il codice pubblicato la scrive ancora. Francesco ha
   scelto di **lasciarlo fino al merge** (dati di prova, nessun cliente vero). 🛑 **La riparazione è un
   passo di collaudo di T13**, ed è scritta lì. ⚠️ **La finestra si riapre a ogni ondata che tocchi lo
   schema**, per costruzione.

---

## 3. Le decisioni nuove della giornata

| # | decisione | in una riga |
|---|---|---|
| **D80** | la conferma di eliminazione è un **foglio dal basso** | S1 **ritirato** · nasce **T9-bis** · deroga a **§5.17**, non §5.16 |
| **D81** | il guasto in produzione **si lascia** fino al merge | costo misurato: solo dati di prova · si ripara in **T13** |
| **D82** | **«Annulla» sopra, «Elimina foto» sotto** | coerenza con D78 · le due forme della conferma si leggono uguali |
| **D83** | il visore **copre tutto** → z-index **1010 · 1020 · 1030** | l'app aveva **già** due overlay v3 a 1000 sulla stessa pagina |
| **D84** | il blocco dello scorrimento si **ripara alla radice** | fatto: modulo a contatore · cade la regola «solo il più basso» |

**Rilievi nuovi a verbale:** **R27** (`tsc` inerte) · **R28** (chiusa in T3) · **R29** (un solo database) ·
**R30** (l'errore dello Storage va grezzo al browser) · **R31** (corpo JSON non-oggetto → 500; stessa grafia
in 7 file, **non verificato** che siano tutti scoperti) · **R32** (`ordine` senza validazione) · **R33**
(**chiusa**: difesa doppia sulla traccia) · **R34** (`deleted_at` su `lavori_immagini` non ha più scrittori).

---

## 4. 🚪 Da dove si riparte, in ordine

1. **Applicare le correzioni del panel al documento del gate.** La lista è
   `docs/roadmap/2026-07-30-panel-gate-sezioni-album.md`: **sette bloccanti** (§1) e **quindici rilievi**
   (§2). 🔑 **Due voci sono già state corrette nel documento** (G-3 da D84, G-5 da D83, e FM-1 è ora un
   fatto): **le altre no**.
2. **Ratificare il gate**, riga per riga sull'elenco di §0 della proposta.
3. **Correggere i mandati di T7/T8/T9/T9-bis PRIMA di T6**, o quattro esecutori su cinque leggeranno un
   testo che sa meno del documento. Le righe sono **F-1**, **F-6**, **F-7**, **F-8** della proposta e
   **C-11**, **C-12**, **C-13** del verbale del panel.
4. **T6 → T9-bis**, un esecutore fresco per task. 🛑 **T6 porta il gruppo di token `sopraFoto`** in
   `src/design-system/v3/tokens.ts` — **non T7**, come diceva il documento: `CartaAlbum` lo usa già, e
   senza il controllo pre-commit lo blocca.
5. Poi **D (T10 → T11 → T12)** ed **E (T13)**.

🛑 **T11 è la RIPARAZIONE, non un abbellimento:** da T3 il server pretende `categoria` e
`TabImmagini.tsx:131` spedisce ancora `descrizione` → **ogni caricamento riceve 422** finché T11 non
atterra. La sua prova migliore non è un'asserzione: è **caricare una foto e vederla salire**.

---

## 5. 🔴 I sette bloccanti del panel, in una riga ciascuno

1. **Il `Tab` esce dal pannello** e nessuna delle cinque §5.x dichiara cosa fa — mentre l'intera via di
   `Escape` ci poggia sopra. Con `Tab` si atterra su `SkipToContent.tsx:12` (z-index **9999**) e `Escape`
   risale a `window`, dove vivono **nove** ascoltatori (non due) e chiude lo strato **sbagliato**.
2. **Il bivio di A-1 non ha un proprietario:** il ripiego (FM-2) tocca un modulo condiviso, fuori dal
   mandato di T7. ✅ **Ma A-1 è VERA**, provata alla fonte in `react-dom` e riverificata → il ripiego
   probabilmente non serve. ⚠️ Vale per la **fase di bolla**: un ascoltatore in **cattura** passerebbe.
3. **La prova del blocco dello scorrimento era cieca due volte** (sentinella `'hidden'` = il valore che un
   bloccante scriverebbe; e verde anche **senza montare niente**). ✅ Riscritta in T5-bis con `'scroll'`.
4. **I numeri di contrasto del visore sono calcolati sull'elemento sbagliato:** `provato:` sul mockup
   `.vis-capo .mezzo` **non ha sfondo** → 2,1:1, **non** 4,2, e non arriva in soglia nemmeno a opacità
   piena. ➡️ Etichetta + contatore diventano **una pastiglia con faccia**.
5. **L'etichetta della categoria è un comando** (apre il foglio, D70) e non ha **né altezza 44 né nome
   accessibile**.
6. **A «Riduci movimento» i due fogli si muovono comunque:** `coreografie.sheetSu` porta la transizione
   **dentro** il bersaglio, in due punti.
7. **I 148,5 px di D79 sono presi dentro la cornice di telefono del mockup** e la larghezza vera del foglio
   non è mai dichiarata (~171 a 390, ~216 da 768). 🔴 E il `nowrap` copiato **rompe il text-zoom 200%**,
   che è un requisito di rilascio.

---

## 6. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su **tutte** le route): `git checkout -b`.
🛑 **Mai `git add -A`**: `git commit -F <file-messaggio> -- <percorsi>`; i **backtick nel messaggio vengono
eseguiti dalla shell**. Il file del messaggio va **fuori dal repo** (scratchpad).
⚠️ **`.gitignore` ignora `*.png`** (serve `git add -f`), **`.superpowers/sdd/`**, **`scripts/tmp/`** e
**`*-report.*`**: un rapporto chiamato `…-report.md` **non entra nel repo**.
⚠️ **Un percorso citato in un documento vivo deve esistere**, o la guardia blocca il salvataggio: un file
futuro si dichiara **«da creare»** o **🆕** **sulla stessa riga**. *(Ha bloccato il coordinatore una volta
oggi, ed era giusto.)*
🔑 **Le migration si applicano con `npx supabase db push --yes`** (CLI globale, progetto già linkato,
`SUPABASE_ACCESS_TOKEN` in `.env.local`) — **è la via registrata**, e il ledger è allineato. ⚠️ **Prima si
prova in `BEGIN; … ROLLBACK;`** con `node scripts/tmp/sql.mjs "<query>"` (**non è nel repo**, si riscrive).
**Il server MCP di Supabase NON è autenticato.**
🛑 **Mai stampare righe di `pazienti`** (Art. 9): solo conteggi.
⚠️ **`vitest` non è deterministico:** un solo rosso con durata anomala su un file **non toccato** → isolalo
(`.superpowers/sdd/diagnosi-flake-vitest.md:235`); la stessa firma su un file **toccato** è un difetto tuo
finché non provi il contrario.
⚠️ **La guardia degli overlay è MANUALE** (`scripts/guardia-navigazione-overlay.mjs`): serve una **build di
produzione su `:3020`** (🛑 non `npm run dev`, che è 3000), le credenziali e una **fixture che il seed non
crea**. **Uscita 2 = fixture mancante**, non «tutto a posto». ⚠️ **La tendina sarà invisibile ai suoi due
bracci** (contano `.ds-sheet` e `[role="dialog"]`, la tendina avrà `role="menu"`).
🔑 **Il pre-commit gira:** `lint-staged` · `tsc --noEmit` · `check-ds-compliance.sh` · `check-csrf.sh` ·
`guardia-reduced-motion.mjs` · `guardia-coerenza-documenti.mjs`.
⚠️ **Due guardie sanno meno di quanto sembri:** `guardia-reduced-motion.mjs` ha **due sole superfici cablate
a mano** e non scandaglia niente; e il controllo dei colori ha **sei buchi misurati** (fra cui l'esadecimale
a **otto** cifre e `color-mix()`).

---

## 7. Lo stato del repo

Ramo **`ondata-b-schermate`**, **niente pubblicato su `origin`**, **albero pulito**, **82 commit** avanti a
`origin/main`. Guardia di coerenza **verde su 9 documenti vivi**.

**Fuori da questo piano, ma dentro l'ondata (b), prima della pubblicazione:** la correzione del **DPA**
(**D62**) e **TOK-1 + CLI-1** (**D53** — 🔴 `portale_token` è nella proiezione **su `origin/main`**: quel
difetto è **vivo in produzione oggi**).
