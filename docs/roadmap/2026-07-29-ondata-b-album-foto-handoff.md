# Handoff — ondata (b): T8 è chiuso, l'album è progettato, tocca alla spec

**Per:** la sessione successiva, **contesto pulito**.
**Prima di tutto:** BP-0 — `memory/SESSION_ACTIVE.md`, poi **questo documento**, poi il verbale
`docs/design/decisions/2026-07-28-wizard-ondata-b-decisioni.md` (**sessantasei** decisioni; **D57-D66 sono
di oggi**). Il ledger operativo è `.superpowers/sdd/progress.md` — 🛑 **è fuori dal repo git**: i fatti che
devono sopravvivere stanno **qui**, non lì.
**⚠️ Direttive permanenti:** «Come parlare con Francesco» (`ua-app/CLAUDE.md` §0D) · **Regola Advisor** ·
**Statuto delle fonti** · **§0B mockup prima del codice** · **R-P1/R-P2/R-P6** · **R-E1/R-E2** ·
**«il numero si dà subito»** (§0A-bis) · **BP-1**.

---

## 0. In una riga

**Ramo `ondata-b-schermate`, OTTO task chiusi e revisionati** (T1·T4·T2·T3·T5·T7·T6·T8), **niente su
`origin`**, e **l'album delle foto è progettato fino alla forma ratificata** — manca la **spec**, poi il
piano. 🔴 **T8 va emendato in una riga** (D61: la cancellazione diventa **vera**), non rifatto.

---

## 1. 🔑 La lezione della giornata, e vale più di tutto il resto

**Francesco ha fermato il primo mockup, e tutte e tre le sue obiezioni erano fondate.** La terza ha
scoperto un **buco di processo**, non un cambio di idea:

> Né il *soft-delete* né la finestra «fino alla consegna» erano scelte sue. Le aveva chiuse **un panel di
> advisor** in una tabella intitolata «le quattro domande **normative**», dove la domanda 3 portava
> «📌 da ratificare da Francesco» e **le domande 1 e 2 no**. E il piano le attribuiva a **`D34`**, che è
> **il codice del paziente archiviato**. Il coordinatore ha **ripetuto la citazione sbagliata** nel brief
> di T8.

➡️ **La regola imposta al panel nuovo, ed è l'unica cosa che avrebbe intercettato tutto:** ogni conclusione
porta l'etichetta **`FATTO NORMATIVO`** (con fonte citabile) **o** **`SCELTA DI PRODOTTO`** (con opzioni e
costi). **Nessuna riga senza etichetta.** Il panel di oggi l'ha rispettata, e ha ribaltato la conclusione
precedente.

🔑 **E la seconda lezione, sul metodo delle domande:** metà della contestazione **cadeva**, e l'ho scoperto
solo perché ho **chiesto** invece di assumere — «fino alla fine» significa **fino alla consegna**, quindi la
finestra non era in discussione. **Quel conflitto l'avevo costruito io.** Senza la domanda, il panel avrebbe
cercato fonti per una domanda chiusa.

---

## 2. Che cosa è deciso, e che cosa ne segue

