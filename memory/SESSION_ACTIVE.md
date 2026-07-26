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

🛑 **PROSSIMO PASSO — è di Francesco: la prova sul suo telefono.** Protocollo in §Task 5 del piano.
**Android, app INSTALLATA dall'icona** · chiudere UÀ **dai recenti** · aprire e riferire il colore ·
premere l'interruttore **DA DENTRO L'APP** (avatar in alto a destra → voce «Tema»), **mai dal
login** (lì non scrive `data-theme`: non muoverebbe nulla **per costruzione**) · navigare fra due
pagine · 🛑 **non giudicare dal lancio**, dove la barra è rossa **per definizione** finché il
manifest non cambia in tappa 2.

**Esiti e conseguenze** (tabella nel piano): cambia dal vivo → tappa 2 · cambia all'apertura ma non
al tocco → tappa 3 prima della 2 · resta rossa → il meta non è onorato, decisione da rifare.

**Poi:** tappa 2 (manifest + `offline.html` + guardia) · tappa 3 (tre stati `ua-tema`, bonifica dei
5 punti di accesso, UI in Impostazioni con mockup §0B, `blocked`/`billing`, toast).
