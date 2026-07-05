# Handoff — B13 COMPLETO (1/2 + 2/2), non ancora mergiato (05/07/2026)

**B13 risolto in entrambe le parti in questo worktree** (`worktree-b13-webhook-stripe-silent-fail`, branch `worktree-worktree-b13-webhook-stripe-silent-fail`, separato dal worktree di B13 1/2 già mergiato e rimosso): silent-fail del webhook Stripe — `findLabBySubscription()` ora lancia invece di ritornare `null` (causa radice reale, 4/5 handler uscivano in silenzio), `transitionLabStato()` ha un campo `retryable`, nuovo helper `assertTransitionOk()` su tutti i call site. `tsc`/`vitest` (498 passed/4 skipped)/`next build` puliti. Nessuna migration (vincolo UNIQUE già presente). Dettaglio: `memory/MEMORY.md` §0. **Non ancora mergiato su `main`** — in attesa di conferma esplicita di Francesco.

**Prossima priorità da decidere con Francesco** tra i blocker rimanenti: B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B11 (colore bandito su card lavoro), B12 (login WCAG), B14 (compenso_base ambiguo), B15 (Abbonamento contraddittorio), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF).

---

Backlog: 🔴 12/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅, B13 ✅, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