| # | decisione | che cosa comporta |
|---|---|---|
| **D57** | la striscia 72 px non è la forma giusta → **album** | ha **cancellato** le tre varianti A1/A2/A3 del primo mockup |
| **D58** | una proposta di UI si mostra **dentro la schermata vera**, nei tre formati | §0B chiedeva i tre formati, **non** l'intera schermata: è la riga da aggiungere |
| **D61** | la foto è **materiale di lavoro** → cancellazione **fisica** legittima | **T8 da emendare**: `.update({deleted_at})` → `.delete()` + rimozione del file |
| **D62** | il **DPA** va corretto (10 anni, Art. 10(8), 15 per gli impiantabili) | **non è codice**: è il testo di `DpaTemplate.tsx`; nessuna copia firmata |
| **D63** | rete = **conferma + traccia** (mai l'immagine) | 1 migration + 1 insert; forme in casa: `lab_stato_log`, `fatture_sdi_eventi` |
| **D64** | **carta con foto grande + visore a tutto schermo** | componente **nuovo**; entra in `storia-overlay.ts`; **velo nuovo** nei token |
| **D65** | la categoria **si chiede allo scatto** | deroga consapevole al percorso a 3 tocchi; **una volta per gruppo**, non per foto |
| **D66** | **editor fuori**, visore **predisposto** | ruota/ritaglia = lavoro proprio, con panel proprio |

**Invariate e da non riaprire:** la **finestra** «fino alla consegna» con il **409** (T8 la implementa già) ·
la **conferma** (D55) · il gesto su **entrambe** le superfici (D56) · il nome **«Elimina foto»**, mai
«diritto all'oblio» (Art. 28(10): il lab è **responsabile**, il dentista **titolare**).

---

## 3. 🔴 Che cosa NON è coperto da nessuna decisione — e va nella spec

1. **L'ordine delle foto non esiste.** `POST` scrive `ordine: 0` **fisso** e nessuna query ordina l'innesto:
   «la prima foto» **non ha referente stabile**. Un album che mostra una foto grande **deve** sapere quale.
2. **Il TTL delle URL firmate è un'ora** (`lavori/[id]/page.tsx:65`, `modifica/page.tsx:87`) contro i
   **5 minuti** del portale dentisti. Una URL firmata è **un link al portatore**: su un visore a schermo
   pieno, dove il gesto naturale è «apri in una scheda nuova», è la superficie che la espone.
3. **`TabImmagini.tsx` importa i token v2.3 legacy** in una pagina che è `data-ds="v3"` — vietato
   mischiare. Un componente condiviso fra le due superfici tira dentro **quella migrazione** o una deroga.
4. **Il PDF entra fra le foto:** `application/pdf` è accettato e reso come `<img>` → tessera rotta.
5. **Il doppione dopo il caricamento** e **`totalFotos` che conta doppio** (`TabImmagini.tsx:117`).

---

## 4. Da dove si riparte

➡️ **La spec di design della superficie** (album + visore + eliminazione + categoria allo scatto), che deve
**emendare DS v3 §5.33** (la striscia non è più «sola lettura» e diventa una carta) e dichiarare il velo
nuovo. Poi il **piano**, poi l'esecuzione a task singoli (R-E1).
**Materiale già pronto:** il confronto delle tre direzioni
(`docs/design/mockups/2026-07-29-album-foto-tre-direzioni.html` + screenshot 390/768/1280 × light/dark) e
le **catture dell'app vera** (`docs/design/screenshots/2026-07-29-foto-stato-attuale/`).

**Poi:** l'emendamento di T8 (D61+D63) · la correzione del DPA (D62) · **TOK-1 e CLI-1 prima della
pubblicazione** (D53 — 🔴 `portale_token` è nella proiezione **su `origin/main`**: il difetto è **vivo in
produzione oggi**) · Blocco 4 e seguenti del piano.

---

## 5. Le trappole operative — si leggono prima

🛑 **MAI un git worktree** (doppio `package-lock.json` → 404 su tutte le route): `git checkout -b`.
🛑 **Mai `git add -A`**: `git commit -F <messaggio> -- <percorsi>`; i **backtick nel messaggio vengono
eseguiti dalla shell**.
⚠️ **`.gitignore` ignora `*.png`** → `git add -f` per gli screenshot. E ignora **`.superpowers/sdd/`** per
intero e **`*-report.*`**: un rapporto chiamato `…-report.md` **non entra nel repo** (difetto vero, pagato
oggi: il brief di T8 prescriveva quel nome).
⚠️ **Un percorso citato in un documento vivo deve esistere**, o la guardia blocca il commit: un file futuro
si dichiara **«da creare»**.
🔑 **Catture dell'app vera:** dev server `preview_start` («ua-dev», :3000), credenziali da `.env.local`
(`TEST_EMAIL` + `TEST_PASSWORD`, **valide** — provate contro `/auth/v1/token`). 🛑 **`page.fill` su un form
React prima dell'idratazione scrive nel DOM ma NON nello stato**: si invia una password vuota e il servizio
risponde **400 «credenziali non corrette»**, che *sembra* una password sbagliata. Si aspetta il submit
abilitato e si usa **`pressSequentially`**. Ricetta completa: `scripts/tmp/scatti-foto-stato-attuale.mjs`
(⚠️ `scripts/tmp/` è ignorato: se serve, si riscrive da questa riga).
🔑 **SQL diretto:** `node scripts/tmp/sql.mjs "<query>"` — non è nel repo. **Il server MCP di Supabase non è
autenticato.**
🛑 **Mai stampare righe di `pazienti`** (Art. 9): solo conteggi. **Baseline: 294 · 0 · 916 · 48.**
⚠️ **`vitest` non è deterministico**: un solo rosso con durata anomala in un file **non toccato** → isolalo
(`.superpowers/sdd/diagnosi-flake-vitest.md:235`); la stessa firma su un file **toccato** è un difetto tuo.
⚠️ La **guardia degli overlay** (`scripts/guardia-navigazione-overlay.mjs`) **è manuale** e serve al visore.

---

## 6. Lo stato del repo

Ramo **`ondata-b-schermate`**, aperto da `b4b09d52`. **Niente pubblicato su `origin`**; `main` allineato.
**Sessantasei decisioni in sedici tornate** nel verbale. Guardia di coerenza **verde**.
