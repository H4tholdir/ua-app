# Sessione attiva — 09/07/2026 (B14 chiuso fuori sequenza; handoff DS v3 sp.3 invariato)

**B14 (`tecnici.compenso_base` ambiguo) RISOLTO, MERGIATO E DEPLOYATO** su richiesta esplicita di Francesco, fuori sequenza rispetto alla roadmap DS v3 sotto-progetto 3 sotto. `tipo_compenso` esposto in UI, card Compenso condizionale a 3 stati. Dettaglio: `memory/MEMORY.md` §0.

**Handoff DS v3 sotto-progetto 3 «Il cuore» resta il prossimo passo ufficiale della roadmap** (invariato dalla sessione precedente): design completato, spec figlia + piano Ondata 0 mockup su `main` (`docs/superpowers/specs/2026-07-09-ds-v3-il-cuore-design.md`, `docs/superpowers/plans/2026-07-09-ds-v3-il-cuore-ondata-0-mockup.md`).

**PROSSIMA SESSIONE — partire da qui:**
1. Leggere spec figlia + piano Ondata 0.
2. Eseguire il piano (8 task) via `superpowers:subagent-driven-development` — docs-only, può stare su `main`.
3. Task 8 = GATE: screenshot a Francesco schermata per schermata, ok esplicito su OGNUNA.
4. Dopo l'ok: scrivere piano Ondata 1 (Home+pile). MAI piani React prima dei mockup approvati.

**Vincoli caldi:** principio-guida L1 inciso in testa alla spec (vincolo di review) · fix server autorizzati SOLO B1/B2/B3+C4 (spec §10) · «I conti»/«Il mio compenso» → sp.4 (spec §11) · prima dell'Ondata 4 verificare su DB reale la CHECK `dichiarazioni_conformita.stato` (anomalia B2).
