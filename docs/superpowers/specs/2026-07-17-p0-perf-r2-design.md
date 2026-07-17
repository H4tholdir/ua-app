# P0-PERF R2 — Riduzione dei round-trip per request — Design
**Data:** 17 luglio 2026 · **Percorso:** GRANDE (tocca auth — override FASE 3, CLAUDE.md §0C)
**Input:** `docs/roadmap/2026-07-17-p0-perf-r2-handoff.md` + `docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md` (§5 verdetti ratificati, §6 risultati R1)
**Stato:** rev.1 — in validazione panel advisor (solution-architect + sre-guardian + backend-api + appsec-auditor)

---

## 1. Obiettivo e budget (ratificati, non in discussione)

Chiudere il gap residuo post-R1: mediana TTFB 354ms → **p75 ≤ 300ms** (allarme >500) · API GET **p75 ≤ 250ms** · **login→dashboard ≤ 2s** (oggi 2,49s). Il residuo è il moltiplicatore interno di round-trip: auth verificata 3× per navigazione, query `utenti` duplicata, zero `React.cache()`, `await` sequenziali.

**Ordine ratificato dal panel diagnosi (si integra, non si rilitiga):** R2b′ → R2a′ → R2c → R2d. Include N11 (sicurezza `deleted_at`) e N12 (atomicità route prove). Osservabilità installata contestualmente.

## 2. Prerequisiti — verifiche residue ESEGUITE (17/07, questa sessione)

| Verifica | Esito |
|---|---|
| ES256 è la *current key* nei token emessi | ✅ **CONFERMATO** — login reale lab E2E: header JWT `{"alg":"ES256","kid":"59504031-53dc-4f9f-b442-4d53e4c13893"}` = unica chiave del JWKS del progetto. `getClaims()` verifica locale, zero rete. |
| Versione supabase-js supporta `getClaims` | ✅ installata 2.105.4 (JWKS cache condivisa); `@supabase/ssr` 0.5.2 delega all'auth client |
| TTL access token | 3600s (1h) — riduzione a 10-15 min = **raccomandazione a Francesco** (azione dashboard Supabase, §10) |
| Runtime middleware (edge vs Node) | Non determinabile staticamente (Next 16.2.6, nessun override in config). Si legge dal deployment output post-deploy; **irrilevante per il beneficio di R2b′**: con verifica locale il RT di rete sparisce in entrambi i runtime |
| Accesso DB per pg_stat_statements | ❌ non disponibile in questa sessione (MCP Supabase richiede OAuth interattivo; CLI linkata solo comandi non-DB) → §8 |

## 3. Censimenti (fondazione empirica del design)

- **Route API con `auth.getUser()`: 85 file.** Handler GET «categoria A» (non fiscali, candidati a contesto claims-based): **28 chiari + 4 borderline** (`/api/scadenzario`, `/api/scadenzario/[cliente_id]`, `/api/tecnici/[id]/cedolino`, `/api/lavori/pronti-da-fatturare`; + `/api/impostazioni/nomina-prrc` regolatorio). ~30 handler usano anche `ruolo` → l'helper deve restituire `laboratorioId` **e** `ruolo`. Nessuna route di categoria A interroga `laboratori`. Precedenti di estrazione: `verifyTitolare()`, `verifyAdminRete()`.
- **N11 — lookup `utenti` dell'utente corrente: ~140 occorrenze**, di cui solo **7** filtrano `deleted_at IS NULL` e **~133 NO** (censimento completo agli atti, incluse ~20 occorrenze ★ dove il `ruolo` non filtrato governa autorizzazione: gate `admin_sistema`, whitelist titolare). Le funzioni DB `public.current_lab_id()` e `public.has_role()` filtrano GIÀ `deleted_at` → **la variante restrittiva è quella allineata allo schema**; l'incoerenza vive solo nel layer applicativo service-role (RLS bypassata).
- **Loader:** il costo comune a TUTTE le pagine è la catena auth duplicata layout↔page (2× getUser di rete + 2× `utenti` + `laboratori`); `/impostazioni/pec` e `/profilo` sono client-only → il loro TTFB è INTERAMENTE layout. Query indipendenti oggi seriali: `/magazzino` (2), `/qualita` (3), `/analytics` (2), `/lavori/[id]` (firma DdC ∥ firme immagini), `getSegnaleStriscia` (fino a 4 interne). `/fatture/riconciliazioni` è già 5-way `Promise.all` al top; residui: 2 consolidamenti embed + profiling. Indice `credito_clienti_movimenti(laboratorio_id)` **esiste già** (migration B2) → niente indici «a priori», prima il profiling (§8).

