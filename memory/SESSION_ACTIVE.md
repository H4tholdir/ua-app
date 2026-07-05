# Handoff — B17 pianificato, pronto per esecuzione in nuova sessione (05/07/2026)

**B17 (Scheda di Fabbricazione, tracciabilità fasi di lavorazione) — piano pronto, nessun codice ancora toccato.** Ricerca approfondita (deep-research, 108 agent, fonti primarie EUR-Lex/MDCG/Gazzetta Ufficiale) ha corretto un errore di attribuzione normativa nel backlog originale: l'Allegato XIII MDR non richiede testualmente "tracciabilità fasi con nome operatore e firme" — è QMS/Fascicolo Tecnico (Art. 10(9) MDR), non un obbligo di legge testuale. Spec: `docs/superpowers/specs/2026-07-05-b17-scheda-fabbricazione-design.md`. Piano: `docs/superpowers/plans/2026-07-05-b17-scheda-fabbricazione.md` (6 task: estensione tipo `LavoroFase.tecnico`, template PDF, generatore live on-demand, route API, link download, verifica finale + memoria). Nessuna migration, nessun cambio API contract.

**Worktree già creato e pronto:** `.claude/worktrees/b17-scheda-fabbricazione` (branch `worktree-b17-scheda-fabbricazione`, commit `bbb2ce0` — solo il piano, nessun codice). Baseline test verificato nel worktree: `504 passed | 4 skipped`.

**Prossima azione:** entrare nel worktree esistente (non ricrearlo) ed eseguire il piano con `superpowers:executing-plans` (sessione parallela/dedicata, esplicitamente richiesta da Francesco invece di subagent-driven-development nella stessa sessione), poi `superpowers:finishing-a-development-branch` per merge/push/deploy, seguendo lo stesso schema usato per B13 e il bundle B12+B15+B11. QA browser post-merge consigliata (vedi nota finale del piano).

**Anche aperto in questa sessione, non toccato:** B20 (PSUR/PMS Report non differenziato per classe di rischio, scoperto durante la ricerca propedeutica a B17) — backlog item indipendente, da pianificare a parte.

**Altri blocker aperti nel backlog** (dopo B17): B5 (download DdC/Buono dal portale impossibile), B6 (SW offline), B14 (compenso_base ambiguo — richiede decisione di Filippo), B16 (query ordini non supportata), B20 (vedi sopra).

---

Backlog: 🔴 14/18 Blocker risolti (B1 ✅, B2-B4 ✅, B7-B10 ✅ [B8 4/5], B11-B12 ✅, B13 ✅, B15 ✅, B18 ✅, B19 ✅). B17: piano pronto, esecuzione da fare. B20: nuovo, non pianificato. 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
