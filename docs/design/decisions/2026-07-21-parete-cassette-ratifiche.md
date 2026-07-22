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

## Ratifiche del 22/07/2026

Aggiunte in corso d'implementazione, dopo panel/ricerca dedicati. Sostituiscono il testo del
piano/spec dove divergono.

1. **S2 — trascinamento completo, touch incluso (Task 13).** Il riordino della parete usa il
   **drag pieno anche su touch**, non la sola variante ▲▼/mouse (S1). Scelta ratificata dopo un
   panel advisor 3× + una ricerca dedicata (`.superpowers/sdd/ricerca-drag-touch.md`), che
   sostituisce il testo del Task 13 dove diverge. Conseguenze incise nella spec di design §5.4:
   **nessun HTML5 DnD** (neutralizzato con `draggable=false` + `preventDefault` su `dragstart`);
   soglia **8px riqualificata per `pointerType`** (su touch ANNULLA l'hold, su mouse/pen è il
   trigger); listener nativo `touchmove` su `window` al mount con `{passive:false}` che
   `preventDefault` **solo a drag attivo**; **niente refetch prima del drag** → snapshot al lift +
   `riconcilia()` al drop + **una sola POST**; auto-scroll ai bordi obbligatorio.

2. **Doppio tap del colore custom (Task 12).** Nel sheet cassetta le facce **standard** committano
   con **un solo tap** (è un click discreto); il **colore custom** arriva LIVE dal picker nativo
   (`<input type="color">`, valori in streaming) e quindi **resta in sospeso**: lo committa un
   **secondo tap** esplicito (tasto di conferma). Motivo «una cosa alla volta»: un valore che
   cambia in continuo non deve scrivere a ogni frame. (Codice: `CassettaSheet.tsx`,
   `scegliDaiSwatches` — review Task 12, Important 1.)

3. **Ricerca «globale» (§5.1 spec di design).** Il pagliaio della ricerca «che accende» è esteso a
   `nome ∥ n.{numero} ∥ dentista ∥ paziente ∥ descrizione ∥ etichetta leggibile del tipo ∥ colore`.
   Limite noto e accettato: un **hex custom** può collidere con query numeriche corte — **rumore
   additivo**, mai un mancato match.

4. **Deroga a11y da tastiera — DEFERITA fuori ondata (§12 spec di design).** L'accessibilità **da
   tastiera** del **riordino** e dello **sheet su cassetta occupata** è rimandata a un'ondata
   dedicata: in quest'ondata il **mouse replica il gesto touch**, ma non c'è un equivalente da
   tastiera del sollevamento (da tastiera si arriva sempre al tap → scheda lavoro). La promessa di
   spec è stata riformulata perché il documento non menta. Affordance agli atti come mockup:
   `docs/design/mockups/2026-07-22-riordino-affordance-a11y.html`.

## Gate residui nel piano
1. **Apply migration** (Task 1) — conferma esplicita di Francesco prima di `db push`.
2. **Mockup legenda 4 miniature nuove** (Task 18) — **GATE IN CORSO**: le 4 miniature nuove
   (`allineatore`, `mascherina`, `riparazione`, `generica`) rendono un segnaposto neutro finché la
   legenda non è approvata; DS v3 §5.36 le marca **«in ratifica»**. Nessun esito anticipato.
3. **Merge finale** — solo su richiesta esplicita, dopo review + QA + gate L2.

## Prossimo passo
Esecuzione del piano in **sessione nuova a contesto pulito** via
`superpowers:subagent-driven-development` in worktree dedicato. Handoff:
`docs/roadmap/2026-07-21-parete-cassette-execution-handoff.md`.
