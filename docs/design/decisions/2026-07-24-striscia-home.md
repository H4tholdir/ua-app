# Decisione — Striscia di stato della home (gate §6.3, ondata redesign parete/home)

**Data:** 23-24/07/2026 · **Decisore:** Francesco Formicola · **Gate:** Task 7 del piano
`docs/superpowers/plans/2026-07-23-redesign-parete-home.md` (spec §3.4, mockup obbligatorio §6.3)

## Ratifiche

1. **Forma: F2 «card con voce»** — scelta tra F1 «pill quieta» e F2 sul mockup
   `docs/design/mockups/2026-07-24-striscia-home.html` (23/07). F1 scartata.
2. **Coreografia: V1 «carattere per livello»** — scelta sulla demo interattiva
   `docs/design/mockups/2026-07-24-striscia-animazioni.html` (rev 2 collaudata, 24/07):
   - **Urgenza** (singola e aggregata): ingresso deciso con rimbalzo contenuto — `molla.bouncy`.
   - **Racconto**: fade + rise di pochi px, in punta di piedi — `molla.smooth`.
   - **Trial**: come l'urgenza ma senza rimbalzo — `molla.smooth`.
   - **Uscita**: dissolvenza rapida verso l'alto (`avviso.exit` della demo).
   - MAI loop, MAI lampeggi; `prefers-reduced-motion` → solo dissolvenze.
   - V2 «uniforme» e V3 «respiro» scartate.

## Comportamenti confermati al gate (già in spec §3.4, mostrati e accettati nella demo)

- La striscia mostra UNA voce sola; 2+ allarmi di livello 1 → aggregato «N scadenze oggi — Vedi ›».
  → **SUPERATA il 26/07/2026 (Task 16a-bis):** `/lavori` senza `?pila=` fa redirect a `/dashboard`
  (verificato in codice, `src/app/(app)/lavori/page.tsx:36`) — la CTA dell'aggregato riportava
  l'utente esattamente alla home da cui era partito, per QUALSIASI aggregato. Il livello 1 inoltre
  non è un insieme omogeneo di "scadenze" (include stati senza finestra temporale: materiale,
  pagamento). Panel 2 advisor + ratifica Francesco: la striscia ora NOMINA il primo allarme acceso
  (copy/href suoi, verbatim) e CONTA gli altri in `altri`; il trial ≤3gg, se acceso, nomina per
  primo. Dettaglio implementativo e TDD: `.superpowers/sdd/task-16a-bis-report.md`; codice in
  `src/lib/dashboard/striscia.ts` (`scegliSegnale`, `candidatiLivello1`).
- Tap: urgenza singola → destinazione del candidato; aggregato → `/lavori`; racconto liberazione →
  `/dashboard?stanza=parete`; trial → abbonamento. Racconto visto → non riappare (dedup `eventoId`).
  → l'aggregato «→ `/lavori`» è la parte SUPERATA sopra: ora il tap dell'allarme nominato va alla
  SUA destinazione (identica a quella che avrebbe avuto da solo), mai a `/lavori` senza `?pila=`.
- Silenzio = nessuna striscia (il saluto respira); il vecchio s9 «Tutto a posto» muore.
- Racconto tappabile sull'intera card (comportamento nuovo vs `role="status"` attuale) — accettato
  implicitamente col tap-toast della demo; da implementare nel Task 16.

## Storia delle revisioni della demo

- Rev 1 bocciata da Francesco («demo rotta, animazioni non visibili, opzioni incomprensibili»).
  Cause: font da CDN (bloccato dal visualizzatore), striscia già presente al load (ingresso
  impercettibile), differenze V* non confrontabili a memoria.
- Rev 2: zero risorse di rete, ciclo sparizione→pausa→ingresso, vista Confronto 3-up simultanea,
  rallentatore 0,25×, autoplay iniziale. Collaudata in browser dal controller prima della consegna.

## Vincolo per il Task 16

I valori visivi (dimensioni, padding, radius, colori per stato) e le molle per livello si copiano
VERBATIM dal mockup F2 + demo V1 — «i valori ratificati VINCONO».
