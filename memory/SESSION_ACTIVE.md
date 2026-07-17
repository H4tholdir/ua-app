# Sessione attiva — N13 guard lab.stato (17/07/2026 notte) — IMPLEMENTATO, IN ATTESA MERGE

**N13 ✅ completo** su branch `worktree-n13-lab-guard` (worktree `.claude/worktrees/n13-lab-guard`, base main `990b2f1`, 8 commit). Piano: `docs/superpowers/plans/2026-07-17-n13-lab-guard.md`. Guard su 87 route + portale (API **e pagine**) + interceptor client + ban GoTrue su blacklist + pec-verify constant-time. Default **shadow** (kill-switch `UA_LAB_GUARD_MODE`). FASE 7: tsc 0 · vitest 2139 · build OK. Review 5 finder → 10 finding, tutti fixati (top: endpoint GoTrue logout inesistente → ban; leak pagine portale).

**Working tree main:** contiene ancora N11-bis + N14 NON committati + docs (decisione, handoff, piano N13) untracked. MEMORY.md aggiornata (voce 8).

**Residui Francesco:** commit main → merge N13 → deploy shadow 24-48h → doc GDPR out-of-band (`docs/security/`, bloccante per enforce) → flip enforce → QA lab E2E · collaudo login ≤2s + `PERF_BUDGET_LOGIN`.
