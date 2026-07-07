# Handoff — CRUD `cicli_produzione` completato, in attesa di merge (06/07/2026)

**CRUD completo per `cicli_produzione`** (create/modifica/soft-delete) implementato su worktree `worktree-cicli-produzione-crud` (branch omonimo), **non ancora mergiato su `main`**. Chiude il follow-up B5 ("nessun modo di creare un ciclo via UI/API").

**Fix:** migration live (indice UNIQUE parziale `(laboratorio_id, codice) WHERE deleted_at IS NULL`, `created_by`), nuove route `POST`/`PATCH`/`DELETE /api/cicli[/id]` (DELETE blocca se referenziato da un lavoro, nulla `listino.ciclo_id` altrimenti), `CicloNuovoSheet.tsx`, `CicloDeleteButton.tsx`, header actions in `CicloFasiEditor.tsx`.

**Review finale (Opus):** 2 Important corretti — validazione PATCH allineata a POST (nome/codice non vuoti); payload PATCH ora costruito come delta (non tutti i campi) per non rompere modifica su valori storici fuori lista canonica.

**Verifica:** 626/626 test, tsc/build puliti. QA browser: creazione/modifica/eliminazione verificate end-to-end (mai lab Filippo). Non verificato: blocco 409 su DELETE referenziato (solo test automatici), tablet 768px.

**Decisione in sospeso:** merge su `main` o apertura PR — da decidere con Francesco.

Piano: `docs/superpowers/plans/2026-07-06-cicli-produzione-crud.md`. Spec: `docs/superpowers/specs/2026-07-06-cicli-produzione-crud-design.md`. Dettaglio completo: `memory/MEMORY.md` §0.
