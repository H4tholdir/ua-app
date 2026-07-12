# SESSION ACTIVE — 12/07/2026 (notte, handoff per sessione pulita)

**Stato:** **ONDATA 2 (Wizard) — DESIGN + PIANO APPROVATI E PUSHATI su `main`** (`cfc15eb`+`b824f06` spec/gate, `787a264` piano). Spec: `docs/superpowers/specs/2026-07-12-ds-v3-il-cuore-ondata-2-wizard-design.md` (§2.1 = verbale gate «va tutto bene»). Piano: `docs/superpowers/plans/2026-07-12-ds-v3-il-cuore-ondata-2-wizard.md` (14 task + QA 13 punti + W1-W9).

**PRIMO PASSO nuova sessione:** BP-0 (MEMORY.md + questo file), poi direttamente:

**ESEGUIRE il piano Ondata 2 via `superpowers:subagent-driven-development`** in worktree `ondata-2-wizard` (branch dedicata, copiare `.env.local`). Baseline suite **1373 pass | 4 skipped**. Ordine task vincolante (W1): legge → tassonomia → **Task 3 migration `bite_splint` = GATE Francesco (`npx supabase db push`, MAI MCP apply)** → B2+B4 → componenti → wizard. Prima di ogni commit subagent: `git rev-parse --show-toplevel`. QA su lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo; dev server `PORT=3013` NEL worktree. Attenzioni di piano: verificare `data_consegna_prevista` in PATCHABLE_FIELDS (Task 12); deviazione tile una-riga da annotare in review (Task 10).
