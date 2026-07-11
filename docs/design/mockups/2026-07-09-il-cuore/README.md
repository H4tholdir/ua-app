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
          n.145 Corona disilicato · Dr. Esposito · PZ-0408 · IN PROVA ESTERNA, torna lun 13
- Pile: rossa 2 (n.144, n.147) · ambra 4 (n.149, n.146, n.148, n.150) · **viola 1 (n.145 Corona disilicato · Dr. Esposito · in prova esterna, torna lun 13)** · blu 2 (n.151, n.152)
  <!-- REVISIONE DI LEGGE (decisione Francesco 12/07, bucket B) — §5.7/§7.1:
       4ª pila «DA RIFARE / IN PROVA» (famiglia viola) decisa da Francesco 12/07
       su parere odontotecnico. n.145 esce dall'ambra (5→4) ed entra nella viola. -->
- Fasi n.147: Fresatura ✓ (Ciro, ieri 14:20) · Sinterizzazione ✓ (Ciro, oggi 9:05) · Glasatura ✓ (Salvatore, oggi 11:40) · Controllo finale ← prossima
  <!-- fasi corrette su parere odontotecnico (advisor 03): la zirconia si fresa e sinterizza,
       non si fonde — il piano aveva la catena del metallo (Modellazione → Fusione → Rifinitura).
       Tecnici e timestamp invariati. DEVIAZIONE DAL PIANO — da ratificare al gate Task 8. -->
- Tecnici: Ciro, Salvatore
Screenshot: node scripts/screenshot-mockups.mjs docs/design/mockups/2026-07-09-il-cuore/<file>.html

## Note per i mockup

- `_base.css` importa Plus Jakarta Sans via `@import url(...)` — non serve alcun `<link>` nelle singole pagine HTML. Ogni mockup che riferisce `_base.css` eredita il font automaticamente.
- `.pill` di default applica lo stile PillStato (13.5px, weight 800, +0.1em tracking, uppercase). Per variante PillTempo (15px, weight 800, no tracking, no uppercase), sovrascrivere `font-size: 15px; letter-spacing: 0; text-transform: none;` come documentato nel commento della classe `.pill` in `_base.css`.
- **Famiglia VIOLA** — REVISIONE DI LEGGE (decisione Francesco 12/07, bucket B), §3 + §5.7/§7.1: token `--purple`/`--purple-tint` in `_base.css` (light `#7C3F9C`/`#F3EAF7`, dark `#B98BE8`/`rgba(185,139,232,.14)`) per la 4ª pila «DA RIFARE / IN PROVA». Contrasti verificati AA: light 6.06 su `--bg`, 6.83 su `--card`, 5.88 sul tint; dark 6.92 su `--bg`, 6.32 su `--card`, 5.57/5.05 sul tint. La pill «In prova» è fam. viola (non più ambra). Classi consumatrici: `.pila.viola`, `.morph.viola`, `.pill.fam-viola`, `.badge.v`, `.grp-tab.viola`.
- **Verdi scuriti AA** — REVISIONE DI LEGGE (decisione Francesco 12/07, bucket B): `.pill-fase` (§5.4) ora `#1F8544→#166B39` (bianco 4.67/6.57, stop pinnati, identici nei 2 temi — 3 copie IDENTICHE in home/pila-aperta/scheda-lavoro); `.wa-btn` (§3.3.4, solo consegna.html) ora `#208650→#17663A` (bianco 4.58/7.00), corsa `#0E4A28`.
- **`--faint` AA** — REVISIONE DI LEGGE (decisione Francesco 12/07, bucket B), §3: light `#7B6A59` (4.56 su `--bg`, 5.14 su `--card`), dark `#928778` (5.21 su `--bg`, 4.75 su `--card`).
