# Sessione attiva — P0-PERF R2 (17/07/2026)

**Stato:** R2 COMPLETO sul branch `worktree-p0-perf-r2` (35 commit, pushato su origin). FASE 7 verde (tsc 0, vitest 2090 pass, build OK). Review finale whole-branch passata, QA locale su build prod PASS (`auth;dur=1-2ms` = claims locali confermati).

**In attesa (gate Francesco, checklist completa in `docs/roadmap/P0-PERF-DIAGNOSI-2026-07-17.md` §7):**
1. Apply migration `20260717120000_n12_prove_atomiche.sql` + FASE 6b (gen types + tsc)
2. Merge + deploy + QA post-deploy (smoke UA404/UA409, riconciliazioni asserzione positiva, flusso prove E2E)
3. Re-misura `PERF_RUNS=5 npx tsx scripts/perf-audit.ts` vs budget + compilare tabella §7
4. TTL access token → 10-15 min (dashboard Supabase)

BP-1 fatto (commit `48ad822` su main locale, non pushato). N11+N12 chiusi sul branch; nuovi item N13, N11-bis nel BACKLOG.
