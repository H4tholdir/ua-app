# Sessione attiva — 09/07/2026 notte (P1/B22 chiuso)

**P1 — B22 migration repair: ✅ RISOLTO** (commit `ee52f09` su `main`, da pushare se non già fatto). 26 migration fondative registrate via `repair --status applied` una alla volta, contenuti verificati contro DB live (53 check). 13 file rinominati a versioni univoche (collisioni 20260517/18/20/21). Scoperto e sanato `realtime_replica_identity` mai applicato: `REPLICA IDENTITY FULL` ora attivo su `lavori`/`fatture` (gap reale per `useRealtimeNotifiche`). Done: `migration list` 50/50 pulito, `db push --dry-run` "up to date".

**SEQUENZA UFFICIALE (spec sp.3 §12) — prossimo step:**
1. ~~P1 — B22 migration repair~~ ✅ 09/07
2. **P2 — Pre-check chirurgico** consegna/annullo/SDI + data layer (mezza giornata) ← SI PARTE DA QUI
3. **Ondata 4a-server** — B1/B2/B3+C4, outbox+cron (E3), `STATI_CONSEGNABILI` (E4), worktree dedicato, review rafforzata
4. **Ondata 0 mockup** (piano pronto, 8 task, gate = ok Francesco per schermata) → 1 Home+pile → 2 Wizard → 3 Scheda → 4b UI Consegna
5. Collaudo Francesco → residui → AUDIT multi-agente completo → sp.4.

**Operating model (E6, SEMPRE):** un solo writer di codice per repo · ROADMAP/MEMORY scrivibili solo dalla sessione primaria · reconcile-before-write contro `git log` · interruzioni S1/S2/S3 · WIP 1 ondata + 1 interstiziale · DoD include riconciliazione documentale · registro ADR-lite.
