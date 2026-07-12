# Decisioni di Francesco — gate Ondata 1 «Home + pile» (12/07/2026)

Registrate dalla sessione primaria durante l'esecuzione SDD dell'Ondata 1 (piano `docs/superpowers/plans/2026-07-12-ds-v3-il-cuore-ondata-1-home-pile.md`).

1. **P1-P9 ratificate in blocco** (mattina, prima del Task 1), senza modifiche.
2. **ADR B6 ratificato: Candidato A — `searchParams` server-driven** (conferma P2). ADR: `2026-07-12-spike-route-pannelli.md`.
3. **Perimetro tecnico FAIL-CLOSED** — emendamento al piano (che era fail-open per trascrizione fedele): un tecnico senza riga in `tecnici` vede pile vuote, non tutto il lab. Motivazione: prassi fail-closed del progetto; il caso era stato osservato dal vivo in QA.
4. **Avatar profilo ritirato dalle route migrate v3** (`/dashboard`, `/lavori` esatto, `/tutto-il-resto`) col predicato condiviso `isV3MigratedRoute` — fix minimo raccomandato da 2 advisor (UX + DS) convergenti. Destinazione finale a roadmap (§O1i BACKLOG-TECNICO): «Esci» in §7.16, riga-identità NavDesk, trial→StrisciaStato. Il mockup ratificato non prevede avatar sulla home; l'header v3 resta «back a sinistra, menu a destra, nient'altro» (§5.6).
5. **Emoji negli stati vuoti delle pile RATIFICATE** (☕📦🔄📥) — deviazione dal line-SVG del mockup accettata, coerente col contratto del componente `Vuoto` a catalogo.
6. **RigaAgenda/GiornoAgenda dark-safe** — fix richiesto esplicitamente da Francesco (chip): ring «OGGI» perso in dark per `none` in lista box-shadow; pattern TastoPrimario/LePile.
7. **Merge autorizzato esplicitamente** dopo review finale «Ready to merge: YES» (2 fix wave: ring selezione visibile su CardLavoro; `'use client'` su AdminHomePreview per confine RSC).
