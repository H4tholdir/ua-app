# Bundle E — A16: Export CSV lavori + cedolini batch — Design

**Data:** 20 luglio 2026 · **Stato:** approvato da Francesco (sessione 20/07 sera)
**Origine:** censimento §A (A16 «export CSV incompleto», verdetto DA-FARE, effort M, Bundle E)
**Riserve advisor pre-raccolte (censimento §7):** escaping anti CSV-injection (`=`, `+`, `-`, `@` a inizio cella) + test di scoping tenant. Dal fix date fiscali: default year = `annoRoma()`.

## Decisioni ratificate da Francesco (20/07)

1. **Lavori export:** filtro anno su `created_at`, set colonne completo.
2. **Cedolini batch:** CSV di dettaglio, una riga per tecnico × voce listino.
3. **Guard N13:** `lavori/export` ESENTE (portabilità, come `fatture/export`) con blocco blacklist esplicito; `cedolini-batch` GUARDED (`assertLabOperativo`).
4. **UI:** nessuna in questo bundle — i punti di download entrano nel giro mockup del mini-triage design.
5. **Retrofit:** anche `fatture/export` passa all'helper condiviso (anti-injection + paginazione).

## 1. Helper condiviso — `src/lib/utils/csv.ts`

Modulo puro (niente I/O), testabile in isolamento:

