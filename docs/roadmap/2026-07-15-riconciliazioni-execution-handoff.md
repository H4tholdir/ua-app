# Handoff esecuzione — Riconciliazioni pendenti + ricevute PEC (R1) — 15/07/2026

> **Per la sessione di esecuzione (contesto pulito). BP-0: leggere `memory/MEMORY.md` + questo handoff.**
> Design/spec/piano già approvati da Francesco — NON ridiscutere le decisioni (D-1…D-7 in spec).

## Cosa eseguire
- **Piano:** `docs/superpowers/plans/2026-07-15-riconciliazioni-ricevute-pec.md` — 17 task TDD in 2 fasi (R1a Task 1-5 contabile · R1b Task 6-17 pipeline ricevute).
- **Spec (fonte di verità):** `docs/superpowers/specs/2026-07-15-riconciliazioni-ricevute-pec-design.md` (rev.2, panel 3× CONFERMATA CON RISERVE integrate).
- **Metodo:** `superpowers:subagent-driven-development` in worktree dedicato (es. `.claude/worktrees/riconciliazioni-r1`), copia `.env.local`. Baseline: **1795 pass | 19 skipped**.

## Gate espliciti di Francesco (🛑 non oltrepassare)
1. Apply migration al DB live: Task 2 (`fatture_sdi_eventi`), Task 3 (`annullo_storno` + trigger delta), Task 9 (colonne + RPC) — ognuno con FASE 6b (`gen types` + `tsc`).
2. Mockup §0B: Task 4 (alert saldo negativo) e Task 15 (pagina riconciliazioni) — multi-varianti light+dark, screenshot, attendere scelta.
3. Task 6 (spike XAdES): presentare l'esito (libreria o fallback quarantena-all) prima di proseguire.
4. Merge/push a fine ondata, dopo review whole-branch + gate estetico L2 (Task 17).

## Ordini vincolanti
- **Codice lettori PRIMA della migration `annullo_storno`** (Task 1 → Task 3; spec §3.5).
- Contratto N10 intoccabile: `send-pec.ts` mai throw dopo `sendMail` ok (`tests/unit/send-pec-invariante.test.ts` deve restare verde).
- QA: lab E2E `00000000-0000-0000-0000-000000000001`, MAI lab Filippo, MAI caselle PEC reali (fixture in `tests/fixtures/ricevute-sdi/`). Progressivi E2E consumati: 2026-0001..0006.
- Cleanup QA a baseline esatto (eventi, storage `ricevute-sdi/`, fatture E2E).

## Stato di partenza
- `main` locale con 3 commit docs-only non pushati: `234e503` (spec), `3bdad93` (spec rev.2), `97345c4` (piano) + BP-1. Decidere col primo gate se pushare i docs (CD Vercel inerte).
- Nessun Blocker aperto; nessuna migration pendente; albero pulito.
- Credenziali E2E: la password di `e2e-titolare@ua-test.local` è stata reimpostata durante QA N10 (valore noto a quella sessione, non committato) — se serve login browser, reimpostare via `auth.admin.updateUserById` e annotare nel report QA.
