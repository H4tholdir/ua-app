# Ondata 4a-server — Consegna, annullo, emissione fiscale differita

**Data:** 9 luglio 2026 (notte) · **Stato:** approvata da Francesco (decisioni §2) — in attesa di review finale della spec scritta
**Genitori:** spec sp.3 `2026-07-09-ds-v3-il-cuore-design.md` (§8–§10, §12, emendamenti E3/E4) · report P2 `docs/roadmap/P2-PRECHECK-CONSEGNA-SDI-2026-07-09.md`
**Review advisor:** solution-architect + appsec-auditor + sre-guardian (09/07 notte) — tutti i finding bloccanti integrati in questa spec.
**Dominio critico** (fiscale + consegna MDR) → percorso Grande BP-2. FASE 3 soddisfatta dal report P2 + advisor. FASE 6b obbligatoria (migration multiple).

---

## 1. Obiettivo e perimetro

Chiude B1, B2+P2-1, B3+C4 e i finding S2 del report P2 (P2-2/3/4/5/6), più due bug preesistenti scoperti dagli advisor (doppia fatturazione auto+batch; lettori DdC ambigui). Solo server + sezione «Coda emissione» nel pannello `/admin` (fuori dal perimetro DS v3, nessun gate mockup — deciso da Francesco: «se hai trovato qualcosa che va fatto, progettalo bene»). La UI PWA della consegna arriva con l'Ondata 4b e consuma le API di questa ondata senza logica fiscale nuova.

**Principio guida:** dentro la finestra di annullo non esiste alcun documento fiscale — l'unica traccia è una riga di coda; l'annullo cancella la riga e non incontra mai una fattura. Ogni transizione fiscale è atomica nel DB, idempotente sotto retry, e osservabile.

## 2. Decisioni ratificate da Francesco (09/07 notte)

| # | Decisione | Scelta | Alternative scartate |
|---|---|---|---|
| D1 | Scheduling emissione | **pg_cron + pg_net** → endpoint Next.js | Vercel Cron (su Hobby 1×/giorno); ibrido lazy (complessità) |
| D2 | DdC su annullo | **Annulla + rigenera**: la DdC annullata resta come storia, la riconsegna ne genera una nuova (UNIQUE parziale, pattern B18) | In-place (perde audit MDR); riuso puro (= bug P2-3) |
| D3 | Policy fatturazione del cron | **Emetti salvo rifiuto**: emette con `decisione_fatturazione IN ('in_attesa','fatturare')`, salta con `'non_fatturare'`, e all'emissione fa **claim atomico di `incluso_in_fattura=true`** (chiude la doppia fatturazione auto+batch preesistente) | Solo-se-'fatturare' (cambia il comportamento automatico attuale); invariato (doppia fattura by design) |
| D4 | Osservabilità | **Completa**: heartbeat + dead-man's switch SQL + riconciliazione + sezione `/admin` con retry | Solo runbook; solo push |

## 3. Costanti condivise — `src/lib/consegna/costanti.ts` (nuovo)

Modulo **client-safe** (niente `server-only`, niente import Supabase — lo importano anche `AnnullaConsegnaBanner` e, in Ondata 1, il TastoConsegnaInline):

```ts
export const STATI_CONSEGNABILI = ['pronto', 'in_ritardo'] as const   // E4 — unica fonte
export const FINESTRA_ANNULLO_MS = 10 * 60 * 1000                     // C4 — 5→10 min
export const MAX_TENTATIVI_EMISSIONE = 8                              // con backoff ≈ 2h di copertura
export const OUTBOX_BATCH_MAX = 20
export const OUTBOX_TIME_BUDGET_MS = 45_000                           // stop del loop al 75% di maxDuration
export const WATCHDOG_IN_LAVORAZIONE_MIN = 5                          // > maxDuration, < finestra
```

Sostituiscono: la costante locale in `(app)/lavori/[id]/consegna/page.tsx:54`, i due `GRACE_PERIOD_MS` da 5 min (`annulla-consegna/route.ts:6`, `AnnullaConsegnaBanner.tsx:6`).

