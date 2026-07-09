# P2 — Pre-check chirurgico consegna / annullo / SDI + data layer

**Data:** 9 luglio 2026 (notte) · **Sequenza:** spec sp.3 §12, step P2 (dopo P1/B22 `ee52f09`)
**Metodo:** lettura integrale del percorso codice + verifiche sul DB live `iagibumwjstnveqpjbwq` (sola lettura: `pg_constraint`, `pg_proc`, `pg_trigger`, `pg_indexes`, `cron.job`, grants). Nessuna modifica a codice o schema.
**Esito sintetico: la sequenza P2 → Ondata 4a-server è CONFERMATA. Nessun finding S1 (nessuna interruzione necessaria): tutte le criticità cadono esattamente nel perimetro già pianificato della 4a, che ne esce con requisiti più precisi.**

---

## 1. Mappa as-is del flusso

### 1.1 Consegna (`POST /api/lavori/[id]/consegna` → `orchestraConsegna()`)
1. Route: CSRF + auth + guard cross-tenant (solo esistenza lavoro) — **nessun controllo di stato**.
2. `orchestraConsegna` (`src/lib/consegna/orchestrate.ts`):
   - Step 0 — lock via RPC `consegna_lavoro_lock(p_lavoro_id, p_laboratorio_id)` (`FOR UPDATE NOWAIT`, flag `consegna_in_corso`): blocca solo `stato='consegnato'` (percorso idempotente) e doppia esecuzione. **Nessun gate su stati non consegnabili.**
   - Step 2 — `precheckMDR()` (Allegato XIII, elementi 3–7): unico blocco reale.
   - Step 2.5 — `tracciaMaterialiLavoro()`: BOM→FEFO, insert `lavori_materiali` (idempotente per magazzino), scarico diretto via `scarichi_magazzino` (UNIQUE `(lavoro_id,magazzino_id)` + 23505-skip) e `decrementa_scorta`.
   - Step 3/4 — `generateDdC()` (stato **`'generata'`**, progressivo `ddc`) + `generateBuono()`.
   - Step 5 — update lavoro: `stato='consegnato'`, `conformato`, timestamps, `consegna_precheck_passato_al_primo_tentativo: true` (incondizionato).
   - Step 6 — **fattura**: se cliente ha SDI o PEC, IIFE **fire-and-forget**: `generaProgressivo('fattura')` → insert `fatture` draft (importi 0) → `generaFatturaPA(lavoro, draftId)` → stato_sdi `'generata'`, consumo progressivo `'sdi_invio'`, XML su Storage.

### 1.2 Annullo (`POST /api/lavori/[id]/annulla-consegna`)
- Finestra **5 min** hardcoded in 2 punti: `annulla-consegna/route.ts:6` e `AnnullaConsegnaBanner.tsx:6` (verificato: identiche, nessuna costante condivisa).
- Ripristina lavoro a `'pronto'` (incondizionato) + reset campi consegna.
- Update DdC → `stato='annullata'` con filtro `.in('stato', ['bozza','firmata'])`, **esito non controllato**.
- **Non tocca:** fatture, progressivi, `consegna_tap_at`, `tracciabilita_materiali_ok`, scorte/lotti (deliberato: materiale fisicamente usato).

### 1.3 Percorso SDI
- L'invio reale è **solo manuale**: `POST /api/fatture/[id]/xml` con `invia_pec:true` → `sendFatturaPEC()` → SMTP PEC del lab verso `sdi01@pec.fatturapa.it` → `stato_sdi='smtp_inviata'`.
- **Nessun writer** per `ricevuta_sdi` / `accettata` / `rifiutata` / `scaduta`: la macchina stati muore a `smtp_inviata` (riconciliazione ricevute SDI inesistente — noto, fuori scope sp.3).

---

## 2. Verifiche sul DB reale

