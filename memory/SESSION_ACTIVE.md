# Handoff — B13 (2/2) webhook Stripe: spec+piano pronti, esecuzione da fare in nuova sessione (05/07/2026)

**B13 (1/2) è COMPLETO, mergiato su `main` e deployato** (commit `5250d56`, CI verde, Vercel confermato, `uachelab.com` risponde). Idempotenza `generateDdC()`/`generateBuono()` — vedi `memory/MEMORY.md` §0.

**B13 (2/2) — silent-fail webhook Stripe — spec e piano già scritti e approvati, esecuzione NON ancora iniziata.** Lavoro preparatorio fatto in worktree isolato `worktree-b13-webhook-stripe-silent-fail` (branch `worktree-worktree-b13-webhook-stripe-silent-fail`, path `.claude/worktrees/worktree-b13-webhook-stripe-silent-fail/`, non ancora mergiato — contiene solo 2 commit di documentazione, nessun codice ancora toccato): spec in `docs/superpowers/specs/2026-07-05-b13-webhook-stripe-silent-fail-design.md`, piano in `docs/superpowers/plans/2026-07-05-b13-webhook-stripe-silent-fail.md` (4 task: campo `retryable` su `transitionLabStato()`, throw in `findLabBySubscription()`, helper `assertTransitionOk()` sui 5 handler, verifica finale). **Verificato:** il vincolo UNIQUE su `stripe_subscription_id` ipotizzato mancante esiste già sul DB live — nessuna migration in questo piano.

**Prossima azione:** entrare nel worktree esistente (non ricrearlo) ed eseguire il piano con `superpowers:subagent-driven-development`, poi `superpowers:finishing-a-development-branch` per merge/push/deploy, seguendo lo stesso schema già usato per B13 (1/2).

Altri blocker aperti nel backlog (dopo B13): B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B11 (colore bandito su card lavoro), B12 (login WCAG), B14 (compenso_base ambiguo), B15 (Abbonamento contraddittorio), B16 (query ordini non supportata), B17 (fasi mai visibili in PDF). Dettaglio completo: `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`.

---

Backlog: 🔴 11/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅, B13 1/2 ✅ — 2/2 in corso, spec+piano pronti, B18 ✅, B19 ✅). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
