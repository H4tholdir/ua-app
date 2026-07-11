# SESSION ACTIVE — 11/07/2026 (pomeriggio, 2)

**Stato:** **Ondata 3 (situazione economica) COMPLETATA, mergiata e deployata** (`main 8629d9a`, CI/CD verdi, smoke prod ok, zero migration). **Portale Dentista v2 COMPLETO (ondate 0-3 chiuse).** Suite 1293 pass | 4 skipped. Review finale Opus «Ready to merge YES». Ledger in `.superpowers/sdd/progress-ondata-3-situazione-economica.md`. Worktree rimosso.

**Prossimo task:** sequenza **DS v3 «Il cuore»** — eseguire il piano mockup Ondata 0 (`docs/superpowers/plans/2026-07-09-ds-v3-il-cuore-ondata-0-mockup.md`, già pronto) → poi Home+pile → Wizard → Scheda → 4b UI Consegna. Salvo ripriorizzazione di Francesco.

**Backlog caldo:** TD01 hardcoded in `generaFatturaPA` (PRIMA delle note di credito TD04); `.error → throw` in `getContabilitaCliente`; indagine `prezzo_unitario` vs somma righe listino nel batch; a11y collassabili portale.

**Gotcha:** subagent implementer possono committare sul checkout sbagliato (2 incidenti: Ondata 2 T7, Ondata 3 T3) — imporre nel dispatch la verifica `git rev-parse --show-toplevel` + branch prima del commit; env portale non in `.env.local` (solo Vercel); screenshot del browser pane inaffidabili a 1280px (verificare via DOM).
