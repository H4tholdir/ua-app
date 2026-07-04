# UÀ — Backlog Tecnico Preciso
**Generato:** 2 luglio 2026, sintesi di 11 report di re-audit (`docs/audit-2026-07-02/`)
**Fonte:** analisi diretta del codice sorgente deployato in produzione + verifica live Playwright, non stime.
**Scopo:** unica lista prioritizzata di tutto ciò che va sistemato o completato, con file:riga esatti, causa, fix consigliato ed effort stimato dove disponibile.

> Legenda fonte: **[Odt]**=Odontotecnico **[Tit]**=Titolare **[Den]**=Dentista **[PWA]**=PWA Engineer **[Des]**=Designer **[UX]**=UX Expert **[SWE]**=Software Engineer **[FT]**=Flow Titolare **[FTec]**=Flow Tecnico **[FFD]**=Flow Front Desk **[Sis]**=Sistematico

---

## 0. STATO AVANZAMENTO — aggiornare questa tabella ad ogni item completato

**Regola:** quando un item viene implementato e verificato (build/test/QA), cambiare il suo stato qui sotto da ⏳ a ✅ e aggiungere data + commit. Non spostare/cancellare righe. Questa tabella è la fonte di verità sul progresso — leggerla sempre a inizio sessione (BP-0).

**Legenda stato:** ⏳ Da fare · 🔄 In corso · ✅ Fatto e verificato · ⛔ Bloccato (vedi nota) · ➖ Rimandato/deciso di non fare

