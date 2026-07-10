# Decisione design — Portale dentista v2, Ondata 1 (fatturazione concordata)

**Data:** 10 luglio 2026 · **Approvato da Francesco:** sì («Ok mockup entrambi»), 10/07/2026

## Mockup approvati (fedeltà vincolante per i Task 12-14)

1. `docs/design/mockups/2026-07-10-portale-da-fatturare.html` (+ screenshot 390/768)
   — Tastierino PIN (3 stati: inserimento, errore con tentativi rimasti, bloccato con countdown);
   lista «Da fatturare» (gruppi per mese, toggle segmentato Fatturare/Non fatturare, righe
   confermate «✓ Confermato dal laboratorio — …» incluso il caso difforme con proposta iniziale
   barrata, footer sticky «Totale da fatturare»); stato vuoto; layout stampa (colonna «Esito»).
2. `docs/design/mockups/2026-07-10-lab-portale-cliente-scadenzario.html` (+ screenshot 390/768)
   — Card «Portale — fatturazione concordata» in scheda cliente (interruttore, PIN
   mai-impostato/impostato con «Cambia PIN», «Rigenera link portale», nota canale separato);
   scadenzario con riga 💬 «<Studio> propone: … · <quando>» e bottone corrispondente evidenziato.
   Light + dark (dark flat).

## Modifiche richieste in review e recepite
- Pannello stampa: colonna rinominata «Proposta» → «Esito» (mostra la decisione effettiva).
- Niente wrap a 390px nella tabella stampa.

## Note aperte (non bloccanti, fuori scope Ondata 1)
- Token DS `--t3` in dark (#5A5652 su #232018, ~2.2:1) sotto soglia di leggibilità — tema del
  token DS v2.3, da valutare in una sessione DS dedicata.

## Gate infrastruttura (stesso giorno)
- Migration `20260710180000_ondata1_portale_fatturazione_concordata.sql` applicata al DB live
  via `npx supabase db push` (conferma esplicita di Francesco); verifica post-apply oggetto per
  oggetto: OK. Types rigenerati (FASE 6b), tsc pulito.
- Env: valori DEV in `.env.local` (worktree); valori PROD generati e consegnati a Francesco per
  l'inserimento su Vercel (token CLI scaduto — vedi runbook nel messaggio di sessione).
- Runbook: la rotazione di PORTALE_PIN_PEPPER invalida tutti i PIN salvati (reimpostare i PIN
  dei clienti dalla scheda cliente).