| Oggetto | Esito |
|---|---|
| CHECK `dichiarazioni_conformita.stato` | `('bozza','generata','firmata','consegnata')` — **`'annullata'` NON ammesso → B2 CONFERMATO, serve migration** |
| CHECK `lavori.stato` | 9 valori: `ricevuto, in_lavorazione, in_prova, in_prova_esterna, pronto, consegnato, sospeso, annullato, in_ritardo` |
| CHECK `fatture.stato_sdi` | `draft, generata, smtp_inviata, pec_consegnata, ricevuta_sdi, accettata, rifiutata, scaduta` |
| `ddc_lavoro_unique` | **UNIQUE `(laboratorio_id, lavoro_id)` pieno** (non parziale) — una sola DdC per lavoro, per sempre |
| `in_ritardo` | scritto SOLO dal trigger `trg_lavori_ritardo` (`check_lavoro_ritardo()`): flip `in_lavorazione`→`in_ritardo` **solo quando la riga viene scritta** e `data_consegna_prevista < CURRENT_DATE`. Mai da cron, mai da stati diversi da `in_lavorazione` |
| `genera_progressivo` | atomico (`INSERT ... ON CONFLICT DO UPDATE ... RETURNING`) — riusabile dall'outbox |
| pg_cron | **già attivo** (job `refresh-dashboard-kpi` ogni 15 min) — infrastruttura pronta per il cron dell'outbox E3 |
| Grants RPC consegna | `consegna_lavoro_lock` (entrambi gli overload) e `decrementa_scorta`: solo `service_role` ✓ |
| `fatture` ↔ lavoro | **nessuna colonna di collegamento**; `fatture_righe` esiste ma **0 righe in produzione e nessun codice la scrive** |

---

## 3. Finding

### 3.1 Conferme dei fix già pianificati (B1/B2/B3+C4) — dettagli chirurgici

**B1 — gate stato assente server-side (confermato, più ampio del previsto).** Né la route, né `orchestraConsegna`, né la RPC di lock verificano che lo stato sia consegnabile: un lavoro `ricevuto`, `sospeso` o perfino **`annullato`** può essere consegnato via API. L'unico gate vive nel client (`(app)/lavori/[id]/consegna/page.tsx:54`, `STATI_CONSEGNABILI = ['pronto','in_ritardo']`). Fix 4a: costante condivisa `STATI_CONSEGNABILI` (E4) applicata in `orchestraConsegna` subito dopo il caricamento del lavoro (Step 1), non nella RPC (che resta lock-only).

**B2 — CHECK DdC (confermato sul DB live).** `'annullata'` viola il vincolo → migration correttiva PRIMA di toccare l'annullo (FASE 6b obbligatoria), come già previsto da spec §9.

**B3+C4 — emissione durante l'orchestrazione (confermato).** La fattura nasce a `orchestrate.ts:278-312`; le due costanti da 5 min sono dove indicato dalla spec. Convergenza in `src/lib/consegna/costanti.ts` confermata fattibile (nessun altro consumatore trovato).

### 3.2 Nuovi finding — triage S1/S2/S3

**Nessun S1.** Tutti i nuovi item o rientrano nel perimetro 4a (S2) o sono post-sp.3 (S3).

