# Handoff esecuzione — Ondata DS v3 «Fondamenta residue + 4b Consegna»

**Data:** 16 luglio 2026 · **Stato:** design+spec+piano approvati da Francesco, pronti all'esecuzione
**Baseline:** `main` a `e26e641` (3 commit docs: spec `98dc114`, piano `ce16326`, BP-1 `e26e641`) · Suite **1954 pass | 19 skipped**

## Cosa eseguire

Il piano: `docs/superpowers/plans/2026-07-16-ds-v3-fondamenta-residue-4b-consegna.md` — **17 task TDD** in ordine:
- **Fase F (Task 1-7):** TastoWhatsApp §5.29 + token verdi · RigaBloccante §5.30 · FotoStrip §5.33 (estrazione) · MenuVoce §5.34 (estrazione) · NavDesk → `components/ds/` (D-4: tasto locale INVARIATO) · check-ds esteso ai CSS globali · catalogo +5 sezioni
- **Fase C (Task 8-15):** helper `materiali-carenti.ts` · GET `precheck-consegna` · DialogConferma variante additiva · CardUAHaFatto voce non-fatta · **FlussoConsegna + FrameConsegnato** · entry point scheda (+`?consegna=1`) · entry point pile/anteprima/HomeDesktop · morte pagina `/consegna` e moduli orfani
- **Task 16:** documentale (emendamenti §5.35/§9, decision record, ANALISI/17, BACKLOG) · **Task 17:** FASE 7

## Come

1. **Worktree:** `.claude/worktrees/fondamenta-4b-consegna` (via `superpowers:using-git-worktrees`), base `main`.
2. **Processo:** `superpowers:subagent-driven-development` — un subagent per task, review spec+qualità per task, review finale whole-branch.
3. **Vincoli assoluti:** zero migration · POST consegna / `orchestraConsegna` / RPC annullo INTATTI · componenti solo in `components/ds/` · token/motion solo da `v3/*` · baseline test mai sotto 1954 (al netto dei 2 file di test rimossi coi moduli morti).
4. I task contengono codice completo ma con ⚠️ punti di adattamento (contratti reali di `Caricamento`, `LinkQuieto`, `Sheet`, `CheckTondo`, `SegnaleStriscia`): il subagent LEGGE il componente reale prima di adattare — mai inventare props.

## Dopo il piano (fuori dai task)

- **FASE 8:** review finale whole-branch.
- **FASE 9 QA browser:** lab E2E `00000000-…-0001` (MAI lab Filippo). Scenari minimi: consegna in 2 tocchi da scheda 390 / pila aperta / split 768 / HomeDesktop 1280 · ramo rosso (bloccante reale, tap → ponte → ritorno → nuovo precheck) · warning nel dialog · annullo entro 10 min dal frame (DdC annullata, lavoro torna) · deep-link vecchio `/lavori/[id]/consegna` → redirect + auto-apertura · cleanup a baseline.
- **FASE 9b gate L2:** checklist `docs/design/audit-ui-ux/CHECKLIST-DS-V3-UI-UX.md` su scheda+pile+flusso · 390/768/1280 × light/dark · screenshot in `docs/design/screenshots/2026-07-16-consegna-v3/`.
- **Merge:** 🛑 gate esplicito di Francesco. Poi push → CI → smoke uachelab.com → FASE 11 BP-1.

## Contesto decisionale (per non ri-litigare)

Decisioni D-1…D-6 ratificate il 16/07 — dettagli in spec §1 e nel decision record (Task 16). In particolare: **D-1** la DdC resta numerata a t=0 (parere normativo: Art. 52(8); la nota 09/07 è superata — NON reintrodurre la numerazione al commit); **D-3** nessun gate di ruolo sulla consegna (status quo documentato — NON aggiungerlo); il 422 `errore_pdf` si tratta con copy generica + Riprova (MAI match sulla stringa del messaggio).

## Prompt di avvio suggerito per la sessione nuova

> Esegui il piano `docs/superpowers/plans/2026-07-16-ds-v3-fondamenta-residue-4b-consegna.md` via superpowers:subagent-driven-development nel worktree `.claude/worktrees/fondamenta-4b-consegna`. Handoff: `docs/roadmap/2026-07-16-fondamenta-4b-execution-handoff.md`.
