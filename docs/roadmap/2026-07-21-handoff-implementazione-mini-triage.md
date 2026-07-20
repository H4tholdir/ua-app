# Handoff — Implementazione mini-triage (ondata A) + spec Parete
**Data:** 20/07/2026 (notte) · **Da eseguire in sessione NUOVA a contesto pulito** (prassi consolidata)
**Autorizzazione:** Francesco ha ratificato TUTTE le decisioni di design (4 giri) e dato ok all'implementazione. Fonte di verità: `docs/design/decisions/2026-07-20-mini-triage-e-parete.md` (leggerla PRIMA di tutto).

## Contesto (30 secondi)
Sessione 20/07 sera-notte: mini-triage design COMPLETO (mockup approvati, advisor passati, zero React scritto). Nata e specificata la feature «Parete delle Cassette». Calendario ondate v3 ratificato (in ROADMAP). MEMORY voci (17)-(21) · mockup `docs/design/mockups/2026-07-20-*` · screenshot ok.

## Punto 1 — Implementazione ondata A mini-triage (percorso Media §0C, DALLA FASE 3)
Il design è chiuso: si parte da FASE 3 (validazione arch) → piano → worktree → TDD → review → QA → GATE ESTETICO L2 → deploy. Perimetro (dettagli nel decisions doc):
1. **A13**: sub-valore denti in CardInfo (fetch già completo, `select('*')`) + tap → `modifica?tab=clinica`.
2. **A14**: targa cassetta in CardLavoro + catena `pile-home.ts` select → `RawLavoroPila`/`LavoroPila` → `mapPileHome` → props (attenti a: PilaAperta, PilaSplit, HomeDesktop, SchedaAnteprima, catalogo, fixture test).
3. **Conferma-cassetta**: sheet «In che cassetta lo metti?» (chips recenti/libere + campo + fuga) sul Conferma pila blu.
4. **Ricerca per-pila**: RigaCerca matcha `numero_cassetta`.
5. **«Le pile» via**: redirect + delete + ripuntamenti (vedi decisions; NON toccare `route-migrate-v3.ts:24`). O1h chiuso (nessun lavoro).
6. **O1i ×3**: Esci in Tutto il resto (LinkQuieto + firma + DialogConferma) · identità+Esci footer NavDesk (props via HomeDesktop; aggiornare anche `ds-v3-catalogo`) · segnale trial in striscia (campo opzionale stile O1f in `IngressiStriscia`, posizione sotto s1-s7 sopra s8/s9; dati da `context.lab` già nel layout).
7. **«Persone» v3**: migrazione intera `/tecnici` (chrome v3 di pagina-lista NASCE QUI — nominarlo, promozione a ds in ondata B) + card cedolini + sheet persona + UI invito (API invito INTOCCABILE — dominio critico se toccata).
8. **Emendamenti spec v3** in blocco (lista in decisions doc §finale) + BP-1.

Guard N13 su route nuove · mock context con `lab` · lab E2E `00000000-…-0001` · FASE 7 completa (tsc+vitest+build output reali) · GATE L2 su Persone/striscia/NavDesk/card.

## Punto 2 — Spec «Parete delle Cassette» (percorso Grande: nuova tabella+storico = migration)
Brainstorm FATTO (4 giri, tutto in decisions doc). Prossimo passo: **spec formale** (superpowers:writing-plans preceduta da spec di design con panel advisor — solution-architect + ux-designer + backend-api per lo schema). Punti chiave da spec:
- Tabella `cassette` (lab_id, nome, colore hex, posizione griglia, stato) + storico `cassette_lavori` (o colonna+audit) — RLS `public.current_lab_id()`, migration = FASE 6b + ledger.
- Home a due stanze (swipe/pager, peek, dots) + preferenza UTENTE «La tua home» (3 modi) + fedeltà visiva TOTALE a `parete-cassette-v2.html`.
- Accesso globale: route `/cassette` + shortcut PWA manifest + voce Tutto il resto + NavDesk/rail + ☰ nel chrome pagine-lista.
- Miniature: famiglia 6 approvata, estendere a catalogo tipi (mappa tipo_dispositivo→miniatura, fallback generico).
- Integrazione: conferma-cassetta (chips diventano «dal parco»), liberazione L5 alla consegna, «Cerca» globale.

## Punto 3 — Sessione design «Cerca» globale (dopo Punto 1)
Concept ratificato in `2026-07-20-mini-triage-ricerca-cassetta.html`. Serve: design fine + API archivio (consegnati) + dipendenza storico cassette (Punto 2).

## Coda invariata
A8 email Resend (percorso Media) · sessione DB (A20 + O4b + RPC `outbox_prepara_draft` orfana) · ricalibrazione perf-budget ~27/07-03/08 · backlog minori (handoff 20/07 sera).

## Regole di ingaggio (invariate)
CLAUDE.md §0C 12 fasi + Regola Advisor · 0B già soddisfatto per il mini-triage (mockup approvati) · 3 viewport × 2 temi · MAI committare/pushare senza richiesta esplicita — **l'implementazione del mini-triage è GIÀ autorizzata da Francesco (20/07, quarto giro: «ok»); per merge/deploy chiedere conferma a fine lavoro** · BP-0/BP-1 obbligatori.
