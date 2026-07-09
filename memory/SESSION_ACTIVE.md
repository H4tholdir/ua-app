# Sessione attiva — 09/07/2026 (chiusura)

**DS v3 sotto-progetto 2 «Componenti core»: APPROVATO, MERGIATO E DEPLOYATO.** Merge `8d024c7` su `main`, push, deploy verificato live: `uachelab.com/ds-v3-catalogo` (pubblico) serve punto rosso, pill di carta, suoni reali. Suite post-merge `1129 passed | 4 skipped`. Worktree e branch rimossi.

**Fatti chiave:** 27 componenti §5 in `src/components/ds/` · catalogo 14 sezioni · spec evolute: §5.2 rev 2 (TastoPiu «punto rosso»), §5.15 rev 2 (PillVoce «pill di carta», legge: MAI scale sul contenuto nei pressed), §9.1 (campioni reali, sorgenti `scripts/sounds-src/`) · decisioni in `docs/design/decisions/2026-07-09-*`.

**PROSSIMO: sotto-progetto 3 «Il cuore»** (spec §14.3): Home tre pile, wizard nuovo lavoro (morph dal punto rosso §8.3.2), scheda lavoro, flusso Consegna con coreografia firma UÀ. Workflow: brainstorm → piano → worktree → subagent-driven. **Carry-over obbligatori** (dettaglio in MEMORY.md §0, voce SP2): `varV3('card')` mai `'sfc'` · `suoniAttivi()` solo post-mount · `minWidth: min-content` colonne testo+pill · dizionario +pattern "tab" · §9.1 estendere riga tap · audio: gap RMS fatta/errore ~16dB.
