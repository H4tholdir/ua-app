# P0-PERF R2 — Riduzione dei round-trip per request — Design
**Data:** 17 luglio 2026 · **Percorso:** GRANDE (tocca auth — override FASE 3, CLAUDE.md §0C)
**Input:** `docs/roadmap/2026-07-17-p0-perf-r2-handoff.md` + `docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md` (§5 verdetti ratificati, §6 risultati R1)
**Stato:** **rev.2 — VALIDATA DAL PANEL** (solution-architect + sre-guardian + backend-api + appsec-auditor: **4× CONFERMATA CON RISERVE, zero bloccanti** — tutte le riserve integrate qui; registro in §11)

---

## 1. Obiettivo e budget (ratificati, non in discussione)

Chiudere il gap residuo post-R1: mediana TTFB 354ms → **p75 ≤ 300ms** (allarme >500) · API GET **p75 ≤ 250ms** · **login→dashboard ≤ 2s** (oggi 2,49s). Il residuo è il moltiplicatore interno di round-trip: auth verificata 3× per navigazione, query `utenti` duplicata, zero `React.cache()`, `await` sequenziali.

**Ordine ratificato dal panel diagnosi (si integra, non si rilitiga):** R2b′ → R2a′ → R2c → R2d. Include N11 (sicurezza `deleted_at`) e N12 (atomicità route prove). Osservabilità installata contestualmente.

## 2. Prerequisiti — verifiche residue ESEGUITE (17/07, questa sessione)

| Verifica | Esito |
|---|---|
| ES256 è la *current key* nei token emessi | ✅ **CONFERMATO** — login reale lab E2E: header JWT `{"alg":"ES256","kid":"59504031-53dc-4f9f-b442-4d53e4c13893"}` = unica chiave del JWKS del progetto. `getClaims()` verifica locale, zero rete. |
| Versione supabase-js supporta `getClaims` | ✅ installata 2.105.4 (JWKS cache `GLOBAL_JWKS` module-scope, TTL 10 min); `@supabase/ssr` 0.5.2 delega all'auth client. Nel branch: pin `"@supabase/supabase-js": "^2.105.0"` in package.json (codifica il prerequisito nel manifest). |
| Robustezza `getClaims` (verifica appsec su sorgente installato) | ✅ alg-confusion chiuso (token HS* → fallback `getUser()` di rete); kid sconosciuto → refetch JWKS → fallback rete; JWKS solo da URL progetto HTTPS; `exp` validato; WebCrypto assente → fallback sicuro. JWKS irraggiungibile → `{data:null, error}` → redirect login (= comportamento odierno con Auth giù, **nessun 500 di massa**; canary non necessario). |
| TTL access token | 3600s (1h). **Riduzione a 10-15 min = PRECONDIZIONE TRACCIATA** (§10 gate 4): la finestra di revoca Auth-level sui GET categoria A è stata giudicata accettabile dall'appsec ASSUMENDO TTL breve. Verifica post-cambio: `exp-iat` di un token reale. |
| Runtime middleware (edge vs Node) | Non determinabile staticamente (Next 16.2.6, nessun override). Si legge dal deployment output; irrilevante per il beneficio di R2b′ (verifica locale in entrambi i runtime). |
| `pg_stat_statements` | **Già attivo di default su Supabase** (alimenta Query Performance in dashboard) — la baseline si accumula già. Azione Francesco = *leggere* (ed eventualmente reset per baseline pulita), non attivare. |

## 3. Censimenti (fondazione empirica del design)