## 4. Modello dati — migration (FASE 6b su tutte)

**M1 — CHECK DdC (B2):** `dichiarazioni_conformita.stato` ammette anche `'annullata'`.

**M2 — UNIQUE parziale DdC (P2-3, D2):** drop constraint `ddc_lavoro_unique`; `CREATE UNIQUE INDEX ddc_lavoro_attiva_unique ON dichiarazioni_conformita(laboratorio_id, lavoro_id) WHERE stato <> 'annullata'`.

**M3 — Link fattura↔lavoro (cintura strutturale):** `fatture.lavoro_id uuid NULL REFERENCES lavori(id)` + `CREATE UNIQUE INDEX fatture_lavoro_attiva_unique ON fatture(laboratorio_id, lavoro_id) WHERE lavoro_id IS NOT NULL AND stato_sdi <> 'rifiutata'` — ogni doppia emissione futura è un 23505, non un doppio documento. Nessun backfill (le fatture esistenti restano `lavoro_id NULL`). Il backstop `UNIQUE (laboratorio_id, anno, progressivo)` esiste già.

**M4 — Tabella `fatture_outbox`:**

```sql
id uuid PK default gen_random_uuid()
laboratorio_id uuid NOT NULL REFERENCES laboratori(id)
lavoro_id      uuid NOT NULL REFERENCES lavori(id)
stato          text NOT NULL DEFAULT 'in_attesa'
               CHECK (stato IN ('in_attesa','in_lavorazione','emessa','annullata','saltata','errore'))
emetti_dopo    timestamptz NOT NULL          -- clock DB: now() + finestra alla consegna
tentativi      int NOT NULL DEFAULT 0        -- incrementato SOLO al fallimento registrato
ultimo_errore  text
motivo_salto   text                          -- valorizzato su stato='saltata'
fattura_id     uuid NULL REFERENCES fatture(id)
created_at / updated_at timestamptz
```

- `CREATE UNIQUE INDEX outbox_lavoro_attiva ON fatture_outbox(lavoro_id) WHERE stato IN ('in_attesa','in_lavorazione')`
- `CREATE INDEX outbox_scan ON fatture_outbox(emetti_dopo) WHERE stato = 'in_attesa'`
- `CREATE INDEX outbox_watchdog ON fatture_outbox(updated_at) WHERE stato = 'in_lavorazione'`
- RLS attiva **senza policy** (deny-all per anon/authenticated; accesso esclusivo via service_role). Nessuna view/route/RPC accessibile ad authenticated la espone, mai.

