# Ratifiche — La Parete delle Cassette (spec + D-10)
**Data:** 21 luglio 2026 · **Ratifica:** Francesco («ratifico i due punti»)
**Spec:** `docs/superpowers/specs/2026-07-21-parete-cassette-design.md` (rev.2)
**Piano:** `docs/superpowers/plans/2026-07-21-parete-cassette.md` (19 task TDD)
**Decisioni ratificate a monte:** `docs/design/decisions/2026-07-20-mini-triage-e-parete.md`

## Cosa è stato ratificato

1. **Spec di design rev.2** nella sua interezza — dopo panel advisor
   (solution-architect + ux-designer + backend-api: **3× CONFERMATA CON RISERVE**,
   tutte le riserve integrate nella rev.2).

2. **D-10 (nuova, proposta dal panel backend): al rifacimento la cassetta si
   TRASFERISCE al lavoro nuovo** invece di essere liberata — perché fisicamente il
   caso resta quasi sempre nella stessa cassetta. Un'assegnazione «liberata» al
   rifacimento racconterebbe il falso. Implementazione: RPC
   `cassetta_trasferisci_rifacimento` (chiude la riga viva del vecchio con
   `liberato_per='rifacimento'`, apre la riga viva sul nuovo, sincronizza
   `numero_cassetta` di entrambi), agganciata **app-side** nella route
   `rifacimento` dopo l'esito ok — la RPC fiscale `crea_rifacimento_atomico` (007)
   NON si tocca. Aggancio fail-soft (il rifacimento è già committato; la cassetta è
   contorno).

## Impatto sui documenti (già applicato)
- Spec header → «RATIFICATA»; §9.4 e §14 D-10 → «RATIFICATA 21/07».
- Piano: RPC `cassetta_trasferisci_rifacimento` accorpata nel **Task 1** (migration
  base, poiché l'apply non è ancora avvenuto); il **Task 9** diventa non-opzionale
  (solo aggancio app-side, path `src/app/api/lavori/[id]/rifacimento/route.ts`);
  il gate condizionale su D-10 è caduto.

## Riserve del panel recepite (sintesi — dettaglio nella spec)
- **R1 (solution-architect + backend-api, bloccante):** `TabAccettazione.tsx:239-249`
  è un secondo writer di `numero_cassetta` → il campo muore nel form + test sentinella.
- **RLS SELECT-only + REVOKE** su entrambe le tabelle (non il pattern `FOR ALL`).
- **Fail-soft consegna con riparazione a 3 strati** (ramo idempotente + lettura
  auto-riparante + RPC assegna che libera l'occupante chiuso).
- **Backfill** normalizzato `lower(btrim())`, troncamento, natural sort, NULL sul
  perdente delle collisioni, idempotente.
- **Riordino/elimina atomici** via RPC (mai check-then-update in route).
- **UX:** via alle Pile con preferenza «solo Parete» (`?stanza=` + voce «I lavori»);
  cap N nella stanza home (no-scroll); semantica long-press vs sheet; azioni
  «Sposta in…» / «Segna come libera»; `inert` sulla stanza non attiva.

## Gate residui nel piano
1. **Apply migration** (Task 1) — conferma esplicita di Francesco prima di `db push`.
2. **Mockup legenda 4 miniature nuove** (Task 18) — approvazione prima del React.
3. **Merge finale** — solo su richiesta esplicita, dopo review + QA + gate L2.

## Prossimo passo
Esecuzione del piano in **sessione nuova a contesto pulito** via
`superpowers:subagent-driven-development` in worktree dedicato. Handoff:
`docs/roadmap/2026-07-21-parete-cassette-execution-handoff.md`.
