# Sessione attiva — 09/07/2026 notte (chiusura — binario unico ratificato, emendamenti E1-E7)

**Binario unico backlog+DS v3 ADOTTATO** (2 advisor + ratifica Francesco). Emendamenti E1-E7 incisi nella spec sp.3 §2.1. B6/B16 confermati chiusi via git (riga roadmap era stale). Residui reali: B22 + §N1-N3 (BACKLOG-TECNICO).

**SEQUENZA UFFICIALE (spec §12):**
1. **P1 — B22 migration repair** (PRIMO: la 4a porterà migration nuove; done = `migration list` pulito)
2. **P2 — Pre-check chirurgico** consegna/annullo/SDI + data layer (mezza giornata)
3. **Ondata 4a-server** — B1/B2/B3+C4, outbox+cron (E3), `STATI_CONSEGNABILI` (E4), worktree dedicato, review rafforzata
4. **Ondata 0 mockup** (piano già pronto, 8 task, gate = ok Francesco per schermata) → 1 Home+pile (`derivaUrgenza`) → 2 Wizard → 3 Scheda → 4b UI Consegna
5. Collaudo Filippo → residui → **AUDIT multi-agente completo** → sp.4.

**Operating model (E6, SEMPRE):** un solo writer di codice per repo · ROADMAP/MEMORY scrivibili solo dalla sessione primaria · reconcile-before-write contro `git log` · interruzioni S1/S2/S3 · WIP 1 ondata + 1 interstiziale · DoD include riconciliazione documentale · registro ADR-lite.
