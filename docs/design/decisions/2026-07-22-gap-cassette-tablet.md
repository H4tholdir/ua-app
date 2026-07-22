# Decisione — Gap cassette su tablet: variante C «Fluida»

**Data ratifica:** 23/07/2026 (notte) · **Ratificata da:** Francesco
**Mockup:** `docs/design/mockups/2026-07-22-gap-cassette-tablet.html` (+ screenshot in `mockups/screenshots/2026-07-22-gap-cassette-tablet-*.png`)
**Origine:** segnalazione device (triage 22/07) — «spaziatura della griglia cassette su tablet da rivedere» · handoff post-R3, punto 1.

## Il problema, in numeri
A viewport 768px i tray della parete crescono a ~150px di larghezza (dal telefono: ~95px) ma il gap
restava fisso a 16px: la fuga passava dal ~17% al ~11% della larghezza del tray. In verticale era
peggio: la linguetta `::before` sporge 7px sopra il tray → respiro visivo tra le file ~9px.

## Varianti presentate (light+dark, viewport tablet simulato)
- **V0** stato attuale (riferimento)
- **A «Più fuga»** — gap 24px uniforme
- **B «Aria verticale»** — column 20 / row 30
- **C «Fluida»** — gap e cornice scalano con la larghezza della shell via `clamp()`/`cqw` ✅ **SCELTA**
- **D «Cassette da telefono»** — 5 colonne (avrebbe emendato spec §5.4)

## Implementazione (per route: SOLO `/cassette`)
`src/app/ds-v3.css`:
- `.ds-parete-shell` → `container-type: inline-size` (la shell è il container delle query)
- `.ds-parete-shell .ds-parete-grid` → `gap: clamp(16px, 3.6cqw, 26px)`
- `.ds-parete-shell .ds-parete` → `padding: clamp(22px, 3.8cqw, 28px) clamp(16px, 3.2cqw, 24px) clamp(18px, 3.4cqw, 24px)`

**Taratura misurata (QA):** i `cqw` risolvono sul **content-box** della shell (680px a viewport
768 = max-width 720 − padding 20×2), non sul viewport: i coefficienti sono più alti di quelli del
mockup (3.2→3.6 ecc.) per centrare la stessa àncora ratificata ≈24.5px a 768. Misure QA reali:
16px @390 (3 colonne) · 24.48px @768 (4 colonne) · 26px @1280 (6 colonne), light e dark.

**Nota di onestà (review 23/07):** finché le max-width della shell restano fisse (480/720/1120),
la formula produce di fatto solo questi 3 valori — è «fluida per costruzione», non ancora nei
fatti. Diventerà continua quando la shell stessa sarà fluida (ondata «Redesign parete/home»),
senza dover ritoccare queste regole.

**Perimetro:** la home (`.ua-stanza-parete`) resta ai valori fissi sanzionati dal collaudo R3b
(compatta 744px, gap 12) — la direzione fluida della home appartiene all'ondata «Redesign
parete/home». Guardia: `tests/unit/ds-v3/parete-fluida.test.ts` (4 test, incluso il vincolo che
nessuna regola fluida tocchi la stanza-parete).

**Evidenze QA (FASE 9/9b):** screenshot 390/768/1280 × light/dark in
`docs/design/screenshots/2026-07-23-gap-cassette-fluida/` — prodotti da uno spec Playwright
temporaneo con misure computate dal browser (asserzioni su columnGap/rowGap/padding e numero
colonne), poi rimosso.
