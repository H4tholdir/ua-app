# Handoff — B8 (4/5) verificato e chiuso, prossima: 5/5 rete/[id] (03/07/2026)

**B8 (4/5) — /rete/nuova** completato su worktree `worktree-b8-rete-nuova` (commit `5237c17`/`161abbf`/`3ede9a0`), non ancora mergiato su `main`. Bottom sheet `RetiNuovaSheet.tsx` sostituisce il link rotto `/rete/nuova`; guard server-side 409 aggiunto a `POST /api/rete` (1 rete per lab admin, decisione di prodotto confermata). 317/317 test, tsc/build puliti.

**⚠️ Bug reale trovato in QA, non risolto qui (fuori scope Task 4 = no-code):** a 390px/768px il bottone "Conferma creazione" dello sheet non è cliccabile via touch/click reale — la bottom-nav (`zIndex: 50`, sticky) intercetta i click sopra il bottone submit (`zIndex: 50` anch'esso, pareggio risolto a favore della nav per ordine DOM) quando la pagina è corta. **Stesso identico bug già presente in `ListinoNuovoSheet` (B8 2/5, già in produzione)** — mai rilevato prima perché mai testato con un click reale a quei viewport. Tastiera (Tab+Invio) funziona. Task di follow-up aperto: `task_e0837ea3`. Dettaglio: `memory/MEMORY.md` §0, report completo `.claude/worktrees/b8-rete-nuova/.superpowers/sdd/task-4-report.md`.

**Prossimo step:** merge di B8 (4/5) su `main` (dopo eventuale review finale whole-branch), poi iniziare **B8 (5/5) — `/rete/[id]`** — ultima route del backlog B8. Link "Gestisci rete →" in `/rete` porta ancora a 404. Servono anche 4 API mancanti (GET singola rete, POST/DELETE membro, PATCH nome) — tabelle `reti`/`reti_membri` già esistenti a DB.

Consigliato: prima di iniziare B8 (5/5), valutare se includere anche il fix del bug z-index trovato sopra (tocca sia `RetiNuovaSheet` sia `ListinoNuovoSheet`, entrambi fuori dallo scope stretto di 5/5 ma nello stesso "vicinato" di codice).

---

Backlog: 🔴 4/16 Blocker (B1 ✅, B2 ✅, B7 ✅, B8 4/5 ✅ — resta solo rete/[id]). 🟠 1/18 Alto (A4 ✅). 🟡 0/30. 🟢 2/4.
