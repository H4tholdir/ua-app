# Decisione design — Alert saldo credito negativo (Task 4, ondata R1)

**Data:** 15/07/2026 · **Decisore:** Francesco Formicola
**Mockup:** `docs/design/mockups/2026-07-16-alert-saldo-negativo.html`
**Screenshot:** `docs/design/mockups/screenshots/2026-07-16-alert-saldo-negativo-{390,768,1280}-{light,dark}.png`

## Scelta: **Variante A — card alert (icona + spiegazione + CTA)**

Card nel blocco «Credito cliente» di `CreditoDisponibileSection` quando `disponibile < 0`:
- icona ⚠ + etichetta «SALDO NEGATIVO» (colore mai unica fonte di stato)
- importo negativo in rosso semantico DS (contrasto AA: 5.6:1 light, 5.4:1 dark)
- spiegazione della causa (TD04 rifiutata da SdI dopo applicazione del credito)
- CTA piena larghezza «Vai alla riconciliazione →» verso `/fatture/riconciliazioni`, touch ≥ 44px

**Variante B (banner compatto) scartata.**

## Nota DS
Superficie in **DS v2.3**: la pagina scadenzario non è ancora migrata a v3 e la regola
di convivenza del DS v3 §14 è «per pagina, mai per componente». L'alert migrerà a v3
insieme alla sua pagina (ondata «Le sezioni»).
