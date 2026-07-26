# Sessione attiva — «Un tema solo, e la barra lo segue» (26/07/2026, sera)

✅ **Striscia panna: confermata sparita sul device di Francesco.** Voce 44 chiusa.

✅ **TAPPA 1 IN PRODUZIONE** — merge `03ec7595`, CI+CD verdi, verificata live su `uachelab.com`
(zero `<meta theme-color>` statici, zero `#D90012`, script con `CHIARO='#F4F0E7',SCURO='#171411'`).
Ramo `worktree-un-tema-solo` mergiato; il worktree `.claude/worktrees/un-tema-solo` resta in piedi
per le tappe 2 e 3. ⚠️ **Un worktree nuovo nasce senza `.env.local`/`.env.test`**: senza copiarli
dal repo principale, `next build` fallisce su `/api/admin/labs` via Stripe.

**Spec** (assorbe la voce A5): `docs/superpowers/specs/2026-07-26-un-tema-solo-e-la-barra-lo-segue-design.md`
**Piano tappa 1:** `docs/superpowers/plans/2026-07-26-tappa-1-meccanismo-barra-di-stato.md`
Dettaglio pieno: **voce 45** di `MEMORY.md`.

✅ **TAPPA 2 IN PRODUZIONE** (merge `850e3f26`, CI+CD verdi, verificata live: manifest e pagina
offline servono il fondo unico). Guardia `tests/unit/un-tema-solo-e-la-barra-lo-segue.test.ts`,
10 controlli, con controprova. Suite **3319 verdi / 19 skip**. Dettaglio: **voce 46** di `MEMORY.md`.
⚠️ Sul device installato **splash e scheda nei recenti cambiano solo quando Android rigenera il
pacchetto**: per vederlo subito, disinstallare e reinstallare.

✅ **PROVA SUL DEVICE SUPERATA (19:28).** «La barra ha cambiato colore, in modo corretto e in base
alla sezione del tema cambia colore in automatico». **Il meta `theme-color` È onorato nelle PWA
installate su Android, anche mutato a runtime** — lacuna §3.3 della ricerca chiusa empiricamente.
**Via libera alla tappa 2.**

⏳ **DUE APPUNTI DI FRANCESCO, aperti:**
1. **Striscia sottile fra barra di stato e contenuto.** Verificato: **non è nostra** (zero
   `border-top`/`box-shadow` globali, zero `safe-area-inset-top` in `src/`). Sospetto: **bug
   Chromium 421933373**, residuo di 1px del `theme_color` del **manifest** sotto il meta. Se è
   quello, la **tappa 2 lo chiude per costruzione**. 🔬 **Discriminante: di che colore è** — rossa
   → manifest; grigia → altro.
2. **Fascia sotto la barretta dei gesti sempre dello stesso colore.** È il **bug Chromium
   40759522**, già accertato: segue il **color scheme di SISTEMA**, non l'app. 🎯 La regola D4
   (l'app segue il telefono) la rende coerente per costruzione. 🔬 Test gratis: mettere il
   **telefono** in scuro e guardare se diventa scura.

**Poi:** tappa 2 (manifest + `offline.html` + guardia) · tappa 3 (tre stati `ua-tema`, bonifica dei
5 punti di accesso, UI in Impostazioni con mockup §0B, `blocked`/`billing`, toast).
