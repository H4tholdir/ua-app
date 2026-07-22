# Sessione attiva — 22/07/2026 notte · R3 + R3b DEPLOYATI — collaudo quasi chiuso

R3: P9 CHIUSO (confermato da Francesco su device) · D-2 ok. R3b (merge `69bf6cb`, prod verificata):
P-STATUSBAR risolto — non era la status bar: zona morta scala device-corti (soglia 700→780 +
compatta 744px; PWA 755px stabile, insets 0). Nota sistemica per «Redesign parete/home»: scala
piena ~900px non entra quasi mai → dimensionamento verticale da ripensare. **Prossimi passi:**
Francesco riapre la PWA → home senza scroll; se ok, RIMUOVERE overlay `DiagnosticaViewport`
(+helper+test+mount). Coda: gap tablet → flake vitest → iOS fluidità → Redesign parete/home.
