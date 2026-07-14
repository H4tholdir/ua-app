# SESSION ACTIVE — 14/07/2026 — N4 FONTE DI VERITÀ PREZZO: IMPLEMENTATA, GATE MERGE

**Stato:** N4 implementata su branch `worktree-n4-prezzo` (12 commit `9dac640..38c1a5e`). FASE 7 verde: `tsc --noEmit` pulito, `vitest run` 1670 pass | 4 skipped, `next build` pulita. Riconciliazione read-only pre-deploy: 0 lavori divergenti su 286. Badge divergenza FASE 9b Variante B applicata (mockup + decisione salvati). **NON ancora mergiato su `main`** — in attesa del gate esplicito di Francesco.

**Fatto:** helper unico `prezzoEffettivoLavoro` (`src/lib/domain/prezzo-lavoro.ts`), refactor di tutti i lettori, rimosso prefiltro `.gt('prezzo_unitario',0)` (bug completezza), guard PATCH 422 su `prezzo_unitario`+righe attive, assertion Natura N4 in `generaFatturaPA`, badge divergenza `LavoriInAttesaSection`, token `--c-amber-ink`.

**Follow-up NON parte di N4** (BACKLOG-TECNICO §N): N6 bollo nel dovuto, N7 gate `stato_sdi` mancante su `xml/route.ts`, N8 CSS invalido `urgencyPillBg`/Border.

**PROSSIMO:** gate di merge Francesco → push → CI/CD → smoke uachelab.com.