### 🔴 Blocker (16)
| ID | Titolo | Stato | Data/commit | Note |
|---|---|---|---|---|
| B1 | Tracciabilità MDR materiali/lotti rotta | ✅ | 02/07/2026 · `31cc47c` | Vedi MEMORY.md §0 per dettaglio fix. Follow-up non bloccanti: test e2e orchestraConsegna (→B13), verifica manuale su lavoro reale ancora da fare |
| B2 | Dashboard/Scadenzario dati contrastanti | ✅ | 03/07/2026 · `05612ec` (merge, 28 commit) | Risolto con il sotto-progetto "Contabilità Clienti": ledger pagamenti polimorfico + credito cliente + query unificata su 4 superfici (Dashboard/Scadenzario/Contabilità cliente/admin-live). Vedi MEMORY.md §0 e `docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md` / `docs/superpowers/plans/2026-07-02-contabilita-clienti.md` per dettaglio. Fix collaterale: bug SW cache RSC (→A4) scoperto e risolto durante questo lavoro |
| B3 | Cicli produzione non generano fasi per lavori nuovi | ⏳ | | |
| B4 | `as any` nei PDF MDR (mascherato, non risolto) | ⏳ | | |
| B5 | Download DdC/Buono da portale impossibile | ⏳ | | |
| B6 | Service Worker non intercetta navigazione offline | ⏳ | | |
| B7 | "Invita tecnico" irraggiungibile da UI | ⏳ | | |
| B8 | 5 route CRUD → 404 | ⏳ | | |
| B9 | Lista pazienti non navigabile (BUG #13) | ✅ | 04/07/2026 · `ea2a3a9` | Fix `<Link href>` + pattern `ClientiSearchList`; dettaglio in `memory/MEMORY.md` §0 |
| B10 | `/api/fornitori` mancante, blocca ordini | ✅ | 04/07/2026 · `fab5437` | Nuova `GET /api/fornitori`, pattern identico a `listino` GET. Vedi dettaglio sotto e `memory/MEMORY.md` §0 |
| B11 | Colore bandito `#1B2D6B` su ogni card lavoro | ⏳ | | |
| B12 | Login WCAG-fail (`--ua-t2`/`--ua-t3`) | ⏳ | | |
| B13 | Zero test su `orchestraConsegna`/Stripe webhook | ⏳ | | |
| B14 | `tecnici.compenso_base` ambiguo | ⏳ | | |
| B15 | Banner Abbonamento contraddittorio | ⏳ | | |
| B16 | Query `/ordini` subquery non supportata | ⏳ | | |
| B17 | Fasi di lavorazione mai visibili in nessun PDF/Fascicolo Tecnico | ⏳ | | Scoperto 04/07/2026 durante analisi B3 — vedi dettaglio sotto |

### 🟠 Alto (19)
| ID | Titolo | Stato | Data/commit | Note |
|---|---|---|---|---|
| A1 | Push assente su nuova assegnazione lavoro | ⏳ | | |
| A2 | Nessun fallback offline/rete lenta | ⏳ | | |
| A3 | Bug login autofill email passkey | ⏳ | | |
| A4 | Cache versioning statico, no TTL | 🔄 | 03/07/2026 · `7fc181b` | Parzialmente risolto: `sw.js` ora esclude esplicitamente le fetch RSC (`_rsc=`, header `RSC`/`Next-Router-State-Tree`) dalla strategia stale-while-revalidate — era la causa di UI stale dopo mutazioni, scoperta durante B2. Restano aperti: versioning cache legato a `NEXT_PUBLIC_BUILD_ID` (non solo bump manuale `ua-v1→ua-v2`) e pulizia entry vecchie con TTL |
| A5 | `manifest.json` theme_color sbagliato | ⏳ | | |
| A6 | `qualita/page.tsx` 2 violazioni anti-pattern | ⏳ | | |
| A7 | Portale/Richiedi disconnessi | ⏳ | | |
| A8 | Zero notifica proattiva richiesta portale | ⏳ | | |
| A9 | Copy contraddittoria form richiesta | ⏳ | | |
| A10 | CTA "+" sparisce con lo scroll | ⏳ | | |
| A11 | Terminologia MDR troppo tecnica per operatore | ⏳ | | |
| A12 | ClienteComboBox senza aria-invalid | ⏳ | | |
| A13 | Odontogramma FDI hidden feature | ⏳ | | |
| A14 | Cassetta non visibile in lista lavori | ⏳ | | |
| A15 | Analytics superficiale | ⏳ | | |
| A16 | Export CSV incompleto (solo fatture) | ⏳ | | |
| A17 | Hydration error React #418 sistemico | ⏳ | | |
| A18 | Hash integrità firma DdC mancante | ⏳ | | |
| A19 | Nessun supporto per allegare il file di progettazione digitale (CAD/STL) | ⏳ | | Scoperto 04/07/2026 durante analisi B3 — vedi dettaglio sotto |

### 🟡 Medio (30) — vedi dettaglio nel corpo del documento sotto
| ID | Titolo | Stato | Data/commit | Note |
|---|---|---|---|---|
| M1 | KPI "Da fatturare" etichetta fuorviante | ⏳ | | |
| M2 | Nessun Background Sync | ⏳ | | |
| M3 | Cache-Control non immutabile asset statici | ⏳ | | |
| M4 | `will-change` assente | ⏳ | | |
| M5 | `<img>` senza lazy loading (4 residui) | ⏳ | | |
| M6 | Palette legacy vs rainbow v2.3 non migrata ovunque | ⏳ | | |
| M7 | Skeleton non conformi a `motion.ts` | ⏳ | | |
| M8 | Colori hardcoded non theme-aware residui | ⏳ | | |
| M9 | Bug copy-paste `boxShadow` auto-referenziale | ⏳ | | |
| M10 | `window.confirm()`/`alert()` nativi residui | ⏳ | | |
| M11 | Onboarding senza transizioni AnimatePresence | ⏳ | | |
| M12 | Nessuna CTA dopo fasi completate | ⏳ | | |
| M13 | Transizioni stato senza tooltip | ⏳ | | |
| M14 | Bottom nav tecnico mostra voci gestionali | ⏳ | | |
| M15 | Nessuna precompilazione ultimo cliente | ⏳ | | |
| M16 | "Medico richiedente" opzionale (rischio MDR) | ⏳ | | |
| M17 | Haptic feedback consegna assente | ⏳ | | |
| M18 | KPI "Accettati/Consegnati oggi" assente | ⏳ | | |
| M19 | Sticky header "Materiali ricevuti" assente | ⏳ | | |
| M20 | Tab default dashboard nasconde fatturato | ⏳ | | |
| M21 | `qualita/incidenti/nuovo` irraggiungibile | ⏳ | | |
| M22 | File orfani senza pagina corrispondente | ⏳ | | |
| M23 | Nessun DELETE per clienti | ⏳ | | |
| M24 | Nessun UPDATE da UI per magazzino | ⏳ | | |
| M25 | `fatture/[id]` zero azioni | ⏳ | | |
| M26 | Agenda 100% read-only | ⏳ | | |
| M27 | Nessun DELETE per ordini | ⏳ | | |
| M28 | `middleware` deprecato → `proxy` | ⏳ | | |
| M29 | 2 worktree paralleli non mergiati | ⏳ | | |
| M30 | `colorScheme: 'dark'` hardcoded su input date | ⏳ | | |

### 🟢 Basso (4)
| ID | Titolo | Stato | Data/commit | Note |
|---|---|---|---|---|
| D1 | Roadmap "Logo+firma DdC" disallineata | ✅ | 02/07/2026 | Corretto in ROADMAP-UFFICIALE.md in questa sessione |
| D2 | MEMORY.md claim "DS v2.3 100%" falso | ✅ | 02/07/2026 | Corretto in MEMORY.md in questa sessione |
| D3 | Documentazione/FAQ in-app assente | ⏳ | | |
| D4 | Script compliance DS ha 3 blind spot | ⏳ | | |

**Totale:** 70 item · 2 fatti (documentali) · 68 da fare

---

## 🔴 BLOCKER — rischio legale, dati o fiducia. Da trattare prima di qualunque nuova feature.

### B1. Tracciabilità MDR materiali/lotti strutturalmente rotta
**Fonte:** [Odt] · **Impatto:** ogni Dichiarazione di Conformità generata oggi ha la sezione "Materiali/Lotti" sempre vuota — esposizione diretta su un requisito esplicito dell'Allegato XIII MDR 2017/745.
**Causa:** `lavori_materiali` (letta da `DdcTemplate.tsx:257-261,396-399` via `orchestrate.ts:123`) non viene mai scritta da nessun codice/trigger/edge function. Il sistema parallelo più recente `scarichi_magazzino` (da `orchestrate.ts:338-347`) non valorizza mai `lotto_numero`, pur essendo commentato come "obbligatorio MDR Allegato XIII" in `supabase/migrations/20260520_bom_materiali_ordini.sql:44`.
**Fix:** valorizzare `lotto_numero` nell'insert di `scarichi_magazzino` (richiede collegare `listino_materiali_auto` a un lotto specifico di `lotti_magazzino`) + far leggere `generate-ddc.ts` da `scarichi_magazzino` invece che dalla tabella orfana `lavori_materiali`, oppure costruire una UI di inserimento lotto in `TabAccettazione.tsx`/`TabProduzione.tsx`.
**Effort:** non stimato dall'agente — richiede decisione di design (quale sistema diventa la fonte di verità).

### B2. Dashboard e Scadenzario danno risposte opposte su "chi deve pagare" — ✅ RISOLTO 03/07/2026
**Fonte:** [Tit] + [FT] (corroborazione indipendente, dati osservati identici: €36.185/245 clienti vs "nessun insoluto")
**Causa:** Dashboard (`supabase/migrations/008_dashboard_extended_kpi.sql:39-61`) calcola da `lavori`+`lavori_partitario`; Scadenzario (`src/app/api/scadenzario/route.ts:36-46`) legge solo `fatture` con `pagata=false AND stato_sdi != 'draft'`. Le due fonti non sono mai riconciliate. Causa radice reale (indagine 02/07/2026): `lavori_partitario` non ha mai avuto un writer applicativo, 0 righe anche in produzione.
**Fix applicato:** sotto-progetto "Contabilità Clienti" — ledger pagamenti polimorfico (`pagamenti`), decisione fatturazione per lavoro (`lavori.decisione_fatturazione`), credito cliente con eccedenze/rimborsi (`credito_clienti_movimenti`), `fatture.pagata`/`importo_pagato` derivati via trigger DB, query unificata `getCreditoScadutoPerCliente`/`getContabilitaCliente` usata identicamente da Dashboard, Scadenzario e Contabilità cliente. `lavori_partitario` droppata. 16 task, ogni task con review indipendente + review finale whole-branch (5 bug reali trovati e corretti solo grazie alla review adversariale, incluso questo stesso pattern di disaccordo tra superfici ri-emerso due volte durante l'esecuzione e corretto entrambe le volte).
**Dettaglio:** `docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md` (spec) · `docs/superpowers/plans/2026-07-02-contabilita-clienti.md` (piano + self-review + note sui fix) · `memory/MEMORY.md` §0.
**Effort:** ~16 task con subagent dedicati + 1 sessione di fix follow-up (SW cache, vedi A4).

### B3. Cicli di produzione non generano mai fasi per i lavori nuovi
**Fonte:** [Odt] (nuovo gap, non rilevato a maggio)
**Causa:** `TabProduzione.tsx:72` dice "assegna un ciclo nella tab Dati", ma `TabDati.tsx` (441 righe, letto per intero) non ha alcun selettore di ciclo. Nessun endpoint/trigger materializza righe `lavori_fasi` da `fasi_produzione` quando si crea un lavoro o si valorizza `ciclo_id`. I 277 lavori storici hanno fasi (dati di migrazione); ogni lavoro nuovo non le avrà mai.
**Fix:** in `src/app/api/lavori/route.ts` (creazione), quando la lavorazione selezionata ha un `ciclo_id`, generare automaticamente le righe `lavori_fasi` da `fasi_produzione`.
**Effort:** non stimato.

### B4. `as any` nei generatori PDF MDR — non risolto, solo mascherato
**Fonte:** [SWE], confermato anche da [Odt]
**Causa:** 9 cast-renderer `as any` in 8 file (`generate-ddc.ts:73`, `generate-dpa.ts:49`, `generate-ifu.ts:42`, `generate-buono.ts:28`, `generate-etichetta.ts:61,81`, `generate-nomina-prrc.ts:24`, `generate-ricevuta-consegna.ts:42`, `generate-cedolino-tecnico.ts:127`) sono identici a maggio, con l'unica differenza di un commento `eslint-disable-next-line` aggiunto sopra — il linter tace ma zero validazione type-safe è stata introdotta. +2 cast di accesso dati in `generate-ddc.ts:45,63`.
**Fix:** tipizzare le props di ogni template + funzione `validate*Props()` che lancia eccezione su dati incompleti, come raccomandato a maggio. Correggere separatamente i cast di accesso dati tipizzando le relazioni `paziente`/`lab`.
**Effort:** stimato a maggio 3-4 ore, non ancora impiegate.

### B5. Download DdC/Buono dal portale dentista strutturalmente impossibile
**Fonte:** [Den], verificato anche via query DB diretta (zero righe con `pdf_url` popolato su tutto il DB)
**Causa:** `ddc_signed_url`/`buono_signed_url` hardcoded a `null` in `src/app/api/portale/[token]/route.ts:134-135` e `src/app/portale/[token]/page.tsx:331-332`, indipendentemente dallo stato del lavoro. Il messaggio WhatsApp (`src/lib/consegna/whatsapp-template.ts:24-29`) promette esplicitamente "scarica i documenti" — promessa sempre falsa.
**Fix:** sostituire l'hardcoding con una query reale a `dichiarazioni_conformita` (join su `lavoro_id`) + `lavori.buono_pdf_url`, aggiungere pulsante download in `LavoroCard` quando `stato === 'consegnato'`.
**Effort:** stimato dall'agente 4-6 ore.

### B6. Service Worker non intercetta la navigazione offline
**Fonte:** [PWA], invariato da maggio, verificato empiricamente (offline hard-nav e soft-nav via `<Link>` finiscono entrambi su `chrome-error://chromewebdata/`)
**Causa:** `public/sw.js:29-30` — `if (request.mode === 'navigate') return`.
**Fix:** branch `navigate` con `caches.match(request)` + fallback `/offline.html`, come proposto a maggio.
**Effort:** poche righe, rischio basso — è il fix "facile" più segnalato e mai applicato.

### B7. "Invita tecnico" completamente irraggiungibile dalla UI — ✅ RISOLTO 03/07/2026
**Fonte:** [Sis] + [FT] (corroborazione indipendente)
**Causa:** a maggio il link era sbagliato (puntava a `/impostazioni`); oggi non c'è **alcun** link, verificato assente da bottom-nav, menu profilo, `/impostazioni`. `src/app/(app)/tecnici/page.tsx:49,117` puntano ancora a `/impostazioni`, che non contiene alcuna stringa "invita". L'unico endpoint di invito è `POST /api/admin/invite`, riservato a `admin_sistema` (Francesco), non al titolare.
**Fix applicato:** nuove route `/api/tecnici/invite` (POST/GET) e `/api/tecnici/invite/[id]` (DELETE) scoped al titolare (mai admin), componente `InvitaCollaboratoreSheet` (bottom sheet) sostituisce i link rotti in `/tecnici`, migration live estende `accept_invite_atomic()` per creare la riga `tecnici` mancante su accettazione. 12 task con TDD + review individuale + review finale whole-branch, 2 fix post-review applicate su Supabase live (error handling/stato sospeso in `upsertInvito`; idempotenza insert `tecnici` — bug reale di duplicazione trovato dalla review finale e corretto prima del merge). Mergiato su `main` (`fe81be6`) e deployato. Dettaglio completo: `memory/MEMORY.md` §0.
**Effort:** ~15 task con subagent dedicati + 1 fix post-review-finale su bug di idempotenza in produzione.

### B8. 5 route CRUD portano a pagine 404 — 4/5 ✅ RISOLTO 03/07/2026
**Fonte:** [Sis]
| Link | Destinazione mancante | Stato |
|---|---|---|
| `magazzino/page.tsx:71` CTA "aggiungi articolo" | `/magazzino/nuovo` | ✅ risolto 03/07/2026 — bottom sheet `MagazzinoAddSheet`, merge `a810c36`. Dettaglio: `memory/MEMORY.md` §0, spec/piano in `docs/superpowers/specs|plans/2026-07-03-b8-magazzino-nuovo*` |
| `listino/page.tsx:51` "Nuova voce" | `/listino/nuovo` | ✅ risolto 03/07/2026 — bottom sheet `ListinoNuovoSheet`, gating ruolo (CTA + `POST /api/listino` 403 per non titolare/admin_rete), worktree `worktree-b8-listino-nuovo` (commit `65287a2`/`9c1c17c`/`8049d72`, non ancora mergiato su `main`). Dettaglio: `memory/MEMORY.md` §0, spec/piano in `docs/superpowers/specs|plans/2026-07-03-b8-listino-nuovo*` |
| `qualita/rischi/page.tsx:175` "Modifica →" | `/qualita/rischi/[id]` | ✅ risolto 03/07/2026 — pagina a pagina intera (non sheet) con `RischiEditor.tsx`, nuova `PATCH /api/qualita/rischi/[id]` con ricalcolo RPN server-side e versioning automatico, nessun gating di ruolo (decisione esplicita), review finale whole-branch approvata, worktree `worktree-b8-rischi-id` (commit `cbefab8`/`923b851`/`2cd2c5d`/`6988675`/`8e302ff`, non ancora mergiato su `main`). Dettaglio: `memory/MEMORY.md` §0, spec/piano in `docs/superpowers/specs|plans/2026-07-03-b8-rischi-id*` |
| `rete/page.tsx:149` "Crea rete" | `/rete/nuova` | ✅ risolto e mergiato su `main` 03/07/2026 (commit `e84257f`) — bottom sheet `RetiNuovaSheet`, guard server-side 409 su `POST /api/rete` (1 rete per lab admin). QA aveva trovato un bug reale trasversale (submit sheet non cliccabile via touch a 390/768px per collisione z-index con la bottom-nav, riprodotto anche in `ListinoNuovoSheet` già in produzione) — risolto in entrambi i punti prima del merge (vedi anche riga `listino/page.tsx:51` sopra, hotfix separato). Dettaglio: `memory/MEMORY.md` §0, spec/piano in `docs/superpowers/specs|plans/2026-07-03-b8-rete-nuova*` |
| `rete/page.tsx:277` "Gestisci rete →" | `/rete/[id]` | aperto — B8 (5/5), ultima route |
**Fix:** creare le pagine mancanti, oppure sostituire i link con modal/sheet coerenti col pattern già usato altrove (es. `ListinoEditSheet`). Nota: `POST /api/magazzino`, `POST /api/listino` e `POST /api/rete` funzionano già. Per `rete/[id]` mancano ancora 4 API (GET singola rete, POST/DELETE membro, PATCH nome) — le tabelle `reti`/`reti_membri`/`rischi_tipo_dispositivo` esistono già a DB (non documentate in `ANALISI/23_ua_database_schema.md`, verificato in `src/types/database.types.ts`).
**Effort:** variabile per route, presumibilmente 1-3h ciascuna (magazzino/listino/rete-nuova) fino a mezza giornata per rete/[id] (API mancanti).

### B9. ✅ RISOLTO (04/07/2026, merge `ea2a3a9`) — Lista pazienti non navigabile (BUG #13, noto da tempo, mai risolto)
**Fonte:** [Sis]
**Causa:** `src/components/features/pazienti/PazientiSearchList.tsx:164-219` — ogni riga era un `<li><div>` senza `Link`/`href`/`onClick`, a differenza di `ClientiSearchList.tsx` che usa correttamente `<Link>`. `pazienti/[id]/page.tsx` esiste e funziona (R/U/D), ma zero occorrenze di `pazienti/${` in tutto `src/`.
**Fix applicato:** riga riscritta come `<Link href={\`/pazienti/${p.id}\`}>`, ristrutturata con lo stesso pattern flex+chevron di `ClientiSearchList.tsx`. TDD (test scritto e visto fallire prima), 371/371 test, tsc/build/DS-compliance puliti. Review finale: "Ready to merge: Yes", zero Critical/Important. Dettaglio completo: `memory/MEMORY.md` §0.
**Follow-up non bloccante aperto separatamente** (`spawn_task task_8422a838`): migrare la `<ul>` al layout `ua-list-grid` (responsive 1/2/3 colonne) già usato da `ClientiSearchList.tsx`, preesistente e fuori scope di questo fix.

### B10. ✅ RISOLTO (04/07/2026, merge fast-forward `fab5437`, pushato su `origin/main`) — `/api/fornitori` mancante, blocca creazione ordini
**Fonte:** [Sis]
**Causa:** `NuovoOrdineSheet.tsx:122-125` chiama `fetch('/api/fornitori')`, route inesistente nel repo. L'errore è ingoiato da `.catch(() => {})`, quindi il select "Fornitore" era sempre vuoto e i bottoni invio ordine (WhatsApp/Email) sempre disabilitati. Solo "Salva come bozza" funzionava.
**Fix applicato:** nuova `GET /api/fornitori` (`src/app/api/fornitori/route.ts`), stesso pattern già in produzione di `GET /api/listino` — auth via `getServerUserClient`, scoping lab via `utenti.laboratorio_id` con service client, query su `fornitori` filtrata `attivo=true AND deleted_at IS NULL`, ordinata per `ragione_sociale`, risposta mappata `{ fornitori: [{id, nome, telefono, email}] }` (la colonna DB è `ragione_sociale`, il frontend si aspettava `nome`). Nessuna migration necessaria, la tabella esisteva già in produzione. Nessun gating di ruolo (decisione esplicita, coerente con `listino` GET: è un lookup di sola lettura, dato non sensibile).
**Verifica automatica:** TDD (5 nuovi test scritti e visti fallire prima dell'implementazione — 401 non autenticato, 403 senza laboratorio, 200 con mapping corretto, 200 lista vuota, 500 su errore Supabase), 376/376 test totali, `tsc --noEmit`/`next build` puliti (route presente nel manifest di build).
**Review finale (code-reviewer):** "Ready to merge: Yes", zero Critical/Important. 5 finding Minor non bloccanti, quasi tutti pattern preesistenti condivisi con `listino/route.ts` (non regressioni introdotte da questo fix) — applicato subito il suggerimento a costo zero (`.limit(500)` difensivo sulla query, commit `fab5437`). **Hardening successivo (stesso giorno, commit `0215f02`, su richiesta esplicita di Francesco):** risolti anche gli altri 2 finding Minor "fixabili" — query `utenti` ora cattura `error` esplicitamente (500 invece di un 403 fuorviante su un vero fallimento DB), `error.message` grezzo di Supabase non più esposto nel body 500 (messaggio generico). 2 test di regressione TDD aggiunti, 377/377 totale. **Decisione esplicita:** non estendere lo stesso fix a `listino/route.ts` in questa sessione (stesso pattern condiviso, ma fuori scope di B10) — resta backlog per un giro di hardening trasversale futuro, stesso principio già applicato in B8.
**QA manuale in browser reale** (Playwright via `preview_*`, worktree/sessione con lab E2E isolato — mai il lab Filippo): fornitore di test inserito via query diretta (`scripts/seed-e2e.ts` non popola questa tabella), login `e2e-titolare@ua-test.local` → `/ordini` → "+ Nuovo ordine" → `GET /api/fornitori` osservata in rete con **200 OK** e payload `{ fornitori: [{ id, nome: "Dental Depot QA Test SRL", telefono, email }] }` → select "Fornitore" popolato correttamente nello sheet → selezionando il fornitore i bottoni "WhatsApp"/"Email" passano da disabilitati ("Fornitore senza numero WhatsApp"/"...email") ad abilitati ("Crea ordine e invia su WhatsApp"/"...via email") — comportamento atteso confermato end-to-end. Dato di test rimosso subito dopo (query diretta), baseline lab E2E verificata a 0 fornitori residui.
**Nota ambientale:** per eseguire la QA è stato necessario terminare (con conferma esplicita di Francesco) il dev server di un'altra sessione Claude già in esecuzione sulla stessa cartella — Next.js non permette due istanze `next dev` concorrenti sulla stessa directory, indipendentemente dalla porta.

### B11. Colore bandito `#1B2D6B` renderizzato come sfondo su ogni card lavoro
**Fonte:** [Des] + [Sis] (corroborazione indipendente)
**Causa:** CLAUDE.md vieta esplicitamente `#1B2D6B` come background. `LavoroCard.tsx:682` usa `var(--cobalt, #1B2D6B)` sulla progress-bar di ogni card non al 100% — ma `--cobalt` **non è mai dichiarata** in nessun file CSS del progetto, quindi il fallback banned è sempre quello effettivamente renderizzato, sulla pagina più visitata dell'app (`/lavori`). Stesso problema in `qualita/page.tsx:312`, `ToastNotifiche.tsx:26`, `OdontogrammaFDI.tsx:52-55,701,982`.
**Fix:** sostituire `var(--cobalt, #1B2D6B)` con `var(--c-blue, #3B82F6)` ovunque, oppure definire `--cobalt` esplicitamente in `globals.css` se si vuole preservare un navy distinto.
**Effort:** basso, ricerca-e-sostituzione mirata su 4 file.

### B12. Login page viola WCAG su una regola esplicitamente vietata da DS v2.3
**Fonte:** [Des]
**Causa:** `src/app/globals.css:245-246` (blocco `.login-root[data-login-theme="light"]`) usa `--ua-t2:#96918D` (2.2:1, WCAG FAIL) e `--ua-t3:#B8B3AE` (1.5:1, WCAG FAIL) — esattamente i due valori vietati dalla Regola 9 della spec v2.3. Si propaga a login, forgot-password, reset-password, billing, pagine blocked/sospeso. Invisibile a `check-ds-compliance.sh` perché lo script non scansiona `globals.css` né usa il prefisso `--ua-*`.
**Fix:** `--ua-t2:#96918D` → `#4A3D33`, `--ua-t3:#B8B3AE` → `#6B5C51`.
**Effort:** 2 minuti, impatto su 5+ pagine con una modifica sola.

### B13. Zero test su `orchestraConsegna` e Stripe webhook
**Fonte:** [SWE], invariato da maggio
**Causa:** `vitest.config.ts:19-22` esclude ancora `src/app/api/stripe/**` e `src/app/api/auth/**` dalla coverage, identico carattere per carattere a maggio. Nessun test in nessuno dei 17 file `tests/unit/` copre `orchestraConsegna` o il webhook Stripe.
**Fix:** aggiungere test per `orchestraConsegna` (happy path + precheck fallito) e per il webhook Stripe (idempotency su `stripe_events`, mapping evento→lab, comportamento su fallimento post-insert, mock SDK).
**Effort:** non stimato, verosimilmente 4-8 ore.

### B14. `tecnici.compenso_base` ancora semanticamente ambiguo
**Fonte:** [Tit], invariato da maggio (oltre un mese aperto)
**Causa:** `src/components/features/tecnici/ProduttivitaTecnico.tsx:307` — commento `// target mensile da tecnici.compenso_base` conferma l'ambiguità mai risolta. Nessun campo `stipendio_mensile_netto` introdotto.
**Fix:** decisione con Filippo sulla semantica (stipendio fisso o target commissioni?), poi migration + rinomina + UI esplicita.
**Effort:** 2-3 ore, mai impiegate nonostante segnalato due volte.

### B15. Pagina Abbonamento: "Attivo" + banner "trial in scadenza" contraddittori
**Fonte:** [Tit]
**Causa:** `src/app/(app)/impostazioni/abbonamento/page.tsx:25-27` — `isTrialExpiringSoon` calcola solo dalla vicinanza di `trial_ends_at`, **senza controllare `l.stato === 'trial'`**. Un account pagante può vedere "attiva il piano o perdi l'accesso", rischio di doppio addebito Stripe se l'utente tenta di "riattivare".
**Fix:** `const isTrialExpiringSoon = l.stato === 'trial' && l.trial_ends_at ? (...) : false`.
**Effort:** una riga, 5 minuti.

### B16. Query `/ordini` con subquery non supportata — eseguita ad ogni caricamento
**Fonte:** [SWE] + [Sis] + [FFD] (corroborazione tripla, byte-identica da maggio)
**Causa:** `src/app/(app)/ordini/page.tsx:104-125` — la query alle righe 104-111 usa `.lt('scorta_attuale', svc.from('magazzino').select('scorta_minima'))`, non supportata da Supabase-js, eseguita comunque e scartata (`void articoliData`); il risultato corretto viene dal fallback JS-side alle righe 114-125. Non è un bug visibile (il filtro JS produce il risultato giusto) ma spreca una round-trip di rete ad ogni load e scala male oltre 500 articoli.
**Fix (G6, mai applicato):** refactor con RPC Postgres dedicata o query con relazioni embedded Supabase.
**Effort:** stimato 2 ore a maggio.

### B17. Fasi di lavorazione mai visibili in nessun PDF/Fascicolo Tecnico
**Fonte:** [Sis], scoperto 04/07/2026 durante l'analisi di B3.
**Causa:** `generate-ifu.ts`, `generate-etichetta.ts` e `generate-ricevuta-consegna.ts` includono tutti `fasi:lavori_fasi(*, fase:fasi_produzione(*))` nella query di caricamento dati, ma **nessuno dei tre file usa mai quel campo nel rendering** del PDF — dati caricati e scartati. Non ancora visibile in produzione solo perché `lavori_fasi` è oggi sempre vuota (0 righe, vedi B3); appena B3 popola le fasi, il Fascicolo Tecnico continuerà a non elencarle, mancando il requisito esplicito dell'Allegato XIII MDR ("per ogni singola fase sarà riportato il nome dell'operatore esecutore ed in calce al documento le rispettive firme").
**Fix:** aggiungere una sezione "Fasi di lavorazione eseguite" ai template PDF pertinenti (probabilmente `generate-ifu.ts`, coerente col fatto che già carica il dato), con codice fase, descrizione, esito, data/ora esecuzione e operatore esecutore — quest'ultimo disponibile solo dopo il fix di `tecnico_id` fatto in B3.
**Effort:** non stimato — dipende dal completamento di B3 come prerequisito.

---

## 🟠 ALTO — impattano fiducia/compliance/usabilità in modo significativo

### A1. Push notification non collegata a nuova assegnazione lavoro tecnico
**Fonte:** [FTec] — `src/app/api/lavori/[id]/route.ts` (PATCH `tecnico_id`) non ha alcun `triggerPush*`. Il rientro prova invece funziona (`prove/route.ts:179-186`).
**Fix:** aggiungere `triggerPushToUser(tecnico_id, ...)` nel PATCH che assegna un lavoro.

### A2. Nessun fallback offline / rete lenta
**Fonte:** [FTec] + [PWA] — offline totale e rete a 20kbps producono errore nativo Chrome o schermo bianco 15s+, nessun banner "sei offline".
**Fix:** collegato a B6 (SW navigate intercept) + banner UI dedicato.

### A3. Bug login: autofill email passkey sovrascrive input manuale
**Fonte:** [FTec] — `src/app/(auth)/login/login-form.tsx:186-192` rilegge `localStorage.ua_passkey_email` e forza `setEmail()`, causando switch involontari di account su device condivisi (laboratorio con più tecnici sullo stesso tablet).
**Fix:** non sovrascrivere un valore digitato manualmente dall'utente nella sessione corrente.

### A4. Cache versioning statico, nessun TTL — ✅ RISOLTO DEFINITIVAMENTE 03/07/2026
**Fonte:** [PWA] — `sw.js:1` bumped manualmente `ua-v1→ua-v2`, nessun build timestamp, nessuna pulizia delle 60+ varianti RSC in cache.
**Fix:** iniettare `NEXT_PUBLIC_BUILD_ID` nel nome cache via step di build, escludere `_rsc=` dalla strategia di caching o applicare stale-while-revalidate con limite entry.
**Fatto (parte 1, durante B2):** l'esclusione delle fetch RSC (header `RSC`/`Next-Router-State-Tree`) dal cache stale-while-revalidate. Causa scoperta durante il sotto-progetto B2: queste fetch (emesse da `router.refresh()`, navigazione client-side, prefetch `<Link>`) venivano servite dalla cache anche quando Next le marca esplicitamente `Cache-Control: no-cache, must-revalidate`, causando UI stale dopo ogni mutazione finché non si ricaricava manualmente la pagina — bug reale confermato con evidenza diretta (header di risposta) e verificato via Playwright dopo il fix.
**Fatto (parte 2, 03/07/2026, merge `4a36f89`):** versioning automatico del nome cache. `public/sw.js` è ora un file generato (gitignored) da `scripts/generate-sw.mjs` a partire dalla fonte tracciata `scripts/sw-template.js`; `CACHE_NAME` = `ua-<build-id>` risolto in ordine `VERCEL_GIT_COMMIT_SHA` (troncato a 8 caratteri) → `git rev-parse --short=8 HEAD` locale → `Date.now()` di fallback, mai un crash della build; `'dev'` fisso in sviluppo. Hook npm `prebuild`/`predev` lo eseguono automaticamente, sostituendo il bump manuale. **Pulizia TTL esplicitamente esclusa** (decisione in brainstorming): con le fetch RSC già escluse dalla parte 1, ciò che resta cacheable è un set piccolo e fisso di asset statici di `public/` le cui chiavi vengono sovrascritte a ogni deploy, non accumulate — nessun problema reale da risolvere (YAGNI). Spec: `docs/superpowers/specs/2026-07-03-a4-cache-versioning-design.md`.

### A5. `manifest.json` theme_color ancora sbagliato
**Fonte:** [PWA], invariato da maggio — `#0F1E52` invece di `#D90012`, mismatch con `layout.tsx:22`. Anche `offline.html` usa il colore vecchio.
**Fix:** allineare a `#D90012` in entrambi i file.

### A6. `qualita/page.tsx`: 2 violazioni anti-pattern invisibili al gate automatico
**Fonte:** [Des] — `gold-come-testo` (riga 21, applicato riga 293) e `var(--cobalt, #1B2D6B)` mai definita (riga 312) — collegato a B11.
**Fix:** `var(--gold)` → `var(--c-amber)`; vedi B11 per `--cobalt`.

### A7. Portale e Richiedi disconnessi — nessuna navigazione incrociata
**Fonte:** [Den] — nessun link da `/portale/[token]` verso `/richiedi/[token]` e viceversa; il laboratorio deve condividere 2 URL diversi, il bottone "Condividi" manda solo il link di stato.
**Fix:** aggiungere pulsante "➕ Richiedi nuovo lavoro" nel portale e "← Torna allo stato lavori" nella schermata di successo della richiesta. Stimato 30 min.

### A8. Zero notifica proattiva su richiesta dal portale
**Fonte:** [Den] — nessuna email/SMS quando un dentista invia una richiesta, nessun avviso quando lo stato lavoro cambia lato dentista.
**Fix:** email di conferma via Resend (già configurato altrove) al submit di `/api/portale/richiedi`. Stimato 2-3h.

### A9. Copy contraddittoria nel form richiesta portale
**Fonte:** [Den], segnalata anche a maggio, mai corretta — `RichiestaClientForm.tsx:200-209` dice sia "ha ricevuto" sia "ti contatteranno per la conferma" nella stessa schermata.
**Fix:** scegliere un solo messaggio coerente. Stimato 5 min.

### A10. CTA "+" sparisce durante lo scroll
**Fonte:** [UX], invariato da maggio — `BottomNavPill.tsx:429-450`, l'intero `motion.div` (CTA inclusa) condizionato da `{visible && ...}`.
**Fix:** separare il bottone "+" dal resto della pill, sempre visibile.

### A11. Terminologia "MDR Allegato XIII" ancora esposta all'operatore
**Fonte:** [UX] — `TabAccettazione.tsx:285,565` — solo un tooltip aggiunto, intestazione e progress bar restano tecniche.
**Fix:** rinominare in "Materiali ricevuti" mantenendo il riferimento normativo solo nel tooltip.

### A12. ClienteComboBox priva di attributi accessibilità
**Fonte:** [UX], nuova regressione — `ClienteComboBox.tsx:180-200` non imposta `aria-invalid`/`aria-describedby`, a differenza degli altri campi dello stesso form.
**Fix:** propagare `aria-invalid={hasError}` e `aria-describedby`.

### A13. Odontogramma FDI resta "hidden feature"
**Fonte:** [UX] + [Odt] — nessun badge/hint, raggiungibile solo esplorando le tab sbloccate post-creazione, isolato in `TabClinica.tsx`.
**Fix:** badge "Nuovo" o hint in dashboard/onboarding.

### A14. Cassetta non visibile in lista lavori
**Fonte:** [Odt], invariato — stimato 1 ora a maggio, mai fatto. `LavoroCardProps` non ha campo `cassetta`.
**Fix:** aggiungere badge cassetta nella card, dato già in DB.

### A15. Analytics resta superficiale
**Fonte:** [Tit] — solo aggiunto un grafico "Fatturato 12 mesi"; mancano margine, top 5 clienti, % rifacimenti, lead time — tutti richiesti a maggio.
**Fix:** portare in `/analytics` almeno margine (già calcolato in dashboard, riusabile) + un confronto per cliente/dispositivo.

### A16. Export CSV incompleto per il commercialista
**Fonte:** [Tit] — solo fatture esportabili; mancano export lavori/analytics e cedolini tecnici in batch.
**Fix:** nuovi endpoint `GET /api/lavori/export`, `GET /api/tecnici/cedolini-batch`.

### A17. Hydration error React #418 sistemico
**Fonte:** [Sis] + [Tit] + [PWA] (corroborazione tripla) — 9 occorrenze di `new Date()`/`localStorage` in rendering server-first senza mitigazione (`DashboardTitolare.tsx:107-119,632,677-683,883`, `DashboardTecnico.tsx:86-92,167,262-269` incoerente, `SpotlightCard.tsx:37-46`, `TaskItem.tsx:47-54`, `AnnullaConsegnaBanner.tsx:16-19`). Causa confermata: server UTC vs client Europe/Rome producono testo diverso tra le 12:00-13:59 locali ogni giorno.
**Fix:** spostare il calcolo in `useEffect`+`useState` con placeholder neutro iniziale, o `suppressHydrationWarning` mirato e coerente (oggi applicato solo in un punto su due della stessa funzione).

### A18. Hash di integrità firma DdC mai calcolato
**Fonte:** [SWE] — `generate-ddc.ts:60` ha `firma_ddc_sha256: null` hardcoded. Il rendering visivo di logo+firma **funziona già** (`DdcTemplate.tsx:246,294-296,465-472`), ma manca l'evidenza di integrità ai fini MDR.
**Fix:** calcolare l'hash SHA-256 della firma al momento della generazione. **Nota:** la roadmap attuale segna "Logo + firma DdC" come ⏳ non iniziato — è falso, va corretto (vedi sezione documentazione).

### A19. Nessun supporto per allegare il file di progettazione digitale (CAD/STL)
**Fonte:** [Sis], scoperto 04/07/2026 durante l'analisi di B3.
**Causa:** `lavori.file_stl_url` esiste come colonna a DB ed è persino letta in `src/app/api/fatture/[id]/xml/route.ts:123` e `src/app/api/fatture/batch/route.ts:146`, ma **nessuna UI la valorizza mai** — zero upload, zero visualizzazione. La fase "Analisi e progettazione (CAD)" del flusso di lavorazione reale (tra accettazione impronte e costruzione/fresatura) resta quindi priva di qualunque tracciamento del file di progettazione digitale nell'app.
**Fix:** aggiungere un campo di upload file STL/CAD (pattern già esistente per `scheda_tecnica_url`/`scheda_sicurezza_url` in magazzino, B8 1/5) in una tab pertinente (`TabProduzione`/`TabDati`), con storage su Supabase Storage.
**Effort:** non stimato — non bloccante, funzionalità mai esistita (non una regressione).

---

## 🟡 MEDIO — debito tecnico e rifiniture, non bloccanti

- **M1.** KPI dashboard "Da fatturare" in realtà filtra `stato='pronto'` (pronti da **consegnare**, non da fatturare) mentre la lista fatturabile richiede `stato='consegnato' AND incluso_in_fattura=false` — etichetta fuorviante. [Tit] — `supabase/migrations/002_fase2_schema.sql:327-328` vs `fatture/page.tsx:118`.
- **M2.** Nessun Background Sync — dati persi se la connessione cade durante una consegna. [PWA], invariato.
- **M3.** Cache-Control non immutabile per asset statici (`cache-control: public, max-age=0, must-revalidate` anche su `/_next/static/`). [PWA]
- **M4.** `will-change` assente per animazioni transform, 0 occorrenze nel codebase. [PWA], invariato.
- **M5.** 4 tag `<img>` raw senza `loading="lazy"` residui (`TabImmagini.tsx:433,592`, `portale/[token]/page.tsx:357`, `RichiestaClientForm.tsx:250`). [PWA]
- **M6.** Palette semantica a due sistemi paralleli: molte pagine business (fatture, qualità, rete, tecnici, agenda, analytics, clienti, ordini) usano ancora variabili "legacy" (`--amber`, `--gold`, `--success`) invece della palette rainbow v2.3 (`--c-*`) — migrazione dichiarata "fatta" ma parziale. [Sis] — es. `qualita/psur/page.tsx:108,117` mischia le due nello stesso alert box.
- **M7.** Skeleton non conformi a `motion.ts`: ~14 file usano `1.4s` hardcoded invece del token `1.50s`, e colori light hardcoded senza variante dark. [Sis]
- **M8.** Colori hardcoded non theme-aware residui: `DashboardFrontDesk.tsx:18,456`, `ProduttivitaTecnico.tsx:169`, `magazzino/[id]/page.tsx:61,72`, `MagazzinoDeleteButton.tsx:47-49`, `ScadenzarioList.tsx:40,380`, `ListinoVoceRow.tsx:400`, `impostazioni/profilo/page.tsx:90`. [Sis]
- **M9.** Bug copy-paste `boxShadow: 'var(--sh-b, var(--sh-b))'` in `analytics/page.tsx:101` e `listino/page.tsx:91,126`. [Sis]
- **M10.** `window.confirm()`/`alert()` nativi residui invece di componenti custom (`TecnicoDeactivateButton.tsx:17`, `TecnicoEditInline.tsx:30,50`, `MagazzinoDeleteButton.tsx:16,25,29`). [Sis]
- **M11.** Onboarding wizard senza transizioni `AnimatePresence` tra step, nonostante `motion.ts` le definisca (`storytellingVariants.onboardingStep`). [Sis]
- **M12.** Nessuna CTA quando tutte le fasi produzione sono completate (suggerimento passaggio a pronto/prova). [FTec], invariato — stimato 20 min a maggio.
- **M13.** Transizioni di stato lavoro ancora senza tooltip esplicativo — componente `SheetAction` supporta già il prop `sub`, mai passato per le opzioni di cambio stato (`LavoroCard.tsx:973-981`). [FTec], invariato — 1 riga per opzione.
- **M14.** Bottom nav tecnico mostra voci gestionali (Fatture, Sospesi) — da verificare se voluto o gap di role-scoping. [FTec], nuova osservazione.
- **M15.** Precompilazione ultimo cliente usato nel form nuovo lavoro non implementata (localStorage). [FT], quick win da maggio.
- **M16.** "Medico richiedente" resta campo opzionale — rischio tracciabilità MDR se lo studio ha più medici. [FT] + [Odt], invariato.
- **M17.** Haptic feedback su bottone CONSEGNA ancora assente (solo audio). [FFD], invariato.
- **M18.** KPI "Accettati/Consegnati oggi" su dashboard front desk ancora assente. [FFD], invariato.
- **M19.** Sticky header sezione "Materiali ricevuti" non implementato. [FFD], invariato.
- **M20.** Tab default dashboard titolare è "Produzione" invece di "Gestione business" — il fatturato è dietro un tap extra + prompt biometrico. [FT], nuova osservazione.
- **M21.** Feature orfane raggiungibili solo via URL diretto: `qualita/incidenti/nuovo` (form funzionante, nessun link). [Sis]
- **M22.** File orfani senza pagina corrispondente: `tecnici/[id]/{loading,error}.tsx` senza `page.tsx`; `qualita/incidenti/error.tsx` senza `page.tsx`/`loading.tsx`. [Sis]
- **M23.** Nessun DELETE per clienti (`src/app/api/clienti/[id]/route.ts` solo GET/PATCH). [Sis]
- **M24.** Nessun UPDATE da UI per `magazzino/[id]` pur esistendo `PATCH /api/magazzino/[id]`. [Sis]
- **M25.** `fatture/[id]/page.tsx` zero azioni: niente segna-pagata, niente download PDF/XML (`pdf_url` caricato ma mai usato in JSX). L'azione "segna pagata" esiste solo da `/scadenzario/[cliente_id]`. [Sis]
- **M26.** Agenda 100% read-only, nessun link dagli item verso il lavoro collegato. [Sis]
- **M27.** `src/app/api/ordini/[id]/route.ts` senza DELETE — nessuna UI per annullare/evadere un ordine dopo la creazione. [Sis]
- **M28.** Next.js 16.2.6 segnala `middleware` deprecato, da migrare a `proxy` — non bloccante. [Sis] + [SWE]
- **M29.** Due git worktree paralleli non mergiati (`plan-c-dashboard-rbac`, `dashboard-v2-rewrite`) da verificare se ancora attivi, rischio drift silenzioso. [SWE]
- **M30.** `colorScheme: 'dark'` hardcoded su un `<input type="date">` in `qualita/incidenti/nuovo/page.tsx:192`, indipendente dal tema attivo. [Sis]

---

## 🟢 BASSO — debito documentale, da correggere per igiene ma non urgente

- **D1.** `ROADMAP-UFFICIALE.md` segna "Logo + firma DdC" come ⏳ non iniziato — **falso**, il rendering è implementato (vedi A18 per l'unico pezzo mancante, l'hash di integrità). [SWE] + [Odt]
- **D2.** `MEMORY.md` dichiara "Design System v2.3 — implementazione completa al 100%" — **falso**, verificato: login WCAG-fail (B12) + violazioni residue in `qualita/page.tsx` (A6) + migrazione palette solo parziale su molte pagine business (M6). [Des] + [Sis]
- **D3.** Documentazione/FAQ in-app assente. [Tit], invariato, bassa priorità.
- **D4.** `scripts/check-ds-compliance.sh` ha 3 blind spot strutturali: non scansiona `.css`, non rileva colori passati per lookup object (es. `gravitaColor[x]`), non rileva variabili CSS referenziate ma mai dichiarate (es. `--cobalt`). [Des] — da estendere prima del prossimo audit visivo.

---

## Feature roadmap confermate NON iniziate (nessun codice presente)

| Feature | Stato reale verificato |
|---|---|
| Dettatura vocale (Web Speech API) | Zero codice — `grep SpeechRecognition` → 0 risultati. [Odt] + [SWE] |
| Email template branding (Supabase) | ✅ COMPLETO 04/07/2026 — rebrand DS v2.3 applicato ai 3 template Auth (Confirm Signup, Reset Password, Invite User) su Supabase Dashboard, verificato con invio reale (reset password). Dettaglio: `memory/MEMORY.md` §0. [SWE] |
| Magazzino visivo | Non iniziato, confermato in roadmap V2.0. |
| Sezione Rete funzionale multi-lab | Solo skeleton — la UI esiste ma **due CTA principali portano a 404** (vedi B8). [Sis] |
| Cronometro fase tecnico | Non iniziato, pianificato V1.7 — coerente con la roadmap, non un gap nuovo. [FTec] |

---

## Nota metodologica sull'audit che ha generato questo backlog

Il re-audit del 2 luglio 2026 (11 agenti, `docs/audit-2026-07-02/`) ha operato in condizioni di sessione di produzione condivisa con processi E2E automatici concorrenti, che ha causato interferenze (login intercalati, sessioni scadute) mitigate ma non azzerate — vedi `docs/audit-2026-07-02/SINTESI-ORCHESTRATORE.md` §0 per il dettaglio. Ogni item di questo backlog è però verificato via lettura diretta del codice sorgente deployato, non solo osservazione a video, e nella maggior parte dei casi da almeno un agente che ha citato il file:riga esatto. Dove due o più agenti indipendenti hanno confermato lo stesso problema, è segnalato come "corroborato".

**Raccomandazione per il prossimo audit:** eseguire con token/ambiente isolato dal test E2E schedulato.
