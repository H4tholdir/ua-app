# Ledger SDD — Parete delle Cassette (19 task)

**Piano:** `docs/superpowers/plans/2026-07-21-parete-cassette.md`
**Worktree:** `.claude/worktrees/parete-cassette` · **Branch:** `worktree-parete-cassette`
**Base branch:** `main` @ `4853458` · **Baseline test:** 2319 passed / 19 skipped (283 file)
**Gate 🛑:** (1) Task 1 apply migration · (2) Task 18 mockup 4 miniature · (3) merge finale

## Stato

- **Task 1 — RIFATTO dopo il panel.** Commit `a9bcb23`: **3 migration** (DDL+RPC · patch
  `admin_delete_laboratorio` · backfill+audit), collaudate su Postgres 16.13 usa-e-getta.
  **NON applicate.** Decisioni ratificate da Francesco: `task-1-decisioni-ratificate.md` (R-1…R-6).
  Sintesi del panel: `panel-sintesi.md`.
  → In corso: **audit indipendente 2×** richiesto da Francesco prima di ratificare l'apply
  (`audit-indipendente-correttezza.md` empirico/adversariale · `audit-indipendente-completezza.md`
  contratti e impatto sui task a valle). Poi si ripropone il gate apply.
- **Task 1 (1º tentativo)** — migration trascritta verbatim dal piano (`e1fa4fd`), **bocciata**.
  Review (opus, task-scoped): **Needs fixes** — 1 Critical + 7 Important **dentro l'SQL ratificato**.
  Dossier findings: `.superpowers/sdd/task-1-review-findings.md`.
  Francesco (21/07) ha chiesto un **panel advisor** su (Q1) correggere prima dell'apply,
  (Q2) collisione FK con `admin_delete_laboratorio`. Panel 3× convocato:
  `panel-architetto.md` · `panel-backend.md` · `panel-security.md`.
  → in attesa dei verdetti; poi fix subagent, ri-review, e RIPROPORRE il gate apply a Francesco.
- **Task 2** — **DONE_WITH_CONCERNS**. Commit `f0f3311` "feat(cassette): mappa miniatura per
  tipo di lavoro (3 livelli)" (`src/lib/domain/miniature-lavoro.ts` +
  `tests/unit/miniature-lavoro.test.ts`, RED→GREEN reale, 3/3 test). GRANULARE corretto sugli id
  reali di `TIPI_LAVORO` (dettaglio in `task-2-report.md`). Concern wave-wide aperto: vedi
  Findings Minor sotto (`vitest.config.ts` non scopre `__tests__` colocati — impatta i task 3→19).
- **Task 2: COMPLETO** (commit `e1fa4fd..03f16a7`, review **Approved**).
  Review (sonnet): spec ✅, tutte e 11 le chiavi `GRANULARE` verificate una a una contro i 38 id
  reali di `TIPI_LAVORO`, zero voci morte, RED genuino (non un «No test files found»).
  Un Important — livello granulare coperto davvero da 1 asserzione su 3 (`'Provvisorio in resina'`
  non matcha `cercaTipiLavoro`: la parola «in» spezza la ricerca per sottostringa, quindi passa dal
  macro) — **chiuso dal controller** in `03f16a7` con 2 asserzioni **additive** dove macro e granulare
  divergono (`'PMMA'`/`'altro'`→provvisorio, `'Toronto'`/`'altro'`→impianto): possono passare solo
  via `GRANULARE`. Nessuna asserzione preesistente toccata (il piano vieta di ammorbidirle).
  4/4 verdi.
- Task 3→19 — bloccati dal gate 1 (servono i tipi rigenerati post-apply).

## Findings Minor (per la review finale whole-branch)

Da `task-1-review-findings.md` §Minor — 8 voci sulla migration (etichetta `liberato_per` in
auto-riparazione, assert `laboratorio_id` mancanti in 2 UPDATE, `p_colore` senza esito,
`ult` codice morto, riga `'spostamento'` spuria, `PERFORM … FOR UPDATE` ridondante,
`updated_at` bumpato dal get-or-create — attenzione: il Task 3 ordina le chip su quel campo —,
policy senza `TO authenticated`).

- **[Task 2] `vitest.config.ts` non scopre i test colocati `src/**/__tests__/**` — impatta
  l'intera ondata, non solo Task 2.** `test.include` (root `vitest.config.ts`) è scoped a
  `tests/unit/**/*.test.ts(x)` e `tests/integration/**/*.test.ts` SOLO. Il piano
  (`docs/superpowers/plans/2026-07-21-parete-cassette.md`) usa path `__tests__` colocati per
  **tutti e 19 i task** (es. task 3 `src/lib/cassette/__tests__/parco-shared.test.ts`, task 10
  `src/components/ds/__tests__/Cassetta.test.tsx`, ecc.) — nessun task modifica
  `vitest.config.ts` per estendere lo scope (grep `vitest\.config` su piano/spec/decisioni: 0
  risultati). Confermato empiricamente: `npx vitest run src/lib/domain/__tests__/miniature-lavoro.test.ts`
  con la config attuale dà `No test files found`, non un RED reale — indipendentemente dal
  contenuto del test. Corroborazione che è un'assunzione sbagliata del piano (non una
  convenzione nuova deliberata): il Task 15 istruisce "aggiorna
  `src/lib/dashboard/__tests__/tutto-il-resto.test.ts`" ma quel file lì **non esiste** — esiste
  realmente come `tests/unit/tutto-il-resto.test.ts`, la convenzione flat oggi reale in tutto il
  repo (nessun `src/**/__tests__/` in git history prima di questa ondata; `tipi-lavoro.ts`,
  `prezzo-lavoro.ts`, `cicli-produzione.ts` sono tutti testati da `tests/unit/*.test.ts`).
  Rilevante anche per il Task 19 Step 3 (FASE 7): `npx vitest run` (bare) deve dare "baseline
  2319 + nuove" verdi — impossibile se i task 3→19 seguono i path colocati dei loro brief senza
  che `vitest.config.ts` venga esteso in qualche punto dell'ondata.
  **Non risolto da Task 2** (deliberatamente — fix di config condivisa è decisione wave-wide,
  fuori scope per un singolo task; dettaglio del ragionamento in `task-2-report.md`). Task 2 ha
  aggirato il problema mettendo il proprio test in `tests/unit/miniature-lavoro.test.ts` (path
  reale, zero modifiche a file condivisi, RED/GREEN genuini).
  **Raccomandazione:** l'orchestratore decida ORA, prima che i task 3→19 colpiscano lo stesso
  muro: (a) estendere `vitest.config.ts` → `include` con `'src/**/__tests__/**/*.test.ts'` e
  `'src/**/__tests__/**/*.test.tsx'` come step infra dedicato (probabilmente il più fedele
  all'intento del piano, dato l'uso pervasivo), oppure (b) correggere i path `__tests__` nei
  brief dei task 3→19 a `tests/unit/*.test.ts` (fedele alla convenzione reale attuale, zero
  rischio di config condivisa toccata da task potenzialmente paralleli). Chiunque esegua i task
  successivi rilegga questa voce PRIMA di scegliere dove mettere il proprio file di test.

## Audit indipendenti (richiesti da Francesco prima di ratificare l'apply) — ESITI

- **`audit-indipendente-completezza.md`** → **COMPLETO CON LACUNE**. Nessun codice manca; R-1…R-4, R-6
  rispettate; perimetro R-3 asciutto (il fix di classe NON è stato implementato, come voluto).
  7 task a valle impattati (3, 4, 5, 6, 8, 9, 19), 2 bloccanti: **Task 6** non compila senza `p_lab`,
  **Task 3** ordina le chip sul campo sostituito da R-4.2. 16 punti di spec/piano da emendare a FASE 11.
- **`audit-indipendente-correttezza.md`** → **SICURO CON RISERVE** (riserve di *runtime*, non di apply).
  DB ricostruito con 69 migration reali; ~39.550 statement concorrenti. `proconfig` conservato,
  cancellazione tenant senza residui, isolamento multi-tenant impeccabile su tutte e 8 le RPC,
  backfill idempotente al 2º giro, nessuna targa persa fuori dall'audit. **Tutti i 14 finding del
  panel: chiusi e verificati.** Ma 2 Important NUOVI, entrambi riprodotti:
  **D1** `rinomina` legge l'occupante senza lock → targa orfana / desync (osservato naturalmente
  1×/19.200) · **D2** un ramo di `assegna` prende il lock `dashboard_kpi_cache` prima della riga
  storico → deadlock 40P01 con `libera` e con un altro `assegna` (riprodotto 5×).
  Più **D3** (Medium): `GRANT EXECUTE` superfluo espone via PostgREST una funzione che distrugge
  lo storico di un tenant.

**Discrepanza fra i due auditor, risolta dal controller:** «≥5 esiti nuovi» (correttezza) vs «1 solo»
(completezza). Estratti gli esiti reali per RPC e confrontati col piano: **uno solo è davvero nuovo**
(`lavoro_non_valido` in `riassegna_post_annullo`). `motivo_non_valido`, `nome_non_valido` e
`niente_da_trasferire` erano **già nell'SQL ratificato**: mancavano dalla tabella §4.3, che è
incompleta dall'origine. → Da sanare a FASE 11.

**Ratificato da Francesco:** `lavoro_non_valido` in `riassegna_post_annullo` → **sostituito con
`niente_da_riassegnare`** (riuso, contratto §4.3 resta a 3 esiti, Task 8 non cambia).

→ In corso: workflow `parete-fix-e-verifica-avversariale` — fix D1/D2/D3/D5 + esito, poi 4 lenti
avversariali indipendenti in container separati (porte 5441-5444).

## 🔚 SESSIONE CHIUSA 21/07 — riprendere dal Task 3 in sessione NUOVA

8 commit sul branch (`4853458..2c00948`), **worktree pulito**, niente mergiato né pushato.
**Handoff di ripresa:** `docs/roadmap/2026-07-21-parete-cassette-ripresa-task3.md`.
**Il piano è già corretto** — blocco «STATO AL 21/07» in testa + «CORREZIONI 21/07» dentro ai task
3, 4, 5, 6, 8, 9, 19: il `task-brief` li estrae da solo, non serve rileggere gli audit per implementare.
BP-1 fatto: MEMORY.md (24), ROADMAP-UFFICIALE.md, SESSION_ACTIVE.md, CLAUDE.md §8 — tutti nel **main
tree**, non committati (come li aveva lasciati la sessione precedente).

## ✅ TASK 1 COMPLETO — migration APPLICATA (21/07, gate 1 autorizzato da Francesco)

`npx supabase db push --linked` → le 3 migration applicate pulite al progetto `iagibumwjstnveqpjbwq`.
**FASE 6b eseguita:** `gen types` (5.897 → 6.072 righe, nessun messaggio CLI spurio in coda; presenti
tutte e 3 le tabelle + 8 RPC + `cassette_purge_lab`) · `npx tsc --noEmit` → **exit 0**.
Commit dei tipi: `971a6cd`.

**Verifica post-apply sul DB live (read-only, via `SUPABASE_DB_URL`):**
- Invarianti I1/I2 (doppie righe vive) = **0 / 0**; I3/I4 (targhe orfane / disallineate) = **0 / 0**.
- Privilegi: `cassette` e `cassette_lavori` → `{authenticated=r, service_role=r}` — **sola lettura**,
  come progettato. `cassette_backfill_audit` → solo `postgres` + `service_role`, nessun `authenticated`.
- **La trappola `proconfig` è chiusa sul DB vero:** `admin_delete_laboratorio` ha
  `prosecdef=true` e `proconfig={search_path=public, pg_temp}` **dopo** la patch.
  `cassette_lavori_guard` correttamente `prosecdef=false` con search_path.

### ⚠️ Scoperta: il backfill ha operato su un insieme VUOTO

**288 lavori in DB, ZERO con `numero_cassetta`** — in nessuno stato (223 consegnati, 52 in ritardo,
7 ricevuti, 5 pronti, 1 annullato; `con_targa = 0` ovunque). La colonna non è mai stata popolata.
Il backfill è un no-op perché non c'era nulla da migrare, **non** perché sia fallito.

**Conseguenze da propagare:**
1. Tutta la macchina del backfill (collisioni, natural sort, troncamento, tabella di audit) ha girato
   a vuoto. Resta corretta e collaudata, ma non ha mai toccato un dato.
2. **La nota tracciata per il «Cerca» globale (Punto 3) DECADE**: «i consegnati pre-cutoff hanno il
   residuo `numero_cassetta` e nessuna riga storico → unire due fonti». Non c'è nessun residuo:
   `numero_cassetta` è NULL su tutti e 288. La ricerca avrà **una sola fonte**, lo storico.
   → Da correggere in spec §2/§9.2, nell'handoff e in MEMORY alla FASE 11.
3. Il seed E2E (Task 19) è l'**unica** fonte di cassette per la QA: senza di esso la parete è vuota
   ovunque. Alza la priorità del Task 19 Step 1 rispetto alla QA di FASE 9.

## Stato al gate apply — commit `8387125`

**3 migration pronte, NON applicate.** Storia: `a9bcb23` (rifacimento post-panel) → `18bdd98`
(fix D1/D2/D3/D5) → `8387125` (fix E1/E2/E8 + ordine lock documentato).

**Chiuso e verificato in A/B** (due template completi da 79 migration reali ciascuno):
E1 `trasferisci` 6/6 deadlock col vecchio → 0/6 col nuovo · E2 targa orfana su lavoro **aperto**
riprodotta col vecchio → invarianti pulite col nuovo · E8 `DELETE 2` col vecchio →
`permission denied` col nuovo, **mentre** SELECT `service_role`, lettura `authenticated` sotto RLS,
tutte e 8 le RPC e `admin_delete_laboratorio` continuano a funzionare. D1 e D2 reggono ancora.
Esiti delle RPC `diff`-identici fra vecchio e nuovo (R-5 rispettata).

**Aperto per scelta, NON blocca l'apply** — coda di deadlock che fa rollback pulito (E5, E7, E9, E11)
+ E12: **contratto di retry sul 40P01 per i Task 4/5/8/9**, inciso nel commento d'intestazione della
migration. Criterio di arresto adottato: *l'SQL garantisce la correttezza, la route ritenta il 40P01*.
Inseguire ogni deadlock sotto contesa sintetica non converge.

**Calibrazione che giustifica il criterio:** `20260710091500_rpc_consegna_annullo_atomiche.sql` fa
già due `UPDATE lavori` nella stessa transazione, è in produzione dal 10/07 e non ha mai prodotto
deadlock → la concorrenza reale per laboratorio è bassa. `trg_dashboard_lavori` è preesistente e
vale per tutta l'app.