- **Route API con `auth.getUser()`: 85 file** (154 occorrenze totali su 129 file). Handler GET «categoria A» (non fiscali, candidati a contesto claims-based): **28 chiari**; i 4 borderline (`/api/scadenzario`, `/api/scadenzario/[cliente_id]`, `/api/tecnici/[id]/cedolino`, `/api/lavori/pronti-da-fatturare`) + `/api/impostazioni/nomina-prrc` restano **categoria C** (ratifica appsec: dato finanziario/PII/regolatorio, costo marginale irrilevante). ~30 handler usano anche `ruolo` → l'helper restituisce `laboratorioId` **e** `ruolo`. Nessuna route di categoria A interroga `laboratori`. Precedenti di estrazione: `verifyTitolare()`, `verifyAdminRete()`.
- **N11 — lookup `utenti` dell'utente corrente: ~140 occorrenze**, solo **7** filtrano `deleted_at IS NULL`, **~133 NO** (censimento completo agli atti; ~20 occorrenze ★ dove il `ruolo` non filtrato governa autorizzazione). `public.current_lab_id()` e `public.has_role()` filtrano GIÀ `deleted_at` → la variante restrittiva è quella allineata allo schema. **Eccezioni censite (appsec):** `api/auth/accept-invite` = pre-membership by design (esclusa, documentata); route WebAuthn di enrollment (`register/options`, `register/verify`) = **buco residuo da chiudere in R2** (soft-deleted può registrare passkey) con check `deleted_at` via helper.
- **Loader:** costo comune = catena auth duplicata layout↔page; `/impostazioni/pec` e `/profilo` sono client-only → TTFB interamente layout. Query indipendenti oggi seriali: `/magazzino` (2), `/qualita` (3), `/analytics` (2), `/lavori/[id]` (firma DdC ∥ firme immagini), `getSegnaleStriscia` (fino a 4 interne). `/fatture/riconciliazioni` già 5-way `Promise.all` al top (query in `src/lib/fattura/ricevute/queries-riconciliazioni.ts` — path corretto, la pagina è solo consumer); residui: 2 consolidamenti embed + profiling. Indice `credito_clienti_movimenti(laboratorio_id)` esiste già → niente indici a priori (§8).

## 4. Architettura della soluzione

### D-1 · R2b′ — `getClaims()` nel middleware (`src/middleware.ts:22`)

`const { data } = await supabase.auth.getClaims()` sostituisce `getUser()`; `user` → `data?.claims` (solo truthiness per i redirect UX). Semantica invariata: PUBLIC_ROUTES, redirect login/dashboard, passthrough `/auth/callback`. Il matcher **esclude già `api/*`** — il middleware non è mai stato gate per le API (nessuna regressione lato API).

- Token valido: verifica ES256 locale (JWKS in cache) → zero rete. **Nota misura:** il primo `getClaims` per lambda fredda fa 1 RT di fetch JWKS (~1-3ms da dub1) — annotato per non fraintendere gli outlier p95.
- Token scaduto: `getClaims` → `getSession()` → refresh di rete → nuovi cookie via `setAll` (invariato). **Test esplicito con 3 assert:** (1) `expires_at` forzato nel cookie → response con `Set-Cookie` del nuovo access token; (2) refresh token invalido/revocato → redirect pulito a `/login`, mai 500; (3) request successiva col nuovo cookie → 200 senza secondo refresh.
- Claims assenti/invalidi: non autenticato (= oggi).
- Il middleware setta **`x-pathname`** come request header (serve al log del layout, §D-6 — il layout non può leggere il pathname, gotcha CLAUDE.md §9) e l'header `Server-Timing` fase `auth` **anche sulle response di redirect**, non solo su `NextResponse.next()`.

### D-2 · R2a′ — helper di contesto in `src/lib/supabase/lab-context.ts` (nuovo file)

**Due helper espliciti, un solo shape `LabContext`:**

```ts
type LabContext = {
  userId: string; email: string | null;
  ruolo: string; laboratorioId: string | null; // null legale SOLO per admin_sistema (migration 20260517000003)
  nome: string | null; cognome: string | null;
  lab: { stato: string; trial_ends_at: string | null; nome: string } | null;
}
```

