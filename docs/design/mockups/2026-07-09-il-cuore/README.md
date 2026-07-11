# Mockup Ondata 0 — DS v3 «Il cuore» (spec 2026-07-09)
Cast condiviso (usare identico in ogni schermata):
- Lab: «Laboratorio Formicola», utente «Francesco» (titolare)
- Dentisti: Dr. Esposito (Studio Esposito, 12 lavori/30gg) · Dr.ssa Bianchi (8) · Dr. Russo (5) · Studio Verdi (3)
- Lavori: n.147 Corona zirconia · Dr. Esposito · PZ-0412 · consegna OGGI 16:00 · stato pronto
          n.144 Ponte 3 elementi · Dr.ssa Bianchi · PZ-0398 · DA IERI · pronto (in ritardo)
          n.149 Scheletrato · Dr. Russo · PZ-0421 · consegna ven 10 · in lavorazione   <!-- data corretta rispetto al piano: 11/7/2026 è sabato, il venerdì è il 10 -->
          n.150 Corona metallo-ceramica · Studio Verdi · PZ-0430 · FERMO (sospeso da 6 giorni)
          n.151 Protesi totale · Dr. Esposito · PZ-0433 · appena arrivato, da confermare
          n.152 Intarsio · Dr.ssa Bianchi · PZ-0435 · arrivato ieri, da confermare
- Pile: rossa 2 (n.144, n.147) · ambra 5 (n.149, n.150, +3) · blu 2 (n.151, n.152)
- Fasi n.147: Modellazione ✓ (Ciro, ieri 14:20) · Fusione ✓ (Ciro, oggi 9:05) · Rifinitura ✓ (Salvatore, oggi 11:40) · Controllo finale ← prossima
- Tecnici: Ciro, Salvatore
Screenshot: node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/<file>.html

## Note per i mockup

- `_base.css` importa Plus Jakarta Sans via `@import url(...)` — non serve alcun `<link>` nelle singole pagine HTML. Ogni mockup che riferisce `_base.css` eredita il font automaticamente.
- `.pill` di default applica lo stile PillStato (13.5px, weight 800, +0.1em tracking, uppercase). Per variante PillTempo (15px, weight 800, no tracking, no uppercase), sovrascrivere `font-size: 15px; letter-spacing: 0; text-transform: none;` come documentato nel commento della classe `.pill` in `_base.css`.
