# SESSION ACTIVE — 14/07/2026 — QUICK-WIN FISCALI N6+N7 CHIUSI E DEPLOYATI

**Stato:** `main` = `2dfbfd7`, in sync con origin. **V1.9.3+ in produzione** (uachelab.com 307→/login → 200). CI verde + CD Vercel success + health ✓. **Nessun Blocker aperto.**

**Fatto in questa sessione (blocco A del handoff, mergiato + deployato):**
- **N7** (`196c8ec`): gate `stato_sdi` su `POST /api/fatture/[id]/xml` → **409** se non `draft`, PRIMA del loop `generaFatturaPA` (no ri-derivazione imponibile dal lavoro vivo, no consumo progressivo SDI). Test `fatture-xml-gate-stato-sdi.test.ts`.
- **N6** (`0dd05fc`): invariante «bollo €2 fuori dal dovuto pre-fattura» documentato (decisione C, zero logica) — commento `queries.ts` + test-decisione `contabilita-bollo-n6.test.ts`.
- Eseguito via `subagent-driven-development` (2 task TDD, review pulite, review finale opus READY TO MERGE). FASE 7: tsc 0, vitest 1676 pass, build verde.
- Nuovo item backlog **N9** (endpoint PEC-resend dedicato, scoperto in review N7).

**PROSSIMO (dal handoff, menu Francesco):** B (N5 note credito TD04) · C (DS v3 sp.3 «Il cuore») · D (Ondata 4a-server). Housekeeping branch pre-esistenti ancora possibile.
