# SESSION ACTIVE — 12/07/2026 (sera, handoff per sessione pulita)

**Stato:** **ONDATA 1 (Home+pile) COMPLETATA, MERGIATA, DEPLOYATA E VERIFICATA IN PRODUZIONE** (`bb0c084..7e53f67` su `main`, CI+CD verdi, smoke prod ok; suite 1373 pass | 4 skipped; zero migration). Review finale «Ready to merge: YES» dopo 2 fix wave. Francesco ha verificato di persona anche `/admin/labs/[id]/live` (anteprima Home v3 read-only corretta — banner "Solo lettura", 4 pile, StrisciaStato). **Zero check aperti residui dall'Ondata 1.** Worktree rimosso; ledger in `.superpowers/sdd/progress-ondata-1-home-pile.md`.

**Decisioni Francesco (decision record `docs/design/decisions/2026-07-12-gate-ondata-1.md`):** P1-P9 + ADR B6 (searchParams) ratificati · perimetro tecnico fail-closed · avatar ritirato dalle route migrate (destinazione finale §O1i) · emoji Vuoti ratificate · merge autorizzato.

**Backlog aperto (non bloccante, BACKLOG-TECNICO):**
- **§O1** (a-i): debito test, convenzione «oggi», a11y, line-height sistemico, flake test, segnale tecnico-senza-anagrafica, profilo v3/«Esci» §7.16 PRIMA che /impostazioni migri.
- **§O2**: redesign pannello `/admin` — sessione dedicata, DOPO la sequenza «Il cuore» (fuori perimetro DS v3).
- **§O3**: Francesco ha fatto un giro nella PWA e ha visto diversi problemi. **Decisione esplicita (12/07): DEFERITO** — non richiedere la lista nelle sessioni intermedie, molti problemi vivono su superfici v2.3 che le Ondate 2-4b riscrivono comunque. La raccolta avviene al passo già previsto dalla sequenza (spec §12): dopo Ondata 4b → collaudo Francesco → residui → audit multi-agente completo.

**PRIMO PASSO nuova sessione:** BP-0 (leggi MEMORY.md + questo file), poi direttamente:

**PROSSIMO: Ondata 2 — Wizard nuovo lavoro** (mockup `wizard.html` approvato, 3 tocchi; ChipScelta §5.31 e ProgressDots §5.32 già in legge v3.1). `superpowers:brainstorming`/`writing-plans` sui mockup approvati.
