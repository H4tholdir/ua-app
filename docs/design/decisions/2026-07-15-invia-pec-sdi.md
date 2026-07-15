# Decisione design — Card «Invio SDI» (N10+N9, gate §0B)

**Data:** 2026-07-15
**Decisore:** Francesco Formicola
**Mockup:** `docs/design/mockups/2026-07-15-invia-pec-sdi.html` (commit `43633cb`)
**Screenshot:** `docs/design/mockups/screenshots/2026-07-15-invia-pec-sdi-{390,768,1280}.png`

## Scelta

**Variante A — bottone primario rosso pieno.**

- Bottone «Invia a SdI» rosso pieno (`--red: #D90012`) sotto le righe della card «Invio SDI».
- Riga di stato SDI granulare sopra il bottone: «Stato SdI: Pronta per l'invio» (`generata`).
- Stato post-invio: «Inviata a SdI — in attesa di ricevuta» con dot ambra.
- PEC non configurata: bottone disabled + link «Configura PEC ›» → `/impostazioni/pec`.
- Conferma: bottom sheet su mobile / dialog su desktop — «Inviare la fattura {numero} a SdI? L'invio è un atto fiscale irreversibile.» (Annulla / Invia).
- Pending: spinner sul bottone. Errore 502: messaggio inline sotto il bottone.

## Richieste aggiuntive

Nessuna — variante A approvata così com'è.

## Conseguenza

Task 5 implementa `InviaPecButton.tsx` fedele alla Variante A del mockup (markup, token v2.3, touch ≥44px, `aria-modal`, mappa `STATO_SDI_LABEL` a 8 stati).
