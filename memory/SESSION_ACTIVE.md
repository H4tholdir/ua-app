# Sessione attiva — «Un tema solo, e la barra lo segue» (26/07/2026, sera)

✅ **Striscia panna: confermata sparita sul device.** Voce 44 chiusa.
✅ **TAPPA 1 IN PRODUZIONE** (`03ec7595`) — **prova sul device SUPERATA**: la barra segue il tema
dal vivo. Chiusa empiricamente la lacuna §3.3 della ricerca (**il meta `theme-color` È onorato
nelle PWA installate su Android, anche mutato a runtime**).
✅ **TAPPA 2 IN PRODUZIONE** (`850e3f26`) — manifest e `offline.html` seguono il fondo, con guardia.
Dettaglio pieno: voci **45** e **46** di `MEMORY.md`.

🔨 **TAPPA 3 IN CORSO** — ramo `worktree-un-tema-solo`, worktree `.claude/worktrees/un-tema-solo`.
**Piano:** `docs/superpowers/plans/2026-07-26-tappa-3-un-tema-solo.md` (7 task).
**Fatto: Task 1** — `src/lib/preferenze/tema.ts` (tre stati `sistema|chiaro|scuro`, chiave `ua-tema`,
`risolviTema`), 6 test verdi, commit `1fcbcac6`.
**Prossimo: Task 2** (lo script inline passa alla chiave nuova e cancella `ua-theme`).

🛑 **Vincolo di sequenza:** l'opzione in Impostazioni (Task 4) e la rimozione degli interruttori
(Task 5) vanno **nello stesso deploy**.
📌 **D8 ratificata:** variante **A** (righe col pallino come «La tua home») **+ frase di stato**.
Francesco preferisce la forma B, ma B **esiste già pronta in v3** (`ChipScelta`) e in v2.3 andrebbe
ricostruita a mano e buttata: arriverà gratis con l'ondata v3 di `/impostazioni`.
Mockup e catture: `docs/design/mockups/2026-07-26-tema-impostazioni.html`.

⏳ **DUE APPUNTI DI FRANCESCO, aperti:**
1. **Strisciolina fra barra di stato e contenuto, `#dbd7cc`.** **NON è nostra** (verificato: quel
   colore non esiste nel codice, nessun bordo/velo globale, nessun `safe-area-inset-top`). È il
   panna scurito del 10% netto → un **velo**, non un colore scelto. Sospetto: separatore disegnato
   da Android. 🔬 **Discriminante: che colore ha in tema SCURO** — più chiara del fondo = separatore
   di sistema (chiuso, nessun margine); sparisce = velo (c'è margine).
2. **Fascia sotto la barretta dei gesti sempre uguale.** Bug Chromium **40759522**, già accertato:
   segue il **color scheme di SISTEMA**. 🎯 La regola D4 la rende coerente per costruzione.
   🔬 Test gratis: mettere il **telefono** in scuro e guardare se diventa scura.

⚠️ Un worktree nuovo nasce **senza `.env.local`/`.env.test`**: senza copiarli `next build` fallisce
su `/api/admin/labs` via Stripe.