1. **`getLabContext()`** — wrappato in **`React.cache()`** (dedup layout↔page↔componenti nello stesso render pass; nei route handler non memoizza — irrilevante, 1 chiamata per handler). Identità da **`getClaims()`** (locale, zero rete); poi **UNA** query service-role:
   `utenti.select('ruolo, laboratorio_id, nome, cognome, laboratori(stato, trial_ends_at, nome)').eq('id', sub).is('deleted_at', null).single()`
   → 3 RT → **1 RT DB**. Ritorna `null` se non autenticato o utente non trovato/soft-deleted.
   **Embed LEFT, NON `!inner`**: `admin_sistema` può avere `laboratorio_id` NULL — `!inner` lo chiuderebbe fuori. FK unica `utenti→laboratori` (nessuna ambiguità PostgREST); **pre-condizione da riconfermare al primo task del piano:** FK dichiarata a DB (serve a PostgREST per l'embed).
   Consumatori: `(app)/layout.tsx`, pagine `(app)`, i **28 GET categoria A**.
2. **`getFreshLabContext()`** — NON cachato; identità da **`getUser()` di rete** (mutazioni, fiscale, admin, ovunque il ruolo guidi l'autorizzazione — decisione ratificata); stessa singola query embed con `deleted_at IS NULL`. Sostituisce il boilerplate nei handler B/C fixando N11 senza cambiarne il confine.

**Regole e guardrail (riserve SA1/AS5 integrate):**
- **Mapping status FISSATO (BA R3):** contesto `null` → **401**; contesto presente ma `laboratorioId === null` su route che richiede lab → **403**. Deviazione dichiarata: utente soft-deleted/riga-mancante oggi risponde 403 (o passa!) → post-R2 risponde **401**; asserita nei test di parità come comportamento atteso nuovo.
- Nei `route.ts` misti (GET cat. A + mutazioni nello stesso file, es. `api/clienti`) ogni handler mutante DEVE usare `getFreshLabContext`. La lista dei 28 file categoria A è un **allowlist versionato** (`src/lib/supabase/lab-context-allowlist.ts`) + **test vitest di guardia**: fallisce se `getLabContext(` compare in un `route.ts` fuori allowlist o nel body di handler `POST|PATCH|PUT|DELETE`; fallisce anche su lookup `utenti` per-utente-corrente (`from('utenti')`+`eq('id', user`) fuori da `lab-context.ts` (anti-bypass, riserva appsec).
- `verifyTitolare()` e `verifyAdminRete()` riscritti SOPRA `getFreshLabContext()` (oggi non filtrano `deleted_at` — ★). I gate admin `select('ruolo')` idem.
- **Ordine dei check nel layout (BA R7 — vincolo di codice, non da scoprire nel test):** `ruolo === 'admin_sistema' → redirect /admin/labs` DEVE precedere il check `lab === null → /login?error=no_lab`.
- Handler con select extra (`piano`/`stripe_*` in abbonamento, `sigla`, `telefono`, …) tengono la loro select locale: **il LabContext NON si allarga.**
- Comportamenti odierni con `labId` vuoto (magazzino/analytics = pagina vuota, qualita = null) NON vanno normalizzati silenziosamente a redirect: parità o deviazione dichiarata per-file nel piano.

### D-3 · N11 — fix di sicurezza (si chiude qui)

Variante restrittiva `deleted_at IS NULL` come UNICA via per il contesto utente corrente (~133 occorrenze via i 2 helper). **Include le route WebAuthn di enrollment** (check contesto via `getFreshLabContext()`); `accept-invite` = eccezione documentata. **Test di sicurezza:** utente soft-deleted con sessione valida → layout redirect `/login`, API 401; coperti: layout + 1 handler per categoria (A/B/C) + 1 gate admin ★ + `verifyTitolare()` + `verifyAdminRete()` + WebAuthn register.
**Runbook di revoca (documentato nel rapporto R2):** offboarding utente = `utenti.deleted_at` + `auth.admin.signOut(userId, 'global')` (chiude anche la finestra TTL). Il ban da dashboard Supabase da solo NON è kill-switch efficace sui GET categoria A entro il TTL.

### D-4 · R2c — `Promise.all` sui loader indipendenti

| Superficie | Intervento |
|---|---|
| `getSegnaleStriscia` | split: `fetchIngressiStriscia(svc, labId, ruolo)` con le 4 query interne in `Promise.all` + composizione pura `scegliSegnale`. **Vincolo (BA R8):** i try/catch di degrado restano DENTRO ogni ramo (degrado per-segnale, mai tutto-o-niente). Verificato: le query interne NON dipendono da `pile`. |
| `/dashboard` | `contesto (cache) → perimetro (0-1 RT) → Promise.all([getPileHome, fetchIngressiStriscia]) → scegliSegnale(ruolo, {...ingressi, pile})`. Da ~8 RT sequenziali a ~3 |
| `/magazzino` | `Promise.all([magazzino, fornitori])` (categorie derivate in memoria dopo) |
| `/qualita` | `Promise.all([nc, rischi, incidenti])` |
| `/analytics` | `Promise.all([getTrendMensile, dashboard_kpi_cache])` |
| `/lavori/[id]` | `Promise.all([firma DdC, firme immagini])` (proprietà disgiunte, verificato) |
| `/impostazioni/abbonamento` | 2 query dipendenti → 1 embed `utenti→laboratori` con select locale (campi `piano, stripe_*` NON nel LabContext) |
| `/lavori/nuovo`, riconciliazioni top-level | già paralleli — nessun intervento |

### D-5 · R2d — consolidamento route peggiori + N12

**Riconciliazioni (`src/lib/fattura/ricevute/queries-riconciliazioni.ts`):**
- **Gruppo 3 (stornate + TD04) → 1 self-join embed** con vincoli ESATTI (BA R5): alias `td04:fatture!fattura_collegata_id(id, numero, stato_sdi)`; filtri embedded SOLO `tipo_documento='TD04'` e `deleted_at IS NULL`; **MAI** filtro embedded su `stato_sdi` (la regola anti-loop re-storno richiede l'INTERO set dei TD04 collegati); **niente `!inner`**. Filtro `laboratorio_id` sui figli implicito per invariante same-lab (trigger) — annotato nel codice. **Fixture di parità obbligatoria:** originale con TD04-A rifiutata + TD04-B accettata (deve restare esclusa).
- **Gruppo 5 (eventi parcheggiati) → 1 embed LEFT** `fatture_sdi_eventi.select('…, fatture(stato_sdi)')`. **Vietato `!inner`** (gli eventi `fattura_id IS NULL` restano con `fatture: null` e vanno preservati). Filtro terminalità nell'embed (`stato_sdi in (accettata,rifiutata)`) = forma scelta, equivalente (embed null ⇒ evento tenuto). Invariante same-lab annotata. Fixture `fattura_id NULL` obbligatoria.
- Niente indici a priori (l'indice lab esiste già): profiling con `pg_stat_statements`/Query Performance §8; eventuali indici = follow-up post-evidenza. **Regression gate (SRE R5):** se post-consolidamento `/fatture/riconciliazioni` resta sopra budget → classificata *known-issue con follow-up di profiling*, NON fa fallire il gate complessivo.

**N12 (`api/lavori/[id]/prove/route.ts`) — atomicità, dominio MDR:**
- Migration: 2 funzioni PL/pgSQL — `manda_in_prova_atomico(p_lavoro_id, p_laboratorio_id, p_data_rientro, p_istruzioni, p_user_id)` e `registra_rientro_atomico(p_lavoro_id, p_laboratorio_id, p_prova_id, p_esito, p_note, p_stato_destinazione, p_user_id)`.
- **Tenant isolation DENTRO la transazione (riserva appsec ALTA):** `SELECT … FOR UPDATE` con `WHERE id = p_lavoro_id AND laboratorio_id = p_laboratorio_id AND deleted_at IS NULL`; riga assente → esito not-found → 404. Il pre-check della route non è il confine.
- **Archi di transizione COMPLETI (riserva backend-api ALTA — copiati 1:1 dal server `TRANSIZIONI_CONSENTITE`, non dalla UI):** `manda_in_prova`: sorgenti `{in_lavorazione, in_ritardo}` → `in_prova_esterna`. `registra_rientro`: il mapping esito→stato RESTA in TS (la route passa `p_stato_destinazione`); whitelist SQL sorgenti-per-destinazione: `in_prova_esterna → {in_lavorazione, sospeso, annullato}` + caso legacy `in_ritardo → in_lavorazione`. Commento SQL con riferimento a `transizioni.ts`. **Test di parità per OGNI arco, incluso `in_ritardo`.**
- **Contratto d'errore esplicito:** `RAISE EXCEPTION USING ERRCODE` custom → mapping nella route: `UA404` → 404 (not found/cross-tenant) · `UA409` → 409 (transizione non consentita; prova già chiusa) · `unique_violation` (backstop, il vincolo UNIQUE `prova_numero_unique` NON si rimuove) → 409 · altro → 500. `manda_in_prova_atomico` RETURNS la riga `prova` inserita (risposta `{prova, stato}` invariata); `registra_rientro_atomico` ritorna anche `tecnico_id` e `numero_lavoro` per la push post-commit (fire-and-forget FUORI transazione).
- `numero_prova = COALESCE(MAX(numero_prova),0)+1` sotto lock (elimina la race del COUNT). `SET search_path = public, pg_temp` su entrambe.
- **SECURITY INVOKER** (chiamate solo dal service client; nessuna escalation) + igiene §9: `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT … TO service_role`.
- **Parità migliorativa dichiarata:** oggi in `registra_rientro` la prova viene marcata rientrata anche se la transizione poi fallisce (è il bug); post-RPC il 409 non lascia effetti. Stesso status, effetti diversi = comportamento atteso NUOVO, asserito nei test. TabProve non fa matching sul testo degli errori (verificato) → messaggi sostituibili.
- 🛑 **Gate apply migration = Francesco** + FASE 6b (gen types + tsc) post-apply.

### D-6 · Osservabilità (contestuale a R2, riserva sre della diagnosi §5.8)

- **`Server-Timing` misurato DENTRO i 2 helper** (fasi `auth`/`db` — così i handler B/C la ereditano gratis) + esposto: dal middleware (anche sui redirect), dai GET categoria A e dalla route riconciliazioni via helper `withServerTiming()` (fase `total`).
- **Log strutturato 1-riga nel layout `(app)`**: `{route (da x-pathname), authMs, dbMs, totalMs}` — emesso PRIMA di ogni `redirect()` (che lancia un'eccezione: altrimenti i 7 redirect del layout saltano il log).
- **Vercel Speed Insights**: `@vercel/speed-insights` + `<SpeedInsights/>` nel root layout. È la fonte del **p75 vero** (RUM, ~7 giorni di dati).
- **Alerting/persistenza (riserva sre ALTA — il minimo indispensabile, incluso in R2):** workflow **GitHub Actions cron giornaliero** che esegue `scripts/perf-audit.ts` contro prod e **fallisce se p75 > budget** (email automatica GitHub). Log drain esterno (Axiom/Better Stack) = azione opzionale Francesco (§10), non blocca R2.
- `pg_stat_statements`: già attivo; lettura Query Performance dashboard (Francesco o MCP autorizzato) per l'outlier riconciliazioni; fallback `EXPLAIN ANALYZE` da SQL editor.

### D-7 · Revoca e TTL
Con `getClaims` la revoca Auth-level (logout globale, cambio password, ban) sui GET categoria A ha latenza ≤ TTL; soft-delete/cambio ruolo/lab sospeso sono invece **immediati** (contesto DB fresco per-request — N11). **Precisazione (riserva SA7): in questo codebase il confine di sicurezza effettivo NON è la RLS** (layout/pagine/route usano `getServiceClient()` che la bypassa): è la **query `utenti` fresca per-request + scoping applicativo su `laboratorio_id`**. Per questo il contesto DB fresco è NON NEGOZIABILE e nessun dato tenant viene mai cachato cross-request. TTL 1h → 10-15 min = precondizione tracciata (§10 gate 4). Runbook di revoca in §D-3.

## 5. FASE 3 — Gate di validazione architetturale

| Domanda | Risposta |
|---|---|
| Tenant isolation (RLS / `current_lab_id()`)? | NON toccati. Helper su service client come oggi; `deleted_at` ALLINEA il layer applicativo a `current_lab_id()`. RPC N12 con filtro tenant DENTRO la transazione. Zero modifiche a policy. |
| Schema drift / migration? | SÌ: 1 migration (2 RPC N12, additiva). FASE 6b post-apply. Nessuna tabella/colonna modificata. Apply = 🛑 gate Francesco. |
| API contract? | Payload/shape INVARIATI. Deviazioni dichiarate e testate: (1) soft-deleted 403→401 sui handler migrati (parte del fix N11); (2) 409 N12 senza effetti collaterali parziali (parte del fix). GET cat. A: verifica claims locale, finestra revoca Auth-level ≤ TTL (mitigata: contesto fresco + TTL 10-15min §10.4). Mutazioni/fiscale/admin: `getUser()` INVARIATO. |
| Rollback? | **Primario: Vercel Instant Rollback** (promuove il deployment precedente in secondi; compatibile — migration additiva e inerte senza il codice route). Durevole: `git revert` + redeploy. Trigger = criteri R1 (5xx >2% su 10 min o smoke fail) + spike del segmento `auth` nel Server-Timing. |
| Dominio critico? | SÌ (auth) → percorso GRANDE: questa spec + panel + piano + worktree + TDD + review rafforzata. |

## 6. Testing

- **TDD per task.** Aree chiave: unit `getLabContext`/`getFreshLabContext` (claims validi/assenti, soft-deleted, admin senza lab, lab nei vari stati, mapping 401/403); middleware (pubbliche/protette/callback; token scaduto → 3 assert §D-1); **test di guardia allowlist** (§D-2); N11 security suite (§D-3: layout + A/B/C + gate admin + verifyTitolare + verifyAdminRete + WebAuthn); parità di contratto route migrate (suite ~2000 test resta verde; deviazioni dichiarate asserite); N12: test route con mock RPC per il mapping errori + test di parità per OGNI arco + SQL della migration in review rafforzata (pgTAP non disponibile; atomicità validata in QA su lab E2E); riconciliazioni: parità pre/post con le 2 fixture obbligatorie (§D-5).
- **FASE 7:** `tsc --noEmit` + `vitest run` + `next build` (output reale).
- **FASE 9 QA:** lab E2E (MAI lab Filippo) — login, navigazione, un write-path, flusso prova completo (N12), soft-deleted se disponibile.

## 7. Strategia di misura

1. **Pre-merge (Vercel Preview, stessa region+DB):** `scripts/perf-audit.ts` con `PERF_BASE` (env) e **≥5 run/route con 1° giro di warmup scartato** (riserva sre: best-of-2 non stima un p75; gate su mediana + worst). Deployment protection: header *Protection Bypass for Automation* (`x-vercel-protection-bypass`, disponibile su Hobby). Fallback locale (`next build && next start`) = **solo smoke funzionale, MAI confronto coi budget**.
2. **Post-merge (gate Francesco):** re-run identico contro prod (≥5 run), confronto con §6 diagnosi, target = budget §1. **Nota:** p75 «vero» certificato da Speed Insights RUM dopo ~7 giorni; il gate script è provvisorio. Cold start post-deploy: primo giro scartato (JWKS cache vuota).
3. **Gap noto:** creare 1 lavoro via wizard sul lab E2E per misurare `/lavori/[id]` (mai misurata), poi cleanup a baseline.
4. Rapporto: sezione «7. Risultati R2» + regression gate aggiornato (con eccezione known-issue riconciliazioni §D-5 se applicabile).

## 8. Cosa NON si fa (fuori perimetro, esplicito)

- Nessun cambio a RLS, Stripe, FatturaPA, flussi PEC (solo boilerplate auth categoria C, che resta `getUser()`).
- Nessuna Custom Access Token hook / claims custom nel JWT (staleness del ruolo inaccettabile; unica fonte di verità = DB).
- Nessun indice a priori su riconciliazioni; niente upgrade Supabase Pro (trigger: primo cliente pagante).
- Niente caching cross-request su dati tenant: solo dedup per-request.
- `getServiceClient()` per-chiamata NON si tocca (falsa pista archiviata).
- Log drain esterno e monitor sintetico esterno: opzionali post-R2 (il cron GitHub Actions §D-6 copre il minimo alerting); se Francesco vuole il drain, è 1 azione dashboard.
- **Backlog (non R2):** check `lab.stato` (sospeso/scaduto/blacklist) nei handler API categoria A — gap PRE-esistente (oggi nessuna API lo controlla, il gate vive solo nel layout); il LabContext lo rende gratis → item BACKLOG-TECNICO nuovo (N13 proposto).

## 9. Rischi e mitigazioni

| Rischio | Mitigazione |
|---|---|
| Refresh cookie rotto col passaggio a getClaims | test 3-assert §D-1 + smoke su preview |
| Regressione di contratto su 60+ file | migrazione meccanica via helper, commit ordinati per ondata (helpers+test → middleware → layout+pagine → GET A → boilerplate B/C → R2c) con suite verde tra le ondate; review per-task + whole-branch |
| Misuse helper cached dove serve fresh | allowlist versionato + test di guardia + naming esplicito |
| Embed LEFT che cambia semantica redirect layout | ordine check admin-first come vincolo di codice + test admin-senza-lab / utente-senza-lab |
| RPC N12 diverge da `TRANSIZIONI_CONSENTITE` | whitelist archi copiata 1:1 dal SERVER (non dalla UI), test parità per arco |
| Merge bloccato dal gate migration | **due merge unit** (riserva SA2): (1) R2b′+R2a′+N11+R2c+riconciliazioni = solo codice; (2) N12 = migration apply PRIMA del merge del codice route (funzioni additive inerti). N11 e il grosso della latenza non restano ostaggio dell'apply. |
| Preview non misurabile | Protection Bypass; altrimenti misura prod post-merge (il fallback locale non è comparabile) |

## 10. Azioni richieste a Francesco (gate e raccomandazioni)

1. 🛑 Apply migration N12 (o autorizzazione MCP Supabase via `/mcp` interattivo) — PRIMA del merge unit 2.
2. 🛑 Merge + deploy (gate finale; merge unit 1 può procedere senza l'apply).
3. Leggere Query Performance / `pg_stat_statements` per l'outlier riconciliazioni (già attivo; eventuale reset per baseline pulita).
4. **TTL access token 1h → 10-15 min** (dashboard Supabase → Auth → Sessions) — precondizione della finestra di revoca accettata (§2, §D-7).
5. Opzionale: log drain gratuito (Axiom/Better Stack) per persistenza log oltre 1h.
6. Da osservare post-deploy: primo invio PEC reale (residuo R1).

## 11. Registro riserve panel (rev.1 → rev.2)

| Advisor | Verdetto | Riserve integrate |
|---|---|---|
| solution-architect | CONFERMATA CON RISERVE | allowlist+test guardia (D-2); due merge unit (§9); contratto errori RPC + search_path + UNIQUE backstop (D-5); `x-pathname` (D-1/D-6); pin `^2.105.0` (§2); nota cold-start JWKS (§7); wording confine ≠ RLS (D-7); verifica FK embed al primo task (D-2) |
| sre-guardian | CONFERMATA CON RISERVE | cron GitHub Actions su budget (D-6); Instant Rollback primario + trigger (§5); misura ≥5 run + warmup + Protection Bypass + RUM come p75 vero (§7); 3 assert refresh (D-1); pg_stat_statements già attivo + known-issue riconciliazioni (§2, D-5); Server-Timing negli helper + sui redirect + log pre-redirect (D-6) |
| backend-api | CONFERMATA CON RISERVE | archi completi con `in_ritardo` + `p_stato_destinazione` (D-5); ERRCODE custom + RETURNS prova/tecnico_id + backstop 23505 (D-5); mapping 401/403 fissato + deviazione dichiarata (D-2); vincoli embed gruppo 3/5 + fixture (D-5); ordine check layout + no allargamento LabContext + no normalizzazioni silenziose (D-2); degradi per-ramo striscia (D-4); path corretto queries-riconciliazioni (§3) |
| appsec-auditor | CONFERMATA CON RISERVE | tenant filter dentro FOR UPDATE + UA404 (D-5); TTL come precondizione tracciata (§2, §10.4); WebAuthn enrollment + eccezione accept-invite (§3, D-3); runbook revoca (D-3); guardrail anti-bypass nel test guardia (D-2); backlog N13 lab.stato nelle API (§8); test verifyTitolare/verifyAdminRete/WebAuthn (§6) |
