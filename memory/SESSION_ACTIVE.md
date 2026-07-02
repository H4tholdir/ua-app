# Sessione chiusa — 02/07/2026 (B2 → spec approvata, prossima sessione: piano)

**Versione in produzione:** V1.9.3 + fix B1 (commit `31cc47c`) · 169/169 test.

**Questa sessione — B2 indagato e riscoperto come feature ("Contabilità Clienti"):**
Causa reale (non "due fonti mai riconciliate"): `lavori_partitario` non ha mai avuto un writer (0 righe anche in produzione, verificato su DB live). Discussione con Francesco ha allargato lo scope: sotto-progetto 1 di 3 (Contabilità Clienti — Preventivo e Riepilogo multicanale restano fuori scope, item roadmap separati). Ledger pagamenti polimorfico (fattura o lavoro diretto), `lavori.decisione_fatturazione`, credito cliente con eccedenze/rimborsi, Scadenzario ampliato.

**Spec completa e APPROVATA** (validata anche da review indipendente, 3 gap corretti prima del piano):
`docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md` (commit `05f4f1b`)

**Decisione collegata (non ancora eseguita):** reset completo del DB live (`iagibumwjstnveqpjbwq`) — rimandato a subito-prima del go-live reale con Filippo, dopo il collaudo/UAT. Non fare ora. Dettaglio in `MEMORY.md` → "Azioni manuali urgenti".

**Prossima sessione — copiare e incollare:**
```
Inizia da BP-0. Poi leggi docs/superpowers/specs/2026-07-02-contabilita-clienti-design.md
(spec di B2/"Contabilità Clienti", approvata da Francesco il 02/07/2026).

Lo spec è già validato — nessuna domanda di brainstorming residua. Invoca direttamente
la skill superpowers:writing-plans per produrre il piano di implementazione TDD atomico
(stesso stile usato per B1: docs/superpowers/plans/2026-07-02-b1-tracciabilita-materiali.md).

Segui poi BP-2 (isolamento worktree, TDD, migration gate, verifica, review) fino al deploy.
B2 resta un blocker aperto finché questo sotto-progetto non è live — nessun fix parziale.
```

**Backlog (invariato da B1):** 🔴 Blocker 1/16 (B1 ✅, B2 in corso) · 🟠 Alto 0/18 · 🟡 Medio 0/30 · 🟢 Basso 2/4.
