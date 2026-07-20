# Final review fixes — DS v3 «Il cuore» Ondata 0

Anchor calendario: giovedì 9 luglio 2026 (10=ven, 11=sab, 13=lun, 14=mar, 16=gio).
Tutti i file sotto `docs/design/mockups/2026-07-09-il-cuore/`.

## 1 — (Critical) `.pill-fase` mancante in pila-aperta.html
- **Cosa:** la pill «FATTA ✓» del split-view 768 (scheda n.147) usava `.pill-fase` mai definita → rendeva come bottone nativo grigio.
- **Dove:** `pila-aperta.html` — aggiunto il blocco CSS `.pill-fase` (+ `:active`/`:focus-visible`) copiato VERBATIM da `scheda-lavoro.html` (H44 · gradiente verde #269950→--green · corsa 3px #14602C · testo 14.5/800 bianco). Corretto il commento di testata (§22-25): `.pill-fase` NON è in `_base.css`, è copiata più in basso nel `<style>`.
- **Verifica:** `pila-aperta-768-light.png` → pill verde 3D con testo bianco. ✓

## 2 — (§5.23) NotaDentista non conforme in scheda-lavoro.html
- **Cosa:** `.nota` rendeva card `--elv` + bolla-icona ambra + testo 16.5/600 `--ink`, contro §5.23 («barra verticale 3.5 --blue + testo 15/600 muted "[citazione]" — Dr. X»).
- **Dove:** `scheda-lavoro.html` — riscritto il blocco CSS `.nota`: `border-left: 3.5px solid var(--blue)`, niente background `--elv`, niente `.ic`; `.cit`/`.firma` 15/600 `--muted`. Rimossi i 5 span-icona `.ic` (chat-bubble) dalle 5 occorrenze (F1, F2, 768, 1280 + F5 «Provata in bocca»). Aggiunto commento di citazione §5.23. La rimozione di `--elv` risolve anche l'inversione in dark.
- **Verifica:** `scheda-lavoro-390-light.png` + `-dark.png` → barra blu, testo muted, nessuna card / nessuna bolla ambra, nessuna inversione dark. ✓

## 3 — (Calendario) date irrealistiche vs anchor
- `README.md` cast n.149: «consegna ven 11» → «ven 10» (+ annotazione).
- `pila-aperta.html` morph ambra: «il più vicino venerdì 11» → «venerdì 10» (+ annotazione).
- `scheda-lavoro.html` F3 sheet chip: «Lun 14» → «Lun 13» (+ annotazione).
- `scheda-lavoro.html` F5 fasi: «lun 7» → «mar 7», «mar 8» (×2) → «mer 8».
- `scheda-lavoro.html` F5 consegna: «Ven 11 · 10:00» → «Lun 13 · 10:00»; aggiornata l'annotazione «momento successivo» (n.145 deve essere più tardi del venerdì 10 di n.149 nella pila ambra).
- `home.html` («per venerdì», «Giovedì 9 luglio») e `wizard.html` («giovedì 16 luglio») già corretti → lasciati invariati.

## 4 — (§5.9) pill «In prova» fuori vocabolario in scheda-lavoro.html
- **Cosa:** la pill «IN PROVA» (F5, n.145) è fuori dal vocabolario chiuso e dalle estensioni ratificate.
- **Dove:** `scheda-lavoro.html` — aggiunta al commento di testata la nota «ESTENSIONE VOCABOLARIO PROPOSTA (§13.3): pill "IN PROVA" (fam. ambra) per lavori in prova esterna — da ratificare al gate Task 8». Pill mantenuta (necessaria per `in_prova_esterna`).

## 5 — (Minor) consegna.html dialog TastoPrimario H64 vs §5.1 H70
- **Cosa:** `.dialog .tasto-primario { height: 64px }` contro §5.1 «H70 non negoziabile».
- **Dove:** `consegna.html` — ripristinato a `height: 70px` (la card max-340 regge il 70 senza rompersi; verificato in `consegna-390-light.png`). Commento aggiornato.

## 6 — (Minor) consegna.html orologio «Fattura in preparazione» stroke-width
- **Cosa:** l'icona orologio della riga «Fattura · in preparazione» aveva `stroke-width="2"` contro il canone 1.7 (usato dall'orologio annullo F4).
- **Dove:** `consegna.html` — `stroke-width="2"` → `"1.7"`.

## 7 — (Minor, L3) home.html striscia alert: numero n.139 troncato
- **Cosa:** «La fattura di n.139 è stata scartata» si troncava perdendo n.139 (mobile e footer nav 240px).
- **Dove:** `home.html` — copy accorciata a «Fattura n.139 scartata» (numero in grassetto) in ENTRAMBE le occorrenze (striscia mobile + footer nav desktop), CTA «Sistemala ›» invariata. L'icona-triangolo esistente È il «⚠️» (non duplicato in testo). Annotazioni §2.2/L3 aggiunte. Variante serena invariata.

## Screenshot rigenerati
`pila-aperta` (6), `scheda-lavoro` (6), `consegna` (6), `home --short --no-scroll` (8, assert §3.3 no-scroll PASSATO — nessun ✗, exit 0).
