# Wave H — Scelte ratificate da Francesco (25/07/2026, in chat)

Contesto: proposte presentate con screenshot/demo (metodo design-first, dopo il
respingimento del primo giro mockup H2 da parte del controller per violazione
della sagoma unica). Parole di Francesco: «allora, per le cassette B, con paziente
nome completo. per il riordino seguiamo la tua raccomandazione. per il piede c2.»

## H2 — Cassetta: OPZIONE B «va a capo» + paziente NOME COMPLETO

- Mockup di riferimento: `docs/design/mockups/2026-07-25-cassetta-h2-proposte.html`
  (commit `8ad385e`), opzione B. Sagoma UNICA per tutte (misure mockup: 100×132,
  fascia fissa B 72px; nella app reale la larghezza la detta la griglia fr — i
  valori assoluti della fascia/testi dal mockup, la larghezza fluida).
- Il clinico resta INTERO e va a capo tra le parole (2 righe); finestra più
  piccola in via permanente (trade-off accettato).
- MODIFICA ratificata rispetto al mockup del muro: il paziente si mostra col
  NOME COMPLETO (non cognome+iniziale). Francesco informato del limite fisico:
  i nomi estremi su ~100px non stanno interi → trattamento caso limite
  dell'opzione B (sfumatura morbida, mai ellipsis netta). Accettato.
- Il doppio regime `is-nome-lungo`/min-height 142 viene eliminato (sagoma unica
  «piena e vuota», vincolo (a)+(b) del verbale ri-collaudo #3).

## H3 — Riordino: OPZIONE 1 «aggancio al dito» (raccomandazione del controller)

- Root cause a verbale: indagine v2 (`.superpowers/sdd/h3-indagine-report.md`) —
  trigger sul centro del ghost che supera il punto medio del track (nella maglia
  vuota), FIX-F corretto e attivo.
- Rimedio ratificato: il riordino scatta SOLO quando il PUNTO DEL DITO entra
  nell'area reale di un'ALTRA cassetta; finché il dito è sul vuoto della rete o
  sulla cassetta d'origine, nessun ricalcolo. (Alternativa C — collasso
  gridAutoRows su device — da escludere al ri-collaudo #4.)

## H4 — Piede: C2 «il tasto si ritira» CONFERMATO dopo demo animata

- Demo: `docs/design/mockups/2026-07-25-piede-demo-c1-vs-c2.html` (commit
  `ebf4edb`) — coreografia C2: etichetta sfuma, tondo si ritrae (scale) con
  `molla.press`; ritorno reversibile a metà gesto.
- Da implementare fedele alla demo + proposta statica
  (`2026-07-25-linguetta-e-piede-proposte.html`, variante C2).

## Rifinitura fascia (post ri-collaudo #4) — VARIANTE C ratificata (25/07 sera, chat: «Scelgo la variante C»)

- Mockup: `docs/design/mockups/2026-07-25-fascia-leggibilita-varianti.html` (ecd8a7c), variante C.
- Meccanismo: sulle facce CHIARE lo scrim della fascia si INVERTE (schiarisce invece di
  scurire) e il testo passa a inchiostro pieno — riusa la logica `targaScura` già nel
  componente. Contrasti misurati: azzurra clinico 2,50→6,99 · bianca 3,78→14,68 (WCAG AA
  chiuso su tutte le facce ostiche). Corpi e finestra INVARIATI, zero spazio rubato.
- Paziente su più righe: fino a 2 righe col budget condiviso della variante A (clinico
  1 riga → paziente 2; clinico 2 → paziente 1), sfumatura verticale come il clinico.
- Respinte: A (risolveva solo il multiriga), B (finestra −30% e rapporto di contrasto
  comunque invariato).
