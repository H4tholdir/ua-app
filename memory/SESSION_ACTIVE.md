# Sessione attiva — 10/07/2026 (Ondata 4a-server: spec+piano pronti)

**P2 ✅** (report `docs/roadmap/P2-PRECHECK-CONSEGNA-SDI-2026-07-09.md`, commit `fcd3024`).
**Ondata 4a-server — DESIGN COMPLETO:** spec approvata da Francesco `docs/superpowers/specs/2026-07-09-ondata-4a-server-consegna-fiscale-design.md` (commit `11cb9b8`; 3 advisor: architect+appsec+sre, tutti i bloccanti integrati; decisioni D1 pg_cron+pg_net · D2 DdC annulla+rigenera · D3 emetti-salvo-rifiuto con claim incluso_in_fattura · D4 osservabilità completa+/admin). **Piano scritto:** `docs/superpowers/plans/2026-07-09-ondata-4a-server-consegna-fiscale.md` — 18 task: costanti → 6 migration (file) → **Task 8 GATE Francesco (apply DB live + Vault + env)** → gate B1 → RPC finalizza → DdC writer+10 lettori → route annullo → generaFatturaPA idempotente → endpoint cron → /admin Coda emissione → verifica finale.

**PROSSIMO PASSO:** esecuzione piano in worktree dedicato (scelta modalità: subagent-driven raccomandata). Ricordare: `.env.local` da copiare nel worktree; Task 8 richiede conferma esplicita di Francesco; QA finale su lab E2E, MAI lab Filippo.

**Dopo la 4a:** Ondata 0 mockup (piano già pronto) → 1 → 2 → 3 → 4b (sequenza sp.3 §12). Operating model E6 attivo.
