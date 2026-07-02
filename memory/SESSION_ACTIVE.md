# Sessione chiusa — 02/07/2026 (aggiornata dopo fix B1 — prossima sessione: B2)

**Versione in produzione:** V1.9.3 + fix B1 (commit `31cc47c`, pushato su main) · 169 test (era 157 + 12 nuovi da B1)

**Ultima sessione completata — B1 (Tracciabilità MDR materiali/lotti) risolto:**
Workflow completo: brainstorming → design doc (con correzione in-flight sulla biforcazione `traccia_lotto` e sull'ordine temporale write-vs-DdC, scoperta solo in fase di piano) → piano a 7 task atomici TDD → esecuzione subagent-driven (implementer + reviewer per ogni task, fix mirati sui rilievi Important) → revisione finale whole-branch → merge su main → push su origin (deploy Vercel automatico) → migration applicata al progetto Supabase live.

Dettaglio tecnico completo in `memory/MEMORY.md` §0 e nei documenti:
- `docs/superpowers/specs/2026-07-02-b1-tracciabilita-materiali-design.md`
- `docs/superpowers/plans/2026-07-02-b1-tracciabilita-materiali.md`

**Follow-up NON bloccanti aperti da B1 (non richiudere senza guardarli):**
1. Nessun test automatico end-to-end su `orchestraConsegna` che verifichi l'ordine "traccia materiali → poi DdC" a livello di intero orchestratore (solo la funzione `tracciaMaterialiLavoro` è testata in isolamento) — converge con B13 già in backlog, non è stato creato un item separato.
2. **Verifica manuale su un lavoro reale in produzione non ancora fatta** — la migration è live e il codice è deployato, ma nessuna consegna reale è stata ancora generata con questo fix per confermare visivamente che la DdC riporti davvero i materiali/lotti. Raccomandato: la prossima volta che Filippo (o un test controllato) consegna un lavoro con BOM+lotto configurati, controllare la DdC generata.

**Sessione precedente (re-audit 11 agenti) — invariata:**
- `docs/roadmap/BACKLOG-TECNICO-2026-07-02.md` — 68 item prioritizzati, tabella di stato avanzamento in cima al file
- `docs/roadmap/FEATURES-E-FLUSSI-2026-07-02.md` — inventario completo feature/flussi per ruolo
- `docs/audit-2026-07-02/` — gli 11 report persona completi + sintesi

**Prossima sessione — copiare e incollare:**
```
Inizia da BP-0: leggi memory/MEMORY.md e docs/roadmap/ROADMAP-UFFICIALE.md.
Poi apri docs/roadmap/BACKLOG-TECNICO-2026-07-02.md — sezione "0. STATO AVANZAMENTO" in cima al file.

B1 è stato risolto nella sessione precedente (vedi MEMORY.md §0 per dettaglio).
Lavoriamo sistematicamente sul resto del backlog, un item alla volta, in ordine di priorità
(Blocker prima di Alto prima di Medio). Per ogni item:
1. Leggi la scheda completa nel corpo del documento (causa, file:riga, fix consigliato)
2. Implementa il fix seguendo il workflow BP-2 del CLAUDE.md (brainstorming → piano →
   TDD → verifica → review) — scala il percorso (piccolo/medio/grande) in base alla
   complessità reale dell'item, non tutti richiedono le 12 fasi complete
3. Dopo verifica (tsc/vitest/build reali, non stime), aggiorna la riga corrispondente
   nella tabella "STATO AVANZAMENTO" da ⏳ a ✅ con data e commit
4. Fammi un breve riepilogo di cosa hai fatto prima di passare all'item successivo

Comincia da B2 (Dashboard/Scadenzario dati contrastanti sui crediti clienti) — è l'unico
blocker rimasto in cima alla lista di priorità del re-audit. Scheda completa a
docs/roadmap/BACKLOG-TECNICO-2026-07-02.md riga 112 ("### B2. Dashboard e Scadenzario
danno risposte opposte su chi deve pagare").

Causa nota (già individuata dal re-audit, verifica comunque il codice attuale prima
di fidarti ciecamente — a B1 sono emersi dettagli non visibili dalla sola lettura
dello schema): la Dashboard calcola i crediti da `lavori`+`lavori_partitario`
(supabase/migrations/008_dashboard_extended_kpi.sql:39-61), lo Scadenzario legge
solo `fatture` con `pagata=false AND stato_sdi != 'draft'`
(src/app/api/scadenzario/route.ts:36-46) — due fonti mai riconciliate.

Come per B1, il backlog segnala esplicitamente che serve una DECISIONE ARCHITETTURALE
su quale ledger diventa la fonte di verità per "quanto deve un cliente" — non è solo
un bug fix. Chiedimelo prima di implementare, con la stessa profondità di indagine
usata su B1 (leggi il codice reale dei due percorsi, non fermarti allo schema).
```

**Stato backlog (02/07/2026, aggiornato dopo B1):**
- 🔴 Blocker: 1/16 fatti (B1 ✅)
- 🟠 Alto: 0/18 fatti
- 🟡 Medio: 0/30 fatti
- 🟢 Basso: 2/4 fatti (solo correzioni documentali)

**Nota per la prossima sessione:** il re-audit ha operato con una sessione di produzione condivisa con processi E2E concorrenti, causando interferenze mitigate ma non azzerate (vedi `docs/audit-2026-07-02/SINTESI-ORCHESTRATORE.md` §0). Se possibile, isolare l'ambiente di test dalla prossima sessione di sviluppo per evitare lo stesso problema.
