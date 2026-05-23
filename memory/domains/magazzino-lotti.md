# Magazzino & Tracciabilità Lotti
**Carica quando:** task tocca magazzino, lotti, scarico BOM, scorta, ordini fornitori, listino materiali.

## File chiave
- `src/app/api/magazzino/[id]/lotti/route.ts` — GET/POST lotti per articolo
- `src/lib/consegna/orchestrate.ts` — step 8: scarico BOM fire-and-forget
- `src/types/domain.ts` — `ArticoloMagazzino`, `LottoMagazzino`, `LavoroMateriale`
- `supabase/migrations/20260520_bom_materiali_ordini.sql` — `listino_materiali_auto`, `scarichi_magazzino`, `ordini_fornitori`

## Invariante critica
**Lo scarico BOM è fire-and-forget e NON blocca la consegna.** Questa è una scelta deliberata di design. Un errore nello scarico viene loggato ma la consegna risulta completata. La coerenza eventuale è by design — non un bug.

## Regole operative
- `scorta_attuale` può essere temporaneamente inconsistente dopo una consegna — normale
- Il CRUD base del magazzino è stabile — toccare solo per aggiungere categorie, alerting scorta minima, gestione fornitori
- `listino_materiali_auto` definisce i BOM: quale materiale viene scaricato ad ogni tipo di lavoro

## Issue nota (Codex — media priorità)
Lo scarico BOM non è idempotente: retry della consegna inserisce un secondo record in `scarichi_magazzino` e decrementa `scorta_attuale` due volte. Soluzione: idempotency key `consegna_id + materiale_id` + decremento atomico SQL (`UPDATE ... WHERE NOT EXISTS(idempotency check)`).
