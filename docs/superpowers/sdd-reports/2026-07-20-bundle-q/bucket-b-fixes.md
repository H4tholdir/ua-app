# Bucket B — Revisioni di legge (decisioni Francesco 12/07)

Applicate ai SOLI mockup Ondata 0 (`docs/design/mockups/2026-07-09-il-cuore/`,
kit `_base.css` + HTML). `src/` NON toccato: la legge madre riceve l'emendamento
in fase React. Ogni cambiamento è annotato nel sorgente con
«REVISIONE DI LEGGE (decisione Francesco 12/07, bucket B)» + il § che rivede.
Contrasti calcolati con formula WCAG 2.x (luminanza relativa, script node in scratchpad).

## B1 — `--faint` scurito (§3, entrambi i temi)

| Tema | Prima | Dopo | su `--bg` | su `--card` | su `--bg-deep` (disabled) |
|---|---|---|---|---|---|
| Light | `#A69B8C` (2.40/2.71 FAIL) | **`#7B6A59`** | **4.56 ✓** | **5.14 ✓** | 4.17 — riportato, NON corretto (convenzione disabled §5.1 deliberata) |
| Dark  | `#6E6457` (3.17/2.89 FAIL) | **`#928778`** | **5.21 ✓** | **4.75 ✓** | 5.47 ✓ |

Stessa taupe calda panna; gerarchia inchiostri preservata (dark: faint `#928778`
resta sotto muted `#A69B8C`). Verificati i 31 usi di `var(--faint)` nella cartella
(eyebrow, caption, countdown, chi-quando, frame-sep, disabled): nessuna rottura.
Dove: `_base.css` (token light + dark).

## B2 — Verdi con testo bianco scuriti

### `.wa-btn` (§3.3.4 — consegna.html)
- Prima: `#2FBE68→#1F9E52` — bianco 2.42 (stop chiaro) / 3.46 (scuro) FAIL.
- Dopo: **`#208650→#17663A`** — bianco **4.58** (stop più chiaro) / **7.00** (scuro) ✓,
  hex pinnati identici light/dark. Ancora riconoscibilmente WhatsApp-green.
- Conseguenza: corsa 3D `#14602C→#0E4A28` (il bordo restava illeggibile sotto il
  nuovo stop scuro).