## 4. Architettura della soluzione

### D-1 · R2b′ — `getClaims()` nel middleware (`src/middleware.ts:22`)

`const { data } = await supabase.auth.getClaims()` sostituisce `getUser()`; `user` → `data?.claims` (si usa solo la truthiness per i redirect UX). Semantica invariata: PUBLIC_ROUTES, redirect login/dashboard, passthrough `/auth/callback`.

- **Token valido non scaduto:** verifica firma ES256 locale contro JWKS in cache → **zero rete**.
- **Token scaduto:** `getClaims` passa dal recupero sessione → refresh di rete → i nuovi cookie escono via `setAll` di `createMiddlewareClient` (invariato). **Il refresh del cookie resta funzionante — test esplicito obbligatorio** (caso token-scaduto simulato).
- **Claims assenti/invalidi:** trattato come non autenticato (= oggi).
- Il middleware resta autodichiarato «UX only, non confine di sicurezza» (commento in testa al file già presente).

### D-2 · R2a′ — helper di contesto in `src/lib/supabase/lab-context.ts` (nuovo file)

**Due helper espliciti, un solo shape di ritorno `LabContext`:**

```ts
type LabContext = {
  userId: string; email: string | null;
  ruolo: string; laboratorioId: string | null; // null possibile per admin_sistema
  nome: string | null; cognome: string | null;
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null;
}
```