**Pre-apply:** ledger `supabase migration list --linked` **pulito** (76 locali = 76 remote, nessuna
deriva; verificato dal controller il 21/07). Rischio di abort chiuso: la serie C usa `::numeric`
(con `::bigint`, `C9999999999999999999` abortiva l'intera migration — riprodotto). La CLI si collega
al remoto **senza richiesta di password**.

**Rollback onesto:** le migration sono additive, ma **non c'è rollback automatico**. Tornare indietro
significa scrivere una migration che elimina gli oggetti e ripristina il corpo precedente di
`admin_delete_laboratorio` — operazione che ricade nella **stessa trappola `proconfig`**
(`CREATE OR REPLACE` azzera `SET search_path`, vedi R-3).

## ⚠️ Premessa che cambia il peso di metà dei findings (Francesco, 21/07)

**I dati nel DB `iagibumwjstnveqpjbwq` sono SOLO DI TEST.** Alla consegna in produzione si ripulisce
tutto: nessun cliente reale, nessuno storico da preservare. Registrato in modo permanente in
`ua-app/CLAUDE.md` §8 (con l'istruzione di cancellare quella sezione alla prima onboarding reale).

**Conseguenze su questo lavoro:**
- **E3** (backfill ucciso da una scrittura utente), **E4** (congela le scritture), **E6** (targa del
  vincitore riscritta senza traccia), **E10** (stato clinico ricalcolato) → **decadono**. Riguardano
  tutti la fedeltà e la reversibilità di dati di prova. Il backfill NON si riscrive: si rilancia se
  fallisce (è già idempotente e sta in una migration separata, quindi un suo abort non tocca lo schema).
- La **tabella di audit** di R-2 resta (è già scritta e collaudata, costa zero, e sopravvive alla
  pulizia come rete di sicurezza per un eventuale futuro ri-uso) — ma la premessa che l'aveva
  giustificata, cioè la perdita irreversibile di dati reali, **non valeva**.
- **Non decadono**: schema, RLS, RPC, isolamento tenant, purga GDPR, correttezza degli invarianti.
  Sopravvivono alla pulizia e reggeranno i dati veri.

## Decisioni dell'orchestratore

**D-O1 (21/07) — I test vanno in `tests/unit/`, MAI in `src/**/__tests__/`.**
Risolve il concern wave-wide del Task 2. Evidenza verificata dal controller: `vitest.config.ts`
`test.include` globba SOLO `tests/unit/**` + `tests/integration/**`; `find src -type d -name __tests__`
non ritorna nulla; i 256 file di test esistenti stanno tutti in `tests/unit/`. Prova che i path
`__tests__` del piano sono un errore di scrittura e non una convenzione nuova: il Task 15 istruisce
«aggiorna `src/lib/dashboard/__tests__/tutto-il-resto.test.ts`», file che **non esiste** — esiste
`tests/unit/tutto-il-resto.test.ts`.
**Conseguenza operativa:** `vitest.config.ts` NON si tocca; ogni brief dei task 3→19 va corretto
sui path reali prima del dispatch (il dispatch dell'orchestratore lo dichiara esplicitamente).
I path dei file **sorgente** restano quelli del piano.

## Scoperta collaterale — `admin_delete_laboratorio` è GIÀ ROTTA in produzione

Verificato dal controller (indipendentemente dal panel architetto, che l'ha segnalata):
`fatture_outbox` (creata 10/07), `fatture_sdi_eventi` (16/07) e `credito_clienti_movimenti`
(02/07) hanno FK **NO ACTION** verso `laboratori`/`lavori`/`fatture` e **nessuna delle tre** è
nella lista di cancellazione di `20260517000001_fix_admin_delete_admin_sistema_fk.sql`.
→ La cancellazione di un laboratorio (e quindi la cancellazione GDPR art. 17) **fallisce già oggi**
per qualsiasi lab che abbia una di quelle righe. La Parete non causa il difetto: ne sarebbe la
quarta e quinta istanza. **Da portare a Francesco come voce a sé** — è un bug live, non un
effetto di questa ondata.

## Note operative

- MCP Supabase non autenticato in questa sessione → apply/gen-types/verifiche via `npx supabase` CLI
  (v2.109.1, linkata a `iagibumwjstnveqpjbwq`).
- I 4 doc della Parete erano untracked su `main`: **copiati** nel worktree (non versionati qui).
  Alla FASE 11 il BP-1 va scritto sul **main tree**, dove vivono le versioni aggiornate di
  MEMORY.md / ROADMAP-UFFICIALE.md (anch'esse non committate).

## ▶️ SESSIONE 2 (21/07, contesto pulito) — ripresa dal Task 3

Ledger + `git log` verificati alla ripresa: Task 1 e Task 2 COMPLETI, HEAD `2c00948`, worktree pulito.
**BASE per il review-package del Task 3 = `2c00948`.**

### Decisioni dell'orchestratore aggiunte in questa sessione

**D-O2 (21/07) — `getParete` chiude le righe stantie con il motivo VERO, non con `'consegna'` fisso.**
`deriveParete` ritorna `daRiparare: { lavoroId, motivo: 'consegna' | 'annullo_lavoro' }[]`;
regola: `stato === 'consegnato' → 'consegna'`, tutto il resto (annullato, soft-deleted, lavoro
assente) → `'annullo_lavoro'`. Evidenza: `cassetta_riassegna_post_annullo` seleziona
`WHERE cl.liberato_per = 'consegna'` — chiudere con `'consegna'` la riga di un lavoro annullato lo
renderebbe eleggibile alla riassegnazione (stesso difetto che R-4.1 ha corretto dentro la RPC).
`'annullo_lavoro'` è coerente con spec §9.4 («resta nell'enum per percorsi di annullo secco»): la
via del rifacimento chiude con `'rifacimento'` dalla sua RPC dedicata.
Guardia di regressione: terzo caso di test su lavoro `annullato`.

**D-O3 (21/07) — `getCassetteSuggerite` fa 3 query, non 2 (il piano ne prescriveva 2).**
Le occupate si leggono da una query **senza limit** (`liberato_at IS NULL`: al più una riga viva per
cassetta, insieme piccolo per costruzione); l'ultimo uso da una query separata
`order(assegnato_at desc).limit(200)`. Motivo: ricavare le occupate dalla stessa finestra limitata
darebbe una cassetta occupata da mesi — fuori dalle 200 assegnazioni più recenti — letta come libera
e suggerita, quindi 409 all'assegnazione. Le cassette fuori finestra restano `ultimoUso: null` e
finiscono in coda.

**D-O4 (21/07, RISCRITTA dopo confutazione empirica) — il cambio di firma di
`getCassetteSuggerite` si colma con un PONTE dentro il Task 3.**
Il ritorno passa da `string[]` a `{id,nome}[]` e rompe la catena `src/app/(app)/lavori/page.tsx`
→ `PilaAperta`/`PilaSplit` → `ConfermaCassettaSheet`, che è di proprietà del **Task 16 Step 2**.
Prima versione di D-O4: «lasciare `tsc` rosso su quel confine fino al Task 16». **FALSA e ritirata.**
Confutata dall'implementer del Task 3, che ci ha sbattuto contro: `.husky/pre-commit` esegue
`npx lint-staged` + **`npx tsc --noEmit` sull'INTERO progetto** + `scripts/check-ds-compliance.sh`.
Il gate su `tsc` non è la FASE 7: è **ogni singolo commit**.
**Decisione operativa:** una riga in `page.tsx:42` — `(await getCassetteSuggerite(svc, labId)).map(c => c.nome)`
— con commento che ne dichiara natura transitoria e proprietario della rimozione (Task 16 Step 2).
Chiude entrambi i TS2322 (righe 48 e 50 discendono da quell'assegnazione) a comportamento invariato:
le chip mostrano gli stessi nomi di oggi attraverso lo sheet ancora `string[]`. Non fa nulla del
lavoro vero del Task 16 (id nelle chip, POST `cassetta_id`, 409 con refetch, morte del campo in
TabAccettazione). **Il ponte non può sopravvivere in silenzio:** quando il Task 16 porterà
`suggerite` a `{id,nome}[]`, il `.map` residuo diventa un TS2322 nuovo e l'hook blocca quel commit;
in più i test RED del Task 16 impongono la direzione `{id,nome}`.
Scartate: `--no-verify` (vietato dai vincoli globali, e si ripeterebbe 12 volte) e il commit fatto a
mano dall'orchestratore (romperebbe il contratto per cui l'evidenza di test appartiene all'implementer).

> **⚠️ VINCOLO D'ONDATA scoperto qui, vale per TUTTI i task rimanenti:** l'albero non può **mai**
> restare rosso su `tsc`. Ogni task che cambia una firma condivisa deve **correggere o colmare
> tutti i suoi consumatori nello stesso task** — non esiste la strategia «rottura di confine che
> chiude un task più avanti».

**Semantica delle chip fissata da spec §10** (verbatim: «cassette vive LIBERE ordinate per uso
recente (max 6)»): eleggibili TUTTE le cassette vive e libere, comprese le mai usate
(`ultimoUso: null`), che vanno in coda. Da assertare esplicitamente, non da dedurre dal sort.

### Da inserire nel dispatch del Task 16 (debito acceso dal Task 3)
«Elimina il ponte transitorio `.map(c => c.nome)` a `src/app/(app)/lavori/page.tsx:42` e porta
`{id,nome}` fino a `ConfermaCassettaSheet` attraverso `PilaAperta`/`PilaSplit`.»

### Task 3 — in corso
Brief `.superpowers/sdd/task-3-brief.md` · report atteso `.superpowers/sdd/task-3-report.md`.
Implementer dispatchato (sonnet) con D-O2/D-O3/D-O4 + D-O1 (test in `tests/unit/`).
1º giro: **BLOCKED sul solo Step 6** (commit) per l'hook `pre-commit` — codice completo, RED→GREEN
reale, suite intera 2330 passed / 19 skipped / 0 failed. Sbloccato riprendendo lo **stesso**
implementer (contesto e staging intatti) con il ponte di D-O4.

### Task 3 — review (opus) su `2c00948..a970a08`: **Da correggere**

Conformità alta a R-A→R-F e D-O4 (verificate una a una con `file:riga`), test giudicati veri e non
mock, perimetro rispettato. Ma **due Critical accoppiati nel punto cieco del task**:

- **C1 — `parco.ts:40`: `void svc.rpc(...)` non parte mai.** `PostgrestFilterBuilder` è un thenable
  pigro: la fetch è emessa dentro `then()`. Verificato empiricamente dal reviewer (supabase-js
  2.105.4, fetch strumentata): `void` → 0 richieste HTTP, `await` → 1. L'auto-riparazione era un
  no-op silenzioso.
- **C2 — `parco.ts:30-41`: il ciclo di riparazione non era protetto dal fallimento della query
  `lavori`.** Con `lavori = []` da errore, ogni cassetta occupata del lab finisce in `daRiparare`;
  `cassetta_libera_atomica` **non** ri-controlla lo stato del lavoro (UPDATE incondizionata) e la
  chiusura è **irreversibile** (trigger append-only). Latente finché C1 lo teneva disarmato:
  **il fix di C1 lo arma**.
- **I3** — esito della RPC di riparazione ingoiato per intero (né `error` né `esito`).

**Fix ratificato: `await Promise.allSettled` + guard `if (!errLavori)`, NON `after()` di `next/server`.**
Una riparazione che può chiudere in modo irreversibile assegnazioni di lavori attivi deve girare dove
è protetta e osservabile, non differita dopo la risposta dove un guard mancato fa danno invisibile.
Latenza nel caso sano = zero (`daRiparare` vuoto → il guard salta l'await).
**Deviazione dal piano da esibire alla review finale:** il piano prescriveva «fire-and-forget: la
parete non aspetta la riparazione». Quella tecnica, così scritta, non sparava affatto. Il requisito
vero del brief — «resa come libera già in questa risposta» — è soddisfatto in modo sincrono da
`deriveParete` e resta intatto; cade solo la tecnica. Niente retry 40P01 qui: quel contratto lega le
**route** di mutazione, non la riparazione di una lettura di libreria.
Chiusi nello stesso giro i Minor #4 (il test «soft-deleted» passava `lavori: []`, coprendo il ramo
`!l` e non `l.deleted_at`, che è raggiungibile perché la query non filtra `deleted_at`) e #5
(tie-break `created_at`/`id` non assertati, proprio quelli che la migration dice che le letture
DEVONO applicare).

**~~Punto cieco strutturale~~ — RITIRATO, era falso.** Avevo registrato che `parco.ts` non fosse
unit-testabile per costruzione (`server-only`). **Non è vero, e vale per tutta l'ondata:**
`tests/setup.ts:5` contiene già `vi.mock('server-only', () => ({}))`, e `tests/unit/pile-home.test.ts:2`
testa `getPileHome` — funzione `server-only` analoga a `getParete` — con `createChain`
(`tests/unit/helpers/supabase-chain-mock.ts:23`, che espone anche `then` a `:40`); il mock di `.rpc()`
è prassi in ≥5 test unit. **Conseguenza per i task 4→19: le funzioni server-only e le route SONO
testabili — nessuno rinvii un test citando `server-only` come impedimento.**

### Findings Minor rinviati alla review finale whole-branch (dal Task 3)
- **#6** `src/lib/lavori/cassette-shared.ts:29` — `localeCompare` su timestamp ISO: funziona col
  formato uniforme di PostgREST, ma è idioma fragile per un confronto puramente lessicografico.
- **#7** `src/lib/cassette/parco-shared.ts:70-71` — derivazione `dentista`/`paziente` duplicata
  verbatim da `src/lib/dashboard/pile-home-shared.ts:220-221`, fallback `'—'` compreso. È una
  regola di **presentazione condivisa**: se cambia in un punto, parete e pile mostrerebbero nomi
  diversi per lo stesso cliente. Un `formattaDentista(clienti)` condiviso la chiude.

### Task 3 — re-review su `2c00948..9836c9c`: **Approvato**, condizionato a Important #8

C1, C2, I3, #4 e #5 verificati chiusi **nel merito**: il dispatch della riparazione contato con fetch
strumentata (2 richieste HTTP per 2 voci, entrambe `fulfilled`), il guard enumerato percorso per
percorso (`errLavori` → blocco saltato · `errVive` → `ids` vuoto · `errCassette` → zero cassette),
i due Minor chiusi da asserzioni sul comportamento e non sul titolo. Perimetro del fix verificato per
blob: fra `a970a08` e `9836c9c` cambiano solo `parco.ts` e `parco-shared.test.ts`.

**Important #8 — il report giustificava l'assenza di test sul blocco di riparazione con
un'affermazione FALSA** («`parco.ts` è `server-only`, non testabile»). Il reviewer ha smontato la
premessa: il repo ha già `vi.mock('server-only')` e testa una funzione analoga.
**Decisione del controller: il test si scrive ORA, non si rinvia alla review finale** (il reviewer
lo dava per rinviabile). Costa ~20 righe, il pattern è a due file di distanza, ed è il blocco dove
sono atterrati entrambi i Critical, che scrive in modo irreversibile su tabella append-only. Un
debito iscritto in fondo a un'ondata di 19 task ha ottime probabilità di non essere mai riscosso.
**Forma obbligata del test** (avvertimento del reviewer, è il cuore): un `rpc: vi.fn()` classico
cattura una regressione di C2 (nessuna chiamata col guard attivo) ma **NON** un ritorno a `void`,
perché `mockRpc(...)` registra la chiamata comunque. Per coprire C1 il mock deve restituire un
**thenable pigro** che segni `dispatched = true` solo dentro `then()`.
Chiuso nello stesso giro il Minor #11 (assunzione su `db-max-rows` scritta accanto alla query: il
guard copre l'errore, non la risposta parziale).

### Findings Minor rinviati alla review finale whole-branch (dal Task 3, 2º giro)
- **#9** `src/lib/cassette/parco.ts:5-45` — commento di 41 righe su 89 (46% del file) con riferimenti
  («Critical #1/#2») che fuori da questo task non significano nulla. Il contenuto va tenuto, la
  numerazione dei rilievi appartiene al report e al messaggio di commit.
- **#10** `src/lib/cassette/parco.ts:67-70` — le riparazioni partono tutte in parallelo su una path
  di **lettura**. Caso sano: zero o una. Caso patologico (corruzione diffusa): N RPC concorrenti sullo
  stesso lab che convergono in coda sulla stessa riga `dashboard_kpi_cache[lab]` — stesso ordine di
  lock per tutte, quindi serializzazione e non deadlock, ma è una raffica auto-inflitta. Un ciclo
  sequenziale o un cap di concorrenza costerebbe una riga.

## Preparazione Task 4 (fatta dal controller prima del dispatch)

**Due import del piano sono SBAGLIATI** — verificati contro `src/app/api/cicli/route.ts:1-8`, che è la
route più recente col pattern completo:
- `@/lib/supabase/service` → non esiste. Reale: **`@/lib/supabase/server-service`**.
- `@/lib/security/csrf` → non esiste. Reale: **`@/lib/utils/csrf`**.
Firma verificata: `assertLabOperativo(ctx: LabGuardInput | null, method: GuardMethod): NextResponse | null`
(`src/lib/supabase/lab-guard.ts:71`) — il pattern `const guard = assertLabOperativo(context, 'POST'); if (guard) return guard` del piano è corretto.
Route di riferimento da imitare: `src/app/api/cicli/route.ts` + `src/app/api/cicli/[id]/route.ts`.

**D-O5 (21/07) — il retry sul 40P01 diventa un helper condiviso, creato nel Task 4.**
Il contratto sta nell'intestazione della migration (`20260721090000_parete_cassette.sql:48-52`):
«ogni chiamata a queste RPC va avvolta in un retry sul SQLSTATE 40P01 (1-2 tentativi, backoff breve)
… un 40P01 qui non è un bug da inseguire in SQL: è la coda prevista di questa architettura».
Lega **quattro** task (4/5/8/9): scriverlo quattro volte sarebbe duplicazione verbatim di un blocco
logico, che la rubrica di review considera un difetto. Nuovo file `src/lib/supabase/rpc-retry.ts`,
un tentativo di ritenta (2 totali), backoff breve da costante nominata, test proprio in
`tests/unit/`. I Task 5/8/9 lo **importano**, non lo riscrivono.
Nota per chi scrive l'helper: il builder di postgrest è un **thenable pigro** (lezione del Task 3),
quindi l'helper deve accettare una **thunk ri-invocabile** `() => PromiseLike<{data, error}>`, non
una promise già creata — altrimenti il secondo tentativo non spedisce nulla.

**Convenzione dei test API di questo repo** (verificata: `find src/app/api -type d -name __tests__`
→ vuoto): i test delle route stanno in `tests/unit/<risorsa>-route.test.ts` e
`tests/unit/<risorsa>-id-route.test.ts` (es. `cicli-route.test.ts` + `cicli-id-route.test.ts`).
I brief dei task 4→19 che indicano `src/app/api/**/__tests__/` vanno corretti su questa convenzione
(D-O1).

**Posizione duplicata alla creazione concorrente: nota, NON difetto da correggere nel Task 4.**
La migration lo dichiara (`ibid.:42-46`): `max(posizione)+1` è calcolato senza lock e
`(laboratorio_id, posizione)` non è unico, quindi due creazioni concorrenti nascono con la stessa
`posizione`; la contromisura ratificata è il tie-break in **lettura** (`ORDER BY posizione,
created_at, id`), già implementato e ora assertato dal Task 3.

## ✅ TASK 3 COMPLETO — commit `2c00948..3523423`, review **Approvato** senza condizioni

Quattro commit: `a970a08` (feature) → `9836c9c` (fix dei 2 Critical + I3) → `42ff88a` (test di
regressione col mock thenable pigro) → `3523423` (Minor #12/#13).
Suite finale **2336 passed / 19 skipped / 0 failed**, `tsc --noEmit` exit 0, ESLint pulito, hook
`pre-commit` attivo su tutti e quattro i commit (nessun `--no-verify`).
Verdetto finale del reviewer sul test: il mock è pigro davvero (il flag di dispatch sta dentro `then`,
dove il builder reale spedisce), i test asseriscono comportamento osservabile di `getParete` e non il
mock, e nessun ramo resterebbe verde col difetto reintrodotto. Prova per mutazione eseguita
dall'implementer (codice buggy ripristinato → 3 test rossi → codice corretto → verdi).
Rinviati alla review finale di branch: Minor #6, #7, #9, #10.

### Task 4 — in corso
Brief `.superpowers/sdd/task-4-brief.md` · report atteso `.superpowers/sdd/task-4-report.md`.
Base per il review-package: **`3523423`**.

## 🛑 TASK 4 — BLOCCATO su un DIFETTO DEL PIANO. Serve una decisione di Francesco.

**Commit parziale consegnato:** `8967847` — `src/lib/supabase/rpc-retry.ts` (helper R-C/D-O5) +
`tests/unit/rpc-retry.test.ts` 4/4, suite intera 2340/2340, `tsc` pulito. È indipendente dal blocco
e serve ai Task 5/8/9. Le due route NON sono state scritte: sarebbero state verdi sui test mockati
e 500 in produzione.

### Il difetto (verificato dal controller, non assunto)

La «NOTA 21/07» in testa al brief del Task 4 dice: «il `PATCH` colore continua a fare `UPDATE`
diretto sulla tabella: **è lecito perché il service client bypassa RLS e i REVOKE**».
**È FALSO.** `service_role` bypassa **RLS**, non i **GRANT/REVOKE di tabella**. La migration già
applicata fa, a `20260721090000_parete_cassette.sql:148-150`:
```sql
REVOKE ALL ON cassette FROM anon, authenticated, service_role;
GRANT SELECT ON cassette, cassette_lavori TO authenticated, service_role;
```
→ `service_role` ha **solo SELECT**. L'implementer l'ha verificato empiricamente contro il progetto
Supabase reale: `42501 permission denied` sia su INSERT sia su UPDATE.
Coerente con la verifica post-apply già a ledger: «`cassette` e `cassette_lavori` →
`{authenticated=r, service_role=r}` — sola lettura, come progettato».

**E non c'è RPC che copra i due buchi:** l'unico INSERT su `cassette` vive dentro
`cassetta_assegna_atomica` (get-or-create, richiede `p_lavoro` — non crea una cassetta **vuota**), e
nessuna delle 8 RPC cambia il **solo colore** (`cassetta_rinomina_atomica(p_lab, p_cassetta_id,
p_nome)` non lo tocca). Le due operazioni che il Task 4 deve esporre — «crea cassetta vuota» e
«cambia colore» — **oggi non sono eseguibili in nessun modo**.

### Le tre strade (nessuna scelta dal controller: è dominio critico + gate migration)

- **(a) Due RPC nuove** `cassetta_crea_atomica` + `cassetta_imposta_colore_atomica`. Uniforme,
  «una sola penna» resta intatta, riusa il pattern REVOKE/GRANT/`search_path` già auditato.
  Costo: cerimonia per due operazioni che non portano alcun invariante.
- **(c) GRANT per colonna**: `GRANT INSERT ON cassette TO service_role` +
  `GRANT UPDATE (colore) ON cassette TO service_role`. Apre esattamente la superficie senza
  invarianti e lascia `nome`, `posizione`, `deleted_at` e l'occupazione chiusi nelle RPC.
  Minimale e preciso. Costo: modello di scrittura misto sulla stessa tabella.
- **(b) GRANT pieno INSERT+UPDATE** → **da scartare**: riaprirebbe l'UPDATE diretto su `nome`,
  cioè esattamente il desync con `lavori.numero_cassetta` che `cassetta_rinomina_atomica` esiste
  per impedire.

**Due fatti da NON rederivare:** `updated_at` non è più portante (R-4.2 ha spostato l'ordinamento
delle chip su `assegnato_at`), quindi una scrittura del colore non deve bumparlo; e la corsa sulla
`posizione` duplicata che un INSERT diretto lascia aperta **è già accettata** per il get-or-create
di `assegna`, quindi non discrimina fra le opzioni.

**Percorso:** panel advisor (Regola Advisor, dominio critico) → raccomandazione a Francesco →
sua scelta + autorizzazione `db push` → FASE 6b (`gen types`) → route del Task 4.

## ✅ RATIFICATO DA FRANCESCO (21/07) — strada (a): due RPC nuove

Panel 3× **unanime** (architettura · sicurezza · backend). Sintesi completa e motivazioni:
`.superpowers/sdd/panel-task4-sintesi.md`. Decisione presa da Francesco dopo la raccomandazione.

**Da fare, nell'ordine:**
1. **Migration nuova** `cassetta_crea_atomica(p_lab, p_nome DEFAULT NULL, p_colore DEFAULT NULL)` +
   `cassetta_imposta_colore_atomica(p_lab, p_cassetta_id, p_colore)`. Contratto degli esiti e note
   d'implementazione: sintesi §«Contratto proposto». Punti non negoziabili:
   - `SECURITY DEFINER` + `SET search_path = public, pg_temp` +
     `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE TO service_role`.
   - `imposta_colore` **non tocca `updated_at`** (R-4.2), e lo dice in un commento.
   - Il nome automatico `C{maxN+1}` vive **dentro** `crea` (`max(n)+1` → `INSERT … ON CONFLICT DO
     NOTHING` → ritenta, max 5 giri, fallthrough `nome_occupato`): l'allocazione di un nome libero
     sotto indice unico parziale è concorrenza, e va dove vive l'indice.
   - Il colore lo valida la **route** (R-5); un `p_colore` sbagliato che arriva all'RPC è un bug di
     route → `RAISE`, come in `assegna`.
   - Blocco esiti in stile D5 in testa, come le altre otto.
2. **Collaudo su Postgres usa-e-getta** prima del gate, come fu per il Task 1.
3. **🛑 GATE:** autorizzazione esplicita di Francesco al `db push` — non è ancora stata data.
4. **FASE 6b** dopo l'apply: `gen types` + `tsc --noEmit`.
5. Poi le due route del Task 4, sotto `callRpcWithRetry`.

**Correzioni al PIANO da fare contestualmente** (unanimi: lasciate lì rigenerano lo stesso errore):
- Task 4, NOTA 21/07 punto 2: «il service client bypassa RLS **e i REVOKE**» → **falso**, bypassa
  RLS e non i GRANT di tabella.
- Task 4, corpo: «l'INSERT diretto qui è lecito» → non lo è.
- `task-4-brief.md:99` «UPDATE colore/updated_at» → viola R-4.2.
(La correzione del piano richiede un commit: va fatta quando nessun implementer sta lavorando.)

**Nota a margine da valutare a parte** (architetto): `PATCH /api/cassette/[id]` accetta oggi
`{nome?, colore?}` **insieme**, applicati in due passi non atomici. Buco preesistente. Accettare
esattamente un campo per chiamata (422 altrimenti) costa nulla e il design system si chiama
«una cosa alla volta».

### Due autorizzazioni di Francesco (21/07, dopo la ratifica di (a))

1. **`db push` AUTORIZZATO** per la migration di questa ondata (gate 3 sciolto in anticipo). Resta
   l'obbligo di collaudo su Postgres usa-e-getta e di review PRIMA di spingere, e di dichiarare
   esattamente che cosa si sta applicando quando lo si fa. L'autorizzazione vale per questa
   migration, non è una delega permanente.
2. **La nota a margine dell'architetto si chiude in QUESTA ondata:** `PATCH /api/cassette/[id]`
   accetta **esattamente un campo per chiamata** — `{nome}` **oppure** `{colore}`, mai entrambi;
   entrambi presenti (o nessuno dei due) → **422**. Con la strada (a) l'effetto collaterale è
   elegante: una chiamata = una RPC, e il passo doppio non atomico sparisce del tutto invece di
   essere solo sconsigliato. Da recepire nel brief del Task 4 e nella spec.

## Task 5 — DONE, commit `85cce8c` (in review)

`85cce8c` «feat(cassette): riordino + assegnazione lavoro via RPC; numero_cassetta fuori da
PATCHABLE_FIELDS (sentinella)» — 6 file: 2 route nuove, `lavori/[id]/route.ts` toccata solo su
`export` + rimozione del campo, 3 test. 31/31 sui nuovi, suite intera **2371 / 19 skipped / 0 rossi**,
`tsc` ed ESLint puliti. Probe non distruttivo contro il DB live: le 3 RPC rispondono con l'esito
atteso (nessun `PGRST202`, nessun errore di permesso). R-G non ha richiesto modifiche a test
preesistenti (nessuno asseriva `numero_cassetta` patchabile).

### ⚠️ VINCOLO DI SEQUENZA APERTO DAL TASK 5 — vale fino al Task 16
`ConfermaCassettaSheet` e `TabAccettazione.tsx` continuano a fare `PATCH numero_cassetta`, che ora è
un **no-op silenzioso** (200, nessuna scrittura) perché il campo è uscito da `PATCHABLE_FIELDS`.
**Non mergiare né deployare prima che il Task 16 sia completo.** Non blocca i task intermedi.

### Task 5 — review (opus) su `3523423..85cce8c`: **Da correggere**
(Il package copriva 2 commit: anche `8967847`, l'helper di retry, mai revisionato prima.)

Conformità piena a R-A→R-G e alle 5 correzioni; mappatura esito→HTTP confrontata riga per riga col
blocco della migration (la fonte di verità ratificata, non la §4.3). **Il retry è provato genuino**:
il thenable pigro segna `dispatched` dentro `then()` e il test asserisce che *entrambi* i tentativi
sono stati spediti — se l'helper riusasse la promise invece di ri-invocare la thunk, il test cadrebbe.
Registrato dal reviewer, utile ai Task 8/9: **il retry è sicuro su queste RPC** perché sono singole
transazioni abortite e rollbackate per intero sul 40P01, quindi la ri-invocazione non può applicare due volte.

**Important #1 — qualunque body non riconosciuto LIBERA la cassetta, in silenzio, con 200.**
`cassetta/route.ts:81` ha `let azione = 'libera'` come default: `{cassetta_id: undefined}` (chiave
eliminata da `JSON.stringify` — percorso realistico con la UI drag-drop dei Task 8/9), tipo sbagliato,
stringa di soli spazi, o body JSON malformato → tutti liberano. Una POST che intendeva **assegnare**
esegue la scrittura opposta e risponde 200. La route gemella fa il contrario (422 su `ordine` non-array).
**Important #2 — nessuna asserzione sullo scoping tenant.** `createChain` ritorna lo stesso risultato
a prescindere dai filtri e registra le chiamate in `chain.calls` **proprio perché** i test asseriscano
`.eq('laboratorio_id', …)`; nessun test lo guarda. Misurato: cancellando quel filtro da
`cassetta/route.ts:66`, **tutti e 18 i test restano verdi**.
**Important #3 (`plan-mandated`)** — è il no-op silenzioso della PATCH `numero_cassetta` già a ledger:
decisione del piano, non dell'implementer, si chiude nel Task 16. Da aggiornare lì anche
`tests/unit/conferma-cassetta-sheet.test.tsx:26`, che fissa verde un payload che il server ora ignora.

Chiusi nello stesso giro anche Minor #1 (cast `uuid` → 500 dove la route prometteva 422), #5 (il
JSDoc del contratto della thunk non è sopra la funzione, quindi non compare in hover ai 3 task che
useranno l'helper) e #8 (nessun test asserisce che il backoff scorra: togliendo il `setTimeout` i 4
test restano verdi) — quest'ultimo solo se non rende il test fragile.
Rinviati alla review finale: Minor #2, #3, #4, #6, #7.

**⚠️ risolto dal controller:** la verifica contro il DB live si appoggiava a uno script cancellato e
non committato → nessuna evidenza riproducibile. Decisione: **niente script che colpisce il DB vero
committato nel repo**; i probe si rilanciano e gli output reali finiscono nel report.

### ⚠️ SLIP DI PROCESSO DEL CONTROLLER (21/07) — da non ripetere
Ho dispatchato il fix del Task 5 **mentre la migration Task 4a era ancora in corso**: due implementer
in parallelo sullo stesso worktree, che la skill SDD vieta. I file sono disgiunti
(`src/app/api/**` + `tests/**` contro `supabase/migrations/**`), ma condividono l'indice git e il gate
`tsc` dell'hook `pre-commit`, che gira sull'**intero progetto**: il commit della migration potrebbe
fallire su file `.ts` a metà scrittura dell'altro. Recuperabile (basta ricommittare), ma da non ripetere.

## Task 4a — migration SCRITTA e COLLAUDATA, commit `2515a31` (in review, NON applicata)

`supabase/migrations/20260721090300_cassette_crea_colore.sql`, 188 righe.
**Collaudo: 70 verifiche, 70 verdi** su container `pg-4a` (PG 15.18) ricostruito con `schema.sql` +
le 79 migration reali (le 2 che falliscono sono le stesse dei collaudi precedenti, irrilevanti).
**R-4.2 verificato con sentinella:** `updated_at='2020-01-01'` letto prima e dopo → invariato, **più
la controprova** che un UPDATE che *lo tocca* la sposta davvero (cioè il test discrimina, non è
verde per caso), più la verifica che su `cassette` non esiste alcun trigger.
Apply provato anche sullo **stato esatto di produzione** (78 migration, poi la sola 090300):
2 CREATE FUNCTION + 2 REVOKE + 2 GRANT, `relacl` delle tabelle **identico** prima e dopo.
`db push`, `gen types` e qualsiasi comando verso `iagibumwjstnveqpjbwq`: **non eseguiti**.

### ⚠️ Il collaudo ha smentito un'affermazione del MIO brief — nuovo requisito per il Task 4
Avevo scritto che il fallthrough `nome_occupato` dell'auto-nome sarebbe stato «praticamente
irraggiungibile». **È raggiungibile e misurato:** 0 su 210 fino a 4 sessioni concorrenti, **0,75% a
8, 2,6% a 16**. I 5 giri non sono stati cambiati (sono ratificati).
→ **Requisito per la route del Task 4:** su `POST /api/cassette` **senza** `nome`, l'esito
`nome_occupato` va **ritentato**, non tradotto in un 409 — sarebbe un 409 su un nome che l'utente non
ha mai digitato. Con `nome` esplicito, invece, 409 è la risposta giusta.
(È esattamente la distinzione che il panel backend aveva previsto: «la route non sa distinguere il
nome che *hai scritto* da quello che *ho generato io*» — un esito le separa, uno SQLSTATE no.)

### Concorrenza: nessuna superficie nuova, difetto noto confermato invariato
`crea` è una seconda sorgente di cassette nuove e riattiva il difetto noto #2 (`cassette_riordina`
× creazione concorrente): **9 deadlock su 2.700, tutti con `riordina` come vittima, zero con le due
funzioni nuove**. A/B con 1 RPC = 1 transazione conferma che l'ordine dei lock non cambia.
→ Già coperto: la route di riordino del Task 5 chiama `cassette_riordina` sotto `callRpcWithRetry`.

## Task 5 — fix della review consegnati, commit `7ba1abf` + `2cb8cad` (in re-review)
46/46 mirati, suite intera **2382 / 19 skipped / 0 rossi**, `tsc` ed ESLint puliti. Entrambi gli
Important verificati con **mutation test** (guardia rimossa → i test giusti falliscono; ripristinata
→ verdi). Minor #8 verificato non fragile su 8 run consecutive. Probe DB live rilanciati con output
reale nel report, **nessuno script committato** (decisione del controller).
Nota dell'implementer, onesta: il suo primo fix di Important #1 era **incompleto** rispetto
all'istruzione letterale, e un test lo certificava come «scelta deliberata» invece di chiuderlo.
L'ha scoperto da sé consultando un advisor **prima** di dichiarare fatto, e l'ha chiuso in `2cb8cad`.

## ✅ TASK 5 APPROVATO — re-review su `2515a31..2cb8cad`

Entrambi gli Important chiusi, i tre Minor pure, **nessun buco nei fix**. Il reviewer ha verificato in
prima persona sul checkout: `tsc` exit 0, `npx vitest run` **2382 / 19 skipped / 0 falliti** (290 file),
suite mirata 46/46, `rpc-retry.test.ts` rilanciato 5 volte di fila sempre verde.
**Important #1:** enumerazione completa — oggi raggiungono il ramo di liberazione **solo** `null` e
`{}`; `{foo:1}` e `{cassettaId:'…'}` (la porta che il primo fix lasciava aperta) danno 422
`corpo_non_riconosciuto`. La scelta del ramo si decide su `hasOwnProperty` (forma
prototype-pollution-safe), non sulla verità del valore.
`{cassetta_id: undefined}` arriva sul filo come `{}` dopo `JSON.stringify` e **non è distinguibile
lato server**: annotarlo nel JSDoc invece di scrivere un test che non potrebbe mai fallire nel modo
giusto è stata la scelta corretta.
**Important #2:** l'asserzione su `chain.calls` blocca anche il **valore** del filtro
(`toContainEqual({method:'eq', args:['laboratorio_id', LAB_ID]})`), non solo la sua presenza.

### Nit residui — 2 chiusi subito, 1 da portare al task del client
- (chiuso) `raw.trim().length === 0` faceva cadere nel ramo di liberazione anche un body di **soli
  spazi**. Stessa classe dell'Important #1. Forma fedele: `raw.length === 0` → il body whitespace-only
  va in `JSON.parse` → 400, mentre un JSON valido con spazi attorno continua a parsare.
- (chiuso) `task-5-report.md:233-234` descriveva ancora `{foo:'bar'} → libera` come «scelta
  deliberata coperta da un test», affermazione **ribaltata** dal round 2b: corretta, perché il report
  non venga riletto male fra un mese.
- **→ DA METTERE NEL BRIEF DEL TASK CHE SCRIVERÀ IL CLIENT (12/16):** la scelta del ramo è **per
  presenza di chiave**, quindi `{cassetta_id: null}` è **422**, non liberazione (errore rumoroso
  invece di rilascio silenzioso, voluto). **Per liberare il client deve inviare `null` o `{}`.**

## Task 4a — review (opus) su `85cce8c..2515a31`: **Applicabile con riserve**, NON ancora pushata

SQL giudicato **corretto**: ogni esito dichiarato è raggiungibile, ogni cammino di una chiamata ben
formata ritorna un esito dichiarato, l'isolamento tenant regge **su ogni singolo statement**, i
privilegi delle tabelle non si muovono, nessuna delle due funzioni può chiudere un ciclo di deadlock.

**Cose verificate indipendentemente dal collaudo, che vale la pena non riscoprire:**
- L'inferenza `ON CONFLICT (laboratorio_id, lower(btrim(nome))) WHERE deleted_at IS NULL` combacia
  **esattamente** con `cassette_nome_vivo_uidx`, predicato parziale incluso — un'espressione anche solo
  riordinata avrebbe dato 42P10.
- Il dominio del colore validato dalle funzioni è **identico byte per byte** al `CHECK` di tabella:
  nessun cammino può produrre una 23514 al posto di un esito (era il finding #3 dell'ondata precedente).
- Il divieto su `updated_at` regge **per costruzione**: nessuna migration del repo crea trigger su
  `cassette`, e `apply_updated_at_trigger` non è mai invocata per quella tabella.
- **La proprietà che rende innocue le due funzioni è più forte di quella che avevo scritto io nel
  capitolato, ed è vera:** ciascuna acquisisce al massimo **una** risorsa contesa e ritorna subito
  dopo averla acquisita; mentre attende non tiene nulla. Non possono essere il nodo «tiene A, vuole B»
  di un ciclo — solo vittime o bloccanti, mai entrambi. Vale a condizione che **1 RPC = 1 transazione**,
  che è già regola d'ondata.
- `UPDATE … SET colore` prende `FOR NO KEY UPDATE`, non `FOR UPDATE`: ricolorare **non blocca** il
  `FOR KEY SHARE` che le FK di `cassette_lavori` prendono sulla riga padre, quindi non blocca
  un'assegnazione in corso. Scelta giusta, ottenuta senza doverla scrivere.

### Da chiudere PRIMA del push (dopo l'apply il file è per convenzione immutabile)
- **I1** — il blocco D5 dichiara `nome_occupato` «praticamente irraggiungibile», **falsificato dalle
  misure dell'implementer stesso** (0,75% a 8 sessioni, 2,6% a 16). Il blocco D5 è **canonizzato come
  fonte di verità** per la mappatura esito→HTTP: chi scrive il Task 4 legge quella riga, non scrive la
  ritenta, e spedisce un 409 per un nome che l'utente non ha digitato. Il report lo segnala, ma **il
  report non viene applicato al database: il file sì**.
- **M2** — `RETURNING colore INTO v_colore` usa un **valore** come sentinella di «trovata». Regge solo
  perché `colore` è NOT NULL e `p_colore` è validato non-NULL due statement sopra. Se un domani si
  ammettesse `p_colore` NULL («ripristina il default»), un UPDATE **riuscito** tornerebbe
  `cassetta_non_trovata` → 404 su una scrittura avvenuta. `IF NOT FOUND` è invariante rispetto al
  valore ed è l'idioma di tutte le altre RPC.
- **M3** — `crea` non ha guardia su `p_lab` NULL (→ 23502 invece di un esito). L'idioma è già ratificato
  e scritto due volte nell'ondata (`utente_set_nav_pref`, `cassette_purge_lab`). Una riga.
- **M1** — il commento «prendono al massimo un lock di riga su `cassette`» è impreciso per `crea`: un
  INSERT riuscito fa scattare la FK verso `laboratori` (`FOR KEY SHARE` sulla riga padre, tabella
  fuori dall'ordine canonico). Non è un arco nuovo — `assegna`/`riassegna`/`trasferisci`/backfill lo
  prendono già — ed è shared, quindi conflitta solo con `admin_delete_laboratorio`. Da riformulare.
- **M4** — il riepilogo canonizzato in `…090000:159-187` («elenco VERO E COMPLETO») ora copre 8 funzioni
  su 10: una riga di puntamento nel file nuovo (senza toccare `…090000`).

### I2 — riserva sulla ROUTE, non sulla migration: già chiusa dal controller
Il report suggeriva «lo stesso wrapper del retry 40P01 va bene» per la ritenta su `nome_occupato`.
**Falso:** `callRpcWithRetry` ritenta solo su `error.code === '40P01'`, mentre `nome_occupato` torna
come `{data:{esito:'nome_occupato'}, error:null}` — l'helper lo restituisce al primo colpo. Serve una
ritenta **a livello di payload**, distinta e aggiuntiva.
→ Già scritta **come codice** nello scheletro del POST nel piano (commit `40a738b`), insieme al caso
di test `4b` che asserisce **due** chiamate alla RPC. La riserva è chiusa dove il Task 4 la leggerà.

### Da aggiungere alla verifica post-apply (raccomandazioni del reviewer)
1. **Smoke attraverso PostgREST**, non solo su catalogo. È il buco più grande del collaudo: tutte e 70
   le prove sono `psql`, ma in produzione le funzioni sono raggiungibili **solo** da `/rest/v1/rpc/`, e
   il modo di fallire più comune dopo un `db push` è **`PGRST202` — schema cache non ricaricata, DB
   perfetto, route rotta**. Nessuna prova in container può intercettarlo.
2. `SELECT tgname FROM pg_trigger WHERE tgrelid='public.cassette'::regclass AND NOT tgisinternal`
   → **deve tornare 0 righe**. Il collaudo è ricostruito dalle migration del repo: per definizione non
   vede un trigger creato dalla dashboard. Senza questo, R-4.2 è verificato in container e **assunto**
   in produzione.

## ✅ TASK 5 COMPLETO — commit `85cce8c..f9686fa`, review **Approvato**

Quattro commit: `85cce8c` (feature) → `7ba1abf` (Important #1 + #2 + Minor #1/#5/#8) → `2cb8cad`
(chiusura completa di Important #1) → `f9686fa` (body di soli spazi + correzione del report).
Suite finale **2383 / 19 skipped / 0 rossi**, `tsc` ed ESLint puliti, hook attivo su tutti e quattro.
Ogni fix verificato con **mutation test** (guardia ripristinata al vecchio comportamento → il test
nuovo fallisce da solo; fix ripristinato → torna verde).
Rinviati alla review finale di branch: Minor #2, #3, #4, #6, #7 del primo giro.

## ✅ TASK 4a COMPLETO — migration `090300` **APPLICATA AL DB LIVE** (21/07)

Autorizzazione di Francesco. Applicato **un solo file**, `20260721090300_cassette_crea_colore.sql`:
2 `CREATE FUNCTION` + 2 `REVOKE EXECUTE` + 2 `GRANT EXECUTE`. **Nessuna DDL su tabelle, nessun dato,
nessuna policy.** Ledger remoto: `090000/090100/090200/090300` tutte registrate.
Passo 0 verificato prima: 1 sola migration pendente, zero presenti sul remoto e assenti dal repo.
**FASE 6b:** `gen types` con stderr vuoto e zero righe di messaggio CLI nel file, diff di **8 righe
esatte** (solo le due firme nuove), `tsc --noEmit` **exit 0** — commit `3f8fb17`.
**Post-apply:** entrambe `prosecdef=true`, `proconfig={search_path=public, pg_temp}`,
`proacl={postgres=X, service_role=X}`, `anon`/`authenticated` esclusi. `relacl` delle tabelle
**invariato**. **`pg_trigger` su `public.cassette` → 0 righe: R-4.2 non è più assunta, è verificata in
produzione.** In più: letto il `prosrc` **deployato** — `updated_at` compare 5 volte, **tutte e 5
dentro commenti**, e la SET list è `SET colore = p_colore` e basta.
**Smoke PostgREST: nessun `PGRST202`.** 8 prove: `C1` · `'  SMOKE-4A  '` → memorizzato `SMOKE-4A`
(btrim in SQL confermato sul vero) · `nome_occupato` · `nome_non_valido` · colore invalido →
400/P0001 · `cassetta_non_trovata` · `anon` → 401/42501 su entrambe · `imposta_colore` via REST con
`updated_at` **ancora identico a `created_at` al microsecondo** mentre `now()` distava 28 s.
**Dati:** 2 cassette create nel lab E2E e subito **soft-deletate** via `cassetta_elimina_atomica`.
Verificato leggendo il DB, non fidandosi degli UUID: nell'intero database le uniche righe di
`cassette` sono quelle due, 0 storico, 0 lavori con targa, 0 cassette fuori dal lab E2E.

### ⚠️ REGOLA D'ONDATA NUOVA — il container di collaudo deve essere PostgreSQL **17**
Il live è **PG 17.6**, il container era **15.18**: ereditato dall'harness del Task 1 senza
verificarlo. L'implementer l'ha auto-segnalato come «il difetto di metodo più serio dell'operazione»,
ed è la classificazione giusta. **Non era teorico:** `relacl` del proprietario è `arwdDxtm` sul live
(la `m` = `MAINTAIN`, introdotta in PG17) contro `arwdDxt` in container. Nulla in questa SQL era
version-sensitive e lo smoke ha esercitato tutti i cammini sul 17 vero — ma **ogni collaudo futuro
usi `postgres:17-alpine`**.

### ⚠️ TRE FATTI NUOVI PER IL TASK 4, osservati sul DB vero e non deducibili dal container
1. **Tutti gli esiti tornano HTTP 200.** La route deve mappare il **payload** (`data.esito`), **mai**
   lo status della chiamata RPC.
2. **La `RAISE` del colore torna HTTP 400 con `P0001`** — quindi `normalizzaColore()` **deve** fare
   `.toUpperCase()` sull'hex prima di chiamare: un `#ff00aa` minuscolo diventa un 400, non un esito.
3. **`anon` riceve 401**, non 403 né 404.

### Aperto per il Task 4, non chiudibile in SQL
La ritenta a livello di payload su `nome_occupato` quando `p_nome` era NULL (già scritta come codice
nello scheletro del piano, commit `40a738b`).

### 📌 BP-1 ARRETRATO (da fare a FASE 11, nel MAIN TREE)
`MEMORY.md` e `ROADMAP-UFFICIALE.md` non sono ancora aggiornati per questa ondata: migration `090300`
applicata, 2 RPC nuove, 3 route nuove (`/api/cassette/riordino`, `/api/lavori/[id]/cassetta`, più
quelle del Task 4), helper `rpc-retry`, `numero_cassetta` fuori da `PATCHABLE_FIELDS`.

## Task 4 — review (opus) su `c3dbf58..024ba4b`: **Approvato**, 0 Critical, 0 Important

Conformità piena ai 9 punti correttivi e a tutte le risoluzioni. **Mappatura degli esiti verificata
riga per riga contro le quattro RPC reali** (3/3, 2/2, 4/4, 3/3): nessun esito cade in un `else`
generico, e i campi accessori sono giusti (`nome` nel 409 di `crea` perché la RPC lo ritorna, assente
in quello di `rinomina` perché non lo ritorna). La ritenta su `nome_occupato` è **un solo `if`, non un
loop**, condizionata al nome automatico, ed è **distinta** da `callRpcWithRetry` — il commento cita il
motivo esatto (`error: null` vs `40P01`).

**Riconosciuto come fatto bene:** i commenti in testa ai file spiegano **perché** `service_role` non
può scrivere, con riga di migration citata — la lezione del blocco è stata interiorizzata, non solo
obbedita. `mockRpcLazy` rende le asserzioni «due chiamate» una prova che la richiesta **partirebbe**.
I test sull'isolamento tenant iniettano `p_lab` **ostili nel body** e confrontano l'intero array
argomenti con `toEqual`: cadrebbero sia togliendo il context sia accettando il body. `csrf` e
`lab-guard` non sono mockati, quindi le guardie sono esercitate davvero.

**Rischio risolto dal reviewer fuori dal diff:** `export function normalizzaColore` da un `route.ts`
**non rompe** `next build` — verificato con `next typegen` + `tsc --noEmit`, exit 0. Il validator di
Next 16.2.6 usa un vincolo strutturale che tollera export extra (a differenza del vecchio
`checkFields<Diff<…>>` di webpack).

### 8 Minor, tutti mandati in chiusura in un giro solo
1. `params.id` senza guardia UUID → 22P02 → **500 invece di 404** su tutti e tre i rami. Il precedente
   e il codice `cassetta_id_non_valido` esistono già nel file gemello.
2. **Body JSON `null` → TypeError → 500** su entrambe le route: `req.json()` risolve `null` **senza
   lanciare**, quindi il `.catch(() => ({}))` non scatta. Il cast `as Record<string, unknown>` nasconde
   il caso a `tsc`.
3. `PATCH {colore: null}` **riverniciа silenziosamente di bianco** (`normalizzaColore(null)` → `'bianca'`,
   giusto per il POST dove null = «non specificato»), mentre `{nome: null}` nello stesso handler dà 422.
4. **Fallthrough su esito ignoto va a SUCCESSO** (201/200 con `cassetta: undefined`), mentre il gemello
   `riordino/route.ts` chiude con un 500 esplicito. Oggi irraggiungibile, ma è la direzione di guasto peggiore.
5. `un_solo_campo` stona: gli altri codici sono `<soggetto>_<giudizio>`, questo è la **regola** e non il
   **verdetto** → `campi_non_validi`.
6. `normalizzaColore` è l'unico export non-handler in **112 route** del repo → in `src/lib/cassette/`.
7. I 4 rami 500 scartano l'errore Postgrest **senza logging**.
8. Due dettagli del report sopra il vero (conteggi per file 25/28 vs 24/29 reali; «ogni test verifica
   `dispatched`» — sei asserzioni su `args` non lo fanno).

**Nota di metodo dall'implementer, da non perdere:** `advisor()` è stato irraggiungibile per tutta la
sua sessione, quindi la sua self-review **non ha avuto un secondo parere**. Averlo dichiarato cambia il
peso da dare alla review indipendente; tacerlo avrebbe fatto sembrare la self-review più forte del vero.

## ✅ TASK 4 COMPLETO — commit `024ba4b` + `6f1c9a7`, review **Approvato**

Gli 8 Minor chiusi **alla radice, non in superficie** (verifica del reviewer, punto per punto):
- Il fallback 500 su esito ignoto copre **tutti e quattro** i rami (POST + PATCH nome + PATCH colore +
  DELETE), ciascuno con `if (… === 'ok')` esplicito e messaggio che nomina la RPC. L'allargamento dei
  tipi (`{esito?: string}`) **non apre buchi**: ogni confronto è su literal e ogni percorso
  non-matchato finisce nel 500. Effetto collaterale positivo non dichiarato: `data === null` con
  `error === null` ora dà un 500 pulito invece del TypeError di prima.
- La guardia UUID sta **prima del parse del body** in PATCH, quindi **una sola guardia serve entrambi
  i rami** (nome e colore), non solo quello comodo; ed è **dopo** il guard chain, quindi non rivela
  nulla a un non autenticato.
- Il guard su `{colore: null}` è nell'unico punto in cui **precede** `normalizzaColore`, che
  altrimenti l'avrebbe tradotto in `'bianca'`. E la regola vive **accanto alla funzione** (docstring in
  `src/lib/cassette/colore.ts:15-19`), non solo nel chiamante.
- **Tutti e nove i test nuovi sono killer**: i mock sono armati con lo scenario che il bug produceva
  (es. `{esito:'ok', colore:'bianca'}`), quindi senza il fix risponderebbero 200 e fallirebbero su tre
  asserzioni. `CASSETTA_ID` promosso a UUID reale: se la regex fosse troppo restrittiva cadrebbe
  l'intero file, non un test isolato.

**Precisazione onesta del reviewer, da non correggere:** il gemello `lavori/[id]/cassetta/route.ts:136`
usa lo stesso codice `cassetta_id_non_valido` ma con **422**, qui invece **404**. Non è un'incoerenza:
là l'id è un campo di **body** (input malformato), qui è un segmento di **path** (risorsa che non può
esistere). Status diverso, ragione valida.

### Task 6 — in corso
Brief `.superpowers/sdd/task-6-brief.md` · report atteso `.superpowers/sdd/task-6-report.md`.
Base per il review-package: **`6f1c9a7`**.
**Particolarità letta dalla migration applicata, che il brief non diceva:** `utente_set_nav_pref` è
`RETURNS void` — **non ha esiti json**, a differenza di tutte le altre 7 RPC dell'ondata. Successo =
assenza di `error`; non c'è `data.esito` da mappare. Inoltre **tutte le sue RAISE sono errori di
programmazione** («la route non deve produrle»), quindi la validazione di enum, flag e valore nullo va
**prima** della chiamata; e **0 righe aggiornate è un no-op ratificato** (R-4.3, utenti `admin_sistema`
con `laboratorio_id` NULL) che risponde 200 — e con `RETURNS void` non è nemmeno distinguibile.

## Task 6 — review (opus) su `6f1c9a7..4f1476b`: **Approvato**, 1 `plan-mandated` + 1 Minor

Tutte e quattro le proprietà vincolanti della RPC rispettate. **Le sei RAISE di `utente_set_nav_pref`
sono irraggiungibili per COSTRUZIONE, non per convenzione** — verificate una per una contro
`…090000:631-647`. In particolare `p_chiave` è un **letterale hardcoded** e non deriva mai dal body:
l'allowlist non è una lista da consultare, è **l'assenza stessa del canale**.

**Riconosciuto come non banale:** `isHomePref` separato da `homePrefDa` (`src/lib/preferenze/home.ts:16-19`)
previene un bug reale — validare la **scrittura** con `homePrefDa` avrebbe scritto `'due_stanze'` in
silenzio su qualunque input fuori enum invece di dare 422. E `homePrefDa` è implementata **sopra**
`isHomePref`, quindi le due semantiche non possono divergere.
Il test di injection (`impostazioni-preferenze-route.test.ts:234-242`) inietta `p_user:'attaccante'`,
`p_lab:'lab-attaccante'` e `laboratorio_id:'lab-attaccante'` nel body e fa `toEqual` sull'array di
argomenti **esatto**: un passthrough o uno spread farebbe cadere l'asserzione.
Il Minor del Task 4 su `req.json()` che risolve `null` è stato **evitato** e coperto da un test dedicato.

### ⚠️ `plan-mandated` — DUE MANDATI DEL BRIEF COLLIDONO. Portato a Francesco.
Il punto 3 delle CORREZIONI vuole che `admin_sistema` (con `laboratorio_id` NULL) riceva un **no-op
silenzioso HTTP 200**; il **pattern-route** dell'orchestratore impone **403 su `laboratorioId` null**,
prima di qualunque RPC. Il reviewer ha **scomposto** il requisito: «0 righe ≠ errore» ✅ soddisfatta ·
«`p_lab` di altro lab → 200» ✅ soddisfatta sull'unico percorso che la produce (la race fra fetch del
contesto e UPDATE) · «`admin_sistema` → 200» ❌ **irraggiungibile per costruzione**.
L'implementer ha scelto il mandato del pattern, l'ha testato e ha **documentato** la divergenza invece
di nasconderla. Raccomandazione del reviewer: **ratificare il 403** — la migration stessa dice che
questi utenti «non usano la home di lab», quindi l'impatto è prossimo a zero, e un 200 **dichiarerebbe
salvata una preferenza che non è stata scritta**.
**La difesa in profondità della RPC resta sensata a prescindere:** `utente_set_nav_pref` è una
superficie `SECURITY DEFINER` concessa a `service_role`, dove `auth.uid()` è NULL — la clausola
`WHERE … AND laboratorio_id = p_lab AND deleted_at IS NULL` è **l'unico guard di tenancy a livello DB**
e vale per qualunque chiamante futuro (altre route, job, backfill).

### Minor da chiudere: `error` vs `errore` — la convenzione è più regolare di quanto sembrasse
Il report la dava per «incoerenza preesistente indistinta». Il reviewer ha trovato la **regola** nelle
tre route sorelle: `errore: '<codice_snake_case>'` per tutto ciò su cui il client può **ramificare**,
500 di fallimento RPC inclusi (`creazione_fallita`, `rinomina_fallita`, `colore_fallito`,
`eliminazione_fallita`); `error: '<frase in prosa>'` per i rami **irraggiungibili** e per i guard.
I due 500 di questa route sono «la RPC è fallita» → devono essere `errore: 'preferenza_fallita'`.
I guard 401/403 con `error: 'origin'|'auth'|'lab'` sono già corretti.

### Minor lasciati aperti (con motivo)
- Il test R-4.3 è **tautologico** rispetto a quello di successo (stesso mock `{data:null,error:null}`):
  non copre il no-op, ma ha valore di *characterization* — inchioda il contratto «qualunque risoluzione
  senza error = 200», quindi un refactor che provasse a dedurre il conteggio righe lo romperebbe. Tenerlo.
- `dispatched` assertato su un solo ramo di successo: asimmetria, non difetto (sugli altri il dispatch
  è implicato dal 200, che si raggiunge solo passando per `then()`).

## ✅ TASK 6 COMPLETO — commit `4f1476b` + `7fba920`, review **Approvato**

Minor `error`→`errore: 'preferenza_fallita'` chiuso su entrambi i rami 500, guard 401/403 non toccati,
test aggiornati per asserire **il codice** e non solo lo status. Suite 2473/2473, `tsc` pulito.
`plan-mandated` risolto da Francesco: **governa il 403**, piano corretto in `96481d8`, nessuna modifica
al codice. Re-review del solo rinominamento non dispatchata (stringa + test, rischio nullo): la vedrà
la review finale di branch.

### Task 7 — in corso
Base per il review-package: **`7fba920`**.

## Task 7 — review (opus) su `7fba920..0c73401`: **Approvato**, 0 Critical, 0 Important

**Il fail-soft non è affidato alla fortuna ma alla TOTALITÀ dell'helper:** `liberaCassettaAllaConsegna`
ha l'intero corpo dentro try/catch e ritorna `string | null` su **ogni** cammino (error non-null ·
`data` null o forma inattesa · `esito !== 'ok'` · throw di rete). La funzione **non può lanciare**,
quindi il catch-all di `orchestrate.ts:381-383` — che farebbe `rilasciaLock()` + `errore_pdf` — è
**irraggiungibile per questa via**. L'esito della consegna è **provabilmente invariante** rispetto
alla liberazione.
Controllo aggiuntivo del reviewer sulla migration: `cassetta_libera_atomica` scrive **solo**
`cassette_lavori.liberato_at/liberato_per` e `lavori.numero_cassetta` — mai `stato`, `conformato`,
DdC, buono o fattura. **Neanche gli effetti DB possono toccare un artefatto fiscale.**

**Le due dichiarazioni contestate reggono entrambe:**
- Il test preesistente è un **irrigidimento, non un ammorbidimento**: diff **+4 righe, 0 rimozioni**;
  le asserzioni portanti sono invariate e la guardia `throw new Error('Unexpected rpc')` non è
  disattivata, solo estesa a una chiamata ora legittimamente attesa. Senza quel ramo il mock avrebbe
  lanciato un'eccezione sintetica ingoiata dal catch esterno: **verde esercitando il percorso sbagliato**.
- La route di consegna è davvero **pass-through non toccata** (`route.ts:41-44`).

**Altre cose verificate e degne di nota:** l'ordine regge (Step 4 `generateBuono` → Step 5 update →
Step 5.5 liberazione: il Buono stampa ancora la targa); l'update dello Step 5 **non** contiene
`numero_cassetta`; il lock **non** viene trattenuto più a lungo (`consegna_in_corso: false` è già
nell'update, quindi la RPC gira a lock rilasciato); il retry gratuito del ramo `gia_consegnato`
**non può fare danni** perché `cassetta_assegna_atomica` rifiuta i lavori `consegnato`; e il racconto
L5 **non può mentire** — se la RPC riesce ma la risposta si perde, degrada a `null` e nessuna riga
compare: **si sotto-racconta, mai si sovra-racconta**.
Il test (b) è l'unica asserzione che distingue la forma imposta dal difetto del brief — mock che
ritorna `{data:null, error}` **senza mai lanciare** + `expect(consoleErrorSpy).toHaveBeenCalled()`:
con la forma del brief quel test **fallirebbe**. E il ramo idempotente è **test-locked come
silenzioso**, il che impedisce la deriva verso un «logga tutto ciò che è null» che seppellirebbe i
veri errori nel rumore.

### Minor: 1 mandato in chiusura, 3 lasciati con motivo
- **(in chiusura) «Una sola penna» è garantita solo dalla lettura del codice:** nessun test asserisce
  che il payload dell'update dello Step 5 **non** contenga `numero_cassetta`. È il principio su cui
  poggia l'intera ondata e restano 12 task che potrebbero regredirlo in silenzio → serve una
  sentinella, come quella su `PATCHABLE_FIELDS` del Task 5.
- (lasciati) wrapper di timeout sulla liberazione: fuori perimetro, e il codice preesistente già
  attende `triggerPushByRole` nella stessa posizione · copertura del ramo 40P01 **su questo call
  site**: già coperto dai test propri dell'helper · ridondanza del copy con il titolo della card: la
  stringa è dettata **verbatim** dalla spec di design (`…design.md:293`), non c'è latitudine da arbitrare.

## ✅ TASK 7 COMPLETO — commit `0c73401` + `956ca8a`, review **Approvato**

Sentinella «una sola penna» aggiunta e **provata non tautologica con mutation test**: inserito
temporaneamente `numero_cassetta: undefined` in `orchestrate.ts` → RED reale (`expected true to be
false`) → ripristinato → GREEN, con `git diff` a confermare zero residui. Verifica su
`hasOwnProperty` della **chiave**, non sul valore: un `undefined` la fa fallire uguale.
Suite intera **2482/2482** (+1), 19 skipped invariati, `tsc` 0 errori.

### Task 8 — in corso
Base per il review-package: **`956ca8a`**.

## Task 8 — review (opus) su `956ca8a..8a1abc6`: **Approvato**, 0 Critical, 0 Important

**Helper totale nel senso forte:** il `try` avvolge anche la **destrutturazione** `const {data, error} = …`
— «il punto in cui la maggior parte delle implementazioni fail-soft lascia una crepa». Cammini
verificati uno per uno, incluso il thunk che lancia sincronicamente e `primo.error?.code` su `primo`
nullo dentro l'helper di retry: tutti finiscono nel catch esterno. **La funzione non può lanciare.**
**RPC fiscale intatta per COSTRUZIONE:** la chiamata ad `annulla_consegna_atomica` e la mappatura dei
suoi 4 esiti non-`ok` stanno **fra i due hunk** del diff unificato, che per definizione non contiene
modifiche. L'unico cambiamento è `case 'ok':` → `case 'ok': {`.
**Response additiva provata:** `...(cassetta ? {cassetta} : {})` — il campo è **assente**, non
`undefined` né `null`; il test (c) asserisce `toEqual({ok, messaggio})` **più** `'cassetta' in json === false`.
Il requisito nascosto nel commento SQL è onorato **con la citazione di riga esatta**, verificata
(`…090000:510-511`): è la differenza fra «logga» e «logga perché».
Il caso «rpc fallita» usa `{data:null, error:{…}}`, **la forma reale di postgrest-js**, non un throw
sintetico — cioè evita esattamente il difetto che il Task 7 dovette correggere in un test preesistente.

### Minor: 2 in chiusura, 2 da portare a Francesco / FASE 9
- **(in chiusura) M1 — il `console.error` su `niente_da_riassegnare` è rumoroso e ACCUSA l'annullo
  anche quando la causa è benigna.** La RPC ritorna quell'esito per **tre** cause (`…090000:512-514`,
  `:522`, `:528`): guardia sul lavoro · nessuna riga `liberato_per='consegna'` · cassetta eliminata.
  **Solo la prima** è il difetto descritto nel commento. Nei laboratori che **non usano la parete**,
  ogni annullo consegna emetterebbe un log a livello `error` che dice «possibile difetto nell'annullo
  consegna» — e un segnale che si accende sempre smette di essere un segnale.
- **(in chiusura) M4 — bugia di tipo su `nome`:** `{riassegnata: boolean; nome: string}` con
  `(…)?.nome as string`, mentre a runtime può essere `undefined` e il contratto del brief dice
  `nome?: string`. Innocuo in pratica, ma il cast maschera l'unico punto in cui il tipo mente.
- **(→ Francesco) M2 — gap di copertura su `FrameConsegnato`.** La dichiarazione dell'implementer è
  **verificata vera**: `FrameConsegnato.tsx:75` fa `if (res.ok) { setAnnulloAperto(false); onChiudi(); return }`
  — chiusura sincrona a schermo intero, nessuna finestra per mostrare una riga. I chiamanti della
  route sono **esattamente due**. Il componente scelto è **quello giusto, non quello comodo**.
  Gap: chi annulla dal frame «Consegnato!» non vede la riga (la riassegnazione lato server avviene
  comunque su entrambi i cammini). Mitigazione reale: `occupata_nel_frattempo` diventa più probabile
  col passare del tempo, quindi **il cammino del banner — l'annullo tardivo — è quello in cui il
  messaggio serve di più**. Estendere ora a `FrameConsegnato` significherebbe toccare un flusso DdC:
  **più rischioso, non meno**.
- **(→ FASE 9) M3 — la riga è consegnata su un canale garantito per essere smontato.**
  `router.refresh()` è chiamato **incondizionatamente** subito dopo, e il genitore monta il banner solo
  se `stato === 'consegnato'` — condizione che dopo un annullo riuscito diventa falsa **con certezza**.
  Lo smontaggio non è un rischio, è una **garanzia**; solo la tempistica è ignota e non è misurabile da
  un diff. Verdetto: **non inutile** (il valore vero è la riassegnazione lato DB), **accettabile**, ma
  **da verificare col browser**: leggibilità reale e annuncio `role="status"` a 390/768/1280,
  light e dark. Sopprimere il refresh per far durare la riga lascerebbe la scheda stale — **cura
  peggiore del male**.

## ✅ TASK 8 COMPLETO — commit `8a1abc6` + `265f793`, review **Approvato**

M1 chiuso: `console.error` → `console.warn`, testo da **imputazione a ipotesi da verificare**, con le
tre righe SQL delle tre cause citate. M4 chiuso: cast `as string` rimosso, tipo allineato a `nome?: string`.
Nota dell'implementer che merita: il test (c) ora asserisce `console.warn` chiamato **e**
`console.error` NON chiamato — **non è un ammorbidimento**, perché l'asserzione vecchia sarebbe
rimasta vera anche senza il fix.
Suite 2493/2493, `tsc` ed ESLint puliti.
**M2 e M3 restano aperti per Francesco / QA FASE 9** (vedi review sopra).

### Task 9 — in corso
Base per il review-package: **`265f793`**.

## ✅ TASK 9 COMPLETO — commit `6d59bad`, review **Approvato**, 0 Critical, 0 Important

Helper **realmente totale, non «quasi»**: la destrutturazione — il punto esatto in cui l'errore
Postgrest sfuggirebbe — vive dentro il `try`. Response provata invariata con `toEqual` (che fallisce
anche su chiavi extra). Sei rami distinti, livelli calibrati secondo la lezione del Task 8.

**Il reviewer ha verificato il conteggio del RED PER COSTRUZIONE**, non sulla parola: ha elencato
quali 9 test cadrebbero rimuovendo l'helper — ed è esattamente il 9/18 dichiarato. Il caso (d) è
correttamente classificato come **regressione**, non come RED.
Il test con `{data:null, error:{code:'08006'}}` è **quello che uccide il codice proposto dal brief**,
che quel caso lo faceva sparire senza log. Il test dei livelli verifica l'**esclusione reciproca**
(warn senza error e viceversa), non «è stato loggato qualcosa».
**Confermata falsa un'affermazione del MIO dispatch:** non esisteva alcun test per la route
rifacimento (`grep` + `new file mode` nel diff). L'implementer ha avuto ragione a segnalarlo.

**Controllo del reviewer che merita di non andare perso:** `007_rpc_rifacimento.sql:51-65` elenca le
colonne dell'INSERT esplicitamente — **nessun `cassette_lavori`, nessun `numero_cassetta`** — quindi
il lavoro nuovo nasce **senza** cassetta e l'esito `occupata` richiede una **corsa concorrente reale**.
Il `warn` non si accende sempre: la calibrazione regge.

### 🔗 Osservazione fuori perimetro del reviewer — e la risposta che ha già l'ondata
Sul ramo `occupata` la cassetta resta al lavoro **vecchio**, che `crea_rifacimento_atomico` ha appena
**annullato**: la parete mostrerebbe un lavoro annullato dentro una cassetta.
**Ma quel caso è già coperto dal Task 3:** `deriveParete` classifica come `daRiparare` ogni riga viva
il cui lavoro è `annullato`, con `motivo: 'annullo_lavoro'` (decisione D-O2), e `getParete` chiama
`cassetta_libera_atomica`. **Al primo caricamento della parete la cassetta si libera da sola.**
È esattamente la classe di righe stantie per cui l'auto-riparazione esiste — vale la pena che la
review finale di branch verifichi questo aggancio end-to-end.

### Minor rinviati alla review finale (nessuno azionabile ora)
`risultato.lavoro_nuovo_id` dereferenziato fuori dal `try` (irraggiungibile: 007 ha un solo `RETURN`,
ogni altro cammino `RAISE`) · nessun timeout sull'`await` fra commit e response (stesso trade-off già
accettato nei Task 7/8; **non** può generare un rifacimento duplicato, la guardia `stato==='annullato'`
dà 409) · `vi.useRealTimers()` fuori da un `finally` · spy console senza `restoreAllMocks` ·
esclusione reciproca dei log assertata solo sulla coppia `occupata`/`lavoro_non_valido`.

### Task 10 — in corso
Base per il review-package: **`6d59bad`**.

## Task 10 — review (opus) su `6d59bad..63e86ab`: **Da correggere** (1 Important di una riga)

**«La fedeltà al mockup ratificato è la migliore che abbia visto in questa ondata.»** Path SVG
confrontati **carattere per carattere** contro `2026-07-20-parete-cassette-v2.html:167-202`: nessuna
coordinata spostata, nessuna `viewBox` arrotondata; perfino `--mat-ceramica-chiara` (`#EFE6D2`, il
dente centrale del ponte) — valore che nel mockup esiste **solo nel markup, non nel commento** — è
stato preso dal posto giusto. Sei gradienti identici, stesso ordine, nessuna «normalizzazione».
Anatomia del tray verbatim (shadow a 3 strati, `::before` linguetta, cavità, dark **flat** con inset
ridotti). Formula hex custom esatta. `aria-label` verbatim. Troncamento **visivo e non semantico**.
`spenta` è davvero un `<button>` non-disabled, con test che asserisce **entrambe** le cose.
Regola di luminanza verificata come **quella vera**: linearizzazione sRGB + coefficienti
`0.2126/0.7152/0.0722`, soglia 0.55 — non un'approssimazione percepita.

**Le 4 dichiarazioni dell'implementer: tutte e 4 verificate VERE.**
1. `LavoroCassetta` combacia con `CassettaParete['lavoro']` di `parco-shared.ts:8-15` → **il Task 11
   potrà passare `lavoro={c.lavoro}` senza rimappare** (variabile, non object literal: niente
   excess-property check). Anche la firma di `miniaturaPerLavoro` combacia.
2. `onLongPressSheet` opzionale: **accettabile ma con una conseguenza** — senza la prop il timer non
   parte affatto, quindi ogni hold ricade su `onTap` e **il gesto sparisce in silenzio**, senza errori
   né test rossi. Da ricordare nel Task 11.
3. Colori in `ds-v3.css` e non in `tokens.ts`: **collocazione giusta** — `check-ds-compliance.sh:54-58`
   scansiona solo `.ts`/`.tsx`, e `ds-v3.css` è già la casa canonica di ogni custom property v3.
   **Caveat agli atti:** se un domani servissero le `--mat-*` **in TypeScript**, vanno promosse in `tokens.ts`.
4. Browser saltato: **sufficiente per questo gate** (tutto il verificabile è statico e il reviewer l'ha
   verificato alla fonte); il rifiuto di uccidere un `next-server` di un'altra sessione è la scelta
   giusta. **Resta scoperto per la FASE 9:** la targa `max-width: 6ch` dentro colonne strette, e la
   resa dark della shadow flat (letta, non vista).
INDICE 21→22 riconosciuto **adeguamento legittimo** (elenco cresciuto, nessun `toEqual` degradato a
`toContain`, nessuna asserzione rimossa).

### Important mandato in chiusura
**`onTap` può scattare senza un `pointerdown` corrispondente** (`Cassetta.tsx:128-138`):
`handlePointerUp` non verifica `inizio.current`, e i due ref si azzerano **solo al** pointerdown.
Su touch è irraggiungibile (implicit pointer capture); **su mouse/penna sì**: premi su A, trascini,
rilasci su B → **si apre il lavoro di B**. Un `<button>` nativo non farebbe nulla (il click richiede
down+up sullo stesso elemento): qui il tap non è annullato, è **trasferito**. Desktop 1280 è viewport
obbligatorio. Fix: `if (!inizio.current) return`. **Nessun test esercitava un `pointerup` orfano**,
quindi la suite restava verde col difetto dentro.

### Minor: 4 in chiusura, 3 rinviati
In chiusura: `transition: all` invece di `opacity` (il token è usato bene, manca la proprietà) · i test
su `targaScura` **non discriminano la formula** (`#FFEE00`/`#173A9C` cadono dallo stesso lato anche con
una luminanza percepita → aggiunto `#C0C0C0`, relativa ≈0.527 → `false`, percepita ≈0.75 → `true`) ·
commento che cita il file sbagliato · `aria-label` che fa pronunciare «protesi_fissa» quando la
descrizione è nulla.
**Rinviati:** lo stato `spenta` **non dice nulla a chi non vede** (colore + filtro soltanto) → si
risolve a **livello di parete nel Task 11**, con l'annuncio dei risultati · un `<style>` per istanza su
una griglia densa (pattern ratificato di `CardLavoro`, ma la parete monta decine di cassette → decine
di nodi identici; tutto il resto del CSS è già in `ds-v3.css`) → **review finale di branch** ·
hex a 3 cifre → `false`, irraggiungibile col contratto di `normalizzaColore`.

## ✅ TASK 10 COMPLETO — commit `63e86ab` + `b2e46fb`, review **Approvato dopo fix**

Important chiuso: `if (!inizio.current) return` in testa a `handlePointerUp` — un `pointerup` orfano
non trasferisce più il tap alla cassetta sbagliata. **Verificato con RED reale** via `git stash` della
sola modifica: i 2 test dedicati fallivano prima, verdi dopo.
Chiusi anche: `transition` limitata a `opacity` (non più lo shorthand `all`) · `targaScura('#C0C0C0')
=== false`, che **discrimina la formula WCAG** da una luminanza percepita non linearizzata ·
riferimento di file corretto in commento e report · `aria-label` che **omette** il tipo lavoro invece
di leggere lo slug macchina quando la descrizione manca.
`Cassetta.test.tsx` 16→20, suite **2547 passed / 19 skipped**, `tsc` pulito, DS-compliance verde,
`next build` OK. M6/M7/M8 non toccati per istruzione.

---

# 🔚 SESSIONE CHIUSA 21/07 (2ª) — riprendere dal Task 11 in sessione NUOVA

**Task 1→10 COMPLETI.** 35 commit sul branch (`4853458..b2e46fb`), worktree pulito, **niente
mergiato né pushato**. 4 migration applicate al DB live.
**Handoff di ripresa:** `docs/roadmap/2026-07-21-parete-cassette-ripresa-task11.md` — tracciato sul
branch **e** copiato nel main tree. Contiene i 12 vincoli d'ondata, tutti pagati con difetti veri.
**BP-1 fatto nel main tree:** `MEMORY.md` (voce 25), `ROADMAP-UFFICIALE.md`, `SESSION_ACTIVE.md`.
Il piano è stato **risincronizzato** main tree ← branch (sul branch era stato corretto 3 volte).

---

# 🚀 SESSIONE 22/07 — ripresa dal Task 11

## Pre-flight scan dei task 11→19 (skill SDD) — 2 conflitti, entrambi risolti senza escalation

- **C1 — Task 11 collega «apri sheet» un task PRIMA che gli sheet esistano (Task 12).**
  Deciso dal controller, non escalato: il Task 12 dichiara già `Modify: PareteClient.tsx (wiring)`,
  e lo Step 5 del Task 11 non chiede alcuna prova che uno sheet renda.
  **Risoluzione:** `PareteClient` tiene ORA lo stato dell'intento
  (`useState<{tipo:'nuova'} | {tipo:'cassetta', id} | null>`), ci collega cassetta libera / tile «+» /
  CTA del Vuoto / `onLongPressSheet`, e **consuma** quello stato via `aria-haspopup="dialog"` +
  `aria-expanded` sui controlli. Niente stato morto, niente placeholder; il Task 12 monta i corpi
  degli sheet sullo stesso stato.
- **C2 — doppia macchina del gesto: `Cassetta` (Task 10, interna) vs `useDragRiordino` (Task 13).**
  `Cassetta.tsx` implementa GIÀ long-press 300ms + soglia 8px e mappa long-press→sheet; il Task 13
  chiede un hook esterno con la STESSA macchina ma semantica diversa (long-press→sollevamento,
  rilascio fermo→sheet). Due proprietari dello stesso gesto sullo stesso elemento.
  **Non tocca il Task 11** (che passa `onLongPressSheet` come da handoff). **Decisione rinviata al
  Task 13, dove serve un panel advisor** (regola Advisor, CLAUDE.md §0C): è lì che si sceglie chi
  possiede il pointerdown. Non anticiparla: si deciderebbe alla cieca.
- Non escalati perché già risolti dal piano stesso: path `__tests__` nei task 11/12/13/15 (D-O1) ·
  `npx vitest run src/components/features/...` nei Task 12/16 Step 4 (con D-O1 quei path non
  contengono test: il comando va puntato a `tests/unit/`) · voce «Le cassette» toccata da Task 15
  prima che il Task 17 la crei (il testo del Task 15 lo dice già: lì SOLO la logica `homePref`).

### Task 11 — in corso
Base per il review-package: **`dbbbf07`**.

## Task 11 — review (opus) su `dbbbf07..da63138`: spec **✅**, qualità **Approvato**, 0 Critical, **2 Important**

Il reviewer ha verificato alla fonte (`tsc` exit 0, 17 test verdi sui 2 file, DS-compliance verde) e ha
confrontato pillola e parete **verbatim** col mockup (righe 39-49 e 51-64, ramo dark incluso).
Confermata giusta la correzione del brief su `ds-grana`: con la classe sul wrapper la pagina sarebbe
diventata `position:fixed; inset:0; pointer-events:none`, cioè **non cliccabile**.

**Modifica fuori elenco ACCETTATA:** `src/lib/nav/route-migrate-v3.ts:30` (+`'/cassette'`). I soli
consumatori sono `BottomNavPill.tsx:139` e `UserProfileSheet.tsx:92`: senza quella riga la pagina
usciva con l'avatar fisso v2.3 sopra il ☰ e la pill v2.3 in fondo — la mescolanza vietata da DS v3 §14.

### Important 1 — lo stato dell'intento non ha percorso di CHIUSURA
`PareteClient.tsx:42/99/146/150/160`. Un tap sulla tile «+» porta `aria-expanded` a `true` **per
sempre** e nessun dialog compare: ARIA falsa per chi usa uno screen reader, tre vicoli ciechi silenziosi
per chi vede. Il ramo `{tipo:'cassetta', id}` è oggi **write-only**.
**È la conseguenza diretta della mia risoluzione C1** (v. pre-flight sopra): la risoluzione era
sbagliata nel punto in cui fa *dichiarare aperto* qualcosa che non si può chiudere.

### Important 2 — zero copertura sul long-press, l'unico gesto che fallisce in silenzio
`tests/unit/parete-client.test.tsx`: nessun `useFakeTimers`, nessuna sequenza da 300 ms. La prop
`onLongPressSheet` c'è (`:150`) ma **niente la difende**: toglierla resterebbe verde. Test
discriminante scrivibile ORA senza il corpo dello sheet: su cassetta **occupata**, `pointerdown` →
300 ms → `pointerup` deve **non** chiamare `push('/lavori/l1')`.

### Minor rinviati alla review finale di branch
`router.refresh()` doppio al rientro (`:57-58`; il test `:129-136` incide `toHaveBeenCalledTimes(2)`
come atteso → una futura guardia dovrà correggerlo) · caso `/cassette` assente dal test diretto di
`isV3MigratedRoute` (coperto indirettamente dai 2 test di componente: buco di leggibilità, non
funzionale) · `aria-live` non ritardato, si riscrive a ogni tasto · `minHeight:20` non regge se la riga
zero-match va a capo (nessun `maxLength` sull'input) · scomposizione «+6» invece di «+5» nel report.

### Voci per il GATE ESTETICO L2 / la QA di FASE 9
- **Riga di conteggio VISIBILE** («{n} cassette accese») dove il mockup non ha alcuna riga: riserva
  ~28px sopra la parete a 390. Difendibile (su zero-match l'annuncio *deve* vedersi, e una live region
  che nasce col proprio testo non viene letta) ma **da decidere vedendola**. Se si sceglie sr-only sono
  6 righe e i test reggono.
- **La tile «+» sparisce durante la ricerca:** su «Niente per "C30"» l'utente non può creare la
  cassetta che stava cercando senza prima svuotare il campo. La difesa «fedeltà al blocco 2 del mockup»
  è **debole** (quel blocco omette anche `C7 bianca`, presente al blocco 1: è un'illustrazione
  semplificata, non una prescrizione).
- Shell `.ds-parete-shell` 480/720/1120 e colonne a 6 su desktop: valori derivati, **non ratificati**.
- Annuncio con screen reader reali: mai provato.
- **`/cassette` non ha oggi alcun punto d'ingresso in-app** (solo per URL): lo crea il Task 17.

### ⚠️ Brief-vs-spec da dirimere (segnalato dal reviewer, non un difetto del task)
Il pagliaio della ricerca usa `descrizione`; la **spec §5.1 scrive `tipoLavoro`**. Il brief Step 2 dice
`descrizione` e la sua asserzione `zircònia` vive lì, quindi l'implementazione segue il brief.
Conseguenza: «protesi fissa» digitato al banco **non accende nulla** se non è nella descrizione.

## ✅ TASK 11 COMPLETO — commit `da63138` + `c9618c5`, review **Approvato dopo fix**

Important 2 chiuso: presidio del long-press in `tests/unit/parete-client.test.tsx` (+16/-0, puramente
additivo). **Discriminazione verificata due volte** — dal fixer e di nuovo, indipendentemente, dal
re-reviewer che ha rimosso la prop e ottenuto l'identico rosso (`expected "vi.fn()" to not be called
… Received: ["/lavori/l1"]`), poi ripristinato con `git diff --stat` vuoto e 13/13 verdi.
Il ramo esercitato è quello giusto: nessun `pointerMove`, quindi `spostato.current` resta `false`, e i
300 ms esatti armano `pressioneLunga`. Stessa sequenza già usata da `tests/unit/Cassetta.test.tsx`.

### 🔒 VINCOLO D'INGRESSO DEL TASK 12 (Important 1, non chiuso qui per decisione del controller)
Lo stato dell'intento in `PareteClient` **non ha percorso di chiusura**: `aria-expanded` si incolla su
`true` e il ramo `{tipo:'cassetta', id}` è write-only. Il reviewer l'ha qualificato come vincolo
cross-task («nulla da correggere obbligatoriamente dentro il perimetro del Task 11») e la radice è la
**mia risoluzione C1**: senza il corpo dello sheet, *qualunque* consumo di quello stato resta incollato.
**Il Task 12 deve fornire `setSheet(null)` su ogni via d'uscita** (chiusura dello sheet, Escape,
successo dell'azione) — altrimenti `aria-expanded` resta bloccato **anche col corpo montato**, e allora
sarebbe un difetto vero, non più un cantiere. La re-review del Task 12 verifica questo per primo.

### Task 12 — in corso
Base per il review-package: **`c9618c5`**.

## Task 12 — review (opus) su `c9618c5..672cecf`: spec **✅**, qualità **DA CORREGGERE**

Il reviewer ha eseguito **3 mutation test + 1 sonda empirica** (tutti ripuliti, tree clean), aperto le 4
route reali, la migration e il mockup. Verificato verbatim: i 6 swatch nell'**ordine esatto** del mockup
(righe 156-162), PATCH a **un campo per chiamata**, liberazione con `JSON.stringify(null)` che
`parseBody` instrada davvero su `libera` (non 422), riordino con lista completa, nessuna `.insert()`
diretta, «Elimina» presente **solo nei commenti che la vietano**.

### Il vincolo d'ingresso del Task 11: **chiuso nel codice, NON difeso da alcun test**
Enumerati tutti i rami: ogni successo (201/200 di crea, rinomina, colore, sposta, libera, butta via)
passa da `onCambiata` → `dopoCambio` → `setSheet(null)`; scrim/swipe/Esc/«Chiudi» passano da `onChiudi`.
`aria-expanded` è **derivato** (`PareteClient.tsx:228`) e torna `false` da sé. **Nessuna via d'uscita
dimenticata.** L'unico successo che non azzera è il riordino ▲▼ — deliberato, presidiato da
`expect(onCambiata).not.toHaveBeenCalled()`, e tocca il ramo `'cassetta'`, non `'nuova'`.
**Ma la prova esibita dal report non prova quello che dice:** rimosso `setSheet(null)` da `dopoCambio`
→ **37/37 e 2591/2591 verdi**. Il test nuovo esercita solo il bottone «Chiudi». Il requisito centrale
del task viaggia senza rete — e il **Task 13 rimetterà le mani proprio lì**.
Nota buona: il presidio Task 11 sul long-press **non è stato indebolito** (mutation test → rosso corretto).

### Important 1 — il colore custom salva e chiude lo sheet a OGNI movimento del selettore
`SwatchesColore.tsx:111` + `CassettaSheet.tsx:261`. React mappa `onChange` sull'evento **`input`**, che i
picker nativi emettono **live durante il trascinamento** (Chrome desktop in modo marcato — 1280px è
viewport obbligatorio). **Confermato con sonda empirica:** un solo `change` produce
`PATCH /api/cassette/c-lib {colore:'#aabbcc'}` **e** `onCambiata()`.
Effetto: si apre il colore personalizzato, si muove il cursore di un pixel, **lo sheet si chiude in
faccia** avendo salvato un colore intermedio a caso. In `NuovaCassettaSheet` non accade (lì
`onScegli={setColore}`, solo stato locale): **il difetto è nella composizione, non nel componente.**
Nessun test tocca l'input custom → regressione invisibile alla suite.

### Important 2 — in dark mode gli swatch ereditano l'ombra della tray da 104px
`ds-v3.css:261` (`[data-theme="dark"] [data-ds="v3"] .ds-cassetta`, specificità **0,3,0**) batte
`:397` (`[data-ds="v3"] .ds-swatch`, **0,2,0**): **l'ordine di dichiarazione non conta.** In dark ogni
swatch standard prende una vignettatura da tray alta 104px schiacciata su 44px (copre ~40% del
quadrato); lo swatch **custom** non porta `ds-cassetta` e tiene la sua → in fila si vedranno ombre
diverse. Il ragionamento del report («vince perché dichiarata dopo») è vero **solo in light**.
Circoscritto al `box-shadow`: width/height/radius/padding si sovrascrivono correttamente.

### Divergenze non dichiarate, a verbale (nessuna bloccante)
CTA H60 del mockup → `TastoPrimario` è **70px** su mobile (giusto: l'altezza è del ds) · ▲▼ resi anche
sulla cassetta **occupata** (gate `totale > 1`; il brief li metteva solo sotto «Libera») · il «reload»
dopo il 409 sposta-lavoro è **deferito** al refetch su `visibilitychange` (motivato: un `onCambiata`
chiuderebbe lo sheet mentre l'utente sceglie).

### Minor rinviati alla review finale di branch
**Esc chiude due cose insieme** (`CassettaSheet.tsx:326` + `Sheet.tsx:103` + `DialogConferma.tsx:73`:
entrambi i listener su `window` → chi annulla «Butto via la C4?» esce anche dallo sheet; origine ds,
primo posto dell'ondata che compone i due overlay) · **il 422 `nome_non_valido` finisce in «riprova»**,
che non risolverà mai (nessun `maxLength`, la route rifiuta >20 char → si riprova all'infinito) ·
`ChipScelta selezionata={false}` su un'azione emette `aria-pressed="false"` («pulsante di
attivazione/disattivazione, non premuto» per un comando che sposta un lavoro; è il brief a chiedere
ChipScelta) · `RigaBloccante` a `:281` usata come «chiudi l'avviso» invece che «porta dove si risolve»
(l'uso gemello a `:327` è corretto) · `.ds-swatch:disabled` cambia **solo il cursore** (sul touch non
esiste) · `prossimoNomeSerieC` **case-sensitive** (`/^C(\d+)$/` non vede `c12` → riparte da C1 e sbatte
su 409) · `marginTop/gap: 10` crudi dove `spazio` non ha un 10.

## ✅ TASK 12 COMPLETO — commit `672cecf` + `5a8b7e4`, review **Approvato a condizione**

Tutti e tre i finding chiusi e **riverificati in modo indipendente** dal re-reviewer, non presi sulla
parola:
- **F1** (colore custom che salvava/chiudeva a ogni movimento del picker): rimesso il cablaggio
  difettoso → falliscono **esattamente** `cassetta-sheet.test.tsx:93` e `:109`, il resto verde. Un test
  asserisce «né fetch né `onCambiata` dopo 2 eventi live» **e** che la scelta resti visibile; l'altro
  che la PATCH sia **una sola**, con l'**ultimo** valore. Non è teatro.
- **F2** (ombra tray sugli swatch in dark): **misurato in Chromium con `getComputedStyle`**, non
  ragionato. Riprodotto il difetto (`std === tray` true) e chiuso (`std === custom` true,
  `std === tray` false). La nuova regola `ds-v3.css:418-420` è **pari specificità** (0,3,0) e vince per
  **ordine**. Tray della parete byte-identiche, geometria 44×44/r12 preservata in entrambi i temi.
- **F3** (chiusura sheet non presidiata): mutation rifatta sull'intera suite → `2 failed | 2594 passed`,
  e i 2 rossi sono **esattamente** i test nuovi, in tutto il repo. Esercitano successi d'azione reali
  (201 di «Crea C13», 200 di «Salva il nome»), non di nuovo il percorso «Chiudi».

Perimetro pulito: `PareteClient.tsx` **assente** dal diff, `.ds-cassetta`/`src/components/ds/**`/
`vitest.config.ts` intatti, zero asserzioni preesistenti toccate. Suite **2596 passed / 19 skipped**.

### 🛑 LA CONDIZIONE — una decisione di design da ratificare PRIMA del merge
Il fix F1 **cambia l'interazione ratificata**: brief Step 3 e mockup dicono «scegli → salvato»; ora le
6 facce standard restano **un tap**, il colore **custom** richiede un secondo tap («Salva il colore»).
Il re-reviewer raccomanda di **ratificare, non rifare**: l'idioma è coerente (sta sotto «Salva il nome»,
stesso componente, stessa abilitazione) e l'alternativa — committare i valori live — **è** il difetto.
Ma per la regola di progetto (decisione di design significativa → ratifica; GATE ESTETICO L2 prima del
merge) va portata a Francesco. **Sposta il cancello di merge, non la correttezza del fix.**

### Minor nuovi, rinviati alla review finale di branch
Con un pending, lo swatch custom porta `aria-pressed="true"` e ✓ pur non essendo il colore salvato
(nello sheet «nuova» è innocuo — lì tutto è pending; qui no, perché le altre 6 committano al tap) ·
un hex scelto e mai confermato si perde in silenzio alla chiusura e non è annullabile (speculare a
«Salva il nome», quindi coerente col resto dello sheet) · confronto `colorePending !== cassetta.colore`
case-sensitive (picker minuscolo, route maiuscola) → una PATCH ridondante · **pre-esistente:**
l'`<input type="color">` è senza `value`, quindi il picker di sistema si apre sempre su `#000000`, mai
sul colore attuale della cassetta.

### Task 13 — bloccato dal conflitto C2: panel advisor in convocazione

## 🧑‍⚖️ PANEL TASK 13 (C2) — 3 advisor, esito: convergenza sul DOVE, divergenza sul SE
Sintesi per la ratifica: **`panel-task13-sintesi.md`**. Pareri integrali: `panel-task13-architetto.md`
(411 righe) · `panel-task13-ux.md` (141) · `panel-task13-frontend.md` (478). Brief: `panel-task13-brief.md`.

**Il fatto che nessuno dei tre contesta:** sul telefono il trascinamento **oggi non parte**, e nessuna
prescrizione del piano lo farebbe partire. `.ds-cassetta` non dichiara `touch-action` → vale `auto`, lo
scroll è del browser, che emette `pointercancel`. `touch-action: manipulation` (prescritto dal brief
Task 13) **non cambia nulla**: Pointer Events L3 §8.3 dice che continua a permettere il panning.
Cambiarlo dentro il `pointerdown` **è ignorato** per l'intera durata del gesto (§8.2). L'unica uscita è
un `touchmove` non passivo, e **da React non si può**: react-dom 19.2.4 registra `touchmove` come
`{passive:true}` sul root. → **Il testo del Task 13 nel piano va corretto comunque.**

**Rischio nuovo che nessuno aveva visto:** il DnD nativo **non è più solo desktop** (iOS Safari da 15.0,
Chrome Android sì). `Cassetta` accetta già `draggable?`, ma **il Task 11 non lo passa: il rischio è
inerte**. Se lo si accendesse, l'avvio del drag nativo emette `pointercancel` e — siccome lo sheet è
deciso nel `pointerup` — **il long-press smetterebbe di aprire lo sheet su iPhone**, regressione su
codice già spedito e invisibile ai test. Verificabile solo su iPhone vero in PWA standalone.

**Convergenza (architetto + frontend, e l'UX non la contesta):** `Cassetta` **riconosce** (com'è oggi,
+1 prop `onSollevata?`), `useDragRiordino` **insegue** dal sollevamento in poi (listener su `window`
filtrati per `pointerId`, hit-testing con `elementFromPoint` → `[data-cassetta-id]`, già reso da
`Cassetta.tsx:202`), `PareteClient.riordina()` **persiste** (già scritta, già condivisa coi ▲▼).
Bocciate **A** (spacca il gesto DS fra home e `/cassette` e **riapre l'Important del `pointerup`
orfano**) e **C** (decide al render ciò che si conosce al gesto; sugli ibridi accende due canali).
Difetto ammesso: due macchine leggono lo stesso `pointerup` e non collidono **solo per disciplina** →
serve un commento normativo **e un test che VIETA** il tracking post-sollevamento.

**Divergenza:** l'UX sostiene che il riordino è compito del **primo giorno**, non da banco, e propone un
**modo «Sistema il muro»** (prendi/posa, inserimento, «Annulla» su snapshot) — costo: un giro §0B
completo, emendamento di §5.4/§5.35 ratificate il 20/07, ~8 dei 20 test di `Cassetta` riscritti.
Il frontend propone invece una **riga di taglio**: spedire ora il ramo mouse/penna + i ▲▼ (che
soddisfano già WCAG 2.2 SC 2.5.7 AA), accendere il touch solo dopo verifica su iPhone reale.

### 🔴 Difetto già in produzione, INDIPENDENTE da questa decisione — da chiudere comunque
`Cassetta.tsx:154-161`: Invio/Spazio vanno **sempre** su `onTap`; in `PareteClient:213-215` `onTap` di
una cassetta **occupata** è `router.push`. **Da tastiera, su una cassetta occupata, lo sheet è
irraggiungibile**: niente rinomina, colore, «Segna come libera», «Butta via» — e **niente ▲▼**, che
vivono lì dentro. Il vincolo che tutto il panel dava per buono («c'è sempre la via ▲▼») **è vero solo
per le cassette libere**. Cade la promessa §12 della spec.
*Da verificare:* il doppio tap di VoiceOver/TalkBack emette un `click`, e `Cassetta` non ha `onClick`
→ se confermato, la cassetta **non risponde affatto** a chi usa TalkBack.

### Due correzioni al brief del Task 13, valide qualunque strada vinca
1. Il `router.refresh()` prima del drag → **snapshot al sollevamento + riconciliazione al drop** (un
   refresh a gesto iniziato rimonta la griglia sotto il dito).
2. **`Reorder` di framer-motion non è riusabile**: `checkReorder` è strettamente 1-D, la parete è una
   griglia che va a capo su 3/4/6 colonne. Serve un riduttore proprio (array move per inserimento).

### Task 14 — implementato, in review
Commit `4c1c204`, base per il review-package `5a8b7e4`. Suite **2641 passed / 19 skipped**.
`ProgressDots` esteso con un **secondo componente nello stesso file** (`ProgressDotsStanze`): firma e
corpo dell'originale invariati, **nessun consumatore da colmare**.

## 🧑‍⚖️ RATIFICHE DI FRANCESCO — 22/07/2026
1. **Task 13 → S2, trascinamento COMPLETO, touch incluso.** Con due condizioni esplicite: (a) una
   **ricerca approfondita** su come implementarlo, studiando la letteratura; (b) le **animazioni devono
   essere molto fluide e ben fatte** — è un requisito, non un contorno. Il panel resta valido sul DOVE
   (`Cassetta` riconosce · hook insegue · `PareteClient` persiste); il ramo touch NON si taglia.
2. **Task 12 → doppio tap del colore custom RATIFICATO.** «Salva il colore» resta.
3. **Task 11 → la ricerca deve essere GLOBALE**, su **ogni** campo possibile, così da garantire
   l'identificazione della cassetta **o del lavoro contenuto**. Il pagliaio attuale (nome · n.numero ·
   dentista · paziente · descrizione) va **esteso**, non solo allineato alla spec §5.1.

## Task 14 — review (opus) su `5a8b7e4..4c1c204`: spec **❌**, qualità **DA CORREGGERE**
Le 4 mutazioni dichiarate dall'implementer sono state **tutte riconfermate** dal reviewer (`inert` →6
fail · soglia IO →1 · posizionamento iniziale →3 · reduced-motion →1): i test presidiano la logica, non
il mock. `ProgressDots` **byte-identico** (diff della sola funzione: vuoto), nessun consumatore toccato.

### §0 — la deviazione sul deep-link NON regge
Con `homePref='pile'` + `?stanza=parete` l'implementer non legge la parete e resta sulle pile. Le tre
gambe della motivazione cadono: (a) l'auto-riparazione parte **solo** per righe già chiuse ed è
**convergente** — irreversibile ≠ pericolosa; (b) `cassette/page.tsx:23` chiama `getParete`
**incondizionatamente**, e `/cassette` è raggiungibile da qualunque home: «chi ha scelto solo le pile
non la paga mai» è **falso**; (c) spec §7 dice che il deep-link «è la garanzia che NESSUNA stanza è mai
irraggiungibile» — e la FASE 9 mette `?stanza=` fra gli scenari di QA. **L'asimmetria è autoinflitta:**
il caso speculare (`parete` + `?stanza=pile`) **è** onorato.
⚠️ Il report invocava «le interfacce verificate dell'orchestratore, dichiarate vincenti sul brief»:
**quel testo non esiste nel repo** — era una mia formula di dispatch, non un documento. Le due autorità
visibili (brief Step 1 e spec §7) dicono l'opposto. Lezione di dispatch da non perdere.

### Important — 2
- **B-1 `focusDaPortare` resta armato** (`StanzePager.tsx:113-131`): `vaiA` alza il flag **prima** di
  sapere se lo stato cambia; se la destinazione è la stanza già attiva, `setAttiva` fa bail-out, l'effect
  non gira e il flag resta `true`. Provato con 2 test: **freccia → Invio non entra nella stanza**, e un
  tap sul dot già attivo fa **rubare il focus** al primo swipe. Nessuno dei 32 test cade, perché nessuno
  tocca lo stesso dot due volte né mescola tap e swipe.
- **B-2 `getParete` sequenziale** (`dashboard/page.tsx:53`): con la preferenza di **default** ogni
  caricamento della home aggiunge un round-trip **dopo** il `Promise.all` (spec §6 lo vuole dentro), e lo
  paga anche il **desktop ≥1024**, dove nessuna stanza viene resa. Se cade il gate di §0, torna in parallelo.

### Minor a verbale (gate L2 / review finale)
`useEffect` invece di `useLayoutEffect` sul posizionamento iniziale → resta **un frame** di stanza Pile
`inert`+`aria-hidden` dipinto prima dello scroll (era permanente, ora è un frame; il test passa identico
in entrambi i casi) · testata della stanza Parete a **31px** invece dei **23px** del mockup ratificato
(`2026-07-20-parete-collocazione-home.html:226`), cioè il «head saluto compresso» del brief · il
`tablist` è l'**ultimo nodo del DOM**: nessun Tab in avanti dai dots dentro la stanza (APG lo vuole
prima dei tabpanel) · tap-to-snap con `behavior:'smooth'` nativo invece di `molla.smooth` (il brief
prescrive la chiamata nativa: il brief vince, ma la divergenza dalla spec non era dichiarata) ·
⚠️ non verificabile in jsdom: se lo `scrollTo` di montaggio non fa effetto, la prima notifica dell'IO
riporta ad attiva=`pile` e scarta in silenzio il `?stanza=parete`.

### 📋 Coda di lavoro aperta dalle ratifiche del 22/07
1. **[in corso]** Fix Task 14 — deep-link `?stanza=` vincente, `focusDaPortare`, parete nel `Promise.all`.
2. **[in corso]** Ricerca approfondita drag touch + animazioni (workflow 6 fronti + verifica
   avversariale + 2 sonde nel repo) → `.superpowers/sdd/ricerca-drag-touch.md`. È il **prerequisito
   ratificato** del Task 13: l'implementer del 13 legge quel documento, non il brief nudo.
3. **[da fare] Ricerca GLOBALE della parete (Task 11, ratifica 3).** Il pagliaio di `filtraCassette`
   (`src/components/features/cassette/filtra-cassette.ts`) va esteso a **ogni** campo utile
   all'identificazione della cassetta **o del lavoro contenuto**: oggi copre nome · `n.{numero}` ·
   dentista · paziente · descrizione; mancano almeno il **tipo di lavoro leggibile** (oggi c'è solo lo
   slug `tipoDispositivo`, es. `protesi_fissa`, che non matcha «protesi fissa» digitato) e il **colore**
   della cassetta. Nota: `CassettaParete` è la shape di `parco-shared.ts` — se serve un campo che non
   c'è, va aggiunto lì e in `deriveParete`, con i test relativi.
   ⚠️ Da NON dispacciare finché il fix Task 14 non ha committato: un solo implementer per volta sul
   branch, altrimenti si scontrano sull'index e sul pre-commit hook.
4. **[da fare]** Task 13 con S2 ratificata (touch incluso), a valle del documento di ricerca.
5. **[da fare]** Task 15 → 19, più i gate: mockup 4 miniature (Task 18) e GATE ESTETICO L2.

## ⚠️ 22/07 — due cadute di RETE (non difetti del lavoro), e una lezione che vale più delle due
Domanda di Francesco: «che sono questi due errori?». Verificato alla fonte prima di rispondere.

1. **Fix Task 14 morto** — `API Error: Connection closed mid-response`, mentre stava per consultare
   l'advisor. **Nessun commit, working tree pulito, HEAD ancora `4c1c204`**: lavoro perso per intero,
   nulla di corrotto. Ridispacciato da zero.
2. **Workflow di ricerca drag touch: 7 agent su 9 falliti** (ConnectionRefused · ENOTFOUND ·
   ECONNRESET · 2 stalli da 180s × 6 tentativi). **Tutti e 6 i fronti di ricerca sono caduti**; sono
   sopravvissute solo le 2 sonde empiriche sul repo.

### 🔴 La lezione: il workflow ha prodotto lo stesso un documento, e sembrava buono
L'agente di sintesi ha ricevuto `materiale` **vuoto** (i sei `null` filtrati via da `.filter(Boolean)`)
e ha scritto comunque **22 KB** di raccomandazioni dettagliate — CSS esatto, listener esatti,
coreografia del gesto — **senza dichiarare da nessuna parte che la ricerca non c'era**. Il workflow ha
riportato `sintesi: null` solo perché è caduta anche la *risposta* finale: **il file era già scritto**.
Se avessi guardato solo il file, avrei dato a un implementer un documento fondato sul nulla.
**Il controllo che l'ha smascherato:** contare le URL citate (**5** in tutto, per una ricerca di
letteratura su sei fronti) e incrociare con `agents_done: 2` del journal.
→ **Regola operativa d'ora in poi: prima di usare l'esito di un workflow, incrociare il journal
(`agents_done` / `failures`) con il documento prodotto. Un artefatto esiste ≠ è fondato.**
Documento messo in sicurezza come `ricerca-drag-touch-SCARTATA-2026-07-22.md`, con l'avviso in testa.
Le sole parti probabilmente attendibili erano le misure sul repo (sonde). Ricerca **rilanciata** in
resume: le 2 sonde tornano da cache, i 6 fronti si rieseguono.

## Task 14 — round di fix: commit `d6a4e2f`, eseguito DALL'ORCHESTRATORE in prima persona
Due dispatch consecutivi del fixer morti per errori di rete (`Connection closed mid-response`,
`ECONNRESET`) senza committare nulla. Perimetro piccolo e noto → fix nel loop principale.
- **F1:** `vistaHome('pile','parete')` → `{tipo:'pager', iniziale:'parete'}`. Domanda aperta risolta:
  **pager**, non sola stanza — chi ha preferenza `pile` non ha via di ritorno dedicata (la voce
  «I lavori» del Task 15 è condizionata a `homePref==='parete'`); col pager le pile restano a uno
  swipe e la garanzia §7 non dipende da un altro task. Commento di `vistaHome` riscritto (affermava
  cose false su `getParete` e sul «nessuna superficie emette quel link»).
- **F2:** in `vaiA`, stanza già attiva → focus subito (il sottoalbero non è inerte), altrimenti flag;
  `attiva` nelle dipendenze. **Prova di discriminazione eseguita:** difetto rimesso → 2 failed su 36,
  esattamente i 2 test nuovi; ripristinato → 36/36.
- **F3:** `getParete` DENTRO il `Promise.all` (letta sempre, in parallelo); `serveParete` decide
  l'USO, non più la lettura. Chi ha `pile` paga 3 query in parallelo a latenza zero; il default
  smette di pagare un round-trip in fila.
- 2 asserzioni preesistenti SOSTITUITE (fissavano in verde il difetto F1), con la ragione in commento.
- Suite **2645 passed / 19 skipped** (baseline 2641, +4), `tsc` 0, pre-commit completo passato.
- ⚠️ Auto-review non indipendente: **re-review dispacciata** con trasparenza sul conflitto (il
  reviewer sa che il fixer è l'orchestratore). QA FASE 9: aggiungere il caso `pile`+`?stanza=parete`
  (forma nuova: pager con dots per chi ha scelto «solo le pile»).

## ⚠️ 22/07 mattina — RIAVVIO DELLA SESSIONE: due lavori in volo persi, entrambi rilanciati
Il riavvio ha ucciso (1) la re-review del fix Task 14 (nessun verdetto mai consegnato, nessun file)
e (2) il resume del workflow di ricerca. **Il commit `d6a4e2f` è integro, working tree pulito.**
- Dal journal del workflow: **5 fronti di ricerca su 6 COMPLETATI e in cache** (pointer-scroll,
  librerie, animazioni, ios-pwa, a11y — 20-27 affermazioni e 22-42 fonti ciascuno), **19 verdetti
  avversariali**, **2 sonde**. Manca il fronte **autoscroll**, parte dei verdetti, e la **sintesi**.
  → workflow ripreso con `resumeFromRunId`: la cache rigioca, si rieseguono solo i pezzi mancanti.
- Re-review Task 14 ridispacciata da zero; stavolta il reviewer scrive il verdetto anche su file
  (`task-14-rereview.md`) così sopravvive a un eventuale riavvio.
**Stato Task 14: fix committato e verificato dai test (2645 verdi, discriminazione provata), ma NON
ancora dichiarabile completo — manca il verdetto della re-review indipendente.**
Istruzione di Francesco: al termine delle due operazioni in background, FERMARSI e attendere.

## ✅ TASK 14 COMPLETO — commit `4c1c204` + `d6a4e2f`, re-review **APPROVATO** (0 difetti nuovi)
Verdetto integrale in `task-14-rereview.md` (scritto su file per sopravvivere ai riavvii).
Il re-reviewer ha verificato su `git show d6a4e2f` (non solo sull'artefatto .diff dell'autore):
- **F1 chiuso** — matrice `vistaHome` completa (3×4) coerente; la scelta PAGER regge nel merito;
  commento riscritto verificato VERO contro `parco.ts` e `cassette/page.tsx`.
- **F2 chiuso** — discriminazione RIFATTA dal reviewer: difetto reintrodotto → `2 failed | 34 passed`
  (esattamente i 2 test nuovi), ripristino via `git checkout` → 36/36. Il focus «subito» non scatta
  da freccia; `attiva` nelle deps è load-bearing (senza, il difetto torna).
- **F3 chiuso** — `pareteLetta` 5° elemento del `Promise.all`; `serveParete` unica regola d'uso;
  costo RPC accettato e dichiarato (caso sano = 0 RPC, cleanup convergente).
- Asserzioni sostituite: fissavano il difetto, non asserzioni legittime; parte legittima preservata.
- Perimetro: esattamente 4 file, Minor rinviati intatti, `tsc` 0, suite 2645/19, tree pulito.
**QA FASE 9 / GATE L2:** aggiungere il caso `pile`+`?stanza=parete` (pager mai visto in browser).

### In attesa: workflow ricerca drag touch (resume da cache, manca autoscroll+verdetti+sintesi).
Al suo completamento: STOP e attendere comando di Francesco (istruzione esplicita).

## ✅ RICERCA DRAG TOUCH COMPLETA — `ricerca-drag-touch.md` (40,8 KB), stavolta FONDATA
Incrocio journal↔documento eseguito (la regola del 22/07): **57/57 agenti completati, 0 errori**;
il documento cita **65 riferimenti a fonti** con legenda [spec]/[lib], ha una sezione dedicata
«Rischi residui e cose NON verificate», e chiude con le fonti primarie (Pointer Events L3, Touch
Events, DOM Standard, WHATWG HTML §DnD). Struttura in 8 capitoli, incluse le correzioni al brief.

### La raccomandazione (sintesi; il documento è la fonte per l'implementer del Task 13)
- **Nessuna libreria nuova.** Hook a mano (`useDragRiordino` + core puro `riordino-core.ts`),
  framer-motion 12.38.0 (già nel bundle) SOLO per le animazioni.
- **Drag-vs-scroll:** `touch-action: manipulation` statico sui tray + long-press 300ms a dito fermo
  + **listener nativo `touchmove` su `window` registrato AL MOUNT con `{passive:false}`** che fa
  `preventDefault` solo a drag attivo (guardia `e.cancelable`) — pattern convergente di
  dnd-kit/rbd/SortableJS, obbligato dalla spec (il pan non è cancellabile dai pointer event).
- **Ghost in portale su `document.body`** (fixed, `pointer-events:none`, 1:1 senza molla) + FLIP
  `layout` con `molla.smooth` sulle sorelle + originale in flow a opacity 0.4. Token: `molla.press`
  (sollevamento) · `molla.smooth` (sorelle) · `molla.snappy` (atterraggio/annullo). Costanti nuove
  dichiarate: scala 1.06, opacity buca 0.4.
- **Hit-testing aritmetico O(1)** dal centro del ghost (closestCenter), rect misurati al lift;
  **inserimento (arrayMove), MAI scambio**; **auto-scroll rAF obbligatorio** (min(25%,180px),
  900 px/s, damp 400ms) — su `/cassette` scrolla il documento.
- **Correzioni al brief Task 13:** eliminare `router.refresh()` pre-drag (→ snapshot+buffer+
  `riconcilia()` al drop, una sola POST) · NON usare Reorder di framer-motion · niente HTML5 DnD
  nemmeno su desktop · soglia 8px riqualificata (touch=annulla hold, mouse=trigger) ·
  hold=sollevamento, rilascio-fermo=sheet.

### Rischi residui dichiarati (capitolo 7 del documento)
1. La catena long-press→preventDefault è dedotta da spec+sorgenti, **MAI provata su device**: serve
   un **prototipo ~50 righe** su iOS / Chrome Android / Samsung / Firefox Android PRIMA dell'hook.
2. Durata del long-press di sistema iOS (~0,5s) e slop iOS (<8px) non confermate: 300ms e tolleranza
   da tarare sul campo.
3. Loupe iOS 18 tap+hold (WebKit 296492 APERTO) e interferenza TalkBack/preventDefault non verificate.
4. **Due difetti a11y pre-esistenti da fixare nel Task 13** (già noti dal panel): niente `onClick`
   su `Cassetta`; riordino irraggiungibile da tastiera sulle cassette occupate — WCAG 2.5.7/2.1.1.

# 🛑 STOP — istruzione esplicita di Francesco (22/07)
Entrambe le operazioni in background sono concluse (Task 14 approvato · ricerca completa).
**Non dispacciare il Task 13 né la ricerca globale della parete senza il suo comando.**
Prossimi passi possibili, in ordine di coda: (a) ricerca globale parete [ratifica 3, piccolo],
(b) Task 13 col documento di ricerca [grande], (c) Task 15→19.

## ✅ RICERCA GLOBALE PARETE (ratifica 3) — commit `19b1267`, review ✅/Approvato
Pagliaio occupata: nome ∥ n.numero ∥ dentista ∥ paziente ∥ descrizione ∥ **etichetta tipo (LABEL_MACRO,
lookup difensivo)** ∥ **colore**; libera: nome ∥ colore. Slug macchina escluso di proposito. Il reviewer
ha verificato con mutazione che il fallback `?? ''` è load-bearing, e che il test usa l'etichetta VERA
importata (discrimina slug da label). 27/27 verdi, asserzioni Task 11 byte-identiche, tsc 0.
**Minor a verbale (per Task 19/spec):** un colore hex custom nel pagliaio può collidere con query
numeriche corte (es. `#144a8c` contiene «144») — rumore additivo, mai un mancato riconoscimento;
la garanzia della ratifica regge. + refuso ereditato: titolo di un test Task 11 cita «tipo» mai asserito.

### Task 13 — dispatch in preparazione (S2 ratificata, documento di ricerca come fonte)

## ✅ TASK 13 implementato — commit `33a7721` (+ `682911d` docs piano), review: spec ✅ / qualità DA CORREGGERE
Il reviewer ha rifatto la mutazione del test che VIETA (guardia `sollevata` tolta → 1 failed, quello
giusto), campionato il core (discriminante), verificato D-8 (home passa solo `onTap`: timer mai armato,
`click` sintetico ingoiato da `tapGestito` → nessun doppio scatto), catena touch conforme alla ricerca,
token/motion puliti, suite 2683/19, tsc 0.
- **B-1 CRITICAL — ghost destilizzato e fuori posizione:** il portale su `document.body` NON porta
  `data-ds="v3"`; `.ds-ghost`, `.ds-cassetta.*` e tutti i token vivono SOLO sotto quello scope
  (`ds-v3.css:11`), e lo style inline non dà `position` → senza `.ds-ghost` niente `position:fixed`:
  il ghost cade in normal-flow in fondo al body, grezzo. Su touch il ghost È l'interazione.
  Pattern già in casa: `Sheet`/`DialogConferma`/`Avviso` portano `data-ds="v3"` sul nodo portato.
  Invisibile a jsdom; sarebbe emerso in FASE 9. **Fix in dispatch.**
- **B-2 IMPORTANT — a11y n.1 (sheet da tastiera su occupata) DEFERITO dietro gate §0B:** mockup
  prodotto (`docs/design/mockups/2026-07-22-riordino-affordance-a11y.html`, light+dark, ≥44px,
  pattern afferra/frecce/Esc), React in attesa dell'ok di Francesco. **MERGE-BLOCKING**: WCAG 2.1.1
  fallisce su occupata finché non chiuso (e con esso l'alternativa 2.5.7: i ▲▼ vivono nello sheet).
- Minor rinviati alla review finale: annuncio SR di successo emesso PRIMA della POST (rollback muto
  per chi non vede) · atterraggio ghost scostabile di px se il drop cade nella finestra FLIP (fix
  aritmetico noto, da decidere su evidenza device) · auto-scroll min 1px a msIngaggio=0.
- Rulings espliciti del reviewer: `vibra('light')` al lift conforme (ricerca §2.4.3) · live region
  assertiva senza `role="status"` accettata con motivazione.
- **Prototipo device consegnato:** `docs/design/mockups/2026-07-22-prototipo-drag-touch.html` —
  da far provare a Francesco su iPhone/Android (catena long-press→preventDefault mai provata su device).

## ✅ B-1 (Critical Task 13) CHIUSO — commit `0d8291b`, re-review indipendente: Chiuso
Wrapper `<div data-ds="v3" style={{display:'contents'}}>` da ANTENATO del `.ds-ghost` (il combinatore
discendente di `ds-v3.css:285` lo richiede: sullo stesso nodo NON matcherebbe — trappola verificata dal
re-reviewer). Dark: `data-theme` vive su `<html>` (`ThemeInitializer.tsx:8-9`), antenato comune anche di
`document.body` → matcha senza duplicazioni, stesso pattern di Sheet/DialogConferma/Avviso.
Discriminazione rifatta dal re-reviewer (attributo tolto → 1 failed; rimesso → 22/22). Suite 2684/19.
**Task 13: resta aperto SOLO B-2** — merge-blocking, gate di Francesco sul mockup affordance a11y.

## 🧑‍⚖️ DECISIONE DI FRANCESCO (22/07, gate mockup a11y) — la tastiera NON è prioritaria
Alla domanda sul mockup della maniglia, Francesco ha risposto: «da PC, non possiamo mimare il
comportamento touch usando il mouse? Non è importante poter eseguire le operazioni da tastiera».
**Risposta di fatto: il mouse replica GIÀ tutto** (stessa macchina pointer: click=tap, hold
300ms=sollevamento→drag, hold+rilascio fermo=sheet) — nessun lavoro necessario su quel fronte.
**Conseguenza ratificata:** il lavoro maniglia/tastiera (React) ESCE dall'ondata. B-2 passa da
merge-blocking a **deferito per decisione del proprietario**. Il mockup resta agli atti
(`2026-07-22-riordino-affordance-a11y.html` + screenshot) per quando si vorrà riprenderlo.
⚠️ Da fare al Task 19: emendare la spec §12 con la deroga esplicita (la promessa «riordino
accessibile da tastiera» oggi non è mantenuta sulle occupate: WCAG 2.1.1/2.5.7 restano scoperte lì —
messo a verbale, deciso dal proprietario). Voce di backlog consigliata a fine ondata.

## ✅ TASK 13 COMPLETO — commit `33a7721` + `682911d` + `0d8291b`, review chiusa
Con B-2 deferito per ratifica, non restano finding aperti. Minor rinviati alla review finale:
annuncio SR pre-POST · atterraggio ghost in finestra FLIP · auto-scroll min 1px.
**Prototipo device pubblicato come artifact** per la prova su iPhone/Android di Francesco:
https://claude.ai/code/artifact/5bfe1117-58ec-47a7-aac9-0cb0042a39b6 (alternativa locale:
`python3 -m http.server` in docs/design/mockups + IP del Mac sulla stessa Wi-Fi).
Esito della prova su device → decide la taratura finale (300ms, soglia 8px) in FASE 9.

### Task 15 — prossimo in coda

## ✅ TASK 15 COMPLETO — commit `447128f`, review spec ✅ / qualità Approvato (0 Critical, 0 Important)
Verificati alla fonte: precedenza segnale intatta sui casi preesistenti (test s1–s9 non toccati),
test nuovi discriminanti (`introVista:true` e `n=0` coperti), conteggio racconto dal totale REALE
(`pareteLetta`) giudicato CORRETTO (il backfill è lab-wide, la striscia c'è anche per gli utenti
`pile`), PATCH col contratto reale, chiamanti firma estesa tutti colmati, «Le cassette» correttamente
NON creata (Task 17). Suite 2702/19, tsc 0.
Divergenza legittima a verbale: `height={22}` non implementato (`Cassetta` non ha quella prop;
interfaccia reale vince; dimensionamento già CSS → L2).
### Minor rinviati alla review finale di branch
- **«1 cassette»** con n=1 (verbatim dalla spec ma sgrammaticato) → decisione dizionario.
- Report sovradichiarato: il test trial-vs-racconto NON esiste (l'ordine dell'array lo garantisce
  strutturalmente ma non è presidiato) → aggiungere test o correggere report.
- **Flake d'ordine nella suite** (pre-esistente, NON di questo task): 1 run su 2 → 12 failed in
  `avviso-caricamento-vuoto.test.tsx`, verde in isolamento e alla ri-esecuzione. `isolate:true` di
  default esclude contaminazione dai test nuovi. ⚠️ FASE 10 vieta il deploy con CI rosso →
  investigare il determinismo della suite PRIMA di fidarsi del verde CI.
- Verbale Task 14 confermato preciso: mobile-`parete`-puro non vede il racconto (striscia assente lì).

### Task 16 — in corso
Base per il review-package: **`447128f`**. Chiude i 2 vincoli di sequenza aperti dell'handoff
(ConfermaCassettaSheet/TabAccettazione che PATCHano ancora `numero_cassetta` = no-op silenzioso;
ponte `.map(c => c.nome)` in lavori/page.tsx:42).

## ✅ TASK 16 COMPLETO — commit `f334df8`, review spec ✅ 5/5 / qualità Approvato (0C, 0I, 1 Minor)
**I due vincoli merge-blocking dell'handoff sono CHIUSI:**
1. Il no-op `PATCH numero_cassetta` è morto DAVVERO: grep repo-wide, ogni occorrenza residua
   classificata legittima (tipi, letture server, display, sentinella con test di regressione).
   Il punto load-bearing era in `useLavoroForm.save()` (`{...data}` spandeva la colonna):
   `delete patchBody.numero_cassetta` alla sorgente, mutazione RIFATTA dal reviewer → test cade.
2. Ponte `.map(c => c.nome)` rimosso: catena `{id,nome}` colma da `getCassetteSuggerite` fino allo
   sheet, nessun `string[]` residuo (grep).
Contratti POST corretti (ramo per presenza di chiave, nessun successo implicito), test riscritto
PIÙ FORTE (id ≠ nome → discrimina davvero), TabAccettazione v2.3 senza import v3 (§14), refetch
post-409 via `router.refresh()` che aggiorna le chip nello sheet montato preservando lo stato client.
Suite 2709/19 (flake noto ricomparso 1 volta, isolato → 29/29, non attribuito), tsc 0.
Minor rinviato: fallback `nomeOccupata` che in caso limite renderebbe «La null è appena stata occupata».

### Task 17 — in corso
Base per il review-package: **`f334df8`**.

## ✅ TASK 17 COMPLETO — commit `e4f827a`, review spec ✅ 5/5 / qualità Approvato (0C, 0I)
Divergenza icona shortcut approvata nel merito (il PNG del brief non esiste; `/icons/icon-192.png`
coerente con le 2 esistenti; una shortcut → 404 sparisce su Android). Query dei conteggi verificate
contro lo schema reale (`deleted_at`/`liberato_at`/tenant scoping; indice unico parziale garantisce
righe vive = occupate). Rollback della radio su PATCH fallito con test su ENTRAMBI i rami (500 e
reject). Radio vere, 44px, radiogroup. Nessun import v3 in pagina v2.3. Suite 2717/19, tsc 0.
Minor rinviati: fallback `--success` divergente fra file (#16A34A vs #3DCB5C, solo fallback) ·
nessuna guardia PATCH concorrenti (teorico) · 2 path imprecisi nel report (prosa, non codice).
**`/cassette` ora HA i suoi punti d'ingresso: shortcut PWA · ☰ «Le cassette» (dopo Dentisti, con
conteggi) · NavDesk (prima di Agenda) · riga «La tua home» in /impostazioni.**

### Task 18 — in corso (🛑 GATE: approvazione di Francesco sulle 4 miniature PRIMA del React)
Base per il review-package: **`e4f827a`**. Steps 1-2 (mockup + screenshot) in dispatch; STOP al gate.

## 🧑‍⚖️ GATE TASK 18 SUPERATO — le 4 miniature RATIFICATE da Francesco (22/07, due giri)
- **Allineatore → A** (arco aperto tratteggiato) — primo giro.
- **Mascherina/bite → B** (piena + cresta occlusale) — primo giro.
- **Riparazione → C** (totale spezzata in due metà scostate e ruotate: il vuoto a V è la frattura) —
  secondo giro, richiesto perché A/B dicevano «rotta» con una linea disegnata sopra.
- **Generica → D** (molare visto dall'alto, occlusale, solchi a Y) — secondo giro, richiesto perché
  A/B erano denti frontali confondibili con la corona ratificata.
Il secondo giro (simboli C/D di riparazione e generica) è stato disegnato DALL'ORCHESTRATORE
direttamente nel mockup (`2026-07-21-miniature-estensione-legenda.html`), con le scelte del primo
giro marcate e le scartate a verbale al 55%. Screenshot round 2:
`screenshots/2026-07-22-miniature-round2-{light,dark}.png`.
⚠️ Le modifiche al mockup sono NON ancora committate (Task 19 Step 1-2 sta committando in
background: un solo commit alla volta sul branch). Al suo termine: commit del mockup aggiornato +
dispatch Task 18 Step 4 (React: i 4 path ratificati in `MiniaturaLavoro`).

## 📱 PROVA SU DEVICE SUPERATA (Francesco, 22/07) — iPhone E Android: «funziona perfettamente»
La catena long-press→preventDefault→ghost regge su entrambi i telefoni: il rischio residuo n.1 della
ricerca è CHIUSO con evidenza di campo. Domanda di Francesco sull'auto-scroll trascinando verso righe
fuori schermo → già implementato nel Task 13 (zona 25%/max180px, 900px/s, damp 400ms, bidirezionale,
review conforme). **Il prototipo non lo include di proposito** (testava solo la catena critica).
→ QA FASE 9: verificare l'auto-scroll su device con la parete seedata, entrambe le direzioni.

## 🔬 Indagine flake vitest AVVIATA (richiesta esplicita di Francesco, prompt del chip incollato)
Vincolo: SOLO diagnosi, nessuna modifica/commit (il branch ha Task 19 in commit e Task 18 Step 4 in
coda; il fix si applica come step dedicato dopo la diagnosi).

### Indagine flake: DEDUPLICATA. Il chip era già stato avviato da Francesco in una sessione separata
(worktree proprio): la mia copia in background è stata FERMATA per non duplicare il lavoro e non
falsare le misure con due suite complete in parallelo sulla stessa macchina. L'esito arriverà dalla
sessione del chip; alla review finale di branch verificarne il fix prima di fidarsi del verde CI.

### ⚠️ Correzione: la deduplicazione dell'indagine flake era un FALSO. Verificato con
`list_sessions`: NESSUNA sessione separata sta indagando — il messaggio «già avviato dall'utente»
si riferiva al click sul chip che ha incollato il prompt QUI, non a una sessione nuova. Avevo quindi
fermato l'unico investigatore attivo. **Rilanciato.** Lezione: un esito di un tool che contraddice
ciò che l'utente afferma va verificato alla fonte, non ribadito.

## 📌 DIRETTIVA DI FRANCESCO (22/07) — nuova ondata post-merge: «Miniature 38 + legenda»
Testo: «vorrei un simbolo diverso per ognuno dei 38 tipi, perché a colpo d'occhio possa capire cosa
contiene la cassetta; in più un piccolo pulsante/tooltip/spoiler con la legenda dei 38 simboli».
**Non entra in quest'ondata** (che è in chiusura: Task 18 Step 4 + FASE 7 + review + QA): è un lavoro
di design pieno — 38 SVG materici che devono restare distinguibili a 34px E a 22px — con gate §0B.
Impianto proposto per l'ondata nuova:
1. **Sistema visivo per FAMIGLIE**: ogni macro-famiglia tiene la sua silhouette base (quella già
   ratificata) e i tipi granulari si distinguono per dettagli codificati (elementi, materiale, viste)
   — così 38 simboli restano un sistema, non 38 disegni slegati. Ratifica A BLOCCHI per famiglia
   (gate gestibili, non un mockup monstre da 38).
2. **Legenda**: TastoTondo «?» sulla pagina /cassette (e voce nello sheet cassetta) che apre uno
   Sheet ds con la legenda completa, cercabile, raggruppata per famiglia — dati derivati da
   TIPI_LAVORO + mappa miniature (una sola fonte di verità, mai lista duplicata a mano).
3. Architettura già pronta: la mappa a 3 livelli del Task 2 (GRANULARE→MACRO→generica) è fatta
   apposta — si riempie GRANULARE con le 38 voci, zero cambi strutturali.
Avvertenza di design DA DIRE a Francesco (detta, 22/07): a 22px la distinguibilità cala col numero
di simboli; il sistema per famiglie + la legenda sono la mitigazione. Da validare col panel UX
all'apertura dell'ondata (Regola Advisor).
→ Da riportare in ROADMAP-UFFICIALE.md alla chiusura d'ondata (BP-1), voce nuova post-merge.

## 🔧 Repoint NavDesk §5.35 → §5.37 (rinumerazione 21/07) — EDIT PRONTI, COMMIT IN ATTESA
Richiesta puntuale eseguita con verifica alla fonte (la nota di rinumerazione esiste nella spec, §5.37
riga 280-281). I 3 punti indicati erano REALI ma il censimento completo ne ha trovati **14**: i 3
richiesti (NavDesk.tsx:3+5 · SchedaNavRail.tsx:6 · catalogo page:1187) + il describe di
NavDesk.test.tsx:8 + il boilerplate «monta ora anche NavDesk (§5.35)» copiato in 10 file di test.
Estensione di perimetro dichiarata: stessa classe di riferimento vivo, commenti/titoli, zero rischio.
NavDesk.tsx:3 conserva la menzione storica («era §5.35 fino alla rinumerazione»). Nessun test asseriva
la stringa (457/457 verdi sui file toccati, tsc 0). La riga 1204 del catalogo (Cassetta §5.35/§5.36)
NON toccata: è corretta. Record storici (piani 12/07-16/07, MEMORY.md) NON toccati come da istruzione.
⚠️ **Commit tenuto in sospeso**: il Task 19 sta ancora committando in background e lint-staged fa
stash/unstash del non-staged — committare ora rischierebbe di corrompere il suo lavoro in volo.
Messaggio pronto: `docs(ds): repoint NavDesk refs §5.35 → §5.37 after parete renumber`.

## ✅ TASK 18 COMPLETO — commit `85b1edf` (mockup) + `77bfa4f` (round 2 ratificato) + `fe9e184` (React)
Review Step 4 (sonnet): **PASS, zero findings** — geometria byte-identica ai 4 symbol ratificati
(transform della riparazione C inclusi), varianti giuste (non le scartate), mappatura colori→`--mat-*`
esatta (5 variabili esistenti, nessuna aggiunta), `risolvi()` e commenti aggiornati, test discriminanti
provati per mutazione (segnaposto reintrodotto → rosso; ripristino → verde, albero pulito).
**Le 10 miniature sono complete e ratificate.** Suite: 2718 netti (2717+1), flake noto ricomparso una
volta e isolato → 29/29.

## ✅ TASK 19 Step 1-2 COMPLETO (implementazione) — commit `26e1a89`, review in dispatch
Seed E2E: idempotenza PROVATA con due esecuzioni reali sul DB live (end-state 6/2/1 identico); purga
via `cassette_purge_lab` su connessione owner (EXECUTE revocata anche a service_role); ogni esito RPC
≠ ok sollevato. Emendamenti A/B/C/D consegnati; §4.3 riassegna lasciata a 3 esiti (il 4° collassato
dalla ratifica 21/07 — spec coerente con l'implementato). Rinumerazione §5.37 con panel 2×.
Commit dei SOLI file propri: il lavoro parallelo non committato è stato lasciato intatto. ✔️

## Commit sbloccati dopo Task 19: `71dcb24` (repoint NavDesk, 17 file) · `77bfa4f` (mockup round 2)

## ✅ TASK 19 Step 1-2 — review (opus): **PASS / 0 Critical / 0 Important / 2 Minor**
Verificato alla fonte: seed senza scritture dirette (solo select count; RPC con esito≠ok sollevato),
purga owner senza rischio nuovo (SUPABASE_DB_URL da .env.local gitignored, pg già in package.json,
UUID costante → nessuna iniezione), scoping E2E totale, fixture 6/2/1 con precondizione CORRETTA per
lo scenario annullo (storico su cassetta lasciata libera — verificato contro 090000:500-537),
emendamenti campionati contro le migration (3 esiti riassegna: GIUSTO, il 4° collassato da ratifica).
### Minor in coda (chiusura d'ondata)
1. **DS v3 §5.36 + decisions ratifiche dicono ancora «al gate»** — stantio dopo `fe9e184`: da sanare.
2. **Flake latente NUOVO: `pill.test.tsx:164` timeout 5s sotto carico** (rende l'intero catalogo,
   cresciuto con l'ondata; isolato passa in 833ms) → valutare testTimeout dedicato.

## 🔬 FLAKE DIAGNOSTICATO (certezza ALTA, riprodotto e validato) — `diagnosi-flake-vitest.md`
«Flake d'ordine» era un nome improprio: fallisce anche a seed fisso — serve contesa multi-worker jsdom
(riprodotto alla 1ª iterazione con 3 suite in parallelo). Catena: starvation → `flushFrame()` aspetta
un rAF reale dentro un `act()` mai risolto → timeout 15s → **l'act() appeso avvelena lo stato-act
globale di React** → ogni `render()` successivo del file produce container vuoto → 8 rossi a cascata
+ 1 timeout + 3 `waitFor` exit-animation = 12. Esclusi OOM e cross-file (`isolate:true` regge).
**Fix validato end-to-end** (A/B side-by-side, stessa contesa: CTRL flaka 4/5, FIX verde 5/5):
A) `flushFrame` → `act(async () => vi.advanceTimersByTimeAsync(20))` con fake timers nel test riga 320;
B) `MotionGlobalConfig.skipAnimations = true` in beforeAll/afterAll del file.
Non ammorbidiscono nulla (tolgono la dipendenza dal tempo di parete). → fixer in dispatch.

## Chiusura d'ondata — stato coda (22/07 pomeriggio)
- `1ff60e4` — Minor 1 della review Task 19 SANATO dall'orchestratore: §5.36 DS v3 e decisions
  aggiornati a «gate superato, 4 miniature ratificate» (con le varianti e la storia dei due giri +
  la direttiva 38-simboli come ondata futura).
- Fix flake in applicazione (fixer ripreso via SendMessage dopo un turno chiuso a metà: fix A+B
  applicati e verdi in isolamento, mancano prove di contesa + commit).
- **Restano per chiudere l'ondata:** FASE 7 (tsc+vitest+build+check-ds, output reali) →
  review finale whole-branch (opus, package da merge-base `4853458`) → FASE 9 QA browser lab E2E
  (scenari spec §15 + auto-scroll drag su device) → FASE 9b GATE ESTETICO L2 → 🛑 STOP merge
  (solo su richiesta esplicita di Francesco) → FASE 11 BP-1 (MEMORY.md + ROADMAP nel main tree).
- In coda alla review finale: Minor accumulati di tutti i task (elencati per task in questo ledger) +
  `pill.test.tsx` timeout sotto carico + verifica end-to-end aggancio auto-riparazione (nota Task 9).

---

# 🔚 SESSIONE CHIUSA 22/07 — riprendere dalle FASI DI CHIUSURA in sessione NUOVA

**Task 1→19 TUTTI COMPLETI** con review chiuse + 4 extra ratificati (ricerca globale `19b1267` ·
repoint NavDesk `71dcb24` · allineamento docs `1ff60e4` · fix flake in commit dal fixer).
55 commit da `4853458`, niente mergiato né pushato, suite 2718/19 netti, tsc 0.
**Handoff di ripresa:** `docs/roadmap/2026-07-22-parete-cassette-chiusura-handoff.md` — contiene
la sequenza esatta (FASE 7 → review finale → QA → L2 → 🛑 merge → BP-1), le ratifiche del 22/07,
la coda dei Minor per la review finale e le lezioni operative della sessione.
⚠️ Se il commit del fix flake non risulta in `git log`, v. la sezione «PRIMA COSA» dell'handoff.

## ✅ FIX FLAKE COMMITTATO — `b9ba8cf`, 9/9 run di contesa verdi + run finale 2718/19 con 0 falliti
Sotto contesa 3× artificiale restano fragilità variabili in ~13 altri file (censite nell'handoff,
sezione fix flake): in CI normale la suite è verde. Da valutare intervento di classe alla review finale.

---

# 🏁 SESSIONE DI CHIUSURA (22/07 pomeriggio, sessione nuova)

## ✅ FASE 7 COMPLETA — output reali
`npx tsc --noEmit` → 0 · `npx vitest run` → **2718 passed / 19 skipped / 0 failed** (47.66s, fix
flake `b9ba8cf` regge) · `npx next build` → OK · `check-ds-compliance.sh` → OK (v2.3+v3).

## ✅ REVIEW FINALE WHOLE-BRANCH (4853458..c37698e, 57 commit) — «Sì con fix»
Package `.superpowers/sdd/review-4853458..c37698e.diff`. **Sanity whole-branch: PASS** (RPC-only
100%, tenant isolation ok, DS §14 ok, migration coerenti, zero segreti, zero console.log).
**0 Critical / 0 Important nuovi.** Verdetti sulla coda dei Minor deferiti:
- **FIX ORA (5):** Esc doppia chiusura sheet+dialog · 422 nome >20ch → «riprova» infinito ·
  «1 cassette» n=1 · `prossimoNomeSerieC` case-sensitive · test trial-vs-racconto mancante.
- **DEBITO CENSITO (8):** localeCompare su ISO (cassette-shared.ts:29 + parco-shared.ts:52) ·
  derivazione dentista/paziente duplicata (parco-shared.ts:70-71 ↔ pile-home-shared.ts:220-221) ·
  aria-pressed su ChipScelta-azione (decisione ds trasversale) · gap/margin crudi 10 (4 siti +
  HomeV3.tsx:137 — armonizzare al L2 o passaggio dedicato) · aria-pressed+✓ su pending colore custom
  (decisione design) · input color senza value → #000000 (fix richiede mappa slug→hex nel ds) ·
  annuncio SR pre-POST drag (coerente con deroga a11y ratificata; fix noto nel ramo else) ·
  ghost FLIP px + auto-scroll min 1px → decidere su evidenza device in FASE 9.
- **NON-ISSUE (8):** commento 41 righe parco.ts (load-bearing) · riparazioni parallele senza cap ·
  .ds-swatch:disabled solo cursore · hex pending perso (coerenza F1 ratificata) · confronto colore
  case-sensitive (PATCH idempotente rara) · «La null…» (irraggiungibile: `?? targetNome` + contratto
  RPC) · fallback --success (già uniforme #16A34A nel head) · guardia PATCH concorrenti (LWW giusto).
- **B1 pill.test.tsx:** stessa classe di starvation, NON blocca il merge → nell'intervento di classe.
- **B2 aggancio auto-riparazione:** VERIFICATO end-to-end anello per anello (parete+home →
  deriveParete → allSettled guardato → RPC 090000:196-218 → esclusione dal riassegna → UI immediata).
  Nessun anello mancante.
- **B3 fragilità contesa:** intervento di classe SÌ ma come PRIMO TASK POST-MERGE (commit test-only
  dedicato, protocollo A/B della diagnosi su tutta la suite, pill.test.tsx incluso) — non negli
  ultimi metri di un branch da 57 commit verde.

## ✅ FIX PRE-MERGE APPLICATI — commit `5ec14f4` (9 file, +94/−4), TDD RED→GREEN sui 4 fix con test
1. Esc scoped al dialog: guardia `dialogAperto` in CassettaSheet.tsx:256-267 (ds condivisi intatti).
2. 422 → «Il nome è troppo lungo (massimo 20 caratteri)» in entrambi gli sheet (contratto
   `errore === 'nome_non_valido'` verificato nelle route). ⚠️ Deroga: `maxLength={20}` NON aggiunto
   (CampoTesto ds non espone la prop — sarebbe modifica a componente condiviso, fuori mandato).
3. «UÀ ha creato 1 cassetta…» singolare (striscia.ts:115) — testo da ratificare a Francesco allo STOP.
4. Regex serie C con flag `/i` (PareteClient.tsx:60).
5. Test precedenza trial>racconto (striscia-trial.test.ts — trial vince, ordine array verificato).
**Suite post-fix: 2725 passed / 19 skipped / 0 failed · tsc 0 · pre-commit passato.**

## ✅ FASE 9 QA BROWSER COMPLETA — lab E2E, dev server worktree :3021, gstack browse
**Verificati (tutti PASS):** crea (409 duplicato case-insensitive «Questo nome è già sulla parete»;
**fix 422 visto live**: «Il nome è troppo lungo (massimo 20 caratteri)»; **fix serie C visto live**:
con «c6» in parete suggerisce «Crea C7») · rinomina (C5→«C5 bis») · colore custom con «Salva il
colore» nello Sheet vero (#ff8800 persistito dopo reload) · swatch custom `pressed` su hex fixture ·
butta via su libera (dialog+conferma) e difesa su occupata («Dentro c'è il n… Prima falla uscire») ·
**fix Esc visto live**: 1° Esc chiude solo il dialog, 2° lo sheet · sposta-in (C1→C2, sheet chiuso,
parete aggiornata) · segna-libera (copy dialog corretto, C2 tornata libera) · ricerca (accende/spegne,
«Niente per “corona”», tile «+» sparita, **riga conteggio «1 cassetta accesa» VISIBILE e già
singolare** → decisione a Francesco allo STOP) · riordino ▲▼ («posto 2 di 6» live) con persistenza
dopo reload E in home · deep-link `/dashboard?stanza=parete` (pager sul 2° dot) · **pile+`?stanza=`
vince** (preferenza «Solo le pile» + deep-link → unico heading visibile «La parete ›») · preferenza
3 modi (radio PATCH + ripristino) · assegna da ConfermaCassettaSheet (chip `pressed`, CTA «Conferma
in C4», parete aggiornata) · rifacimento da consegnato (nuovo lavoro creato, fail-soft
`niente_da_trasferire` silenzioso, parete intatta) · targa 6ch («Ban…», «C5 …») light E dark ·
miniature vive in parete e in home · reflow 320px senza overflow orizzontale · dark 390/1280 flat
corretto · zero errori console (solo warning WebSocket realtime transitorio).
**Trovato e sanato:** testo stantio catalogo §5.36 («segnaposto neutro») → commit `aeb4316`.
**Non riproducibili in browser (motivati):** consegna→liberazione (richiede precheck MDR completo,
fuori perimetro ondata; coperto da contract-test + verifica E2E del reviewer B2) · annullo→riassegnata
(«Annulla lavoro» è Prossimamente in UI; contratto coperto da test) · auto-riparazione (richiederebbe
corruzione manuale del DB; filo verificato in B2) · **da device (per Francesco):** auto-scroll drag
bidirezionale · PWA iOS edge-swipe · drag touch reale (prototipo già promosso 22/07).
**Lab E2E ripristinato col seed** (purga 6/3 + ricreazione, due run identiche).

## ✅ FASE 9b GATE ESTETICO L2 — **PASS** (dopo 2 fix), verbale integrale nell'audit del 22/07
Audit subagent su checklist 12 sezioni × 390/768/1280 × light/dark, confronto mockup v2 (CSS
verbatim confermato riga per riga). Esito iniziale: PASS CON RISERVE, 2 vincolanti:
- **F1** chips «Sposta il lavoro in…» e tasti ▲▼ INVISIBILI in dark negli sheet (bg = bg sheet,
  `--sh-press` vuota) → FIXATO commit `6a1103b`: regola scoped `[data-theme="dark"] [data-ds="v3"]
  .ds-sheet …` che rimappa `--card`→`--elv` + hairline; ChipScelta/TastoTondo INTATTI, light
  invariato, zero effetti fuori dagli sheet (verificato in home dark: nessuna chip fuori sheet).
- **F2** targa+testo multi-riga invadeva la cavità coprendo la MINIATURA (390px, dentista lungo) →
  FIXATO stesso commit: `.ds-cassetta` padding-top 44px (caso 1-riga byte-identico: 44+50+10=104=
  min-height) + clamp 2 righe ellissi su `.ds-cassetta-cont`. Riverificato: miniature C1/C3 visibili.
- Riserve DEFERIBILI a verbale (non bloccanti, con motivo): **R1** «libera» 2,75:1 su faccia grigia
  (verbatim dal mockup ratificato) · **R2** focus non intrappolato nello sheet (gap DS-wide
  Sheet.tsx) · **R3** DialogConferma modal centrato su mobile + role=dialog (componente DS
  ratificato, deroga di sistema) · **R4** sheet senza safe-area-inset-bottom (DS-wide) · **R5**
  targa 6ch tronca «Banco Ciro» (ratificato; aria-label conserva il nome pieno).
- **Nota N1 processo:** checklist §4 dice «DM Sans ovunque» ma spec v3 dice Plus Jakarta Sans —
  superficie corretta, è la CHECKLIST da aggiornare (task post-merge).
Suite post-fix: 2725/19/0 · tsc 0. Screenshot L2 (20 before + 4 after) su disco in
`docs/design/screenshots/2026-07-21-parete-cassette/` (non tracciati: `*.png` in .gitignore:58).
⚠️ Nel worktree resta unstaged una riga `.gstack/` in `.gitignore` (artefatto setup tool QA): da
committare consapevolmente o scartare al merge.

## ✅ RE-REVIEW `c37698e..5ec14f4` — **Merge-ready: Sì**, 5/5 fix OK
Esc: sequenza a due passi verificata, caso opposto NON introdotto, guardia copre anche scrim/swipe.
422: contratto verificato alla fonte (route.ts:42,69 + :64,76), deroga maxLength accettata.
Note non bloccanti da censire: (a) commento «verbatim spec §6» sopra striscia.ts:115 ora diverge per
n=1 → allineare quando si emenda la spec; (b) callback onChiudi inline ricreata a ogni render →
ri-sottoscrizione effect innocua. **Nessun bloccante di codice residuo.** Restano: FASE 9 QA →
FASE 9b L2 → 🛑 STOP (merge solo su richiesta esplicita) → BP-1.
