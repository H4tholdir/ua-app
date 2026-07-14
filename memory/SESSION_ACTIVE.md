# SESSION ACTIVE — 15/07/2026 — N6+N7 DEPLOYATI · TD04 SPEC+PIANO PRONTI

**Stato:** `main` = `68f2161` (origin a `8267c23`; 4 commit docs TD04 su main **locale, non pushati**). V1.9.3+ in produzione. **Nessun Blocker aperto.**

**Fatto in questa sessione:**
- **N6+N7 (blocco A handoff): MERGIATI E DEPLOYATI** (`2dfbfd7`, CI+CD verdi, prod 200). N7 gate `stato_sdi` (409) su route XML; N6 invariante bollo documentato. BP-1 fatto (`8267c23`). Nuovo backlog N9 (PEC-resend).
- **N5 → riqualificato in feature GRANDE «Nota di Credito TD04»** (Francesco: opzione B). **Spec v2 + piano (8 task) PRONTI** (non pushati): `docs/superpowers/specs/2026-07-14-nota-credito-td04-design.md`, `docs/superpowers/plans/2026-07-14-nota-credito-td04.md`. Spec rivista da 3 advisor specializzati (fiscale/DB/contabilità): claim atomico, tipo movimento `storno`, gate pragmatico (da `smtp_inviata`), reset lavoro solo-fiscale (MDR), audit letture, DatiFattureCollegate.

**Decisioni TD04 prese:** trigger da `/fatture/[id]`, storno totale, lavoro ri-fatturabile, fatture pagate→credito. **Aperto:** bollo TD04 (flag commercialista).

**PROSSIMO:** eseguire il piano TD04 in sessione dedicata (T7 UI richiede mockup + approvazione visiva Francesco). Oppure altri blocchi handoff: C (DS v3 sp.3), D (Ondata 4a-server).