1. **`getLabContext()`** — wrappato in **`React.cache()`** (dedup layout↔page↔componenti nello stesso render pass). Identità da **`getClaims()`** (verifica locale, zero rete); poi **UNA** query service-role:
   `utenti.select('ruolo, laboratorio_id, nome, cognome, laboratori(stato, trial_ends_at, nome)').eq('id', sub).is('deleted_at', null).single()`
   → 3 RT (getUser+utenti+laboratori) → **1 RT DB**. Ritorna `null` se non autenticato o utente non trovato/soft-deleted.
   **Embed LEFT, NON `!inner`** (scoperta censimento): `admin_sistema` può non avere lab — con `!inner` il join vuoto annullerebbe il contesto e chiuderebbe fuori l'admin. La logica di gating (`stato`, trial, redirect admin) resta nel layout, che ora consuma il contesto.
   Consumatori: `(app)/layout.tsx`, tutte le pagine `(app)`, i **28 GET categoria A**. (Nota: nei route handler `React.cache()` non memoizza — irrilevante, un handler chiama l'helper una sola volta; il beneficio lì è il RT di rete eliminato da `getClaims` + la query singola.)
2. **`getFreshLabContext()`** — **NON** cachato; identità da **`getUser()` di rete** (decisione ratificata: mutazioni, fiscale, admin, ovunque il ruolo guidi l'autorizzazione); stessa singola query embed con `deleted_at IS NULL`. Sostituisce il boilerplate getUser→utenti nei handler B/C **fixando N11 anche lì** senza cambiarne il confine di sicurezza.
- **NIENTE RPC `get_lab_context`** (era «da valutare»): l'embed PostgREST ottiene lo stesso 3→1 RT **senza** funzione SECURITY DEFINER (gotcha §9 evitato alla radice), senza migration, senza superficie d'attacco nuova. → da ratificare col panel.
- I 4 GET borderline + `nomina-prrc` restano su `getFreshLabContext()` (default conservativo: dato finanziario/regolatorio ⇒ trattati come categoria C).
- `verifyTitolare()` e `verifyAdminRete()` vengono riscritti SOPRA `getFreshLabContext()` (oggi non filtrano `deleted_at` — ★).
- I gate admin `select('ruolo')` senza labId usano anch'essi `getFreshLabContext()` (il campo in più non costa un RT aggiuntivo).

### D-3 · N11 — fix di sicurezza (si chiude qui)

La variante restrittiva `deleted_at IS NULL` diventa l'UNICA via: ogni lookup del contesto utente corrente passa dai 2 helper (censimento completo = perimetro di sostituzione, ~133 occorrenze incoerenti). **Test di sicurezza dedicato:** utente soft-deleted con sessione valida → layout redirect a `/login`, API → 401/403; test su almeno un handler per categoria (A/B/C) + layout + un gate admin ★.

### D-4 · R2c — `Promise.all` sui loader indipendenti

| Superficie | Intervento |
|---|---|
| `getSegnaleStriscia` | split: `fetchIngressiStriscia(svc, labId, ruolo)` con le 4 query interne in `Promise.all` (fatture scartate ∥ materiali ∥ pagamenti ∥ count DdC, rami per ruolo invariati, degradi try/catch per-query invariati) + composizione pura `scegliSegnale` |
| `/dashboard` | catena → `contesto (cache) → perimetro (0-1 RT) → Promise.all([getPileHome, fetchIngressiStriscia]) → composizione`. Da ~8 RT sequenziali a ~3 |
| `/magazzino` | `Promise.all([magazzino, fornitori])` |
| `/qualita` | `Promise.all([nc, rischi, incidenti])` |
| `/analytics` | `Promise.all([getTrendMensile, dashboard_kpi_cache])` |
| `/lavori/[id]` | `Promise.all([firma DdC, firme immagini])` (indipendenti, oggi seriali) |
| `/impostazioni/abbonamento` | 2 query dipendenti → 1 embed `utenti→laboratori` (campi extra `piano, stripe_*` nella select locale della pagina, NON nel LabContext globale) |
| `/lavori/nuovo`, riconciliazioni top-level | già paralleli — nessun intervento |

### D-5 · R2d — consolidamento route peggiori + N12

**Riconciliazioni (`queries-riconciliazioni.ts`):**
- Gruppo 3 (stornate + TD04): 2 query → **1 self-join embed** `fatture!fattura_collegata_id`.
- Gruppo 5 (eventi parcheggiati → fatture): 2 query → **1 embed LEFT** `fatture_sdi_eventi.select('…, fatture(stato_sdi)')`. **Vietato `!inner`**: la logica preserva gli eventi con `fattura_id IS NULL` (un inner join li scarterebbe — bug funzionale).
- **Niente indici a priori** (l'indice su `laboratorio_id` esiste già): la spiegazione dei 660ms si cerca col profiling §8; eventuali indici = follow-up mirato post-evidenza.

**N12 (`api/lavori/[id]/prove/route.ts`) — atomicità, dominio MDR:**
- Migration: 2 funzioni PL/pgSQL transazionali — `manda_in_prova_atomico(p_lavoro_id, p_laboratorio_id, p_data_rientro, p_istruzioni, p_user_id)` e `registra_rientro_atomico(…)`. Dentro una transazione: `SELECT … FOR UPDATE` sulla riga lavoro, validazione transizione di stato, `numero_prova = COALESCE(MAX(numero_prova),0)+1` sotto lock (elimina la race del COUNT), INSERT/UPDATE. Push notification resta FUORI (fire-and-forget post-commit).
- **SECURITY INVOKER** (chiamate solo dal service client, che bypassa già RLS) + per igiene §9: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT a service_role`. Nessun DEFINER = nessuna escalation.
- Route riscritta sui 2 RPC; contratto HTTP invariato (status, shape risposta, gestione 23505 sostituita dall'atomicità).
- 🛑 **Gate apply migration = Francesco** (nessun accesso DB autonomo in questa sessione) + FASE 6b (gen types + tsc) dopo l'apply.

### D-6 · Osservabilità (contestuale a R2, riserva sre della diagnosi)

- **`Server-Timing`**: nel middleware (fase `auth`, durata `getClaims`) su ogni response; nei GET categoria A migrati e nella route outlier riconciliazioni: fasi `auth`/`db`/`total` via piccolo helper `withServerTiming()`.
- **Log strutturato 1-riga** nel layout `(app)`: `{route, authMs, dbMs, totalMs}` (visibile nei log Vercel; le pagine streammate non possono settare header dopo il primo flush).
- **Vercel Speed Insights**: `@vercel/speed-insights` + `<SpeedInsights/>` nel root layout (1 riga, incluso su Hobby).
- **`pg_stat_statements`**: richiede accesso DB → **azione Francesco** (dashboard Supabase o autorizzazione MCP via `/mcp`): attivarlo PRIMA del deploy R2 per la baseline query, poi leggere il top-10 per `/fatture/riconciliazioni`.

### D-7 · TTL access token
Con `getClaims` la revoca «vista» dal middleware ha latenza ≤ TTL. Mitigazioni già nel design: il **contesto DB è fresco a ogni request** (un soft-deleted/disattivato è fuori subito via N11, indipendentemente dal token); confine vero = RLS. Raccomandazione a Francesco: TTL 1h → 10-15 min (dashboard Supabase, refresh trasparente).

## 5. FASE 3 — Gate di validazione architetturale

| Domanda | Risposta |
|---|---|
| Tenant isolation (RLS / `current_lab_id()`)? | NON toccati. Gli helper usano il service client come oggi; il filtro `deleted_at` ALLINEA il layer applicativo a `current_lab_id()`. Zero modifiche a policy. |
| Schema drift / migration? | SÌ: 1 migration (2 RPC N12). FASE 6b obbligatoria post-apply (`gen types` + `tsc`). Nessuna tabella/colonna modificata. Apply = 🛑 gate Francesco. |
| API contract? | Payload e shape risposte INVARIATI. Cambia solo la modalità di verifica identità sui GET categoria A (claims locali vs chiamata Auth): finestra di revoca ≤ TTL, mitigata da contesto DB fresco per-request (§D-7). Mutazioni/fiscale/admin: `getUser()` INVARIATO. |
| Rollback? | Codice: `git revert` + redeploy (<5 min), zero stato. Migration: additiva (2 funzioni nuove — `DROP FUNCTION` sicuro; la route rollbacka insieme al codice). |
| Dominio critico? | SÌ (auth) → percorso GRANDE: questa spec + panel + piano + worktree + TDD + review rafforzata. |

## 6. Testing

- **TDD per task** (FASE 6). Aree chiave: unit `getLabContext`/`getFreshLabContext` (mock: claims validi/assenti, utente soft-deleted, admin senza lab, lab nei vari stati); middleware (pubbliche/protette/callback, claims scaduti→refresh→cookie aggiornati); N11 security test (soft-deleted → fuori, per layout + 1 handler per categoria + 1 gate admin); parità di contratto sulle route migrate (status/shape invariati — i test esistenti restano verdi); RPC N12 (pgTAP non disponibile → test del route handler con mock RPC + verifica SQL della migration in review; atomicità validata in QA su lab E2E); riconciliazioni: parità risultati pre/post consolidamento embed (fixture con evento `fattura_id NULL` per il vincolo no-`!inner`).
- **FASE 7:** `tsc --noEmit` + `vitest run` + `next build` (output reale).
- **FASE 9 QA:** lab E2E (MAI lab Filippo) — login, navigazione, un write-path, un flusso prova (N12), utente soft-deleted di test se disponibile.

## 7. Strategia di misura (gap noto incluso)

1. **Pre-merge:** push del branch → **Vercel Preview** (stessa region `dub1`, stesso DB) → `scripts/perf-audit.ts` parametrizzato `BASE` (modifica minima allo script: env `PERF_BASE`) contro l'URL di preview, se la deployment protection lo consente; altrimenti misura locale indicativa (`next build && next start`).
2. **Post-merge (gate Francesco):** re-run identico contro prod, confronto con §6 della diagnosi, target = budget §1. **Gap noto:** creare 1 lavoro via wizard sul lab E2E per misurare `/lavori/[id]` (mai misurata), poi cleanup a baseline.
3. Rapporto: nuova sezione «7. Risultati R2» + aggiornamento regression gate.

## 8. Cosa NON si fa (fuori perimetro, esplicito)

- Nessun cambio a RLS, Stripe, FatturaPA, flussi PEC (solo il boilerplate auth dei loro handler, categoria C, che resta `getUser()`).
- Nessuna Custom Access Token hook / claims custom (labId nel JWT): staleness del ruolo non accettabile; il confine resta query `utenti` fresca.
- Nessun indice «a priori» su riconciliazioni; niente upgrade Supabase Pro (trigger: primo cliente pagante).
- Niente caching cross-request (ISR/unstable_cache) su dati tenant: solo dedup per-request.
- `getServiceClient()` per-chiamata NON si tocca (falsa pista archiviata).

## 9. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Refresh cookie rotto col passaggio a getClaims | test esplicito token-scaduto + smoke su preview (login con attesa >TTL simulata via cookie manipolato) |
| Regressione di contratto su 60+ file toccati | migrazione meccanica via helper con test di parità; review per-task + whole-branch; suite ~2000 test esistente |
| Embed LEFT che cambia semantica dei redirect layout | test dedicati admin-senza-lab / utente-senza-lab (oggi `redirect('/login?error=no_lab')`) |
| RPC N12 diverge dalla logica TS `TRANSIZIONI_CONSENTITE` | la validazione di transizione replicata in SQL è MINIMA (solo i 2 archi interessati), commentata con riferimento al TS; test di parità |
| Preview non misurabile (deployment protection) | fallback misura locale + misura prod post-merge |

## 10. Azioni richieste a Francesco (gate e raccomandazioni)

1. 🛑 Apply migration N12 (o autorizzazione MCP Supabase via `/mcp` in sessione interattiva).
2. 🛑 Merge + deploy (gate finale, come da handoff).
3. Attivare `pg_stat_statements` (baseline query PRIMA del deploy R2, serve per l'outlier riconciliazioni).
4. Raccomandazione: TTL access token 1h → 10-15 min (dashboard Supabase → Auth → Sessions).
5. Da osservare post-deploy: primo invio PEC reale (residuo R1, IP di uscita cambiato).
