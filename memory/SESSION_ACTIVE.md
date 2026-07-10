# SESSION ACTIVE — 10/07/2026 (notte)

**Follow-up Ondata 0 CHIUSO e deployato** (`d4a4b0d`+`58d6841` su `main`, CI+CD verdi): rollback claim su draft-insert fallito nel batch (23505 su `fatture_lavoro_attiva_unique` = fattura attiva reale → claim NON rollbackato; ogni altro errore → rollback + messaggio senza leak); cleanup del draft orfano guardato su `stato_sdi='draft'` quando `generaFatturaPA` fallisce (senza: lavoro bloccato per sempre al retry); `lavoro_id` nel ramo INSERT di `generaFatturaPA` (xml route multi-lavoro non crea più fatture invisibili al gate annullo). 5 test TDD nuovi, suite 1166 pass, review doppio giro «Ready to merge». Chip `task_8a81c842` chiusa.

**PROSSIMA SESSIONE:** piano **Ondata 1** (lista «Da fatturare» dietro PIN + proposta dentista + conferma lab) via `superpowers:writing-plans` dalla spec `2026-07-10-portale-dentista-v2-fatturazione-concordata-design.md`. Prerequisito I-2: PATCH clienti → allowlist PRIMA delle colonne portale. Gate mockup obbligatorio.

Residui non bloccanti nel MEMORY (leak err.message in xml route; endpoint DELETE draft mancante).
