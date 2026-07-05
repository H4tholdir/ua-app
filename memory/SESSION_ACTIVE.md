# Handoff — B13 (1/2) idempotenza DdC/Buono completato, non ancora mergiato (05/07/2026)

**COMPLETATO E VERIFICATO in questo worktree** (`worktree-b13-ddc-buono-idempotenza`, branch `worktree-worktree-b13-ddc-buono-idempotenza`): guard di idempotenza in `generateDdC()`/`generateBuono()` per rendere sicuro il retry di `orchestraConsegna()` dopo un fallimento parziale (niente più PDF orfani su Storage o progressivi bruciati). `tsc`/`vitest` (481 passed/4 skipped)/`next build` tutti puliti. Dettaglio completo: `memory/MEMORY.md` §0. **Non ancora mergiato su `main`** — in attesa di conferma esplicita di Francesco.

**Prossima priorità: B13 (2/2)** — silent-fail del webhook Stripe, zero test su `orchestraConsegna`/webhook. Vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B13 per il dettaglio, non ancora iniziato.