| ID | Finding | Triage |
|---|---|---|
| **P2-1** | **Annullo-DdC triplamente rotto**: (i) il filtro `.in('stato',['bozza','firmata'])` non matcha MAI la DdC di consegna (sempre `'generata'`) → l'update è un no-op da sempre; (ii) se matchasse, `'annullata'` violerebbe la CHECK (B2); (iii) l'esito dell'update non è controllato → fail-open silenzioso. **Oggi, dopo un annullo, la DdC resta `'generata'` e attiva.** | **S2** — dentro 4a (estende B2: fix filtro + check errore + migration) |
| **P2-2** | **Doppia fattura su annullo+riconsegna**: l'annullo non tocca le fatture → la riconsegna genera un secondo draft→`'generata'` per lo stesso lavoro, con nuovo progressivo. Nessun modo di rilevarlo: `fatture` non ha link al lavoro. Rischio fiscale reale (entrambe inviabili a mano). | **S2** — risolto alla radice da E3 (l'annullo cancella la entry outbox prima dell'emissione); aggiungere test dedicato in 4a |
| **P2-3** | **`ddc_lavoro_unique` pieno vs modello "annulla e rigenera"**: con UNIQUE `(laboratorio_id, lavoro_id)` non-parziale non può MAI esistere una seconda DdC per lo stesso lavoro. In più `generateDdC()` riusa qualsiasi DdC esistente **senza filtro stato** (`generate-ddc.ts:18-26`) → dopo annullo+modifiche, la riconsegna riuserebbe una DdC stale (data emissione, materiali, contenuti vecchi). Decisione di design necessaria in 4a: indice UNIQUE parziale `WHERE stato <> 'annullata'` (pattern B18) + rigenerazione, **oppure** riuso con rigenerazione in-place dei contenuti. | **S2** — decisione di design nel piano 4a |
| **P2-4** | **Fire-and-forget non affidabile su serverless**: la risposta HTTP ritorna prima che l'IIFE completi; il runtime Vercel può congelare/terminare → draft mai creato, o creato senza XML, in silenzio. In più il draft automatico è **orfano**: senza `fatture_righe` (mai scritte da nessuno, 0 righe in prod) il retry via `POST /api/fatture/[id]/xml` senza `lavori_ids` risponde 422. Il "draft visibile per retry manuale" promesso dal commento a `orchestrate.ts:266-268` non è oggi garantito né sempre retry-abile. | **S2** — è la motivazione tecnica forte di E3; l'outbox DEVE portare il riferimento al lavoro |
| **P2-5** | **Progressivi consumati troppo presto**: `'fattura'` e `'sdi_invio'` sono consumati durante l'orchestrazione → buchi di numerazione su ogni annullo. Requisito outbox E3: consumare i progressivi SOLO all'emissione (fine finestra), mai alla consegna. `genera_progressivo` è atomico e riusabile as-is. | **S2** — requisito di design outbox |
| **P2-6** | **L'annullo non guarda le fatture**: la spec §8 dice «dopo l'invio a SDI l'annullo non c'è più», ma oggi nessuna guardia esiste — se una fattura fosse già `smtp_inviata` entro la finestra, l'annullo passerebbe comunque. In 4a: gate esplicito (fattura emessa/inviata → 409 con spiegazione nota di credito). | **S2** — dentro 4a |
| **P2-7** | **`in_ritardo` è lazy e parziale** (vedi §2): flip solo su scrittura della riga e solo da `in_lavorazione`. Un lavoro `pronto` scaduto o mai ri-toccato non diventa mai `in_ritardo`. Conferma piena della scelta spec/E4: la pila rossa DEVE derivare l'urgenza a runtime (`derivaUrgenza()` su `data_consegna_prevista`), mai fidarsi dello stato persistito. | **S3** — nota vincolante per Ondata 1 (già decisa); deprecazione stato → §N2 |
| **P2-8** | **Residui minori dell'annullo**: non resetta `consegna_tap_at` né `consegna_precheck_passato_al_primo_tentativo` (campo peraltro sempre scritto `true`, semantica già falsata); stato ripristinato sempre a `'pronto'` anche se era `in_ritardo` (irrilevante con derivaUrgenza). Scorte/lotti deliberatamente non ripristinati (materiale usato) — da documentare come scelta nel piano 4a. | **S3** — pulizia opportunistica in 4a |
| **P2-9** | **Dead code / debito**: `src/lib/consegna/pec-idempotency.ts` mai importato; overload orfano `consegna_lavoro_lock(p_lavoro_id)` a 1 argomento sul DB (usa `get_lab_id()`, NULL sotto service_role — grant solo service_role, non sfruttabile) da droppare con una migration di pulizia. | **S3** |
| **P2-10** | **Nota positiva per E3**: pg_cron è già installato e in uso → l'outbox può essere schedulata con pg_cron (pattern già rodato con `refresh-dashboard-kpi`), senza introdurre Vercel cron. Decisione da prendere nel piano 4a (pg_cron che invoca funzione SQL vs endpoint applicativo). | — |

---

## 4. Implicazioni per il piano Ondata 4a-server

1. **B1**: gate con `STATI_CONSEGNABILI` condivisa in `orchestraConsegna` (dopo Step 1) + riuso nella pagina; test per ogni stato non consegnabile (incluso `annullato`).
2. **B2 esteso (P2-1)**: migration CHECK + fix filtro annullo (`'generata'` incluso) + controllo esito update (fail-closed).
3. **E3 outbox**: la entry outbox nasce alla consegna (con `lavoro_id`!), l'emissione a fine finestra consuma progressivi e genera XML; l'annullo cancella la entry (chiude P2-2/P2-4/P2-5). Valutare pg_cron (P2-10).
4. **P2-3**: decidere il destino della DdC su annullo (partial unique + rigenera vs rigenerazione in-place) — va nel brainstorming del piano 4a, non improvvisato.
5. **P2-6**: gate annullo su fattura già emessa/inviata.
6. Dominio critico (fiscale + MDR) → percorso Grande BP-2, FASE 3 già soddisfatta da questo report; FASE 6b per le migration (CHECK DdC, eventuale partial unique, outbox).
