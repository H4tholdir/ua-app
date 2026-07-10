# Sessione attiva — Portale Dentista v2 (post-audit)
**10/07:** 4a interrotta al Task 8 → nuova spec `2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` **rev.2** (finding audit 3 advisor recepiti) mergiata su `main` `d46ca32` insieme a: 6 file migration 4a (già applicate al DB, drift chiuso), costanti Task 1, mini-fix route annullo 5→10 min. Suite 1133 pass. Cron outbox rimossi; Vault mai creato.
**In attesa:** review di Francesco della spec rev.2 → poi piano **Ondata 0** (pulizia outbox + DROP pg_net + rimozione emissione inline orchestrate.ts + lavoro_id nel batch + fix B1/annullo-DdC/lettori) via `superpowers:writing-plans` → SDD.
**Ledger:** worktree `ondata-4a-server`, `.superpowers/sdd/progress.md`.
