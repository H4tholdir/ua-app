# Sessione attiva — P0-PERF R2 (17/07/2026) — CHIUSA

**R2 mergiato (`3fbabca`), deployato (`5008f39` success), QA prod PASS, misurato.** Migration N12 applicata (Management API) + FASE 6b; TTL token 900s attivo; flusso prove verificato end-to-end su prod (UA404/UA409 reali, atomicità confermata, lavoro QA annullato).

**Misura finale (PERF_RUNS=5):** TTFB pagine mediana 175ms / p75 198ms ✅ (budget 300) · API p75 152ms ✅ (budget 250) · riconciliazioni 660→191ms ✅ · login→dashboard 2.758ms ⚠️ = client-side (N14, decisione UX).

**Handoff sessione nuova:** `docs/roadmap/2026-07-17-post-r2-handoff.md` (N14 decisione UX → N13 → N11-bis → triage backlog).

**Residui Francesco:** run manuale `perf-budget.yml` + secrets PERF_*; primo invio PEC reale; decisione N14. Prossimo: sequenza ratificata (N13, N11-bis, N14, §A, §O → funzioni → design → audit → collaudo).