- `CSV_BOM` (`'﻿'`) e `CSV_SEP` (`';'`) — convenzione Excel IT già in uso.
- `csvCell(val: string | null | undefined): string` — escaping unico:
  1. normalizza `null`/`undefined` → `''`;
  2. **anti-formula:** se il primo carattere è `=`, `+`, `-`, `@`, tab o CR, antepone `'` (neutralizza l'interpretazione formula di Excel/LibreOffice; il prefisso resta visibile ma innocuo — trade-off standard OWASP);
  3. **quoting:** se la cella contiene `;`, `"`, `\n` o `\r` (o è stata prefissata), racchiude in doppi apici raddoppiando quelli interni.
- `csvNumIT(n: number | null | undefined, segno?: 1 | -1): string` — `toFixed(2)` + virgola decimale (pattern `fatture/export`).
- `csvRiga(celle: string[]): string` — join con `CSV_SEP`.

I numeri formattati da `csvNumIT` non passano da `csvCell` (mai iniziano con caratteri formula: il segno negativo `-` è legittimo SOLO qui, dove il contenuto è generato da `toFixed`, non da input utente).

## 2. `GET /api/lavori/export`

**Auth:** `getFreshLabContext()` → 401 senza utente, 403 senza laboratorio.
**N13:** route ESENTE (aggiunta a `LAB_GUARD_EXEMPT_ROUTES`) — export = portabilità dati, aperto a `sospeso`/`scaduto`; self-check esplicito `context.lab?.stato === 'blacklist'` → 403 (pattern identico a `fatture/export/route.ts:21-23`). Nessuna restrizione di ruolo (come `fatture/export` e `GET /api/lavori`).
**Parametri:** `year` (`/^\d{4}$/`, default `String(annoRoma())`; valore malformato → default).
**Query:** `lavori` con `laboratorio_id = labId`, `deleted_at IS NULL`, `created_at >= {year}-01-01` e `< {year+1}-01-01`, join `clienti` e `tecnici` (come `GET /api/lavori`), ordine `created_at ASC`. Confine anno su `created_at` timestamptz = mezzanotte UTC: scarto max 1-2h a capodanno, accettato (serie lavoro già UTC, non fiscale — backlog).
**Paginazione:** il client Supabase tronca a **1000 righe in silenzio**; la route legge a pagine da 1000 con `.range(offset, offset+999)` in loop finché la pagina torna corta. Nessun cap silenzioso.
**Colonne CSV:** `Numero Lavoro · Data Creazione · Stato · Priorità · Tipo Dispositivo · Descrizione · Cliente · Paziente · Tecnico · Consegna Prevista · Consegna Effettiva · Conformato · Fatturato · Spedizione · Tracking`.
- Cliente = `studio_nome` se presente, altrimenti `cognome nome`; Tecnico = `cognome nome`.
- Date come `YYYY-MM-DD` (per `created_at`: `split('T')[0]`); booleani `Sì`/`No`.
- TUTTE le celle testuali passano da `csvCell` (descrizione, nomi, tracking… sono input utente).
**Risposta:** `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="lavori-{year}.csv"`, `Cache-Control: no-store`. Errore query → 500 `{error}`.

## 3. `GET /api/tecnici/cedolini-batch`

**Auth:** `getFreshLabContext()` → 401/403.
**N13:** GUARDED — `assertLabOperativo(context, 'GET')` PRIMA di ogni query (pattern `[id]/cedolino`).
**RBAC:** solo `titolare` e `admin_rete` → altrimenti 403 (il batch espone i compensi di TUTTI i tecnici; il singolo tecnico usa la route singola).
**Parametri:** `mese` (`/^\d{4}-\d{2}$/`, default mese corrente **Europe/Rome** = `oggiRomaISO().slice(0, 7)`; malformato → default). NB: la route singola usa ancora il default UTC (backlog residui UTC) — la nuova nasce corretta.
**Query:** stessa semantica di `generateCedolinoTecnico` ma senza filtro tecnico: `lavori_lavorazioni` con `laboratorio_id = labId`, join `lavori!inner` (`stato = 'consegnato'`, `laboratorio_id = labId`, `data_consegna_effettiva` in `[primo giorno mese, primo giorno mese successivo)`, `tecnico_id NOT NULL`), join `listino!inner` (`compenso_tecnico NOT NULL`), join `tecnici` per nome/cognome (via `lavori.tecnico_id`). Confini mese calcolati come `meseBoundaries` esistente (date-only, nessun problema TZ). Paginazione a pagine da 1000 come sopra.
**Aggregazione:** mappa per chiave `(tecnico_id, nome voce listino)` — somma quantità, totale = quantità × compenso unitario. Righe ordinate per cognome/nome tecnico, poi voce. Tecnici senza lavorazioni nel mese: assenti (nessuna riga a zero).
**Colonne CSV:** `Tecnico · Voce Listino · Quantità · Compenso Unitario (€) · Compenso Totale (€)`; quantità intera senza decimali; ultima colonna vuota di riga totale NON prevista (i totali per tecnico li fa Excel — dettaglio verificabile, decisione «dettaglio per voce»).
**Risposta:** `attachment; filename="cedolini-{mese}.csv"`, headers come sopra. Errore query → 500 `{error}`.

## 4. Retrofit `fatture/export`

- Sostituzione dell'escaping locale (`escapeField`) e della formattazione numeri con `csvCell`/`csvNumIT`/`csvRiga` — comportamento invariato TRANNE: celle che iniziano con carattere formula ora prefissate `'` (migliorativo, riserva advisor).
- Aggiunta paginazione a pagine da 1000 (stesso helper di pattern usato dalle nuove route — se emerge naturale, piccola utility condivisa `fetchAllPages` in `src/lib/utils/`; altrimenti loop inline identico nelle 3 route, scelta al piano).
- I 3 test esistenti (`fatture-export-route.test.ts`) devono restare verdi senza modifiche ai loro assert (nessuna delle celle nei fixture inizia con caratteri formula).

## 5. Test (TDD — `tests/unit/`)

**`csv-utils.test.ts`** (helper puro):
- quoting: `;`, `"`, newline; raddoppio apici.
- anti-formula: `=CMD()`, `+39…`, `-x`, `@x`, tab → prefisso `'` e quoting; testo normale invariato.
- `csvNumIT`: virgola, segno, null→`0,00`.

**`lavori-export-route.test.ts`** (pattern mock di `fatture-export-route.test.ts`):
- 401 senza utente; 403 senza lab; 403 blacklist (mock context con `lab.stato='blacklist'`).
- **Scoping tenant:** spy sulla catena query — `eq('laboratorio_id', <lab del context>)` chiamato; i dati di un altro lab non possono comparire.
- CSV: header corretto; riga con descrizione `=SUM(A1)` → cella neutralizzata; cliente con `;` → quotato.
- `year` default = `annoRoma()` (fake timers a cavallo d'anno: 31/12 23:30 UTC → anno nuovo); `year` malformato → default.
- Paginazione: mock che risponde 1000+1000+n → tutte le righe nel CSV.

**`cedolini-batch-route.test.ts`:**
- 401/403; guard: context `sospeso` → 403 (mock con `lab`, requisito handoff «mock context con lab»).
- RBAC: `tecnico` → 403, `front_desk` → 403, `titolare` e `admin_rete` → 200.
- Aggregazione: 2 tecnici × voci sovrapposte → righe distinte, somme corrette, ordinamento.
- `mese` default Roma (fake timers 31/12 23:30 UTC → gennaio anno nuovo a Roma); malformato → default.
- Anti-injection su nome voce listino.

**`fatture-export-route.test.ts`:** +1 test formula-injection; esistenti invariati.
**`lab-guard-static.test.ts`:** si aggiorna da solo (nuova esenzione nel file lista; il test «entry morte» valida l'esistenza del file).

## 6. Gate FASE 3 (validazione architetturale)

- **Tenant isolation:** nessuna modifica RLS; service client con filtro `laboratorio_id` esplicito + test di scoping (riserva advisor).
- **Schema drift:** nessuna migration; nessun `gen types`.
- **API contract:** 2 route nuove (nessun client esistente); retrofit `fatture/export` cambia solo celle che iniziano con caratteri formula (migliorativo, nessun consumer programmatico noto del CSV).
- **Rollback:** revert del merge; nessuno stato persistente.
- **Dominio critico:** niente RLS/Stripe/FatturaPA-emissione/auth/migration → percorso Media (worktree + TDD + review). Il retrofit tocca una route di sola lettura CSV, non i percorsi di emissione.

## Non-goals

- Bottoni UI di download (→ mini-triage design, mockup 0B).
- Export XLSX/PDF batch, email automatiche (A8 è post-Bundle E).
- Fix del default UTC nella route cedolino singola (backlog «residui UTC», fuori scope qui).
- P2 draft NYE variante (d) — spec separata, dopo questo bundle.
