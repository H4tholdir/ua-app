# Decisione design — UI Nota di Credito TD04

**Data:** 15/07/2026 · **Decisore:** Francesco Formicola
**Mockup:** `docs/design/mockups/2026-07-15-nota-credito-td04.html` (+8 screenshot in `screenshots/`)

## Scelta: Variante B — menu overflow ⋯ + sheet a 2 step

- **Trigger:** voce danger «↩ Emetti nota di credito» nel menu overflow ⋯ dell'header di `/fatture/[id]`, insieme alle azioni documento esistenti. Meno esposta → riduce storni accidentali.
- **Conferma:** bottom sheet (mobile) / dialog ancorato (desktop) a 2 step con step-indicator:
  1. **Causale** — textarea obbligatoria, helper chunking 200 char, contatore.
  2. **Conferma** — riepilogo conseguenze (storno integrale TD01, credito € al cliente se pagata, lavoro ri-fatturabile) + CTA rossa «↩ Emetti TD04».
- **Post-storno:** badge «⊘ Stornata» sulla TD01 (icona+testo), riga «Con nota → TD04 …», banner-link al TD04.
- **Gate visibilità trigger:** `stato_sdi ∈ {smtp_inviata, pec_consegnata, ricevuta_sdi, accettata, scaduta}` AND `tipo_documento='TD01'` AND `!stornata_at`.

Variante A (bottone in card Azioni + sheet unico) scartata: per un'azione irreversibile e rara si privilegia la protezione da tap accidentale (2 tap intenzionali).

Vincoli DS v2.3: token da `src/design-system/tokens.ts`, DM Sans, #D90012/#E8001A, dark flat, bottom sheet mobile (mai modal centrato), touch ≥44px, colore mai unico segnale.

## Addendum 15/07 — Francesco: azioni documento reali nel menu ⋯

Menu ⋯ con le azioni documento REALI della pagina (Scarica XML; Scarica PDF cortesia — stesso artefatto `pdf_storage_path` già generato da `generaFatturaPA`) come voci neutre + voce danger «↩ Emetti nota di credito» SEMPRE in coda, separata da divider. Il ⋯ resta visibile anche su fatture non stornabili purché abbia ≥1 voce reale (la danger semplicemente non c'è); senza voci né storno il ⋯ sparisce. Nessuna azione finta: «Invia al cliente» esclusa (nessun backend).
