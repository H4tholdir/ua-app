# Handoff — Collaudo R3 (segnalazioni device di Francesco, 22/07 notte)
**Per:** sessione NUOVA a contesto pulito. Base: main ≥ 7baa121+BP-1. R1+R2 deployati.
**Prassi:** BP-0 → systematic-debugging (root cause PROVATE prima dei fix) → worktree → TDD →
review → QA → 🛑 STOP ratifica. Screenshot di Francesco in
`docs/design/screenshots/2026-07-22-collaudo-r3-segnalazioni/`.

## Esiti collaudo R2 su device
- Dot pager: ✅ FUNZIONANO.
- D-2 ombra ultima pila: MIGLIORATA ma clippa ANCORA un po' → aumentare il respiro
  (`.ua-stanza` padding-bottom 22px in ds-v3.css, portare a ~34-40px? misurare col device ratio;
  verificare anche il ramo @media max-height:700px).
- **P9 (terza iterazione) — DATO NUOVO DECISIVO:** «se tappo una cassetta sembra aprirsi lo
  sheet, si alza di qualche pixel ma non si apre». Qualcosa PARTE. Ipotesi da verificare IN
  ORDINE, senza fix alla cieca: (a) è la CASSETTA che si alza = long-press/sollevamento
  (timer 300ms) che si arma sul tap lento → poi il rilascio fermo dell'hook drag NON apre lo
  sheet su touch (verificare handleRelease dell'hook drag della parete); (b) è lo SHEET che
  inizia l'enter-animation e viene subito smontato (re-render? touchend sullo scrim?).
  Se non riproducibile in emulazione → OVERLAY DIAGNOSTICO temporaneo attivabile con query
  param sul device di Francesco (decisione già presa: niente quarta iterazione alla cieca).
- **NUOVO P-STATUSBAR:** all'avvio della PWA installata la barra di stato sposta tutto in
  giù: non si vedono tutti gli elementi e l'utente deve scrollare (v. screenshot). Indagare:
  `viewport-fit=cover` + `env(safe-area-inset-top)`, `display` nel manifest, uso di
  100dvh/100vh nelle superfici (dvh in standalone Android/iOS), meta theme-color.
  Riprodurre in PWA installata, non nel browser.

## Coda dopo R3 (invariata)
Mini-giro gap cassette tablet (varianti da far scegliere) → flake vitest → «iOS fluidità» →
«Redesign parete/home» (peek nascosto + bounce idle + griglia metallica + suono cassetta).