### `.pill-fase` (§5.4 — home.html, pila-aperta.html, scheda-lavoro.html — 3 copie IDENTICHE)
- Prima: `#269950→var(--green)` — bianco 3.65 (light, stop chiaro #269950);
  in dark `var(--green)` risolveva a `#34C468` come stop di faccia → 2.27 FAIL.
- Dopo: **`#1F8544→#166B39`** stop PINNATI in hex (mai `var(--green)` come faccia) —
  bianco **4.67** (stop più chiaro) / **6.57** (scuro), identici in ENTRAMBI i temi ✓.
  Corsa `#14602C` invariata (resta più scura del nuovo stop scuro).

## B3 — Quarta pila «DA RIFARE / IN PROVA», famiglia VIOLA (§3 + §5.7/§7.1)

Token nuovi in `_base.css` (viola caldo armonizzato alla panna; dark più
chiaro/desaturato sul pattern del blu `#5B9BFF`, tint alpha .14 come i fratelli):

| Tema | `--purple` | `--purple-tint` | testo su `--bg` | su `--card` | su tint |
|---|---|---|---|---|---|
| Light | `#7C3F9C` | `#F3EAF7` | **6.06 ✓** | **6.83 ✓** | **5.88 ✓** |
| Dark  | `#B98BE8` | `rgba(185,139,232,.14)` | **6.92 ✓** | **6.32 ✓** | **5.57** (tint su bg) / **5.05** (tint su card) ✓ |

Cast: n.145 (Corona disilicato · Dr. Esposito · PZ-0408 · in prova esterna,
torna lun 13) esce dall'ambra (5→4) ed entra nella viola (1). 4ª pila decisa da
Francesco 12/07 su parere odontotecnico. README cast aggiornato.

Dove atterra:
1. **home.html 390/390corto** — 4ª card viola tra ambra e blu (ordine urgenza:
   rossa, ambra, viola, blu), subline «n.145 torna lunedì» (REGOLA SUBLINE ok).
   Ambra 5→4. Scala device-corti RICOMPRESSA e ri-dichiarata (è legge):
   num 52→42 (SOLO numeri pile §4.1), card padding 14/18, gap 10, padding pagina 14.
   **Assert no-scroll PASSED a 390×844 E 390×667** (entrambi i temi).
2. **home.html 768** — stessa colonna, 4 pile (markup condiviso).
3. **home.html 1280** — nav: «Sul banco 4» + nuova voce «Da rifare · 1» (badge
   viola `.badge.v`) prima di «Appena arrivati»; lista panel invariato (rossa sel).
4. **pila-aperta.html** — frame ambra: n.145 rimosso (4 card, morph 5→4, sub
   «4 lavori · il più vicino venerdì 10»); NUOVO frame «— frame — Pila viola
   aperta (390)»: morph viola (1 + «DA RIFARE / IN PROVA») + CardLavoro n.145 con
   pill ratificata «In prova» (ora fam. viola) + riga dettaglio «torna lun 13»
   (nessuna pill nuova: vocabolario §5.9 chiuso). 1280: grp-tab viola aggiunto,
   ambra 5→4. Annotato «pila viola introdotta da revisione §5.7/§7.1 (bucket B)».
5. **scheda-lavoro.html F5** — pill «In prova» fam. ambra→viola; annotazione
   vocabolario aggiornata. Nav 1280 allineata a home (Sul banco 4 + Da rifare 1).
6. **consegna.html** — shell-desk decorativa 1280: voce «Da rifare» aggiunta.
   wizard.html: «5 lavori · 30gg» è il conteggio 30gg del Dr. Russo, NON un
   conteggio pila → invariato (verificato).

## Verifiche finali
- Screenshot rigenerati: home (`--short --no-scroll` PASSED), pila-aperta,
  scheda-lavoro, consegna (3 viewport × 2 temi). wizard/tutto-il-resto non toccati.
- Visual check ok: home-390-light (4 pile leggibili, no scroll), home-390corto-light,
  pila-aperta-390-light (frame viola), consegna-390-light/dark (WhatsApp scuro),
  home-1280-light (nav con «Da rifare · 1»).
- Budget rosso invariato (un solo primario rosso per vista) · dark flat ·
  dizionario/vocabolario pill invariato («In prova» era già ratificata, cambia solo famiglia).

## Addendum post-review (12/07 — solo documentazione, zero pixel)

Il reviewer ha approvato tutto il funzionale (ratio riprodotti, no-scroll
ri-verificato, cast coerente) e chiesto 3 chiusure documentali:

1. **Citazione della norma abbattuta (B3)** — le annotazioni viola citavano
   §3/§5.7/§7.1 ma non la regola effettivamente rovesciata. Aggiunto in tutte le
   REVISIONI DI LEGGE viola (_base.css token light+dark, home.html regola CSS +
   card markup, pila-aperta.html frame viola, README cast): «rivede §3.3 regola 2
   (palette chiusa a 4 famiglie: "Vietato un quinto colore di stato. Il viola non
   esiste in questo sistema (solo negli avatar, §5.14)") e §5.14 (viola solo
   avatar); aggiornare anche la tabella di migrazione v2.3→v3 ("--c-purple →
   SOLO avatar") quando si emenda la legge madre».
2. **Deroga griglia §4.2 (scala device-corti)** — la scala ricompressa introduce
   i passi 14px/10px fuori dalla griglia chiusa 8px (§4.2: 4/8/12/16/20/24/32/44).
   Aggiunto al commento-legge della scala compressa in home.html: «il regime
   device-corti ammette i passi intermedi 10 e 14 SOLO in questa scala
   compressa — deroga a §4.2, da incidere nella legge madre insieme alla 4ª pila».
3. **Ratifica «IN PROVA» documentata** — la rimozione dell'hedge «ESTENSIONE
   VOCABOLARIO PROPOSTA (§13.3)… da ratificare» non documentava la ratifica.
   Ripristinata nota in scheda-lavoro.html: «pill "IN PROVA" ratificata da
   Francesco il 12/07 (bucket B, decisione B7) — estensione §5.9 definitiva,
   famiglia viola».

Modifiche solo a commenti HTML/CSS/MD: nessun cambio di pixel, screenshot NON
rigenerati (invariati per costruzione).
