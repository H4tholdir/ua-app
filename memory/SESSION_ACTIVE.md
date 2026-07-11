# SESSION ACTIVE — 11/07/2026 (pomeriggio)

**Stato:** **Ondata 2 (storico fatture + copia di cortesia PDF) COMPLETATA, mergiata e deployata** (`main 18c7c76`, CI/CD verdi, smoke prod ok). Suite 1274 pass | 4 skipped. Review finale Opus «Ready to merge YES». Ledger in `.superpowers/sdd/progress-ondata-2-storico-fatture.md`. Worktree rimosso.

**Prossimo task:** **Ondata 3 — situazione economica nel portale** (spec §3: saldo, fatture da pagare/pagate, pagamenti registrati — query `src/lib/contabilita/` lato dentista, dietro PIN). Ultima ondata Portale Dentista v2.

**Backlog caldo dal branch:** IMPORTANT — `generaFatturaPA` hardcoda TD01 in XML e PDF: da fixare PRIMA di emettere note di credito TD04; smoke test select pagina `/fatture/[id]` (2 fix QA senza rete anti-regressione).

**Gotcha:** env `PORTALE_PIN_PEPPER`/`PORTALE_SESSION_SECRET` NON sono in `.env.local` (solo Vercel) — per QA locale del portale aggiungerle temporaneamente; il link Supabase CLI non è nel worktree (copiare `supabase/.temp` dal checkout principale); verificare SEMPRE il branch dei commit riportati dai subagent (incidente Task 7: commit finito su main, recuperato con reset+cherry-pick).
