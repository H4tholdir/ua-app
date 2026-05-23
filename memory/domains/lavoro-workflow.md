# Lavoro Workflow
**Carica quando:** task tocca stati lavoro, transizioni, fasi, prove, rifacimento, TRANSIZIONI_CONSENTITE.

## File chiave
- `src/types/domain.ts` — `StatoLavoro`, `Lavoro`, `LavoroDettaglio`, `ConsegnaResult`
- `src/app/api/lavori/[id]/stato/route.ts` — `TRANSIZIONI_CONSENTITE` (esclude `consegnato`)
- `src/app/api/lavori/[id]/rifacimento/route.ts` — delega a RPC `crea_rifacimento_atomico`
- `supabase/migrations/007_rpc_rifacimento.sql` — atomicità: annulla + crea + `lavori_rifacimenti` + `incidenti_mdr`
- `src/lib/consegna/orchestrate.ts` — unica porta di ingresso per `consegnato`

## Invariante critica
**`consegnato` è raggiungibile ESCLUSIVAMENTE tramite `orchestraConsegna()`.**
NON è in `TRANSIZIONI_CONSENTITE`. Non aggiungere. Senza orchestraConsegna: niente DdC, niente fattura, MDR violato.

**Rifacimento: `crea_rifacimento_atomico()` RPC — MAI 3 INSERT separati.**
Modifica 3 tabelle insieme. Un INSERT separato che fallisce lascia stato inconsistente.

## Regole operative
- Tecnici: `lab_memberships.attivo = false` — MAI DELETE
- `PATCH /api/lavori/[id]`: allowlist esplicita di campi — MAI blocklist

## Issue nota (Codex — media priorità)
`prove/route.ts` muta `lavori.stato` direttamente verso `in_prova_esterna`, `annullato`, `sospeso`, `in_lavorazione` bypassando `TRANSIZIONI_CONSENTITE`. Le transizioni sono frammentate. Da centralizzare in una funzione condivisa o RPC con matrice unica.
