# SESSION ACTIVE — 12/07/2026 (sera, handoff per sessione pulita)

**Stato:** **ONDATA 1 (Home+pile) COMPLETATA, MERGIATA, DEPLOYATA E VERIFICATA IN PRODUZIONE** (`bb0c084..7e53f67` su `main`, CI+CD verdi, smoke prod ok; suite 1373 pass | 4 skipped; zero migration). Review finale «Ready to merge: YES» dopo 2 fix wave. Francesco ha verificato di persona anche `/admin/labs/[id]/live` (anteprima Home v3 read-only corretta — banner "Solo lettura", 4 pile, StrisciaStato). **Zero check aperti residui dall'Ondata 1.** Worktree rimosso; ledger in `.superpowers/sdd/progress-ondata-1-home-pile.md`.

**Decisioni Francesco (decision record `docs/design/decisions/2026-07-12-gate-ondata-1.md`):** P1-P9 + ADR B6 (searchParams) ratificati · perimetro tecnico fail-closed · avatar ritirato dalle route migrate (destinazione finale §O1i) · emoji Vuoti ratificate · merge autorizzato.

**Backlog aperto (non bloccante, BACKLOG-TECNICO):**
- **§O1** (a-i): debito test, convenzione «oggi», a11y, line-height sistemico, flake test, segnale tecnico-senza-anagrafica, profilo v3/«Esci» §7.16 PRIMA che /impostazioni migri.
- **§O2**: redesign pannello `/admin` — sessione dedicata, DOPO la sequenza «Il cuore» (fuori perimetro DS v3).
- **§O3**: Francesco ha fatto un giro nella PWA e ha visto «un sacco di problemi» — **lista ancora da scaricare/raccogliere**, poi triage con la regola E6 (superficie in migrazione → ondata pertinente; bug bloccante → fix interstiziale; resto → backlog). Chiedere a Francesco se vuole passarla ora o procedere prima con l'Ondata 2.

**PRIMO PASSO nuova sessione:** BP-0 (leggi MEMORY.md + questo file), poi chiedi a Francesco se ha la lista §O3 pronta; se sì, triage prima di tutto. Altrimenti procedi diretto con:

**PROSSIMO: Ondata 2 — Wizard nuovo lavoro** (mockup `wizard.html` approvato, 3 tocchi; ChipScelta §5.31 e ProgressDots §5.32 già in legge v3.1). `superpowers:brainstorming`/`writing-plans` sui mockup approvati.
