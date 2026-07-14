# SESSION ACTIVE — 14/07/2026 — N4 FONTE DI VERITÀ PREZZO: MERGIATA E DEPLOYATA

**Stato:** N4 **mergiata su `main` (`b025d61`, --no-ff) e deployata in produzione**. Push `2190c56..b025d61`; CI verde; CD Vercel success (deploy 2m22s + health ✓); smoke uachelab.com → 307 `/login` → 200. FASE 7 verde (`tsc` 0, `vitest` 1670 pass | 4 skipped, `next build` OK). Riconciliazione read-only: 0 divergenti su 286 lavori (rollout a freddo). Badge FASE 9b Variante B (approvata da Francesco).

**Fatto:** helper unico `prezzoEffettivoLavoro` (`src/lib/domain/prezzo-lavoro.ts`) + `divergenzaPrezzo`; refactor di tutti i lettori (generate-xml, contabilità queries, registra-pagamento, portale/scadenzario/pronti-da-fatturare); rimosso prefiltro `.gt('prezzo_unitario',0)` (bug completezza, 3 siti); guard PATCH 422 (carve-out azzeramento); assertion Natura N4 in `generaFatturaPA`; badge divergenza `LavoriInAttesaSection`; token `--c-amber-ink`. Eseguito via subagent-driven-development (10 task TDD + review per-task + review finale whole-branch Opus).

**Follow-up NON N4** (BACKLOG-TECNICO §N): N6 bollo nel dovuto, N7 gate `stato_sdi==='draft'` mancante su `api/fatture/[id]/xml`, N8 CSS invalido `urgencyPillBg`/Border.

**PROSSIMO (scelta Francesco):** prossima superficie/ondata DS v3, o uno dei follow-up N6/N7/N8. Worktree `worktree-n4-prezzo` rimuovibile (`git worktree remove`).