Semantica stati: `saltata` = decisione legittima di non emettere (non_fatturare, lavoro non più consegnato, cliente senza recapito all'emissione, già fatturato altrove) con `motivo_salto`; `errore` = fallimento definitivo dopo retry o errore permanente, richiede intervento.

**M5 — Osservabilità:** tabella `outbox_heartbeat` (riga singola: `last_tick_at`, `entries_processate`, `errori_tick`) + tabella `outbox_alerts` (`tipo`, `dettaglio`, `created_at`, `risolto_at NULL`) — entrambe RLS deny-all come M4.

**M6 — RPC transazionali** (tutte: `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `REVOKE ALL FROM PUBLIC, anon, authenticated` + `GRANT EXECUTE TO service_role`, nessun SQL dinamico, ogni statement filtrato per `laboratorio_id` + id — dettagli §5–§8):
`consegna_finalizza_atomica` · `annulla_consegna_atomica` · `outbox_claim_batch` · `outbox_prepara_draft`.

**M7 — pg_net + tick:** `CREATE EXTENSION pg_net` e, **nella stessa migration**: `REVOKE ALL ON ALL FUNCTIONS IN SCHEMA net FROM PUBLIC, anon, authenticated` + `REVOKE ALL ON ALL TABLES IN SCHEMA net FROM anon, authenticated` (un `authenticated` con `net.http_post` = SSRF dal database). Funzione wrapper `outbox_tick()` (`SECURITY DEFINER`, search_path pinnato, **EXECUTE revocato a tutti tranne postgres**) che legge **secret E url dal Vault** a runtime e fa `net.http_post` — il comando del job pg_cron è solo `SELECT outbox_tick()`: niente secret in `cron.job.command`, nei log Postgres, né nella migration su git. Job: ogni minuto.

**M8 — Sorveglianza:** funzione SQL pura `outbox_sorveglianza()` + job pg_cron ogni 10 min (§10) — zero dipendenza da pg_net/Vercel: deve funzionare proprio quando il canale HTTP è rotto.

**M9 — Pulizia (P2-9):** drop overload orfano `consegna_lavoro_lock(p_lavoro_id uuid)` a 1 argomento. Nel codice: rimozione `src/lib/consegna/pec-idempotency.ts` (dead code mai importato).

## 5. Flusso consegna — modifiche a `orchestraConsegna`

1. **Gate B1** subito dopo Step 1 (caricamento lavoro): se `!STATI_CONSEGNABILI.includes(lavoro.stato)` → **`rilasciaLock()`** (come ogni early-return esistente) → nuovo errore `{ tipo: 'stato_non_consegnabile' }`, route → 422. La RPC di lock resta lock-only. Test dedicato per ognuno dei 7 stati non consegnabili **incluso il secondo tentativo dopo il gate** (verifica rilascio lock).
2. **Step 5+6 fusi nella RPC `consegna_finalizza_atomica(p_lavoro_id, p_laboratorio_id, p_cliente_fatturabile bool, p_finestra_ms int)`** — una transazione:
   - update lavoro (stato `consegnato`, `conformato`, timestamps, `consegna_in_corso=false`) con verifica righe affette (0 righe → RAISE, rollback);
   - se `p_cliente_fatturabile` (cliente con SDI o PEC, valutato in TS come oggi): **upsert** entry outbox `ON CONFLICT (outbox_lavoro_attiva) DO UPDATE SET emetti_dopo = now() + finestra, tentativi = 0, stato = 'in_attesa', fattura_id = NULL, ultimo_errore = NULL` — chiude la race annullo-tra-Step5-e-Step6 e l'entry orfana con `emetti_dopo` stantio; `emetti_dopo` è **clock DB**, mai `Date.now()`.
   - Mai più «consegna ok, fattura persa in silenzio»: se l'insert outbox fallisce, fallisce la transazione, il lavoro NON risulta consegnato, la route risponde errore e il retry è idempotente (DdC/Buono riusati dai guard esistenti).
3. Push notification e link WhatsApp restano in TS dopo il successo della RPC (invariati).
4. **`ConsegnaResult.fattura` ridefinito (sicuro: il campo attuale `{ numero, stato_sdi } | null` — `domain.ts:587` — è sempre stato `null`, nessun consumer ne legge la forma):** `fattura: { stato: 'programmata'; emetti_dopo: string } | null` — `null` quando il cliente non è fatturabile. Serve alla CardUAHaFatto della 4b («Fattura in preparazione», legge L5) senza logica fiscale nuova lato client. Il percorso idempotente `gia_consegnato` popola il campo leggendo l'eventuale entry attiva.

## 6. Flusso annullo — RPC `annulla_consegna_atomica`

`annulla_consegna_atomica(p_lavoro_id uuid, p_laboratorio_id uuid, p_finestra_ms int)` — una transazione, gate DENTRO la funzione (clock DB, niente TOCTOU):

1. **Validazione parametri:** `p_finestra_ms` fuori range `1000..900000` → RAISE (un bug del chiamante non riapre mai la finestra).
2. `SELECT ... FROM lavori WHERE id AND laboratorio_id ... FOR UPDATE`: stato ≠ `consegnato` → esito `non_consegnato` (400); `now() - data_consegna_effettiva > finestra` → `finestra_scaduta` (400).
3. **Claim fiscale** — `SELECT ... FROM fatture_outbox WHERE lavoro_id ... AND stato IN ('in_attesa','in_lavorazione','emessa') FOR UPDATE`, disambiguazione esplicita:
   - nessuna riga → **procedi** (cliente non fatturabile: caso legittimo e frequente — un `IF NOT FOUND → 409` qui bloccherebbe l'annullo di tutti i clienti senza SDI);
   - `in_attesa` **e `fattura_id IS NULL`** → `UPDATE SET stato='annullata'`;
   - `in_attesa` con `fattura_id NOT NULL` (teorico post-watchdog, possibile solo fuori finestra) o `emessa` → esito `fattura_gia_emessa` (409, messaggio nota di credito);
   - `in_lavorazione` → esito `fattura_in_emissione` (409, messaggio distinto). Nota: per costruzione (`emetti_dopo = consegna + finestra`) il claim del cron avviene solo a finestra chiusa — questi 409 sono il bordo esatto della finestra, e l'arbitro è il lock di riga: chi committa primo vince.
4. **Ripristino lavoro:** stato `pronto`, reset `conformato`, `data_conformazione`, `data_consegna_effettiva`, `consegna_completata_at`, `consegna_in_corso`, **`consegna_tap_at`** (P2-8). Verifica righe affette.
5. **DdC → `'annullata'`** con filtro `stato IN ('bozza','generata','firmata')` (P2-1: oggi il filtro esclude `'generata'` = no-op da sempre) e **matrice fail-closed** (`GET DIAGNOSTICS`):
   - 1 riga aggiornata → ok (flusso normale: la consegna genera sempre la DdC prima dello Step 5);
   - 0 aggiornate e 0 DdC totali per il lavoro → consenti con flag `ddc_assente` nell'esito (dato legacy/stub, loggato);
   - 0 aggiornate ma esistono DdC in stato inatteso (`consegnata`, o solo annullate senza attiva) → RAISE, rollback totale (mai più fail-open silenzioso).
6. Scorte/lotti **deliberatamente non ripristinati** (materiale fisicamente usato — scelta documentata).

La route diventa sottile: CSRF + auth + tenant → RPC(`FINESTRA_ANNULLO_MS`) → mappa esiti su 200/400/409/500.

## 7. DdC — writer e TUTTI i lettori (lista chiusa)

**Writer** — `generateDdC` (`generate-ddc.ts`): guard di idempotenza (`:18-26`) e recovery 23505 (`:129-135`, oggi `.single()` che esploderebbe con 2 righe) filtrano `stato <> 'annullata'` → la riconsegna genera una DdC nuova con progressivo nuovo e dati freschi.

**Lettori resi ambigui dal UNIQUE parziale** (dal momento in cui esistono 2+ righe per lavoro, chi assume cardinalità 1 può pescare la DdC annullata). Lista chiusa, un test per lettore, filtro `stato <> 'annullata'` sull'embed/query (o `.neq('ddc.stato','annullata')`):

| File | Rischio se non patchato |
|---|---|
| `src/lib/consegna/orchestrate.ts:50-54` (percorso `gia_consegnato`) | errore multi-riga → fallback fasullo `DDC-{anno}-000` |
| `src/app/api/portale/[token]/lavori/[lavoro_id]/[documento]/route.ts:53-57` | il dentista non scarica più la DdC dopo una riconsegna |
| `src/lib/pdf/generate-ifu.ts:24` · `generate-etichetta.ts:40` · `generate-ricevuta-consegna.ts:24` | numero DdC annullata stampato su documenti MDR **fisici** |
| `src/app/(app)/lavori/[id]/page.tsx:48` · `(app)/lavori/[id]/consegna/page.tsx:42` | display DdC sbagliata |
| `src/app/api/lavori/[id]/route.ts:129` · `api/fatture/[id]/xml/route.ts:154` · `api/fatture/batch/route.ts:177` | uso DdC sbagliata nei flussi fattura |
| `src/app/portale/[token]/page.tsx:359` | link documento sbagliato nel portale |

## 8. Emissione — endpoint `POST /api/cron/emissione-fatture`

`export const maxDuration = 60`. **Prima istruzione assoluta:** verifica del secret (header dedicato) via `crypto.timingSafeEqual` su **digest SHA-256** di entrambi i valori (elimina l'oracle di lunghezza); accetta `CRON_SECRET` e `CRON_SECRET_PREVIOUS` (rotazione senza downtime); fallimento → 401 identico e immediato, **prima di qualsiasi parse/query**. L'endpoint NON usa `isSameOrigin` (passerebbe sempre senza header Origin — `csrf.ts:9`): l'unica difesa è il secret. Risposta **minimale** (`{ processate, saltate, errori }` — finisce in `net._http_response`, persistita ~6h): mai dati fiscali, mai echo, mai stack trace.

**Loop con time-budget** (`OUTBOX_TIME_BUDGET_MS`, stop al 75% di maxDuration; le invocazioni sovrapposte sono il regime atteso — pg_net ha timeout ~5s e non fa retry: ogni tick risulterà "timeout" lato `net._http_response`, comportamento normale documentato):

1. **Claim batch in un solo statement** — RPC `outbox_claim_batch(p_limite)`: `UPDATE fatture_outbox SET stato='in_lavorazione', updated_at=now() WHERE id IN (SELECT id FROM fatture_outbox WHERE stato='in_attesa' AND emetti_dopo <= now() ORDER BY emetti_dopo LIMIT p_limite FOR UPDATE SKIP LOCKED) RETURNING *` — due worker simultanei non processano mai la stessa entry; il perdente salta senza effetti. **Nello stesso statement/transazione, watchdog:** entry `in_lavorazione` con `updated_at < now() - WATCHDOG_IN_LAVORAZIONE_MIN` tornano `in_attesa` (senza incrementare `tentativi`).
2. Per ogni entry, **try/catch isolato** (un errore non aborta il batch né contamina le successive), ogni query keyed `(entry.laboratorio_id, entry.lavoro_id)` fail-closed:
   - carica lavoro+cliente; **ri-verifica**: `stato='consegnato'` e `deleted_at IS NULL` (lavoro annullato/buttato via → `saltata`, `motivo_salto='lavoro_non_consegnato'`); cliente ancora con SDI/PEC (→ `saltata_no_recapito`);
   - **RPC `outbox_prepara_draft(p_entry_id)`** — una transazione: `SELECT entry FOR UPDATE` (deve essere `in_lavorazione`); se `fattura_id` già valorizzato → ritorna quello (ripresa idempotente); lock riga lavoro e check `decisione_fatturazione`: `'non_fatturare'` → esito `saltata_decisione`; **claim `incluso_in_fattura`**: `UPDATE lavori SET incluso_in_fattura=true WHERE ... AND incluso_in_fattura=false` — 0 righe → esito `gia_fatturato` (il batch manuale l'ha preso: entry `saltata`, mai doppia fattura — D3); `genera_progressivo('fattura')`; INSERT draft `fatture` con `lavoro_id`, `data`/`anno` **congelati qui** (cavallo d'anno: numero e data coerenti all'emissione — scelta fiscale intenzionale); `UPDATE entry SET fattura_id`. Crash in qualunque punto → rollback totale, nessun progressivo bruciato, nessun draft orfano (chiude la P2-2 «dalla porta di servizio»);
   - `generaFatturaPA(lavoro, fattura_id)` — resa **idempotente** (§8.1);
   - entry → `emessa`.
3. **Fallimenti:** classificati. Permanenti (validazione dati fiscali: P.IVA cedente invalida, ecc.) → `errore` subito, senza bruciare tentativi. Transitori (rete/Storage/DB) → `tentativi++`, `stato='in_attesa'`, **backoff**: `emetti_dopo = now() + LEAST(2^tentativi, 60) minuti` (2,4,8,…60 — risolve anche l'head-of-line blocking: le entry in retry non monopolizzano il batch). A `MAX_TENTATIVI_EMISSIONE` → `errore`. Push al titolare **aggregata per tick** («N fatture in errore»), mai una per entry.
4. **Heartbeat:** upsert su `outbox_heartbeat` a fine tick.

### 8.1 Idempotenza `generaFatturaPA` (ramo `fatturaId` — verificato non sicuro as-is)

1. Legge il draft all'inizio: se `progressivo_sdi` già valorizzato → **riusa** progressivo, `nome_file_xml`, `xml_storage_path` (niente nuovo `generaProgressivo('sdi_invio')`, l'upsert Storage colpisce lo **stesso** path — oggi il path include il progressivo nuovo e il vecchio XML resterebbe orfano con URL pubblico vivo).
2. `Data`/`anno` letti dal draft (congelati da `outbox_prepara_draft`), non da `new Date()`.
3. UPDATE finale **guardato**: `WHERE id = ... AND stato_sdi IN ('draft','generata')` + verifica count fail-closed — mai sovrascrivere una fattura già `smtp_inviata` (divergenza file inviato/conservato = violazione conservazione sostitutiva).

## 9. Scheduling e Vault

- Job pg_cron `outbox-emissione-tick` ogni minuto: comando = `SELECT outbox_tick()`. La wrapper legge dal Vault **secret e URL** (URL nel Vault = non modificabile dai ruoli applicativi → niente redirect del POST con secret verso server ostili; rotazione dominio senza migration).
- Secret: ≥ 32 byte da CSPRNG. Doppia copia dichiarata: Vault (mittente) + env Vercel `CRON_SECRET` (ricevente). **Runbook rotazione** (in `docs/security/runbook-cron-secret.md`): genera nuovo → aggiungi `CRON_SECRET` nuovo su Vercel tenendo il vecchio in `CRON_SECRET_PREVIOUS` → `vault.update_secret()` → rimuovi il vecchio → tick manuale dal pannello admin + verifica heartbeat. Nessuna RPC esposta restituisce mai il secret.
- Verifiche post-deploy (nel piano, FASE 6b): `SELECT command FROM cron.job` non contiene il secret; grants schema `net` su `routine_privileges`/`table_privileges` puliti.

## 10. Osservabilità (D4)

1. **Heartbeat** per tick (§8.4).
2. **Dead-man's switch** — job pg_cron `outbox-sorveglianza` ogni 10 min, **SQL puro** (sopravvive alla rottura del canale HTTP): apre alert in `outbox_alerts` (con dedup su alert aperti) per: (a) `last_tick_at < now() - 5 min` con entry `in_attesa` scadute; (b) entry `in_attesa` con `emetti_dopo < now() - 15 min`; (c) entry `errore` non risolte; (d) **riconciliazione**: lavori `consegnato` da > 15 min, cliente fatturabile, senza entry outbox né fattura collegata (rete di sicurezza contro ogni bug futuro del producer).
3. **Sezione «Coda emissione» in `/admin`** (pattern auth admin esistente): heartbeat, conteggi per stato, età dell'entry più vecchia in attesa, alert aperti, ultime entry `errore` con `ultimo_errore`, azioni: **Riprova** (errore→in_attesa, tentativi=0), **Tick manuale** (chiama l'endpoint server-side col secret da env), **Risolvi alert**.
4. Log 401 aggregato sull'endpoint (brute-force visibile), mai log degli header.

## 11. Requisiti di sicurezza (vincolanti per la review dell'ondata)

Già integrati sopra; il reviewer li verifica uno a uno: (1) secret CSPRNG + timingSafeEqual su digest + prima istruzione + 401 uniforme; (2) secret/URL mai in `cron.job.command` né in migration; (3) hardening grants `net.*` nella stessa migration di `CREATE EXTENSION`; (4) claim `FOR UPDATE SKIP LOCKED` single-statement; (5) progressivi consumati solo dentro `outbox_prepara_draft`; (6) UNIQUE parziale `fatture(laboratorio_id, lavoro_id)`; (7) scoping per-entry fail-closed + Storage sotto prefisso `{laboratorio_id}/`; (8) RPC con search_path pinnato + REVOKE/GRANT pattern B19 + validazione range parametri; (9) `fatture_outbox`/`outbox_alerts` deny-all end-to-end; (10) risposta endpoint minimale. Test dedicato: entry forgiata cross-tenant `(lab_A, lavoro_di_B)` → scartata fail-closed, nessuna fattura.

## 12. Edge case (posizioni esplicite)

- Cliente senza SDI/PEC alla consegna → nessuna entry (invariato); perde il recapito nella finestra → `saltata_no_recapito`; fattura manuale da `/fatture` sempre possibile.
- Lavoro «buttato via» o annullato nella finestra → il consumer lo vede e salta (§8.2).
- Fatturazione manuale (batch) nella finestra → il claim `incluso_in_fattura` arbitra: chi arriva primo vince, l'altro salta (D3).
- Lab `sospeso/scaduto/blacklist`: le entry già in coda **si emettono comunque** (obbligo fiscale su consegna già avvenuta a lab attivo).
- Cavallo d'anno: numero/data/anno congelati all'emissione (§8.2) — scelta intenzionale.
- Buchi di numerazione: eliminati su annullo; possibili solo su crash irrecuperabile dentro `generaFatturaPA` dopo `outbox_prepara_draft` (draft con progressivo esiste e si ripara dal pannello admin — nessun buco reale).
- Lavori consegnati prima del deploy: nessun backfill (finestra 5 min già chiusa per tutti).

## 13. Testing (TDD puro)

- **Gate B1:** 7 stati non consegnabili → 422 + lock rilasciato (test sul secondo tentativo).
- **Annullo:** mappatura esiti RPC (ok / non_consegnato / finestra_scaduta / fattura_in_emissione / fattura_gia_emessa / ddc_incoerente); matrice DdC (1 aggiornata; 0+0 legacy; 0+stato inatteso → errore).
- **Emissione:** claim concorrente (due worker, zero doppioni); watchdog senza incremento tentativi; ripresa con `fattura_id` → riuso draft, un solo progressivo; backoff e classificazione errori; `gia_fatturato`/`saltata_decisione`/`saltata_no_recapito`/`lavoro_non_consegnato`; time-budget; push aggregata.
- **Idempotenza `generaFatturaPA`:** doppia esecuzione stesso draft → stesso progressivo SDI, stesso path, un solo XML; UPDATE guardato su `smtp_inviata` → 0 righe → errore.
- **P2-2 regression:** annullo entro finestra + riconsegna → una sola fattura, entry vecchia `annullata`.
- **Lettori DdC:** un test per file della lista §7 (con DdC annullata + attiva presenti).
- **Sicurezza:** secret errato/assente/lunghezza diversa → 401 identico; entry cross-tenant forgiata → scartata.
- **Costanti:** pagina e banner importano da `costanti.ts` (grep di accettazione: zero `5 * 60 * 1000` residui).
- RPC e migration si verificano su DB reale in FASE 6b + QA con lab E2E.

## 14. Rollback

Migration additive (tabelle/colonne/indici nuovi, CHECK ampliato — mai ristretto). Rollback operativo: `cron.unschedule` dei 2 job + revert del codice → il sistema torna al comportamento pre-4a (nessuna emissione automatica); le entry restano in tabella come dato inerte, riconciliabili con la query di riconciliazione di §10 punto 2(d). L'unico cambio non banale da revertire è il UNIQUE parziale DdC (M2): reversibile solo se non esistono ancora lavori con 2+ DdC — motivo in più per l'ordine merge-4a-prima-delle-ondate-UI.

## 15. Fuori scope

Invio automatico a SDI (resta manuale via `/api/fatture/[id]/xml`); riconciliazione ricevute SDI (`ricevuta_sdi/accettata/rifiutata` senza writer — post-sp.3); UI PWA consegna (Ondata 4b); workflow firma DdC (§N1); deprecazione `in_ritardo` (§N2, l'adapter `derivaUrgenza` è dell'Ondata 1).
