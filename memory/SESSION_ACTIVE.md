# Handoff — B13 (1/2) idempotenza DdC/Buono completato, non ancora mergiato (05/07/2026)

**COMPLETATO E VERIFICATO in questo worktree** (`worktree-b13-ddc-buono-idempotenza`, branch `worktree-worktree-b13-ddc-buono-idempotenza`): guard di idempotenza in `generateDdC()`/`generateBuono()` per rendere sicuro il retry di `orchestraConsegna()` dopo un fallimento parziale (niente più PDF orfani su Storage o progressivi bruciati). `tsc`/`vitest` (481 passed/4 skipped)/`next build` tutti puliti. Dettaglio completo: `memory/MEMORY.md` §0. **Non ancora mergiato su `main`** — in attesa di conferma esplicita di Francesco.

**Prossima priorità: B13 (2/2)** — silent-fail del webhook Stripe (nessun handler controlla `.success` di `transitionLabStato()`, Stripe non ritenta mai su un fallimento reale), zero test su `orchestraConsegna`/webhook. Non ancora iniziato. Altri blocker aperti nel backlog: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B11 (colore bandito su card lavoro), B12 (login WCAG), B14 (compenso_base ambiguo), B15 (Abbonamento contraddittorio), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF). Dettaglio completo: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`.

---

Backlog: 🔴 11/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅, B13 1/2 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
