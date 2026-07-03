# Handoff sessione — B8 (2/5) chiuso, prossima sessione: 3/5 rischi → 4/5 rete/nuova → 5/5 rete/[id] (03/07/2026)

**B8 (2/5) — /listino/nuovo completato, mergiato e deployato in questa sessione.** Nessun worktree residuo — tutto pulito su `main` (commit `2251b60`, pushato su `origin/main`). Dettaglio completo: `memory/MEMORY.md` §0 (voce "✅ B8 (2/5) RISOLTO").

**Nessuna azione di follow-up obbligatoria** prima di procedere. Backlog non bloccante aperto (facoltativo, vedi MEMORY.md): nessun test per `ruolo` null/undefined su `POST /api/listino`, duplicazione intenzionale `inputStyle`/`labelStyle` tra `ListinoNuovoSheet`/`ListinoEditSheet` (decisione presa, non un problema), label "Prezzi" senza `htmlFor`.

---

## Prossima sessione — B8 rimanente (3/5 route), stesso ordine deciso con Francesco

Ogni route richiede il ciclo completo brainstorming → spec → piano → implementazione (worktree dedicato + subagent-driven-development), come fatto per 1/5 e 2/5.

```
3/5 — /qualita/rischi/[id] — "Modifica →". Tabella rischi_tipo_dispositivo esiste a DB (non in ANALISI/23), POST upsert esiste, manca GET singolo + UI editor.
4/5 — /rete/nuova — "Crea rete". POST /api/rete esiste già e funziona (auto-aggiunge il lab creatore come admin).
5/5 — /rete/[id] — "Gestisci rete →". Mancano 4 API (GET singola rete+membri, POST aggiungi membro, DELETE membro, PATCH nome) oltre alla UI. Il più corposo dei 5.
```

Dettaglio completo di cosa esiste/manca per ciascuna (API, colonne DB, pattern UI candidato) raccolto nella sessione B8 (1/5) — vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` sezione B8 aggiornata, o richiedere all'agente Explore un nuovo giro se il contesto si è perso.

---

## Stato backlog complessivo
🔴 Blocker: 3.4/16 risolti (B1 ✅, B2 ✅, B7 ✅, B8 2/5 ✅) — B8 (3/5 rimanenti), B9 e altri 11 ancora aperti (vedi `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md`).
🟠 Alto: 1/18 (A4 ✅).
🟡 Medio: 0/30.
🟢 Basso: 2/4.

**Nota:** `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` è uno snapshot di audit congelato — non più la fonte di verità corrente per lo stato (quello è `memory/MEMORY.md` §0), ma resta valido per la lista di problemi/causa/fix non ancora risolti.
