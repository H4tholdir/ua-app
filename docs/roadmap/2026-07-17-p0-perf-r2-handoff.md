# Handoff — Sessione P0-PERF R2: riduzione dei round-trip per request
**Data handoff:** 17 luglio 2026 · **Da eseguire in sessione NUOVA a contesto pulito** (decisione Francesco)
**Percorso:** GRANDE (tocca auth → override FASE 3, CLAUDE.md §0C) — brainstorming → spec con panel advisor (REGOLA ADVISOR §0C) → piano → worktree → subagent-driven-development → FASE 7/8/9 → gate merge Francesco.

---

## 1. Contesto (30 secondi)

La PWA era lentissima in produzione. Diagnosi completa e validata da panel (3× CONFERMATA CON RISERVE): **`docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md`** — leggerla TUTTA prima di iniziare, in particolare §5 (verdetti/decisioni già ratificate) e §6 (risultati R1).

**R1 è FATTO** (17/07, commit `441948b`): funzioni Vercel spostate a `dub1`, co-locate col DB. Risultati: mediana TTFB 812→354ms, login→dashboard 5,2s→2,5s, API −70/80%.

**R2 = questo lavoro.** Obiettivo: chiudere il gap residuo fino ai budget ratificati:
- TTFB pagine autenticate **p75 ≤ 300ms** (allarme >500)
- API GET **p75 ≤ 250ms**
- Login→dashboard **≤ 2s**

Il residuo è il moltiplicatore interno di round-trip: auth verificata 3× per navigazione (middleware+layout+page), query `utenti` duplicata, zero `React.cache()`, 6-18 `await` sequenziali, 154 call-site di `auth.getUser()`.

## 2. Perimetro R2 — ordine RATIFICATO dal panel (non invertire senza nuovo panel)

1. **R2b′ — `getClaims()` nel middleware** al posto di `auth.getUser()` di rete (`src/middleware.ts:22`). Il middleware si autodichiara «UX only, non confine di sicurezza». Prerequisito GIÀ verificato: il JWKS del progetto pubblica chiave **ES256** (signing keys asimmetriche attive) → verifica locale zero-rete. **Verifica residua obbligatoria:** che ES256 sia la *current key* nei token emessi (`kid` dei token reali); se i token fossero ancora HS256, `getClaims` degrada a chiamata di rete e va prima ruotata la signing key. Garantire che il refresh del cookie sessione continui a funzionare (caso token-scaduto da testare esplicitamente).
2. **R2a′ — helper unico `getLabContext()`** con `React.cache()` in `src/lib/supabase/` — deduplica getUser+`utenti`+`laboratori` tra layout ↔ page ↔ componenti (NON copre il middleware: render pass separato — errore già corretto dal panel, non reintrodurlo). Valutare RPC `get_lab_context` (3 RT → 1) riusabile nelle ~40 route; se SECURITY DEFINER → gotcha CLAUDE.md §9 (`REVOKE FROM PUBLIC, anon, authenticated` + `GRANT` a `service_role`). **Include il fix di sicurezza N11** (vedi §3).
3. **R2c — `Promise.all`** sui loader indipendenti delle pagine peggiori (rimisurare prima per prioritizzare: `scripts/perf-audit.ts`).
4. **R2d — consolidamento route peggiori:** embed PostgREST `!inner` per i pattern guard-then-fetch; RPC transazionali per operazioni di business multi-scrittura (precedente: `crea_rifacimento_atomico()`). Include l'outlier **`/fatture/riconciliazioni`** (post-R1 ancora ~660ms: dominata dalle proprie query — profilare con `pg_stat_statements`) e candidata **N12** (route prove non transazionale — atomicità, non solo latenza).

## 3. Vincoli e decisioni GIÀ RATIFICATE (non rilitigare, integrare)

- **`getUser()` RESTA su:** tutte le mutazioni (POST/PATCH/DELETE), route fiscali (fatture, pagamenti, PSUR, PEC), admin, e ovunque il ruolo guidi l'autorizzazione. Il confine di sicurezza vero resta RLS (`public.current_lab_id()`) + query `utenti` fresca.
- **N11 (sicurezza, si chiude qui):** filtro `utenti.deleted_at IS NULL` incoerente — `dashboard/page.tsx:37` lo applica, `(app)/layout.tsx:20-24` e `api/clienti/route.ts:18-22` NO. `getLabContext()` adotta la variante RESTRITTIVA; censire tutte le occorrenze del pattern; testare come fix di sicurezza (utente soft-deleted NON deve passare).
- Con `getClaims` valutare riduzione TTL access token (default 1h → 10-15 min; il refresh è trasparente).
- `getServiceClient()` ricreato per chiamata NON è un problema (keepalive undici per-origin) — non spenderci tempo. `force-dynamic` sulle pagine autenticate è corretto.
- Runtime middleware (edge vs Node su Vercel/Next 16): da verificare nel deployment output — determina il beneficio effettivo di R2b′.
- Osservabilità da installare CONTESTUALMENTE a R2 (riserva sre, non rimandare a R3): header **`Server-Timing`** (fasi `auth`/`db`/`total`) su layout+route chiave; **Vercel Speed Insights** (1 riga, incluso su Hobby); `pg_stat_statements` attivo su Supabase PRIMA dei fix (baseline query).
- **Supabase MCP:** richiede autorizzazione OAuth da sessione interattiva (`/mcp`) — chiedere a Francesco se non già fatto; serve per `pg_stat_statements`/query lente. In alternativa la CLI linkata funziona per i comandi non-DB.

## 4. Verifica finale (oltre a FASE 7/8/9 standard)

- Re-run **`scripts/perf-audit.ts`** (stesso script delle baseline; output locale in `scripts/tmp/`, NON committare i JSON) e confronto con §6 del rapporto: target = budget §1.
- **Gap noto da colmare:** il lab E2E non ha lavori attivi → la scheda `/lavori/[id]` (9 await) non è mai stata misurata. In QA crearne uno via wizard sul lab E2E (MAI lab Filippo), misurare, poi cleanup a baseline.
- Aggiornare il rapporto P0-PERF con la sezione «7. Risultati R2» + aggiornare budget/regression gate.
- BP-1: MEMORY.md + ROADMAP-UFFICIALE.md + BACKLOG (§P0-PERF, N11, N12).

## 5. File chiave

`src/middleware.ts` · `src/app/(app)/layout.tsx` · `src/lib/supabase/{server-user,server-service,middleware-client}.ts` · `src/app/(app)/dashboard/page.tsx` · `src/lib/dashboard/{pile-home,striscia}.ts` · `src/app/api/clienti/route.ts` (pattern route tipo) · `src/app/api/lavori/[id]/prove/route.ts` (N12) · `src/app/(app)/fatture/riconciliazioni/` (outlier)

## 6. Prompt di avvio suggerito per la sessione nuova

> Leggi `ua-app/docs/roadmap/2026-07-17-p0-perf-r2-handoff.md` e il rapporto `ua-app/docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md` (tutto, in particolare §5-§6). Esegui la sessione R2 come percorso GRANDE: brainstorming, FASE 3, spec validata da panel advisor (regola CLAUDE.md §0C), piano, worktree dedicato, subagent-driven-development. Gate di merge: mio.
