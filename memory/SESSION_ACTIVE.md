# SESSION ACTIVE — 10/07/2026 (sera)

**Ondata 0 «pulizia» (Portale Dentista v2) CHIUSA: mergiata e deployata** (`6628ace..c8cac17` su `main`, CI+CD verdi, uachelab.com ok). Migration pulizia `20260710150000` applicata al DB live con conferma Francesco e verificata; QA lab E2E completa con cleanup a baseline; review finale Opus «Ready to merge» 0 Critical/Important. Bugfix extra in QA: batch fatture non generava MAI fatture (claim/load in contraddizione) — fixato (`c8cac17`).

**PROSSIMA SESSIONE:** piano **Ondata 1** (lista «Da fatturare» dietro PIN + proposta dentista + conferma lab nello scadenzario) via `superpowers:writing-plans` dalla spec `2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md` §4-§8. Prerequisito I-2: PATCH clienti → allowlist PRIMA delle colonne portale. Gate mockup obbligatorio (CLAUDE.md §0B). Follow-up aperti: chip `task_8a81c842` (rollback claim su draft-insert fallito); xml route multi-lavoro senza lavoro_id.

Ledger Ondata 0: `.superpowers/sdd/progress-ondata-0-pulizia.md`.
