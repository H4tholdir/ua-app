# Consegna & MDR Compliance
**Carica quando:** task tocca orchestraConsegna, DdC, MDR, precheck, snapshot, incidenti, PSUR, consegna.

## File chiave
- `src/lib/consegna/orchestrate.ts` — orchestratore 9 step: lock → precheck → DdC → Buono → consegnato → push → fattura → scarico BOM → risposta
- `src/lib/consegna/precheck.ts` — 12 controlli MDR (file attivo, non `precheck-mdr.ts`)
- `src/types/domain.ts` — `DichiarazioneConformita` con campi `_snapshot` immutabili
- `supabase/migrations/20260514_mdr_qualita.sql` — `incidenti_mdr`, `rischi_tipo_dispositivo`
- `src/app/api/qualita/psur/route.ts` — PSUR MDR Art. 86

## Invariante critica
**`non_conformita_aperte` nel precheck MDR DEVE essere caricato server-side.**
Se arrivasse dal client, l'utente potrebbe bypassare il blocco consegna in presenza di NC aperte.
Tutti i campi `_snapshot` nella DdC sono immutabili post-emissione (documento legale emesso).

## Regole operative
- Lo scarico BOM (step 8) è **fire-and-forget** — non blocca la risposta. Errori loggati ma consegna considerata completata
- Il lock idempotente (step 1) previene doppie consegne concorrenti sullo stesso lavoro
- `orchestraConsegna` è l'UNICA porta per `consegnato` — non chiamare singoli step fuori dall'orchestratore
- PSUR: aggrega automaticamente da `lavori`, `lavori_fasi`, `incidenti_mdr`

## Issue nota (Codex — alta priorità)
`orchestraConsegna` chiama `consegna_lavoro_lock(p_lavoro_id, p_laboratorio_id)` a 2 argomenti, ma le migrations definiscono la funzione con 1 solo argomento. Il contratto RPC potrebbe essere rotto in produzione — verificare prima di toccare il flusso consegna.

## Issue nota (Codex — media priorità)
Lo scarico BOM non è idempotente: retry o doppia consegna sullo stesso lavoro inserisce un secondo `scarichi_magazzino` e decrementa `scorta_attuale` due volte. Da aggiungere idempotency key per `lavoro_id + materiale_id`.
