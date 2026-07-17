# Handoff — Sessione post P0-PERF (residui §N + sequenza ratificata)
**Data:** 17 luglio 2026, sera · **Da eseguire in sessione NUOVA a contesto pulito** (decisione Francesco)

## Contesto (30 secondi)

**P0-PERF è CHIUSO** (R1 `441948b` + R2 merge `3fbabca`, deploy verificato, `main` a `b95357d`). Misura finale: TTFB pagine p75 **198ms** (budget ≤300 ✅, mediana 175ms = −78% dal baseline), API p75 **152ms** (≤250 ✅), ex-outlier riconciliazioni 660→191ms ✅. Migration N12 applicata al DB live, QA prod PASS, TTL token 900s, cron `perf-budget` operativo (soglie CI calibrate per runner US: 420/370/4500). Rapporto completo: `docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md` §7.

**Sequenza operativa ratificata (17/07):** (1) risolvere tutti i problemi → (2) funzioni attive → (3) design coerente (sp.4) → (4) audit multi-agente → (5) collaudo capillare Francesco.

## Prossimo lavoro — punto (1), residui in ordine proposto

1. **N14** 🟡 — login→dashboard sopra budget per flusso CLIENT (600ms delay animazione «Bentornato!» + prompt passkey; server ok a 179ms). Rimedio identificato: ridurre delay + `router.prefetch('/dashboard')`. **Serve decisione UX di Francesco prima di implementare.** Chiusa N14 → abbassare `PERF_BUDGET_LOGIN` nel workflow.
2. **N13** 🟡 — nessun check `lab.stato` (sospeso/scaduto/blacklist) nei handler API: gap pre-esistente, gate solo nel layout. Col `LabContext` il dato è gratis → guard centrale nei 2 helper (`src/lib/supabase/lab-context.ts`). Decidere matrice stati×metodi. Tocca auth → percorso GRANDE-lite (panel advisor).
3. **N11-bis** 🟢 — lookup admin di utenti TARGET senza `deleted_at` (`api/admin/labs/[id]/impersonate/route.ts:40`, `admin/labs/[id]/live/page.tsx:53`): titolare soft-deleted resta impersonabile. Fix piccolo.
4. Residui §N/§A/§O del `BACKLOG-TECNICO-2026-07-02.md` (rate-limit PEC, cron riconciliazione ricevute, O8, ecc.) — triage in sessione.

## Follow-up minori tracciati (non bloccanti, batch quando capita)

- Rinomina `middleware.ts` → `proxy.ts` (deprecation Next 16); test `trial_ends_at NULL`; cleanup dead-code `?error=no_lab` (~8 pagine); `Server-Timing` strippato da Vercel in prod (eventuale rinomina `x-server-timing`); route detail `/lavori/[id]` da aggiungere a `scripts/perf-audit.ts` (le card pile non sono anchor); secrets `PERF_EMAIL`/`PERF_PASSWORD` per il cron (fallback hardcoded attivo).

## Azioni SOLO di Francesco

- Decisione N14 (sopra) · secrets PERF_* su GitHub · osservare il primo invio PEC reale post-R1 · tra ~7 giorni leggere Speed Insights (p75 RUM reale).

## Regole di ingaggio (invariate)

CLAUDE.md §0C (12 fasi + regola advisor) · lab E2E `00000000-…-0001` per QA, MAI lab Filippo · budget/regression gate: rapporto P0-PERF §7 · BP-0/BP-1 obbligatori.
