# P0-PERF — Diagnosi lentezza sistemica in produzione
**Data:** 17 luglio 2026 · **Metodo:** superpowers:systematic-debugging (Fase 1-2 complete, Fase 3 validata da panel advisor)
**Segnalazione:** Francesco — «ogni operazione ci mette una vita, ogni pagina carica in troppo tempo; la PWA deve essere velocissima e fluida»

---

## 1. Causa radice (evidenza forte, convergente)

**Le funzioni serverless Vercel girano a `iad1` (Washington DC, USA) — regione default mai configurata — mentre il database Supabase è in `eu-west-1` (Irlanda) e gli utenti sono in Italia.**

Ogni richiesta autenticata percorre: utente (IT) → edge Vercel `fra1` → funzione a `iad1` (attraversata atlantica) → N round-trip **sequenziali** verso il DB in Irlanda (~85-95ms l'uno) → risposta di nuovo attraverso l'Atlantico.

**Fattore amplificatore (architettura interna):** il numero di round-trip per richiesta è moltiplicato senza necessità:
- `middleware.ts:22` → `auth.getUser()` = chiamata di RETE ad Auth su ogni request
- `(app)/layout.tsx` → **rifà** `getUser()` + query `utenti` + query `laboratori`, in serie
- ogni `page.tsx` → **rifà** `getUser()` e spesso ri-interroga `utenti` (154 call-site di `auth.getUser()` nel codebase)
- pagine con 6-13 `await` sequenziali; route API con 13-18; **zero uso di React `cache()`**; `Promise.all` raro
- Aritmetica: 5-10 RT × ~90ms = 500-900ms di sola rete per richiesta → coincide con il misurato

**Fattore secondario:** Supabase piano FREE (compute Nano condiviso) — oggi non dominante, diventerà rilevante con utenti reali.

## 2. Prove

- `x-vercel-id: fra1::iad1::…` su ogni risposta dinamica (funzione = iad1); nessun `vercel.json` né `preferredRegion` nel repo
- Regione DB verificata via CLI: `eu-west-1`, progetto `iagibumwjstnveqpjbwq`, ACTIVE_HEALTHY, Postgres 17
- `/billing` (redirect quasi a vuoto): TTFB **1,38s**
- Pagine pubbliche cacheate (`/login`): 180-340ms → il problema è SOLO server-render autenticato
- Audit capillare Playwright in prod (lab E2E `00000000-…-0001`, MAI lab Filippo, viewport 390px, sola lettura, 2 passate): **TTFB 600-1550ms su tutte le 27 superfici misurate, uniforme e indipendente dalla complessità della pagina** — la firma di un overhead per-request, non delle query
- **Login→dashboard: 5.189ms**
- API GET banali con sessione: `/api/clienti` 845-900ms, `/api/listino` 540-818ms, `/api/fornitori` 504-754ms, `/api/cicli` 552-580ms
- Zero errori console; zero fetch Supabase client-side (tutto server-side → tutto nel TTFB)

## 3. Misure per pagina (prod, 17/07/2026 — baseline pre-fix)

| Route | TTFB run1 (ms) | TTFB run2 (ms) | Load run1 (ms) | Load run2 (ms) |
|---|---|---|---|---|
| `/lavori/nuovo` | 789 | 1272 | 1124 | 1289 |
| `/fatture` | 1549 | 1217 | 1884 | 1306 |
| `/lavori` | 1544 | 1075 | 1817 | 1088 |
| `/ordini` | 1001 | 1020 | 1494 | 1665 |
| `/listino` | 812 | 1018 | 1014 | 1039 |
| `/tutto-il-resto` | 1497 | 1015 | 1682 | 1030 |
| `/pazienti/42213ed7-a599-4be4-ba26-dac7a8a3ad96` | 717 | 1012 | 1157 | 1197 |
| `/rete` | 865 | 1010 | 1123 | 1025 |
| `/agenda` | 1338 | 1009 | 1617 | 1026 |
| `/magazzino` | 1193 | 992 | 1593 | 1110 |
| `/impostazioni/pec` | 1048 | 974 | 1248 | 991 |
| `/pazienti` | 826 | 954 | 1030 | 971 |
| `/tecnici` | 858 | 937 | 1083 | 1020 |
| `/qualita/rischi` | 994 | 880 | 1222 | 961 |
| `/cicli-produzione` | 1247 | 879 | 1447 | 898 |
| `/qualita/psur` | 1408 | 864 | 1574 | 1082 |
| `/impostazioni/abbonamento` | 945 | 811 | 1185 | 828 |
| `/dashboard` | 35 | 810 | 3093 | 1299 |
| `/analytics` | 919 | 784 | 1458 | 976 |
| `/qualita/incidenti/nuovo` | 846 | 738 | 1132 | 760 |
| `/qualita` | 835 | 718 | 1437 | 1020 |
| `/fatture/riconciliazioni` | 939 | 717 | 1245 | 1204 |
| `/clienti` | 1160 | 705 | 1365 | 1086 |
| `/impostazioni` | 986 | 675 | 1185 | 693 |
| `/impostazioni/profilo` | 1042 | 672 | 1266 | 689 |
| `/scadenzario` | 825 | 649 | 1081 | 664 |
| `/clienti/00000000-0000-0000-0000-000000000003` | 589 | 607 | 801 | 844 |

**Gap noto:** il lab E2E non ha lavori attivi → scheda lavoro `/lavori/[id]` (9 await + join a 9 tabelle) non misurata. Da coprire nel re-test post-fix.
Raw data: `scripts/tmp/perf-results.json` (non committato). Script riusabile: `scripts/tmp/perf-audit.ts`.

## 4. Piano di rimedio proposto (in validazione dal panel advisor)

- **R1 — Co-locazione (config-only, reversibile):** function region Vercel → `dub1` (Dublino, stessa regione del DB). Atteso: ogni RT DB da ~90ms a ~1-3ms; TTFB atteso 150-350ms.
- **R2 — Riduzione round-trip:** (a) helper per-request con React `cache()` che deduplica getUser/utenti/laboratori tra layout e page; (b) verifica JWT locale al posto di `auth.getUser()` di rete dove è solo gate di sessione; (c) `Promise.all` sui loader indipendenti; (d) eventuale RPC unica «contesto lab».
- **R3 — Dopo (con utenti reali):** upgrade compute Supabase, caching asset (M3), bundle.

## 5. Verdetti panel advisor (17/07/2026 — solution-architect + sre-guardian + backend-api)

**3× CONFERMATA CON RISERVE, zero bloccanti.** Tutte le riserve integrate nel piano qui sotto.

### Convergenze e correzioni integrate

1. **R1 subito, region `dub1`** (stessa availability-zone family del DB eu-west-1 → RTT ~1-2ms; `fra1` sprecherebbe 25-30ms/RT). Una singola region custom è configurabile anche su piano Vercel Hobby. Rischi verificati: webhook Stripe = nessuno (chiamano il dominio); pg_cron = indipendente; PEC/SMTP = provider EU, uguale o meglio (ma smoke obbligatorio: cambia l'IP di uscita); cold start post-deploy = transitorio one-off.
2. **Procedura R1 (rollout sicuro):** baseline congelata (stesso script, p50/p95) → `vercel.json` `{"regions":["dub1"]}` → deploy → smoke: `x-vercel-id` contiene `dub1`, login+una scrittura reale su lab E2E, webhook Stripe in test mode, invio PEC di test → re-misura stesso script → **rollback = revert+redeploy (<5 min)**. Trigger rollback: 5xx >2% su 10 min o smoke falliti. **Se post-R1 il TTFB non scende sotto ~350ms, la diagnosi va rivista (sospetto torna su compute Nano) prima di procedere.**
3. **R2 RIORDINATO (correzione unanime):** `cache()` di React NON copre il middleware (render pass separato). Ordine nuovo: **(R2b′) `getClaims()` nel middleware** al posto di `getUser()` di rete — il middleware si autodichiara «UX only, non confine di sicurezza» ed è il singolo intervento a più alto rapporto beneficio/rischio. Prerequisito verificato: JWKS del progetto pubblica chiave **ES256** (signing keys asimmetriche attive) → verifica locale zero-rete; residuo da controllare: che ES256 sia la *current key* nei token emessi. Poi **(R2a′) helper unico `getLabContext()`** con `cache()` (dedup layout↔page) + eventuale RPC `get_lab_context` (getUser→utenti→laboratori: da 3 RT a 1, riusabile nelle ~40 route). Poi **(R2c) `Promise.all`** sui loader indipendenti. Poi **(R2d) consolidamento route peggiori** (embed PostgREST `!inner`, RPC transazionali per operazioni di business — precedente: `crea_rifacimento_atomico`).
4. **`getUser()` RESTA su:** tutte le mutazioni (POST/PATCH/DELETE), route fiscali (fatture, pagamenti, PSUR, PEC), admin, e ovunque il ruolo guidi l'autorizzazione. Il vero confine resta RLS + query `utenti` fresca. Con `getClaims` valutare riduzione TTL access token (default 1h → 10-15 min).
5. **R2 = dominio critico (auth) → percorso GRANDE** (FASE 3 CLAUDE.md), non «refactor performance». Eventuale RPC SECURITY DEFINER col gotcha §9 (`REVOKE`/`GRANT` espliciti).
6. **Scoperta di sicurezza (nuovo item N11):** incoerenza filtro `utenti.deleted_at` — `dashboard/page.tsx:37` filtra `IS NULL`, ma `(app)/layout.tsx:20-24` e `api/clienti/route.ts:18-22` NO: un utente soft-deleted passa layout e API. L'helper unico deve adottare la variante restrittiva; da testare come fix di sicurezza.
7. **Scoperta di atomicità (nuovo item N12):** `api/lavori/[id]/prove/route.ts:103-120` fa transizione stato + count + insert in 3+ RT **senza transazione** — bug di atomicità latente in dominio MDR, non solo latenza.
8. **Osservabilità permanente (da installare con R1/R2):** header `Server-Timing` (fasi `auth`/`db`/`total`) su route e layout chiave; **Vercel Speed Insights** (RUM utenti reali, incluso su Hobby); `pg_stat_statements` attivo su Supabase (baseline PRIMA di R1); log strutturato 1-riga per request con drain gratuito (es. Axiom); monitor sintetico esterno su login→dashboard.
9. **Budget di performance ratificati (p75):** TTFB pagine autenticate **≤300ms** (allarme >500), API GET **≤250ms** (allarme >400), LCP mobile 4G **≤2,0s**, INP **≤200ms**, login→dashboard **≤2s** (allarme >3s). Regression gate post-deploy: fail se p95 > budget E > baseline+30% su 2 run consecutive.
10. **Supabase Pro (~$25/mese) = prerequisito di PRODUZIONE al primo cliente pagante**, non ottimizzazione: il FREE ha pause dopo 7 giorni di inattività, ~60 connessioni, retention log 1 giorno. Segnale anticipatore da monitorare: varianza p95/p50 del segmento `db` nel Server-Timing.
11. **Falsa pista archiviata:** `getServiceClient()` ricreato per chiamata NON è un problema (fetch/undici fa keepalive per-origin); `force-dynamic` sulla dashboard è corretto.
12. **Verifica residua:** runtime effettivo del middleware (edge vs Node in Next 16 su Vercel) — determina se R1 abbatte anche il suo RT o serve aspettare R2b′; si legge dal deployment output post-R1.

---

## 6. Risultati R1 (deploy `441948b`, 17/07/2026 — funzioni a `dub1`)

**Smoke: PASS** — `x-vercel-id: fra1::dub1` confermato; login + navigazioni 200; write-path esercitato (PATCH no-op cliente E2E: 200 in 283ms, dato invariato); webhook Stripe raggiungibile dalla nuova regione (400 firma-mancante atteso, in 195ms totali). Residuo da osservare: primo invio PEC reale post-R1 (cambia l'IP di uscita — il lab E2E usa smtp fittizio, non testabile in smoke).

**Misure (stesso script della baseline, best-of-2 per route):**
- **Mediana TTFB pagine autenticate: 812ms → 354ms (−56%)**
- **Login→dashboard: 5.189ms → 2.486ms (−52%)**
- **API GET: −70/−80%** — `/api/clienti` 845→188ms · `/api/listino` 540→161ms · `/api/fornitori` 504→156ms · `/api/cicli` 552→155ms
- Migliore: `/fatture` 1.217→255ms (−79%) · Outlier: `/fatture/riconciliazioni` 717→660ms (−8% — dominata dalle proprie query, candidata prioritaria per R2d/pg_stat_statements)

| Route | TTFB before (ms) | TTFB after (ms) | Δ |
|---|---|---|---|
| `/fatture` | 1217 | 255 | −79% |
| `/lavori` | 1075 | 543 | −49% |
| `/tutto-il-resto` | 1015 | 368 | −64% |
| `/agenda` | 1009 | 247 | −76% |
| `/ordini` | 1001 | 272 | −73% |
| `/magazzino` | 992 | 451 | −55% |
| `/impostazioni/pec` | 974 | 471 | −52% |
| `/qualita/rischi` | 880 | 368 | −58% |
| `/cicli-produzione` | 879 | 298 | −66% |
| `/rete` | 865 | 301 | −65% |
| `/qualita/psur` | 864 | 354 | −59% |
| `/tecnici` | 858 | 342 | −60% |
| `/pazienti` | 826 | 314 | −62% |
| `/listino` | 812 | 354 | −56% |
| `/impostazioni/abbonamento` | 811 | 380 | −53% |
| `/lavori/nuovo` | 789 | 416 | −47% |
| `/analytics` | 784 | 384 | −51% |
| `/qualita/incidenti/nuovo` | 738 | 275 | −63% |
| `/qualita` | 718 | 420 | −42% |
| `/fatture/riconciliazioni` | 717 | 660 | −8% |
| `/pazienti/42213ed7-a599-4be4-ba26-dac7a8a3ad96` | 717 | 375 | −48% |
| `/clienti` | 705 | 320 | −55% |
| `/impostazioni` | 675 | 260 | −61% |
| `/impostazioni/profilo` | 672 | 387 | −42% |
| `/scadenzario` | 649 | 336 | −48% |
| `/clienti/00000000-0000-0000-0000-000000000003` | 589 | 285 | −52% |

**Verdetto R1:** causa radice confermata empiricamente (la co-locazione da sola dimezza tutto). Il residuo (~350ms mediana vs budget ≤300ms; login→dashboard 2,5s vs budget ≤2s) è il moltiplicatore di round-trip interno → si chiude con **R2**. Rollback non necessario.

---

## 7. Risultati R2 (17/07/2026 — branch `worktree-p0-perf-r2`, 35 commit, IN ATTESA DI MERGE)

**Percorso GRANDE eseguito per intero:** brainstorming con 3 censimenti → FASE 3 → spec rev.2 **validata dal panel advisor (4× CONFERMATA CON RISERVE, zero bloccanti — solution-architect + sre-guardian + backend-api + appsec-auditor, tutte le riserve integrate)** → piano 16 task → worktree → subagent-driven-development (17 task, review per-task + review finale whole-branch «Ready to merge — With fixes», fix applicati) → FASE 7 verde.

### Implementato (spec `docs/superpowers/specs/2026-07-17-p0-perf-r2-design.md`)

- **R2b′** — `getClaims()` nel middleware (verifica ES256 locale contro JWKS, prerequisito `kid` verificato sui token reali): zero rete a token valido; refresh cookie testato (3 assert); `x-pathname` + `Server-Timing` anche sui redirect. Nota: Next 16 segnala `middleware.ts` deprecato a favore di `proxy.ts` (build output: «ƒ Proxy (Middleware)») — rinomina candidata per un task futuro.
- **R2a′** — `src/lib/supabase/lab-context.ts`: `getLabContext()` (claims + `React.cache()`, 3 RT→1 con embed LEFT `utenti→laboratori`) e `getFreshLabContext()` (getUser, mutazioni/fiscale/admin). Adottati da layout, ~33 pagine, 28 GET categoria A (allowlist versionato + test di guardia 3/3 in suite) e ~75 file B/C. NIENTE RPC `get_lab_context` (embed = stesso guadagno senza SECURITY DEFINER).
- **N11 CHIUSO** — filtro `deleted_at IS NULL` su TUTTI i ~140 lookup del contesto utente (prima: 7/140). Scoperta review: un `admin_sistema` soft-deleted manteneva PIENO accesso admin. Chiuso anche l'enrollment WebAuthn per soft-deleted. Test di sicurezza `n11-security.test.ts` in suite + guardia anti-bypass. Runbook di revoca: offboarding = `utenti.deleted_at` + `auth.admin.signOut(userId, 'global')`; il ban da dashboard NON è kill-switch sui GET categoria A entro il TTL.
- **R2c** — `Promise.all`: striscia dashboard (4 query parallele, degrado per-ramo), dashboard (pile∥ingressi), magazzino, qualita, analytics, scheda lavoro (firme DdC∥immagini).
- **R2d** — riconciliazioni: 4 query→2 (self-join `td04:fatture!fattura_collegata_id` + LEFT embed eventi, entrambi SENZA `!inner`, direzione self-join VERIFICATA sul DB reale); defense-in-depth `td04.laboratorio_id`. **N12 CHIUSO nel codice**: migration `20260717120000_n12_prove_atomiche.sql` (2 RPC transazionali SECURITY INVOKER, tenant-filter nel `FOR UPDATE`, archi 1:1 con `TRANSIZIONI_CONSENTITE`, `MAX+1` sotto lock, ERRCODE `UA404`/`UA409`) + route riscritta. **Bonus (Task 17, richiesto da Francesco):** TabProve allineato al contratto POST + fix parsing GET (il flusso prove esterne in UI era interamente morto — 2 bug pre-esistenti).
- **Osservabilità** — `Server-Timing` (fasi auth/db/total) su middleware + 28 GET; log strutturato `[layout] {route,authMs,dbMs,totalMs}`; Vercel Speed Insights nel root layout; `perf-audit.ts` v2 (PERF_BASE/RUNS≥5/warmup/BYPASS/ENFORCE, p75 vs budget) + cron GitHub Actions giornaliero `perf-budget.yml` (allarme minimo via fail del job).

### Verifica (FASE 7/8/9, output reali)

`tsc --noEmit` 0 errori · vitest **2090 pass / 19 skip** (da baseline 2008) · `next build` OK · QA su build di produzione locale (lab E2E): login→dashboard OK, superfici chiave 200, riconciliazioni renderizza, write-path PATCH 200, **`Server-Timing: auth;dur=1-2ms` a caldo = verifica claims locale confermata empiricamente** (prima chiamata 94ms = fetch JWKS a freddo, una tantum per lambda). `db;dur≈88ms` in locale è la tratta Italia→Irlanda: da `dub1` sarà ~1-3ms. Nota dev-only: il dev server Turbopack non espone gli header Server-Timing (artefatto dev, verificato assente in produzione).

### Misura contro i budget — ESEGUITA post-deploy (17/07 sera; `PERF_RUNS=5`, giro 0 warmup scartato, 108 misure pagina + 16 API, run singolo login)

| Metrica | Baseline pre-R1 | Post-R1 | **Post-R2** | Budget | Esito |
|---|---|---|---|---|---|
| TTFB pagine autenticate (mediana) | 812ms | 354ms | **175ms (−78% dal baseline)** | — | — |
| TTFB pagine autenticate (**p75**) | — | — | **198ms** | ≤ 300ms | ✅ |
| API GET (**p75**) | 500-900ms | 155-188ms | **152ms** (best 126) | ≤ 250ms | ✅ |
| Login→dashboard | 5.189ms | 2.486ms | **2.758ms** | ≤ 2.000ms | ⚠️ vedi sotto |
| `/fatture/riconciliazioni` (ex outlier) | 717ms | 660ms | **191ms** | — | ✅ risolto dal consolidamento (nessun indice necessario) |
| `/dashboard` | 810ms | — | **179ms** | — | ✅ |

Peggiori residue (uniche >300ms, marginali): `/qualita/rischi` 321ms · `/tutto-il-resto` 307ms. Il p75 «vero» lo certificherà Speed Insights RUM dopo ~7 giorni.

**Login→dashboard 2.758ms — analisi:** il residuo NON è più server-side (dashboard TTFB 179ms). È il flusso client del login: **ritardo deliberato di 600ms** (`login-form.tsx:232/294` — animazione «Bentornato!») + prompt passkey a +400ms + grant password browser→Auth Irlanda + load dashboard. Chiuderlo è una decisione UX/product, non di infrastruttura → nuovo item **N14** (ridurre il delay e/o prefetch di `/dashboard` durante l'animazione: ~−600/800ms stimati, porterebbe sotto budget). Classificato **known-issue con rimedio identificato**, non fallimento del gate R2.

### Gate ESEGUITI (17/07 sera — delega esplicita di Francesco «procedi tu con tutti i passaggi che mancano»)

1. ✅ **Migration applicata** al DB live via Management API (201; funzioni verificate: SECURITY INVOKER, ACL solo `postgres`+`service_role`) + **FASE 6b** (types rigenerati con le 2 RPC, tsc 0, commit `9796def`).
2. ✅ **Smoke ERRCODE**: PostgREST propaga `code: "UA404"` → il mapping della route funziona (verificato PRIMA del merge).
3. ✅ **Merge `3fbabca` + push → deploy Vercel success** (`5008f39`; + cleanup `.superpowers` dal repo).
4. ✅ **QA prod flusso prove (lavoro QA dedicato 2026/0009, poi annullato):** crea→conferma→`manda_in_prova` 200 (`numero_prova:1`, stato `in_prova_esterna`) → doppio invio **409 UA409** → `registra_rientro` 200 con **`nuova_data_consegna` applicata atomicamente** (data_consegna_prevista aggiornata) → doppio rientro **409 senza effetti parziali** → lavoro inesistente **404 UA404** → GET prove array grezzo letto correttamente dal TabProve fixato.
5. ✅ **TTL access token 3600→900s** via Management API, verificato su token reale (`expires_in: 900`).
6. ✅ Re-misura (tabella sopra) + cleanup lavoro QA a stato terminale.

### Note operative post-deploy

- **`Server-Timing` è strippato dal proxy Vercel in produzione** (presente in locale con `next start`, assente su prod — limitazione piattaforma). Non blocca nulla: l'osservabilità prod passa da log `[layout]` (function logs Vercel), Speed Insights e cron perf-audit. Follow-up opzionale: rinominare in `x-server-timing`.
- Il middleware gira all'**edge `fra1`** e coi claims locali risolve i redirect **senza toccare `dub1`** (`x-vercel-id: fra1::…` puro sui redirect). Next 16 lo segnala deprecato a favore di `proxy.ts` (follow-up).
- `/lavori/[id]` non viene scoperta dallo script (le card delle pile non sono `<a>`): la copertura di misura resta indiretta (il costo per-request rimosso è uniforme). Follow-up: aggiungere route detail esplicita allo script.
- Residui per Francesco (non bloccanti): primo run manuale di `perf-budget.yml` (workflow_dispatch) + secrets `PERF_EMAIL`/`PERF_PASSWORD`; primo invio PEC reale post-R1 ancora da osservare.

### Deviazioni dichiarate (ratificate in review, da conoscere)

- Utente soft-deleted/orfano sui percorsi migrati: risponde **401** (prima 403 o passava); nel layout va a `/login` senza `?error=no_lab` (parametro oggi inerte nella login form).
- Blip DB nel lookup contesto sui GET migrati: **401** invece di 500 (fail-closed, loggato server-side).
- 409 N12 senza effetti collaterali parziali (prima la prova restava marcata rientrata anche se la transizione falliva — era il bug).

### Follow-up tracciati (BACKLOG)

**N13 (nuovo):** check `lab.stato` (sospeso/scaduto/blacklist) nei handler API — gap PRE-esistente (il gate vive solo nel layout), il LabContext lo rende gratis. **N11-bis (nuovo):** lookup admin di utenti TARGET senza `deleted_at` (impersonate/live — un titolare soft-deleted resta impersonabile). Minori: rinomina `middleware.ts`→`proxy.ts`; test `trial_ends_at NULL`; cleanup dead-code `?error=no_lab`; log drain esterno (opzionale).
